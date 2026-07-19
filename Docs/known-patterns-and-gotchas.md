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
const { char, setChar, updateField, updateHp } = useCharacter(id);
// Always spread to create new object
setChar({ ...char, currentHp: newHp });
// Or use updateField/updateHp for specific updates
// Never mutate char directly
```

### 3D Dice Rolls
```js
const { rollDice3D, diceForce, setDiceForce } = useDice();
const { results, total } = await rollDice3D('2d6+3', 'Greatsword — Damage');
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

### CharacterEdit Server + Local Fallback
`CharacterEdit.jsx` is server-oriented (`fetch` on load, `PUT` on save against `/api/characters/:id`) but falls back to `localStorage` (`ond-char-{id}`): load tries the server then the local copy; local-only characters (id prefixed `local-`) read straight from localStorage. Save always writes the merged local copy first — `{ ...char, ...body }`, mirroring the server's `{...existing, ...body}` merge so fields the edit form doesn't manage (spell slots, conditions, etc.) survive — then PUTs for non-local ids, tolerating an offline server. **Rule:** when a page can operate on `local-`prefixed characters, always provide a localStorage path; never assume a server file exists. (Earlier this page had no fallback and 404'd on local-only characters.) Separately, `useCharacterSync`'s server-sync is disabled app-wide (`CharacterSheet` calls it with `syncEnabled: false`), yet the hook's `updateHp()` still PATCHes `/api/characters/:id/hp` unconditionally.

### Express JSON Limit
`express.json({ limit: '10mb' })` is required because character data includes base64 portrait images. Default 100KB limit causes `PayloadTooLargeError`.

### Git Safe Directory
Windows users cloning via `start.bat` may hit "dubious ownership" errors. The auto-update endpoint adds `safe.directory` config before any git operations.

### Vite Proxy
In dev mode, the Vite dev server proxies `/api/*` requests to `localhost:3001`. In production, Express serves both the API and the built client from `client/dist/`.

### localStorage Keys
- `ond-char-{id}` — Character data
- `ond-char-index` — Character ID index. Written by `createCharacter`'s local fallback, but the character list is actually rebuilt by scanning `ond-char-` prefixed keys, so this index is effectively **write-only / dead** — don't rely on it.
- `ond-homebrew` — Array of homebrew items
- `ond-theme` — Theme state object `{ preset, overrides, activeCustomName }`
- `ond-data-source` — 'local' or 'db' (defaults to local; controls spells/equipment data source)
- `ond-custom-presets` — Custom UI theme presets
- `ond-dice-theme` — Dice theme selection and settings
- `ond-custom-dice-presets` — Custom dice theme presets
- `ond-layout-{charId}` — Widget layout/positions, per character
- `ond-columns-{charId}` — Column count, per character (default 2)
- `ond-sidebar-{charId}` — Side-panel width in px, per character (default 340)
- `ond-tab-{charId}` — Last active character-sheet tab, per character
- `ond-last-character` — Last viewed character ID
- `ond-dice-force` — Dice throw force level (1-4, default 2)
- `ond-db-uri` — Cached MongoDB URI shown in the Settings UI
- `ond-player-name` — Player display name used for campaign join / roll-log attribution

### Heavy Armor AC
Heavy armor does NOT add DEX modifier. The `calcAC` useMemo must check subcategory. Subcategory strings are inconsistent — DB has "Heavy Armor" but local data may use "heavy". Always do case-insensitive matching with `.toLowerCase().includes('heavy')`.

### `char.features` Is Not Populated for Most Classes
**Gotcha:** At creation, `CharacterCreate` only sets `char.features` when the character has a **fighting style** (see the `...(fightingStyle && { features: [...] })` spread). A fresh Barbarian/Wizard/Cleric/Rogue/**level-1 Paladin** has **no `features` array at all** — which is why class features (e.g. Lay on Hands) historically showed up nowhere.

**Rule:** For display, derive class features from class data by level (`CLASS_LEVELS[class]` for names, `CLASSES[class].features` + `SUBCLASS_FEATURES[subclass]` for descriptions) rather than trusting `char.features`. The Actions tab's "Class Features & Actions" list does exactly this and merges any stored `char.features` extras on top. Filter bookkeeping rows with the `isNoise()` predicate: `ASI`, `Fighting Style`, and generic `<X> Feature` subclass placeholders (`Oath Feature`, `Domain Feature`, etc.), which are replaced by real `SUBCLASS_FEATURES` entries.

### Feat Effects on the Character Sheet
Feats affect the sheet through two channels:
1. **Additive derived-stat bonuses** — data-driven via the `FEAT_EFFECTS` table in `dndConstants.js` (e.g. `Alert: { initiative: 5 }`, `Observant: { passivePerception: 5, passiveInvestigation: 5 }`). `CharacterSheet` sums them in the `featEffects` useMemo (keyed on the normalized `featSet`) and adds them into `initiative` / `passivePerception` / `passiveInvestigation`.
2. **Context-conditional effects** — evaluated inline where the sheet already knows the condition: `Medium Armor Master` raises the medium-armor DEX cap 2→3 in `calcAC` (only when medium armor is equipped; `featSet` is a `calcAC` dependency), and `Tavern Brawler` makes the Actions-tab Unarmed Strike die 1d4.

**Rules:**
- Only add a feat to `FEAT_EFFECTS` if its bonus is **unconditional** AND the target stat is recomputed from scratch each render.
- Do **not** apply bonuses to **stored** stats like `char.speed` or `char.maxHp` (Mobile, Tough) at render — those are persisted/editable and a display-time bonus would double-count; handle them in the level-up/edit flow instead.
- Ability-score feat bonuses (`+1 STR`, etc.) are applied to `abilityScores` at character creation, so never repeat them.
- Most feats (advantage, resistances, reactions, proficiency grants, situational combat riders) have **no flat sheet number** — do not invent one; applying a conditional bonus unconditionally is a correctness bug.
- Always read feat names through the normalized `featSet` (handles `string | {name}` entries from old saves).

### Action Side Panel — Guard Optional Fields
The `type: 'action'` side panel is reused for weapon-style actions **and** for class features (which have no `toHit`/`proficient`). The stat grid must guard those fields (`sidePanel.data.toHit != null && {...}`) and filter with `.filter(i => i && i.value)`, otherwise features render "To Hit: +undefined" or a spurious "Proficient: No".

### Multiclassing
Multiclass characters carry a canonical `char.classes = [{class, subclass, level}]` (per-class levels); `char.class/subclass` = primary (classes[0]) and `char.level` = **total** level. Single-class characters have **no** `classes` array.

**Rules:**
- Never read `char.class`/`char.level` directly for class-derived math — go through `getCharClasses(char)` (from `utils/multiclass.js`), which synthesizes a one-element array for single-class characters. This keeps existing single-class saves working and all code uniform.
- **Spell slots:** use `getMulticlassSpellSlots(getCharClasses(char))` → `{ standard, pact }`. A single standard caster uses its own class table (a pure Paladin 5 has 2nd-level slots — the combined formula would be wrong); 2+ casters use the combined-caster-level multiclass table. Warlock Pact Magic is **always** separate (`pactData`), and can coexist with standard slots — render both blocks independently, never `spellSlotData.pact`.
- **Extra Attack does not stack** across classes — use `getMulticlassExtraAttacks` (max, not sum).
- **Hit dice** are per-class pools (`getHitDicePools` / `formatHitDice`), not a single `NdX` string. `char.hitDice` is a display fallback only.
- After any level change, run `syncPrimaryFromClasses(classes)` to keep `class/subclass/level/proficiencyBonus` consistent with the `classes` array. Proficiency bonus is based on **total** level.
- The sheet's **Level Up modal** advances an existing class or adds a new one (enforcing `MULTICLASS_REQS`, applying `MULTICLASS_PROFICIENCIES`), and **prompts for a subclass** when the advanced/added class hits its `subclassLevel` without one. CharacterEdit's simple "Lv Up" advances the **primary** class only when multiclass, and disables the raw total-level input to avoid desyncing from `classes`.
- **Progression tab** renders one `renderClassSection(ctx)` per class from `charClasses`. When multiclass, level-choice storage (`char.levelChoices`) and expand-state keys are **namespaced by class** (`${cls}:${level}` / `${cls}-...`) so two classes never collide; `getSelected` scopes its scan to the current class. Subclass picks update the matching entry in `char.classes` via `syncPrimaryFromClasses`; fighting styles are stored per-class as `Fighting Style (Cls): X` features. Single-class characters keep the original un-namespaced keys — do not change that or existing saves lose their choices.

### Spell Slot Types
Three slot systems coexist:
1. **Full casters** (Wizard, Cleric, etc.) — Standard slot progression
2. **Half casters** (Paladin, Ranger) — Half the slots, start at level 2
3. **Pact Magic** (Warlock) — Few slots, all at highest level, recharge on short rest
