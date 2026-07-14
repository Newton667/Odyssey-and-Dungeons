# Known Patterns and Gotchas

## Critical Bugs (Fixed) — Don't Reintroduce These

### 1. Widget Component Inside Render (FOCUS LOSS BUG)
**Problem:** Defining a `Widget` React component inside the `CharacterSheet` render function caused all inputs (search boxes, number fields) to lose focus after every keystroke.

**Why:** React compares component types by reference. A component defined inside render creates a new function reference each render, so React treats it as a new component type, unmounting and remounting all children.

**Fix:** Converted `Widget` from an inline component to a plain `wrapWidget()` function that returns JSX directly.

**Rule:** NEVER define React components inside other components' render functions.

### 2. NumInput — Controlled Number Input Deselection
**Problem:** Standard pattern `onChange={e => setValue(parseInt(e.target.value))}` causes the input to deselect because parsing empty string or partial input produces NaN/0, which differs from the raw text, causing React to re-render with a different value.

**Fix:** `NumInput` component stores raw text string while focused, only parses on blur.

**Rule:** For number inputs, always use `NumInput` or the same raw-text-while-focused pattern.

### 3. React Hooks Order
**Problem:** `useMemo`/`useCallback` accessing `char.equippedItems` before the `if (!char) return` guard caused crash on null.

**Fix:** All hooks must be called before any conditional returns. Move guards after hooks, use `char?.field` in hook bodies.

**Rule:** Never put hooks after conditional returns. Use optional chaining inside hooks.

### 4. Feat Objects vs Strings
**Problem:** `char.feats` array can contain either strings (`"Athlete"`) or objects (`{name: "Athlete", prereq: "...", desc: "..."}`). Rendering an object directly crashes React.

**Fix:** Always extract the name: `typeof f === 'string' ? f : f.name`

### 5. Feat Objects vs Strings — Multiple Sources
**Problem:** `{prereq, desc}` objects leak into React rendering from multiple sources:
1. `Object.entries(FEATS)` returns `[name, {prereq, desc}]` — destructuring as `[name, desc]` gives the whole object
2. `char.feats` array can contain objects from old saves instead of name strings
3. `char.features` array can contain objects instead of strings
4. `char.levelChoices` can store full option objects

**Fix:**
- When iterating `FEATS`, destructure as `[name, featInfo]` and access `featInfo.desc`
- Always check `typeof value === 'string'` before rendering feat data
- Normalize arrays with `typeof f === 'object' ? f.name : f` before rendering

**Rule:** Never render any value from feat/feature arrays without checking its type first. Always extract string fields explicitly.

### 6. Equipment Seed Script Wipes Everything
**Problem:** `seed-equipment.js` had `deleteMany({})` which deleted ALL equipment including magic items from `seed-magic-items.js`.

**Fix:** Each seed script only deletes its own category (`magical: true` vs `magical: { $ne: true }`).

**Rule:** Seed scripts should never `deleteMany({})`. Always scope the delete.

---

## Patterns to Follow

### Local-First Data Access
```js
// Always try local first, server is backup
const data = queryLocalEquipment(filters);
// Only hit server if explicitly in database mode
```

### Character Data Updates
```js
const { char, setChar } = useCharacter(id);
// Always spread to create new object
setChar({ ...char, currentHp: newHp });
// Never mutate char directly
```

### 3D Dice Rolls
```js
const { rollDice3D, diceForce, setDiceForce } = useDice();
const { results, total } = await rollDice3D('2d6+3');
// results = [{die:'d6',sides:6,value:4}, {die:'d6',sides:6,value:2}], total = 9
// diceForce is global (1-4) and applies to ALL rolls automatically
// Change force: setDiceForce(3) — persists to localStorage
```

### Equipment Cache
```js
// Cache equipment data to avoid repeated fetches
const equipCache = useRef({});
// Check cache before fetching
if (equipCache.current[itemName]) { /* use cached */ }
```

### Rarity Colors
```js
// Use rarityColor() for text, rarityBg() for backgrounds
style={{ color: rarityColor(item.rarity), background: rarityBg(item.rarity) }}
```

---

## Architecture Gotchas

### Express JSON Limit
`express.json({ limit: '10mb' })` is required because character data includes base64 portrait images. Default 100KB limit causes `PayloadTooLargeError`.

### Git Safe Directory
Windows users cloning via `start.bat` may hit "dubious ownership" errors. The auto-update endpoint adds `safe.directory` config before any git operations.

### Vite Proxy
In dev mode, the Vite dev server proxies `/api/*` requests to `localhost:3001`. In production, Express serves both the API and the built client from `client/dist/`.

### localStorage Keys
- `ond-char-{id}` — Character data
- `ond-characters-list` — Character ID index
- `ond-homebrew` — Array of homebrew items
- `ond-theme` — Theme preset name
- `ond-data-source` — 'local' or 'db' (deprecated, always local now)
- `ond-widget-layout-{charId}` — Widget positions per character
- `ond-widget-cols` — Column count setting (2/3/4)
- `ond-last-character` — Last viewed character ID
- `ond-dice-force` — Dice throw force level (1-4, default 2)

### Heavy Armor AC
Heavy armor does NOT add DEX modifier. The `calcAC` useMemo must check subcategory. Subcategory strings are inconsistent — DB has "Heavy Armor" but local data may use "heavy". Always do case-insensitive matching with `.toLowerCase().includes('heavy')`.

### Spell Slot Types
Three slot systems coexist:
1. **Full casters** (Wizard, Cleric, etc.) — Standard slot progression
2. **Half casters** (Paladin, Ranger) — Half the slots, start at level 2
3. **Pact Magic** (Warlock) — Few slots, all at highest level, recharge on short rest
