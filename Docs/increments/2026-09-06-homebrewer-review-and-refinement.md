# Execution: Homebrewer — Full Review and Refinement

**Plan:** `Docs/plans/2026-09-06-homebrewer-review-and-refinement.md`
**Prepared:** 2026-09-06
**Overall status:** complete
**Test command:** `cd client && npm test`
**Build command:** `cd client && npx vite build`

> This plan went through two plan reviews and a D&D rules audit, and the reviewer's fixes are
> already applied. **Do not re-derive it.** The test cases below are copied from the plan
> verbatim where the plan supplied them — they were argued over and several of them exist
> specifically because an earlier gate would have passed on broken code.

## Test-infrastructure facts that constrain every spec below

- Runner is **vitest in bare Node**. `client/package.json` has **no jsdom and no
  testing-library**, and `vite.config.js` sets no vitest `environment`.
- **Nothing here may render a component or "perform a save".** Every assertion is against a
  pure exported function. `src/utils/charSync.test.js` is the precedent — the character
  load/merge policy was extracted into pure `resolveLoadAction` for exactly this reason.
- **Do not add jsdom or testing-library** to make a test work. If a test seems to need a DOM,
  the logic is in the wrong place — move it to `src/utils/`.
- Any test that touches `localStorage` **must** install an in-memory stub via
  `vi.stubGlobal('localStorage', …)` in `beforeEach` (and `vi.unstubAllGlobals()` in
  `afterEach`). No existing test in `src/utils/` does this yet — this suite is the first.
  Skipping the stub is not a harmless omission: see Increment 2's red-gate note.

## Progress

| # | Increment | Status | Red | Green |
|---|-----------|--------|-----|-------|
| 1 | UTF-8-safe share codes + visible failure | done | ☑ | ☑ |
| 2 | Storage door — raw for writes, normalized for reads; validation | done | ☑ | ☑ |
| 3 | One read path for every consumer; complete homebrew renders | done | ☑ | ☑ |
| 4 | Form defects — duplicate picker, NumInput, type-switch, validation UI | done | ☑ | ☑ |
| 5 | Ranged weapon range display — the `ammunition` predicate gap | done | ☑ | ☑ |
| 6 | Rules correctness — parameterised properties, mastery, armor | done | ☑ | ☑ |
| 7 | Wire the dead fields + UX refinements | done | ☑ | ☑ |
| 8 | Cantrip damage scales with character level (5/11/17) | done | ☑ | ☑ |
| 9 | Docs + changelog | done | n/a | ☑ |

**Reference verification (re-checked 2026-09-06, all resolve):** `Homebrew.jsx` is 789 lines;
`:221-223` `STORAGE_KEY`/`readAll`/`writeAll`, `:237` `setType`, `:250` `save`, `:276`
`deleteItem`, `:283` `exportItem`, `:293` `doImport`, `:408`/`:464`/`:501` `parseInt(...)||0`,
`:460` free-text `ac`, `:468` `strReq` no-parseInt, `:497` `parseInt(...)||1`, `:622` `aoeSize`
no-parseInt, `:645`+`:678` the two class pickers, `:773-776` the action row — all confirmed.
`CharacterSheet.jsx:114` `defaultAmmoCount` (one arg) with five call sites at `:1859`, `:1896`,
`:1960`, `:2529`, `:3763`; `:1852-1853` `rangeText`; `:1929` `hasMastery` with no ruleset term;
`:1005`/`:2102` `effectiveDamage`; `:202`/`:218`/`:249`/`:271` raw `ond-homebrew` reads.
`Spells.jsx:58-66` `scaledDice`, `:118` raw read, `:299` `s.scaling === 'cantrip'`.
`Equipment.jsx:111` raw read, `:113` category filter, `:264-297` the thin homebrew block.
`CharacterEdit.jsx:1382` `queryLocalSpells(...)`-only override search. One nit: `DMG_COLORS` is
at `Equipment.jsx:33-37`, not `:32-36` (the plan cites both spellings).

---

## Increment 1: UTF-8-safe share codes + visible failure
**Status:** done
**Started:** 16:45

**What:** Create `client/src/utils/homebrew.js` with `encodeShareCode` / `decodeShareCode`, unit
test them, and wire `exportItem` / `doImport` to use them with real error handling and a
clipboard fallback. **This alone fixes the user-reported bug and must ship independently** —
do not fold it into Increment 2, and do not reorder it.

**Where:**
- New: `client/src/utils/homebrew.js`
- New: `client/src/utils/homebrew.test.js`
- `client/src/pages/Homebrew.jsx:283-291` (`exportItem`), `:293-310` (`doImport`),
  `:218` (`copiedId` state — add `shareCode` / `shareError` alongside), `:773-779` (button row)

**Details:**
- `encodeShareCode(obj)` — `new TextEncoder().encode(JSON.stringify(obj))`, then build the
  binary string in **0x8000 chunks** (`String.fromCharCode(...bytes.subarray(i, i+0x8000))`) so a
  large item does not blow the argument limit, then `btoa`.
- `decodeShareCode(code)` — strip all whitespace, throw `new Error('Empty share code')` on empty,
  `atob` (throws on malformed base64), `Uint8Array.from(bin, c => c.charCodeAt(0))`, then
  **`TextDecoder('utf-8', { fatal: true })` first, `JSON.parse(bin)` (legacy Latin-1) second.**
- **The decode order is load-bearing.** A legacy Latin-1 code containing `é` (0xE9) is a lone
  high byte, which `fatal: true` rejects, so it correctly falls through to the Latin-1 branch.
  Pure ASCII decodes identically either way. **Reversing the order silently mojibakes every
  newly generated code.** Test (b) below is the guard for exactly this.
- `exportItem` becomes `async`: encode inside `try` → on failure `setShareError(...)` and return;
  **always** `setShareCode({ id, code })` before attempting the clipboard; then
  `await navigator.clipboard.writeText(code)` inside its own `try`, with the rejection swallowed
  (the textarea is the fallback). Never leave the user with no code.
- Render `shareCode.code` in a read-only `<textarea onFocus={e => e.target.select()}>` under the
  button row when `shareCode?.id === item._id`, hinted "Copied to clipboard" or "Select and copy
  this code".
- `doImport` catches separately: `decodeShareCode` throwing → "That doesn't look like a valid
  share code."; a decoded non-object → "Share code did not contain a homebrew item."
  (Per-type validation arrives in Increment 2 — do not pre-empt it here.)
- `exportItem` reads via `readAll()` for now; Increment 2 swaps it to `readHomebrewRaw()`.

**Test spec**
- **File:** `client/src/utils/homebrew.test.js` (new)
- **Asserts** (the plan's six cases, verbatim in intent):
  - (a) `decodeShareCode(encodeShareCode(x))` deep-equals `x` for a spell object whose
    `description` contains `— " " • … ×` (em dash, curly quotes, bullet, ellipsis, multiply sign).
  - (b) **New-code em-dash round trip:**
    `decodeShareCode(encodeShareCode({ description: '—' })).description === '—'`.
    This is the decode-order guard, and it fires on a *freshly generated* code, not only on a
    legacy fixture.
  - (c) **Legacy Latin-1 fixture:** `decodeShareCode(btoa(JSON.stringify({name:'Café', type:'spell'})))`
    deep-equals `{name:'Café', type:'spell'}`.
  - (d) **Server-shaped code:** `decodeShareCode(Buffer.from(JSON.stringify(o)).toString('base64'))`
    deep-equals `o` (this is what `server/routes/homebrew.js:66-72` produces; it was already
    UTF-8-correct — the client was the broken side).
  - (e) `expect(() => decodeShareCode('not base64!!')).toThrow()`.
  - (f) Whitespace tolerance: a code with `\n` and spaces spliced into it decodes identically to
    the same code without them.
  - Also assert `expect(() => decodeShareCode('')).toThrow()` and
    `expect(() => decodeShareCode(null)).toThrow()` — the "Empty share code" path.
- **Must fail before implementation because:** `client/src/utils/homebrew.js` does not exist, so
  the import itself fails. Once the module exists but before the decode fallback is written,
  case (c) fails with mojibake (`CafÃ©`) and case (a)/(b) throw `InvalidCharacterError` from the
  old `btoa`-on-raw-string approach.

**Gates**
- ☑ **RED** — `src/utils/homebrew.test.js` written (7 cases: a-f + the empty/null path); `npm test` →
  ```
   FAIL  src/utils/homebrew.test.js [ src/utils/homebrew.test.js ]
  Error: Cannot find module './homebrew' imported from D:/Stuff/DND/OND/client/src/utils/homebrew.test.js
   Test Files  1 failed | 4 passed (5)
        Tests  65 passed (65)
  ```
  Failing for the stated reason — the module did not exist.
- ☑ **GREEN** — `npm test` → `Test Files  5 passed (5)` / `Tests  72 passed (72)`; `npx vite build` → `✓ built in 4.50s`

**Verify:** `cd client && npm test` + `npx vite build`.
UI: create a spell with description `Deals 2d6 — half on a save.`, click **Copy Share Code** →
the code appears in the textarea **and** the button reads `✓ Copied!`; paste it into Import →
the spell imports with the em dash intact. **On today's code this button does nothing at all
for that description** — that is the manual red gate.

**Log:**

**Changed:**
- `client/src/utils/homebrew.js` — new module. `encodeShareCode` (TextEncoder → 0x8000-chunked
  binary string → `btoa`) and `decodeShareCode` (whitespace strip, empty throws, `atob`,
  `TextDecoder('utf-8', {fatal:true})` first, `JSON.parse(bin)` Latin-1 second). The order is
  commented in the source as load-bearing.
- `client/src/utils/homebrew.test.js` — new, 7 cases (the plan's a-f plus empty/null).
- `client/src/pages/Homebrew.jsx:3` — import the codec.
- `client/src/pages/Homebrew.jsx:219-221` — added `shareCode` / `shareError` state alongside `copiedId`.
- `client/src/pages/Homebrew.jsx:285-303` — `exportItem` is now `async`: encode in a `try`
  (`setShareError` and return on failure), **always** `setShareCode({id, code})` before touching
  the clipboard, then `await navigator.clipboard.writeText` in its own `try` with the rejection
  swallowed. Still reads via `readAll()` — Increment 2 swaps it to `readHomebrewRaw()`.
- `client/src/pages/Homebrew.jsx:305-326` — `doImport` uses `decodeShareCode` with two separate
  messages: decode failure → "That doesn't look like a valid share code."; a decoded
  non-object/array/nameless/typeless value → "Share code did not contain a homebrew item."
- `client/src/pages/Homebrew.jsx:801-816` — read-only `<textarea onFocus={e => e.target.select()}>`
  under the action row when `shareCode?.id === item._id`, hinted "Copied to clipboard" /
  "Select and copy this code", plus a red `shareError` line.

**Notes:** No component was defined inside `Homebrew()`; the textarea is inline JSX. Per-type
import validation was deliberately **not** pre-empted here — `doImport` still only checks
`name`/`type`, exactly as the increment specifies; `sanitizeImported` arrives in Increment 2.
The manual UI gate (create a spell with an em dash, Copy Share Code, re-import) was not run —
this is a headless environment. The pure codec is fully covered by the unit tests, including the
em-dash round trip on a freshly generated code.

---

## Increment 2: Storage door — raw for writes, normalized for reads; per-type schema and validation
**Status:** done

**What:** Add `readHomebrewRaw`, `readHomebrew`, `writeHomebrew`, `upsertHomebrewRecord`,
`removeHomebrewRecord`, `appendImportedRecord`, `normalizeHomebrewItem`, `pruneToType`,
`validateHomebrew`, `sanitizeImported`, `HOMEBREW_TYPES` and `TYPE_FIELDS` to
`client/src/utils/homebrew.js`; make `Homebrew.jsx` use them for read, write, save, delete
and import.

**Where:**
- `client/src/utils/homebrew.js`, `client/src/utils/homebrew.test.js`
- `client/src/pages/Homebrew.jsx:221-231` (`STORAGE_KEY`/`readAll`/`writeAll`/`load`),
  `:250-268` (`save`), `:276-281` (`deleteItem`), `:283-291` (`exportItem` → raw read),
  `:293-310` (`doImport`), `:207-219` (add `formErrors` state)

**Details:**
- **Declare `const [formErrors, setFormErrors] = useState({})` in this increment** and render a
  minimal red banner above the submit button for `formErrors._save`. `npm run build` does **not**
  catch an undefined variable (§"The build does not catch undefined variables") — without this,
  the increment ships a `ReferenceError` on the exact path meant to *stop* silent data loss.
  Increment 4 extends the same state with per-field errors and warnings.
- **Two read functions; the split is the plan's central safety property, not a style choice.**
  - `readHomebrewRaw()` — `JSON.parse` in a `try`, coerce non-array to `[]`, **no normalization,
    no dropping**. MUTATION path only.
  - `readHomebrew(opts)` — `readHomebrewRaw().map(normalizeHomebrewItem).filter(Boolean)`, then
    `opts.type` / `opts.notType`. CONSUMPTION path only.
  - `writeHomebrew(items)` — returns `false` on quota failure, never throws.
- **The three array-level mutations are pure exported functions**, precisely so the preservation
  property is unit-testable in a repo with no DOM:
  ```js
  export function upsertHomebrewRecord(all, record, editingId) // edit in place by _id, else append
  export function removeHomebrewRecord(all, id)
  export function appendImportedRecord(all, record)
  ```
  `save`, `deleteItem`, `doImport` and (later) Duplicate each do
  `readHomebrewRaw()` → pure fn → `writeHomebrew(...)`, and on `false` set
  `formErrors._save = "Could not save — your browser's storage is full."` and return.
  **Do not let any mutation path read through `readHomebrew()`.**
- `load()` uses `readHomebrew()`, so an unrecognised record is hidden from the Homebrewer's own
  list too. Deliberate: it stays on disk untouched and **there is no repair UI**. Do not
  "helpfully" surface or clean these records.
- Schema is **one data-driven table** (`HOMEBREW_TYPES`, `COMMON`, `EQUIP`, `TYPE_FIELDS`) — no
  per-type `if` chains. `requiresAttunement` stays in `EQUIP` deliberately: `pruneToType` runs on
  every save, so omitting it would strip the legacy key on first re-save and break the downgrade
  path the alias exists to protect. `pruneToType` writes **both** keys in sync, `attunement`
  canonical.
- `normalizeHomebrewItem(raw)` — tolerant, never throws, returns `null` for unusable records
  (`type` not in `HOMEBREW_TYPES`, or `name` not a non-empty string). `toStrArray` for
  `properties`/`components`/`classes` (§4/§5). `attunement: !!(raw.attunement ?? raw.requiresAttunement)`
  and `requiresAttunement: attunement`. `damageType` lowercased. Numeric coercion uses
  **`parseInt`, never `Number`, never a falsy fallback** —
  `const num = (v, fb) => { const n = parseInt(v, 10); return Number.isNaN(n) ? fb : n; }` —
  with fallbacks `bonus: 0`, `level: 0`, `strReq: 0`, `stackSize: 20`, `aoeSize: 0`, and
  **`ac: ''`** (blank armor AC must stay blank, not become 0; `validateHomebrew` rejects it).
  Keys are **not** pruned here. Sets `homebrew: true`.
- `validateHomebrew(item)` → `{ ok, errors, warnings }`. Blocking only where the sheet
  mis-computes: name; weapon `subcategory` ∈ `WEAPON_SUBS`, `damage` parses, `damageType`;
  armor `subcategory` ∈ `ARMOR_SUBS` (**heavy armor would gain DEX** at `CharacterSheet.jsx:683-686`),
  `ac` integer 1-30 (shields 1-5, a sanity bound not a RAW rule); ammo `ammoType`;
  spell `level` 0-9, `school` ∈ `SCHOOLS`, `scaling` set ⟹ `level > 0`.
  **`'M'`-without-`materialComponent` is a WARNING, `ok: true`** — nothing miscalculates without it.
- `sanitizeImported(data)` — reject non-objects and arrays; reject unknown `type`; `pruneToType`
  (hostile extra keys dropped, not stored); `normalizeHomebrewItem`; `validateHomebrew` and
  reject on a **blocking** failure with the first message (warnings pass); cap
  `JSON.stringify(data).length` at 64 KB.

**Test spec**
- **File:** `client/src/utils/homebrew.test.js` (extend)
- **Setup for the storage-touching block:**
  ```js
  beforeEach(() => {
    let store = {};
    vi.stubGlobal('localStorage', {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
      clear: () => { store = {}; },
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  ```
  **This stub is mandatory.** Without it there is no `localStorage` global in Node,
  `readHomebrewRaw`'s own `try/catch` swallows the `ReferenceError` and returns `[]`, and the
  `'not json'` case **goes green while proving nothing**. Do not reach for jsdom instead.
- **Asserts — preservation (the B1 guard), on the PURE FUNCTIONS, never on the component.**
  With `const all = [{type:'monster', name:'Beholder'}, {_id:'a', type:'weapon', name:'Axe'}]`:
  - `upsertHomebrewRecord(all, {_id:'a', type:'weapon', name:'Great Axe'}, 'a')` → length `2`,
    still contains `{type:'monster', name:'Beholder'}`, and the axe now reads `'Great Axe'`.
  - `removeHomebrewRecord(all, 'a')` → length `1`, still contains the monster.
  - `appendImportedRecord(all, {_id:'b', type:'spell', name:'Bolt'})` → length `3`, still
    contains the monster.
  - All three must also leave the input `all` unmutated (assert `all.length === 2` afterwards).
- **Asserts — hidden, not deleted:** with that same array written into the stub,
  `readHomebrew()` returns **one** item (the weapon). The monster is hidden from consumers and
  still present in `readHomebrewRaw()` (length `2`).
- **Asserts — normalization:**
  - `normalizeHomebrewItem({type:'weapon',name:'X',properties:null}).properties` → `[]`, and a
    follow-up `.includes('Heavy')` does not throw.
  - `normalizeHomebrewItem({type:'item',name:'X',requiresAttunement:true}).attunement` → `true`.
  - `normalizeHomebrewItem({type:'armor',name:'X',strReq:'15'}).strReq` → `15` (number, `toBe`,
    not `'15'`).
  - `{bonus:0}` → `0`; `{bonus:''}` → `0`; `{ac:''}` → `''` (**not** `0`); `{aoeSize:''}` → `0`.
  - `normalizeHomebrewItem({type:'monster',name:'Beholder'})` → `null`;
    `normalizeHomebrewItem({type:'weapon',name:''})` → `null`;
    `normalizeHomebrewItem({type:'weapon',name:'X',classes:'Wizard'}).classes` → `['Wizard']`;
    `{properties:[{name:'Heavy'},'Light']}` → `['Heavy','Light']` (§4/§5).
- **Asserts — storage:** `readHomebrew()` returns `[]` for a stored `'not json'` and for a stored
  `'{"a":1}'` (non-array).
- **Asserts — pruning:** `pruneToType` on a weapon-turned-armor drops `damage`/`properties`/
  `ammoType` and keeps `ac`; `pruneToType({type:'item',name:'X',attunement:true})` emits **both**
  `attunement: true` **and** `requiresAttunement: true`.
- **Asserts — validation:** `validateHomebrew` rejects armor with `subcategory: ''`
  (`ok === false`) and armor with `ac: ''`; accepts a complete armor (`ok === true`); and for a
  spell with `components: ['V','S','M']` and empty `materialComponent` returns
  **`ok === true` with a non-empty `warnings.materialComponent`**.
- **Asserts — import sanitation:** `sanitizeImported` rejects `[]`, `null`,
  `{type:'monster',name:'x'}`, and a >64 KB blob (build one with `'x'.repeat(100000)` in the
  description).
- **Must fail before implementation because:** none of these functions exist. Note specifically
  that the preservation asserts cannot be satisfied by today's `Homebrew.jsx` at all — its
  `save`/`deleteItem` logic is inline in the component and unreachable from a test.

**Gates**
- ☑ **RED** — 23 new cases written; `npm test` →
  ```
   FAIL  src/utils/homebrew.test.js > sanitizeImported > rejects anything that is not a usable homebrew record
  TypeError: sanitizeImported is not a function
   Test Files  1 failed | 4 passed (5)
        Tests  23 failed | 72 passed (95)
  ```
  All 23 failed with `<fn> is not a function` — the stated reason.
  **Stub-live check done two ways.** (i) The suite carries a permanent guard case,
  `has a live localStorage stub`, which writes through `localStorage.setItem` and asserts
  `readHomebrewRaw()` reads the value back (`toHaveLength(1)`, `name === 'Axe'`). (ii) A throwaway
  control test run outside the stub confirmed the failure mode the doc warns about:
  `expect(typeof globalThis.localStorage).toBe('undefined')` **and** `readHomebrewRaw()` → `[]`
  both passed, i.e. without the stub the ReferenceError really is swallowed and the `'not json'`
  case would go green while proving nothing. Control file deleted; no jsdom, no testing-library,
  no vitest `environment` was added.
- ☑ **GREEN** — `npm test` → `Test Files  5 passed (5)` / `Tests  95 passed (95)`;
  `npx vite build` → `✓ built in 3.19s`

**Verify:** `cd client && npm test` + `npx vite build`.
UI: build a weapon with properties and damage, switch its type to Armor, fill AC + armor type,
save, re-open it — the Weapon section shows an empty damage formula and no properties.
Console gate: append `{type:'monster', name:'Beholder'}` to `ond-homebrew`, then edit-and-save
any homebrew item in the UI, then re-read `ond-homebrew` — the monster record is **still there**
and appears in no list. Repeat with a delete.

**Log:**

**Changed:**
- `client/src/utils/homebrew.js` — added the storage door: `STORAGE_KEY`, `HOMEBREW_TYPES`,
  `TYPE_FIELDS` (data-driven `COMMON` + `EQUIP` table, no per-type `if` chains),
  `readHomebrewRaw` / `readHomebrew` / `writeHomebrew`, the three pure array mutations
  (`upsertHomebrewRecord` / `removeHomebrewRecord` / `appendImportedRecord`),
  `normalizeHomebrewItem`, `pruneToType`, `validateHomebrew`, `sanitizeImported`.
  Also exports `WEAPON_SUBS` / `ARMOR_SUBS` / `SCHOOLS` (see Notes).
- `client/src/utils/homebrew.test.js` — +23 cases across 7 describe blocks, including the
  `beforeEach` `vi.stubGlobal('localStorage', …)` / `afterEach` `vi.unstubAllGlobals()` pair.
- `client/src/pages/Homebrew.jsx:3-9` — imports the door.
- `client/src/pages/Homebrew.jsx:20-23` — deleted the local `SCHOOLS` / `WEAPON_SUBS` /
  `ARMOR_SUBS` definitions in favour of the imported ones.
- `client/src/pages/Homebrew.jsx:219` — added `const [formErrors, setFormErrors] = useState({})`.
- `client/src/pages/Homebrew.jsx:221-227` — `STORAGE_KEY` / `readAll` / `writeAll` deleted;
  `load()` now calls `readHomebrew()`.
- `client/src/pages/Homebrew.jsx:250-269` — `save` = `upsertHomebrewRecord(readHomebrewRaw(),
  pruneToType(body), editing)` → `writeHomebrew`; on `false` it sets `formErrors._save` and
  **returns without closing or resetting the form**.
- `client/src/pages/Homebrew.jsx:277-282` — `deleteItem` = raw read → `removeHomebrewRecord` → write.
- `client/src/pages/Homebrew.jsx:286` — `exportItem` swapped to `readHomebrewRaw()`.
- `client/src/pages/Homebrew.jsx:307-336` — `doImport` = `decodeShareCode` → `sanitizeImported`
  → raw read → `appendImportedRecord` → `writeHomebrew`, with the sanitiser's own message
  surfaced and a quota message on write failure.
- `client/src/pages/Homebrew.jsx:747-751` — red `formErrors._save` banner above the submit button.

**Notes:**
- **Deviation (small, logged):** the increment did not ask for it, but `WEAPON_SUBS`,
  `ARMOR_SUBS` and `SCHOOLS` are now defined once in `utils/homebrew.js` and imported by
  `Homebrew.jsx` instead of being duplicated. `validateHomebrew` blocks on exactly these lists,
  so a duplicate copy in the page would be a silent divergence between what the picker offers
  and what the validator accepts. Values are byte-identical to the deleted ones. Grepped:
  `readAll` / `writeAll` / `STORAGE_KEY` return **no** hits in `Homebrew.jsx`, and all three
  constants resolve to the import.
- `validateHomebrew` is **not** wired into `save` yet — that is Increment 4's "Validation UI".
  Increment 2 only wires the quota banner, exactly as specified.
- `upsertHomebrewRecord` **replaces** the edited record rather than merging into it (this is the
  fix for "junk keys from an earlier type can never be removed by editing"), but it carries
  `createdAt` forward from the record on disk when the incoming record does not have one.
- The console UI gate (append `{type:'monster', name:'Beholder'}`, save, re-read) was not run —
  headless environment. The property it checks is asserted directly on the three pure functions,
  which is where the increment doc puts it.

---

## Increment 3: One read path for every consumer, and make the homebrew renders complete
**Status:** done

**What:** Replace all six external `ond-homebrew` read sites with `readHomebrew`, fix the
category filter in **both** places that have it, add the missing `attunement` / `strReq` /
damage-colour renders to the Equipment page's homebrew block, and union homebrew spells into the
character editor's override search.

**Where:**
- `client/src/pages/CharacterSheet.jsx:200-206`, `:216-222`, `:247-253` (incl. the `:251`
  category filter), `:270-276`
- `client/src/pages/Spells.jsx:116-124`
- `client/src/pages/Equipment.jsx:109-116`, `:113` (category filter), `:276` (homebrew row name),
  `:286-291` (homebrew expanded block), `:278` (summary line damage colour)
- `client/src/pages/CharacterEdit.jsx:1382` (override spell search)
- `client/src/utils/homebrew.js` (`matchesEquipCategory`, `HB_CATEGORY_ALIASES`)

**Details:**
- Each read site becomes `readHomebrew({ type: 'spell' })` or `readHomebrew({ notType: 'spell' })`.
  **The surrounding search / level / school / rarity filters stay exactly as they are.** The
  `try/catch` wrappers become redundant (`readHomebrew` never throws) — leave or drop them, but
  do not change filter semantics.
- **Category filter, two identical sites.** Add to `utils/homebrew.js`:
  ```js
  export const HB_CATEGORY_ALIASES = { item: ['adventuring-gear','tool','pack'], ammo: ['adventuring-gear'] };
  export const matchesEquipCategory = (item, cat) =>
    !cat || item.category === cat || item.type === cat || (HB_CATEGORY_ALIASES[item.type] || []).includes(cat);
  ```
  Use it at **both** `Equipment.jsx:113` and `CharacterSheet.jsx:251`.
  **Do not change what `Homebrew.jsx` writes into `category`** — `CharacterSheet.jsx:122` keys
  ammo detection on `category === 'ammo'`, `:667` on `'armor'`, `:1829` on `'weapon'`.
- **The Equipment page's homebrew block must actually render the fields.** `Equipment.jsx:264-297`
  is a separate, thinner `homebrewItems.map` that reads only name/type/damage/damageType/ac/
  createdBy/description/cost/weight/properties. Increment 2's field rename is invisible until:
  - after the name span (`:276`), `{item.attunement && <span …>(A)</span>}` matching `:359`;
  - in the expanded flex row (`:287-291`), `{item.attunement && <span>(requires attunement)</span>}`
    and `{item.strReq > 0 && <span>Strength Required: {item.strReq}</span>}`;
  - in the summary line (`:278`), colour the damage text with `DMG_COLORS[item.damageType]`
    falling back to `var(--text-dim)`.
  **Scope the damage-colour claim honestly:** `DMG_COLORS` (`Equipment.jsx:33-37` — the plan
  also writes `:32-36`; `:33-37` is correct) defines only `bludgeoning`, `piercing`, `slashing`.
  Either accept that the payoff covers the three physical types only, **or** extend `DMG_COLORS`
  to all 13 damage types as part of this increment. Do not describe this as "making homebrew
  damage colours work" unless one of those is true.
- **Override spell search** (`CharacterEdit.jsx:1382`) — union homebrew in before the `.slice(0, 40)`,
  de-duplicating by lowercased name so a homebrew spell shadowing a stock one does not appear twice.

**Test spec**
- **File:** `client/src/utils/homebrew.test.js` (extend)
- **Asserts** — `matchesEquipCategory`, the pure half of this increment:
  - `matchesEquipCategory({type:'item', category:'item', name:'X'}, 'adventuring-gear')` → `true`
    ← **this is the bug**; today's expression is `false`
  - `matchesEquipCategory({type:'item', category:'item'}, 'tool')` → `true`
  - `matchesEquipCategory({type:'item', category:'item'}, 'pack')` → `true`
  - `matchesEquipCategory({type:'ammo', category:'ammo'}, 'adventuring-gear')` → `true`
  - `matchesEquipCategory({type:'ammo', category:'ammo'}, 'tool')` → `false` ← ammo aliases only
    `adventuring-gear`; the alias table must not be a blanket
  - `matchesEquipCategory({type:'weapon', category:'weapon'}, 'weapon')` → `true`
  - `matchesEquipCategory({type:'item', category:'item'}, 'weapon')` → `false`
  - `matchesEquipCategory({type:'item', category:'item'}, '')` → `true` (no filter selected)
  - `matchesEquipCategory({type:'item', category:'item'}, undefined)` → `true`
- **Must fail before implementation because:** `matchesEquipCategory` does not exist, and the
  expression it replaces (`i.category === cat || i.type === cat`) returns `false` for the first
  four cases — which is exactly why homebrew gear vanishes under the "Gear" filter today.
- The read-path swap, the two render additions and the override-search union have no assertable
  pure logic; they are covered by the grep and UI gates below.

**Gates**
- ☑ **RED** — 4 new cases (9 asserts) written; `npm test` →
  ```
  ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
   FAIL  src/utils/homebrew.test.js > matchesEquipCategory > matches a homebrew item against the gear-ish categories the dropdowns offer
  TypeError: matchesEquipCategory is not a function
   Test Files  1 failed | 4 passed (5)
  ```
  Failing for the stated reason — the function did not exist.
- ☑ **GREEN** — `npm test` → `Test Files  5 passed (5)` / `Tests  99 passed (99)`;
  `npx vite build` → `✓ built in 3.13s`. Both grep gates run, output below.

**Verify:** `cd client && npx vite build` must succeed, then:
```
rg -n "ond-homebrew|localStorage\.(get|set)Item\(STORAGE_KEY" client/src
```
must return hits **only** in `client/src/utils/homebrew.js`. (The narrower
`rg -n "localStorage.getItem\('ond-homebrew'\)"` is **not** a valid gate — it already returns
nothing for `Homebrew.jsx` today, because `:222` reads via the `STORAGE_KEY` constant.)

Per §"The build does not catch undefined variables", also run
```
rg -n "\bhb\b|\bhbItems\b" client/src/pages/CharacterSheet.jsx client/src/pages/Spells.jsx client/src/pages/Equipment.jsx
```
and confirm every remaining reference is bound.

UI (each fails today):
1. Homebrew magic item with Attunement ticked → `(A)` next to its name in the Equipment page's
   **homebrew** section, and "(requires attunement)" in its expanded card. Neither appears today.
2. Homebrew armor with STR Requirement 15 → "Strength Required: 15" in its expanded card.
3. Equipment page → Homebrew on → filter "Adventuring Gear" → a homebrew Item/Gear entry is listed.
4. **Character sheet → inventory browser → filter "Gear" → search a homebrew item → it is listed.**
   (Today it vanishes. This is the site that matters more — it is where items get added.)
5. Character editor → Spells → "Override" → search a homebrew spell's name → it appears.

**Log:**

**Grep gates (real output):**
```
$ rg -n "ond-homebrew|localStorage\.(get|set)Item\(STORAGE_KEY" client/src
client/src/utils/homebrew.js:1    // ... the `ond-homebrew` localStorage key,
client/src/utils/homebrew.js:55   const STORAGE_KEY = 'ond-homebrew';
client/src/utils/homebrew.js:81   const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
client/src/utils/homebrew.js:96   try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); return true; }
client/src/utils/homebrew.test.js:165,171,181,190,193   (the test's own localStorage stub writes)
```
Clean: the only production hits are in `utils/homebrew.js`. The five test-file hits are the
`vi.stubGlobal` fixture writing the key directly, which is the storage test itself — the gate was
written before that test file existed.
```
$ rg -n "hb|hbItems" client/src/pages/CharacterSheet.jsx client/src/pages/Spells.jsx client/src/pages/Equipment.jsx
CharacterSheet.jsx:243-246  let hb = readHomebrew({ notType: 'spell' }) … data.push(...hb)
CharacterSheet.jsx:264,266  const hbItems = readHomebrew({ notType: 'spell' }) … hbItems.find(…)
Spells.jsx:118-123          let hb = readHomebrew({ type: 'spell' }) … setHomebrewSpells(hb)
Equipment.jsx:124-128       let hb = readHomebrew({ notType: 'spell' }) … setHomebrewItems(hb)
```
Every remaining reference is bound to a `readHomebrew` result in the same scope.

**Changed:**
- `client/src/utils/homebrew.js` — added `HB_CATEGORY_ALIASES` and `matchesEquipCategory`.
- `client/src/utils/homebrew.test.js` — +4 cases for `matchesEquipCategory`.
- `client/src/pages/CharacterSheet.jsx:20` — import `readHomebrew, matchesEquipCategory`.
- `client/src/pages/CharacterSheet.jsx:195-196, 211-212, 242-246, 264` — all four raw reads
  replaced. The `try/catch` wrappers were dropped (`readHomebrew` never throws). Search / level /
  class / rarity filter semantics unchanged; only the category test at `:245` changed.
- `client/src/pages/Spells.jsx:4, 117-123` — read swapped; search/level/school/class filters unchanged.
- `client/src/pages/Equipment.jsx:4, 123-128` — read swapped, category test now
  `matchesEquipCategory`.
- `client/src/pages/Equipment.jsx:33-48` — `DMG_COLORS` extended (see the decision below).
- `client/src/pages/Equipment.jsx:288-298` — homebrew row: `(A)` badge after the name, and the
  damage fragment split into its own span coloured by `DMG_COLORS[item.damageType]` with a
  `var(--text-dim)` fallback.
- `client/src/pages/Equipment.jsx:307-308` — expanded homebrew card now renders
  `(requires attunement)` and `Strength Required: {item.strReq}`.
- `client/src/pages/CharacterEdit.jsx:15, 1381-1390` — override spell search unions
  `readHomebrew({ type: 'spell' })` in before the `.slice(0, 40)`, de-duplicated by lowercased name.

**Notes:**
- **`DMG_COLORS` decision — option two, taken explicitly: extended to all 13 damage types.**
  The plan required picking one of the two honest options rather than claiming an undelivered
  payoff. I extended `Equipment.jsx`'s three-key map (`bludgeoning`/`piercing`/`slashing`) to the
  full 13 by copying the values already used in `Spells.jsx:26-42`, so the two pages now agree.
  A homebrew fire or radiant weapon therefore does get a colour, and the changelog line about
  homebrew damage colours is true rather than aspirational. This also affects the Equipment
  page's **main** list, which uses the same map. One stock item is affected: **Sunblade**
  (`equipment.json:2805`) is `"damageType": "radiant"`, so it now renders gold where it
  previously fell back to the default. That is an improvement, not a regression — but the
  earlier claim that "nothing shipped changes appearance" was wrong.
- The spell-search de-duplication was left inline in `CharacterEdit.jsx`, as the increment doc
  specified — `matchesEquipCategory` is this increment's red gate.
- No React component was defined inside another; all render additions are inline JSX.
- UI gates 1-5 were not run (headless). The pure half is asserted; the render additions are
  visible in the diff at the line numbers above.

---

## Increment 4: Form defects — duplicate picker, NumInput, type-switch reset, surfaced validation
**Status:** done

**What:** Delete the duplicated classes picker, convert every numeric input to `NumInput`, clear
type-specific fields when the type button changes, and surface `validateHomebrew` errors inline
instead of saving a broken item.

**Where:** `client/src/pages/Homebrew.jsx:237-241` (`setType`), `:250-268` (`save`), `:408`,
`:460`, `:464`, `:468`, `:497`, `:501`, `:622`, `:645-656`, `:678-689`, `:705`;
import `NumInput` from `../components/NumInput`;
`client/src/utils/homebrew.js` (`resetFormForType` — see Test spec).

**Details:**
- **Remove `Homebrew.jsx:645-656`** (labelled just "Classes"; its `:651` reads
  `form.classes.includes(c)` **unguarded**) and keep `:678-689` ("Spell Lists (Classes)"), which
  guards with `(form.classes || [])`. Move the survivor to sit directly under Components
  (`:631-643`) and retitle its label "Spell Lists".
- **`NumInput`** at `:408` (`bonus`, min 0 max 3), `:464` (`bonus`, 0-3), `:468` (`strReq`, min 0),
  `:497` (`stackSize`, min 1), `:501` (`bonus`, 0-3), `:622` (`aoeSize`, min 0).
  `NumInput` already clamps `Number.isNaN` internally (`NumInput.jsx:14-21`) — pass `min`/`max`
  and `onChange={v => f('field', v)}`; **do not add a falsy fallback on top.**
- Armor **Base AC** at `:460` is free-text today; make it `NumInput` with **`min={0}`** `max={30}`
  — **not `min={1}`**. `NumInput` commits an empty field on blur as
  `parseInt('') → NaN → 0 → clamp to min`, so `min={1}` would turn "tabbed through without
  typing" into a silently valid **AC 1** armor that passes validation. With `min={0}`,
  `validateHomebrew`'s 1-30 rule rejects it with "Base AC is required".
- This changes the stored type of `strReq` and `aoeSize` from string to number; Increment 2's
  normalizer already coerces existing records on read, so old and new records agree.
- **`setType`** resets fields not in `TYPE_FIELDS[type]` to their `EMPTY_FORM` values (**not**
  dropping the keys — the form reads `form.properties.includes(...)` unguarded), while
  `type`, `category`, `name`, `description`, `rarity` survive on purpose.
- **Validation UI:** `save` runs `validateHomebrew(body)` before writing. Blocking failure →
  `setFormErrors(errors)`, return, form stays open. Banner above the submit button lists errors
  in red and warnings in amber; offending fields get `formErrors[key] ? { borderColor: '#f87171' } : null`.
  Clear `formErrors` on every `f()` call. Keep the HTML `required` on name/description.
- **Storage-failure feedback:** `writeHomebrew` returning `false` sets
  `formErrors._save = "Could not save — your browser's storage is full."`, **leaves the form open
  with the user's input intact**, and does not reset. Today a quota failure closes and resets the
  form as if the save succeeded, and the item is simply gone.
- The banner must be plain JSX or a **module-scope** helper, never a component defined inside
  `Homebrew()` (§1 Widget Component Inside Render). `DiceFormulaBuilder` at `:25` is already
  module scope and **correct** — leave it there.

**Test spec**
- **File:** `client/src/utils/homebrew.test.js` (extend)
- **Extraction required to make this increment testable.** The plan writes `setType`'s
  field-clearing logic inline in the component, where nothing can assert it. Per the plan's own
  stated principle ("the pure logic … moves to `client/src/utils/` with vitest coverage"),
  extract it:
  ```js
  export function resetFormForType(prevForm, type, emptyForm)
  ```
  and have `setType` call it inside `setForm(prev => resetFormForType(prev, type, EMPTY_FORM))`.
  This is the only addition this document makes beyond the plan's letter; it changes no
  behaviour. See **Concerns**.
- **Asserts** (`EMPTY_FORM`-shaped fixture with `damage: ''`, `properties: []`, `ammoType: ''`,
  `ac: ''`, `strReq: 0`, `level: 0`):
  - Weapon → Armor: `resetFormForType({...form, type:'weapon', damage:'2d6',
    properties:['Heavy','Two-Handed'], ammoType:'Bolt', name:'Storm Axe', description:'d',
    rarity:'rare'}, 'armor', EMPTY_FORM)` → `damage === ''`, `properties` deep-equals `[]`,
    `ammoType === ''`, **and** `name === 'Storm Axe'`, `description === 'd'`, `rarity === 'rare'`.
  - The result **keeps every key** — `'properties' in result` is `true` and `result.properties`
    is an array, so `form.properties.includes('Heavy')` cannot throw.
  - `type` and `category`: `resetFormForType(f, 'spell', EMPTY_FORM).category` → `''`;
    `…'ammo'…).category` → `'ammo'`; `…'weapon'…).category` → `'weapon'`.
  - Weapon → Ammo keeps `ammoType` (it is in `TYPE_FIELDS.ammo`) but clears `properties`.
  - Spell → Weapon clears `school`, `components`, `classes`, `level` back to `EMPTY_FORM` values.
  - Input is not mutated: the original object still reads `damage === '2d6'` afterwards.
- **Must fail before implementation because:** `resetFormForType` does not exist. Today's
  `setType` (`Homebrew.jsx:237-241`) resets **only `category`**, so every one of the clearing
  asserts describes behaviour the app does not have.
- The `NumInput` conversions, the picker deletion and the banner have no assertable pure logic
  (validation itself was tested in Increment 2). They are covered by the greps and the UI gates.

**Gates**
- ☑ **RED** — 6 new cases written; `npm test` →
  ```
  ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯
   FAIL  src/utils/homebrew.test.js > resetFormForType > clears the previous type fields but keeps name, description and rarity
  TypeError: resetFormForType is not a function
  ```
  All 6 failed for the stated reason — the function did not exist, and today's `setType`
  resets only `category`.
- ☑ **GREEN** — `npm test` → `Test Files  5 passed (5)` / `Tests  105 passed (105)`;
  `npx vite build` → `✓ built in 3.10s`. Greps:
  ```
  $ rg -c "toggleArrayField\('classes'" client/src/pages/Homebrew.jsx
  1
  $ rg -n "input type=\"number\"" client/src/pages/Homebrew.jsx
  (no output, exit 1)
  ```

**Verify:** `cd client && npm test` + `npx vite build`; then
```
rg -c "toggleArrayField\('classes'" client/src/pages/Homebrew.jsx   # exactly 1
rg -n "input type=\"number\"" client/src/pages/Homebrew.jsx         # nothing
```
UI gates — **each of these fails on today's code**:
1. **Stack Size clear gate.** Open an Ammo item, select the whole Stack Size value and press
   **Delete**. Today the field instantly refills with `1` and you cannot leave it empty to
   retype; after the fix it stays empty while focused and commits `1` on blur. Then type `0`
   into a weapon's Bonus and blur — it stays `0`.
   **Do NOT use "select all, then type 30" as this gate.** The first keystroke sets the DOM value
   to `"3"`, so `parseInt("3") || 1` is `3` and **today's broken code passes**. Only clearing the
   field produces `parseInt('') || 1`. An earlier draft of this plan had exactly that flaw.
2. **`strReq` stored type gate.** Save an armor with STR Requirement `0`, re-open → the field
   reads `0`. Then inspect the stored record: `strReq` is the **number** `0`, not the string
   `"0"`. Today `:468` stores `"0"`, and `Equipment.jsx:600`'s `item.strReq > 0` is the reader.
3. Armor with no Armor Type → save is blocked, form stays open, "Armor type is required".
4. Spell with component `M` and no material text → it **saves**, with an amber warning shown.
5. Weapon with damage `2d6` + Heavy → switch to Armor → damage box and property chips are empty.

**Log:**

**Changed:**
- `client/src/utils/homebrew.js` — added `categoryForType` and `resetFormForType(prevForm, type,
  emptyForm)`. It starts from `emptyForm`, carries across only keys in `TYPE_FIELDS[type]` (plus
  any key the form does not own), then forces `type`/`category` and preserves
  `name`/`description`/`rarity`. Every key survives, so unguarded `form.properties.includes(...)`
  reads cannot throw.
- `client/src/utils/homebrew.test.js` — +6 cases for `resetFormForType`.
- `client/src/pages/Homebrew.jsx:7-10` — imports `validateHomebrew`, `resetFormForType`, `NumInput`.
- `client/src/pages/Homebrew.jsx:28` — module-scope `ERR_STYLE` (no component defined inside a
  component; the banner is inline JSX).
- `client/src/pages/Homebrew.jsx:203, 207` — `EMPTY_FORM` now has `strReq: 0` and `aoeSize: 0`
  (numbers, matching the normalizer).
- `client/src/pages/Homebrew.jsx:232-240` — `f()` clears `formErrors` on every change;
  `setType` is now `setForm(prev => resetFormForType(prev, type, EMPTY_FORM))`.
- `client/src/pages/Homebrew.jsx:258-260` — `save` runs `validateHomebrew(body)` first; a
  blocking failure calls `setFormErrors(errors)` and returns, leaving the form open. The quota
  path from Increment 2 still sets `formErrors._save` and also leaves the form open.
- `client/src/pages/Homebrew.jsx:349` — `liveWarnings = validateHomebrew(form).warnings`.
- **NumInput conversions (7 fields, no falsy fallback layered on any of them):** weapon `bonus`
  `:447`, armor `ac` `:499`, armor `bonus` `:503`, `strReq` `:507`, `stackSize` `:536`, ammo
  `bonus` `:540`, `aoeSize` `:661`.
- `client/src/pages/Homebrew.jsx:684-695` — the duplicated picker is gone. The unguarded
  "Classes" block was replaced in place (directly under Components) by the guarded
  `(form.classes || [])` markup, retitled **"Spell Lists"**; the later "Spell Lists (Classes)"
  block was deleted. Section order is now Components (`:669`) → Spell Lists (`:684`) → spell
  damage (`:697`) → Upcast scaling (`:702`) → Higher Levels (`:717`).
- `client/src/pages/Homebrew.jsx:405, 433, 440, 492, 499, 529, 592` — `ERR_STYLE` red border on
  the fields `validateHomebrew` blocks on.
- `client/src/pages/Homebrew.jsx:731-740` — banner above the submit button: blocking errors in
  red (`#f87171`), live warnings in amber (`#fbbf24`).

**Notes:**
- **Base AC is `min={0}`, deliberately, not `min={1}`.** `NumInput` commits a blank field on blur
  as `parseInt('') → NaN → 0 → clamp to min`, so `min={1}` would turn "tabbed through without
  typing" into a silently valid AC 1 armor that passes validation. With `min={0}`,
  `validateHomebrew`'s 1-30 rule rejects it with "Base AC is required (1-30)".
- **Warnings are rendered live, not on save.** `validateHomebrew`'s warnings are non-blocking, so
  a save that only produces warnings closes and resets the form — a warning shown only at save
  time would never be visible. `liveWarnings` is recomputed from `form` each render, which is
  what makes UI gate 4 ("it saves, with an amber warning shown") actually observable.
- `DiceFormulaBuilder` was left at module scope, untouched, including its `rollDice3D` null guard.
- The five UI gates were not run (headless). **Gate 1 in particular is stated correctly in this
  document and was not substituted** — the Stack Size check is "select all, press **Delete**",
  never "select all and type 30", because `parseInt("3") || 1` is `3` and the broken code would
  pass that. The `|| 1` and `|| 0` handlers are now gone from the file entirely (grep above),
  which is the mechanical form of the same check.

---

## Increment 5: Ranged weapon range display — the `ammunition` predicate gap
**Status:** done

**Adjacent, pre-existing, cuttable — with a caveat.** Not part of the original request. It sits
before Increment 6 because Increment 6 starts emitting `ammunition (x/y)` on homebrew weapons,
and without this fix the sheet cannot read that string either — cutting this increment means
homebrew ammunition ranges fall through to the same hardcoded `80/320 ft.`

**What:** Make `rangeText` recognise the `ammunition (x/y)` property that `equipment.json` ships.

**Where:** `client/src/pages/CharacterSheet.jsx:1852-1853`;
`client/src/utils/dndHelpers.js` + `dndHelpers.test.js` (see Test spec).

**Details:** Today the predicate matches only `range` or `thrown`. `equipment.json` stores
ammunition weapons as `"ammunition (150/600)"` — 14 entries carry an `ammunition (` property —
containing neither substring, so the `.find()` **always misses** and the hardcoded fallback wins.
**A Longbow (150/600) and a Sling (30/120) both display `80/320 ft.` today.** Add `ammunition` as
a third substring. Keep the fallback — a ranged weapon with no parenthetical still needs
something. Do not change display formatting; the property string is already what the row prints.

**Test spec**
- **File:** `client/src/utils/dndHelpers.test.js` (extend)
- **Extraction required to make this increment testable.** The plan patches the expression inline
  at `CharacterSheet.jsx:1852-1853`, where nothing can assert it. Extract the predicate to
  `dndHelpers.js`:
  ```js
  export function weaponRangeText(properties, isRanged)
  ```
  and call it from `:1852`. Behaviour-identical; see **Concerns**.
- **Asserts:**
  - `weaponRangeText(['ammunition (150/600)','two-handed','heavy'], true)` → `'ammunition (150/600)'`
    ← **the bug**; today this returns `'80/320 ft.'`
  - `weaponRangeText(['ammunition (30/120)'], true)` → `'ammunition (30/120)'` (Sling)
  - `weaponRangeText(['thrown (20/60)','light'], false)` → `'thrown (20/60)'` (Handaxe — the
    existing branch must not regress)
  - `weaponRangeText(['finesse','light'], false)` → `'5 ft.'` (Shortsword)
  - `weaponRangeText([], false)` → `'5 ft.'` (Longsword)
  - `weaponRangeText([], true)` → `'80/320 ft.'` (fallback preserved for a ranged weapon with no
    parenthetical)
  - `weaponRangeText(undefined, false)` → `'5 ft.'` and `weaponRangeText(undefined, true)` →
    `'80/320 ft.'` (the `wpn.properties?.` optional-chain case)
  - `weaponRangeText(['Ammunition (80/320)'], true)` → `'Ammunition (80/320)'` (case-insensitive
    match; the string is returned **verbatim**, not lowercased)
- **Must fail before implementation because:** `weaponRangeText` does not exist, and the
  expression it replaces returns `'80/320 ft.'` for the first two cases.

**Gates**
- ☑ **RED** — 6 new cases (10 asserts) written; `npm test` →
  ```
  ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯
   FAIL  src/utils/dndHelpers.test.js > weaponRangeText > finds the ammunition parenthetical instead of falling back
  TypeError: weaponRangeText is not a function
  ```
  Failing for the stated reason — the helper did not exist.
- ☑ **GREEN** — `npm test` → `Test Files  5 passed (5)` / `Tests  111 passed (111)`;
  `npx vite build` → `✓ built in 2.94s`

**Verify:** `cd client && npm test` + `npx vite build`.
UI: equip a stock **Longbow** → Actions row range reads **`ammunition (150/600)`**, not
`80/320 ft.` Stock **Sling** → **`ammunition (30/120)`**. Stock **Handaxe** → still
`thrown (20/60)`. Stock **Longsword** → still `5 ft.`

**Log:**

**Changed:**
- `client/src/utils/dndHelpers.js` — new exported `weaponRangeText(properties, isRanged)`.
  Adds `ammunition` as a third substring alongside `range` and `thrown`, keeps the
  `80/320 ft.` / `5 ft.` fallback, matches case-insensitively and returns the stored property
  **verbatim** (not lowercased) so the row prints exactly what `equipment.json` holds.
- `client/src/utils/dndHelpers.test.js` — +6 cases including the two bug cases
  (Longbow `150/600`, Sling `30/120`), the thrown non-regression, both fallbacks, the
  `properties === undefined` optional-chain case, and the verbatim/case-insensitive case.
- `client/src/pages/CharacterSheet.jsx:16` — import `weaponRangeText`.
- `client/src/pages/CharacterSheet.jsx:1845` — the two-line inline predicate replaced by
  `const rangeText = weaponRangeText(wpn.properties, isRanged);`. The single consumer at
  `:1973` is unchanged, so display formatting is untouched.

**Notes:**
- The incrementer's `weaponRangeText` extraction was kept, as instructed. It is
  behaviour-identical to the inline expression apart from the added `ammunition` term, and it is
  what gives this increment a real red gate instead of a UI-only one.
- The UI gate (equip a Longbow / Sling / Handaxe / Longsword and read the Actions row) was not
  run — headless. All four of those cases are asserted directly against the extracted helper.

---

## Increment 6: Rules correctness — parameterised weapon properties, mastery, armor
**Status:** done

**What:** Make the weapon property picker emit the strings the sheet actually parses
(`versatile (1d10)`, `thrown (20/60)`, `ammunition (80/320)`), drop the bogus `Range` property,
add a 2024 Weapon Mastery selector, add the missing ruleset gate on the mastery badge, and show
the armor AC formula live.

**Where:** `client/src/pages/Homebrew.jsx:14` (`DAMAGE_TYPES`), `:19` (`PROPERTIES`), `:389-446`
(weapon section), `:455-480` (armor section); `client/src/pages/CharacterSheet.jsx:1929` (mastery
ruleset gate); `client/src/utils/homebrew.js` + `.test.js` (serialise/parse helpers).

**Details:**
- **New `PROPERTIES`:** `Ammunition, Finesse, Heavy, Light, Loading, Reach, Special, Thrown,
  Two-Handed, Versatile`. **`Range` is removed** — PHB p.147 uses it as the glossary heading
  explaining the `(x/y)` parenthetical, not a Properties-column entry; range lives inside
  `Ammunition (x/y)` / `Thrown (x/y)`. **`Special` stays** (Lance, Net). Existing saves containing
  `"Range"` must still round-trip: `normalizeHomebrewItem` keeps unknown property strings
  verbatim, and the picker renders any unrecognised stored property as an extra read-only chip
  with an ✕ to remove it.
- **Parameterised chips.** `Versatile` → a die `<select>` (`d4/d6/d8/d10/d12`);
  `Thrown` or `Ammunition` → two `NumInput`s (normal / long). Stored lowercase and parenthesised,
  matching `equipment.json` exactly. `serializeProperty` / `parseProperty` live in
  `utils/homebrew.js` so the picker can round-trip an existing item into its controls on
  `startEdit`. All other properties serialise to plain lowercase (`finesse`, `two-handed`),
  which every sheet check already handles via `.toLowerCase().includes(...)`.
- **Weapon Mastery `<select>`** in the weapon grid, options from `Object.keys(WEAPON_MASTERIES)`
  (`dndConstants.js:321-331`, 8 entries: Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex) plus
  a blank "None". Stored as `mastery`. Label "Weapon Mastery (2024)".
  **Do not gate the Homebrewer itself on a ruleset** — the page has no character in context
  (`Homebrew.jsx:1-2` imports only `useDice`), the `ond-homebrew` collection is global across all
  characters, and the same weapon may be used by a 2014 and a 2024 character at the same table.
- **The ruleset gate belongs on the consumer.** `CharacterSheet.jsx:1929` is today
  `const hasMastery = mastery && WEAPON_MASTERY_CLASSES[char.class];` — no ruleset term, so a
  **2014** Fighter also sees the badge. Weapon Mastery is 2024-only. Add
  `&& char.ruleset === '2024'`. This one-line rider is what makes the increment's UI gate
  meaningful, and it belongs here because this is the ruleset-flavoured increment.
- **Damage types** stored lowercase (matching `equipment.json` / `spells.json`), displayed
  capitalised via a label/value split. `normalizeHomebrewItem` lowercases on read (Increment 2)
  so existing `"Slashing"` records upgrade without a rewrite. The visible payoff is the homebrew
  damage colour added in Increment 3.
- **Armor:** show the resulting AC formula live under the subcategory field —
  `Light → AC + DEX`, `Medium → AC + DEX (max 2)`, `Heavy → AC (no DEX)`, `Shield → +AC`.
  This is the user-facing statement of the Heavy Armor rule and makes a mis-set type obvious
  before saving.
- Any parameterised-property row component must be **module scope** (§1), like
  `DiceFormulaBuilder` at `:25`. If this work touches `DiceFormulaBuilder`, re-check its
  `rollDice3D` null guard at `:32` (§"One roll at a time").

**Test spec**
- **File:** `client/src/utils/homebrew.test.js` (extend)
- **Asserts** (the plan's cases):
  - `serializeProperty('Versatile', {die:'1d10'})` → `'versatile (1d10)'`
  - `serializeProperty('Thrown', {normal:20, long:60})` → `'thrown (20/60)'`
  - `serializeProperty('Ammunition', {normal:80, long:320})` → `'ammunition (80/320)'`
  - `serializeProperty('Two-Handed', {})` → `'two-handed'`
  - `serializeProperty('Finesse')` → `'finesse'`
  - `parseProperty('ammunition (80/320)')` deep-equals `{name:'Ammunition', params:{normal:80, long:320}}`
    (numbers, not strings)
  - `parseProperty('versatile (1d10)')` deep-equals `{name:'Versatile', params:{die:'1d10'}}`
  - `parseProperty('finesse')` deep-equals `{name:'Finesse', params:{}}`
  - **Round trip** — `serializeProperty(p.name, p.params) === x` where `p = parseProperty(x)`,
    for **all** of `'versatile (1d8)'`, `'thrown (20/60)'`, `'ammunition (150/600)'`, `'reach'`
  - **Legacy passthrough:** `parseProperty('Range')` → `{name:'Range', params:{}}` (an
    unrecognised stored property must survive, not throw or vanish — it is what backs the
    read-only ✕ chip)
- **Must fail before implementation because:** neither function exists. There is no code today
  that produces `'versatile (1d10)'` — the picker emits the bare word `"Versatile"`, which is why
  `CharacterSheet.jsx:1871-1876` finds no `\d+d\d+` and the 2H damage button never renders.
- The mastery `<select>`, the ruleset rider and the AC-formula hint are UI wiring; covered by
  the grep and UI gates.

**Gates**
- ☑ **RED** — 6 new cases written; `npm test` →
  ```
  ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯
   FAIL  src/utils/homebrew.test.js > serializeProperty > serialises the parameterised properties the way equipment.json stores them
  TypeError: serializeProperty is not a function
   FAIL  src/utils/homebrew.test.js > parseProperty > parses the parameterised forms back into name + params
  TypeError: parseProperty is not a function
  ```
  Failing for the stated reason — neither function existed, and no code produced
  `'versatile (1d10)'`.
- ☑ **GREEN** — `npm test` → `Test Files  5 passed (5)` / `Tests  117 passed (117)`;
  `npx vite build` → `✓ built in 3.20s`. Grep:
  ```
  $ rg -n "'Range'" client/src/pages/Homebrew.jsx
  (no output, exit 1)
  ```

**Verify:** `cd client && npm test` + `npx vite build`; then
```
rg -n "'Range'" client/src/pages/Homebrew.jsx    # nothing
```
UI: create "Storm Halberd", Martial Melee, `1d10` slashing, Versatile → `1d12`, Mastery → Cleave.
Equip it on a **level-5 Fighter with `ruleset: '2024'`** and 16 STR: the Actions tab shows **two**
damage buttons, `1H: 1d10+3` and `2H: 1d12+3`, and a purple `CLEAVE` badge. Then switch that
character's ruleset to **2014** and reload the sheet: the two damage buttons remain, the `CLEAVE`
badge is **gone**. (Without the ruleset rider the badge shows on both and the gate proves nothing.)

**Log:**

**Changed:**
- `client/src/utils/homebrew.js` — added `WEAPON_PROPERTIES` (the ten real properties;
  **`Range` is gone**, `Special` stays), `PARAM_PROPERTIES`, `serializeProperty(name, params)`
  and `parseProperty(str)`. `parseProperty` returns an unrecognised string with its stored
  casing and empty params, which is what backs the read-only chip.
- `client/src/utils/homebrew.test.js` — +6 cases, including the four-value round trip and the
  `parseProperty('Range')` legacy-passthrough case.
- `client/src/pages/Homebrew.jsx:3-11` — imports the two helpers, `WEAPON_PROPERTIES`, and
  `WEAPON_MASTERIES` from `dndConstants`.
- `client/src/pages/Homebrew.jsx:26-42` — the local `PROPERTIES` array (which contained the
  bogus `Range`) is deleted; added module-scope `PROP_DEFAULTS`, `VERSATILE_DICE` and
  `AC_FORMULA`. All module scope — no component defined inside a component.
- `client/src/pages/Homebrew.jsx:223` — `EMPTY_FORM` gains `mastery: ''`.
- `client/src/pages/Homebrew.jsx:268-282` — property helpers (`propList`, `parsedProps`,
  `hasProp`, `propParams`, `toggleProperty`, `setPropParams`, `unknownProps`). Plain functions
  on the component, not components.
- `client/src/pages/Homebrew.jsx:512-551` — the picker now toggles **serialised** properties,
  renders a die `<select>` for Versatile and two `NumInput`s for Thrown / Ammunition, and shows
  any unrecognised stored property as a dashed read-only chip with a ✕ to remove it.
- `client/src/pages/Homebrew.jsx:487-494` — Weapon Mastery `<select>`, options from
  `Object.keys(WEAPON_MASTERIES)` (the 8 entries) plus a blank "None", labelled
  "Weapon Mastery (2024)". **The Homebrewer itself is not ruleset-gated** — it has no character
  in context and `ond-homebrew` is global across characters.
- `client/src/pages/Homebrew.jsx:440, 604` — damage-type `<option>`s now use
  `value={d.toLowerCase()}` with the capitalised label, so storage matches
  `equipment.json`/`spells.json` and `DMG_COLORS`. Legacy `"Slashing"` records still edit
  correctly because `load()` goes through `readHomebrew()`, which lowercases on read.
- `client/src/pages/Homebrew.jsx:559-563` — live AC-formula hint under the armor type:
  `Light → AC + DEX`, `Medium → AC + DEX (max 2)`, `Heavy → AC (no DEX)`,
  `Shield → +AC (added to your total)`, with a prompt when nothing is selected.
- `client/src/pages/CharacterSheet.jsx:1921-1923` — **the ruleset rider**:
  `const hasMastery = mastery && WEAPON_MASTERY_CLASSES[char.class] && char.ruleset === '2024';`
  Weapon Mastery is 2024-only; without this a 2014 Fighter also saw the badge.

**Notes:**
- `DiceFormulaBuilder` was not touched — it stays at module scope with its `rollDice3D` null
  guard intact.
- Post-rename grep (the build does not catch undefined variables): every new identifier
  (`PROP_DEFAULTS`, `VERSATILE_DICE`, `AC_FORMULA`, `WEAPON_MASTERIES`, `propList`, `parsedProps`,
  `hasProp`, `propParams`, `toggleProperty`, `setPropParams`, `unknownProps`,
  `WEAPON_PROPERTIES`) resolves to a definition or import in the same file; the old `PROPERTIES`
  and `toggleArrayField('properties', ...)` references are gone.
- The UI gate (Storm Halberd on a level-5 2024 Fighter, then switched to 2014) was not run —
  headless. The serialise/parse half is asserted; the rider is a one-line change verified by grep.

---

## Increment 7: Wire the dead fields, and the UX refinements worth having
**Status:** done

**What:** Move `defaultAmmoCount` into `utils/homebrew.js` with tests and make it honour
`stackSize`, make the ammo damage dice reach the damage roll, then add list sorting, a Duplicate
action, and a duplicate-name warning.

**Where:** `client/src/pages/CharacterSheet.jsx:114-117` (`defaultAmmoCount` definition), call
sites `:1859`, `:1896`, `:1960`, `:2529`, `:3763`; `:1861-1862` + `:1888` (ammo bonus / damage
formula) and `:1994` (2H formula); `client/src/pages/Homebrew.jsx:225-231` (`load`), `:250-268`
(`save`), `:773-779` (action row); `client/src/utils/homebrew.js` + `.test.js`.

**Details:**
- **`defaultAmmoCount` moves to `utils/homebrew.js`** as a pure exported function. New signature
  `defaultAmmoCount(name, item)`, precedence:
  1. a `(N)` group parsed out of the item **name** — this is how `equipment.json` ships ammo
     (`Arrows (20)`), so it must win;
  2. `item.stackSize` via `parseInt` **when the result is a positive integer** (legacy records
     store a number, but a hand-edited or imported record may hold a string);
  3. `20`.
  Delete the inline definition at `CharacterSheet.jsx:114-117`, import from the util, and pass
  `equipCache.current[name]` as the second argument at **all five** call sites.
- **Ammo damage dice** — append the selected ammo's dice to the rider suffix at `:1888`, routed
  through `weaponDamageDice` (`dndHelpers.js`) per §"Weapon damage strings carry the magic bonus
  twice", because `ammoCached.bonus` is already folded into `dmgBonus`. Raw string concatenation
  would make magical ammo double-count its `+N`. Apply to the 2H formula at `:1994` as well, and
  add the ammo's name to the damage roll label.
- **Sort.** Replace `load`'s bare filter chain with a stable sort: type (in `TYPES` order), then
  name, `localeCompare`. No new control, no new state.
- **Duplicate.** A button in the action row next to Edit: `readHomebrewRaw()`, deep-clone,
  `name: '<name> (Copy)'`, fresh `_id`/`createdAt`, append via `appendImportedRecord`,
  `writeHomebrew`, `load()`. **Raw read — same rule as every other mutation path.**
- **Duplicate-name warning.** On save, if another item (different `_id`) shares the `name`
  case-insensitively, or `getLocalEquipmentByName(name)` / a `spells.json` entry uses it, show a
  **non-blocking** warning: "An item named X already exists — the character sheet will use the
  built-in one." That is factually what happens (`CharacterSheet.jsx:273` is
  `getLocalEquipmentByName(name) || hbItems.find(...)`). Warn, do not block — shadowing is
  sometimes deliberate.
- **Cut, deliberately:** bulk collection export/import, delete-undo (raw `confirm()` matches
  `Characters.jsx:24`, the app's only other destructive action), rich-text descriptions,
  per-item images.

**Test spec**
- **File:** `client/src/utils/homebrew.test.js` (extend)
- **Asserts** — the plan's `defaultAmmoCount` cases, verbatim:
  - `defaultAmmoCount('Arrows (20)', { stackSize: 30 })` → `20`  ← name wins over `stackSize`
  - `defaultAmmoCount('Flame Arrows', { stackSize: 30 })` → `30`
  - `defaultAmmoCount('Flame Arrows', { stackSize: 0 })` → `20`  ← `0` is not a positive integer
  - `defaultAmmoCount('Flame Arrows', { stackSize: '30' })` → `30`  ← legacy string record
  - `defaultAmmoCount('Flame Arrows', undefined)` → `20`
  - Plus: `defaultAmmoCount(undefined, undefined)` → `20` (the `name?.match` optional-chain path);
    `defaultAmmoCount('Bolts (20)', undefined)` → `20`;
    `defaultAmmoCount('Flame Arrows', { stackSize: -5 })` → `20`;
    `defaultAmmoCount('Flame Arrows', { stackSize: 'abc' })` → `20`
- **Must fail before implementation because:** `utils/homebrew.js` exports no `defaultAmmoCount`,
  and the inline version at `CharacterSheet.jsx:114-117` takes **one** argument and ignores
  `stackSize` entirely — so the `{ stackSize: 30 } → 30` cases describe behaviour that does not
  exist. (This is the "custom ammo always arrives as 20" bug.)
- The ammo-dice suffix, sorting, Duplicate and the name warning have no isolated pure logic
  specified by the plan; they are covered by the grep and UI gates.

**Gates**
- ☑ **RED** — 3 new cases (10 asserts) written; `npm test` →
  ```
  ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
   FAIL  src/utils/homebrew.test.js > defaultAmmoCount > lets a (N) group in the name win over stackSize
  TypeError: defaultAmmoCount is not a function
  ```
  Failing for the stated reason — `utils/homebrew.js` exported no `defaultAmmoCount`, and the
  inline version took one argument and ignored `stackSize` entirely.
- ☑ **GREEN** — `npm test` → `Test Files  5 passed (5)` / `Tests  120 passed (120)`;
  `npx vite build` → `✓ built in 3.11s`. Greps below.

**Verify:** `cd client && npm test` + `npx vite build`; then
```
rg -n "defaultAmmoCount\(" client/src   # definition only in utils/homebrew.js; 5 two-arg call sites
```
Before shipping, confirm the blast radius of the ammo-dice change:
```
rg -n '"subcategory": "Ammunition"' -A 6 client/src/data/equipment.json   # expect no `damage` field
```
UI: create homebrew ammo "Flame Arrows", type Arrow, stack size 30, damage `1d6`, damage type
fire; add and equip it plus any bow. The Inventory ammo counter starts at **30** (today: 20), and
the bow's damage button reads `1d8+3+1d6` for DEX +3 (today: `1d8+3`), decrementing to 29 on
fire. Click Duplicate on any item → a `… (Copy)` appears immediately below it in the sorted list.
Create a second homebrew item named "Longsword" → the warning banner appears **and the item still
saves**.

**Log:**

**Grep gates (real output):**
```
$ rg -n "defaultAmmoCount\(" client/src
client/src/utils/homebrew.js:257                 export function defaultAmmoCount(name, item)   <- the only definition
client/src/pages/CharacterSheet.jsx:1845, 1887, 1953, 2522, 3756                                <- 5 two-arg call sites
client/src/utils/homebrew.test.js:455-469                                                       <- the tests
```
```
$ rg -n '"subcategory": "Ammunition"' -A 6 client/src/data/equipment.json | rg -i damage
(only `description` prose — no `damage` field on any Ammunition entry)
```
So the ammo-dice change is visible on homebrew ammo only; no shipped ammo gains damage dice.

**Changed:**
- `client/src/utils/homebrew.js:246-263` — `defaultAmmoCount(name, item)` as a pure export, with
  the plan's precedence: a `(N)` group in the **name** wins (that is how `equipment.json` ships
  ammo), then `item.stackSize` **when it parses to a positive integer**, then `20`.
- `client/src/utils/homebrew.test.js` — +3 cases / 10 asserts, including the legacy string
  record, `0`, `-5`, `'abc'` and both `undefined` paths.
- `client/src/pages/CharacterSheet.jsx:112-116` — the inline one-argument definition is deleted.
- `client/src/pages/CharacterSheet.jsx:16, 20` — imports `weaponDamageDice` and `defaultAmmoCount`.
- `client/src/pages/CharacterSheet.jsx:1845, 1887, 1953, 2522, 3756` — all five call sites now
  pass `equipCache.current[name]` as the second argument.
- `client/src/pages/CharacterSheet.jsx:1849-1853` — `ammoDice` / `ammoSuffix`. The ammo's dice go
  through **`weaponDamageDice`**, not raw string concatenation, because `ammoCached.bonus` is
  already folded into `dmgBonus` — concatenating the raw string would make magical ammo
  double-count its `+N`.
- `client/src/pages/CharacterSheet.jsx:1879` — 1H formula suffix is now
  `riderDamageSuffix + ammoSuffix`.
- `client/src/pages/CharacterSheet.jsx:1987-1988` — the 2H formula and its display carry
  `ammoSuffix` too.
- `client/src/pages/CharacterSheet.jsx:1982, 1987` — the damage roll labels name the ammo:
  `Longbow + Flame Arrows Damage`.
- `client/src/pages/Homebrew.jsx:12` — imports `getLocalEquipmentByName` / `getAllLocalSpells`.
- `client/src/pages/Homebrew.jsx:253-257` — `load()` sorts by type (in `TYPES` order) then name
  via `localeCompare`. No new control, no new state.
- `client/src/pages/Homebrew.jsx:319-333` — `duplicateItem`: **`readHomebrewRaw()`**, deep clone,
  ` (Copy)` suffix, fresh `_id`/`createdAt`/`updatedAt`, `appendImportedRecord`, `writeHomebrew`,
  `load()`. Same raw-read rule as every other mutation path.
- `client/src/pages/Homebrew.jsx:402-415` — the duplicate-name warning is folded into
  `liveWarnings` as `_name`: another homebrew record with the same name (different `_id`), or a
  `getLocalEquipmentByName` hit, or a `spells.json` name match. **Non-blocking** — it renders in
  the amber banner and the item still saves. That is factually what happens on the sheet, which
  resolves the built-in name first.
- `client/src/pages/Homebrew.jsx:916` — Duplicate button next to Edit.

**Notes:**
- Cut deliberately, per the plan: bulk collection export/import, delete-undo, rich-text
  descriptions, per-item images.
- The name-collision check reads `readHomebrewRaw()` — it is a read for display, but using raw
  here is deliberate so a record the normalizer hides still counts as a name collision.
- UI gates (Flame Arrows stack of 30, `1d8+3+1d6`, Duplicate, the name banner) were not run —
  headless. `defaultAmmoCount` is fully asserted; the rest is verified by the greps above.

---

## Increment 8: Cantrip damage scales with character level (5/11/17)
**Status:** done

**What:** Apply the 5/11/17 cantrip damage tiers on the character sheet and align `Spells.jsx`
with the same helper — **excluding Eldritch Blast, Magic Stone, Shillelagh, Green-Flame Blade and
every `source: 'race'` pseudo-spell.**

**Where:**
- `client/src/utils/dndHelpers.js` + `client/src/utils/dndHelpers.test.js` — **not**
  `utils/homebrew.js`; this is general spell logic
- `client/src/pages/CharacterSheet.jsx:1005` (`SpellCard.effectiveDamage`), `:2102`
  (prepared-spell row), `:3678-3682` (side-panel damage `RollBtn`)
- `client/src/pages/Spells.jsx:58-66` (`scaledDice`), `:299`

**Details:**
- New pure helpers in `dndHelpers.js`: `CANTRIP_NO_SCALE` (a `Set`), `cantripTierBonus(charLevel)`
  (`>=17 → 3`, `>=11 → 2`, `>=5 → 1`, else `0`), and `cantripDamage(spell, charLevel)`.
- `cantripDamage` guard order: not a spell / `level !== 0` → return `spell?.damage`;
  no `damage` → return unchanged; **`source === 'race'` → unchanged**;
  `CANTRIP_NO_SCALE.has(spell.name)` → unchanged; `/^(\d+)d(\d+)$/` fails → unchanged;
  otherwise `${count + cantripTierBonus(lvl)}d${sides}`.
- **`cantripDamage` deliberately does NOT key on `scaling`** — it keys on `level === 0` plus the
  exclusions. (Measured: `scaling` is `''` on 382 entries, absent on 68, a dice string on 71.
  There is **no** `"None"` value in `spells.json` — that string is only an `<option>` label at
  `Spells.jsx:564`.)
- **A blanket "level-0 with dice scales" rule mis-scales at least 19 entries.** Each exclusion is
  real, and each gets its own assertion below:
  - **Eldritch Blast** (`local_sp_8`, `damage: "1d10"`, no `scaling` field) — the rule is *more
    beams*: 1→2→3→4 **separate spell attack rolls** at 5/11/17. A blanket rule turns it into a
    single **4d10** hit. **Beams are deliberately not modelled**; its `higherLevels` text already
    renders at `CharacterSheet.jsx:3704-3707` and `Spells.jsx:488-497`.
  - **`source: 'race'`** — all 15 racial pseudo-spells with level-0 damage, including the ten
    Dragonborn Breath Weapons, whose progression is **2d6/3d6/4d6/5d6 at levels 1/6/11/16** — a
    different tier set entirely.
  - **Magic Stone** (`1d6` + spellcasting mod) and **Shillelagh** (`1d8`, a weapon buff) — no RAW
    level progression at all.
  - **Green-Flame Blade** — its stored `1d8` is already the **5th-level** value (real tiers
    0/1d8/2d8/3d8 at 1-4/5/11/17), so scaling it would run one die **high** at every tier and be
    *worse* than today. (Booming Blade is fine: its stored `1d8` is the movement damage, which
    genuinely goes 1d8/2d8/3d8/4d8 — do **not** add it to the exclusion set.)
  - **Non-damage cantrips** (Guidance, Mending, Spare the Dying, Prestidigitation) — covered by
    the `!spell.damage` guard.
  - **Homebrew cantrips scale by default, and that is intended.** A homebrew record has no
    `source` (`normalizeHomebrewItem` sets `homebrew: true`), so any homebrew level-0 spell with
    an `NdM` damage string scales. Corollary, accepted: because `CANTRIP_NO_SCALE` is name-keyed,
    a homebrew spell *named* "Eldritch Blast" is silently excluded too.
- Wiring: `:1005` and `:2102` become
  `canUpcast ? getUpcastDamage(spell, castLevel) : cantripDamage(spell, char.level || 1)`
  (`canUpcast` already requires `level > 0`, so the branches never overlap). `:3678-3682` uses
  `cantripDamage(sidePanel.data, char.level || 1)` for **both** the `formula` and the label, so
  the button rolls what it displays.
- `Spells.jsx:58-66` — delete the local `scaledDice`, import `cantripDamage`, change `:299` to
  `const dmgDice = cantripDamage(s, charLevel) ?? s.damage;`. This subsumes the old
  `s.scaling === 'cantrip'` branch.
- **`scaling === 'cantrip'` is not dead — handle its writer.** `Spells.jsx`'s own "+ Add Spell"
  form (`:82-133`) has a Scaling `<select>` offering `Cantrip (5/11/17)` (`:565-568`) that POSTs
  to `/api/spells`. **Leave that option in place**; a spell it writes now scales because it is
  level 0, so the sentinel becomes harmless metadata. Do not delete it without changing that form.
- `CharacterSheet.jsx:1001`'s `SpellCard` is defined **inside** the component — a pre-existing §1
  violation. **Out of scope; do not "fix" it here.**
- **Largest blast radius in the plan** — this changes displayed damage for every character with a
  scaling cantrip at level 5+. Ship the unit tests in the same increment.

**Test spec**
- **File:** `client/src/utils/dndHelpers.test.js` (extend)
- **Asserts** — the plan's cases, verbatim. Each exclusion gets its own line; do **not**
  collapse them into a loop, and do not drop any.
  ```
  cantripDamage({ level: 0, name: 'Fire Bolt',      damage: '1d10', source: 'class' }, 1)  === '1d10'
  cantripDamage({ level: 0, name: 'Fire Bolt',      damage: '1d10', source: 'class' }, 4)  === '1d10'
  cantripDamage({ level: 0, name: 'Fire Bolt',      damage: '1d10', source: 'class' }, 5)  === '2d10'
  cantripDamage({ level: 0, name: 'Fire Bolt',      damage: '1d10', source: 'class' }, 11) === '3d10'
  cantripDamage({ level: 0, name: 'Fire Bolt',      damage: '1d10', source: 'class' }, 17) === '4d10'
  cantripDamage({ level: 0, name: 'Eldritch Blast', damage: '1d10', source: 'class' }, 17) === '1d10'   // beams, not dice
  cantripDamage({ level: 0, name: 'Magic Stone',    damage: '1d6',  source: 'class' }, 17) === '1d6'
  cantripDamage({ level: 0, name: 'Shillelagh',     damage: '1d8',  source: 'class' }, 17) === '1d8'
  cantripDamage({ level: 0, name: 'Green-Flame Blade', damage: '1d8', source: 'class' }, 17) === '1d8'  // stored base IS the 5th-level value
  cantripDamage({ level: 0, name: 'Breath Weapon (Red — Fire)', damage: '2d6', source: 'race' }, 17) === '2d6'
  cantripDamage({ level: 0, name: 'Guidance',       damage: undefined, source: 'class' }, 17) === undefined
  cantripDamage({ level: 3, name: 'Fireball',       damage: '8d6',  source: 'class' }, 17) === '8d6'    // not a cantrip
  cantripDamage({ level: 0, name: 'Ashen Spark',    damage: '1d6',  homebrew: true }, 11) === '3d6'     // homebrew: no `source`, scales by design
  ```
  Add these boundary and shape cases alongside:
  - `cantripDamage({level:0, name:'Booming Blade', damage:'1d8', source:'class'}, 17)` → `'4d8'`
    (Booming Blade is **not** excluded — this guards against over-broad exclusion)
  - `cantripDamage({level:0, name:'Acid Splash', damage:'1d6', source:'class'}, 10)` → `'2d6'` and
    at `16` → `'3d6'` (mid-tier, not just the boundary levels)
  - `cantripDamage({level:0, name:'X', damage:'1d6 + mod', source:'class'}, 17)` → `'1d6 + mod'`
    (non-`NdM` string left alone)
  - `cantripDamage(null, 17)` → `undefined`; `cantripDamage(undefined, 17)` → `undefined`
  - `cantripTierBonus(1)` → `0`, `(4)` → `0`, `(5)` → `1`, `(10)` → `1`, `(11)` → `2`, `(16)` → `2`,
    `(17)` → `3`, `(20)` → `3`, `(undefined)` → `0` (the `Number(x) || 1` default puts it at level 1)
- **Must fail before implementation because:** `cantripDamage` and `cantripTierBonus` do not
  exist in `dndHelpers.js`. There is no character-level cantrip path anywhere in the sheet —
  `getUpcastDamage` returns early on `spell.level === 0` (`CharacterSheet.jsx:821`), which is why
  **Fire Bolt reads `1d10` at level 17 today**. The `'2d10'`/`'3d10'`/`'4d10'` asserts describe
  behaviour the app does not have.

**Gates**
- ☑ **RED** — 12 new cases written; `npm test` →
  ```
  ⎯⎯⎯⎯⎯⎯ Failed Tests 12 ⎯⎯⎯⎯⎯⎯⎯
   FAIL  src/utils/dndHelpers.test.js > cantripTierBonus > follows the 5/11/17 tiers at and between every boundary
  TypeError: cantripTierBonus is not a function
   FAIL  src/utils/dndHelpers.test.js > cantripDamage > adds a die at 5, 11 and 17 for an ordinary class cantrip
  TypeError: cantripDamage is not a function
  ```
  Failing for the stated reason — neither helper existed and the sheet had no character-level
  cantrip path at all.
  **All five exclusions have their own passing assertion, not collapsed into a loop:**
  Eldritch Blast → `1d10` at 17; Magic Stone → `1d6` at 17; Shillelagh → `1d8` at 17;
  Green-Flame Blade → `1d8` at 17; `source: 'race'` breath weapon → `2d6` at 17. Plus the
  homebrew **inclusion** case (`{level:0, damage:'1d6', homebrew:true}` at 11 → `3d6`) and the
  opposite-direction guard, **Booming Blade → `4d8`** at 17.
- ☑ **GREEN** — `npm test` → `Test Files  5 passed (5)` / `Tests  132 passed (132)`;
  `npx vite build` → `✓ built in 3.20s`. Grep:
  ```
  $ rg -n "scaledDice" client/src
  (no output, exit 1)
  ```

**Verify:** `cd client && npm test` + `npx vite build`; then
```
rg -n "scaledDice" client/src   # nothing — the local copy in Spells.jsx is gone
```
UI: a level-17 Wizard with Fire Bolt prepared → the prepared-spell row, the `SpellCard` **and**
the side-panel damage button all read **`4d10`**, and the button rolls 4d10. A level-17 Warlock
with Eldritch Blast → still **`1d10`**, with the "At Higher Levels" text explaining the four
beams. A level-4 Wizard with Fire Bolt → still `1d10`. A level-17 Dragonborn's Breath Weapon →
still `2d6`. A level-17 Cleric with Guidance → no damage button.

**Log:**

**Changed:**
- `client/src/utils/dndHelpers.js` — added `CANTRIP_NO_SCALE` (a `Set` of the four excluded
  class cantrips, each with its reason in the comment), `cantripTierBonus(charLevel)`
  (`>=17 → 3`, `>=11 → 2`, `>=5 → 1`, else `0`) and `cantripDamage(spell, charLevel)`.
  Guard order exactly as specified: not a spell / `level !== 0` → `spell?.damage`;
  no `damage` → unchanged; `source === 'race'` → unchanged; `CANTRIP_NO_SCALE.has(name)` →
  unchanged; `/^(\d+)d(\d+)$/` fails → unchanged; otherwise `${count + bonus}d${sides}`.
- `client/src/utils/dndHelpers.test.js` — +12 cases.
- `client/src/pages/CharacterSheet.jsx:16` — imports `cantripDamage`.
- `client/src/pages/CharacterSheet.jsx:992` (`SpellCard`) and `:2095` (prepared-spell row) —
  `canUpcast ? getUpcastDamage(...) : cantripDamage(spell, char.level || 1)`. `canUpcast` already
  requires `level > 0`, so the branches never overlap.
- `client/src/pages/CharacterSheet.jsx:3670-3679` — the side-panel damage `RollBtn` now computes
  `panelDamage` **once** and uses it for **both** the `formula` and the label, so the button
  rolls exactly what it displays.
- `client/src/pages/Spells.jsx:5` — imports `cantripDamage`.
- `client/src/pages/Spells.jsx:283` — `const dmgDice = cantripDamage(s, charLevel) ?? s.damage;`
  This subsumes the old `s.scaling === 'cantrip'` branch.
- `client/src/pages/Spells.jsx` — the local `scaledDice` is deleted, and so is `parseDice`, which
  existed only to serve it and was left with no callers (its `/* dice helpers */` header went
  with it). `Equipment.jsx` has its own separate `parseDice`, untouched.

**Notes:**
- **`scaling === 'cantrip'` was not deleted.** `Spells.jsx:551` still offers
  `<option value="cantrip">Cantrip (5/11/17)</option>` in its own "+ Add Spell" form, which POSTs
  to `/api/spells`. A spell it writes now scales because it is level 0, so the sentinel is
  harmless metadata. Left in place, as instructed.
- **`char.level` is the right field, checked.** `syncPrimaryFromClasses` (`utils/multiclass.js`)
  writes `level: total`, so `char.level` is the **total** character level even for a multiclass
  character. The plan's `char.level || 1` therefore gives RAW-correct character-level scaling;
  no substitution of `getTotalLevel` was needed.
- `CharacterSheet.jsx:1001`'s `SpellCard` is still defined inside the component. That is a
  pre-existing violation and explicitly out of scope; it was not touched.
- Largest blast radius in the plan — the exclusion list is what keeps it from being a
  regression, and the unit tests ship in the same increment.
- UI gates (level-17 Wizard / Warlock / Dragonborn / Cleric) were not run — headless. Every one
  of those four cases is asserted directly against `cantripDamage`.

---

## Increment 9: Docs + changelog
**Status:** done

**What:** Record everything above per CLAUDE.md. Exact content is in the plan's
"Docs & changelog" section — copy it from there; do not paraphrase.

**Where:** `CHANGELOG.md` (the `## vX.X.X — Unreleased` block at **line 29**),
`Docs/client-pages.md:110-125` (plus `:95` Spells, `:105` Equipment, the `CharacterSheet.jsx` and
`CharacterEdit.jsx` sections), `Docs/client-context-hooks-utils.md`,
`Docs/known-patterns-and-gotchas.md` (three new entries + the Weapon Mastery / §"Ruleset
(2014 / 2024)" rider), `Docs/architecture.md:43`, `Docs/server.md:223-248`, and this plan file's
`**Status:** Draft` → `Done`.

**Details:**
- **Do not bump `client/src/version.js`** — the user has not asked for a push.
- The `known-patterns-and-gotchas.md` entries are: (1) "`btoa`/`atob` are Latin-1 — never base64
  user text directly", including *why the UTF-8-first / Latin-1-second decode order must stay*;
  (2) "Homebrew: normalise on read, and never let a normaliser run on a write path"; (3)
  "Cantrips scale by character level, with exceptions", including the measured shape of `scaling`
  in `spells.json` and the `scaling: 'cantrip'` sentinel the DB seeds write.
- **The phrase "nothing on disk is ever rewritten" must not appear anywhere in `Docs/`.** It is
  false — every mutation rewrites the whole array. The correct statement is *"normalise on read;
  on write, rewrite only the record the user touched and pass everything else through
  untouched."*

**Test spec:** n/a — documentation. No assertable logic; the gate is the greps below.

**Gates**
- ☑ **GREEN** — no RED gate (`Test: n/a`, pure documentation). CHANGELOG entries are in place
  under the correct headings inside `## vX.X.X — Unreleased`; every named `Docs/` file updated;
  all four greps clean (output below). `npm test` → `Tests  132 passed (132)`;
  `npx vite build` → `✓ built in 2.44s`.

**Verify:**
```
rg -n "encodeShareCode|readHomebrewRaw|cantripDamage" Docs/          # hits in client-context-hooks-utils.md
rg -n "^## vX.X.X — Unreleased" -A 5 CHANGELOG.md                    # shows the new entries
rg -n "~788 lines" Docs/client-pages.md                              # nothing (line count changed)
rg -n "never rewrite|nothing on disk is ever rewritten" Docs/ --glob '!Docs/plans/**' --glob '!Docs/increments/**'
                                                                     # nothing
```
(The last grep excludes `Docs/plans/**` and `Docs/increments/**` because the plan file and this
document both *discuss* the false phrase in order to forbid it.)

**Log:**

**Grep gates (real output):**
```
$ rg -n "encodeShareCode|readHomebrewRaw|cantripDamage" Docs/   (excluding plans/ and increments/)
Docs/architecture.md:43
Docs/client-context-hooks-utils.md:166, 173, 176, 190
Docs/client-pages.md:96, 117, 118
Docs/known-patterns-and-gotchas.md:269, 278
→ hits in client-context-hooks-utils.md as required.

$ rg -n "^## vX.X.X — Unreleased" -A 5 CHANGELOG.md
29:## vX.X.X — Unreleased
31-### Added
32-- **Weapon Mastery on homebrew weapons.** …
→ the new entries are present.

$ rg -n "~788 lines" Docs/client-pages.md
(no output, exit 1)   — line count updated to ~943

$ rg -n "never rewrite|nothing on disk is ever rewritten" Docs/ --glob '!Docs/plans/**' --glob '!Docs/increments/**'
(no output, exit 1)   — the false guarantee is not enshrined anywhere
```

**Changed:**
- `CHANGELOG.md:31-36` — five `### Added` bullets prepended to the existing Unreleased block
  (Weapon Mastery, Duplicate, per-type validation, editor override search, sorted list).
- `CHANGELOG.md` `### Fixed` — a new heading with the plan's 14 Fixed bullets, copied verbatim
  from the plan's "Docs & changelog" section.
- `CHANGELOG.md` `### Changed` — the "All homebrew reads go through one place" bullet added
  above the existing workflow entries.
- `Docs/client-pages.md` — `Spells.jsx` (line count `~585`, `readHomebrew`, cantrip scaling via
  the shared helper), `Equipment.jsx` (line count `~644`, `readHomebrew`, `matchesEquipCategory`,
  the attunement / STR / damage-colour renders and the 13-type `DMG_COLORS`), and a rewritten
  `Homebrew.jsx` section (line count `~943`, the share-code fix and copy-fallback textarea, the
  raw/normalised storage split, per-type validation and which rules warn rather than block, type
  switching, Duplicate, sorting, the quota behaviour) plus the Weapon / Armor / Ammo field
  paragraphs (Weapon Mastery, the parameterised properties, "Range" removed, the AC-formula hint,
  stack size and ammo dice).
- `Docs/client-context-hooks-utils.md` — a new `homebrew.js` entry documenting every export and
  **splitting it explicitly into "reading for consumption" vs "reading for mutation" and why**;
  the `dndHelpers.js` entry extended with `weaponRangeText`, `cantripTierBonus`, `cantripDamage`
  and `CANTRIP_NO_SCALE` including the exclusion rationale; line count updated to `~230`.
- `Docs/known-patterns-and-gotchas.md` — three new entries: "`btoa`/`atob` are Latin-1 — never
  base64 user text directly" (including why the UTF-8-first / Latin-1-second decode order must
  stay, and that a clipboard write is not a guarantee); "Homebrew: normalise on read, and never
  let a normaliser run on a write path" (the two read functions, why a null-dropping read on a
  write path is a silent delete, the `requiresAttunement` alias and `pruneToType`, and the "a
  rename is not a fix if nothing renders the field" trap); "Cantrips scale by character level,
  with exceptions" (the 5/11/17 tiers, the full exclusion list with reasons, the measured shape
  of `scaling` in `spells.json`, and the `scaling: 'cantrip'` sentinel the DB seeds write).
  The §"Ruleset (2014 / 2024)" section gained the Weapon Mastery rider.
- `Docs/architecture.md:43` — the Homebrew data-flow bullet now states the read/write split and
  that there is no migration pass and no schema-version field.
- `Docs/server.md` — the dormancy note now records the **deliberate decision** to leave the
  routes dormant rather than wire or delete them, and that `routes/homebrew.js` was already
  UTF-8-correct via `Buffer` while the client was the broken side.
- `Docs/plans/2026-09-06-homebrewer-review-and-refinement.md:3` — `**Status:** Draft` → `Done`,
  noting it ships in the current Unreleased block.

**Notes:**
- **The version was not bumped.** `client/src/version.js` is untouched and the CHANGELOG heading
  is still `## vX.X.X — Unreleased`, per the increment's instruction and CLAUDE.md.
- The negative gate passes: the phrase "nothing on disk is ever rewritten" appears nowhere in
  `Docs/` outside the plan and this document, both of which quote it only in order to forbid it.
- The `~788 lines` grep is clean in `Docs/client-pages.md`, its actual target. The only remaining
  hits anywhere are the plan and this document quoting the grep command itself.

---

## Concerns

**1. Three increments needed a small extraction to have a real red gate — flagged, not silently done.**
The plan states its own principle plainly ("the pure logic … moves to `client/src/utils/` with
vitest coverage"), but writes three pieces of logic inline in components where nothing can assert
them. I have specified an extraction for each rather than inventing a fake test or marking them
`n/a`. **None changes behaviour**, and each is a strict improvement, but the executor should know
these are additions to the plan's letter:
  - **Increment 4** → `resetFormForType(prevForm, type, emptyForm)` in `utils/homebrew.js`
    (the plan puts this inline in `setType`).
  - **Increment 5** → `weaponRangeText(properties, isRanged)` in `dndHelpers.js`
    (the plan patches the expression inline at `CharacterSheet.jsx:1852`).
  - Increment 3's spell-search de-duplication was left inline — it is six lines, and
    `matchesEquipCategory` already gives that increment a genuine red gate.
If the executor rejects an extraction, the increment loses its RED gate and falls back to the UI
gate alone. Say so in the Log rather than marking a gate green on a test that could never be red.

**2. Increment 4's Stack Size gate is the one most likely to be run wrong.** "Select all, then
type 30" **passes on today's broken code** — the first keystroke makes the DOM value `"3"`, and
`parseInt("3") || 1` is `3`. Only pressing **Delete** to actually clear the field produces
`parseInt('') || 1`. This flaw was in an earlier draft of the plan and was caught in review. It
is restated inline in Increment 4 as well as here.

**3. No existing test in this repo stubs `localStorage`, so Increment 2's stub is easy to skip
— and skipping it produces a false green.** `readHomebrewRaw` has its own `try/catch`, so without
the global stub the `ReferenceError` is swallowed, `[]` comes back, and the `'not json'` and
`'{"a":1}'` cases pass while proving nothing. Increment 2's RED gate includes an explicit
"confirm the stub is live" step for this reason. **Do not resolve this by adding jsdom or
testing-library** — `package.json` has neither and `vite.config.js` sets no vitest `environment`;
adding them would open the door to component tests this codebase is not set up for.

**4. Increment 8's exclusion list must be asserted entry by entry.** Five separate exclusions
(Eldritch Blast, Magic Stone, Shillelagh, Green-Flame Blade, `source: 'race'`) plus the homebrew
*inclusion* case. A blanket "level-0 with dice scales" rule mis-scales at least 19 `spells.json`
entries — 4 class cantrips and all 15 racial pseudo-spells. I have also added a **Booming Blade →
`4d8`** assert as a guard in the opposite direction: it is superficially similar to Green-Flame
Blade and must **not** be excluded. Do not collapse these into a loop.

**5. Increment 3's damage-colour payoff is narrower than a casual reading suggests.**
`DMG_COLORS` (`Equipment.jsx:33-37`) defines only `bludgeoning`, `piercing`, `slashing`, so a
homebrew fire/radiant/psychic weapon falls back regardless of casing. The plan already flags this
and offers two honest options (accept the narrow scope, or extend `DMG_COLORS` to all 13 types).
**Pick one explicitly in the Log** — this is exactly the "a rename is not a fix if nothing renders
the field" trap the plan warns about.

**6. Increment 9 is the only `n/a`, and I am satisfied with it** — it is pure documentation with
four grep gates, including the negative gate that keeps the false "nothing on disk is ever
rewritten" guarantee out of `Docs/`.

**7. Slicing and ordering are sound; only one dependency edge is worth restating.** Increment 1
is genuinely standalone and shippable — it alone fixes the reported bug and must stay first.
Increment 5 is cuttable *only* if Increment 6 is also cut: Increment 6 starts emitting
`ammunition (x/y)` on homebrew weapons, which the sheet cannot read without Increment 5's
predicate fix. Increment 4 depends on Increment 2 (`validateHomebrew`, `TYPE_FIELDS`,
`formErrors`); Increment 3's Equipment renders depend on Increment 2's `attunement`
canonicalisation. Increment 8 is independent of 1-7 and could ship separately.

**8. Everything the plan cites resolves in the current tree**, re-verified today — see
"Reference verification" above. One nit: `DMG_COLORS` is at `Equipment.jsx:33-37`; the plan writes
`:32-36` in the Current-state section and `:33-37` in Increment 3. `:33-37` is correct. Nothing
else was off.
