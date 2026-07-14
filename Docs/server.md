# Server Reference

## server.js (~203 lines)
Express entry point.

**Setup:**
- `express.json({ limit: '10mb' })` — Handles base64 character portraits
- CORS enabled for all origins
- Serves built client from `../client/dist` in production
- Static file serving for uploads

**Middleware:**
- JSON body parser (10MB limit)
- CORS
- Multer for file uploads

**Routes mounted:**
- `/api/characters` → routes/characters.js
- `/api/campaigns` → routes/campaigns.js
- `/api/spells` → routes/spells.js
- `/api/equipment` → routes/equipment.js
- `/api/homebrew` → routes/homebrew.js

**Special Endpoints:**
- `GET /api/health` — Returns `{ status: 'ok' }` for connection testing
- `GET /api/check-update` — Runs `git fetch origin main`, compares local/remote HEAD
- `POST /api/apply-update` — Runs `git reset --hard origin/main && git pull` + `npm install`
- `POST /api/upload-spells` — Bulk upload spells array to MongoDB
- `POST /api/upload-equipment` — Bulk upload equipment array to MongoDB
- `POST /api/update-env` — Write MongoDB URI to server/.env file

**MongoDB Connection:**
- Reads `MONGODB_URI` from `.env` file
- Connection is optional — server starts without it
- If connection fails, API routes that need MongoDB return errors but server stays up

---

## Models

### Character.js (~135 lines)
```js
{
  name: String,
  race: String,
  class: String,
  subclass: String,
  level: Number (default: 1),
  xp: Number (default: 0),
  background: String,
  alignment: String,
  portrait: String,          // base64 data URI

  // Ability Scores
  abilityScores: { STR, DEX, CON, INT, WIS, CHA },

  // Combat
  maxHp: Number,
  currentHp: Number,
  tempHp: Number (default: 0),
  ac: Number (default: 10),
  speed: Number (default: 30),
  initiative: Number (default: 0),
  hitDiceTotal: Number,
  hitDiceRemaining: Number,
  deathSaves: { successes: 0, failures: 0 },

  // Proficiencies
  skillProficiencies: [String],
  skillExpertise: [String],
  savingThrowProficiencies: [String],
  armorProficiencies: [String],
  weaponProficiencies: [String],
  toolProficiencies: [String],
  languages: [String],

  // Equipment
  equipment: [{ name, quantity, weight, cost, notes }],
  equippedItems: [String],
  currency: { cp, sp, ep, gp, pp },
  attunedItems: [String],

  // Spells
  spellcastingAbility: String,
  spellSlots: {},
  usedSpellSlots: {},
  knownSpells: [String],
  preparedSpells: [String],

  // Features
  feats: [String],
  classFeatures: [String],
  racialTraits: [String],

  // Details
  personalityTraits: String,
  ideals: String,
  bonds: String,
  flaws: String,
  backstory: String,
  notes: String,

  // State
  inspiration: Boolean (default: false),
  conditions: [String],
  resistances: [String],
  immunities: [String],
  vulnerabilities: [String],

  // Settings
  ammoTracking: Boolean (default: true),
  progressionChoices: {},
}
```

### Campaign.js (~54 lines)
```js
{
  name: String (required),
  description: String,
  dmName: String,
  status: String (default: 'active'),
  joinCode: String (auto-generated 6-char),
  players: [{ name, odCharacterId, joinedAt }],
  sessions: [{ date, title, notes }],
  rollLog: [{ playerName, characterName, type, formula, result, total, timestamp }],
  createdAt: Date,
  updatedAt: Date
}
```

### Spell.js (~33 lines)
```js
{
  name: String (required, unique),
  level: Number (0-9),
  school: String,
  castingTime: String,
  range: String,
  components: [String],       // ['V', 'S', 'M']
  materialComponent: String,
  duration: String,
  concentration: Boolean,
  ritual: Boolean,
  description: String,
  higherLevels: String,
  scaling: String,            // e.g., "1d6" per level above base
  classes: [String],
  attackType: String,
  damage: String,
  damageType: String,
  savingThrow: String,
  saveEffect: String,
  aoe: Boolean,                // Is this an area of effect spell?
  aoeShape: String,            // Sphere, Cone, Cube, Cylinder, Line, Square, Wall
  aoeSize: Number,             // Size in feet (e.g., 20 for "20-foot-radius sphere")
  aoeDetails: String           // Extra info (e.g., "30ft long, 5ft wide" for lines)
}
```

### Equipment.js (~32 lines)
```js
{
  name: String (required),
  category: String,           // weapon, armor, adventuring-gear, tools
  subcategory: String,        // Simple Melee, Heavy Armor, etc.
  cost: String,               // "50 gp"
  weight: String,             // "6 lb."
  damage: String,             // "2d6"
  damageType: String,         // slashing, piercing, etc.
  properties: [String],       // ['Heavy', 'Two-Handed', 'Finesse']
  ac: Number,
  stealthDisadvantage: Boolean,
  strRequirement: Number,
  rarity: String,             // common→artifact
  magical: Boolean,
  attunement: Boolean,
  description: String,
  ammoType: String,           // "Arrows", "Crossbow Bolts"
  stackSize: Number
}
```

### Homebrew.js (~63 lines)
```js
{
  name: String (required),
  type: String,               // spell, weapon, armor, item, ammo
  shareCode: String (auto-generated),
  createdBy: String,
  // ... includes all fields from Spell and Equipment schemas
  // depending on the type
}
```

---

## Routes

### routes/characters.js (~117 lines)
Character CRUD with local JSON file backend.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/characters` | List all characters (reads from `data/characters/` dir) |
| GET | `/api/characters/:id` | Get single character by ID |
| POST | `/api/characters` | Create new character (saves as JSON file) |
| PUT | `/api/characters/:id` | Full update character |
| PATCH | `/api/characters/:id` | Partial update (HP, conditions, etc.) |
| DELETE | `/api/characters/:id` | Delete character JSON file |

**Storage:** `server/data/characters/{id}.json` — one file per character.

### routes/campaigns.js (~172 lines)
Campaign CRUD with multiplayer features. Requires MongoDB.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/campaigns` | List all campaigns |
| GET | `/api/campaigns/:id` | Get single campaign |
| POST | `/api/campaigns` | Create campaign (auto-generates join code) |
| PUT | `/api/campaigns/:id` | Update campaign |
| DELETE | `/api/campaigns/:id` | Delete campaign |
| POST | `/api/campaigns/:id/join` | Join campaign with join code |
| POST | `/api/campaigns/:id/sessions` | Add session log entry |
| POST | `/api/campaigns/:id/rolls` | Add roll to shared roll log |
| GET | `/api/campaigns/:id/rolls` | Get recent rolls (polling) |

### routes/spells.js (~63 lines)
Spell CRUD. Requires MongoDB.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/spells` | List/search spells (query: level, school, class, search) |
| GET | `/api/spells/:id` | Get single spell |
| POST | `/api/spells` | Create spell |
| PUT | `/api/spells/:id` | Update spell |
| DELETE | `/api/spells/:id` | Delete spell |

### routes/equipment.js (~62 lines)
Equipment CRUD. Requires MongoDB.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/equipment` | List/search equipment (query: category, search, rarity) |
| GET | `/api/equipment/:id` | Get single item |
| POST | `/api/equipment` | Create item |
| PUT | `/api/equipment/:id` | Update item |
| DELETE | `/api/equipment/:id` | Delete item |

### routes/homebrew.js (~100 lines)
Homebrew CRUD with share code system. Requires MongoDB.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/homebrew` | List homebrew (query: type) |
| GET | `/api/homebrew/:id` | Get single homebrew item |
| POST | `/api/homebrew` | Create homebrew item |
| PUT | `/api/homebrew/:id` | Update homebrew item |
| DELETE | `/api/homebrew/:id` | Delete homebrew item |
| GET | `/api/homebrew/share/:code` | Get homebrew by share code (for import) |

---

## Seed Scripts

All seed scripts connect to MongoDB and populate collections. Run with `node seed-{name}.js`.

| Script | Collection | Contents |
|--------|-----------|----------|
| seed-equipment.js | equipment | 184 mundane items (weapons, armor, gear, tools, ammo) |
| seed-magic-items.js | equipment | 60+ magical weapons/items by rarity |
| seed-cantrips.js | spells | All PHB cantrips |
| seed-level1.js through seed-level9.js | spells | All PHB spells levels 1-9 |
| seed-racial-abilities.js | spells | Racial spell-like abilities |
| seed-missing.js | spells | Additional spells for completeness |
| update-descriptions.js | spells | Utility to batch-update spell descriptions |

### build-local-json.js (~71 lines)
Exports MongoDB data to local JSON files for offline use:
- Reads all documents from `equipment` and `spells` collections
- Writes to `client/src/data/equipment.json` and `client/src/data/spells.json`
- Run after any seed script changes: `node build-local-json.js`
