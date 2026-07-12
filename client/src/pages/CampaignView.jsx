import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function CampaignView() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rolls, setRolls] = useState([]);
  const [characters, setCharacters] = useState({});
  const [tab, setTab] = useState('players');
  const [playerName] = useState(() => localStorage.getItem('ond-player-name') || 'Unknown');
  const lastRollTime = useRef(null);
  const pollRef = useRef(null);

  // Load campaign
  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then(r => r.json())
      .then(data => { setCampaign(data); setRolls(data.rollLog || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  // Load character data for all players
  useEffect(() => {
    if (!campaign?.players) return;
    const charIds = campaign.players.filter(p => p.characterId).map(p => p.characterId);
    if (charIds.length === 0) return;
    Promise.all(charIds.map(cid =>
      fetch(`/api/characters/${cid}`).then(r => r.ok ? r.json() : null).catch(() => null)
    )).then(results => {
      const map = {};
      results.forEach(c => { if (c) map[c._id] = c; });
      setCharacters(map);
    });
  }, [campaign?.players]);

  // Poll for new rolls and player updates every 5 seconds
  const poll = useCallback(() => {
    const since = lastRollTime.current || (rolls.length > 0 ? rolls[rolls.length - 1].timestamp : null);
    const params = since ? `?since=${encodeURIComponent(since)}` : '';

    Promise.all([
      fetch(`/api/campaigns/${id}/rolls${params}`).then(r => r.json()).catch(() => []),
      fetch(`/api/campaigns/${id}/players`).then(r => r.json()).catch(() => null),
    ]).then(([newRolls, players]) => {
      if (newRolls.length > 0) {
        setRolls(prev => {
          const existingIds = new Set(prev.map(r => r._id));
          const unique = newRolls.filter(r => !existingIds.has(r._id));
          const updated = [...prev, ...unique].slice(-200);
          if (updated.length > 0) lastRollTime.current = updated[updated.length - 1].timestamp;
          return updated;
        });
      }
      if (players) {
        setCampaign(prev => prev ? { ...prev, players } : prev);
      }
    });
  }, [id, rolls]);

  useEffect(() => {
    pollRef.current = setInterval(poll, 5000);
    return () => clearInterval(pollRef.current);
  }, [poll]);

  // Link character to campaign
  const linkCharacter = async (characterId, characterName) => {
    await fetch(`/api/campaigns/${id}/player`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, characterId, characterName }),
    });
    // Reload
    const res = await fetch(`/api/campaigns/${id}`);
    const data = await res.json();
    setCampaign(data);
  };

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>;
  if (!campaign) return <div className="page" style={{ textAlign: 'center', padding: '60px' }}>Campaign not found.</div>;

  const isPlayer = campaign.players?.some(p => p.playerName === playerName);
  const currentPlayer = campaign.players?.find(p => p.playerName === playerName);

  return (
    <div className="page" style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <Link to="/campaigns" style={{ fontSize: '13px', color: 'var(--text-dim)', textDecoration: 'none' }}>&larr; Back to Campaigns</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '8px' }}>
          <div>
            <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>{campaign.name}</h1>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {campaign.dmName && <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>DM: <strong style={{ color: 'var(--text)' }}>{campaign.dmName}</strong></span>}
              {campaign.setting && <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>| {campaign.setting}</span>}
              <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>| {campaign.players?.length || 0} players</span>
            </div>
          </div>
          <div style={{ padding: '8px 14px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '1px', marginBottom: '2px' }}>Join Code</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '20px', color: 'var(--gold)', letterSpacing: '3px' }}>{campaign.joinCode}</div>
          </div>
        </div>
        {campaign.description && <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '8px' }}>{campaign.description}</p>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border)', marginBottom: '16px' }}>
        {['players', 'rolls', 'sessions', 'notes'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
            color: tab === t ? 'var(--gold)' : 'var(--text-dim)',
            borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
            fontFamily: 'Cinzel, serif', fontSize: '13px', textTransform: 'capitalize',
            fontWeight: tab === t ? 700 : 400, marginBottom: '-2px',
          }}>{t}</button>
        ))}
      </div>

      {/* Players Tab */}
      {tab === 'players' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {(campaign.players || []).map((p, i) => {
              const charData = p.characterId ? characters[p.characterId] : null;
              return (
                <div key={i} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    {charData?.avatarUrl ? (
                      <img src={charData.avatarUrl} alt="" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'var(--text-dim)', fontFamily: 'Cinzel, serif', fontWeight: 700 }}>
                        {(p.playerName || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{p.playerName}</div>
                      <span className="badge" style={{ background: p.role === 'dm' ? '#3a2a0a' : '#1a1a3a', border: `1px solid ${p.role === 'dm' ? 'var(--gold-dim)' : '#3a3a6a'}`, color: p.role === 'dm' ? 'var(--gold)' : '#8080c0', fontSize: '10px' }}>
                        {p.role === 'dm' ? 'DM' : 'Player'}
                      </span>
                    </div>
                  </div>
                  {charData ? (
                    <div style={{ background: 'var(--surface)', borderRadius: '6px', padding: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--gold)', fontSize: '14px' }}>{charData.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Lv {charData.level}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {charData.race && <span>{charData.race}</span>}
                        {charData.class && <span>{charData.class}{charData.subclass ? ` (${charData.subclass})` : ''}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>HP </span>
                          <span style={{ fontWeight: 700, color: charData.currentHp <= charData.maxHp * 0.25 ? '#f87171' : charData.currentHp <= charData.maxHp * 0.5 ? '#fbbf24' : '#4ade80' }}>
                            {charData.currentHp}/{charData.maxHp}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>AC </span>
                          <span style={{ fontWeight: 700 }}>{charData.armorClass}</span>
                        </div>
                      </div>
                    </div>
                  ) : p.characterName ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Character: {p.characterName}</div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>No character linked</div>
                  )}
                  {p.playerName === playerName && !p.characterId && (
                    <LinkCharacterBtn onLink={linkCharacter} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rolls Tab */}
      {tab === 'rolls' && (
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Live — updates every 5 seconds
          </div>
          {rolls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>No rolls yet. Roll from your character sheet and they'll appear here!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '600px', overflowY: 'auto' }}>
              {[...rolls].reverse().map((roll, i) => (
                <div key={roll._id || i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                  background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border)',
                }}>
                  {roll.avatarUrl ? (
                    <img src={roll.avatarUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: 'var(--text-dim)', fontWeight: 700 }}>
                      {(roll.playerName || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px' }}>
                      <strong style={{ color: 'var(--gold)' }}>{roll.characterName || roll.playerName}</strong>
                      <span style={{ color: 'var(--text-dim)' }}> rolled </span>
                      <span>{roll.label}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {roll.formula}
                      {roll.playerName && roll.characterName && <span> | {roll.playerName}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '18px', fontWeight: 800, fontFamily: 'Cinzel, serif',
                      color: roll.tag === 'CRIT' ? '#ff4444' : roll.tag === 'FAIL' ? '#f87171' : 'var(--gold)',
                    }}>{roll.total}</div>
                    {roll.tag && <div style={{ fontSize: '9px', color: roll.tag === 'CRIT' ? '#ff4444' : roll.tag === 'ADV' ? '#4ade80' : roll.tag === 'DIS' ? '#f87171' : 'var(--text-dim)', textTransform: 'uppercase' }}>{roll.tag}</div>}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', minWidth: '50px', textAlign: 'right' }}>
                    {new Date(roll.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {tab === 'sessions' && (
        <div>
          {(campaign.sessions || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>No sessions logged yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {campaign.sessions.map((s, i) => (
                <div key={i} className="card" style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--gold)' }}>Session {s.sessionNumber}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{new Date(s.date).toLocaleDateString()}</span>
                  </div>
                  {s.summary && <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{s.summary}</p>}
                  {s.xpAwarded > 0 && <span style={{ fontSize: '12px', color: 'var(--gold)' }}>+{s.xpAwarded} XP</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {tab === 'notes' && (
        <div>
          <textarea
            value={campaign.notes || ''}
            onChange={e => setCampaign(prev => ({ ...prev, notes: e.target.value }))}
            onBlur={() => {
              fetch(`/api/campaigns/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: campaign.notes }),
              });
            }}
            rows={14}
            placeholder="Campaign notes, quest log, NPC info..."
            style={{ width: '100%', resize: 'vertical', fontSize: '13px', padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
          />
        </div>
      )}
    </div>
  );
}

// Sub-component: Link character picker
function LinkCharacterBtn({ onLink }) {
  const [open, setOpen] = useState(false);
  const [chars, setChars] = useState([]);
  const [localChars, setLocalChars] = useState([]);

  useEffect(() => {
    if (!open) return;
    // Load from server
    fetch('/api/characters').then(r => r.json()).then(data => setChars(Array.isArray(data) ? data : [])).catch(() => {});
    // Load from localStorage
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('ond-char-'));
      const local = keys.map(k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }).filter(Boolean);
      setLocalChars(local);
    } catch { /* noop */ }
  }, [open]);

  const allChars = [...chars];
  // Add local chars that aren't in server list
  const serverIds = new Set(chars.map(c => c._id));
  localChars.forEach(c => { if (!serverIds.has(c._id)) allChars.push(c); });

  return (
    <div style={{ marginTop: '8px' }}>
      <button onClick={() => setOpen(!open)} className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 12px' }}>
        {open ? 'Cancel' : 'Link Character'}
      </button>
      {open && allChars.length > 0 && (
        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {allChars.map(c => (
            <button key={c._id} onClick={() => { onLink(c._id, c.name); setOpen(false); }}
              className="cc-skill"
              style={{ textAlign: 'left', padding: '6px 10px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)', fontSize: '12px' }}>
              <strong style={{ color: 'var(--gold)' }}>{c.name}</strong> — {c.race} {c.class} Lv{c.level}
            </button>
          ))}
        </div>
      )}
      {open && allChars.length === 0 && (
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>No characters found. Create one first!</div>
      )}
    </div>
  );
}
