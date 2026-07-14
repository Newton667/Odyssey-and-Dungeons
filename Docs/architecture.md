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
3. **Homebrew**: Saved to `localStorage` under `ond-homebrew` key
4. **Settings/Preferences**: All in `localStorage` (themes, layouts, widget positions)

### Sync Flow (useCharacterSync hook)
The `useCharacterSync` hook still contains debounced POST-to-server plumbing, but **it is effectively disabled in the shipped app**: the only call site is `CharacterSheet.jsx` (~line 74), which passes `{ syncEnabled: false }`. This matches the CLAUDE.md rule *"Characters are local only (no sync toggle)"* — the sync toggle was removed in v1.1.0. Treat the debounce diagram below as historical; it does not run.

> **Quirk:** `updateHp()` inside the hook fires `PATCH /api/characters/:id/hp` unconditionally — it does *not* check `syncEnabled` — so an HP change still attempts a background server write even though sync is "off."

> **`CharacterEdit.jsx` data flow:** it talks to the server (`fetch` on load, `PUT` on save against `/api/characters/:id`) but now also falls back to `localStorage` (`ond-char-{id}`). Load tries the server first, then the local copy if the server is unreachable or has no record; local-only characters (id prefixed `local-`) read straight from localStorage. Save always writes the merged local copy first (matching the server's `{...existing, ...body}` merge so unmanaged fields survive), then PUTs to the server for non-local ids, tolerating an offline server. This closes the earlier gap where local-only characters 404'd in the editor.

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
