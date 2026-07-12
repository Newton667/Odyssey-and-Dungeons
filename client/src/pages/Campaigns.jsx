import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  active: { bg: '#0f2a1a', border: '#2a6040', text: '#60d090' },
  paused: { bg: '#2a2a00', border: '#6a6a00', text: '#d0d060' },
  completed: { bg: '#1a1a2a', border: '#3a3a6a', text: '#8080c0' },
};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [form, setForm] = useState({ name: '', setting: '', dmName: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState(() => localStorage.getItem('ond-player-name') || '');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    fetch('/api/campaigns').then(r => r.json()).then(data => { setCampaigns(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    const dmName = form.dmName || joinName;
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, dmName, players: [{ playerName: dmName, role: 'dm' }] }),
    });
    const data = await res.json();
    if (res.ok) {
      setCampaigns(prev => [...prev, data]);
      setCreating(false);
      setForm({ name: '', setting: '', dmName: '', description: '' });
      localStorage.setItem('ond-player-name', dmName);
    }
  };

  const joinCampaign = async (e) => {
    e.preventDefault();
    setJoinError('');
    if (!joinCode.trim() || !joinName.trim()) return;
    localStorage.setItem('ond-player-name', joinName);
    const res = await fetch('/api/campaigns/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ joinCode: joinCode.trim(), playerName: joinName.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      // Add to list if not already there
      setCampaigns(prev => {
        if (prev.find(c => c._id === data._id)) return prev.map(c => c._id === data._id ? data : c);
        return [...prev, data];
      });
      setJoining(false);
      setJoinCode('');
    } else {
      setJoinError(data.error || 'Failed to join');
    }
  };

  if (loading) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2 style={{ fontSize: '28px' }}>Campaigns</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" onClick={() => { setJoining(v => !v); setCreating(false); }}>
            {joining ? '✕ Cancel' : 'Join Campaign'}
          </button>
          <button className="btn btn-primary" onClick={() => { setCreating(v => !v); setJoining(false); }}>
            {creating ? '✕ Cancel' : '+ New Campaign'}
          </button>
        </div>
      </div>

      {/* Join Campaign */}
      {joining && (
        <form onSubmit={joinCampaign} className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Join a Campaign</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Your Name *</label>
              <input required value={joinName} onChange={e => setJoinName(e.target.value)} placeholder="Your name" style={{ width: '180px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Join Code *</label>
              <input required value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6}
                style={{ width: '120px', textAlign: 'center', fontSize: '18px', fontFamily: 'monospace', letterSpacing: '3px', fontWeight: 700 }} />
            </div>
            <button type="submit" className="btn btn-primary">Join</button>
          </div>
          {joinError && <div style={{ color: '#f87171', fontSize: '13px', marginTop: '8px' }}>{joinError}</div>}
        </form>
      )}

      {/* Create Campaign */}
      {creating && (
        <form onSubmit={create} className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>New Campaign</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            {[['name', 'Campaign Name *', true], ['setting', 'Setting'], ['dmName', 'DM Name']].map(([key, label, req]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{label}</label>
                <input required={!!req} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%', resize: 'vertical' }} />
          </div>
          <button type="submit" className="btn btn-primary">Create Campaign</button>
        </form>
      )}

      {campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          <p>No campaigns yet. Create one or join with a code!</p>
        </div>
      ) : (
        <div className="grid-3">
          {campaigns.map(c => {
            const sc = STATUS_COLORS[c.status] || STATUS_COLORS.active;
            return (
              <Link key={c._id} to={`/campaigns/${c._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="card cc-skill" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '18px' }}>{c.name}</h3>
                    <span className="badge" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>{c.status}</span>
                  </div>
                  {c.setting && <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>Setting: {c.setting}</p>}
                  {c.dmName && <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px' }}>DM: {c.dmName}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'var(--gold-dim)' }}>{c.sessions?.length || 0} sessions</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{c.players?.length || 0} players</p>
                  </div>
                  {c.joinCode && (
                    <div style={{ marginTop: '8px', padding: '4px 8px', background: 'var(--surface)', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Join Code:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--gold)', letterSpacing: '2px', fontSize: '14px' }}>{c.joinCode}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
