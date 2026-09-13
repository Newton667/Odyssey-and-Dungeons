# OND — Odyssey & Dungeons

A local-first D&D 5e companion web app: character sheets, a spell/equipment reference, homebrew content creation, and lightweight multiplayer campaigns — no account, no cloud required.

## Key Features

- **Character sheets** with draggable/reorderable widget layout, weapon attacks with 2024 weapon masteries, spellcasting (slots, upcasting, preparation), inventory with ammo tracking, rest system (short/long), death saves, and auto-calculated AC/carrying capacity
- **3D physics dice** — every roll uses a Three.js + Cannon-es physics-based dice tray, logged to an in-sheet roll log
- **Spell & equipment browsers** backed by local JSON data, with filters for level/school/class/category/rarity
- **Homebrew creator** for custom spells, weapons, armor, items, and ammo, with a visual dice-formula builder and share/import via base64 codes
- **Campaigns** with join codes, session logs, shared roll log, and party member tracking (requires MongoDB)
- **Themes** — 17 UI presets plus custom color overrides, and separate dice theme customization
- **Character creation wizard** covering race, class, ability scores (point buy), skills, background, description, equipment, and spells

## Tech Stack

- **Frontend**: React 18 + Vite + React Router
- **Backend**: Express.js + Mongoose
- **Database**: MongoDB Atlas — optional; the app runs fully offline without it
- **3D Dice**: Three.js + cannon-es physics engine
- **Deployment**: `start.bat` (Windows) / `start.sh` (Linux) launchers with git auto-updates; `scripts/ensure-deps.js` keeps `node_modules` matched to the running platform

## Getting Started

### Windows (recommended)

Double-click `start.bat`. It checks for Node.js and Git (offering to install them if missing), clones the repo on first run, checks GitHub for updates, installs dependencies in both `server/` and `client/`, then starts the backend and frontend and opens `http://localhost:5173` in your browser.

If you downloaded only `start.bat`, it clones the app into `OND-App\` and opens the real launcher from there in a new window; the first window then keeps repeating "you can delete this start.bat now" until you close it — that is expected. From then on, run `OND-App\start.bat`.

### Linux

```bash
chmod +x start.sh && ./start.sh
# or simply
bash start.sh
```

Same behaviour as Windows: checks for Node.js and Git, clones the app into `OND-App/` on first run, checks for updates, installs dependencies, then starts both servers **in the one terminal** and opens the browser. **Ctrl+C stops both servers.**

On a desktop, `OND.desktop` does the same from a double-click (or from the app menu once copied into `~/.local/share/applications/`). It runs `scripts/ond-desktop.sh`, which loads nvm's Node.js before calling `start.sh`. The entry uses absolute paths, so edit its `Path=`, `Exec=` and `Icon=` lines if the checkout lives somewhere other than `/mnt/Stuff/Stuff/DND/OND`.

### Manual setup (any OS)

Requires [Node.js](https://nodejs.org/) and npm.

```bash
# from the repo root — installs root, server, and client dependencies
# (also rebuilds server/ and client/ node_modules if they were installed on another OS)
npm install

# runs the Express server and Vite dev server together
npm run dev
```

This starts:
- Backend at `http://localhost:3001`
- Frontend at `http://localhost:5173`

Other root scripts:
- `npm run build:client` — builds the production client bundle (`client/dist`)
- `npm run deps` — runs `scripts/ensure-deps.js` on its own: installs `server/` and `client/` dependencies, wiping and reinstalling them first if the checkout was last used on a different OS/arch

No `.env` or database setup is required to run the app — see below.

## Offline-First / Optional MongoDB

OND works fully offline out of the box:

- **Characters** are stored in `localStorage` and mirrored to `server/data/characters/*.json` when the server is reachable. There is no MongoDB sync for characters.
- **Equipment and spells** are bundled as static JSON in `client/src/data/` and load without any server or database.
- **Homebrew content** is saved to `localStorage`.

Configuring a `MONGODB_URI` (via Settings → Database, or `server/.env`) is only needed if you want to serve equipment/spells from a database or use **Campaigns**, which require MongoDB for multiplayer features.

## Project Structure

```
OND/
├── client/                  # React frontend
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── context/         # React context providers (Theme, Dice)
│       ├── data/            # Local JSON data (equipment, spells)
│       ├── hooks/           # Custom React hooks
│       ├── pages/           # Route-level page components
│       └── utils/           # D&D constants, helpers, class data
├── server/                  # Express backend
│   ├── models/              # Mongoose schemas
│   ├── routes/              # API route handlers
│   ├── data/characters/     # Local character JSON files
│   └── server.js            # Express entry point
├── Docs/                    # Documentation
├── scripts/
│   └── ensure-deps.js       # Platform-aware dependency install
├── start.bat                # Launcher (Windows)
├── start.sh                 # Launcher (Linux)
└── package.json             # Root workspace config
```

## Documentation

For deeper reference, see the [`Docs/`](Docs/) folder:

- [`architecture.md`](Docs/architecture.md) — project structure, data flow, design decisions
- [`client-pages.md`](Docs/client-pages.md) — page-by-page feature breakdown
- [`client-components.md`](Docs/client-components.md) — component props and behavior
- [`client-context-hooks-utils.md`](Docs/client-context-hooks-utils.md) — context, hooks, and utilities
- [`server.md`](Docs/server.md) — API endpoints, models, routes, and seed scripts
- [`styles-and-theming.md`](Docs/styles-and-theming.md) — CSS variables and theme system
- [`known-patterns-and-gotchas.md`](Docs/known-patterns-and-gotchas.md) — known bug patterns and coding rules
- [`start-bat.md`](Docs/start-bat.md) — launcher script reference (Windows and Linux)
- [`CHANGELOG.md`](CHANGELOG.md) — version history

Repository: https://github.com/Newton667/Odyssey-and-Dungeons
