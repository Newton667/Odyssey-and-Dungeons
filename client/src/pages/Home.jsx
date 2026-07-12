import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('checking...');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(() => setStatus('Connected'))
      .catch(() => setStatus('Offline — start the server'));
  }, []);

  return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '60px' }}>
      <h1 style={{ fontSize: '48px', letterSpacing: '4px', marginBottom: '8px' }}>OND</h1>
      <p style={{ color: 'var(--text-dim)', fontSize: '16px', marginBottom: '40px' }}>
        Your local D&D companion
      </p>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}>
        {[
          { to: '/characters', icon: '🧙', label: 'Characters', desc: 'Manage your party' },
          { to: '/campaigns', icon: '📜', label: 'Campaigns', desc: 'Track your adventures' },
          { to: '/spells', icon: '✨', label: 'Spells', desc: 'Browse the spellbook' },
          { to: '/equipment', icon: '⚔️', label: 'Equipment', desc: 'Browse weapons & gear' },
          { to: '/homebrew', icon: '🔮', label: 'Homebrewer', desc: 'Create & share custom content' },
        ].map(({ to, icon, label, desc }) => (
          <Link key={to} to={to} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ width: '200px', height: '180px', padding: '28px 20px', textAlign: 'center', transition: 'transform 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}
            >
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>{icon}</div>
              <h3 style={{ marginBottom: '6px' }}>{label}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-dim)' }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: status === 'Connected' ? 'var(--green-light)' : 'var(--red-light)',
          display: 'inline-block',
        }} />
        Backend: {status}
      </div>

      <div style={{ position: 'fixed', bottom: '16px', right: '20px', fontSize: '16px', color: 'var(--text-dim)', opacity: 0.5, fontFamily: 'Cinzel, serif', fontWeight: 600 }}>
        v0.2.0
      </div>
    </div>
  );
}
