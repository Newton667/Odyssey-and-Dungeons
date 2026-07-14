# Client Context, Hooks, and Utilities Reference

---

## Context Providers

### ThemeContext.jsx (~281 lines)
Provides app-wide theming with CSS custom properties.

**16 Built-in Presets:**
Dark Fantasy (default), Arcane Purple, Blood Moon, Forest Grove, Ocean Depths, Desert Sands, Frost Giant, Infernal, Celestial, Shadowfell, Feywild, Underdark, Dragon's Hoard, Storm King, Ethereal, Custom

**How it works:**
- Each theme defines ~20 CSS variables (--bg-primary, --gold, --text-primary, etc.)
- On theme change, applies CSS variables to document root
- Custom theme allows individual color overrides
- Theme preference saved to `localStorage('ond-theme')`

**Exports:**
- `ThemeProvider` — Wrap app with this
- `useTheme()` — Returns `{ theme, setTheme, themes, customOverrides, setCustomOverrides }`

### DiceContext.jsx (~130 lines)
Manages 3D dice rolling as an async operation with global force settings.

**How it works:**
- Provides `rollDice3D(formula)` function that returns a Promise
- Creates a Dice3D canvas overlay when rolling
- Resolves with `{ results: [{die,sides,value},...], total: number }`
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

### useCharacterSync.js (~276 lines)
Local-first character data management.

**API:**
```js
const { char, setChar, loading, error } = useCharacter(id, { syncEnabled: true });
```

**Flow:**
1. Reads character from `localStorage` key `ond-char-{id}`
2. If not found locally, fetches from server `/api/characters/{id}`
3. On `setChar(newData)`, updates localStorage immediately
4. Debounced (2 second) sync to server in background
5. If server unavailable, character still works from localStorage

**Character List:**
```js
const { characters, loading, refresh, deleteCharacter } = useCharacterList();
```
- Reads all `ond-char-*` keys from localStorage
- Falls back to server API with 3 second timeout
- `deleteCharacter(id)` removes from both localStorage and server

**Create Character:**
```js
const id = await createCharacter(charData);
```
- Generates `local-{uuid}` ID
- Saves to localStorage
- Attempts server sync with 3 second timeout

---

## Utilities

### dndConstants.js (~500+ lines)
Static D&D 5e reference data.

**Exports:**
- `ABILITIES` — ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
- `SKILLS` — Array of {name, ability} for all 18 skills
- `ALIGNMENTS` — 9 alignments from Lawful Good to Chaotic Evil
- `XP_THRESHOLDS` — XP needed per level (0, 300, 900, ...)
- `FEATS` — All PHB feats with name, prereq, desc
- `LANGUAGES` — Standard and exotic languages
- `BACKGROUNDS` — All 13 PHB backgrounds with proficiencies, equipment, features
- `ARMOR_CATEGORIES` — Light, Medium, Heavy armor groupings
- `RARITIES` — common, uncommon, rare, very-rare, legendary, artifact
- `CONDITIONS` — All D&D conditions with descriptions and mechanical effects
- `POINT_BUY_COSTS` — Ability score point buy cost table
- `WEAPON_MASTERIES` — All 8 weapon mastery types with descriptions (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex)
- `WEAPON_MASTERY_MAP` — Maps each base weapon name to its mastery type (e.g., Greatsword → Graze, Dagger → Nick)
- `WEAPON_MASTERY_CLASSES` — Classes with Weapon Mastery feature and mastery slot progression per level (Fighter, Barbarian, Rogue, Paladin, Ranger, Monk)

### dndHelpers.js (~200+ lines)
Calculation and formatting helpers.

**Key Functions:**
- `abilityMod(score)` — Returns ability modifier: `Math.floor((score - 10) / 2)`
- `profBonus(level)` — Returns proficiency bonus: `Math.ceil(level / 4) + 1`
- `spellSlots(className, level)` — Returns spell slot array by class and level
- `hpColor(current, max)` — Returns CSS color: green→yellow→red based on HP %
- `armorCategory(name)` — Returns 'light'/'medium'/'heavy' for armor name
- `formatModifier(n)` — Returns "+2" or "-1" format
- `calcPassivePerception(wis, proficient, level)` — 10 + WIS mod + prof bonus
- `xpForLevel(level)` — XP threshold for given level
- `levelForXP(xp)` — Current level for given XP total

### classData.js (~300+ lines)
Race and class definitions.

**RACES Object:**
Each race has: abilityBonuses, speed, size, traits, languages, subraces
```js
RACES['Dwarf'] = {
  abilityBonuses: { CON: 2 },
  speed: 25,
  traits: ['Darkvision', 'Dwarven Resilience', ...],
  subraces: {
    'Hill Dwarf': { abilityBonuses: { WIS: 1 }, traits: ['Dwarven Toughness'] },
    'Mountain Dwarf': { abilityBonuses: { STR: 2 }, traits: ['Dwarven Armor Training'] }
  }
}
```

**CLASS_DATA Object:**
Each class has: hitDie, savingThrows, skillChoices, numSkills, armor/weapon proficiencies, subclassLevel, subclasses
```js
CLASS_DATA['Fighter'] = {
  hitDie: 10,
  savingThrows: ['STR', 'CON'],
  numSkills: 2,
  skillChoices: ['Acrobatics', 'Athletics', ...],
  subclassLevel: 3,
  subclasses: ['Champion', 'Battle Master', 'Eldritch Knight']
}
```

**CLASS_LEVELS Object:**
Features gained at each level per class.

### levelChoices.js (~200+ lines)
Data for class progression choices.

**Exports:**
- `METAMAGIC_OPTIONS` — Sorcerer metamagic choices with descriptions
- `ELDRITCH_INVOCATIONS` — Warlock invocation options with prerequisites
- `PACT_BOONS` — Pact of the Blade/Chain/Tome descriptions
- `MANEUVERS` — Battle Master maneuver options with descriptions
- `FIGHTING_STYLES` — Fighting style options for Fighter/Paladin/Ranger
- `getLevelChoices(className, level, char)` — Returns available choices for a class at a given level

### subclassFeatures.js (~500+ lines)
Detailed subclass feature descriptions per level.

**Structure:**
```js
SUBCLASS_FEATURES['Fighter']['Champion'] = {
  3: [{ name: 'Improved Critical', desc: 'Your weapon attacks crit on 19-20' }],
  7: [{ name: 'Remarkable Athlete', desc: '...' }],
  10: [{ name: 'Additional Fighting Style', desc: '...' }],
  ...
}
```

Covers all PHB subclasses for all 12 classes.

---

## Local Data Service

### localDataService.js (~38 lines)
Query functions for bundled JSON data.

**Functions:**
- `queryLocalEquipment({ category, search, rarity })` — Filter equipment.json
- `queryLocalSpells({ level, school, search, cls })` — Filter spells.json

Both return filtered arrays matching the provided criteria. Used when data source is "Local" (default).
