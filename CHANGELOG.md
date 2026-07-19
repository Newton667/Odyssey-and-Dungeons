# OND Changelog

All notable changes to OND (Odyssey & Dragons) will be documented in this file.

<!-- NOTE FOR CLAUDE: Follow these rules after EVERY change:

     1. CHANGELOG: After any bug fix or feature, add it to the "## vX.X.X — Unreleased"
        section under the appropriate heading (### Added, ### Changed, ### Fixed, ### Removed).
        When a version is finalized and pushed, rename the Unreleased section to the version
        number + date, then re-add a fresh "## vX.X.X — Unreleased" section above it.
        Also update client/src/version.js to match the new version number.

     2. DOCS: After any bug fix or feature, update the relevant Docs/ files:
        - architecture.md — If project structure, data flow, or design decisions change
        - client-pages.md — If any page component gains new features, tabs, or systems
        - client-components.md — If any component's props, behavior, or purpose changes
        - client-context-hooks-utils.md — If context providers, hooks, or utility functions change
        - server.md — If server endpoints, models, routes, or seed scripts change
        - styles-and-theming.md — If CSS variables, theme system, or styling patterns change
        - known-patterns-and-gotchas.md — If a new bug pattern is discovered and fixed, or a
          new coding pattern should be followed. This is the most important doc to keep current.
        - start-bat.md — If the launcher script changes

     3. WHAT TO UPDATE: Only update docs that are directly affected by the change.
        Don't update every doc for every change. Match the scope. -->

---

## vX.X.X — Unreleased

---

## v1.2.0 — 2026-07-19

### Added
- **Long Rest confirmation toast** — Taking a long rest now shows a "Fully Rested" popup summarizing HP restored, hit dice regained, and that spell slots & feature uses were reset (mirrors the existing short-rest toast).
- **Limited-use feature counters** — Class features with limited uses (Lay on Hands, Rage, Second Wind, Action Surge, Ki, Channel Divinity, Bardic Inspiration, Divine Sense, Sorcery Points, etc.) now show a −/＋ counter on the Actions tab showing remaining/max. Max scales with class level and ability modifier (e.g. Lay on Hands = 5 × paladin level, Divine Sense = 1 + CHA). **Long rest** resets every counter to full; **short rest** resets short-rest features (Second Wind, Action Surge, Ki, Channel Divinity, Wild Shape…). Backed by the new `utils/featureUses.js`.
- **Full multiclassing support** — Multiclass characters are now computed correctly everywhere, not just recorded at creation. A new `utils/multiclass.js` normalizes single- and multi-class characters into one `classes` array (`[{class, subclass, level}]`) and derives combined stats; existing single-class saves keep working untouched.
  - **Spell slots** use the RAW combined **caster level** (full casters full, half casters ÷2, Artificer ÷2 rounded up, Eldritch Knight / Arcane Trickster ÷3). A single spellcasting class still uses its own class table. **Warlock Pact Magic is tracked separately** and can coexist with standard slots.
  - **Spell save DC / attack** shown per spellcasting class (each uses its own ability).
  - **Extra Attack** takes the best single class instead of stacking across classes.
  - **Features** on the Actions and Features tabs aggregate every class at its own level (plus each subclass's features).
  - **Hit dice** display as per-class pools (e.g. `5d10 + 5d6`); the short-rest modal lets you pick which die to spend; Pact slots recover on a short rest when Warlock is any of the classes.
  - **Level Up modal** on the sheet lets you advance an existing class or **multiclass into a new one** (enforcing PHB ability-score requirements and granting the reduced multiclass proficiencies). It now **prompts for a subclass** whenever the advanced/added class reaches its subclass-unlock level without one, writing it to the correct class.
  - **Progression tab is fully per-class:** it renders one section per class (each with that class's own progression table, next-level preview, and available choices). Level-up choices (ASI/feat, subclass, fighting style, metamagic, invocations, etc.) are stored **namespaced by class** so classes no longer collide; subclass and fighting-style picks apply to the correct class, and defenses/resistances aggregate across all classes.
  - Class breakdown ("Fighter 5 / Wizard 5") shows on the sheet header, character cards, and the edit page.
- **Class Features & Actions on the Actions tab** — The character sheet's Actions tab now lists every class feature for the character's level (e.g. Lay on Hands, Rage, Second Wind, Channel Divinity, Sneak Attack) plus unlocked subclass features, alongside weapon and spell attacks. Each row shows the unlock level and opens its full description in the side panel. The list is derived from `CLASS_LEVELS` + `CLASSES` + `SUBCLASS_FEATURES` by level, so it works for **all 13 classes and all levels** — including existing characters whose stored `features` array was never populated at creation. Generic bookkeeping rows (ASI, "Fighting Style", "<X> Feature" subclass placeholders) are filtered out; the real chosen fighting style and any stored/homebrew features are merged in.
- **Feat effects feed into the character sheet** — Feats with concrete, evaluable effects now update the sheet automatically:
  - **Alert** → +5 Initiative
  - **Observant** → +5 passive Perception and passive Investigation
  - **Medium Armor Master** → raises the medium-armor DEX cap from +2 to +3 in the AC calculation (when medium armor is equipped)
  - **Tavern Brawler** → Unarmed Strike die becomes 1d4 (instead of 1) on the Actions tab

  Additive derived-stat bonuses are data-driven via the new `FEAT_EFFECTS` table (`dndConstants.js`); equipment/context-conditional feats are evaluated inline where the sheet already knows the condition. Ability-score feat bonuses remain applied at creation, and stored/editable stats (speed, max HP — Mobile, Tough) are intentionally left to the level-up/edit flow to avoid double-counting.

### Fixed
- **Class features now show descriptions.** Features gained above level 1 came from `CLASS_LEVELS` (names only), so most had no text on the Actions/Features tabs. Added `utils/featureDescriptions.js` — a concise description for every class feature across all 13 classes and 20 levels (verified 100% coverage) — used as a fallback wherever a feature lacks its own text.
- Action side panel no longer renders "To Hit: +undefined" or a spurious "Proficient: No" for non-attack actions (e.g. class features) — those rows are now only shown when the data is present.
- Spell AOE data (`aoe`, `aoeShape`, `aoeSize`, `aoeDetails`) is now part of the `Spell` Mongoose schema, so `POST /api/config/upload-data` no longer drops it when pushing `client/src/data/spells.json` into MongoDB.
- `CharacterEdit` now falls back to `localStorage` (key `ond-char-{id}`) when the server has no copy of a character — local-only characters (id prefixed `local-`) can be edited and saved offline instead of failing to load. Saves always write the local copy first (merged like the server's update) and tolerate an unreachable server.

---

## v1.1.1 — 2026-07-14

### Added
- **Changelog modal** — Changelog button on home page opens a modal showing all version history with themed markdown rendering
- **Version number restyled** — Version badge now matches button styling, more visible

### Fixed
- **Changelog theming** — Modal and markdown renderer use CSS variables instead of hardcoded colors, follows active UI theme

---

## v1.1.0 — 2026-07-14

### Added
- **Spell AOE data** — 158 spells tagged with area of effect info (shape, size); auto-extracted from descriptions (Sphere, Cone, Cube, Cylinder, Line, Square, Wall)
- **AOE in Homebrew** — Spell creator has AOE checkbox with shape dropdown and size input
- **AOE display** — Blue AOE badge on Spells page; AOE info panel in CharacterSheet spell side panel
- **Homebrew test rolls** — DiceFormulaBuilder now has a "Test Roll" button that rolls the formula with 3D dice and shows full equation inline
- **Multi-modifier formula parsing** — `1d20+5+3-2` now correctly sums all modifiers (= +6)
- **Full homebrew spell customization** — Added attack type (melee/ranged), saving throw (STR-CHA), save effect, damage type, and class spell lists to spell creator
- **Full homebrew armor customization** — Added bonus (+1/+2/+3), STR requirement, stealth disadvantage to armor creator
- **Homebrew item/gear section** — Added subcategory (Adventuring Gear, Potion, Scroll, Wondrous Item, etc.), magical, and attunement fields
- **All homebrew fields compatible with share codes** — Import/export automatically includes all new fields
- **Weapon Masteries** — 2024 PHB weapon mastery system (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex) with purple badge on weapon attacks and full descriptions in side panel

### Changed
- **Characters are now local only** — Removed sync toggle from Characters page and Character Sheet; all character data stays in localStorage
- **Dice physics revamp** — More tumbling, bounce, and spin across all force levels; relaxed settle detection for natural roll-out
- **Global dice force** — Force setting (Gentle/Normal/Strong/Mighty) moved to DiceContext; applies to ALL rolls (saves, attacks, manual), persists to localStorage

### Fixed
- **Feat object crash (Features tab)** — `Object.entries(FEATS)` destructured as `[name, desc]` where `desc` was the whole `{prereq, desc}` object, not the description string. Fixed by extracting `featInfo.desc` properly. Also hardened all feat/feature rendering in CharacterSheet and CharacterEdit to normalize objects to strings.
- **Null safety fixes** — Added guards for `toLowerCase()` calls on potentially null strings in CharacterCreate (language filter, tool proficiency) and CharacterSheet (weapon name access in actions and side panel)

---

## v1.0.0 — 2026-07-14

### Added
- **Weapon Masteries** — 2024 PHB weapon mastery system (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex) with purple badge on weapon attacks and full descriptions in side panel
- **Spell Upcasting** — Cast spells at higher levels with auto-scaling damage formulas; 71 spells have scaling data
- **Spell Slot Tracking** — Easy +/- buttons per spell level for tracking slot usage
- **Spell Preparation Toggle** — Toggle prepared spells directly from the character sheet
- **Conditions Tracker** — Track active conditions (Blinded, Prone, Poisoned, etc.) that auto-modify rolls with disadvantage/advantage/auto-fail
- **Defenses Widget** — Add/remove resistances, immunities, and vulnerabilities from a searchable list
- **Rest System** — Short rest with hit dice spending modal; long rest with full HP/slot/hit dice restore
- **Ammo Tracking** — Auto-subtracts ammo when ranged weapons are used; configurable per character
- **Currency Conversion** — Convert between CP, SP, EP, GP, PP in the currency widget
- **Roll Log & Toast** — All dice rolls logged with toast notifications; roll log panel shows last 50 rolls
- **Heroic Inspiration** — Toggle button on character sheet header
- **Death Saves** — Track successes/failures with +/- buttons
- **Carrying Capacity** — Shows current weight vs STR x 15 limit
- **Attunement Slots** — Track attuned magical items (max 3)
- **Extra Attack** — Display for classes with Extra Attack feature
- **Image Cropper** — Zoom/pan/crop for character portraits
- **Equipment Rarity Colors** — Color-coded items (common through artifact) in inventory and browse
- **Homebrewer** — Create custom spells, weapons, armor, items, ammo with share codes (base64 import/export)
- **Progression System** — Level-up choices for ASI/feats, subclass selection, class features, and subclass features for all PHB subclasses
- **Campaign System** — Create campaigns with join codes, session logs, shared roll log
- **Widget Layout** — Draggable/reorderable character sheet sections with 2/3/4 column options
- **Settings Page** — UI themes (17 presets + custom), dice themes, database connection config with setup guide
- **Web Update Button** — Check for updates and pull latest from GitHub without using git CLI
- **Local-First Architecture** — All data works offline; database is optional
- **Homebrew in Character Sheet** — Custom items/spells appear in character sheet browsers
- **Equipment Browser** — Search and add equipment with rarity sorting (common on top, legendary on bottom)
- **3D Dice System** — Global force setting (Gentle/Normal/Strong/Mighty) applies to ALL rolls with distinct visual indicators
- **start.bat Launcher** — Auto-installs Node/Git, clones repo, checks for updates on launch

### Fixed
- Input deselection bug (NumInput component stores raw text while focused)
- PayloadTooLargeError for character portraits (10MB JSON limit)
- Search box focus loss (converted Widget from inline component to wrapWidget function)
- Heavy armor incorrectly adding DEX to AC
- Stealth disadvantage for heavy armor
- Feat objects crashing React render (normalize {prereq, desc} to strings)
- Blank character sheet on null char (hooks before guards)
- Git dubious ownership error for auto-updates

---

## v0.1.0 — 2026-07-12

### Added
- Initial release
- Character creation wizard (8 steps: race, class, abilities, skills, background, description, equipment, spells)
- Character sheet with ability scores, saves, skills, combat stats, HP tracking
- Spell browser with filtering
- Equipment browser with filtering
- 3D dice roller with Three.js physics
- 16 UI theme presets
- Local storage + MongoDB Atlas sync
- Express.js backend with REST API
