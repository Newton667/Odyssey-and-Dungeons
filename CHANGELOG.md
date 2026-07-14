# OND Changelog

All notable changes to OND (Odyssey & Dragons) will be documented in this file.

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
- **Settings Page** — UI themes (16 presets + custom), dice themes, database connection config with setup guide
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
