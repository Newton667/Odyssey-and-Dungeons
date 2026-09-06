# Homebrewer — Full Review and Refinement

**Status:** Done — implemented 2026-09-06. Ships in the current `vX.X.X — Unreleased` block; the version was **not** bumped (the user has not asked for a push).
**Created:** 2026-09-06
**Revised:** 2026-09-06 (after plan review + D&D rules audit — see "Revision notes")
**Scope:** Covers `client/src/pages/Homebrew.jsx` end to end — the reported spell-export bug, share-code round-trip integrity, per-type validation, form correctness against the 5e/5.5e rules, and the fields the rest of the app actually consumes (`CharacterSheet.jsx`, `Spells.jsx`, `Equipment.jsx`, `CharacterEdit.jsx`). Also folds in **cantrip damage scaling** (app-wide gap, user decision) and two adjacent pre-existing display bugs found during review. Does **not** cover: wiring the dormant `/api/homebrew` server routes, a homebrew feats/races/classes/monsters creator, bulk collection export, or splitting `Homebrew.jsx` into per-type form modules (see "Follow-ups").

## Goal

The Homebrewer is the one page in OND where a player authors their own content, and it currently drops that content on the floor in several places: the "Copy Share Code" button silently does nothing for most spells, the spell form asks for the same thing twice, several fields the form collects are read by nothing, and several fields the sheet *does* read cannot be set at all. After this work, every field the Homebrewer collects is either consumed by the app or gone (`attunement` and `strReq` gain a render, `stackSize` and ammo `damage` gain a consumer); every share code round-trips losslessly regardless of what the user pasted in; an item that would make the sheet compute the wrong number cannot be saved in the first place; and **no homebrew record is ever silently deleted by an unrelated save**. The pure logic (share-code codec, per-type validation, normalization, ammo-count defaulting, cantrip scaling) moves to `client/src/utils/` with vitest coverage instead of living inside components.

## Revision notes

This plan was reviewed once for factual accuracy and once against the PHB. Both passes returned NEEDS REVISION. What changed:

- **The "never rewrite storage" guarantee was false and dangerous.** Every mutation path rewrites the whole array; the plan's own normalizer would have deleted unrecognised records. Fixed with `readHomebrewRaw` (Increment 2).
- **The attunement fix had no visible effect.** Homebrew items render through a *separate* block on the Equipment page that reads no attunement field at all. The increment now adds the render (Increment 3).
- **Cantrip scaling is now in scope** (user decision) and carries a hard exclusion list — a blanket rule would have broken Eldritch Blast, Magic Stone, Shillelagh and every racial breath weapon (Increment 8).
- **Two new pre-existing bugs found and folded in:** the sheet's inventory browser has the identical category-filter bug as the Equipment page (Increment 3), and `rangeText` never matches an ammunition weapon, so every Longbow in the app displays `80/320 ft.` (Increment 5).
- Line citations corrected, two validation rules softened, several verify gates replaced with ones that would actually fail before the fix.

## Current state

### The reported bug — share codes are silently broken (CONFIRMED)

`Homebrew.jsx:283-291`:

```js
const exportItem = (id) => {
  const item = readAll().find(i => i._id === id);
  if (!item) return;
  const { _id, createdAt, updatedAt, ...data } = item;
  const shareString = btoa(JSON.stringify(data));      // throws on codepoint > 255
  navigator.clipboard.writeText(shareString);          // unawaited, unguarded
  setCopiedId(id);
  setTimeout(() => setCopiedId(null), 2000);
};
```

Three independent silent failures:

1. **`btoa` throws `InvalidCharacterError` on any codepoint > 255.** Em dash (U+2014), curly quotes (U+2018/2019/201C/201D), bullet (U+2022), ellipsis (U+2026) are all above 255 and are exactly what lands in a pasted spell description. There is no `try/catch`, so the throw escapes the `onClick`, `setCopiedId` never runs, and the button label never changes to `✓ Copied!` (`Homebrew.jsx:774-776`). Note `×` (U+00D7) and `é` (U+00E9) are ≤ 255 and *do* encode — which is why the failure looks intermittent.
2. **`navigator.clipboard.writeText` is not awaited and has no rejection handler.** It rejects outside a secure context (`http://` on a LAN IP — a real deployment shape for this app) or when the permission is denied. Unhandled rejection, no user feedback.
3. **`doImport` (`Homebrew.jsx:293-310`) has the mirror problem** — `atob` returns Latin-1 code units, so a UTF-8 code (which is what `server/routes/homebrew.js:66-72` produces via `Buffer.from(...).toString('base64')`) decodes mojibake.

### Storage: every mutation rewrites the entire array (CONFIRMED — new, HIGH)

`Homebrew.jsx:221-223` is the only storage door inside the page:

```js
const STORAGE_KEY = 'ond-homebrew';
const readAll  = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const writeAll = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
```

All three mutation paths are read-modify-**write-whole-array**:

- `save` — `Homebrew.jsx:250-268`: `const all = readAll(); … writeAll(all)`
- `deleteItem` — `Homebrew.jsx:276-281`: `const all = readAll().filter(…); writeAll(all)`
- `doImport` — `Homebrew.jsx:293-310`: `const all = readAll(); all.push(data); writeAll(all)`

**This makes any lossy read path a data-destruction path.** If `readAll` is replaced by a normalizing `readHomebrew()` that returns `null` for records it cannot understand and drops the nulls, then saving or deleting *one* item permanently erases *every* record with an unrecognised `type` or a non-string `name` — exactly the records the current unvalidated `doImport` (`:297`, which checks only `data.name && data.type`) is capable of writing. Silent and irreversible, on data this plan itself calls "live content for the user's players". The fix is architectural, not incidental: see Increment 2.

### Other confirmed defects

- **Duplicate classes picker (CONFIRMED).** `Homebrew.jsx:645-656` labelled "Classes" and `Homebrew.jsx:678-689` labelled "Spell Lists (Classes)" render the same buttons and both call `toggleArrayField('classes', c)`. Copy-paste leftover. Note `:651` reads `form.classes.includes(c)` **unguarded**; `:684` reads `(form.classes || []).includes(c)`.
- **Import validation is `data.name && data.type` only** (`Homebrew.jsx:297`). Nothing whitelists keys, checks `type` against `TYPES` (`:4-10`), or coerces shapes. A share code carrying `properties: null` gets written to `ond-homebrew`, and the next `startEdit` on it hits `form.properties.includes(p)` at `Homebrew.jsx:440` → `TypeError` → white screen. Same for `components` (`:636`) and `classes` (`:651`).
- **Six raw `<input type="number">` fields — but only four have the falsy-fallback bug.** Verified individually:

  | Line | Field | Handler today | Stored type today |
  |---|---|---|---|
  | `:408` | weapon `bonus` | `parseInt(e.target.value) \|\| 0` | number |
  | `:464` | armor `bonus` | `parseInt(e.target.value) \|\| 0` | number |
  | `:468` | `strReq` | `e.target.value` — **no parseInt** | **string** (`"15"`, `""`) |
  | `:497` | `stackSize` | `parseInt(e.target.value) \|\| 1` | number |
  | `:501` | ammo `bonus` | `parseInt(e.target.value) \|\| 0` | number |
  | `:622` | `aoeSize` | `e.target.value` — **no parseInt** | **string** |

  The four `|| 0` / `|| 1` sites are the exact antipattern `known-patterns-and-gotchas.md` §"NumInput accepts 0 and negatives — never fall back on falsy" and §2 forbid. The two no-parseInt sites are a different problem: `strReq` and `aoeSize` are **strings in every record on disk today**, so converting them to `NumInput` changes the stored type and the normalizer has to coerce them. Armor **Base AC** (`:460`) is a third free-text string field, parseInt'd downstream by `calcAC` (`CharacterSheet.jsx:667`) and compared numerically by `Equipment.jsx:600`.
- **`setType` (`Homebrew.jsx:237-241`) resets only `category`.** Build a weapon with `damage: '2d6'`, `properties: ['Heavy','Two-Handed']`, `ammoType: 'Bolt'`, then switch the type button to Armor and save: all of it persists onto the armor record. `startEdit` (`:270-274`) does `{ ...EMPTY_FORM, ...item }` so the bleed survives every subsequent edit.
- **`save` merges rather than replaces on edit** — `all[idx] = { ...all[idx], ...body }` (`Homebrew.jsx:257`) — so junk keys from an earlier type can never be removed by editing.
- **Only `name` and `description` carry HTML `required`** (`Homebrew.jsx:366`, `:702`). Everything else is optional, including fields the sheet's math depends on (below).

### Field-completeness audit — `EMPTY_FORM` (`Homebrew.jsx:196-209`) vs. what the app reads

**Fields the form collects that nothing reads (dead weight):**

| Field | Set at | Read by |
|---|---|---|
| `stackSize` | `Homebrew.jsx:497` | Nothing. The sheet derives ammo count from `defaultAmmoCount(name)` (`CharacterSheet.jsx:114-117`), which parses `(20)` out of the item *name* and defaults to 20. A homebrew "Frost Bolts" with stackSize 30 arrives as 20. Call sites: `:1859`, `:1896`, `:1960`, `:2529`, `:3763` (five). |
| ammo `damage` | `Homebrew.jsx:509-515`, labelled "Extra damage added when this ammo is used (e.g., +1d6 fire for flame arrows)" | Nothing. The sheet reads only the flat `ammoCached?.bonus` (`CharacterSheet.jsx:1861-1862`) into `hitBonus`/`dmgBonus`. The dice are discarded. |
| `requiresAttunement` | `Homebrew.jsx:422`, `:475`, `:534` | Nothing. `equipment.json` and `Equipment.jsx:359`, `:521` use **`attunement`** — but those two lines are in the **main item list**, which homebrew items never render through (see below). The sheet's attunement widget gates on `c?.magical` alone (`CharacterSheet.jsx:1456`). `Docs/server.md:232` already flags the name mismatch. |
| `strReq` | `Homebrew.jsx:468` | `Equipment.jsx:600` renders it in the **main** list only. Not enforced anywhere. |

**The Equipment page renders homebrew through a separate, much thinner block.** `Equipment.jsx:264-297` is its own `homebrewItems.map(...)`. Verified fields read there: `item.rarity` (`:271`), `item.name` (`:276`), `item.type` / `item.damage` / `item.damageType` / `item.ac` (`:278`), `item.createdBy` (`:280`), `item.description` (`:287`), `item.cost` (`:288`), `item.weight` (`:289`), `item.properties` (`:290`). **No `attunement`, no `strReq`, no `DMG_COLORS` lookup** — `DMG_COLORS` (`:32-36`) is used only at `:367`, `:369`, `:554`, `:556`, `:562`, `:565`, all in the main list. So canonicalising the field name alone changes nothing on screen; the render has to be added.

**Fields the app reads that the form cannot set (gaps):**

| Field | Read at | Gap |
|---|---|---|
| `mastery` | `CharacterSheet.jsx:1928` — `wpn.mastery \|\| WEAPON_MASTERY_MAP[baseName]` | No form control. A homebrew 2024 weapon can never have a mastery property. `WEAPON_MASTERIES` (`dndConstants.js:321-331`) has all 8. |
| versatile two-handed die | `CharacterSheet.jsx:1871-1876` parses `\d+d\d+` out of the property string | The picker toggles the bare word `"Versatile"` (`Homebrew.jsx:19`, `:438-443`). `equipment.json` stores `"versatile (1d10)"`. So `versatileDie` is `null` and the 2H damage button never renders. |
| thrown / ammunition range | `CharacterSheet.jsx:1852-1853` — `properties.find(p => includes('range') \|\| includes('thrown'))` | `equipment.json` stores `"thrown (20/60)"`, `"ammunition (150/600)"`. The homebrew picker emits bare `"Thrown"` / `"Ammunition"`. `"Range"` in `PROPERTIES` (`Homebrew.jsx:19`) is not a real 5e weapon property at all. **And the predicate itself is broken — see next section.** |
| `aoeDetails` | `CharacterSheet.jsx:3696` | Minor; the form has `aoeShape`/`aoeSize` which cover the common case. Not worth adding. |

### Pre-existing bug 1 — every ammunition weapon in the app shows the wrong range (CONFIRMED, new)

`CharacterSheet.jsx:1852-1853`:

```js
const rangeText = wpn.properties?.find(p => p.toLowerCase().includes('range') || p.toLowerCase().includes('thrown'))
  || (isRanged ? '80/320 ft.' : '5 ft.');
```

`equipment.json` stores ammunition weapons as `"ammunition (150/600)"` — 14 entries carry an `ammunition (` property. The string contains no literal `range` and no `thrown`, so the `.find()` **always misses** for a pure-ammunition weapon and falls through to the hardcoded `'80/320 ft.'`. Today a **Longbow (150/600) and a Sling (30/120) both display `80/320 ft.`** Homebrew ranged weapons will inherit this the moment Increment 6 starts emitting `ammunition (x/y)`.

### Pre-existing bug 2 — the sheet's inventory browser has the identical category-filter bug (CONFIRMED, new)

`CharacterSheet.jsx:251`:

```js
if (invCategory) hb = hb.filter(i => i.category === invCategory || i.type === invCategory);
```

Character-for-character the same expression as `Equipment.jsx:113`, and its dropdown (`:2623-2629`) offers the same `weapon / armor / adventuring-gear / tool / pack` values. Homebrew writes `category: 'item'` / `'ammo'` (`Homebrew.jsx:238`), so filtering to "Gear" hides every homebrew item and every homebrew ammo. **This is the site that matters more**: the Equipment page is a reference browser, the sheet's browser is where items actually get added to a character.

### Cantrip damage never scales with character level (CONFIRMED)

`getUpcastDamage` returns early on `spell.level === 0` (`CharacterSheet.jsx:821`), and there is no character-level path anywhere else. `SpellCard` (`:1005`) and the prepared-spell row (`:2102`) both compute `effectiveDamage = canUpcast ? getUpcastDamage(...) : spell.damage`, and `canUpcast` requires `spell.level > 0`. The side panel's damage button (`:3678-3682`) uses `sidePanel.data.damage` raw. **Fire Bolt reads `1d10` at level 17.**

`Spells.jsx` *does* have the machinery — `scaledDice(baseDice, charLevel)` at `:58-66` applies the correct 5/11/17 tiers — but it is gated at `:299` on `s.scaling === 'cantrip'`.

**Correction to an earlier claim in this plan: `scaling === 'cantrip'` is NOT dead code.** `Spells.jsx` has its own separate "+ Add Spell" form (`:82-133`) whose Scaling `<select>` (`:565-568`) offers `<option value="cantrip">Cantrip (5/11/17)</option>`, and it POSTs to `/api/spells` (the server DB), not to `ond-homebrew`. That writer exists and is reachable. The accurate statement is: **no *shipped* spell in `spells.json` sets it**, which is why the branch never fires for stock content. Do not delete the sentinel without handling that writer.

**A blanket "any level-0 spell with dice damage scales" rule is wrong.** Auditing all 40 level-0 entries in `spells.json` that carry a `damage` string:

- **25 are `source: 'class'`.** 21 of them scale correctly on 5/11/17.
- **Four `source: 'class'` entries must be excluded:** `Eldritch Blast` (`local_sp_8`, `damage: "1d10"`) — its real rule is *more beams*, 1→2→3→4 **separate spell-attack rolls** at 5th/11th/17th, not more dice on one roll; `Magic Stone` (`1d6` + spellcasting mod, never scales by level); `Shillelagh` (`1d8`, a weapon buff, never scales by level); and `Green-Flame Blade`, whose stored `1d8` is already its **5th-level** value — its own `higherLevels` text gives 0 / 1d8 / 2d8 / 3d8 at 1-4 / 5 / 11 / 17, so the blanket rule would run one die high at every tier and be *worse* than today's static value. (Booming Blade is fine: its stored `1d8` is the movement damage, which genuinely goes 1d8/2d8/3d8/4d8.)
- **15 are `source: 'race'`** — the ten Dragonborn Breath Weapons (`2d6`), `Reach to the Blaze: Produce Flame`, `Yuan-ti Innate: Poison Spray`, `Surprise Attack`, `Hungry Jaws`, `Stone's Endurance`. These are racial features stored as pseudo-spells and use their **own** progressions (Dragonborn breath is 2d6/3d6/4d6/5d6 at levels 1/6/11/16 — *not* 5/11/17). They must be excluded wholesale.

Also note the real shape of `scaling` in `spells.json`, measured: the **empty string `''` on 382 entries**, absent on 68, and a dice string on 71. There is **no** `"None"` value anywhere in the file — the string `None` is only the *label* of `Spells.jsx:564`'s `<option value="">`. `''` is falsy, so the existing `canUpcast && spell.scaling` checks work correctly today. Prefer an explicit dice-string parse anyway, and note the DB seeds (`server/seed-cantrips.js`) additionally write the sentinel `scaling: 'cantrip'`, which never appears in the local JSON.

### Reach — the user's claim #3 is wrong

Homebrew **is** surfaced on both browsers: `Spells.jsx:116-124` + `:249-283` (a "Homebrew (n)" toggle and a purple HB section) and `Equipment.jsx:109-116` + `:264-297`. The real reach gaps are narrower:

- The two category-filter bugs above (`Equipment.jsx:113`, `CharacterSheet.jsx:251`).
- `CharacterEdit.jsx:1382` builds its override results from `queryLocalSpells(...)` only, so homebrew spells never appear in the editor's search. The free-text "Custom spell name…" box at `:1385-1389` is the workaround. **The user has decided to fix this** — folded into Increment 3.

### Server dead code

`server/models/Homebrew.js` and `server/routes/homebrew.js` are mounted (`server/server.js:13`, `:56`) but the client never calls them — `Docs/server.md:248` already states this explicitly. **Recommendation: leave them, keep the doc note, add one line recording that the server's codec is UTF-8-correct while the client's was not.** Wiring them up would contradict CLAUDE.md ("equipment and spells use local JSON by default", characters local-only); deleting them removes the DB-mode counterpart that `/api/equipment` and `/api/spells` still have.

### Binding gotchas

- `known-patterns-and-gotchas.md` §"NumInput accepts 0 and negatives — never fall back on falsy" — four numeric fields here violate it.
- §1 "Widget Component Inside Render" — `DiceFormulaBuilder` at `Homebrew.jsx:25` is at **module scope, which is correct**. Do not move it. Any new sub-component (property row, validation banner) must also be module scope.
- §4/§5 "Feat Objects vs Strings" — the same normalization discipline applies to `properties` / `components` / `classes` here.
- §"Heavy Armor AC" — subcategory matching is `.toLowerCase().includes('heavy')`, so the homebrew `'Heavy'` value works; the danger is an *empty* subcategory.
- §"Weapon damage strings carry the magic bonus twice" — homebrew weapons flow through `weaponDamageFormula` (`CharacterSheet.jsx:1888`) exactly like `equipment.json` ones, so a homebrew `damage: '1d8+1'` with `bonus: 1` gets stripped correctly. Preserve that.
- §"One roll at a time — `rollDice3D` can return `null`" — `DiceFormulaBuilder`'s `testRoll` already guards (`Homebrew.jsx:32`). Keep it.
- §"The build does not catch undefined variables" — Increments 3, 7 and 8 change bindings and arities across four files. Each carries an explicit `rg` step.

## Approach

No research document exists for this area (`Docs/research/` holds only the two player-bug documents), so the findings above are first-hand.

Extract the Homebrewer's pure logic into a new `client/src/utils/homebrew.js` and make that module the single door to the `ond-homebrew` key. Today there are **seven** independent `JSON.parse(localStorage.getItem('ond-homebrew'))` call sites (`CharacterSheet.jsx:202`, `:218`, `:249`, `:271`; `Spells.jsx:118`; `Equipment.jsx:111`; `Homebrew.jsx:222`), each with its own filtering and its own idea of the schema.

That door has **two** halves, and the split is the safety property of this whole plan:

- **`readHomebrew(opts)` — normalizing, null-dropping. For display and consumption only.** Every consumer uses this. It upgrades old records in memory (`requiresAttunement` → `attunement`, string arrays, numeric coercion) with no write-back.
- **`readHomebrewRaw()` — `JSON.parse` in a `try`, coerce non-array to `[]`, no normalization, no dropping. For mutation only.** `save`, `deleteItem`, `doImport` and the new Duplicate action all read raw, touch only the targeted record by `_id`, and write that array back. **A record `normalizeHomebrewItem` cannot understand is never written out of existence — it is preserved verbatim on disk and merely hidden from consumers.**

Without that split, the normalizer becomes a delete: `save` and `deleteItem` rewrite the whole array, so one unrelated save would erase every record with an unrecognised `type` or a non-string `name` — records the current unvalidated importer can and does create. So the honest statement of the migration strategy is **"normalise on read; on write, rewrite only the record the user touched and pass everything else through untouched"** — not "never rewrite storage", which was false.

The share-code fix decodes **UTF-8 first, Latin-1 second**. New codes and old ASCII-only codes are byte-identical under both paths; the only codes that need the fallback are old ones containing U+0080–U+00FF, and a lone high byte is invalid UTF-8, so `TextDecoder('utf-8', { fatal: true })` throws and the fallback catches it. This also makes the client able to read codes produced by `server/routes/homebrew.js`, which was already UTF-8.

Alternatives considered: *(a)* a versioned share-code envelope (`v2:` prefix) — rejected, it needs the same UTF-8/Latin-1 fallback for unprefixed legacy codes anyway, so it adds a format for no gain; *(b)* a one-time localStorage migration pass that rewrites every record — rejected, it only runs if the user opens the Homebrewer page, so the sheet and browsers would still read raw data, and it is the exact write-everything operation the raw/normalized split exists to avoid; *(c)* deleting the dead fields (`stackSize`, ammo `damage`) instead of wiring them — rejected for these two because the form advertises specific behaviour to the user ("Extra damage added when this ammo is used"), and wiring them is 2-3 lines each.

## Increments

### Increment 1: UTF-8-safe share codes + visible failure
**Status:** not active
**What:** Create `client/src/utils/homebrew.js` with `encodeShareCode` / `decodeShareCode`, unit-test them, and wire `exportItem` / `doImport` to use them with real error handling and a clipboard fallback. This alone fixes the reported bug and is shippable on its own.
**Where:**
- New: `client/src/utils/homebrew.js`
- New: `client/src/utils/homebrew.test.js`
- `client/src/pages/Homebrew.jsx:283-291` (`exportItem`), `:293-310` (`doImport`), `:218` (`copiedId` state), `:773-779` (the button row)

**Details:**
```js
// client/src/utils/homebrew.js
export function encodeShareCode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  // chunk to stay under the argument limit on large items
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export function decodeShareCode(code) {
  const clean = String(code || '').replace(/\s+/g, '');
  if (!clean) throw new Error('Empty share code');
  const bin = atob(clean);                       // throws on malformed base64
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return JSON.parse(bin);                      // legacy Latin-1 btoa codes
  }
}
```
**Order matters: UTF-8 first, Latin-1 second, and this is load-bearing.** A legacy Latin-1 code containing e.g. `é` (0xE9) is a lone continuation-less high byte, which `fatal: true` rejects, so it falls through to `JSON.parse(bin)` — the exact string the old `btoa` encoded. A pure-ASCII code decodes identically on both paths. **Reversing the order would silently mojibake every newly generated code.**

`exportItem` becomes:
```js
const exportItem = async (id) => {
  const item = readHomebrewRaw().find(i => i._id === id);   // raw in Increment 2; readAll() until then
  if (!item) return;
  const { _id, createdAt, updatedAt, ...data } = item;
  let code;
  try { code = encodeShareCode(data); }
  catch { setShareError('Could not build a share code for this item.'); return; }
  setShareCode({ id, code });                    // always reveal it
  try {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  } catch { /* clipboard blocked — the textarea below is the fallback */ }
};
```
Render `shareCode.code` in a read-only `<textarea>` with `onFocus={e => e.target.select()}` under the button row when `shareCode?.id === item._id`, with the hint "Copied to clipboard" or "Select and copy this code". Never leave the user with no code.

`doImport` catches separately so the message is useful: `decodeShareCode` throwing → "That doesn't look like a valid share code."; a decoded value that isn't an object → "Share code did not contain a homebrew item." (per-type validation arrives in Increment 2).

**Verify:** `cd client && npm test` — new tests must cover:
- (a) `decodeShareCode(encodeShareCode(x))` deep-equals `x` for a spell whose description contains `— " " • … ×`;
- (b) **round-trip an em dash on a freshly generated code**: `decodeShareCode(encodeShareCode({ description: '—' })).description === '—'` — this is the case that fails if a future refactor reverses the decode order, and it fails on a *new* code rather than only on the legacy fixture;
- (c) a hand-built legacy code `btoa(JSON.stringify({name:'Café', type:'spell'}))` decodes to `{name:'Café', type:'spell'}`;
- (d) a code built the server's way, `Buffer.from(JSON.stringify(o)).toString('base64')`, decodes correctly;
- (e) `decodeShareCode('not base64!!')` throws;
- (f) whitespace/newlines inside a pasted code are tolerated.

Then in the UI: create a spell with description `Deals 2d6 — half on a save.`, click Copy Share Code → the code appears in the textarea and the button reads `✓ Copied!`; paste it into Import → the spell imports with the em dash intact. Before the fix this button does nothing at all for that description.

---

### Increment 2: Storage door — raw for writes, normalized for reads; per-type schema and validation
**Status:** not active
**What:** Add `readHomebrewRaw`, `readHomebrew`, `writeHomebrew`, `normalizeHomebrewItem`, `pruneToType`, `validateHomebrew`, `sanitizeImported` and the per-type field schema to `client/src/utils/homebrew.js`, unit-test them, and make `Homebrew.jsx` use them for read, write, save, delete and import.
**Where:**
- `client/src/utils/homebrew.js`, `client/src/utils/homebrew.test.js`
- `client/src/pages/Homebrew.jsx:221-231` (`STORAGE_KEY`/`readAll`/`writeAll`/`load`), `:250-268` (`save`), `:276-281` (`deleteItem`), `:283-291` (`exportItem`), `:293-310` (`doImport`), `:207-219` (add `formErrors` state — see below)

**Declare `const [formErrors, setFormErrors] = useState({})` in this increment**, and render a minimal red banner above the submit button for `formErrors._save`. The quota path below references it, and `npm run build` will **not** catch an undefined variable (§"The build does not catch undefined variables") — without this, Increment 2 ships a `ReferenceError` on the exact path meant to stop silent data loss. Increment 4 extends the same state with per-field errors and warnings.

**Details:**

**Two read functions, and the distinction is a safety property, not a style choice.**

```js
const STORAGE_KEY = 'ond-homebrew';

// MUTATION path. No normalization, no dropping. Every record survives verbatim.
export function readHomebrewRaw() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

// CONSUMPTION path. Normalizes; drops records it cannot understand.
export function readHomebrew(opts = {}) {
  let out = readHomebrewRaw().map(normalizeHomebrewItem).filter(Boolean);
  if (opts.type)    out = out.filter(i => i.type === opts.type);
  if (opts.notType) out = out.filter(i => i.type !== opts.notType);
  return out;
}

// Returns false on quota failure so callers can tell the user. Never throws.
export function writeHomebrew(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); return true; }
  catch { return false; }
}
```

**The array-level mutations are pure exported functions, so the preservation property is unit-testable.** This is not optional polish: the B1 guard is the plan's central safety property, and `save` lives inside a React component in a repo with **no jsdom and no testing-library** (`client/package.json` has neither; `vite.config.js` sets no vitest `environment`, so tests run in bare Node). A test cannot render the component or "perform a save". `charSync.test.js` is the precedent — its storage policy was extracted into pure `resolveLoadAction` precisely so it could be asserted. Do the same here:

```js
// All three take the RAW array and return a new one. Unknown records pass through untouched.
export function upsertHomebrewRecord(all, record, editingId) // edit in place by _id, else append
export function removeHomebrewRecord(all, id)
export function appendImportedRecord(all, record)
```

`save`, `deleteItem`, `doImport` and Duplicate each read `readHomebrewRaw()`, call the matching pure function, and hand the result to `writeHomebrew`:

```js
// save (edit branch)
const all = upsertHomebrewRecord(readHomebrewRaw(), pruneToType(body), editing);
if (!writeHomebrew(all)) { setFormErrors({ _save: "Could not save — your browser's storage is full." }); return; }
```

**A record `normalizeHomebrewItem` cannot understand is never written out of existence — it is preserved verbatim on disk and merely hidden from consumers.**

`load()` uses `readHomebrew()`, so an unrecognised record is hidden from the Homebrewer's own list as well as from the sheet. That is deliberate: it stays on disk untouched and there is **no repair UI**. Do not "helpfully" surface or clean these records.

Schema, data-driven — one table, no per-type `if` chains:
```js
export const HOMEBREW_TYPES = ['weapon', 'armor', 'item', 'ammo', 'spell'];

const COMMON = ['type','name','description','rarity','createdBy','homebrew'];
const EQUIP  = ['category','subcategory','cost','weight','magical','attunement','requiresAttunement','bonus'];
export const TYPE_FIELDS = {
  weapon: [...COMMON, ...EQUIP, 'damage','damageType','properties','mastery','ammoType'],
  armor:  [...COMMON, ...EQUIP, 'ac','strReq','stealthDisadvantage'],
  item:   [...COMMON, ...EQUIP],
  ammo:   [...COMMON, ...EQUIP, 'ammoType','stackSize','damage','damageType'],
  spell:  [...COMMON, 'level','school','castingTime','range','components','materialComponent',
           'duration','concentration','ritual','classes','attackType','savingThrow','saveEffect',
           'damage','damageType','higherLevels','scaling','aoe','aoeShape','aoeSize'],
};
```
**`requiresAttunement` is in `EQUIP` deliberately.** `pruneToType` runs on every save, so omitting it would strip the legacy key on the first re-save and break the downgrade path the alias exists to protect. `pruneToType` writes **both** keys in sync: `attunement` is canonical, `requiresAttunement` is mirrored from it.

`normalizeHomebrewItem(raw)` — tolerant, never throws, returns `null` for anything that isn't a usable record:
- `type` must be in `HOMEBREW_TYPES`, else `null`. `name` must be a non-empty string, else `null`.
- `toStrArray(v)` for `properties` / `components` / `classes`: `null`/`undefined` → `[]`; a bare string → `[v]`; an array → map `typeof x === 'string' ? x : (x?.name ?? String(x))` and drop empties. This is the §4/§5 "objects from old saves" rule applied here.
- `attunement: !!(raw.attunement ?? raw.requiresAttunement)`, and `requiresAttunement: attunement` — canonicalise onto the `equipment.json` name while keeping the legacy key populated.
- `damageType` lowercased (matches `equipment.json` / `spells.json` and `DMG_COLORS`' lowercase keys).
- Numeric coercion — **`parseInt`, not `Number`, and never a falsy fallback**. `Number('')` is `0` but `parseInt('', 10)` is `NaN`, and only the latter distinguishes "blank" from "zero":
  ```js
  const num = (v, fallback) => { const n = parseInt(v, 10); return Number.isNaN(n) ? fallback : n; };
  ```
  Applied with these fallbacks: `bonus: 0`, `level: 0`, `strReq: 0`, `stackSize: 20`, `aoeSize: 0`, and `ac: ''` (an armor with no AC must stay blank, not become 0 — `validateHomebrew` is what rejects it). `strReq` and `aoeSize` are **strings on disk today** (`:468`, `:622` have no parseInt), so this coercion is the migration for them.
- `homebrew: true` so consumers can badge without knowing where the item came from.
- Keys are **not** pruned here — normalization is read-side and must stay lossless for anything it doesn't understand, including unrecognised property strings.

`pruneToType(item)` — `TYPE_FIELDS[item.type]` plus `_id`/`createdAt`/`updatedAt`. Used **only on save**, so a type switch actually cleans up.

`validateHomebrew(item)` → `{ ok, errors: { field: message }, warnings: { field: message } }`. Blocking rules exist only where the sheet mis-computes without them:

| Type | Rule | Blocking? | Why |
|---|---|---|---|
| all | `name` non-empty | block | keys the whole app |
| weapon | `subcategory` in `WEAPON_SUBS` | block | `isRanged` at `CharacterSheet.jsx:1850` decides STR vs DEX and Archery |
| weapon | `damage` parses to at least one die or a digit | block | dead damage button otherwise |
| weapon | `damageType` non-empty | block | display only, but cheap |
| armor | `subcategory` in `ARMOR_SUBS` | block | **heavy armor would gain DEX** at `CharacterSheet.jsx:683-686` |
| armor | `ac` is an integer 1-30 (shields 1-5) | block | `isNaN(ac)` → `continue` at `:670`. **This is a sanity bound, not a rule** — there is no RAW ceiling on homebrew armor AC; the range is wide enough not to obstruct realistic homebrew while still catching a blank or a typo. |
| ammo | `ammoType` non-empty | block | `ammoMatchesWeapon` at `:130-141` |
| spell | `level` integer 0-9 | block | slot/upcast math |
| spell | `school` in `SCHOOLS` | block | `:2126` renders `"Level 3 · "` with a dangling separator |
| spell | `scaling` set ⟹ `level > 0` | block | `getUpcastDamage` returns early on level 0 |
| spell | `components` includes `'M'` ⟹ `materialComponent` non-empty | **warn only** | Nothing miscalculates without it — it is a completeness nudge, not a legality rule. Downgraded to a non-blocking warning, consistent with the duplicate-name case in Increment 7. |

`sanitizeImported(data)` — reject non-objects and arrays; reject an unknown `type`; run `pruneToType` (so hostile extra keys are dropped, not stored); run `normalizeHomebrewItem`; run `validateHomebrew` and reject on a **blocking** failure with the first error message (warnings pass); cap `JSON.stringify(data).length` at 64 KB. Only then does `doImport` mint `_id`/`createdAt`.

**Verify:** `cd client && npm test`. Required cases:
- **Preservation (the B1 guard) — assert on the pure functions, not on the component.** With `all = [{type:'monster', name:'Beholder'}, {_id:'a', type:'weapon', name:'Axe'}]`:
  - `upsertHomebrewRecord(all, {_id:'a', type:'weapon', name:'Great Axe'}, 'a')` still contains `{type:'monster', name:'Beholder'}` and has length 2.
  - `removeHomebrewRecord(all, 'a')` still contains the monster and has length 1.
  - `appendImportedRecord(all, {_id:'b', type:'spell', name:'Bolt'})` still contains the monster and has length 3.
- `readHomebrew()` on that same array returns **one** item (the monster is hidden, not deleted).
- **Storage-touching cases need a stub.** `readHomebrew` / `readHomebrewRaw` / `writeHomebrew` tests must install an in-memory `localStorage` via `vi.stubGlobal('localStorage', …)` in `beforeEach`. Without it there is no `localStorage` global in Node, `readHomebrewRaw`'s own `try/catch` swallows the `ReferenceError`, and the `'not json'` case **goes green while proving nothing**. Do not add jsdom or testing-library to make this work.
- `normalizeHomebrewItem({type:'weapon',name:'X',properties:null})` → `properties: []`, and a follow-up `.includes('Heavy')` does not throw.
- `normalizeHomebrewItem({type:'item',name:'X',requiresAttunement:true}).attunement === true`.
- `normalizeHomebrewItem({type:'armor',name:'X',strReq:'15'}).strReq === 15` (number, not string).
- `{bonus:0}` stays `0`; `{bonus:''}` becomes `0`; `{ac:''}` stays `''` (not `0`); `{aoeSize:''}` becomes `0`.
- `readHomebrew()` returns `[]` for `'not json'` and for `'{"a":1}'`.
- `pruneToType` on a weapon-turned-armor drops `damage`/`properties`/`ammoType` and keeps `ac`; `pruneToType({type:'item',name:'X',attunement:true})` emits **both** `attunement: true` and `requiresAttunement: true`.
- `validateHomebrew` rejects armor with `subcategory: ''` and armor with `ac: ''`, accepts a complete one, and returns an `'M'`-without-material case as a **warning with `ok: true`**.
- `sanitizeImported` rejects `[]`, `null`, `{type:'monster',name:'x'}`, and a 100 KB blob.

UI: build a weapon with properties and damage, switch its type to Armor, fill AC + type, save, re-open it — the Weapon section shows an empty damage formula and no properties.

---

### Increment 3: One read path for every consumer, and make the homebrew renders complete
**Status:** not active
**What:** Replace all six external `ond-homebrew` read sites with `readHomebrew`, fix the category filter in **both** places that have it, add the missing `attunement` / `strReq` / damage-colour renders to the Equipment page's homebrew block, and union homebrew spells into the character editor's override search.
**Where:**
- `client/src/pages/CharacterSheet.jsx:200-206`, `:216-222`, `:247-253` (incl. the `:251` category filter), `:270-276`
- `client/src/pages/Spells.jsx:116-124`
- `client/src/pages/Equipment.jsx:109-116`, `:113` (category filter), `:276` (homebrew row name), `:286-291` (homebrew expanded block)
- `client/src/pages/CharacterEdit.jsx:1382` (override spell search)
- `client/src/utils/homebrew.js` (`matchesEquipCategory`)

**Details:**

**Read path.** Each site becomes `readHomebrew({ type: 'spell' })` or `readHomebrew({ notType: 'spell' })`; the surrounding search/level/school/rarity filters stay exactly as they are. The `try/catch` wrappers at those sites become redundant (`readHomebrew` never throws) — leave them or drop them, but do not change the filter semantics.

**Category filter — two sites, identical bug.** `Equipment.jsx:113` and `CharacterSheet.jsx:251` both read `i.category === cat || i.type === cat`, which can never match `'adventuring-gear'`/`'tool'`/`'pack'` for a homebrew item (homebrew writes `category: 'item'` / `'ammo'`). Add to `utils/homebrew.js`:
```js
export const HB_CATEGORY_ALIASES = { item: ['adventuring-gear','tool','pack'], ammo: ['adventuring-gear'] };
export const matchesEquipCategory = (item, cat) =>
  !cat || item.category === cat || item.type === cat || (HB_CATEGORY_ALIASES[item.type] || []).includes(cat);
```
and use it at **both** `Equipment.jsx:113` and `CharacterSheet.jsx:251`. Do **not** change what `Homebrew.jsx` *writes* into `category` — `CharacterSheet.jsx:122` keys ammo detection on `category === 'ammo'`, `:667` on `'armor'`, `:1829` on `'weapon'`.

**The Equipment page's homebrew block must actually render the fields.** `Equipment.jsx:264-297` is a separate, thinner `homebrewItems.map` that reads only name/type/damage/damageType/ac/createdBy/description/cost/weight/properties — it never touches `attunement`, `strReq`, or `DMG_COLORS`. Canonicalising the field name in Increment 2 therefore changes nothing on screen unless the render is added here:
- After the name span (`:276`), append `{item.attunement && <span style={{ fontSize: '10px', marginLeft: '6px', color: 'var(--text-dim)', fontWeight: 400 }}>(A)</span>}` — matching the main list's treatment at `:359`.
- In the expanded flex row (`:287-291`), alongside Cost / Weight / Properties, add `{item.attunement && <span>(requires attunement)</span>}` and `{item.strReq > 0 && <span>Strength Required: {item.strReq}</span>}`. This is what retires `strReq` from the dead-field list.
- In the summary line (`:278`), colour the damage text with `DMG_COLORS[item.damageType]` (falling back to `var(--text-dim)`), so lowercased homebrew damage types pick up the same colours the main list uses at `:367`. **Scope the claim honestly:** `DMG_COLORS` (`Equipment.jsx:33-37`) defines only three keys — `bludgeoning`, `piercing`, `slashing` — so a homebrew fire/radiant/psychic weapon falls back regardless of casing. Either accept that the payoff covers the three physical types only, or extend `DMG_COLORS` to all 13 damage types as part of this increment. Do not describe the lowercasing as "making homebrew damage colours work" without one of those two being true.

**Character editor override search** (`CharacterEdit.jsx:1382`). Today: `const results = overrideSpellSearch.trim() ? queryLocalSpells({ search: overrideSpellSearch.trim() }).slice(0, 40) : [];`. Union homebrew in before the slice, de-duplicating by lowercased name so a homebrew spell that shadows a stock one does not appear twice:
```js
const q = overrideSpellSearch.trim();
const results = q ? (() => {
  const local = queryLocalSpells({ search: q });
  const seen = new Set(local.map(s => s.name.toLowerCase()));
  const hb = readHomebrew({ type: 'spell' })
    .filter(s => s.name.toLowerCase().includes(q.toLowerCase()) && !seen.has(s.name.toLowerCase()));
  return [...local, ...hb].slice(0, 40);
})() : [];
```

**Verify:** `cd client && npm run build` must succeed, then:
```
rg -n "ond-homebrew|localStorage\.(get|set)Item\(STORAGE_KEY" client/src
```
must return hits **only** in `client/src/utils/homebrew.js`. (The narrower `rg -n "localStorage.getItem\('ond-homebrew'\)"` is not a valid gate — it already returns nothing for `Homebrew.jsx` today, because `:222` reads via the `STORAGE_KEY` constant.)

Per §"The build does not catch undefined variables", also run `rg -n "\bhb\b|\bhbItems\b" client/src/pages/CharacterSheet.jsx client/src/pages/Spells.jsx client/src/pages/Equipment.jsx` and confirm every remaining reference is bound.

UI:
1. Create a homebrew magic item with Attunement ticked → `(A)` appears next to its name in the Equipment page's **homebrew** section, and "(requires attunement)" in its expanded card. Before this increment neither appears at all.
2. Create a homebrew armor with STR Requirement 15 → "Strength Required: 15" appears in its expanded card.
3. Equipment page, Homebrew toggle on, filter to "Adventuring Gear" → a homebrew Item/Gear entry is still listed.
4. **On a character sheet, open the inventory browser, filter to "Gear", search for a homebrew item — it is listed.** (Today it vanishes.)
5. Character editor → Spells → tick "Override", search for a homebrew spell's name → it appears in the results list.

---

### Increment 4: Form defects — duplicate picker, NumInput, type-switch reset, surfaced validation
**Status:** not active
**What:** Delete the duplicated classes picker, convert every numeric input to `NumInput`, clear type-specific fields when the type button changes, and surface `validateHomebrew` errors inline instead of saving a broken item.
**Where:** `client/src/pages/Homebrew.jsx:237-241` (`setType`), `:250-268` (`save`), `:408`, `:460`, `:464`, `:468`, `:497`, `:501`, `:622`, `:645-656`, `:678-689`, `:705`; import `NumInput` from `../components/NumInput`.

**Details:**
- **Remove `Homebrew.jsx:645-656`** (the one labelled just "Classes", whose `:651` reads `form.classes.includes(c)` unguarded) and keep `:678-689` ("Spell Lists (Classes)"), which already guards with `(form.classes || [])`. Move the surviving block to sit directly under Components (`:631-643`) so the ordering still reads sensibly, and retitle its label "Spell Lists".
- **`NumInput`** at `:408` (`bonus`, min 0 max 3), `:464` (`bonus`, 0-3), `:468` (`strReq`, min 0), `:497` (`stackSize`, min 1), `:501` (`bonus`, 0-3), `:622` (`aoeSize`, min 0). `NumInput` already does the `Number.isNaN` clamp internally (`NumInput.jsx:14-21`) — pass `min`/`max` and `onChange={v => f('field', v)}`; **do not add a falsy fallback on top**. Armor **Base AC** at `:460` is currently a free-text `<input>`; make it `NumInput` with **`min={0}`** `max={30}` — *not* `min={1}`. `NumInput` commits an empty field on blur as `parseInt('')→NaN→0→clamp to min`, so `min={1}` would turn "tabbed through without typing" into a silently valid **AC 1** armor that passes validation. With `min={0}`, `validateHomebrew`'s 1-30 rule rejects it with "Base AC is required" instead.
  Note this changes the stored type of `strReq` and `aoeSize` from string to number; Increment 2's normalizer already coerces existing records on read, so old and new records agree.
- **`setType`** clears the fields that are not in `TYPE_FIELDS[newType]`, resetting them to their `EMPTY_FORM` values rather than dropping the keys (the form reads `form.properties.includes(...)` etc. unguarded):
  ```js
  const setType = (type) => {
    const keep = new Set(TYPE_FIELDS[type]);
    setForm(prev => {
      const next = { ...prev, type, category: type === 'spell' ? '' : type === 'ammo' ? 'ammo' : type };
      for (const k of Object.keys(EMPTY_FORM)) {
        if (['type','category','name','description','rarity'].includes(k)) continue;
        if (!keep.has(k)) next[k] = EMPTY_FORM[k];
      }
      return next;
    });
  };
  ```
  Name/description/rarity survive the switch on purpose — re-typing the name is the annoying case.
- **Validation UI:** `save` runs `validateHomebrew(body)` before writing. On a blocking failure, `setFormErrors(errors)` and return without closing the form. Render a banner above the submit button listing the messages (errors in red, warnings in amber), and give each offending field a red border via `formErrors[key] ? { borderColor: '#f87171' } : null`. Clear `formErrors` on every `f()` call. Keep the existing HTML `required` on name/description — it is a cheap first line.
- **Storage-failure feedback:** if `writeHomebrew` returns `false` (Increment 2), set `formErrors._save = "Could not save — your browser's storage is full."`, **leave the form open with the user's input intact**, and do not reset. Today a quota failure closes and resets the form as if the save had succeeded, and the item is simply gone.
- The banner must be plain JSX or a **module-scope** helper, not a component defined inside `Homebrew()` (§1).

**Verify:** `cd client && npm run build`; then
```
rg -c "toggleArrayField\('classes'" client/src/pages/Homebrew.jsx   # exactly 1
rg -n "input type=\"number\"" client/src/pages/Homebrew.jsx         # nothing
```
UI gates — each of these **fails on today's code**:
1. **Stack Size clear gate.** Open an Ammo item, select the whole Stack Size value and press **Delete**. Today the field instantly refills with `1` and you cannot leave it empty to retype; after the fix it stays empty while focused and commits `1` on blur. Then type `0` into a weapon's Bonus and blur — it stays `0`.
   *(Do not use "select-all then type 30" as the gate: the first keystroke sets the DOM value to `"3"`, so `parseInt("3") || 1` is `3` and today's code passes it. `parseInt('') || 1` only fires when the field is actually cleared. The previous draft of this gate had exactly that flaw.)*
2. **`strReq` stored type gate.** Save an armor with STR Requirement `0`, re-open it → the field reads `0`. Then inspect the stored record: `strReq` is the **number** `0`, not the string `"0"`. Today `:468` stores `"0"`, and `Equipment.jsx:600`'s `item.strReq > 0` is the only reader.
3. Try to save an armor with no Armor Type → the form stays open with "Armor type is required".
4. Save a spell with component `M` and no material text → it **saves**, with an amber warning shown.
5. Build a weapon with damage `2d6` + Heavy, switch to Armor → the damage formula box and property chips are empty.

---

### Increment 5: Ranged weapon range display — the `ammunition` predicate gap
**Status:** not active
**Adjacent, pre-existing, cuttable — with a caveat.** This bug was not part of the original request. It is placed before Increment 6 because Increment 6 starts emitting `ammunition (x/y)` on homebrew weapons, and without this fix the sheet cannot read that string either — cutting this increment means homebrew ammunition ranges fall through to the same hardcoded `80/320 ft.`
**What:** Make `rangeText` recognise the `ammunition (x/y)` property that `equipment.json` actually ships.
**Where:** `client/src/pages/CharacterSheet.jsx:1852-1853`

**Details:** The predicate today is
```js
const rangeText = wpn.properties?.find(p => p.toLowerCase().includes('range') || p.toLowerCase().includes('thrown'))
  || (isRanged ? '80/320 ft.' : '5 ft.');
```
`equipment.json` stores ammunition weapons as `"ammunition (150/600)"` — 14 entries carry an `ammunition (` property — which contains neither `range` nor `thrown`. The `.find()` always misses and the hardcoded fallback wins, so **a Longbow (150/600) and a Sling (30/120) both display `80/320 ft.` today.** Add the third substring:
```js
const rangeText = wpn.properties?.find(p => {
  const s = p.toLowerCase();
  return s.includes('range') || s.includes('thrown') || s.includes('ammunition');
}) || (isRanged ? '80/320 ft.' : '5 ft.');
```
Keep the fallback — a ranged weapon with no parenthetical still needs *something*. Do not change the display formatting; the property string is already what the row prints.

**Verify:** `cd client && npm run build`. UI: equip a stock **Longbow** on any character → the Actions row range reads **`ammunition (150/600)`**, not `80/320 ft.` Equip a stock **Sling** → **`ammunition (30/120)`**. Equip a stock **Handaxe** → still shows its `thrown (20/60)` (no regression on the existing branch). Equip a **Longsword** → still `5 ft.`

---

### Increment 6: Rules correctness — parameterised weapon properties, mastery, armor
**Status:** not active
**What:** Make the weapon property picker emit the strings the sheet actually parses (`versatile (1d10)`, `thrown (20/60)`, `ammunition (80/320)`), drop the bogus `Range` property, add a 2024 Weapon Mastery selector, add the missing ruleset gate on the mastery badge, and show the armor AC formula live.
**Where:** `client/src/pages/Homebrew.jsx:14` (`DAMAGE_TYPES`), `:19` (`PROPERTIES`), `:389-446` (weapon section), `:455-480` (armor section); `client/src/pages/CharacterSheet.jsx:1929` (mastery gate); `client/src/utils/homebrew.js` (property serialise/parse helpers + tests).

**Details:**
- **New `PROPERTIES` list**, 5e-correct and matching `equipment.json`'s vocabulary: `Ammunition, Finesse, Heavy, Light, Loading, Reach, Special, Thrown, Two-Handed, Versatile`. **`Range` is removed** — it is a glossary heading in the PHB (p.147) explaining the parenthetical notation, not a Properties-column entry; range lives inside `Ammunition (x/y)` / `Thrown (x/y)`. `Special` **stays** — it is a real property (Lance, Net). Existing saves that contain `"Range"` must still round-trip: `normalizeHomebrewItem` keeps unknown property strings verbatim, and the picker renders any unrecognised stored property as an extra read-only chip with an ✕ to remove it.
- **Parameterised chips.** `Versatile` selected → a die `<select>` (`d4/d6/d8/d10/d12`) appears; `Thrown` or `Ammunition` selected → two `NumInput`s (normal / long). Stored form, matching `equipment.json` exactly (lowercase, parenthetical): `versatile (1d10)`, `thrown (20/60)`, `ammunition (80/320)`. Add to `utils/homebrew.js`:
  ```js
  export function serializeProperty(name, params) // ('Versatile', {die:'1d10'}) -> 'versatile (1d10)'
  export function parseProperty(str)              // 'thrown (20/60)' -> {name:'Thrown', params:{normal:20, long:60}}
  ```
  so the picker can round-trip an existing item into its controls on `startEdit`. All other properties serialise to plain lowercase (`finesse`, `two-handed`), which every sheet check already handles via `.toLowerCase().includes(...)`.
- **Weapon Mastery** `<select>` in the weapon grid, options from `Object.keys(WEAPON_MASTERIES)` (`utils/dndConstants.js:321`) plus a blank "None". Stored as `mastery`. Label it "Weapon Mastery (2024)". **Do not** gate the Homebrewer itself on a ruleset: the page is a global library with no character in context (it imports only `useDice`), so there is no `char.ruleset` to route through. See "Rules & data notes".
- **Add the missing ruleset gate on the consumer.** `CharacterSheet.jsx:1929` is `const hasMastery = mastery && WEAPON_MASTERY_CLASSES[char.class];` — no ruleset term, so a **2014** Fighter also sees the mastery badge. Weapon Mastery is a 2024-only feature. Change to:
  ```js
  const hasMastery = mastery && char.ruleset === '2024' && WEAPON_MASTERY_CLASSES[char.class];
  ```
  This is the one-line rider that makes Increment 6's mastery test meaningful, and it belongs here because this is the ruleset-flavoured increment.
- **Damage types** are stored lowercase to match `equipment.json` and `spells.json` (`slashing`, `fire`); display them capitalised in the `<select>` via a label/value split. `normalizeHomebrewItem` lowercases `damageType` on read (Increment 2) so existing `"Slashing"` records upgrade without a rewrite. Note the visible payoff is on the **homebrew** list's damage colour added in Increment 3 — `DMG_COLORS` at `Equipment.jsx:32-36` is otherwise only consulted from the main list (`:367`, `:369`, `:554`, `:556`, `:562`, `:565`).
- **Armor:** alongside the required-subcategory rule from Increment 4, show the resulting AC formula live under the field — `Light → AC + DEX`, `Medium → AC + DEX (max 2)`, `Heavy → AC (no DEX)`, `Shield → +AC`. This is the user-facing statement of the Heavy Armor rule and makes a mis-set type obvious before saving.

**Verify:** `cd client && npm test` — new cases: `serializeProperty('Versatile', {die:'1d10'}) === 'versatile (1d10)'`; `parseProperty('ammunition (80/320)')` → `{name:'Ammunition', params:{normal:80, long:320}}`; `parseProperty('finesse')` → `{name:'Finesse', params:{}}`; round-trip `serializeProperty(...parseProperty(x)) === x` for all of `versatile (1d8)`, `thrown (20/60)`, `ammunition (150/600)`, `reach`. Then `rg -n "'Range'" client/src/pages/Homebrew.jsx` returns nothing.

UI: create a homebrew "Storm Halberd", Martial Melee, `1d10` slashing, Versatile → `1d12`, Mastery → Cleave. Equip it on a **level-5 Fighter with `ruleset: '2024'`** and 16 STR: the Actions tab shows **two** damage buttons, `1H: 1d10+3` and `2H: 1d12+3`, and a purple `CLEAVE` badge. Then switch that character's ruleset to **2014** and reload the sheet: the two damage buttons remain, the `CLEAVE` badge is **gone**. (Without the ruleset rider the badge shows on both, and the test cannot tell.)

---

### Increment 7: Wire the dead fields, and the UX refinements worth having
**Status:** not active
**What:** Move `defaultAmmoCount` into `utils/homebrew.js` with tests and make it honour `stackSize`, make the ammo damage dice reach the damage roll, then add list sorting, a Duplicate action, and a duplicate-name warning. Explicitly cut everything else on the UX list.
**Where:** `client/src/pages/CharacterSheet.jsx:114-117` (`defaultAmmoCount` definition), call sites `:1859`, `:1896`, `:1960`, `:2529`, `:3763`; `:1861-1862` + `:1888` (ammo bonus / damage formula) and `:1994` (2H formula); `client/src/pages/Homebrew.jsx:225-231` (`load`), `:250-268` (`save`), `:773-779` (action row); `client/src/utils/homebrew.js` + `.test.js`.

**Details:**
- **`defaultAmmoCount` moves to `utils/homebrew.js`** as a pure exported function (the plan's own rule: pure logic lives in utils with vitest coverage). New signature `defaultAmmoCount(name, item)`, precedence:
  1. a `(N)` group parsed out of the item **name** — this is how `equipment.json` ships ammo (`Arrows (20)`), so it must win;
  2. `item.stackSize` coerced with `parseInt` when the result is a positive integer (legacy records store it as a number, but a hand-edited or imported record may hold a string);
  3. `20`.
  Delete the inline definition at `CharacterSheet.jsx:114-117`, import from the util, and pass `equipCache.current[name]` as the second argument at **all five** call sites.
- **Ammo damage dice.** `CharacterSheet.jsx:1888` builds `weaponDamageFormula(wpn.damage, dmgBonus, riderDamageSuffix)`. Append the selected ammo's dice to the rider suffix:
  ```js
  const ammoDice = ammoCached?.damage && /\d*d\d+/.test(ammoCached.damage)
    ? `+${weaponDamageDice(ammoCached.damage)}` : '';
  ```
  Route it through `weaponDamageDice` (`dndHelpers.js`) per §"Weapon damage strings carry the magic bonus twice", because `ammoCached.bonus` is already folded into `dmgBonus`. Apply to the 2H formula at `:1994` as well, and add the ammo's name to the damage roll label so the log is readable. This is the whole point of the "e.g., +1d6 fire for flame arrows" hint at `Homebrew.jsx:513`.
- **Sort.** Replace `load`'s bare filter chain with a stable sort: type (in `TYPES` order), then name, `localeCompare`. No new control, no new state — the list stops reordering unpredictably as items are edited.
- **Duplicate.** A `Duplicate` button in the action row next to Edit: `readHomebrewRaw()`, deep-clone the target record, `name: \`${name} (Copy)\``, fresh `_id`/`createdAt`, push, `writeHomebrew`, `load()`. **Raw read** — same rule as every other mutation path. Ten lines, and it is the natural way to build a `+1`/`+2`/`+3` family.
- **Duplicate-name warning.** On save, if another item (different `_id`) has the same `name` case-insensitively, or `getLocalEquipmentByName(name)` / a `spells.json` entry already uses it, show a **non-blocking** warning in the validation banner: "An item named X already exists — the character sheet will use the built-in one." That is factually what happens: `CharacterSheet.jsx:273` is `getLocalEquipmentByName(name) || hbItems.find(...)`, so a shadowing homebrew item is silently ignored. Warn, do not block — shadowing is sometimes deliberate.
- **Cut, deliberately:** bulk collection export/import (that is a Settings-level backup feature, and the per-item share code is the design), delete-undo (raw `confirm()` matches `Characters.jsx:24`, the only other destructive action in the app — keep the convention), a rich-text description editor, and per-item images.

**Verify:** `cd client && npm test` — required `defaultAmmoCount` cases:
```
defaultAmmoCount('Arrows (20)', { stackSize: 30 }) === 20   // name wins
defaultAmmoCount('Flame Arrows', { stackSize: 30 }) === 30
defaultAmmoCount('Flame Arrows', { stackSize: 0 })  === 20   // 0 is not a positive integer
defaultAmmoCount('Flame Arrows', { stackSize: '30' }) === 30 // legacy string record
defaultAmmoCount('Flame Arrows', undefined) === 20
```
Then `cd client && npm run build` and `rg -n "defaultAmmoCount\(" client/src` — the definition lives only in `utils/homebrew.js`, and every one of the five `CharacterSheet.jsx` call sites passes **two** arguments.

UI: create homebrew ammo "Flame Arrows", type Arrow, stack size 30, damage `1d6`, damage type fire; add and equip it plus any bow on a character. The Inventory ammo counter starts at **30** (today: 20), and the bow's damage button reads `1d8+3+1d6` for DEX +3 (today: `1d8+3`). Click Duplicate on any item → a `… (Copy)` appears immediately below it in the sorted list. Create a second homebrew item named "Longsword" → the warning banner appears and the item still saves.

---

### Increment 8: Cantrip damage scales with character level (5/11/17)
**Status:** not active
**What:** Apply the 5/11/17 cantrip damage tiers on the character sheet and align `Spells.jsx` with the same helper — **excluding Eldritch Blast, Magic Stone, Shillelagh and every `source: 'race'` pseudo-spell**, all of which have different or no level progressions.
**Where:**
- `client/src/utils/homebrew.js` **no** — this is general spell logic: put it in `client/src/utils/dndHelpers.js` + `client/src/utils/dndHelpers.test.js`
- `client/src/pages/CharacterSheet.jsx:1005` (`SpellCard.effectiveDamage`), `:2102` (prepared-spell row), `:3678-3682` (side-panel damage `RollBtn`)
- `client/src/pages/Spells.jsx:58-66` (`scaledDice`), `:299`

**Details:**

New pure helper in `dndHelpers.js`:
```js
// Cantrips that do NOT gain dice on the 5/11/17 tiers.
export const CANTRIP_NO_SCALE = new Set([
  'Eldritch Blast',  // scales by BEAM COUNT (1/2/3/4 separate attack rolls), not dice
  'Magic Stone',     // 1d6 + spellcasting modifier; no level progression
  'Shillelagh',      // weapon buff; no level progression
  'Green-Flame Blade', // stored 1d8 IS the 5th-level value; real tiers are 0/1d8/2d8/3d8. Rider not modelled.
]);

export function cantripTierBonus(charLevel) {
  const lvl = Number(charLevel) || 1;
  if (lvl >= 17) return 3;
  if (lvl >= 11) return 2;
  if (lvl >= 5)  return 1;
  return 0;
}

// Returns spell.damage unchanged unless the spell is a scaling cantrip.
export function cantripDamage(spell, charLevel) {
  if (!spell || spell.level !== 0) return spell?.damage;
  if (!spell.damage) return spell.damage;                 // Guidance, Mending, Prestidigitation, Spare the Dying
  if (spell.source === 'race') return spell.damage;        // racial features use their own tiers
  if (CANTRIP_NO_SCALE.has(spell.name)) return spell.damage;
  const m = /^(\d+)d(\d+)$/.exec(String(spell.damage).trim());
  if (!m) return spell.damage;                             // e.g. "1d6 + mod", flat numbers — leave alone
  return `${Number(m[1]) + cantripTierBonus(charLevel)}d${m[2]}`;
}
```

**Critical exclusions, and why each one is real:**
- **Eldritch Blast** (`spells.json` `local_sp_8`) is stored as `damage: "1d10"` with **no** scaling field, because its rule is *more beams* — two at 5th, three at 11th, four at 17th, each a **separate spell attack roll**. A blanket rule would silently turn it into a single **4d10** hit at level 17. **Decision: beams are NOT modelled.** The spell is left at `1d10` per beam; its `higherLevels` text already states the beam count and is rendered in the side panel (`CharacterSheet.jsx:3704-3707`) and on the Spells page (`Spells.jsx:488-497`). Modelling multiple attack rolls is a separate feature; silently 4d10-ing it is a regression.
- **`source: 'race'`** covers all 15 racial pseudo-spells with level-0 damage, including the ten Dragonborn Breath Weapons, whose real progression is **2d6/3d6/4d6/5d6 at levels 1/6/11/16** — different tiers entirely.
- **`Magic Stone`** and **`Shillelagh`** are `source: 'class'` level-0 damage entries with no RAW level progression.
- **`Green-Flame Blade`** is excluded because its stored base is off-phase: `spells.json` holds `1d8`, which is what the spell deals *at 5th level*, not at 1st. Scaling it would give 2d8/3d8/4d8 where the rules say 1d8/2d8/3d8. Leaving it static keeps levels 5-10 correct, which is the common case; the secondary-target rider is not modelled either way. Recorded as an accepted limitation in Follow-ups.
- **Non-damage cantrips** (Guidance, Mending, Spare the Dying, Prestidigitation) are covered by the `!spell.damage` guard — no scaling, no change.
- **Homebrew cantrips scale by default, and that is intended.** A homebrew record has no `source` field (`normalizeHomebrewItem` sets `homebrew: true`, not `source`), so any homebrew level-0 spell with an `NdM` damage string scales on 5/11/17. The Homebrewer has no per-spell "does not scale" flag and is not gaining one here. Note the corollary: because `CANTRIP_NO_SCALE` is name-keyed, a homebrew spell *named* "Eldritch Blast" is silently excluded too — acceptable, and better than the alternative of scaling the real one.
- **The Spells page's homebrew section (`Spells.jsx:249-283`) renders `s.damage` raw** and is not touched by this increment, so a homebrew cantrip listed there shows its unscaled base while the same spell scales on the sheet. That block has no roll button, so this is display-only inconsistency — recorded, not fixed here.

Wiring:
- `CharacterSheet.jsx:1005` → `const effectiveDamage = canUpcast ? getUpcastDamage(spell, castLevel) : cantripDamage(spell, char.level || 1);` (`canUpcast` already requires `level > 0`, so the two branches never overlap). Same shape at `:2102`.
- `CharacterSheet.jsx:3678-3682` → the side-panel damage `RollBtn` uses `cantripDamage(sidePanel.data, char.level || 1)` for **both** the `formula` and the label text, so the button rolls what it displays.
- `Spells.jsx:58-66` — delete the local `scaledDice`, import `cantripDamage`, and change `:299` to `const dmgDice = cantripDamage(s, charLevel) ?? s.damage;`. This subsumes the old `s.scaling === 'cantrip'` branch: any level-0 spell now scales unless excluded.
- **`scaling === 'cantrip'` is not dead — handle its writer.** `Spells.jsx`'s own "+ Add Spell" form (`:82-133`) has a Scaling `<select>` offering `Cantrip (5/11/17)` (`:565-568`) that POSTs to `/api/spells`. Leave that option in place; a spell it writes now scales because it is level 0, not because of the sentinel, so the sentinel becomes harmless metadata. **Do not delete the option** without also changing that form.
- `cantripDamage` deliberately does **not** key on `scaling` at all — it keys on `level === 0` plus the exclusions. (For reference: `scaling` is `''` on 382 entries, absent on 68, a dice string on 71. There is no `"None"` value in the file.)

**Verify:** `cd client && npm test` — required cases in `dndHelpers.test.js`:
```
cantripDamage({ level: 0, name: 'Fire Bolt',      damage: '1d10', source: 'class' }, 1)  === '1d10'
cantripDamage({ level: 0, name: 'Fire Bolt',      damage: '1d10', source: 'class' }, 4)  === '1d10'
cantripDamage({ level: 0, name: 'Fire Bolt',      damage: '1d10', source: 'class' }, 5)  === '2d10'
cantripDamage({ level: 0, name: 'Fire Bolt',      damage: '1d10', source: 'class' }, 11) === '3d10'
cantripDamage({ level: 0, name: 'Fire Bolt',      damage: '1d10', source: 'class' }, 17) === '4d10'
cantripDamage({ level: 0, name: 'Eldritch Blast', damage: '1d10', source: 'class' }, 17) === '1d10'  // ← beams, not dice
cantripDamage({ level: 0, name: 'Magic Stone',    damage: '1d6',  source: 'class' }, 17) === '1d6'
cantripDamage({ level: 0, name: 'Shillelagh',     damage: '1d8',  source: 'class' }, 17) === '1d8'
cantripDamage({ level: 0, name: 'Green-Flame Blade', damage: '1d8', source: 'class' }, 17) === '1d8'  // ← stored base is the 5th-level value
cantripDamage({ level: 0, name: 'Breath Weapon (Red — Fire)', damage: '2d6', source: 'race' }, 17) === '2d6'
cantripDamage({ level: 0, name: 'Guidance',       damage: undefined, source: 'class' }, 17) === undefined
cantripDamage({ level: 3, name: 'Fireball',       damage: '8d6',  source: 'class' }, 17) === '8d6'   // not a cantrip
cantripDamage({ level: 0, name: 'Ashen Spark',    damage: '1d6',  homebrew: true }, 11) === '3d6'    // ← homebrew: no `source`, scales by design
```
Then `cd client && npm run build`, and `rg -n "scaledDice" client/src` returns nothing (the local copy in `Spells.jsx` is gone).

UI: a level-17 Wizard with Fire Bolt prepared → the prepared-spell row, the `SpellCard` and the side-panel damage button all read **`4d10`** and the button rolls 4d10. A level-17 Warlock with Eldritch Blast → still **`1d10`**, and the side panel's "At Higher Levels" text explains the four beams. A level-4 Wizard with Fire Bolt → still `1d10`. A level-17 Dragonborn's Breath Weapon → still `2d6`.

---

### Increment 9: Docs + changelog
**Status:** not active
**What:** Record everything above per CLAUDE.md.
**Where:** `CHANGELOG.md` (the `## vX.X.X — Unreleased` block at **line 29**), `Docs/client-pages.md:110-125`, `Docs/client-context-hooks-utils.md`, `Docs/known-patterns-and-gotchas.md`, `Docs/architecture.md:43`, `Docs/server.md:223-248`, and this plan's `**Status:**` → `Done`.
**Details:** Exact content in "Docs & changelog" below. Do not bump `client/src/version.js` — the user has not asked for a push.
**Verify:** `rg -n "encodeShareCode|readHomebrewRaw|cantripDamage" Docs/` returns hits in `client-context-hooks-utils.md`; `rg -n "^## vX.X.X — Unreleased" -A 5 CHANGELOG.md` shows the new entries; `rg -n "~788 lines" Docs/client-pages.md` returns nothing (the line count changes); `rg -n "never rewrite|nothing on disk is ever rewritten" Docs/ --glob '!Docs/plans/**'` returns nothing (the false guarantee must not be enshrined — the plan file itself discusses the phrase, hence the exclusion).

## Rules & data notes

- **Weapon properties (2014 & 2024):** Ammunition, Finesse, Heavy, Light, Loading, Reach, Special, Thrown, Two-Handed, Versatile. **"Range" is not a property.** Verified against `Player's Handbook.pdf` **p.147** (the Weapon Properties glossary, where "Range" is the heading explaining the `(x/y)` parenthetical) and the weapons table on **p.149** (no weapon carries a bare "Range" entry in its Properties column). `Special` **is** real and is used by Lance and Net. The current `PROPERTIES` array (`Homebrew.jsx:19`) is therefore wrong by exactly one entry.
  **Honest caveat:** there is no 2024 PHB in this repository. The claim that the 2024 property list is the same ten entries is from trained knowledge, not a page citation in this repo. It is not ruleset-routed anywhere, so nothing breaks if it turns out to differ; but do not present it as verified.
- **Versatile** always names its two-handed die: "1d8 (1d10)" in the PHB table, `"versatile (1d10)"` in this codebase. A versatile weapon without that die is not a legal weapon and the sheet renders no 2H button (`CharacterSheet.jsx:1993`).
- **Heavy armor never adds DEX; medium caps at +2** (+3 with Medium Armor Master); light adds full DEX; a shield is a flat bonus. Enforced at `CharacterSheet.jsx:665-686`. This is why armor subcategory must be **required** — an empty subcategory falls to the `else` at `:683-686`, which does `baseAC = ac + dexMod`.
- **Armor AC bounds are a sanity check, not a rule.** There is no RAW ceiling on homebrew armor AC. The 1-30 (shield 1-5) clamp exists to catch a blank or a typo before `calcAC` hits `isNaN` and silently skips the armor at `:670`. Describe it that way in the UI copy.
- **Weapon Mastery is 2024-only.** It is the one genuinely ruleset-flavoured field in the Homebrewer. **The Homebrewer is not, and should not become, ruleset-aware:** it has no character in context (`Homebrew.jsx:1-2` imports only `useDice`), the `ond-homebrew` collection is global and shared across all characters on the browser, and the same custom weapon may be used by a 2014 and a 2024 character at the same table. The correct place for the gate is the consumer — `CharacterSheet.jsx:1929` — which today checks only `WEAPON_MASTERY_CLASSES[char.class]` and therefore shows the badge to a **2014** Fighter. Increment 6 adds the missing `&& char.ruleset === '2024'` rider. The 8 masteries in `WEAPON_MASTERIES` (`dndConstants.js:321-331`) and the 6 classes in `WEAPON_MASTERY_CLASSES` are correct as shipped.
- **Upcast scaling** is "add N dice per slot level above base" — `CharacterSheet.jsx:821-829` multiplies the scaling die count by `castLevel - spell.level`. Identical in both editions. Homebrew's `scaling` field is already the right shape (a dice string, same as `spells.json`, where 71 spells carry one).
- **Cantrip scaling is by *character* level, on the 5/11/17 tiers, in both 2014 and 2024** (PHB p.211, Acid Splash: "This spell's damage increases by 1d6 when you reach 5th level, 11th level, and 17th level"). It is **not** slot-based — neither edition upcasts a cantrip with a slot, so the Homebrewer gating its upcast-scaling block on `form.level > 0` (`Homebrew.jsx:664`) is correct and stays. Increment 8 implements the character-level tiers on the consumer side.
- **Cantrip scaling exceptions that must be excluded** (all verified against `spells.json`): **Eldritch Blast** — more beams (1/2/3/4 separate attack rolls at 5/11/17), not more dice, and it is stored with no `scaling` field; **Magic Stone** and **Shillelagh** — no level progression at all; **all 15 `source: 'race'` level-0 damage entries** — the Dragonborn Breath Weapons progress **2d6/3d6/4d6/5d6 at levels 1/6/11/16**, which is a different tier set, and the remaining racial pseudo-spells have their own rules. Non-damage cantrips get nothing.
- **`spells.json`'s `scaling` field, measured:** `''` on 382 entries, absent on 68, a dice string on 71. No entry holds `"None"` — that string is only an `<option>` label at `Spells.jsx:564`. `''` is falsy so `if (spell.scaling)` happens to work, but prefer an explicit dice-string parse. The DB seeds (`server/seed-cantrips.js`) also write `scaling: 'cantrip'`, a sentinel absent from the local JSON.
- **Spell schools** (8) and **damage types** (13) in `Homebrew.jsx:14-15` are both complete and correct for 2014 and 2024. No change needed beyond casing. `AMMO_TYPES` (`:22`), `WEAPON_SUBS` (`:17`) and `ARMOR_SUBS` (`:18`) are likewise correct.

## Risks & gotchas

- **Live data — and the one way this plan could destroy it.** `ond-homebrew` holds real content for the user's players, and **every mutation path rewrites the entire array** (`save` `:250-268`, `deleteItem` `:276-281`, `doImport` `:293-310`). A normalizing read that drops records it cannot understand therefore becomes a silent delete on the next unrelated save. This is why `readHomebrewRaw()` exists and why every mutation must use it. **Do not** let `save`, `deleteItem`, `doImport` or Duplicate read through `readHomebrew()`. Do **not** add a schema-version field or a migration pass.
- **The correct statement of the migration policy** is "normalise on read; on write, rewrite only the record the user touched and pass everything else through untouched" — **not** "nothing on disk is ever rewritten", which is false. The docs increment must write the correct version into `known-patterns-and-gotchas.md`.
- **A field rename is not a fix if nothing renders the field.** `Equipment.jsx` has two item lists; homebrew items only ever render through the thin one at `:264-297`. Canonicalising `requiresAttunement` → `attunement` (Increment 2) is invisible until Increment 3 adds the render. The same trap applies to `DMG_COLORS` and `strReq`. Check *which list* a field is read from before claiming a fix is user-visible.
- **`pruneToType` runs on every save and will strip anything not in `TYPE_FIELDS`.** `requiresAttunement` must stay in `EQUIP` or the legacy key is lost on the first re-save, defeating the alias.
- **Legacy share codes must keep importing.** The UTF-8-first / Latin-1-fallback order in `decodeShareCode` is load-bearing and was validated against legacy `btoa` codes containing `Café`, `Ångström`, `Grüße`, `½ ¼ ±`, `Ø Æ Å`, `ÀÁÂÃÄÅ` — all take the Latin-1 fallback and round-trip byte-exact, because a lone 0x80–0xFF byte adjacent to ASCII is invalid UTF-8 and `fatal: true` rejects it. **Reversing the order would mojibake every new code.** The legacy-fixture test and the new-code em-dash round-trip test are both guards.
- **`known-patterns-and-gotchas.md` §1 (Widget Component Inside Render).** `DiceFormulaBuilder` at `Homebrew.jsx:25` is module scope and **correct** — leave it there. The validation banner and any parameterised-property row added in Increments 4-6 must also be module scope or inline JSX, or every keystroke in the form loses focus. (Note `CharacterSheet.jsx:1001`'s `SpellCard` *is* defined inside the component — pre-existing, out of scope, do not "fix" it as part of Increment 8.)
- **§"NumInput accepts 0 and negatives".** When converting the numeric inputs, do not carry the `|| 0` / `|| 1` across. `NumInput` already clamps on `Number.isNaN`. Note that `parseInt('') || 0` and `NumInput`'s blur both produce `0` — a blur-only test cannot tell them apart, which is why Increment 4's gates test typing behaviour and stored type instead.
- **§"The build does not catch undefined variables".** Increment 3 changes bindings across four files, Increment 7 changes `defaultAmmoCount`'s arity and location, Increment 8 removes `scaledDice` from `Spells.jsx`. All three carry an explicit `rg` step; do not skip them.
- **§"Weapon damage strings carry the magic bonus twice".** The ammo-dice addition in Increment 7 must go through `weaponDamageDice`, not raw string concatenation, or magical ammo will double-count its `+N`.
- **§"One roll at a time — `rollDice3D` can return `null`".** `Homebrew.jsx` is one of the five files with `= await rollDice3D` call sites. The existing guard at `:32` is correct; if the property/mastery work touches `DiceFormulaBuilder`, re-check it.
- **`Equipment.jsx` category aliasing** must not change what `Homebrew.jsx` *writes* to `category`. `CharacterSheet.jsx:122` (`category === 'ammo'`), `:667` (`'armor'`) and `:1829` (`'weapon'`) all depend on the current values.
- **Cantrip scaling touches every character in the app.** Increment 8 changes displayed damage for all 22 scaling cantrips at levels 5+. That is the intended fix, but it is the largest behavioural blast radius in this plan — the exclusion list is what keeps it from also being a regression. Ship the unit tests in the same increment.
- **Ammo dice change is visible on every character** with magical ammo, homebrew or not — `equipment.json` ammo entries have no `damage` field today, so in practice only homebrew ammo is affected. Confirm before shipping: `rg -n '"subcategory": "Ammunition"' -A 6 client/src/data/equipment.json`.

## Verification

Build and test, from `client/`:
```
npm test
npm run build
```
Greps that must come back clean:
```
rg -n "ond-homebrew|localStorage\.(get|set)Item\(STORAGE_KEY" client/src   # only utils/homebrew.js
rg -n "input type=\"number\"" client/src/pages/Homebrew.jsx                # nothing
rg -n "'Range'" client/src/pages/Homebrew.jsx                              # nothing
rg -n "scaledDice" client/src                                              # nothing
rg -c "toggleArrayField\('classes'" client/src/pages/Homebrew.jsx          # 1
rg -n "defaultAmmoCount\(" client/src                                      # def in utils only; 5 two-arg call sites
```

Manual pass (Homebrewer → Spells → Equipment → a character sheet):

1. **Spell export round-trip.** Create a spell: name `Ashen Rebuke`, level 3, Evocation, `2d6` fire, DEX save, "Half damage", V/S/M + "a pinch of soot", concentration on, AOE Sphere 20, scaling `1d6`, classes Sorcerer + Wizard, description containing `— " " • … ×`. Copy Share Code → button reads `✓ Copied!` **and** the code appears in a selectable textarea. Import it in a fresh browser profile → every field matches, em dash intact.
2. **Legacy code.** In the console, `btoa(JSON.stringify({type:'spell',name:'Café Bolt',level:1,school:'Evocation',description:'x'}))`, paste into Import → imports as `Café Bolt`, not `CafÃ©`.
3. **Hostile paste.** `btoa(JSON.stringify({type:'spell',name:'X',properties:null,evil:'<script>'}))` → import is rejected with a message (missing school), and nothing is written to `ond-homebrew`.
4. **Unrecognised record survives an unrelated save.** In the console, append `{type:'monster', name:'Beholder'}` to `ond-homebrew`. Edit and save any homebrew item in the UI. Re-read `ond-homebrew` → the `monster` record is **still there**. It does not appear in any list. Repeat with a delete.
5. **Armor AC, 5e correctness.** Homebrew "Dragonscale Plate", Heavy, AC 18, on a character with 16 DEX (+3) and no shield → sheet AC is **18**, not 21. Change the type to Light → AC **21**. Change to Medium → AC **20** (cap +2).
6. **Versatile homebrew weapon + mastery ruleset gate.** "Storm Halberd", Martial Melee, `1d10` slashing, Versatile → 1d12, Mastery → Cleave, on a level-5 **2024** Fighter with 16 STR (+3, prof +3): to-hit `+6`, `1H: 1d10+3`, `2H: 1d12+3`, `CLEAVE` badge shown. Same character switched to **2014**: damage buttons unchanged, `CLEAVE` badge gone.
7. **Ranged weapon range.** Stock **Longbow** → `ammunition (150/600)`. Stock **Sling** → `ammunition (30/120)`. Stock **Handaxe** → `thrown (20/60)`. Stock **Longsword** → `5 ft.`
8. **Homebrew ammo.** "Flame Arrows", Arrow, stack 30, `1d6` fire. Equipped with a Longbow on 16 DEX (+3): counter reads **30**, damage button reads `1d8+3+1d6`, and firing decrements to 29.
9. **Attunement and STR requirement reach the Equipment page.** A homebrew item with Attunement ticked shows `(A)` next to its name in the Equipment page's **homebrew** section and "(requires attunement)" when expanded; a homebrew armor with STR Requirement 15 shows "Strength Required: 15" when expanded.
10. **Category filter, both browsers.** Equipment page → Homebrew on → "Adventuring Gear" → homebrew gear listed. Character sheet → inventory browser → "Gear" → homebrew gear listed.
11. **Editor override search.** Character editor → Spells → "Override" → search a homebrew spell name → it appears in results and can be added.
12. **Type-switch bleed.** Weapon with damage + 3 properties → switch to Item/Gear → save → re-open: no damage, no properties, no ammo type.
13. **Validation.** Armor with no type, weapon with no damage, spell with no school, and ammo with no ammo type each **block** the save with a named error. A spell with `M` and no material text **saves** with an amber warning.
14. **Cantrips.** Level-17 Wizard, Fire Bolt → `4d10` everywhere (card, prepared row, side-panel button, and the roll itself). Level-17 Warlock, Eldritch Blast → `1d10`. Level-4 Wizard, Fire Bolt → `1d10`. Level-17 Dragonborn Breath Weapon → `2d6`. Level-17 Cleric, Guidance → no damage button.
15. **No regression on built-in content.** A stock Longsword still rolls `1H: 1d8+STR` / `2H: 1d10+STR`; a `+1 Longsword` still rolls `1d8+4` for STR +3 (not `+5`); Fireball still upcasts to `9d6` at level 4.

## Docs & changelog

**`CHANGELOG.md`** — into the existing `## vX.X.X — Unreleased` block (**line 29**):

```markdown
### Fixed
- **Homebrew share codes work again.** "Copy Share Code" did nothing at all for most spells: the encoder could not handle any character above the Latin-1 range, and em dashes, curly quotes, bullets and ellipses are exactly what ends up in a pasted spell description. The error was thrown away silently, so the button just never said "Copied". Share codes are now UTF-8 safe, the code is always shown in a selectable box (so a blocked clipboard is no longer a dead end), and import failures say what went wrong. Codes generated by the old version still import correctly.
- **Cantrips finally scale with your level.** Every damage cantrip was stuck at its level-1 damage — Fire Bolt read 1d10 at level 17. Cantrips now gain a die at levels 5, 11 and 17, as they should. Eldritch Blast is deliberately left alone (it gains extra beams, not extra dice), as are racial features like the Dragonborn breath weapon, which follow their own progression.
- **Ranged weapons showed the wrong range.** Every bow, crossbow and sling displayed "80/320 ft." regardless of its actual range — a Longbow now correctly reads 150/600 and a Sling 30/120.
- **Homebrew armour no longer breaks AC.** Armour saved without an armour type fell through to a fallback that added your DEX modifier — including to heavy armour, which never adds DEX. Armour type and base AC are now required, and the form shows the AC formula for the type you pick.
- **Homebrew weapons keep their properties.** "Versatile" is now saved with its two-handed die, and "Thrown"/"Ammunition" with their ranges, in the same form the character sheet reads — so a homebrew versatile weapon finally shows both its one-handed and two-handed damage buttons instead of only the one-handed one.
- **Homebrew number fields accept 0 and empty.** Clearing Bonus or Stack Size snapped the value to the minimum instead of leaving it alone, and STR Requirement and AOE Size were being stored as text rather than numbers.
- **Switching an item's type no longer carries the old type's data.** Building a weapon and then switching it to armour used to save the weapon's damage, properties and ammo type onto the armour.
- **The spell form no longer asks for the same thing twice.** It rendered two identical class pickers, labelled "Classes" and "Spell Lists (Classes)".
- **Homebrew ammunition finally uses its stack size and its extra damage.** Both were collected by the form and read by nothing: custom ammo always arrived as 20, and "extra damage added when this ammo is used" was discarded. Flame Arrows with 1d6 fire now add 1d6 to the bow's damage roll.
- **Homebrew attunement and strength requirements show up.** Items marked "requires attunement" stored the flag under a name nothing read, and the homebrew section of the Equipment page never displayed attunement or strength requirements at all.
- **Homebrew gear is no longer hidden by the category filter** — on the Equipment page *or* in the character sheet's inventory browser. Custom items and ammunition disappeared when you filtered to "Adventuring Gear" / "Gear".
- **Weapon Mastery no longer shows on 2014 characters.** The mastery badge was displayed for any Fighter, Barbarian, Paladin, Ranger, Rogue or Monk regardless of ruleset; it is a 2024-only feature.
- **Imported share codes are validated.** A malformed or hand-edited code could previously write an unusable record straight into your homebrew library, which then crashed the editor when you opened it.
- **A failed homebrew save no longer looks like a successful one.** If your browser's storage was full, the form closed and reset as though the item had saved, and the item was simply gone. It now tells you and keeps your input.

### Added
- **Weapon Mastery on homebrew weapons.** Pick one of the eight 2024 mastery properties (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex); it shows on the character sheet for 2024 characters whose class has the Weapon Mastery feature.
- **Duplicate a homebrew item** with one click — the fast way to build a +1 / +2 / +3 family.
- **Per-type validation in the Homebrewer.** Each type now requires the fields the character sheet actually needs, with the missing ones named inline, and warns when a new item's name collides with an existing one (the built-in item wins on the sheet).
- **Homebrew spells are searchable in the character editor's spell override**, not just by typing the name in by hand.
- **The homebrew list is sorted** by type and then name instead of by creation order.

### Changed
- **All homebrew reads go through one place** (`utils/homebrew.js`), which tidies up old records on the way out — old field names, missing lists and text-where-a-number-belongs are all handled. Saving or deleting one item only ever rewrites that item; anything the app does not recognise is left on disk exactly as it was.
```

**Docs to update — all of these, explicitly:**

- **`Docs/client-pages.md:110-125`** — rewrite the `Homebrew.jsx` section: new line count; validation rules per type (and which are warnings); the share-code fix and the copy-fallback textarea; Weapon Mastery, parameterised Versatile/Thrown/Ammunition properties, Duplicate, sorting; note that the two duplicate class pickers are now one. Also touch `:95` (Spells.jsx) and `:105` (Equipment.jsx) to say homebrew is read via `readHomebrew()`, that the Equipment homebrew rows now render attunement / STR requirement / damage colour, and that the category filter matches homebrew gear. Add a line to the `CharacterSheet.jsx` section for cantrip level scaling and to `CharacterEdit.jsx` for the override search union.
- **`Docs/client-context-hooks-utils.md`** — new `utils/homebrew.js` entry documenting `readHomebrewRaw` / `readHomebrew` / `writeHomebrew` / `normalizeHomebrewItem` / `pruneToType` / `validateHomebrew` / `sanitizeImported` / `encodeShareCode` / `decodeShareCode` / `serializeProperty` / `parseProperty` / `defaultAmmoCount` / `TYPE_FIELDS` / `HOMEBREW_TYPES` / `matchesEquipCategory`, stating clearly **which functions are for reads and which for writes** and why. Extend the `dndHelpers.js` entry with `cantripDamage` / `cantripTierBonus` / `CANTRIP_NO_SCALE` and the exclusion rationale.
- **`Docs/known-patterns-and-gotchas.md`** — three new entries:
  1. **"`btoa`/`atob` are Latin-1 — never base64 user text directly"**: the failure mode, the UTF-8-first/Latin-1-fallback decode order and why it must stay in that order, and the rule that a clipboard write is not a guarantee (always give the user the text).
  2. **"Homebrew: normalise on read, and never let a normaliser run on a write path"**: `readHomebrew` for consumers, `readHomebrewRaw` for `save`/`delete`/`import`/`duplicate`; every mutation rewrites the whole array, so a null-dropping read on a write path is a silent delete; the `requiresAttunement` → `attunement` alias and why `pruneToType` keeps both keys. **Do not** write the phrase "nothing on disk is ever rewritten" — it is false.
  3. **"Cantrips scale by character level, with exceptions"**: the 5/11/17 tiers, and the `CANTRIP_NO_SCALE` set plus the `source: 'race'` exclusion — Eldritch Blast gains beams not dice, Dragonborn breath uses 1/6/11/16. Also record the measured shape of `scaling` in `spells.json` (`''` ×382, absent ×68, dice string ×71 — **no** `"None"` value; that string is only an `<option>` label), and the `scaling: 'cantrip'` sentinel the DB seeds write.
  Extend the existing **"Weapon Mastery"**-adjacent material (or §"Ruleset (2014 / 2024)") with the note that the mastery badge now gates on `char.ruleset === '2024'`.
- **`Docs/architecture.md:43`** — extend the Homebrew data-flow bullet: still `localStorage` under `ond-homebrew`, now read through `utils/homebrew.js` by all consumers, normalised on read, with writes touching only the edited record.
- **`Docs/server.md:223-248`** — keep the dormancy note, and add that `routes/homebrew.js` already encodes/decodes share strings as UTF-8 via `Buffer`, so codes it produces are readable by the client's new decoder (the client was the broken side). Record the deliberate decision to leave these routes dormant rather than wire or delete them.
- This plan file — `**Status:** Draft` → `Done`, noting the version it shipped in.

## Decisions

Three questions were open in the first draft; all are now settled.

1. **Cantrip damage scaling is folded into this plan** (Increment 8) rather than split into its own. Chosen by the user. The rules audit then established that a blanket rule would have shipped a regression, so the increment carries an explicit exclusion list (Eldritch Blast, Magic Stone, Shillelagh, all `source: 'race'` entries) and unit tests that assert each exclusion *before* the code exists. **Eldritch Blast's beam count is deliberately not modelled** — the spell stays at `1d10` per beam and relies on its "At Higher Levels" text, which the sheet already renders. Modelling four separate attack rolls is a genuine feature and belongs in its own plan.
2. **Homebrew spells join the character editor's override search** (folded into Increment 3, ~6 lines with de-duplication by name). Chosen by the user. It is a papercut rather than a blocker — the free-text "Custom spell name…" box already exists — but the read path is being touched in that increment anyway.
3. **`Homebrew.jsx` is not being split.** Chosen by the user: follow-up, not now. It is a refactor with no user-visible outcome, it would multiply the diff of every other increment, and §1 makes component extraction a place where mistakes cost focus bugs.

## Follow-ups (not in this plan)

- **Split `Homebrew.jsx`** (789 lines today, roughly 120 more after this work). The obvious seam is one **module-scope** form section per type — `HomebrewWeaponForm`, `HomebrewArmorForm`, `HomebrewSpellForm`, `HomebrewItemForm`, `HomebrewAmmoForm` — in `client/src/components/homebrew/`. Must be module scope per §1. No user-visible outcome; do it when the file next needs a substantial change, not before.
- **Model Eldritch Blast's beams** — 1/2/3/4 separate spell-attack rolls at 5th/11th/17th, each `1d10` + (Agonizing Blast) CHA. Needs a multi-attack UI on the spell card, not just a damage string, which is why it is not in Increment 8.
- **Racial damage features use their own progressions.** The ten Dragonborn Breath Weapons (2d6/3d6/4d6/5d6 at 1/6/11/16) and the other `source: 'race'` pseudo-spells are excluded from cantrip scaling and currently never scale. A small `RACIAL_DAMAGE_TIERS` map in `dndConstants.js` would fix them the same data-driven way `FEAT_EFFECTS` and `FEATURE_USES` work.
- **Green-Flame Blade reads one die low at 5th-16th level.** Its `spells.json` base (`1d8`) is already the 5th-level value, so it is excluded from cantrip scaling in Increment 8 and stays static: correct at 5-10, one die low at 11-16 and 17+. Fixing it properly means storing a per-spell tier table (its real progression is 0 / 1d8 / 2d8 / 3d8) plus the secondary-target rider, which no other cantrip needs. Accepted limitation.
- **`aoeDetails`** (`CharacterSheet.jsx:3696`) is read by the sheet but has no Homebrewer control. Minor; `aoeShape` + `aoeSize` cover the common case.
- **`CharacterSheet.jsx:1001`'s `SpellCard` is defined inside the component** — a §1 violation that predates this work. Not touched here; worth its own small fix.
- **The `/api/homebrew` server routes stay dormant.** Deliberate; recorded in `Docs/server.md`.
