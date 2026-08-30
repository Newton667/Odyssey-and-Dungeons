import { useRef, useState, useCallback } from 'react';

/**
 * Hover tooltip.
 *
 * The box is `position: fixed` and placed from the trigger's bounding rect on
 * hover, NOT `position: absolute` inside the wrapper. That is deliberate: an
 * absolutely-positioned box is clipped by any ancestor whose overflow is not
 * `visible`, and `z-index` cannot rescue it. The character sheet's root sets
 * `overflowX: 'hidden'` for horizontal containment — and CSS then computes the
 * other axis to `auto` — so every tooltip inside the sheet was being sliced off.
 * `fixed` escapes all ancestor clipping.
 *
 * See Docs/known-patterns-and-gotchas.md → "Horizontal overflow containment
 * clips — it does not make things fit".
 */
export default function Tip({ text, children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const HALF = 150;   // half of the box's max-width (300px)
    const GAP = 8;
    // Flip below when there isn't room above for the tallest tooltip.
    const above = r.top > 160;
    setPos({
      left: Math.min(Math.max(r.left + r.width / 2, HALF + GAP), window.innerWidth - HALF - GAP),
      top: above ? r.top - GAP : r.bottom + GAP,
      place: above ? 'above' : 'below',
    });
  }, []);

  if (!text) return children;

  return (
    <div
      ref={ref}
      className="ond-tip"
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={place}
      onFocus={place}
    >
      {children}
      <div
        className="ond-tip-box"
        data-place={pos ? pos.place : 'above'}
        // Parked off-screen until the first hover measures it, so it can never
        // flash at a stale position.
        style={pos ? { left: `${pos.left}px`, top: `${pos.top}px` } : { left: 0, top: -9999 }}
      >
        {text}
      </div>
    </div>
  );
}
