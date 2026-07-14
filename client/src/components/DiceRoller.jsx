import { useState, useCallback, useRef } from 'react';
import { useDice, FORCE_PRESETS } from '../context/DiceContext';

const DICE = [
  { die: 'd4',   sides: 4 },
  { die: 'd6',   sides: 6 },
  { die: 'd8',   sides: 8 },
  { die: 'd10',  sides: 10 },
  { die: 'd12',  sides: 12 },
  { die: 'd20',  sides: 20 },
  { die: 'd100', sides: 100, label: 'd%' },
];

export default function DiceRoller({ onClose }) {
  const { rollDice3D, diceForce, setDiceForce } = useDice();
  const [queue, setQueue] = useState({});
  const [results, setResults] = useState(null);
  const [rolling, setRolling] = useState(false);

  const addDie = (die) => {
    setQueue(p => ({ ...p, [die]: (p[die] || 0) + 1 }));
    setResults(null);
  };

  const removeDie = (die) => {
    setQueue(p => {
      const n = { ...p };
      if (n[die] > 1) n[die]--;
      else delete n[die];
      return n;
    });
    setResults(null);
  };

  const roll = useCallback(async () => {
    if (rolling) return;
    const entries = Object.entries(queue).filter(([, n]) => n > 0);
    if (!entries.length) return;

    const dice3d = [];
    for (const [die, count] of entries) {
      const sides = DICE.find(d => d.die === die).sides;
      for (let i = 0; i < count; i++) {
        dice3d.push({ die, sides });
      }
    }

    setRolling(true);
    setResults(null);
    const { results: diceResults } = await rollDice3D(dice3d);
    setResults(diceResults);
    setRolling(false);
  }, [queue, rolling, rollDice3D]);

  const quickRoll = async (die) => {
    const sides = DICE.find(d => d.die === die).sides;
    setQueue({ [die]: 1 });
    setRolling(true);
    setResults(null);
    const { results: diceResults } = await rollDice3D([{ die, sides }]);
    setResults(diceResults);
    setRolling(false);
  };

  const clear = () => {
    setQueue({});
    setResults(null);
    setRolling(false);
  };

  const total = results ? results.reduce((s, r) => s + r.value, 0) : null;
  const queueCount = Object.values(queue).reduce((s, n) => s + n, 0);
  const notation = Object.entries(queue).filter(([, n]) => n > 0).map(([d, n]) => `${n}${d}`).join(' + ');
  const activePreset = FORCE_PRESETS.find(p => p.value === diceForce) || FORCE_PRESETS[1];

  return (
    <div style={{
      position: 'fixed', bottom: '88px', left: '20px',
      width: '320px',
      background: 'var(--bg-dark, #0d0800)',
      border: '2px solid var(--gold-dim, #7a5c10)',
      borderRadius: '12px',
      zIndex: 1000,
      boxShadow: '0 8px 40px rgba(0,0,0,0.85)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border, #4a3010)',
      }}>
        <span style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold, #c9a227)', fontSize: '13px', letterSpacing: '2px' }}>
          DICE ROLLER
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none',
          color: 'var(--text-dim, #a08060)', cursor: 'pointer',
          fontSize: '20px', lineHeight: 1, padding: '0 4px',
        }}>×</button>
      </div>

      {/* Results tray */}
      <div style={{
        minHeight: '80px',
        padding: '14px',
        display: 'flex', flexWrap: 'wrap', gap: '8px',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-dark)',
        borderBottom: '1px solid var(--border, #4a3010)',
      }}>
        {rolling && !results && (
          <div style={{
            color: 'var(--gold)', fontFamily: 'Cinzel, serif',
            fontSize: '14px', letterSpacing: '2px',
          }}>
            Rolling...
          </div>
        )}
        {results && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              {results.map((r, i) => {
                const isMax = r.value === r.sides;
                const isMin = r.value === 1;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '44px', height: '44px',
                      borderRadius: r.die === 'd6' ? '8px' : '50%',
                      fontWeight: 800, fontSize: r.sides >= 100 ? '14px' : '18px',
                      fontFamily: 'Cinzel, serif',
                      background: isMax ? 'var(--accent, var(--surface))' : isMin ? 'var(--surface, #1a1205)' : 'var(--surface, #1a1205)',
                      border: `2px solid ${isMax ? 'var(--gold)' : isMin ? '#aa3030' : 'var(--border)'}`,
                      color: isMax ? 'var(--gold)' : isMin ? '#ff5050' : 'var(--text)',
                      boxShadow: isMax ? '0 0 10px rgba(201,162,39,0.4)' : isMin ? '0 0 10px rgba(170,48,48,0.3)' : 'none',
                    }}>
                      {r.value}
                    </span>
                    <span style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{r.die}</span>
                  </div>
                );
              })}
            </div>
            {results.length > 1 && (
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                Total: <strong style={{ color: 'var(--gold)', fontSize: '22px', fontFamily: 'Cinzel, serif' }}>{total}</strong>
              </div>
            )}
          </div>
        )}
        {!rolling && !results && (
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', fontStyle: 'italic' }}>
            Select dice and roll — double-click to quick-roll
          </div>
        )}
      </div>

      {/* Die selector */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {DICE.map(({ die, label }) => {
            const count = queue[die] || 0;
            return (
              <div key={die} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', width: '38px' }}>
                <button
                  className="dice-select-btn"
                  onClick={() => addDie(die)}
                  onDoubleClick={() => quickRoll(die)}
                  onContextMenu={e => { e.preventDefault(); removeDie(die); }}
                  title={`Left-click to add, right-click to remove, double-click to quick-roll`}
                  style={{
                    width: '38px', height: '38px', borderRadius: '8px', cursor: 'pointer',
                    background: count > 0 ? 'var(--accent, var(--surface))' : 'var(--surface, #1a1205)',
                    border: count > 0 ? '2px solid var(--gold, #c9a227)' : '1px solid var(--border, #4a3010)',
                    color: count > 0 ? 'var(--gold, #c9a227)' : 'var(--text-dim, #a08060)',
                    fontFamily: 'Cinzel, serif', fontSize: '11px', fontWeight: 700,
                    transition: 'all 0.1s',
                  }}
                >
                  {label || die}
                </button>
                {count > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 700 }}>{count}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="dice-pm-btn" onClick={() => removeDie(die)} style={{
                        width: '18px', height: '18px', borderRadius: '50%', cursor: 'pointer',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        color: 'var(--text)', fontSize: '12px', fontWeight: 700, lineHeight: 1, padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>−</button>
                      <button className="dice-pm-btn" onClick={() => addDie(die)} style={{
                        width: '18px', height: '18px', borderRadius: '50%', cursor: 'pointer',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        color: 'var(--text)', fontSize: '12px', fontWeight: 700, lineHeight: 1, padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>+</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Force selector — global, applies to ALL dice rolls */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px',
          padding: '6px 8px', borderRadius: '8px',
          background: 'var(--surface, #1a1205)',
          border: '1px solid var(--border, #4a3010)',
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text-dim, #a08060)', letterSpacing: '1px', textTransform: 'uppercase', marginRight: '2px' }}>
            THROW
          </span>
          {FORCE_PRESETS.map((preset) => {
            const isActive = diceForce === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => setDiceForce(preset.value)}
                title={preset.desc}
                style={{
                  flex: 1,
                  padding: '5px 0', borderRadius: '6px', cursor: 'pointer',
                  background: isActive ? `${preset.color}22` : 'transparent',
                  border: isActive ? `2px solid ${preset.color}` : '1px solid transparent',
                  color: isActive ? preset.color : 'var(--text-dim, #a08060)',
                  fontSize: '11px', fontFamily: 'Cinzel, serif', fontWeight: isActive ? 800 : 600,
                  transition: 'all 0.15s',
                  textShadow: isActive ? `0 0 8px ${preset.color}60` : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                }}
              >
                <span style={{ fontSize: '14px', lineHeight: 1 }}>{preset.icon}</span>
                <span style={{ fontSize: '9px' }}>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Current force indicator */}
        <div style={{
          fontSize: '10px', color: activePreset.color, textAlign: 'center',
          marginBottom: '8px', fontStyle: 'italic', opacity: 0.8,
        }}>
          {activePreset.desc} — applies to all rolls
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {queueCount > 0 && (
            <div style={{ flex: 1, fontSize: '11px', color: 'var(--text-dim)' }}>
              <strong style={{ color: 'var(--gold)' }}>{notation}</strong>
            </div>
          )}
          <button
            className="dice-action-btn"
            onClick={roll}
            disabled={rolling || queueCount === 0}
            style={{
              flex: queueCount > 0 ? undefined : 1,
              padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
              background: queueCount > 0 && !rolling ? 'var(--gold, #c9a227)' : 'var(--surface)',
              border: '1px solid var(--gold-dim)',
              color: queueCount > 0 && !rolling ? 'var(--bg-dark, #000)' : 'var(--text-dim)',
              fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '13px',
              opacity: rolling ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            {rolling ? 'Rolling...' : 'Roll!'}
          </button>
          {(queueCount > 0 || results) && (
            <button
              className="dice-action-btn"
              onClick={clear}
              style={{
                padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text-dim)', fontSize: '11px',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
