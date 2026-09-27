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
- `SUBCLASS_HP_PER_LEVEL` — Flat max-HP per level of the subclass's class (`{ 'Draconic Bloodline': 1, 'Draconic Sorcery': 1 }`, Sorcerer entries only). Event-applied through `subclassHpBonus` / `subclassHpDelta` (`subclassData.js`) by the creator, the sheet's Level Up and Progression pick, and the editor's Lv Up — never at render.
- `SUBCLASS_UNARMORED_AC` — Subclass unarmored AC formulas: `{ 'Draconic Bloodline': { base: 13, add: ['dex'] }, 'Draconic Sorcery': { base: 10, add: ['dex', 'cha'] } }`. Read by `unarmoredBaseAC`.
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

### dndHelpers.js (~230 lines)
Calculation and formatting helpers.

**Key Functions:**
- `modVal(score)` — Returns ability modifier: `Math.floor((score - 10) / 2)`
- `modStr(score)` — Returns formatted modifier string: "+2" or "-1"
- `profBonus(lvl)` — Returns proficiency bonus: `Math.ceil(lvl / 4) + 1`
- `xpForLevel(lvl)` — XP threshold for given level
- `rarityColor(r)` — Returns CSS color for item rarity
- `rarityBg(r)` — Returns tinted background color for item rarity
- `hpColor(current, max)` — Returns CSS variable (`var(--hp-bar)`, `var(--hp-low)`, `var(--hp-crit)`) based on HP %
- `maxSpellLevel(cls, lvl, ruleset='2014', subclass='')` — Returns highest spell level available for a class at a given level. Ruleset-aware: 2024 Paladin/Ranger reach 1st-level spells at level 1 (2014 half-casters return 0 until level 2). With a third-caster subclass (Eldritch Knight / Arcane Trickster) it returns `thirdCasterSpellInfo(...).maxLevel` (1/2/3/4 at 3/7/13/19).
- `getSpellInfo(cls, lvl, abilityMod, CLASSES, ruleset='2014', subclass='')` — Returns full spell info (cantrips, prepare/known count, max level, caster type). Ruleset-aware: 2024 Paladin/Ranger cast from level 1, and a 2024 Ranger is a prepared caster (WIS + half level) rather than a known caster. Paladins/Rangers have **no cantrips** in either ruleset. A third caster returns early (before the `CLASSES[cls].spellcasting` gate) with `{ cantrips, spellsKnown, type: 'known' }` (2014) or `{ cantrips, prepareCount, type: 'prepared' }` (2024) from `thirdCasterSpellInfo`. The editor has a parallel `getSpellLimits` (local to `CharacterEdit.jsx`) with the same ruleset and third-caster logic.
- `getArmorCategories(armorProfStr)` — Parses armor proficiency string into category array
- `canUseShield(armorProfStr)` — Checks if proficiency string includes shields
- `countLangExtras(langArray)` — Counts extra language slots from racial traits
- `normalizeFeatNames(feats)` — Feat arrays hold names **or** `{name, prereq, desc}` objects from old saves; returns names only, dropping nulls/nameless entries. Use before any `.includes('Feat Name')`.
- `weaponDamageDice(damage)` — Strips the flat modifier baked into a weapon's damage string (`'1d8+1'` → `'1d8'`), keeping multi-group damage intact (`'1d8 + 2d6 fire'` unchanged). Returns `null` when there are no dice (`'1'`, `'—'`). Needed because `equipment.json` stores a magic bonus in **both** `damage` and `bonus`.
- `weaponDamageFormula(damage, dmgBonus, riderSuffix='')` — Builds the sheet's damage-button roll string from the sanitized dice + the modifier + any weapon-rider die. Returns `null` when the weapon has no rollable damage (the Net's `'—'` is truthy but is not damage). The button's label must render this same string.
- `weaponRangeText(properties, isRanged)` — The Actions-row range string. Matches `range`, `thrown` **or `ammunition`** inside the property list and returns the stored string verbatim, falling back to `'80/320 ft.'` / `'5 ft.'`. The missing `ammunition` term is why every bow, crossbow and sling used to display `80/320 ft.`
- `cantripTierBonus(charLevel)` — Extra cantrip damage dice at character level: `>=17 → 3`, `>=11 → 2`, `>=5 → 1`, else `0`.
- `cantripDamage(spell, charLevel)` — A cantrip's damage at a given **character** level (not slot level — neither edition upcasts a cantrip). Keys on `level === 0` plus an exclusion list, deliberately **not** on `scaling`. Returns `spell.damage` unchanged for non-cantrips, damageless cantrips, non-`NdM` strings, `source: 'race'` pseudo-spells, and anything in `CANTRIP_NO_SCALE`.
- `CANTRIP_NO_SCALE` — `Set` of `Eldritch Blast` (gains *beams*, not dice: 1/2/3/4 separate attack rolls at 5/11/17), `Magic Stone` and `Shillelagh` (no level progression at all), and `Green-Flame Blade` (its stored `1d8` is already the 5th-level value, so scaling would run one die high). **Booming Blade is deliberately not in the set** — its `1d8` really does go 1d8/2d8/3d8/4d8. Racial pseudo-spells are excluded separately by `source === 'race'`, because the Dragonborn breath weapons use 1/6/11/16, a different tier set. Homebrew cantrips have no `source` and so scale by design.

- `hitDiceAfterLongRest(total, remaining)` — Hit dice after a long rest: regain spent dice up to half the total, minimum 1 (PHB p.186). `remaining` undefined means none spent.
- `unarmoredBaseAC(classes, { dex, con, wis, cha }, hasShield)` — Base AC with no armor: 10 + DEX, or the best of Barbarian 10 + DEX + CON (shield allowed) / Monk 10 + DEX + WIS (no shield) / a `SUBCLASS_UNARMORED_AC` formula (Draconic; shield allowed). `classes` may hold class-name strings or `getCharClasses` `{ class, subclass }` objects — every entry is normalized, so Unarmored Defense works with either. Formulas never stack. The caller adds the shield bonus. Used by the sheet's `calcAC` (with `getCharClasses(char)`) and the creator's AC.
- `martialArtsDie(monkLevel, ruleset='2014')` — by **Monk** class level: 2014 `'1d4'` / `'1d6'` at 5 / `'1d8'` at 11 / `'1d10'` at 17; 2024 one size larger (`'1d6'` → `'1d12'`).
- `trimSpellPicks({ cantrips, spells, available, spellInfo })` — The creator's save filter: keeps only picks on the current class list, cantrips as cantrips and leveled spells within `spellInfo.maxLevel`, capped at the allowed counts (earliest first). `spellInfo` null → nothing.

### homebrew.js (~380 lines)
The single door to the `ond-homebrew` localStorage key, plus the pure logic the Homebrewer page used to keep inside its component. **Which function you use depends on whether you are reading or writing, and this is a safety property, not a style choice** — see known-patterns-and-gotchas.md → "Homebrew: normalise on read".

**Reading — for display and consumption:**
- `readHomebrew(opts)` — `readHomebrewRaw()` → `normalizeHomebrewItem` → drop nulls, then optional `opts.type` / `opts.notType`. Never throws. **Every consumer uses this**: `CharacterSheet.jsx` (×4), `Spells.jsx`, `Equipment.jsx`, `CharacterEdit.jsx`.

**Reading — for mutation only:**
- `readHomebrewRaw()` — `JSON.parse` in a `try`, non-array coerced to `[]`, **no normalisation, no dropping**. `save`, `deleteItem`, `doImport` and Duplicate all read through this.

**Writing:**
- `writeHomebrew(items)` — returns `false` on a quota failure instead of throwing, so the caller can tell the user and keep their input.
- `upsertHomebrewRecord(all, record, editingId)` / `removeHomebrewRecord(all, id)` / `appendImportedRecord(all, record)` — pure array transforms that touch only the targeted record and pass everything else through untouched. They are exported (rather than inlined in the page) precisely so the preservation property is unit-testable in a repo with no DOM.

**Normalisation and schema:**
- `normalizeHomebrewItem(raw)` — tolerant, never throws, returns `null` when `type` is not in `HOMEBREW_TYPES` or `name` is not a non-empty string. Coerces `properties`/`components`/`classes` to string arrays (they may hold `{name}` objects from old saves), canonicalises `requiresAttunement` → `attunement` (keeping both), lowercases `damageType`, and coerces numbers with `parseInt` and an explicit fallback — `bonus: 0`, `level: 0`, `strReq: 0`, `stackSize: 20`, `aoeSize: 0`, and **`ac: ''`** (a blank armor AC must stay blank, not become 0). Sets `homebrew: true`. Does **not** prune keys.
- `HOMEBREW_TYPES`, `TYPE_FIELDS` — the per-type field table (one data-driven map, no `if` chains).
- `pruneToType(item)` — keeps only `TYPE_FIELDS[type]` plus `_id`/`createdAt`/`updatedAt`. Used **only on save**, so a type switch actually cleans up. Writes `attunement` and `requiresAttunement` in sync.
- `validateHomebrew(item)` → `{ ok, errors, warnings }`. Blocking only where the sheet mis-computes; the `M`-component and duplicate-name cases are warnings.
- `sanitizeImported(data)` → `{ ok: true, item }` or `{ ok: false, error }`. Rejects non-objects, arrays, unknown types and blobs over 64 KB; prunes hostile extra keys rather than storing them.

**Share codes:**
- `encodeShareCode(obj)` / `decodeShareCode(code)` — UTF-8-safe base64. Decode strips whitespace, throws on empty or malformed input, and tries **UTF-8 first, Latin-1 second**. That order is load-bearing; see the gotchas doc.

**Form and consumer helpers:**
- `resetFormForType(prevForm, type, emptyForm)` — what the type buttons call. Resets fields the new type does not use to their `emptyForm` values (keeping every key, so unguarded `form.properties.includes(...)` cannot throw) while preserving `name`/`description`/`rarity`. `categoryForType(type)` gives the `category` value consumers key on.
- `WEAPON_PROPERTIES` / `serializeProperty(name, params)` / `parseProperty(str)` — round-trip the parameterised properties in the exact form `equipment.json` uses (`versatile (1d10)`, `thrown (20/60)`, `ammunition (150/600)`); everything else is plain lowercase. An unrecognised stored property passes through unchanged.
- `matchesEquipCategory(item, cat)` / `HB_CATEGORY_ALIASES` — the category test for both equipment browsers. Homebrew writes `category: 'item'` / `'ammo'`, but the dropdowns offer `adventuring-gear` / `tool` / `pack`, so the plain equality test never matched.
- `defaultAmmoCount(name, item)` — starting rounds for a stack: a `(N)` group in the **name** wins (that is how `equipment.json` ships ammo), then `item.stackSize` when it is a positive integer, then `20`.
- `WEAPON_SUBS` / `ARMOR_SUBS` / `SCHOOLS` — shared by the Homebrewer's pickers and `validateHomebrew` so the two cannot drift apart.

### diceFormula.js
- `parseDiceFormula(formula)` → `{ dice: [{die, sides}], staticBonus, hasDice, d1Count }`. Case-insensitive (`1D8` is a die). The single dice-string parser, used by `DiceContext.rollDice3D` and by the sheet's advantage/disadvantage bonus (a regex there used to drop negative modifiers, since a negative renders as `1d20+-2`). Sums **all** modifiers including negatives; folds `d1` dice into `staticBonus` (`d1Count` lets a caller rebuild the d1-only result shape); with no dice groups it still sums bare integers, so `'1'` → 1 and `'—'` → 0. A non-string input passes straight through, so the array form of `rollDice3D` keeps working. **A countless die is one die** — the regex is `/(\d*)d(\d+)/g` with `count = m[1] || 1`, so `'d10'` (the shape of `CLASSES[cls].hitDice`) parses as a single d10 rather than a flat +10; reading it as a modifier is what made level-up HP always roll maximum. See known-patterns-and-gotchas.md → "`CLASSES[cls].hitDice` is a bare `'d10'`".

### spellAccess.js
- `allowedSpellClasses(char)` → lower-cased class names the character may draw spells from: every class from `getCharClasses(char)` (multiclass included) unioned with `char.featSpellLists` values (normalised via `[].concat`, so a legacy bare string works). A third-caster subclass at class level 3+ adds `'wizard'` (`spellListClassFor`), keeping the class's own name. Empty ⇒ the caller should not filter.
- `extraSpellNames(char)` → `Set` of 2014 Warlock patron expanded-spell names (`getSubclassSpells(...).expanded` across classes, up to the warlock's castable level). The sheet's browser and the editor's list OR these in — they widen the list, they are not prepared.
- `getAlwaysPreparedSpells(char)` → `[{ name, source }]` (`source` = subclass name): domain / oath / circle / 2024 subclass lists across all classes, plus an Arcane Trickster's Mage Hand. The Circle of the Land land comes from a `Circle Land: X` feature (object entries normalized), falling back to any `land-terrain` level choice. Derived, never stored.
- `resolveSheetSpells({ preparedNames, alwaysPrepared, allSpells })` → `{ spells, missing }` — the sheet's spell objects in `allSpells` order: prepared spells as-is, always-prepared ones as **shallow copies** tagged `_alwaysPrepared: source` (never mutating the shared list), de-duplicated by name with the tag winning. `missing` = always-prepared names with no spell data (the UI lists them by name).
- `spellLimitCounts(spells)` → `{ cantrips, leveled }` excluding `source === 'race'` and `_alwaysPrepared` spells.
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

`CLASSES[cls].subclasses` / `subclassDescs` are the **2014** lists. Pages never read them directly — go through `getSubclasses` / `getSubclassDesc` in `subclassData.js`.

**Additional classData.js exports:**
- `getClassLevels(className, ruleset)` — Feature names per level, ruleset-adjusted. 2014 returns `CLASS_LEVELS[cls]` itself. 2024 moves the subclass choice to 3 (`RULESET_2024_SUBCLASS`), adds `RULESET_2024_ADD` features, removes `RULESET_2024_REMOVE` placeholders (the Cleric's `Domain Feature` at 2 and 8), and de-duplicates across levels **only the promoted names** (`RULESET_2024_ADD` + `RULESET_2024_SUBCLASS`) — `'ASI'` and `'<X> Feature'` placeholders stay at every level
- `getSubclassLevel(className, ruleset)` — 2024: 3 for every class; 2014: the class's own
- `getLevel1Features(className, ruleset)` — `CLASSES[cls].features`; under 2024 drops the subclass-choice entry that moves to level 3 (Cleric Divine Domain, Sorcerer Sorcerous Origin, Warlock Otherworldly Patron). Used by the creator
- `getSpellSlots(className, level, ruleset = '2014', subclass = '')` — Returns spell slot array or Warlock pact object (single class). An Eldritch Knight / Arcane Trickster uses `THIRD_CASTER_SLOTS` (4 entries, from class level 3, same in both rulesets)
- `THIRD_CASTER_SUBCLASSES` / `isThirdCaster(cls, subclass)` — one-third casters are a (class, subclass) pair: Fighter + Eldritch Knight, Rogue + Arcane Trickster
- `spellcastingAbilityFor(cls, subclass)` — the class's own ability, or `'intelligence'` for a third caster, else `null`
- `spellListClassFor(cls, subclass)` — `'Wizard'` for a third caster, else the class
- `getMulticlassCasterLevel(classes)` — Combined caster level (full=full, half=÷2, Artificer=÷2↑, EK/AT=÷3; Warlock excluded)
- `getMulticlassSpellSlots(classes)` — `{ standard: number[]|null, pact: {pact,slots,level}|null }`. One standard caster → its own table (a lone EK/AT included); 2+ → combined-level multiclass table; Warlock pact always separate
- `getExtraAttacks(className, level)` — Returns number of extra attacks (per class)
- `RACE_DEFENSES` — Racial resistances/immunities
- `getClassDefenses(className, level, subclass, { features, levelChoices })` — Returns class-based resistances. Barbarian rage B/P/S; a 2014 Totem Warrior with the level-3 Bear spirit (`Totem Spirit (Lv3): Bear` feature, object entries normalized, or `levelChoices['3'|'Barbarian:3'].totem === 'Bear'`) resists all but psychic
- `SAVING_THROWS_BY_CLASS` — Maps class name to saving throw proficiency array

### featureUses.js (~55 lines)
`FEATURE_USES` — limited-use class features keyed by base name → `{ max(classLevel, char, className), recharge: 'short'|'long'|fn, unit? }`. Ability-based counts (Bardic Inspiration, Divine Sense, …) read the **effective** score (`abilityScores` + `abilityBonuses`). `computeFeatureUses(name, classLevel, char, className)` returns `{max, recharge, unit}` or null (0 = unlimited, e.g. Rage 20, Wild Shape at 2014 Druid 20; 2024 Wild Shape is 2/3 at 6/4 at 17 and never unlimited). `baseFeatureName(name)` strips `(x/day)` etc. for a stable storage key. Remaining uses persist in `char.featureUses[baseName]`; long rest clears the whole object, short rest deletes short-recharge keys.

### featureRolls.js (~35 lines)
`featureRoll(name, { classLevel })` → `{ formula, type: 'healing'|'damage'|'utility', label, note? }` or null. Convenience dice for rollable class features so the Actions tab can show a roll button next to them: Second Wind (`1d10 + level` heal), Sneak Attack (`ceil(level/2)d6`), Divine Smite (`2d8`), Bardic Inspiration and Song of Rest (die scales with level). Keyed by `baseFeatureName`, so `(x/day)`-style qualifiers don't matter. `NATURAL_WEAPONS` (in `classData.js`) is the parallel racial-attack data (Aarakocra Talons, Lizardfolk Bite, Tabaxi/Tortle/Leonin Claws, Satyr Ram) rendered as rollable attacks near Unarmed Strike.

### featureDescriptions.js (~140 lines)
`FEATURE_DESCRIPTIONS` — concise text for every class feature name in `CLASS_LEVELS` (all 13 classes, levels 1-20). The subclass-choice entries (Divine Domain, Sacred Oath, Sorcerous Origin, Otherworldly Patron, Arcane Tradition, …) name no level, because the level differs by ruleset. `featureDescription(name)` looks up a description, stripping `(x/day)` / level qualifiers and `improvement(s)` suffixes. Used by `CharacterSheet` as the fallback description for features that lack their own text (the level-1 `CLASSES[class].features` and the resolved subclass features provide the rest).

### multiclass.js (~110 lines)
Normalizes single- and multi-class characters and derives combined stats. Single-class saves have no `char.classes`; helpers synthesize one from `char.class/subclass/level`, so all callers treat characters uniformly and existing saves keep working.
- `getCharClasses(char)` — Canonical `[{class, subclass, level}]` (per-class levels). Only a `classes` array with **2+** entries is authoritative; for one class the top-level `class/level/subclass` win (a one-element array is a leftover — see gotchas).
- `getTotalLevel(char)` / `isMulticlass(char)`
- `formatClasses(char, {withSubclass})` — "Fighter 5 / Wizard 3"
- `getHitDicePools(char)` / `formatHitDice(char)` — Per-class hit-dice pools (`[{die,count}]` / "5d10 + 5d6")
- `getMulticlassExtraAttacks(char)` — Best single class (does not stack)
- `getSpellcastingClasses(char)` — `[{class, subclass, level, ability}]` for per-class DCs; includes a class when `spellcastingAbilityFor(class, subclass)` is truthy (so an Eldritch Knight / Arcane Trickster casts with INT) and omits one below `spellcastingStartLevel(class, ruleset, subclass)` (2014 Paladin/Ranger: 2; third casters: 3)
- `spellcastingStartLevel(className, ruleset, subclass = '')` — class level at which Spellcasting begins
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
- `HUNTER_OPTIONS` — 2014 Hunter choices by level (3, 7, 11, 15); kept for compatibility. `HUNTER_OPTIONS_2024` — 2024 choices at 3 (Colossus Slayer / Horde Breaker) and 7 (Escape the Horde / Multiattack Defense) only
- `getHunterOptions(level, edition, current = '')` → `{ label, options: [{ name, desc, label?, legacy }] }` or `null` when that level has no card; a stored `current` pick from the other edition is appended with an "(2014 rules)" / "(2024 rules)" label
- `LAND_TERRAINS` (2014: Arctic…Underdark) and `LAND_TERRAINS_2024` (Arid/Polar/Temperate/Tropical) — descriptions generated from `LAND_SPELLS_2014` / `LAND_SPELLS_2024`, so they list every circle spell
- `getLandOptions(edition, current = '')` → `[{ name, desc, label?, legacy }]`, appending a legacy land the same way
- `FAVORED_ENEMIES` — Ranger favored enemy options
- `FAVORED_TERRAINS` — Ranger favored terrain options
- `getLevelChoices(cls, level, subclass, ruleset = '2014')` — Returns available choices for a class at a given level; every choice carries `level`, and the subclass choice follows `getSubclassLevel(cls, ruleset)`. Subclass-dependent choices follow the subclass's own edition (`subclassEdition`) and are stamped with `edition`: Hunter cards per edition, the Circle of the Land card at the Druid's subclass level, and the Champion's Additional Fighting Style at 10 (2014) / 7 (2024) with `additional: true`
- `asiChoiceEffect(selection, featAbility?)` → `{ deltas: {ability: n}, saves: [ability] }` for an ASI-card pick ("+2 Strength", "+1 Dexterity / +1 Wisdom", or a half-feat via `FEAT_ABILITY_BONUSES`; Resilient adds its save)
- `migrateSingleClassChoices(char, cls)` → `{ levelChoices, features }` re-keyed for the character's original class when a second class is added
- `relocateOrphanedChoices(levelChoices, { cls, subclass, ruleset, namespaced })` → `{ changed, levelChoices }` — moves picks from old saves that sit on a level with no choice of that type to the nearest free card of that type (at or below, else above). Run once per class by the sheet on load (and on a ruleset change). Never moves `LEVEL_SPECIFIC_CHOICES` (`totem`, `hunter-option`); a Champion additional-style pick only moves to an `additional` card (the stored entry and `typesAt` share one `type + ':additional'` key)

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
Keyed by subclass name directly (not nested under class). Each level maps to a single `{name, desc}` object (not an array). This is the **2014** table (PHB subclasses plus the Artificer and a few supplements such as Theros); the 2024 tables live in `subclassFeatures2024.js`. Read it through `getSubclassFeatures` / `listSubclassFeatures` (`subclassData.js`), never from a page.

### subclassFeatures2024.js
`SUBCLASS_FEATURES_2024` — the 2024 Player's Handbook subclass feature tables for the 12 PHB classes (48 subclasses), same shape as the 2014 table: `{ [subclass]: { [level]: { name, desc } } }`, several features at one level joined with " & ", descriptions in the app's own words. Levels: Barbarian/Druid/Warlock/Wizard 3/6/10/14, Bard 3/6/14, Cleric 3/6/17, Fighter 3/7/10/15/18, Monk 3/6/11/17, Paladin 3/7/15/20, Ranger 3/7/11/15, Rogue 3/9/13/17, Sorcerer 3/6/14/18. Artificer has no 2024 table (it uses the 2014 one in both rulesets). Read through the resolver.

### subclassSpells.js
Pure data with **no imports** (so a plain `node` script can check every spell name against `spells.json`).
- `SUBCLASS_SPELLS_2014` — Cleric domains (levels 1/3/5/7/9; Light includes the Light cantrip), Paladin oaths (3/5/9/13/17, incl. Theros Glory) as `mode: 'prepared'`; Warlock patrons as `mode: 'expanded'` keyed by **spell** level (`keyedBy: 'spellLevel'`)
- `LAND_SPELLS_2014` (8 lands, druid levels 3/5/7/9) and `LAND_SPELLS_2024` (Arid/Polar/Temperate/Tropical)
- `SUBCLASS_SPELLS_2024` — every 2024 subclass list (Cleric, Druid Moon/Sea/Stars, Paladin, Ranger Fey Wanderer/Gloom Stalker, Sorcerer Aberrant/Clockwork/Draconic, Warlock patrons, Bard Glamour), all prepared
- `SUBCLASS_SPELLS_NOT_IN_DATA` — the seven rules-accurate names `spells.json` lacks (Commune, Commune with Nature, Hallow, Starry Wisp, Fount of Moonlight, Rary's Telepathic Bond, Summon Dragon); a test fails if one is later added to `spells.json` without cleaning the set
- `allSubclassSpellNames()` → `Set` of every name above
- `THIRD_CASTER_PROGRESSION` — `{ '2014' | '2024': { 'Eldritch Knight' | 'Arcane Trickster': { cantrips[20], spells[20], type, schools, anySchoolLevels, alwaysKnownCantrips } } }`. **The 2024 counts are the least-certain data in the app** (isolated here so they are easy to correct). Cantrip arrays hold book totals, including the AT's Mage Hand

### subclassData.js
The single entry point for subclass data under a ruleset. Imports only `classData`, `subclassFeatures`, `subclassFeatures2024`, `subclassSpells` and `dndConstants` — never `levelChoices`, `multiclass`, `spellAccess` or `dndHelpers` (those import it; keep the graph acyclic).
- `SUBCLASSES_2024` — 2024 names and short descriptions per class; `SAME_IN_BOTH_RULESETS` — `Set(['Artificer'])`
- `getSubclasses(cls, ruleset = '2014')` — the ruleset's names; 2014 returns the **same array** as `CLASSES[cls].subclasses`; `[]` for an empty/unknown class
- `getSubclassDesc(cls, subclass, ruleset)` — the ruleset's description, falling back to the other edition's
- `subclassEdition(cls, subclass, ruleset)` → `'2014' | '2024' | null` — the edition whose rules a name follows (the ruleset if it offers it, else the other edition — a legacy pick — else `null`)
- `offeredSubclass(cls, subclass, classLevel, ruleset)` — the subclass if the class has reached its subclass level and the ruleset offers it, else `''` (the creator's save trim)
- `subclassSelectOptions(cls, current, ruleset)` → `[{ value, label, legacy }]` — the ruleset's list plus `current` appended as "(2014 rules)" / "(2024 rules)" / "(custom)" (the editor's select never destroys a value)
- `getSubclassFeatures(cls, subclass, ruleset)` → `{ edition, legacy, features } | null` — the resolver; 2014 names return the untouched `SUBCLASS_FEATURES` objects; a missing table entry → `null`, never the other edition's table
- `listSubclassFeatures(cls, subclass, ruleset, maxLevel)` → `[{ level, name, desc, edition, legacy }]` sorted by level — what the sheet's Actions / Features / Progression views consume
- `isSubclassPlaceholder(name)` — the generic `'<X> Feature'` rows in `CLASS_LEVELS` (not `ASI` / `Fighting Style`)
- `getSubclassSpells(cls, subclass, classLevel, ruleset, { land })` → `{ alwaysPrepared, expanded, edition }` — the table follows `subclassEdition` (a legacy 2014 patron stays `expanded`); the warlock spell-level mapping is inlined (no `dndHelpers` import); Circle of the Land reads `land` from whichever land table has it
- `thirdCasterSpellInfo(cls, subclass, level, ruleset)` → `{ cantrips, spells, type, maxLevel, schools, anySchool, alwaysKnownCantrips } | null` — the one source for EK/AT numbers at every spell-math site; `cantrips` excludes always-known cantrips (Mage Hand)
- `thirdCasterSchoolStatus({ info, pickedSpells, otherListClasses })` → `{ offSchool, allowed, atLimit }` — the 2014 school budget (leveled Wizard-list picks outside `info.schools` and not on another list the character has); `schools === null` (2024) is never at limit
- `subclassHpBonus(entry)` / `subclassHpDelta(before, after)` / `subclassRepickHp(before, after)` → `{ apply, remind, switched }` — Draconic HP on events; a re-pick never subtracts (`remind`), and `switched` flags a change between two subclasses

---

## Local Data Service

### localDataService.js (~38 lines)
Query functions for bundled JSON data.

**Functions:**
- `queryLocalEquipment({ category, subcategory, search, rarity })` — Filter equipment.json (sorted by category → subcategory → name). `search`/`subcategory`/`school` are matched as **literal**, case-insensitive substrings — never as a regex
- `queryLocalSpells({ level, school, cls, search, source, sourceRace })` — Filter spells.json (`sourceRace` accepts a string or array; used for racial spell-like abilities)
- `getLocalEquipmentByName(name)` — Exact-name lookup, returns the item or `null`
- `getAllLocalSpells()` — Full spells.json array
- `getAllLocalEquipment()` — Full equipment.json array

The query functions return filtered arrays matching the provided criteria. Used by the Spells and Equipment pages for browsing, and by `CharacterSheet.jsx` (via `getLocalEquipmentByName` / `getAllLocalSpells`) for inventory and spell resolution.
