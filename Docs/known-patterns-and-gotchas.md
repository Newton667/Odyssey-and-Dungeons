# Known Patterns and Gotchas


## A two-key alias makes a control inert unless it writes BOTH keys

Homebrew attunement is stored under two names: `attunement` (canonical, matching
`equipment.json`) and `requiresAttunement` (legacy, still written so a downgrade doesn't
lose the flag). `pruneToType` resolves them as `attunement ?? requiresAttunement`, and
`normalizeHomebrewItem` puts `attunement` on **every** record.

That combination is a trap. A checkbox bound to `requiresAttunement` alone works on a
brand-new item (no `attunement` key yet, so the `??` falls through) and is **completely
inert** on every subsequent edit, because `startEdit` spreads a normalized item whose stale
`attunement` always wins. It fails in both directions — unticking can't clear it, ticking
can't set it — and `??` only falls through on `null`/`undefined`, so `false` still wins.

Use `attunementChecked(form)` / `setAttunement(f, on)` from `utils/homebrew.js`; they read
the canonical key first and write both. The general rule: **when a stored value has an alias,
the UI must write every key the resolver reads** — testing only the both-agree case will not
catch this, so assert the disagreement case explicitly.

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

### localStorage is authoritative — the server never overwrites a local character
`localStorage` (`ond-char-{id}`) holds the only complete copy of a character. The server is a **write-only backup** plus a **discovery source** for characters this browser has never seen. The policy lives in one place, `utils/charSync.js`'s `resolveLoadAction(local, server)` → `'adopt' | 'push' | 'keep' | 'none'`, and both `useCharacter`'s load effect and `useCharacterList`'s merge loop call it.

- `'adopt'` (write the server copy to local) is reachable **only when there is no local copy at all**.
- If the local copy exists, it wins — even when the server's `updatedAt` is newer, and even when the local record has **no** `updatedAt`.
- `'push'` sends local → server when local is newer (a no-op while `syncEnabled` is false).

This used to be a timestamp race, and it silently destroyed data: the sheet writes fields the editor's `PUT` body never carried, the server stamped a fresh `updatedAt` on every save *and* every HP PATCH, and the next load replaced localStorage with the lossy server copy. Symptoms were ammo refilling itself and gear unequipping after a level-up.

`CharacterEdit.jsx` still loads server-then-local and tolerates an offline server; local-only ids (prefixed `local-`) read straight from localStorage. Its save writes the merged local copy `{ ...char, ...body, updatedAt }` **and PUTs that same merged object** — never the bare form body, or the backup goes lossy again. `updateHp()` deliberately still PATCHes `/api/characters/:id/hp` unconditionally: `CampaignView.jsx` reads player HP from the server, and with the read-side overwrite gone the `updatedAt` bump is harmless.

**Rules:** never replace the local document wholesale from any remote source. When a page can operate on `local-`prefixed characters, always provide a localStorage path; never assume a server file exists.

### Sheet-owned fields live only in localStorage
These are written by the character sheet and are **not** part of the editor's form, so they exist only in the local document: `equippedItems`, `ammo`, `usedSpellSlots`, `featureUses`, `activeBuffs`, `activeConditions`, `hitDiceRemaining`, `temporaryHp`, death saves, `attunedItems`, `classes` (multiclass levels) and `levelChoices`.

**Rule:** any code that writes a whole character object must start from the current local copy and spread over it. A payload built only from form fields will drop every field in this list. This is why the editor PUTs `merged`, not `body`.

### Weapon damage strings carry the magic bonus twice
`equipment.json` stores a `+1 Longsword` as `{damage: "1d8+1", bonus: 1}` — the modifier is in **both** fields (65 weapon entries have a flat modifier baked into `damage`). The sheet already folds `wpn.bonus` into its damage modifier, so rolling `damage` raw counts it twice.

**Rule:** whenever `wpn.bonus` is added separately, run the damage string through `weaponDamageDice()` (or build the whole roll with `weaponDamageFormula(damage, dmgBonus, riderSuffix)`) from `dndHelpers.js`. Same family as the versatile-parsing note below. Two more traps in that helper:
- The strip regex must **not** eat a second dice group — `Flame Tongue` is `"1d8 + 2d6 fire"`, `Oathbow` `"1d8 + 3d6"`, `Frost Brand` `"1d8 + 1d6 cold"`. The lookahead is `(?![\d\s]*d)`, not a plain `(?!d)`, or `+ 12d6` gets partially stripped.
- Truthiness is not a damage check. `Net`'s damage is the em dash `'—'`, which is truthy — guard on "has dice **or** has a digit", or the Net grows a dead damage button.
- The button's **label must render the same sanitized string it rolls**, or the text and the result disagree.
- Read-time sanitising is deliberate: do not "fix" `equipment.json`, or it desyncs from `server/seed-magic-items.js`.

### One roll at a time — `rollDice3D` can return `null`
`DiceContext` holds the pending `resolve` and the roll's static bonus in single-slot refs, and a new roll clears the previous roll's delivery timer. A second roll started mid-flight therefore used to swallow the first roll's result, leaving a stale number on the button.

`rollDice3D` now guards on a `rollingRef` and returns `Promise.resolve(null)` while dice are in the air. **Rule:** every caller must guard — `const r = await rollDice3D(...); if (!r) return;` — before touching the result. Never `const { total } = await rollDice3D(...)`; that throws `TypeError: Cannot destructure property … of 'null'`. There are 12 call sites across `CharacterSheet`, `DiceRoller`, `Equipment`, `Homebrew` and `Spells`; grep for `= await rollDice3D` after any change. Callers with their own local `rolling` state must also clear it on the null path, or their button latches. Note the build does **not** catch this class of error.

The guard needs a **watchdog** to be safe. `rollingRef` is cleared inside `onDiceSettled`, and `Dice3D` arms its own 6 s safety timeout — but only *after* the `THREE.WebGLRenderer` is constructed. If that setup throws or bails (no canvas, WebGL unavailable, context lost on a GPU switch), `onDiceSettled` never fires, the guard is never released, and **every subsequent roll in the session returns `null`** until a page reload. `DiceContext` therefore arms a 10 s watchdog alongside the promise (comfortably past Dice3D's 6 s) that releases the guard and resolves `null`, cleared at the top of `onDiceSettled`. **Rule:** any code path that sets `rollingRef.current = true` must have a guaranteed release — don't rely on the renderer's own timeout.

### `CLASSES[cls].hitDice` is a bare `'d10'` — always add an explicit count
Hit dice are stored **without** a leading count: `hitDice: 'd10'`, and `HIT_DICE[cls]` is the same shape. A formula built by interpolating one directly (`` rollDice3D(hd) ``) is not a valid dice string.

This silently produced the wrong result rather than an error: `parseDiceFormula`'s dice regex required a digit before the `d`, so `'d10'` matched no dice group, fell through to the bare-integer branch, and the `10` was summed as a **flat modifier**. The level-up "Roll for HP" button therefore granted the maximum die every time and threw no dice at all — build clean, tests green, and in the player's favour, so nobody reported it.

Two defences, both in place:
- **Call sites interpolate a count** — `` `1${hd}` `` — as the short-rest hit-die spend has always done. Match that when adding a new one.
- **The parser tolerates a countless die** — the regex is `/(\d*)d(\d+)/g` with `count = Number(m[1] || 1)`, so `'d10'` is one d10. The strip pattern is widened to match (`/\d*d\d+/g`), or the leftover digits would be read as a modifier.

**Rule:** never pass a raw `hitDice`/`HIT_DICE` value to anything that parses dice. `weaponDamageDice` still uses the narrower `/\d+d\d+/` — a hand-edited `damage: 'd6'` would fall to its flat branch and drop the die; widen it if that ever becomes reachable.

### Grid tracks must be `minmax(0, 1fr)`
A bare `1fr` is `minmax(auto, 1fr)`, which **cannot shrink below its content** — one long feature description, spell name or homebrew item name then pushes the whole page wider than the viewport. Use `minmax(0, 1fr)` for every track (`repeat(6, minmax(0, 1fr))`, `'minmax(0, 2fr) minmax(0, 1fr) …'`), and add `minWidth: 0` to grid/flex children that hold long text — especially cells containing a `<select>`, which carries its own intrinsic width. `body { overflow-wrap: break-word }` and `.page { overflow-x: hidden }` back this up in `index.css`; `.wrap-text` is the opt-in for aggressive breaking. Do **not** apply a blanket `overflow-wrap: anywhere` — it breaks words mid-character even when the line has room. Check: `rg -n "gridTemplateColumns" client/src/pages/CharacterSheet.jsx | rg -v minmax` should return nothing.

### Horizontal overflow containment clips — it does not make things fit
Several containers set `overflow-x: hidden` to stop long text widening the page — `.page`, and the character sheet's own `st.sheet`. That has a cost: anything that still doesn't fit is **silently cut off** instead of producing a scrollbar. A truncated label is therefore a *layout* bug, not a text bug — the element needs room, not a shorter string.

Know which container is actually clipping. The sheet's header is clipped by **`st.sheet`'s** `overflowX: 'hidden'` (`CharacterSheet.jsx:847`), not by `.page`. The navbar is a sibling of `<Routes>` in `App.jsx` and is **not inside `.page` at all** — it overflowed the *document* instead.

This bit the character sheet header: the action row (Heroic Inspiration / Short Rest / Long Rest) exceeded the width and the labels were sliced off. The fix was to let the row move, not to shrink it — `st.header` gained `flexWrap: 'wrap'` so the buttons drop to their own line, and each button got `whiteSpace: 'nowrap'` so its label never breaks.

The navbar had the same failure (`⚙ Settings` clipped, document overflowing 18px). It now scales `padding`/`gap`/link-padding with `clamp(min, Nvw, max)` sized to resolve to the original pixel value at 1280px, keeps `.nav-link { white-space: nowrap }`, pins Settings with `flexShrink: 0`, lets `.nav-links` shrink and scroll (`minWidth: 0; overflow-x: auto`, scrollbar hidden) so its `nowrap` children can never spill out and overlap, and drops both the wordmark and the conditional **"My Sheet"** link below 1250px.

**This clips popovers too, not just labels.** A `position: absolute` tooltip/dropdown is clipped by any ancestor whose overflow is not `visible`, and `z-index` cannot rescue it — stacking order does not defeat clipping. Worse, setting `overflow-x: hidden` alone makes CSS compute the *other* axis to `auto`, so the sheet's horizontal containment silently started clipping vertically as well and cropped every tooltip inside it. `components/Tip.jsx` therefore renders its box `position: fixed`, placed from the trigger's `getBoundingClientRect()` on hover (flipping below when there is no room above, and clamping horizontally to stay on screen). **Rule:** any overlay that must escape a scroll/overflow container has to be `fixed` (or portalled) — never `absolute` inside it.

**Count the conditional links.** `Navbar` renders a 7th "My Sheet" link whenever `localStorage['ond-last-character']` exists *and* you are not currently on a sheet — which is every returning user on every other page. A width budget measured on a character sheet (where it is suppressed) or with a fresh profile will pass and still overlap in real use. That is exactly how the first attempt at this fix shipped an overlap at 900px and 1101px.

**Rules:**
- A fixed-height, non-wrapping bar (`height: 72px`, no `flexWrap`) will clip rather than reflow. Give it either `flexWrap` or viewport-scaled spacing.
- `whiteSpace: 'nowrap'` on a label plus `flexWrap` on its container is the pair that works; `nowrap` alone just moves the overflow.
- `minWidth: 0` lets a flex child shrink **below its content** — good for a text block that should wrap, wrong for a row of buttons, where it produces overlap.
- Verify by measuring **and** by eye, in the state a real user is in (conditional links present, on a page where they render). `document.body.scrollWidth` must equal `document.documentElement.clientWidth`, and no element's `getBoundingClientRect().right` may exceed it. Check the breakpoint boundaries too — the width *just above* a `max-width` media query is the worst case, since everything it hides is back.
- **Rect maths alone gives false positives** once a scroll container is involved: a child scrolled out of an `overflow-x: auto` row still reports an unclipped rect that appears to overlap its neighbours, while painting nothing. Confirm with a screenshot before believing an overlap.

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
- Ability-score feat bonuses (`+1 STR`, etc.) are applied to `abilityScores` **in the creator** via `FEAT_ABILITY_BONUSES` (fixed abilities apply automatically; choice/half-feats like Resilient/Observant show a picker). They flow into every derived stat from there, so never add them again at render. The **editor** does NOT auto-apply them (its scores are manually edited and a saved character already includes the bonus) — it shows a reminder note. Same split for `FEAT_HP_PER_LEVEL` (Tough) and Resilient's save proficiency.
- Most feats (advantage, resistances, reactions, proficiency grants, situational combat riders) have **no flat sheet number** — do not invent one; applying a conditional bonus unconditionally is a correctness bug.
- Always read feat names through the normalized `featSet` (handles `string | {name}` entries from old saves).
- **A feat in the `FEATS` table is descriptive-only until it is explicitly wired.** Adding a feat's text does not make its mechanics happen. The wiring maps: `FEAT_EFFECTS` (unconditional derived-stat numbers), `FEAT_ABILITY_BONUSES` (+1 ability, fixed or choice), `FEAT_HP_PER_LEVEL` (Tough), `FEAT_PROFICIENCY_GRANTS` (Skilled → skill/tool picker), `MAGIC_INITIATE_CLASSES` (which spell lists Magic Initiate may draw from, **per ruleset**) plus the per-character `char.featSpellLists` that records the choice. A feat not in any of these grants nothing mechanically — which is correct for the many conditional/situational feats (advantage, reactions, riders) that have no flat sheet number, but was a bug for Skilled/half-feats which do. Armor/weapon-proficiency feats (Heavily/Lightly/Moderately Armored, Weapon Master) are intentionally left descriptive because the character model has no armor/weapon-proficiency field and the sheet doesn't enforce it — they still grant their `+1` via `FEAT_ABILITY_BONUSES`.

### Feat-granted spell lists (`char.featSpellLists`)
Magic Initiate grants spells from **another class's** list, so the character must record which list they chose or every spell browser filters them out. That choice lives in `char.featSpellLists`, shaped `{ 'Magic Initiate': ['Cleric'] }` — **array-valued**, because the 2024 feat is repeatable and this avoids a later data migration. The allowed classes per ruleset are in `MAGIC_INITIATE_CLASSES` (`dndConstants.js`): 2014 = Bard/Cleric/Druid/Sorcerer/Warlock/Wizard, 2024 = Cleric/Druid/Wizard. Never hardcode either list — route through `char.ruleset` / `form.ruleset`.

**Rules:**
- Read through `allowedSpellClasses(char)` / `spellMatchesClasses(spell, allowed)` (`utils/spellAccess.js`), which union all of the character's classes (via `getCharClasses`, so multiclass works) with the feat lists. Never filter a spell browser on `char.class` alone.
- Normalise values with `[].concat(v)` at every read site — old data may hold a bare string.
- The field is only persisted if it is in the editor's **form object**; the form *is* the save body, so a field missing there is silently dropped on every save.
- Non-casters must not be short-circuited out of the spell list when a feat list is present — a Fighter or level-1 Paladin is exactly the character this serves.
- Paladins and Rangers still have no cantrips of their own; the feat's `+2 cantrips / +1 spell` cap on the sheet is the only reason a Paladin has any.

### Normalizing feat names — use `normalizeFeatNames`
`dndHelpers.normalizeFeatNames(feats)` returns names only, handling the `string | {name, prereq, desc}` mix from old saves and dropping nulls. Use it before any `.includes('Feat Name')` test — a bare `includes` silently fails on the object form, which shows up as a UI control that never appears. (Components still carry older inline copies of this normalisation; prefer the helper in new code.)

### `NumInput` accepts 0 and negatives — never fall back on falsy
`NumInput` (used for every numeric field) commits on blur. Parsing must treat **empty/NaN** as the "no value" case, not falsy — `parseInt('0')` is `0`, which is falsy, so `parseInt(raw) || min` wrongly snaps a legitimate `0` (or a cleared field) to `min`. With the misc-bonus boxes (`min: -10`/`-20`) that surfaced as every score dropping by 10 and the field refusing to hold `0`. Correct pattern: `let v = parseInt(raw, 10); if (Number.isNaN(v)) v = 0; then clamp to [min, max]`. Any new min/max defaulting must key off `Number.isNaN`, not truthiness.

### AC is auto-recomputed — use `acBonus` / `acOverride`, not `armorClass`
The sheet's `calcAC` memo recomputes AC from equipped armor + DEX every render and writes it back to `char.armorClass` via a `useEffect`. So **directly editing `char.armorClass` does nothing** — it's overwritten on the next load. To adjust AC, use `char.acBonus` (a misc modifier added to the calc) or `char.acOverride` (a fixed value that short-circuits the calc when non-null/non-empty). Both are set in the editor's Combat section. Same idea applies to any future "stored" stat the sheet derives — add a bonus/override field rather than expecting a plain edit to persist.

### Effective ability scores = base + `abilityBonuses`
The sheet and editor read ability scores through an effective `scores` object = `char.abilityScores[ab] + char.abilityBonuses[ab]`. `abilityScores` is the **base** (what the ability-entry UI and ASI level-ups write); `abilityBonuses` is a separate per-ability misc layer (items/homebrew). Keep them separate so switching entry method or applying an ASI doesn't clobber the bonus, and so nothing double-counts. `char.initiativeBonus` is the analogous misc layer for initiative.

### Ruleset (2014/2024) must be threaded through spell math in three places
Spell limits live in **three parallel spots** that all take a `ruleset` argument and must stay in sync: `maxSpellLevel` and `getSpellInfo` (in `dndHelpers.js`, used by the **creator**), and `getSpellLimits` (local to `CharacterEdit.jsx`, used by the **editor**). The sheet derives its own limits inline (search `PREPARED_HALF`/`rangerPrepared2024` in `CharacterSheet.jsx`) and reads slots via ruleset-aware `getSpellSlots`/`getMulticlassSpellSlots`. The 2024 differences: **Paladin & Ranger gain Spellcasting at level 1** (2014 = level 2 — don't `return null` below level 2 when `ruleset === '2024'`), and **2024 Ranger is a prepared caster** (WIS + ½ level) instead of known. Paladins/Rangers have **no cantrips** in either edition (no `CANTRIPS_KNOWN` entry) — that's correct, not a gap. If you change one copy, change all of them, or "switching ruleset" silently fails to propagate.

### Versatile weapons — two grips, two rolls
A versatile weapon stores its one-handed die in `damage` (e.g. `1d8`) and its two-handed die inside a property string, `"versatile (1d10)"` (magic weapons may read `"versatile (1d10+1)"` — parse only the `\d+d\d+`, the `+N` is already in `wpn.bonus`). The sheet renders both a 1H and a 2H damage button. Fighting-style riders are grip-specific: **Great Weapon Fighting** reroll applies to the two-handed grip only (and to pure two-handed weapons), **Dueling** to the one-handed grip only — so the 2H roll's damage bonus drops the Dueling +2.

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

### Fighting Styles
`CharacterSheet` reads the character's fighting styles from `char.fightingStyle` (single-class) **and** from features named `Fighting Style (Cls): X` (multiclass) into the `fightingStyles` set. Combat effects: Archery (+2 ranged hit), Dueling (+2 one-handed melee damage), Defense (+1 AC in armor, in `calcAC`), Great Weapon Fighting (reroll damage dice ≤2 for two-handed/versatile melee), Two-Weapon Fighting (light melee — the app already adds the ability mod to all weapon damage, so this is a badge only). **GWF reroll gotcha:** it's applied numerically in `doRollWithResult` via the `rerollLow` option (post-processing `result.results`), not in the 3D physics — the reported total reflects the reroll but the settled 3D die faces show the original roll.

### Ruleset (2014 / 2024)
Characters carry a `ruleset` field (`'2014'` default, or `'2024'`). Class-derived data must flow through the ruleset-aware helpers so revised-rules characters compute correctly: use `getClassLevels(cls, ruleset)` (not `CLASS_LEVELS[cls]` directly) for features/progression, `getSubclassLevel(cls, ruleset)` (not `CLASSES[cls].subclassLevel`) for when a subclass unlocks, and pass `ruleset` to `getSpellSlots(cls, level, ruleset)` / `getMulticlassSpellSlots(classes, ruleset)`. 2024 level-1 additions live in the `RULESET_2024_ADD` table (classData); descriptions for the new feature names live in `featureDescriptions.js`. Current 2024 coverage: Weapon Mastery at L1 (Barbarian/Fighter/Monk/Paladin/Ranger/Rogue), Spellcasting at L1 (Paladin/Ranger with L1 slots), Divine Order/Primal Order/Innate Sorcery/Eldritch Invocations@1/Ritual Adept, and subclass choice at level 3 for all classes. Extend `RULESET_2024_ADD` (and `RULESET_2024_ADD` descriptions) to add more; keep 2014 behavior untouched and write feature text in the app's own words.

**Weapon Mastery is 2024-only and the gate belongs on the consumer.** The Actions-row mastery badge checks `mastery && WEAPON_MASTERY_CLASSES[char.class] && char.ruleset === '2024'`; without that last term a **2014** Fighter also saw the badge. The Homebrewer itself is deliberately **not** ruleset-aware — it has no character in context, `ond-homebrew` is global across every character on the browser, and the same custom weapon may be used by a 2014 and a 2024 character at the same table. Homebrew weapons therefore always offer the mastery field; the consumer decides whether to honour it.

### `btoa`/`atob` are Latin-1 — never base64 user text directly
`btoa` throws `InvalidCharacterError` on any codepoint above 255, and `atob` returns Latin-1 code units. The Homebrewer's "Copy Share Code" was `btoa(JSON.stringify(data))` with no `try/catch`, so it threw inside the `onClick` and **did nothing at all** for any spell whose description contained an em dash, a curly quote, a bullet or an ellipsis — which is exactly what a pasted description contains. Use `encodeShareCode` / `decodeShareCode` in `utils/homebrew.js`.

**The decode order is load-bearing: UTF-8 first, Latin-1 second.** A legacy Latin-1 code containing e.g. `é` (0xE9) is a lone high byte, which `TextDecoder('utf-8', { fatal: true })` rejects, so it correctly falls through to `JSON.parse(bin)`. A pure-ASCII code decodes identically either way. **Reversing the order would silently mojibake every newly generated code.** Two tests guard this: a legacy fixture and an em-dash round trip on a *freshly generated* code.

Related: **a clipboard write is not a guarantee.** `navigator.clipboard.writeText` rejects outside a secure context (`http://` on a LAN IP is a real deployment shape here) and when permission is denied. Always give the user the text as well — the Homebrewer reveals the code in a read-only, select-on-focus textarea before it even tries the clipboard.

### Homebrew: normalise on read, and never let a normaliser run on a write path
`utils/homebrew.js` has **two** read functions and the split is a safety property:
- `readHomebrew(opts)` — normalises and **drops** records it cannot understand. For consumers only.
- `readHomebrewRaw()` — parses, coerces a non-array to `[]`, and does nothing else. For `save`, `deleteItem`, `doImport` and Duplicate **only**.

Every mutation rewrites the **whole array**, so a null-dropping read on a write path is a silent delete: saving or deleting one item would erase every record with an unrecognised `type` or a non-string `name` — exactly the records a hand-edited or badly imported share code creates. The correct statement of the policy is *"normalise on read; on write, rewrite only the record the user touched and pass everything else through untouched"*. An unrecognised record is hidden from every list and left on disk; **there is no repair UI, and it should not be "helpfully" surfaced or cleaned**.

The array-level mutations (`upsertHomebrewRecord`, `removeHomebrewRecord`, `appendImportedRecord`) are exported pure functions rather than inline component logic, so the preservation property can actually be asserted — this repo has no jsdom and no testing-library, and a test cannot render the page or "perform a save". `charSync.js`'s `resolveLoadAction` is the same pattern.

`requiresAttunement` is the legacy key; `attunement` (the `equipment.json` name) is canonical. `normalizeHomebrewItem` reads either and writes both, and `requiresAttunement` stays in `TYPE_FIELDS`' equipment list on purpose — `pruneToType` runs on every save, so removing it would strip the legacy key on the first re-save and break the downgrade path the alias exists to protect.

**A field rename is not a fix if nothing renders the field.** `Equipment.jsx` has two item lists and homebrew items only ever render through the thin one; canonicalising the attunement key was invisible until that block actually rendered it. Check *which* list reads a field before claiming a fix is user-visible.

### Cantrips scale by character level, with exceptions
Cantrip damage scales on the **5/11/17** tiers by **character** level, in both 2014 and 2024 (PHB p.211, Acid Splash). It is not slot-based — neither edition upcasts a cantrip with a slot, so `getUpcastDamage` correctly returns early on level 0. Use `cantripDamage(spell, char.level || 1)` (`dndHelpers.js`); `char.level` is the **total** level, kept in sync by `syncPrimaryFromClasses`.

**A blanket "any level-0 spell with dice damage scales" rule is wrong** and mis-scales at least 19 `spells.json` entries. The exclusions:
- **`CANTRIP_NO_SCALE`** — Eldritch Blast (gains *beams*: 1/2/3/4 separate attack rolls at 5/11/17, each still 1d10 — a blanket rule makes it one 4d10 hit), Magic Stone and Shillelagh (no level progression at all), Green-Flame Blade (its stored `1d8` is already the 5th-level value, so scaling runs one die high at every tier). **Booming Blade is deliberately not excluded** — its `1d8` is the movement damage and really does go 1d8/2d8/3d8/4d8.
- **`source: 'race'`** — all 15 racial pseudo-spells with level-0 damage, including the ten Dragonborn Breath Weapons, which progress 2d6/3d6/4d6/5d6 at levels **1/6/11/16**, a different tier set entirely.
- Homebrew cantrips have no `source`, so they scale by design. Corollary, accepted: because the set is name-keyed, a homebrew spell *named* "Eldritch Blast" is excluded too.

**Do not key cantrip scaling on `scaling`.** Measured in `spells.json`: `scaling` is `''` on 382 entries, absent on 68, and a dice string on 71. There is **no** `"None"` value anywhere in the file — that string is only the label of an `<option value="">` in `Spells.jsx`. The DB seeds (`server/seed-cantrips.js`) additionally write the sentinel `scaling: 'cantrip'`, which never appears in the local JSON; `Spells.jsx`'s own "+ Add Spell" form still offers it, so do not delete that option without changing the form.

### Active Weapon-Buff Spells
`SPELL_WEAPON_RIDERS` (dndConstants) maps spells like Hunter's Mark/Hex to `{ die, type }`. `char.activeBuffs` holds the currently-active ones; the Spells tab's Activate toggle spends a slot and adds the name, `doLongRest` clears them, and the Actions tab appends `+die` to weapon damage formulas and shows a badge. To add a spell, add it to `SPELL_WEAPON_RIDERS` — no other change needed.

### Spell Slot Types
Three slot systems coexist:
1. **Full casters** (Wizard, Cleric, etc.) — Standard slot progression
2. **Half casters** (Paladin, Ranger) — Half the slots, start at level 2
3. **Pact Magic** (Warlock) — Few slots, all at highest level, recharge on short rest
