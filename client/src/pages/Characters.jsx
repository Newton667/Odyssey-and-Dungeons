import { Link, useNavigate } from 'react-router-dom';
import { useCharacterList } from '../hooks/useCharacterSync';

function hpColor(current, max) {
  const pct = current / max;
  if (pct > 0.5) return 'var(--hp-bar)';
  if (pct > 0.25) return 'var(--hp-low)';
  return 'var(--hp-crit)';
}

function modifier(score) {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

export default function Characters() {
  const { characters, loading, deleteCharacter } = useCharacterList();
  const navigate = useNavigate();

  const deleteChar = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this character?')) return;
    deleteCharacter(id);
  };

  if (loading) return <div className="page" style={{ color: 'var(--text-dim)' }}>Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2 style={{ fontSize: '28px' }}>Characters</h2>
        <Link to="/characters/new" className="btn btn-primary">+ New Character</Link>
      </div>

      {characters.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>No characters yet.</p>
          <Link to="/characters/new" className="btn btn-primary">Create your first character</Link>
        </div>
      ) : (
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {characters.map((c) => (
            <Link key={c._id} to={`/characters/${c._id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: '#2a1a05', border: '2px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', flexShrink: 0, overflow: 'hidden',
                  }}>
                    {c.avatarUrl ? <img src={c.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🧙'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '20px', marginBottom: '6px' }}>{c.name}</h3>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {c.race && <span className="badge badge-race">{c.race}</span>}
                      {c.class && <span className="badge badge-class">{c.class}{c.subclass ? ` · ${c.subclass}` : ''}</span>}
                      <span className="badge badge-level">Lv {c.level}</span>
                    </div>
                  </div>
                </div>

                {c.maxHp > 0 && (
                  <div style={{ marginTop: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                      <span>HP</span>
                      <span style={{ color: hpColor(c.currentHp, c.maxHp), fontWeight: 600 }}>
                        {c.currentHp} / {c.maxHp}
                      </span>
                    </div>
                    <div className="hp-bar-wrap">
                      <div className="hp-bar-fill" style={{
                        width: `${Math.max(0, (c.currentHp / c.maxHp) * 100)}%`,
                        background: hpColor(c.currentHp, c.maxHp),
                      }} />
                    </div>
                  </div>
                )}

                {/* Bottom bar: delete */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                    onClick={(e) => deleteChar(c._id, e)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
