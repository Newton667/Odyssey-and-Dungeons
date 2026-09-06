# OND Architecture Overview

## Tech Stack
- **Frontend**: React 18 + Vite + React Router
- **Backend**: Express.js + Mongoose
- **Database**: MongoDB Atlas (optional, app works fully offline)
- **3D Dice**: Three.js + Cannon.js physics engine
- **Deployment**: Windows start.bat launcher with git auto-updates

## Project Structure
```
OND/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React context providers (Theme, Dice)
│   │   ├── data/            # Local JSON data (equipment, spells)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Route-level page components
│   │   ├── utils/           # D&D constants, helpers, class data
│   │   ├── App.jsx          # Root component with routing
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── vite.config.js       # Vite config with API proxy
│   └── package.json
├── server/                  # Express backend
│   ├── models/              # Mongoose schemas
│   ├── routes/              # API route handlers
│   ├── data/characters/     # Local character JSON files
│   ├── seed-*.js            # Database seed scripts
│   ├── build-local-json.js  # Export DB data to local JSON
│   └── server.js            # Express entry point
├── Docs/                    # Documentation
├── start.bat                # Windows launcher
└── package.json             # Root workspace config
```

## Data Flow

### Local-First Architecture
1. **Characters**: Local only. The character list, sheet, and creation flow read/write `localStorage` and mirror to `server/data/characters/` JSON files when the server is reachable. There is **no MongoDB sync** for characters (see Sync Flow below).
2. **Equipment & Spells**: Bundled as static JSON in `client/src/data/`, loaded at import time
3. **Homebrew**: Saved to `localStorage` under `ond-homebrew` key, accessed **only** through `client/src/utils/homebrew.js`. Consumers read via `readHomebrew()`, which normalises old records in memory (legacy field names, missing lists, text where a number belongs) and hides anything it cannot understand. Mutations (`save`/`delete`/`import`/`duplicate`) read via `readHomebrewRaw()` and rewrite only the record the user touched — everything else, including records the normaliser skips, is passed through untouched. There is no migration pass and no schema-version field.
4. **Settings/Preferences**: All in `localStorage` (themes, layouts, widget positions)

### Sync Flow (useCharacterSync hook)
The `useCharacterSync` hook still contains debounced POST-to-server plumbing, but **it is effectively disabled in the shipped app**: the only call site is `CharacterSheet.jsx` (~line 74), which passes `{ syncEnabled: false }`. This matches the CLAUDE.md rule *"Characters are local only (no sync toggle)"* — the sync toggle was removed in v1.1.0. Treat the debounce diagram below as historical; it does not run.

> **Deliberate:** `updateHp()` inside the hook fires `PATCH /api/characters/:id/hp` unconditionally — it does *not* check `syncEnabled` — so an HP change still attempts a background server write even though sync is "off." This is kept on purpose: `CampaignView` reads player HP from the server for the DM's view, and the load policy below makes the resulting `updatedAt` bump harmless.

### The server is a backup, never a source of truth
`localStorage` (`ond-char-{id}`) holds the only complete copy of a character. The server's role is exactly two things:
1. a **write-only backup** (editor saves, HP PATCHes, and pushes when the local copy is newer), and
2. a **discovery source** for a character this browser has never seen.

A server record is adopted **only when there is no local copy at all**. Whenever a local copy exists it wins — regardless of `updatedAt`, and even if the local record has no timestamp. The decision lives in one place, `resolveLoadAction(local, server)` in `utils/charSync.js`, called by both `useCharacter`'s load effect and `useCharacterList`'s merge loop (opening the character list was a second, independent path to the same overwrite).

This matters because the sheet writes fields that the server backup historically never held — equipped items, ammo, spent spell slots, feature uses, conditions, attunement, death saves, multiclass `classes`. Adopting a "newer" server record over a local one destroyed them. Correspondingly, the editor now `PUT`s the **merged** character rather than the bare form body, so the backup is no longer lossy.

> **`CharacterEdit.jsx` data flow:** it is **local-first**, matching the sheet (which uses `useCharacter` with sync disabled and treats `localStorage` `ond-char-{id}` as the master copy). Load reads the local copy first and only falls back to the server (`GET /api/characters/:id`) when there is no local copy; local-only characters (id prefixed `local-`) read straight from localStorage. Save writes the merged local copy first (`{...char, ...body, updatedAt}`, so fields the form doesn't manage survive), then `PUT`s **that same merged object** to the server for non-local ids, tolerating an offline server. Loading local-first is what keeps the editor in sync with edits made on the sheet (e.g. prepared spells) — a server-first load showed the stale server copy and could clobber sheet-only changes on save.

### Multiclass Data Shape
Characters may hold a `classes` array (`[{class, subclass, level}]`) alongside the summary fields `class`/`subclass` (primary = `classes[0]`) and `level` (total). Single-class characters omit `classes`. All class-derived math (spell slots, features, extra attack, hit dice, proficiency bonus) flows through `utils/multiclass.js`, which normalizes both shapes via `getCharClasses(char)` so existing single-class saves need no migration. See `known-patterns-and-gotchas.md` → "Multiclassing."

### Database Mode (Optional)
When a MongoDB URI is configured:
- Equipment/Spells can be served from the database
- Campaigns use MongoDB for multiplayer features
- Characters are **not** synced to MongoDB (local files only)

## Versioning
- Version is defined in `client/src/version.js` as `export const VERSION = 'vX.Y.Z'`
- Home page imports and displays it automatically
- All changes are logged in `CHANGELOG.md` at the project root
- When bumping version: update both `version.js` and add a new section to `CHANGELOG.md`

## Key Design Decisions
- **Local-first**: App works fully offline, database is optional
- **No authentication**: Designed for local/trusted network use
- **Widget-based layout**: Character sheet sections are draggable/reorderable
- **3D dice**: All rolls use Three.js physics-based dice for visual feedback
