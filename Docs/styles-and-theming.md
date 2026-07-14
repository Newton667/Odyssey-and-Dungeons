# Styles and Theming Reference

## index.css (~400+ lines)
Global styles with D&D dark fantasy theme.

### CSS Custom Properties (set by ThemeContext)
```css
--bg-primary       /* Main background */
--bg-secondary     /* Card/panel background */
--bg-tertiary      /* Input/nested element background */
--border           /* Border color */
--border-glow      /* Glowing border accent */
--gold             /* Primary accent color (headings, buttons) */
--gold-hover       /* Accent hover state */
--text-primary     /* Main text color */
--text-secondary   /* Subtitle/secondary text */
--text-dim         /* Muted text */
--accent           /* Secondary accent (links, badges) */
--accent-hover     /* Secondary accent hover */
--danger           /* Red for delete/damage/errors */
--success          /* Green for healing/success */
--hp-bar           /* HP bar fill color */
--hp-bar-bg        /* HP bar background */
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

**Rarity Color System (in CharacterSheet.jsx):**
```js
const RARITY_COLORS = {
  common: 'var(--text-dim)',
  uncommon: '#1eff00',
  rare: '#0070ff',
  'very-rare': '#a335ee',
  legendary: '#ff8000',
  artifact: '#e6cc80'
};

function rarityColor(r) { return RARITY_COLORS[r] || RARITY_COLORS.common; }

function rarityBg(r) {
  // Returns tinted background for rarity
  uncommon: '#1a2e1a', rare: '#1a1a3e',
  'very-rare': '#2e1a3e', legendary: '#3e2e0a',
  artifact: '#3e1a0a', default: 'transparent'
}
```

### Widget System (CharacterSheet)
Character sheet sections are wrapped in `wrapWidget()` which provides:
- Consistent border/padding/title styling
- Drag handle for widget reordering
- Collapsible sections
- Widget layout saved to localStorage

**Important:** `wrapWidget` is a plain function, NOT a React component. This prevents the focus-loss bug where defining `Widget` as an inline component caused React to unmount/remount inputs on every render.

### Theme Presets
Each theme defines all CSS variables. Examples:
- **Dark Fantasy** — Deep purple/brown, gold accents
- **Blood Moon** — Dark red/crimson tones
- **Frost Giant** — Ice blue/silver
- **Feywild** — Vibrant green/pink/purple
- **Underdark** — Deep purple/blue, bioluminescent accents

### Responsive Design
- Character sheet uses configurable 2/3/4 column grid
- Widgets reflow based on column count
- Mobile-friendly (most sections stack vertically)
