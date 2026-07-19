import { useState, useRef, useEffect } from 'react';

export default function NumInput({ value, onChange, min, max, style, ...props }) {
  const [raw, setRaw] = useState(String(value ?? ''));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setRaw(String(value ?? '')); }, [value]);
  return (
    <input {...props} type="number" min={min} max={max} style={style}
      value={raw}
      onChange={e => setRaw(e.target.value)}
      onFocus={() => { focused.current = true; }}
      onBlur={() => {
        focused.current = false;
        // parseInt('0') is 0 (falsy) — must not fall through to `min`, or a 0/empty entry
        // would snap to the minimum (e.g. -10 on a bonus box). Treat only NaN as "empty → 0".
        let v = parseInt(raw, 10);
        if (Number.isNaN(v)) v = 0;
        if (min != null) v = Math.max(min, v);
        if (max != null) v = Math.min(max, v);
        setRaw(String(v));
        onChange(v);
      }}
    />
  );
}
