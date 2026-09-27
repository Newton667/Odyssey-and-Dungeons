# Subclass system — rules baseline (2014 + 2024)

**Date:** 2026-09-27
**Source:** Pre-plan audit by the `ond-dnd-auditor` agent (verbatim below), plus orchestrator corrections to the lower-confidence 2024 cells and the user's scope decisions.
**Feeds:** `/ond-execute-ultra` run "rework the subclass system".

## User scope decisions (2026-09-27)

1. **Full 2024 subclass data.** 2024 characters get the 2024 PHB subclass lists and feature tables; 2014 characters keep the current 2014 data. Feature text is written in the app's own words (names + short mechanical gist), never book text.
2. **Eldritch Knight and Arcane Trickster spellcasting is in scope.** Third-caster slots, cantrips, spells known/prepared, DC/attack, Wizard spell list, wired through slots, multiclass caster level, creator, editor and sheet.
3. **Subclass-granted numbers applied automatically:** always-prepared subclass spells (domain / oath / circle / patron, per ruleset), Draconic resilience (unarmored AC 13 + DEX, +1 HP per sorcerer level), and the Bear Totem resistance fix.
4. **Legacy picks are kept.** A subclass that doesn't exist in the character's current ruleset keeps showing its own features (from the table that contains it), labelled with its edition; the player may re-pick from the current list. Nothing is deleted.

## Orchestrator corrections to the 2024 table (supersede the auditor's low/medium-confidence cells)

| Class | 2024 PHB subclasses (exact names) | Subclass feature levels |
|---|---|---|
| Barbarian | Path of the Berserker, Path of the Wild Heart, Path of the World Tree, Path of the Zealot | 3, 6, 10, 14 |
| Bard | College of Dance, College of Glamour, College of Lore, College of Valor | 3, 6, 14 |
| Cleric | Life Domain, Light Domain, Trickery Domain, War Domain | 3, 6, 17 (2024 moved Divine Strike out of the domains into the class's Blessed Strikes at 7) |
| Druid | Circle of the Land, Circle of the Moon, Circle of the Sea, Circle of the Stars | 3, 6, 10, 14 |
| Fighter | Battle Master, Champion, Eldritch Knight, Psi Warrior | 3, 7, 10, 15, 18 |
| Monk | Warrior of Mercy, Warrior of Shadow, Warrior of the Elements, Warrior of the Open Hand | 3, 6, 11, 17 |
| Paladin | Oath of Devotion, Oath of Glory, Oath of the Ancients, Oath of Vengeance | 3, 7, 15, 20 |
| Ranger | Beast Master, Fey Wanderer, Gloom Stalker, Hunter | 3, 7, 11, 15 |
| Rogue | Arcane Trickster, Assassin, Soulknife, Thief | 3, 9, 13, 17 |
| Sorcerer | Aberrant Sorcery, Clockwork Sorcery, Draconic Sorcery, Wild Magic Sorcery | 3, 6, 14, 18 |
| Warlock | Archfey Patron, Celestial Patron, Fiend Patron, Great Old One Patron | 3, 6, 10, 14 |
| Wizard | Abjurer, Diviner, Evoker, Illusionist | 3, 6, 10, 14 |
| Artificer | Keep the existing Artificer subclasses and levels identical in both rulesets (no 2024 core-PHB Artificer). | 3, 5, 9, 15 |

Notes for the planner:
- **Subclass spells by ruleset.** 2014: Cleric domain spells, Paladin oath spells and Circle of the Land circle spells are *always prepared*; Warlock expanded spells are **not** prepared — they only widen the list a Warlock may pick known spells from. 2024: every subclass that grants a spell list (Cleric domains, Paladin oaths, Druid Land/Moon/Sea/Stars circles as applicable, Warlock patrons, Sorcerer Aberrant/Clockwork/Draconic, Ranger Fey Wanderer/Gloom Stalker, Bard where applicable) grants them *always prepared*. Every spell name used must exist in `client/src/data/spells.json` (or be reported as missing) — verify with a script, don't assume.
- **Eldritch Knight / Arcane Trickster.** Third-caster slot progression (starts at class level 3, same slot table in both editions). 2014: Wizard list with school restrictions (EK abjuration/evocation, AT enchantment/illusion, with the "any school" exceptions at 3/8/14/20), spells *known*, cantrips 2 (3 at level 10); AT always knows Mage Hand. 2024: Wizard list, spells *prepared* per the subclass table, school restriction removed. The auditor should confirm the exact 2024 counts during plan review/review — treat the 2024 EK/AT count columns as the least certain data in this plan and isolate them in one table so they are easy to correct.
- **Multiclass caster level** already has a third-caster branch; it must switch on (class, subclass), not class alone.
- Levels above are high-confidence; if the plan needs any feature *name* the planner is unsure of, prefer a neutral name and a gist over guessing.

---

# OND Subclass System — Pre-Plan Rules Baseline Audit

**Scope audited:** `client/src/utils/classData.js` (`CLASSES`, `CLASS_LEVELS`, `RULESET_2024_ADD/SUBCLASS`, `getClassLevels`, `getSubclassLevel`, spell-slot/multiclass helpers), `client/src/utils/subclassFeatures.js` (`SUBCLASS_FEATURES`), `client/src/utils/levelChoices.js` (`getLevelChoices`, `TOTEM_SPIRITS`, `HUNTER_OPTIONS`, `LAND_TERRAINS`), `client/src/utils/featureDescriptions.js`, `client/src/utils/multiclass.js`, `client/src/utils/dndHelpers.js`, and the three UI consumers (`CharacterSheet.jsx`, `CharacterCreate.jsx`, `CharacterEdit.jsx`). Verified 2014 baseline facts against `Player's Handbook.pdf` pages 51 and 77 (Cleric and Paladin class tables). 2024 facts are drawn from my own training knowledge (no 2024 PHB in the repo) and are explicitly confidence-flagged.

**Verdict:** The 2014 baseline is accurate and internally consistent — every `SUBCLASS_FEATURES` level table I checked matches the PHB and its own `CLASS_LEVELS` placeholders exactly. But the 2024 side has a real correctness gap, not just minor edge cases: **the app has zero 2024-specific subclass content.** `RULESET_2024_SUBCLASS` only moves *when* a subclass is chosen (to level 3); it never changes *which* subclasses are offered or *what levels their features land on*. Combined with one hardcoded level check that makes a real 2024 subclass choice permanently unreachable, and several places where 2014-only level numbers are shown in UI text to 2024 characters, this **has correctness bugs** for the 2024 ruleset specifically, while 2014 is clean. A rework needs to add a ruleset dimension to subclass *data*, not just to the *choice level* (which is already correctly threaded).

---

## Findings

### HIGH

**1. `SUBCLASS_FEATURES` has no ruleset dimension at all — every consumer reads 2014-only level keys unconditionally.**
- Rule: 2024 subclasses are chosen at level 3 for every class and generally grant features on a different schedule than 2014 (both editions).
- Location: `client/src/utils/subclassFeatures.js` (whole file — no `ruleset` parameter, no `2024` variant); consumed at `CharacterSheet.jsx:1052,1066-1068` (`classFeatureList`), `CharacterSheet.jsx:2828-2836` (Features-tab `subclassCards`), `CharacterSheet.jsx:3341-3352` (Progression tab `isSubFeature`/`subFeatData`).
- Discrepancy: Example — a 2024 Cleric who picks Life Domain at level 3 (correct, gated by `getSubclassLevel`). The Features tab and Progression tab still read `SUBCLASS_FEATURES['Life Domain'][1]` ("Bonus Proficiency & Disciple of Life") and `[2]` ("Preserve Life") and tag them **"Lv 1"** / **"Lv 2"** — levels at which, under 2024, the character didn't even have a domain yet (it doesn't exist before level 3). There is no 2024-specific feature set to show instead — the 2014 Life Domain package (with 2014-only level tags) is the only thing that can ever be displayed for a 2024 character, whichever of the four real 2024 domains they pick.
- Suggested fix: give `subclassFeatures.js` a ruleset-keyed shape (e.g. `SUBCLASS_FEATURES = { '2014': {...}, '2024': {...} }`) and a `getSubclassFeatures(subclass, ruleset)` accessor mirroring `getClassLevels`; every read site above must switch to it.

**2. Subclass *options* offered are never ruleset-aware — same static 2014/supplement list in all three pickers.**
- Rule: 2024 PHB subclass lists differ by name and count from 2014 for most classes (see baseline table below).
- Location: `CharacterCreate.jsx:1214` (primary-class `<select>`, reads `classData?.subclasses`), `CharacterCreate.jsx:1428` (multiclass extra-class `<select>`, reads `CLASSES[ec.class].subclasses`), `CharacterSheet.jsx:4359` (Level Up modal `<select>`, reads `targetInfo.subclasses`) — all three ultimately read the single static `CLASSES[cls].subclasses` array in `classData.js`.
- Discrepancy: A 2024 Fighter is never offered Psi Warrior; a 2024 Ranger never gets Fey Wanderer/Gloom Stalker; a 2024 Rogue never gets Soulknife; a 2024 Cleric still sees all 7 domains (Knowledge/Nature/Tempest included) instead of the core-four; a 2024 Warlock never gets the Celestial patron. Every ruleset gets identically the 2014-era list.
- Suggested fix: same ruleset-keyed data shape as #1, applied to `CLASSES[cls].subclasses`/`subclassDescs` (e.g. per-ruleset arrays), read through a single `getSubclasses(cls, ruleset)` helper used by all three pickers.

**3. Circle of the Land's terrain choice is permanently unreachable for a 2024 Druid.**
- Rule (both editions): Circle of the Land grants a terrain pick the same level the subclass is chosen.
- Location: `client/src/utils/levelChoices.js:207-209`:
  ```js
  if (cls === 'Druid' && subclass === 'Circle of the Land' && level === 2) {
    choices.push({ type: 'land-terrain', label: 'Choose Your Land' });
  }
  ```
- Discrepancy: `RULESET_2024_SUBCLASS.Druid = { name: 'Druid Circle', from: 2 }` moves the Druid's subclass choice to level 3 under 2024 (`getSubclassLevel('Druid','2024') === 3`), so `subclass` cannot legally be set before level 3. But the terrain-choice trigger is hardcoded to `level === 2`, and it is never re-checked at level 3 or any `getSubclassLevel`-derived level. Net effect: **a 2024 Circle of the Land Druid can never be prompted to choose a land, ever, at any level** — no bonus cantrip's terrain flavor, no bonus-spell list, nothing. (Every other subclass-dependent choice — Battle Master maneuvers, Totem Spirit, Hunter options — is unaffected because Fighter/Barbarian/Ranger already had `subclassLevel: 3` in 2014, so nothing shifts for them.)
- Suggested fix: gate on `level === getSubclassLevel('Druid', ruleset)` instead of the literal `2`.

**4. Eldritch Knight / Arcane Trickster have no spellcasting anywhere on the sheet or creator (re-confirmed, matches the known open gap).**
- Rule (both editions): both are 1/3 casters from the wizard spell list, gaining slots at class level 3 on the third-caster progression.
- Location: `CLASSES.Fighter.spellcasting` / `CLASSES.Rogue.spellcasting` are hardcoded `false` regardless of subclass (`classData.js:298,302`); `getSpellSlots` (`classData.js:441-454`) explicitly returns `null` for Fighter/Rogue (comment at 452-453 acknowledges it); `getSpellcastingClasses` (`multiclass.js:82-92`) filters on `info.spellcasting`, so it never includes them even when subclass is set; `getSpellInfo`/`maxSpellLevel` (`dndHelpers.js:67-120`) gate the same way.
- Discrepancy: A single-class level-10 Eldritch Knight has zero spell save DC, spell attack bonus, cantrips, spells known, or slots computed anywhere, despite `SUBCLASS_FEATURES['Eldritch Knight'][3]`/`['Arcane Trickster'][3]` correctly describing the spellcasting feature in prose (`subclassFeatures.js:114,195`).
- Suggested fix: make `spellcasting`/`spellcastingAbility` subclass-conditional (or add a third-caster branch keyed on `(class, subclass)`) and thread it through `getSpellSlots`, `getSpellcastingClasses`, `maxSpellLevel`, `getSpellInfo`, and the Spells-tab DC/attack calc. Nontrivial — flag for explicit scoping (see Decisions below).

**5. The editor's Subclass field is unvalidated free text — no class list, no level gate, no ruleset check.**
- Location: `CharacterEdit.jsx:721-726`:
  ```jsx
  <input style={st.input} value={form.subclass} onChange={e => { ... }} />
  ```
- Discrepancy: Unlike the creator (`subclassUnlocked` gate, `CharacterEdit.jsx:403`) and the sheet's Level Up modal (`needsSubclass` gate using `getSubclassLevel`), the editor lets you type any string into `subclass` at any level, on any ruleset — including a name that matches no `SUBCLASS_FEATURES` entry (silently renders nothing) or a 2014 subclass name on a 2024 character (once 2024 data exists, this becomes the primary way legacy names leak in).
- Suggested fix: replace with a `<select>` sourced from `getSubclasses(cls, ruleset)` (see #2), disabled below `getSubclassLevel(cls, ruleset)` exactly like the creator.

### MEDIUM

**6. Multiclass extra-class subclass picker has no level gate at all.**
- Location: `CharacterCreate.jsx:1425-1429` — renders `CLASSES[ec.class].subclasses` as soon as a class is picked, with no check against `ec.level`/`getSubclassLevel(ec.class, ruleset)`.
- Discrepancy: The primary class correctly disables its Subclass field until `subclassUnlocked` (`CharacterCreate.jsx:403,1211-1212`), but a multiclass dip added at level 1 can immediately pick a subclass through the extra-class row, regardless of edition or class.
- Suggested fix: same gate as the primary field, applied per extra-class row.

**7. Subclass-choice feature text hardcodes the 2014 level number and is shown unchanged to 2024 characters.**
- Location: `classData.js:296` (Cleric features: `'Divine Domain — Choose a domain at level 1, ...'`), `classData.js:303` (Sorcerer: `'Sorcerous Origin — Choose your innate magic source at level 1...'`), `classData.js:304` (Warlock: `'Otherworldly Patron — Choose your patron at level 1...'`), `featureDescriptions.js:130` (`'Arcane Tradition': '...at 2nd level...'`). Rendered verbatim in `CharacterCreate.jsx:901-904,2287` (class overview) and `CharacterSheet.jsx`'s Features/Actions tabs (via `classFeatureList`'s `featureDesc` map, `CharacterSheet.jsx:1054`).
- Discrepancy: A 2024 Cleric sees a Subclass field correctly locked with the label "Subclass (lvl 3+)" (`CharacterCreate.jsx:1211`) sitting right next to class-feature text claiming "Choose a domain at level 1" — directly self-contradictory in the same screen. Same for Sorcerer/Warlock ("level 1") and Wizard ("2nd level").
- Suggested fix: make these description strings ruleset-aware (interpolate `getSubclassLevel(cls, ruleset)` instead of a literal number), or word them level-agnostically like the Paladin/Druid/Fighter/Monk/Rogue entries already do (none of those mention a level).

**8. `getClassDefenses`'s Bear Totem check can never match — dead code, so the resistance upgrade never applies.**
- Location: `classData.js:557-567`:
  ```js
  if (subclass === 'Path of the Bear Totem' && level >= 3) {
    defenses.resistances = ['All except Psychic (while raging)'];
  }
  ```
  called from `CharacterSheet.jsx:1090-1091` with `c.subclass`.
- Discrepancy: The actual subclass name is `'Path of the Totem Warrior'` (`classData.js:301`'s Barbarian entry); the Bear/Eagle/Wolf choice is stored separately as a feature string `"Totem Spirit (Lv3): Bear"` (`CharacterSheet.jsx:3138-3140`), never in `c.subclass`. The condition is therefore unreachable for any character — a raging Bear Totem Barbarian's Resistances panel always shows only the base Rage resistances (bludgeoning/piercing/slashing), never the correct "resistance to all except psychic," at any level.
- Suggested fix: read the stored totem pick (e.g. `char.features` matching `Totem Spirit (Lv3):`) instead of `c.subclass`.

**9. Draconic Bloodline's two numeric bonuses (AC 13+DEX, +1 HP/level) are described but never wired.**
- Location: `calcAC`'s unarmored-defense special-casing only checks Barbarian/Monk (`dndHelpers.js:18-26`, `unarmoredBaseAC`); no Sorcerer/Draconic branch exists anywhere in `CharacterSheet.jsx`. HP gain in `applyLevelUp` (`CharacterSheet.jsx:742-743`) only adds `FEAT_HP_PER_LEVEL`, never a subclass table; the creator's HP calc (`CharacterCreate.jsx:347-361`) has no Draconic case either.
- Discrepancy example: a level 10 Draconic Bloodline Sorcerer, unarmored, DEX 16 (+3): correct AC = 13 + 3 = 16; app computes 10 + 3 = 13. Correct bonus HP from the bloodline at level 10 = +10; app grants 0.
- Suggested fix: extend `unarmoredBaseAC` with a Draconic Bloodline branch (subclass-aware, since it's not class-wide), and add a subclass-level HP delta into `applyLevelUp`/creator HP calc analogous to `FEAT_HP_PER_LEVEL`.

**10. Always-prepared domain/oath spells have no support at all.**
- Location: nothing in `dndHelpers.js`, `CharacterSheet.jsx`, `CharacterEdit.jsx` references domain/oath spell grants (grep for "always prepared"/"domain spells"/"oath spells" returns nothing).
- Discrepancy: This is a fixed, numeric table exactly like spell slots (e.g. Life Domain always has Bless/Cure Wounds prepared at 1st, +2 more spells per tier) — not a conditional/situational feat with "no flat sheet number." Currently a Cleric/Paladin's prepared-spell count and available list never include these.
- Suggested fix: add a small per-subclass table (ruleset-keyed) and fold it into the prepared-spell count/available list, separate from the class's normal prepared allotment.

### LOW

**11. Champion's Improved/Superior Critical (19-20 / 18-20) is descriptive-only — consistent with the rest of the app, not a gap.** The app has no automatic "natural roll" crit detection for *any* class — `doCrit` (`CharacterSheet.jsx:836`) is a manual button the player clicks when they know they rolled a crit, including the baseline nat-20 case. Since there's no crit-range check anywhere to extend, this isn't a subclass-specific undermodeling; leaving it prose-only is the right call given the existing design.

**12. Domain/Oath/College bonus proficiencies (heavy armor, martial weapons, tool/skill picks) are descriptive-only.** Consistent with the documented pattern in `known-patterns-and-gotchas.md` ("the character model has no armor/weapon-proficiency field and the sheet doesn't enforce it") — not a bug, listed for completeness per the audit's own framework.

**13. Non-PHB subclasses are already correctly source-labeled.** `College of Eloquence` and `Oath of Glory` (both *Mythic Odysseys of Theros*) are explicitly tagged "(Theros)" in their `subclassDescs` text (`classData.js:295,300`). Good practice — listed under Verified Correct below, not a finding.

---

## Rules Baseline Table

### 2014 (PHB unless noted — verified pages in parentheses where I opened the PDF)

| Class | Subclass level | PHB/supplement options in the app | Feature levels (own-words gist) |
|---|---|---|---|
| Barbarian | 3 | Path of the Berserker, Path of the Totem Warrior (both PHB) | 3 subclass features begin; 6/10/14 more (Frenzy/Totem Spirit → Mindless Rage/Aspect → Intimidating Presence/Spirit Walker → Retaliation/Totemic Attunement) |
| Bard | 3 | College of Lore, College of Valor (PHB), **College of Eloquence** (Theros/Tasha's — correctly labeled) | 3, 6, 14 (bonus proficiencies/debuff trick → extra attack or magical secrets or unfailing inspiration → capstone trick) |
| Cleric | 1 (PDF p.51 verified) | Knowledge, Life, Light, Nature, Tempest, Trickery, War Domains (all 7 PHB core) | 1, 2, 6, 8, 17 (domain spells+trait → 1st Channel Divinity option → 2nd option → Divine Strike → capstone) |
| Druid | 2 | Circle of the Land, Circle of the Moon (PHB) | 2, 6, 10, 14 (bonus cantrip/combat wild shape → terrain/beast upgrade → immunity/elemental shape → capstone) |
| Fighter | 3 | Champion, Battle Master, Eldritch Knight (PHB) | 3, 7, 10, 15, 18 (core trick → mid trick → improvement → superior version → capstone) |
| Monk | 3 | Way of the Open Hand, Way of Shadow, Way of the Four Elements (PHB) | 3, 6, 11, 17 (core discipline → mid upgrade → advanced → capstone) |
| Paladin | 3 (PDF p.77 verified) | Oath of Devotion, Oath of the Ancients, Oath of Vengeance (PHB), **Oath of Glory** (Theros — correctly labeled) | 3, 7, 15, 20 (Channel Divinity options → aura → mid capability → capstone transformation) |
| Ranger | 3 | Hunter, Beast Master (PHB) | 3, 7, 11, 15 (choice-based trick → defensive option → multiattack option → capstone option) |
| Rogue | 3 | Thief, Assassin, Arcane Trickster (PHB) | 3, 9, 13, 17 (core kit → mid trick → advanced trick → capstone) |
| Sorcerer | 1 | Draconic Bloodline, Wild Magic (PHB) | 1, 6, 14, 18 (origin trait → elemental/luck upgrade → wings/chaos control → capstone) |
| Warlock | 1 | The Archfey, The Fiend, The Great Old One (PHB) | 1, 6, 10, 14 (patron trait → mid ability → resistance/immunity → capstone) |
| Wizard | 2 | 8 core schools (PHB) | 2, 6, 10, 14 (savant + signature trick → mid upgrade → advanced → capstone) |
| Artificer | 3 (Tasha's/Eberron — my knowledge, not in this PHB) | Alchemist, Armorer, Artillerist, Battle Smith (Tasha's-consolidated set) | 3, 5, 9, 15 (core kit → extra attack/savant → mid upgrade → capstone) |

### 2024 (from my own knowledge — confidence-flagged; no 2024 book in the repo to verify against)

All 13 classes choose subclass at **level 3** (already correctly computed by `getSubclassLevel(cls,'2024')`).

| Class | 2024 PHB subclass options (my recollection) | Confidence | Feature-level cadence (my recollection) |
|---|---|---|---|
| Barbarian | Path of the Berserker, Path of the Wild Heart (replaces Totem Warrior), Path of the World Tree (new), Path of the Zealot (Xanathar's, reprinted) | Medium (names) | 3/6/10/14 — likely unchanged |
| Bard | College of Dance (new), College of Glamour (Xanathar's), College of Lore, College of Valor | Medium | 3/6/14 — unsure if a 4th tier was added |
| Cleric | Life, Light, Trickery, War Domains only (Knowledge/Nature/Tempest dropped from core) | High (the reduction to 4) | 3/6/~7 or 8/17 — exact mid-tier level uncertain |
| Druid | Circle of the Land, Circle of the Moon, Circle of the Sea (new), Circle of the Stars (Tasha's) | Medium | 3/6/10/14 — likely unchanged |
| Fighter | Champion, Battle Master, Eldritch Knight, **Psi Warrior** (Tasha's, newly core) | High | 3/7/10/15/18 — high confidence unchanged |
| Monk | Renamed "Warrior of ___" line: Mercy (new), Shadow, the Elements, the Open Hand | Low-Medium (exact naming) | 3/6/11/17 — presumed unchanged |
| Paladin | Devotion, Ancients, Vengeance, **Glory** (promoted to core) | High | 3/7/15/20 — high confidence unchanged |
| Ranger | Beast Master, **Fey Wanderer** (Tasha's), **Gloom Stalker** (Xanathar's), Hunter | High | 3/7/11/15 — presumed unchanged |
| Rogue | Arcane Trickster, Assassin, **Soulknife** (Tasha's), Thief | High | 3/9/13/17 — high confidence unchanged |
| Sorcerer | Aberrant Sorcery (new), Clockwork Sorcery (Wildemount), Draconic, Wild Magic | Medium | 3/6/14/18 — presumed unchanged |
| Warlock | Archfey, **Celestial** (Xanathar's, new to warlock), Fiend, Great Old One | High | 3/6/10/14 — presumed unchanged |
| Wizard | Abjurer, Diviner, Evoker, Illusionist only (4 core schools) | High (the reduction to 4) | 3/6/10/14 — presumed unchanged |
| Artificer | Not part of the 2024 core PHB as of my knowledge cutoff | — | No confirmed 2024 revision exists to model |

I am **not** confident enough in the exact mid-tier feature levels (e.g. whether Cleric's 2nd Channel Divinity option lands at 6 vs 7, or whether Monk gained a 5th tier) to hand those to the planner as fact — flag these specific cells for a targeted lookup against an actual 2024 PHB source before implementing, rather than trusting my recall wholesale. The subclass *names* I've marked High confidence, and the *choice level = 3 for everyone*, I'd stake the implementation on.

---

## Decisions the plan must make

1. **Central architecture decision:** add a ruleset dimension to subclass *data* (options list + feature-level tables), not just the choice level. Concretely: `CLASSES[cls].subclasses`/`subclassDescs` and all of `SUBCLASS_FEATURES` need a `{2014, 2024}` split, with `getSubclasses(cls, ruleset)` and `getSubclassFeatures(subclass, ruleset)` accessors mirroring the existing `getClassLevels`/`getSubclassLevel` pattern. Every one of findings #1, #2, #3, #7 stems from this single gap.
2. **Legacy-pick migration policy:** when a 2014 character (with, say, Circle of the Land or Knowledge Domain already chosen) has its `ruleset` switched to 2024 in the editor, does the app (a) keep the 2014 subclass name and 2014 feature table forever, (b) force a re-pick from the 2024 list, or (c) silently show nothing because the name no longer matches the 2024 data? This needs an explicit fallback (e.g. "unknown-to-this-ruleset subclass" keeps rendering its original-ruleset feature table regardless of the character's current `ruleset` field, since the pick itself doesn't retroactively change).
3. **Editor Subclass field:** keep it free text (matches the app's homebrew-tolerant philosophy) or convert to a ruleset/class-aware `<select>` with validation, matching the creator and Level Up modal. Given finding #5, at minimum it should stop being the *only* unguarded entry point.
4. **Scope of Eldritch Knight / Arcane Trickster spellcasting (#4):** this touches `getSpellSlots`, `getSpellcastingClasses`, `maxSpellLevel`, `getSpellInfo`, spell DC/attack, and the Spells-tab UI — a nontrivial cross-cutting change. Decide whether it's in scope for this rework or explicitly deferred (again).
5. **Multiclass extra-class subclass gate (#6):** fix in the same pass as the primary rework, since it's the same "subclass options + level gate" surface, or file separately.
6. **Draconic Bloodline AC/HP and domain/oath always-prepared spells (#9, #10):** these are concrete numeric subclass grants currently unmodeled. Decide whether they're in scope now (they're the same category of "fixed table" work as spell slots) or deferred as known gaps.
7. **Artificer under 2024:** since there's no confirmed 2024 PHB Artificer revision, decide explicitly to keep Artificer's subclass data identical across both rulesets (with subclass level still 3 in both, unaffected either way).
8. **`getClassDefenses` Bear Totem fix (#8):** small, isolated — can ride along with the rework since it's directly adjacent (same Barbarian/subclass code path) or be filed as a standalone one-line-condition bug fix.

---

## Verified correct

- **2014 subclass feature levels** in `subclassFeatures.js` are accurate for every class I checked, and internally consistent with `CLASS_LEVELS`'s placeholder rows (Cleric 1/2/6/8/17 verified against PHB p.51; Paladin 3/7/15/20 verified against PHB p.77; the rest cross-checked against the app's own `CLASS_LEVELS` "Feature" placeholders, which agree).
- **`getSubclassLevel(cls, ruleset)`** correctly returns 3 for every class under 2024 and the correct 2014 per-class value otherwise (`classData.js:436-439`), and is used correctly for the *choice-level gate* in the creator (`CharacterCreate.jsx:403,1211-1212`), the Level Up modal's `needsSubclass` check (`CharacterSheet.jsx:4293-4295`), and `getLevelChoices`'s generic subclass-choice trigger (`levelChoices.js:161-164`). This is the one piece of the ruleset threading that is fully correct — the gap is entirely in the *data* consumed once that gate opens, not the gate itself.
- **`RULESET_2024_SUBCLASS`/`RULESET_2024_ADD`** correctly move only the classes that actually need to shift (Cleric/Druid/Sorcerer/Warlock/Wizard) and correctly no-op for classes already at level 3 in 2014 (Barbarian/Bard/Fighter/Monk/Paladin/Ranger/Rogue/Artificer) — the de-dupe logic (`classData.js:425-432`) prevents a promoted feature from also appearing at its old level.
- **Non-PHB subclasses are already source-labeled** (College of Eloquence, Oath of Glory — "(Theros)" in `subclassDescs`), and the Artificer's four subclasses correctly reflect the published Tasha's-consolidated set.
- **Battle Master maneuvers, Totem Spirit, Hunter options** (`levelChoices.js`) are correctly unaffected by the ruleset shift, since Fighter/Barbarian/Ranger were already subclass-level-3 in 2014 — only Circle of the Land was left behind (finding #3).

— DNDAuditor
