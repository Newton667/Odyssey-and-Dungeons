import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { VERSION } from '../version';
import changelogRaw from '../../../CHANGELOG.md?raw';

// Strip the HTML comment block and the Unreleased section
function cleanChangelog(raw) {
  let text = raw.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/---\s*\n\s*## vX\.X\.X\s*—\s*Unreleased\s*\n/gi, '');
  return text.trim();
}

// Simple markdown-to-JSX renderer for changelog format — uses CSS vars for theming
function renderMarkdown(md) {
  const lines = md.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('# ')) {
      elements.push(<h1 key={i} style={{ fontSize: '22px', color: 'var(--text-primary, var(--text))', marginBottom: '12px', fontFamily: 'Cinzel, serif' }}>{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} style={{ fontSize: '16px', color: 'var(--text-primary, var(--text))', margin: '20px 0 8px', fontFamily: 'Cinzel, serif', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} style={{ fontSize: '13px', color: 'var(--accent, var(--text))', margin: '12px 0 4px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{line.slice(4)}</h3>);
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />);
    } else if (line.startsWith('- ')) {
      const content = line.slice(2);
      const parts = content.split(/(\*\*.*?\*\*)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} style={{ color: 'var(--text-primary, var(--text))' }}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      elements.push(
        <div key={i} style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '4px', paddingLeft: '12px', lineHeight: 1.6 }}>
          <span style={{ color: 'var(--accent, var(--text-dim))', marginRight: '6px' }}>•</span>{parts}
        </div>
      );
    } else if (line.trim() === '') {
      // skip
    } else {
      elements.push(<p key={i} style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '6px', lineHeight: 1.5 }}>{line}</p>);
    }
    i++;
  }
  return elements;
}

export default function Home() {
  const [status, setStatus] = useState('checking...');
  const [updateStatus, setUpdateStatus] = useState(null);
  const [updateMsg, setUpdateMsg] = useState('');
  const [showChangelog, setShowChangelog] = useState(false);

  const checkForUpdates = () => {
    setUpdateStatus('checking');
    fetch('/api/check-update')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setUpdateStatus('error'); setUpdateMsg(data.error); }
        else if (data.updateAvailable) { setUpdateStatus('available'); setUpdateMsg(`${data.local} → ${data.remote}`); }
        else { setUpdateStatus('up-to-date'); setUpdateMsg(''); }
      })
      .catch(() => { setUpdateStatus('error'); setUpdateMsg('Could not reach server'); });
  };

  const pullUpdate = () => {
    setUpdateStatus('updating');
    fetch('/api/pull-update', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.ok) { setUpdateStatus('done'); setUpdateMsg('Updated! Restart the app to apply.'); }
        else { setUpdateStatus('error'); setUpdateMsg(data.error || 'Update failed'); }
      })
      .catch(() => { setUpdateStatus('error'); setUpdateMsg('Update failed'); });
  };

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(() => setStatus('Connected'))
      .catch(() => setStatus('Offline — start the server'));
  }, []);

  const btnStyle = {
    padding: '6px 14px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer',
    background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)',
    fontWeight: 600, fontFamily: 'Cinzel, serif',
  };

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

      {/* Bottom bar: version + updates + changelog */}
      <div style={{ position: 'fixed', bottom: '16px', right: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {updateStatus === 'available' && (
          <button onClick={pullUpdate} style={{ ...btnStyle, background: 'linear-gradient(135deg, #1a3a1a, #2a5a2a)', border: '1px solid #4ade80', color: '#4ade80' }}>
            Update Available ({updateMsg})
          </button>
        )}
        {updateStatus === 'checking' && <span style={{ fontSize: '12px', color: 'var(--gold)' }}>Checking...</span>}
        {updateStatus === 'updating' && <span style={{ fontSize: '12px', color: 'var(--gold)' }}>Updating...</span>}
        {updateStatus === 'up-to-date' && <span style={{ fontSize: '12px', color: '#4ade80' }}>Up to date</span>}
        {updateStatus === 'done' && <span style={{ fontSize: '12px', color: '#4ade80' }}>{updateMsg}</span>}
        {updateStatus === 'error' && <span style={{ fontSize: '12px', color: '#f87171' }}>{updateMsg}</span>}

        <button onClick={checkForUpdates} disabled={updateStatus === 'checking' || updateStatus === 'updating'}
          style={btnStyle} title="Check for updates from GitHub">
          Check Updates
        </button>
        <button onClick={() => setShowChangelog(true)} style={btnStyle} title="View changelog">
          Changelog
        </button>
        <span style={{ ...btnStyle, cursor: 'default', color: 'var(--text-primary, var(--text))', background: 'var(--accent, var(--surface))', border: '1px solid var(--border)' }}>
          {VERSION}
        </span>
      </div>

      {/* Changelog modal */}
      {showChangelog && (
        <div onClick={() => setShowChangelog(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '90%', maxWidth: '700px', maxHeight: '80vh',
            background: 'var(--bg-secondary, var(--bg-dark, #1a1209))', border: '2px solid var(--border)',
            borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontFamily: 'Cinzel, serif', color: 'var(--text-primary, var(--text))', fontSize: '16px', letterSpacing: '2px' }}>CHANGELOG</span>
              <button onClick={() => setShowChangelog(false)} style={{
                background: 'none', border: 'none', color: 'var(--text-dim)',
                fontSize: '22px', cursor: 'pointer', padding: '0 4px', lineHeight: 1,
              }}>×</button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', textAlign: 'left' }}>
              {renderMarkdown(cleanChangelog(changelogRaw))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
