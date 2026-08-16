# Review: player-reported bug fixes

**Date:** 2026-08-16
**Scope:** working-tree diff (21 modified, 6 new files under `client/src/`)
**Plan:** `Docs/plans/2026-08-16-player-reported-bug-fixes.md`
**Increments:** `Docs/increments/2026-08-16-player-reported-bug-fixes.md` (8/8 done)
**Agents:** `ond-reviewer`, `ond-dnd-auditor` (run in parallel)
**Verdict:** **has correctness bugs** — 2 HIGH, 2 MEDIUM · **ALL FIXED 2026-08-16, re-verified**

Both HIGH findings were independently spot-checked against the code by the orchestrator
before being reported. Both hold. Neither is caught by the test suite or `vite build`.

---

## Findings

### HIGH

#### 1. Level-up "Roll for HP" always grants the maximum die, and rolls no dice
**[CONFIRMED · ond-reviewer]** `client/src/pages/CharacterSheet.jsx:477` + `client/src/utils/diceFormula.js:25-31`

`applyLevelUp` passes the raw hit-die string — `CLASSES[cls].hitDice` is `'d10'`, with **no
leading count**. `parseDiceFormula`'s dice regex `/(\d+)d(\d+)/g` requires a digit before the
`d`, so `'d10'` matches nothing, falls into the new no-dice branch, and `/[+-]?\s*\d+/g`
scoops up the `10` as a **static bonus**. `rollDice3D` then short-circuits on `!hasDice` and
resolves instantly.

Verified directly:

```
parseDiceFormula('d10') -> hasDice=false  staticBonus=10  dice=0
parseDiceFormula('d6')  -> hasDice=false  staticBonus=6   dice=0
parseDiceFormula('1d10')-> hasDice=true   staticBonus=0   dice=1
```

**Failure case:** Fighter, CON 14 (+2). Level Up → "Roll d10 + CON" → Confirm. No 3D dice
appear; max HP increases by exactly **12 every time**. Roll log reads `Level Up HP · d10 = 10`.
Expected 1–10 + 2. Wizard `'d6'` → always 6 + CON, etc.

This is a **regression introduced by this change** — and in the player's favour, so it would
be easy to miss. The short-rest path three lines away (`CharacterSheet.jsx:395`) does it
correctly: `` const formula = `1${hd}${conMod…}` ``.

**Fix:** normalise at the call site — `await rollDice3D(\`1${hd}\`, 'Level Up HP')` — and
harden the parser so a countless die can never be read as a modifier: match `/(\d*)d(\d+)/g`
with `count = Number(m[1] || 1)`. Add `parseDiceFormula('d10')` to the test suite; its absence
is why the GREEN gate passed.

#### 2. Flat-damage weapons drop their own base damage
**[CONFIRMED · both agents]** `client/src/utils/dndHelpers.js:171`

The no-dice branch returns `` `${dmgBonus}${riderSuffix}` `` — `damage` is *tested*
(`/\d/.test(damage)`) but never *included*.

**Rule (both editions):** PHB p.149 lists the Blowgun's damage as "1 piercing". The damage-roll
rule adds the ability modifier **to** the weapon's damage value, whether that value is a die or
a flat number. Blowgun + DEX 14 (+2) → **3**, not 2.

Verified this is real damage and not a duplicated magic bonus: Blowgun has `damage: '1'` and
**no `bonus` field**. Every one of the 65 entries with a baked-in `+N` *does* carry a matching
`bonus`, so nothing else double-counts.

**Failure case:** Blowgun, DEX +2 → button reads `2`, rolls **2** (correct: 3). With DEX +0 it
rolls **0 damage**. Same for any homebrew weapon with a flat `damage` value.

The plan contradicts itself here: its overview says "a Blowgun rolls `1 + DEX` (not 0)"
(`plans/…:86`) while its acceptance step at `:102` specifies `'2'`. The implementation followed
the acceptance step, and `dndHelpers.test.js:103` now **locks in the wrong number** — a wrong
spec producing a green gate.

**Fix:**
```js
if (typeof damage === 'string' && /\d/.test(damage)) {
  const flat = parseDiceFormula(damage).staticBonus;   // '1' → 1
  return `${flat}+${dmgBonus}${riderSuffix}`;
}
```
and correct `dndHelpers.test.js:103` (`'1+2'`) and `:115` (`'1+2+1d6'`). Net (`'—'`) still
yields `null` — the `/\d/` guard excludes it.

### MEDIUM

#### 3. The editor still short-circuits non-casters — the exact rule this diff documented
**[CONFIRMED · ond-reviewer]** `client/src/pages/CharacterEdit.jsx:1398` (`isCaster` at `:1239`), `:1436`, `getSpellLimits` at `:48-49`

Increment 6 fixed the **fetch** guard (`:253-266` unions feat classes into `allSpells`) but not
the **render** guard. `isCaster = SPELLCASTING_CLASSES.includes(form.class)` still gates the
whole section, and the Cantrips block is gated on `spellLimits.cantrips > 0`, which
`getSpellLimits` never raises for Magic Initiate. **The `allSpells` union is dead code for the
character it was written for.**

**Failure case:** (a) Fighter 5 + Magic Initiate (Wizard): the new picker renders and says "adds
it to the spells you can pick below" — the panel below reads *"Fighter is not a spellcaster."*
(b) 2014 Paladin 5 + Magic Initiate (Cleric): `CANTRIPS_KNOWN.Paladin` is undefined → cantrips
block never renders → the 2 feat cantrips can't be picked.

The sheet's browser **does** work correctly, so the CHANGELOG claim is true there but not in the
editor. Note `getSpellLimits` is one of the three parallel spell-math sites
(`known-patterns-and-gotchas.md`).

#### 4. `rollingRef` has no escape hatch — a failed roll can wedge dice app-wide
**[PLAUSIBLE · ond-reviewer]** `client/src/context/DiceContext.jsx:86`, `:103`

`rollingRef.current = true` is cleared **only** inside `onDiceSettled`'s 500 ms timer.
`Dice3D`'s 6 s safety timeout is armed *after* `THREE.WebGLRenderer` construction, so if that
effect throws or returns early (no canvas, WebGL unavailable, context lost on GPU switch),
`onSettled` never fires and **every subsequent roll returns `null`** until a page reload.
Before this change a stuck roll self-healed on the next click.

Marked PLAUSIBLE — the WebGL failure couldn't be triggered here, but the code path is
unambiguous. **Fix:** a ~10 s watchdog alongside the promise that clears the guard and resolves
`null`, cleared in `onDiceSettled`.

### LOW

5. **[CONFIRMED · ond-reviewer]** `Docs/known-patterns-and-gotchas.md:110` says "CharacterEdit
   still loads server-then-local" — the code is **local-first** (`CharacterEdit.jsx:203-212`),
   and this same diff's `architecture.md` says so correctly. Inherited from the pre-diff text;
   worth fixing since this is the file everyone reads first.
6. **[CONFIRMED · ond-reviewer]** `CharacterEdit.jsx:256` re-implements the `featSpellLists` walk
   inline instead of routing through `spellAccess.js` — correct today, but a second copy of a
   rule the gotchas file says to centralise.
7. **[CONFIRMED · ond-reviewer]** Damage button renders `2` (plan expected `+2`) and `1d4+-1` for
   negative modifiers. Label and formula agree, so the roll is never a lie — cosmetic only.
8. **[· ond-dnd-auditor]** 2024 Magic Initiate gaps — spellcasting-ability choice, repeatability,
   always-prepared casting. All **deliberately out of scope** per the plan's Decisions; recorded
   as gaps, **not bugs**. `featSpellLists` is already array-shaped for repeatability later.

---

## Verified correct

- **All 12 `rollDice3D` call sites guard the `null` return** — independently confirmed by *both*
  agents. This was the highest-risk change and the one with no unit test; the 7 sites that
  destructure immediately all guard.
- **`weaponDamageDice` strip regex** — traced against every distinct `damage` string in
  `equipment.json`. Multi-group weapons (Flame Tongue `1d8 + 2d6 fire`, Oathbow, Frost Brand)
  keep both groups; `1d8+1` → `1d8`. The `(?![\d\s]*d)` lookahead is load-bearing.
- **`resolveLoadAction` closes every read-side overwrite path** — `'adopt'` is unreachable when
  a local copy exists, in *both* `useCharacter` and `useCharacterList` (the list was a second,
  independent wipe trigger the plan never identified). `updateHp`'s PATCH is now harmless.
- **Editor save is no longer lossy** — PUTs `merged`, not `body`; the server's JSON merge keeps
  `featSpellLists`/`ruleset` despite the vestigial Mongoose model.
- **Damage label matches the rolled formula** character-for-character on both grips; versatile
  `+N` already excluded, so no double-count on either.
- **`MAGIC_INITIATE_CLASSES`** — 2014 list matches PHB p.168; 2024 list matches the revised feat.
  Routed through `ruleset` everywhere, no hardcoded edition.
- **Fighting styles** still grip-specific (Archery attack-only, Dueling 1H-only, GWF 2H-only);
  advantage/disadvantage negative-modifier fix works (`1d20+-2` → `-2`).
- **React rules** — no component defined inside another; hooks unconditional and above early
  returns; dep arrays complete.
- **Layout** — every `gridTemplateColumns` uses `minmax`; `overflow-wrap: break-word` (not
  `anywhere`) with `.wrap-text` opt-in.
- **Project requirements** — CHANGELOG under `## vX.X.X — Unreleased` with correct headings;
  `version.js` **not** bumped; five `Docs/` files updated.
- 61/61 tests pass; `vite build` clean.

## Not addressed

- **Pre-existing, outside the diff:** `RollBtn` is defined inside `CharacterSheet`'s render
  (`:870`) — the forbidden pattern from gotcha #1. It contains no inputs so focus loss doesn't
  surface, and this diff only added a `disabled` prop. Worth converting to `renderRollBtn()`
  next time that area is touched.
- **No manual browser verification was performed.** The equip/level-up/reload cycle, the
  +1 Longsword numbers, and the seven-tab layout sweep at 1280px/900px need a running app and a
  human. Increment 7 (overflow) has no durable automated guard beyond a `gridTemplateColumns`
  grep.


---

## Resolution (2026-08-16)

All four HIGH/MEDIUM findings fixed and verified. Suite **65 passed (65)**, build clean.

| # | Finding | Fix |
|---|---|---|
| HIGH 1 | Level-up HP always max | `parseDiceFormula` regex `(\d+)d` → `(\d*)d` with `count = m[1] \|\| 1`; level-up call site now sends `` `1${hd}` ``. 4 regression tests added. |
| HIGH 2 | Blowgun drops base damage | `weaponDamageFormula` folds the flat value in: `'1'` + mod 2 → `'1+2'` (= 3). Two wrong assertions corrected; homebrew flat-weapon case added. |
| MED 3 | Editor shuts out feat casters | `featClasses`/`featNames` hoisted to `useMemo`; `isCaster` includes feat lists; `getSpellLimits` takes `featNames` and grants Magic Initiate's +2 cantrips / +1 spell, returning a real limit object for a non-caster. |
| MED 4 | `rollingRef` can wedge | 10s watchdog armed with the promise, cleared in `onDiceSettled`; releases the guard and resolves `null` on a failed roll. |

Behavioural verification:

```
parseDiceFormula('d10') -> hasDice=true dice=1 staticBonus=0   FIXED
Blowgun DEX+2  -> '1+2' = 3    FIXED (was 2)
Blowgun DEX+0  -> '1+0' = 1    (was 0 damage)
Net            -> null         (still correctly no button)
+1 Longsword STR+3 -> '1d8+4'  (no regression — still no double-count)
Flame Tongue   -> '1d8 + 2d6 fire+3'  (no regression — both groups kept)
```

**Still outstanding:** the LOW findings (5–8) and the pre-existing `RollBtn`-inside-render issue
are not addressed. Manual browser verification is still required — no automated check covers the
equip/level-up/reload cycle or the seven-tab layout sweep.
