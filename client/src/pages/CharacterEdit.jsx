import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ImageCropper from '../components/ImageCropper';
import NumInput from '../components/NumInput';
import Tip from '../components/Tip';
import {
  ABILITIES, ABBR, ALIGNMENTS, ALL_SKILLS, SKILLS_WITH_ABILITY, STANDARD_ARRAY, PB_COSTS,
  TOOL_OPTIONS, FEATS, RARITY_COLORS, RARITY_ORDER, HIT_DICE,
  CANTRIPS_KNOWN, SPELLS_KNOWN, BACKGROUNDS,
} from '../utils/dndConstants';
import { modVal, modStr, profBonus, xpForLevel, rarityColor, rarityBg, maxSpellLevel } from '../utils/dndHelpers';
import { CLASSES, RACES, SAVING_THROWS_BY_CLASS } from '../utils/classData';

// Skill count by class
const CLASS_NUM_SKILLS = {
  Barbarian: 2, Bard: 3, Cleric: 2, Druid: 2, Fighter: 2, Monk: 2,
  Paladin: 2, Ranger: 3, Rogue: 4, Sorcerer: 2, Warlock: 2, Wizard: 2, Artificer: 2,
};

// Background skill counts (always 2)
const BG_SKILL_COUNT = 2;

// Racial bonus skills
const RACIAL_BONUS_SKILLS = {
  'Half-Elf': 2, 'Human (Variant)': 1,
  'Kenku': 2, 'Lizardfolk': 2, 'Orc': 2, 'Changeling': 2, 'Warforged': 1, 'Kobold': 1,
};

// ASI levels per class (levels where ASI/feat is gained)
const ASI_LEVELS = {
  Barbarian: [4,8,12,16,19], Bard: [4,8,12,16,19], Cleric: [4,8,12,16,19],
  Druid: [4,8,12,16,19], Fighter: [4,6,8,12,14,16,19], Monk: [4,8,12,16,19],
  Paladin: [4,8,12,16,19], Ranger: [4,8,12,16,19], Rogue: [4,8,10,12,16,19],
  Sorcerer: [4,8,12,16,19], Warlock: [4,8,12,16,19], Wizard: [4,8,12,16,19],
  Artificer: [4,8,12,16,19],
};

const SPELLCASTING_CLASSES = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard', 'Paladin', 'Ranger', 'Artificer'];

// Spellcasting ability by class
const CLASS_SPELL_ABILITY = {
  Bard: 'charisma', Cleric: 'wisdom', Druid: 'wisdom', Paladin: 'charisma',
  Ranger: 'wisdom', Sorcerer: 'charisma', Warlock: 'charisma', Wizard: 'intelligence', Artificer: 'intelligence',
};

function getSpellLimits(cls, lvl, abilityMod) {
  if (!SPELLCASTING_CLASSES.includes(cls)) return null;
  if (['Paladin','Ranger'].includes(cls) && lvl < 2) return null;
  const idx = Math.min(lvl, 20) - 1;
  const cantrips = CANTRIPS_KNOWN[cls]?.[idx] || 0;
  const maxLvl = maxSpellLevel(cls, lvl);

  if (SPELLS_KNOWN[cls]) {
    return { cantrips, maxSpells: SPELLS_KNOWN[cls][idx] || 0, type: 'known', maxLevel: maxLvl };
  }
  if (['Cleric','Druid'].includes(cls)) {
    return { cantrips, maxSpells: Math.max(1, abilityMod + lvl), type: 'prepared', maxLevel: maxLvl };
  }
  if (cls === 'Paladin') {
    return { cantrips: 0, maxSpells: Math.max(1, abilityMod + Math.floor(lvl / 2)), type: 'prepared', maxLevel: maxLvl };
  }
  if (cls === 'Wizard') {
    const bookSize = 6 + (lvl - 1) * 2;
    return { cantrips, maxSpells: bookSize, prepareCount: Math.max(1, abilityMod + lvl), type: 'spellbook', maxLevel: maxLvl };
  }
  if (cls === 'Artificer') {
    return { cantrips, maxSpells: Math.max(1, abilityMod + Math.floor(lvl / 2)), type: 'prepared', maxLevel: maxLvl };
  }
  return { cantrips, maxSpells: 0, type: 'known', maxLevel: maxLvl };
}

const SECTIONS = ['Basic Info', 'Ability Scores', 'Skills', 'Combat', 'Equipment', 'Spells', 'Features & Feats', 'Details', 'Notes', 'Settings'];

export default function CharacterEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState(0);
  const [char, setChar] = useState(null);

  // Editable form state
  const [form, setForm] = useState({});
  const [cropSrc, setCropSrc] = useState(null); // image source for cropper

  // Equipment search
  const [equipSearch, setEquipSearch] = useState('');
  const [equipResults, setEquipResults] = useState([]);
  const [equipLoading, setEquipLoading] = useState(false);
  const [equipCategory, setEquipCategory] = useState('');

  // Spell search
  const [spellSearch, setSpellSearch] = useState('');
  const [spellResults, setSpellResults] = useState([]);
  const [spellLoading, setSpellLoading] = useState(false);
  const [expandedSpell, setExpandedSpell] = useState(null);
  const [expandedEquip, setExpandedEquip] = useState(null);

  // Class change confirmation dialog
  const [classChangeDialog, setClassChangeDialog] = useState(null);

  // Ability score method
  const [abilityMethod, setAbilityMethod] = useState('pointbuy');
  const [stdAssign, setStdAssign] = useState({});
  const [pbScores, setPbScores] = useState({ strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 });
  const [manualScores, setManualScores] = useState({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 });

  useEffect(() => {
    fetch(`/api/characters/${id}`).then(r => r.json()).then(data => {
      setChar(data);
      setForm({
        name: data.name || '',
        race: data.race || '',
        class: data.class || '',
        subclass: data.subclass || '',
        level: data.level || 1,
        background: data.background || '',
        alignment: data.alignment || '',
        faith: data.faith || '',
        avatarUrl: data.avatarUrl || '',
        abilityScores: { ...data.abilityScores },
        skillProficiencies: [...(data.skillProficiencies || [])],
        skillExpertise: [...(data.skillExpertise || [])],
        savingThrowProficiencies: [...(data.savingThrowProficiencies || [])],
        maxHp: data.maxHp || 10,
        armorClass: data.armorClass || 10,
        speed: data.speed || 30,
        hitDice: data.hitDice || '1d8',
        proficiencyBonus: data.proficiencyBonus || 2,
        levelingMethod: data.levelingMethod || 'milestone',
        experiencePoints: data.experiencePoints || 0,
        equipment: [...(data.equipment || [])],
        gold: data.gold || 0,
        currency: data.currency || { cp: 0, sp: 0, ep: 0, gp: data.gold || 0, pp: 0 },
        preparedSpells: [...(data.preparedSpells || [])],
        spellcastingAbility: data.spellcastingAbility || '',
        features: [...(data.features || [])],
        feats: [...(data.feats || [])],
        traits: data.traits || '',
        ideals: data.ideals || '',
        bonds: data.bonds || '',
        flaws: data.flaws || '',
        notes: data.notes || '',
        languages: [...(data.languages || [])],
        toolProficiencies: [...(data.toolProficiencies || [])],
        age: data.age || '',
        height: data.height || '',
        weight: data.weight || '',
        eyes: data.eyes || '',
        hair: data.hair || '',
        skin: data.skin || '',
      });
      // Initialize ability score method from existing scores
      const s = data.abilityScores || {};
      setManualScores({ strength: s.strength || 10, dexterity: s.dexterity || 10, constitution: s.constitution || 10, intelligence: s.intelligence || 10, wisdom: s.wisdom || 10, charisma: s.charisma || 10 });
      setPbScores({ strength: Math.max(8, Math.min(15, s.strength || 8)), dexterity: Math.max(8, Math.min(15, s.dexterity || 8)), constitution: Math.max(8, Math.min(15, s.constitution || 8)), intelligence: Math.max(8, Math.min(15, s.intelligence || 8)), wisdom: Math.max(8, Math.min(15, s.wisdom || 8)), charisma: Math.max(8, Math.min(15, s.charisma || 8)) });
      // Try to detect if current scores match standard array
      const vals = ABILITIES.map(ab => s[ab] || 10).sort((a, b) => b - a);
      const isStdArray = JSON.stringify(vals) === JSON.stringify([...STANDARD_ARRAY]);
      setAbilityMethod(isStdArray ? 'standard' : 'manual');
      setLoading(false);
    });
  }, [id]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // Toggle arrays
  const toggleArr = (key, val) => setForm(prev => {
    const arr = prev[key] || [];
    return { ...prev, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
  });
  const removeFromArr = (key, idx) => setForm(prev => {
    const arr = [...(prev[key] || [])];
    arr.splice(idx, 1);
    return { ...prev, [key]: arr };
  });
  const addToArr = (key, val) => setForm(prev => ({
    ...prev, [key]: [...(prev[key] || []), val],
  }));

  // Equipment search
  // Auto-fetch equipment on search/category change
  useEffect(() => {
    if (!equipSearch && !equipCategory) { setEquipResults([]); return; }
    setEquipLoading(true);
    const params = new URLSearchParams();
    if (equipSearch) params.set('search', equipSearch);
    if (equipCategory) params.set('category', equipCategory);
    fetch(`/api/equipment?${params}`)
      .then(r => r.json())
      .then(data => {
        const items = data.equipment || data || [];
        items.sort((a, b) => (RARITY_ORDER[a.rarity || 'common'] ?? 0) - (RARITY_ORDER[b.rarity || 'common'] ?? 0));
        setEquipResults(items);
        setEquipLoading(false);
      })
      .catch(() => setEquipLoading(false));
  }, [equipSearch, equipCategory]);

  // Fetch all available spells for class
  const [allSpells, setAllSpells] = useState([]);
  useEffect(() => {
    if (!form.class) return;
    if (!SPELLCASTING_CLASSES.includes(form.class)) { setAllSpells([]); return; }
    setSpellLoading(true);
    fetch(`/api/spells?class=${form.class}`)
      .then(r => r.json())
      .then(data => { setAllSpells(data.spells || data || []); setSpellLoading(false); })
      .catch(() => setSpellLoading(false));
  }, [form.class]);

  // Auto-calculate proficiency bonus from level
  const computedProfBonus = useMemo(() => profBonus(form.level || 1), [form.level]);
  const scores = form.abilityScores || {};

  // Point buy points remaining
  const pbPointsLeft = useMemo(() => {
    return 27 - ABILITIES.reduce((sum, ab) => sum + (PB_COSTS[pbScores[ab]] || 0), 0);
  }, [pbScores]);

  // Max skill proficiencies = class skills + background (2) + racial bonuses
  const maxSkills = useMemo(() => {
    const classSkills = CLASS_NUM_SKILLS[form.class] || 2;
    const racialSkills = RACIAL_BONUS_SKILLS[form.race] || 0;
    return classSkills + BG_SKILL_COUNT + racialSkills;
  }, [form.class, form.race]);

  // Max feats from ASI count (+ 1 for variant human)
  const asiCount = useMemo(() => {
    const levels = ASI_LEVELS[form.class];
    if (!levels) return 0;
    return levels.filter(l => l <= (form.level || 1)).length;
  }, [form.class, form.level]);

  const isVariantHuman = (form.race || '').includes('Variant') || (form.race || '').includes('variant');
  const maxFeats = asiCount + (isVariantHuman ? 1 : 0);

  // Spell limits
  const spellcastingMod = useMemo(() => {
    if (!form.spellcastingAbility || !scores[form.spellcastingAbility]) return 0;
    return modVal(scores[form.spellcastingAbility]);
  }, [form.spellcastingAbility, scores]);

  const spellLimits = useMemo(() => {
    return getSpellLimits(form.class, form.level || 1, spellcastingMod);
  }, [form.class, form.level, spellcastingMod]);

  // Class change handler — shows confirmation dialog
  const handleClassChange = async (newClass) => {
    const oldClass = form.class;
    if (newClass === oldClass) return;

    const oldSaves = SAVING_THROWS_BY_CLASS[oldClass] || [];
    const newSaves = SAVING_THROWS_BY_CLASS[newClass] || [];
    const oldHD = HIT_DICE[oldClass] || 'd8';
    const newHD = HIT_DICE[newClass] || 'd8';
    const racialSkills = RACIAL_BONUS_SKILLS[form.race] || 0;
    const oldSkillLimit = (CLASS_NUM_SKILLS[oldClass] || 2) + BG_SKILL_COUNT + racialSkills;
    const newSkillLimit = (CLASS_NUM_SKILLS[newClass] || 2) + BG_SKILL_COUNT + racialSkills;
    const oldAsi = (ASI_LEVELS[oldClass] || []).filter(l => l <= (form.level || 1)).length;
    const newAsi = (ASI_LEVELS[newClass] || []).filter(l => l <= (form.level || 1)).length;
    const oldIsCaster = SPELLCASTING_CLASSES.includes(oldClass);
    const newIsCaster = SPELLCASTING_CLASSES.includes(newClass);
    const newSpellAbility = CLASS_SPELL_ABILITY[newClass] || '';

    // Set dialog with loading state
    setClassChangeDialog({
      oldClass, newClass, loading: true,
      changes: { oldSaves, newSaves, oldHD, newHD, oldSkillLimit, newSkillLimit, oldAsi, newAsi, oldIsCaster, newIsCaster, newSpellAbility },
      spellsToRemove: [], spellsToKeep: [],
    });

    // Fetch spell lists to determine which spells to remove
    const currentSpells = form.preparedSpells || [];
    if (currentSpells.length > 0) {
      try {
        const fetches = [];
        if (newIsCaster) fetches.push(fetch(`/api/spells?class=${encodeURIComponent(newClass)}&limit=1000`).then(r => r.json()));
        else fetches.push(Promise.resolve([]));
        if (oldIsCaster) fetches.push(fetch(`/api/spells?class=${encodeURIComponent(oldClass)}&limit=1000`).then(r => r.json()));
        else fetches.push(Promise.resolve([]));

        const [newData, oldData] = await Promise.all(fetches);
        const newSpellNames = new Set((newData.spells || newData || []).map(s => s.name));
        const oldSpellNames = new Set((oldData.spells || oldData || []).map(s => s.name));

        const spellsToRemove = [];
        const spellsToKeep = [];
        currentSpells.forEach(name => {
          const wasOldClassSpell = oldSpellNames.has(name);
          const isNewClassSpell = newSpellNames.has(name);
          if (wasOldClassSpell && !isNewClassSpell) {
            spellsToRemove.push(name);
          } else {
            spellsToKeep.push(name);
          }
        });

        setClassChangeDialog(prev => prev ? { ...prev, loading: false, spellsToRemove, spellsToKeep } : null);
      } catch {
        // On error, don't remove any spells — let user decide manually
        setClassChangeDialog(prev => prev ? { ...prev, loading: false, spellsToRemove: [], spellsToKeep: currentSpells } : null);
      }
    } else {
      setClassChangeDialog(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  const confirmClassChange = () => {
    if (!classChangeDialog) return;
    const { newClass, spellsToRemove, changes } = classChangeDialog;
    const removeSet = new Set(spellsToRemove);

    setForm(prev => {
      // Update hit dice: replace die type but keep level prefix
      const hdMatch = (prev.hitDice || '').match(/^(\d+)/);
      const hdLevel = hdMatch ? hdMatch[1] : prev.level;
      return {
        ...prev,
        class: newClass,
        subclass: '',
        savingThrowProficiencies: SAVING_THROWS_BY_CLASS[newClass] || [],
        hitDice: `${hdLevel}${changes.newHD}`,
        spellcastingAbility: changes.newSpellAbility,
        preparedSpells: (prev.preparedSpells || []).filter(s => !removeSet.has(s)),
      };
    });
    setClassChangeDialog(null);
  };

  // Save
  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const body = {
        ...form,
        proficiencyBonus: computedProfBonus,
        currentHp: Math.min(char.currentHp ?? form.maxHp, form.maxHp),
      };
      const res = await fetch(`/api/characters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch { alert('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>;
  if (!char) return <div className="page" style={{ textAlign: 'center', padding: '60px' }}>Character not found.</div>;

  // ─── Styles ──────────────────────────────────────
  const st = {
    layout: { display: 'grid', gridTemplateColumns: '220px 1fr', gap: '20px', alignItems: 'start' },
    sidebar: { display: 'flex', flexDirection: 'column', gap: '2px', position: 'sticky', top: '80px' },
    navItem: (active) => ({
      padding: '10px 16px', borderRadius: '6px', cursor: 'pointer',
      fontSize: '13px', fontFamily: 'Cinzel, serif', fontWeight: active ? 700 : 400,
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? 'var(--gold)' : 'var(--text)',
      border: active ? '1px solid var(--gold-dim)' : '1px solid transparent',
      transition: 'all 0.15s',
    }),
    card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', marginBottom: '16px' },
    sectionTitle: { fontSize: '18px', marginBottom: '16px', color: 'var(--gold)', fontFamily: 'Cinzel, serif' },
    label: { fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' },
    input: { width: '100%', fontSize: '13px', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' },
    badge: (active) => ({
      padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
      background: active ? 'var(--accent)' : 'var(--surface)',
      border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
      color: active ? 'var(--gold)' : 'var(--text)',
      transition: 'all 0.15s',
    }),
    skillRow: (prof) => ({
      display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
      borderRadius: '6px', cursor: 'pointer',
      background: prof ? 'var(--accent)' : 'transparent',
      border: `1px solid ${prof ? 'var(--gold-dim)' : 'var(--border)'}`,
    }),
  };

  return (
    <div className="page" style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', margin: 0, fontFamily: 'Cinzel, serif' }}>Edit Character</h2>
          <div style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '4px' }}>{form.name || 'Unnamed'} — {form.race} {form.class} {form.level}</div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {saved && <span style={{ color: '#4ade80', fontSize: '13px' }}>Saved!</span>}
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ padding: '8px 24px' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link to={`/characters/${id}`} className="btn btn-ghost">← Back to Sheet</Link>
        </div>
      </div>

      <div style={st.layout}>
        {/* Section nav */}
        <div style={st.sidebar}>
          {SECTIONS.map((s, i) => (
            <div key={s} className="cc-skill" style={st.navItem(i === section)} onClick={() => setSection(i)}>{s}</div>
          ))}
        </div>

        {/* Content */}
        <div>

          {/* ═══ BASIC INFO ═══ */}
          {section === 0 && (
            <div style={st.card}>
              <h3 style={st.sectionTitle}>Basic Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={st.grid2}>
                  <div>
                    <label style={st.label}>Name</label>
                    <input style={st.input} value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                  <div>
                    <label style={st.label}>Level</label>
                    <NumInput style={st.input} min={1} max={20} value={form.level} onChange={v => set('level', v)} />
                  </div>
                </div>

                <div style={st.grid2}>
                  <div>
                    <label style={st.label}>Leveling Method</label>
                    <select style={st.input} value={form.levelingMethod} onChange={e => set('levelingMethod', e.target.value)}>
                      <option value="milestone">Milestone</option>
                      <option value="xp">Experience Points (XP)</option>
                    </select>
                  </div>
                  {form.levelingMethod === 'xp' && (
                    <div>
                      <label style={st.label}>Experience Points</label>
                      <NumInput style={st.input} min={0} value={form.experiencePoints}
                        onChange={v => set('experiencePoints', v)} />
                    </div>
                  )}
                </div>
                {form.levelingMethod === 'xp' && (() => {
                  const currentXp = form.experiencePoints || 0;
                  const currentLevelXp = xpForLevel(form.level);
                  const nextLevelXp = form.level < 20 ? xpForLevel(form.level + 1) : xpForLevel(20);
                  const progress = nextLevelXp > currentLevelXp ? Math.min(100, ((currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100) : 100;
                  return (
                    <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '6px' }}>
                        <span>Level {form.level}: {currentLevelXp.toLocaleString()} XP</span>
                        {form.level < 20 && <span>Level {form.level + 1}: {nextLevelXp.toLocaleString()} XP</span>}
                      </div>
                      <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--gold)', borderRadius: '4px', transition: 'width 0.3s', width: `${progress}%` }} />
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--gold)', marginTop: '4px', textAlign: 'center' }}>
                        {currentXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
                        {currentXp >= nextLevelXp && form.level < 20 && <span style={{ color: '#4ade80', marginLeft: '8px' }}>Ready to level up!</span>}
                      </div>
                    </div>
                  );
                })()}

                <div style={st.grid2}>
                  <div>
                    <label style={st.label}>Race</label>
                    <select style={st.input} value={form.race} onChange={e => set('race', e.target.value)}>
                      <option value="">Select...</option>
                      {Object.keys(RACES).map(r => <option key={r} value={r}>{r}</option>)}
                      {/* Allow custom race if current doesn't match list */}
                      {form.race && !RACES[form.race] && <option value={form.race}>{form.race}</option>}
                    </select>
                  </div>
                  <div>
                    <label style={st.label}>Class</label>
                    <select style={st.input} value={form.class} onChange={e => {
                      const newClass = e.target.value;
                      if (!newClass || newClass === form.class) return;
                      handleClassChange(newClass);
                    }}>
                      <option value="">Select...</option>
                      {Object.keys(CLASSES).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div style={st.grid2}>
                  <div>
                    <label style={st.label}>Subclass</label>
                    <input style={st.input} value={form.subclass} onChange={e => set('subclass', e.target.value)} />
                  </div>
                  <div>
                    <label style={st.label}>Background</label>
                    <select style={st.input} value={form.background} onChange={e => set('background', e.target.value)}>
                      <option value="">Select...</option>
                      {Object.keys(BACKGROUNDS).map(b => <option key={b} value={b}>{b}</option>)}
                      {form.background && !BACKGROUNDS[form.background] && <option value={form.background}>{form.background}</option>}
                    </select>
                  </div>
                </div>

                <div style={st.grid2}>
                  <div>
                    <label style={st.label}>Alignment</label>
                    <select style={st.input} value={form.alignment} onChange={e => set('alignment', e.target.value)}>
                      <option value="">Select...</option>
                      {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={st.label}>Faith</label>
                    <input style={st.input} value={form.faith} onChange={e => set('faith', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label style={st.label}>Profile Picture</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {form.avatarUrl ? (
                      <img src={form.avatarUrl} alt="" style={{ width: '64px', height: '64px', borderRadius: '4px', objectFit: 'cover', border: '2px solid var(--gold-dim)' }} />
                    ) : (
                      <div style={{ width: '64px', height: '64px', borderRadius: '4px', background: 'var(--surface)', border: '2px solid var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'var(--gold-dim)', fontWeight: 700 }}>
                        {(form.name || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <label className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
                        Upload Image
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const url = URL.createObjectURL(file);
                          setCropSrc(url);
                          e.target.value = '';
                        }} />
                      </label>
                      <input style={{ ...st.input, fontSize: '11px' }} value={form.avatarUrl} onChange={e => set('avatarUrl', e.target.value)} placeholder="Or paste URL..." />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={st.label}>Languages</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {(form.languages || []).map((lang, i) => (
                      <span key={i} style={{ padding: '4px 10px', background: 'var(--accent)', border: '1px solid var(--gold-dim)', borderRadius: '4px', fontSize: '12px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {lang}
                        <span style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => removeFromArr('languages', i)}>✕</span>
                      </span>
                    ))}
                  </div>
                  <input style={{ ...st.input, width: '200px' }} placeholder="Add language..." onKeyDown={e => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      addToArr('languages', e.target.value.trim());
                      e.target.value = '';
                    }
                  }} />
                </div>

                <div>
                  <label style={st.label}>Tool Proficiencies</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {(form.toolProficiencies || []).map((tool, i) => (
                      <span key={i} style={{ padding: '4px 10px', background: 'var(--accent)', border: '1px solid var(--gold-dim)', borderRadius: '4px', fontSize: '12px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {tool}
                        <span style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => removeFromArr('toolProficiencies', i)}>✕</span>
                      </span>
                    ))}
                  </div>
                  <select style={{ ...st.input, width: '240px' }} value="" onChange={e => {
                    if (e.target.value && !(form.toolProficiencies || []).includes(e.target.value)) {
                      addToArr('toolProficiencies', e.target.value);
                    }
                  }}>
                    <option value="">Add tool proficiency...</option>
                    {TOOL_OPTIONS.filter(t => !(form.toolProficiencies || []).includes(t)).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Auto-Calculated</div>
                  <div style={{ fontSize: '13px' }}>Proficiency Bonus: <strong style={{ color: 'var(--gold)' }}>+{computedProfBonus}</strong> (from level {form.level})</div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ABILITY SCORES ═══ */}
          {section === 1 && (
            <div style={st.card}>
              <h3 style={st.sectionTitle}>Ability Scores</h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {[['standard', 'Standard Array (15,14,13,12,10,8)'], ['pointbuy', 'Point Buy (27 pts)'], ['manual', 'Manual Entry']].map(([m, lbl]) => (
                  <button key={m} onClick={() => setAbilityMethod(m)} className={`btn ${abilityMethod === m ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '12px' }}>{lbl}</button>
                ))}
              </div>

              {/* Standard Array */}
              {abilityMethod === 'standard' && (
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {STANDARD_ARRAY.map(v => {
                      const used = Object.values(stdAssign).includes(String(v));
                      return <span key={v} style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '18px', fontWeight: 700, background: used ? 'var(--surface)' : 'var(--accent)', border: `1px solid ${used ? 'var(--border)' : 'var(--gold-dim)'}`, color: used ? 'var(--text-dim)' : 'var(--gold)', textDecoration: used ? 'line-through' : 'none' }}>{v}</span>;
                    })}
                  </div>
                  <div style={st.grid3}>
                    {ABILITIES.map(ab => (
                      <div key={ab} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{ABBR[ab]}</label>
                        <select style={st.input} value={stdAssign[ab] || ''} onChange={e => {
                          const val = e.target.value;
                          setStdAssign(prev => {
                            const next = { ...prev };
                            Object.keys(next).forEach(k => { if (next[k] === val && k !== ab) next[k] = ''; });
                            next[ab] = val;
                            // Update form scores
                            const newScores = {};
                            ABILITIES.forEach(a => { newScores[a] = Number(next[a]) || 10; });
                            setForm(f => ({ ...f, abilityScores: newScores }));
                            return next;
                          });
                        }}>
                          <option value="">—</option>
                          {STANDARD_ARRAY.map(v => {
                            const takenBy = Object.entries(stdAssign).find(([k, val]) => val === String(v) && k !== ab);
                            return <option key={v} value={v} disabled={!!takenBy}>{v}{takenBy ? ` (${ABBR[takenBy[0]]})` : ''}</option>;
                          })}
                        </select>
                        {stdAssign[ab] && (
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            Score: <strong style={{ color: 'var(--gold)' }}>{stdAssign[ab]}</strong> ({modStr(Number(stdAssign[ab]))})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Point Buy */}
              {abilityMethod === 'pointbuy' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>Scores 8–15. Costs: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9</p>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: pbPointsLeft >= 0 ? 'var(--gold)' : '#f87171' }}>{pbPointsLeft} pts</span>
                  </div>
                  <div style={st.grid3}>
                    {ABILITIES.map(ab => {
                      const v = pbScores[ab];
                      return (
                        <div key={ab} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', padding: '12px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{ABBR[ab]}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button className="cc-skill" onClick={() => {
                              if (v > 8) {
                                const newScores = { ...pbScores, [ab]: v - 1 };
                                setPbScores(newScores);
                                setForm(f => ({ ...f, abilityScores: newScores }));
                              }
                            }} style={{ width: '28px', height: '28px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text)', fontSize: '16px' }}>−</button>
                            <span style={{ fontSize: '22px', fontWeight: 700, minWidth: '32px', textAlign: 'center', color: 'var(--gold)' }}>{v}</span>
                            <button className="cc-skill" onClick={() => {
                              const costIncrease = (PB_COSTS[v + 1] || 0) - (PB_COSTS[v] || 0);
                              if (v < 15 && pbPointsLeft >= costIncrease) {
                                const newScores = { ...pbScores, [ab]: v + 1 };
                                setPbScores(newScores);
                                setForm(f => ({ ...f, abilityScores: newScores }));
                              }
                            }} style={{ width: '28px', height: '28px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text)', fontSize: '16px' }}>+</button>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 700 }}>{modStr(v)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Manual Entry */}
              {abilityMethod === 'manual' && (
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '14px' }}>Enter rolled or custom scores (1–20).</p>
                  <div style={st.grid3}>
                    {ABILITIES.map(ab => (
                      <div key={ab} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', padding: '12px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{ABBR[ab]}</label>
                        <NumInput min={1} max={20} value={manualScores[ab]}
                          onChange={v => {
                            const newScores = { ...manualScores, [ab]: v };
                            setManualScores(newScores);
                            setForm(f => ({ ...f, abilityScores: newScores }));
                          }}
                          style={{ width: '60px', textAlign: 'center', fontSize: '22px', fontWeight: 700, background: 'var(--bg-card)', border: '1px solid var(--gold-dim)', borderRadius: '8px', color: 'var(--text)', padding: '6px' }}
                        />
                        <div style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 700 }}>{modStr(manualScores[ab])}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Final Scores Preview */}
              <div style={{ marginTop: '20px', padding: '12px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '10px' }}>Final Scores</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {ABILITIES.map(ab => (
                    <div key={ab} style={{ textAlign: 'center', padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{ABBR[ab]}</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gold)' }}>{scores[ab] ?? 10}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{modStr(scores[ab] ?? 10)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saving Throws */}
              <h4 style={{ fontSize: '14px', marginTop: '24px', marginBottom: '8px', color: 'var(--gold)' }}>Saving Throw Proficiencies</h4>
              <p style={{ color: 'var(--text-dim)', fontSize: '11px', marginBottom: '12px' }}>
                Determined by class. {form.class && SAVING_THROWS_BY_CLASS[form.class]
                  ? `${form.class}: ${SAVING_THROWS_BY_CLASS[form.class].map(a => ABBR[a]).join(', ')}`
                  : 'Select a class to auto-set.'}
              </p>
              <div style={st.grid3}>
                {ABILITIES.map(ab => {
                  const classSaves = SAVING_THROWS_BY_CLASS[form.class] || [];
                  const prof = (form.savingThrowProficiencies || []).includes(ab);
                  const isClassSave = classSaves.includes(ab);
                  return (
                    <div key={ab} style={{ ...st.skillRow(prof), opacity: !isClassSave && !prof ? 0.5 : 1, cursor: 'default' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid var(--gold-dim)', background: prof ? 'var(--gold)' : 'transparent' }} />
                      <span style={{ fontSize: '12px', textTransform: 'uppercase' }}>{ABBR[ab]}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--gold)', fontWeight: 700 }}>
                        {modStr(modVal(scores[ab] ?? 10) + (prof ? computedProfBonus : 0))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ SKILLS ═══ */}
          {section === 2 && (
            <div style={st.card}>
              <h3 style={st.sectionTitle}>Skill Proficiencies</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: 0 }}>Click to toggle proficiency. Right-click to toggle expertise.</p>
                <span style={{
                  fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '4px',
                  background: (form.skillProficiencies || []).length > maxSkills ? '#3e1a1a' : 'var(--accent)',
                  border: `1px solid ${(form.skillProficiencies || []).length > maxSkills ? '#ff4444' : 'var(--gold-dim)'}`,
                  color: (form.skillProficiencies || []).length > maxSkills ? '#ff6666' : 'var(--gold)',
                }}>
                  {(form.skillProficiencies || []).length}/{maxSkills} skills
                </span>
              </div>
              {(form.skillProficiencies || []).length > maxSkills && (
                <div style={{ padding: '8px 12px', background: '#3e1a1a', border: '1px solid #ff4444', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', color: '#ff6666' }}>
                  Too many skill proficiencies! Your {form.class || 'class'} gets {CLASS_NUM_SKILLS[form.class] || 2} class skills + {BG_SKILL_COUNT} background skills{RACIAL_BONUS_SKILLS[form.race] ? ` + ${RACIAL_BONUS_SKILLS[form.race]} racial` : ''} = {maxSkills} max.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {SKILLS_WITH_ABILITY.map(sk => {
                  const prof = (form.skillProficiencies || []).includes(sk.name);
                  const expert = (form.skillExpertise || []).includes(sk.name);
                  const mod = modVal(scores[sk.ability] ?? 10) + (prof ? computedProfBonus : 0) + (expert ? computedProfBonus : 0);
                  const atLimit = !prof && (form.skillProficiencies || []).length >= maxSkills;
                  return (
                    <div
                      key={sk.name}
                      style={{
                        ...st.skillRow(prof),
                        borderColor: expert ? 'var(--gold)' : prof ? 'var(--gold-dim)' : 'var(--border)',
                        opacity: atLimit ? 0.4 : 1,
                        cursor: atLimit ? 'not-allowed' : 'pointer',
                      }}
                      onClick={() => {
                        if (atLimit) return;
                        toggleArr('skillProficiencies', sk.name);
                      }}
                      onContextMenu={e => { e.preventDefault(); if (prof) toggleArr('skillExpertise', sk.name); }}
                    >
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid var(--gold-dim)', background: expert ? 'var(--gold)' : prof ? 'var(--gold)' : 'transparent', boxShadow: expert ? '0 0 0 2px var(--gold)' : 'none' }} />
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)', width: '28px', textTransform: 'uppercase' }}>{ABBR[sk.ability]}</span>
                      <span style={{ fontSize: '13px', flex: 1 }}>{sk.name}</span>
                      {expert && <span style={{ fontSize: '9px', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expert</span>}
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)' }}>{mod >= 0 ? `+${mod}` : mod}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ COMBAT ═══ */}
          {section === 3 && (
            <div style={st.card}>
              <h3 style={st.sectionTitle}>Combat Stats</h3>
              <div style={st.grid3}>
                <div>
                  <label style={st.label}>Max HP</label>
                  <NumInput style={st.input} min={1} value={form.maxHp} onChange={v => set('maxHp', v)} />
                </div>
                <div>
                  <label style={st.label}>Armor Class</label>
                  <NumInput style={st.input} min={0} value={form.armorClass} onChange={v => set('armorClass', v)} />
                </div>
                <div>
                  <label style={st.label}>Speed (ft)</label>
                  <NumInput style={st.input} min={0} value={form.speed} onChange={v => set('speed', v)} />
                </div>
              </div>
              <div style={{ ...st.grid2, marginTop: '14px' }}>
                <div>
                  <label style={st.label}>Hit Dice</label>
                  <input style={st.input} value={form.hitDice} onChange={e => set('hitDice', e.target.value)} placeholder="e.g. 5d8" />
                  {form.class && HIT_DICE[form.class] && (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      {form.class} uses {HIT_DICE[form.class]} — suggested: {form.level}{HIT_DICE[form.class]}
                    </div>
                  )}
                </div>
                <div>
                  <label style={st.label}>Spellcasting Ability</label>
                  <select style={st.input} value={form.spellcastingAbility} onChange={e => set('spellcastingAbility', e.target.value)}>
                    <option value="">None</option>
                    {ABILITIES.map(ab => <option key={ab} value={ab}>{ABBR[ab]} — {ab}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <label style={st.label}>Gold</label>
                <NumInput style={{ ...st.input, width: '120px' }} min={0} value={form.gold} onChange={v => set('gold', v)} />
              </div>
            </div>
          )}

          {/* ═══ EQUIPMENT ═══ */}
          {section === 4 && (
            <div style={st.card}>
              <h3 style={st.sectionTitle}>Equipment</h3>

              {/* Current equipment */}
              {(form.equipment || []).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                    Current Items ({(form.equipment || []).length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(form.equipment || []).map((item, i) => (
                      <span key={i} style={{
                        fontSize: '11px', padding: '3px 8px', background: 'var(--accent)',
                        border: '1px solid var(--gold-dim)', color: 'var(--gold)', borderRadius: '4px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                      }}
                        onClick={() => removeFromArr('equipment', i)}>
                        {item} ✕
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Currency */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Currency</div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'cp', label: 'CP', color: '#b87333' },
                    { key: 'sp', label: 'SP', color: '#c0c0c0' },
                    { key: 'ep', label: 'EP', color: '#8a9a5b' },
                    { key: 'gp', label: 'GP', color: 'var(--gold)' },
                    { key: 'pp', label: 'PP', color: '#e5e4e2' },
                  ].map(c => (
                    <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: c.color, minWidth: '22px' }}>{c.label}</span>
                      <NumInput style={{ ...st.input, width: '80px', textAlign: 'center' }} min={0} value={form.currency?.[c.key] ?? (c.key === 'gp' ? (form.gold || 0) : 0)}
                        onChange={v => set('currency', { ...(form.currency || {}), [c.key]: v })} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Search + Category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    placeholder="Search equipment..."
                    value={equipSearch}
                    onChange={e => setEquipSearch(e.target.value)}
                    style={{ ...st.input, width: '100%', paddingRight: equipSearch ? '32px' : undefined }}
                  />
                  {equipSearch && (
                    <button onClick={() => setEquipSearch('')} style={{
                      position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '16px',
                    }}>✕</button>
                  )}
                </div>
                <select style={st.input} value={equipCategory} onChange={e => setEquipCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  <option value="weapon">Weapons</option>
                  <option value="armor">Armor</option>
                  <option value="adventuring-gear">Adventuring Gear</option>
                  <option value="tool">Tools</option>
                  <option value="pack">Packs</option>
                  <option value="wondrous-item">Wondrous Items</option>
                  <option value="potion">Potions</option>
                  <option value="ring">Rings</option>
                  <option value="scroll">Scrolls</option>
                  <option value="wand">Wands</option>
                  <option value="rod">Rods</option>
                  <option value="staff">Staves</option>
                </select>
              </div>

              {/* Results */}
              {(equipSearch || equipCategory) ? (
                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  {equipLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '13px' }}>Loading...</div>
                  ) : equipResults.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '13px' }}>No items found.</div>
                  ) : (
                    equipResults.map(item => {
                      const alreadyAdded = (form.equipment || []).includes(item.name);
                      const isOpen = expandedEquip === item._id;
                      const hasRarity = item.rarity && item.rarity !== 'common';
                      const rc = hasRarity ? rarityColor(item.rarity) : null;
                      return (
                        <div key={item._id} style={{
                          borderBottom: '1px solid var(--surface)', overflow: 'hidden',
                          background: alreadyAdded ? 'var(--accent)' : 'var(--input-bg)',
                          opacity: alreadyAdded ? 0.6 : 1,
                          borderLeft: hasRarity ? `3px solid ${rc}` : 'none',
                        }}>
                          <div className="cc-skill" style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '8px 12px', cursor: 'pointer',
                          }}
                            onClick={() => {
                              if (alreadyAdded) {
                                const idx = (form.equipment || []).indexOf(item.name);
                                if (idx >= 0) removeFromArr('equipment', idx);
                              } else {
                                addToArr('equipment', item.name);
                              }
                            }}>
                            <span style={{
                              width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                              background: alreadyAdded ? (rc || 'var(--gold)') : 'transparent',
                              border: `2px solid ${alreadyAdded ? (rc || 'var(--gold)') : 'var(--border)'}`,
                            }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: hasRarity ? rc : 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {item.name}
                                {hasRarity && (
                                  <span style={{
                                    fontSize: '9px', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase',
                                    background: rarityBg(item.rarity), color: rc, border: `1px solid ${rc}`,
                                    letterSpacing: '0.5px', fontWeight: 600,
                                  }}>{item.rarity.replace('-', ' ')}</span>
                                )}
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <span>{item.subcategory || item.category}</span>
                                {item.damage && <span>{item.damage} {item.damageType}</span>}
                                {item.ac && <span>AC {item.ac}</span>}
                                {item.cost && <span>{item.cost}</span>}
                                {item.weight && <span>{item.weight}</span>}
                              </div>
                            </div>
                            <span style={{ fontSize: '14px', color: 'var(--text-dim)', padding: '2px 6px' }}
                              onClick={e => { e.stopPropagation(); setExpandedEquip(isOpen ? null : item._id); }}>
                              {isOpen ? '−' : '+'}
                            </span>
                          </div>
                          {isOpen && (
                            <div style={{ padding: '0 12px 10px', borderTop: `1px solid ${hasRarity ? rc + '30' : 'var(--border)'}` }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: 'var(--text-dim)', padding: '8px 0 4px' }}>
                                {item.cost && <span><strong>Cost:</strong> {item.cost}</span>}
                                {item.weight && <span><strong>Weight:</strong> {item.weight}</span>}
                                {item.damage && <span><strong>Damage:</strong> {item.damage} {item.damageType}</span>}
                                {item.ac && <span><strong>AC:</strong> {item.ac}</span>}
                                {item.strReq > 0 && <span><strong>Str Required:</strong> {item.strReq}</span>}
                                {item.stealthDisadv && <span style={{ color: 'var(--red-light)' }}>Stealth Disadvantage</span>}
                              </div>
                              {item.properties?.length > 0 && (
                                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                                  <strong>Properties:</strong> {item.properties.join(', ')}
                                </div>
                              )}
                              {item.description && (
                                <p style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.5, margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{item.description}</p>
                              )}
                              {item.magical && (
                                <div style={{ marginTop: '6px', fontSize: '10px', color: hasRarity ? rc : 'var(--gold)', fontStyle: 'italic' }}>
                                  Magical Item{hasRarity ? ` · ${item.rarity.replace('-', ' ')}` : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--input-bg)' }}>
                  Search or select a category to browse equipment
                </div>
              )}

              {/* Manual add */}
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <label style={{ ...st.label, marginBottom: '8px' }}>Add Custom Item</label>
                <input style={{ ...st.input, width: '300px' }} placeholder="Type item name and press Enter..." onKeyDown={e => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    addToArr('equipment', e.target.value.trim());
                    e.target.value = '';
                  }
                }} />
              </div>
            </div>
          )}

          {/* ═══ SPELLS ═══ */}
          {section === 5 && (() => {
            const currentSpells = form.preparedSpells || [];
            const isCaster = SPELLCASTING_CLASSES.includes(form.class);

            // Separate current spells into cantrips vs leveled based on allSpells data
            const spellsByName = {};
            allSpells.forEach(s => { spellsByName[s.name] = s; });
            const currentCantrips = currentSpells.filter(name => spellsByName[name]?.level === 0);
            const currentLeveled = currentSpells.filter(name => spellsByName[name] && spellsByName[name].level > 0);
            const currentOther = currentSpells.filter(name => !spellsByName[name]); // racial/multiclass spells not in this class list

            const filteredSpells = spellSearch
              ? allSpells.filter(s => s.name.toLowerCase().includes(spellSearch.toLowerCase()))
              : allSpells;

            const renderSpellCard = (spell, sel, full, onToggle) => {
              const isOpen = expandedSpell === spell._id;
              const tooHigh = spellLimits && spell.level > 0 && spell.level > spellLimits.maxLevel;
              return (
                <div key={spell._id} style={{
                  borderRadius: '6px',
                  background: sel ? 'var(--accent)' : 'var(--input-bg)',
                  border: sel ? '1px solid var(--gold-dim)' : '1px solid var(--border)',
                  opacity: tooHigh ? 0.4 : (!sel && full) ? 0.5 : 1,
                  overflow: 'hidden',
                }}>
                  <div className="cc-skill" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: tooHigh ? 'default' : 'pointer' }}
                    onClick={() => { if (!tooHigh) onToggle(); }}>
                    <span style={{
                      width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                      background: sel ? 'var(--gold)' : 'transparent',
                      border: `2px solid ${sel ? 'var(--gold)' : 'var(--border)'}`,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px' }}>{spell.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{spell.school}</span>
                        {spell.concentration && <span style={{ color: 'var(--gold)' }}>C</span>}
                        {spell.ritual && <span style={{ color: 'var(--gold)' }}>R</span>}
                        {spell.damage && <span>{spell.damage} {spell.damageType}</span>}
                      </div>
                    </div>
                    {tooHigh && <span style={{ fontSize: '10px', color: '#ff6666' }}>Too high</span>}
                    <span style={{ fontSize: '14px', color: 'var(--text-dim)', padding: '2px 6px', cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); setExpandedSpell(isOpen ? null : spell._id); }}>
                      {isOpen ? '−' : '+'}
                    </span>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: 'var(--text-dim)', padding: '8px 0' }}>
                        <span><strong>Casting:</strong> {spell.castingTime}</span>
                        <span><strong>Range:</strong> {spell.range}</span>
                        <span><strong>Duration:</strong> {spell.duration}</span>
                        {spell.components?.length > 0 && <span><strong>Components:</strong> {Array.isArray(spell.components) ? spell.components.join(', ') : spell.components}{spell.materialComponent ? ` (${spell.materialComponent})` : ''}</span>}
                      </div>
                      {(spell.savingThrow || spell.attackType) && (
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>
                          {spell.attackType && <span><strong>Attack:</strong> {spell.attackType} spell attack</span>}
                          {spell.savingThrow && <span><strong>Save:</strong> {spell.savingThrow}{spell.saveEffect ? ` (${spell.saveEffect})` : ''}</span>}
                        </div>
                      )}
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{spell.description}</p>
                      {spell.higherLevels && (
                        <div style={{ marginTop: '8px', padding: '6px 8px', background: 'var(--input-bg)', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-dim)' }}>
                          <strong style={{ color: 'var(--gold)' }}>At Higher Levels.</strong> {spell.higherLevels}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            };

            return (
            <div style={st.card}>
              <h3 style={st.sectionTitle}>Spells</h3>

              {!isCaster ? (
                <div style={{ padding: '16px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center' }}>
                  {form.class || 'This class'} is not a spellcaster.
                </div>
              ) : spellLimits ? (
                <>
                  {/* Info bar */}
                  <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '16px' }}>
                    {spellLimits.type === 'known' && `As a level ${form.level} ${form.class}, you know ${spellLimits.cantrips} cantrips and ${spellLimits.maxSpells} spells (up to level ${spellLimits.maxLevel}).`}
                    {spellLimits.type === 'prepared' && `As a level ${form.level} ${form.class}, you know ${spellLimits.cantrips} cantrips and can prepare up to ${spellLimits.maxSpells} spells (up to level ${spellLimits.maxLevel}).`}
                    {spellLimits.type === 'spellbook' && `As a level ${form.level} ${form.class}, you know ${spellLimits.cantrips} cantrips. Your spellbook holds ${spellLimits.maxSpells} spells — you can prepare ${spellLimits.prepareCount} per day (up to level ${spellLimits.maxLevel}).`}
                  </p>

                  {/* Search */}
                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <input
                      placeholder="Search spells..."
                      value={spellSearch}
                      onChange={e => setSpellSearch(e.target.value)}
                      style={{ ...st.input, width: '100%', paddingRight: spellSearch ? '32px' : undefined }}
                    />
                    {spellSearch && (
                      <button onClick={() => setSpellSearch('')} style={{
                        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '16px',
                      }}>✕</button>
                    )}
                  </div>

                  {spellLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>Loading spells...</div>
                  ) : (
                    <>
                      {/* Cantrips */}
                      {spellLimits.cantrips > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>
                            Cantrips
                            <span style={{ fontSize: '12px', color: currentCantrips.length >= spellLimits.cantrips ? '#4ade80' : 'var(--gold)', marginLeft: '8px', fontWeight: 400 }}>
                              {currentCantrips.length}/{spellLimits.cantrips}
                            </span>
                          </h4>
                          <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '12px' }}>Cantrips are cast at will without using spell slots.</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '6px' }}>
                            {filteredSpells.filter(s => s.level === 0).map(spell => {
                              const sel = currentSpells.includes(spell.name);
                              const full = currentCantrips.length >= spellLimits.cantrips;
                              return renderSpellCard(spell, sel, full, () => {
                                if (sel) set('preparedSpells', currentSpells.filter(n => n !== spell.name));
                                else if (!full) set('preparedSpells', [...currentSpells, spell.name]);
                              });
                            })}
                          </div>
                        </div>
                      )}

                      {/* Leveled Spells */}
                      {spellLimits.maxLevel > 0 && (() => {
                        const maxCount = spellLimits.maxSpells;
                        const label = spellLimits.type === 'known' ? 'Known' : spellLimits.type === 'spellbook' ? 'Spellbook' : 'Prepared';
                        return (
                          <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>
                              {label} Spells
                              <span style={{ fontSize: '12px', color: currentLeveled.length >= maxCount ? '#4ade80' : 'var(--gold)', marginLeft: '8px', fontWeight: 400 }}>
                                {currentLeveled.length}/{maxCount}
                              </span>
                            </h4>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                              {spellLimits.type === 'prepared' && 'Prepared casters can change their spell list after each long rest.'}
                              {spellLimits.type === 'known' && 'You know these spells permanently. You can swap one when you level up.'}
                              {spellLimits.type === 'spellbook' && `These spells go into your spellbook. You prepare ${spellLimits.prepareCount} per day.`}
                            </p>

                            {Array.from({ length: spellLimits.maxLevel }, (_, i) => i + 1).map(spLvl => {
                              const spellsAtLevel = filteredSpells.filter(s => s.level === spLvl);
                              if (spellsAtLevel.length === 0) return null;
                              return (
                                <div key={spLvl} style={{ marginBottom: '14px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', marginBottom: '8px', fontFamily: 'Cinzel, serif' }}>Level {spLvl}</div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '6px' }}>
                                    {spellsAtLevel.map(spell => {
                                      const sel = currentSpells.includes(spell.name);
                                      const full = currentLeveled.length >= maxCount;
                                      return renderSpellCard(spell, sel, full, () => {
                                        if (sel) set('preparedSpells', currentSpells.filter(n => n !== spell.name));
                                        else if (!full) set('preparedSpells', [...currentSpells, spell.name]);
                                      });
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Selected summary */}
                      {currentSpells.length > 0 && (
                        <div style={{ padding: '12px', borderLeft: '3px solid var(--gold-dim)', background: 'var(--surface)', borderRadius: '4px' }}>
                          <h4 style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Selected Spells</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {currentCantrips.map(s => (
                              <span key={s} style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--accent)', border: '1px solid var(--gold-dim)', color: 'var(--gold)', borderRadius: '4px', cursor: 'pointer' }}
                                onClick={() => set('preparedSpells', currentSpells.filter(n => n !== s))}>
                                {s} ✕
                              </span>
                            ))}
                            {currentLeveled.map(s => (
                              <span key={s} style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', cursor: 'pointer' }}
                                onClick={() => set('preparedSpells', currentSpells.filter(n => n !== s))}>
                                {s} ✕
                              </span>
                            ))}
                            {currentOther.map(s => (
                              <span key={s} style={{ fontSize: '11px', padding: '3px 8px', background: '#2e1a3e', border: '1px solid #6b4a8a', color: '#b07ee0', borderRadius: '4px', cursor: 'pointer' }}
                                onClick={() => set('preparedSpells', currentSpells.filter(n => n !== s))}
                                title="Not in class spell list (racial/multiclass)">
                                {s} ✕
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div style={{ padding: '16px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center' }}>
                  {form.class && ['Paladin', 'Ranger'].includes(form.class) && form.level < 2
                    ? `${form.class}s gain spellcasting at level 2.`
                    : `Select a spellcasting class to manage spells.`}
                </div>
              )}
            </div>
            );
          })()}

          {/* ═══ FEATURES & FEATS ═══ */}
          {section === 6 && (
            <div style={st.card}>
              <h3 style={st.sectionTitle}>Features & Feats</h3>

              {/* Features */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ ...st.label, marginBottom: '8px' }}>Class Features</label>
                {(form.features || []).length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: '13px' }}>No features.</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {(form.features || []).map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <span style={{ flex: 1, fontSize: '13px' }}>{feat}</span>
                      <span style={{ cursor: 'pointer', color: 'var(--text-dim)', fontSize: '14px' }} onClick={() => removeFromArr('features', i)}>✕</span>
                    </div>
                  ))}
                </div>
                <input style={{ ...st.input, marginTop: '8px', width: '300px' }} placeholder="Add feature..." onKeyDown={e => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    addToArr('features', e.target.value.trim());
                    e.target.value = '';
                  }
                }} />
              </div>

              {/* Feats */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ ...st.label, margin: 0 }}>Feats</label>
                  <span style={{
                    fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '4px',
                    background: (form.feats || []).length > maxFeats ? '#3e1a1a' : 'var(--accent)',
                    border: `1px solid ${(form.feats || []).length > maxFeats ? '#ff4444' : 'var(--gold-dim)'}`,
                    color: (form.feats || []).length > maxFeats ? '#ff6666' : 'var(--gold)',
                  }}>
                    {(form.feats || []).length}/{maxFeats} feats
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                  {asiCount} ASI{asiCount !== 1 ? 's' : ''} available at level {form.level} as {form.class || '—'}.
                  {isVariantHuman && ' +1 bonus feat from Variant Human.'}
                  {maxFeats === 0 && ' No feats available at this level.'}
                  {maxFeats > 0 && ' Each feat uses one ASI slot.'}
                </div>

                {(form.feats || []).length > maxFeats && (
                  <div style={{ padding: '8px 12px', background: '#3e1a1a', border: '1px solid #ff4444', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', color: '#ff6666' }}>
                    Too many feats! You have {maxFeats} ASI slot{maxFeats !== 1 ? 's' : ''} available. Remove {(form.feats || []).length - maxFeats} feat{(form.feats || []).length - maxFeats !== 1 ? 's' : ''}.
                  </div>
                )}

                {/* Current feats */}
                {(form.feats || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {form.feats.map((f, i) => (
                      <span key={i} style={{ padding: '6px 12px', background: 'var(--accent)', border: '1px solid var(--gold)', borderRadius: '6px', fontSize: '12px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        {f}
                        <span style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => removeFromArr('feats', i)}>✕</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Feat list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '400px', overflowY: 'auto' }}>
                  {Object.entries(FEATS).map(([name, desc]) => {
                    const selected = (form.feats || []).includes(name);
                    const atLimit = !selected && (form.feats || []).length >= maxFeats;
                    return (
                      <Tip key={name} text={desc}>
                        <div className="cc-skill" style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                          background: selected ? 'var(--accent)' : 'var(--surface)',
                          border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
                          borderRadius: '6px', cursor: atLimit ? 'not-allowed' : 'pointer',
                          opacity: atLimit ? 0.4 : 1,
                        }} onClick={() => {
                          if (atLimit) return;
                          toggleArr('feats', name);
                        }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '3px', border: '2px solid var(--gold-dim)', background: selected ? 'var(--gold)' : 'transparent', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{name}</div>
                          </div>
                        </div>
                      </Tip>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══ DETAILS ═══ */}
          {section === 7 && (
            <div style={st.card}>
              <h3 style={st.sectionTitle}>Character Details</h3>

              <div style={st.grid3}>
                {['age', 'height', 'weight', 'eyes', 'hair', 'skin'].map(key => (
                  <div key={key}>
                    <label style={st.label}>{key}</label>
                    <input style={st.input} value={form[key] || ''} onChange={e => set(key, e.target.value)} />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { key: 'traits', label: 'Personality Traits' },
                  { key: 'ideals', label: 'Ideals' },
                  { key: 'bonds', label: 'Bonds' },
                  { key: 'flaws', label: 'Flaws' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={st.label}>{label}</label>
                    <textarea
                      style={{ ...st.input, minHeight: '60px', resize: 'vertical' }}
                      value={form[key] || ''}
                      onChange={e => set(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ NOTES ═══ */}
          {section === 8 && (
            <div style={st.card}>
              <h3 style={st.sectionTitle}>Notes</h3>
              <textarea
                style={{ ...st.input, minHeight: '300px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                value={form.notes || ''}
                onChange={e => set('notes', e.target.value)}
                placeholder="Write any notes about your character here..."
              />
            </div>
          )}

          {section === 9 && (
            <div>
              <h3 style={st.sectionTitle}>Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <input type="checkbox" checked={form.trackAmmo !== false} onChange={e => set('trackAmmo', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--gold)' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>Track Ammunition</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Automatically subtract ammo when attacking with ranged weapons that use ammunition (bows, crossbows, slings).</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Bottom save bar */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '16px 0' }}>
            {saved && <span style={{ color: '#4ade80', fontSize: '13px', alignSelf: 'center' }}>Changes saved!</span>}
            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ padding: '10px 32px', fontSize: '14px' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link to={`/characters/${id}`} className="btn btn-ghost" style={{ padding: '10px 20px' }}>Back to Sheet</Link>
          </div>
        </div>
      </div>

      {/* ═══ CLASS CHANGE CONFIRMATION DIALOG ═══ */}
      {classChangeDialog && (() => {
        const d = classChangeDialog;
        const c = d.changes;
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setClassChangeDialog(null)}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--gold-dim)', borderRadius: '12px', padding: '28px', maxWidth: '560px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}
              onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '18px', fontFamily: 'Cinzel, serif', color: 'var(--gold)', margin: '0 0 6px' }}>
                Confirm Class Change
              </h3>
              <div style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '20px' }}>
                {d.oldClass || 'None'} <span style={{ color: 'var(--gold)' }}>&rarr;</span> {d.newClass}
              </div>

              {d.loading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                  Checking spell compatibility...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Saving Throws */}
                  <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '4px' }}>Saving Throws</div>
                    <div style={{ fontSize: '13px' }}>
                      <span style={{ color: '#f87171' }}>{c.oldSaves.map(a => ABBR[a]).join(', ') || 'None'}</span>
                      <span style={{ color: 'var(--gold)', margin: '0 8px' }}>&rarr;</span>
                      <span style={{ color: '#4ade80' }}>{c.newSaves.map(a => ABBR[a]).join(', ') || 'None'}</span>
                    </div>
                  </div>

                  {/* Hit Dice */}
                  <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '4px' }}>Hit Dice</div>
                    <div style={{ fontSize: '13px' }}>
                      <span style={{ color: '#f87171' }}>{c.oldHD}</span>
                      <span style={{ color: 'var(--gold)', margin: '0 8px' }}>&rarr;</span>
                      <span style={{ color: '#4ade80' }}>{c.newHD}</span>
                    </div>
                  </div>

                  {/* Skill Limit */}
                  {c.oldSkillLimit !== c.newSkillLimit && (
                    <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '4px' }}>Skill Proficiency Limit</div>
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: '#f87171' }}>{c.oldSkillLimit}</span>
                        <span style={{ color: 'var(--gold)', margin: '0 8px' }}>&rarr;</span>
                        <span style={{ color: '#4ade80' }}>{c.newSkillLimit}</span>
                        {(form.skillProficiencies || []).length > c.newSkillLimit && (
                          <span style={{ color: '#ff6666', marginLeft: '8px', fontSize: '11px' }}>
                            (currently {(form.skillProficiencies || []).length} — over new limit!)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ASI / Feat Slots */}
                  {c.oldAsi !== c.newAsi && (
                    <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '4px' }}>ASI / Feat Slots (at level {form.level})</div>
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: '#f87171' }}>{c.oldAsi}</span>
                        <span style={{ color: 'var(--gold)', margin: '0 8px' }}>&rarr;</span>
                        <span style={{ color: '#4ade80' }}>{c.newAsi}</span>
                      </div>
                    </div>
                  )}

                  {/* Spellcasting Ability */}
                  {c.newSpellAbility && (
                    <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '4px' }}>Spellcasting Ability</div>
                      <div style={{ fontSize: '13px', color: '#4ade80' }}>{ABBR[c.newSpellAbility]} ({c.newSpellAbility})</div>
                    </div>
                  )}

                  {/* Spells to Remove */}
                  {d.spellsToRemove.length > 0 && (
                    <div style={{ padding: '10px 12px', background: '#2a1010', borderRadius: '6px', border: '1px solid #662222' }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#ff6666', marginBottom: '6px' }}>
                        Spells to Remove ({d.spellsToRemove.length})
                      </div>
                      <div style={{ fontSize: '12px', color: '#ff8888' }}>
                        These spells are not on the {d.newClass} spell list and will be removed:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                        {d.spellsToRemove.map(s => (
                          <span key={s} style={{ padding: '3px 8px', background: '#3e1a1a', border: '1px solid #ff4444', borderRadius: '4px', fontSize: '11px', color: '#ff8888' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Spells Kept */}
                  {d.spellsToKeep.length > 0 && d.spellsToRemove.length > 0 && (
                    <div style={{ padding: '10px 12px', background: '#102a10', borderRadius: '6px', border: '1px solid #226622' }}>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#66ff66', marginBottom: '6px' }}>
                        Spells Kept ({d.spellsToKeep.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {d.spellsToKeep.map(s => (
                          <span key={s} style={{ padding: '3px 8px', background: '#1a3e1a', border: '1px solid #44ff44', borderRadius: '4px', fontSize: '11px', color: '#88ff88' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Non-caster warning */}
                  {c.oldIsCaster && !c.newIsCaster && (form.preparedSpells || []).length > 0 && d.spellsToRemove.length === 0 && (
                    <div style={{ padding: '10px 12px', background: '#2a2a10', borderRadius: '6px', border: '1px solid #666622', fontSize: '12px', color: '#ffcc44' }}>
                      {d.newClass} is not a spellcaster. Your current spells will be kept but may not be usable with this class.
                    </div>
                  )}

                  {/* Subclass reset notice */}
                  {form.subclass && (
                    <div style={{ padding: '8px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-dim)' }}>
                      Subclass "{form.subclass}" will be cleared — you'll need to pick a new one.
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button className="btn btn-ghost" onClick={() => setClassChangeDialog(null)} style={{ padding: '8px 20px' }}>Cancel</button>
                <button className="btn btn-primary" onClick={confirmClassChange} disabled={d.loading} style={{ padding: '8px 24px' }}>
                  {d.loading ? 'Loading...' : 'Confirm Changes'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
          onCrop={async (blob) => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
            const fd = new FormData();
            fd.append('image', blob, 'avatar.png');
            try {
              const res = await fetch('/api/upload', { method: 'POST', body: fd });
              const data = await res.json();
              if (data.url) set('avatarUrl', data.url);
            } catch {}
          }}
        />
      )}
    </div>
  );
}
