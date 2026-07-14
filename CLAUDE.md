# OND — Claude Instructions

## Before Implementing
- Read relevant files in `Docs/` before making changes to understand current architecture
- Check `CHANGELOG.md` for recent changes

## After Every Bug Fix or Feature
1. **CHANGELOG.md** — Add the change to `## vX.X.X — Unreleased` under the correct heading (Added/Changed/Fixed/Removed)
2. **Docs/** — Update only the relevant doc files:
   - `architecture.md` — project structure, data flow, design decisions
   - `client-pages.md` — page features, tabs, systems
   - `client-components.md` — component props, behavior
   - `client-context-hooks-utils.md` — context, hooks, utilities
   - `server.md` — endpoints, models, routes, seeds
   - `styles-and-theming.md` — CSS, themes, styling
   - `known-patterns-and-gotchas.md` — bug patterns and coding rules (most important)
   - `start-bat.md` — launcher script

## Versioning
- When finalizing a version: rename `vX.X.X — Unreleased` with the version number + date, update `client/src/version.js`, then re-add a fresh `## vX.X.X — Unreleased` section
- Don't bump version unless the user says to

## Style
- No emojis in Discord announcements (Discord.md)

## Key Rules
- Characters are local only (no sync toggle)
- Equipment and spells use local JSON data by default
- Never define React components inside other components (causes focus loss bug)
- Use `NumInput` for number inputs (prevents deselection bug)
- Always normalize feat/feature arrays — they can contain objects `{prereq, desc}` from old saves
- Heavy armor does NOT add DEX to AC
- `express.json({ limit: '10mb' })` is required for character portraits
