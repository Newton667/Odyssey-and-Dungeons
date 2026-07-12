import { useState, useEffect } from 'react';
import { useTheme, PRESETS, DICE_PRESETS } from '../context/ThemeContext';

const CUSTOMIZABLE = [
  { key: '--gold',      label: 'Accent',          desc: 'Headings, highlights, active states' },
  { key: '--gold-light',label: 'Accent Hover',     desc: 'Hover / bright accent' },
  { key: '--gold-dim',  label: 'Accent Dim',       desc: 'Subdued accent, badge borders' },
  { key: '--bg-dark',   label: 'Background',       desc: 'Main page background' },
  { key: '--bg-gradient',label:'BG Gradient Top',  desc: 'Radial gradient highlight at top' },
  { key: '--bg-card',   label: 'Card Background',  desc: 'Cards and panels' },
  { key: '--border',    label: 'Border',           desc: 'Card and input borders' },
  { key: '--text',      label: 'Text',             desc: 'Primary text color' },
  { key: '--text-dim',  label: 'Text Secondary',   desc: 'Labels, subtitles, hints' },
  { key: '--nav-bg',    label: 'Navbar',           desc: 'Top navigation background' },
  { key: '--input-bg',  label: 'Input Background', desc: 'Text inputs and selects' },
  { key: '--accent',    label: 'Accent Surface',   desc: 'Modifier bubbles, badge fills' },
];

function previewVars(vars) {
  return {
    bg:     vars['--bg-dark']  || '#1a1209',
    card:   vars['--bg-card']  || '#231a0e',
    accent: vars['--gold']     || '#c9a227',
    text:   vars['--text']     || '#e8d5b0',
    border: vars['--border']   || '#5c3d1e',
  };
}

function ThemeCard({ name, vars, isActive, onClick, onDelete, onSave }) {
  const p = previewVars(vars);
  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={onClick}
        style={{
          borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
          border: `2px solid ${isActive ? 'var(--gold)' : 'var(--border)'}`,
          transition: 'border-color 0.15s, transform 0.1s',
          transform: isActive ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        <div style={{ background: p.bg, padding: '10px', height: '80px', position: 'relative' }}>
          <div style={{ background: p.card, borderRadius: '4px', border: `1px solid ${p.border}`, padding: '5px 7px', marginBottom: '5px' }}>
            <div style={{ fontSize: '8px', color: p.accent, fontFamily: 'Cinzel, serif', fontWeight: 700, marginBottom: '2px' }}>Character Name</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ height: '5px', width: '36px', borderRadius: '3px', background: p.accent, opacity: 0.8 }} />
              <div style={{ height: '5px', width: '20px', borderRadius: '3px', background: p.border }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '3px' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: p.card, borderRadius: '3px', border: `1px solid ${p.border}`, padding: '3px 4px', flex: 1 }}>
                <div style={{ height: '3px', background: p.accent, borderRadius: '2px', opacity: 0.7 }} />
                <div style={{ height: '3px', background: p.text, borderRadius: '2px', opacity: 0.25, marginTop: '2px' }} />
              </div>
            ))}
          </div>
          {isActive && (
            <div style={{ position: 'absolute', top: '5px', right: '5px', background: p.accent, borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: p.bg, fontWeight: 900 }}>✓</div>
          )}
        </div>
        <div style={{ background: p.card, padding: '7px 10px', borderTop: `1px solid ${p.border}` }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: p.text, marginBottom: '4px' }}>{name}</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[p.accent, p.border, p.text, p.bg].map((c, i) => (
              <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, border: `1px solid ${p.border}` }} />
            ))}
          </div>
        </div>
      </div>
      {onSave && (
        <button
          onClick={e => { e.stopPropagation(); onSave(); }}
          title="Overwrite with current colors"
          style={{
            position: 'absolute', top: '6px', right: '30px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: '#1a3a1a', border: '1px solid #2a6a2a',
            color: '#80e080', fontSize: '11px', lineHeight: '1',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2,
          }}
        >✎</button>
      )}
      {onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          title="Delete preset"
          style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: '#6a1a1a', border: '1px solid #8b2a2a',
            color: '#ff8080', fontSize: '12px', lineHeight: '1',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2,
          }}
        >×</button>
      )}
    </div>
  );
}

function HexInput({ value, onChange }) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);

  const display = editing ? draft : value;

  return (
    <input
      value={display}
      onFocus={() => { setEditing(true); setDraft(value); }}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        const v = draft.trim();
        if (/^#[0-9a-fA-F]{3}$/.test(v) || /^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') e.target.blur();
        if (e.key === 'Escape') { setEditing(false); setDraft(''); }
      }}
      style={{
        width: '82px', fontSize: '11px', fontFamily: 'monospace',
        padding: '3px 6px', background: 'var(--input-bg)', border: '1px solid var(--border)',
        color: 'var(--text)', borderRadius: '4px',
      }}
    />
  );
}

function ConfirmModal({ modal, onConfirm, onCancel }) {
  if (!modal) return null;
  const isDelete = modal.type === 'delete';
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onCancel}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '24px 28px', maxWidth: '360px', width: '90%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
          {isDelete ? 'Delete Preset' : 'Overwrite Preset'}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px', lineHeight: 1.5 }}>
          {isDelete
            ? <>Are you sure you want to delete <strong style={{ color: 'var(--text)' }}>"{modal.name}"</strong>? This cannot be undone.</>
            : <>Overwrite <strong style={{ color: 'var(--text)' }}>"{modal.name}"</strong> with your current colors?</>
          }
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" style={{ fontSize: '13px', padding: '7px 14px' }} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={isDelete ? 'btn btn-danger' : 'btn btn-primary'}
            style={{ fontSize: '13px', padding: '7px 14px' }}
            onClick={onConfirm}
          >
            {isDelete ? 'Delete' : 'Overwrite'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DiceThemeCard({ name, vars, isActive, onClick, onDelete, onSave }) {
  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={onClick}
        style={{
          borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
          border: `2px solid ${isActive ? 'var(--gold)' : 'var(--border)'}`,
          transition: 'border-color 0.15s, transform 0.1s',
          transform: isActive ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        <div style={{
          background: 'var(--bg-dark)', padding: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '90px', position: 'relative',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '10px',
            background: vars.bodyColor,
            border: `2px solid ${vars.edgeColor || vars.glowColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isActive ? `0 0 16px ${vars.glowColor}60` : `0 2px 8px rgba(0,0,0,0.5)`,
          }}>
            <span style={{
              fontFamily: 'Cinzel, serif', fontWeight: 800, fontSize: '22px',
              color: vars.textColor,
            }}>20</span>
          </div>
          {isActive && (
            <div style={{
              position: 'absolute', top: '6px', right: '6px',
              background: 'var(--gold)', borderRadius: '50%',
              width: '14px', height: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', color: 'var(--bg-dark)', fontWeight: 900,
            }}>✓</div>
          )}
        </div>
        <div style={{
          background: 'var(--bg-card)', padding: '7px 10px',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{name}</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[vars.bodyColor, vars.textColor, vars.edgeColor, vars.glowColor].filter(Boolean).map((c, i) => (
              <div key={i} style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: c, border: '1px solid var(--border)',
              }} />
            ))}
          </div>
        </div>
      </div>
      {onSave && (
        <button
          onClick={e => { e.stopPropagation(); onSave(); }}
          title="Overwrite with current dice colors"
          style={{
            position: 'absolute', top: '6px', right: '30px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: '#1a3a1a', border: '1px solid #2a6a2a',
            color: '#80e080', fontSize: '11px', lineHeight: '1',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2,
          }}
        >✎</button>
      )}
      {onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          title="Delete preset"
          style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: '#6a1a1a', border: '1px solid #8b2a2a',
            color: '#ff8080', fontSize: '12px', lineHeight: '1',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2,
          }}
        >×</button>
      )}
    </div>
  );
}

export default function Settings() {
  const {
    preset, overrides, currentVars, customPresets, activeCustomName,
    applyPreset, applyCustomPreset,
    saveCustomPreset, deleteCustomPreset,
    setVar, resetVar, resetOverrides,
    diceTheme, setDiceTheme, setDiceThemeCustom, setDiceThemeVar,
    customDicePresets, saveCustomDicePreset, deleteCustomDicePreset,
  } = useTheme();

  const [tab, setTab] = useState('ui'); // 'ui', 'dice', or 'database'
  const [saveNameDraft, setSaveNameDraft] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [diceSaveNameDraft, setDiceSaveNameDraft] = useState('');
  const [showDiceSaveInput, setShowDiceSaveInput] = useState(false);
  const [modal, setModal] = useState(null);

  // Server connection state
  const [dbUri, setDbUri] = useState(() => localStorage.getItem('ond-db-uri') || '');
  const [maskedUri, setMaskedUri] = useState('');
  const [dbStatus, setDbStatus] = useState(null); // null, 'testing', 'success', 'error'
  const [dbError, setDbError] = useState('');
  const [dbSaved, setDbSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDbUri, setShowDbUri] = useState(false);
  const [uploading, setUploading] = useState(null); // null, 'equipment', 'spells', 'both'
  const [uploadResult, setUploadResult] = useState(null);

  // Load current DB config from server
  useEffect(() => {
    fetch('/api/config/database').then(r => r.json()).then(data => {
      if (data.uri) setMaskedUri(data.uri);
      if (data.connected) setDbStatus('success');
    }).catch(() => {});
  }, []);

  function testServerConnection() {
    setDbStatus('testing');
    setDbError('');
    fetch('/api/health')
      .then(r => {
        if (r.ok) return r.json();
        throw new Error(`Server responded with ${r.status}`);
      })
      .then(data => {
        if (data.db === 'connected') setDbStatus('success');
        else { setDbStatus('error'); setDbError('Server running but database not connected'); }
      })
      .catch(err => { setDbStatus('error'); setDbError(err.message || 'Cannot reach server'); });
  }

  async function saveServerSettings() {
    localStorage.setItem('ond-db-uri', dbUri);
    if (dbUri.trim()) {
      // Send to server to update .env and reconnect
      setDbStatus('testing');
      setDbError('');
      try {
        const res = await fetch('/api/config/database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mongoUri: dbUri.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
          setDbStatus('success');
          setDbSaved(true);
          setTimeout(() => setDbSaved(false), 2000);
        } else {
          setDbStatus('error');
          setDbError(data.error || 'Failed to update');
        }
      } catch (err) {
        setDbStatus('error');
        setDbError(err.message || 'Cannot reach server');
      }
    } else {
      setDbSaved(true);
      setTimeout(() => setDbSaved(false), 2000);
    }
  }

  async function uploadToDb(type) {
    setUploading(type);
    setUploadResult(null);
    try {
      const res = await fetch('/api/config/upload-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok) {
        setUploadResult({ success: true, ...data });
      } else {
        setUploadResult({ success: false, error: data.error });
      }
    } catch (err) {
      setUploadResult({ success: false, error: err.message });
    }
    setUploading(null);
  }

  const hasOverrides = Object.keys(overrides).length > 0;
  const isCustomActive = preset === '__custom__';
  const hasCustomPresets = Object.keys(customPresets).length > 0;

  function handleSavePreset() {
    const name = saveNameDraft.trim();
    if (!name) return;
    saveCustomPreset(name, { ...currentVars });
    setSaveNameDraft('');
    setShowSaveInput(false);
  }

  function handleSaveDicePreset() {
    const name = diceSaveNameDraft.trim();
    if (!name) return;
    const { name: _n, ...vars } = diceTheme;
    saveCustomDicePreset(name, vars);
    setDiceSaveNameDraft('');
    setShowDiceSaveInput(false);
  }

  function handleModalConfirm() {
    if (!modal) return;
    if (modal.type === 'delete') {
      deleteCustomPreset(modal.name);
    } else if (modal.type === 'overwrite') {
      saveCustomPreset(modal.name, { ...currentVars });
    } else if (modal.type === 'delete-dice') {
      deleteCustomDicePreset(modal.name);
    } else if (modal.type === 'overwrite-dice') {
      const { name: _n, ...vars } = diceTheme;
      saveCustomDicePreset(modal.name, vars);
    }
    setModal(null);
  }

  return (
    <>
    <ConfirmModal modal={modal} onConfirm={handleModalConfirm} onCancel={() => setModal(null)} />
    <div className="page" style={{ maxWidth: '960px' }}>
      <div className="page-header">
        <h2 style={{ fontSize: '28px' }}>Settings</h2>
        {tab === 'ui' && hasOverrides && (
          <button className="btn btn-ghost" onClick={resetOverrides}>Reset Customizations</button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        {[{ key: 'ui', label: 'UI Themes' }, { key: 'dice', label: 'Dice Themes' }, { key: 'database', label: 'Database' }].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '8px 20px', borderRadius: '6px', cursor: 'pointer',
              background: tab === key ? 'var(--gold, #c9a227)' : 'var(--bg-card, #231a0e)',
              border: `1px solid ${tab === key ? 'var(--gold)' : 'var(--border, #5c3d1e)'}`,
              color: tab === key ? 'var(--bg-dark, #000)' : 'var(--text-dim, #a08060)',
              fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '13px',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Dice Themes Tab ── */}
      {tab === 'dice' && <>
        {/* Built-in Dice Presets */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>Dice Themes</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
            Choose how your 3D dice look when rolled. Customize colors below and save your own.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {Object.entries(DICE_PRESETS).map(([name, vars]) => {
              const isActive = diceTheme.name === name;
              return (
                <DiceThemeCard key={name} name={name} vars={vars} isActive={isActive}
                  onClick={() => setDiceTheme(name)} />
              );
            })}
          </div>
        </div>

        {/* Custom Dice Presets */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '16px' }}>My Dice Presets</h3>
            {!showDiceSaveInput ? (
              <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setShowDiceSaveInput(true)}>
                + Save Current as Preset
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  autoFocus
                  value={diceSaveNameDraft}
                  onChange={e => setDiceSaveNameDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveDicePreset(); if (e.key === 'Escape') setShowDiceSaveInput(false); }}
                  placeholder="Preset name..."
                  style={{ width: '160px', fontSize: '13px' }}
                />
                <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={handleSaveDicePreset} disabled={!diceSaveNameDraft.trim()}>
                  Save
                </button>
                <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '6px 10px' }} onClick={() => setShowDiceSaveInput(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
            {Object.keys(customDicePresets).length > 0
              ? 'Your saved dice themes. Click to apply.'
              : 'No custom dice presets yet. Customize colors below and save your creation.'}
          </p>
          {Object.keys(customDicePresets).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
              {Object.entries(customDicePresets).map(([name, vars]) => {
                const isActive = diceTheme.name === name && !DICE_PRESETS[name];
                return (
                  <DiceThemeCard key={name} name={name} vars={vars} isActive={isActive}
                    onClick={() => setDiceThemeCustom(name, vars)}
                    onDelete={() => setModal({ type: 'delete-dice', name })}
                    onSave={() => setModal({ type: 'overwrite-dice', name })}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Dice Color Customization */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>Customize Dice Colors</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
            Adjust individual dice properties. Changes apply to the currently active dice theme.
          </p>

          {/* Live dice preview */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', marginBottom: '16px', borderRadius: '8px',
            background: 'var(--bg-dark)', border: '1px solid var(--border)',
          }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '12px',
              background: (diceTheme.opacity ?? 1) < 1
                ? `linear-gradient(135deg, ${diceTheme.bodyColor || '#3a2a10'}${Math.round((diceTheme.opacity ?? 1) * 255).toString(16).padStart(2, '0')}, ${diceTheme.bodyColor || '#3a2a10'}${Math.round((diceTheme.opacity ?? 1) * 180).toString(16).padStart(2, '0')})`
                : (diceTheme.bodyColor || '#3a2a10'),
              border: `2px solid ${diceTheme.edgeColor || '#c9a227'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 ${Math.round(20 * (diceTheme.glowIntensity ?? 0.7))}px ${diceTheme.glowColor || '#c9a227'}${Math.round((diceTheme.glowIntensity ?? 0.7) * 80).toString(16).padStart(2, '0')}, 0 4px 12px rgba(0,0,0,0.6)${(diceTheme.opacity ?? 1) < 1 ? ', inset 0 0 20px rgba(255,255,255,0.1)' : ''}`,
              position: 'relative',
              backdropFilter: (diceTheme.opacity ?? 1) < 1 ? 'blur(4px)' : 'none',
            }}>
              <span style={{
                fontFamily: 'Cinzel, serif', fontWeight: 800,
                fontSize: `${Math.round(28 * (diceTheme.numberScale || 1.1))}px`,
                color: diceTheme.textColor || '#f5e6c8',
              }}>20</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {[
              { key: 'bodyColor', label: 'Body Color', desc: 'Die body / face color' },
              { key: 'textColor', label: 'Number Color', desc: 'Color of the numbers on each face' },
              { key: 'edgeColor', label: 'Edge Color', desc: 'Color of the lines along die edges' },
              { key: 'emissive', label: 'Emissive Color', desc: 'Subtle self-illumination tint' },
            ].map(({ key, label, desc }) => {
              const current = diceTheme[key] || '#000000';
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', background: 'var(--bg-dark)', borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}>
                  <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '6px',
                      background: current,
                      border: '2px solid var(--border)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                    }} />
                    <input
                      type="color"
                      value={current}
                      onChange={e => setDiceThemeVar(key, e.target.value)}
                      style={{ position: 'absolute', opacity: 0, width: '34px', height: '34px', top: 0, left: 0, cursor: 'pointer', padding: 0, border: 'none' }}
                    />
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '5px' }}>{desc}</div>
                    <HexInput value={current} onChange={v => setDiceThemeVar(key, v)} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Glow settings */}
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {(() => {
              const glowCurrent = diceTheme.glowColor || '#c9a227';
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', background: 'var(--bg-dark)', borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}>
                  <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '6px',
                      background: glowCurrent,
                      border: '2px solid var(--border)',
                      boxShadow: `0 0 12px ${glowCurrent}80, 0 2px 6px rgba(0,0,0,0.5)`,
                    }} />
                    <input
                      type="color"
                      value={glowCurrent}
                      onChange={e => setDiceThemeVar('glowColor', e.target.value)}
                      style={{ position: 'absolute', opacity: 0, width: '34px', height: '34px', top: 0, left: 0, cursor: 'pointer', padding: 0, border: 'none' }}
                    />
                  </label>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>Glow Color</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '5px' }}>Winning face glow highlight</div>
                    <HexInput value={glowCurrent} onChange={v => setDiceThemeVar('glowColor', v)} />
                  </div>
                </div>
              );
            })()}
            {[
              { key: 'glowIntensity', label: 'Glow Intensity', min: 0, max: 1, step: 0.05, fmt: v => v < 0.01 ? 'Off' : `${Math.round(v * 100)}%` },
            ].map(({ key, label, min, max, step, fmt }) => {
              const defaults = { glowIntensity: 0.7 };
              const current = diceTheme[key] ?? defaults[key];
              return (
                <div key={key} style={{
                  padding: '10px 12px', background: 'var(--bg-dark)', borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: '12px', color: 'var(--gold)', fontFamily: 'monospace' }}>{fmt(current)}</span>
                  </div>
                  <input
                    type="range" min={min} max={max} step={step}
                    value={current}
                    onChange={e => setDiceThemeVar(key, parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: diceTheme.glowColor || 'var(--gold)' }}
                  />
                </div>
              );
            })}
            <div style={{
              padding: '10px 12px', background: 'var(--bg-dark)', borderRadius: '6px',
              border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={diceTheme.glowPulse !== false}
                  onChange={e => setDiceThemeVar('glowPulse', e.target.checked)}
                  style={{ accentColor: diceTheme.glowColor || 'var(--gold)', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Pulse Effect</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Winning number gently pulses after landing</div>
                </div>
              </label>
            </div>
          </div>

          {/* Number size + material sliders */}
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {[
              { key: 'numberScale', label: 'Number Size', min: 0.5, max: 2.0, step: 0.1, fmt: v => `${Math.round(v * 100)}%` },
              { key: 'opacity', label: 'Transparency', min: 0.0, max: 1.0, step: 0.05, fmt: v => v >= 1 ? 'Solid' : `${Math.round((1 - v) * 100)}% Glass` },
              { key: 'metalness', label: 'Metalness', min: 0, max: 1, step: 0.05, fmt: v => `${Math.round(v * 100)}%` },
              { key: 'roughness', label: 'Roughness', min: 0, max: 1, step: 0.05, fmt: v => `${Math.round(v * 100)}%` },
            ].map(({ key, label, min, max, step, fmt }) => {
              const defaults = { numberScale: 1.1, opacity: 1, glowIntensity: 0.7, metalness: 0.7, roughness: 0.3 };
              const current = diceTheme[key] ?? defaults[key];
              return (
                <div key={key} style={{
                  padding: '10px 12px', background: 'var(--bg-dark)', borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: '12px', color: 'var(--gold)', fontFamily: 'monospace' }}>{fmt(current)}</span>
                  </div>
                  <input
                    type="range" min={min} max={max} step={step}
                    value={current}
                    onChange={e => setDiceThemeVar(key, parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--gold)' }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </>}

      {/* ── UI Themes Tab ── */}
      {tab === 'ui' && <>

      {/* ── Built-in Presets ── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>Built-in Themes</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
          Click a theme to apply it. Customize colors below, then save as your own preset.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
          {Object.entries(PRESETS).map(([name, vars]) => (
            <ThemeCard
              key={name}
              name={name}
              vars={vars}
              isActive={preset === name && !hasOverrides}
              onClick={() => applyPreset(name)}
            />
          ))}
        </div>
      </div>

      {/* ── Custom Presets ── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '16px' }}>My Presets</h3>
          {!showSaveInput ? (
            <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setShowSaveInput(true)}>
              + Save Current as Preset
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                autoFocus
                value={saveNameDraft}
                onChange={e => setSaveNameDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSavePreset(); if (e.key === 'Escape') setShowSaveInput(false); }}
                placeholder="Preset name..."
                style={{ width: '160px', fontSize: '13px' }}
              />
              <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={handleSavePreset} disabled={!saveNameDraft.trim()}>
                Save
              </button>
              <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '6px 10px' }} onClick={() => setShowSaveInput(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
          {hasCustomPresets ? 'Your saved themes. Click to apply, × to delete.' : 'No custom presets yet. Customize colors below and save your creation.'}
        </p>
        {hasCustomPresets && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {Object.entries(customPresets).map(([name, vars]) => (
              <ThemeCard
                key={name}
                name={name}
                vars={vars}
                isActive={isCustomActive && activeCustomName === name}
                onClick={() => applyCustomPreset(name, vars)}
                onDelete={() => setModal({ type: 'delete', name })}
                onSave={() => setModal({ type: 'overwrite', name })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Color Customization ── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '16px' }}>Custom Colors</h3>
          {hasOverrides && (
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              {Object.keys(overrides).length} override{Object.keys(overrides).length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
          Click the swatch to open the color picker, or type a hex value directly. Changes apply live.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {CUSTOMIZABLE.map(({ key, label, desc }) => {
            const current = currentVars[key] || '#000000';
            const isOverridden = key in overrides;
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', background: 'var(--bg-dark)', borderRadius: '6px',
                border: `1px solid ${isOverridden ? 'var(--gold-dim)' : 'var(--border)'}`,
              }}>
                {/* Color swatch + native picker */}
                <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '6px',
                    background: current,
                    border: `2px solid ${isOverridden ? 'var(--gold)' : 'var(--border)'}`,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  }} />
                  <input
                    type="color"
                    value={current.length === 4 ? current : current}
                    onChange={e => setVar(key, e.target.value)}
                    style={{ position: 'absolute', opacity: 0, width: '34px', height: '34px', top: 0, left: 0, cursor: 'pointer', padding: 0, border: 'none' }}
                  />
                </label>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{label}</span>
                    {isOverridden && (
                      <span style={{ fontSize: '9px', padding: '1px 4px', background: 'var(--accent)', border: '1px solid var(--gold-dim)', color: 'var(--gold)', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>custom</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '5px' }}>{desc}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HexInput value={current} onChange={v => setVar(key, v)} />
                    {isOverridden && (
                      <button
                        onClick={() => resetVar(key)}
                        style={{ fontSize: '10px', padding: '2px 6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-dim)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >↩ reset</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Live Preview ── */}
      <div className="card">
        <h3 style={{ fontSize: '14px', marginBottom: '14px' }}>Live Preview</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
          <button className="btn btn-primary">Primary Button</button>
          <button className="btn btn-ghost">Ghost Button</button>
          <button className="btn btn-danger">Danger</button>
          <span className="badge badge-class">Wizard</span>
          <span className="badge badge-race">Elf</span>
          <span className="badge badge-level">Level 5</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {['STR','DEX','CON','INT','WIS','CHA'].map((ab, i) => (
            <div key={ab} className="ability-box">
              <span className="ability-label">{ab}</span>
              <span className="ability-score">{[16,14,12,18,10,8][i]}</span>
              <span className="ability-modifier">{['+3','+2','+1','+4','0','-1'][i]}</span>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--bg-dark)', borderRadius: '6px', padding: '10px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>HIT POINTS</span>
            <span style={{ fontWeight: 700, color: 'var(--hp-bar)' }}>42 / 58</span>
          </div>
          <div className="hp-bar-wrap">
            <div className="hp-bar-fill" style={{ width: '72%', background: 'var(--hp-bar)' }} />
          </div>
        </div>
        <input placeholder="Search characters..." style={{ width: '100%' }} readOnly />
      </div>

      </>}

      {/* ── Connection Tab ── */}
      {tab === 'database' && <>
        {/* Shared Database Setup */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>Shared Database</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
            Everyone in your group connects to the <strong style={{ color: 'var(--text)' }}>same MongoDB database</strong>.
            Each player runs the app locally but shares the same data — campaigns, characters, and rolls are all synced.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dim)' }}>
              MongoDB Connection String
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showDbUri ? 'text' : 'password'}
                value={dbUri}
                onChange={e => setDbUri(e.target.value)}
                placeholder="mongodb+srv://username:password@cluster.mongodb.net/database"
                style={{ width: '100%', padding: '10px 40px 10px 12px', fontSize: '13px', fontFamily: 'monospace', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
              />
              <button onClick={() => setShowDbUri(!showDbUri)}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '13px', padding: '4px' }}
                title={showDbUri ? 'Hide' : 'Show'}>
                {showDbUri ? 'Hide' : 'Show'}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
              Get this from your DM. Click Save and the app will automatically update your .env file and connect.
            </div>
            {maskedUri && !dbUri && (
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
                Current connection: <code style={{ background: 'var(--surface)', padding: '2px 6px', borderRadius: '3px', fontSize: '11px', color: 'var(--gold)' }}>{maskedUri}</code>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 20px' }} onClick={saveServerSettings}>
              {dbSaved ? '✓ Saved!' : 'Save Settings'}
            </button>
            <button className="btn btn-ghost" style={{ fontSize: '13px', padding: '8px 20px' }} onClick={testServerConnection} disabled={dbStatus === 'testing'}>
              {dbStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
            {dbStatus === 'success' && (
              <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                Connected
              </span>
            )}
            {dbStatus === 'error' && (
              <span style={{ fontSize: '13px', color: '#f87171', fontWeight: 600 }}>Failed: {dbError}</span>
            )}
          </div>
        </div>

        {/* Quick Start */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Quick Start</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid #2a6a2a' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#4ade80', marginBottom: '8px' }}>I'm a Player</div>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 2 }}>
                <div><strong style={{ color: 'var(--text)' }}>1.</strong> Get the connection string from your DM</div>
                <div><strong style={{ color: 'var(--text)' }}>2.</strong> Paste it above and click <strong style={{ color: 'var(--text)' }}>Save</strong></div>
                <div><strong style={{ color: 'var(--text)' }}>3.</strong> Go to Campaigns and enter the join code</div>
                <div style={{ color: '#4ade80', fontStyle: 'italic', marginTop: '4px' }}>That's it! Your .env is updated automatically.</div>
              </div>
            </div>
            <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid var(--gold-dim)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)', marginBottom: '8px' }}>I'm the DM / Host</div>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 2 }}>
                <div><strong style={{ color: 'var(--text)' }}>1.</strong> Follow the tutorial below to create a database</div>
                <div><strong style={{ color: 'var(--text)' }}>2.</strong> Paste the connection string above and click <strong style={{ color: 'var(--text)' }}>Save</strong></div>
                <div><strong style={{ color: 'var(--text)' }}>3.</strong> Share the connection string with your players</div>
                <div><strong style={{ color: 'var(--text)' }}>4.</strong> Create a campaign and share the join code</div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Tutorial */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>How to Create a Free MongoDB Database</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px' }}>Follow these steps to set up a shared database for your group. Only the DM needs to do this once.</p>

          {/* Step 1 */}
          <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gold)', color: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>1</span>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Create a MongoDB Atlas Account</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.8, paddingLeft: '38px' }}>
              <div>Go to <strong style={{ color: 'var(--gold)' }}>mongodb.com/atlas</strong> and click <strong style={{ color: 'var(--text)' }}>"Try Free"</strong></div>
              <div>Sign up with Google or email — no credit card needed</div>
              <div>The free tier (M0) gives you 512MB which is more than enough</div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gold)', color: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>2</span>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Create a Cluster</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.8, paddingLeft: '38px' }}>
              <div>After signing up, click <strong style={{ color: 'var(--text)' }}>"Build a Database"</strong></div>
              <div>Choose <strong style={{ color: '#4ade80' }}>M0 FREE</strong> — the free shared cluster</div>
              <div>Pick any cloud provider and region (the closest to you is best)</div>
              <div>Name it whatever you want (e.g., <strong style={{ color: 'var(--text)' }}>dnd-cluster</strong>)</div>
              <div>Click <strong style={{ color: 'var(--text)' }}>"Create"</strong> and wait ~1 minute for it to deploy</div>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gold)', color: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>3</span>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Create a Database User</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.8, paddingLeft: '38px' }}>
              <div>Go to <strong style={{ color: 'var(--text)' }}>Security → Database Access</strong> in the left sidebar</div>
              <div>Click <strong style={{ color: 'var(--text)' }}>"Add New Database User"</strong></div>
              <div>Choose <strong style={{ color: 'var(--text)' }}>Password</strong> authentication</div>
              <div>Enter a username (e.g., <code style={{ background: 'var(--surface)', padding: '1px 6px', borderRadius: '3px', fontSize: '12px' }}>dnd-group</code>)</div>
              <div>Enter a password — <strong style={{ color: '#fbbf24' }}>write this down!</strong> You'll need it for the connection string</div>
              <div>Set role to <strong style={{ color: 'var(--text)' }}>"Read and write to any database"</strong></div>
              <div>Click <strong style={{ color: 'var(--text)' }}>"Add User"</strong></div>
            </div>
          </div>

          {/* Step 4 */}
          <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gold)', color: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>4</span>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Allow Connections from Anywhere</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.8, paddingLeft: '38px' }}>
              <div>Go to <strong style={{ color: 'var(--text)' }}>Security → Network Access</strong> in the left sidebar</div>
              <div>Click <strong style={{ color: 'var(--text)' }}>"Add IP Address"</strong></div>
              <div>Click <strong style={{ color: 'var(--text)' }}>"Allow Access from Anywhere"</strong> (adds <code style={{ background: 'var(--surface)', padding: '1px 6px', borderRadius: '3px', fontSize: '12px' }}>0.0.0.0/0</code>)</div>
              <div>This lets all your players connect from their homes</div>
              <div>Click <strong style={{ color: 'var(--text)' }}>"Confirm"</strong></div>
            </div>
          </div>

          {/* Step 5 */}
          <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gold)', color: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>5</span>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Get Your Connection String</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.8, paddingLeft: '38px' }}>
              <div>Go back to <strong style={{ color: 'var(--text)' }}>Database → Clusters</strong></div>
              <div>Click <strong style={{ color: 'var(--text)' }}>"Connect"</strong> on your cluster</div>
              <div>Choose <strong style={{ color: 'var(--text)' }}>"Drivers"</strong></div>
              <div>Copy the connection string — it looks like:</div>
              <div style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '6px', marginBottom: '6px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--gold)', wordBreak: 'break-all' }}>
                mongodb+srv://dnd-group:YOUR_PASSWORD@cluster0.abc123.mongodb.net/ond?retryWrites=true&w=majority
              </div>
              <div><strong style={{ color: '#f87171' }}>Important:</strong> Replace <code style={{ background: 'var(--surface)', padding: '1px 6px', borderRadius: '3px', fontSize: '12px' }}>&lt;password&gt;</code> with the password you created in Step 3</div>
              <div>Change <code style={{ background: 'var(--surface)', padding: '1px 6px', borderRadius: '3px', fontSize: '12px' }}>/test</code> at the end to <code style={{ background: 'var(--surface)', padding: '1px 6px', borderRadius: '3px', fontSize: '12px' }}>/ond</code> (or any database name you want)</div>
            </div>
          </div>

          {/* Step 6 */}
          <div style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: '8px', border: '1px solid #2a6a2a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4ade80', color: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>6</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#4ade80' }}>Paste It and Share!</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.8, paddingLeft: '38px' }}>
              <div>Paste the connection string in the field at the top of this page and click <strong style={{ color: 'var(--text)' }}>Save</strong></div>
              <div>The app will automatically connect to your database</div>
              <div>Send the <strong style={{ color: 'var(--text)' }}>same connection string</strong> to your players — they paste it in their own app</div>
              <div>Everyone is now sharing the same database!</div>
              <div style={{ marginTop: '8px', padding: '8px 12px', background: '#1a3a1a', borderRadius: '6px', border: '1px solid #2a6a2a', color: '#4ade80' }}>
                Next: Go to <strong>Campaigns</strong> → create a campaign → share the <strong>join code</strong> with your players
              </div>
            </div>
          </div>
        </div>

        {/* Upload to Database */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>Upload Data to Database</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
            Push the local equipment and spell data to your MongoDB database so everyone sharing the database has access to the same items.
            This replaces any existing data in the database with your local copy.
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}
              onClick={() => uploadToDb('equipment')} disabled={!!uploading || dbStatus !== 'success'}>
              {uploading === 'equipment' ? 'Uploading...' : 'Upload Equipment'}
            </button>
            <button className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}
              onClick={() => uploadToDb('spells')} disabled={!!uploading || dbStatus !== 'success'}>
              {uploading === 'spells' ? 'Uploading...' : 'Upload Spells'}
            </button>
            <button className="btn btn-ghost" style={{ fontSize: '13px', padding: '8px 16px' }}
              onClick={() => uploadToDb('both')} disabled={!!uploading || dbStatus !== 'success'}>
              {uploading === 'both' ? 'Uploading...' : 'Upload Both'}
            </button>
          </div>
          {dbStatus !== 'success' && (
            <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '8px' }}>Connect to a database first before uploading.</div>
          )}
          {uploadResult && (
            <div style={{ fontSize: '13px', marginTop: '10px', padding: '8px 12px', borderRadius: '6px', background: uploadResult.success ? '#1a3a1a' : '#3a1a1a', border: `1px solid ${uploadResult.success ? '#2a6a2a' : '#6a2a2a'}`, color: uploadResult.success ? '#4ade80' : '#f87171' }}>
              {uploadResult.success
                ? `Uploaded successfully! ${uploadResult.equipment ? `${uploadResult.equipment} equipment items` : ''}${uploadResult.equipment && uploadResult.spells ? ' and ' : ''}${uploadResult.spells ? `${uploadResult.spells} spells` : ''}`
                : `Upload failed: ${uploadResult.error}`
              }
            </div>
          )}
        </div>

        {/* Default Data Source */}
        <div className="card">
          <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>Default Data Source</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>
            Choose whether the app uses local data (bundled with the app) or the database by default for equipment and spells.
            Characters are always saved locally first — database sync is optional per character.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { key: 'local', label: 'Local (Recommended)', desc: 'Fast, always available, no internet needed', color: 'var(--gold)' },
              { key: 'db', label: 'Database', desc: 'Shared data, requires connection', color: '#4ade80' },
            ].map(opt => {
              const current = localStorage.getItem('ond-data-source') !== 'db' ? 'local' : 'db';
              const active = current === opt.key;
              return (
                <div key={opt.key} onClick={() => localStorage.setItem('ond-data-source', opt.key === 'local' ? 'local' : 'db')}
                  className="cc-skill"
                  style={{ flex: 1, minWidth: '200px', padding: '14px', borderRadius: '8px', cursor: 'pointer', background: active ? 'var(--bg-dark)' : 'var(--surface)', border: `2px solid ${active ? opt.color : 'var(--border)'}` }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: active ? opt.color : 'var(--text)', marginBottom: '4px' }}>{opt.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{opt.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </>}
    </div>
    </>
  );
}
