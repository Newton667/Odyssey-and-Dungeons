# Client Pages Reference

## Home.jsx (~100 lines)
Landing page with navigation cards to Characters, Spells, Equipment, etc.
- Shows app version from `client/src/version.js` (bottom right)
- "Check Updates" button fetches from GitHub and offers to pull latest
- Health check indicator for server connection status

## Characters.jsx (~128 lines)
Character list page showing all saved characters as cards.
- Loads from localStorage (`ond-characters-*` keys)
- Falls back to server API if localStorage is empty
- Each card shows: portrait, name, race, class, level, HP bar
- Delete button with confirmation
- "Create New Character" link

## CharacterCreate.jsx (~2158 lines)
Multi-step character creation wizard with 8 steps:
1. **Race** — Select race/subrace, shows racial traits
2. **Class** — Select class, shows hit die/saves/proficiencies
3. **Ability Scores** — Point buy system (27 points) or manual entry
4. **Skills** — Toggle skill proficiencies (limited by class)
5. **Background** — Select background, shows feature/proficiencies
6. **Description** — Name, alignment, portrait (with ImageCropper)
7. **Equipment** — Browse/add equipment, class-recommended gear
8. **Spells** — Select known/prepared spells if spellcaster
- Back/forward navigation between steps
- Feat selection with hover tooltips (Tip component)
- Saves character to localStorage with `local-{uuid}` ID

## CharacterSheet.jsx (~3577 lines)
Full interactive character sheet — the main feature of the app.

### Key Components Inside:
- **NumInput** — Number input that stores raw text while focused (prevents deselection bug)
- **DebouncedTextarea** — Textarea that syncs on blur only
- **wrapWidget()** — Function (not component) that wraps sections in draggable widgets

### Tabs:
- **Actions** — Weapon attacks (equipped), unarmed strike, spell attacks with upcast support
- **Spells** — Spell list by level, preparation toggle, slot tracking with +/- buttons
- **Inventory** — Equipment list with equip toggle, weight, rarity colors, ammo tracking, browse/add
- **Features** — Class features, racial traits, feats, background feature
- **Background** — Personality, ideals, bonds, flaws
- **Notes** — Free-text notes with DebouncedTextarea
- **Progression** — Level-up choices: ASI/feats, subclass, class features

### Major Systems:
- **Weapon Masteries** — 2024 PHB weapon masteries (Cleave, Graze, Nick, etc.) shown as purple badge on weapon attacks; full description in side panel; only active for classes with Weapon Mastery feature (Fighter, Barbarian, etc.)
- **AC Calculation** — Auto-calculates from equipped armor + DEX + shield
- **Roll System** — All rolls use 3D dice, logged to roll log with toast notifications
- **Conditions** — Active conditions that auto-modify rolls (disadvantage, auto-fail)
- **Currency** — Compact horizontal widget with conversion system
- **Ammo Tracking** — Auto-subtracts ammo when ranged weapons are used
- **Rest System** — Short rest (spend hit dice modal), Long rest (full restore)
- **Spell Slots** — Track usage with +/- buttons per spell level
- **Defenses** — Resistances, immunities, vulnerabilities editor
- **Death Saves** — Track successes/failures
- **Carrying Capacity** — STR x 15, shows current weight

### State Management:
- `useCharacter(id)` hook for character data + auto-sync
- `equipCache` ref for caching equipment API data
- `rollLog` state for dice roll history
- `rollToast` state for roll notifications
- `conditions` state for active conditions
- `upcastLevels` state for spell upcasting
- `shortRestModal` state for hit dice spending UI

## CharacterEdit.jsx (~1595 lines)
Edit form for existing characters with tabbed sections:
- **Basic Info** — Name, race, class, level, alignment, portrait
- **Ability Scores** — Direct number editing
- **Skills** — Toggle proficiency (click) / expertise (right-click)
- **Combat** — AC, speed, initiative, HP
- **Equipment** — Manage inventory items
- **Spells** — Add/remove known spells
- **Features & Feats** — Edit class features and feats (with Tip tooltips)
- **Details** — Background, personality, bonds, flaws
- **Notes** — Free-text notes
- **Settings** — Level up, character-specific settings (ammo tracking)
- Hover effect on tabs (cc-skill class)
- ImageCropper for portrait editing

## Spells.jsx (~598 lines)
Spell browser/reference page.
- Filters: level, school, class, search text
- Uses local JSON data from `client/src/data/spells.json`
- Shows homebrew spells from localStorage
- Expandable spell cards with full details
- Roll buttons for damage/healing spells (3D dice)
- Rarity coloring for magical spells
- Blue AOE badge showing shape and size (e.g., "AOE: 20ft Sphere")

## Equipment.jsx (~621 lines)
Equipment browser/reference page.
- Filters: category (weapons/armor/gear/tools), rarity, search
- Uses local JSON data from `client/src/data/equipment.json`
- Shows homebrew items from localStorage
- Expandable cards with properties, damage, weight, cost
- Roll buttons for weapon damage
- Rarity color coding (common→artifact)

## Homebrew.jsx (~650 lines)
Custom content creator.
- Create: spells, weapons, armor, items, ammo
- **DiceFormulaBuilder** — Visual dice formula creator (choose die type + count + modifier) with "Test Roll" button that rolls the formula using 3D dice and shows the full equation inline
- **Share System** — Export to base64 string, import from pasted string. All fields included automatically.
- All data saved to localStorage (`ond-homebrew` key)
- Homebrew items appear in Spells/Equipment browsers and character sheet

**Spell fields:** Level, school, casting time, range, duration, damage type, attack type (melee/ranged), saving throw (STR-CHA) + save effect, concentration, ritual, AOE (shape + size), components (V/S/M + material), classes (multi-select), damage formula + scaling, higher levels description

**Weapon fields:** Subcategory (Simple/Martial Melee/Ranged), damage formula + type, bonus (+1/+2/+3), ammo type, properties (Finesse/Heavy/Light/etc.), magical, attunement

**Armor fields:** Type (Light/Medium/Heavy/Shield), base AC, bonus (+1/+2/+3), STR requirement, stealth disadvantage, magical, attunement

**Item/Gear fields:** Subcategory (Adventuring Gear/Potion/Scroll/Wondrous Item/etc.), magical, attunement

**Ammo fields:** Ammo type, stack size, bonus, magical, extra damage formula

## Campaigns.jsx (~156 lines)
Campaign list page.
- Create new campaigns with name and description
- Shows existing campaigns as cards
- Links to CampaignView for details

## CampaignView.jsx (~321 lines)
Single campaign detail page.
- Join code for multiplayer
- Session log with date/notes
- Party member list
- Shared roll log (polls for updates)

## Settings.jsx (~1084 lines)
App settings with 3 tabs:
- **UI Themes** — 16 presets + custom color overrides for all CSS variables
- **Dice Themes** — Customize 3D dice appearance
- **Database** — MongoDB URI configuration, connection test, data upload buttons
- Setup guide for MongoDB Atlas
- Server .env file management
