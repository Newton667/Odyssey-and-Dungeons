# Review: subclass system rework (2014 + 2024)

**Date:** 2026-09-27
**Scope:** working-tree diff vs `f925a99` (v1.8.1): 19 modified files + new `client/src/utils/subclassData.js`, `subclassFeatures2024.js`, `subclassSpells.js`, their tests, and `classData.test.js`
**Plan:** `Docs/plans/2026-09-27-subclass-system-rework.md` (tracking: `Docs/increments/2026-09-27-subclass-system-rework.md`, 12/12 done; rules baseline: `Docs/research/2026-09-27-subclass-rules-baseline.md`)
**Agents:** reviewer, DNDAuditor
**Verdict:** clean with minor fixes — no HIGH findings from either agent; 2 MEDIUM code findings (both confirmed by the orchestrator), 1 MEDIUM rules uncertainty

**Checks run at review time:** `npm test` 315/315 (12 files); `vite build` clean; undeclared-identifier scan clean; DNDAuditor verified every 2014 table it checked against the PHB (domain spells pp.58-64, oath spells pp.85-88, Circle of the Land p.68, Bear Totem p.50, Draconic Bloodline p.102, EK table p.75, AT table p.98, Warlock expanded lists pp.108-110) with zero discrepancies.

## Findings

### HIGH
None.

### MEDIUM
- **[CONFIRMED · reviewer, verified by orchestrator]** `client/src/pages/CharacterSheet.jsx:936-945` (`fightingStyles` memo), `:3126-3154` (subclass branch of `selectOption`), relocation effect `:430-440` with `levelChoices.js:335-341` — the Champion's Additional Fighting Style stays active after switching subclass away from Champion, and relocation then shows it on the level-1 fighting-style card.
  - **Failure case:** 2014 Fighter 10 with Archery (creator) + Champion additional style Defense → switch to Battle Master. `levelChoices` `{10:{'fighting-style':'Defense'}}` relocates to key 1; the L1 card shows Defense while `fightingStyle` is still Archery; `fightingStyles` = {Archery, Defense}, so the Battle Master keeps +1 AC in armor.
  - **Fix:** on a subclass pick where the class was Fighter/Champion and the new subclass is not Champion, drop features starting with `Fighting Style (Champion):` and delete the `fighting-style` pick at the Champion additional level (7/10); in `fightingStyles`, read the Champion feature only while a Fighter/Champion class entry exists. Add a test for the switch and a line to the Champion gotcha.
- **[CONFIRMED · reviewer, verified by orchestrator]** `client/src/pages/CharacterEdit.jsx:1424-1426` — the editor's 2014 EK/AT school budget passes `otherListClasses: featClasses` (Magic Initiate lists only) while the sheet (`CharacterSheet.jsx:2376-2383`) passes every class list via `allowedSpellClasses(char)`. They disagree for multiclass characters, contradicting the gotcha at `Docs/known-patterns-and-gotchas.md:448` ("sheet, creator and editor all enforce it the same way").
  - **Failure case:** 2014 Fighter (Eldritch Knight) 3 / Cleric 1 knowing Detect Magic (Divination; on the Cleric list) and Sleep: sheet counts 1/1 any-school picks, editor counts 2/1 and blocks off-school picks the sheet allows.
  - **Fix:** pass `[...getCharClasses(form).map(c => c.class), ...featClasses]` (or `allowedSpellClasses(form)`) in both editor calls.
- **[PLAUSIBLE · DNDAuditor]** `client/src/utils/subclassSpells.js:130-134` — `THIRD_CASTER_PROGRESSION['2024']` reuses the 2014 EK/AT spell-count table with `type: 'prepared'`. The type change and removal of the school restriction are medium-high confidence; the exact 2024 counts are low-medium confidence (no 2024 PHB in the repo). The orchestrator's own knowledge is that the 2024 "prepared spells" column matches the 2014 "spells known" column, so no change is proposed — the table stays isolated and flagged as the least-certain data.

### LOW
- **[PLAUSIBLE · DNDAuditor]** `subclassSpells.js:66` — 2024 Oath of Glory level-17 "Yolande's Regal Presence" can't be verified against a source in the repo.
- **[CONFIRMED · reviewer]** `CharacterSheet.jsx:3141` — `char.currentHp || 0` in the subclass-pick HP path; `applyLevelUp` uses `?? maxHp`. Use `(char.currentHp ?? char.maxHp ?? 0)`. Low risk (the creator always writes `currentHp`).
- **[PLAUSIBLE · reviewer]** `spellAccess.js:114` — `resolveSheetSpells` de-duplicates by name, so a homebrew spell sharing a built-in's name is now hidden (the old filter showed both). Document it or prefer the homebrew record.
- **[CONFIRMED · reviewer]** `CharacterEdit.jsx:322-323` — `form.levelChoices` is always undefined (not in the editor form); the dependency is dead. The land is correctly read from the `Circle Land:` feature. Drop the dependency or comment it.
- **[CONFIRMED · reviewer]** `CharacterEdit.jsx:761` — `inList` infers list membership from labels; `getSubclasses(primaryClass, rs).includes(current)` is clearer.
- **[CONFIRMED · reviewer]** `CHANGELOG.md:35` — "when you take the subclass" overstates it: picking a subclass in the editor's select applies no Draconic HP (by design, it shows a reminder). Say "on the sheet".
- **[CONFIRMED · reviewer]** `CharacterEdit.jsx:314` — `formCasterClasses` includes EK/AT below class level 3, loading the Wizard list with null limits. Gate it with `spellcastingStartLevel` to match `getSpellcastingClasses`.
- **[CONFIRMED · reviewer, already approved]** `levelChoices.js:339` — a 2014 Champion's old-save L1 style stored at key 7 moves to the L10 card (tracking-file Concern 2). Only saves never opened under v1.8.1 are affected.
- **[CONFIRMED · DNDAuditor, pre-existing, out of scope]** `classData.js` `CLASS_LEVELS.Ranger[3]` still shows 2014-only "Primeval Awareness" to 2024 characters — a 2024 class-level feature change, excluded by the plan.

## Verified correct
- **2014 unchanged:** `CLASSES[cls].subclasses` / `SUBCLASS_FEATURES` returned by reference; all 7 Cleric domains, 3 PHB oaths + Theros Glory, all 8 Circle of the Land lists × 4 tiers (the old 6-of-8 lists fixed), Warlock expanded lists treated as *expanded*, not prepared — all PDF-verified.
- **2024 data:** all 12 PHB subclass lists and feature levels; the de-dupe fix surfaces every 2024 subclass feature at the right level across all 13 classes (hand-traced by the auditor, scripted by the reviewer); 2014 and 2024 ASI counts now equal for every class; Paladin/Ranger Spellcasting only at 1.
- **EK/AT:** 2014 cantrips/spells/slots/school rules/Mage Hand match PHB pp.75, 98; spell math agrees across `getSpellInfo`, `maxSpellLevel`, multiclass slots, `getSpellcastingClasses` and the editor/sheet third-caster branches for EK 2014/2024 at 2/3/7/13/19/20; EK 3 + AT 3 → caster level 2.
- **Draconic:** 2014 AC 13 + DEX / +1 HP per level; 2024 AC 10 + DEX + CHA / +3 at 3 then +1; applied as deltas at events only, never twice through one event, never auto-subtracted.
- **Bear Totem** resistance fixed (string and object features, bare and namespaced keys); Circle of the Land at the real subclass level; Champion additional style 2014 L10 / 2024 L7; Hunter options per edition; legacy picks labelled and kept; relocation round-trips (totem, Hunter, 2024 Champion, land 2↔3, Cleric subclass 1↔3).
- **Code:** no undefined references, hooks before early returns, no TDZ in dependency arrays, no import cycles, no components defined inside components, subclass spells derived only (never written into `preparedSpells`), editor adds no persisted fields and keeps legacy/custom subclass values, version not bumped, CHANGELOG + gotchas updated.

## Not addressed
- Deferred by plan scope (out of scope for this rework, listed for follow-up): 2024 multiclass half-caster rounding; 2024 Cleric/Druid class-level schedules (and 2024 class-level feature text such as Ranger Primeval Awareness, 2024 Warlock Pact Boon card at 3); Epic Boon at 19 treated as an ASI; bonus cantrips, Lore extra spells, Artificer specialist spells, the 2014 dragon-ancestor choice; the 7 subclass spells missing from `spells.json` (name-only rows); subclass-tied picks (totems, Hunter options, land) not cleared on a subclass change except where M1 changes combat numbers.
