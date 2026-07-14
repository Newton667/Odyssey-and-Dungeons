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
1. **Characters**: Saved to `localStorage` (browser) as primary, synced to `server/data/characters/` as backup
2. **Equipment & Spells**: Bundled as static JSON in `client/src/data/`, loaded at import time
3. **Homebrew**: Saved to `localStorage` under `ond-homebrew` key
4. **Settings/Preferences**: All in `localStorage` (themes, layouts, widget positions)

### Sync Flow (useCharacterSync hook)
```
User edits character
    → Updates localStorage immediately
    → Debounced (2s) POST to /api/characters/:id
    → Server writes to data/characters/{id}.json
    → If server unavailable, localStorage is still the source of truth
```

### Database Mode (Optional)
When a MongoDB URI is configured:
- Characters can sync to MongoDB Atlas
- Equipment/Spells can be served from the database
- Campaigns use MongoDB for multiplayer features

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
