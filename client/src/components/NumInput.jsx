import { useState, useRef, useEffect } from 'react';

export default function NumInput({ value, onChange, min, max, style, onKeyDown, ...props }) {
  const [raw, setRaw] = useState(String(value ?? ''));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setRaw(String(value ?? '')); }, [value]);

  // The single parse/clamp path, shared by blur and Enter.
  // parseInt('0') is 0 (falsy) — must not fall through to `min`, or a 0/empty entry
  // would snap to the minimum (e.g. -10 on a bonus box). Treat only NaN as "empty → 0".
  const commit = () => {
    let v = parseInt(raw, 10);
    if (Number.isNaN(v)) v = 0;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    setRaw(String(v));
    onChange(v);
  };

  return (
    <input {...props} type="number" min={min} max={max} style={style}
      value={raw}
      onChange={e => setRaw(e.target.value)}
      onFocus={() => { focused.current = true; }}
      onBlur={() => {
        focused.current = false;
        commit();
      }}
      onKeyDown={e => {
        // The value is only committed on blur, so Enter used to submit the enclosing
        // form with the PREVIOUS value (the parent's state had not been updated yet).
        // Commit here instead and swallow the implicit submit; the submit button (or Enter
        // in a text field) still submits, now with the committed value.
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
        if (onKeyDown) onKeyDown(e);
      }}
    />
  );
}
