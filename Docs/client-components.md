# Client Components Reference

## Navbar.jsx (~108 lines)
Top navigation bar visible on all pages.
- OND branding/logo link to home
- Navigation links: Home, Characters, Campaigns, Spells, Equipment, Homebrewer (+ Settings gear icon)
- Quick character access (last viewed character shortcut)
- Responsive layout

## Dice3D.jsx (~545 lines)
Three.js 3D dice renderer with physics simulation.
- Uses Cannon.js for realistic physics (gravity, bounce, friction)
- Supports: d4, d6, d8, d10, d12, d20, d100 (percentile)
- Theme-aware materials (colors from DiceContext)
- Resolves a Promise with the roll result once die settles
- Canvas renders in a fixed overlay
- Multiple dice can roll simultaneously
- **Force levels (1-4)** control physics behavior per roll:
  - Linear/angular damping (how fast dice stop)
  - Restitution (bounciness on contact)
  - Velocity and height multipliers (throw intensity)

### Key Functions:
- `makeDieGeo(type)` — Creates Three.js geometry for each die type
- `makeDieBody(geo, type, force)` — Creates Cannon.js physics body with force-adjusted damping
- `makeDieMaterial(theme)` — Creates themed material from DiceContext theme
- `addFaceNumbers(mesh, geo, sides, theme)` — Adds number sprites to die faces

### Props:
- `diceToRoll` — Array of `{die, sides}` objects
- `onSettled(results)` — Callback when all dice stop moving
- `fading` — Boolean to trigger fade-out animation
- `force` — Force level 1-4 (from DiceContext global setting)
- `diceTheme` — Theme object for die appearance

## DiceRoller.jsx (~293 lines)
Manual dice roller UI panel.
- Dice type buttons (d4, d6, d8, d10, d12, d20, d100)
- Left-click to add die, right-click to remove, double-click to quick-roll
- Quantity display with +/- buttons per die type
- Roll result display with max/min highlighting
- **Global force selector** — 4 presets (Gentle/Normal/Strong/Mighty) with distinct icons, colors, and glow effects
- Force setting is read from/written to DiceContext (applies to ALL rolls app-wide, not just manual rolls)
- Force persists to localStorage across sessions

## ImageCropper.jsx (~174 lines)
Canvas-based image cropper for character portraits.
- Full-screen modal overlay
- Zoom slider (1x to 3x)
- Click and drag to pan
- 256x256 output size (configurable via `outputSize` prop)
- Corner guide marks for crop area
- Returns cropped image as Blob via `onCrop` callback

### Props:
- `src` — Image source URL or data URI
- `onCrop(blob)` — Callback with cropped image Blob
- `onCancel` — Cancel callback
- `outputSize` — Output dimensions (default 256)

## NumInput.jsx (~24 lines)
Number input that prevents the deselection bug.
- Stores raw text in local state while focused
- Only parses/clamps value on blur — empty/NaN becomes `0` (via `Number.isNaN`), **not** a falsy fallback to `min`, so `0` and negatives are valid entries (supports the misc-bonus boxes with negative `min`)
- Prevents React re-render from resetting cursor position

### Props:
- `value` — Controlled number value
- `onChange(number)` — Callback with parsed number
- `min`, `max` — Clamp bounds
- All other props passed through to `<input>`

### Why This Exists:
Standard controlled number inputs with `parseInt(e.target.value)` in onChange cause the input to lose focus on every keystroke because the parsed value differs from the raw text, triggering a re-render that replaces the input value.

## DebouncedTextarea.jsx (~15 lines)
Textarea that only fires onChange on blur.
- Stores text in local state while focused
- Syncs parent value when not focused
- Prevents unnecessary re-renders during typing

### Props:
- `value` — Controlled string value
- `onChange(string)` — Callback fired on blur with current text
- All other props passed through to `<textarea>`

## Tip.jsx (~50 lines)
Hover tooltip wrapper component.
- Wraps children, shows tooltip on hover; content passed as the `text` prop
- Supports `pre-line` white-space for multiline tooltips
- **The box is `position: fixed`, not `absolute`** — placed from the trigger's
  `getBoundingClientRect()` on `mouseenter`/`focus`. An absolutely-positioned box is clipped by
  any ancestor whose overflow isn't `visible` (the character sheet root sets
  `overflowX: 'hidden'`, which makes CSS compute the other axis to `auto`), and `z-index`
  can't defeat clipping. `fixed` escapes every ancestor. Don't revert it to `absolute`.
- Placed **above** when `r.top > 160`, otherwise **flipped below**; clamps horizontally
  so it stays on screen near the viewport edges. `data-place="above|below"` drives the
  transform and which way the arrow points.
- Hooks (`useRef`/`useState`/`useCallback`/`useEffect`) are declared **before** the `if (!text)`
  early return, per the hooks-order rule.
- Because the box is `fixed` it does not travel with the trigger, so a `scroll` (capture-phase,
  to catch nested scrollers) or `resize` listener clears the position — the tooltip vanishes
  rather than floating over unrelated content, and the next hover re-measures.
- `width: max-content` on `.ond-tip-box` is load-bearing: a `fixed` box with `left` set would
  otherwise shrink-to-fit against `viewport - left`, collapsing right-edge tooltips to
  `min-width`.

### Props:
- `text` — Tooltip content string
- `children` — Elements to wrap

## Field.jsx (~8 lines)
Form field wrapper with consistent label styling.
- Renders a label above the children
- Used in CharacterCreate and CharacterEdit forms

### Props:
- `label` — Field label text
- `children` — Form input elements
