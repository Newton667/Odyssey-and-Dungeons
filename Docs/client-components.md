# Client Components Reference

## Navbar.jsx (~108 lines)
Top navigation bar visible on all pages.
- OND branding/logo link to home
- Navigation links: Characters, Spells, Equipment, Homebrewer, Campaigns, Settings
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

## DiceRoller.jsx (~260 lines)
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

## NumInput.jsx (~23 lines)
Number input that prevents the deselection bug.
- Stores raw text in local state while focused
- Only parses/clamps value on blur
- Prevents React re-render from resetting cursor position

### Props:
- `value` — Controlled number value
- `onChange(number)` — Callback with parsed number
- `min`, `max` — Clamp bounds
- All other props passed through to `<input>`

### Why This Exists:
Standard controlled number inputs with `parseInt(e.target.value)` in onChange cause the input to lose focus on every keystroke because the parsed value differs from the raw text, triggering a re-render that replaces the input value.

## DebouncedTextarea.jsx (~16 lines)
Textarea that only fires onChange on blur.
- Stores text in local state while focused
- Syncs parent value when not focused
- Prevents unnecessary re-renders during typing

### Props:
- `value` — Controlled string value
- `onChange(string)` — Callback fired on blur with current text
- All other props passed through to `<textarea>`

## Tip.jsx (~10 lines)
Hover tooltip wrapper component.
- Wraps children, shows tooltip on hover
- Uses CSS class `.ond-tip` for positioning
- Tooltip content passed as `text` prop
- Supports `pre-line` white-space for multiline tooltips

### Props:
- `text` — Tooltip content string
- `children` — Elements to wrap

## Field.jsx (~9 lines)
Form field wrapper with consistent label styling.
- Renders a label above the children
- Used in CharacterCreate and CharacterEdit forms

### Props:
- `label` — Field label text
- `children` — Form input elements
