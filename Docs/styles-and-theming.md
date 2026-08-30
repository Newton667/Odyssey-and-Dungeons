# Styles and Theming Reference

## index.css (~400+ lines)
Global styles with D&D dark fantasy theme.

### CSS Custom Properties (set by ThemeContext)
```css
--bg-dark          /* Main background */
--bg-gradient      /* Gradient top color */
--bg-card          /* Card/panel background */
--bg-card-hover    /* Card hover state */
--border           /* Border color */
--gold             /* Primary accent color (headings, buttons) */
--gold-light       /* Accent light variant */
--gold-dim         /* Accent muted variant */
--text             /* Main text color */
--text-dim         /* Muted text */
--accent           /* Secondary accent (links, badges) */
--surface          /* Surface background */
--nav-bg           /* Navigation bar background */
--input-bg         /* Input field background */
```

**Additional root variables (not themed, set in index.css):**
```css
--border-light     /* Lighter border variant */
--red / --red-light /* Danger/error colors */
--green / --green-light /* Success/healing colors */
--text-dark        /* Dark text color */
--hp-bar           /* HP bar fill color (green) */
--hp-low           /* HP bar low health (orange) */
--hp-crit          /* HP bar critical health (red) */
```

### Key CSS Classes

**`.cc-skill`** — Navigation tab/button with hover lift effect
```css
.cc-skill:hover { transform: translateY(-2px); }
```

**`.ond-tip`** — Tooltip wrapper
```css
.ond-tip { position: relative; }
.ond-tip:hover .ond-tip-box { display: block; }
.ond-tip-box {
  display: none; position: absolute;
  white-space: pre-line; /* supports multiline */
  z-index: 100;
}
```

**Rarity Color System (in dndConstants.js + dndHelpers.js):**
```js
// dndConstants.js
export const RARITY_COLORS = {
  common: 'var(--text-dim)',
  uncommon: '#1eff00',
  rare: '#0070ff',
  'very-rare': '#a335ee',
  legendary: '#ff8000',
  artifact: '#e6cc80'
};

// dndHelpers.js
export function rarityColor(r) { return RARITY_COLORS[r] || RARITY_COLORS.common; }

export function rarityBg(r) {
  // Returns tinted background for rarity
  // uncommon: '#1a2e1a', rare: '#1a1a3e',
  // 'very-rare': '#2e1a3e', legendary: '#3e2e0a',
  // artifact: '#3e1a0a', default: 'transparent'
}
```

### Layout containment — grid tracks, `minWidth: 0`, and word wrap
Long text (a homebrew item name, a feature description, a URL in Notes) used to stretch the character sheet wider than the viewport. The fix is structural, not per-tab:

- **Every grid track uses `minmax(0, 1fr)`, never a bare `1fr`.** A bare `1fr` means `minmax(auto, 1fr)`, which cannot shrink below its content, so one long string widens the whole page. All 11 grid templates in `CharacterSheet.jsx` were converted: `repeat(6, minmax(0, 1fr))` (ability bar), `${sidebarWidth}px minmax(0, 1fr) …` (main layout), `'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.5fr)'` (action/spell tables), `'minmax(0, 1fr) minmax(0, 1fr)'` (side panels). Check with `rg -n "gridTemplateColumns" client/src/pages/CharacterSheet.jsx | rg -v minmax` — it should return nothing.
- **`minWidth: 0` on grid/flex children that hold long text.** The track can shrink, but the child still won't unless it may. Cells containing a `<select>` are the worst offenders — a select carries its own intrinsic width.
- **`overflow-x: hidden`** on `.page` (`index.css`) and on the character-sheet wrapper, as a backstop.
- **`body { overflow-wrap: break-word; }`** — inherited, so it covers descendants, and safe: it only breaks a word that can't fit on its own line. **Do not** use a blanket `overflow-wrap: anywhere` — that breaks words mid-character even when the line has room. `.wrap-text` is the opt-in class for description blocks that genuinely need aggressive breaking.
- Deliberate exceptions to preserve: the `whiteSpace: 'nowrap'` + ellipsis on the Actions-tab feature blurb, and `whiteSpace: 'pre-wrap'` in the side panels.

Manual check: at 1280px and again at 900px, on every tab and with the side panels open, `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

### Widget System (CharacterSheet)
Character sheet sections are wrapped in `wrapWidget()` which provides:
- Consistent border/padding/title styling
- Drag handle for widget reordering
- Collapsible sections
- Widget layout saved to localStorage

**Important:** `wrapWidget` is a plain function, NOT a React component. This prevents the focus-loss bug where defining `Widget` as an inline component caused React to unmount/remount inputs on every render.

### Theme Presets (17 built-in)
Each theme defines all CSS variables listed above. Examples:
- **Dark Fantasy** (default) — Deep brown, gold accents
- **Blood Moon** — Dark red/crimson tones
- **Frost** — Ice blue/silver
- **Emerald** — Green nature tones
- **Necromancer** — Dark with bioluminescent green accents
- **Synthwave** / **Vaporwave** — Retro neon aesthetics
- **Parchment** — Light theme with warm sepia tones

### Responsive Design
- Character sheet uses configurable 2/3/4 column grid
- Widgets reflow based on column count
- Mobile-friendly (most sections stack vertically)

## Responsive containment

`.page` and the character sheet's `st.sheet` both set `overflow-x: hidden`, and `body` sets
`overflow-wrap: break-word`, so long content wraps rather than widening the page. Anything
that still doesn't fit is **clipped**, so bars that must not lose content need room made:

- **Character sheet header** (`st.header`) — `flexWrap: 'wrap'` so the action row drops to a
  second line; the Heroic Inspiration / Short Rest / Long Rest buttons carry
  `whiteSpace: 'nowrap'` so their labels never break. (The clipper here is `st.sheet`'s own
  `overflowX`, not `.page` — the sheet does not render inside `.page`.)
- **Navbar** — a sibling of `<Routes>`, so it is outside `.page` and overflowed the *document*.
  `padding`, the logo/links `gap` and both link paddings use `clamp(min, Nvw, max)`, with each
  `vw` term chosen to resolve to the original pixel value at 1280px (`2.5vw`→32px,
  `1.40625vw`→18px, `1.25vw`→16px), so desktop is unchanged. `.nav-link` is
  `white-space: nowrap`; Settings is `flexShrink: 0` so it is never the thing squeezed; and
  `.nav-links` is `min-width: 0; overflow-x: auto` (scrollbar hidden) so the row scrolls
  instead of letting its children spill out and overlap.
- **Below 1250px** `.nav-wordmark` ("Odyssey & Dragons") and `.nav-mysheet` (the conditional
  "My Sheet" shortcut) are hidden, which keeps every remaining label whole. The breakpoint sits
  well above 1100px deliberately: the width *just above* a `max-width` query is the worst case.
- `.wrap-text` remains the opt-in for aggressive breaking (`overflow-wrap: anywhere`); never
  apply that globally.

Verified in Chrome at 1280 / 1101 / 1024 / 900px in the returning-user state (with the
"My Sheet" link present, on a non-sheet page): `body.scrollWidth` equals the viewport and no
element paints past the right edge. **Known limitation:** at ≤768px the link row still clips
mid-label — the nav needs a collapsed/hamburger treatment for phone widths.
