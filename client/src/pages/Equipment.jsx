import { useEffect, useState, useCallback } from 'react';
import { useDice } from '../context/DiceContext';
import { queryLocalEquipment } from '../data/localDataService';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'armor', label: 'Armor' },
  { value: 'weapon', label: 'Weapons' },
  { value: 'adventuring-gear', label: 'Adventuring Gear' },
  { value: 'tool', label: 'Tools' },
  { value: 'pack', label: 'Packs' },
];

const RARITIES = [
  { value: '', label: 'All Rarities' },
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'very-rare', label: 'Very Rare' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'artifact', label: 'Artifact' },
];

const RARITY_COLORS = {
  common: 'var(--text-dim, #a08060)',
  uncommon: '#1eff00',
  rare: '#0070ff',
  'very-rare': '#a335ee',
  legendary: '#ff8000',
  artifact: '#e6cc80',
};

const DMG_COLORS = {
  bludgeoning: '#a1887f',
  piercing: '#90a4ae',
  slashing: '#b0bec5',
};

function rarityColor(rarity) {
  return RARITY_COLORS[rarity] || RARITY_COLORS.common;
}

/* Shield SVG icon for AC */
function ShieldIcon({ size = 18, color = 'var(--gold, #c9a227)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" fill={color} opacity="0.25" stroke={color} strokeWidth="1.5"/>
      <path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z" fill="none" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

/* Sword SVG icon for damage rolls */
function SwordIcon({ size = 14, color = 'var(--text-dim)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M14.5 3.5L20.5 9.5L9 21L3 21L3 15L14.5 3.5z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M14.5 3.5L20.5 9.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M7 14L10 17" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/* Parse dice expression like "1d8", "2d6+2", etc. */
function parseDice(expr) {
  if (!expr || expr === '—' || expr === '1') return null;
  // Handle things like "1d8 + 2d6 fire" — just take the first dice expression
  const m = expr.match(/(\d+)d(\d+)(?:\+(\d+))?/);
  return m ? { count: Number(m[1]), sides: Number(m[2]), bonus: Number(m[3] || 0) } : null;
}

export default function Equipment() {
  const { rollDice3D, rolling: diceRolling } = useDice();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: '', search: '', rarity: '' });
  const [expanded, setExpanded] = useState(null);
  const [rollResults, setRollResults] = useState({});
  const [useLocal, setUseLocal] = useState(() => localStorage.getItem('ond-data-source') !== 'db');
  const [showHomebrew, setShowHomebrew] = useState(false);
  const [homebrewItems, setHomebrewItems] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    if (useLocal) {
      const data = queryLocalEquipment({ category: filter.category, search: filter.search, rarity: filter.rarity });
      setItems(data);
      setLoading(false);
    } else {
      const params = new URLSearchParams();
      if (filter.category) params.set('category', filter.category);
      if (filter.search) params.set('search', filter.search);
      if (filter.rarity) params.set('rarity', filter.rarity);
      fetch(`/api/equipment?${params}`)
        .then(r => r.json())
        .then(data => { setItems(data); setLoading(false); })
        .catch(() => {
          const fallback = queryLocalEquipment({ category: filter.category, search: filter.search, rarity: filter.rarity });
          setItems(fallback);
          setLoading(false);
        });
    }
    // Fetch homebrew equipment
    const hbParams = new URLSearchParams();
    if (filter.search) hbParams.set('search', filter.search);
    fetch(`/api/homebrew?${hbParams}`)
      .then(r => r.json())
      .then(data => {
        let filtered = (Array.isArray(data) ? data : []).filter(i => i.type !== 'spell');
        if (filter.category) filtered = filtered.filter(i => i.category === filter.category || i.type === filter.category);
        if (filter.rarity) filtered = filtered.filter(i => i.rarity === filter.rarity);
        setHomebrewItems(filtered);
      })
      .catch(() => setHomebrewItems([]));
  }, [filter, useLocal]);

  useEffect(() => { load(); }, [load]);

  const doRoll = async (itemId, diceExpr, itemName, type) => {
    if (diceRolling) return;
    const label = type === 'hit' ? `${itemName} — Attack` : `${itemName} — Damage`;
    const { results, total } = await rollDice3D(
      type === 'hit' ? '1d20' : diceExpr,
      label,
    );
    setRollResults(p => ({
      ...p,
      [itemId + '_' + type]: { results, total, type, ts: Date.now() },
    }));
  };

  // Rarity sort order: common first, legendary/artifact last
  const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, 'very-rare': 3, legendary: 4, artifact: 5 };

  // Group items by subcategory, sorted by rarity within each group
  const grouped = {};
  items.forEach(item => {
    const key = item.subcategory || item.category;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });
  // Sort each group: common on top, legendary on bottom
  Object.values(grouped).forEach(group => {
    group.sort((a, b) => (RARITY_ORDER[a.rarity || 'common'] || 0) - (RARITY_ORDER[b.rarity || 'common'] || 0));
  });

  const subcategoryOrder = [
    'light armor', 'medium armor', 'heavy armor', 'shield',
    'simple melee', 'simple ranged', 'martial melee', 'martial ranged',
    'adventuring gear', 'arcane focus', 'druidic focus', 'holy symbol', 'ammunition',
    'artisan tools', 'gaming set', 'musical instrument', 'other tools',
    'pack',
  ];

  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    const ai = subcategoryOrder.indexOf(a.toLowerCase());
    const bi = subcategoryOrder.indexOf(b.toLowerCase());
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 20px 60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{
          fontFamily: 'Cinzel, serif', color: 'var(--gold, #c9a227)',
          fontSize: '28px', margin: 0, letterSpacing: '2px',
        }}>
          Equipment
        </h1>
        <div onClick={() => { const next = !useLocal; setUseLocal(next); localStorage.setItem('ond-data-source', next ? 'local' : 'db'); }}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '11px' }}>
          <div style={{ width: '24px', height: '12px', borderRadius: '6px', position: 'relative', background: useLocal ? 'var(--gold)' : '#4ade80', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: '2px', left: useLocal ? '12px' : '2px', width: '8px', height: '8px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
          </div>
          <span style={{ color: useLocal ? 'var(--gold)' : '#4ade80', fontWeight: 600 }}>{useLocal ? 'Local' : 'Database'}</span>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap',
        padding: '12px 16px', borderRadius: '10px',
        background: 'var(--surface, #1a1205)',
        border: '1px solid var(--border, #4a3010)',
      }}>
        {/* Category filter */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              className="dice-select-btn"
              onClick={() => setFilter(f => ({ ...f, category: value }))}
              style={{
                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                background: filter.category === value ? 'var(--accent, var(--surface))' : 'transparent',
                border: filter.category === value ? '1px solid var(--gold, #c9a227)' : '1px solid var(--border, #4a3010)',
                color: filter.category === value ? 'var(--gold, #c9a227)' : 'var(--text-dim, #a08060)',
                fontFamily: 'Cinzel, serif', fontSize: '11px', fontWeight: 600,
                transition: 'all 0.1s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Rarity filter */}
        <select
          value={filter.rarity}
          onChange={e => setFilter(f => ({ ...f, rarity: e.target.value }))}
          style={{
            padding: '6px 10px', borderRadius: '6px', cursor: 'pointer',
            background: 'var(--bg-dark, #0d0800)',
            border: `1px solid ${filter.rarity ? rarityColor(filter.rarity) : 'var(--border, #4a3010)'}`,
            color: filter.rarity ? rarityColor(filter.rarity) : 'var(--text-dim, #a08060)',
            fontSize: '12px', fontFamily: 'Cinzel, serif', fontWeight: 600,
          }}
        >
          {RARITIES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <input
            type="text"
            placeholder="Search equipment..."
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            style={{
              width: '100%', padding: '7px 30px 7px 12px', borderRadius: '6px',
              background: 'var(--bg-dark, #0d0800)',
              border: '1px solid var(--border, #4a3010)',
              color: 'var(--text, #e8d5b0)', fontSize: '13px',
              outline: 'none',
            }}
          />
          {filter.search && (
            <button
              onClick={() => setFilter(f => ({ ...f, search: '' }))}
              style={{
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-dim)',
                cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '2px',
              }}
            >×</button>
          )}
        </div>

        {/* Homebrew toggle */}
        <button onClick={() => setShowHomebrew(!showHomebrew)}
          style={{
            padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'Cinzel, serif',
            background: showHomebrew ? '#2a1a3a' : 'var(--bg-dark, #0d0800)',
            border: `1px solid ${showHomebrew ? '#6a3a8a' : 'var(--border, #4a3010)'}`,
            color: showHomebrew ? '#a335ee' : 'var(--text-dim, #a08060)',
          }}>
          Homebrew {homebrewItems.length > 0 ? `(${homebrewItems.length})` : ''}
        </button>
      </div>

      {/* Homebrew items */}
      {showHomebrew && homebrewItems.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', color: '#a335ee', marginBottom: '10px', fontFamily: 'Cinzel, serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Homebrew Items</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {homebrewItems.map(item => {
              const rc = { common: 'var(--text-dim)', uncommon: '#1eff00', rare: '#0070ff', 'very-rare': '#a335ee', legendary: '#ff8000', artifact: '#e6cc80' }[item.rarity] || 'var(--text-dim)';
              return (
                <div key={item._id} className="card cc-skill" style={{ padding: '10px 14px', borderLeft: `3px solid ${rc}`, cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === item._id ? null : item._id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: rc, fontSize: '14px' }}>{item.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '8px' }}>
                        {item.type} {item.damage ? `· ${item.damage} ${item.damageType || ''}` : ''} {item.ac ? `· AC ${item.ac}` : ''}
                      </span>
                      {item.createdBy && <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '8px' }}>by {item.createdBy}</span>}
                    </div>
                    <span className="badge" style={{ fontSize: '9px', padding: '1px 6px', background: '#2a1a3a', border: '1px solid #6a3a8a', color: '#a335ee' }}>HB</span>
                  </div>
                  {expanded === item._id && (
                    <div style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px', fontSize: '13px', color: 'var(--text-dim)' }} onClick={e => e.stopPropagation()}>
                      <p style={{ whiteSpace: 'pre-line', marginBottom: '6px' }}>{item.description}</p>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px' }}>
                        {item.cost && <span>Cost: {item.cost}</span>}
                        {item.weight && <span>Weight: {item.weight}</span>}
                        {item.properties?.length > 0 && <span>Properties: {item.properties.join(', ')}</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px', fontStyle: 'italic' }}>
          Loading equipment...
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px' }}>
          No equipment found. Seed the database to populate items.
        </div>
      )}

      {/* Item groups */}
      {!loading && sortedGroups.map(group => (
        <div key={group} style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontFamily: 'Cinzel, serif', color: 'var(--gold, #c9a227)',
            fontSize: '16px', letterSpacing: '1.5px', textTransform: 'uppercase',
            marginBottom: '10px', paddingBottom: '6px',
            borderBottom: '1px solid var(--border, #4a3010)',
          }}>
            {group}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {grouped[group].map(item => {
              const isExpanded = expanded === item._id;
              const diceData = parseDice(item.damage);
              const hitResult = rollResults[item._id + '_hit'];
              const dmgResult = rollResults[item._id + '_damage'];
              const hitFresh = hitResult && (Date.now() - hitResult.ts) < 60000;
              const dmgFresh = dmgResult && (Date.now() - dmgResult.ts) < 60000;

              return (
                <div
                  key={item._id}
                  className="equip-card"
                  onClick={() => setExpanded(isExpanded ? null : item._id)}
                  style={{
                    padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                    background: 'var(--surface, #1a1205)',
                    border: `1px solid ${item.rarity && item.rarity !== 'common' ? rarityColor(item.rarity) + '60' : isExpanded ? 'var(--gold-dim, #7a5c10)' : 'var(--border, #4a3010)'}`,
                    boxShadow: item.rarity && item.rarity !== 'common' && isExpanded ? `0 0 8px ${rarityColor(item.rarity)}30` : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Name — colored by rarity */}
                    <span style={{
                      flex: 1, fontWeight: 600, fontSize: '14px',
                      color: item.rarity && item.rarity !== 'common' ? rarityColor(item.rarity) : 'var(--text, #e8d5b0)',
                      fontFamily: 'Cinzel, serif',
                    }}>
                      {item.magical && <span style={{ marginRight: '4px', fontSize: '12px' }}>✦</span>}
                      {item.name}
                      {item.attunement && <span style={{ fontSize: '10px', marginLeft: '6px', color: 'var(--text-dim)', fontWeight: 400 }}>(A)</span>}
                    </span>

                    {/* Damage badge for weapons */}
                    {item.damage && item.damage !== '—' && (
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700,
                        fontFamily: 'monospace',
                        color: DMG_COLORS[item.damageType] || 'var(--text)',
                        background: 'var(--bg-dark, #0d0800)',
                        border: `1px solid ${DMG_COLORS[item.damageType] || 'var(--border)'}`,
                      }}>
                        {item.damage} {item.damageType}
                      </span>
                    )}

                    {/* Roll buttons — same style as Spells page */}
                    {item.category === 'weapon' && diceData && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}
                        onClick={e => e.stopPropagation()}>
                        {/* Attack button */}
                        <button
                          className="spell-roll-btn"
                          disabled={diceRolling}
                          onClick={() => doRoll(item._id, '1d20', item.name, 'hit')}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '8px 14px', borderRadius: '8px', cursor: diceRolling ? 'wait' : 'pointer',
                            background: hitFresh ? 'var(--accent, var(--surface))' : 'var(--surface, #1a1205)',
                            border: `2px solid ${hitFresh ? 'var(--gold)' : 'var(--border, #4a3010)'}`,
                            minWidth: '70px', minHeight: '48px', transition: 'all 0.15s', color: 'var(--text)',
                          }}
                        >
                          {hitFresh ? (
                            <>
                              <span style={{
                                fontSize: '20px', fontWeight: 800, fontFamily: 'Cinzel, serif',
                                color: hitResult.total === 20 ? '#40e040' : hitResult.total === 1 ? '#e04040' : 'var(--gold)',
                                textShadow: hitResult.total === 20 ? '0 0 10px #40e040' : hitResult.total === 1 ? '0 0 10px #e04040' : 'none',
                              }}>
                                {hitResult.total}
                              </span>
                              <span style={{ fontSize: '9px', color: hitResult.total === 20 ? '#40e040' : hitResult.total === 1 ? '#e04040' : 'var(--text-dim)' }}>
                                {hitResult.total === 20 ? 'NAT 20!' : hitResult.total === 1 ? 'NAT 1...' : 'to hit'}
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'Cinzel, serif' }}>Hit</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>1d20</span>
                            </>
                          )}
                        </button>

                        {/* Damage button */}
                        <button
                          className="spell-roll-btn"
                          disabled={diceRolling}
                          onClick={() => doRoll(item._id, item.damage, item.name, 'damage')}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '8px 14px', borderRadius: '8px', cursor: diceRolling ? 'wait' : 'pointer',
                            background: dmgFresh ? 'var(--accent, var(--surface))' : 'var(--surface, #1a1205)',
                            border: `2px solid ${dmgFresh ? 'var(--gold)' : 'var(--border, #4a3010)'}`,
                            minWidth: '70px', minHeight: '48px', transition: 'all 0.15s', color: 'var(--text)',
                          }}
                        >
                          {dmgFresh ? (
                            <>
                              <span style={{
                                fontSize: '20px', fontWeight: 800, fontFamily: 'Cinzel, serif',
                                color: 'var(--gold)',
                              }}>
                                {dmgResult.total}
                              </span>
                              <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                                {dmgResult.results ? `[${dmgResult.results.map(r => r.value).join(' + ')}]` : item.damageType}
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'Cinzel, serif' }}>Dmg</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{item.damage}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* AC badge for armor — with shield icon, medium size */}
                    {item.ac && (
                      <span style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '3px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 700,
                        fontFamily: 'Cinzel, serif',
                        color: 'var(--gold)',
                        background: 'var(--bg-dark, #0d0800)',
                        border: '1px solid var(--gold-dim)',
                      }}>
                        <ShieldIcon size={16} color="var(--gold, #c9a227)" />
                        {item.ac}
                      </span>
                    )}

                    {/* Cost */}
                    {item.cost && item.cost !== '—' && (
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)', minWidth: '55px', textAlign: 'right' }}>
                        {item.cost}
                      </span>
                    )}

                    {/* Weight */}
                    {item.weight && item.weight !== '—' && (
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', minWidth: '40px', textAlign: 'right' }}>
                        {item.weight}
                      </span>
                    )}

                    {/* Expand indicator */}
                    <span style={{ fontSize: '14px', color: 'var(--text-dim)', marginLeft: '4px' }}>
                      {isExpanded ? '−' : '+'}
                    </span>
                  </div>

                  {/* Properties row (always visible for weapons) */}
                  {item.properties && item.properties.length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {item.properties.map(prop => (
                        <span key={prop} style={{
                          padding: '1px 7px', borderRadius: '4px', fontSize: '10px',
                          background: 'var(--bg-dark, #0d0800)',
                          border: '1px solid var(--border, #4a3010)',
                          color: 'var(--text-dim)',
                          textTransform: 'capitalize',
                        }}>
                          {prop}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{
                      marginTop: '10px', paddingTop: '10px',
                      borderTop: '1px solid var(--border, #4a3010)',
                      fontSize: '13px', color: 'var(--text-dim)',
                      lineHeight: 1.5,
                    }}>
                      {/* Rarity badge */}
                      {item.rarity && item.rarity !== 'common' && (
                        <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px',
                            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px',
                            color: rarityColor(item.rarity),
                            border: `1px solid ${rarityColor(item.rarity)}`,
                            background: 'var(--bg-dark, #0d0800)',
                          }}>
                            {item.rarity.replace('-', ' ')}
                          </span>
                          {item.magical && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Magic Item</span>}
                          {item.attunement && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>(requires attunement)</span>}
                        </div>
                      )}

                      {/* AC display for armor — bigger with shield */}
                      {item.ac && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          marginBottom: '8px', padding: '8px 12px', borderRadius: '8px',
                          background: 'var(--bg-dark, #0d0800)',
                          border: '1px solid var(--gold-dim, #7a5c10)',
                          width: 'fit-content',
                        }}>
                          <ShieldIcon size={28} color="var(--gold, #c9a227)" />
                          <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                              Armor Class
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'Cinzel, serif' }}>
                              {item.ac}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Weapon stats panel — damage type + range */}
                      {item.category === 'weapon' && item.damageType && (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          {/* Damage info */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 12px', borderRadius: '8px',
                            background: 'var(--bg-dark, #0d0800)',
                            border: `1px solid ${DMG_COLORS[item.damageType] || 'var(--border)'}`,
                          }}>
                            <SwordIcon size={20} color={DMG_COLORS[item.damageType] || 'var(--text-dim)'} />
                            <div>
                              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Damage
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '18px', fontWeight: 700, color: DMG_COLORS[item.damageType] || 'var(--text)', fontFamily: 'Cinzel, serif' }}>
                                  {item.damage}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: DMG_COLORS[item.damageType] || 'var(--text-dim)', textTransform: 'capitalize' }}>
                                  {item.damageType}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Range info (for thrown/ammunition weapons) */}
                          {(() => {
                            const rangeProp = (item.properties || []).find(p => p.match(/ammunition|thrown/i));
                            const rangeMatch = rangeProp && rangeProp.match(/\((\d+)\/(\d+)\)/);
                            if (!rangeMatch) return null;
                            return (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 12px', borderRadius: '8px',
                                background: 'var(--bg-dark, #0d0800)',
                                border: '1px solid var(--border, #4a3010)',
                              }}>
                                <span style={{ fontSize: '18px' }}>🏹</span>
                                <div>
                                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Range
                                  </div>
                                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontFamily: 'Cinzel, serif' }}>
                                    {rangeMatch[1]} / {rangeMatch[2]} ft.
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}


                      {item.strReq > 0 && (
                        <div style={{ marginBottom: '4px' }}>
                          <strong style={{ color: 'var(--text)' }}>Strength Required:</strong> {item.strReq}
                        </div>
                      )}
                      {item.stealthDisadv && (
                        <div style={{ marginBottom: '4px', color: '#ff5050' }}>
                          Disadvantage on Stealth checks
                        </div>
                      )}
                      {item.description && (
                        <div style={{ marginTop: '6px' }}>{item.description}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
