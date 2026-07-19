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
- `POST /api/upload` — Multipart image upload (multer, field name `image`, 5MB limit, jpg/jpeg/png/gif/webp only). Returns `{ url: '/uploads/...' }`. Used by `CharacterEdit.jsx` for character portraits.
- `GET /api/health` — Returns `{ status: 'ok'|'no-db', db: 'connected'|'disconnected'|... }` for connection testing
- `GET /api/check-update` — Runs `git fetch origin main`, compares local/remote HEAD
- `POST /api/pull-update` — Runs `git reset --hard origin/main && git pull` + `npm install`
- `POST /api/config/upload-data` — Bulk upload local JSON to MongoDB (body: `{ type: 'spells'|'equipment'|'both' }`); reads from `client/src/data/*.json` files
- `POST /api/config/database` — Save MongoDB connection string to server/.env file
- `GET /api/config/database` — Read current MongoDB URI from .env (masked)

**MongoDB Connection:**
- Reads `MONGODB_URI` from `.env` file
- Connection is optional — server starts without it
- If connection fails, API routes that need MongoDB return errors but server stays up

---

## Models

### Character.js (~135 lines)
> **Note:** `routes/characters.js` persists characters as raw JSON files (see Routes below) and does **not** `require` or validate against this Mongoose model — the model file is kept as the canonical reference for the character shape. The field names below match what `CharacterCreate.jsx`/`CharacterEdit.jsx` actually read and write.
```js
{
  name: String (required),
  race: String,
  class: String,
  subclass: String,
  level: Number (default: 1, 1-30),
  background: String,
  alignment: String,
  experiencePoints: Number (default: 0),
  levelingMethod: String,       // 'milestone' | 'xp' (default: 'milestone')

  // Multiclassing
  classes: [{ class: String, subclass: String, level: Number }],

  // Physical description
  age: String, height: String, weight: String,
  eyes: String, hair: String, skin: String,
  faith: String,

  // Ability Scores (full names)
  abilityScores: { strength, dexterity, constitution, intelligence, wisdom, charisma },
  abilityBonuses: { strength, …, charisma } (misc per-ability bonuses, default 0; layered on top of abilityScores),

  // Combat
  maxHp: Number (default: 10),
  currentHp: Number (default: 10),
  temporaryHp: Number (default: 0),
  armorClass: Number (default: 10),        // auto-recomputed by the sheet from equipped armor
  acBonus: Number (default: 0),            // misc AC modifier added to the calc
  acOverride: Number (default: null),      // fixed AC that replaces the calc when set
  speed: Number (default: 30),
  initiative: Number (default: 0),
  initiativeBonus: Number (default: 0),    // misc initiative modifier
  proficiencyBonus: Number (default: 2),
  hitDice: String (default: 'd8'),
  hitDiceRemaining: Number (default: 1),
  deathSaveSuccesses: Number (default: 0),
  deathSaveFailures: Number (default: 0),

  // Proficiencies
  skillProficiencies: [String],
  skillExpertise: [String],
  savingThrowProficiencies: [String],
  toolProficiencies: [String],
  languages: [String],

  // Equipment & inventory
  equipment: [String],          // flat array of item names
  equippedItems: [String],
  ammo: Map<String, Number>,    // { "Arrows": 20, ... }
  gold: Number (default: 0),
  currency: { cp, sp, ep, gp, pp },
  attunedItems: [String],       // max 3

  // Spells
  spellcastingAbility: String,
  spellSlots: Map<String, { total, used }>,
  usedSpellSlots: Map<String, Number>,   // slots used per level
  preparedSpells: [String],

  // Features & traits
  feats: [String],
  features: [String],
  traits: String,               // personality traits
  ideals: String,
  bonds: String,
  flaws: String,
  notes: String,

  // Homebrew levels 21+
  homebrewLevels: Map<String, [String]>,

  // State
  inspiration: Boolean (default: false),   // Heroic Inspiration
  activeConditions: [String],
  customResistances: [String],
  customImmunities: [String],
  customVulnerabilities: [String],

  // Progression / campaign
  levelChoices: Map<String, Object>,       // choices made at each level
  campaignId: ObjectId (ref: Campaign, default: null),
  avatarUrl: String,            // '/uploads/...' path (not base64)

  // Settings
  trackAmmo: Boolean (default: true),
  // timestamps: createdAt, updatedAt
}
```

### Campaign.js (~54 lines)
```js
{
  name: String (required),
  setting: String,
  dmName: String,
  description: String,
  status: String,             // 'active' | 'paused' | 'completed' (default: 'active')
  notes: String,
  imageUrl: String,
  joinCode: String,           // auto-generated 6-char, unique
  players: [{
    playerName: String (required),
    characterId: String,      // Character _id or local id
    characterName: String,
    role: String,             // 'dm' | 'player' (default: 'player')
    joinedAt: Date
  }],
  sessions: [{ sessionNumber, date, summary, xpAwarded }],
  rollLog: [{ playerName, characterName, avatarUrl, label, formula, total, tag, timestamp }],
  // tag = '' | 'ADV' | 'DIS' | 'CRIT' | 'FAIL'
  // timestamps: createdAt, updatedAt
}
```

### Spell.js (~33 lines)
```js
{
  name: String (required),
  level: Number (0-9, required),  // 0 = cantrip
  school: String,
  castingTime: String (default: '1 action'),
  range: String (default: 'Self'),
  components: [String],       // ['V', 'S', 'M']
  materialComponent: String,
  duration: String (default: 'Instantaneous'),
  concentration: Boolean,
  ritual: Boolean,
  description: String,
  higherLevels: String,
  classes: [String],
  attackType: String,         // 'melee' | 'ranged' | ''
  damage: String,             // base dice e.g. '1d10'
  damageType: String,
  scaling: String,            // 'cantrip' = auto-scale at 5/11/17
  savingThrow: String,
  saveEffect: String,
  source: String,             // 'class' | 'race' (default: 'class')
  sourceRace: String,         // e.g. 'Dragonborn', 'Tiefling' — race granting a spell-like ability
  // Area of effect (v1.1.0) — mirrors client/src/data/spells.json
  aoe: Boolean,               // is this an area-of-effect spell?
  aoeShape: String,           // Sphere, Cone, Cube, Cylinder, Line, Square, Wall
  aoeSize: Number,            // size in feet (e.g. 20 for a 20-ft-radius sphere)
  aoeDetails: String,         // extra info (e.g. '30ft long, 5ft wide' for lines)
  // timestamps: createdAt, updatedAt
}
```
> The area-of-effect fields (`aoe`, `aoeShape`, `aoeSize`, `aoeDetails`) are part of the schema, so `POST /api/config/upload-data` preserves them when pushing `client/src/data/spells.json` into MongoDB.

### Equipment.js (~32 lines)
```js
{
  name: String (required),
  category: String (required), // 'armor', 'weapon', 'adventuring-gear', 'tool', 'pack'
  subcategory: String,        // 'light armor', 'simple melee', 'artisan tools', etc.
  cost: String,               // "10 gp"
  weight: String,             // "3 lb."
  description: String,
  // Armor fields
  ac: String,                 // e.g. '12 + Dex modifier', '16'
  strReq: Number,             // Strength requirement (default: 0)
  stealthDisadv: Boolean,
  // Weapon fields
  damage: String,             // "1d8"
  damageType: String,         // 'slashing', 'piercing', 'bludgeoning'
  properties: [String],       // ['finesse', 'light', 'thrown (20/60)']
  // Rarity & magic
  rarity: String,             // 'common'→'artifact' (default: 'common')
  magical: Boolean,
  attunement: Boolean,
  bonus: Number,              // +1, +2, +3
  // General
  quantity: String,           // for packs/bundles
  // timestamps: createdAt, updatedAt
}
```
> `ammoType` and `stackSize` are **not** on Equipment — they exist only on the Homebrew model (below).

### Homebrew.js (~63 lines)
```js
{
  type: String (required),    // 'spell' | 'weapon' | 'armor' | 'item' | 'ammo'
  createdBy: String,          // player name
  name: String (required),
  description: String,
  rarity: String,             // common→artifact (default: 'common')
  homebrew: Boolean (default: true),

  // Equipment fields (weapon/armor/item/ammo)
  category, subcategory, cost, weight, damage, damageType,
  properties: [String], ac: String, magical: Boolean, bonus: Number,
  ammoType: String, stackSize: Number,
  requiresAttunement: Boolean,   // note: NOT `attunement` (that's the Equipment field)

  // Spell fields
  level, school, castingTime, range, components, materialComponent,
  duration, concentration, ritual, classes, attackType, savingThrow,
  saveEffect, higherLevels, scaling,

  shareCode: String,          // auto-generated 12-char, unique
  // timestamps: createdAt, updatedAt
}
```
> The in-app Homebrewer page (`Homebrew.jsx`) is **100% localStorage** (`ond-homebrew` key) and does not call any of the `/api/homebrew` routes below. Those routes back the DB-side share/import flow only.

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
| POST | `/api/campaigns/join` | Join campaign (body: `joinCode`, `playerName`, `characterId?`, `characterName?`) — looked up by join code, no `:id` |
| POST | `/api/campaigns/:id/leave` | Remove a player from the campaign (body: `playerName`) |
| PATCH | `/api/campaigns/:id/player` | Update a player's linked character (body: `playerName`, `characterId?`, `characterName?`) |
| POST | `/api/campaigns/:id/sessions` | Add session log entry (auto-numbers `sessionNumber`) |
| POST | `/api/campaigns/:id/rolls` | Add roll to shared roll log (trims to last 200) |
| GET | `/api/campaigns/:id/rolls` | Get rolls (`?since=` timestamp for polling, else last 50) |
| GET | `/api/campaigns/:id/players` | Get player list + character summaries (polling) |

### routes/spells.js (~63 lines)
Spell CRUD. Requires MongoDB.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/spells` | List/search spells (query: `level`, `school`, `class`, `search`, `source`, `sourceRace`) |
| GET | `/api/spells/:id` | Get single spell |
| POST | `/api/spells` | Create spell |
| PUT | `/api/spells/:id` | Update spell |
| DELETE | `/api/spells/:id` | Delete spell |

### routes/equipment.js (~61 lines)
Equipment CRUD. Requires MongoDB.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/equipment` | List/search equipment (query: category, search, rarity) |
| GET | `/api/equipment/:id` | Get single item |
| POST | `/api/equipment` | Create item |
| PUT | `/api/equipment/:id` | Update item |
| DELETE | `/api/equipment/:id` | Delete item |

### routes/homebrew.js (~99 lines)
Homebrew CRUD with share code system. Requires MongoDB.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/homebrew` | List homebrew (query: `type`, `search`) |
| GET | `/api/homebrew/:id` | Get single homebrew item |
| POST | `/api/homebrew` | Create homebrew item |
| PUT | `/api/homebrew/:id` | Update homebrew item |
| DELETE | `/api/homebrew/:id` | Delete homebrew item |
| GET | `/api/homebrew/:id/export` | Get share payload for an item → `{ shareCode, shareString }` (base64 JSON) |
| POST | `/api/homebrew/import` | Create a new item from a base64 `shareString` (body) |

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
