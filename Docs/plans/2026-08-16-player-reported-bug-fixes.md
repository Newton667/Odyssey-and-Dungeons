# Player-Reported Bug Fixes: Sync Wipe, Damage Rolls, Magic Initiate, Sheet Overflow

**Status:** Done
**Created:** 2026-08-16
**Completed:** 2026-08-16 — all 8 increments implemented; shipped in the `## vX.X.X — Unreleased` CHANGELOG block (version not bumped; the user has not asked to push). Execution log: [`Docs/increments/2026-08-16-player-reported-bug-fixes.md`](../increments/2026-08-16-player-reported-bug-fixes.md)
**Scope:** Fixes the four root causes behind the five player reports — the localStorage-overwritten-by-server data wipe, the three damage-roll defects, Magic Initiate's blocked spell picker, and the character sheet widening past the viewport. Does **not** recover already-clobbered character data, does not re-enable server sync, and does not refactor `RollBtn` out of the `CharacterSheet` body.

## Goal

Players reported five bugs: Magic Initiate offers no cantrips, ammo refills itself after a level-up, equipped gear unequips after a level-up, damage rolls show the previous roll's number / drop their modifiers, and long text stretches the sheet sideways instead of wrapping. Research resolved these to four independent root causes (two reports share one). After this work: sheet-owned data (ammo, equipped items, spell slots, feature uses, multiclass `classes`) survives an editor save and a reload; weapon damage rolls report the correct number for magic weapons, flat-damage weapons and negative modifiers; a Paladin with Magic Initiate can pick cantrips from the class list they chose; and no character-sheet tab can push the page wider than the viewport.

## Current state

**1. The data wipe (two reports, one bug).**
- `client/src/pages/CharacterSheet.jsx:78` — the sheet runs `useCharacter(id, { syncEnabled: false })`, so every sheet edit (`updateChar`/`updateField`) goes to localStorage only (`client/src/hooks/useCharacterSync.js:43` early-returns).
- `client/src/pages/CharacterEdit.jsx:395` writes the merged local copy (sheet fields survive), then `client/src/pages/CharacterEdit.jsx:402-406` `PUT`s **`body`** — the form fields only.
- `server/routes/characters.js:81` merges that into its own stale record and stamps a fresh `updatedAt`.
- Next sheet load, `client/src/hooks/useCharacterSync.js:104-107` sees `serverTime > localTime` and runs `setChar(server); writeLocal(server)` — **localStorage is replaced by a copy that never had those fields.**
- `client/src/hooks/useCharacterSync.js:213-218` (`useCharacterList`) does the exact same overwrite when you open the Characters list. This is a second, independent trigger the research doc did not call out.
- `client/src/hooks/useCharacterSync.js:145-158` — `updateHp` PATCHes on every HP change regardless of `syncEnabled`, and `server/routes/characters.js:97` stamps `updatedAt`, so **taking damage alone** is enough to make the server "newer".
- Symptoms: `char.ammo` gone → `char.ammo?.[selectedAmmo] ?? defaultAmmoCount(selectedAmmo)` (`CharacterSheet.jsx:1837`, helper at `:112-115`) hands back a full quiver. `char.equippedItems` gone → `equippedWeapons` (`CharacterSheet.jsx:1805`) and the AC calc see nothing.
- Confirmed on disk: `server/data/characters/d48bed3c-33cc-4e54-88e3-954eae949912.json` contains exactly the editor's form fields and none of `equippedItems`, `ammo`, `usedSpellSlots`, `featureUses`, `classes`.

**2. Damage rolls — three defects.**
- Double-counted `+N`: `client/src/data/equipment.json` stores the magic bonus in **both** `damage` and `bonus` (`+1 Longsword` = `{damage: "1d8+1", bonus: 1}`). Verified: **65** weapon entries have a flat modifier baked into `damage`. `CharacterSheet.jsx:1861` computes `dmgBonus` from `wpn.bonus`, and `:1864` concatenates `${wpn.damage}+${dmgBonus}`, so both land. The 2H button is already correct because `versatileDie` (`CharacterSheet.jsx:1849-1853`) strips the `+N` — so 1H and 2H disagree by 1 on the same weapon.
- Flat/non-dice damage: `Blowgun` is `damage: "1"`, `Net` is `damage: "—"`. `DiceContext.jsx:88-90` returns `{results: [], total: 0}` when the formula has no `\d+d\d+` group, so those buttons roll a literal 0 and the ability modifier vanishes.
- Negative modifiers dropped on advantage/disadvantage: `CharacterSheet.jsx:523` and `:535` parse with `/1d20([+-]\d+)/`. A negative bonus renders as `1d20+-2`, which does not match, so `bonus` falls back to `0`.
- Concurrent rolls: `DiceContext.jsx:101-102` keeps the pending `resolve` and the static bonus in single-slot refs, and `:94` `clearFadeTimers()` cancels the 500 ms delivery timer at `:108`. Start a second roll before the first settles and the first promise never resolves — `doRollWithResult` (`CharacterSheet.jsx:503-520`) never reaches `setRollResults`, so the button keeps showing the older value for its 8 s window (`:513-517`). `RollBtn` (`CharacterSheet.jsx:859`) has no `disabled` state, unlike `client/src/components/DiceRoller.jsx:36` which already guards with `if (rolling) return`.

**3. Magic Initiate is half-wired.**
- The cap is raised: `CharacterSheet.jsx:2212` — `cantripLimit += 2; leveledLimit += 1`.
- The list is not: `CharacterSheet.jsx:227-231` filters every browser result down to `char.class` (deps at `:234` are `char?.class`). Paladins have **no cantrips in either edition** (`Docs/known-patterns-and-gotchas.md:162`) so the counter reads `0/2` over an empty list. The same filter also blocks a **multiclass** character from browsing their second class's list.
- The editor is the same story via `queryLocalSpells({ cls: form.class })` (`CharacterEdit.jsx:249-255`) plus `getSpellLimits` returning `cantrips: 0` for Paladin (`CharacterEdit.jsx:66`).
- Only the creator has a real picker: `CharacterCreate.jsx:391-396` and `:2041-2082`, hardcoded to the six 2014 classes at `:2048`. The picked spells are merged into `preparedSpells` at `CharacterCreate.jsx:478`, but **`miClass` is never persisted** — grep confirms `miClass` appears only in `CharacterCreate.jsx`. So nothing downstream knows which list was chosen.

**4. Sheet overflow.** Every grid track on the sheet is a bare `1fr` (= `minmax(auto, 1fr)`), which cannot shrink below its content: `CharacterSheet.jsx:834` (ability bar), `:840` (main layout, inside a `maxWidth: 1400px` wrapper at `:832`), `:1155`, `:1810`, `:1895`, `:1982`, `:2022`, `:2085`, `:3617`, `:3697`, `:3784`. Row cells at `:1899`, `:2039` and `:2089` have no `minWidth: 0` (contrast `:2144`, which does). `client/src/index.css` has no global `overflow-wrap` rule and `.page` (`index.css:218-222`) has no `overflow-x` containment.

## Approach

Adopted from `Docs/research/2026-08-16-player-reported-bugs-magic-initiate-level-up-wipe-damage-rolls.md` (Status: Accepted), including its "Decisions (confirmed with the user)" section, which is binding: fix the wipe first, route Magic Initiate through `char.ruleset`, and fix overflow structurally rather than per-tab.

- **Wipe → research Option B** (localStorage authoritative). Delete the "server is newer → overwrite local" branch in both `useCharacter` and `useCharacterList`, and make the editor `PUT` the **merged** object so the server backup stops being lossy. This matches `CLAUDE.md:28` ("Characters are local only") and the hook's own header comment. Option A (add every sheet field to the editor's PUT body) loses to whack-a-mole regressions; Option C (field-ownership merge) is dead weight while sync is off app-wide.
- **One deliberate deviation from the research:** the research recommended gating `updateHp`'s PATCH on `syncEnabled`. I recommend **keeping the PATCH**, because `client/src/pages/CampaignView.jsx:28-34` reads player HP from the server — gating it would freeze the DM's campaign view. With the read side fixed, the PATCH's `updatedAt` bump is harmless. Flagged under Open questions.
- **Damage → research Option B + A's non-dice guard.** Sanitise at read time (immune to homebrew and DB-mode data, and it's literally the existing `versatileDie` pattern two lines away) rather than editing 65 JSON rows that would then desync from `server/seed-magic-items.js`. Extract the formula parser out of `DiceContext` into a pure, unit-testable helper and reuse it for the advantage/disadvantage bonus, killing three defects with one parser.
- **Concurrency → reject-while-rolling** (research Option C, reject variant), matching `DiceRoller.jsx:36`. A queue would change the feel of the app.
- **Magic Initiate → research Option A.** Persist the chosen list as `char.featSpellLists = { 'Magic Initiate': ['Cleric'] }` (**array-valued** — see Decisions) and have both browsers union it with `getCharClasses(char)`. This also fixes multiclass browsing and follows the project's data-driven-map habit (`FEAT_EFFECTS`, `FEAT_PROFICIENCY_GRANTS`).
- **Overflow → research Option A**, applied sheet-wide per the user decision.

## Increments

### Increment 1: Stop the server from overwriting localStorage
**Status:** done
**What:** Remove the "server is newer → replace the local copy" branch from both storage hooks, and make the editor's `PUT` send the merged character instead of the bare form body, so the server backup is no longer lossy.
**Where:**
- `client/src/hooks/useCharacterSync.js:99-112` — the `else { compare timestamps }` block in the load effect.
- `client/src/hooks/useCharacterSync.js:205-219` — the same overwrite inside `useCharacterList`.
- `client/src/hooks/useCharacterSync.js:6-15` — the header comment, which currently documents the removed behaviour.
- `client/src/pages/CharacterEdit.jsx:405` — `body: JSON.stringify(body)`.
**Details:**
- In `useCharacter`'s load effect: keep `if (!local) { setChar(server); writeLocal(server); }` (`:95-99`) — discovering a character with no local copy is the one legitimate server→local path. Replace the `else` branch so it **never** calls `writeLocal(server)`/`setChar(server)`. Keep the `localTime > serverTime → syncToServer(local)` push (it already no-ops when sync is disabled, `:43`). The simplest correct form: `else if (new Date(local.updatedAt || 0).getTime() > new Date(server.updatedAt || 0).getTime()) syncToServer(local);`.
- In `useCharacterList`: in the merge loop, keep the `if (!local)` branch that adopts and caches unknown server characters; delete the `else` timestamp branch that overwrites an existing local copy (`:211-219`). The local entry wins unconditionally.
- In `CharacterEdit.save()`: send `merged` (built at `:395`) instead of `body`. `merged` is `{...char, ...body, updatedAt}`, so it carries `equippedItems`, `ammo`, `usedSpellSlots`, `featureUses`, `classes`, `attunedItems`, `activeBuffs`, `activeConditions`, `hitDiceRemaining`, `temporaryHp`, death saves and `levelChoices`. The server's own `{...existing, ...req.body}` merge (`server/routes/characters.js:81`) still applies. `express.json({ limit: '10mb' })` already covers the larger body (portraits were always in `body` via `avatarUrl`).
- **Do not** change `updateHp`'s PATCH (`:145-158`) — `CampaignView.jsx:28-34` depends on server-side HP.
- Update the hook's header comment (`:6-15`) to state: localStorage is authoritative; the server is a write-only backup and a discovery source for characters with no local copy; it never overwrites local.
**Verify:**
1. `cd client && npm run build` succeeds.
2. `rg "writeLocal\(server\)" client/src/hooks/useCharacterSync.js` returns exactly **one** hit (the `if (!local)` discovery branch).
3. `rg "JSON.stringify\(body\)" client/src/pages/CharacterEdit.jsx` returns **no** hits.
4. UI: on a non-`local-` character — equip a weapon and fire 3 arrows on the sheet (note the count), open the editor, click "Lv Up", Save, return to the sheet and hard-reload. The weapon is still equipped and the arrow count is still the reduced number.

### Increment 2: Pure dice/damage parsing helpers + tests
**Status:** done
**What:** Add two pure helpers — one that parses a dice formula into dice + a summed static modifier, one that strips a weapon's baked-in flat bonus from its damage string — with unit tests. No consumers yet, so nothing can break.
**Where:**
- `client/src/utils/diceFormula.js` (new file).
- `client/src/utils/dndHelpers.js` — append `weaponDamageDice` next to the other pure helpers (file currently ends at `:104` with `countLangExtras`).
- `client/src/utils/diceFormula.test.js` (new) and `client/src/utils/dndHelpers.test.js` (existing seed suite, pattern at `:1-6`).
**Details:**
- `parseDiceFormula(formula)` → `{ dice: [{die, sides}], staticBonus: number, hasDice: boolean }`. Port the logic currently inline in `DiceContext.jsx:60-91` verbatim: match all `(\d+)d(\d+)` groups and expand to one entry per die; strip the dice groups then sum every `[+-]\s*\d+` token; fold `d1` dice into `staticBonus` and drop them from `dice`. **New behaviour:** when there are no dice groups, still sum the bare integers so `'1+3'` → `{dice: [], staticBonus: 4, hasDice: false}` and `'—'` → `{dice: [], staticBonus: 0, hasDice: false}`. Non-string input returns `{dice: formula, staticBonus: 0, hasDice: true}` passthrough so the array form of `rollDice3D` keeps working.
- `weaponDamageDice(damage)` → the damage string with flat modifiers removed, or `null` when it contains no dice at all. Strip only `[+-]\s*\d+` that is **not** followed by `d` — the negative lookahead is load-bearing: 8 entries in `equipment.json` have multi-group damage (`Flame Tongue` = `"1d8 + 2d6 fire"`, `Oathbow` = `"1d8 + 3d6"`, `Frost Brand` = `"1d8 + 1d6 cold"`) and must keep both groups. Return `null` for `"1"` and `"—"`.
- Tests (exact expected values): `parseDiceFormula('1d8+1+4')` → 1 d8, bonus 5; `parseDiceFormula('1d20+-2')` → 1 d20, bonus **-2**; `parseDiceFormula('1d8 + 2d6 fire+3')` → 1 d8 + 2 d6, bonus 3; `parseDiceFormula('1+3')` → `hasDice: false`, bonus 4; `parseDiceFormula('—')` → `hasDice: false`, bonus 0. `weaponDamageDice('1d8+1')` → `'1d8'`; `weaponDamageDice('2d6+1')` → `'2d6'`; `weaponDamageDice('1d8 + 2d6 fire')` → unchanged (both groups kept); `weaponDamageDice('1')` → `null`; `weaponDamageDice('—')` → `null`.
**Verify:** `cd client && npm test` — the new suites pass and the existing `dndHelpers.test.js` suites still pass.

### Increment 3: Wire the parsers — fix magic-weapon double-count, flat damage, and negative modifiers
**Status:** done
**What:** Route `DiceContext` and the sheet's damage/advantage math through the new helpers so a `+1 Longsword` rolls `die + 4` (not `+5`), a Blowgun rolls `1 + DEX` (not 0), and a negative attack modifier survives advantage/disadvantage.
**Where:**
- `client/src/context/DiceContext.jsx:56-104` (`rollDice3D`).
- `client/src/pages/CharacterSheet.jsx:1864` (`dmgFormula`), `:1966` (the 1H button's displayed formula).
- `client/src/pages/CharacterSheet.jsx:523` and `:535` (`doAdvantage` / `doDisadvantage` bonus regex).
**Details:**
- `DiceContext`: replace the inline parse with `parseDiceFormula`. When `!hasDice`, resolve immediately with `{ results: [], total: staticBonus }` instead of the current hardcoded `total: 0` (`:88-90`). Keep the existing `d1`-only early resolve shape at `:85-87` (`results: [{die:'d1', sides:1, value:d1Count}]`) so nothing downstream that inspects `results` changes.
- `CharacterSheet` weapon rows: compute `const baseDamageDice = weaponDamageDice(wpn.damage);` right after `versatileDie` (`:1853`). Then `:1864` becomes `const dmgFormula = baseDamageDice ? \`${baseDamageDice}+${dmgBonus}${riderDamageSuffix}\` : (wpn.damage ? \`${dmgBonus}${riderDamageSuffix}\` : null);` — a flat-damage weapon like the Blowgun still gets a button, now rolling its modifier plus any rider die. The label at `:1966` must render the same sanitized string, not `{wpn.damage}` — otherwise the button text and the roll disagree.
- Import `weaponDamageDice` from `../utils/dndHelpers` (`CharacterSheet.jsx` already imports from there) and `parseDiceFormula` from `../utils/diceFormula`.
- `doAdvantage`/`doDisadvantage`: replace `formula.match(/1d20([+-]\d+)/)` with `const bonus = parseDiceFormula(formula).staticBonus;`. Keep everything else (the `2d20${sign}${bonus}` reroll formula, the ADV/DIS tags) as is.
- **Leave the item side panel alone** (`CharacterSheet.jsx:3711-3716`): it rolls `wpn.damage` raw with no ability modifier added, so the embedded `+1` is correct there and is not double-counted.
- Leave `equipment.json` and `server/seed-magic-items.js` untouched — read-time sanitising is the whole point.
**Verify:**
1. `cd client && npm run build` succeeds.
2. `rg "1d20\(\[\+-\]" client/src/pages/CharacterSheet.jsx` returns no hits.
3. UI, Actions tab, a STR 16 (+3) level-5 Fighter (PB +3) with a **+1 Longsword** equipped: the 1H button reads `1d8+4` and the 2H button reads `1d10+4` — the two grips agree. The attack button reads `+7`.
4. UI: equip a **Blowgun** with DEX +2 — the damage button reads `+2` and rolling it reports **2**, not 0. A **Net** (`damage: "—"`) shows no damage button.

### Increment 4: Guard against overlapping rolls
**Status:** done
**What:** Ignore a roll request while dice are still in the air, and disable the roll buttons while rolling, so a second click can't silently swallow the first roll's result and leave a stale number on screen.
**Where:**
- `client/src/context/DiceContext.jsx:41-43` (refs), `:56-104` (`rollDice3D`), `:106-129` (`onDiceSettled`), `:132` (provider value).
- `client/src/pages/CharacterSheet.jsx:503-552` (`doRollWithResult`, `doAdvantage`, `doDisadvantage`, `doCrit`), `:859-880` (`RollBtn`), `:77` (`useDice()` destructure).
**Details:**
- Add `const rollingRef = useRef(false);` to `DiceProvider`. Set it `true` inside the `new Promise` body of `rollDice3D` and `false` in `onDiceSettled`'s 500 ms callback alongside `setRolling(false)` (`:110`). A ref is required — `rolling` state is stale inside the `useCallback`.
- At the top of `rollDice3D`, `if (rollingRef.current) return Promise.resolve(null);` — **before** the parse, so the busy signal is unambiguous. Defensively, if `resolveRef.current` is still set when a new roll starts, call it with `null` and clear it so no promise is ever orphaned.
- Every caller must tolerate `null`. In `CharacterSheet`: `const result = await rollDice3D(...); if (!result) return;` in `doRollWithResult` (`:504`), `doAdvantage` (`:525`), `doDisadvantage` (`:537`), `doCrit` (`:548`). Grep for every other `rollDice3D(` caller and add the same guard — `applyLevelUp` (`CharacterSheet.jsx:453-500`) and `DiceRoller.jsx` are known callers; `DiceRoller.jsx:36` already returns early on `rolling` but still needs the null check.
- `RollBtn`: pull `rolling` from `useDice()` at `CharacterSheet.jsx:77` and pass `disabled={rolling}` plus `opacity: rolling ? 0.5 : 1` / `cursor: rolling ? 'default' : 'pointer'` on the button at `:871`. Do **not** move `RollBtn` out of the component body in this increment — that's a separate refactor (see Risks).
**Verify:**
1. `cd client && npm run build` succeeds.
2. `rg -n "rollDice3D\(" client/src` — every call site either awaits into a `if (!result) return;` guard or explicitly ignores the return value.
3. UI: click a weapon's attack button and, while the dice are still tumbling, click its damage button. The damage button is visibly disabled and does nothing; after the dice settle, both buttons re-enable and rolling damage produces a fresh, correct number (not the attack roll's number).

### Increment 5: Persist the Magic Initiate spell list and unblock the sheet's browser
**Status:** done
**What:** Add a ruleset-aware `MAGIC_INITIATE_CLASSES` table, persist the creator's chosen class as `char.featSpellLists`, and make the sheet's spell browser allow every class the character can actually draw from — all their classes plus any feat-granted list.
**Where:**
- `client/src/utils/dndConstants.js` — new export near the other feat tables (`FEAT_PROFICIENCY_GRANTS` at `:94`, `FEAT_ABILITY_BONUSES` at `:102`, `FEAT_EFFECTS` at `:132`).
- `client/src/pages/CharacterCreate.jsx:2048` (hardcoded class list), `:478` / `:455-481` (the create payload).
- `client/src/pages/CharacterSheet.jsx:227-234` (the browser's class filter and its deps).
**Details:**
- `export const MAGIC_INITIATE_CLASSES = { '2014': ['Bard','Cleric','Druid','Sorcerer','Warlock','Wizard'], '2024': ['Cleric','Druid','Wizard'] };` — data-driven, so the 2024 revision is a table entry rather than a branch.
- Creator: replace the inline array at `:2048` with `(MAGIC_INITIATE_CLASSES[ruleset] || MAGIC_INITIATE_CLASSES['2014'])`. The `ruleset` state already exists (`CharacterCreate.jsx:86`). Reset `miClass`/`miCantrips`/`miSpell` when `ruleset` changes so a 2024 character can't keep a Warlock pick.
- Creator payload: add `...(miClass && selectedFeats.includes('Magic Initiate') && { featSpellLists: { 'Magic Initiate': [miClass] } })` alongside the existing conditional spreads at `:474-480`. Leave `preparedSpells` (`:478`) exactly as is.
- Sheet browser (`:227-231`): build the allowed set from `getCharClasses(char).map(c => c.class)` (already imported for `charClasses`) unioned with `Object.values(char.featSpellLists || {}).flat()`, lower-cased (values are arrays). Keep the `!s.classes?.length` escape hatch for homebrew/racial spells. Fall back to the old single-class behaviour when both sources are empty. Update the deps at `:234` from `char?.class` to `char?.class, char?.classes, char?.featSpellLists`.
- Back-compat: characters created before this field exists have no `featSpellLists`. Readers must also tolerate a bare string (`'Cleric'`) as well as an array — normalise with `[].concat(v)` at every read site.
  They keep today's behaviour on the sheet and are fixed by the editor picker in Increment 6 — do not guess a list for them.
- Do not touch `CharacterSheet.jsx:2212`; the `+2 cantrips / +1 spell` cap is already correct and now finally has a non-empty list behind it.
**Verify:**
1. `cd client && npm run build` succeeds.
2. `rg "'Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'" client/src/pages/CharacterCreate.jsx` returns no hits (the literal has moved to the constants table).
3. UI: create a 2014 Paladin with Magic Initiate → the picker offers 6 classes; pick **Cleric**, take Sacred Flame + Guidance and Cure Wounds. On the sheet's Spells tab, "+ Add / Remove Spells" and search `Light` — **Light** (a Cleric cantrip Paladins don't get) now appears, and the cantrip counter reads `2/2`. Create a 2024 character with the feat → the picker offers exactly Cleric, Druid, Wizard.
4. UI: a Fighter 3 / Wizard 2 multiclass can now find Wizard spells in the sheet's browser.

### Increment 6: Magic Initiate picker in the editor
**Status:** done
**What:** Let the editor set/change the Magic Initiate spell list on an existing character, and make the editor's own spell list include that class's spells so the picks can be made there too.
**Where:**
- `client/src/pages/CharacterEdit.jsx:132-178` (form initialisation), `:249-255` (`allSpells`), `:1297-1308` (top of the Spells section, just above the existing override block).
**Details:**
- Add `featSpellLists: { ...(data.featSpellLists || {}) },` to the form object at `:132-178` — without this the field is dropped on every save (the form is the save `body`, `:388-392`).
- Above the "Override — add any spell" block (`:1301`), render a picker **only when** the normalized feat list contains `Magic Initiate`. Normalize the same way the sheet does (`CharacterSheet.jsx:607-610`): `(form.feats || []).map(f => typeof f === 'string' ? f : (f?.name || ''))` — old saves store objects (`Docs/known-patterns-and-gotchas.md:28-45`).
- The picker is a plain `<select>` over `MAGIC_INITIATE_CLASSES[form.ruleset] || MAGIC_INITIATE_CLASSES['2014']`, writing `set('featSpellLists', { ...(form.featSpellLists || {}), 'Magic Initiate': [value] })`. Include a short note that it grants 2 cantrips + 1 first-level spell from that list. **Define it inline in the existing JSX — do not create a child component** (`Docs/known-patterns-and-gotchas.md:5-12`).
- `allSpells` (`:249-255`): union `queryLocalSpells({ cls: form.class })` with `queryLocalSpells({ cls: c })` for each class in `Object.values(form.featSpellLists || {}).flat()`, de-duplicated by `_id`. Add `form.featSpellLists` to the effect deps. Note the early return at `:250-251` — a non-caster (Paladin at level 1, or a Fighter) must still get the feat list, so that guard has to allow through when a feat list is present.
- Leave `getSpellLimits` (`:48-76`) alone: it is one of the three parallel ruleset-dependent spell-limit sites (`Docs/known-patterns-and-gotchas.md:161-162`) and changing it would require changing `maxSpellLevel` and `getSpellInfo` too. The existing "Override — add any spell" toggle remains the escape hatch for cap edge cases.
**Verify:**
1. `cd client && npm run build` succeeds.
2. UI: open an existing Paladin that has Magic Initiate but no `featSpellLists`, pick **Wizard** in the editor, Save. In DevTools, `JSON.parse(localStorage['ond-char-<id>']).featSpellLists` is `{"Magic Initiate":["Wizard"]}` (**array**). Back on the sheet, the browser now finds **Fire Bolt**.
3. Reload the editor — the select still shows Wizard (proves the field round-trips through the form).

### Increment 7: Stop the sheet from widening the page
**Status:** done
**What:** Apply the structural overflow fix sheet-wide — `minmax(0, 1fr)` on every grid track, `minWidth: 0` on the row cells that lack it, and global word-wrapping / horizontal containment — so no tab or content can push the page wider than the viewport.
**Where:**
- `client/src/index.css:218-222` (`.page`) plus a new global wrap rule.
- `client/src/pages/CharacterSheet.jsx:834`, `:840`, `:1155`, `:1810`, `:1895`, `:1982`, `:2022`, `:2085`, `:3617`, `:3697`, `:3784` (grid templates); `:1899`, `:2039`, `:2089` (row cells missing `minWidth: 0`); `:832` (sheet wrapper).
**Details:**
- Every bare `1fr` above becomes `minmax(0, 1fr)`: `repeat(6, 1fr)` → `repeat(6, minmax(0, 1fr))` (`:834`); the main layout's `${sidebarWidth}px 1fr[ 1fr[ 1fr]]` → `${sidebarWidth}px minmax(0, 1fr)…` (`:840`); the action/spell table template `'2fr 1fr 1fr 1.5fr'` → `'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.5fr)'` (`:1810`, `:1895`, `:1982`, `:2022`, `:2085`); the side-panel `'1fr 1fr'` grids (`:3617`, `:3697`, `:3784`) → `'minmax(0, 1fr) minmax(0, 1fr)'`; `:1155` likewise.
- Add `minWidth: 0` to the first-cell `<div>`s at `:1899` (weapon name), `:2039` (natural weapon name) and `:2089` (spell name + upcast `<select>`, the worst offender since the select has its own intrinsic width).
- Add `overflowX: 'hidden'` (or `clip`) to the sheet wrapper at `:832` as a backstop, and to `.page` in `index.css:218-222`.
- Add a global rule to `index.css`: `p, span, div { overflow-wrap: anywhere; }` is too broad — scope it to the text containers instead, e.g. a `.wrap-text` class applied to description blocks, plus `body { overflow-wrap: break-word; }` which is inherited and safe. Long unbroken strings (homebrew names, URLs in notes) are the case this covers.
- Preserve the deliberate `whiteSpace: 'nowrap'` + ellipsis at `:2147` (Actions-tab feature blurb) and the `whiteSpace: 'pre-wrap'` in the side panels (`:3676`, `:3775`, `:3805`) — those are intentional.
**Verify:**
1. `cd client && npm run build` succeeds.
2. `rg "gridTemplateColumns: '[^']*(?<!minmax\(0, )1fr" client/src/pages/CharacterSheet.jsx` (or simply `rg "gridTemplateColumns" client/src/pages/CharacterSheet.jsx | rg -v "minmax"`) returns no hits.
3. UI: on a character with a long feature description and a long homebrew item name, visit **every** tab — Actions, Spells, Inventory, Features, Progression, Background, Notes — at a 1280px window and again at 900px. `document.documentElement.scrollWidth === document.documentElement.clientWidth` in the console (no horizontal scrollbar) on each tab, and open the action/item/spell side panels to confirm the same.

### Increment 8: Docs + changelog
**Status:** done
**What:** Record all four fixes in `CHANGELOG.md` under the `## vX.X.X — Unreleased` block and update the affected `Docs/` files, per `CLAUDE.md`.
**Where:** `CHANGELOG.md:30` (the `## vX.X.X — Unreleased` heading), `Docs/known-patterns-and-gotchas.md`, `Docs/architecture.md`, `Docs/client-context-hooks-utils.md`, `Docs/client-pages.md`, `Docs/styles-and-theming.md`, and `Docs/research/2026-08-16-player-reported-bugs-magic-initiate-level-up-wipe-damage-rolls.md` (link the plan), `Docs/plans/2026-08-16-player-reported-bug-fixes.md` (set Status: Done + the version it shipped in).
**Details:** Exact content in the "Docs & changelog" section below. Do **not** bump `client/src/version.js` — the user has not asked to push.
**Verify:** `rg "Unreleased" CHANGELOG.md` shows the block populated with the Fixed/Added/Changed entries below, and `rg "featSpellLists" Docs/` returns hits in `client-pages.md` and `known-patterns-and-gotchas.md`.

## Rules & data notes

- **Magic Initiate, 5e (2014)** — PHB p.168: choose **bard, cleric, druid, sorcerer, warlock or wizard**; learn 2 cantrips + one 1st-level spell from that list, castable at its lowest level once per long rest. Paladin is **not** one of the six, which is exactly why a Paladin taking the feat must pick another list — the case the app currently blocks.
- **Magic Initiate, 5.5e (2024)** — a repeatable Origin feat limited to the **Cleric, Druid or Wizard** list; the level-1 spell is always prepared and castable once per long rest without a slot *or* with any slot; spellcasting ability chosen from INT/WIS/CHA. This plan implements the **list restriction** via `MAGIC_INITIATE_CLASSES` (routed through `char.ruleset` / `form.ruleset` / creator `ruleset`), and deliberately does **not** implement repeatability or the per-feat spellcasting-ability choice — see Open questions.
- Paladins and Rangers have **no cantrips in either edition** (no `CANTRIPS_KNOWN` entry). That is correct, not a gap (`Docs/known-patterns-and-gotchas.md:162`) — the feat is the only reason a Paladin has cantrips at all, and the `+2` at `CharacterSheet.jsx:2212` is the right place for it.
- Magic weapons: a `+1` weapon adds +1 to **attack and damage**, once. `hitBonus` (`CharacterSheet.jsx:1860`) already reads `wpn.bonus` and is correct; only the damage string double-dips.
- Great Weapon Fighting applies to the two-handed grip only, Dueling to the one-handed grip only (`Docs/known-patterns-and-gotchas.md:165`) — the `dmgBonus` / `dmgBonus2H` split at `:1861-1862` must survive Increment 3 unchanged.

## Risks & gotchas

- **"CharacterEdit Server + Local Fallback"** (`Docs/known-patterns-and-gotchas.md:102`) — this entry documents the current merge behaviour and the unconditional HP PATCH. Increment 1 changes what it describes; the entry must be rewritten in Increment 8, not left contradicting the code.
- **Multiclassing** (`Docs/known-patterns-and-gotchas.md:171-180`) — `char.classes` is one of the fields the wipe destroys. After Increment 1, verify a multiclass character still shows both classes after an editor save + reload. Never read `char.class` for class-derived math; Increment 5 must go through `getCharClasses(char)`.
- **Feat objects vs strings** (`Docs/known-patterns-and-gotchas.md:28-45`) — the editor's Magic Initiate picker reads `form.feats`, which may contain `{name, prereq, desc}` objects from old saves. Normalize before `.includes('Magic Initiate')`.
- **Never define a React component inside another component** (`Docs/known-patterns-and-gotchas.md:5-12`) — the editor picker and any new sheet markup must be inline JSX or a top-level component. Note that `RollBtn` (`CharacterSheet.jsx:859`) **already violates this**; Increment 4 adds a prop to it but must not make it worse, and hoisting it is deliberately out of scope (it would need ~15 closed-over values threaded through props).
- **The build does not catch undefined variables.** Increment 3 introduces `baseDamageDice` and removes a regex; Increment 5 changes an effect's dependency array. After each, grep for stragglers: `rg "wpn\.damage" client/src/pages/CharacterSheet.jsx` should only remain in the item-panel/inventory display paths, and `rg "char\?\.class\]" client/src/pages/CharacterSheet.jsx` should be clean.
- **Losing the guard rail:** unioning feat lists into the sheet's spell browser widens what can be added. It is still narrower than the editor's existing "add any spell" override, so this is not a new capability, just a saner default.
- **CampaignView depends on server data** (`client/src/pages/CampaignView.jsx:28-34`). Increment 1 makes the server copy update only on editor saves and HP PATCHes. The DM view already only shows HP-level summary data, but confirm it still renders after the change.
- **Already-clobbered characters are not recoverable.** Per the research decisions, this plan stops the bleeding only. Players with a wiped character must re-equip gear, re-enter ammo counts, and re-add multiclass levels by hand. Tell them before shipping.
- `rollDice3D` returning `null` is a new contract. Any missed call site will throw on `result.total`. The Increment 4 verify grep is not optional.

## Verification

- Build: `cd client && npm run build`.
- Tests: `cd client && npm test` (vitest is already wired: `client/package.json` `"test": "vitest run"`).
- Concrete cases:
  - **Wipe:** non-`local-` character, equip a longsword + 20 arrows, fire 3 (count → 17), editor "Lv Up" → Save → sheet hard-reload. Expect: longsword still equipped, arrows **17**, spell slots still spent, multiclass `classes` intact.
  - **Magic weapon damage:** STR 16 (+3) Fighter 5 (PB +3) with a `+1 Longsword`. Attack `+7`; 1H damage `1d8+4`; 2H damage `1d10+4`. Rolling an 8 on the d8 reports **12**.
  - **Flat damage:** Blowgun, DEX 14 (+2) — damage button reads `+2`, rolling reports **2** (previously 0). Net shows no damage button.
  - **Negative modifier:** a weapon with total attack bonus `-2` (`1d20+-2`) rolled with disadvantage — the reported total is `lowest d20 - 2`, not the bare die.
  - **Concurrency:** click attack, then damage mid-flight — the damage button is disabled and no stale number appears.
  - **Magic Initiate:** 2014 Paladin 5, Magic Initiate (Cleric) — sheet Spells tab shows `Cantrips 0/2` over a browser that finds **Light** and **Sacred Flame**; after adding two, `2/2`. Spell save DC for a 16-CHA Paladin 5 is unchanged at **8 + 3 + 3 = 14**.
  - **2024:** a `ruleset: '2024'` character's Magic Initiate picker lists exactly Cleric, Druid, Wizard.
  - **Overflow:** at 900px width, every sheet tab reports `document.documentElement.scrollWidth === clientWidth`.

## Docs & changelog

**`CHANGELOG.md`** — add under the existing `## vX.X.X — Unreleased` block (`CHANGELOG.md:30`):

```markdown
### Fixed
- **Character data no longer gets wiped by the server copy.** The character sheet writes equipped items, ammo, spent spell slots, feature uses, conditions, attunement, death saves and multiclass levels to localStorage only — but the server's stale backup could overwrite it on the next load, which is why arrows refilled themselves and gear unequipped after a level-up. localStorage is now authoritative: the server copy is only adopted when there is no local copy at all, and the character list no longer overwrites local characters either. The editor now sends the *complete* character to the server, so the backup stops being lossy. (Characters already wiped can't be recovered — that data has to be re-entered.)
- **Magic weapons no longer double-count their bonus.** A `+1 Longsword` stores its bonus in both its damage string and its `bonus` field, so one-handed damage was rolling `1d8+1` *plus* the `+1` again. Damage strings are now sanitized at read time, so the 1H and 2H buttons finally agree.
- **Weapons with flat damage roll correctly.** Blowgun (`1`) and similar non-dice weapons returned a total of 0 with no ability modifier; they now roll their modifier properly. Weapons with no damage value (Net) no longer show a dead damage button.
- **Advantage/disadvantage keeps negative modifiers.** A negative attack bonus (rendered as `1d20+-2`) silently became `+0` on advantage and disadvantage rolls.
- **Rolls can no longer eat each other.** Starting a second roll while dice were still in the air dropped the first roll's result, leaving the previous number showing on the button. Roll buttons are now disabled while dice are settling.
- **Long text no longer widens the character sheet.** Every grid track on the sheet now uses `minmax(0, 1fr)` and row cells allow shrinking, so long feature descriptions, spell names and homebrew item names wrap instead of stretching the page sideways.

### Added
- **Magic Initiate now works after character creation.** The class whose spell list you chose is saved on the character (`featSpellLists`), and both the sheet's spell browser and the editor's spell list now include that class — so a Paladin with Magic Initiate can finally pick the 2 cantrips the feat grants. The class list follows the ruleset: Bard/Cleric/Druid/Sorcerer/Warlock/Wizard for 2014, Cleric/Druid/Wizard for 2024. The editor gained a picker so existing characters can set (or change) their list.

### Changed
- **The character sheet's spell browser now covers all of your classes.** It previously filtered to the primary class only, so multiclass characters couldn't browse their second class's spell list.
```

**Docs to update:**
- `Docs/known-patterns-and-gotchas.md` — **required.** (a) Rewrite the "CharacterEdit Server + Local Fallback" entry (`:102`) to state that localStorage is authoritative, the server never overwrites it, and the editor PUTs the merged character. (b) New entry: *"Sheet-owned fields live only in localStorage"* — list them (`equippedItems`, `ammo`, `usedSpellSlots`, `featureUses`, `activeBuffs`, `activeConditions`, `hitDiceRemaining`, `temporaryHp`, death saves, `attunedItems`, `classes`, `levelChoices`) and the rule that nothing may replace the local document wholesale. (c) New entry: *"Weapon damage strings carry the magic bonus twice"* — always run `wpn.damage` through `weaponDamageDice()` when `wpn.bonus` is added separately; same family as the existing versatile-parsing note at `:165`. (d) New entry: *"One roll at a time"* — `rollDice3D` returns `null` when dice are already in flight; every caller must guard. (e) New entry: *"Grid tracks must be `minmax(0, 1fr)`"* — a bare `1fr` cannot shrink below its content and widens the page. (f) Extend the feat-wiring list at `:150` with `featSpellLists` / `MAGIC_INITIATE_CLASSES`.
- `Docs/client-context-hooks-utils.md` — `useCharacter`/`useCharacterList` load-and-merge policy; the new `utils/diceFormula.js` (`parseDiceFormula`) and `dndHelpers.weaponDamageDice`; `DiceContext`'s re-entrancy guard and `null` return; `MAGIC_INITIATE_CLASSES` in `dndConstants.js`.
- `Docs/client-pages.md` — the sheet's spell browser now spans all classes plus feat-granted lists; the editor's Magic Initiate picker; the creator persisting `featSpellLists`; the corrected weapon damage buttons.
- `Docs/architecture.md` — the local-first data-flow section: server is a write-only backup + discovery source, never a source of truth for an existing local character.
- `Docs/styles-and-theming.md` — the `minmax(0, 1fr)` / `minWidth: 0` / global word-wrap convention for the character sheet.
- `Docs/research/2026-08-16-player-reported-bugs-magic-initiate-level-up-wipe-damage-rolls.md` — add a line linking to this plan.
- `Docs/plans/2026-08-16-player-reported-bug-fixes.md` — set `Status: Done` and note the version.
- Not affected: `server.md` (no endpoint changes), `start-bat.md`, `client-components.md` (unless `RollBtn` is documented there — check before skipping).

## Open questions

> **All four resolved — see the Decisions section at the end of this document.**

1. **Should `updateHp`'s PATCH stay?** The research recommended gating it on `syncEnabled`; I recommend **keeping** it because `CampaignView.jsx:28-34` reads player HP from the server and gating it would freeze the DM's view mid-session. With the read-side overwrite removed, the PATCH is harmless. If the campaign view isn't actually used, gating it is the tidier fix. **Needs a call before Increment 1.**
2. **How far should the 2024 Magic Initiate go?** This plan implements the 2024 *list restriction* only. The 2024 feat is also **repeatable** (a second taking must use a different list, implying `featSpellLists` should hold an array) and lets you choose the spellcasting ability (INT/WIS/CHA) per taking. `char.featSpellLists` is shaped `{ featName: className }` — if repeatability matters, it should be `{ featName: [className] }` from the start to avoid a migration later. **Recommend deciding now.**
3. **Roll labels collide.** `rollResults` is keyed by label (`CharacterSheet.jsx:512`), so two copies of the same weapon — or the same weapon shown in both the Actions tab and the side panel — share one result entry, which is another plausible source of "rolls interacting". Not fixed here (it needs a per-instance key). Should it be a follow-up plan?
4. **Global word-wrap scope.** Increment 7 proposes `body { overflow-wrap: break-word; }` plus targeted rules rather than a blanket `overflow-wrap: anywhere` on all elements. If a specific screenshot shows a different culprit, that increment should be narrowed to it.


---

## Decisions (confirmed with the user, 2026-08-16)

These resolve the Open questions above. Binding on execution.

### 1. `updateHp`'s server PATCH — **keep it**
Confirmed: do **not** gate the PATCH. `CampaignView.jsx:28-34` reads player HP from the
server, and gating it would freeze the DM's campaign view mid-session. With Increment 1
removing the read-side overwrite, the PATCH's `updatedAt` bump is harmless. Increment 1
already says "do not change `updateHp`'s PATCH" — that stands.

### 2. Magic Initiate storage — **array-valued from the start**
Ship only the **list restriction** for 2024 (Cleric / Druid / Wizard); the repeatable-feat
UI is out of scope. But store `featSpellLists` values as **arrays**, not strings:

```js
char.featSpellLists = { 'Magic Initiate': ['Cleric'] }
```

Costs nothing now and avoids a data migration when the 2024 feat's repeatability is added
later. Increments 5 and 6 above have been updated for this shape: writes wrap in `[...]`,
reads use `Object.values(...).flat()`, and every read site normalises with `[].concat(v)`
so a legacy bare string still works.

### 3. Roll-label collisions — **out of scope, follow-up plan**
`CharacterSheet.jsx:512` keys roll results by label, so two copies of the same weapon share
one result. Real bug, distinct root cause from the three damage defects in Increments 2–4,
and this plan is already 8 increments / L. Track it as a separate plan; do not add a ninth
increment.

### 4. Word-wrap scope — **targeted, as planned**
Increment 7 stands as written: `minmax(0, 1fr)` on grid tracks, `minWidth: 0` on flex
children, plus `body { overflow-wrap: break-word }`. No blanket `overflow-wrap: anywhere` —
it breaks long words mid-character. Verify every tab (Actions, Spells, Features/Progression,
Inventory, Background, Notes) and the side panel after the change.
