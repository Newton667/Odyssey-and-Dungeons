# Client Pages Reference

## Home.jsx (~185 lines)
Landing page with navigation cards to Characters, Spells, Equipment, etc.
- Shows app version from `client/src/version.js` (bottom right, styled as accent badge)
- "Check Updates" button fetches from GitHub and offers to pull latest
- "Changelog" button opens modal overlay with full version history (rendered from CHANGELOG.md via Vite `?raw` import, Unreleased section and HTML comments stripped)
- Health check indicator for server connection status
- Simple markdown-to-JSX renderer for changelog (headings, bullets, bold, dividers)

## Characters.jsx (~99 lines)
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
- Feat selection with hover tooltips (Tip component). Feats in `FEAT_PROFICIENCY_GRANTS` (Skilled) render a picker to choose their granted skills/tools; picks merge into skill/tool proficiencies on save. Half-feats in `FEAT_ABILITY_BONUSES` apply their `+1` to `abilityScores` (choice feats show an ability picker, fixed feats apply automatically with a confirmation line); Resilient also adds the save proficiency; `FEAT_HP_PER_LEVEL` (Tough) adds bonus max HP. **Magic Initiate** shows a picker (choose a class → 2 cantrips + 1 first-level spell) whose picks are added to `preparedSpells`; the sheet raises the cantrip/spell counters by the feat's allowance. The class options come from `MAGIC_INITIATE_CLASSES[ruleset]` (2014 = six lists, 2024 = Cleric/Druid/Wizard) and reset when the ruleset changes, and **the chosen class is persisted** as `featSpellLists: { 'Magic Initiate': ['Cleric'] }` so the sheet's and editor's spell browsers can offer that list later.
- Saves character to localStorage with `local-{uuid}` ID

## CharacterSheet.jsx (~3593 lines)
Full interactive character sheet — the main feature of the app.

### Key Components Inside:
- **NumInput** — Number input that stores raw text while focused (prevents deselection bug)
- **DebouncedTextarea** — Textarea that syncs on blur only
- **wrapWidget()** — Function (not component) that wraps sections in draggable widgets

### Tabs:
- **Actions** — Weapon attacks (equipped), unarmed strike, **racial natural weapons** (Aarakocra Talons, Lizardfolk Bite, etc. from `NATURAL_WEAPONS` — rollable attack + damage), spell attacks with upcast support, and a **Class Features & Actions** list. Versatile weapons show both a **1H** and **2H** damage roll (the 2H die comes from the `versatile (…)` property); Great Weapon Fighting / Dueling apply to the correct grip. Rollable features (Second Wind, Sneak Attack, Divine Smite, Bardic Inspiration, Song of Rest — via `utils/featureRolls.js`) show an inline dice button. The feature list is *derived by level* from `CLASS_LEVELS` + `CLASSES` (descriptions) + unlocked `SUBCLASS_FEATURES` (e.g. Lay on Hands / Rage / Channel Divinity / Sneak Attack), so it works for every class/level even when `char.features` is empty. Bookkeeping rows (ASI, generic subclass placeholders) are filtered; each row shows its unlock level and opens the full description in the side panel. Features descriptions fall back to `utils/featureDescriptions.js`. Limited-use features show a −/＋ **usage counter** (remaining/max from `utils/featureUses.js`) that resets on long rest (all) or short rest (short-recharge features). Unarmed Strike scales with Monk Martial Arts and the Tavern Brawler feat (1d4)
- **Spells** — Spell list by level, preparation toggle, slot tracking with +/- buttons. Cantrip/spell **limits** are enforced (prepared casters = ability mod + level; known casters use `SPELLS_KNOWN`; cantrips use `CANTRIPS_KNOWN`; summed across multiclass) with X/Y counters, and each leveled spell has a **Cast** button that spends a slot of its (upcast) level and disables when none remain. The **"+ Add / Remove Spells" browser** filters to every list the character can actually draw from — all of their classes (so multiclass characters see both) plus any feat-granted list from `char.featSpellLists` — via `allowedSpellClasses` / `spellMatchesClasses` in `utils/spellAccess.js`. Spells with no class list (homebrew/racial) always pass. It previously filtered to the primary class alone, which left a Paladin with Magic Initiate looking at an empty list
- **Inventory** — Equipment list with equip toggle, weight, rarity colors, ammo tracking, browse/add
- **Features** — Class features, racial traits, feats, background feature
- **Background** — Personality, ideals, bonds, flaws
- **Notes** — Free-text notes with DebouncedTextarea
- **Progression** — Level-up choices: ASI/feats, subclass, class features. Renders one section per class for multiclass characters (via `renderClassSection`), with choice storage namespaced by class so classes don't collide

### Major Systems:
- **Weapon Masteries** — 2024 PHB weapon masteries (Cleave, Graze, Nick, etc.) shown as purple badge on weapon attacks; full description in side panel; only active for classes with Weapon Mastery feature (Fighter, Barbarian, etc.)
- **AC Calculation** — Auto-calculates from equipped armor + DEX + shield
- **Roll System** — All rolls use 3D dice, logged to roll log with toast notifications. **One roll at a time:** `rollDice3D` returns `null` while dice are in the air and `RollBtn` renders disabled (50% opacity), so a second click can't swallow the first roll's result and leave a stale number showing
- **Weapon Damage Buttons** — Built by `weaponDamageFormula(wpn.damage, dmgBonus, riderSuffix)`. A magic weapon's `+N` is baked into both its damage string *and* its `bonus` field, so the damage string is sanitized at read time — otherwise the 1H button double-counted and disagreed with the 2H button. Flat-damage weapons (Blowgun, `damage: "1"`) roll their modifier instead of scoring 0; weapons with no damage value (Net, `"—"`) show no damage button at all. The button's label renders the exact string it rolls
- **Conditions** — Active conditions that auto-modify rolls (disadvantage, auto-fail)
- **Currency** — Compact horizontal widget with conversion system
- **Ammo Tracking** — Auto-subtracts ammo when ranged weapons are used
- **Rest System** — Short rest (spend hit dice modal), Long rest (full restore)
- **Spell Slots** — Track usage with +/- buttons per spell level
- **Defenses** — Resistances, immunities, vulnerabilities editor
- **Death Saves** — Track successes/failures
- **Carrying Capacity** — STR x 15, shows current weight
- **Multiclassing** — All class-derived stats route through `utils/multiclass.js`. Spell slots use the combined caster level (Warlock pact shown separately, per-class DCs), Extra Attack takes the best class, hit dice show as per-class pools with a die picker on short rest, and features aggregate across all classes. The **Level Up modal** advances an existing class or multiclasses into a new one (enforcing ability requirements + granting reduced proficiencies). Header shows the "Fighter 5 / Wizard 5" breakdown

### State Management:
- `useCharacter(id)` hook for character data + auto-sync
- `equipCache` ref for caching equipment API data
- `rollLog` state for dice roll history
- `rollToast` state for roll notifications
- `conditions` state for active conditions
- `upcastLevels` state for spell upcasting
- `shortRestModal` state for hit dice spending UI

## CharacterEdit.jsx (~1603 lines)
Edit form for existing characters with tabbed sections:
- **Basic Info** — Name, race, class, level, alignment, portrait
- **Ability Scores** — Standard array / point-buy / manual entry for the base score, plus per-ability *Misc Bonus* boxes (`abilityBonuses`) for items/homebrew kept separate from the base and folded into the effective `scores` everywhere. Saving-throw proficiencies are class-locked by default; an *Override — edit any save* toggle makes them freely clickable.
- **Skills** — Toggle proficiency (click) / expertise (right-click), capped at the class/background/feat max; an *Override — ignore skill limit* toggle bypasses the cap.
- **Combat** — Max HP, Speed, Gold (direct edits); *Initiative Bonus* (`initiativeBonus`); and an Armor Class block with a *Misc AC Bonus* (`acBonus`) and *Override AC* toggle (`acOverride`) — because the sheet auto-recomputes AC from equipped armor, a plain AC number can't stick, so these are the way to adjust/fix it
- **Equipment** — Manage inventory items
- **Spells** — Add/remove known spells (class list, limit-checked, **ruleset-aware** via `getSpellLimits` — a 2024 Paladin/Ranger can prepare spells from level 1). A **Magic Initiate picker** appears when the character has that feat (feat names normalized via `normalizeFeatNames`, since old saves store objects): choose a class from `MAGIC_INITIATE_CLASSES[form.ruleset]` and it is saved as `featSpellLists: { 'Magic Initiate': ['Cleric'] }`, which also unions that class's spells into the editor's own list — including for non-casters like a Fighter or a level-1 Paladin. An "Override — add any spell" toggle adds *any* spell by name or via a full-spell-list search, ignoring class/level/known-prepared limits; works on non-casters too (item/feat-granted spells, homebrew). Writes into `preparedSpells`.
- **Features & Feats** — Edit class features and feats (with Tip tooltips). An "Override — add any feat" toggle bypasses the ASI limit and allows adding a custom (homebrew) feat name. Feats with mechanical effects (proficiencies, `+1` ability, save proficiency, bonus HP) show a reminder note pointing to the section to set them; proficiency-granting feats also raise the Skills/Tools limits by their grant count. Editor stats stay manual (no auto-apply) to avoid double-counting a saved character's creation-time bonuses
- **Details** — Background, personality, bonds, flaws
- **Notes** — Free-text notes
- **Settings** — Level up, character-specific settings (ammo tracking)
- **Stat Breakdown** — Read-only provenance view: every derived number (ability scores = base + misc bonus, proficiency bonus, initiative, AC, max HP, passive Perception, spell save DC/attack, all saves, all skills) shown with its component parts, for debugging a too-high/too-low stat. Initiative shows the ruleset-aware Alert bonus (2014 +5 / 2024 +PB)
- Hover effect on tabs (cc-skill class)
- ImageCropper for portrait editing
- **Data flow:** CharacterEdit is server-oriented — it `fetch`es the character from `/api/characters/:id` on load and `PUT`s the object back on save — but falls back to `localStorage` (`ond-char-{id}`) when the server has no copy, so local-only characters (`local-` id) can be edited and saved offline. Saves write the merged local copy first, then hit the server for non-local ids. Portrait uploads go through `POST /api/upload`. See `known-patterns-and-gotchas.md` → "CharacterEdit Server + Local Fallback."

## Spells.jsx (~585 lines)
Spell browser/reference page.
- Filters: level, school, class, search text
- Uses local JSON data from `client/src/data/spells.json`
- Shows homebrew spells, read through `readHomebrew({ type: 'spell' })` (`utils/homebrew.js`), which normalises old records on the way out
- Cantrip damage scales with the level box (5/11/17) via the shared `cantripDamage` helper — the page's local `scaledDice` is gone
- Expandable spell cards with full details
- Roll buttons for damage/healing spells (3D dice)
- Rarity coloring for magical spells
- Blue AOE badge showing shape and size (e.g., "AOE: 20ft Sphere")

## Equipment.jsx (~644 lines)
Equipment browser/reference page.
- Filters: category (weapons/armor/gear/tools), rarity, search
- Uses local JSON data from `client/src/data/equipment.json`
- Shows homebrew items, read through `readHomebrew({ notType: 'spell' })` (`utils/homebrew.js`)
- The category filter uses `matchesEquipCategory`, so homebrew Item/Gear and Ammo appear under "Adventuring Gear" / "Tool" / "Pack" (they store `category: 'item'` / `'ammo'`)
- Homebrew rows render attunement (`(A)` badge and "(requires attunement)" when expanded), "Strength Required: N", and damage coloured by `DMG_COLORS` — which now covers all 13 damage types, not just the three physical ones
- Expandable cards with properties, damage, weight, cost
- Roll buttons for weapon damage
- Rarity color coding (common→artifact)

## Homebrew.jsx (~943 lines)
Custom content creator.
- Create: spells, weapons, armor, items, ammo
- **DiceFormulaBuilder** — Visual dice formula creator (choose die type + count + modifier) with "Test Roll" button that rolls the formula using 3D dice and shows the full equation inline. Module scope, not defined inside the page component.
- **Share System** — UTF-8-safe base64 via `encodeShareCode` / `decodeShareCode` (`utils/homebrew.js`). The code is always shown in a read-only, select-on-focus textarea under the item, so a blocked clipboard is not a dead end. Import decodes UTF-8 first and legacy Latin-1 second, then runs `sanitizeImported` and reports why a code was rejected.
- **All storage goes through `utils/homebrew.js`.** The page reads its list with `readHomebrew()` (normalising) but every mutation — save, delete, import, duplicate — reads `readHomebrewRaw()`, so a record the normaliser cannot understand is hidden from lists but never written out of existence.
- **Per-type validation** (`validateHomebrew`) blocks a save only where the sheet would otherwise mis-compute: name; weapon category/damage/damage type; armor type and base AC (1-30, shields 1-5); ammo type; spell level 0-9, school, and upcast scaling only on levelled spells. An `M` component with no material text is an **amber warning**, not a block, as is a name that collides with an existing item.
- **Type switching clears the old type's fields** (`resetFormForType`); `pruneToType` on save means junk keys from an earlier type cannot survive an edit.
- **Duplicate** button next to Edit; the list is sorted by type then name.
- A failed write (storage full) keeps the form open with the user's input and says so.
- All data saved to localStorage (`ond-homebrew` key)
- Homebrew items appear in Spells/Equipment browsers, the character sheet, and the character editor's spell override search

**Spell fields:** Level, school, casting time, range, duration, damage type, attack type (melee/ranged), saving throw (STR-CHA) + save effect, concentration, ritual, AOE (shape + size), components (V/S/M + material), classes (multi-select), damage formula + scaling, higher levels description

**Weapon fields:** Subcategory (Simple/Martial Melee/Ranged), damage formula + type, bonus (+1/+2/+3), ammo type, **Weapon Mastery (2024)**, properties, magical, attunement.
Properties are the ten real PHB entries (Ammunition, Finesse, Heavy, Light, Loading, Reach, Special, Thrown, Two-Handed, Versatile) — **"Range" was removed**, it is a glossary heading, not a property. Versatile, Thrown and Ammunition carry their parameters and are stored exactly as `equipment.json` stores them (`versatile (1d10)`, `thrown (20/60)`, `ammunition (80/320)`), which is what the sheet parses. An unrecognised property from an old save is shown as a read-only chip with an ✕.

**Armor fields:** Type (Light/Medium/Heavy/Shield), base AC, bonus (+1/+2/+3), STR requirement, stealth disadvantage, magical, attunement. The armor type shows its AC formula live (`Light → AC + DEX`, `Medium → AC + DEX (max 2)`, `Heavy → AC (no DEX)`, `Shield → +AC`).

**Item/Gear fields:** Subcategory (Adventuring Gear/Potion/Scroll/Wondrous Item/etc.), magical, attunement

**Ammo fields:** Ammo type, stack size, bonus, magical, extra damage formula. Stack size now sets the starting count on the sheet (via `defaultAmmoCount`, unless the item name carries its own `(N)`), and the extra damage dice are added to the weapon's damage roll.

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
- **UI Themes** — 17 presets + custom color overrides for all CSS variables
- **Dice Themes** — Customize 3D dice appearance
- **Database** — MongoDB URI configuration, connection test, data upload buttons
- Setup guide for MongoDB Atlas
- Server .env file management
