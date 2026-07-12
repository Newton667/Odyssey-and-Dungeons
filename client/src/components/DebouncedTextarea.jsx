import { useState, useRef, useEffect } from 'react';

export default function DebouncedTextarea({ value, onChange, ...props }) {
  const [local, setLocal] = useState(value || '');
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setLocal(value || ''); }, [value]);
  return (
    <textarea {...props}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; onChange(local); }}
    />
  );
}
