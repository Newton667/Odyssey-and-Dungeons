# Client Context, Hooks, and Utilities Reference

---

## Context Providers

### ThemeContext.jsx (~280 lines)
Provides app-wide theming with CSS custom properties.

**17 Built-in Presets:**
Dark Fantasy (default), Arcane, Emerald, Infernal, Frost, Necromancer, Parchment, Midnight, Blood Moon, Ocean Depths, Rose, Galaxy, Toxic, Autumn, Monochrome, Synthwave, Vaporwave

**How it works:**
- Each theme defines ~14 CSS variables (--bg-dark, --bg-card, --gold, --text, --text-dim, etc.)
- On theme change, applies CSS variables to document root via `applyVars()`
- Custom presets can be saved/loaded; individual variable overrides supported
- Theme preference saved to `localStorage('ond-theme')` as `{ preset, overrides, activeCustomName }`
- Custom presets saved separately to `localStorage('ond-custom-presets')`
- Dice theme saved to `localStorage('ond-dice-theme')`

**Exports:**
- `PRESETS` — Object mapping preset names to CSS variable objects
- `DICE_PRESETS` — Object mapping dice theme names to 3D material properties
- `ThemeProvider` — Wrap app with this
- `useTheme()` — Returns `{ preset, overrides, currentVars, customPresets, activeCustomName, applyPreset, applyCustomPreset, saveCustomPreset, deleteCustomPreset, setVar, resetVar, resetOverrides, diceTheme, setDiceTheme, setDiceThemeCustom, setDiceThemeVar, customDicePresets, saveCustomDicePreset, deleteCustomDicePreset }`

### DiceContext.jsx (~152 lines)
Manages 3D dice rolling as an async operation with global force settings.

**How it works:**
- Provides `rollDice3D(dice, label?)` function that returns a Promise
  - `dice`: Array of `{die, sides}` objects OR shorthand string like `'2d8'`, `'1d20+3'`, `'1d8 + 2d6'`
  - `label`: Optional string shown while rolling (e.g., "Fire Bolt -- Damage")
- Creates a Dice3D canvas overlay when rolling
- Resolves with `{ results: [{die,sides,value},...], total: number }`
- **Or resolves with `null`** when dice are already in the air. A `rollingRef` guard rejects re-entrant rolls (the pending `resolve` and static bonus live in single-slot refs, so a second roll used to swallow the first one's result and leave a stale number on the button). **Every caller must guard `if (!result) return;` before touching the result** — there are 12 call sites; see *"One roll at a time"* in `known-patterns-and-gotchas.md`.
- Formula parsing is delegated to `parseDiceFormula` (`utils/diceFormula.js`), shared with the sheet's advantage/disadvantage math. A formula with no dice (e.g. a Blowgun's `'1'`) resolves immediately with `{results: [], total: staticBonus}` rather than a hardcoded `0`.
- Handles roll queue (one roll at a time)
- **Global force setting** — controls throw intensity for ALL dice rolls (character sheet saves, attacks, manual rolls, etc.)
- Force persists to `localStorage('ond-dice-force')`

**Force Presets (FORCE_PRESETS):**
| Value | Label  | Icon | Color   | Physics Effect |
|-------|--------|------|---------|----------------|
| 1     | Gentle | ~    | #6eb5ff | Soft toss, minimal bounce, high damping |
| 2     | Normal | ●    | #c9a227 | Standard throw |
| 3     | Strong | ◆    | #ff8c00 | Hard throw, more bounce, lower damping |
| 4     | Mighty | ★    | #ff3030 | Maximum force, chaotic bounce, very low damping |

Each force level adjusts: linear damping, angular damping, restitution (bounciness), velocity multiplier, and height multiplier in the Dice3D physics engine.

**Exports:**
- `DiceProvider` — Wrap app with this
- `useDice()` — Returns `{ rollDice3D, rolling, rollLabel, lastResults, diceForce, setDiceForce }`
- `FORCE_PRESETS` — Array of force preset objects for UI rendering

---

## Hooks

### useCharacterSync.js (~275 lines)
Local-first character data management.

**API:**
```js
const { char, loading, syncing, syncError, setChar, updateField, updateHp, forceSync } = useCharacter(id, { syncEnabled: false });
```
> **In the shipped app `syncEnabled` is `false`.** The only call site is `CharacterSheet.jsx` (~line 79), which passes `{ syncEnabled: false }` — characters are local-only (the sync toggle was removed in v1.1.0). The debounced server-sync flow below is retained plumbing that does not run. `updateHp()` still fires `PATCH /api/characters/:id/hp` unconditionally (it never checks `syncEnabled`) — that is **deliberate**: `CampaignView` reads player HP from the server, and the load policy below makes the resulting `updatedAt` bump harmless.

**Load-and-merge policy (localStorage is authoritative):**
The hook decides via `resolveLoadAction(local, server)` in `utils/charSync.js`, and `useCharacterList`'s server-merge loop uses the same function.
- **No local copy** → `'adopt'`: take the server record and cache it locally. This is the only server → local path, and it exists so a character created on another device can be discovered.
- **Local copy exists** → the local copy always wins. If it is newer, `'push'` it to the server (a no-op while sync is off); otherwise `'keep'` and do nothing. The server is **never** written over local, even with a newer `updatedAt`, and even when the local record has no `updatedAt` at all.

This replaced a timestamp comparison that silently wiped sheet-owned fields (equipped items, ammo, spent slots, feature uses, multiclass `classes`) — see *"localStorage is authoritative"* and *"Sheet-owned fields live only in localStorage"* in `known-patterns-and-gotchas.md`.

**Flow (only when `syncEnabled: true`, which the app never sets):**
1. Reads character from `localStorage` key `ond-char-{id}`
2. If not found locally, fetches from server `/api/characters/{id}`
3. On `setChar(newData)`, updates localStorage immediately
4. Debounced (1.5 second) sync to server in background
5. If server unavailable, character still works from localStorage

**Character List:**
```js
const { characters, loading, deleteCharacter } = useCharacterList();
```
- Reads all `ond-char-*` keys from localStorage
- Falls back to server API with 3 second timeout. Server characters that are **not** already in localStorage are adopted and cached; ones that are keep their local copy untouched (same `resolveLoadAction` policy — opening the character list used to be a second, independent way to clobber local data).
- `deleteCharacter(id)` removes from both localStorage and server

**Create Character:**
```js
const { ok, data } = await createCharacter(charData);
```
- Tries server first with 3 second timeout
- Falls back to local-only: generates `local-{timestamp}-{random}` ID
- Saves to localStorage
- Returns `{ ok: true, data: createdCharacter }`

---

## Utilities

### dndConstants.js (~268 lines)
Static D&D 5e reference data.

**Exports:**
- `ABILITIES` — ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] (lowercase)
- `ABBR` — Maps lowercase ability names to abbreviations: `{ strength: 'STR', ... }`
- `ALIGNMENTS` — 9 alignments from Lawful Good to Chaotic Evil
- `XP_THRESHOLDS` — XP needed per level (0, 300, 900, ...)
- `STANDARD_ARRAY` — [15, 14, 13, 12, 10, 8]
- `ALL_SKILLS` — Array of 18 skill name strings
- `SKILLS_WITH_ABILITY` — Array of {name, ability} for all 18 skills
- `HIT_DICE` — Maps class name to hit die string (e.g., `{ Barbarian: 'd12', ... }`)
- `RARITY_COLORS` — Maps rarity string to CSS color
- `RARITY_ORDER` — Maps rarity string to sort order number
- `TOOL_OPTIONS` — Array of all tool proficiency strings
- `FEATS` — All PHB feats with name, prereq, desc
- `FEAT_EFFECTS` — Unconditional numeric feat bonuses applied to derived character-sheet stats (e.g. `Alert: { initiative: 5 }`, `Observant: { passivePerception: 5, passiveInvestigation: 5 }`). Consumed by `CharacterSheet`'s `featEffects` memo. Excludes ability-score bumps (applied at creation) and stored stats like speed/max HP (would double-count). **Alert is the 2014 baseline (+5); under the 2024 ruleset `featEffects` swaps it for +proficiency bonus** — the one ruleset-dependent initiative difference.
- `FEAT_PROFICIENCY_GRANTS` — Feats that grant player-chosen skill/tool proficiencies (`{ Skilled: { count: 3, type: 'skillsOrTools' } }`). The creator renders a `count`-slot picker (each slot = any skill OR tool) when the feat is selected; chosen skills merge into `skillProficiencies`, chosen tools into `toolProficiencies`. The editor raises the Skills/Tools limits by `count` so the picks can be added in those sections without tripping the "too many" guard.
- `FEAT_ABILITY_BONUSES` — Half-feats that grant `+1` to an ability. `{ fixed: 'charisma' }` applies always; `{ choice: ['strength','dexterity'] }` shows a picker in the creator (defaults to the first option); `save: true` (Resilient) also grants saving-throw proficiency in the chosen ability. The creator applies these to `abilityScores` at creation (capped at 20, never lowering an already-high score), so they flow into every derived stat. The editor does **not** auto-apply (stats are manual there and a saved character already has the bonus baked in) — it shows a reminder note instead.
- `FEAT_HP_PER_LEVEL` — Flat max-HP feats (`{ Tough: 2 }`). The creator adds `value × total level` to `computedHp`. Editor is manual (reminder note only).
- `MAGIC_INITIATE_CLASSES` — Spell lists Magic Initiate may draw from, keyed by ruleset: `'2014'` = Bard/Cleric/Druid/Sorcerer/Warlock/Wizard, `'2024'` = Cleric/Druid/Wizard. Used by the creator's and editor's pickers; the character's choice is stored as `char.featSpellLists = { 'Magic Initiate': ['Cleric'] }` (array-valued) and read via `utils/spellAccess.js`.
- `ALL_LANGUAGES` — Standard and exotic languages
- `BACKGROUNDS` — All 13 PHB backgrounds with skills, tools, languages, feature, equipment
- `CANTRIPS_KNOWN` — Per-class cantrip count by level (20-element arrays)
- `SPELLS_KNOWN` — Per-class spells known by level (Bard, Sorcerer, Warlock, Ranger)
- `MULTICLASS_REQS` — Ability score prerequisites for multiclassing
- `MULTICLASS_PROFICIENCIES` — Reduced proficiencies granted when a class is taken as a multiclass (`{armor, weapons, skills, tools}`); applied on multiclass level-up (tools stored on the char; armor/weapons recorded as a visible feature note)
- `RACIAL_SPELL_MAP` — Maps race to racial spell lookup key functions
- `RACIAL_SKILL_CHOICES` — Races with skill choice options (Kenku, Lizardfolk, etc.)
- `RACIAL_TOOL_CHOICES` — Races with tool choice options (Warforged)
- `KOBOLD_LEGACY_OPTIONS` — Kobold legacy trait choices
- `FIGHTING_STYLES` — All 6 fighting styles with descriptions
- `FIGHTING_STYLE_CLASSES` — Which classes get fighting styles and at what level
- `CLASS_RECOMMENDED_GEAR` — Default starting equipment per class
- `ARMORS` — All armor types with category, base AC, stealth disadvantage, and STR requirement (only heavy armors carry a `strReq`; light/medium omit it, defaulting to 0)
- `PB_COSTS` — Point buy cost table: `{ 8: 0, 9: 1, ..., 15: 9 }`
- `WEAPON_MASTERIES` — All 8 weapon mastery types with descriptions (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex)
- `WEAPON_MASTERY_MAP` — Maps each base weapon name to its mastery type (e.g., Greatsword → Graze, Dagger → Nick)
- `WEAPON_MASTERY_CLASSES` — Classes with Weapon Mastery feature and mastery slot progression per level (Fighter, Barbarian, Rogue, Paladin, Ranger, Monk)

### dndHelpers.js (~106 lines)
Calculation and formatting helpers.

**Key Functions:**
- `modVal(score)` — Returns ability modifier: `Math.floor((score - 10) / 2)`
- `modStr(score)` — Returns formatted modifier string: "+2" or "-1"
- `profBonus(lvl)` — Returns proficiency bonus: `Math.ceil(lvl / 4) + 1`
- `xpForLevel(lvl)` — XP threshold for given level
- `rarityColor(r)` — Returns CSS color for item rarity
- `rarityBg(r)` — Returns tinted background color for item rarity
- `hpColor(current, max)` — Returns CSS variable (`var(--hp-bar)`, `var(--hp-low)`, `var(--hp-crit)`) based on HP %
- `maxSpellLevel(cls, lvl, ruleset='2014')` — Returns highest spell level available for a class at a given level. Ruleset-aware: 2024 Paladin/Ranger reach 1st-level spells at level 1 (2014 half-casters return 0 until level 2).
- `getSpellInfo(cls, lvl, abilityMod, CLASSES, ruleset='2014')` — Returns full spell info (cantrips, prepare/known count, max level, caster type). Ruleset-aware: 2024 Paladin/Ranger cast from level 1, and a 2024 Ranger is a prepared caster (WIS + half level) rather than a known caster. Paladins/Rangers have **no cantrips** in either ruleset. The editor has a parallel `getSpellLimits` (local to `CharacterEdit.jsx`) with the same ruleset logic.
- `getArmorCategories(armorProfStr)` — Parses armor proficiency string into category array
- `canUseShield(armorProfStr)` — Checks if proficiency string includes shields
- `countLangExtras(langArray)` — Counts extra language slots from racial traits
- `normalizeFeatNames(feats)` — Feat arrays hold names **or** `{name, prereq, desc}` objects from old saves; returns names only, dropping nulls/nameless entries. Use before any `.includes('Feat Name')`.
- `weaponDamageDice(damage)` — Strips the flat modifier baked into a weapon's damage string (`'1d8+1'` → `'1d8'`), keeping multi-group damage intact (`'1d8 + 2d6 fire'` unchanged). Returns `null` when there are no dice (`'1'`, `'—'`). Needed because `equipment.json` stores a magic bonus in **both** `damage` and `bonus`.
- `weaponDamageFormula(damage, dmgBonus, riderSuffix='')` — Builds the sheet's damage-button roll string from the sanitized dice + the modifier + any weapon-rider die. Returns `null` when the weapon has no rollable damage (the Net's `'—'` is truthy but is not damage). The button's label must render this same string.

### diceFormula.js
- `parseDiceFormula(formula)` → `{ dice: [{die, sides}], staticBonus, hasDice, d1Count }`. The single dice-string parser, used by `DiceContext.rollDice3D` and by the sheet's advantage/disadvantage bonus (a regex there used to drop negative modifiers, since a negative renders as `1d20+-2`). Sums **all** modifiers including negatives; folds `d1` dice into `staticBonus` (`d1Count` lets a caller rebuild the d1-only result shape); with no dice groups it still sums bare integers, so `'1'` → 1 and `'—'` → 0. A non-string input passes straight through, so the array form of `rollDice3D` keeps working. **A countless die is one die** — the regex is `/(\d*)d(\d+)/g` with `count = m[1] || 1`, so `'d10'` (the shape of `CLASSES[cls].hitDice`) parses as a single d10 rather than a flat +10; reading it as a modifier is what made level-up HP always roll maximum. See known-patterns-and-gotchas.md → "`CLASSES[cls].hitDice` is a bare `'d10'`".

### spellAccess.js
- `allowedSpellClasses(char)` → lower-cased class names the character may draw spells from: every class from `getCharClasses(char)` (multiclass included) unioned with `char.featSpellLists` values (normalised via `[].concat`, so a legacy bare string works). Empty ⇒ the caller should not filter.
- `spellMatchesClasses(spell, allowed)` → whether a browser result survives the filter. Spells with no `classes` (homebrew/racial) always pass; an empty `allowed` set disables filtering.

### charSync.js
- `resolveLoadAction(local, server)` → `'adopt' | 'push' | 'keep' | 'none'`. The character load-and-merge policy, shared by `useCharacter`'s load effect and `useCharacterList`'s merge loop. `'adopt'` (server → local) is reachable **only when there is no local copy**; otherwise local wins regardless of timestamps.

### classData.js (~430 lines)
Race and class definitions.

**RACES Object:**
Each race has: desc, bonuses, speed, traits, languages, subraces
```js
RACES['Dwarf'] = {
  desc: 'Stout and hardy folk...',
  bonuses: { constitution: 2 },
  speed: 25,
  traits: ['Darkvision 60ft', 'Dwarven Resilience', ...],
  languages: ['Common', 'Dwarvish'],
  subraces: {
    'Hill Dwarf': { bonuses: { wisdom: 1 }, traits: ['Dwarven Toughness (+1 HP/level)'] },
    'Mountain Dwarf': { bonuses: { strength: 2 }, traits: ['Dwarven Armor Training (light & medium)'] }
  }
}
```

**CLASSES Object:**
Each class has: desc, hitDice, hpBase, primaryAbility, armorProf, weaponProf, savingThrows, skillChoices, numSkills, subclasses, subclassLevel, subclassDescs, spellcasting, spellcastingAbility, features, equipment (and toolProf for Artificer)
```js
CLASSES['Fighter'] = {
  desc: 'A master of martial combat...',
  hitDice: 'd10', hpBase: 10,
  primaryAbility: 'strength',
  armorProf: 'All armor, shields',
  weaponProf: 'Simple weapons, martial weapons',
  savingThrows: ['strength', 'constitution'],
  numSkills: 2,
  skillChoices: ['Acrobatics', 'Athletics', ...],
  subclassLevel: 3,
  subclasses: ['Champion', 'Battle Master', 'Eldritch Knight'],
  subclassDescs: { 'Champion': '...', ... },
  spellcasting: false,
  features: ['Fighting Style — ...', 'Second Wind — ...'],
  equipment: ['(a) chain mail or (b) leather...'],
}
```

**Additional classData.js exports:**
- `getSpellSlots(className, level)` — Returns spell slot array or Warlock pact object (single class)
- `getMulticlassCasterLevel(classes)` — Combined caster level (full=full, half=÷2, Artificer=÷2↑, EK/AT=÷3; Warlock excluded)
- `getMulticlassSpellSlots(classes)` — `{ standard: number[]|null, pact: {pact,slots,level}|null }`. One standard caster → its own table; 2+ → combined-level multiclass table; Warlock pact always separate
- `getExtraAttacks(className, level)` — Returns number of extra attacks (per class)
- `RACE_DEFENSES` — Racial resistances/immunities
- `getClassDefenses(className, level, subclass)` — Returns class-based resistances
- `SAVING_THROWS_BY_CLASS` — Maps class name to saving throw proficiency array

### featureUses.js (~55 lines)
`FEATURE_USES` — limited-use class features keyed by base name → `{ max(classLevel, char, className), recharge: 'short'|'long'|fn, unit? }`. `computeFeatureUses(name, classLevel, char, className)` returns `{max, recharge, unit}` or null (0 = unlimited, e.g. Rage 20). `baseFeatureName(name)` strips `(x/day)` etc. for a stable storage key. Remaining uses persist in `char.featureUses[baseName]`; long rest clears the whole object, short rest deletes short-recharge keys.

### featureRolls.js (~35 lines)
`featureRoll(name, { classLevel })` → `{ formula, type: 'healing'|'damage'|'utility', label, note? }` or null. Convenience dice for rollable class features so the Actions tab can show a roll button next to them: Second Wind (`1d10 + level` heal), Sneak Attack (`ceil(level/2)d6`), Divine Smite (`2d8`), Bardic Inspiration and Song of Rest (die scales with level). Keyed by `baseFeatureName`, so `(x/day)`-style qualifiers don't matter. `NATURAL_WEAPONS` (in `classData.js`) is the parallel racial-attack data (Aarakocra Talons, Lizardfolk Bite, Tabaxi/Tortle/Leonin Claws, Satyr Ram) rendered as rollable attacks near Unarmed Strike.

### featureDescriptions.js (~140 lines)
`FEATURE_DESCRIPTIONS` — concise text for every class feature name in `CLASS_LEVELS` (all 13 classes, levels 1-20). `featureDescription(name)` looks up a description, stripping `(x/day)` / level qualifiers and `improvement(s)` suffixes. Used by `CharacterSheet` as the fallback description for features that lack their own text (the level-1 `CLASSES[class].features` and `SUBCLASS_FEATURES` provide the rest).

### multiclass.js (~110 lines)
Normalizes single- and multi-class characters and derives combined stats. Single-class saves have no `char.classes`; helpers synthesize one from `char.class/subclass/level`, so all callers treat characters uniformly and existing saves keep working.
- `getCharClasses(char)` — Canonical `[{class, subclass, level}]` (per-class levels)
- `getTotalLevel(char)` / `isMulticlass(char)`
- `formatClasses(char, {withSubclass})` — "Fighter 5 / Wizard 3"
- `getHitDicePools(char)` / `formatHitDice(char)` — Per-class hit-dice pools (`[{die,count}]` / "5d10 + 5d6")
- `getMulticlassExtraAttacks(char)` — Best single class (does not stack)
- `getSpellcastingClasses(char)` — `[{class, ability, level}]` for per-class DCs
- `syncPrimaryFromClasses(classes)` — Patch to keep `class/subclass/level/proficiencyBonus` in sync with the `classes` array after a level-up

**CLASS_LEVELS Object:**
Features gained at each level per class. Values are arrays of strings.
```js
CLASS_LEVELS['Fighter'] = { 1: ['Fighting Style', 'Second Wind'], 2: ['Action Surge'], ... }
```

### levelChoices.js (~219 lines)
Data for class progression choices.

**Exports:**
- `METAMAGIC_OPTIONS` — Sorcerer metamagic choices with descriptions
- `ELDRITCH_INVOCATIONS` — Warlock invocation options with prerequisites
- `PACT_BOONS` — Pact of the Blade/Chain/Tome descriptions
- `MANEUVERS` — Battle Master maneuver options with descriptions
- `TOTEM_SPIRITS` — Totem Warrior spirit choices by level (3, 6, 14)
- `HUNTER_OPTIONS` — Hunter subclass feature choices by level (3, 7, 11, 15)
- `LAND_TERRAINS` — Circle of the Land terrain options with bonus spells
- `FAVORED_ENEMIES` — Ranger favored enemy options
- `FAVORED_TERRAINS` — Ranger favored terrain options
- `getLevelChoices(cls, level, subclass)` — Returns available choices for a class at a given level

Note: `FIGHTING_STYLES` and `FIGHTING_STYLE_CLASSES` are in `dndConstants.js`, not here.

### subclassFeatures.js (~299 lines)
Detailed subclass feature descriptions per level.

**Structure:**
```js
SUBCLASS_FEATURES['Champion'] = {
  3: { name: 'Improved Critical', desc: 'Your weapon attacks crit on 19-20' },
  7: { name: 'Remarkable Athlete', desc: '...' },
  10: { name: 'Additional Fighting Style', desc: '...' },
  ...
}
```
Keyed by subclass name directly (not nested under class). Each level maps to a single `{name, desc}` object (not an array). Covers all PHB subclasses for all 12 classes.

---

## Local Data Service

### localDataService.js (~38 lines)
Query functions for bundled JSON data.

**Functions:**
- `queryLocalEquipment({ category, subcategory, search, rarity })` — Filter equipment.json (sorted by category → subcategory → name)
- `queryLocalSpells({ level, school, cls, search, source, sourceRace })` — Filter spells.json (`sourceRace` accepts a string or array; used for racial spell-like abilities)
- `getLocalEquipmentByName(name)` — Exact-name lookup, returns the item or `null`
- `getAllLocalSpells()` — Full spells.json array
- `getAllLocalEquipment()` — Full equipment.json array

The query functions return filtered arrays matching the provided criteria. Used by the Spells and Equipment pages for browsing, and by `CharacterSheet.jsx` (via `getLocalEquipmentByName` / `getAllLocalSpells`) for inventory and spell resolution.
