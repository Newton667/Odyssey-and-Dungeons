import { useEffect, useState } from 'react';
import { useDice } from '../context/DiceContext';
import {
  encodeShareCode, decodeShareCode,
  readHomebrew, readHomebrewRaw, writeHomebrew,
  upsertHomebrewRecord, removeHomebrewRecord, appendImportedRecord,
  pruneToType, sanitizeImported, validateHomebrew, resetFormForType,
  attunementChecked, setAttunement,
  serializeProperty, parseProperty,
  WEAPON_SUBS, ARMOR_SUBS, SCHOOLS, WEAPON_PROPERTIES,
} from '../utils/homebrew';
import { WEAPON_MASTERIES } from '../utils/dndConstants';
import { getLocalEquipmentByName, getAllLocalSpells } from '../data/localDataService';
import NumInput from '../components/NumInput';

const TYPES = [
  { key: 'weapon', label: 'Weapon' },
  { key: 'armor', label: 'Armor' },
  { key: 'item', label: 'Item / Gear' },
  { key: 'ammo', label: 'Ammunition' },
  { key: 'spell', label: 'Spell' },
];

const RARITIES = ['common', 'uncommon', 'rare', 'very-rare', 'legendary', 'artifact'];
const RARITY_COLORS = { common: 'var(--text-dim)', uncommon: '#1eff00', rare: '#0070ff', 'very-rare': '#a335ee', legendary: '#ff8000', artifact: '#e6cc80' };
const DAMAGE_TYPES = ['Bludgeoning', 'Piercing', 'Slashing', 'Acid', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Poison', 'Psychic', 'Radiant', 'Thunder'];
// SCHOOLS / WEAPON_SUBS / ARMOR_SUBS are imported from utils/homebrew.js so the
// pickers and validateHomebrew can never drift apart.
const CLASSES = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard', 'Artificer'];
// Sensible starting values so a freshly ticked chip is already a legal property.
const PROP_DEFAULTS = {
  Versatile: { die: '1d10' },
  Thrown: { normal: 20, long: 60 },
  Ammunition: { normal: 80, long: 320 },
};
const VERSATILE_DICE = ['1d4', '1d6', '1d8', '1d10', '1d12'];
// The user-facing statement of the Heavy Armor rule — a mis-set type is obvious
// before saving rather than after the sheet computes the wrong AC.
const AC_FORMULA = {
  Light: 'AC + DEX',
  Medium: 'AC + DEX (max 2)',
  Heavy: 'AC (no DEX)',
  Shield: '+AC (added to your total)',
};

const ERR_STYLE = { borderColor: '#f87171' };
const DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
const AMMO_TYPES = ['Arrow', 'Bolt', 'Bullet', 'Needle', 'Custom'];

// Dice formula builder component
function DiceFormulaBuilder({ value, onChange, label }) {
  const { rollDice3D } = useDice();
  const [lastRoll, setLastRoll] = useState(null);

  const testRoll = async () => {
    if (!value) return;
    const rolled = await rollDice3D(value, label || 'Test Roll');
    if (!rolled) return; // dice already in the air
    setLastRoll({ results: rolled.results, total: rolled.total });
  };
  // Parse existing formula like "2d8+3" into parts
  const parseFormula = (str) => {
    const parts = [];
    if (!str) return parts;
    // Match dice groups and modifiers: "2d8", "+1d6", "+3", "-2"
    const regex = /([+-]?\s*\d+d\d+|[+-]\s*\d+(?!d))/g;
    let m;
    // Handle first term without leading +
    const clean = str.replace(/\s/g, '');
    let remaining = clean;
    const firstDice = remaining.match(/^(\d+d\d+)/);
    if (firstDice) {
      parts.push(firstDice[1]);
      remaining = remaining.slice(firstDice[1].length);
    }
    while ((m = regex.exec(remaining)) !== null) {
      parts.push(m[1].replace(/\s/g, ''));
    }
    return parts;
  };

  const addDie = (die) => {
    const current = value || '';
    if (!current) { onChange(`1${die}`); return; }
    // Check if this die type already exists, increment count
    const regex = new RegExp(`(\\d+)${die.replace('d', 'd')}`);
    const match = current.match(regex);
    if (match) {
      onChange(current.replace(regex, `${parseInt(match[1]) + 1}${die}`));
    } else {
      onChange(`${current}+1${die}`);
    }
  };

  const removeDie = (die) => {
    const current = value || '';
    const regex = new RegExp(`(\\d+)${die.replace('d', 'd')}`);
    const match = current.match(regex);
    if (!match) return;
    const count = parseInt(match[1]);
    if (count <= 1) {
      // Remove the die and any leading +
      let result = current.replace(new RegExp(`\\+?${match[0]}`), '').replace(/^\+/, '');
      onChange(result || '');
    } else {
      onChange(current.replace(regex, `${count - 1}${die}`));
    }
  };

  const addModifier = (mod) => {
    const current = value || '';
    // Check for existing modifier
    const modMatch = current.match(/([+-]\d+)$/);
    if (modMatch) {
      const newMod = parseInt(modMatch[1]) + mod;
      if (newMod === 0) onChange(current.replace(/[+-]\d+$/, ''));
      else onChange(current.replace(/[+-]\d+$/, `${newMod >= 0 ? '+' : ''}${newMod}`));
    } else if (current) {
      onChange(`${current}${mod >= 0 ? '+' : ''}${mod}`);
    }
  };

  // Count dice in formula for display
  const getDiceCount = (die) => {
    const match = (value || '').match(new RegExp(`(\\d+)${die.replace('d', 'd')}`));
    return match ? parseInt(match[1]) : 0;
  };
  const getModifier = () => {
    const match = (value || '').match(/([+-]\d+)$/);
    return match ? parseInt(match[1]) : 0;
  };

  return (
    <div>
      <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Damage Formula</label>
      {/* Preview + Roll Test */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ flex: 1, padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, color: 'var(--gold)', minHeight: '32px', display: 'flex', alignItems: 'center' }}>
          {value || <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '13px' }}>Click dice below to build formula</span>}
        </div>
        {value && (
          <button type="button" onClick={testRoll} style={{
            padding: '8px 14px', borderRadius: '6px', cursor: 'pointer',
            background: 'var(--gold)', border: 'none', color: 'var(--bg-dark)',
            fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '12px',
            whiteSpace: 'nowrap',
          }}>
            Test Roll
          </button>
        )}
      </div>
      {lastRoll && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--gold-dim)', borderRadius: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
            {lastRoll.results.map((r, i) => (
              <span key={i}>
                {i > 0 && ' + '}
                <span style={{ color: r.value === r.sides ? 'var(--gold)' : r.value === 1 ? '#f87171' : 'var(--text)' }}>
                  {r.value}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>({r.die})</span>
              </span>
            ))}
            {lastRoll.bonus !== 0 && (
              <span style={{ color: 'var(--text)' }}> {lastRoll.bonus >= 0 ? '+' : '−'} {Math.abs(lastRoll.bonus)}</span>
            )}
          </span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gold)', fontFamily: 'Cinzel, serif' }}>
            = {lastRoll.total}
          </span>
        </div>
      )}
      {/* Dice buttons */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {DICE.map(die => {
          const count = getDiceCount(die);
          return (
            <div key={die} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button type="button" onClick={() => removeDie(die)}
                  style={{ width: '22px', height: '22px', borderRadius: '4px', cursor: count > 0 ? 'pointer' : 'default', background: count > 0 ? '#3a1a1a' : 'var(--surface)', border: `1px solid ${count > 0 ? '#6a2a2a' : 'var(--border)'}`, color: count > 0 ? '#f87171' : 'var(--text-dim)', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, opacity: count > 0 ? 1 : 0.3 }}>−</button>
                <button type="button" onClick={() => addDie(die)}
                  style={{ width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', background: '#1a3a1a', border: '1px solid #2a6a2a', color: '#4ade80', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+</button>
              </div>
              <span style={{ fontSize: '12px', color: count > 0 ? 'var(--gold)' : 'var(--text-dim)', fontWeight: count > 0 ? 700 : 400 }}>
                {count > 0 ? `${count}${die}` : die}
              </span>
            </div>
          );
        })}
        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '8px', marginLeft: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button type="button" onClick={() => addModifier(-1)}
              style={{ width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', background: '#3a1a1a', border: '1px solid #6a2a2a', color: '#f87171', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>−</button>
            <button type="button" onClick={() => addModifier(1)}
              style={{ width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', background: '#1a3a1a', border: '1px solid #2a6a2a', color: '#4ade80', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+</button>
          </div>
          <span style={{ fontSize: '12px', color: getModifier() !== 0 ? 'var(--gold)' : 'var(--text-dim)', fontWeight: getModifier() !== 0 ? 700 : 400 }}>
            {getModifier() !== 0 ? `${getModifier() >= 0 ? '+' : ''}${getModifier()}` : 'mod'}
          </span>
        </div>
        {value && (
          <button type="button" onClick={() => onChange('')}
            style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', marginLeft: '8px' }}>
            Clear
          </button>
        )}
      </div>
      {/* Manual override */}
      <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '2px', marginTop: '4px' }}>Or type manually:</div>
      <input value={value} onChange={e => { onChange(e.target.value); setLastRoll(null); }} placeholder="2d8+1d6+3"
        style={{ width: '100%', padding: '6px 10px', fontSize: '12px', fontFamily: 'monospace', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }} />
    </div>
  );
}

const SAVE_ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const ATTACK_TYPES = ['melee', 'ranged'];
const AOE_SHAPES = ['Sphere', 'Cone', 'Cube', 'Cylinder', 'Line', 'Square', 'Wall'];
const GEAR_SUBS = ['Adventuring Gear', 'Ammunition', 'Holy Symbol', 'Arcane Focus', 'Druidic Focus', 'Potion', 'Scroll', 'Wondrous Item', 'Other'];

const EMPTY_FORM = {
  type: 'weapon', name: '', description: '', rarity: 'common', category: 'weapon', subcategory: '',
  cost: '', weight: '', damage: '', damageType: '', properties: [], ac: '', magical: false, bonus: 0,
  ammoType: '', mastery: '', stackSize: 20, requiresAttunement: false, attunement: false,
  stealthDisadvantage: false, strReq: 0,
  level: 0, school: '', castingTime: '1 Action', range: '', components: [], materialComponent: '',
  duration: 'Instantaneous', concentration: false, ritual: false, classes: [],
  attackType: '', savingThrow: '', saveEffect: '', higherLevels: '', scaling: '',
  aoe: false, aoeShape: '', aoeSize: 0,
};

export default function Homebrew() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [importStr, setImportStr] = useState('');
  const [importError, setImportError] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [shareCode, setShareCode] = useState(null);
  const [shareError, setShareError] = useState('');
  // Page-level (not form-level) storage failures: Duplicate runs outside the form, so
  // formErrors is the wrong channel for it.
  const [storageError, setStorageError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const load = () => {
    let data = readHomebrew();
    if (filter) data = data.filter(i => i.type === filter);
    if (search) data = data.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()));
    // Stable sort: type in TYPES order, then name.
    const typeOrder = t => { const i = TYPES.findIndex(x => x.key === t); return i < 0 ? TYPES.length : i; };
    data = [...data].sort((a, b) =>
      typeOrder(a.type) - typeOrder(b.type) || String(a.name || '').localeCompare(String(b.name || '')));
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, search]);

  const f = (key, val) => {
    setFormErrors({});
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const setType = (type) => {
    setFormErrors({});
    setForm(prev => resetFormForType(prev, type, EMPTY_FORM));
  };

  // Properties are stored serialised, exactly as equipment.json stores them
  // ("versatile (1d10)", "thrown (20/60)"), because that is what the sheet parses.
  const propList = () => form.properties || [];
  const parsedProps = propList().map(parseProperty);
  const hasProp = (name) => parsedProps.some(pp => pp.name === name);
  const propParams = (name) => parsedProps.find(pp => pp.name === name)?.params || {};
  const toggleProperty = (name) => {
    if (hasProp(name)) f('properties', propList().filter(x => parseProperty(x).name !== name));
    else f('properties', [...propList(), serializeProperty(name, PROP_DEFAULTS[name] || {})]);
  };
  const setPropParams = (name, patch) => f('properties', propList().map(x => {
    const pp = parseProperty(x);
    return pp.name === name ? serializeProperty(name, { ...pp.params, ...patch }) : x;
  }));
  const unknownProps = propList().filter(x => !WEAPON_PROPERTIES.includes(parseProperty(x).name));

  const toggleArrayField = (key, val) => {
    setForm(prev => {
      const arr = prev[key] || [];
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  };

  const save = (e) => {
    e.preventDefault();
    setFormErrors({});
    const playerName = localStorage.getItem('ond-player-name') || '';
    const body = { ...form, createdBy: form.createdBy || playerName, updatedAt: new Date().toISOString() };
    const { ok, errors } = validateHomebrew(body);
    if (!ok) { setFormErrors(errors); return; }   // blocked: the form stays open
    if (!editing) {
      body._id = 'hb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      body.createdAt = new Date().toISOString();
    }
    // Raw read: a record the normalizer cannot understand must survive this save.
    const all = upsertHomebrewRecord(readHomebrewRaw(), pruneToType(body), editing);
    if (!writeHomebrew(all)) {
      setFormErrors({ _save: "Could not save — your browser's storage is full." });
      return;   // leave the form open with the user's input intact
    }
    setCreating(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    load();
  };

  const duplicateItem = (id) => {
    // Raw read — same rule as every other mutation path.
    const all = readHomebrewRaw();
    const src = all.find(i => i._id === id);
    if (!src) return;
    const copy = {
      ...JSON.parse(JSON.stringify(src)),
      name: (src.name || 'Untitled') + ' (Copy)',
      _id: 'hb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!writeHomebrew(appendImportedRecord(all, copy))) {
      setStorageError("Could not duplicate — your browser's storage is full.");
      return;
    }
    setStorageError('');
    load();
  };

  const startEdit = (item) => {
    setForm({ ...EMPTY_FORM, ...item });
    setEditing(item._id);
    setCreating(true);
  };

  const deleteItem = (id) => {
    if (!confirm('Delete this homebrew item?')) return;
    // Raw read: deleting one item must not erase records the normalizer skips.
    if (!writeHomebrew(removeHomebrewRecord(readHomebrewRaw(), id))) {
      setStorageError("Could not delete — your browser's storage is full.");
      return;
    }
    setStorageError('');
    load();
  };

  const exportItem = async (id) => {
    setShareError('');
    const item = readHomebrewRaw().find(i => i._id === id);
    if (!item) return;
    const { _id, createdAt, updatedAt, ...data } = item;
    let code;
    try {
      code = encodeShareCode(data);
    } catch {
      setShareError('Could not build a share code for this item.');
      return;
    }
    setShareCode({ id, code });            // always reveal it, clipboard or not
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* clipboard blocked (insecure context / denied) — the textarea is the fallback */
    }
  };

  const doImport = () => {
    setImportError('');
    let data;
    try {
      data = decodeShareCode(importStr);
    } catch {
      setImportError("That doesn't look like a valid share code.");
      return;
    }
    const result = sanitizeImported(data);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    const record = {
      ...result.item,
      _id: 'hb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Raw read: importing must not erase records the normalizer skips.
    if (!writeHomebrew(appendImportedRecord(readHomebrewRaw(), record))) {
      setImportError("Could not import — your browser's storage is full.");
      return;
    }
    setShowImport(false);
    setImportStr('');
    // Imported but incomplete: tell the user what to fix rather than silently accepting it.
    const missing = result.warnings ? Object.values(result.warnings) : [];
    setStorageError(missing.length
      ? `Imported "${record.name}" — but it is missing: ${missing.join('; ')}. Open Edit to complete it.`
      : '');
    load();
  };

  // Warnings are non-blocking, so they are shown live while the form is open —
  // by the time save() succeeds the form is already closed.
  const liveWarnings = (() => {
    const w = { ...validateHomebrew(form).warnings };
    const nm = (form.name || '').trim().toLowerCase();
    if (nm) {
      // Shadowing is sometimes deliberate, so this warns rather than blocking. It is
      // factually what happens: CharacterSheet resolves the built-in name first.
      const clash = readHomebrewRaw().some(i => i._id !== editing && String(i.name || '').toLowerCase() === nm)
        || !!getLocalEquipmentByName(form.name.trim())
        || getAllLocalSpells().some(sp => String(sp.name || '').toLowerCase() === nm);
      if (clash) w._name = 'An item named ' + form.name.trim() + ' already exists — the character sheet will use the built-in one.';
    }
    return w;
  })();

  const isSpell = form.type === 'spell';
  const isEquip = !isSpell;

  return (
    <div className="page" style={{ maxWidth: '1000px' }}>
      <div className="page-header">
        <h2 style={{ fontSize: '28px' }}>Homebrewer</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" onClick={() => { setShowImport(!showImport); setCreating(false); }}>
            {showImport ? '✕ Cancel' : 'Import'}
          </button>
          <button className="btn btn-primary" onClick={() => { setCreating(!creating); setShowImport(false); setEditing(null); setForm({ ...EMPTY_FORM }); }}>
            {creating ? '✕ Cancel' : '+ Create'}
          </button>
        </div>
      </div>

      {/* Import */}
      {showImport && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Import Homebrew</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '10px' }}>Paste a share string from another player to import their homebrew creation.</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <textarea value={importStr} onChange={e => setImportStr(e.target.value)} rows={3}
              placeholder="Paste share string here..."
              style={{ flex: 1, fontSize: '12px', fontFamily: 'monospace', padding: '8px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', resize: 'vertical' }} />
            <button className="btn btn-primary" onClick={doImport} disabled={!importStr.trim()} style={{ padding: '8px 20px' }}>Import</button>
          </div>
          {importError && <div style={{ color: '#f87171', fontSize: '13px', marginTop: '6px' }}>{importError}</div>}
        </div>
      )}

      {/* Creator / Editor */}
      {creating && (
        <form onSubmit={save} className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>{editing ? 'Edit' : 'Create'} Homebrew</h3>

          {/* Type selector */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {TYPES.map(t => (
              <button key={t.key} type="button" onClick={() => setType(t.key)}
                style={{
                  padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  background: form.type === t.key ? 'var(--gold)' : 'var(--surface)',
                  border: `1px solid ${form.type === t.key ? 'var(--gold)' : 'var(--border)'}`,
                  color: form.type === t.key ? 'var(--bg-dark)' : 'var(--text-dim)',
                }}>{t.label}</button>
            ))}
          </div>

          {/* Common fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Name *</label>
              <input required value={form.name} onChange={e => f('name', e.target.value)} style={formErrors.name ? ERR_STYLE : undefined} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Rarity</label>
              <select value={form.rarity} onChange={e => f('rarity', e.target.value)}>
                {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {isEquip && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Cost</label>
                  <input value={form.cost} onChange={e => f('cost', e.target.value)} placeholder="50 gp" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Weight</label>
                  <input value={form.weight} onChange={e => f('weight', e.target.value)} placeholder="3 lb." />
                </div>
              </>
            )}
          </div>

          {/* Weapon fields */}
          {form.type === 'weapon' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Subcategory</label>
                  <select value={form.subcategory} onChange={e => f('subcategory', e.target.value)} style={formErrors.subcategory ? ERR_STYLE : undefined}>
                    <option value="">Select...</option>
                    {WEAPON_SUBS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Damage Type</label>
                  <select value={form.damageType} onChange={e => f('damageType', e.target.value)} style={formErrors.damageType ? ERR_STYLE : undefined}>
                    <option value="">Select...</option>
                    {DAMAGE_TYPES.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Bonus (+1/+2/+3)</label>
                  <NumInput min={0} max={3} value={form.bonus} onChange={v => f('bonus', v)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Ammo Type</label>
                  <select value={form.ammoType} onChange={e => f('ammoType', e.target.value)}>
                    <option value="">None (melee)</option>
                    {AMMO_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Weapon Mastery (2024)</label>
                  <select value={form.mastery || ''} onChange={e => f('mastery', e.target.value)}>
                    <option value="">None</option>
                    {Object.keys(WEAPON_MASTERIES).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={form.magical} onChange={e => f('magical', e.target.checked)} /> Magical
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={attunementChecked(form)} onChange={e => setAttunement(f, e.target.checked)} /> Attunement
                  </label>
                </div>
              </div>
              {/* Dice formula builder for weapon damage */}
              <div style={{ marginBottom: '14px' }}>
                <DiceFormulaBuilder value={form.damage} onChange={v => f('damage', v)} label={`${form.name || 'Homebrew'} — Damage`} />
              </div>
            </>
          )}

          {/* Weapon properties */}
          {form.type === 'weapon' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Properties</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {WEAPON_PROPERTIES.map(p => (
                  <button key={p} type="button" onClick={() => toggleProperty(p)}
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', background: hasProp(p) ? 'var(--gold)' : 'var(--surface)', border: `1px solid ${hasProp(p) ? 'var(--gold)' : 'var(--border)'}`, color: hasProp(p) ? 'var(--bg-dark)' : 'var(--text-dim)' }}>
                    {p}
                  </button>
                ))}
                {unknownProps.map(x => (
                  <span key={x} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--text-dim)' }}>
                    {x}
                    <button type="button" onClick={() => f('properties', propList().filter(y => y !== x))}
                      title="Remove this unrecognised property"
                      style={{ marginLeft: '5px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0, fontSize: '11px' }}>✕</button>
                  </span>
                ))}
              </div>

              {/* Parameterised properties — stored the way equipment.json stores them */}
              {hasProp('Versatile') && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Versatile two-handed die</span>
                  <select value={propParams('Versatile').die || ''} onChange={e => setPropParams('Versatile', { die: e.target.value })} style={{ width: '90px' }}>
                    {VERSATILE_DICE.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              {['Thrown', 'Ammunition'].filter(hasProp).map(name => (
                <div key={name} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{name} range (ft)</span>
                  <NumInput min={0} value={propParams(name).normal ?? 0} onChange={v => setPropParams(name, { normal: v })} style={{ width: '80px' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>/</span>
                  <NumInput min={0} value={propParams(name).long ?? 0} onChange={v => setPropParams(name, { long: v })} style={{ width: '80px' }} />
                </div>
              ))}
            </div>
          )}

          {/* Armor fields */}
          {form.type === 'armor' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Armor Type</label>
                <select value={form.subcategory} onChange={e => f('subcategory', e.target.value)} style={formErrors.subcategory ? ERR_STYLE : undefined}>
                  <option value="">Select...</option>
                  {ARMOR_SUBS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  {AC_FORMULA[form.subcategory] || 'Pick an armor type — it decides how DEX applies.'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Base AC</label>
                <NumInput min={0} max={30} value={form.ac} onChange={v => f('ac', v)} placeholder="15" style={formErrors.ac ? ERR_STYLE : undefined} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Bonus (+1/+2/+3)</label>
                <NumInput min={0} max={3} value={form.bonus} onChange={v => f('bonus', v)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>STR Requirement</label>
                <NumInput min={0} value={form.strReq} onChange={v => f('strReq', v)} placeholder="0" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={form.magical} onChange={e => f('magical', e.target.checked)} /> Magical
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={attunementChecked(form)} onChange={e => setAttunement(f, e.target.checked)} /> Attunement
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={form.stealthDisadvantage} onChange={e => f('stealthDisadvantage', e.target.checked)} /> Stealth Disadvantage
                </label>
              </div>
            </div>
          )}

          {/* Ammo fields */}
          {form.type === 'ammo' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Ammo Type</label>
                  <select value={form.ammoType} onChange={e => f('ammoType', e.target.value)} style={formErrors.ammoType ? ERR_STYLE : undefined}>
                    <option value="">Select...</option>
                    {AMMO_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Stack Size</label>
                  <NumInput min={1} value={form.stackSize} onChange={v => f('stackSize', v)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Bonus (+1/+2/+3)</label>
                  <NumInput min={0} max={3} value={form.bonus} onChange={v => f('bonus', v)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={form.magical} onChange={e => f('magical', e.target.checked)} /> Magical
                  </label>
                </div>
              </div>
              {/* Extra damage for magical ammo */}
              <div style={{ marginBottom: '14px' }}>
                <DiceFormulaBuilder value={form.damage} onChange={v => f('damage', v)} label={`${form.name || 'Homebrew'} — Damage`} />
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Extra damage added when this ammo is used (e.g., +1d6 fire for flame arrows)</div>
              </div>
            </>
          )}

          {/* Item / Gear fields */}
          {form.type === 'item' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Subcategory</label>
                <select value={form.subcategory} onChange={e => f('subcategory', e.target.value)}>
                  <option value="">Select...</option>
                  {GEAR_SUBS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={form.magical} onChange={e => f('magical', e.target.checked)} /> Magical
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="checkbox" checked={attunementChecked(form)} onChange={e => setAttunement(f, e.target.checked)} /> Attunement
                </label>
              </div>
            </div>
          )}

          {/* Spell fields */}
          {isSpell && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Level</label>
                  <select value={form.level} onChange={e => f('level', parseInt(e.target.value))}>
                    <option value={0}>Cantrip</option>
                    {[1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>School</label>
                  <select value={form.school} onChange={e => f('school', e.target.value)} style={formErrors.school ? ERR_STYLE : undefined}>
                    <option value="">Select...</option>
                    {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Casting Time</label>
                  <input value={form.castingTime} onChange={e => f('castingTime', e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Range</label>
                  <input value={form.range} onChange={e => f('range', e.target.value)} placeholder="60 feet" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Duration</label>
                  <input value={form.duration} onChange={e => f('duration', e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Damage Type</label>
                  <select value={form.damageType} onChange={e => f('damageType', e.target.value)}>
                    <option value="">None</option>
                    {DAMAGE_TYPES.map(d => <option key={d} value={d.toLowerCase()}>{d}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Attack Type</label>
                  <select value={form.attackType} onChange={e => f('attackType', e.target.value)}>
                    <option value="">None</option>
                    {ATTACK_TYPES.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)} Spell Attack</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Saving Throw</label>
                  <select value={form.savingThrow} onChange={e => f('savingThrow', e.target.value)}>
                    <option value="">None</option>
                    {SAVE_ABILITIES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                {form.savingThrow && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Save Effect</label>
                    <input value={form.saveEffect} onChange={e => f('saveEffect', e.target.value)} placeholder="Half damage" />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '20px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={form.concentration} onChange={e => f('concentration', e.target.checked)} /> Conc.
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={form.ritual} onChange={e => f('ritual', e.target.checked)} /> Ritual
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={form.aoe} onChange={e => { f('aoe', e.target.checked); if (!e.target.checked) { f('aoeShape', ''); f('aoeSize', 0); } }} /> AOE
                  </label>
                </div>
              </div>

              {/* AOE Details */}
              {form.aoe && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Shape</label>
                    <select value={form.aoeShape} onChange={e => f('aoeShape', e.target.value)}>
                      <option value="">Select...</option>
                      {['Sphere', 'Cone', 'Cube', 'Cylinder', 'Line', 'Square', 'Wall'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Size (ft)</label>
                    <NumInput min={0} value={form.aoeSize} onChange={v => f('aoeSize', v)} placeholder="20" style={{ width: '80px' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', paddingBottom: '6px' }}>
                    {form.aoeShape && form.aoeSize ? `${form.aoeSize}-foot ${form.aoeShape.toLowerCase()}` : ''}
                  </div>
                </div>
              )}

              {/* Components */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Components</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {['V', 'S', 'M'].map(c => (
                    <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px' }}>
                      <input type="checkbox" checked={form.components.includes(c)} onChange={() => toggleArrayField('components', c)} /> {c === 'V' ? 'Verbal' : c === 'S' ? 'Somatic' : 'Material'}
                    </label>
                  ))}
                  {form.components.includes('M') && (
                    <input value={form.materialComponent} onChange={e => f('materialComponent', e.target.value)} placeholder="Material component..." style={{ flex: 1, minWidth: '150px' }} />
                  )}
                </div>
              </div>

              {/* Spell Lists */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Spell Lists</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {CLASSES.map(c => (
                    <button key={c} type="button" onClick={() => toggleArrayField('classes', c)}
                      style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', background: (form.classes || []).includes(c) ? 'var(--gold)' : 'var(--surface)', border: `1px solid ${(form.classes || []).includes(c) ? 'var(--gold)' : 'var(--border)'}`, color: (form.classes || []).includes(c) ? 'var(--bg-dark)' : 'var(--text-dim)' }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dice formula builder for spell damage */}
              <div style={{ marginBottom: '14px' }}>
                <DiceFormulaBuilder value={form.damage} onChange={v => f('damage', v)} label={`${form.name || 'Homebrew'} — Damage`} />
              </div>

              {/* Upcast scaling */}
              {form.level > 0 && form.damage && (
                <div style={{ marginBottom: '14px', padding: '12px', background: 'var(--bg-dark)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <label style={{ fontSize: '12px', color: 'var(--gold)', textTransform: 'uppercase', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Upcast Scaling (per level above base)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Add</span>
                    <DiceFormulaBuilder value={form.scaling} onChange={v => f('scaling', v)} label={`${form.name || 'Homebrew'} — Scaling`} />
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>per slot level above {form.level}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
                    Example: Fireball base is 8d6 at level 3. Scaling is 1d6 — at level 4 it becomes 9d6, at level 5 it becomes 10d6.
                  </div>
                </div>
              )}

              {/* Higher Levels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>At Higher Levels (description)</label>
                <textarea rows={2} value={form.higherLevels} onChange={e => f('higherLevels', e.target.value)} placeholder="When you cast this spell using a spell slot of Xth level or higher..." style={{ resize: 'vertical' }} />
              </div>
            </>
          )}

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Description *</label>
            <textarea required rows={4} value={form.description} onChange={e => f('description', e.target.value)} placeholder="Describe your creation..." style={{ resize: 'vertical' }} />
          </div>

          {Object.keys(formErrors).length > 0 && (
            <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '10px', padding: '8px 10px', border: '1px solid #f87171', borderRadius: '6px', background: 'rgba(248, 113, 113, 0.08)' }}>
              {Object.entries(formErrors).map(([k, msg]) => <div key={k}>{msg}</div>)}
            </div>
          )}
          {Object.keys(liveWarnings).length > 0 && (
            <div style={{ color: '#fbbf24', fontSize: '13px', marginBottom: '10px', padding: '8px 10px', border: '1px solid #fbbf24', borderRadius: '6px', background: 'rgba(251, 191, 36, 0.08)' }}>
              {Object.entries(liveWarnings).map(([k, msg]) => <div key={k}>{msg}</div>)}
            </div>
          )}

          <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Create'}</button>
        </form>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search homebrew..." style={{ width: '220px', padding: '8px 12px', fontSize: '13px' }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '8px 12px', fontSize: '13px' }}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      {/* Item List */}
      {storageError && (
        <div style={{ color: storageError.startsWith('Imported') ? 'var(--gold)' : '#f87171', fontSize: '13px', marginBottom: '10px' }}>{storageError}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          <p style={{ marginBottom: '8px' }}>No homebrew items yet.</p>
          <p style={{ fontSize: '13px' }}>Create your own or import one from a friend!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {items.map(item => {
            const rc = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
            const isExpanded = expanded === item._id;
            return (
              <div key={item._id} className="card" style={{ padding: '12px 16px', borderLeft: `3px solid ${rc}`, cursor: 'pointer' }}
                onClick={() => { setExpanded(isExpanded ? null : item._id); setShareError(''); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: rc, fontSize: '15px' }}>{item.name}</span>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ fontSize: '10px', padding: '1px 6px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>{item.type}</span>
                      {item.rarity !== 'common' && <span style={{ fontSize: '11px', color: rc }}>{item.rarity}</span>}
                      {item.magical && <span style={{ fontSize: '11px', color: '#a335ee' }}>Magical</span>}
                      {item.damage && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{item.damage} {item.damageType}</span>}
                      {item.level !== undefined && item.type === 'spell' && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{item.level === 0 ? 'Cantrip' : `Level ${item.level}`}{item.school ? ` ${item.school}` : ''}</span>}
                      {item.createdBy && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>by {item.createdBy}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{isExpanded ? '▴' : '▾'}</span>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }} onClick={e => e.stopPropagation()}>
                    <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '10px', whiteSpace: 'pre-line' }}>{item.description}</p>

                    {item.type !== 'spell' && (
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', marginBottom: '10px' }}>
                        {item.cost && <span><strong style={{ color: 'var(--text)' }}>Cost:</strong> {item.cost}</span>}
                        {item.weight && <span><strong style={{ color: 'var(--text)' }}>Weight:</strong> {item.weight}</span>}
                        {item.ac && <span><strong style={{ color: 'var(--text)' }}>AC:</strong> {item.ac}</span>}
                        {item.properties?.length > 0 && <span><strong style={{ color: 'var(--text)' }}>Properties:</strong> {item.properties.join(', ')}</span>}
                      </div>
                    )}

                    {item.type === 'spell' && (
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)' }}>
                        {item.castingTime && <span><strong style={{ color: 'var(--text)' }}>Cast:</strong> {item.castingTime}</span>}
                        {item.range && <span><strong style={{ color: 'var(--text)' }}>Range:</strong> {item.range}</span>}
                        {item.duration && <span><strong style={{ color: 'var(--text)' }}>Duration:</strong> {item.duration}</span>}
                        {item.components?.length > 0 && <span><strong style={{ color: 'var(--text)' }}>Components:</strong> {item.components.join(', ')}</span>}
                        {item.classes?.length > 0 && <span><strong style={{ color: 'var(--text)' }}>Classes:</strong> {item.classes.join(', ')}</span>}
                        {item.higherLevels && <span><strong style={{ color: 'var(--text)' }}>Higher Levels:</strong> {item.higherLevels}</span>}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => exportItem(item._id)}>
                        {copiedId === item._id ? '✓ Copied!' : 'Copy Share Code'}
                      </button>
                      <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => startEdit(item)}>Edit</button>
                      <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => duplicateItem(item._id)}>Duplicate</button>
                      <button className="btn btn-danger" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => deleteItem(item._id)}>Delete</button>
                    </div>

                    {shareError && shareCode?.id !== item._id && (
                      <div style={{ color: '#f87171', fontSize: '12px', marginTop: '8px' }}>{shareError}</div>
                    )}

                    {shareCode?.id === item._id && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                          {copiedId === item._id ? 'Copied to clipboard' : 'Select and copy this code'}
                        </div>
                        <textarea readOnly value={shareCode.code} rows={3}
                          onFocus={e => e.target.select()}
                          style={{ width: '100%', fontSize: '11px', fontFamily: 'monospace', padding: '8px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', resize: 'vertical' }} />
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
