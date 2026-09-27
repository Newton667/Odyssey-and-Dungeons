# Subclass System Rework (2014 + 2024)

**Status:** Draft
**Created:** 2026-09-27
**Scope:** The whole subclass system for both rulesets. It covers ruleset-keyed subclass lists and feature tables, the full 2024 PHB subclass data, Eldritch Knight / Arcane Trickster spellcasting, always-prepared and expanded subclass spells, Draconic HP/AC, the Bear Totem fix, subclass-dependent Progression choices, and the creator / editor / sheet / Level Up / multiclass entry points. It keeps legacy picks. It does **not** cover 2024 *class*-level feature changes (e.g. the 2024 Cleric's Channel Divinity schedule or Blessed Strikes), 2024 multiclass half-caster rounding, Artificer specialist spells, or other subclass numbers the user did not list (see Open questions).

## Goal

The subclass system was built for 2014 and never gained a ruleset dimension. As a result, 2024 characters get the 2014 subclass list and feature levels, a 2024 Circle of the Land Druid can never pick a land, and EK/AT never cast spells. Subclass numbers (domain/oath spells, Draconic resilience, Bear Totem resistance) are also not applied. After this work:
- a 2024 character chooses from the 2024 PHB subclasses and sees their features at the 2024 levels;
- a 2014 character sees exactly what it sees today, except where the audit found 2014 bugs;
- EK/AT characters get slots, cantrips, spells, DC and attack everywhere;
- subclass spells show as always-prepared (2014 Warlock expanded spells widen the list instead);
- a subclass saved under the other ruleset keeps its own features and shows an edition label, and nothing is deleted.

## Current state

The rules baseline is `Docs/research/2026-09-27-subclass-rules-baseline.md` (audit findings #1–#13). Re-verified read sites:

**Subclass data has no ruleset dimension**
- Lists and descriptions live only in `CLASSES[cls].subclasses` / `subclassDescs` (`client/src/utils/classData.js:294-306`). They are read directly at:
  - `CharacterCreate.jsx:918-919` (class-step chips)
  - `CharacterCreate.jsx:1214` (Details select)
  - `CharacterCreate.jsx:1428` (multiclass row select, **no level gate**)
  - `CharacterSheet.jsx:2985` (Progression subclass card)
  - `CharacterSheet.jsx:4294` and `:4359` (Level Up modal)
- Feature tables exist for 2014 only: `client/src/utils/subclassFeatures.js:1-310`, keyed by subclass name with one `{name, desc}` per level. Every consumer reads them without a ruleset:
  - `CharacterSheet.jsx:15` (import)
  - `:1052-1068` (`classFeatureList`, shared by the Actions and Features tabs)
  - `:2828-2836` (Features-tab subclass cards)
  - `:3341-3352` (the Progression table's `isSubFeature` placeholder matching)
- `getSubclassLevel(cls, ruleset)` (`classData.js:436-439`) is correct and is the one ruleset-aware piece.

**Subclass-dependent choices** (`client/src/utils/levelChoices.js`)
- Circle of the Land's terrain is hardcoded to `level === 2` (`:207-209`). A 2024 Druid (subclass at 3) can never pick one (finding #3).
- `LAND_TERRAINS` (`:115-124`) lists only 6 of the 8 2014 circle spells per land. For example, Arctic is missing Freedom of Movement and Ice Storm, and Swamp is missing Insect Plague and Scrying.
- `HUNTER_OPTIONS` (`:81-113`) is 2014-only. The 2024 Hunter has only two choice points (3 and 7, two options each).
- The Champion's Additional Fighting Style is hardcoded to level 10 (`:157-159`); 2024 grants it at 7. The sheet's `selectOption` then stores it as the character's **only** style: `CharacterSheet.jsx:3068-3070` overwrites `fightingStyle` and the `Fighting Style:` feature, so the level-1 style is lost.
- `relocateOrphanedChoices` (`:259-294`) runs on every `char.ruleset` change (`CharacterSheet.jsx:423-433`, deps include `char?.ruleset`) and moves an orphaned pick to the nearest card of the same type. Once Hunter options differ by edition, a 2014 Hunter's level-11 "Volley" would be moved onto the 2024 level-7 Defensive Tactics card. This must be prevented.

**EK/AT spellcasting is absent** (finding #4)
- `CLASSES.Fighter/Rogue.spellcasting` is `false`.
- `getSpellSlots` returns `null` for them (`classData.js:441-454`).
- `getSpellcastingClasses` filters on `info.spellcasting` (`multiclass.js:82-92`).
- `maxSpellLevel` / `getSpellInfo` gate on class alone (`dndHelpers.js:67-120`).
- The editor's `getSpellLimits`, `SPELLCASTING_CLASSES` and `CLASS_SPELL_ABILITY` (`CharacterEdit.jsx:41-99`) and the sheet's inline limits (`CharacterSheet.jsx:2328-2349`) are all class-only.
- The multiclass caster level already has an `isThirdCaster` branch keyed on (class, subclass) (`classData.js:462-474`). It is private, and a *single* third caster still falls through to `getSpellSlots` → `null` (`:492-496`).

**Subclass numbers are not applied**
- `getClassDefenses` checks the non-existent subclass `'Path of the Bear Totem'` (`classData.js:562`, finding #8). The Bear pick is actually stored as the feature string `Totem Spirit (Lv3): Bear` (`CharacterSheet.jsx:3138-3140`).
- Draconic has no AC branch in `unarmoredBaseAC` (`dndHelpers.js:21-26`, called at `CharacterSheet.jsx:987`) or in the creator's AC memo (`CharacterCreate.jsx:254-274`). It has no HP branch in `applyLevelUp` (`CharacterSheet.jsx:742-743`), the creator (`CharacterCreate.jsx:343-372`) or the editor's Lv Up (`CharacterEdit.jsx:610-646`).
- Nothing grants domain/oath/circle/patron spells.

**Text and UI**
- Level-1 feature text hardcodes 2014 subclass levels: `classData.js:296` (Cleric "at level 1"), `:303` (Sorcerer), `:304` (Warlock), and `featureDescriptions.js:47,84,115,121,130` ("at 1st/2nd/3rd level"). The creator lists these as "Level 1 Features" (`CharacterCreate.jsx:901-913`, `:2284-2296`) even for 2024, where they are level-3 features (finding #7).
- **2024 `getClassLevels` drops repeated features** (`classData.js:425-431`). Its de-dupe was meant only for features 2024 promotes (e.g. Paladin/Ranger Spellcasting moving to L1), but it removes **every** name that repeats across levels. Verified under 2024:
  - 'ASI' survives only at level 4 for every class, so the creator's `asiCount` (`CharacterCreate.jsx:325-334`) gives a 2024 character one ASI at any level ≥ 4, and the Progression/Actions feature lists lose later ASI rows.
  - Subclass placeholders survive only at their first level: Cleric `'Domain Feature'` only at 2 (not 6/8/17), Wizard `'Tradition Feature'` only at 6, Barbarian `'Path Feature'` only at 6, Fighter `'Archetype Feature'` only at 7.
  - The 2014 branch returns `CLASS_LEVELS[cls]` untouched and is unaffected.
- Separately, the 2024 Cleric domains have no features at 2 or 8, so those two 2014 `'Domain Feature'` placeholders (`classData.js:280`) must go for 2024.
- The editor's Subclass field is free text (`CharacterEdit.jsx:720-726`, finding #5).
- The creator's Ruleset card is on step 6 (`CharacterCreate.jsx:1373-1393`), after the Details step's Subclass select on step 5 (`:1211-1216`). The subclass list is therefore rendered before the user has chosen the ruleset.

**Relevant gotchas** (`Docs/known-patterns-and-gotchas.md`)
- *Ruleset must be threaded through spell math in three places* (plus the sheet's inline limits — four sites).
- *A one-element `classes` array is not authoritative* — always go through `getCharClasses`.
- *Progression picks belong to the card's own level* — borrowing is allowed only for `subclass` / `pact-boon` / `land-terrain`.
- *`char.features` is not populated for most classes* — derive display from class data.
- *Feat Effects* — don't apply bonuses to stored stats (`maxHp`) at render; apply them on events.
- *Never define React components inside other components* — SheetCtx module-scope components.
- *Store the whole value where the reader looks* — the creator never saves `spellcastingAbility`, so derive it from class (and now subclass).
- *Normalize feat/feature arrays* — `char.features` entries may be objects.

## Approach

Adopt the research doc's central recommendation (Decision 1): add a ruleset dimension to subclass **data** behind single accessors, mirroring `getClassLevels` / `getSubclassLevel`. Every consumer goes through them.

**Data**
- 2014 data stays where it is and unchanged (`CLASSES[cls].subclasses/subclassDescs`, `SUBCLASS_FEATURES`).
- New, clearly separated files hold the 2024 lists and descriptions, the 2024 feature tables (split across two increments), and the subclass-spell tables.
- The least-certain numbers — the 2024 EK/AT counts — sit in one clearly labelled table.

**Resolver** — `getSubclassFeatures(cls, subclass, ruleset)` works in four steps:
1. A name offered in the character's ruleset uses that ruleset's table.
2. A name that is only in the other ruleset's list is a **legacy pick**: it uses that table and is flagged `legacy: true` with its `edition` for labelling.
3. Artificer shares the 2014 table in both rulesets.
4. Anything else (homebrew or a typo) returns `null`, and the UI says there is no built-in data.

**Derived vs stored**
- Always-prepared and expanded spells are **derived at render** from class, subclass, level, ruleset and the land pick. They are never written into `preparedSpells`, so there is no migration and nothing can double-count.
- Draconic HP is applied on **events** (creator, Level Up, Progression pick, editor Lv Up) through a data-driven `SUBCLASS_HP_PER_LEVEL` map. This mirrors `FEAT_HP_PER_LEVEL` and follows the gotcha "don't apply bonuses to stored stats at render".
- Draconic AC is a render-time formula in `unarmoredBaseAC`, driven by `SUBCLASS_UNARMORED_AC`. AC is recomputed every render anyway.

**Third casters** go through one pure helper, `thirdCasterSpellInfo(cls, subclass, level, ruleset)`, which each spell-math site calls. The counts then live in one table rather than four copies. `isThirdCaster(cls, subclass)` is exported and keys on (class, subclass).

**Alternatives considered**
- *Nest the 2014 data under a `'2014'` key* (`SUBCLASS_FEATURES = {'2014': …, '2024': …}`). It lost because it rewrites a 310-line file and every import for no behavioural gain; leaving 2014 in place makes "2014 unchanged" trivially true and testable by reference equality.
- *Write always-prepared spells into `preparedSpells`.* It lost because it needs a migration, and old characters that already added "Bless" by hand would double-count.
- *Convert legacy picks on ruleset switch.* The user ruled this out (decision 4).

## Increments

### Increment 1: Ruleset-keyed subclass lists and accessors
**Status:** not active
**What:** Add the 2024 PHB subclass lists and short own-words descriptions, plus the list/choice accessors every picker will use. There are no consumers yet.
**Where:**
- `client/src/utils/subclassData.js` (new)
- `client/src/utils/subclassData.test.js` (new)
- `client/src/utils/classData.js:462-465` — export `isThirdCaster`
**Details:**
- `SUBCLASSES_2024 = { Barbarian: { 'Path of the Berserker': '<desc>', … }, … }`. It holds exactly the names in the research doc's corrected 2024 table (`Docs/research/2026-09-27-subclass-rules-baseline.md:16-30`), in that order, with a 1-2 sentence mechanical description for each in the app's own words.
- Artificer is **not** duplicated: `getSubclasses('Artificer', '2024')` returns `CLASSES.Artificer.subclasses`.
- `export const SAME_IN_BOTH_RULESETS = new Set(['Artificer'])`.
- `getSubclasses(cls, ruleset = '2014')` → `string[]`. 2014 (or any non-`'2024'` value) returns `CLASSES[cls]?.subclasses || []` — the same array reference, so 2014 is provably unchanged. `'2024'` returns `Object.keys(SUBCLASSES_2024[cls])`, or the Artificer list.
- `getSubclassDesc(cls, subclass, ruleset)` looks in the ruleset's table first, then the other one.
- `subclassEdition(cls, subclass, ruleset)` → `'2014' | '2024' | null`. It returns the ruleset when the name is offered there, the other edition when only that one offers it, and `null` otherwise.
- `offeredSubclass(cls, subclass, classLevel, ruleset)` → `subclass` when `classLevel >= getSubclassLevel(cls, ruleset)` **and** `getSubclasses(cls, ruleset)` includes it, else `''`. Used by the creator's save trim (primary class and multiclass rows).
- `subclassSelectOptions(cls, current, ruleset)` → `[{ value, label, legacy }]`: the ruleset's list, plus the current value appended when it is non-empty and not in the list. The appended label is `"<name> (2014 rules)"` or `"(2024 rules)"` from `subclassEdition`, or `"<name> (custom)"` when the edition is `null`. Used by the editor so an unknown or legacy value is never destroyed.
- `classData.js`: rename the private `isThirdCaster = (c) =>` to `export function isThirdCaster(cls, subclass)`, keyed on `THIRD_CASTER_SUBCLASSES = { Fighter: 'Eldritch Knight', Rogue: 'Arcane Trickster' }` (also exported). Update the two internal callers (`:465`, `:474`) to `isThirdCaster(c.class, c.subclass)`. Nothing else in the codebase calls it (verified with `rg -n isThirdCaster`).
**Verify:**
- `cd client && npm test` — new `subclassData.test.js` passes:
  - 2014 lists are `toBe` `CLASSES[cls].subclasses` for all 13 classes.
  - 2024 lists equal the research table for all 12 PHB classes; the Artificer 2024 list equals the 2014 list.
  - `subclassEdition('Warlock','The Fiend','2024') === '2014'`; `subclassEdition('Fighter','Champion','2024') === '2024'`; `subclassEdition('Wizard','Chronurgy','2014') === null`.
  - `offeredSubclass('Cleric','Life Domain',2,'2024') === ''`; `offeredSubclass('Cleric','Knowledge Domain',3,'2024') === ''`; `offeredSubclass('Cleric','Life Domain',1,'2014') === 'Life Domain'`.
  - `subclassSelectOptions('Cleric','Knowledge Domain','2024')` ends with `{ value: 'Knowledge Domain', legacy: true }`.
  - `isThirdCaster('Fighter','Eldritch Knight')` is true; `isThirdCaster('Fighter','Champion')` is false.
- `cd client && npx vite build` clean.

### Increment 2: 2024 feature tables, part 1 (Barbarian–Monk) and the resolver
**Status:** not active
**What:** Add the 2024 feature tables for Barbarian, Bard, Cleric, Druid, Fighter and Monk, and the single resolver every display will use.
**Where:**
- `client/src/utils/subclassFeatures2024.js` (new)
- `client/src/utils/subclassData.js` (add the resolver and the list helper)
- `client/src/utils/subclassData.test.js`
**Details:**
- `SUBCLASS_FEATURES_2024` has the same shape as the 2014 table: `{ [subclass]: { [level]: { name, desc } } }`, one entry per level. Several features gained at one level are joined with `" & "`, as the 2014 file does.
- Descriptions are 1-3 sentences, mechanical, in the app's own words, never book text.
- Feature names per level (subclass feature levels from the research table). The DND auditor must confirm the names during plan review; where a name is uncertain the executor keeps the neutral name shown.

**Barbarian** (levels 3 / 6 / 10 / 14)

| Subclass | 3 | 6 | 10 | 14 |
|---|---|---|---|---|
| Path of the Berserker | Frenzy | Mindless Rage | Retaliation | Intimidating Presence |
| Path of the Wild Heart | Animal Speaker & Rage of the Wilds | Aspect of the Wilds | Nature Speaker | Power of the Wilds |
| Path of the World Tree | Vitality of the Tree | Branches of the Tree | Battering Roots | Travel along the Tree |
| Path of the Zealot | Divine Fury & Warrior of the Gods | Fanatical Focus | Zealous Presence | Rage of the Gods |

**Bard** (levels 3 / 6 / 14)

| Subclass | 3 | 6 | 14 |
|---|---|---|---|
| College of Dance | Dazzling Footwork | Inspiring Movement & Tandem Footwork | Leading Evasion |
| College of Glamour | Beguiling Magic & Mantle of Inspiration | Mantle of Majesty | Unbreakable Majesty |
| College of Lore | Bonus Proficiencies & Cutting Words | Magical Discoveries | Peerless Skill |
| College of Valor | Combat Inspiration & Martial Training | Extra Attack | Battle Magic |

**Cleric** (levels 3 / 6 / 17)

| Subclass | 3 | 6 | 17 |
|---|---|---|---|
| Life Domain | Disciple of Life, Life Domain Spells & Preserve Life | Blessed Healer | Supreme Healing |
| Light Domain | Light Domain Spells, Radiance of the Dawn & Warding Flare | Improved Warding Flare | Corona of Light |
| Trickery Domain | Blessing of the Trickster, Invoke Duplicity & Trickery Domain Spells | Trickster's Transposition | Improved Duplicity |
| War Domain | Guided Strike, War Domain Spells & War Priest | War God's Blessing | Avatar of Battle |

**Druid** (levels 3 / 6 / 10 / 14)

| Subclass | 3 | 6 | 10 | 14 |
|---|---|---|---|---|
| Circle of the Land | Circle of the Land Spells & Land's Aid | Natural Recovery | Nature's Ward | Nature's Sanctuary |
| Circle of the Moon | Circle Forms & Circle of the Moon Spells | Improved Circle Forms | Moonlight Step | Lunar Form |
| Circle of the Sea | Circle of the Sea Spells & Wrath of the Sea | Aquatic Affinity | Stormborn | Oceanic Gift |
| Circle of the Stars | Star Map & Starry Form | Cosmic Omen | Twinkling Constellations | Full of Stars |

**Fighter** (levels 3 / 7 / 10 / 15 / 18)

| Subclass | 3 | 7 | 10 | 15 | 18 |
|---|---|---|---|---|---|
| Battle Master | Combat Superiority & Student of War | Know Your Enemy | Improved Combat Superiority | Relentless | Ultimate Combat Superiority |
| Champion | Improved Critical & Remarkable Athlete | Additional Fighting Style | Heroic Warrior | Superior Critical | Survivor |
| Eldritch Knight | Spellcasting & War Bond | War Magic | Eldritch Strike | Arcane Charge | Improved War Magic |
| Psi Warrior | Psionic Power | Telekinetic Adept | Guarded Mind | Bulwark of Force | Telekinetic Master |

**Monk** (levels 3 / 6 / 11 / 17)

| Subclass | 3 | 6 | 11 | 17 |
|---|---|---|---|---|
| Warrior of Mercy | Hand of Harm, Hand of Healing & Implements of Mercy | Physician's Touch | Flurry of Healing and Harm | Hand of Ultimate Mercy |
| Warrior of Shadow | Shadow Arts | Shadow Step | Improved Shadow Step | Cloak of Shadows |
| Warrior of the Elements | Elemental Attunement & Manipulate Elements | Elemental Burst | Stride of the Elements | Elemental Epitome |
| Warrior of the Open Hand | Open Hand Technique | Wholeness of Body | Fleet Step | Quivering Palm |

- Resolver in `subclassData.js`: `getSubclassFeatures(cls, subclass, ruleset = '2014')` → `{ edition, legacy, features } | null`.
  - The name is offered in `ruleset` → `features = ruleset === '2024' && !SAME_IN_BOTH_RULESETS.has(cls) ? SUBCLASS_FEATURES_2024[subclass] : SUBCLASS_FEATURES[subclass]`, `legacy: false`.
  - The name is offered only in the other ruleset → that ruleset's table, `legacy: true`, `edition` set to that ruleset.
  - Otherwise → `null`.
  - If a table entry is missing, return `null` rather than a wrong table.
- `listSubclassFeatures(cls, subclass, ruleset, maxLevel)` → `[{ level, name, desc, edition, legacy }]` sorted by level and filtered to `level <= maxLevel`. It is the single list the sheet's Actions/Features/Progression displays consume.
**Verify:**
- `cd client && npm test`:
  - For every 2014 subclass of every class, `getSubclassFeatures(cls, sc, '2014').features` is `toBe` `SUBCLASS_FEATURES[sc]` with `legacy === false`.
  - For each part-1 class, every `getSubclasses(cls,'2024')` name has a 2024 table whose keys are **exactly** that class's 2024 feature levels (Barbarian 3/6/10/14, Bard 3/6/14, Cleric 3/6/17, Druid 3/6/10/14, Fighter 3/7/10/15/18, Monk 3/6/11/17), and every entry has a non-empty `name` and `desc`.
  - `getSubclassFeatures('Cleric','Knowledge Domain','2024')` → `{ edition: '2014', legacy: true }` with levels 1/2/6/8/17.
  - `getSubclassFeatures('Artificer','Armorer','2024').legacy === false`.
  - `getSubclassFeatures('Wizard','Chronurgy','2014') === null`.
- `npx vite build` clean.

### Increment 3: 2024 feature tables, part 2 (Paladin–Wizard)
**Status:** not active
**What:** Finish `SUBCLASS_FEATURES_2024` for Paladin, Ranger, Rogue, Sorcerer, Warlock and Wizard, and lock completeness for all twelve classes.
**Where:**
- `client/src/utils/subclassFeatures2024.js`
- `client/src/utils/subclassData.test.js`
**Details:** Same shape and writing rules as Increment 2. Feature names per level:

**Paladin** (levels 3 / 7 / 15 / 20)

| Subclass | 3 | 7 | 15 | 20 |
|---|---|---|---|---|
| Oath of Devotion | Oath of Devotion Spells & Sacred Weapon | Aura of Devotion | Smite of Protection | Holy Nimbus |
| Oath of Glory | Inspiring Smite, Oath of Glory Spells & Peerless Athlete | Aura of Alacrity | Glorious Defense | Living Legend |
| Oath of the Ancients | Nature's Wrath & Oath of the Ancients Spells | Aura of Warding | Undying Sentinel | Elder Champion |
| Oath of Vengeance | Oath of Vengeance Spells & Vow of Enmity | Relentless Avenger | Soul of Vengeance | Avenging Angel |

**Ranger** (levels 3 / 7 / 11 / 15)

| Subclass | 3 | 7 | 11 | 15 |
|---|---|---|---|---|
| Beast Master | Primal Companion | Exceptional Training | Bestial Fury | Share Spells |
| Fey Wanderer | Dreadful Strikes, Fey Wanderer Spells & Otherworldly Glamour | Beguiling Twist | Fey Reinforcements | Misty Wanderer |
| Gloom Stalker | Dread Ambusher, Gloom Stalker Spells & Umbral Sight | Iron Mind | Stalker's Flurry | Shadowy Dodge |
| Hunter | Hunter's Lore & Hunter's Prey | Defensive Tactics | Superior Hunter's Prey | Superior Hunter's Defense |

**Rogue** (levels 3 / 9 / 13 / 17)

| Subclass | 3 | 9 | 13 | 17 |
|---|---|---|---|---|
| Arcane Trickster | Spellcasting & Mage Hand Legerdemain | Magical Ambush | Versatile Trickster | Spell Thief |
| Assassin | Assassinate & Assassin's Tools | Infiltration Expertise | Envenom Weapons | Death Strike |
| Soulknife | Psionic Power & Psychic Blades | Soul Blades | Psychic Veil | Rend Mind |
| Thief | Fast Hands & Second-Story Work | Supreme Sneak | Use Magic Device | Thief's Reflexes |

**Sorcerer** (levels 3 / 6 / 14 / 18)

| Subclass | 3 | 6 | 14 | 18 |
|---|---|---|---|---|
| Aberrant Sorcery | Psionic Spells & Telepathic Speech | Psionic Sorcery & Psychic Defenses | Revelation in Flesh | Warping Implosion |
| Clockwork Sorcery | Clockwork Spells & Restore Balance | Bastion of Law | Trance of Order | Clockwork Cavalcade |
| Draconic Sorcery | Draconic Resilience & Draconic Spells | Elemental Affinity | Dragon Wings | Dragon Companion |
| Wild Magic Sorcery | Wild Magic Surge & Tides of Chaos | Bend Luck | Controlled Chaos | Tamed Surge |

**Warlock** (levels 3 / 6 / 10 / 14)

| Subclass | 3 | 6 | 10 | 14 |
|---|---|---|---|---|
| Archfey Patron | Archfey Spells & Steps of the Fey | Misty Escape | Beguiling Defenses | Bewitching Magic |
| Celestial Patron | Celestial Spells & Healing Light | Radiant Soul | Celestial Resilience | Searing Vengeance |
| Fiend Patron | Dark One's Blessing & Fiend Spells | Dark One's Own Luck | Fiendish Resilience | Hurl Through Hell |
| Great Old One Patron | Awakened Mind, Great Old One Spells & Psychic Spells | Clairvoyant Combatant | Eldritch Hex & Thought Shield | Create Thrall |

**Wizard** (levels 3 / 6 / 10 / 14)

| Subclass | 3 | 6 | 10 | 14 |
|---|---|---|---|---|
| Abjurer | Abjuration Savant & Arcane Ward | Projected Ward | Spell Breaker | Spell Resistance |
| Diviner | Divination Savant & Portent | Expert Divination | The Third Eye | Greater Portent |
| Evoker | Evocation Savant & Potent Cantrip | Sculpt Spells | Empowered Evocation | Overchannel |
| Illusionist | Illusion Savant & Improved Illusions | Phantasmal Creatures | Illusory Self | Illusory Reality |

Draconic Sorcery's level-3 description must state both numbers: HP maximum +3 (+1 per later Sorcerer level), and unarmored AC 10 + DEX + CHA (see Rules notes).
**Verify:**
- `cd client && npm test`:
  - Extend the Increment 2 completeness test to **every** class. Each `getSubclasses(cls,'2024')` name except Artificer has a table with exactly the 2024 feature levels (Paladin 3/7/15/20, Ranger 3/7/11/15, Rogue 3/9/13/17, Sorcerer 3/6/14/18, Warlock 3/6/10/14, Wizard 3/6/10/14).
  - No key in `SUBCLASS_FEATURES_2024` is outside the 2024 lists.
  - No 2024 description contains `"at level 1"`, `"1st level"` or `"2nd level"` (guards against 2014 leakage).
- `npx vite build` clean.

### Increment 4: Subclass spell tables, EK/AT count table, spell-name check
**Status:** not active
**What:** Add pure data tables for subclass-granted spells in both rulesets, the Eldritch Knight / Arcane Trickster progression table (with the least-certain 2024 counts isolated), and a check that every spell name exists in `spells.json`.
**Where:**
- `client/src/utils/subclassSpells.js` (new, **no imports**, so a plain `node` script can load it)
- `client/src/utils/subclassSpells.test.js` (new)
- `client/src/utils/subclassData.js` (add `getSubclassSpells`)
- `client/src/utils/classData.js` near `:361` (add `THIRD_CASTER_SLOTS`)
**Details:**
- **`SUBCLASS_SPELLS_2014`** is keyed by subclass. Values are `{ mode: 'prepared' | 'expanded', byLevel: { [classLevel]: [names] } }`, except the Warlock, whose `byLevel` is keyed by **spell level** (`keyedBy: 'spellLevel'`).
  - **Cleric domains** (prepared, cleric levels 1/3/5/7/9):
    - Knowledge: Command, Identify / Augury, Suggestion / Nondetection, Speak with Dead / Arcane Eye, Confusion / Legend Lore, Scrying
    - Life: Bless, Cure Wounds / Lesser Restoration, Spiritual Weapon / Beacon of Hope, Revivify / Death Ward, Guardian of Faith / Mass Cure Wounds, Raise Dead
    - Light: Burning Hands, Faerie Fire / Flaming Sphere, Scorching Ray / Daylight, Fireball / Guardian of Faith, Wall of Fire / Flame Strike, Scrying. Also level 1: the bonus cantrip Light.
    - Nature: Animal Friendship, Speak with Animals / Barkskin, Spike Growth / Plant Growth, Wind Wall / Dominate Beast, Grasping Vine / Insect Plague, Tree Stride
    - Tempest: Fog Cloud, Thunderwave / Gust of Wind, Shatter / Call Lightning, Sleet Storm / Control Water, Ice Storm / Destructive Wave, Insect Plague
    - Trickery: Charm Person, Disguise Self / Mirror Image, Pass without Trace / Blink, Dispel Magic / Dimension Door, Polymorph / Dominate Person, Modify Memory
    - War: Divine Favor, Shield of Faith / Magic Weapon, Spiritual Weapon / Crusader's Mantle, Spirit Guardians / Freedom of Movement, Stoneskin / Flame Strike, Hold Monster
  - **Paladin oaths** (prepared, paladin levels 3/5/9/13/17):
    - Devotion: Protection from Evil and Good, Sanctuary / Lesser Restoration, Zone of Truth / Beacon of Hope, Dispel Magic / Freedom of Movement, Guardian of Faith / Commune, Flame Strike
    - Ancients: Ensnaring Strike, Speak with Animals / Moonbeam, Misty Step / Plant Growth, Protection from Energy / Ice Storm, Stoneskin / Commune with Nature, Tree Stride
    - Vengeance: Bane, Hunter's Mark / Hold Person, Misty Step / Haste, Protection from Energy / Banishment, Dimension Door / Hold Monster, Scrying
    - Glory (Theros): Guiding Bolt, Heroism / Enhance Ability, Magic Weapon / Haste, Protection from Energy / Compulsion, Freedom of Movement / Commune, Flame Strike
  - **Warlock expanded** (`mode: 'expanded'`, keyed by spell level 1-5, **not prepared**):
    - The Archfey: Faerie Fire, Sleep / Calm Emotions, Phantasmal Force / Blink, Plant Growth / Dominate Beast, Greater Invisibility / Dominate Person, Seeming
    - The Fiend: Burning Hands, Command / Blindness/Deafness, Scorching Ray / Fireball, Stinking Cloud / Fire Shield, Wall of Fire / Flame Strike, Hallow
    - The Great Old One: Dissonant Whispers, Tasha's Hideous Laughter / Detect Thoughts, Phantasmal Force / Clairvoyance, Sending / Dominate Beast, Evard's Black Tentacles / Dominate Person, Telekinesis
- **`LAND_SPELLS_2014`** (prepared, druid levels 3/5/7/9):
  - Arctic: Hold Person, Spike Growth / Sleet Storm, Slow / Freedom of Movement, Ice Storm / Commune with Nature, Cone of Cold
  - Coast: Mirror Image, Misty Step / Water Breathing, Water Walk / Control Water, Freedom of Movement / Conjure Elemental, Scrying
  - Desert: Blur, Silence / Create Food and Water, Protection from Energy / Blight, Hallucinatory Terrain / Insect Plague, Wall of Stone
  - Forest: Barkskin, Spider Climb / Call Lightning, Plant Growth / Divination, Freedom of Movement / Commune with Nature, Tree Stride
  - Grassland: Invisibility, Pass without Trace / Daylight, Haste / Divination, Freedom of Movement / Dream, Insect Plague
  - Mountain: Spider Climb, Spike Growth / Lightning Bolt, Meld into Stone / Stone Shape, Stoneskin / Passwall, Wall of Stone
  - Swamp: Darkness, Melf's Acid Arrow / Water Walk, Stinking Cloud / Freedom of Movement, Locate Creature / Insect Plague, Scrying
  - Underdark: Spider Climb, Web / Gaseous Form, Stinking Cloud / Greater Invisibility, Stone Shape / Cloudkill, Insect Plague
- **`SUBCLASS_SPELLS_2024`** — every entry is prepared.
  - **Cleric** (levels 3/5/7/9):
    - Life: Aid, Bless, Cure Wounds, Lesser Restoration / Mass Healing Word, Revivify / Aura of Life, Death Ward / Greater Restoration, Mass Cure Wounds
    - Light: Burning Hands, Faerie Fire, Scorching Ray, See Invisibility / Daylight, Fireball / Arcane Eye, Wall of Fire / Flame Strike, Scrying
    - Trickery: Charm Person, Disguise Self, Invisibility, Pass without Trace / Hypnotic Pattern, Nondetection / Confusion, Dimension Door / Dominate Person, Modify Memory
    - War: Guiding Bolt, Magic Weapon, Shield of Faith, Spiritual Weapon / Crusader's Mantle, Spirit Guardians / Fire Shield, Freedom of Movement / Hold Monster, Steel Wind Strike
  - **Druid** (levels 3/5/7/9):
    - Moon: Cure Wounds, Moonbeam, Starry Wisp / Conjure Animals / Fount of Moonlight / Mass Cure Wounds
    - Sea: Fog Cloud, Gust of Wind, Ray of Frost, Shatter, Thunderwave / Lightning Bolt, Water Breathing / Control Water, Ice Storm / Conjure Elemental, Hold Monster
    - Stars (level 3 only): Guidance, Guiding Bolt
  - **Paladin** (levels 3/5/9/13/17):
    - Devotion: Protection from Evil and Good, Shield of Faith / Aid, Zone of Truth / Beacon of Hope, Dispel Magic / Freedom of Movement, Guardian of Faith / Commune, Flame Strike
    - Glory: Guiding Bolt, Heroism / Enhance Ability, Magic Weapon / Haste, Protection from Energy / Compulsion, Freedom of Movement / Legend Lore, Yolande's Regal Presence
    - Ancients: same as 2014
    - Vengeance: same as 2014
  - **Ranger** (levels 3/5/9/13/17):
    - Fey Wanderer: Charm Person / Misty Step / Summon Fey / Dimension Door / Mislead
    - Gloom Stalker: Disguise Self / Rope Trick / Fear / Greater Invisibility / Seeming
  - **Sorcerer** (levels 3/5/7/9):
    - Aberrant: Arms of Hadar, Calm Emotions, Detect Thoughts, Dissonant Whispers, Mind Sliver / Hunger of Hadar, Sending / Evard's Black Tentacles, Summon Aberration / Rary's Telepathic Bond, Telekinesis
    - Clockwork: Aid, Alarm, Lesser Restoration, Protection from Evil and Good / Dispel Magic, Protection from Energy / Freedom of Movement, Summon Construct / Greater Restoration, Wall of Force
    - Draconic: Alter Self, Chromatic Orb, Command, Dragon's Breath / Fear, Fly / Arcane Eye, Charm Monster / Legend Lore, Summon Dragon
  - **Warlock** (levels 3/5/7/9, **prepared** in 2024):
    - Archfey: Calm Emotions, Faerie Fire, Misty Step, Phantasmal Force, Sleep / Blink, Plant Growth / Dominate Beast, Greater Invisibility / Dominate Person, Seeming
    - Celestial: Aid, Cure Wounds, Guiding Bolt, Lesser Restoration, Light, Sacred Flame / Daylight, Revivify / Guardian of Faith, Wall of Fire / Greater Restoration, Summon Celestial
    - Fiend: Burning Hands, Command, Scorching Ray, Suggestion / Fireball, Stinking Cloud / Fire Shield, Wall of Fire / Geas, Insect Plague
    - Great Old One: Detect Thoughts, Dissonant Whispers, Phantasmal Force, Tasha's Hideous Laughter / Clairvoyance, Hunger of Hadar / Confusion, Summon Aberration / Modify Memory, Telekinesis
  - **Bard** — Glamour (level 3): Charm Person, Mirror Image
- **`LAND_SPELLS_2024`** (druid levels 3/5/7/9):
  - Arid: Blur, Burning Hands, Fire Bolt / Fireball / Blight / Wall of Stone
  - Polar: Fog Cloud, Hold Person, Ray of Frost / Sleet Storm / Ice Storm / Cone of Cold
  - Temperate: Misty Step, Shocking Grasp, Sleep / Lightning Bolt / Freedom of Movement / Tree Stride
  - Tropical: Acid Splash, Ray of Sickness, Web / Stinking Cloud / Polymorph / Insect Plague
- **Spell names missing from `spells.json`** (measured 2026-09-27 against the file's 521 entries): `export const SUBCLASS_SPELLS_NOT_IN_DATA = new Set(['Commune', 'Commune with Nature', 'Hallow', 'Starry Wisp', 'Fount of Moonlight', "Rary's Telepathic Bond", 'Summon Dragon'])`. They stay in the tables because they are rules-accurate; the UI shows them name-only. Use the exact `spells.json` spellings `Melf's Acid Arrow`, `Tasha's Hideous Laughter` and `Evard's Black Tentacles`, which exist.
- `allSubclassSpellNames()` → a `Set` of every name in every table above.
- **`THIRD_CASTER_PROGRESSION`** is its own block, headed `// ⚠ LEAST-CERTAIN DATA — 2024 counts to be confirmed by the rules auditor`. Arrays have 20 entries indexed by class level − 1:
  - `'2014'`:
    - `'Eldritch Knight'`: `{ cantrips: [0,0,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,3], spells: [0,0,3,4,4,4,5,6,6,7,8,8,9,10,10,11,11,11,12,13], type: 'known', schools: ['Abjuration','Evocation'], anySchoolLevels: [3,8,14,20], alwaysKnownCantrips: [] }`
    - `'Arcane Trickster'`: the same, but `cantrips: [0,0,3,3,3,3,3,3,3,4,…4]`, `schools: ['Enchantment','Illusion']`, `alwaysKnownCantrips: ['Mage Hand']`
  - `'2024'`: the same count arrays, `type: 'prepared'`, `schools: null`, `anySchoolLevels: []`. AT keeps `alwaysKnownCantrips: ['Mage Hand']`.
  - Cantrip arrays hold the **book totals**, which include Mage Hand for AT.
- **`THIRD_CASTER_SLOTS`** in `classData.js` has the same values in both rulesets, as 4-element arrays:

  | Class level | Slots |
  |---|---|
  | 1–2 | none |
  | 3 | `[2,0,0,0]` |
  | 4–6 | `[3,0,0,0]` |
  | 7–9 | `[4,2,0,0]` |
  | 10–12 | `[4,3,0,0]` |
  | 13–15 | `[4,3,2,0]` |
  | 16–18 | `[4,3,3,0]` |
  | 19–20 | `[4,3,3,1]` |

- `getSubclassSpells(cls, subclass, classLevel, ruleset, { land } = {})` in `subclassData.js` → `{ alwaysPrepared: string[], expanded: string[], edition }`.
  - Chooses the table by `subclassEdition`, so a legacy 2014 patron on a 2024 character stays `expanded`.
  - Class-level tables include every row `<= classLevel`.
  - The warlock spell-level table includes rows `<= maxSpellLevel('Warlock', classLevel)`. Take a `maxSpellLevel` argument (or inline the 1/3/5/7/9 → 1-5 mapping) to avoid importing `dndHelpers` into data code.
  - Circle of the Land reads `land` (a land name) from whichever land table contains it (2014 names and 2024 names are disjoint). With no land, it returns an empty `alwaysPrepared`.
**Verify:**
- `cd client && npm test` — `subclassSpells.test.js`:
  - Every name in `allSubclassSpellNames()` is either in `spells.json` or in `SUBCLASS_SPELLS_NOT_IN_DATA`, and every member of that set is truly absent from `spells.json` (so adding a spell later forces the set to be cleaned).
  - `getSubclassSpells('Cleric','Life Domain',5,'2014').alwaysPrepared` equals Bless, Cure Wounds, Lesser Restoration, Spiritual Weapon, Beacon of Hope, Revivify.
  - The same at 5 with `'2024'` equals Aid, Bless, Cure Wounds, Lesser Restoration, Mass Healing Word, Revivify.
  - `getSubclassSpells('Warlock','The Fiend',5,'2014')` → `alwaysPrepared: []` and `expanded` = the spell-level 1-3 Fiend rows.
  - `getSubclassSpells('Warlock','The Fiend',5,'2024')` (legacy) → still `expanded`, `edition: '2014'`.
  - `getSubclassSpells('Warlock','Fiend Patron',5,'2024').alwaysPrepared` includes Fireball.
  - `getSubclassSpells('Druid','Circle of the Land',3,'2024',{land:'Arid'}).alwaysPrepared` equals Blur, Burning Hands, Fire Bolt.
  - Circle of the Land with no land → `[]`.
  - Every `THIRD_CASTER_PROGRESSION` array has length 20 and is non-decreasing.
- Script check (must print exactly the 7 names above):
  ```
  cd client && node --input-type=module -e "import fs from 'node:fs'; const m = await import('./src/utils/subclassSpells.js'); const have = new Set(JSON.parse(fs.readFileSync('src/data/spells.json','utf8')).map(s => s.name)); console.log(JSON.stringify([...m.allSubclassSpellNames()].filter(n => !have.has(n)).sort()))"
  ```
- `npx vite build` clean.

### Increment 5: Third-caster spellcasting and subclass spell access in the pure helpers
**Status:** not active
**What:** Make slots, caster classes, spell limits, max spell level and spell-list access subclass-aware for EK/AT. Add the helpers that turn subclass spells into sheet data.
**Where:**
- `client/src/utils/classData.js:441-454` (`getSpellSlots`), `:486-508` (`getMulticlassSpellSlots`)
- `client/src/utils/multiclass.js:76-92`
- `client/src/utils/dndHelpers.js:67-120`
- `client/src/utils/spellAccess.js:15-34`
- `client/src/utils/subclassData.js`
- Tests: `classData.test.js` (new), `multiclass.test.js`, `dndHelpers.test.js`, `spellAccess.test.js`, `subclassData.test.js`
**Details:**
- **Slots and ability** (`classData.js`):
  - `getSpellSlots(className, level, ruleset = '2014', subclass = '')`: when `isThirdCaster(cls, subclass)`, return `THIRD_CASTER_SLOTS[level] || null`; otherwise behave exactly as today.
  - `getMulticlassSpellSlots` passes `c.subclass` in the single-caster branch (`:495`) and deletes the stale comment at `:496`.
  - Export `spellcastingAbilityFor(cls, subclass)` → `CLASSES[cls]?.spellcastingAbility || (isThirdCaster(cls, subclass) ? 'intelligence' : null)`.
  - Export `spellListClassFor(cls, subclass)` → `'Wizard'` for third casters, else `cls`.
- **Caster classes** (`multiclass.js`):
  - `spellcastingStartLevel(className, ruleset, subclass = '')` returns 3 for third casters.
  - `getSpellcastingClasses` includes a class when `spellcastingAbilityFor(c.class, c.subclass)` is truthy and `c.level >= spellcastingStartLevel(...)`, pushing `{ class, subclass, level, ability }`. The existing Paladin/Ranger behaviour is unchanged.
- **Spell info** (`subclassData.js`): `thirdCasterSpellInfo(cls, subclass, level, ruleset)` → `null` unless it is a third caster at level ≥ 3. Otherwise it returns:
  - `{ cantrips, spells, type, maxLevel, schools, anySchool, alwaysKnownCantrips }`
  - `cantrips` = table value − `alwaysKnownCantrips.length`. This is the number the player picks, because the always-known cantrip is shown separately and excluded from counters.
  - `maxLevel`: 1 at 3, 2 at 7, 3 at 13, 4 at 19.
  - `anySchool` = number of `anySchoolLevels <= level` (2014 only).
- **Spell math** (`dndHelpers.js`):
  - `maxSpellLevel(cls, lvl, ruleset, subclass = '')` returns the third-caster max when applicable.
  - `getSpellInfo(cls, lvl, abilityMod, CLASSES, ruleset, subclass = '')` returns early with a third-caster branch: `{ cantrips, spellsKnown: spells, type: 'known', maxLevel }` for 2014, or `{ cantrips, prepareCount: spells, type: 'prepared', maxLevel }` for 2024. It does this before the `CLASSES[cls]?.spellcasting` gate.
- **2014 school budget**: `thirdCasterSchoolStatus({ info, pickedSpells, otherListClasses })` → `{ offSchool, allowed, atLimit }`. It counts leveled picks whose `classes` include Wizard, whose `school` is outside `info.schools`, and which are not on any other list the character has. With `schools === null` (2024) it returns `atLimit: false`.
- **Spell access** (`spellAccess.js`):
  - `allowedSpellClasses(char)` maps each class through `spellListClassFor(c.class, c.subclass)` only when `c.level >= 3`, and still keeps the class's own name. An EK Fighter 3 therefore yields `['fighter','wizard']`.
  - New `extraSpellNames(char)` → a `Set` of the `expanded` names from `getSubclassSpells` across `getCharClasses(char)` (2014 Warlock patrons).
  - New `getAlwaysPreparedSpells(char)` → `[{ name, source }]`. It unions `alwaysPrepared` across classes, plus AT's `alwaysKnownCantrips`. The land comes from `char.features` (`Circle Land: X`; normalize object entries with `typeof f === 'string' ? f : f?.name`), falling back to a `land-terrain` value in `char.levelChoices`.
  - New `resolveSheetSpells({ preparedNames, alwaysPrepared, allSpells })` → the spell objects for the sheet:
    - prepared spells as-is;
    - always-prepared spells as **shallow copies** tagged `_alwaysPrepared: source` (never mutate the shared list — gotcha "Never hand out a module's own data array");
    - de-duplicated by name, with the always-prepared tag winning;
    - unresolvable always-prepared names returned in a separate `missing` array.
  - New `spellLimitCounts(spells)` → `{ cantrips, leveled }`, excluding `source === 'race'` and `_alwaysPrepared`.
**Verify:**
- `cd client && npm test`:
  - **Slots**:
    - `getSpellSlots('Fighter',3,'2014','Eldritch Knight')` → `[2,0,0,0]`
    - `getSpellSlots('Rogue',19,'2024','Arcane Trickster')` → `[4,3,3,1]`
    - `getSpellSlots('Fighter',2,'2014','Eldritch Knight')` → `null`
    - `getSpellSlots('Fighter',5,'2014','Champion')` → `null`
    - For every non-Fighter/Rogue class, levels 1-20, both rulesets: `getSpellSlots(c,l,r,'X')` deep-equals `getSpellSlots(c,l,r)`.
    - `getMulticlassSpellSlots([{class:'Fighter',subclass:'Eldritch Knight',level:7}]).standard` → `[4,2,0,0]`.
    - Wizard 5 + EK Fighter 6 → caster level 7 → `[4,3,3,1,0,0,0,0,0]`.
  - **Caster classes**: `getSpellcastingClasses` for EK 3 → `[{ability:'intelligence'}]`; EK 2 (no subclass yet) → `[]`. The existing Paladin/Ranger tests still pass.
  - **Spell info**:
    - `getSpellInfo('Fighter',10,3,CLASSES,'2014','Eldritch Knight')` → `{ cantrips:3, spellsKnown:7, type:'known', maxLevel:2 }`
    - The 2024 equivalent → `{ prepareCount:7, type:'prepared' }`
    - `thirdCasterSpellInfo('Rogue','Arcane Trickster',3,'2014').cantrips === 2`
    - For every class other than Fighter/Rogue, `getSpellInfo(…, 'X')` equals `getSpellInfo(…)`.
  - **School budget**: a 2014 EK 3 with one enchantment spell → `atLimit: true`; with an evocation spell → `offSchool: 0`.
  - **Spell access**:
    - `allowedSpellClasses({class:'Fighter',subclass:'Eldritch Knight',level:3})` includes `'wizard'`.
    - `extraSpellNames` for a 2014 Fiend 5 has Fireball and not Flame Strike.
    - `resolveSheetSpells` never mutates its input (freeze it in the test), and `spellLimitCounts` ignores tagged spells.
- `npx vite build` clean.

### Increment 6: Subclass-dependent Progression choices per ruleset
**Status:** not active
**What:** Give every subclass-dependent `levelChoices` entry its real choice level and options per ruleset, and stop `relocateOrphanedChoices` from moving level-specific picks across editions.
**Where:**
- `client/src/utils/levelChoices.js:1-5` (imports), `:81-124` (tables), `:140-223` (`getLevelChoices`), `:259-294` (relocation)
- `client/src/utils/levelChoices.test.js`
**Details:**
- **Land choice:** replace `level === 2` (`:207`) with `level === getSubclassLevel('Druid', ruleset)`. Stamp `edition: subclassEdition('Druid', subclass, ruleset)`.
- **Land tables:**
  - `LAND_TERRAINS` (2014) stays keyed Arctic…Underdark, but each description is **generated** from `LAND_SPELLS_2014` (`'Always-prepared circle spells: …'`). This fixes the incomplete lists (a 2014 text-only bug).
  - Add `LAND_TERRAINS_2024` (Arid/Polar/Temperate/Tropical), generated the same way from `LAND_SPELLS_2024`.
  - Export `getLandOptions(edition, current = '')`. It returns the edition's lands, plus `current` appended when it is non-empty and not in that list, labelled `"<name> (2014 rules)"` / `"(2024 rules)"` (from whichever land table contains it) — mirroring `subclassSelectOptions`. A stored legacy land is therefore always visible and selected.
- **Hunter options:**
  - Add `HUNTER_OPTIONS_2024 = { 3: { label: "Hunter's Prey", options: { 'Colossus Slayer', 'Horde Breaker' } }, 7: { label: 'Defensive Tactics', options: { 'Escape the Horde', 'Multiattack Defense' } } }`, with own-words descriptions.
  - Export `getHunterOptions(level, edition, current = '')`, where `'2024'` selects the new table and anything else selects the existing `HUNTER_OPTIONS`. As with lands, a stored `current` pick that isn't in that level's options is appended with its edition label.
  - `getLevelChoices` uses the edition from `subclassEdition('Ranger', subclass, ruleset)` and stamps `edition` on the choice.
  - Keep the export `HUNTER_OPTIONS` (2014) for compatibility.
- **Champion:** `level === (subclassEdition('Fighter', subclass, ruleset) === '2024' ? 7 : 10)`, with `additional: true` on that choice.
- **Unchanged schedules:** Battle Master maneuvers (3 / 7 / 10 / 15) are the same in both editions. The Totem Warrior (2014-only name) keeps 3 / 6 / 14 even on a 2024 character, because legacy picks keep their own features.
- **Relocation:**
  - In `relocateOrphanedChoices`, skip types in `const LEVEL_SPECIFIC_CHOICES = new Set(['totem', 'hunter-option'])`. These have different option sets per level and were always stored under their own level, so they are never old-save orphans; moving them would put a pick on a card whose options don't include it. Document this in a comment.
  - A `fighting-style` orphan sitting at a Champion additional level (7 or 10) may only move to a card whose choice has `additional: true`. Otherwise a 2014 Champion's L7 pick would land on the L1 class-style card. Carry the flag through `typesAt` (e.g. compare a `type + (additional ? ':additional' : '')` key).
- `levelChoices.js` imports `subclassEdition` from `subclassData.js` and the land tables from `subclassSpells.js`. Check there is no cycle: `subclassData` must not import `levelChoices`.
**Verify:**
- `cd client && npm test`:
  - **Land:**
    - `getLevelChoices('Druid',3,'Circle of the Land','2024')` contains `land-terrain` with `edition:'2024'`; level 2 under 2024 does not.
    - `getLevelChoices('Druid',2,'Circle of the Land','2014')` contains it.
  - **Hunter:**
    - Under 2024, Hunter has `hunter-option` only at 3 and 7, and `getHunterOptions(3,'2024')` has exactly two options.
    - Under 2014: 3/7/11/15.
  - **Champion:** 2024 has fighting-style at 7 (`additional: true`) and not at 10; 2014 at 10.
  - **Relocation:**
    - `relocateOrphanedChoices({11:{'hunter-option':'Volley'}}, {cls:'Ranger', subclass:'Hunter', ruleset:'2024'})` → `changed: false`.
    - A 2014 Land pick at key 2 relocates to key 3 under 2024.
    - `relocateOrphanedChoices({7:{'fighting-style':'Defense'}}, {cls:'Fighter', subclass:'Champion', ruleset:'2014'})` → the pick moves to key `10`, **not** `1`.
    - `relocateOrphanedChoices({10:{'fighting-style':'Defense'}}, {cls:'Fighter', subclass:'Champion', ruleset:'2014'})` → `changed: false` (an existing, correctly placed 2014 Champion pick never moves). The stored entry's type at its source level must be mapped through the **same** key function `typesAt` uses (`type + (additional ? ':additional' : '')` for that level), so it is recognised as belonging to its card rather than relying on the target being occupied. *(Plan-review round 2.)*
    - All pre-existing `levelChoices.test.js` cases still pass.
  - **Option helpers:**
    - `getLandOptions('2024','Arctic')` ends with `{ name: 'Arctic', legacy: true }` labelled "(2014 rules)"; `getLandOptions('2024','Polar')` has no appended entry.
    - `getHunterOptions(3,'2024','Giant Killer')` ends with a legacy "Giant Killer (2014 rules)" entry; `getHunterOptions(3,'2014','Giant Killer')` has none.
  - **Land text:** `LAND_TERRAINS.Arctic` includes "Ice Storm".
- `npx vite build` clean.
- `rg -n "level === 2\)" client/src/utils/levelChoices.js` returns no Circle-of-the-Land line.

### Increment 7: Subclass numbers and ruleset-correct text (2024 de-dupe, Bear Totem, Draconic, placeholders)
**Status:** not active
**What:**
- Fix the 2024 `getClassLevels` de-dupe that deletes repeated ASIs and subclass placeholders.
- Fix Bear Totem resistance.
- Add data-driven Draconic HP and AC.
- Drop the 2024 Cleric's 2014 domain-feature placeholders.
- Make the subclass-choice text level-agnostic.
- Hide not-yet-chosen subclass features from the "level 1 features" list.
**Where:**
- `client/src/utils/classData.js`: `:296`, `:303`, `:304` (feature text); `:379-433` (`RULESET_2024_ADD`, `RULESET_2024_SUBCLASS`, `getClassLevels` incl. the de-dupe at `:425-431`); `:557-567` (`getClassDefenses`)
- `client/src/utils/dndConstants.js:129` (next to `FEAT_HP_PER_LEVEL`)
- `client/src/utils/dndHelpers.js:18-26`
- `client/src/utils/featureDescriptions.js:47,84,115,121,130`
- `client/src/utils/subclassData.js`
- Tests: `classData.test.js`, `dndHelpers.test.js`, `subclassData.test.js`
**Details:**
- **Bear Totem:** `getClassDefenses(className, level, subclass, { features = [], levelChoices = {} } = {})`.
  - Barbarian keeps its rage B/P/S resistances.
  - When `subclass === 'Path of the Totem Warrior' && level >= 3` **and** the Bear pick is present, replace them with `['All except Psychic (while raging)']`. The pick is present when a normalized feature matches `/^Totem Spirit \(Lv3\):\s*Bear$/`, or when `levelChoices['3']?.totem === 'Bear'` or `levelChoices['Barbarian:3']?.totem === 'Bear'`.
  - Delete the unreachable `'Path of the Bear Totem'` check.
  - The 2024 Wild Heart's Bear is chosen each rage, so it stays descriptive.
- **Draconic HP:** `export const SUBCLASS_HP_PER_LEVEL = { 'Draconic Bloodline': 1, 'Draconic Sorcery': 1 }` in `dndConstants.js`.
  - `subclassHpBonus({ class, subclass, level })` in `subclassData.js` → `(SUBCLASS_HP_PER_LEVEL[subclass] || 0) * level` for Sorcerer entries. Both editions total +1 per sorcerer level once the subclass is held; 2024 grants "+3 at 3rd" = its level.
  - `subclassHpDelta(before, after)` = `subclassHpBonus(after) - subclassHpBonus(before)`.
  - `subclassRepickHp(before, after)` → `{ apply, remind, switched }`, the decision for a subclass **re-pick** on the Progression tab: `apply = max(delta, 0)` is added automatically; `remind = max(-delta, 0)` is **never** subtracted automatically, because characters that took Draconic before this change never received the bonus. The sheet shows a reminder instead (Increment 8). `switched` is true when `before.subclass` is non-empty (a change between two subclasses, not a first pick). *(Plan-review round 2, orchestrator decision: notice approach, no new stored field.)* Because the remind side never subtracts, switching Draconic → other → Draconic would add the bonus a second time; so whenever `apply > 0 && switched`, the sheet also shows a notice (Increment 8). First picks stay silent.
- **Draconic AC:** `export const SUBCLASS_UNARMORED_AC = { 'Draconic Bloodline': { base: 13, add: ['dex'] }, 'Draconic Sorcery': { base: 10, add: ['dex', 'cha'] } }`.
  - `unarmoredBaseAC(classes, { dex, con, wis, cha } = {}, hasShield)` normalizes **every** entry to `{ class, subclass }` first (a string `s` → `{ class: s, subclass: '' }`). The Barbarian and Monk branches key on `entry.class` for both shapes, so passing `getCharClasses(char)` objects (Increment 8) keeps Unarmored Defense working.
  - Each entry whose subclass is in the map adds a candidate `base + Σ mods`, and the best candidate wins. Formulas don't stack, and a shield is still allowed (the caller adds it).
- **2024 de-dupe fix:** restrict the de-dupe loop (`:425-431`) to the names 2024 actually promotes: `const promoted = new Set([...Object.values(RULESET_2024_ADD[cls] || {}).flat(), RULESET_2024_SUBCLASS[cls]?.name].filter(Boolean))`. Only a name in `promoted` is dropped from later levels (e.g. Paladin/Ranger `'Spellcasting'` at 2). `'ASI'`, `'<X> Feature'` placeholders and every other repeated name stay at every level they appear. This also fixes the creator's `asiCount` (`CharacterCreate.jsx:325-334`) with no creator change.
- **Cleric placeholders:** in `getClassLevels`, add `RULESET_2024_REMOVE = { Cleric: { 2: ['Domain Feature'], 8: ['Domain Feature'] } }`, applied in the 2024 branch before de-duplication. 2014 still returns `CLASS_LEVELS[cls]` untouched.
- **Level-1 features:** `export function getLevel1Features(cls, ruleset)` → `CLASSES[cls].features`, filtered under 2024 to drop entries whose name (before `' — '`) equals `RULESET_2024_SUBCLASS[cls]?.name`.
- **Text:** reword the Cleric/Sorcerer/Warlock `features` strings and `FEATURE_DESCRIPTIONS` `Divine Domain`, `Sacred Oath`, `Sorcerous Origin`, `Otherworldly Patron`, `Arcane Tradition` so they name no level and no edition-specific subclass. For example: "Choose your Cleric subclass (Divine Domain), gaining domain spells and features." The Progression tab already shows "Subclass at Level: N".
**Verify:**
- `cd client && npm test`:
  - **Bear Totem:** `getClassDefenses('Barbarian',3,'Path of the Totem Warrior',{features:['Totem Spirit (Lv3): Bear']}).resistances` → `['All except Psychic (while raging)']`. The object form `{name:'Totem Spirit (Lv3): Bear'}` gives the same. Eagle → B/P/S.
  - **Draconic AC:**
    - `unarmoredBaseAC([{class:'Sorcerer',subclass:'Draconic Bloodline'}],{dex:3})` → 16.
    - `unarmoredBaseAC([{class:'Sorcerer',subclass:'Draconic Sorcery'}],{dex:3,cha:4})` → 17.
    - `unarmoredBaseAC([{class:'Barbarian',subclass:''}],{dex:2,con:3,wis:1})` → 15.
    - `unarmoredBaseAC([{class:'Monk',subclass:''}],{dex:2,con:3,wis:1}, true)` → 12 (no WIS with a shield).
    - All existing `unarmoredBaseAC` string tests still pass.
  - **Draconic HP:**
    - `subclassHpDelta({class:'Sorcerer',subclass:'',level:2},{class:'Sorcerer',subclass:'Draconic Sorcery',level:3})` → 3.
    - `subclassRepickHp({class:'Sorcerer',subclass:'Wild Magic Sorcery',level:5},{class:'Sorcerer',subclass:'Draconic Sorcery',level:5})` → `{ apply: 5, remind: 0, switched: true }`; the reverse → `{ apply: 0, remind: 5, switched: true }`.
    - First pick: `subclassRepickHp({class:'Sorcerer',subclass:'',level:3},{class:'Sorcerer',subclass:'Draconic Sorcery',level:3})` → `{ apply: 3, remind: 0, switched: false }`.
  - **2024 de-dupe:**
    - `getClassLevels('Cleric','2024')[17]` includes `'Domain Feature'`; `[8]` includes `'ASI'` and not `'Domain Feature'`; `[2]` lacks `'Domain Feature'` and `[6]` has it.
    - `getClassLevels('Wizard','2024')[10]` includes `'Tradition Feature'`.
    - `getClassLevels('Paladin','2024')[2]` does **not** include `'Spellcasting'` (the de-dupe that must stay).
    - For every class, the levels holding `'ASI'` under 2024 equal the levels holding it in `CLASS_LEVELS` (the app's tables, e.g. Fighter 4/6/8/12/14/16/19, Rogue 4/8/10/12/16/19, others 4/8/12/16/19; the 2024 Epic Boon at 19 is out of scope).
    - `getClassLevels('Cleric','2014')` is `toBe` `CLASS_LEVELS.Cleric`.
  - **Level-1 features:** `getLevel1Features('Cleric','2024')` has no `Divine Domain` entry, and the 2014 result has it.
  - **Text:** no `FEATURE_DESCRIPTIONS` value for those five names matches `/at (level \d|\d(st|nd|rd|th) level)/`.
- `rg -n "Path of the Bear Totem" client/src` returns nothing.
- `npx vite build` clean.

### Increment 8: Character sheet — subclass features, choices, Level Up, AC/HP/defenses
**Status:** not active
**What:** Route every sheet subclass read through the new accessors, label legacy picks, fix the Champion style overwrite, and apply Draconic/Bear Totem numbers.
**Where:** `client/src/pages/CharacterSheet.jsx`:
- `:9` and `:14-15` (imports)
- `:742-747` (`applyLevelUp` HP)
- `:947-994` (`calcAC`)
- `:1049-1079` (`classFeatureList`)
- `:1089-1097` (defenses)
- `:2826-2854` (Features tab cards)
- `:2985`, `:2991-2992` (`getChoiceOptions`)
- `:3009-3025` (`getSelected`)
- `:3056-3072`, `:3142-3146` (`selectOption`)
- `:3293-3301` (class info)
- `:3338-3355` (progression rows)
- `:4289-4295`, `:4353-4362` (Level Up modal)
**Details:**
- **Features lists.** Delete the `SUBCLASS_FEATURES` import.
  - `classFeatureList`: build `subMap` from `listSubclassFeatures(cc.class, cc.subclass, char.ruleset, cc.level)` (source label = subclass, plus `' (2014 rules)'` / `' (2024 rules)'` when `legacy`).
  - `renderFeaturesTab`: build `subclassCards` from the same helper, and show the edition label on legacy cards. A class with a subclass whose resolver returns `null` gets a card saying "No built-in feature data for this subclass" instead of vanishing silently.
- **Progression rows.**
  - Replace the `isSubFeature` / `SUBCLASS_FEATURES[subclass]?.[l]` lookup with the resolved table entry at `l`.
  - If that level has a subclass placeholder, append `— name` as today. Match placeholders **only** with the `/^(Path|Oath|Domain|Archetype|College|Circle|Tradition|Patron|Specialist|Origin) Feature$/` regex (the second half of `isFeatureNoise` at `:1047-1048`; extract it as a shared `isSubclassPlaceholder` const). Do **not** reuse `isFeatureNoise` itself: it also matches `'ASI'` / `'Fighting Style'` and would append the subclass name twice at 2014 Cleric 8 (`['ASI', 'Destroy Undead (CR 1)', 'Domain Feature']`).
  - Otherwise render one extra line `◆ <name>`, which covers the 2014 L1 domain/origin features and the 2024 L3 features.
  - The row's `hasContent` (`:3314`) is also true when the resolved subclass table has an entry at that level (belt and braces, so no subclass level is ever hidden).
  - Show `spellcastingAbilityFor(cls, subclass)` at `:3298` instead of `classInfo.spellcasting`.
- **Choice options.**
  - `'subclass'` → `getSubclasses(cls, char.ruleset)` with `getSubclassDesc`. When the current subclass is legacy, render a one-line note in that card: "Kept from the 2014 rules — pick a 2024 subclass to switch." It is plain JSX in the render function, not a new component.
  - `'hunter-option'` → `getHunterOptions(choice.level, choice.edition, <stored pick>)`, and the label at `:3143` uses the same helper.
  - `'land-terrain'` → `getLandOptions(choice.edition, <stored pick>)`. The stored pick is the card's `getSelected()` value, so a legacy land or Hunter option is listed with its edition label.
- **Champion.**
  - `selectOption` `fighting-style` with `choice.additional`: write only a `Fighting Style (Champion): X` feature (replacing any previous one with that prefix). Leave `fightingStyle` and the primary style feature untouched. The existing `fightingStyles` regex at `:916` already reads it.
  - `getSelected` for an additional card falls back to that feature, not `char.fightingStyle`.
- **Subclass pick HP.** In `selectOption` `'subclass'`, compute `subclassRepickHp(before, after)` for this class at its current level.
  - `apply > 0` → add it to `maxHp` and to `currentHp` (clamped to `[0, maxHp]`) in the same `updates`.
  - `remind > 0` → do **not** lower `maxHp`. Show a notice: "Draconic Resilience no longer applies — lower Max HP by N in the editor if it was added." Add `const [noticeToast, setNoticeToast] = useState(null)` next to the other toast states (`:401-403`, before the early returns), and render it the way `healToast` is rendered, cleared after ~5 s.
  - `apply > 0 && switched` → apply it **and** show a notice: "Max HP +N (Draconic Resilience). If you switched away from Draconic earlier without lowering Max HP, lower it by N in the editor so it isn't counted twice." First picks (`switched` false) apply silently. UI check: 2024 Sorcerer 5 Draconic → Wild Magic → Draconic shows both notices and Max HP rises by 5 once per Draconic pick (the notice makes the double add visible).
- **Level Up modal.**
  - `needsSubclass` uses `getSubclasses(lu.targetClass, char.ruleset).length`, and the `<select>` lists `getSubclasses(...)`.
  - In `applyLevelUp`, `gain += subclassHpDelta(beforeEntry, afterEntry)` for the target class. Entries are `{class, subclass, level}` before and after, so a Draconic level-up gives +1 and a 2024 pick at 3 gives +3.
- **AC.** `unarmoredBaseAC(getCharClasses(char), { dex, con, wis, cha: modVal(scores.charisma ?? 10) }, hasShield)`. Add `scores.charisma` and `char?.subclass` to the memo deps.
- **Defenses.** `getClassDefenses(c.class, c.level, c.subclass, { features: char.features, levelChoices: char.levelChoices })`.
- **Hooks.** No new component is defined inside the sheet. No hook is added after the `if (loading)` / `if (!char)` returns at `:1014-1015`.
**Verify:**
- `cd client && npm test` stays green, and `npx vite build` is clean.
- Each of these greps returns nothing:
  - `rg -n "SUBCLASS_FEATURES" client/src/pages`
  - `rg -n "\.subclasses\b|subclassDescs" client/src/pages/CharacterSheet.jsx`
  - `rg -n "HUNTER_OPTIONS\[|LAND_TERRAINS\)" client/src/pages`
- UI on `:5174` (see Verification):
  - A 2024 Cleric 3 (Life Domain) shows "Disciple of Life…" at Lv 3 on the Features tab.
  - A 2024 character saved with "The Fiend" shows "The Fiend (2014 rules)".
  - A 2014 Barbarian 3 with the Bear totem shows "All except Psychic (while raging)".
  - A 2014 Sorcerer 1 (Draconic Bloodline), unarmored, DEX 14 → AC 15.
  - A 2014 Barbarian 5, unarmored, DEX 14 / CON 16 → AC 15 (Unarmored Defense still applies with object entries).
  - A 2024 Wizard 14 (Evoker): Progression rows 10 and 14 show "Tradition Feature — Empowered Evocation" and "— Overchannel".
  - A 2024 Fighter 8: the Progression row at 8 lists "Ability Score Improvement / Feat" as a feature line (before the de-dupe fix that row showed no ASI feature). *(Plan-review round 2: the ASI choice cards come from `getLevelChoices` and were never affected, so they can't gate this fix; the creator's feat allowance is checked in Verification 15.)*
  - A 2024 Sorcerer 5 switching Draconic Sorcery → Wild Magic Sorcery on Progression: Max HP unchanged, notice "lower Max HP by 5" shown.

### Increment 9: Character sheet — spells (always-prepared, EK/AT, expanded lists)
**Status:** not active
**What:**
- Show always-prepared subclass spells without counting them.
- Give EK/AT their limits, DC and attack.
- Widen the 2014 Warlock browser with expanded spells.
- Enforce the 2014 EK/AT school budget.
**Where:** `client/src/pages/CharacterSheet.jsx`:
- `:18` (import)
- `:213-236` (`SpellCard`)
- `:451-459` (`spellData` effect)
- `:462-486` (browser effect)
- `:1143-1144` (cantrip split)
- `:2314-2349` (DC and limits)
- `:2505-2527` (browser rows)
- `:2538-2600` (list render)
**Details:**
- **Memo.** Before the early returns, add `const alwaysPrepared = useMemo(() => getAlwaysPreparedSpells(char), [char?.class, char?.subclass, char?.level, char?.classes, char?.ruleset, char?.features, char?.levelChoices])`, plus a stable `alwaysPreparedKey` (a joined string of names).
- **Spell data.** The `spellData` effect builds `resolveSheetSpells({ preparedNames: char.preparedSpells || [], alwaysPrepared, allSpells })` and stores `missing` in state. Its deps add `alwaysPreparedKey`. Remove the early return for an empty `preparedSpells` when `alwaysPrepared` is non-empty.
- **SpellCard.**
  - When `spell._alwaysPrepared` is set, hide the unprepare button and show a small badge with the source (e.g. `Life Domain`).
  - Render the `missing` names as a plain dim line "Always prepared (not in the spell list): Commune, …".
- **Limits.** Replace the two `spellData.filter(...)` counts (`:2343-2344`) with `spellLimitCounts(spellData)`. In the per-class loop, when `thirdCasterSpellInfo(c.class, c.subclass, c.level, char.ruleset)` is non-null, add its `cantrips` and `spells`; the existing branches are unchanged. DC/attack come for free from the updated `getSpellcastingClasses`.
- **Browser.**
  - Filter with `spellMatchesClasses(s, allowed) || extras.has(s.name)`, where `extras = extraSpellNames(char)`. Add `char?.subclass` and `char?.level` to the deps.
  - For each 2014 third-caster class, compute `thirdCasterSchoolStatus`. An off-school leveled result is `capped` when `atLimit`, with the tooltip "Eldritch Knight spells must be Abjuration or Evocation (N of M any-school picks used)".
  - A browser result whose name is in `alwaysPrepared` renders as granted: a disabled, filled ✓ button (not "+") with the tooltip "Always prepared — <source>", so it can't be added a second time or removed.
**Verify:**
- `cd client && npm test` green, and `npx vite build` clean.
- UI on `:5174`:
  - **2014 Cleric 5, Life, WIS 16:** a "Life Domain" badge on Bless, Cure Wounds, Lesser Restoration, Spiritual Weapon, Beacon of Hope and Revivify. The counter shows `0/8` with no manual picks.
  - **2014 Fighter 3, EK, INT 16:** "Spell Save DC 13 / +5". Slots 1st ×2. Cantrips `0/2`, Spells `0/3`. Browser search "fire" shows Fire Bolt and Burning Hands. After adding Sleep, Charm Person is disabled.
  - **2014 Warlock 5, The Fiend:** browser "Fireball" appears; "Flame Strike" does not.
  - **2014 Cleric 5, Life:** browser search "Bless" shows it with a disabled ✓ and the "Always prepared — Life Domain" tooltip.
  - **2024 Rogue 3, AT:** Mage Hand is shown with an "Arcane Trickster" badge; Cantrips `0/2`.

### Increment 10: Character creator
**Status:** not active
**What:** Make every creator subclass picker ruleset-aware and gated, trim stale picks, apply Draconic HP/AC, and support EK/AT and subclass spells on the Spells step.
**Where:** `client/src/pages/CharacterCreate.jsx`:
- `:12-17` (imports)
- `:254-274` (AC)
- `:343-372` (HP)
- `:375-395` (`spellInfo` / available spells)
- `:399-403`, `:487-496` (trim and save)
- `:863-886` (Class step; add the ruleset toggle)
- `:901-924` (features and subclass chips)
- `:1211-1216` (Details select)
- `:1334` (AC label)
- `:1409-1441` (multiclass rows)
- `:1697-1705` (no-spellcasting message)
- `:1798-1860` (pickers)
- `:2284-2296` (Review features)
**Details:**
- **Ruleset toggle.** Add a compact 2014/2024 toggle on the Class step, above the class grid, bound to the same `ruleset` / `setRuleset` state as the step-6 card. The step-6 card stays. The subclass list (step 5) and subclass level depend on it, and it was previously chosen afterwards.
- **Subclass pickers.**
  - Class-step chips → `getSubclasses(cls, ruleset)` / `getSubclassDesc`.
  - Details select → `getSubclasses(cls, ruleset)`.
  - Add a `useEffect` on `[cls, ruleset]` that clears `subclass` when it is no longer offered, and clears each extra row's `subclass` likewise.
- **Multiclass rows** get the same gate as the primary. The select is `disabled` below `getSubclassLevel(ec.class, ruleset)`, with the label `(lvl N+)`, and lists `getSubclasses(ec.class, ruleset)`.
- **Save.**
  - `savedSubclass = offeredSubclass(cls, subclass, level, ruleset)`.
  - Multiclass rows use `offeredSubclass(ec.class, ec.subclass, ec.level, ruleset)`.
  - The Review badges (`:2190-2192`) show the same trimmed values.
- **HP.** `computedHp += subclassHpBonus({ class: cls, subclass: activeSubclass, level })` plus the same for each clean extra row. `activeSubclass = offeredSubclass(...)` is computed before the memo; add it to the deps.
- **AC.** In the unarmored branch, replace the final `return 10 + dexMod + shield` with `return unarmoredBaseAC([{ class: cls, subclass: activeSubclass }], { dex: dexMod, cha: chaMod }, hasShield) + shield`. The Barbarian/Monk lines stay exactly as they are. The label at `:1334` shows "Unarmored (Draconic)" when the subclass is in `SUBCLASS_UNARMORED_AC`.
- **Features.** `:901-913` and `:2284-2296` use `getLevel1Features(cls, ruleset)`.
- **Spells step.**
  - `spellInfo = getSpellInfo(cls, level, abilityMod, CLASSES, ruleset, activeSubclass)`, with `ability = spellcastingAbilityFor(cls, activeSubclass)`.
  - The available-spells effect queries `queryLocalSpells({ cls: spellListClassFor(cls, activeSubclass) })`, unions the 2014 expanded names (`getSubclassSpells(...).expanded`, resolved from `getAllLocalSpells()`), and adds `activeSubclass` / `ruleset` to its deps.
  - For a 2014 third caster, an off-school leveled spell is disabled once `thirdCasterSchoolStatus(...).atLimit`.
  - Show an info line "Always prepared from <subclass>: …" from `getSubclassSpells(...).alwaysPrepared`, plus AT's Mage Hand. It is display-only and not saved.
  - The "no spellcasting" message says Fighters/Rogues cast only as Eldritch Knight / Arcane Trickster from level 3.
**Verify:**
- `cd client && npm test` green, and `npx vite build` clean.
- `rg -n "\.subclasses\b|subclassDescs" client/src/pages/CharacterCreate.jsx` returns nothing.
- UI on `:5174`:
  - **2024 ruleset, Cleric, level 3:** the Subclass select lists exactly Life/Light/Trickery/War Domain. "Level 1 Features" does not list Divine Domain.
  - **Multiclass row, Wizard level 1 under 2024:** the subclass select is disabled.
  - **2014 Sorcerer 1, Draconic Bloodline, DEX 14, CON 14:** Max HP 9, AC 15.
  - **2014 Fighter 3, EK:** the Spells step offers Wizard cantrips (2) and spells (3, level 1).
  - **Switching the ruleset to 2024 after picking Knowledge Domain:** the Subclass select resets to "— Choose subclass —".

### Increment 11: Character editor
**Status:** not active
**What:**
- Replace the free-text Subclass field with a class/ruleset-aware select that keeps legacy or custom values.
- Wire EK/AT and subclass spells into the editor's limits and lists.
- Apply Draconic HP on Lv Up.
**Where:** `client/src/pages/CharacterEdit.jsx`:
- `:41-99` (`SPELLCASTING_CLASSES`, `CLASS_SPELL_ABILITY`, `getSpellLimits`)
- `:300-316` (caster classes and spell list)
- `:357-385` (limits)
- `:610-646` (Lv Up)
- `:718-727` (Subclass field)
- `:1343-1352` (spell counts)
- `:1519-1524` (info bar)
**Details:**
- **Subclass select.**
  - `<select>` over `subclassSelectOptions(primaryClass, form.subclass, form.ruleset || '2014')`, with a leading `— None —` option.
  - It is disabled while `(primary class level) < getSubclassLevel(primaryClass, ruleset)` **and** `form.subclass` is empty. A non-empty legacy value is always shown, so nothing is destroyed.
  - The onChange keeps today's write to `subclass` **and** `classes[0]` (`:723-725`, gotcha "A one-element `classes` array is not authoritative").
  - Under the select, a dim note: legacy → "From the 2014 rules — its features are kept"; custom → "Not a built-in subclass — no features will be listed".
- **Draconic.**
  - When the chosen subclass is in `SUBCLASS_HP_PER_LEVEL`, show a reminder note like the Tough note at `:1735`: "Draconic resilience adds +1 max HP per Sorcerer level — adjust Max HP if this is a new pick". The editor stays manual on subclass change, per the documented editor rule.
  - Lv Up (`:612`, `:620`, `:637`) adds `subclassHpDelta(before, after)` for the class being levelled, alongside `featHp`, and includes it in the alert text.
- **Spell math.**
  - `formCasterClasses` filters on `spellcastingAbilityFor(c.class, c.subclass)` instead of `SPELLCASTING_CLASSES`.
  - The spell-list effect queries `spellListClassFor(c.class, c.subclass)` and unions the `extraSpellNames(form)` spells (from `queryLocalSpells({})` filtered by name).
  - `CLASS_SPELL_ABILITY[x]` reads at `:360`, `:375` and `:407` go through `spellcastingAbilityFor`.
  - `getSpellLimits(cls, lvl, abilityMod, ruleset, featNames, subclass = '')` gets a third-caster branch from `thirdCasterSpellInfo`, placed before the `SPELLCASTING_CLASSES` gate. It includes Magic Initiate exactly like the other branches: `{ cantrips: info.cantrips + (mi ? MAGIC_INITIATE_CANTRIPS : 0), maxSpells: info.spells + bonusSpells, type: info.type, maxLevel: Math.max(info.maxLevel, mi ? 1 : 0), ...bonus }`. Pass `c.subclass` at `:370` and `:374`.
- **School budget.** The editor's leveled-spell picker enforces the 2014 EK/AT budget with `thirdCasterSchoolStatus`, matching the sheet and creator: an off-school spell is disabled once `atLimit`, with the same tooltip. The "Override — add any spell" toggle bypasses it, as it does every other limit.
- **Counts.** `currentCantrips` / `currentLeveled` (`:1350-1351`) exclude names in `getAlwaysPreparedSpells(form)`. An "Always prepared (subclass)" line lists them above the pickers.
**Verify:**
- `cd client && npm test` green, and `npx vite build` clean.
- `rg -n "<input[^>]*form\.subclass" client/src/pages/CharacterEdit.jsx` returns nothing.
- UI on `:5174`:
  - **2014 Cleric 3 (Knowledge Domain), ruleset switched to 2024:** the select shows "Knowledge Domain (2014 rules)" selected, plus the four 2024 domains; Save keeps `subclass: 'Knowledge Domain'`.
  - **2014 Fighter 3, EK, INT 16:** the Spells section shows 2 cantrips / 3 known, up to level 1, drawn from the Wizard list. After adding Sleep, Charm Person is disabled (unless Override is on).
  - **The same Fighter with the Magic Initiate feat:** 4 cantrips / 4 spells, max level 1 (explicit check of the Magic Initiate + third-caster branch; `getSpellLimits` is local to the page, so there is no unit test).
  - **2014 Sorcerer 4, Draconic:** Lv Up (average, CON +1) alert shows +6 (4 + 1 + 1 Draconic).

### Increment 12: Docs and CHANGELOG
**Status:** not active
**What:** Record the change as CLAUDE.md requires.
**Where:**
- `CHANGELOG.md` (the `## vX.X.X — Unreleased` block at `:29`)
- `Docs/known-patterns-and-gotchas.md`
- `Docs/client-context-hooks-utils.md`
- `Docs/client-pages.md`
- `Docs/architecture.md`
**Details:** The exact content is in "Docs & changelog" below. No version bump (the user has not asked to push).
**Verify:**
- `rg -n "subclassData|getSubclassFeatures|SUBCLASS_FEATURES_2024|thirdCasterSpellInfo" Docs/` hits all four docs.
- `sed -n '/## vX.X.X — Unreleased/,/## v1.8.1/p' CHANGELOG.md` shows the Added/Changed/Fixed entries.
- `cd client && npm test` and `npx vite build` are still clean.

## Rules & data notes

- **Subclass choice level:** 2014 per class (Cleric/Sorcerer/Warlock 1, Druid/Wizard 2, the rest 3). 2024: 3 for every class. This is already correct in `getSubclassLevel`.
- **Feature levels:** 2014 is the existing `SUBCLASS_FEATURES` (PHB-verified in the research doc). 2024 uses the research table's corrected levels. Cleric 2024 is 3/6/17 (Divine Strike moved to the class as Blessed Strikes at 7), which is why the 2024 `getClassLevels` drops the Cleric's `'Domain Feature'` at 2 and 8.
- **Subclass spells:**
  - 2014: Cleric domain, Paladin oath and Circle of the Land spells are always prepared and don't count against the prepared number; Theros Oath of Glory is the same.
  - 2014 Warlock patron "expanded spells" are **not** prepared or known automatically. They only add options to the list the warlock picks known spells from, at spell levels the warlock can cast.
  - 2024: every subclass spell list is always prepared and doesn't count, including Warlock patrons.
  - The Light Domain (2014) bonus Light cantrip is modelled as always-prepared.
- **2024 Circle of the Land:** the land (Arid/Polar/Temperate/Tropical) can be changed on a long rest. The app records the current land as a single `land-terrain` pick.
- **Eldritch Knight / Arcane Trickster:**
  - One-third casters from class level 3 on the same slot table in both editions (max 1st at 3, 2nd at 7, 3rd at 13, 4th at 19). Wizard list, INT.
  - 2014: spells *known*; EK is limited to abjuration/evocation and AT to enchantment/illusion, except for 1 / 2 / 3 / 4 any-school picks from levels 3 / 8 / 14 / 20. Cantrips: EK 2 → 3 at 10; AT 3 → 4 at 10, including Mage Hand.
  - 2024: spells *prepared* (same count column — least-certain data), no school restriction; AT still always has Mage Hand.
  - Multiclass: add ⌊level ÷ 3⌋ (already implemented).
- **Draconic:**
  - 2014 Draconic Bloodline (level 1): +1 max HP per sorcerer level; unarmored AC 13 + DEX.
  - 2024 Draconic Sorcery (level 3): +3 max HP, then +1 per further sorcerer level (= sorcerer level in total); unarmored AC **10 + DEX + CHA**. The HP rule is kept and the AC formula changed; the auditor should confirm the 2024 AC at plan review.
  - Both allow a shield, and neither stacks with other unarmored formulas.
- **Totem Warrior Bear (2014):** resistance to all damage except psychic while raging. The 2024 Wild Heart chooses its animal each rage, so it stays descriptive.
- **Hunter:** 2014 choices at 3/7/11/15 (three/three/two/three options). 2024 choices only at 3 (Colossus Slayer or Horde Breaker) and 7 (Escape the Horde or Multiattack Defense); 11 and 15 are fixed features.
- **Champion Additional Fighting Style:** 2014 at 10, 2024 at 7.
- **Descriptive-only in this pass:** new 2024 subclass choice points that have no existing `levelChoices` model are shown as feature text only. Examples: Wild Heart's rage animal and Aspect/Power of the Wilds options, the Beast Master's Primal Companion type, Battle Master Student of War tool/skill, Lore Bonus Proficiencies. The same goes for the 2024 Epic Boon at 19; the app keeps its ASI there.
- **Ruleset routing:** everything goes through `char.ruleset`, with `subclassEdition` deciding which edition's rules a specific subclass name follows. No edition is hardcoded at a call site.

## Risks & gotchas

- **"Ruleset must be threaded through spell math in three places."** EK/AT touch all four sites: creator `getSpellInfo`, `maxSpellLevel`, editor `getSpellLimits`, and the sheet's inline loop. All of them call `thirdCasterSpellInfo`, so the numbers live once. Increments 9–11 each verify a concrete count.
- **"A one-element `classes` array is not authoritative."** The editor's new select must still write both `subclass` and `classes[0]`. Every new reader goes through `getCharClasses`.
- **"Progression picks belong to the card's own level."** Relocation now skips `totem` / `hunter-option`, or a ruleset switch would move a 2014 Hunter's L11 pick into the 2024 L7 card. A Champion additional-style orphan may only target an `additional` card. `land-terrain` stays relocatable (a 2014 L2 pick moves to the 2024 L3 card, non-lossy).
- **The 2024 de-dupe fix changes 2024 displays.** 2024 characters now see ASI cards and subclass placeholder rows at every level the class table lists them. That is the intended fix, but it is a visible change for existing 2024 characters, and the CHANGELOG says so.
- **"Never define a React component inside another component."** The legacy notes, badges and missing-spell line are plain JSX in existing render functions. `SpellCard` stays module-scope and reads the new flag from the spell object, so there is no new SheetCtx value.
- **Hooks order.** The `alwaysPrepared` memo must sit with the other hooks, before `CharacterSheet.jsx:1014-1015`, and use `char?.` reads.
- **Don't mutate shared data.** `resolveSheetSpells` returns tagged **copies**, never mutating `getAllLocalSpells()` results (gotcha "Never hand out a module's own data array").
- **Feature arrays hold objects.** `getAlwaysPreparedSpells` and `getClassDefenses` normalize `char.features` entries (`typeof f === 'string' ? f : f?.name`).
- **Stored stats.** Draconic HP is added only on events (creator, Level Up, Progression pick, editor Lv Up), never at render; AC is render-time because `calcAC` recomputes anyway. Existing Draconic characters are **not** retro-patched. The CHANGELOG tells players to add missing HP via the editor.
- **The build does not catch undefined variables.** After removing the `SUBCLASS_FEATURES` import (Inc 8) and the direct `HUNTER_OPTIONS[` / `LAND_TERRAINS` uses, run the greps in each Verify. `rg -n "isThirdCaster\(c\)" client/src` must return nothing after Increment 1.
- **Import cycles.**
  - `subclassSpells.js` imports nothing.
  - `subclassData.js` imports `classData`, `subclassFeatures`, `subclassFeatures2024`, `subclassSpells` and `dndConstants`, and must never import `levelChoices`, `multiclass`, `spellAccess` or `dndHelpers`.
  - `levelChoices`, `spellAccess` and `dndHelpers` (for `thirdCasterSpellInfo` in `getSpellInfo` / `maxSpellLevel`) import `subclassData`. The graph must stay acyclic: `subclassData` inlines the warlock spell-level mapping rather than calling `maxSpellLevel`.
- **Intermediate states between Increments 6 and 8 are acceptable.** For example, after Increment 6 the sheet still reads `HUNTER_OPTIONS[choice.level]` directly, so a 2024 Hunter's L3/L7 cards briefly show 2014 options until Increment 8 switches to `getHunterOptions`. Every increment still builds and passes its tests, and this run executes the increments back to back, so no release ships in between.
- **Creator step order.** The subclass (step 5) came before the ruleset (step 6). The new Class-step toggle plus the clearing effect and the `offeredSubclass` trim prevent a 2014 subclass being saved on a 2024 creation.

### Existing saves — compatibility (nothing is rewritten destructively)
- **2014 characters:**
  - Every stored name is in the 2014 list, so resolution returns the same `SUBCLASS_FEATURES` objects (locked by `toBe` tests in Increment 2) and every display is unchanged.
  - The new behaviour is additive: always-prepared spell badges, Bear resistance, Draconic AC, EK/AT casting and fuller land text.
- **2024 characters saved before this change** hold 2014 names, the only list that was offered.
  - These resolve as legacy picks with a "(2014 rules)" label and their own 2014 features and choices (e.g. Totem Spirit cards).
  - `subclass`, `classes[i].subclass`, `levelChoices` and `features` are not touched. The Progression card and the editor select offer the 2024 list for an explicit re-pick.
- **Multiclass saves:** per-class `subclass` is resolved per entry, and namespaced `levelChoices` keys (`Cls:N`) are unchanged.
- **Feature strings:**
  - `Totem Spirit (LvN): X`, `Hunter's Prey: X`, `Circle Land: X` and `Fighting Style: X` keep their format.
  - `Totem Spirit (Lv3): Bear` and `Circle Land: X` are now also *read*, for defenses and land spells.
  - A new `Fighting Style (Champion): X` format is written only for new Champion picks; old saves whose L1 style was already overwritten can't be recovered, and nothing is removed.
- **2024 saves that already hold a 2014 land.** Before this change the 2024 Progression tab still offered the 2014 land card at level 2, so such a character can have `levelChoices['2']['land-terrain'] = 'Forest'` (or `Druid:2` when multiclassed) and a `Circle Land: Forest` feature. Expected result: relocation moves the pick to key 3 (non-lossy), the L3 card lists the 2024 lands plus "Forest (2014 rules)" selected, and the always-prepared list uses the 2014 Forest spells. The player can re-pick a 2024 land.
- **Only load-time write:** the existing `relocateOrphanedChoices`, and it never deletes a pick. Its behaviour changes in both directions:
  - **narrower:** `totem` / `hunter-option` are no longer moved, and a Champion additional-style pick can no longer move onto the L1 style card;
  - **new moves:** because `getLevelChoices` now follows the ruleset, some picks gain a valid target they didn't have — a 2014 Land pick at key 2 moves to 3 under 2024, and a 2014 Champion's L10 style moves to the 2024 L7 card. These moves are non-lossy (the value is re-keyed, not changed).
- **Editor free-text values** (typos, homebrew) stay selectable as "(custom)" and are saved unchanged.

## Verification

**Automated**
- `cd client && npm test` — the full suite must pass. New or extended files: `subclassData.test.js`, `subclassSpells.test.js`, `classData.test.js`, `levelChoices.test.js`, `multiclass.test.js`, `dndHelpers.test.js`, `spellAccess.test.js`.
- `cd client && npx vite build` — clean.
- The Increment 4 node script prints exactly `["Commune","Commune with Nature","Fount of Moonlight","Hallow","Rary's Telepathic Bond","Starry Wisp","Summon Dragon"]`.
- The greps listed in Increments 6–11 all return nothing.

**Manual / E2E** — run on an isolated origin so real characters are untouched (project convention):
- Start the API server as usual on 3001, then `cd client && npx vite --port 5174 --strictPort` and use `http://localhost:5174`.
- Do not touch Settings → Database or campaigns.
- Stub `window.alert` / `window.confirm` before the editor's Lv Up and character delete.
- Characters created here are also POSTed to the server backup, so delete them via the UI afterwards and diff `server/data/characters/` before and after.
- Never delete adopted server characters.

Test cases and expected values:

1. **2014 Life Cleric 5, WIS 16** (creator → sheet): Features tab "Life Domain" card with Lv 1/2 entries unchanged from today. Spells tab: six "Life Domain" badges (Bless … Revivify). Spells counter `0/8`.
2. **2024 Life Cleric 5, WIS 16:** subclass picked at 3. Features at Lv 3 and Lv 6 only. Always-prepared: Aid, Bless, Cure Wounds, Lesser Restoration, Mass Healing Word, Revivify. Progression shows no "Domain Feature" at 2 or 8.
3. **2014 Fighter 3 EK, INT 16:** DC 13, attack +5, 1st-level slots ×2, Cantrips `0/2`, Spells `0/3`. After one enchantment spell, further enchantment/illusion picks are disabled. Level up to 7 → slots `4 / 2`.
4. **2024 Rogue 10 AT, INT 14:** Mage Hand badge, Cantrips `0/3` (4 total), Prepared `0/7`, slots `4 / 3`, no school restriction.
5. **Multiclass Wizard 5 / Fighter 6 (EK), 2014** via the Level Up modal: standard slots `4 / 3 / 3 / 1`.
6. **2014 Warlock 5, The Fiend:** browser finds Fireball; Flame Strike is not offered. No always-prepared list.
7. **2014 Sorcerer 1, Draconic Bloodline, DEX 14 / CON 14 / CHA 16:** creator Max HP 9, AC 15. Level Up (average) → +7 HP (4 + 2 CON + 1).
8. **2024 Sorcerer 2 → 3 via Level Up picking Draconic Sorcery, DEX 14 / CON 14 / CHA 16:** gain 4 + 2 + 3 = 9 HP. Unarmored AC 10 + 2 + 3 = 15.
9. **2014 Barbarian 3, Totem Warrior**, pick Bear on Progression → Resistances show "All except Psychic (while raging)". Pick Eagle → back to B/P/S.
10. **2024 Druid 3, Circle of the Land:** a "Choose Your Land" card with Arid/Polar/Temperate/Tropical. Pick Polar → always-prepared Fog Cloud, Hold Person, Ray of Frost.
11. **2024 Ranger 7, Hunter:** Hunter's Prey (2 options) at 3, Defensive Tactics (2 options) at 7, nothing at 11/15. Switching an existing 2014 Ranger 11 Hunter to 2024 leaves its L11 pick in `levelChoices` (check via DevTools localStorage).
12. **2024 Fighter 7 Champion** with Dueling at L1: pick Defense on the L7 "Additional Fighting Style" card → the Actions tab still applies Dueling, and AC gains +1 in armor.
13. **Legacy:** a 2014 Cleric 3 (Knowledge Domain), switch ruleset to 2024 in the editor and save:
    - Sheet Features: "Knowledge Domain (2014 rules)" with its 1/2 features.
    - The Progression subclass card lists the four 2024 domains, plus the legacy note.
    - Editor select: "Knowledge Domain (2014 rules)".
    - The localStorage `subclass` is still `Knowledge Domain`.
14. **Creator gating:** 2024, Cleric 3 → the Subclass select lists exactly 4 domains. Add a Wizard 1 multiclass row → its subclass select is disabled.
15. **2024 ASI count:** creator, 2024 Fighter 8 → the feat picker allows 3 feats/ASIs (levels 4, 6, 8); 2024 Wizard 12 → 3 (4, 8, 12). Sheet Progression for the same Fighter shows ASI cards at 4, 6 and 8.
16. **2024 Wizard 14 (Evoker):** Progression rows 6, 10 and 14 each show the Evoker feature; the Features tab lists four Evoker entries.
17. **2014 Barbarian 5, unarmored, DEX 14 / CON 16:** AC 15 (Unarmored Defense unchanged).

## Docs & changelog

**CHANGELOG.md** — under `## vX.X.X — Unreleased`:

```markdown
### Added
- **2024 subclasses.** Characters using the 2024 rules now choose from the 2024 Player's Handbook subclasses (for example Path of the World Tree, College of Dance, Circle of the Sea, Psi Warrior, Warrior of Mercy, Soulknife, Aberrant Sorcery, Celestial Patron) and see their features at the 2024 levels. 2014 characters keep the 2014 subclasses exactly as before.
- **Eldritch Knight and Arcane Trickster can cast spells.** Spell slots, cantrips, spells known (2014) or prepared (2024), save DC and spell attack now work on the sheet, in the creator and in the editor, including when multiclassed. 2014 characters follow the school limits (Abjuration/Evocation or Enchantment/Illusion, with the any-school picks at 3, 8, 14 and 20). Arcane Tricksters always have Mage Hand.
- **Subclass spells are applied automatically.** Domain, oath, circle (including your chosen land) and 2024 patron/origin spells appear on the Spells tab as always prepared and don't count against your limit. 2014 Warlock patron spells are added to the list you can pick from.
- **Draconic resilience.** Draconic Bloodline (2014) gives unarmored AC 13 + DEX, and Draconic Sorcery (2024) gives 10 + DEX + CHA. Both add +1 max HP per Sorcerer level when you take the subclass or level up. Existing Draconic characters are not changed; add any missing HP in the editor's Max HP. Switching *away* from a Draconic subclass never lowers your Max HP automatically (older characters never got the bonus) — the sheet reminds you to lower it in the editor if it was added.

### Changed
- **The editor's Subclass field is now a list** of your class's subclasses for your ruleset. A subclass you already have that isn't in the list (from the other ruleset, or a custom name) stays selected and is kept.
- **A subclass from the other ruleset is kept, not replaced.** If you switch a character's ruleset, the subclass keeps its own features, shown with "(2014 rules)" or "(2024 rules)"; you can pick a new one on the Progression tab or in the editor.
- **The character creator asks for the ruleset on the Class step**, so the subclass list matches the rules you're using. Level-1 features no longer list a subclass choice that comes at level 3 under the 2024 rules.
- **Circle of the Land spell lists** now show all eight spells for each 2014 land.
- **The Progression tab names your subclass features** on every level that grants one (for example the 2014 Cleric's level-1 domain feature), not only on levels with a "Domain Feature"-style placeholder.
- **New 2024 subclass choices that the app has no picker for yet** — for example the Wild Heart's animal options or the Beast Master's companion type — are shown as feature descriptions only for now.

### Fixed
- **2024 characters get every Ability Score Improvement.** The 2024 class progression kept only the level-4 ASI, so the creator allowed one feat/ASI at any level and the sheet's Progression and feature lists lost later ASIs and subclass-feature levels.
- **2024 Circle of the Land Druids can choose their land** (the choice was stuck at level 2, before the subclass unlocks).
- **Bear Totem Barbarians get resistance to all damage except psychic while raging.**
- **Multiclass rows in the creator can't pick a subclass before the level that unlocks it.**
- **A Champion's Additional Fighting Style no longer replaces the first one**, and 2024 Champions get it at level 7.
- **2024 Hunter Rangers** get the 2024 choices (Hunter's Prey and Defensive Tactics) instead of the 2014 ones.
- **Class feature text no longer says a subclass is chosen at level 1 or 2** when the 2024 rules choose it at level 3. The 2024 Cleric's progression no longer shows domain features at levels 2 and 8.
```

**Docs to update:**
- `Docs/known-patterns-and-gotchas.md`
  - New section **"Subclass data is ruleset-keyed — go through `subclassData.js`"**: the accessors; never read `CLASSES[cls].subclasses`, `subclassDescs` or `SUBCLASS_FEATURES` from a page; how legacy picks resolve through `subclassEdition`; always-prepared spells are derived, never stored; Draconic HP is event-applied.
  - Extend **"Ruleset … spell math in three places"** to say EK/AT go through `thirdCasterSpellInfo` at all four sites, and that `isThirdCaster(cls, subclass)` keys on the subclass.
  - Extend **"Progression picks belong to the card's own level"** with the `LEVEL_SPECIFIC_CHOICES` relocation exclusion, the Champion `additional`-only relocation target, and the Champion `Fighting Style (Champion): X` storage.
  - New entry **"`getClassLevels` 2024 de-dupe only drops promoted names"** — a blanket cross-level de-dupe silently deleted every repeated ASI and subclass placeholder; restrict it to `RULESET_2024_ADD` + `RULESET_2024_SUBCLASS` names.
  - Replace the stale "Half casters … start at level 2" / "Spell Slot Types" note with a line for third casters.
- `Docs/client-context-hooks-utils.md`
  - New entries for `subclassData.js`, `subclassFeatures2024.js` and `subclassSpells.js`.
  - Update `classData.js`: `getSpellSlots` subclass param, `isThirdCaster`, `spellcastingAbilityFor`, `spellListClassFor`, `getLevel1Features`, `getClassDefenses` signature, `RULESET_2024_REMOVE`.
  - Update `multiclass.js` (`spellcastingStartLevel` / `getSpellcastingClasses`).
  - Update `dndHelpers.js` (`maxSpellLevel` / `getSpellInfo` subclass param, `unarmoredBaseAC` object entries and Draconic).
  - Update `dndConstants.js` (`SUBCLASS_HP_PER_LEVEL`, `SUBCLASS_UNARMORED_AC`).
  - Update `levelChoices.js` (`getHunterOptions`, `getLandOptions`, `LAND_TERRAINS_2024`, edition stamping, the relocation exclusion).
  - Update `spellAccess.js` (`extraSpellNames`, `getAlwaysPreparedSpells`, `resolveSheetSpells`, `spellLimitCounts`).
  - Fix the `subclassFeatures.js` section ("Covers all PHB subclasses" → 2014 table; 2024 lives in `subclassFeatures2024.js`).
- `Docs/client-pages.md`
  - CharacterCreate: the Class-step ruleset toggle, gated multiclass subclass, EK/AT spells, Draconic HP/AC.
  - CharacterSheet: Features/Progression legacy labels, always-prepared badges, EK/AT limits, Champion style, Level Up subclass list and HP.
  - CharacterEdit: the Subclass select and EK/AT limits.
- `Docs/architecture.md` — a "Key Design Decisions" bullet: subclass data is ruleset-keyed with legacy picks preserved (a pick is never rewritten when the ruleset changes).

## Open questions

1. **2024 Eldritch Knight / Arcane Trickster counts.** The plan uses the 2014 "spells known" column as the 2024 "prepared" column and the same cantrip totals. This is isolated in `THIRD_CASTER_PROGRESSION['2024']` and needs auditor confirmation at plan review.
2. **2024 Draconic Sorcery AC** is planned as 10 + DEX + CHA (not 13 + DEX), and the **2024 Oath of Glory** level-17 spells as Legend Lore + Yolande's Regal Presence. Both are my best recollection; please have the auditor confirm. The 2024 feature names in Increments 2–3 should also be checked (lowest-confidence: Tamed Surge, Fleet Step, Bastion of Law, Heroic Warrior).
3. **Other subclass numbers not on your list** — kept out of scope unless you want them added:
   - 2014 Circle of the Land / Nature Domain bonus cantrip
   - 2014 Lore Additional Magical Secrets and 2024 Lore Magical Discoveries (+2 spells)
   - Artificer specialist always-prepared spells (Tasha's)
   - 2014 Draconic dragon-ancestor choice
4. **Seven subclass spells don't exist in `spells.json`**: Commune, Commune with Nature, Hallow, Starry Wisp, Fount of Moonlight, Rary's Telepathic Bond, Summon Dragon. The plan lists them by name only. Adding them to `spells.json` (and the DB seeds) would be a separate change.
5. **Editor subclass change doesn't auto-adjust Draconic HP.** It shows a reminder instead, matching the editor's "stats stay manual" rule; Lv Up does apply it. Say if you'd rather the editor apply the HP change on subclass change too.
6. **Out of scope, found while researching:**
   - 2024 multiclass spell slots round Paladin/Ranger levels **up** (the code rounds down in both editions).
   - The 2024 Cleric/Druid class-feature schedules (Channel Divinity, Blessed Strikes, etc.) are still the 2014 ones.

   Both are class-level, not subclass, issues; they are worth a follow-up plan.
7. **2024 Epic Boon.** 2024 classes gain an Epic Boon feat at 19 where 2014 has an ASI; the app keeps its ASI at 19 in both rulesets (the de-dupe tests pin the app's own ASI levels). This is a class-level change for a follow-up.
8. **Plan size.** This is one plan with 12 increments, as requested, rather than several smaller plans. Increments 1–7 are pure data and helpers with tests; 8–11 are UI wiring. If you'd prefer, 8–11 could become a second plan executed after 1–7 are reviewed.

## Plan review log

- **Rules check (DNDAuditor, 2026-09-27):** accurate with minor gaps. 2014 tables verified line by line against the PHB text (domain / oath / Land circle / Warlock expanded spells, EK/AT tables, Draconic Resilience, Bear totem). Its two MEDIUM items were checked by the orchestrator and dismissed: the 2014 (Theros) Oath of Glory 17th-level spells really are Commune + Flame Strike; the 2024 Sea (11), Archfey (11) and Celestial (12) spell counts match the 2024 PHB by design.
- **Round 1 (ond-plan-reviewer):** NEEDS REVISION — blocking: 2024 `getClassLevels` de-dupe strips every repeated name (verified by the orchestrator: ASI only at 4, subclass placeholders only once); `unarmoredBaseAC` object entries would drop Barbarian/Monk. Plus Draconic re-pick, relocation and eight LOW findings. All applied by the planner.
- **Round 2 (ond-plan-reviewer):** APPROVED WITH FIXES, 0 blocking. Orchestrator applied: the `switched` notice for Draconic re-picks (no new stored field), a "2014 Champion key 10 stays put" relocation test with the shared key function, and a UI check that actually gates the de-dupe fix.
