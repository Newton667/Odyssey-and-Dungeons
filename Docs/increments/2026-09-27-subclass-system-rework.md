# Execution: Subclass System Rework (2014 + 2024)

**Plan:** `Docs/plans/2026-09-27-subclass-system-rework.md`
**Prepared:** 2026-09-27
**Overall status:** complete
**Test command:** `cd client && npm test`
**Build command:** `cd client && npx vite build`

> This plan passed a two-round plan review (see its "Plan review log"). **Do not re-derive it.**
> Three round-2 changes are binding and are carried into the specs below:
> 1. **Draconic `switched` notice**: `subclassRepickHp(before, after)` returns `{ apply, remind, switched }`.
>    The sheet never subtracts HP automatically. It shows a notice when `remind > 0`, and a second notice when
>    `apply > 0 && switched`. No new stored field is added (Increments 7 and 8).
> 2. **2014 Champion key-10 relocation test**: a correctly placed 2014 Champion pick at key `10` must
>    give `changed: false`. The stored entry's type is mapped through the **same** key function
>    `typesAt` uses (Increment 6).
> 3. **Replaced 2024 Fighter 8 UI check**: the Progression row at 8 lists "Ability Score Improvement /
>    Feat" as a feature line. The ASI choice cards come from `getLevelChoices` and never gated the
>    de-dupe fix (Increment 8).

## Test-infrastructure facts that constrain every spec below

- **Runner:** Vitest 4 (`vitest run`), with no DOM environment. Tests sit beside their source in `client/src/utils/`.
  Existing files: `charSync`, `diceFormula`, `dndHelpers`, `featureUses`, `homebrew`,
  `levelChoices`, `multiclass`, `spellAccess` and `data/localDataService`. `classData.test.js`,
  `subclassData.test.js` and `subclassSpells.test.js` do not exist yet.
- **How a RED shows up.** Earlier runs logged these failure modes (`Docs/increments/2026-09-06-*.md`):
  - **A missing named export** from a module that exists fails **per test** with
    `TypeError: <fn> is not a function`, or with an `undefined` comparison for constants.
  - **A missing module** (for example `import … from './subclassData'` before the file exists) fails the
    **whole test file** at import resolution.
- **`subclassData.test.js` is shared by Increments 1, 2, 3, 5 and 7.** Never add a top-of-file import
  of a module that does not exist yet. That would turn every earlier, already-green test in the file red and
  hide the stated reason. Concretely:
  - Increment 2 reaches the 2024 tables **only through the resolver**.
  - Increment 3 may import `subclassFeatures2024.js` directly, because it exists by then.
  - Increment 4's direct imports of `subclassSpells.js` live in the new `subclassSpells.test.js`.
- **Guard asserts vs. RED asserts.** Several asserts the plan lists already pass against today's
  code. They are regression guards: they stop the implementation from breaking something that works. Each spec
  marks them **[guard]**. The executor must see them **pass** at the RED step and must not treat that as a
  failed gate. Every increment with a unit test still has at least one **[RED]** assert that fails for
  the stated reason.
- **Concrete-value discipline.** Expected lists (2024 subclass names, feature levels, spell lists)
  are **hardcoded in the tests from the plan text**, never read back from the new data module. A test
  that compares a table with itself cannot go red.
- **Order-independent list compares.** Where the plan gives a spell list, compare with
  `[...x].sort()` against the sorted expected list, unless the plan states an order. Subclass lists
  are ordered, as the research table is.
- **`spells.json`.** It has 521 entries shaped `{ name, level, school, classes: ['Wizard', …], … }`, with
  schools capitalised (`'Enchantment'`, `'Evocation'`, …). Import it with
  `import spells from '../data/spells.json'` (Vite JSON import) or read it through `getAllLocalSpells()`.
- **Increments 8–11 are page wiring** (`CharacterSheet.jsx`, `CharacterCreate.jsx`,
  `CharacterEdit.jsx`). There is no component-test setup, so those increments are `Test: n/a`. Their logic
  was deliberately pulled into the Increment 1–7 helpers. Their gates are the build, greps with
  expected output, and UI checks with expected values on the isolated `:5174` origin (plan
  "Verification → Manual / E2E").

**Line references verified 2026-09-27** against HEAD `f925a99` (the working tree is clean apart from the untracked
plan and research files). Every `file:line` the plan cites resolves:
- `classData.js`: `:280`, `:294-306`, `:316/:323`, `:362`, `:379-433`, `:436-439`, `:441-454`, `:462-465`,
  `:474`, `:486-508`, `:556-567`
- `dndHelpers.js`: `:18-26`, `:67-120`
- `multiclass.js`: `:76-92`
- `spellAccess.js`: `:15-34`
- `levelChoices.js`: `:4-5`, `:81-124`, `:140-223`, `:207-209`, `:259-294`
- `featureDescriptions.js`: `:47,84,115,121,130`
- `CharacterSheet.jsx`: `:9`, `:14-15`, `:18`, `:213`, `:401-403`, `:423-433`, `:451`, `:462`, `:742-747`, `:916`,
  `:947-994`, `:987`, `:1014-1015`, `:1047-1048`, `:1052-1068`, `:1089-1097`, `:1143-1144`, `:2314-2349`, `:2505`,
  `:2538`, `:2826-2854`, `:2985`, `:2991-2992`, `:3009-3025`, `:3056-3072`, `:3138-3146`, `:3293-3301`, `:3314`,
  `:3338-3355`, `:4289-4295`, `:4353-4362`
- `CharacterCreate.jsx`: `:12-17`, `:254-274`, `:325-334`, `:343-372`, `:375-395`, `:399-403`, `:487-496`,
  `:863-886`, `:901-924`, `:1211-1216`, `:1334`, `:1373-1393`, `:1409-1441`, `:1697-1705`, `:1798-1860`,
  `:2190-2192`, `:2284-2296`
- `CharacterEdit.jsx`: `:41-99`, `:300-316`, `:357-385`, `:407`, `:610-646`, `:718-727`, `:1343-1352`,
  `:1519-1524`, `:1735`

Minor offsets:
- `FEAT_HP_PER_LEVEL` spans `dndConstants.js:128-130`; the plan cites `:129`.
- The `## vX.X.X — Unreleased` block is at `CHANGELOG.md:29`. It is empty and directly followed by `## v1.8.1` at `:31`.

The plan's claim that "7 subclass spell names are missing from `spells.json`" was spot-checked with `grep`:
- All 7 are absent: Commune, Commune with Nature, Hallow, Starry Wisp, Fount of Moonlight, Rary's Telepathic Bond and Summon Dragon.
- 56 other table names are present, including Blindness/Deafness, Yolande's Regal Presence, Steel Wind Strike, Mind Sliver, Summon
  Aberration/Construct/Celestial/Fey, Dragon's Breath, Aura of Life, Melf's Acid Arrow, Tasha's
  Hideous Laughter, Evard's Black Tentacles and "Pass without Trace" (lower-case *w*).

## Progress

| # | Increment | Status | Red | Green |
|---|-----------|--------|-----|-------|
| 1 | Ruleset-keyed subclass lists and accessors | done | ☑ | ☑ |
| 2 | 2024 feature tables, part 1 (Barbarian–Monk) and the resolver | done | ☑ | ☑ |
| 3 | 2024 feature tables, part 2 (Paladin–Wizard) | done | ☑ | ☑ |
| 4 | Subclass spell tables, EK/AT count table, spell-name check | done | ☑ | ☑ |
| 5 | Third-caster spellcasting and subclass spell access in the pure helpers | done | ☑ | ☑ |
| 6 | Subclass-dependent Progression choices per ruleset | done | ☑ | ☑ |
| 7 | Subclass numbers and ruleset-correct text (2024 de-dupe, Bear Totem, Draconic, placeholders) | done | ☑ | ☑ |
| 8 | Character sheet — subclass features, choices, Level Up, AC/HP/defenses | done | n/a | ☑ |
| 9 | Character sheet — spells (always-prepared, EK/AT, expanded lists) | done | n/a | ☑ |
| 10 | Character creator | done | n/a | ☑ |
| 11 | Character editor | done | n/a | ☑ |
| 12 | Docs and CHANGELOG | done | n/a | ☑ |

---

## Increment 1: Ruleset-keyed subclass lists and accessors
**Status:** done
**Started:** 17:13  **Finished:** 17:14

**What:** Add the 2024 PHB subclass lists and short descriptions in the app's own words, plus the list and choice accessors that
every picker will use. Export `isThirdCaster(cls, subclass)`. Nothing consumes these yet.

**Where:**
- `client/src/utils/subclassData.js` (**new**)
- `client/src/utils/subclassData.test.js` (**new**)
- `client/src/utils/classData.js:462-465`. The private `const isThirdCaster = (c) => …` becomes
  `export function isThirdCaster(cls, subclass)`. Add `export const THIRD_CASTER_SUBCLASSES = { Fighter: 'Eldritch Knight', Rogue: 'Arcane Trickster' }`.
  Update the two internal callers: `isStandardCaster` at `:465` and `getMulticlassCasterLevel` at `:474`, both
  to `isThirdCaster(c.class, c.subclass)`.

**Details:**
- `SUBCLASSES_2024 = { [cls]: { [name]: '<1-2 sentence mechanical desc>' } }`. It holds exactly the names in
  the research table (`Docs/research/2026-09-27-subclass-rules-baseline.md:16-30`), in that order. Artificer is
  **not** duplicated.
- `export const SAME_IN_BOTH_RULESETS = new Set(['Artificer'])`.
- `getSubclasses(cls, ruleset = '2014')` → `string[]`.
  - Any non-`'2024'` ruleset → `CLASSES[cls]?.subclasses || []`. This must be **the same array reference**.
  - `'2024'` → `Object.keys(SUBCLASSES_2024[cls])`. For Artificer, return `CLASSES.Artificer.subclasses`.
  - **Guard an unknown or empty `cls` under 2024 as well (return `[]`)**. See the added assert and Concern 4.
- `getSubclassDesc(cls, subclass, ruleset)` looks in the ruleset's table first, then the other one.
- `subclassEdition(cls, subclass, ruleset)` → `'2014' | '2024' | null`. It returns the ruleset when that ruleset offers the name,
  the other edition when only that one offers it, and `null` otherwise.
- `offeredSubclass(cls, subclass, classLevel, ruleset)` → `subclass` when
  `classLevel >= getSubclassLevel(cls, ruleset)` **and** `getSubclasses(cls, ruleset).includes(subclass)`.
  Otherwise it returns `''`.
- `subclassSelectOptions(cls, current, ruleset)` → `[{ value, label, legacy }]`.
  - It returns the ruleset's list, plus `current` appended when `current` is non-empty and not in the list.
  - The appended label is `"<name> (2014 rules)"` or `"<name> (2024 rules)"`, taken from `subclassEdition`.
    When the edition is `null`, the label is `"<name> (custom)"`.
- Verified: `isThirdCaster` has exactly two call sites, `classData.js:465` and `:474`. Nothing outside
  `classData.js` references it.

**Test spec**
- **File:** `client/src/utils/subclassData.test.js` (new).
  - Imports `{ getSubclasses, getSubclassDesc, subclassEdition, offeredSubclass, subclassSelectOptions, SUBCLASSES_2024, SAME_IN_BOTH_RULESETS } from './subclassData'`.
  - Imports `{ CLASSES, isThirdCaster, THIRD_CASTER_SUBCLASSES, getMulticlassCasterLevel, getMulticlassSpellSlots } from './classData'`.
- **Fixture:** hardcode `const EXPECTED_2024` in the test, copied from the research table/plan:
  - Barbarian `['Path of the Berserker','Path of the Wild Heart','Path of the World Tree','Path of the Zealot']`
  - Bard `['College of Dance','College of Glamour','College of Lore','College of Valor']`
  - Cleric `['Life Domain','Light Domain','Trickery Domain','War Domain']`
  - Druid `['Circle of the Land','Circle of the Moon','Circle of the Sea','Circle of the Stars']`
  - Fighter `['Battle Master','Champion','Eldritch Knight','Psi Warrior']`
  - Monk `['Warrior of Mercy','Warrior of Shadow','Warrior of the Elements','Warrior of the Open Hand']`
  - Paladin `['Oath of Devotion','Oath of Glory','Oath of the Ancients','Oath of Vengeance']`
  - Ranger `['Beast Master','Fey Wanderer','Gloom Stalker','Hunter']`
  - Rogue `['Arcane Trickster','Assassin','Soulknife','Thief']`
  - Sorcerer `['Aberrant Sorcery','Clockwork Sorcery','Draconic Sorcery','Wild Magic Sorcery']`
  - Warlock `['Archfey Patron','Celestial Patron','Fiend Patron','Great Old One Patron']`
  - Wizard `['Abjurer','Diviner','Evoker','Illusionist']`
- **Asserts**:
  - `describe('getSubclasses — 2014 is untouched')`
    - For each of the 13 keys of `CLASSES`: `getSubclasses(cls, '2014')` **`toBe`** `CLASSES[cls].subclasses`. **[RED]**
    - `getSubclasses('Cleric')` (default ruleset) `toBe` `CLASSES.Cleric.subclasses`.
    - `getSubclasses('', '2014')` → `[]`, and `getSubclasses('Nope', '2014')` → `[]`.
  - `describe('getSubclasses — 2024 lists')`
    - For each of the 12 PHB classes: `getSubclasses(cls, '2024')` `toEqual` `EXPECTED_2024[cls]`
      (order matters).
    - `getSubclasses('Artificer', '2024')` `toEqual` `CLASSES.Artificer.subclasses`
      (`['Alchemist','Armorer','Artillerist','Battle Smith']`).
    - `SAME_IN_BOTH_RULESETS.has('Artificer')` → `true`.
    - `getSubclasses('', '2024')` → `[]`. *(Added by the incrementer: the creator renders subclass UI before a class is chosen.
      See Concern 4.)*
    - Every value in `SUBCLASSES_2024[cls]` is a non-empty string.
  - `describe('subclassEdition')`
    - `('Warlock','The Fiend','2024')` → `'2014'` (legacy)
    - `('Fighter','Champion','2024')` → `'2024'` (a shared name resolves to the character's ruleset)
    - `('Fighter','Champion','2014')` → `'2014'`
    - `('Warlock','Fiend Patron','2014')` → `'2024'`
    - `('Wizard','Chronurgy','2014')` → `null`
    - `('Cleric','','2024')` → `null`
    - `('Artificer','Armorer','2024')` → `'2024'`
  - `describe('getSubclassDesc')`
    - `('Cleric','Knowledge Domain','2024')` → `CLASSES.Cleric.subclassDescs['Knowledge Domain']` (falls back to
      the other table).
    - `('Cleric','Life Domain','2024')` → `SUBCLASSES_2024.Cleric['Life Domain']`.
    - `('Cleric','Life Domain','2014')` → `CLASSES.Cleric.subclassDescs['Life Domain']`.
  - `describe('offeredSubclass — the creator save trim')`
    - `('Cleric','Life Domain',2,'2024')` → `''` (below the 2024 subclass level 3)
    - `('Cleric','Life Domain',3,'2024')` → `'Life Domain'` (boundary)
    - `('Cleric','Knowledge Domain',3,'2024')` → `''` (not offered in 2024)
    - `('Cleric','Life Domain',1,'2014')` → `'Life Domain'` (2014 Cleric picks at 1)
    - `('Wizard','School of Evocation',1,'2014')` → `''`, while `…,2,'2014'` → `'School of Evocation'` (2014 Wizard picks at 2)
    - `('Fighter','',3,'2014')` → `''`
  - `describe('subclassSelectOptions — the editor never destroys a value')`
    - `('Cleric','Knowledge Domain','2024')` has length 5. Its last entry `toMatchObject({ value: 'Knowledge Domain', label: 'Knowledge Domain (2014 rules)', legacy: true })`.
    - `('Cleric','Life Domain','2024')` has length 4, with no appended entry.
    - `('Cleric','','2024')` has length 4.
    - `('Wizard','Chronurgy','2014')` has length 9. Its last entry `toMatchObject({ value: 'Chronurgy', label: 'Chronurgy (custom)' })`.
    - `('Warlock','Fiend Patron','2014')` ends with `label: 'Fiend Patron (2024 rules)'`.
  - `describe('isThirdCaster keys on (class, subclass)')`
    - `isThirdCaster('Fighter','Eldritch Knight')` → `true`. **[RED]**
    - `isThirdCaster('Rogue','Arcane Trickster')` → `true`.
    - `isThirdCaster('Fighter','Champion')` → `false`.
    - `isThirdCaster('Rogue','Thief')` → `false`.
    - `isThirdCaster('Wizard','Eldritch Knight')` → `false`.
    - `THIRD_CASTER_SUBCLASSES` `toEqual` `{ Fighter: 'Eldritch Knight', Rogue: 'Arcane Trickster' }`.
    - **[guard]** `getMulticlassCasterLevel([{ class: 'Fighter', subclass: 'Eldritch Knight', level: 9 }])` → `3`.
      This locks the two renamed internal callers.
    - **[guard]** `getMulticlassSpellSlots([{ class:'Wizard', subclass:'', level:5 }, { class:'Fighter', subclass:'Eldritch Knight', level:6 }]).standard`
      → `[4,3,3,1,0,0,0,0,0]` (caster level 5 + 2 = 7).
- **Must fail before implementation because:** `subclassData.js` does not exist, so the whole test file
  fails at import resolution. Once the module exists, `isThirdCaster` and `THIRD_CASTER_SUBCLASSES` are
  still not exported from `classData.js` (`TypeError: isThirdCaster is not a function`). The two
  `getMulticlass*` asserts are guards and pass today.

**Gates**
- ☑ **RED**: test written and run with `npm test`. The file is observed **failing** at import resolution of
  `./subclassData`. All other test files are still green.
- ☑ **GREEN**: implementation done. The full suite passes and `npx vite build` is clean.
  `rg -n "isThirdCaster\(c\)" client/src` returns nothing.

**Verify:** `cd client && npm test` + `npx vite build` + the `rg` above.

**Log:**
- **RED** (17:13): `subclassData.test.js` written from the spec. `npm test` →
  `FAIL src/utils/subclassData.test.js … Error: Cannot find module './subclassData' imported from …/subclassData.test.js`;
  `Test Files  1 failed | 9 passed (10)`, `Tests  199 passed (199)`. Failing at import resolution, as stated; all other files green.
- **GREEN** (17:14): `npm test` → `Test Files  10 passed (10)`, `Tests  215 passed (215)` (16 new).
  `npx vite build --outDir <scratch>/dist` → `✓ built in 1.82s` (only the pre-existing chunk-size warning).
  `rg -n "isThirdCaster\(c\)" client/src` → no output (exit 1). Undeclared-identifier checker → `no undeclared identifiers`.

**Changed:**
- `client/src/utils/subclassData.js` (new) — `SUBCLASSES_2024` (12 classes × 4, own-words descriptions), `SAME_IN_BOTH_RULESETS`,
  `getSubclasses`, `getSubclassDesc`, `subclassEdition`, `offeredSubclass`, `subclassSelectOptions`. Imports only `classData`.
- `client/src/utils/classData.js` (~line 462) — private `isThirdCaster(c)` → `export function isThirdCaster(cls, subclass)` keyed on the new
  exported `THIRD_CASTER_SUBCLASSES`; the two internal callers (`isStandardCaster`, `getMulticlassCasterLevel`) now pass `(c.class, c.subclass)`.
- `client/src/utils/subclassData.test.js` (new) — 16 tests (2 guards: the multiclass caster level / slots).

**Notes:** `getSubclasses` guards an empty/unknown class under 2024 (`[]`), per Concern 4. `getSubclassDesc('')` returns `''`.

---

## Increment 2: 2024 feature tables, part 1 (Barbarian–Monk) and the resolver
**Status:** done
**Started:** 17:15  **Finished:** 17:18

**What:** Add `SUBCLASS_FEATURES_2024` for Barbarian, Bard, Cleric, Druid, Fighter and Monk. Add the resolver
`getSubclassFeatures` and the display list `listSubclassFeatures`.

**Where:**
- `client/src/utils/subclassFeatures2024.js` (**new**)
- `client/src/utils/subclassData.js`: adds `getSubclassFeatures` and `listSubclassFeatures`. It imports
  `SUBCLASS_FEATURES` from `./subclassFeatures` and `SUBCLASS_FEATURES_2024` from `./subclassFeatures2024`.
- `client/src/utils/subclassData.test.js`

**Details:**
- Shape: `{ [subclass]: { [level]: { name, desc } } }`, one entry per level. Descriptions are 1-3 sentences, mechanical, and in the app's own
  words. Feature names per level come verbatim from the plan's tables (Increment 2, Barbarian–Monk). For example:
  - Life Domain 3 = `Disciple of Life, Life Domain Spells & Preserve Life`
  - Champion 7 = `Additional Fighting Style`
- `getSubclassFeatures(cls, subclass, ruleset = '2014')` → `{ edition, legacy, features } | null`:
  - The ruleset offers the name → `features` is `SUBCLASS_FEATURES_2024[subclass]` when `ruleset === '2024' && !SAME_IN_BOTH_RULESETS.has(cls)`,
    else `SUBCLASS_FEATURES[subclass]`. `legacy` is `false`.
  - Only the other ruleset offers the name → that ruleset's table, `legacy: true`, and `edition` set to that ruleset.
  - Otherwise → `null`. A missing table entry → `null`, never the other edition's table.
  - Until Increment 3, a 2024 Paladin–Wizard subclass resolves to `null` through this "missing entry" branch. Do **not**
    assert that, because Increment 3 fills those entries.
- `listSubclassFeatures(cls, subclass, ruleset, maxLevel)` → `[{ level, name, desc, edition, legacy }]`. It is sorted by
  numeric level and filtered to `level <= maxLevel`. It returns `[]` when the resolver returns `null`.

**Test spec**
- **File:** `client/src/utils/subclassData.test.js`.
  - Add `getSubclassFeatures` and `listSubclassFeatures` to the existing `./subclassData` import.
  - Add `import { SUBCLASS_FEATURES } from './subclassFeatures'` (the module exists).
  - **Do not import `./subclassFeatures2024` in this increment.** Reach 2024 data through the resolver.
- **Fixture:** `const LEVELS_2024 = { Barbarian:[3,6,10,14], Bard:[3,6,14], Cleric:[3,6,17], Druid:[3,6,10,14], Fighter:[3,7,10,15,18], Monk:[3,6,11,17] }`.
  Increment 3 extends it.
- **Asserts**:
  - `describe('getSubclassFeatures — 2014 resolves to the untouched table')`
    - For every `cls` in `CLASSES` and every `sc` in `CLASSES[cls].subclasses`:
      `getSubclassFeatures(cls, sc, '2014')` is non-null, its `.features` **`toBe`** `SUBCLASS_FEATURES[sc]`,
      and `.legacy === false`. **[RED]**
  - `describe('getSubclassFeatures — 2024 part 1 completeness')`
    - For each class in `LEVELS_2024` and each `sc` of `getSubclasses(cls,'2024')`, `r = getSubclassFeatures(cls, sc, '2024')`:
      - `r` is non-null, with the failure message naming `cls/sc`
      - `r.legacy === false`
      - `Object.keys(r.features).map(Number).sort((a,b)=>a-b)` `toEqual` `LEVELS_2024[cls]`
      - every entry has a non-empty string `name` and `desc`
    - Spot names, verbatim from the plan:
      - `getSubclassFeatures('Fighter','Champion','2024').features[7].name` → `'Additional Fighting Style'`
      - `…Champion…features[3].name` → `'Improved Critical & Remarkable Athlete'`
      - `getSubclassFeatures('Cleric','Life Domain','2024').features[3].name` → `'Disciple of Life, Life Domain Spells & Preserve Life'`
    - A shared name is edition-specific: `getSubclassFeatures('Cleric','Life Domain','2024').features`
      `not.toBe` `SUBCLASS_FEATURES['Life Domain']`, and its keys are `[3,6,17]`. The 2014 Life Domain keys stay `[1,2,6,8,17]`.
  - `describe('getSubclassFeatures — legacy, Artificer, unknown')`
    - `getSubclassFeatures('Cleric','Knowledge Domain','2024')` `toMatchObject({ edition: '2014', legacy: true })`.
      Its `.features` `toBe` `SUBCLASS_FEATURES['Knowledge Domain']`, with keys `[1,2,6,8,17]`.
    - `getSubclassFeatures('Artificer','Armorer','2024')`: `.legacy === false`, and `.features` `toBe` `SUBCLASS_FEATURES.Armorer`.
    - `getSubclassFeatures('Wizard','Chronurgy','2014')` → `null`.
    - `getSubclassFeatures('Cleric','','2024')` → `null`.
  - `describe('listSubclassFeatures')`
    - `('Cleric','Knowledge Domain','2014',6).map(f => f.level)` → `[1,2,6]`, each with `legacy: false` and `edition: '2014'`.
    - `('Cleric','Knowledge Domain','2024',20)` has 5 entries, all with `legacy: true` and `edition: '2014'`.
    - `('Fighter','Champion','2024',7).map(f => f.level)` → `[3,7]`.
    - `('Fighter','Champion','2024',2)` → `[]`.
    - `('Fighter','Champion','2014',20).map(f => f.level)` → `[3,7,10,15,18]`. This matches the 2014 file and is numeric order.
    - `('Wizard','Chronurgy','2014',20)` → `[]`.
- **Must fail before implementation because:** `getSubclassFeatures` and `listSubclassFeatures` are not
  exported from `subclassData.js` yet. Every new test fails with `TypeError: getSubclassFeatures is not a
  function`, while Increment 1's tests in the same file stay green.

**Gates**
- ☑ **RED**: the new describes are written and observed failing with `… is not a function`. Increment 1's tests
  still pass.
- ☑ **GREEN**: implementation done. The full suite passes and `npx vite build` is clean.

**Verify:** `cd client && npm test` + `npx vite build`.

**Log:**
- **RED** (17:16): 5 describes / 8 tests appended (imports `getSubclassFeatures`, `listSubclassFeatures` from `./subclassData`
  and `SUBCLASS_FEATURES` from `./subclassFeatures`; no import of `./subclassFeatures2024`). `npm test` →
  `Test Files  1 failed | 9 passed (10)`, `Tests  8 failed | 215 passed (223)`; every failure is
  `TypeError: getSubclassFeatures is not a function` (7) or `TypeError: listSubclassFeatures is not a function` (1). Increment 1's 16 tests still pass.
- **GREEN** (17:18): `npm test` → `Test Files  10 passed (10)`, `Tests  223 passed (223)`.
  Build → `✓ built in 1.64s`. Undeclared checker → `no undeclared identifiers`.

**Changed:**
- `client/src/utils/subclassFeatures2024.js` (new) — `SUBCLASS_FEATURES_2024` for Barbarian, Bard, Cleric, Druid, Fighter, Monk
  (24 subclasses), names verbatim from the plan tables, 1-3 sentence own-words descriptions.
- `client/src/utils/subclassData.js` — imports `SUBCLASS_FEATURES` / `SUBCLASS_FEATURES_2024`; adds `getSubclassFeatures` (edition via
  `subclassEdition`, missing entry → `null`) and `listSubclassFeatures` (`[]` when unresolved).
- `client/src/utils/subclassData.test.js` — 8 tests.

---

## Increment 3: 2024 feature tables, part 2 (Paladin–Wizard)
**Status:** done
**Started:** 17:17  **Finished:** 17:19

**What:** Finish `SUBCLASS_FEATURES_2024` for Paladin, Ranger, Rogue, Sorcerer, Warlock and Wizard. Lock
completeness for all twelve classes and guard against 2014 text leaking into 2024 descriptions.

**Where:**
- `client/src/utils/subclassFeatures2024.js`
- `client/src/utils/subclassData.test.js`

**Details:**
- The shape and writing rules are the same as Increment 2. Names per level come verbatim from the plan's Paladin–Wizard tables.
- The Draconic Sorcery level-3 description must state both numbers:
  - HP maximum +3, then +1 per later Sorcerer level;
  - unarmored AC 10 + DEX + CHA.

**Test spec**
- **File:** `client/src/utils/subclassData.test.js`. Now add `import { SUBCLASS_FEATURES_2024 } from './subclassFeatures2024'`, because the module exists after Increment 2.
- **Fixture:** extend `LEVELS_2024` with `Paladin:[3,7,15,20], Ranger:[3,7,11,15], Rogue:[3,9,13,17], Sorcerer:[3,6,14,18], Warlock:[3,6,10,14], Wizard:[3,6,10,14]`.
- **Asserts**:
  - `describe('getSubclassFeatures — 2024 completeness, all classes')`
    - Change the Increment 2 completeness loop to iterate **all 12** keys of `LEVELS_2024` (every class except Artificer). **[RED]** for the six part-2 classes.
    - Spot names, verbatim from the plan, which Increment 8's UI checks rely on:
      - `getSubclassFeatures('Wizard','Evoker','2024').features[10].name` → `'Empowered Evocation'`, and `[14].name` → `'Overchannel'`
      - `getSubclassFeatures('Ranger','Hunter','2024').features[7].name` → `'Defensive Tactics'`, and `[11].name` → `"Superior Hunter's Prey"`
      - `getSubclassFeatures('Rogue','Arcane Trickster','2024').features[3].name` → `'Spellcasting & Mage Hand Legerdemain'`
    - `getSubclassFeatures('Sorcerer','Draconic Sorcery','2024').features[3].desc` matches `/\+3/` **and**
      `/(CHA|Charisma)/`. This locks the plan's "must state both numbers" requirement.
  - `describe('SUBCLASS_FEATURES_2024 hygiene')`
    - **[guard]** Every key of `SUBCLASS_FEATURES_2024` is in the union of `getSubclasses(cls,'2024')` over the 12 classes.
    - **[guard]** No `desc` anywhere in `SUBCLASS_FEATURES_2024` contains `'at level 1'`, `'1st level'` or `'2nd level'`.
- **Must fail before implementation because:** the six part-2 classes have no entries yet, so
  `getSubclassFeatures(<part-2 class>, sc, '2024')` returns `null` through the "missing table entry" branch.
  The completeness test's non-null assert fails, naming, for example, `Paladin/Oath of Devotion`. The two hygiene asserts are
  guards: they pass over the part-1 data and must stay green.

**Gates**
- ☑ **RED**: the loop is extended and observed failing on the part-2 classes. The hygiene asserts pass.
- ☑ **GREEN**: all 12 classes are complete. The full suite passes and `npx vite build` is clean.

**Verify:** `cd client && npm test` + `npx vite build`.

**Log:**
- **RED** (17:18): `LEVELS_2024` extended to all 12 classes (loop renamed "2024 completeness, all classes"), spot-name / Draconic /
  hygiene describes added, `SUBCLASS_FEATURES_2024` now imported directly. `npm test` → `Tests  3 failed | 224 passed (227)`:
  `AssertionError: Paladin/Oath of Devotion: expected null not to be null`, and the two spot tests
  `TypeError: Cannot read properties of null (reading 'features')` (the part-2 entries resolve to `null` via the missing-entry branch).
  Both [guard] hygiene tests passed.
- First GREEN attempt: 1 failure — the Draconic description said "increases by 3" and did not match `/\+3/`; reworded to "HP maximum +3, then +1 more…".
- **GREEN** (17:19): `npm test` → `Test Files  10 passed (10)`, `Tests  227 passed (227)`. Build → `✓ built in 1.69s`.
  Undeclared checker → `no undeclared identifiers`.

**Changed:**
- `client/src/utils/subclassFeatures2024.js` — Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard tables (24 subclasses; 48 in total).
  Draconic Sorcery L3 states HP +3 (+1 per later Sorcerer level) and unarmored AC 10 + DEX + CHA.
- `client/src/utils/subclassData.test.js` — 4 tests (2 guards).

---

## Increment 4: Subclass spell tables, EK/AT count table, spell-name check
**Status:** done
**Started:** 17:19  **Finished:** 17:21

**What:** Add pure data tables for subclass-granted spells in both rulesets and the `THIRD_CASTER_PROGRESSION`
table, which isolates the least-certain 2024 counts. Also add `THIRD_CASTER_SLOTS`, `getSubclassSpells`, and a check that every spell
name exists in `spells.json`.

**Where:**
- `client/src/utils/subclassSpells.js` (**new**, **no imports**)
- `client/src/utils/subclassSpells.test.js` (**new**)
- `client/src/utils/subclassData.js`: `getSubclassSpells`
- `client/src/utils/classData.js`, near the slot tables (`:362`): `export const THIRD_CASTER_SLOTS`

**Details:** The tables are verbatim from the plan: `SUBCLASS_SPELLS_2014`, `LAND_SPELLS_2014`, `SUBCLASS_SPELLS_2024`,
`LAND_SPELLS_2024`, `SUBCLASS_SPELLS_NOT_IN_DATA`, `allSubclassSpellNames()` and `THIRD_CASTER_PROGRESSION`. Use these exact
spellings: `Melf's Acid Arrow`, `Tasha's Hideous Laughter`, `Evard's Black Tentacles`,
`Protection from Evil and Good` and `Pass without Trace`.
- **Warlock expanded lists** are keyed by **spell level** (`keyedBy: 'spellLevel'`).
- **`getSubclassSpells(cls, subclass, classLevel, ruleset, { land } = {})`** → `{ alwaysPrepared, expanded, edition }`:
  - The table is chosen by `subclassEdition`.
  - Class-level rows are included when `<= classLevel`.
  - Warlock spell-level rows are included up to the inlined mapping 1→1, 3→2, 5→3, 7→4, 9→5. **Do not import `dndHelpers`.**
  - Circle of the Land reads `land` from whichever land table contains it. With no land, `alwaysPrepared` is `[]`.
  - A subclass with no spell table (Champion, Eldritch Knight, unknown) → `{ alwaysPrepared: [], expanded: [] }`.
- **`THIRD_CASTER_SLOTS`** is keyed by class level, holds 4-element arrays, and has no entries at levels 1–2.

**Test spec**
- **File:** `client/src/utils/subclassSpells.test.js` (new).
  - Imports `* as S from './subclassSpells'`, `{ getSubclassSpells } from './subclassData'` and `{ THIRD_CASTER_SLOTS } from './classData'`.
  - Imports `spells from '../data/spells.json'`, with `const have = new Set(spells.map(s => s.name))`.
- **Asserts** (compare spell lists as sorted arrays):
  - `describe('subclass spell names exist in spells.json')`
    - Every name in `S.allSubclassSpellNames()` is in `have` or in `S.SUBCLASS_SPELLS_NOT_IN_DATA`. **[RED]**
    - Every member of `SUBCLASS_SPELLS_NOT_IN_DATA` is **absent** from `have`, so adding a spell later
      forces the set to be cleaned.
    - `[...S.SUBCLASS_SPELLS_NOT_IN_DATA].sort()` `toEqual`
      `['Commune','Commune with Nature','Fount of Moonlight','Hallow',"Rary's Telepathic Bond",'Starry Wisp','Summon Dragon']`.
  - `describe('getSubclassSpells — 2014 always-prepared (class-level rows)')`
    - `getSubclassSpells('Cleric','Life Domain',1,'2014').alwaysPrepared` → `['Bless','Cure Wounds']`
    - The same at level 5 → `['Beacon of Hope','Bless','Cure Wounds','Lesser Restoration','Revivify','Spiritual Weapon']`
    - The same at level 9 → 10 names, including `'Mass Cure Wounds'` and `'Raise Dead'`
    - `…,'Light Domain',1,'2014'` → `['Burning Hands','Faerie Fire','Light']` (the bonus cantrip)
    - `…,'Paladin','Oath of Devotion',3,'2014'` → `['Protection from Evil and Good','Sanctuary']`
    - `…,'Paladin','Oath of Devotion',2,'2014'` → `[]`
    - `…,'Paladin','Oath of Glory',17,'2014'` includes `'Commune'` and `'Flame Strike'` (Theros)
  - `describe('getSubclassSpells — 2024 always-prepared')`
    - `('Cleric','Life Domain',2,'2024').alwaysPrepared` → `[]` (below 3)
    - `('Cleric','Life Domain',3,'2024')` → `['Aid','Bless','Cure Wounds','Lesser Restoration']`
    - `('Cleric','Life Domain',5,'2024')` → `['Aid','Bless','Cure Wounds','Lesser Restoration','Mass Healing Word','Revivify']`
    - `('Paladin','Oath of Devotion',3,'2024')` → `['Protection from Evil and Good','Shield of Faith']`. Same name, different edition table.
    - `('Paladin','Oath of Glory',17,'2024')` includes `'Legend Lore'` and `"Yolande's Regal Presence"`, not `'Commune'`
    - `('Druid','Circle of the Stars',9,'2024')` → `['Guidance','Guiding Bolt']`
    - `('Warlock','Fiend Patron',3,'2024')` → `['Burning Hands','Command','Scorching Ray','Suggestion']`
    - `('Warlock','Fiend Patron',5,'2024').alwaysPrepared` includes `'Fireball'`. The `.expanded` of the same call → `[]`, with `edition: '2024'`
  - `describe('getSubclassSpells — 2014 Warlock expanded (spell-level rows)')`
    - `('Warlock','The Fiend',1,'2014')` → `alwaysPrepared: []`, `expanded` `['Burning Hands','Command']`
    - `('Warlock','The Fiend',5,'2014').expanded` → `['Blindness/Deafness','Burning Hands','Command','Fireball','Scorching Ray','Stinking Cloud']`,
      with `alwaysPrepared: []`
    - `('Warlock','The Fiend',9,'2014').expanded` has 10 names, including `'Flame Strike'` and `'Hallow'`
    - `('Warlock','The Fiend',5,'2024')` (legacy) → `expanded` equals the level-5 2014 list, `alwaysPrepared: []`, `edition: '2014'`
  - `describe('getSubclassSpells — Circle of the Land')`
    - `('Druid','Circle of the Land',3,'2024',{ land: 'Arid' }).alwaysPrepared` → `['Blur','Burning Hands','Fire Bolt']`
    - `('Druid','Circle of the Land',3,'2024',{ land: 'Polar' })` → `['Fog Cloud','Hold Person','Ray of Frost']`
    - `('Druid','Circle of the Land',3,'2024')` (no land) → `[]`
    - `('Druid','Circle of the Land',3,'2014',{ land: 'Arctic' })` → `['Hold Person','Spike Growth']`
    - `('Druid','Circle of the Land',9,'2014',{ land: 'Arctic' })` → 8 names, including `'Freedom of Movement'`, `'Ice Storm'` and `'Cone of Cold'`
    - `('Druid','Circle of the Land',2,'2014',{ land: 'Arctic' })` → `[]`, because rows start at druid level 3
    - Legacy land: `('Druid','Circle of the Land',3,'2024',{ land: 'Forest' })` → `['Barkskin','Spider Climb']`.
      This is the plan's "2024 saves that already hold a 2014 land" case.
  - `describe('getSubclassSpells — no table')`
    - `('Fighter','Champion',10,'2014')` and `('Fighter','Eldritch Knight',10,'2014')` → `alwaysPrepared: []` and `expanded: []`
  - `describe('THIRD_CASTER_PROGRESSION')`
    - Every array under both rulesets and both subclasses has `length === 20` and is non-decreasing.
    - `S.THIRD_CASTER_PROGRESSION['2014']['Eldritch Knight']`:
      - `cantrips[2]` (level 3) → `2`, `cantrips[9]` (level 10) → `3`
      - `spells[2]` → `3`, `spells[9]` → `7`, `spells[19]` → `13`
      - `type: 'known'`, `schools: ['Abjuration','Evocation']`, `anySchoolLevels: [3,8,14,20]`, `alwaysKnownCantrips: []`
    - `…['2014']['Arcane Trickster']`: `cantrips[2]` → `3`, `cantrips[9]` → `4`, `schools: ['Enchantment','Illusion']`,
      `alwaysKnownCantrips: ['Mage Hand']`.
    - `…['2024']['Eldritch Knight']`: `type: 'prepared'`, `schools: null`, `anySchoolLevels: []`, and the `spells` array
      equals the 2014 one.
    - `…['2024']['Arcane Trickster'].alwaysKnownCantrips` → `['Mage Hand']`.
  - `describe('THIRD_CASTER_SLOTS')`
    - `THIRD_CASTER_SLOTS[2] ?? null` → `null`
    - `[3]` → `[2,0,0,0]`, `[6]` → `[3,0,0,0]`, `[7]` → `[4,2,0,0]`, `[10]` → `[4,3,0,0]`
    - `[13]` → `[4,3,2,0]`, `[16]` → `[4,3,3,0]`, `[19]` → `[4,3,3,1]`, `[20]` → `[4,3,3,1]`
- **Must fail before implementation because:** `subclassSpells.js` does not exist, so the new file
  fails at import resolution of `./subclassSpells`. In the partial state (module added, accessor not yet written),
  `getSubclassSpells` is not a function and `THIRD_CASTER_SLOTS` is `undefined`.

**Gates**
- ☑ **RED**: `subclassSpells.test.js` written and observed failing at import resolution. Other files are green.
- ☑ **GREEN**: tables and accessor done. The full suite passes and `npx vite build` is clean. The script below prints
  exactly the expected array.

**Verify:** `cd client && npm test` + `npx vite build`, plus the plan's script, which must print
`["Commune","Commune with Nature","Fount of Moonlight","Hallow","Rary's Telepathic Bond","Starry Wisp","Summon Dragon"]`:
```
cd client && node --input-type=module -e "import fs from 'node:fs'; const m = await import('./src/utils/subclassSpells.js'); const have = new Set(JSON.parse(fs.readFileSync('src/data/spells.json','utf8')).map(s => s.name)); console.log(JSON.stringify([...m.allSubclassSpellNames()].filter(n => !have.has(n)).sort()))"
```
The script works because `client/package.json` has `"type": "module"`. It fails if `subclassSpells.js` gains an
import, which is the point of the "no imports" rule.

**Log:**
- **RED** (17:20): `subclassSpells.test.js` written (19 tests). `npm test` →
  `FAIL src/utils/subclassSpells.test.js … Error: Cannot find module './subclassSpells' imported from …/subclassSpells.test.js`;
  `Test Files  1 failed | 10 passed (11)`, `Tests  227 passed (227)`. Import-resolution failure, as stated.
- **GREEN** (17:21): `npm test` → `Test Files  11 passed (11)`, `Tests  246 passed (246)`. Build → `✓ built in 1.67s`.
  Undeclared checker → `no undeclared identifiers`. Plan script →
  `["Commune","Commune with Nature","Fount of Moonlight","Hallow","Rary's Telepathic Bond","Starry Wisp","Summon Dragon"]` (exact match).

**Changed:**
- `client/src/utils/subclassSpells.js` (new, no imports) — `SUBCLASS_SPELLS_2014` (7 domains, 4 oaths incl. Theros Glory, 3 expanded
  patrons keyed by spell level), `LAND_SPELLS_2014` (8 lands, full 8 spells), `SUBCLASS_SPELLS_2024`, `LAND_SPELLS_2024`,
  `SUBCLASS_SPELLS_NOT_IN_DATA`, `allSubclassSpellNames()`, `THIRD_CASTER_PROGRESSION` under the "⚠ LEAST-CERTAIN DATA" header.
  2024 Ancients/Vengeance reuse the 2014 entries by reference (same lists per the plan).
- `client/src/utils/classData.js` — `export const THIRD_CASTER_SLOTS` (levels 3-20, 4-slot arrays) above the slot docs comment.
- `client/src/utils/subclassData.js` — imports the spell tables; `getSubclassSpells` with the inlined warlock mapping
  (`min(5, ceil(level/2))`), Land lookup across both land tables.

---

## Increment 5: Third-caster spellcasting and subclass spell access in the pure helpers
**Status:** done
**Started:** 17:21  **Finished:** 17:25

**What:** Make slots, caster classes, spell limits, max spell level and spell-list access subclass-aware
for EK/AT. Add the helpers that turn subclass spells into sheet data.

**Where:**
- `client/src/utils/classData.js`:
  - `:441-454` `getSpellSlots(className, level, ruleset = '2014', subclass = '')`
  - `:486-508` `getMulticlassSpellSlots`: pass `c.subclass` at `:495` and delete the stale comment at `:496`
  - new exports `spellcastingAbilityFor` and `spellListClassFor`
- `client/src/utils/multiclass.js:76-92`: `spellcastingStartLevel(className, ruleset, subclass = '')` and `getSpellcastingClasses`
- `client/src/utils/dndHelpers.js:67-120`: `maxSpellLevel(…, subclass = '')` and `getSpellInfo(…, subclass = '')`. Import
  `thirdCasterSpellInfo` from `./subclassData`, which must not import `dndHelpers` (acyclic).
- `client/src/utils/subclassData.js`: `thirdCasterSpellInfo` and `thirdCasterSchoolStatus`
- `client/src/utils/spellAccess.js:15-34`: `allowedSpellClasses` changes. Add new `extraSpellNames`,
  `getAlwaysPreparedSpells`, `resolveSheetSpells` and `spellLimitCounts`.
- Tests:
  - `classData.test.js` (**new**)
  - `multiclass.test.js`
  - `dndHelpers.test.js`
  - `spellAccess.test.js`
  - `subclassData.test.js`

**Details:** Follow the plan exactly. Return shapes that the plan leaves implicit are pinned here so the specs can assert them
(see Concern 5):
- `thirdCasterSpellInfo(cls, subclass, level, ruleset)`:
  - Returns `null` unless the class is a third caster at level ≥ 3.
  - Otherwise returns `{ cantrips, spells, type, maxLevel, schools, anySchool, alwaysKnownCantrips }`, where:
    - `cantrips` = the table total − `alwaysKnownCantrips.length`
    - `maxLevel` is 1 at 3, 2 at 7, 3 at 13 and 4 at 19
    - `anySchool` = the count of `anySchoolLevels <= level`, which is always 0 under 2024
- `thirdCasterSchoolStatus({ info, pickedSpells, otherListClasses })` → `{ offSchool, allowed, atLimit }`:
  - `offSchool` counts **leveled** picks whose `classes` include `'Wizard'`, whose `school` is not in `info.schools`, and whose
    `classes` share no entry with `otherListClasses`. Compare case-insensitively.
  - `allowed = info.anySchool`, and `atLimit = offSchool >= allowed`.
  - `schools === null` → `atLimit: false`.
- `resolveSheetSpells({ preparedNames, alwaysPrepared, allSpells })` → **`{ spells, missing }`**. `alwaysPrepared` is
  `[{ name, source }]`, which is `getAlwaysPreparedSpells`' shape.
- `getAlwaysPreparedSpells(char)` → `[{ name, source }]`, where `source` is the subclass name (for example `'Life Domain'`,
  `'Arcane Trickster'`).

**Test spec**
- **Files and asserts:**
  - **`classData.test.js`** (new): `import { CLASSES, getSpellSlots, getMulticlassSpellSlots, spellcastingAbilityFor, spellListClassFor } from './classData'`.
    - `describe('getSpellSlots — third casters')`
      - `getSpellSlots('Fighter',3,'2014','Eldritch Knight')` → `[2,0,0,0]` **[RED]**
      - `getSpellSlots('Fighter',7,'2014','Eldritch Knight')` → `[4,2,0,0]`
      - `getSpellSlots('Rogue',19,'2024','Arcane Trickster')` → `[4,3,3,1]`
      - `getSpellSlots('Rogue',20,'2014','Arcane Trickster')` → `[4,3,3,1]`
      - **[guard]** `getSpellSlots('Fighter',2,'2014','Eldritch Knight')` → `null`, and `getSpellSlots('Fighter',5,'2014','Champion')` → `null`
      - **[guard]** For every class in `CLASSES` except Fighter/Rogue, every level 1–20, and both rulesets:
        `getSpellSlots(c,l,r,'X')` `toEqual` `getSpellSlots(c,l,r)`
    - `describe('getMulticlassSpellSlots — single third caster')`
      - `getMulticlassSpellSlots([{ class:'Fighter', subclass:'Eldritch Knight', level:7 }]).standard` → `[4,2,0,0]` **[RED]**
      - **[guard]** Wizard 5 + EK Fighter 6 → `.standard` `[4,3,3,1,0,0,0,0,0]`
    - `describe('spellcastingAbilityFor / spellListClassFor')`
      - `spellcastingAbilityFor('Fighter','Eldritch Knight')` → `'intelligence'` **[RED]**
      - `spellcastingAbilityFor('Rogue','Arcane Trickster')` → `'intelligence'`
      - `spellcastingAbilityFor('Fighter','Champion')` → `null`
      - `spellcastingAbilityFor('Cleric','')` → `'wisdom'`
      - `spellListClassFor('Fighter','Eldritch Knight')` → `'Wizard'`
      - `spellListClassFor('Rogue','Arcane Trickster')` → `'Wizard'`
      - `spellListClassFor('Cleric','Life Domain')` → `'Cleric'`
  - **`multiclass.test.js`**: add `spellcastingStartLevel` to the import.
    - `describe('getSpellcastingClasses — third casters')`
      - `getSpellcastingClasses({ class:'Fighter', subclass:'Eldritch Knight', level:3, ruleset:'2014' })` `toEqual`
        `[{ class:'Fighter', subclass:'Eldritch Knight', level:3, ability:'intelligence' }]` **[RED]**
      - `…{ class:'Rogue', subclass:'Arcane Trickster', level:3, ruleset:'2024' }` → one entry with `ability:'intelligence'`
      - **[guard]** `…{ class:'Fighter', subclass:'Eldritch Knight', level:2 }` → `[]`, and `…{ class:'Fighter', subclass:'Champion', level:10 }` → `[]`
      - Multiclass: `{ ruleset:'2014', class:'Wizard', level:11, classes:[{ class:'Wizard', level:5 }, { class:'Fighter', subclass:'Eldritch Knight', level:6 }] }`
        `.map(c => c.class)` → `['Wizard','Fighter']`
    - `describe('spellcastingStartLevel')`
      - `('Fighter','2014','Eldritch Knight')` → `3`
      - `('Rogue','2024','Arcane Trickster')` → `3`
      - **[guard]** `('Paladin','2014')` → `2`, and `('Paladin','2024')` → `1`
    - All existing Paladin/Ranger cases still pass.
  - **`dndHelpers.test.js`**: add `getSpellInfo` to the import and `import { CLASSES } from './classData'`.
    - `describe('maxSpellLevel — third casters')`
      - `maxSpellLevel('Fighter',3,'2014','Eldritch Knight')` → `1` **[RED]**
      - `…,7,…` → `2`, `…,13,…` → `3`, `…,19,…` → `4`
      - **[guard]** `maxSpellLevel('Fighter',2,'2014','Eldritch Knight')` → `0`, `maxSpellLevel('Fighter',20,'2014','Champion')` → `0`,
        and `maxSpellLevel('Fighter',3,'2014')` → `0`
    - `describe('getSpellInfo — third casters')`
      - `getSpellInfo('Fighter',10,3,CLASSES,'2014','Eldritch Knight')` `toEqual` `{ cantrips:3, spellsKnown:7, type:'known', maxLevel:2 }` **[RED]**
      - `getSpellInfo('Fighter',10,3,CLASSES,'2024','Eldritch Knight')` `toEqual` `{ cantrips:3, prepareCount:7, type:'prepared', maxLevel:2 }`
      - `getSpellInfo('Rogue',3,3,CLASSES,'2014','Arcane Trickster')` `toEqual` `{ cantrips:2, spellsKnown:3, type:'known', maxLevel:1 }`
      - **[guard]** `getSpellInfo('Fighter',2,3,CLASSES,'2014','Eldritch Knight')` → `null`, and `…('Fighter',10,…,'Champion')` → `null`
      - **[guard]** For every class except Fighter/Rogue, levels 1–20, both rulesets, and `abilityMod` 3:
        `getSpellInfo(c,l,3,CLASSES,r,'X')` `toEqual` `getSpellInfo(c,l,3,CLASSES,r)`
  - **`subclassData.test.js`**: add `thirdCasterSpellInfo` and `thirdCasterSchoolStatus` to the import.
    - `describe('thirdCasterSpellInfo')`
      - `('Fighter','Eldritch Knight',3,'2014')` `toEqual`
        `{ cantrips:2, spells:3, type:'known', maxLevel:1, schools:['Abjuration','Evocation'], anySchool:1, alwaysKnownCantrips:[] }` **[RED]**
      - `('Rogue','Arcane Trickster',3,'2014').cantrips` → `2`, because the table's 3 includes Mage Hand
      - `('Rogue','Arcane Trickster',10,'2024').cantrips` → `3`
      - `('Fighter','Eldritch Knight',7,'2014').anySchool` → `1`, `…8…` → `2`, `…14…` → `3`, `…20…` → `4`
      - `('Fighter','Eldritch Knight',20,'2014')`: `spells` → `13`, `cantrips` → `3`, `maxLevel` → `4`
      - `('Fighter','Eldritch Knight',10,'2024')` `toMatchObject({ spells:7, type:'prepared', schools:null, anySchool:0 })`
      - `('Fighter','Eldritch Knight',2,'2014')` → `null`, and `('Fighter','Champion',10,'2014')` → `null`
    - `describe('thirdCasterSchoolStatus — 2014 school budget')`. Take `info` from `thirdCasterSpellInfo('Fighter','Eldritch Knight',3,'2014')`.
      Build the picks from `spells.json` shapes:
      - Sleep: `{ name:'Sleep', level:1, school:'Enchantment', classes:['Bard','Sorcerer','Wizard'] }`
      - Burning Hands: `{ name:'Burning Hands', level:1, school:'Evocation', classes:['Sorcerer','Wizard'] }`
      - Friends: `{ name:'Friends', level:0, school:'Enchantment', classes:['Wizard'] }`

      Asserts:
      - `[Sleep]`, `otherListClasses: []` → `{ offSchool:1, allowed:1, atLimit:true }`
      - `[Burning Hands]` → `offSchool: 0`, `atLimit: false`
      - `[Friends]` (a cantrip) → `offSchool: 0`
      - `[Sleep]` with `otherListClasses: ['Bard']` → `offSchool: 0`, because the spell is on another list the character has
      - `[Sleep]` with the EK 8 `info` → `allowed: 2`, `atLimit: false`
      - `[Sleep]` with the 2024 EK 3 `info` → `atLimit: false`
  - **`spellAccess.test.js`**: extend the import with `extraSpellNames`, `getAlwaysPreparedSpells`, `resolveSheetSpells` and `spellLimitCounts`.
    - `describe('allowedSpellClasses — third casters')`
      - `sorted({ class:'Fighter', subclass:'Eldritch Knight', level:3 })` → `['fighter','wizard']` **[RED]**
      - **[guard]** `sorted({ class:'Fighter', subclass:'Eldritch Knight', level:2 })` → `['fighter']`, and `sorted({ class:'Fighter', subclass:'Champion', level:3 })` → `['fighter']`
    - `describe('extraSpellNames')`
      - `extraSpellNames({ class:'Warlock', subclass:'The Fiend', level:5, ruleset:'2014' })` has `'Fireball'` and **not** `'Flame Strike'`
      - `extraSpellNames({ class:'Warlock', subclass:'Fiend Patron', level:5, ruleset:'2024' }).size` → `0`, because 2024 spells are prepared, not expanded
    - `describe('getAlwaysPreparedSpells')`
      - `{ class:'Cleric', subclass:'Life Domain', level:5, ruleset:'2014' }` → 6 entries, all with `source: 'Life Domain'`, and names as in Increment 4's level-5 2014 list
      - `{ class:'Rogue', subclass:'Arcane Trickster', level:3, ruleset:'2024' }` contains `{ name:'Mage Hand', source:'Arcane Trickster' }`. At level 2 → `[]`
      - `{ class:'Druid', subclass:'Circle of the Land', level:3, ruleset:'2024', features:['Circle Land: Polar'] }` → names `['Fog Cloud','Hold Person','Ray of Frost']`
      - The same with `features:[{ name:'Circle Land: Polar' }]` gives the same result (object entries are normalized)
      - The same with no `features` and `levelChoices: { '3': { 'land-terrain':'Polar' } }` gives the same result (fallback)
      - Multiclass: `{ ruleset:'2014', class:'Cleric', level:6, classes:[{ class:'Cleric', subclass:'Life Domain', level:3 }, { class:'Paladin', subclass:'Oath of Devotion', level:3 }] }`
        gives 6 entries: 4 with `source:'Life Domain'` and 2 with `source:'Oath of Devotion'`
    - `describe('resolveSheetSpells — never mutates, tags copies')`. Deep-freeze `allSpells = [{ name:'Bless', level:1 }, { name:'Shield', level:1 }]`
      and call `resolveSheetSpells({ preparedNames:['Bless','Shield'], alwaysPrepared:[{ name:'Bless', source:'Life Domain' }, { name:'Commune', source:'Oath of Devotion' }], allSpells })`.
      - The call does not throw, which proves no frozen object was mutated. Afterwards `allSpells[0]._alwaysPrepared` is `undefined`.
      - `spells.filter(s => s.name === 'Bless')` has length 1, with `_alwaysPrepared: 'Life Domain'`. That object `not.toBe(allSpells[0])`
      - `spells` contains Shield, and `missing` → `['Commune']`
    - `describe('spellLimitCounts')`
      - `[{ level:0 }, { level:0, source:'race' }, { level:1 }, { level:2 }, { level:1, _alwaysPrepared:'Life Domain' }, { level:0, _alwaysPrepared:'Arcane Trickster' }]`
        → `{ cantrips:1, leveled:2 }`
- **Must fail before implementation because:**
  - `getSpellSlots` ignores a 4th argument and returns `null` for Fighter/Rogue.
  - `getMulticlassSpellSlots` passes no subclass, so a lone EK gives `null`.
  - `getSpellcastingClasses` filters on `CLASSES[c.class].spellcasting`, which is `false` for Fighter/Rogue.
  - `maxSpellLevel` returns `0` and `getSpellInfo` returns `null` for Fighter.
  - `allowedSpellClasses` returns `['fighter']` only.
  - All the new functions are missing (`TypeError: … is not a function`).
  - Asserts marked **[guard]** pass today.

**Gates**
- ☑ **RED**: every file above is extended, and the **[RED]** asserts are observed failing for these reasons. The guards pass.
- ☑ **GREEN**: implementation done. The full suite passes, including all pre-existing Paladin/Ranger cases, and `npx vite build` is clean.
  There is no import cycle: `subclassData.js` imports none of `levelChoices`, `multiclass`, `spellAccess` or `dndHelpers`
  (check with `rg -n "^import" client/src/utils/subclassData.js`).

**Verify:** `cd client && npm test` + `npx vite build` + the `rg` above.

**Log:**
- **RED** (17:23): new `classData.test.js` (6 tests) and extensions to `multiclass.test.js` (5), `dndHelpers.test.js` (5),
  `subclassData.test.js` (7), `spellAccess.test.js` (10). `npm test` → `Test Files  5 failed | 7 passed (12)`,
  `Tests  24 failed | 255 passed (279)`. Failure reasons, counted: `TypeError: thirdCasterSpellInfo is not a function` ×7,
  `getAlwaysPreparedSpells is not a function` ×4, `extraSpellNames …` ×2, `resolveSheetSpells …`, `spellLimitCounts …`,
  `spellcastingAbilityFor …` ×1 each; `expected null to deeply equal [ 2, +0, +0, +0 ]` / `[ 4, 2, +0, +0 ]` (slots),
  `expected null to deeply equal { cantrips: 3, spellsKnown: 7, …}` (getSpellInfo), `expected +0 to be 1` (maxSpellLevel),
  `expected 1 to be 3` (start level), `expected [] to deeply equal [ { class: 'Fighter', …} ]` and
  `expected [ 'Wizard' ] to deeply equal [ 'Wizard', 'Fighter' ]` (caster classes), `expected [ 'fighter' ] to deeply equal [ 'fighter', 'wizard' ]`.
  Every [guard] (EK 2 / Champion nulls, per-class sweeps, Wizard 5 + EK 6, Paladin start levels) passed.
- **GREEN** (17:25): `npm test` → `Test Files  12 passed (12)`, `Tests  279 passed (279)` (all pre-existing Paladin/Ranger cases included).
  Build → `✓ built in 1.67s`. Undeclared checker → `no undeclared identifiers`.
  `rg -n "^import" client/src/utils/subclassData.js` → only `./classData`, `./subclassFeatures`, `./subclassFeatures2024`, `./subclassSpells` (acyclic).

**Changed:**
- `client/src/utils/classData.js` — `getSpellSlots(…, subclass = '')` third-caster branch (`THIRD_CASTER_SLOTS`), removed the stale
  comments; `getMulticlassSpellSlots` passes `c.subclass`; new exports `spellcastingAbilityFor`, `spellListClassFor`.
- `client/src/utils/multiclass.js` — `spellcastingStartLevel(…, subclass = '')` → 3 for third casters; `getSpellcastingClasses`
  filters on `spellcastingAbilityFor` (Paladin/Ranger unchanged).
- `client/src/utils/dndHelpers.js` — imports `thirdCasterSpellInfo`; `maxSpellLevel(…, subclass = '')` and
  `getSpellInfo(…, subclass = '')` return the third-caster numbers before the class gate.
- `client/src/utils/subclassData.js` — `thirdCasterSpellInfo`, `thirdCasterSchoolStatus` (case-insensitive; `schools === null` → never at limit).
- `client/src/utils/spellAccess.js` — `allowedSpellClasses` adds the Wizard list for a third caster at 3+; new `extraSpellNames`,
  `getAlwaysPreparedSpells` (land from `Circle Land: X` features, normalizing objects, else any `land-terrain` level choice),
  `resolveSheetSpells` → `{ spells, missing }` (tagged shallow copies), `spellLimitCounts`.

**Notes:** `resolveSheetSpells` drops prepared names with no spell data (as the sheet's current effect does) and keeps prepared order,
appending always-prepared spells that were not already prepared. EK/AT characters now get DC/slots from `getSpellcastingClasses` /
`getMulticlassSpellSlots` immediately (Concern 8's accepted transitional state until Increment 9).

---

## Increment 6: Subclass-dependent Progression choices per ruleset
**Status:** done
**Started:** 17:24  **Finished:** 17:25

**What:** Give every subclass-dependent `levelChoices` entry its real choice level and options per ruleset.
Stop `relocateOrphanedChoices` from moving level-specific picks across editions.

**Where:**
- `client/src/utils/levelChoices.js`:
  - `:4-5` imports: `subclassEdition` from `./subclassData`, and `LAND_SPELLS_2014` / `LAND_SPELLS_2024` from `./subclassSpells`
  - `:81-124` tables
  - `:140-223` `getLevelChoices`
  - `:259-294` `relocateOrphanedChoices`
- `client/src/utils/levelChoices.test.js`

**Details:** Follow the plan. Shapes pinned for the specs (see Concern 5):
- `getLandOptions(edition, current = '')` → an **array** of `{ name, desc, label?, legacy }`. An appended legacy entry
  has `legacy: true` and `label: '<name> (2014 rules)' | '<name> (2024 rules)'`.
- `getHunterOptions(level, edition, current = '')` → **`{ label, options: [{ name, desc, label?, legacy }] }`**, or `null`
  when that level has no card. Increment 8 reads `.label` for the feature string at `:3143` and `.options` for the card.
- **The fighting-style relocation key.** `typesAt` and the stored entry's source type both go through one key function:
  `type + (additional ? ':additional' : '')`.
  - For the stored entry, `additional` is true when `type === 'fighting-style'` and the source key's level is a Champion
    additional level (7 or 10) on a Champion.
  - Skip `LEVEL_SPECIFIC_CHOICES = new Set(['totem', 'hunter-option'])` entirely, and add a comment explaining why.

**Test spec**
- **File:** `client/src/utils/levelChoices.test.js`. Extend the import with `getHunterOptions`, `getLandOptions`,
  `HUNTER_OPTIONS`, `LAND_TERRAINS` and `LAND_TERRAINS_2024`. Keep `opts(cls, extra)`.
- **Asserts:**
  - `describe('Circle of the Land — land choice follows the subclass level')`
    - `getLevelChoices('Druid',3,'Circle of the Land','2024')` contains `{ type:'land-terrain', edition:'2024' }` **[RED]**
    - `getLevelChoices('Druid',2,'Circle of the Land','2024')` has **no** `land-terrain` **[RED]**
    - `getLevelChoices('Druid',2,'Circle of the Land','2014')` contains `{ type:'land-terrain', edition:'2014' }`
    - **[guard]** `getLevelChoices('Druid',3,'Circle of the Land','2014')` has no `land-terrain`
  - `describe('Hunter — per-edition choice points')`
    - The levels with a `hunter-option` choice, for 1–20 under `('Ranger', l, 'Hunter', '2024')` → `[3,7]` **[RED]**; under `'2014'` → `[3,7,11,15]`
    - The 2024 L7 choice has `label: 'Defensive Tactics'` and `edition: '2024'`
    - `getHunterOptions(3,'2024').options.map(o => o.name).sort()` → `['Colossus Slayer','Horde Breaker']`
    - `getHunterOptions(7,'2024')`: option names → `['Escape the Horde','Multiattack Defense']`
    - `getHunterOptions(3,'2014').options` has length 3
    - `getHunterOptions(3,'2024','Giant Killer').options` has length 3, and its last entry `toMatchObject({ name:'Giant Killer', legacy:true })`
      with a `label` matching `/Giant Killer \(2014 rules\)/`
    - `getHunterOptions(3,'2014','Giant Killer').options` has length 3, with no appended entry
    - `getHunterOptions(3,'2024','Colossus Slayer').options` has length 2
    - **[guard]** `Object.keys(HUNTER_OPTIONS)` → `['3','7','11','15']`, so the export is kept
  - `describe('Champion — Additional Fighting Style per edition')`
    - `getLevelChoices('Fighter',7,'Champion','2024')` contains `{ type:'fighting-style', additional:true }` **[RED]**
    - `getLevelChoices('Fighter',10,'Champion','2024')` has no `fighting-style`
    - `getLevelChoices('Fighter',10,'Champion','2014')` contains `{ type:'fighting-style', additional:true }`
    - `getLevelChoices('Fighter',7,'Champion','2014')` has no `fighting-style`
    - `getLevelChoices('Fighter',1,'Champion','2014')`'s fighting-style has no truthy `additional`
  - `describe('Unchanged schedules')`
    - **[guard]** `getLevelChoices('Barbarian',6,'Path of the Totem Warrior','2024')` contains `totem` (a legacy pick keeps its 2014 schedule)
    - **[guard]** `getLevelChoices('Fighter',7,'Battle Master','2024')` contains `maneuvers`
  - `describe('relocateOrphanedChoices — per-edition picks')`
    - **[guard]** `relocateOrphanedChoices({ 11:{ 'hunter-option':'Volley' } }, opts('Ranger', { subclass:'Hunter', ruleset:'2024' }))` → `changed: false`.
      This passes today. It fails only if the 2024 Hunter table lands without the `LEVEL_SPECIFIC_CHOICES` exclusion.
    - `relocateOrphanedChoices({ 5:{ 'hunter-option':'Colossus Slayer' } }, opts('Ranger', { subclass:'Hunter' }))` → `changed: false` **[RED]**.
      Today it moves to key 3. *(Added by the incrementer so the exclusion has a real red.)*
    - `relocateOrphanedChoices({ 5:{ totem:'Bear' } }, opts('Barbarian', { subclass:'Path of the Totem Warrior' }))` → `changed: false` **[RED]**.
      Today it moves to key 3. *(Added, same reason.)*
    - `relocateOrphanedChoices({ 2:{ 'land-terrain':'Forest' } }, opts('Druid', { subclass:'Circle of the Land', ruleset:'2024' }))`
      → `{ changed:true, levelChoices:{ 3:{ 'land-terrain':'Forest' } } }` **[RED]**
    - Namespaced: `{ 'Druid:2':{ 'land-terrain':'Forest' } }` with `namespaced:true` → `{ 'Druid:3':{ 'land-terrain':'Forest' } }`
    - `relocateOrphanedChoices({ 7:{ 'fighting-style':'Defense' } }, opts('Fighter', { subclass:'Champion', ruleset:'2014' }))`
      → `levelChoices` `toEqual` `{ 10:{ 'fighting-style':'Defense' } }`, **not** key `1` **[RED]** (today it goes to 1)
    - **[guard, plan-review round 2]** `relocateOrphanedChoices({ 10:{ 'fighting-style':'Defense' } }, opts('Fighter', { subclass:'Champion', ruleset:'2014' }))`
      → `changed: false`. A correctly placed 2014 pick never moves. It passes today and fails if the source
      type is not mapped through the same key function as `typesAt`.
    - `relocateOrphanedChoices({ 10:{ 'fighting-style':'Defense' } }, opts('Fighter', { subclass:'Champion', ruleset:'2024' }))`
      → `{ 7:{ 'fighting-style':'Defense' } }` **[RED]**. This is the plan's "new move", and it is non-lossy.
    - `relocateOrphanedChoices({ 1:{ 'fighting-style':'Dueling' }, 7:{ 'fighting-style':'Defense' } }, opts('Fighter', { subclass:'Champion', ruleset:'2024' }))`
      → `changed: false` **[RED]**. Today key 7 is an orphan and moves to 10. This is plan Verification 12's data shape.
    - All pre-existing `relocateOrphanedChoices` and `getLevelChoices` cases still pass.
  - `describe('land option helpers and text')`
    - `getLandOptions('2024').map(o => o.name)` → `['Arid','Polar','Temperate','Tropical']` **[RED]**
    - `getLandOptions('2024','Arctic')` has length 5, and its last entry `toMatchObject({ name:'Arctic', legacy:true })` with a label matching `/\(2014 rules\)/`
    - `getLandOptions('2024','Polar')` has length 4
    - `getLandOptions('2014','Polar')`'s last entry has a label matching `/\(2024 rules\)/`
    - `Object.keys(LAND_TERRAINS)` → the 8 original names, in order
    - `Object.keys(LAND_TERRAINS_2024)` → `['Arid','Polar','Temperate','Tropical']`
    - `LAND_TERRAINS.Arctic` contains `'Ice Storm'` and `'Freedom of Movement'` **[RED]**
    - `LAND_TERRAINS.Swamp` contains `"Melf's Acid Arrow"` and `'Scrying'`
    - `LAND_TERRAINS_2024.Polar` contains `'Ray of Frost'`
- **Must fail before implementation because:**
  - The land choice is hardcoded at `level === 2`, with no `edition`.
  - Hunter options come from the 2014 table at every level.
  - The Champion style is hardcoded to 10, with no `additional` flag.
  - `relocateOrphanedChoices` relocates totem and hunter picks and moves a Champion key-7 style to L1.
  - `getHunterOptions`, `getLandOptions` and `LAND_TERRAINS_2024` do not exist.
  - The 2014 land text lists only 6 spells.
  - The two plan relocation asserts marked **[guard]** pass today, as described above.

**Gates**
- ☑ **RED**: tests written. The **[RED]** asserts are observed failing for these reasons, and the guards pass.
- ☑ **GREEN**: implementation done. The full suite passes and `npx vite build` is clean.
  `rg -n "level === 2\)" client/src/utils/levelChoices.js` shows no Circle-of-the-Land line.
  `rg -n "^import" client/src/utils/subclassData.js` shows no `levelChoices` import (no cycle).

**Verify:** `cd client && npm test` + `npx vite build` + the two `rg` checks.

**Log:**
- **RED** (17:25): 6 describes / 18 tests appended to `levelChoices.test.js`. `npm test` → `Test Files  1 failed | 11 passed (12)`,
  `Tests  13 failed | 283 passed (296)`. Reasons: `expected [ { type: 'subclass', …} ] to deep equally contain ObjectContaining{…}` (no L3
  land card under 2024; the 2014 L2 card has no `edition`), `expected [ 3, 7, 11, 15 ] to deeply equal [ 3, 7 ]`,
  `TypeError: getHunterOptions is not a function` ×2, `TypeError: getLandOptions is not a function`,
  `expected [] to deep equally contain ObjectContaining{…}` (no Champion L7 / `additional`), relocation `expected true to be false`
  (totem + hunter moved; 2024 Champion L7 moved), `{ changed: false } … { changed: true }` (land not moved to 3),
  `expected { Object (1) } to deeply equal { Object (10) }` (Champion key 7 went to L1), `{ Object (10) } … { Object (7) }`,
  and `TypeError: Cannot convert undefined or null to object` (`LAND_TERRAINS_2024` missing — the same test also holds the 6-spell Arctic assert).
  Guards passed: Volley at 11 stays, 2014 Champion key 10 stays, legacy Totem 6, Battle Master 7, `HUNTER_OPTIONS` keys.
- **GREEN** (17:25): `npm test` → `Test Files  12 passed (12)`, `Tests  296 passed (296)` (all pre-existing levelChoices cases).
  Build → `✓ built in 1.68s`. Undeclared checker → `no undeclared identifiers`.
  `rg -n "level === 2\)" client/src/utils/levelChoices.js` → only the Paladin/Ranger fighting-style line (209) and the Warlock
  invocations line (233); no Circle-of-the-Land line. `rg -n "^import" client/src/utils/subclassData.js` → no `levelChoices`.

**Changed:**
- `client/src/utils/levelChoices.js` — imports `subclassEdition` and the land spell tables; `HUNTER_OPTIONS_2024`,
  `getHunterOptions(level, edition, current)` → `{ label, options }` | null; `LAND_TERRAINS` / `LAND_TERRAINS_2024` generated from the
  spell tables ("Always-prepared circle spells: …"); `getLandOptions(edition, current)`; `getLevelChoices` — Champion style at 10/7 by
  edition with `additional: true`, Hunter cards per edition with `edition`, land at `getSubclassLevel('Druid', ruleset)` with `edition`;
  `relocateOrphanedChoices` — skips `LEVEL_SPECIFIC_CHOICES`, and `typesAt` + the stored entry share `choiceKey(type, additional)`.
- `client/src/utils/levelChoices.test.js` — 18 tests (5 guards).

**Notes:** a stored pick that is in neither edition's table is appended as `"<name> (custom)"` (`legacy: false`), mirroring
`subclassSelectOptions`, so it is never hidden. Until Increment 8 the sheet still reads `HUNTER_OPTIONS[...]` directly (accepted transitional state).

---

## Increment 7: Subclass numbers and ruleset-correct text (2024 de-dupe, Bear Totem, Draconic, placeholders)
**Status:** done
**Started:** 17:26  **Finished:** 17:27

**What:**
- Fix the 2024 `getClassLevels` de-dupe.
- Fix Bear Totem resistance.
- Add data-driven Draconic HP (event helpers) and AC (`unarmoredBaseAC`).
- Drop the 2024 Cleric's L2/L8 domain placeholders.
- Add `getLevel1Features`.
- Make the subclass-choice text level-agnostic.

**Where:**
- `client/src/utils/classData.js`:
  - `:296`, `:303` and `:304` (feature strings)
  - `:379-433`: `RULESET_2024_REMOVE`, and the de-dupe at `:425-431` restricted to `promoted`
  - `:556-567`: `getClassDefenses(className, level, subclass, { features = [], levelChoices = {} } = {})`
  - new `getLevel1Features`
- `client/src/utils/dndConstants.js:128-130`: add `SUBCLASS_HP_PER_LEVEL` and `SUBCLASS_UNARMORED_AC`
- `client/src/utils/dndHelpers.js:18-26`: `unarmoredBaseAC` normalizes string or object entries and adds the Draconic candidates
- `client/src/utils/featureDescriptions.js`: `:47`, `:84`, `:115`, `:121` and `:130`
- `client/src/utils/subclassData.js`: `subclassHpBonus`, `subclassHpDelta` and `subclassRepickHp`
- Tests: `classData.test.js`, `dndHelpers.test.js` and `subclassData.test.js`

**Details:** Follow the plan. `subclassRepickHp(before, after)` → `{ apply: max(delta,0), remind: max(-delta,0), switched: !!before.subclass }`
(plan-review round 2). `subclassHpBonus` applies to Sorcerer entries only.

**Test spec**
- **Files and asserts:**
  - **`classData.test.js`**: add `getClassDefenses`, `getClassLevels`, `CLASS_LEVELS` and `getLevel1Features`.
    - `describe('getClassDefenses — Bear Totem')`. Let `ALL = ['All except Psychic (while raging)']` and
      `BPS = ['Bludgeoning (while raging)','Piercing (while raging)','Slashing (while raging)']`.
      - `getClassDefenses('Barbarian',3,'Path of the Totem Warrior',{ features:['Totem Spirit (Lv3): Bear'] }).resistances` → `ALL` **[RED]**
      - `…{ features:[{ name:'Totem Spirit (Lv3): Bear' }] }` → `ALL`
      - `…{ levelChoices:{ '3':{ totem:'Bear' } } }` → `ALL`
      - `…{ levelChoices:{ 'Barbarian:3':{ totem:'Bear' } } }` → `ALL`
      - **[guard]** `…{ features:['Totem Spirit (Lv3): Eagle'] }` → `BPS`
      - **[guard]** `…{ features:['Totem Spirit (Lv6): Bear'] }` → `BPS`. Only the level-3 Bear grants resistance.
      - **[guard]** `getClassDefenses('Barbarian',3,'Path of the Totem Warrior')` (no 4th arg) → `BPS`
      - **[guard]** `getClassDefenses('Fighter',5,'Champion').resistances` → `[]`
    - `describe('getClassLevels — 2024 de-dupe drops only promoted names')`
      - `getClassLevels('Cleric','2024')[17]` includes `'Domain Feature'` **[RED]**
      - `[8]` includes `'ASI'` **[RED]** and not `'Domain Feature'`
      - `[2]` does not include `'Domain Feature'` **[RED]**
      - `[6]` includes it **[RED]**
      - `[3]` includes `'Divine Domain'`, and `[1]` does not
      - `getClassLevels('Wizard','2024')[10]` includes `'Tradition Feature'` **[RED]**
      - `getClassLevels('Fighter','2024')` has `'Archetype Feature'` at 7, 10, 15 and 18
      - `getClassLevels('Barbarian','2024')` has `'Path Feature'` at 6, 10 and 14
      - **[guard]** `getClassLevels('Paladin','2024')[2]` does **not** include `'Spellcasting'`, and `[1]` does
      - For every class in `CLASS_LEVELS`: the levels holding `'ASI'` under 2024 `toEqual` the levels holding it in `CLASS_LEVELS[cls]` **[RED]**.
        The literal spot checks are Fighter `[4,6,8,12,14,16,19]`, Rogue `[4,8,10,12,16,19]` and Wizard `[4,8,12,16,19]`.
      - **Catch-all** *(incrementer addition; it locks "every other repeated name stays")*: for every class and every name in
        `CLASS_LEVELS[cls]`, the set of levels holding it under 2024 equals the set under 2014. The test excludes the names the plan
        deliberately moves: `'Spellcasting'` for Paladin/Ranger, `'Domain Feature'` for Cleric, and the subclass-choice name for
        Cleric/Druid/Sorcerer/Warlock/Wizard (`'Divine Domain'`, `'Druid Circle'`, `'Sorcerous Origin'`, `'Otherworldly Patron'`,
        `'Arcane Tradition'`). **[RED]**
      - **[guard]** `getClassLevels('Cleric','2014')` `toBe` `CLASS_LEVELS.Cleric`
    - `describe('getLevel1Features')`
      - `getLevel1Features('Cleric','2024').some(f => f.startsWith('Divine Domain'))` → `false` **[RED]**
      - `getLevel1Features('Cleric','2014')` `toEqual` `CLASSES.Cleric.features`, which includes the Divine Domain entry
      - `getLevel1Features('Sorcerer','2024')` has no `'Sorcerous Origin'` entry
      - `getLevel1Features('Warlock','2024')` has no `'Otherworldly Patron'` entry
      - `getLevel1Features('Fighter','2024')` `toEqual` `CLASSES.Fighter.features`
    - `describe('subclass-choice text names no level')`. Let `RX = /at (level \d|\d(st|nd|rd|th) level)/`.
      - No `FEATURE_DESCRIPTIONS[n]` for `n` in `['Divine Domain','Sacred Oath','Sorcerous Origin','Otherworldly Patron','Arcane Tradition']`
        matches `RX` **[RED]**. Import `FEATURE_DESCRIPTIONS` from `./featureDescriptions`, and check the export name at execution.
      - No entry of `CLASSES.Cleric.features`, `CLASSES.Sorcerer.features` or `CLASSES.Warlock.features` whose name is the subclass-choice
        feature matches `RX`. Today, "Choose a domain at level 1" and "…at level 1" match.
  - **`dndHelpers.test.js`**: extend `describe('unarmoredBaseAC')`, keeping all existing string cases.
    - `unarmoredBaseAC([{ class:'Sorcerer', subclass:'Draconic Bloodline' }], { dex:3 })` → `16` **[RED]**
    - `…[{ class:'Sorcerer', subclass:'Draconic Bloodline' }], { dex:3 }, true)` → `16` (a shield is allowed; the caller adds +2)
    - `…[{ class:'Sorcerer', subclass:'Draconic Sorcery' }], { dex:3, cha:4 })` → `17` **[RED]**
    - `…[{ class:'Sorcerer', subclass:'Wild Magic' }], { dex:3 })` → `13`
    - `…[{ class:'Barbarian', subclass:'' }], { dex:2, con:3, wis:1 })` → `15` **[RED]** (today 12, because object entries are not recognised)
    - **[guard]** `…[{ class:'Monk', subclass:'' }], { dex:2, con:3, wis:1 }, true)` → `12` (no WIS with a shield)
    - `…[{ class:'Monk', subclass:'' }], { dex:2, con:3, wis:1 }, false)` → `13`
    - Best of, no stacking: `…[{ class:'Monk', subclass:'' }, { class:'Sorcerer', subclass:'Draconic Bloodline' }], { dex:3, wis:1 })` → `16`
    - Mixed shapes: `…['Barbarian', { class:'Sorcerer', subclass:'Draconic Bloodline' }], { dex:2, con:0 })` → `15` **[RED]** (Draconic 13 + 2 beats Barbarian 10 + 2 + 0; today 12)
  - **`subclassData.test.js`**: add `subclassHpBonus`, `subclassHpDelta` and `subclassRepickHp`, and import `SUBCLASS_HP_PER_LEVEL` and `SUBCLASS_UNARMORED_AC` from `./dndConstants`.
    - `describe('Draconic data')`
      - `SUBCLASS_HP_PER_LEVEL` `toEqual` `{ 'Draconic Bloodline': 1, 'Draconic Sorcery': 1 }` **[RED]**
      - `SUBCLASS_UNARMORED_AC` `toEqual` `{ 'Draconic Bloodline': { base:13, add:['dex'] }, 'Draconic Sorcery': { base:10, add:['dex','cha'] } }`
    - `describe('subclassHpBonus / subclassHpDelta')`
      - `subclassHpBonus({ class:'Sorcerer', subclass:'Draconic Bloodline', level:1 })` → `1` **[RED]**
      - `…'Draconic Sorcery', level:3` → `3`
      - `…'Draconic Sorcery', level:20` → `20`
      - `…subclass:'Wild Magic Sorcery', level:5` → `0`
      - `{ class:'Wizard', subclass:'Draconic Sorcery', level:5 }` → `0` (Sorcerer entries only)
      - `subclassHpDelta({ class:'Sorcerer', subclass:'', level:2 }, { class:'Sorcerer', subclass:'Draconic Sorcery', level:3 })` → `3`
        (plan Verification 8)
      - `subclassHpDelta({ class:'Sorcerer', subclass:'Draconic Bloodline', level:1 }, { …level:2 })` → `1`
        (Verification 7's Level Up +1)
    - `describe('subclassRepickHp — never subtracts; flags switches')`
      - `({ class:'Sorcerer', subclass:'Wild Magic Sorcery', level:5 }, { class:'Sorcerer', subclass:'Draconic Sorcery', level:5 })`
        → `{ apply:5, remind:0, switched:true }` **[RED]**
      - The reverse → `{ apply:0, remind:5, switched:true }`
      - First pick `({ class:'Sorcerer', subclass:'', level:3 }, { …'Draconic Sorcery', level:3 })` → `{ apply:3, remind:0, switched:false }`
      - Non-Draconic switch `({ …'Wild Magic Sorcery', level:5 }, { …'Aberrant Sorcery', level:5 })` → `{ apply:0, remind:0, switched:true }`
- **Must fail before implementation because:**
  - The 2024 `getClassLevels` de-dupe keeps only the first occurrence of every name. `'ASI'` survives only at 4,
    `'Domain Feature'` only at 2, and `'Tradition Feature'` only at 6.
  - `getClassDefenses` ignores the 4th argument and checks the non-existent `'Path of the Bear Totem'`.
  - `unarmoredBaseAC` calls `classNames.includes('Barbarian')`, which is false for object entries, and has no Draconic branch.
  - The level-1 text says "at level 1" / "at 1st level".
  - `getLevel1Features`, the HP helpers and the two constants do not exist.

**Gates**
- ☑ **RED**: tests written. The **[RED]** asserts are observed failing for these reasons, and the guards (including every
  existing `unarmoredBaseAC` string case) pass.
- ☑ **GREEN**: implementation done. The full suite passes and `npx vite build` is clean.
  `rg -n "Path of the Bear Totem" client/src` returns nothing.

**Verify:** `cd client && npm test` + `npx vite build` + the `rg` above.

**Log:**
- **RED** (17:26): extended `classData.test.js` (+8 tests), `dndHelpers.test.js` (+4), `subclassData.test.js` (+4). `npm test` →
  `Test Files  3 failed | 9 passed (12)`, `Tests  15 failed | 299 passed (314)`. Reasons:
  `expected [ 'Bludgeoning (while raging)', …] to deeply equal [ 'All except Psychic (while raging)' ]` (4th arg ignored);
  `expected [ 'Destroy Undead (CR 4)' ] to include 'Domain Feature'` (Cleric 17), `Barbarian: expected [ 4 ] to deeply equal [ 4, 8, 12, 16, 19 ]`
  (ASI only at 4), catch-all `Barbarian/ASI: expected [ 4 ] …`; `TypeError: getLevel1Features is not a function`;
  `Divine Domain: expected 'Choose your Cleric subclass (Divine D…' not to match /at (level \d|…)/` and
  `Cleric: expected 'Divine Domain — Choose a domain at le…' not to match …`; unarmoredBaseAC `expected 13 to be 16`, `expected 13 to be 17`,
  `expected 12 to be 15` (object Barbarian), `expected 13 to be 16` (Monk + Draconic); `expected undefined to deeply equal { 'Draconic Bloodline': 1, …}`;
  `TypeError: subclassHpBonus / subclassHpDelta / subclassRepickHp is not a function`. Guards passed: Eagle / Lv6-Bear / no-arg / Fighter
  defenses, Paladin 2024 Spellcasting de-dupe, `getClassLevels('Cleric','2014')` toBe, and all 5 pre-existing string `unarmoredBaseAC` tests.
  (The Monk-with-shield object guard sits in the same `it` as the red Barbarian object assert, so it was not observed separately at RED; it passes at GREEN.)
- **GREEN** (17:27): `npm test` → `Test Files  12 passed (12)`, `Tests  314 passed (314)`. Build → `✓ built in 1.64s`.
  Undeclared checker → `no undeclared identifiers`. `rg -n "Path of the Bear Totem" client/src` → no output (exit 1).

**Changed:**
- `client/src/utils/classData.js` — Cleric/Sorcerer/Warlock level-1 subclass-choice strings reworded (no level, no edition-specific
  subclass); `RULESET_2024_REMOVE` (Cleric L2/L8 `Domain Feature`) applied in the 2024 branch; the de-dupe now drops only
  `promoted` names (`RULESET_2024_ADD` + `RULESET_2024_SUBCLASS`); new `getLevel1Features`; `getClassDefenses(…, { features, levelChoices })`
  with the Bear check (feature regex on normalized names, or `levelChoices['3'|'Barbarian:3'].totem`), unreachable `'Path of the Bear Totem'` removed.
- `client/src/utils/dndConstants.js` — `SUBCLASS_HP_PER_LEVEL`, `SUBCLASS_UNARMORED_AC` next to `FEAT_HP_PER_LEVEL`.
- `client/src/utils/dndHelpers.js` — `unarmoredBaseAC` normalizes string/object entries, takes `cha`, adds subclass candidates (best wins).
- `client/src/utils/featureDescriptions.js` — the five subclass-choice descriptions name no level.
- `client/src/utils/subclassData.js` — imports `SUBCLASS_HP_PER_LEVEL`; `subclassHpBonus`, `subclassHpDelta`, `subclassRepickHp`.

**Notes:** Visible effect of the de-dupe fix: 2024 characters now see every ASI and subclass placeholder row their class table lists
(intended; CHANGELOG covers it). The Bard's second `Expertise` at 10 and repeated `Magical Secrets` also reappear under 2024, locked by the catch-all test.

---

## Increment 8: Character sheet — subclass features, choices, Level Up, AC/HP/defenses
**Status:** done
**Started:** 17:28  **Finished:** 17:37

**What:**
- Route every sheet subclass read through the new accessors.
- Label legacy picks.
- Fix the Champion style overwrite.
- Apply Draconic HP (Progression pick and Level Up) and AC, and the Bear Totem defense.

**Where:** `client/src/pages/CharacterSheet.jsx`:
- `:9` and `:14-15` (imports; **delete the `SUBCLASS_FEATURES` import**)
- `:401-403` (add `noticeToast` state)
- `:742-747` (`applyLevelUp` HP)
- `:947-994` (`calcAC`)
- `:1047-1079` (`isFeatureNoise` / `classFeatureList`; extract `isSubclassPlaceholder`)
- `:1089-1097` (defenses)
- `:2826-2854` (Features tab cards)
- `:2985`, `:2991-2992` (`getChoiceOptions`)
- `:3009-3025` (`getSelected`)
- `:3056-3072`, `:3142-3146` (`selectOption`)
- `:3293-3301` (class info)
- `:3314`, `:3338-3355` (progression rows)
- `:4289-4295`, `:4353-4362` (Level Up modal)

**Details:** Follow the plan's Increment 8 items verbatim. The binding round-2 behaviour is:
- `remind > 0` → the notice "Draconic Resilience no longer applies — lower Max HP by N in the editor if it was added". Max HP is
  **not** lowered.
- `apply > 0 && switched` → HP is applied **and** the notice "Max HP +N (Draconic Resilience). If you switched away from Draconic
  earlier without lowering Max HP, lower it by N in the editor so it isn't counted twice." is shown.
- A first pick is silent.
- Progression placeholders match **only** `isSubclassPlaceholder`, never `isFeatureNoise`. Otherwise the 2014 Cleric 8 row would
  append the subclass name twice.
- No component is defined inside the sheet, and no hook comes after `:1014-1015`.

**Test spec:** n/a. This is page wiring in `CharacterSheet.jsx`, and there is no component-test setup. The logic it
calls is unit-tested in Increments 2 (`listSubclassFeatures`), 5, 6 (`getHunterOptions`/`getLandOptions`)
and 7 (`subclassRepickHp`, `subclassHpDelta`, `unarmoredBaseAC`, `getClassDefenses`). Concern 6 suggests
optionally moving `isSubclassPlaceholder` into `subclassData.js` with a unit test.

**Gates**
- ☑ **GREEN**: build clean, suite green, every grep below as stated, and every UI check below observed.

**Verify:**
```
cd client && npm test && npx vite build                                          # green / built
rg -n "SUBCLASS_FEATURES" client/src/pages                                       # nothing
rg -n "\.subclasses\b|subclassDescs" client/src/pages/CharacterSheet.jsx         # nothing
rg -n "HUNTER_OPTIONS\[|LAND_TERRAINS\)" client/src/pages                        # nothing
rg -n "isSubclassPlaceholder" client/src/pages/CharacterSheet.jsx                # ≥2 hits (definition + progression rows)
rg -n "noticeToast, setNoticeToast\] = useState|if \(loading\) return" client/src/pages/CharacterSheet.jsx
                                                                                 # the useState line number is LOWER than the `if (loading)` line
rg -n "Fighting Style \(Champion\)" client/src/pages/CharacterSheet.jsx          # ≥1 hit (additional-style write)
```
UI checks on `:5174`. Use the isolated origin, stub `alert`/`confirm`, and delete test characters afterwards (plan Verification):
- A 2024 Cleric 3 (Life Domain) shows "Disciple of Life…" at Lv 3 on the Features tab.
- A 2024 character saved with "The Fiend" shows "The Fiend (2014 rules)".
- A 2014 Barbarian 3 with the Bear totem shows resistances "All except Psychic (while raging)". Picking Eagle
  brings back B/P/S (Verification 9).
- A 2014 Sorcerer 1 (Draconic Bloodline), unarmored, DEX 14 has **AC 15**.
- A 2014 Barbarian 5, unarmored, DEX 14 / CON 16 has **AC 15**, so Unarmored Defense still works with object entries.
- A 2024 Wizard 14 (Evoker) shows Progression rows 10 and 14 as "Tradition Feature — Empowered Evocation" and "Tradition Feature —
  Overchannel".
- A 2024 Fighter 8's Progression row at 8 lists **"Ability Score Improvement / Feat"** as a feature line. *(Round-2
  replacement check.)*
- A 2024 Sorcerer 5 switching Draconic Sorcery → Wild Magic Sorcery on Progression: Max HP is **unchanged**, and the notice
  "lower Max HP by 5" is shown.
- A 2024 Sorcerer 5 going Draconic → Wild Magic → Draconic: both notices appear, and Max HP rises by 5 once per Draconic pick. The
  second notice makes the double add visible.
- A 2024 Fighter 7 Champion with Dueling at L1 picks Defense on the L7 "Additional Fighting Style" card. The Actions tab
  still applies Dueling, and AC gains +1 in armor (Verification 12).
- 2014 Cleric 8 (any domain) shows the subclass name appended **once** on the row at 8.

**Log:**
- **Deviation (orchestrator-approved, Concern 6):** `isSubclassPlaceholder` lives in `subclassData.js` (exported) with a unit test instead of a
  sheet-local const. Mini red/green: test added → `TypeError: isSubclassPlaceholder is not a function` (`Tests  1 failed | 314 passed (315)`);
  after the export → `Tests  315 passed (315)`.
- **GREEN** (17:37): `npm test` → `Test Files  12 passed (12)`, `Tests  315 passed (315)`. Build → `✓ built in 1.69s`.
  Undeclared checker → `no undeclared identifiers`.
- **Greps:** `rg -n "SUBCLASS_FEATURES" client/src/pages` → nothing; `rg -n "\.subclasses\b|subclassDescs" …CharacterSheet.jsx` → nothing;
  `rg -n "HUNTER_OPTIONS\[|LAND_TERRAINS\)" client/src/pages` → nothing; `isSubclassPlaceholder` → 4 hits (import :15, `isFeatureNoise` :1055,
  rows :3375/:3404); `noticeToast` useState at :403 < `if (loading) return` at :1022; `Fighting Style (Champion)` → :2963 (the prefix constant
  used by the additional-style write and `championStyle()`).
- **UI checks** (headless Brave over CDP, client-only Vite on :5174 with `/api` proxied to a dead port, seeded `local-uitest-i8-*` characters,
  removed afterwards) — `14/14 passed`:
  - 2024 Cleric 3 Life → Features "Disciple of Life, Life Domain Spells & Preserve Life / Lv 3".
  - 2024 Warlock saved with "The Fiend" → "The Fiend (2014 rules)".
  - 2014 Barbarian 3 Bear → "All except Psychic (while raging)"; picking Eagle on Progression → B/P/S back (`features: ['Totem Spirit (Lv3): Eagle']`).
  - 2014 Sorcerer 1 Draconic Bloodline, DEX 14 → `armorClass` 15. 2014 Barbarian 5 unarmored DEX 14/CON 16 → 15.
  - 2024 Wizard 14 Evoker → row 10 "✓ Tradition Feature — Empowered Evocation", row 14 "Tradition Feature — Overchannel".
  - 2024 Fighter 8 → row 8 "Ability Score Improvement / Feat".
  - 2024 Sorcerer 5 Draconic → Wild Magic: `maxHp` 32 unchanged, notice "…lower Max HP by 5…"; → Draconic again: `maxHp`/`currentHp` 37 and
    notice "Max HP +5 (Draconic Resilience). If you switched away from Draconic earlier without lowering Max HP, lower it by 5 in the editor…".
  - 2024 Fighter 7 Champion (Dueling, Chain Mail + Longsword): Defense on the L7 card → `fightingStyle` still Dueling, features
    `['Fighting Style: Dueling', 'Fighting Style (Champion): Defense']`, Dueling badge on the Actions tab, AC 16 → 17.
  - 2014 Cleric 8 Life → row 8 "Domain Feature — Divine Strike" (appended once).
  - No uncaught page exceptions.

**Changed:** `client/src/pages/CharacterSheet.jsx`
- imports: `SUBCLASS_FEATURES`, `HUNTER_OPTIONS`, `LAND_TERRAINS` removed; `subclassData` accessors, `getHunterOptions`, `getLandOptions`,
  `spellcastingAbilityFor` added.
- `noticeToast` state + `noticeTimer` ref (with the other toasts, before the early returns) and a NOTICE TOAST block rendered like `healToast` (5 s).
- `applyLevelUp`: `gain += subclassHpDelta(before, after)` for the target class.
- `calcAC`: `unarmoredBaseAC(getCharClasses(char), { dex, con, wis, cha }, hasShield)`; deps add `char?.subclass`, `char?.level`, `scores.charisma`.
- `isFeatureNoise` uses `isSubclassPlaceholder`; `classFeatureList` and the Features-tab cards use `listSubclassFeatures` / `getSubclassFeatures`
  (legacy label "(2014 rules)"; a "No built-in feature data for this subclass." card for unresolvable subclasses).
- Defenses: `getClassDefenses(…, { features, levelChoices })`.
- Progression: `getChoiceOptions(choice, current)` — subclass list via `getSubclasses`/`getSubclassDesc`, Hunter via `getHunterOptions`, land via
  `getLandOptions` (legacy entries show their `label`); `data` computed after `selected`; legacy-subclass note in the subclass card;
  Champion `additional` style stored as `Fighting Style (Champion): X` (`getSelected` falls back to it); subclass pick applies
  `subclassRepickHp` (apply to `maxHp`/`currentHp`, notices for `remind` and `apply && switched`); Hunter feature label via `getHunterOptions`;
  class info shows `spellcastingAbilityFor` and the legacy label; rows use the resolved `subTable` — placeholders get `— name`, otherwise a
  `◆ name` line, and `hasContent` includes a subclass entry.
- Level Up modal: `needsSubclass` and the `<select>` use `getSubclasses(lu.targetClass, char.ruleset)`.

**Notes:** The UI harness runs Vite from a scratch config (`<scratch>/vitecfg/vite.ui.config.mjs`) rather than a bare `npx vite --port 5174`,
so `/api` is proxied to a dead port — no request can reach a real server. Nothing was listening on 3001/5173 during the run.

---

## Increment 9: Character sheet — spells (always-prepared, EK/AT, expanded lists)
**Status:** done
**Started:** 17:37  **Finished:** 17:40

**What:**
- Show always-prepared subclass spells without counting them.
- Give EK/AT limits, DC and attack.
- Widen the 2014 Warlock browser with expanded spells.
- Enforce the 2014 EK/AT school budget.

**Where:** `client/src/pages/CharacterSheet.jsx`:
- `:18` (import)
- `:213-236` (`SpellCard`: badge, hidden unprepare button; it stays module-scope)
- `:451-459` (`spellData` effect → `resolveSheetSpells`, `missing` state)
- `:462-486` (browser effect → `extraSpellNames`; deps `char?.subclass` and `char?.level`)
- `:1143-1144`
- `:2314-2349` (limits → `spellLimitCounts` + `thirdCasterSpellInfo`)
- `:2505-2527` (browser rows: capped off-school, granted ✓)
- `:2538-2600` (list render, "Always prepared (not in the spell list): …" line)

**Details:** Follow the plan. The `alwaysPrepared` `useMemo` and `alwaysPreparedKey` go **before** `:1014-1015`, using `char?.` reads.

**Test spec:** n/a. This is page wiring. The logic is unit-tested in Increment 5 (`getAlwaysPreparedSpells`,
`resolveSheetSpells`, `spellLimitCounts`, `extraSpellNames`, `thirdCasterSpellInfo`,
`thirdCasterSchoolStatus`) and Increment 4 (`getSubclassSpells`).

**Gates**
- ☑ **GREEN**: build clean, suite green, greps as stated, and every UI check observed.

**Verify:**
```
cd client && npm test && npx vite build                                                         # green / built
rg -n "resolveSheetSpells\(|spellLimitCounts\(|extraSpellNames\(|getAlwaysPreparedSpells\(|thirdCasterSpellInfo\(|thirdCasterSchoolStatus\(" client/src/pages/CharacterSheet.jsx
                                                                                                # ≥1 hit for each of the six
rg -n "leveledCount = spellData\.filter|cantripCount = spellData\.filter" client/src/pages/CharacterSheet.jsx
                                                                                                # nothing (replaced by spellLimitCounts)
rg -n "const alwaysPrepared = useMemo|if \(loading\) return" client/src/pages/CharacterSheet.jsx
                                                                                                # the useMemo line number is LOWER than the `if (loading)` line
rg -n "^function SpellCard" client/src/pages/CharacterSheet.jsx                                  # still module-scope (column 1)
```
UI checks on `:5174`:
- **2014 Cleric 5, Life, WIS 16:** "Life Domain" badges on Bless, Cure Wounds, Lesser Restoration, Spiritual Weapon,
  Beacon of Hope and Revivify. With no manual picks the counter shows **`0/8`**.
- **2014 Fighter 3, EK, INT 16:**
  - "Spell Save DC 13 / +5", 1st-level slots ×2, Cantrips `0/2` and Spells `0/3`.
  - Browser search "fire" shows Fire Bolt and Burning Hands.
  - After adding Sleep, Charm Person is disabled. Its tooltip names Abjuration or Evocation and "1 of 1".
- **2014 Warlock 5, The Fiend:** browser "Fireball" appears; "Flame Strike" does not. There is no always-prepared list.
- **2014 Cleric 5, Life:** browser search "Bless" shows it with a disabled ✓ and the tooltip "Always prepared — Life Domain".
- **2024 Rogue 3, AT:** Mage Hand is shown with an "Arcane Trickster" badge; Cantrips `0/2`.
- **2024 Rogue 10 AT, INT 14** (Verification 4): Cantrips `0/3`, Prepared `0/7`, slots `4 / 3`, and no school restriction.
- **2014 Fighter 3 EK leveled to 7** (Verification 3): slots `4 / 2`.
- **2014 Wizard 5 / Fighter 6 (EK)** via the Level Up modal (Verification 5): standard slots `4 / 3 / 3 / 1`.

**Log:**
- **GREEN** (17:40): `npm test` → `Test Files  12 passed (12)`, `Tests  315 passed (315)`. Build → `✓ built in 1.68s`.
  Undeclared checker → `no undeclared identifiers`.
- **Greps:** each of `resolveSheetSpells(` (:473), `spellLimitCounts(` (:2372), `extraSpellNames(` (:500), `getAlwaysPreparedSpells(` (:461),
  `thirdCasterSpellInfo(` (:2360, :2379), `thirdCasterSchoolStatus(` (:2381, :2383) has ≥1 hit; the old `cantripCount/leveledCount = spellData.filter`
  lines → nothing; `const alwaysPrepared = useMemo` at :461 < `if (loading) return` at :1040; `function SpellCard` still at column 1 (:213).
- **UI checks** (same isolated harness; `local-uitest-i9-*` characters removed afterwards) — `15/16` in the first run, then `3/3` in a follow-up:
  - 2014 Cleric 5 Life, WIS 16: "Life Domain" badges on Bless, Cure Wounds, Lesser Restoration, Spiritual Weapon, Beacon of Hope, Revivify;
    counter `Spells 0/8`; browser "Bless" → disabled `✓`, title "Always prepared — Life Domain".
  - 2014 Fighter 3 EK, INT 16: "Spell Save DC 13 / +5", slots `1st:2`, `Cantrips 0/2`, `Spells 0/3`. After adding Sleep, Charm Person is
    disabled with title "Eldritch Knight spells must be Abjuration or Evocation (1 of 1 any-school picks used)"; Shield stays enabled.
  - **Plan expectation corrected:** "browser search 'fire' shows Fire Bolt and Burning Hands" failed as written because the browser matches
    names, and "Burning Hands" does not contain "fire" (the search returned Create Bonfire, Fire Bolt, Fireball, …). Rechecked: "fire" lists
    Fire Bolt, a "Burning Hands" search lists it enabled, Cure Wounds (not on the Wizard list) is absent, and a Champion 3 control is not offered
    Burning Hands — `3/3 passed`.
  - 2014 Warlock 5 The Fiend: Fireball offered, Flame Strike not; no badges, no always-prepared line.
  - 2024 Rogue 3 AT: Mage Hand with an "Arcane Trickster" badge; `Cantrips 0/2`.
  - 2024 Rogue 10 AT, INT 14: `Cantrips 0/3`, `Spells 0/7`, slots `1st:4 2nd:3`; after Sleep, Charm Person stays enabled (no school rule).
  - 2014 Fighter 7 EK (seeded at 7): slots `1st:4 2nd:2`.
  - 2014 Wizard 5 / Fighter (EK) 5 → Level Up modal, "Fighter 5 → 6", Confirm: slots `1st:4 2nd:3 3rd:3` → `1st:4 2nd:3 3rd:3 4th:1`.
  - No uncaught page exceptions.

**Changed:**
- `client/src/pages/CharacterSheet.jsx` — imports; `alwaysPrepared` memo + `alwaysPreparedKey` + `missingAlwaysPrepared` state (before the
  early returns); the `spellData` effect uses `resolveSheetSpells` (runs when only always-prepared spells exist); `SpellCard` hides the unprepare
  button and shows a source badge for `_alwaysPrepared` spells (still module-scope, no new SheetCtx value); browser effect ORs
  `extraSpellNames` (deps add `char?.subclass`, `char?.level`, `char?.ruleset`); limits add `thirdCasterSpellInfo` numbers and count with
  `spellLimitCounts`; 2014 EK/AT school budget via `thirdCasterSchoolStatus` (disabled row + tooltip); granted rows render a disabled filled
  `✓` with "Always prepared — <source>"; a dim "Always prepared (not in the spell list): …" line.
- `client/src/utils/spellAccess.js` — `resolveSheetSpells` now emits spells in `allSpells` order (the sheet's previous display order) instead of
  prepared-name order. Same `{ spells, missing }` contract; the Increment 5 tests still pass unchanged.

**Notes:**
- The school budget is skipped when the character also has Wizard levels: the sheet's single prepared list can't tell which class learned a
  spell, and a Wizard may learn any school.
- Verification 3 ("leveled to 7") was checked on a seeded Fighter 7 EK; the Level Up path itself is covered by the Wizard/EK multiclass case.
- Pre-existing, not changed: the browser's no-`classes` escape hatch also lists racial pseudo-spells ("Breath Weapon (Red — Fire)") in searches.

---

## Increment 10: Character creator
**Status:** done
**Started:** 17:40  **Finished:** 17:45

**What:**
- Make every creator subclass picker ruleset-aware and gated, and trim stale picks.
- Apply Draconic HP and AC.
- Support EK/AT and subclass spells on the Spells step.

**Where:** `client/src/pages/CharacterCreate.jsx`:
- `:12-17` (imports)
- `:254-274` (AC)
- `:343-372` (HP)
- `:375-395` (`spellInfo` / available spells)
- `:399-403`, `:487-496` (trim and save)
- `:863-886` (Class-step ruleset toggle)
- `:901-924` (features and subclass chips)
- `:1211-1216` (Details select)
- `:1334` (AC label)
- `:1409-1441` (multiclass rows)
- `:1697-1705` (no-spellcasting message)
- `:1798-1860` (pickers)
- `:2190-2192` (Review badges)
- `:2284-2296` (Review features)

**Details:** Follow the plan.
- `activeSubclass = offeredSubclass(cls, subclass, level, ruleset)` is computed before the HP/AC/spell memos and added to their deps.
- The Barbarian/Monk AC lines stay exactly as they are.
- The clearing `useEffect` on `[cls, ruleset]` clears `subclass` and each extra row's `subclass` when that pick is no longer offered.

**Test spec:** n/a. This is page wiring in `CharacterCreate.jsx`. The logic is unit-tested in Increments 1 (`getSubclasses`,
`offeredSubclass`), 4, 5 (`getSpellInfo`, `spellcastingAbilityFor`, `spellListClassFor`,
`thirdCasterSchoolStatus`) and 7 (`subclassHpBonus`, `unarmoredBaseAC`, `getLevel1Features`, and the de-dupe that
fixes `asiCount`).

**Gates**
- ☑ **GREEN**: build clean, suite green, greps as stated, and every UI check observed.

**Verify:**
```
cd client && npm test && npx vite build                                   # green / built
rg -n "\.subclasses\b|subclassDescs" client/src/pages/CharacterCreate.jsx  # nothing
rg -n "getLevel1Features\(" client/src/pages/CharacterCreate.jsx           # 2 hits (:901-913 and :2284-2296 blocks)
rg -n "offeredSubclass\(" client/src/pages/CharacterCreate.jsx             # ≥2 hits (primary + multiclass rows)
```
UI checks on `:5174`:
- **2024 ruleset, Cleric, level 3:** the Subclass select lists exactly Life/Light/Trickery/War Domain. "Level 1
  Features" does not list Divine Domain.
- **Multiclass row, Wizard level 1 under 2024:** the subclass select is disabled, with the label `(lvl 3+)`.
- **2014 Sorcerer 1, Draconic Bloodline, DEX 14, CON 14:** Max HP **9** and AC **15**. The AC label reads "Unarmored
  (Draconic)".
- **2014 Fighter 3, EK:** the Spells step offers Wizard cantrips (2) and spells (3, level 1). An off-school pick
  beyond the budget is disabled.
- **Switching the ruleset to 2024 after picking Knowledge Domain:** the Subclass select resets to "— Choose subclass —".
- **2024 ASI count** (plan Verification 15, which exercises Increment 7's de-dupe fix through the creator):
  - a 2024 Fighter 8's feat picker allows **3** feats/ASIs;
  - a 2024 Wizard 12's allows **3**.

**Log:**
- **GREEN** (17:45): `npm test` → `Test Files  12 passed (12)`, `Tests  315 passed (315)`. Build → `✓ built in 1.67s`.
  Undeclared checker → `no undeclared identifiers`. No early return precedes the new hooks (the first top-level `return` is at :574).
- **Greps:** `rg -n "\.subclasses\b|subclassDescs" …CharacterCreate.jsx` → nothing; `getLevel1Features(` → 2 hits (:950 Class step, :2363 Review);
  `offeredSubclass(` → 4 hits (:208 `activeSubclass`, :394 HP of extra rows, :528 saved multiclass rows, :2267 Review badges).
- **UI checks** (isolated harness; the creator was driven step by step — Human, Acolyte, Manual Entry) — `10/11`, then `5/5` on the recheck:
  - 2024 Cleric 3: Details Subclass select → exactly `Life Domain, Light Domain, Trickery Domain, War Domain`.
  - Class-step "Level 1 Features": 2024 Cleric lists only Spellcasting (no Divine Domain); 2014 Cleric lists Divine Domain with the reworded
    text. (First run's failure was the harness: `innerText` is CSS-uppercased; rechecked case-insensitively.) Chips header "SUBCLASSES (LVL 3)"
    with the 2024 list vs "(LVL 1)" with the 2014 list.
  - 2024 multiclass row, Wizard 1: subclass select disabled, first option "— Subclass (lvl 3+) —".
  - 2014 Sorcerer 1 Draconic Bloodline (DEX 14, CON 14): Combat step Max HP 9, AC 15, "Unarmored (Draconic)". Create Character (local fallback,
    `/api` dead) saved `maxHp: 9, armorClass: 15, subclass: 'Draconic Bloodline'`; the created `local-…` character was deleted afterwards.
  - 2014 Fighter 3 EK: "As a level 3 Fighter, you know 2 cantrips and 3 spells (up to level 1)", counters `Cantrips 0/2` / `Known Spells 0/3`,
    Fire Bolt offered, Cure Wounds not. Sleep, then Charm Person (off-school, budget used) → not selected; Shield → selected (`Known Spells 2/3`).
  - 2014 Cleric 3 with Knowledge Domain, then ruleset → 2024 on the Combat card → Details select shows "— Choose subclass —" (value `''`).
  - 2024 ASI count: Fighter 8 → `Feats 0/3`; Wizard 12 → `Feats 0/3`.
  - No uncaught page exceptions. The test profile holds no `ond-char-local-*` keys afterwards.

**Changed:** `client/src/pages/CharacterCreate.jsx`
- imports (`subclassData` helpers, `getLevel1Features`, `spellcastingAbilityFor`, `spellListClassFor`, `unarmoredBaseAC`,
  `SUBCLASS_UNARMORED_AC`, `getAllLocalSpells`).
- `activeSubclass = offeredSubclass(cls, subclass, level, ruleset)` right after `classData`; a clearing `useEffect` on `[cls, ruleset]` for the
  main subclass and every extra row.
- AC: unarmored non-Barbarian/Monk branch → `unarmoredBaseAC([{ class: cls, subclass: activeSubclass }], { dex, cha }, hasShield) + shield`
  (Barbarian/Monk lines unchanged); label "Unarmored (Draconic)".
- HP: `subclassHpBonus` for the main class and each clean extra row (deps add `cls`, `activeSubclass`, `ruleset`).
- Spells: `getSpellInfo(…, activeSubclass)` with `spellcastingAbilityFor`; the list queries `spellListClassFor(...)` and unions 2014 expanded
  names; 2014 EK/AT school budget disables off-school picks; "Always prepared from <subclass>: …" info line; Fighter/Rogue no-spellcasting text.
- Class step: compact 2014/2024 ruleset toggle above the class grid (same state as the Combat-step card, which stays); chips and Details select
  use `getSubclasses`/`getSubclassDesc`; both level-1 feature lists use `getLevel1Features`.
- Multiclass rows: subclass select gated by `getSubclassLevel(ec.class, ruleset)` ("— Subclass (lvl N+) —", disabled) and lists `getSubclasses`.
- Save and Review badges use the trimmed `offeredSubclass` values.

**Notes:** The available-spells effect also depends on `level` (the expanded list grows with warlock level), beyond the plan's
`activeSubclass`/`ruleset`.

---

## Increment 11: Character editor
**Status:** done
**Started:** 17:45  **Finished:** 17:49

**What:**
- Replace the free-text Subclass field with a class- and ruleset-aware select that keeps legacy or custom values.
- Wire EK/AT and subclass spells into the editor's limits and lists.
- Apply Draconic HP on Lv Up.

**Where:** `client/src/pages/CharacterEdit.jsx`:
- `:41-99` (`getSpellLimits`: add the third-caster branch before the `SPELLCASTING_CLASSES` gate at `:71`)
- `:300-316` (`formCasterClasses` → `spellcastingAbilityFor`; spell list → `spellListClassFor` + `extraSpellNames`)
- `:357-385` (limits; `CLASS_SPELL_ABILITY[...]` reads at `:360`/`:375`/`:407` → `spellcastingAbilityFor`; pass
  `c.subclass` at `:370`/`:374`)
- `:610-646` (Lv Up + `subclassHpDelta`, included in the alert text)
- `:718-727` (Subclass select; it keeps writing both `subclass` and `classes[0]`)
- `:1343-1352` (counts exclude always-prepared)
- `:1519-1524` (info bar)
- the Draconic reminder note, modelled on the Tough note at `:1735`

**Details:** Follow the plan.
- The Magic Initiate + third-caster branch: `{ cantrips: info.cantrips + (mi ? MAGIC_INITIATE_CANTRIPS : 0), maxSpells: info.spells + bonusSpells, type: info.type, maxLevel: Math.max(info.maxLevel, mi ? 1 : 0), ...bonus }`.
- The school budget is enforced with `thirdCasterSchoolStatus`, and Override bypasses it.

**Test spec:** n/a. `getSpellLimits` and the select are local to `CharacterEdit.jsx`. The plan explicitly makes the
Magic Initiate + third-caster branch a UI check, because the function is page-local (see Concern 6). The helpers it calls are
unit-tested in Increments 1 (`subclassSelectOptions`), 5 and 7 (`subclassHpDelta`).

**Gates**
- ☑ **GREEN**: build clean, suite green, greps as stated, and every UI check observed.

**Verify:**
```
cd client && npm test && npx vite build                                      # green / built
rg -n "<input[^>]*form\.subclass" client/src/pages/CharacterEdit.jsx          # nothing
rg -n "CLASS_SPELL_ABILITY\[" client/src/pages/CharacterEdit.jsx              # nothing (all three reads converted)
rg -n "SPELLCASTING_CLASSES\.includes\(c\.class\)" client/src/pages/CharacterEdit.jsx   # nothing (formCasterClasses converted)
rg -n "subclassSelectOptions\(" client/src/pages/CharacterEdit.jsx            # 1 hit
```
UI checks on `:5174` (stub `window.alert` before Lv Up):
- **2014 Cleric 3 (Knowledge Domain), ruleset switched to 2024:**
  - the select shows "Knowledge Domain (2014 rules)" selected, plus the four 2024 domains;
  - the note reads "From the 2014 rules — its features are kept";
  - Save keeps `subclass: 'Knowledge Domain'` (check localStorage).
- **2014 Fighter 3, EK, INT 16:** the Spells section shows 2 cantrips / 3 known, up to level 1, from the Wizard list.
  After adding Sleep, Charm Person is disabled; with Override on, it is enabled.
- **The same Fighter with the Magic Initiate feat:** 4 cantrips / 4 spells, max level 1.
- **2014 Sorcerer 4, Draconic:** Lv Up (average, CON +1) alert shows **+6** (4 + 1 + 1 Draconic).
- A custom subclass value (for example "Chronurgy" on a Wizard) shows as "Chronurgy (custom)" with the note "Not a built-in
  subclass — no features will be listed", and it saves unchanged.

**Log:**
- **GREEN** (17:49): `npm test` → `Test Files  12 passed (12)`, `Tests  315 passed (315)`. Build → `✓ built in 1.68s`.
  Undeclared checker → `no undeclared identifiers`. New hooks (`extrasKey`, `alwaysPreparedNames` memo, :320-322) sit before
  `if (loading) return` (:551).
- **Greps:** `<input[^>]*form\.subclass` → nothing; `CLASS_SPELL_ABILITY\[` → nothing (the now-unused constant was removed, so
  `rg -n CLASS_SPELL_ABILITY client/src` is empty too); `SPELLCASTING_CLASSES\.includes\(c\.class\)` → nothing; `subclassSelectOptions(` → 1 hit (:759).
- **UI checks** (isolated harness, `window.alert` stubbed, `local-uitest-i11-*` characters removed) — `10/11`, the miss being a harness click:
  - 2014 Cleric 3 Knowledge Domain → ruleset 2024: options `— None —, Life Domain, Light Domain, Trickery Domain, War Domain,
    Knowledge Domain (2014 rules)` with the legacy entry selected; note "From the 2014 rules — its features are kept"; Save → localStorage
    `subclass: 'Knowledge Domain'`, `ruleset: '2024'`.
  - 2014 Fighter 3 EK, INT 16: "you know 2 cantrips and 3 spells (up to level 1)", `Cantrips 0/2`, `Known Spells 0/3`, Wizard list (Fire Bolt
    present, Cure Wounds absent). After Sleep, Charm Person stays unselected (`Known Spells 1/3`) with title "Eldritch Knight spells must be
    Abjuration or Evocation (1 of 1 any-school picks used)"; with Override on, it is added (`2/3`, no title).
  - Same Fighter with Magic Initiate (Wizard list): "4 cantrips and 4 spells (up to level 1)", `Cantrips 0/4`, `Known Spells 0/4`.
  - 2014 Sorcerer 4 Draconic Bloodline, CON 12: Lv Up alert "Leveled up to 5! +6 HP (d6 avg 4 + 1 CON + 1 Draconic) New Max HP: 32".
    (The scripted run's leaf-finder clicked the wrapper `div` whose text is also "Lv Up"; a direct button click in a follow-up run produced
    the alert above.) The Draconic reminder note shows under the select.
  - Custom "Chronurgy" on a Wizard: shown as "Chronurgy (custom)" with "Not a built-in subclass — no features will be listed"; saved unchanged.
  - No uncaught page exceptions.

**Changed:** `client/src/pages/CharacterEdit.jsx`
- imports; `CLASS_SPELL_ABILITY` removed (all reads go through `spellcastingAbilityFor`, including the class-change dialog).
- `getSpellLimits(…, subclass = '')`: third-caster branch before the `SPELLCASTING_CLASSES` gate, with Magic Initiate exactly as specified.
- `formCasterClasses` filters on `spellcastingAbilityFor`; `casterKey` holds `spellListClassFor` lists; the spell-list effect unions
  `extraSpellNames(form)` (deps add `extrasKey`); limits pass `c.subclass`.
- Lv Up (single and multiclass) adds `subclassHpDelta(before, after)` and names it in the alert.
- Subclass field → `<select>` over `subclassSelectOptions(...)` with `— None —`; disabled below the subclass level while empty; writes
  `subclass` and `classes[0]`; legacy / custom notes; Draconic reminder note.
- Spells: counts exclude `getAlwaysPreparedSpells(form)` names; an "Always prepared (subclass): …" line; 2014 EK/AT school budget
  (disabled card + tooltip, a status line; bypassed by Override; skipped with Wizard levels, as on the sheet).

---

## Increment 12: Docs and CHANGELOG
**Status:** done
**Started:** 17:49  **Finished:** 17:52

**What:** Record the change as `CLAUDE.md` requires. Copy the CHANGELOG entry **verbatim** from the plan's "Docs &
changelog" section (`### Added` ×4, `### Changed` ×6, `### Fixed` ×7), and apply every listed doc update.

**Where:**
- `CHANGELOG.md:29`, the `## vX.X.X — Unreleased` block. It is currently empty and directly followed by `## v1.8.1` at `:31`.
- `Docs/known-patterns-and-gotchas.md`:
  - new section "Subclass data is ruleset-keyed — go through `subclassData.js`";
  - extend "Ruleset (2014/2024) must be threaded through spell math in three places" (`:382`) and "Progression picks belong
    to the card's own level" (`:32`);
  - new entry "`getClassLevels` 2024 de-dupe only drops promoted names";
  - replace the stale "Spell Slot Types" half-caster note (`:444-448`) with a line that covers third casters.
- `Docs/client-context-hooks-utils.md`: new entries for `subclassData.js`, `subclassFeatures2024.js` and
  `subclassSpells.js`; updates for `classData`, `multiclass`, `dndHelpers`, `dndConstants`, `levelChoices` and `spellAccess`; and the
  `subclassFeatures.js` note ("Covers all PHB subclasses" → 2014 table).
- `Docs/client-pages.md`: CharacterCreate, CharacterSheet and CharacterEdit.
- `Docs/architecture.md`: a "Key Design Decisions" bullet. **Name `subclassData.js` in it**, so the grep below proves the
  bullet exists (see Concern 7).
- **Do not bump `client/src/version.js`** and do not rename the Unreleased heading. No push was requested.

**Test spec:** n/a. This is documentation, with no assertable logic. The gate is the greps below.

**Gates**
- ☑ **GREEN**: the CHANGELOG entry is present under the correct headings inside `## vX.X.X — Unreleased`. Every
  named doc is updated, all greps come back as stated, and the suite and build are still clean.

**Verify:**
```
rg -l "subclassData|getSubclassFeatures|SUBCLASS_FEATURES_2024|thirdCasterSpellInfo" Docs/known-patterns-and-gotchas.md Docs/client-context-hooks-utils.md Docs/client-pages.md Docs/architecture.md
                                                              # all four paths listed (the plan's `rg … Docs/` also matches plans/, research/, increments/ and proves nothing)
sed -n '/## vX.X.X — Unreleased/,/## v1.8.1/p' CHANGELOG.md   # ### Added (4 bullets), ### Changed (6), ### Fixed (7)
rg -n "LEVEL_SPECIFIC_CHOICES|Fighting Style \(Champion\)" Docs/known-patterns-and-gotchas.md   # ≥1 hit each
rg -n "promoted" Docs/known-patterns-and-gotchas.md          # the new de-dupe entry
rg -n "subclassFeatures2024|subclassSpells" Docs/client-context-hooks-utils.md                 # ≥1 hit each
git diff --quiet client/src/version.js && echo "version untouched"                             # prints "version untouched"
cd client && npm test && npx vite build                      # still green / built
```

**Log:**
- **GREEN** (17:52):
  - `rg -l "subclassData|getSubclassFeatures|SUBCLASS_FEATURES_2024|thirdCasterSpellInfo" <the four docs>` → all four paths listed.
  - `sed -n '/## vX.X.X — Unreleased/,/## v1.8.1/p' CHANGELOG.md` → `### Added` (4 bullets), `### Changed` (6), `### Fixed` (7), copied
    verbatim from the plan's "Docs & changelog" block.
  - `rg -n "LEVEL_SPECIFIC_CHOICES|Fighting Style \(Champion\)" Docs/known-patterns-and-gotchas.md` → :59 and :65;
    `rg -n "promoted" …` → :111 (the new de-dupe entry) and :117.
  - `rg -n "subclassFeatures2024|subclassSpells" Docs/client-context-hooks-utils.md` → :337, :339, :342, :352.
  - `git diff --quiet client/src/version.js && echo "version untouched"` → `version untouched`.
  - `npm test` → `Test Files  12 passed (12)`, `Tests  315 passed (315)`; build → `✓ built in 1.69s`; undeclared checker → `no undeclared identifiers`.

**Changed:**
- `CHANGELOG.md` — the plan's entry under `## vX.X.X — Unreleased` (heading not renamed, no version bump).
- `Docs/known-patterns-and-gotchas.md` — new sections "Subclass data is ruleset-keyed — go through `subclassData.js`" and
  "`getClassLevels` 2024 de-dupe only drops promoted names"; "Progression picks belong to the card's own level" extended
  (`LEVEL_SPECIFIC_CHOICES`, Champion `additional` relocation + `Fighting Style (Champion): X`, edition-following choices); the spell-math
  section extended for EK/AT (`thirdCasterSpellInfo` at all four sites, `isThirdCaster(cls, subclass)`); "Spell Slot Types" now lists third
  casters. Also corrected three statements the change made stale: the editor's ability source (`CLASS_SPELL_ABILITY` → `spellcastingAbilityFor`),
  the `char.features` rule (`SUBCLASS_FEATURES` → `listSubclassFeatures`, plus the `isSubclassPlaceholder`-only rule for Progression rows), and a
  pointer from "Ruleset (2014 / 2024)".
- `Docs/client-context-hooks-utils.md` — new entries for `subclassData.js`, `subclassFeatures2024.js`, `subclassSpells.js`; updated `classData`,
  `multiclass`, `dndHelpers`, `dndConstants`, `levelChoices`, `spellAccess`, `featureDescriptions`; `subclassFeatures.js` now described as the 2014 table.
- `Docs/client-pages.md` — CharacterCreate (Class-step ruleset toggle, gated multiclass subclass, trims, Draconic HP/AC, EK/AT spells),
  CharacterSheet (Features/Progression legacy labels, always-prepared badges, EK/AT limits and school rule, Champion style, Level Up subclass list
  and HP, notice toast, Bear defenses, Draconic AC), CharacterEdit (Subclass select, Draconic notes/Lv Up, EK/AT limits).
- `Docs/architecture.md` — "Key Design Decisions" bullet naming `client/src/utils/subclassData.js`.

---

## Plan-level verification (after Increment 12, before "complete")

**Plan-level verification — executed 2026-09-27 ~17:55 (recorded here and referenced from Increment 12)**

- **Automated:** `npm test` → `Test Files  12 passed (12)`, `Tests  315 passed (315)`; `npx vite build` → `✓ built in 1.69s`; the Increment 4 node
  script → `["Commune","Commune with Nature","Fount of Moonlight","Hallow","Rary's Telepathic Bond","Starry Wisp","Summon Dragon"]`; every grep in
  Increments 6–11 as stated (see their logs); undeclared-identifier checker → `no undeclared identifiers`.
- **Isolation (deviation from the plan's "start the API server on 3001"):** per the orchestrator, the API server was **not** started and MongoDB was
  not touched. The client ran alone on :5174 from a scratch Vite config that proxies `/api` to a dead port, driven by headless Brave with a
  throwaway profile. All seeded characters used `local-uitest-*` ids and were removed; the creator's one saved character (local fallback) was
  deleted; the profile holds no `ond-char-local-*` keys afterwards. Nothing was listening on 3001/5173, so no server backup could be written and
  `server/data/characters/` could not change.
- **Manual/E2E cases 1–17** (observed values):
  1. 2014 Life Cleric 5, WIS 16 — Features "Life Domain": "Bonus Proficiency & Disciple of Life / Lv 1", "Preserve Life / Lv 2"; six "Life Domain"
     badges; `Spells 0/8` (Increment 9). PASS
  2. 2024 Life Cleric 5, WIS 16 — Features card only the Lv 3 entry (Lv 6 adds "Blessed Healer" at level 6); always-prepared Aid, Bless, Cure Wounds,
     Lesser Restoration, Mass Healing Word, Revivify; row 2 "✓ Channel Divinity (1/rest)", row 8 "Ability Score Improvement / Feat, Destroy Undead
     (CR 1)" — no "Domain Feature". PASS (card first mis-asserted by a harness regex; rechecked `3/3`)
  3. 2014 Fighter 3 EK, INT 16 — DC 13 / +5, slots 1st ×2, `0/2`, `0/3`, school rule (Increment 9); four Level Ups to 7 → slots `1st:4 2nd:2`. PASS
  4. 2024 Rogue 10 AT, INT 14 — Mage Hand badge (Rogue 3 check), `Cantrips 0/3`, `Spells 0/7`, slots `4 / 3`, no school restriction (Increment 9). PASS
  5. 2014 Wizard 5 / Fighter (EK) 5 → Level Up Fighter 6 → `1st:4 2nd:3 3rd:3 4th:1` (Increment 9). PASS
  6. 2014 Warlock 5 The Fiend — Fireball offered, Flame Strike not, no always-prepared list (Increment 9). PASS
  7. 2014 Sorcerer 1 Draconic Bloodline, DEX/CON 14, CHA 16 — creator Max HP 9, AC 15 (Increment 10); sheet Level Up (average) → Max HP 16 (+7). PASS
  8. 2024 Sorcerer 2 → 3 via Level Up picking Draconic Sorcery — Max HP 14 → 23 (+9), AC 12 → 15. PASS
  9. 2014 Totem Warrior 3 — Bear → "All except Psychic (while raging)"; Eagle → B/P/S (Increment 8). PASS
  10. 2024 Druid 3 Circle of the Land — "Choose Your Land" lists Arid/Polar/Temperate/Tropical; Polar → `levelChoices {3: {land-terrain: Polar}}`,
      badges Fog Cloud / Hold Person / Ray of Frost "Circle of the Land". PASS
  11. 2024 Ranger 7 Hunter — "↳ Hunter's Prey" at 3 (Colossus Slayer, Horde Breaker), "↳ Defensive Tactics" at 7 (Escape the Horde, Multiattack
      Defense), rows 11/15 only "Archetype Feature — Superior Hunter's Prey / Defense". A 2014 Ranger 11 Hunter switched to 2024 in the editor keeps
      `levelChoices` 3/7/11 unchanged (11 = Volley). PASS
  12. 2024 Fighter 7 Champion with Dueling — Defense on the L7 card: Dueling kept (Actions badge), AC 16 → 17 (Increment 8). PASS
  13. Legacy round-trip — editor select "Knowledge Domain (2014 rules)"; after Save the sheet shows "Knowledge Domain (2014 rules)" with "Blessings of
      Knowledge / Lv 1", "Knowledge of the Ages / Lv 2"; the Progression subclass card lists Life/Light/Trickery/War plus "Kept from the 2014 rules —
      pick a 2024 subclass to switch."; localStorage `subclass: 'Knowledge Domain'`, `ruleset: '2024'`. PASS (card first mis-asserted by the same regex;
      the observed entries above are correct)
  14. Creator gating — 2024 Cleric 3 select lists exactly the four 2024 domains; a Wizard 1 row's select is disabled "(lvl 3+)" (Increment 10). PASS
  15. 2024 ASI count — creator Fighter 8 `Feats 0/3`, Wizard 12 `Feats 0/3` (Increment 10); sheet Progression for a 2024 Fighter 8 shows the ASI line at
      4, 6, 8 (and 12, 14, 16, 19 ahead). PASS
  16. 2024 Wizard 14 Evoker — row 3 "◆ Evocation Savant & Potent Cantrip", rows 6/10/14 "Tradition Feature — Sculpt Spells / Empowered Evocation /
      Overchannel"; Features tab lists four Evoker entries. PASS
  17. 2014 Barbarian 5 unarmored DEX 14 / CON 16 — AC 15 (Increment 8). PASS


The WORKFLOW's finishing rule requires the plan's `## Verification` section to be run.
- **Automated:** the full `npm test`, `npx vite build`, the Increment 4 node script, and every grep in Increments 6–11.
- **Manual/E2E cases 1–17** (plan lines 829–851): most are already covered by the Increment 8–11 UI checks above.
  Record every case in the last increment's Log with its observed value:
  - Case 2: 2024 Life Cleric 5 always-prepared list and no "Domain Feature" at 2/8.
  - Case 10: 2024 Druid 3 Land Polar card.
  - Case 11: 2024 Ranger 7 Hunter, and the 2014 Ranger 11 switch leaving the L11 pick in `levelChoices`.
  - Case 13: the full legacy round-trip.
  - Case 16: 2024 Wizard 14 Evoker, where the Features tab lists four entries.
- **Isolation rules:**
  - Run the API on 3001 and use `cd client && npx vite --port 5174 --strictPort`.
  - Do not touch Settings → Database or campaigns.
  - Stub `window.alert`/`confirm`, and delete test characters via the UI.
  - Diff `server/data/characters/` before and after.
  - Never delete adopted server characters.

---

## Concerns

**1. Several plan asserts cannot go red. They are regression guards, and they are marked [guard] above.** Against today's
code, these pass before any implementation:
- Increment 1: the Wizard 5 + EK 6 multiclass slots, because the private `isThirdCaster(c)` already handles the multiclass case.
- Increment 3: the "no key outside the 2024 lists" and "no 2014 text leakage" checks.
- Increment 5:
  - `getSpellSlots(c,l,r,'X') === getSpellSlots(c,l,r)` and the matching `getSpellInfo` sweep, because the extra argument is ignored today;
  - EK 2 / Champion `null` cases.
- Increment 6:
  - the plan's `{11:{'hunter-option':'Volley'}}` → `changed:false`, because today L11 still has a hunter card;
  - the round-2 Champion key-10 → `changed:false`.
- Increment 7: the Monk-with-shield object case (`12`), because today an object entry falls through to `10 + DEX`.

They are worth keeping. The Hunter and Champion-10 guards are exactly what catches a half-done implementation.
Each increment still has **[RED]** asserts that fail for the stated reason. For the relocation exclusion, I added two red cases
from the plan's own rule: a totem pick at key 5 and a hunter pick at key 5 must stay put. Today both move to key 3.

**2. Increment 6, Champion key 7 under 2014, is an ambiguous orphan. This does not block.**
- Old saves stored every pick under the class's *current* level (gotcha "Progression picks belong to the card's own level").
  A 2014 Champion's `fighting-style` at key 7 can therefore also be an old-save **L1** style that was picked at level 7. The
  2014 rules have no L7 style card.
- The plan routes it to the L10 "Additional Fighting Style" card, not L1. The move is non-lossy.
- The visible effect is limited to a 2014 Champion whose old save has the pick at exactly key 7. When that character reaches 10, the
  L10 card is pre-filled with their L1 style.
- The plan review approved this. I note it only so the user isn't surprised; no spec change.

**3. Shared test file.** `subclassData.test.js` accumulates tests from five increments. A top-of-file import of
a module that doesn't exist yet fails the whole file and hides earlier greens, so the specs sequence the imports
(see Test-infrastructure facts). If the executor sees a file-level import failure at a RED step other than
Increments 1 and 4, the test was written wrong, not the RED.

**4. `getSubclasses(cls, '2024')` as written in the plan (`Object.keys(SUBCLASSES_2024[cls])`) throws for an
empty or unknown class.**
- The creator renders subclass UI keyed on `cls`, which is `''` before a class is picked. Today's code uses
  `classData?.subclasses`, so it never throws.
- A throw inside the render would take out the page through the error boundary.
- I added `getSubclasses('', '2024')` → `[]` to Increment 1's spec. It is the only assert that goes beyond the plan's letter
  in that increment, and it matches the plan's own 2014 branch (`|| []`).

**5. The plan leaves some return shapes implicit, so the specs pin them.**
- `resolveSheetSpells` → `{ spells, missing }`
- `getHunterOptions` → `{ label, options }`, or `null` when the level has no card
- `getLandOptions` → an array of `{ name, desc, label?, legacy }`
- `listSubclassFeatures` on an unresolvable subclass → `[]`
- `getAlwaysPreparedSpells` entries have `source` = the subclass name
- `thirdCasterSchoolStatus` compares `otherListClasses` case-insensitively

If the executor prefers a different shape, it must change the test **and** the Increment 8/9 wiring together
and say so in the Log. The executor must not quietly diverge.

**6. Increments 8–11 have no unit tests, which is expected for page wiring.** Two pieces of real logic remain inside
pages and could be made testable cheaply:
- **`isSubclassPlaceholder`**: the plan extracts it as a sheet-level const. Exporting it from `subclassData.js` would let one
  assert pin the 2014 Cleric-8 double-append trap: `'Domain Feature'` → true, and `'ASI'` / `'Fighting Style'` → false.
- **The editor's `getSpellLimits`**: it is page-local, so the Magic Initiate + third-caster branch is only UI-checked.

Neither changes the slicing. The first is a two-line optional add in Increment 8; the second is a follow-up.

**7. Increment 12's plan grep proves nothing.** `rg … Docs/` also matches `Docs/plans/`, `Docs/research/` and this
file, so it passes even with no doc updated. The Verify above restricts it to the four named docs. That in
turn requires the `architecture.md` bullet to name `subclassData.js` explicitly; the plan's bullet text doesn't
necessarily do so.

**8. Transitional states between Increments 5 and 9 are visible but accepted by the plan (Risks).** After Increment 5:
- `getSpellcastingClasses` and `getMulticlassSpellSlots` already return EK/AT data, so an EK character's sheet shows a DC and slots
  before Increment 9 adds its limits.
- The sheet's inline loop has no third-caster branch yet, so the counters may read `0/0` until then.

The run executes back to back, so nothing ships in between.
