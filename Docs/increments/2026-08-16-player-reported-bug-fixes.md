# Execution: Player-Reported Bug Fixes — Sync Wipe, Damage Rolls, Magic Initiate, Sheet Overflow

**Plan:** `Docs/plans/2026-08-16-player-reported-bug-fixes.md`
**Prepared:** 2026-08-16
**Overall status:** complete
**Test command:** `cd client && npm test`
**Build command:** `cd client && npx vite build`

The plan's `## Decisions (confirmed with the user, 2026-08-16)` section is **binding**:
1. `updateHp`'s server PATCH is **kept** — never gate it on `syncEnabled`.
2. `featSpellLists` values are **arrays** — `{ 'Magic Initiate': ['Cleric'] }`. Reads normalise with `[].concat(v)` so a legacy bare string still works.
3. Roll-label collisions (`CharacterSheet.jsx:512`) are **out of scope** — no ninth increment.
4. Word-wrap stays **targeted**: `minmax(0, 1fr)` + `minWidth: 0` + `body { overflow-wrap: break-word }`. No blanket `overflow-wrap: anywhere`.

## Progress

| # | Increment | Status | Red | Green |
|---|-----------|--------|-----|-------|
| 1 | Stop the server from overwriting localStorage | done | ☑ | ☑ |
| 2 | Pure dice/damage parsing helpers + tests | done | ☑ | ☑ |
| 3 | Wire the parsers — double-count, flat damage, negative mods | done | ☑ | ☑ |
| 4 | Guard against overlapping rolls | done | n/a | ☑ |
| 5 | Persist the Magic Initiate spell list, unblock the sheet browser | done | ☑ | ☑ |
| 6 | Magic Initiate picker in the editor | done | ☑ | ☑ |
| 7 | Stop the sheet from widening the page | done | n/a | ☑ |
| 8 | Docs + changelog | done | n/a | ☑ |

**Line references verified 2026-08-16** against the working tree. All of the plan's `file:line` anchors resolve. Two off-by-ones, noted inline: `dndHelpers.js` ends at **:111** (`countLangExtras` *begins* at :104), and the CHANGELOG `## vX.X.X — Unreleased` heading is at **CHANGELOG.md:29**, not :30.

---

## Increment 1: Stop the server from overwriting localStorage
**Status:** done
**Started:** 15:37  **Finished:** 15:39

**What:** Remove the "server is newer → replace the local copy" branch from both storage hooks, and make the editor's `PUT` send the merged character instead of the bare form body, so the server backup is no longer lossy.

**Where:**
- `client/src/hooks/useCharacterSync.js:99-112` — the `else { compare timestamps }` block in `useCharacter`'s load effect. **Verified**: `else` opens at :99, `serverTime > localTime → setChar(server); writeLocal(server)` at :104-107, `localTime > serverTime → syncToServer(local)` at :108-111.
- `client/src/hooks/useCharacterSync.js:205-220` — the same overwrite inside `useCharacterList`. **Verified**: `if (!local)` adopt branch at :207-210, `else` timestamp-overwrite branch at :211-219.
- `client/src/hooks/useCharacterSync.js:6-15` — the header comment (currently documents "If server is newer → update local" at :13).
- `client/src/pages/CharacterEdit.jsx:405` — `body: JSON.stringify(body)`. **Verified**; `merged` is built at :395.
- **New:** `client/src/utils/charSync.js` + `client/src/utils/charSync.test.js` — see Test spec.

**Details:**
- Keep `if (!local) { setChar(server); writeLocal(server); }` (`:95-99`) — discovering a character with no local copy is the one legitimate server→local path.
- Replace the `else` branch so it **never** calls `writeLocal(server)`/`setChar(server)`. Keep the `localTime > serverTime → syncToServer(local)` push (it already no-ops when sync is disabled, `:43`).
- In `useCharacterList`: keep the `if (!local)` adopt-and-cache branch; delete the `else` timestamp branch (`:211-219`). The local entry wins unconditionally.
- In `CharacterEdit.save()`: send `merged` instead of `body`. `merged` = `{...char, ...body, updatedAt}`, so it carries `equippedItems`, `ammo`, `usedSpellSlots`, `featureUses`, `classes`, `attunedItems`, `activeBuffs`, `activeConditions`, `hitDiceRemaining`, `temporaryHp`, death saves and `levelChoices`. The server's `{...existing, ...req.body}` merge (`server/routes/characters.js:81`) still applies. `express.json({ limit: '10mb' })` already covers the larger body.
- **Do not** change `updateHp`'s PATCH (`:145-160`) — Decision 1. `CampaignView.jsx:28-34` depends on server-side HP.
- Update the header comment (`:6-15`): localStorage is authoritative; the server is a write-only backup and a discovery source for characters with no local copy; it never overwrites local.

**Test spec**
- **File:** `client/src/utils/charSync.test.js` (new), testing a new pure helper `client/src/utils/charSync.js`.
- **Extraction (recommended, in scope):** the branch being changed *is* the policy decision, so lift it out of the hook rather than editing it in place. Add:
  ```js
  // returns 'adopt' | 'push' | 'keep' | 'none'
  export function resolveLoadAction(local, server)
  ```
  `'adopt'` → `setChar(server); writeLocal(server)`. `'push'` → `syncToServer(local)`. `'keep'` → do nothing. `'none'` → no server record. Both `useCharacter`'s load effect and `useCharacterList`'s merge loop call it (the list treats anything that is not `'adopt'` as keep-local). If the executor keeps the logic inline instead, this increment drops to `Test: n/a` and rests on the greps below — the extraction is strongly preferred because it is the only assertable part of the fix.
- **Asserts:**
  - `resolveLoadAction(null, { _id: 'a', updatedAt: '2026-01-01T00:00:00Z' })` → `'adopt'`
  - `resolveLoadAction({ _id: 'a', updatedAt: '2026-01-02T00:00:00Z' }, { _id: 'a', updatedAt: '2026-01-01T00:00:00Z' })` → `'push'` (local newer)
  - **The fix:** `resolveLoadAction({ _id: 'a', updatedAt: '2026-01-01T00:00:00Z' }, { _id: 'a', updatedAt: '2026-01-02T00:00:00Z' })` → `'keep'` (server newer — today this overwrites local)
  - `resolveLoadAction({ _id: 'a', updatedAt: '2026-01-01T00:00:00Z' }, { _id: 'a', updatedAt: '2026-01-01T00:00:00Z' })` → `'keep'` (equal)
  - `resolveLoadAction({ _id: 'a' }, { _id: 'a', updatedAt: '2026-01-02T00:00:00Z' })` → `'keep'` (local has **no** `updatedAt`; today `new Date(0)` vs a real date means the server wins and wipes it — the single worst case, since a hand-made or migrated local record has no timestamp)
  - `resolveLoadAction({ _id: 'a', updatedAt: '2026-01-02T00:00:00Z' }, null)` → `'none'`
  - `resolveLoadAction(null, null)` → `'none'`
  - It never returns `'adopt'` when `local` is truthy — assert this explicitly over a small table of timestamp pairs, because "adopt while a local copy exists" is exactly the data-wipe bug.
- **Must fail before implementation because:** `client/src/utils/charSync.js` does not exist — the suite fails to import. Once created, the server-newer and missing-`updatedAt` cases are the ones that encode the behaviour change; a naive port of today's `:100-112` logic returns `'adopt'` for both and keeps the tests red.

**Gates**
- ☑ **RED** — `client/src/utils/charSync.test.js` written (7 cases). First run: `Error: Cannot find module './charSync'` → `Test Files 1 failed | 1 passed (2)`. Then, to prove the test encodes the *behaviour* change and not just a missing import, `charSync.js` was written with **today's** logic (`serverTime > localTime → 'adopt'`) and re-run: `Tests 3 failed | 10 passed (13)` — `expected 'adopt' to be 'keep'` on the server-newer case, the missing-`updatedAt` case, and the never-adopt table.
- ☑ **GREEN** — `npm test` → `Test Files 2 passed (2)` / `Tests 13 passed (13)`; `npx vite build` → `✓ built in 4.16s`.

**Verify:** `cd client && npm test` + `cd client && npx vite build`, plus:
1. `rg "writeLocal\(server\)" client/src/hooks/useCharacterSync.js` returns exactly **one** hit (the `if (!local)` discovery branch).
2. `rg "JSON.stringify\(body\)" client/src/pages/CharacterEdit.jsx` returns **no** hits.
3. `rg -n "PATCH" client/src/hooks/useCharacterSync.js` still shows the HP PATCH at ~:153 — Decision 1 says it stays.
4. UI: on a non-`local-` character — equip a weapon and fire 3 arrows on the sheet (note the count), open the editor, click "Lv Up", Save, return to the sheet and hard-reload. The weapon is still equipped and the arrow count is still the reduced number.
5. UI: a multiclass character (e.g. Fighter 3 / Wizard 2) still shows **both** classes after an editor save + reload (`char.classes` is one of the wiped fields — `known-patterns-and-gotchas.md:171-180`).
6. UI: `CampaignView` still renders player HP after the change.

**Log:**

**Changed:**
- `client/src/utils/charSync.js` — new. `resolveLoadAction(local, server)` → `'adopt' | 'push' | 'keep' | 'none'`. Adopt is reachable **only** when `local` is falsy; the server-newer branch is gone entirely.
- `client/src/utils/charSync.test.js` — new, 7 cases including the never-adopt-while-local-exists table (25 timestamp pairs).
- `client/src/hooks/useCharacterSync.js:6-21` — header comment rewritten: localStorage authoritative, server is a write-only backup + discovery source, never overwrites local.
- `client/src/hooks/useCharacterSync.js:99-108` — the `else { compare timestamps }` block replaced by a `resolveLoadAction` switch. `writeLocal(server)`/`setChar(server)` now only in the `'adopt'` path.
- `client/src/hooks/useCharacterSync.js:203-209` — `useCharacterList`'s merge loop: the `else` timestamp-overwrite branch deleted; now `if (resolveLoadAction(local, sc) === 'adopt')`. Local entry wins unconditionally.
- `client/src/pages/CharacterEdit.jsx:402-408` — the `PUT` body is now `merged` (`{...char, ...body, updatedAt}`) instead of the bare form `body`, so the server backup carries `equippedItems`, `ammo`, `usedSpellSlots`, `featureUses`, `classes`, etc.

**Greps (all pass):**
- `writeLocal(server)` in `useCharacterSync.js` → exactly **1** hit (`:105`, the adopt branch).
- `JSON.stringify(body)` in `CharacterEdit.jsx` → **0** hits.
- `PATCH` in `useCharacterSync.js` → still present at `:150-152` (Decision 1: the HP PATCH stays).

**Notes:** Took the incrementer's recommended `resolveLoadAction` extraction, so the policy is unit-tested rather than resting on greps alone. Both hooks call the one implementation, which is why the character-list overwrite (the second, independent wipe trigger) is fixed by the same three lines. Verify steps 4-6 are manual UI checks against a running app + server and were not executed here; they need a browser session on a non-`local-` character.

---

## Increment 2: Pure dice/damage parsing helpers + tests
**Status:** done
**Started:** 15:39  **Finished:** 15:41

**What:** Add two pure helpers — one that parses a dice formula into dice + a summed static modifier, one that strips a weapon's baked-in flat bonus from its damage string — with unit tests. No consumers yet, so nothing can break.

**Where:**
- `client/src/utils/diceFormula.js` (new).
- `client/src/utils/dndHelpers.js` — append `weaponDamageDice` next to the other pure helpers. **Verified**: the file is 111 lines; `countLangExtras` *begins* at :104 and is the last export (the plan's ":104 end of file" is off by the function body).
- `client/src/utils/diceFormula.test.js` (new); `client/src/utils/dndHelpers.test.js` (existing seed suite — follow its `import { describe, it, expect } from 'vitest'` pattern at `:1-6`).

**Details:**
- `parseDiceFormula(formula)` → `{ dice: [{die, sides}], staticBonus: number, hasDice: boolean, d1Count: number }`. Port the logic currently inline in `DiceContext.jsx:60-91` verbatim: match all `(\d+)d(\d+)` groups and expand to one entry per die; strip the dice groups then sum every `[+-]\s*\d+` token; fold `d1` dice into `staticBonus` and drop them from `dice`.
- **`d1Count` is an addition to the plan's stated shape and is required** — `DiceContext.jsx:85-87` early-resolves d1-only formulas as `{ results: [{die:'d1', sides:1, value: d1Count}], total: staticBonus }`, and Increment 3 must reproduce that exactly. Without `d1Count` on the return, the consumer cannot rebuild it.
- **New behaviour:** when there are no dice groups, still sum the bare integers, so `'1+3'` → `{dice: [], staticBonus: 4, hasDice: false}` and `'—'` → `{dice: [], staticBonus: 0, hasDice: false}`. Note this means a lone `'1'` (Blowgun) must yield `staticBonus: 1` — the leading unsigned integer counts, which the `[+-]\s*\d+` pattern alone does **not** catch.
- Non-string input returns `{dice: formula, staticBonus: 0, hasDice: true, d1Count: 0}` passthrough so the array form of `rollDice3D` keeps working.
- `weaponDamageDice(damage)` → the damage string with flat modifiers removed, or `null` when it contains no dice at all. Strip only `[+-]\s*\d+` that is **not** followed by `d` — the negative lookahead is load-bearing: `Flame Tongue` is `"1d8 + 2d6 fire"`, `Oathbow` is `"1d8 + 3d6"`, `Frost Brand` is `"1d8 + 1d6 cold"` (all confirmed in `equipment.json`) and must keep both groups.

**Test spec**
- **File:** `client/src/utils/diceFormula.test.js` (for `parseDiceFormula`) and `client/src/utils/dndHelpers.test.js` (append a `describe('weaponDamageDice')` block for `weaponDamageDice`).
- **Asserts — `parseDiceFormula`:**
  - `parseDiceFormula('1d8+1+4')` → `dice` is `[{die:'d8', sides:8}]`, `staticBonus` `5`, `hasDice` `true`
  - `parseDiceFormula('1d20+-2')` → `dice` `[{die:'d20', sides:20}]`, `staticBonus` **`-2`** (the advantage/disadvantage bug)
  - `parseDiceFormula('1d20+2')` → `staticBonus` `2`
  - `parseDiceFormula('1d8 + 2d6 fire+3')` → `dice.length` `3` (one `d8`, two `d6`), `staticBonus` `3`
  - `parseDiceFormula('2d6')` → `dice.length` `2`, `staticBonus` `0`, `hasDice` `true`
  - `parseDiceFormula('1+3')` → `hasDice` `false`, `dice` `[]`, `staticBonus` `4`
  - `parseDiceFormula('1')` → `hasDice` `false`, `staticBonus` **`1`** (Blowgun — today this whole branch returns `total: 0`)
  - `parseDiceFormula('—')` → `hasDice` `false`, `staticBonus` `0`, `dice` `[]`
  - `parseDiceFormula('2d1+1')` → `dice` `[]`, `d1Count` `2`, `staticBonus` `3`, `hasDice` `true` (d1 folds into the bonus)
  - `parseDiceFormula('2d20+5-2')` → `staticBonus` `3` (multiple modifiers sum)
  - `parseDiceFormula([{die:'d6', sides:6}])` → `dice` is that same array, `staticBonus` `0`, `hasDice` `true` (array passthrough)
  - `parseDiceFormula('')` and `parseDiceFormula(undefined)` do not throw
- **Asserts — `weaponDamageDice`:**
  - `weaponDamageDice('1d8+1')` → `'1d8'`  (+1 Longsword)
  - `weaponDamageDice('1d8+2')` → `'1d8'`  (+2 Longsword)
  - `weaponDamageDice('2d6+1')` → `'2d6'`
  - `weaponDamageDice('1d8')` → `'1d8'` (unchanged, mundane Longsword)
  - `weaponDamageDice('1d8 + 2d6 fire')` → `'1d8 + 2d6 fire'` (Flame Tongue — **both groups kept**)
  - `weaponDamageDice('1d8 + 3d6')` → `'1d8 + 3d6'` (Oathbow)
  - `weaponDamageDice('1d8 + 1d6 cold')` → `'1d8 + 1d6 cold'` (Frost Brand)
  - `weaponDamageDice('1')` → `null` (Blowgun)
  - `weaponDamageDice('—')` → `null` (Net — the em dash, U+2014, exactly as stored in `equipment.json`)
  - `weaponDamageDice(undefined)` → `null`; `weaponDamageDice('')` → `null`
- **Must fail before implementation because:** neither `client/src/utils/diceFormula.js` nor `dndHelpers.weaponDamageDice` exists — the imports fail outright. The `'1'` / `'—'` / `'1d20+-2'` cases additionally encode behaviour that today's inline `DiceContext` parse gets wrong (`total: 0` and a dropped negative), so a copy-paste port stays red until the new branches are added.

**Gates**
- ☑ **RED** — `diceFormula.test.js` (12 cases) + a `describe('weaponDamageDice')` block in `dndHelpers.test.js` (4 cases). `npm test` → `Test Files 2 failed | 1 passed (3)` / `Tests 4 failed | 13 passed (17)`, failing for the stated reason: `Error: Cannot find module './diceFormula'` and `TypeError: weaponDamageDice is not a function`.
- ☑ **GREEN** — `npm test` → `Test Files 3 passed (3)` / `Tests 29 passed (29)`; `npx vite build` → `✓ built in 3.35s`.

**Verify:** `cd client && npm test` — the new suites pass and the existing `dndHelpers.test.js` suites (`modVal`, `profBonus`, `maxSpellLevel`) still pass. `cd client && npx vite build`. No consumer changes in this increment: `rg -n "parseDiceFormula|weaponDamageDice" client/src --glob '!*.test.js'` should hit only the two definition sites.

**Log:**

**Changed:**
- `client/src/utils/diceFormula.js` — new. `parseDiceFormula(formula)` → `{dice, staticBonus, hasDice, d1Count}`. Ports `DiceContext.jsx:60-91` verbatim, plus the new no-dice branch that sums bare integers (`'1'` → 1, `'1+3'` → 4, `'—'` → 0) and the `d1Count` field the incrementer added to the spec.
- `client/src/utils/dndHelpers.js:113-133` — new `weaponDamageDice(damage)` under a new "Weapon Damage Helpers" heading, appended after `countLangExtras`.
- `client/src/utils/diceFormula.test.js` — new, 12 cases.
- `client/src/utils/dndHelpers.test.js` — `describe('weaponDamageDice')` appended, 4 cases / 11 assertions.

**Grep:** `rg -n "parseDiceFormula|weaponDamageDice" client/src --glob '!*.test.js'` → exactly the two definition sites (`diceFormula.js:16`, `dndHelpers.js:129`). No consumers yet, as the increment requires.

**Notes:** The negative lookahead in `weaponDamageDice` is `(?![\d\s]*d)`, not the plain `(?!d)` the plan implies. A plain `(?!d)` would let `\d+` backtrack on a multi-digit count — `'+ 12d6'` would match `+ 1` and be stripped, silently corrupting the dice group. `[\d\s]*` blocks that. Confirmed against the three real multi-group entries (Flame Tongue, Oathbow, Frost Brand), which round-trip unchanged.

---

## Increment 3: Wire the parsers — fix magic-weapon double-count, flat damage, and negative modifiers
**Status:** done
**Started:** 15:41  **Finished:** 15:43

**What:** Route `DiceContext` and the sheet's damage/advantage math through the new helpers so a `+1 Longsword` rolls `die + 4` (not `+5`), a Blowgun rolls `1 + DEX` (not 0), and a negative attack modifier survives advantage/disadvantage.

**Where:**
- `client/src/context/DiceContext.jsx:56-104` (`rollDice3D`) — **verified**: inline parse at :60-91, d1-only early resolve at :85-87, no-dice `total: 0` at :88-90.
- `client/src/pages/CharacterSheet.jsx:1864` (`dmgFormula`) and `:1966` (the 1H button's displayed formula, currently `{wpn.damage}+{dmgBonus}{riderDamageSuffix}`) — **verified**.
- `client/src/pages/CharacterSheet.jsx:523` and `:535` (`doAdvantage` / `doDisadvantage` `formula.match(/1d20([+-]\d+)/)`) — **verified**.
- `client/src/utils/dndHelpers.js` — add `weaponDamageFormula` (see Test spec).

**Details:**
- `DiceContext`: replace the inline parse with `parseDiceFormula`. When `!hasDice`, resolve immediately with `{ results: [], total: staticBonus }` instead of the hardcoded `total: 0` (`:88-90`). When `hasDice` but `dice.length === 0` (d1-only), keep the existing shape `{ results: [{die:'d1', sides:1, value: d1Count}], total: staticBonus }` (`:85-87`) — this is what `d1Count` on the parse result is for.
- `CharacterSheet` weapon rows: compute `const baseDamageDice = weaponDamageDice(wpn.damage);` right after `versatileDie` (`:1849-1853`), then build `:1864`'s `dmgFormula` through `weaponDamageFormula` (below). The label at `:1966` must render the **same sanitized string** the button rolls — otherwise the text and the roll disagree, which is the original bug wearing a different hat.
- Import `weaponDamageDice` / `weaponDamageFormula` from `../utils/dndHelpers` (already imported from there) and `parseDiceFormula` from `../utils/diceFormula`.
- `doAdvantage`/`doDisadvantage`: replace the regex with `const bonus = parseDiceFormula(formula).staticBonus;`. Keep the `2d20${sign}${bonus}` reroll formula and the ADV/DIS tags as is.
- **Do not touch** the `dmgBonus` / `dmgBonus2H` split at `:1861-1862` — Great Weapon Fighting is two-handed-only and Dueling one-handed-only (`known-patterns-and-gotchas.md:165`), and that split must survive verbatim.
- **Leave the item side panel alone** (`CharacterSheet.jsx:3711-3716`): it rolls `wpn.damage` raw with no ability modifier, so the embedded `+1` is correct there.
- Leave `equipment.json` and `server/seed-magic-items.js` untouched — read-time sanitising is the whole point.

**Test spec**
- **File:** `client/src/utils/dndHelpers.test.js` (append a `describe('weaponDamageFormula')` block).
- **Extraction (required to make this increment testable):** the plan writes `dmgFormula` as an inline ternary at `CharacterSheet.jsx:1864`. That ternary *is* the bug fix, so lift it into a pure helper next to `weaponDamageDice`:
  ```js
  // damage: wpn.damage; dmgBonus: number; riderSuffix: e.g. '+1d6' or ''
  export function weaponDamageFormula(damage, dmgBonus, riderSuffix = '')
  ```
  returning the roll string, or `null` when the weapon has no rollable damage at all. `CharacterSheet.jsx:1864` becomes a single call, and `:1966` renders the same returned string.
- **Asserts** (STR 16 / +3 with a `+1` weapon gives `dmgBonus` 4 — the plan's worked example):
  - `weaponDamageFormula('1d8+1', 4)` → `'1d8+4'`  — **+1 Longsword, one-handed. Today's code produces `'1d8+1+4'` = 13 average instead of 12: the double count.**
  - `weaponDamageFormula('1d8', 4)` → `'1d8+4'` (mundane Longsword, unchanged behaviour)
  - `weaponDamageFormula('1d10+1', 4)` → `'1d10+4'` (the versatile 2H die parsed out of `"versatile (1d10+1)"`), and it **equals** the 1H result's bonus — the two grips must agree
  - `weaponDamageFormula('1d8 + 2d6 fire', 3)` → `'1d8 + 2d6 fire+3'` (Flame Tongue keeps both dice groups)
  - `weaponDamageFormula('1', 2)` → `'2'` — **Blowgun with DEX +2. Today the button rolls `'1+2'`, which `DiceContext` scores as 0.**
  - `weaponDamageFormula('1', 0)` → `'0'` (a flat weapon with a +0 modifier still yields a rollable string, not `null`)
  - `weaponDamageFormula('—', 2)` → **`null`** — Net shows no damage button (see Concerns: a literal reading of the plan's ternary returns `'2'` here and contradicts its own Verify step 4)
  - `weaponDamageFormula(undefined, 3)` → `null`; `weaponDamageFormula('', 3)` → `null`
  - `weaponDamageFormula('1d8+1', 4, '+1d6')` → `'1d8+4+1d6'` (Hunter's Mark rider appended after the bonus)
  - `weaponDamageFormula('1', 2, '+1d6')` → `'2+1d6'` (flat weapon + rider die still rolls both)
  - Round-trip check tying the increment together: `parseDiceFormula(weaponDamageFormula('1d8+1', 4)).staticBonus` → `4` (not `5`), and `parseDiceFormula(weaponDamageFormula('1', 2)).staticBonus` → `2` with `hasDice` `false`.
- **Must fail before implementation because:** `weaponDamageFormula` does not exist in `dndHelpers.js` — the import fails. Once written, the `'1d8+1'` and `'—'` cases stay red for any implementation that keeps today's `` `${wpn.damage}+${dmgBonus}` `` concatenation or the plan's raw `wpn.damage ? …` truthiness guard.

**Gates**
- ☑ **RED** — `describe('weaponDamageFormula')` appended to `dndHelpers.test.js` (8 cases). `npm test` → `src/utils/dndHelpers.test.js (18 tests | 8 failed)`, failing for the stated reason: `TypeError: weaponDamageFormula is not a function`.
- ☑ **GREEN** — `npm test` → `Test Files 3 passed (3)` / `Tests 37 passed (37)`; `npx vite build` → `✓ built in 3.33s`.

**Verify:** `cd client && npm test` + `cd client && npx vite build`, plus:
1. `rg "1d20\(\[\+-\]" client/src/pages/CharacterSheet.jsx` returns no hits.
2. `rg -n "wpn\.damage" client/src/pages/CharacterSheet.jsx` — remaining hits are only the item-panel / inventory **display** paths (~:3711-3716), never the Actions-tab roll or its label.
3. UI, Actions tab, STR 16 (+3) level-5 Fighter (PB +3) with a **+1 Longsword** equipped: the 1H button reads `1d8+4`, the 2H button reads `1d10+4` — the grips agree. The attack button reads `+7`. Rolling an 8 on the d8 reports **12**.
4. UI: equip a **Blowgun** with DEX +2 — the damage button reads `+2` and rolling reports **2**, not 0. A **Net** shows no damage button.
5. UI: a weapon with a total attack bonus of `-2` rolled at disadvantage reports `lowest d20 − 2`, not the bare die.

**Log:**

**Changed:**
- `client/src/utils/dndHelpers.js:135-158` — new `weaponDamageFormula(damage, dmgBonus, riderSuffix = '')`. Guard is "has dice, **or** has a digit" — never raw truthiness, so the Net's `'—'` returns `null` (Concern 1).
- `client/src/utils/dndHelpers.test.js` — `describe('weaponDamageFormula')`, 8 cases incl. the parser round-trip.
- `client/src/context/DiceContext.jsx:4` + `:57-68` — the ~30-line inline parse replaced by `parseDiceFormula`. `!hasDice` now resolves `{results: [], total: staticBonus}` (was hardcoded `total: 0`); the d1-only early resolve keeps its exact old shape via `d1Count`.
- `client/src/pages/CharacterSheet.jsx:16-17` — imports `weaponDamageFormula` and `parseDiceFormula`.
- `client/src/pages/CharacterSheet.jsx:1867` — `dmgFormula` now built by `weaponDamageFormula(wpn.damage, dmgBonus, riderDamageSuffix)`.
- `client/src/pages/CharacterSheet.jsx:1969` — the 1H button label renders `{dmgFormula}` (the sanitized string it actually rolls) instead of `{wpn.damage}+{dmgBonus}{riderDamageSuffix}`.
- `client/src/pages/CharacterSheet.jsx:523-525`, `:536` — `doAdvantage`/`doDisadvantage` take their bonus from `parseDiceFormula(formula).staticBonus`; the `/1d20([+-]\d+)/` regexes are gone.

**Greps (all pass):**
- `rg "1d20\(\[\+-\]" client/src/pages/CharacterSheet.jsx` → **0** hits. (First pass left the pattern in an explanatory comment; reworded so the grep is honest.)
- `rg -n "wpn\.damage" client/src/pages/CharacterSheet.jsx` → `:1865` (comment), `:1867` (the sanitising call's input), `:1977` (`wpn.damageType`, a different field). No raw damage roll or label remains.

**Notes:**
- `dmgBonus`/`dmgBonus2H` (`:1861-1862`) untouched, so the Great Weapon Fighting / Dueling grip split survives verbatim. The 2H button already used `versatileDie`, which was already sanitized — that's why the grips disagreed, and they now agree.
- Item side panel left alone as instructed (it rolls raw damage with no ability mod, so its embedded `+1` is correct).
- **Rules observation, not implemented (out of scope):** `weaponDamageFormula('1', 2)` → `'2'` drops the Blowgun's own 1 point of base damage; strict 5e would be `1 + DEX = 3`. This exact value is specified three times (plan Increment 3 verify, plan Verification, this increment's test spec: "rolling reports **2**, not 0"), so it is implemented as specified. Worth a follow-up if the intent was really `damage + mod`.
- UI verify steps 3-5 are manual browser checks and were not run here.

---

## Increment 4: Guard against overlapping rolls
**Status:** done
**Started:** 15:43  **Finished:** 15:46

**What:** Ignore a roll request while dice are still in the air, and disable the roll buttons while rolling, so a second click can't silently swallow the first roll's result and leave a stale number on screen.

**Where:**
- `client/src/context/DiceContext.jsx:41-43` (refs — **verified**: `resolveRef`, `bonusRef`, `fadeTimers`), `:56-104` (`rollDice3D`), `:106-129` (`onDiceSettled`, `setRolling(false)` at :110), `:132` (provider value).
- `client/src/pages/CharacterSheet.jsx:503-552` (`doRollWithResult` :504, `doAdvantage` :525, `doDisadvantage` :537, `doCrit` :548), `:859-880` (`RollBtn`), `:77` (`useDice()` destructure).

**Details:**
- Add `const rollingRef = useRef(false);` to `DiceProvider`. Set it `true` inside the `new Promise` body of `rollDice3D`, and `false` in `onDiceSettled`'s 500 ms callback alongside `setRolling(false)` (`:110`). A ref is required — `rolling` state is stale inside the `useCallback`.
- At the top of `rollDice3D`, `if (rollingRef.current) return Promise.resolve(null);` — **before** the parse. Defensively, if `resolveRef.current` is still set when a new roll starts, call it with `null` and clear it so no promise is orphaned.
- `RollBtn`: pull `rolling` from `useDice()` at `:77` and pass `disabled={rolling}` plus `opacity: rolling ? 0.5 : 1` / `cursor: rolling ? 'default' : 'pointer'` on the button at `:871`. Do **not** hoist `RollBtn` out of the component body — out of scope (it already violates `known-patterns-and-gotchas.md:5-12`; adding a prop must not make it worse).

**Every `rollDice3D` caller must tolerate `null`.** The plan names only `applyLevelUp` and `DiceRoller.jsx`; the tree actually has **13** call sites, and six of them destructure the result immediately and will throw `TypeError: Cannot destructure property 'results' of 'null'`. Full checklist (verified 2026-08-16):

- ☑ `client/src/pages/CharacterSheet.jsx:394` — Short Rest hit die; destructure split into `const rolled = …; if (!rolled) return; const { total } = rolled;`
- ☑ `client/src/pages/CharacterSheet.jsx:475` — `applyLevelUp`; `const rolled = …; if (!rolled) return;` then `rolled.total`. Safe: the return is **before** `updateChar` (`:502`), so no half-applied level-up.
- ☑ `client/src/pages/CharacterSheet.jsx:508` — `doRollWithResult`; `if (!result) return null;` (it has a meaningful return value)
- ☑ `client/src/pages/CharacterSheet.jsx:531` — `doAdvantage`
- ☑ `client/src/pages/CharacterSheet.jsx:543` — `doDisadvantage`
- ☑ `client/src/pages/CharacterSheet.jsx:555` — `doCrit`
- ☑ `client/src/pages/CharacterSheet.jsx:3580` — roll-menu "(Half)" roll
- ☑ `client/src/components/DiceRoller.jsx:50` — destructure removed; guard also clears its own `setRolling(false)` so the button doesn't stick
- ☑ `client/src/components/DiceRoller.jsx:61` — same
- ☑ `client/src/pages/Equipment.jsx:124` — destructure moved below the guard
- ☑ `client/src/pages/Homebrew.jsx:31` — destructure removed
- ☑ `client/src/pages/Spells.jsx:138` — destructure moved below the guard

**Test spec**
- **Test:** n/a — the guard is a `useRef` flag inside `DiceProvider` plus a `disabled` prop on a component defined inside `CharacterSheet`'s body. There is no component/hook test setup in this project, and no pure-function core to extract: the whole behaviour is "was a mutable flag set when this ran". Specifying a helper here would be a fake test that passes before the fix.
- **Verification instead** (all three required):
  1. `rg -n "rollDice3D\(" client/src --glob '!*.test.js'` returns the 12 call sites above (plus the `DiceContext.jsx:21` doc comment and the definition) and **every one** either guards with `if (!result) return;` before touching `result`, or is inside a `const result = await …; if (!result) return;` pair. Zero bare `const { … } = await rollDice3D(…)` remain.
  2. `rg -n "rollingRef" client/src/context/DiceContext.jsx` shows the declaration, the early return in `rollDice3D`, the `true` assignment, and the `false` reset in `onDiceSettled`'s 500 ms callback — four hits minimum.
  3. UI: click a weapon's attack button and, while the dice are still tumbling, click its damage button. The damage button is visibly disabled (50% opacity) and does nothing; after the dice settle both buttons re-enable and rolling damage produces a fresh, correct number — not the attack roll's number. Repeat once from the Spells tab and once from the standalone Dice Roller to confirm no crash from a `null` return.

**Gates**
- ☑ **GREEN** — all 12 call sites guarded; `npm test` → `Test Files 3 passed (3)` / `Tests 37 passed (37)`; `npx vite build` → `✓ built in 3.38s`.

**Verify:** `cd client && npm test` + `cd client && npx vite build` + the three checks above.

**Log:**

**Changed:**
- `client/src/context/DiceContext.jsx:25-27` — the provider doc comment now states the `null` return and that every caller must guard.
- `client/src/context/DiceContext.jsx:50` — `const rollingRef = useRef(false);` (a ref, because `rolling` state is stale inside the `useCallback`).
- `client/src/context/DiceContext.jsx:66-71` — `if (rollingRef.current) return Promise.resolve(null);` **before** the parse, plus the defensive "resolve any orphaned `resolveRef` with `null`" clause.
- `client/src/context/DiceContext.jsx:86` — `rollingRef.current = true` inside the `new Promise` body.
- `client/src/context/DiceContext.jsx:103` — `rollingRef.current = false` in `onDiceSettled`'s 500 ms callback, next to `setRolling(false)`.
- `client/src/pages/CharacterSheet.jsx:78` — `const { rollDice3D, rolling: diceRolling } = useDice();`
- `client/src/pages/CharacterSheet.jsx:882`, `:895-896` — `RollBtn` gains `disabled={diceRolling}`, `opacity: diceRolling ? 0.5 : 1`, `cursor: diceRolling ? 'default' : 'pointer'`.
- Null guards added at all 12 call sites (see the checklist above) across `CharacterSheet.jsx`, `DiceRoller.jsx`, `Equipment.jsx`, `Homebrew.jsx`, `Spells.jsx`.

**Verification checks:**
1. `grep -rn "= await rollDice3D" client/src` → **12** sites, every one assigning to a variable. **Zero** bare `const { … } = await rollDice3D(…)` remain; each is followed by an `if (!rolled|!result|!r) return;` guard (all 12 confirmed by `grep -A 4`).
2. `grep -n "rollingRef" client/src/context/DiceContext.jsx` → **4** hits: declaration `:50`, early return `:66`, `true` `:86`, `false` `:103`.
3. UI check (double-click mid-flight, plus the Spells tab and the standalone Dice Roller) is a manual browser check and was **not** run here.

**Notes:**
- `RollBtn` was **not** hoisted out of the component body, as instructed — it keeps its pre-existing violation of the no-nested-component rule and gains only the one prop.
- `DiceRoller`'s two guards also call `setRolling(false)` before returning; without that its own local `rolling` state would latch on after a rejected roll and dead-lock the button.
- `doRollWithResult` returns `null` on a rejected roll. All 7 of its callers are fire-and-forget `onClick` handlers that ignore the return value — checked, none dereference it.
- Pre-existing behaviour kept: if a 3D roll never settles, the flag stays set. That was already true of the `rolling` state before this change; not widened here.

---

## Increment 5: Persist the Magic Initiate spell list and unblock the sheet's browser
**Status:** done
**Started:** 15:46  **Finished:** 15:48

**What:** Add a ruleset-aware `MAGIC_INITIATE_CLASSES` table, persist the creator's chosen class as `char.featSpellLists`, and make the sheet's spell browser allow every class the character can actually draw from — all their classes plus any feat-granted list.

**Where:**
- `client/src/utils/dndConstants.js` — new export near the other feat tables. **Verified**: `FEAT_PROFICIENCY_GRANTS` :94, `FEAT_ABILITY_BONUSES` :102, `FEAT_HP_PER_LEVEL` :119, `FEAT_EFFECTS` :132.
- `client/src/pages/CharacterCreate.jsx:2048` (the hardcoded `['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']` — **verified verbatim**), `:2046` (the `miClass` select and its reset), `:474-480` (the conditional payload spreads, `preparedSpells` at `:478`), `:86` (`ruleset` state; `miClass`/`miCantrips` at `:72-73`).
- `client/src/pages/CharacterSheet.jsx:227-234` — **verified**: `if (char?.class)` at :228, the `.filter` at :230, deps `char?.class` at :234.

**Details:**
- `export const MAGIC_INITIATE_CLASSES = { '2014': ['Bard','Cleric','Druid','Sorcerer','Warlock','Wizard'], '2024': ['Cleric','Druid','Wizard'] };`
- Creator: replace the inline array at `:2048` with `(MAGIC_INITIATE_CLASSES[ruleset] || MAGIC_INITIATE_CLASSES['2014'])`. Reset `miClass`/`miCantrips`/`miSpell` when `ruleset` changes so a 2024 character can't keep a Warlock pick.
- Creator payload: add `...(miClass && selectedFeats.includes('Magic Initiate') && { featSpellLists: { 'Magic Initiate': [miClass] } })` alongside the existing spreads at `:474-480`. **Array-valued** — Decision 2. Leave `preparedSpells` (`:478`) exactly as is.
- Sheet browser (`:227-231`): build the allowed set from `getCharClasses(char).map(c => c.class)` (already imported) unioned with the feat lists, lower-cased. Keep the `!s.classes?.length` escape hatch for homebrew/racial spells. Fall back to today's single-class behaviour when both sources are empty. Update deps at `:234` to `char?.class, char?.classes, char?.featSpellLists`.
- Back-compat: readers must tolerate a bare string (`'Cleric'`) as well as an array — normalise with `[].concat(v)` at every read site. Characters with no `featSpellLists` keep today's behaviour and are fixed by the editor picker in Increment 6 — do not guess a list for them.
- Never read `char.class` for class-derived math — go through `getCharClasses(char)` (`known-patterns-and-gotchas.md:171-180`).
- Do not touch `CharacterSheet.jsx:2212` — the `+2 cantrips / +1 spell` cap is already correct and now finally has a non-empty list behind it.

**Test spec**
- **File:** `client/src/utils/dndHelpers.test.js` (new `describe` blocks) — or a new `client/src/utils/spellAccess.test.js` if the executor prefers to keep the helper separate.
- **Extraction (recommended, in scope):** the allowed-class union at `CharacterSheet.jsx:227-231` is the increment's actual logic. Put it in `src/utils/` so both this increment and Increment 6's editor union call one implementation:
  ```js
  // lower-cased class names the character may draw spells from
  export function allowedSpellClasses(char)
  // does a browser result survive the class filter?
  export function spellMatchesClasses(spell, allowed)
  ```
  `MAGIC_INITIATE_CLASSES` itself is asserted directly from `dndConstants.js`.
- **Asserts — `MAGIC_INITIATE_CLASSES`:**
  - `MAGIC_INITIATE_CLASSES['2014']` → `['Bard','Cleric','Druid','Sorcerer','Warlock','Wizard']` (exact array, length `6`)
  - `MAGIC_INITIATE_CLASSES['2024']` → `['Cleric','Druid','Wizard']` (length `3`)
  - `MAGIC_INITIATE_CLASSES['2024']` does **not** include `'Warlock'`, `'Bard'` or `'Sorcerer'` — the whole point of the ruleset split
  - `MAGIC_INITIATE_CLASSES['2014']` does not include `'Paladin'` (a Paladin must pick another list — the case the app blocks today)
- **Asserts — `allowedSpellClasses`** (order-insensitive; compare as a sorted array or a `Set`):
  - `allowedSpellClasses({ class: 'Paladin', featSpellLists: { 'Magic Initiate': ['Cleric'] } })` → `['cleric','paladin']` — **the headline case**
  - `allowedSpellClasses({ class: 'Paladin', featSpellLists: { 'Magic Initiate': 'Cleric' } })` → `['cleric','paladin']` (legacy **bare-string** value still works, per Decision 2)
  - `allowedSpellClasses({ class: 'Fighter', classes: [{class:'Fighter', level:3}, {class:'Wizard', level:2}] })` → `['fighter','wizard']` (multiclass browsing, no feat)
  - `allowedSpellClasses({ class: 'Fighter', classes: [{class:'Fighter', level:3}, {class:'Wizard', level:2}], featSpellLists: { 'Magic Initiate': ['Druid'] } })` → `['druid','fighter','wizard']`
  - `allowedSpellClasses({ class: 'Wizard' })` → `['wizard']` (single class, unchanged)
  - `allowedSpellClasses({})` → `[]` and `allowedSpellClasses(null)` → `[]` (empty ⇒ caller falls back to no filtering; must not throw)
  - `allowedSpellClasses({ class: 'Paladin', featSpellLists: {} })` → `['paladin']`
  - Duplicates collapse: `allowedSpellClasses({ class: 'Cleric', featSpellLists: { 'Magic Initiate': ['Cleric'] } })` → `['cleric']` (length `1`)
- **Asserts — `spellMatchesClasses`:**
  - `spellMatchesClasses({ name: 'Light', classes: ['Bard','Cleric','Sorcerer','Wizard'] }, ['paladin','cleric'])` → `true` — **the Paladin/Magic Initiate bug: `false` today**
  - `spellMatchesClasses({ name: 'Fire Bolt', classes: ['Sorcerer','Wizard'] }, ['paladin','cleric'])` → `false`
  - `spellMatchesClasses({ name: 'Fire Bolt', classes: ['Sorcerer','Wizard'] }, ['fighter','wizard'])` → `true` (multiclass)
  - `spellMatchesClasses({ name: 'Homebrew Bolt' }, ['paladin'])` → `true` (no `classes` ⇒ escape hatch, `!s.classes?.length`)
  - `spellMatchesClasses({ name: 'Homebrew Bolt', classes: [] }, ['paladin'])` → `true`
  - `spellMatchesClasses({ name: 'Light', classes: ['Cleric'] }, [])` → `true` (empty allowed set ⇒ no filtering)
  - Case-insensitivity: `spellMatchesClasses({ classes: ['CLERIC'] }, ['cleric'])` → `true`
- **Must fail before implementation because:** `MAGIC_INITIATE_CLASSES`, `allowedSpellClasses` and `spellMatchesClasses` do not exist — the imports fail. Behaviourally, today's filter at `CharacterSheet.jsx:228-230` compares against `char.class` alone, so the `Light`-for-a-Paladin and `Fire Bolt`-for-a-multiclass assertions cannot pass until the union is built.

**Gates**
- ☑ **RED** — `client/src/utils/spellAccess.test.js` written (17 cases across `MAGIC_INITIATE_CLASSES`, `allowedSpellClasses`, `spellMatchesClasses`). `npm test` → `Test Files 1 failed | 3 passed (4)`, failing for the stated reason: `Error: Cannot find module './spellAccess'`.
- ☑ **GREEN** — `npm test` → `Test Files 4 passed (4)` / `Tests 54 passed (54)`; `npx vite build` → `✓ built in 3.33s`.

**Verify:** `cd client && npm test` + `cd client && npx vite build`, plus:
1. `rg "'Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'" client/src/pages/CharacterCreate.jsx` returns no hits (the literal has moved to the constants table).
2. `rg -n "char\?\.class\]" client/src/pages/CharacterSheet.jsx` — the spell-browser effect's deps no longer end at the bare `char?.class`.
3. UI: create a 2014 Paladin with Magic Initiate → the picker offers 6 classes; pick **Cleric**, take Sacred Flame + Guidance and Cure Wounds. On the sheet's Spells tab, "+ Add / Remove Spells" and search `Light` — **Light** appears, and the cantrip counter reads `2/2`. Spell save DC for a 16-CHA Paladin 5 is unchanged at **14**.
4. UI: a 2024 character with the feat → the picker offers exactly Cleric, Druid, Wizard.
5. UI: a Fighter 3 / Wizard 2 multiclass finds Wizard spells in the sheet's browser.
6. DevTools: the created character's localStorage record has `featSpellLists: {"Magic Initiate":["Cleric"]}` — an **array**.

**Log:**

**Changed:**
- `client/src/utils/dndConstants.js:118-127` — new `MAGIC_INITIATE_CLASSES` table (2014 six lists / 2024 three), placed with the other feat tables.
- `client/src/utils/spellAccess.js` — new. `allowedSpellClasses(char)` (goes through `getCharClasses`, never raw `char.class`) and `spellMatchesClasses(spell, allowed)`. Feat values normalised with `[].concat(v)`, so a legacy bare string works.
- `client/src/utils/spellAccess.test.js` — new, 17 cases.
- `client/src/pages/CharacterSheet.jsx:19` — imports the two helpers.
- `client/src/pages/CharacterSheet.jsx:229-236` — the browser's `char.class`-only filter replaced by the union; the `!s.classes?.length` homebrew escape hatch and the "empty ⇒ don't filter" fallback are preserved inside `spellMatchesClasses`. Deps now `char?.class, char?.classes, char?.featSpellLists`.
- `client/src/pages/CharacterCreate.jsx:13` — imports `MAGIC_INITIATE_CLASSES`.
- `client/src/pages/CharacterCreate.jsx:88-97` — new effect resetting `miClass`/`miCantrips`/`miSpell` when `ruleset` changes, so a 2024 character cannot keep a Warlock pick.
- `client/src/pages/CharacterCreate.jsx:2057` — the hardcoded six-class array replaced by `(MAGIC_INITIATE_CLASSES[ruleset] || MAGIC_INITIATE_CLASSES['2014'])`.
- `client/src/pages/CharacterCreate.jsx:485-488` — the create payload now spreads `featSpellLists: { 'Magic Initiate': [miClass] }` (array-valued, Decision 2). `preparedSpells` untouched.

**Greps (all pass):**
- `rg "'Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'" client/src/pages/CharacterCreate.jsx` → **0** hits.
- `rg -n "char\?\.class\]" client/src/pages/CharacterSheet.jsx` → **0** hits (the effect's deps no longer end at the bare `char?.class`).

**Notes:** `CharacterSheet.jsx:2212`'s `+2 cantrips / +1 spell` cap left untouched as instructed — it now has a non-empty list behind it. UI verify steps 3-6 are manual browser checks and were not run here.

---

## Increment 6: Magic Initiate picker in the editor
**Status:** done
**Started:** 15:48  **Finished:** 15:50

**What:** Let the editor set/change the Magic Initiate spell list on an existing character, and make the editor's own spell list include that class's spells so the picks can be made there too.

**Where:**
- `client/src/pages/CharacterEdit.jsx:132-178` (form initialisation), `:249-255` (`allSpells` — **verified**: `if (!form.class) return;` at :250, the `SPELLCASTING_CLASSES` guard at :251, deps `[form.class]` at :255), `:1297-1308` (top of the Spells section, just above the "Override — add any spell" block).
- `client/src/pages/CharacterEdit.jsx:388-392` (the save `body` is the form object — a field missing from the form is dropped on every save).

**Details:**
- Add `featSpellLists: { ...(data.featSpellLists || {}) },` to the form object at `:132-178` — without it the field is silently dropped on save.
- Above the override block (`:1301`), render a picker **only when** the normalized feat list contains `Magic Initiate`. **Define it inline in the existing JSX — do not create a child component** (`known-patterns-and-gotchas.md:5-12`).
- The picker is a plain `<select>` over `MAGIC_INITIATE_CLASSES[form.ruleset] || MAGIC_INITIATE_CLASSES['2014']`, writing `set('featSpellLists', { ...(form.featSpellLists || {}), 'Magic Initiate': [value] })` — **array-valued**, Decision 2. Include a short note that it grants 2 cantrips + 1 first-level spell from that list.
- `allSpells` (`:249-255`): union `queryLocalSpells({ cls: form.class })` with `queryLocalSpells({ cls: c })` for each class in the feat lists, de-duplicated by `_id`. Add `form.featSpellLists` to the deps. **The early returns at `:250-251` must let a non-caster through when a feat list is present** — a Paladin at level 1 or a Fighter is exactly the character this increment serves, and `SPELLCASTING_CLASSES.includes('Fighter')` is `false`.
- Leave `getSpellLimits` (`:48-76`) alone — it is one of three parallel ruleset-dependent spell-limit sites (`known-patterns-and-gotchas.md:161-162`) and changing one requires changing all three. The "Override — add any spell" toggle remains the escape hatch.

**Test spec**
- **File:** `client/src/utils/dndHelpers.test.js` (append a `describe('normalizeFeatNames')` block) — plus reuse of Increment 5's `allowedSpellClasses`.
- **Extraction (recommended, in scope):** the picker's visibility condition is the feat-object-vs-string normalisation that this codebase does inline in at least two places (`CharacterSheet.jsx:607-610`, and again in the editor). There is **no** shared helper today (`rg "normalizeFeat" client/src` is empty). Add one and use it for the picker's condition:
  ```js
  export function normalizeFeatNames(feats) // → string[] of names, always
  ```
  The editor's spell union reuses `allowedSpellClasses` from Increment 5 — no second implementation.
- **Asserts — `normalizeFeatNames`:**
  - `normalizeFeatNames(['Alert', 'Magic Initiate'])` → `['Alert','Magic Initiate']`
  - `normalizeFeatNames([{ name: 'Magic Initiate', prereq: '', desc: 'Choose a class…' }])` → `['Magic Initiate']` — **old saves store objects** (`known-patterns-and-gotchas.md:28-45`); this is the case that hides the picker if missed
  - `normalizeFeatNames(['Alert', { name: 'Magic Initiate' }, null, undefined, {}])` → `['Alert','Magic Initiate']` (nulls and nameless objects dropped, nothing thrown)
  - `normalizeFeatNames(undefined)` → `[]`; `normalizeFeatNames(null)` → `[]`
  - `normalizeFeatNames([{ name: 'Magic Initiate' }]).includes('Magic Initiate')` → `true` (the picker's literal condition)
  - The returned array contains only strings: `normalizeFeatNames([{name:'Alert'}]).every(f => typeof f === 'string')` → `true`
- **Asserts — editor spell union (via `allowedSpellClasses`, form-shaped input):**
  - `allowedSpellClasses({ class: 'Fighter', featSpellLists: { 'Magic Initiate': ['Wizard'] } })` → `['fighter','wizard']` — a **non-caster** still gets the feat list, which is what forces the `:250-251` guard to change
  - `allowedSpellClasses({ class: 'Paladin', featSpellLists: { 'Magic Initiate': ['Wizard'] } })` → `['paladin','wizard']` (the plan's Verify case: the browser must then find **Fire Bolt**)
- **Must fail before implementation because:** `normalizeFeatNames` does not exist in `dndHelpers.js` — no shared normaliser exists anywhere in `src/utils/` today (only inline copies inside components), so the import fails.

**Gates**
- ☑ **RED** — `describe('normalizeFeatNames')` appended to `dndHelpers.test.js` (6 cases), plus the editor's non-caster union case added to `spellAccess.test.js`. `npm test` → `src/utils/dndHelpers.test.js (24 tests | 6 failed)`, failing for the stated reason: `TypeError: normalizeFeatNames is not a function`.
- ☑ **GREEN** — `npm test` → `Test Files 4 passed (4)` / `Tests 61 passed (61)`; `npx vite build` → `✓ built in 3.34s`.

**Verify:** `cd client && npm test` + `cd client && npx vite build`, plus:
1. `rg -n "featSpellLists" client/src/pages/CharacterEdit.jsx` shows hits in the form init, the picker, and the `allSpells` effect deps — three places minimum, or the field will not round-trip.
2. UI: open an existing Paladin that has Magic Initiate but no `featSpellLists`, pick **Wizard**, Save. In DevTools, `JSON.parse(localStorage['ond-char-<id>']).featSpellLists` is `{"Magic Initiate":["Wizard"]}` (**array**). Back on the sheet, the browser finds **Fire Bolt**.
3. UI: reload the editor — the select still shows Wizard (proves the field round-trips through the form).
4. UI: open a character whose `feats` array holds `{name: 'Magic Initiate', …}` **objects** from an old save — the picker still appears.
5. UI: a character without the feat shows **no** picker.

**Log:**

**Changed:**
- `client/src/utils/dndHelpers.js:113-127` — new `normalizeFeatNames(feats)` under a new "Feat Helpers" heading. First shared normaliser in `src/utils/`; the two inline copies in components are left as-is (out of scope).
- `client/src/utils/dndHelpers.test.js` — `describe('normalizeFeatNames')`, 6 cases.
- `client/src/utils/spellAccess.test.js` — one more `allowedSpellClasses` case covering the editor's non-caster (Fighter/Paladin + feat list).
- `client/src/pages/CharacterEdit.jsx:9`, `:11` — imports `MAGIC_INITIATE_CLASSES` and `normalizeFeatNames`.
- `client/src/pages/CharacterEdit.jsx:165-167` — `featSpellLists` added to the form object, so the field round-trips instead of being dropped on save.
- `client/src/pages/CharacterEdit.jsx:249-266` — `allSpells` now unions the caster class with every feat-granted class, de-duplicated by `_id`. The guard was restructured: it now returns empty only when there is **neither** a spellcasting class **nor** a feat list, so a Fighter/level-1 Paladin gets their Magic Initiate spells.
- `client/src/pages/CharacterEdit.jsx:1316-1341` — the picker, inline JSX above the "Override — add any spell" block, rendered only when `normalizeFeatNames(form.feats).includes('Magic Initiate')`. Writes `{ 'Magic Initiate': [value] }` (array); choosing the blank option deletes the key rather than storing `['']`.

**Grep:** `rg -n "featSpellLists" client/src/pages/CharacterEdit.jsx` → **7** hits across form init (`:167`), the `allSpells` effect (`:256`) and its deps (`:266`), and the picker (`:1322`, `:1325`, `:1328`) — comfortably past the three-place minimum.

**Notes:**
- Picker is inline JSX in the existing tree, not a child component (`known-patterns-and-gotchas.md:5-12`).
- `getSpellLimits` left alone as instructed — it is one of the three parallel ruleset spell-limit sites, and the override toggle remains the escape hatch.
- The select reads through `[].concat(...)[0]`, so a legacy bare-string value displays correctly and is upgraded to an array on the next change.
- UI verify steps 2-5 are manual browser checks and were not run here.

---

## Increment 7: Stop the sheet from widening the page
**Status:** done
**Started:** 15:50  **Finished:** 15:52

**What:** Apply the structural overflow fix sheet-wide — `minmax(0, 1fr)` on every grid track, `minWidth: 0` on the row cells that lack it, and global word-wrapping / horizontal containment — so no tab or content can push the page wider than the viewport.

**Where** (all **verified** 2026-08-16):
- `client/src/index.css:218-222` (`.page`, currently `max-width: 1200px; margin: 0 auto; padding: 24px 16px;`) plus a new global wrap rule.
- `client/src/pages/CharacterSheet.jsx:832` (sheet wrapper, `maxWidth: '1400px'`).
- Grid templates with a bare `1fr`: `:834` (`repeat(6, 1fr)`), `:840` (main layout, `${sidebarWidth}px 1fr[ 1fr[ 1fr]]`), `:1155` (`'1fr 1fr 1fr 1fr'` / `'1fr 1fr 1fr'`), `:1810`, `:1895`, `:1982`, `:2022`, `:2085` (all `'2fr 1fr 1fr 1.5fr'`), `:3617`, `:3697`, `:3784` (all `'1fr 1fr'`).
- Row cells missing `minWidth: 0`: `:1899` (weapon name), `:2039` (natural weapon name), `:2089` (spell name + upcast `<select>` — the worst offender; the select has its own intrinsic width). Contrast `:2144`, which already has it.
- **Leave alone:** `:2790` (`repeat(auto-fill, minmax(120px, 1fr))`) already uses `minmax` and is not a bare `1fr`.

**Details:**
- Every bare `1fr` above becomes `minmax(0, 1fr)`; `'2fr 1fr 1fr 1.5fr'` → `'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.5fr)'`.
- Add `minWidth: 0` to the first-cell `<div>`s at `:1899`, `:2039`, `:2089`.
- Add `overflowX: 'hidden'` (or `clip`) to the sheet wrapper at `:832` as a backstop, and to `.page` in `index.css:218-222`.
- Global wrap: `body { overflow-wrap: break-word; }` (inherited, safe) plus a `.wrap-text` class for description blocks. **No blanket `overflow-wrap: anywhere`** — Decision 4.
- **Preserve** the deliberate `whiteSpace: 'nowrap'` + ellipsis at `:2147` (Actions-tab feature blurb) and the `whiteSpace: 'pre-wrap'` in the side panels (`:3676`, `:3775`, `:3805`).

**Test spec**
- **Test:** n/a — this increment changes only CSS values and inline style objects. There is no logic to assert and no component-render/layout test setup (asserting layout would need jsdom + a real layout engine, which jsdom does not have). Any "test" here would pass before the change.
- **Verification instead** (all four required):
  1. `rg -n "gridTemplateColumns" client/src/pages/CharacterSheet.jsx | rg -v "minmax"` returns **no hits** (11 templates converted; `:2790` already passes).
  2. `rg -n "minWidth: 0" client/src/pages/CharacterSheet.jsx` includes lines near `:1899`, `:2039` and `:2089` — currently the nearest hits are `:1003`, `:2144`, `:2390`, `:2525`, `:2628`, `:3283`, `:3964`.
  3. `rg -n "overflow-wrap|overflow-x" client/src/index.css` shows the new `body` rule and the `.page` containment (today: zero hits).
  4. UI: on a character with a long feature description **and** a long homebrew item name, visit **every** tab — Actions, Spells, Inventory, Features, Progression, Background, Notes — at a 1280px window and again at 900px, and open the action / item / spell side panels. On each, the console reports `document.documentElement.scrollWidth === document.documentElement.clientWidth` (no horizontal scrollbar). Confirm the `:2147` ellipsis and the side-panel `pre-wrap` still look right.

**Gates**
- ☑ **GREEN** — `npm test` → `Test Files 4 passed (4)` / `Tests 61 passed (61)` (no regressions); `npx vite build` → `✓ built in 3.38s`; grep checks 1-3 pass.

**Verify:** `cd client && npm test` (no regressions) + `cd client && npx vite build` + the four checks above.

**Log:**

**Changed:**
- `client/src/pages/CharacterSheet.jsx` — all **11** bare-`1fr` grid templates converted to `minmax(0, …)`: `:844` ability bar, `:850` main layout (all three column-count variants), `:1169`, `:1824`, `:1911`, `:1998`, `:2038`, `:2101` (the five `'2fr 1fr 1fr 1.5fr'` action/spell tables), `:3634`, `:3714`, `:3801` (side-panel `'1fr 1fr'`). `:2806` left alone — it already used `minmax(120px, 1fr)`.
- `client/src/pages/CharacterSheet.jsx` — `minWidth: 0` added to the three first-cell `<div>`s: weapon name, natural-weapon name, and the spell name + upcast `<select>` (the worst offender, since the select carries its own intrinsic width). `minWidth: 0` count went 7 → **10**.
- `client/src/pages/CharacterSheet.jsx:842` — `overflowX: 'hidden'` on the sheet wrapper as a backstop.
- `client/src/index.css:37-43` — `overflow-wrap: break-word` **merged into the existing `body` rule** rather than added as a second `body` block.
- `client/src/index.css:230` — `overflow-x: hidden` on `.page`.
- `client/src/index.css:233-237` — new opt-in `.wrap-text` class (`overflow-wrap: anywhere`) for description blocks.

**Verification checks:**
1. `grep -n "gridTemplateColumns" … | grep -v minmax` → **no hits**.
2. `grep -c "minWidth: 0"` → **10** (was 7); the three new ones are the row cells named above.
3. `grep -n "overflow-wrap|overflow-x" src/index.css` → `:43` (body `break-word`), `:230` (`.page` containment), `:235` (`.wrap-text`). Was zero hits before.
4. UI: the seven-tab sweep at 1280px and 900px is a manual browser check and was **not** run here. Per the incrementer's Concern 7, grep check 1 is the only durable guard.

**Notes:** Decision 4 respected — no blanket `overflow-wrap: anywhere`; the aggressive rule is opt-in via `.wrap-text`. The deliberate `whiteSpace: 'nowrap'` (2 occurrences, incl. the Actions-tab feature blurb ellipsis) and `'pre-wrap'` (3, the side panels) are untouched — counts confirmed unchanged.

---

## Increment 8: Docs + changelog
**Status:** done
**Started:** 15:52  **Finished:** 15:56

**What:** Record all four fixes in `CHANGELOG.md` under the `## vX.X.X — Unreleased` block and update the affected `Docs/` files, per `CLAUDE.md`. Exact copy is in the plan's `## Docs & changelog` section — use it verbatim.

**Where:**
- `CHANGELOG.md:29` — the `## vX.X.X — Unreleased` heading (**the plan says :30; it is :29**; the next heading is `## v1.4.0 — 2026-07-19` at :31).
- `Docs/known-patterns-and-gotchas.md` — **required.** (a) Rewrite the "CharacterEdit Server + Local Fallback" entry (`:101-102`), which currently documents the removed behaviour and the unconditional HP PATCH. (b) New: *"Sheet-owned fields live only in localStorage"* — list `equippedItems`, `ammo`, `usedSpellSlots`, `featureUses`, `activeBuffs`, `activeConditions`, `hitDiceRemaining`, `temporaryHp`, death saves, `attunedItems`, `classes`, `levelChoices`. (c) New: *"Weapon damage strings carry the magic bonus twice"* — same family as the versatile-parsing note at `:164-165`. (d) New: *"One roll at a time"* — `rollDice3D` returns `null` when dice are in flight. (e) New: *"Grid tracks must be `minmax(0, 1fr)`"*. (f) Extend the feat-wiring list at `:150` with `featSpellLists` / `MAGIC_INITIATE_CLASSES`.
- `Docs/client-context-hooks-utils.md` — the load-and-merge policy; `utils/diceFormula.js` (`parseDiceFormula`), `dndHelpers.weaponDamageDice` / `weaponDamageFormula` / `normalizeFeatNames`, `allowedSpellClasses` / `spellMatchesClasses`, `utils/charSync.js`; `DiceContext`'s re-entrancy guard and `null` return; `MAGIC_INITIATE_CLASSES`.
- `Docs/client-pages.md` — the sheet's spell browser spanning all classes plus feat-granted lists; the editor's Magic Initiate picker; the creator persisting `featSpellLists`; the corrected weapon damage buttons.
- `Docs/architecture.md` — server is a write-only backup + discovery source, never a source of truth for an existing local character.
- `Docs/styles-and-theming.md` — the `minmax(0, 1fr)` / `minWidth: 0` / word-wrap convention.
- `Docs/research/2026-08-16-player-reported-bugs-magic-initiate-level-up-wipe-damage-rolls.md` — link this plan.
- `Docs/plans/2026-08-16-player-reported-bug-fixes.md` — set `Status: Done` and note the version.
- Check `Docs/client-components.md` for a `RollBtn` entry before skipping it (Increment 4 adds a `disabled` prop).
- **Do not bump `client/src/version.js`** — the user has not asked to push.

**Test spec:** n/a — documentation.

**Gates**
- ☑ **GREEN** — CHANGELOG entry present under the correct heading; every named `Docs/` file updated. `npm test` → `Test Files 4 passed (4)` / `Tests 61 passed (61)`; `npx vite build` → `✓ built in 3.40s`.

**Verify:**
1. `rg -n "Unreleased" -A 40 CHANGELOG.md` shows the block populated with the plan's Fixed / Added / Changed entries, above `## v1.4.0`.
2. `rg -l "featSpellLists" Docs/` returns hits in `client-pages.md` and `known-patterns-and-gotchas.md`.
3. `rg -n "server is newer" Docs/known-patterns-and-gotchas.md` returns no stale claim; the rewritten entry says localStorage is authoritative.
4. `rg -n "minmax\(0, 1fr\)" Docs/styles-and-theming.md` returns at least one hit.
5. `rg -n "version" client/src/version.js` is unchanged vs. `git diff` — no version bump.

**Log:**

**Changed:**
- `CHANGELOG.md:29-44` — the plan's Fixed (6 entries) / Added (1) / Changed (1) copy added verbatim under `## vX.X.X — Unreleased`, above `## v1.4.0 — 2026-07-19` (now at `:45`).
- `Docs/known-patterns-and-gotchas.md` — (a) the "CharacterEdit Server + Local Fallback" entry **rewritten** as *"localStorage is authoritative — the server never overwrites a local character"*, covering `resolveLoadAction`, the merged `PUT`, and why the HP PATCH is kept on purpose. (b) new *"Sheet-owned fields live only in localStorage"* with the full field list. (c) new *"Weapon damage strings carry the magic bonus twice"*, incl. the `(?![\d\s]*d)` lookahead and the em-dash truthiness trap. (d) new *"One roll at a time"*. (e) new *"Grid tracks must be `minmax(0, 1fr)`"*. (f) feat-wiring list extended with `MAGIC_INITIATE_CLASSES` / `char.featSpellLists`. Plus two extra entries: *"Feat-granted spell lists"* and *"Normalizing feat names"*.
- `Docs/client-context-hooks-utils.md` — `DiceContext`'s `null` return + re-entrancy guard and its delegation to `parseDiceFormula`; a new **load-and-merge policy** block under `useCharacterSync` and the matching note on `useCharacterList`; the HP-PATCH caveat reworded from "quirk" to "deliberate"; new `diceFormula.js`, `spellAccess.js` and `charSync.js` sections; `normalizeFeatNames` / `weaponDamageDice` / `weaponDamageFormula` added to the `dndHelpers` list; `MAGIC_INITIATE_CLASSES` added to the constants list.
- `Docs/client-pages.md` — sheet Spells tab: the browser now spans all classes + feat lists; new **Weapon Damage Buttons** system entry; Roll System notes the one-roll-at-a-time guard; editor Spells section documents the Magic Initiate picker; creator section notes `featSpellLists` persistence and the ruleset-driven class list.
- `Docs/architecture.md` — new *"The server is a backup, never a source of truth"* section; the HP-PATCH note reframed as deliberate; the CharacterEdit data-flow note updated to say it PUTs the merged object.
- `Docs/styles-and-theming.md` — new *"Layout containment — grid tracks, `minWidth: 0`, and word wrap"* section with the `minmax(0, 1fr)` rule, the no-blanket-`anywhere` decision, the preserved exceptions, and the manual check.
- `Docs/research/2026-08-16-…md` — Status → "Accepted — implemented", links the plan and this increment file.
- `Docs/plans/2026-08-16-player-reported-bug-fixes.md` — Status → Done with a Completed line; all 8 per-increment `Status:` lines flipped to done.

**Verification checks (all 5 pass):**
1. `## vX.X.X — Unreleased` block populated with Fixed/Added/Changed, sitting above `## v1.4.0 — 2026-07-19` (`:45`).
2. `rg -l "featSpellLists" Docs/` → `client-pages.md`, `known-patterns-and-gotchas.md` (and `client-context-hooks-utils.md`).
3. `rg -n "server is newer" Docs/known-patterns-and-gotchas.md` → **0** hits; the entry now says localStorage is authoritative.
4. `rg -n "minmax\(0, 1fr\)" Docs/styles-and-theming.md` → hits.
5. `git diff --stat client/src/version.js` → **empty**; no version bump, as instructed.

**Notes:** `Docs/client-components.md` checked for a `RollBtn` entry as instructed — it has none (`RollBtn` is defined inside `CharacterSheet`'s body, not a standalone component file), so it was correctly skipped. `server.md` and `start-bat.md` untouched — no endpoint or launcher changes.

---

## Concerns

1. **Increment 3 contradicts itself on the Net.** The plan's `dmgFormula` expression is `baseDamageDice ? … : (wpn.damage ? \`${dmgBonus}…\` : null)`. `Net`'s damage is the em dash `'—'` (confirmed in `equipment.json`), which is **truthy**, so that expression renders a damage button reading `+2` — while the same increment's Verify step 4 requires "A **Net** shows no damage button." The test spec resolves this in favour of Verify step 4: `weaponDamageFormula('—', 2)` → `null`. The guard must be "has dice **or** parses to a number", not raw truthiness. Executor: do not implement the ternary literally.

2. **Increment 2's return shape needs `d1Count`.** The plan specifies `{dice, staticBonus, hasDice}` but also requires Increment 3 to preserve `DiceContext.jsx:85-87`'s d1-only resolve shape `{results: [{die:'d1', sides:1, value: d1Count}]}`. That value is unreachable from the stated shape. I added `d1Count` to the spec. Small, additive, no behaviour change.

3. **Increment 4 under-counts its call sites by 6.** The plan names `applyLevelUp` and `DiceRoller.jsx`. The tree has **12** `rollDice3D` call sites, and six destructure the result immediately (`CharacterSheet.jsx:393`, `:472`, `DiceRoller.jsx:50`, `:60`, `Equipment.jsx:124`, `Homebrew.jsx:31`, `Spells.jsx:138` — seven, counting both DiceRoller lines). Each will throw `TypeError: Cannot destructure property … of 'null'` the first time a user double-clicks. The plan's own Risks section calls this out ("Any missed call site will throw on `result.total`") — I've turned it into an explicit checklist in the increment. This is the highest-risk increment in the plan and it is the one with no unit test.

4. **Three increments needed a small pure-helper extraction to be testable at all** (1: `resolveLoadAction`; 3: `weaponDamageFormula`; 5/6: `allowedSpellClasses` / `spellMatchesClasses` / `normalizeFeatNames`). These are lifts of code the plan already says to write, moved from a hook/component body into `src/utils/`, not new behaviour or re-slicing. They are marked "recommended, in scope" in each spec. If the executor declines the extraction in Increment 1, that increment has no assertable core and falls back to greps + the UI check.

5. **Slicing is otherwise sound.** Increment 2 (helpers, no consumers) before Increment 3 (wiring) is a good red/green split and is why Increment 3 has a meaningful test at all. Increments 5→6 correctly order "write the field" before "edit the field". One ordering note: Increment 4 is independent of 2 and 3 and could ship first, but leaving it after 3 means `doAdvantage`/`doDisadvantage` are touched twice (regex→parser in 3, `null` guard in 4) — a small, acceptable double-edit; keep the plan's order.

6. **Two stale line references** (both harmless, corrected inline): `dndHelpers.js` runs to :111 rather than ending at :104, and the CHANGELOG `Unreleased` heading is at :29, not :30.

7. **Increment 7 is unverifiable by the test suite** and its only real check is a manual seven-tab sweep at two widths. If a regression slips in later, nothing catches it. Not worth blocking on — a layout test would need a real browser — but worth knowing that grep check #1 is the only durable guard.
