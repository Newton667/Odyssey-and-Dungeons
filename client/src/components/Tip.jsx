export default function Tip({ text, children }) {
  if (!text) return children;
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} className="ond-tip">
      {children}
      <div className="ond-tip-box">{text}</div>
    </div>
  );
}
