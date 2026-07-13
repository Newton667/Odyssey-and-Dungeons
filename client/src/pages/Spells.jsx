import { useEffect, useState, useCallback } from 'react';
import { useDice } from '../context/DiceContext';
import { queryLocalSpells } from '../data/localDataService';

const SCHOOLS = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
const ALL_CLASSES = ['Artificer', 'Bard', 'Cleric', 'Druid', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'];

/* ── damage type icons (inline SVG) ── */
const DMG_ICONS = {
  fire: (sz, cl) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><path d="M12 2C12 2 8 7 8 7c-2 2-4 4.5-4 7.5C4 19 7.6 22 12 22s8-3 8-7.5c0-3-2-5.5-4-7.5L12 2z" fill={cl} opacity="0.7"/><path d="M12 22c-2.2 0-4-1.8-4-4 0-2.2 1.5-3.5 2.5-4.5L12 12l1.5 1.5c1 1 2.5 2.3 2.5 4.5 0 2.2-1.8 4-4 4z" fill={cl} opacity="0.45"/><path d="M14.5 8c0 0 1.5 2 1.5 3.5s-.7 2-1.5 2-1.5-.5-1.5-2S14.5 8 14.5 8z" fill={cl} opacity="0.5"/></svg>,
  cold: (sz, cl) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" stroke={cl} strokeWidth="1.8" strokeLinecap="round" opacity="0.85"/><circle cx="12" cy="12" r="2" fill={cl} opacity="0.5"/></svg>,
  lightning: (sz, cl) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><path d="M13 2L4 14h7l-2 8 11-12h-7l2-8z" fill={cl} opacity="0.85"/></svg>,
  thunder: (sz, cl) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><path d="M5 9a7 7 0 0 1 14 0" stroke={cl} strokeWidth="2" strokeLinecap="round" opacity="0.4"/><path d="M3 12a9 9 0 0 1 18 0" stroke={cl} strokeWidth="2" strokeLinecap="round" opacity="0.25"/><path d="M8 12a4 4 0 0 1 8 0" stroke={cl} strokeWidth="2" strokeLinecap="round" opacity="0.6"/><path d="M11 14v4M14 15v3M8 15v3" stroke={cl} strokeWidth="1.5" strokeLinecap="round" opacity="0.85"/></svg>,
  acid: (sz, cl) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><path d="M12 3c-2 4-5 6-5 10a5 5 0 0 0 10 0c0-4-3-6-5-10z" fill={cl} opacity="0.7"/><ellipse cx="10" cy="14" rx="1" ry="1.5" fill={cl} opacity="0.3"/></svg>,
  poison: (sz, cl) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><circle cx="12" cy="10" r="6" fill={cl} opacity="0.3"/><circle cx="9.5" cy="9" r="1.5" fill={cl} opacity="0.85"/><circle cx="14.5" cy="9" r="1.5" fill={cl} opacity="0.85"/><path d="M9 13c1.5 1.5 4.5 1.5 6 0" stroke={cl} strokeWidth="1.5" strokeLinecap="round" opacity="0.85"/><path d="M12 16v3M8 15l-2 3M16 15l2 3" stroke={cl} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/></svg>,
  necrotic: (sz, cl) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><circle cx="12" cy="9" r="5" fill={cl} opacity="0.3"/><circle cx="10" cy="8.5" r="1.5" fill={cl} opacity="0.85"/><circle cx="14" cy="8.5" r="1.5" fill={cl} opacity="0.85"/><path d="M8.5 12.5l1.5-1 1.5 1 1-1 1.5 1 1.5-1" stroke={cl} strokeWidth="1.2" opacity="0.85"/><path d="M12 14v4" stroke={cl} strokeWidth="3" strokeLinecap="round" opacity="0.4"/></svg>,
  radiant: (sz, cl) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><circle cx="12" cy="12" r="4" fill={cl} opacity="0.6"/>{[0,45,90,135,180,225,270,315].map(a => <line key={a} x1={12+Math.cos(a*Math.PI/180)*6} y1={12+Math.sin(a*Math.PI/180)*6} x2={12+Math.cos(a*Math.PI/180)*8.5} y2={12+Math.sin(a*Math.PI/180)*8.5} stroke={cl} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>)}</svg>,
  psychic: (sz, cl) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><ellipse cx="12" cy="11" rx="6" ry="7" fill={cl} opacity="0.3"/><path d="M8 11c0-2.5 1.8-5 4-5s4 2.5 4 5-1.8 4-4 4-4-1.5-4-4z" fill={cl} opacity="0.4"/><path d="M10 10q2 3 4 0" stroke={cl} strokeWidth="1.5" strokeLinecap="round" opacity="0.85"/></svg>,
  force: (sz, cl) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><polygon points="12,2 14.5,9 22,9 16,13.5 18,21 12,16.5 6,21 8,13.5 2,9 9.5,9" fill={cl} opacity="0.6"/><polygon points="12,6 13.5,10 17,10 14,12.5 15,16 12,13.5 9,16 10,12.5 7,10 10.5,10" fill={cl} opacity="0.3"/></svg>,
  bludgeoning: (sz, cl) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><circle cx="12" cy="8" r="5" fill={cl} opacity="0.5"/><rect x="11" y="12" width="2" height="9" rx="1" fill={cl} opacity="0.7"/></svg>,
  piercing: (sz, cl) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><path d="M12 3l3 8H9l3-8z" fill={cl} opacity="0.7"/><rect x="11" y="10" width="2" height="11" rx="1" fill={cl} opacity="0.5"/></svg>,
  slashing: (sz, cl) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}><path d="M6 4l12 16M4 6l16 12" stroke={cl} strokeWidth="2" strokeLinecap="round" opacity="0.6"/></svg>,
};

const DMG_COLORS = {
  fire: '#e8652b',
  cold: '#4fc3f7',
  lightning: '#ffe066',
  thunder: '#b39ddb',
  acid: '#8bc34a',
  poison: '#66bb6a',
  necrotic: '#78909c',
  radiant: '#ffd54f',
  psychic: '#ec407a',
  force: '#7c4dff',
  bludgeoning: '#a1887f',
  piercing: '#90a4ae',
  slashing: '#b0bec5',
  healing: '#4caf50',
  varies: '#ce93d8',
};

function dmgColor(type) {
  return DMG_COLORS[type] || 'var(--text-dim)';
}

function DmgIcon({ type, size = 14, color }) {
  const render = DMG_ICONS[type];
  return render ? render(size, color || dmgColor(type)) : null;
}

/* ── dice helpers ── */
function parseDice(expr) {
  const m = expr.match(/^(\d+)d(\d+)$/);
  return m ? { count: Number(m[1]), sides: Number(m[2]) } : null;
}

function scaledDice(baseDice, charLevel) {
  const d = parseDice(baseDice);
  if (!d) return baseDice;
  let extra = 0;
  if (charLevel >= 17) extra = 3;
  else if (charLevel >= 11) extra = 2;
  else if (charLevel >= 5) extra = 1;
  return `${d.count + extra}d${d.sides}`;
}

/* ── component ── */
export default function Spells() {
  const { rollDice3D, rolling: diceRolling } = useDice();
  const [spells, setSpells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ level: '', school: '', search: '', cls: '' });
  const [showHomebrew, setShowHomebrew] = useState(false);
  const [homebrewSpells, setHomebrewSpells] = useState([]);
  const [useLocal, setUseLocal] = useState(() => localStorage.getItem('ond-data-source') !== 'db');
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [charLevel, setCharLevel] = useState(1);
  const [spellDC, setSpellDC] = useState(13);
  const [rollResults, setRollResults] = useState({});
  const [form, setForm] = useState({
    name: '', level: 0, school: '', castingTime: '1 action', range: '60 feet',
    components: [], materialComponent: '', duration: 'Instantaneous',
    concentration: false, ritual: false, description: '', higherLevels: '',
    classes: [], attackType: '', damage: '', damageType: '', scaling: '', savingThrow: '', saveEffect: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    if (useLocal) {
      const data = queryLocalSpells({ level: filter.level !== '' ? Number(filter.level) : undefined, school: filter.school, search: filter.search, cls: filter.cls });
      setSpells(data);
      setLoading(false);
    } else {
      const params = new URLSearchParams();
      if (filter.level !== '') params.set('level', filter.level);
      if (filter.school) params.set('school', filter.school);
      if (filter.search) params.set('search', filter.search);
      if (filter.cls) params.set('class', filter.cls);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      fetch(`/api/spells?${params}`, { signal: controller.signal })
        .then(r => { clearTimeout(timeout); if (!r.ok) throw new Error('Server error'); return r.json(); })
        .then(data => { if (data.length === 0 && !filter.search && !filter.school && !filter.cls && filter.level === '') throw new Error('Empty'); setSpells(data); setLoading(false); })
        .catch(() => {
          clearTimeout(timeout);
          const fallback = queryLocalSpells({ level: filter.level !== '' ? Number(filter.level) : undefined, school: filter.school, search: filter.search, cls: filter.cls });
          setSpells(fallback);
          setLoading(false);
          setUseLocal(true);
          localStorage.setItem('ond-data-source', 'local');
          alert('Database not connected. Switched to Local mode.\n\nTo use Database mode, add a MongoDB connection string in Settings.');
        });
    }
    // Load homebrew spells from localStorage
    try {
      let hb = JSON.parse(localStorage.getItem('ond-homebrew') || '[]').filter(i => i.type === 'spell');
      if (filter.search) hb = hb.filter(s => s.name?.toLowerCase().includes(filter.search.toLowerCase()));
      if (filter.level !== '') hb = hb.filter(s => s.level === Number(filter.level));
      if (filter.school) hb = hb.filter(s => s.school === filter.school);
      if (filter.cls) hb = hb.filter(s => s.classes?.some(c => c.toLowerCase() === filter.cls.toLowerCase()));
      setHomebrewSpells(hb);
    } catch { setHomebrewSpells([]); }
  }, [filter, useLocal]);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/spells', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { setCreating(false); load(); }
  };

  const doRoll = async (spellId, type, diceExpr, spellName) => {
    if (diceRolling) return;
    const label = type === 'hit' ? `${spellName} — Attack` : `${spellName} — Damage`;
    const { results, total } = await rollDice3D(
      type === 'hit' ? '1d20' : diceExpr,
      label,
    );
    setRollResults(p => ({
      ...p,
      [spellId + '_' + type]: { results, total, type, ts: Date.now() },
    }));
  };

  const levelLabel = (lvl) => lvl === 0 ? 'Cantrip' : `Level ${lvl}`;

  /* ── shared inline styles ── */
  const badgeStyle = {
    fontSize: '10px', borderRadius: '4px', padding: '2px 8px', fontWeight: 600,
    background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)',
  };
  const statRow = { display: 'flex', gap: '4px', fontSize: '13px', padding: '5px 0', borderBottom: '1px solid var(--border)', alignItems: 'baseline' };
  const statLabel = { color: 'var(--text-dim)', fontWeight: 600, minWidth: '100px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const statValue = { color: 'var(--text)', flex: 1 };
  const infoPill = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '6px 10px', borderRadius: '8px',
    background: 'var(--surface)', border: '1px solid var(--border)', minWidth: '70px',
  };
  const rollBtn = (active) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '8px 14px', borderRadius: '8px', cursor: diceRolling ? 'wait' : 'pointer',
    background: active ? 'var(--accent, var(--surface))' : 'var(--input-bg)',
    border: `2px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
    minWidth: '80px', minHeight: '50px', transition: 'all 0.15s', color: 'var(--text)',
  });

  return (
    <div className="page">
      <div className="page-header">
        <h2 style={{ fontSize: '28px' }}>Spells</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div onClick={() => { const next = !useLocal; setUseLocal(next); localStorage.setItem('ond-data-source', next ? 'local' : 'db'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '11px' }}>
            <div style={{ width: '24px', height: '12px', borderRadius: '6px', position: 'relative', background: useLocal ? 'var(--gold)' : '#4ade80', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: '2px', left: useLocal ? '12px' : '2px', width: '8px', height: '8px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
            </div>
            <span style={{ color: useLocal ? 'var(--gold)' : '#4ade80', fontWeight: 600 }}>{useLocal ? 'Local' : 'Database'}</span>
          </div>
          <button className="btn btn-primary" onClick={() => setCreating(v => !v)}>
            {creating ? '✕ Cancel' : '+ Add Spell'}
          </button>
        </div>
      </div>

      {creating && <SpellForm form={form} setForm={setForm} onSubmit={create} />}

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center',
        padding: '20px 22px', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)',
        fontSize: '14px',
      }}>
        <div style={{ position: 'relative', minWidth: '200px', flex: 1 }}>
          <input placeholder="Search spells..." value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            style={{ width: '100%', padding: '10px 34px 10px 14px', fontSize: '14px' }} />
          {filter.search && (
            <button onClick={() => setFilter(f => ({ ...f, search: '' }))} style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
              fontSize: '18px', lineHeight: 1, padding: '2px 4px',
            }}>✕</button>
          )}
        </div>
        <select value={filter.level} onChange={e => setFilter(f => ({ ...f, level: e.target.value }))}
          style={{ padding: '10px 14px', fontSize: '14px' }}>
          <option value="">All Levels</option>
          <option value="0">Cantrips</option>
          {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>Level {n}</option>)}
        </select>
        <select value={filter.school} onChange={e => setFilter(f => ({ ...f, school: e.target.value }))}
          style={{ padding: '10px 14px', fontSize: '14px' }}>
          <option value="">All Schools</option>
          {SCHOOLS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filter.cls} onChange={e => setFilter(f => ({ ...f, cls: e.target.value }))}
          style={{ padding: '10px 14px', fontSize: '14px' }}>
          <option value="">All Classes</option>
          {ALL_CLASSES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowHomebrew(!showHomebrew)}
          style={{
            padding: '10px 14px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
            background: showHomebrew ? '#2a1a3a' : 'var(--surface)',
            border: `1px solid ${showHomebrew ? '#6a3a8a' : 'var(--border)'}`,
            color: showHomebrew ? '#a335ee' : 'var(--text-dim)',
          }}>
          Homebrew {homebrewSpells.length > 0 ? `(${homebrewSpells.length})` : ''}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '1px solid var(--border)', paddingLeft: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-dim)', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.5px', fontWeight: 600 }}>
              Lvl
            </label>
            <input type="number" min={1} max={20} value={charLevel}
              onChange={e => setCharLevel(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              style={{ width: '52px', textAlign: 'center', padding: '10px 8px', fontSize: '14px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-dim)', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.5px', fontWeight: 600 }}>
              DC
            </label>
            <input type="number" min={1} max={30} value={spellDC}
              onChange={e => setSpellDC(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
              style={{ width: '52px', textAlign: 'center', padding: '10px 8px', fontSize: '14px' }} />
          </div>
        </div>
      </div>

      {/* ── Homebrew spells section ── */}
      {showHomebrew && homebrewSpells.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', color: '#a335ee', marginBottom: '10px', fontFamily: 'Cinzel, serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Homebrew Spells</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {homebrewSpells.map(s => (
              <div key={s._id} className="card cc-skill" style={{ padding: '10px 14px', borderLeft: '3px solid #a335ee', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === s._id ? null : s._id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#a335ee', fontSize: '14px' }}>{s.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '8px' }}>
                      {s.level === 0 ? 'Cantrip' : `Level ${s.level}`} {s.school} {s.concentration ? '· C' : ''} {s.ritual ? '· R' : ''}
                    </span>
                    {s.createdBy && <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '8px' }}>by {s.createdBy}</span>}
                  </div>
                  <span className="badge" style={{ fontSize: '9px', padding: '1px 6px', background: '#2a1a3a', border: '1px solid #6a3a8a', color: '#a335ee' }}>HB</span>
                </div>
                {expanded === s._id && (
                  <div style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px', fontSize: '13px', color: 'var(--text-dim)' }} onClick={e => e.stopPropagation()}>
                    <p style={{ whiteSpace: 'pre-line', marginBottom: '8px' }}>{s.description}</p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px' }}>
                      {s.castingTime && <span>Cast: {s.castingTime}</span>}
                      {s.range && <span>Range: {s.range}</span>}
                      {s.duration && <span>Duration: {s.duration}</span>}
                      {s.damage && <span>Damage: {s.damage} {s.damageType}</span>}
                      {s.classes?.length > 0 && <span>Classes: {s.classes.join(', ')}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Spell list ── */}
      {loading ? (
        <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '60px' }}>Loading spells...</div>
      ) : spells.length === 0 && !(showHomebrew && homebrewSpells.length > 0) ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          No spells found. Add your first spell or adjust your filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {spells.map(s => {
            const isOpen = expanded === s._id;
            const hasDamage = !!s.damage;
            const hasAttack = !!s.attackType;
            const hasSave = !!s.savingThrow;
            const dmgDice = (s.scaling === 'cantrip' && hasDamage) ? scaledDice(s.damage, charLevel) : s.damage;
            const hitRes = rollResults[s._id + '_hit'];
            const dmgRes = rollResults[s._id + '_damage'];
            const hitFresh = hitRes && (Date.now() - hitRes.ts) < 60000;
            const dmgFresh = dmgRes && (Date.now() - dmgRes.ts) < 60000;

            return (
              <div key={s._id} className="spell-card" style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px',
                overflow: 'hidden',
                borderColor: isOpen ? 'var(--gold-dim)' : undefined,
              }}>
                {/* ── Main row ── */}
                <div
                  onClick={() => setExpanded(isOpen ? null : s._id)}
                  style={{ display: 'flex', gap: '16px', padding: '12px 16px', cursor: 'pointer', alignItems: 'center' }}
                >
                  {/* Left: name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '16px', margin: 0, fontFamily: 'Cinzel, serif' }}>{s.name}</h3>
                      <span style={badgeStyle}>{s.school}</span>
                      <span style={{
                        ...badgeStyle, background: 'var(--accent)', color: 'var(--gold)',
                        border: '1px solid var(--gold-dim)', fontSize: '11px', fontWeight: 700,
                        fontFamily: 'Cinzel, serif', letterSpacing: '0.5px',
                      }}>{levelLabel(s.level)}</span>
                      {s.concentration && <span style={badgeStyle}>Concentration</span>}
                      {s.ritual && <span style={badgeStyle}>Ritual</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '13px', color: 'var(--text)', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span><span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '5px', color: 'var(--text-dim)' }}>Cast:</span>{s.castingTime}</span>
                      <span><span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '5px', color: 'var(--text-dim)' }}>Range:</span>{s.range}</span>
                      <span><span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '5px', color: 'var(--text-dim)' }}>Duration:</span>{s.duration}</span>
                      {s.components?.length > 0 && (
                        <span>
                          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '5px', color: 'var(--text-dim)' }}>Comp:</span>
                          {s.components.join(', ')}
                          {s.materialComponent ? <span style={{ fontStyle: 'italic' }}> ({s.materialComponent})</span> : ''}
                        </span>
                      )}
                    </div>
                    {s.classes?.length > 0 && (
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Classes:</span>
                        {s.classes.map(c => (
                          <span key={c} style={{
                            fontSize: '12px', padding: '2px 7px', borderRadius: '4px',
                            background: 'var(--input-bg)', color: 'var(--text)',
                            border: '1px solid var(--border)', letterSpacing: '0.3px',
                          }}>{c}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: combat info + roll buttons */}
                  {(hasAttack || hasSave || hasDamage) && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}
                      onClick={e => e.stopPropagation()}>

                      {/* Attack / Save pill */}
                      {hasAttack && (
                        <div style={infoPill}>
                          <span style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {s.attackType}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700 }}>
                            Spell Attack
                          </span>
                        </div>
                      )}
                      {hasSave && (
                        <div style={infoPill}>
                          <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700 }}>
                            {s.savingThrow} Save
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'Cinzel, serif', color: 'var(--text)' }}>
                            DC {spellDC}
                          </span>
                          <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                            {s.saveEffect || 'negates'}
                          </span>
                        </div>
                      )}

                      {/* Damage pill */}
                      {hasDamage && (
                        <div style={{ ...infoPill, borderColor: dmgColor(s.damageType) + '44' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: dmgColor(s.damageType) }}>
                            {dmgDice}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', color: dmgColor(s.damageType), textTransform: 'capitalize', fontWeight: 600 }}>
                            <DmgIcon type={s.damageType} size={12} />
                            {s.damageType}
                          </span>
                        </div>
                      )}

                      {/* Hit button */}
                      {hasAttack && (
                        <button className="spell-roll-btn" disabled={diceRolling}
                          onClick={() => doRoll(s._id, 'hit', '1d20', s.name)}
                          style={rollBtn(hitFresh)}>
                          {hitFresh ? (
                            <>
                              <span style={{
                                fontSize: '22px', fontWeight: 800, fontFamily: 'Cinzel, serif',
                                color: hitRes.total === 20 ? '#40e040' : hitRes.total === 1 ? '#e04040' : 'var(--gold)',
                                textShadow: hitRes.total === 20 ? '0 0 10px #40e040' : hitRes.total === 1 ? '0 0 10px #e04040' : 'none',
                                animation: 'rollPop 0.3s ease-out',
                              }}>
                                {hitRes.total}
                              </span>
                              <span style={{ fontSize: '9px', color: hitRes.total === 20 ? '#40e040' : hitRes.total === 1 ? '#e04040' : 'var(--text-dim)' }}>
                                {hitRes.total === 20 ? 'NAT 20!' : hitRes.total === 1 ? 'NAT 1...' : 'to hit'}
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'Cinzel, serif' }}>Hit</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>1d20</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Damage button */}
                      {hasDamage && (
                        <button className="spell-roll-btn" disabled={diceRolling}
                          onClick={() => doRoll(s._id, 'damage', dmgDice, s.name)}
                          style={rollBtn(dmgFresh)}>
                          {dmgFresh ? (
                            <>
                              <span style={{
                                fontSize: '22px', fontWeight: 800, fontFamily: 'Cinzel, serif',
                                color: 'var(--gold)',
                                animation: 'rollPop 0.3s ease-out',
                              }}>
                                {dmgRes.total}
                              </span>
                              <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                                [{dmgRes.results.map(r => r.value).join(' + ')}]
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'Cinzel, serif' }}>Damage</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{dmgDice}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* +/− expand indicator */}
                  <span style={{
                    fontSize: '22px', fontWeight: 700, color: 'var(--gold-dim)',
                    flexShrink: 0, width: '28px', textAlign: 'center',
                    lineHeight: 1, transition: 'color 0.15s',
                  }}>{isOpen ? '−' : '+'}</span>
                </div>

                {/* ── Expanded details ── */}
                {isOpen && (
                  <div style={{ padding: '0 16px 14px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ padding: '10px 0' }}>
                      {[
                        ['Casting Time', s.castingTime],
                        ['Range', s.range],
                        ['Components', (s.components?.join(', ') || '—') + (s.materialComponent ? ` (${s.materialComponent})` : '')],
                        ['Duration', s.duration],
                        hasAttack && ['Attack', `${s.attackType === 'melee' ? 'Melee' : 'Ranged'} spell attack`],
                        hasSave && ['Saving Throw', `${s.savingThrow} DC ${spellDC} · ${s.saveEffect || 'negates'}`],
                        hasDamage && ['Damage', <span key="dmg" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: dmgColor(s.damageType), fontWeight: 600 }}>{dmgDice} <DmgIcon type={s.damageType} size={14} /> {s.damageType}</span>],
                      ].filter(Boolean).map(([label, value], i, arr) => (
                        <div key={label} style={{ ...statRow, borderBottom: i < arr.length - 1 ? statRow.borderBottom : 'none' }}>
                          <span style={statLabel}>{label}</span>
                          <span style={statValue}>{value}</span>
                        </div>
                      ))}
                    </div>

                    <p style={{ fontSize: '13px', lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: '0 0 10px 0' }}>
                      {s.description}
                    </p>

                    {s.higherLevels && (
                      <div style={{
                        fontSize: '13px', lineHeight: 1.65, marginBottom: '10px',
                        padding: '10px 14px', borderRadius: '6px',
                        background: 'var(--input-bg)', border: '1px solid var(--border)',
                      }}>
                        <span style={{ color: 'var(--gold)', fontWeight: 700, fontFamily: 'Cinzel, serif', fontSize: '12px' }}>
                          At Higher Levels.{' '}
                        </span>
                        <span style={{ color: 'var(--text-dim)' }}>{s.higherLevels}</span>
                      </div>
                    )}

                    {s.classes?.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Classes:</span>
                        {s.classes.map(c => (
                          <span key={c} style={{
                            fontSize: '12px', padding: '3px 10px', borderRadius: '4px',
                            background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)',
                          }}>{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Spell create form ── */
function SpellForm({ form, setForm, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="card" style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>New Spell</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
        {[
          { key: 'name', label: 'Name *', required: true },
          { key: 'castingTime', label: 'Casting Time' },
          { key: 'range', label: 'Range' },
          { key: 'duration', label: 'Duration' },
          { key: 'damage', label: 'Damage Dice', placeholder: '1d8' },
          { key: 'damageType', label: 'Damage Type', placeholder: 'fire' },
          { key: 'savingThrow', label: 'Saving Throw', placeholder: 'DEX' },
          { key: 'materialComponent', label: 'Material', placeholder: 'a feather' },
        ].map(({ key, label, required, placeholder }) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{label}</label>
            <input required={required} placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Level (0=Cantrip)</label>
          <input type="number" min={0} max={9} value={form.level} onChange={e => setForm(f => ({ ...f, level: Number(e.target.value) }))} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>School</label>
          <select value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))}>
            <option value="">--</option>
            {SCHOOLS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Attack Type</label>
          <select value={form.attackType} onChange={e => setForm(f => ({ ...f, attackType: e.target.value }))}>
            <option value="">None</option>
            <option value="melee">Melee</option>
            <option value="ranged">Ranged</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Scaling</label>
          <select value={form.scaling} onChange={e => setForm(f => ({ ...f, scaling: e.target.value }))}>
            <option value="">None</option>
            <option value="cantrip">Cantrip (5/11/17)</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {['V', 'S', 'M'].map(c => (
          <label key={c} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.components.includes(c)}
              onChange={e => setForm(f => ({
                ...f, components: e.target.checked ? [...f.components, c] : f.components.filter(x => x !== c)
              }))} />
            {c === 'V' ? 'Verbal' : c === 'S' ? 'Somatic' : 'Material'}
          </label>
        ))}
        <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.concentration} onChange={e => setForm(f => ({ ...f, concentration: e.target.checked }))} />
          Concentration
        </label>
        <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.ritual} onChange={e => setForm(f => ({ ...f, ritual: e.target.checked }))} />
          Ritual
        </label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
        <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Description</label>
        <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%', resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
        <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>At Higher Levels</label>
        <textarea rows={2} value={form.higherLevels} onChange={e => setForm(f => ({ ...f, higherLevels: e.target.value }))} style={{ width: '100%', resize: 'vertical' }} />
      </div>
      <button type="submit" className="btn btn-primary">Add Spell</button>
    </form>
  );
}
