# Review: player-reported bug fixes — round 2 (post-fix)

**Date:** 2026-08-16
**Scope:** working-tree diff (33 files)
**Plan:** `Docs/plans/2026-08-16-player-reported-bug-fixes.md`
**Increments:** `Docs/increments/2026-08-16-player-reported-bug-fixes.md` (8/8 done)
**Previous review:** `Docs/reviews/2026-08-16-player-reported-bug-fixes.md` (2 HIGH, 2 MEDIUM — all fixed)
**Agents:** `ond-reviewer`, `ond-dnd-auditor` (run in parallel)
**Verdict:** **clean with minor fixes** — no HIGH, 3 MEDIUM, 6 LOW

**All four findings from round 1 are fixed correctly.** Both agents traced each fix
independently and neither could construct a failing case. No new correctness bug was
introduced. The remaining items are hygiene, a scoping gap in one of the fixes, and docs.

---

## Findings

### HIGH
None.

### MEDIUM

#### 1. Three tracked files were rewritten with CRLF — the diff looks like a 6,000-line rewrite
**[CONFIRMED · ond-reviewer, extended by orchestrator]**
`client/src/pages/CharacterSheet.jsx`, `client/src/pages/CharacterEdit.jsx`, `CHANGELOG.md`

The repo is LF (`core.autocrlf=false`, no `.gitattributes`). These were LF at HEAD and are
now 100% CRLF in the working tree. Verified:

```
CharacterSheet.jsx   HEAD=LF  WT=CRLF     apparent diff: 4226 +/ 4204 -
                                          real diff:       56 +/   34 -
CharacterEdit.jsx    HEAD=LF  WT=CRLF
CHANGELOG.md         HEAD=LF  WT=CRLF
dndHelpers.js        HEAD=LF  WT=LF       (clean)
DiceContext.jsx      HEAD=LF  WT=LF       (clean)
```

**Two more the agent missed** — untracked, so they produce no diff bloat, but they would be
committed with endings inconsistent with every sibling:

```
client/src/utils/diceFormula.js       WT=CRLF   (new file)
client/src/utils/dndHelpers.test.js   WT=CRLF   (new file)
```

**Cause:** files patched with a Python script (`io.open(path, 'w')` translates `\n` → `\r\n`
on Windows). Files edited with the Edit tool kept LF — which is exactly the split observed.

**Failure case:** commit as-is → `git blame` on every line of the sheet and editor points at
this commit, and any later reviewer sees a total rewrite instead of ~90 real lines.

**Fix:** normalise all five to LF before committing. Verify with
`git diff --stat` matching `git diff --ignore-cr-at-eol --stat`. Optionally add a
`.gitattributes` with `* text=auto eol=lf` to stop it recurring.

#### 2. Magic Initiate's bonus spell isn't capped to 1st level for a character who is *also* a caster
**[CONFIRMED · ond-dnd-auditor; corroborated independently by ond-reviewer]**
`client/src/pages/CharacterEdit.jsx:72` and the `+ bonusSpells` returns

**Rule (2014 & 2024, PHB p.168):** the feat grants exactly *one 1st-level spell* from the
chosen list. It never scales, and it is not interchangeable for a higher-level pick.

Introduced by round 1's MEDIUM-3 fix. The `featOnly()` path correctly hardcodes
`maxLevel: 1` for a **non-caster** — the case that fix targeted. But for a character who
already casts, `Math.max(maxSpellLevel(cls, lvl, ruleset), 1)` is a no-op and the `+1` is
folded into an undifferentiated `maxSpells` total.

**Failure case:** level-5 Wizard (INT 16) with Magic Initiate → `{maxSpells: 15, maxLevel: 3}`.
The extra 15th slot can be filled with **any** spell up to 3rd level — e.g. Fireball — which
the feat does not grant. `ond-reviewer` reached the same conclusion from a different angle:
the Wizard branch adds `bonusSpells` to both `maxSpells` (spellbook size) *and* `prepareCount`,
yet the feat's spell is RAW neither in the spellbook nor prepared.

`CharacterCreate.jsx:402-404` gets this right — dedicated `level: 0` / `level: 1` selectors,
never merged into the class picker. The editor fix took the cheaper "add to the count" route.

**Fix:** give the editor a dedicated MI-spell selector like the creator's, or return
`bonusMaxLevel: mi ? 1 : null` alongside `maxLevel` and enforce it in the `tooHigh` check
(`:1278`) for the bonus slot.

#### 3. No `known-patterns-and-gotchas.md` entry for either newly-fixed bug class
**[CONFIRMED · ond-reviewer]** `Docs/known-patterns-and-gotchas.md`

The docs were updated thoroughly for the original increments, but this round's two bug classes
left no trace — both are exactly the "silent wrong result, build-clean, test-green" category
the file exists for:

- **`CLASSES[cls].hitDice` is a bare `'d10'`** — a formula built from it must carry an explicit
  count, and a parser requiring `\d+d` reads the `10` as a flat bonus. This is why the
  short-rest path writes `` `1${hd}` ``.
- **The dice watchdog** — the "One roll at a time" section documents `rollingRef` but not that
  `Dice3D`'s 6 s safety net only exists *after* the WebGLRenderer is built, nor that
  `DiceContext` now has a 10 s watchdog as the backstop. Someone touching `Dice3D`'s setup could
  remove the invariant without knowing it exists.

`client-context-hooks-utils.md` also still describes `diceFormula.js` without the countless-die
rule. The code docstrings already have the wording.

### LOW

1. **`featOnly: true` is dead** — `CharacterEdit.jsx:62` sets it; nothing reads it. Either
   consume it (see #2 below) or drop it.
2. **Info-bar wording for a feat-only caster** — `:1431` renders "As a level 5 **Fighter**, you
   know 2 cantrips and can prepare up to 1 spells (up to level 1)", attributing the feat's
   allowance to the class. `featOnly` is exactly the flag needed to say "From Magic Initiate…".
3. **Regex asymmetry** — `weaponDamageDice` still tests `/\d+d\d+/` while `parseDiceFormula` now
   accepts `/\d*d\d+/`. A `damage` of `'d6'` would fall to the flat branch → `'0+3'`, silently
   dropping the die. **Not reachable today** — all 344 equipment and 521 spell entries were
   scanned (no countless-die damage strings) and Homebrew's builder always emits `1${die}`.
   Worth widening for symmetry.
4. **Stale `featSpellLists` when the feat is removed** — drop "Magic Initiate" from `feats` while
   the list remains: `isCaster` is true but `getSpellLimits` returns `null`, so the panel says
   "Select a spellcasting class" *and* the MI picker is hidden — the list can't be cleared from
   the editor. Fix: prune `featSpellLists` on feat removal, or derive `featClasses` via `featNames`.
5. **Three copies of the feat-name normalisation in one file** — the hoisted `featNames` memo
   (`:276`) is shadowed by inline re-implementations at `:1632` and `:1766`; `:1342` calls
   `normalizeFeatNames(form.feats)` again instead of the memo. Legal, but a readability trap.
6. **Carried over from round 1 (still open)** — `known-patterns-and-gotchas.md:110` says
   "`CharacterEdit.jsx` still loads server-then-local"; the code is local-first
   (`CharacterEdit.jsx:218-223`). The contradiction now sits adjacent to the new
   authoritative-localStorage rule in the same paragraph.

---

## Verified correct

**All four round-1 fixes, traced independently by both agents:**

- **Level-up HP** — the widened `\d*d\d+` was diff-tested against every `damage`, `versatile`,
  `higherLevels` and `formula` string in `equipment.json` (344) and `spells.json` (521):
  **zero** cases where it matches more than the old narrow regex. Every code-generated formula
  carries an explicit count. `stripped` uses the same widened pattern, so `'d10+2'` → bonus 2
  and `'1d20+-2'` → `-2` still hold. `doCrit`'s doubler deliberately stays narrow and only ever
  receives counted formulas. Rules side: `1d(hit die) + CON`, min 1, matches PHB
  level-advancement; hit-die-per-class mapping re-verified (Barbarian d12 … Wizard d6).
- **Blowgun** — checked against PHB p.149 directly. `'1+2'` = 3, `'1+0'` = 1 (was 0), Net `'—'`
  still `null` with no button. **No import cycle**: `diceFormula.js` imports nothing. No dice-weapon
  regression — `+1 Longsword` STR+3 still `1d8+4`; Flame Tongue/Oathbow/Frost Brand keep both groups.
  Label renders the same string it rolls.
- **Feat-caster path** — traced end to end. Fighter 5 + MI (Wizard) → `{cantrips:2, maxSpells:1,
  maxLevel:1}`, both blocks render, `allSpells` is the Wizard union, level 2+ greyed. 2014
  Paladin 5 + MI (Cleric) → 2 cantrips (the branch now uses the computed value, not a hardcoded
  `0`); a Paladin *without* the feat still gets 0. Memo hoist is safe — both `useMemo`s sit above
  every early return, no stale closure, no effect loop. Matches the sheet's parallel `+2/+1`.
- **Watchdog** — cannot misfire (armed synchronously; `Dice3D` always settles by 6 s < 10 s),
  cannot double-resolve (both paths null-check `resolveRef.current`), cleared on every exit path;
  the three early returns never arm it.

**Also verified:**

- All 12 `rollDice3D` call sites still guard `null`, including the two with local `rolling` state.
- `CharacterCreate.jsx:2061` was **still hardcoded to the 2014 Magic Initiate list** in the diff's
  starting state; this work routes it through `ruleset` and adds a reset on ruleset change, so a
  2024 character can no longer hold an illegal Bard/Sorcerer/Warlock list.
- Magic Initiate's +2 cantrips / +1 spell is correct for **both** editions; `maxLevel: 1` correct
  for the feat-only path; a Paladin gaining cantrips via the feat conflicts with nothing.
- CHANGELOG: three new accurate entries under `### Fixed`; `version.js` **not** bumped.
- 65/65 tests pass; `vite build` clean; no leftover references from the `getSpellLimits`
  signature change.

## Not addressed

- **Pre-existing, outside the diff:** `RollBtn` is defined inside `CharacterSheet`'s render
  (`:870`) — the forbidden pattern from gotcha #1. No inputs, so focus loss doesn't surface.
- **Manual browser verification still not performed.** The equip/level-up/reload cycle, the
  +1 Longsword numbers, and the seven-tab layout sweep at 1280px/900px need a running app and a
  human. Increment 7 (overflow) has no durable automated guard. **The level-up flow especially
  warrants a manual check — that is where round 1's regression was.**
