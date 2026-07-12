import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createCharacter } from '../hooks/useCharacterSync';
import ImageCropper from '../components/ImageCropper';
import Tip from '../components/Tip';
import Field from '../components/Field';
import {
  ABILITIES, ABBR, ALIGNMENTS, STANDARD_ARRAY, ALL_SKILLS, TOOL_OPTIONS, FEATS,
  MULTICLASS_REQS, RACIAL_SPELL_MAP, RACIAL_SKILL_CHOICES, RACIAL_TOOL_CHOICES,
  KOBOLD_LEGACY_OPTIONS, FIGHTING_STYLES, FIGHTING_STYLE_CLASSES, CANTRIPS_KNOWN,
  SPELLS_KNOWN, CLASS_RECOMMENDED_GEAR, ALL_LANGUAGES, ARMORS, BACKGROUNDS, RARITY_COLORS,
  PB_COSTS,
} from '../utils/dndConstants';
import { modVal, modStr, profBonus, xpForLevel, rarityColor, rarityBg, maxSpellLevel, getSpellInfo, getArmorCategories, canUseShield, countLangExtras } from '../utils/dndHelpers';
import { RACES, CLASS_LEVELS, CLASSES } from '../utils/classData';

const STEPS = ['Race', 'Class', 'Background', 'Abilities', 'Skills', 'Details', 'Combat', 'Equipment', 'Spells', 'Extras', 'Review'];

export default function CharacterCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [race, setRace] = useState('');
  const [subrace, setSubrace] = useState('');
  const [halfElfBonuses, setHalfElfBonuses] = useState([]);
  const [cls, setCls] = useState('');
  const [background, setBackground] = useState('');

  const [abilityMethod, setAbilityMethod] = useState('standard');
  const [stdAssign, setStdAssign] = useState({ strength: '', dexterity: '', constitution: '', intelligence: '', wisdom: '', charisma: '' });
  const [pbScores, setPbScores] = useState({ strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 });
  const [manualScores, setManualScores] = useState({ strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 });

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [name, setName] = useState('');
  const [subclass, setSubclass] = useState('');
  const [level, setLevel] = useState(1);
  const [levelingMethod, setLevelingMethod] = useState('milestone');
  const [experiencePoints, setExperiencePoints] = useState(0);
  const [alignment, setAlignment] = useState('');
  const [faith, setFaith] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedArmor, setSelectedArmor] = useState('');
  const [hasShield, setHasShield] = useState(false);
  const [extraLanguages, setExtraLanguages] = useState([]);
  const [homebrewLevels, setHomebrewLevels] = useState({});

  // Physical description
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [eyes, setEyes] = useState('');
  const [hair, setHair] = useState('');
  const [skin, setSkin] = useState('');

  // Personality
  const [personalityTraits, setPersonalityTraits] = useState('');
  const [ideals, setIdeals] = useState('');
  const [bonds, setBonds] = useState('');
  const [flaws, setFlaws] = useState('');

  // Feats
  const [selectedFeats, setSelectedFeats] = useState([]);

  // Tool proficiencies
  const [toolProfs, setToolProfs] = useState([]);

  // Multi-level HP
  const [hpMethod, setHpMethod] = useState('average'); // 'average' | 'rolled'
  const [rolledHpPerLevel, setRolledHpPerLevel] = useState({});

  // Multiclassing
  const [multiclassEnabled, setMulticlassEnabled] = useState(false);
  const [extraClasses, setExtraClasses] = useState([]); // [{class, subclass, level}]

  // Portrait
  const [portrait, setPortrait] = useState('');
  const [cropSrc, setCropSrc] = useState(null);
  const portraitInputRef = useRef(null);

  // Equipment choices
  // equipChoices removed — using unified equipment browser
  const [customEquipment, setCustomEquipment] = useState([]); // array of { name, category, damage, damageType, ac, properties, description }
  const [equipSearch, setEquipSearch] = useState('');
  const [equipSearchResults, setEquipSearchResults] = useState([]);
  const [equipSearchLoading, setEquipSearchLoading] = useState(false);
  const [equipCategory, setEquipCategory] = useState('');
  const [expandedEquipResult, setExpandedEquipResult] = useState(null);

  // Spell selections
  const [selectedCantrips, setSelectedCantrips] = useState([]);
  const [selectedSpells, setSelectedSpells] = useState([]);
  const [availableSpells, setAvailableSpells] = useState([]);
  const [spellSearch, setSpellSearch] = useState('');
  const [loadingSpells, setLoadingSpells] = useState(false);

  // Racial choices
  const [variantHumanBonuses, setVariantHumanBonuses] = useState([]);
  const [variantHumanSkill, setVariantHumanSkill] = useState('');
  const [halfElfSkills, setHalfElfSkills] = useState([]);
  const [highElfCantrip, setHighElfCantrip] = useState('');
  const [racialSkills, setRacialSkills] = useState([]);
  const [wizardCantrips, setWizardCantrips] = useState([]);
  const [warforgedTool, setWarforgedTool] = useState('');
  const [koboldLegacy, setKoboldLegacy] = useState('');
  const [koboldCraftSkill, setKoboldCraftSkill] = useState('');
  const [koboldCantrip, setKoboldCantrip] = useState('');
  const [sorcererCantrips, setSorcererCantrips] = useState([]);

  // Fighting style
  const [fightingStyle, setFightingStyle] = useState('');
  const [expandedCreateSpell, setExpandedCreateSpell] = useState(null);
  const [expandedCreateEquip, setExpandedCreateEquip] = useState(null);
  const [racialSpellNames, setRacialSpellNames] = useState([]);

  const racialBonuses = useMemo(() => {
    if (!race || !RACES[race]) return {};
    // Variant Human: only +1 to two chosen scores (not +1 to all)
    if (race === 'Human' && subrace === 'Variant') {
      const b = {};
      variantHumanBonuses.forEach(ab => { if (ab) b[ab] = (b[ab] || 0) + 1; });
      return b;
    }
    const b = { ...RACES[race].bonuses };
    if (subrace && RACES[race].subraces?.[subrace]?.bonuses) {
      Object.entries(RACES[race].subraces[subrace].bonuses).forEach(([k, v]) => { b[k] = (b[k] || 0) + v; });
    }
    if (RACES[race].halfElfExtra) {
      halfElfBonuses.forEach(ab => { if (ab) b[ab] = (b[ab] || 0) + 1; });
    }
    return b;
  }, [race, subrace, halfElfBonuses, variantHumanBonuses]);

  const baseScores = useMemo(() => {
    if (abilityMethod === 'standard') {
      const s = {};
      ABILITIES.forEach(ab => { s[ab] = Number(stdAssign[ab]) || 8; });
      return s;
    }
    if (abilityMethod === 'pointbuy') return pbScores;
    return manualScores;
  }, [abilityMethod, stdAssign, pbScores, manualScores]);

  const finalScores = useMemo(() => {
    const s = {};
    ABILITIES.forEach(ab => { s[ab] = (baseScores[ab] || 10) + (racialBonuses[ab] || 0); });
    return s;
  }, [baseScores, racialBonuses]);

  const pbPointsLeft = useMemo(() => {
    const COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
    return 27 - ABILITIES.reduce((sum, ab) => sum + (COSTS[pbScores[ab]] || 0), 0);
  }, [pbScores]);

  const bgSkills = useMemo(() => background && BACKGROUNDS[background] ? BACKGROUNDS[background].skills : [], [background]);
  const classData = useMemo(() => cls ? CLASSES[cls] : null, [cls]);
  const numClassSkills = classData?.numSkills || 0;
  const classSkillChoices = classData?.skillChoices || [];
  const allSkills = useMemo(() => {
    const skills = [...bgSkills, ...selectedSkills];
    if (halfElfSkills.length) skills.push(...halfElfSkills);
    if (variantHumanSkill) skills.push(variantHumanSkill);
    if (racialSkills.length) skills.push(...racialSkills);
    if (koboldCraftSkill) skills.push(koboldCraftSkill);
    return [...new Set(skills)];
  }, [bgSkills, selectedSkills, halfElfSkills, variantHumanSkill, racialSkills, koboldCraftSkill]);
  const savingThrows = classData?.savingThrows || [];

  const fixedRaceLangs = useMemo(() => {
    if (!race || !RACES[race]) return [];
    return (RACES[race].languages || []).filter(l => !l.toLowerCase().includes('extra'));
  }, [race]);

  const totalLangExtras = useMemo(() => {
    let n = 0;
    if (race && RACES[race]) {
      n += countLangExtras(RACES[race].languages || []);
      // subrace traits that grant an extra language
      if (subrace && RACES[race].subraces?.[subrace]?.traits?.some(t => t.includes('Extra Language'))) n += 1;
    }
    if (background && BACKGROUNDS[background]) n += BACKGROUNDS[background].languages;
    return n;
  }, [race, subrace, background]);

  const speed = useMemo(() => {
    if (!race || !RACES[race]) return 30;
    const sr = subrace && RACES[race].subraces?.[subrace];
    return sr?.speed || RACES[race].speed || 30;
  }, [race, subrace]);

  // Armor class auto-calculation
  const armorClass = useMemo(() => {
    const dexMod = modVal(finalScores.dexterity || 10);
    const conMod = modVal(finalScores.constitution || 10);
    const wisMod = modVal(finalScores.wisdom || 10);
    const shield = hasShield ? 2 : 0;

    if (!selectedArmor || selectedArmor === 'none') {
      // Unarmored — check class special
      if (cls === 'Barbarian') return 10 + dexMod + conMod + shield;
      if (cls === 'Monk') return 10 + dexMod + wisMod; // monks can't use shields
      return 10 + dexMod + shield;
    }

    const armor = ARMORS[selectedArmor];
    if (!armor) return 10 + dexMod + shield;

    if (armor.category === 'light') return armor.base + dexMod + shield;
    if (armor.category === 'medium') return armor.base + Math.min(dexMod, 2) + shield;
    if (armor.category === 'heavy') return armor.base + shield;
    return 10 + dexMod + shield;
  }, [selectedArmor, hasShield, finalScores, cls]);

  // Available armor options for this class
  const availableArmors = useMemo(() => {
    if (!cls || !classData) return [];
    const cats = getArmorCategories(classData.armorProf);
    return Object.entries(ARMORS)
      .filter(([, a]) => cats.includes(a.category))
      .map(([name, a]) => ({ name, ...a }));
  }, [cls, classData]);

  const shieldAllowed = useMemo(() => {
    if (!classData) return false;
    if (cls === 'Monk') return false; // monks lose unarmored defense with shield
    return canUseShield(classData.armorProf);
  }, [cls, classData]);

  // Tool proficiencies from background
  const bgToolProfs = useMemo(() => {
    if (!background || !BACKGROUNDS[background]) return [];
    return BACKGROUNDS[background].tools || [];
  }, [background]);

  // How many tool choices the user needs to make (for backgrounds with generic "Artisan's tools" etc.)
  const toolChoiceCount = useMemo(() => {
    let n = 0;
    bgToolProfs.forEach(t => {
      if (t === "Artisan's tools" || t === 'Gaming set' || t === 'Musical instrument') n += 1;
    });
    if (cls && CLASSES[cls]?.toolProf) {
      const tp = CLASSES[cls].toolProf.toLowerCase();
      if (tp.includes('one type of artisan')) n += 1;
    }
    return n;
  }, [bgToolProfs, cls]);

  // Total character level including multiclass
  const totalLevel = useMemo(() => {
    if (!multiclassEnabled) return level;
    return level + extraClasses.reduce((s, ec) => s + (ec.level || 0), 0);
  }, [level, multiclassEnabled, extraClasses]);

  // Number of ASIs (based on main class level)
  const asiCount = useMemo(() => {
    if (!cls) return 0;
    let count = 0;
    const lvls = CLASS_LEVELS[cls];
    if (!lvls) return 0;
    for (let i = 1; i <= Math.min(level, 20); i++) {
      if (lvls[i]?.some(f => f === 'ASI')) count++;
    }
    // Fighter gets extras at 6,14; Rogue at 10
    return count;
  }, [cls, level]);

  // HP calculation — supports multi-level average or rolled
  const computedHp = useMemo(() => {
    if (!classData) return 8;
    const conMod = modVal(finalScores.constitution || 10);
    // Level 1 always max
    let hp = classData.hpBase + conMod;
    if (level > 1) {
      const dieMax = classData.hpBase; // d12=12, d8=8, etc.
      const avg = Math.floor(dieMax / 2) + 1; // average rounded up
      for (let i = 2; i <= level; i++) {
        if (hpMethod === 'rolled' && rolledHpPerLevel[i]) {
          hp += rolledHpPerLevel[i] + conMod;
        } else {
          hp += avg + conMod;
        }
      }
    }
    // Add multiclass levels with their hit dice
    if (multiclassEnabled) {
      extraClasses.forEach(ec => {
        if (ec.class && CLASSES[ec.class]) {
          const ecDie = CLASSES[ec.class].hpBase;
          const avg = Math.floor(ecDie / 2) + 1;
          for (let i = 1; i <= (ec.level || 0); i++) {
            hp += avg + conMod;
          }
        }
      });
    }
    return Math.max(1, hp);
  }, [classData, finalScores, level, hpMethod, rolledHpPerLevel, multiclassEnabled, extraClasses]);

  // Spell info for current class/level
  const spellInfo = useMemo(() => {
    if (!cls) return null;
    const ability = CLASSES[cls]?.spellcastingAbility;
    const abilityMod = ability ? modVal(finalScores[ability] || 10) : 0;
    return getSpellInfo(cls, level, abilityMod, CLASSES);
  }, [cls, level, finalScores]);

  // Fetch spells when class changes
  useEffect(() => {
    if (!cls || !spellInfo) {
      setAvailableSpells([]);
      return;
    }
    setLoadingSpells(true);
    fetch(`/api/spells?class=${cls}`)
      .then(r => r.json())
      .then(data => {
        setAvailableSpells(data);
        setLoadingSpells(false);
      })
      .catch(() => setLoadingSpells(false));
  }, [cls]);

  // Fetch wizard cantrips for High Elf
  useEffect(() => {
    if (race === 'Elf' && subrace === 'High Elf') {
      fetch('/api/spells?class=Wizard&level=0')
        .then(r => r.json())
        .then(data => setWizardCantrips(data))
        .catch(() => {});
    } else {
      setWizardCantrips([]);
    }
  }, [race, subrace]);

  // Fetch sorcerer cantrips for Kobold Draconic Sorcery
  useEffect(() => {
    if (race === 'Kobold' && koboldLegacy === 'Draconic Sorcery') {
      fetch('/api/spells?class=Sorcerer&level=0')
        .then(r => r.json())
        .then(data => setSorcererCantrips(data))
        .catch(() => {});
    } else {
      setSorcererCantrips([]);
    }
  }, [race, koboldLegacy]);

  // Fetch racial ability names for auto-assignment
  useEffect(() => {
    if (!race) { setRacialSpellNames([]); return; }
    const mapper = RACIAL_SPELL_MAP[race];
    if (!mapper) { setRacialSpellNames([]); return; }
    const result = mapper(subrace);
    if (!result) { setRacialSpellNames([]); return; }
    const sourceRaces = Array.isArray(result) ? result : [result];
    Promise.all(sourceRaces.map(sr =>
      fetch(`/api/spells?source=race&sourceRace=${encodeURIComponent(sr)}`).then(r => r.json())
    ))
      .then(arrays => setRacialSpellNames(arrays.flat().map(s => s.name)))
      .catch(() => setRacialSpellNames([]));
  }, [race, subrace]);

  // Fetch equipment search results
  useEffect(() => {
    if (!equipSearch && !equipCategory) { setEquipSearchResults([]); return; }
    setEquipSearchLoading(true);
    const params = new URLSearchParams();
    if (equipSearch) params.set('search', equipSearch);
    if (equipCategory) params.set('category', equipCategory);
    fetch(`/api/equipment?${params}`)
      .then(r => r.json())
      .then(data => {
        const RO = { common: 0, uncommon: 1, rare: 2, 'very-rare': 3, legendary: 4, artifact: 5 };
        data.sort((a, b) => (RO[a.rarity || 'common'] || 0) - (RO[b.rarity || 'common'] || 0));
        setEquipSearchResults(data); setEquipSearchLoading(false);
      })
      .catch(() => setEquipSearchLoading(false));
  }, [equipSearch, equipCategory]);

  // Compute selected equipment list from custom equipment
  const selectedEquipmentList = useMemo(() => {
    const list = [];
    // Add custom equipment
    list.push(...customEquipment.map(e => e.name));
    return list;
  }, [customEquipment]);

  const canProceed = useMemo(() => {
    if (step === 0) return !!race;
    if (step === 1) return !!cls;
    if (step === 2) return !!background;
    if (step === 3) {
      if (abilityMethod === 'standard') return ABILITIES.every(ab => stdAssign[ab] !== '');
      return true;
    }
    if (step === 4) return selectedSkills.length === numClassSkills;
    if (step === 5) return !!name; // Details
    if (step === 6) return true;   // Combat
    if (step === 7) return true;   // Equipment
    if (step === 8) return true;   // Spells
    if (step === 9) return true;   // Extras
    return true;
  }, [step, race, cls, background, abilityMethod, stdAssign, selectedSkills, numClassSkills, name]);

  const submit = async () => {
    setSaving(true);
    const hp = computedHp;
    const allLanguages = [...fixedRaceLangs, ...extraLanguages.filter(Boolean)];
    const allToolProfs = [...new Set([...bgToolProfs.filter(t => t !== "Artisan's tools" && t !== 'Gaming set' && t !== 'Musical instrument'), ...toolProfs.filter(Boolean)])];
    try {
      const { ok, data } = await createCharacter({
        name,
        race: subrace ? `${race} (${subrace})` : race,
        class: cls, subclass, level: multiclassEnabled ? totalLevel : level, background, alignment,
        faith,
        languages: allLanguages,
        abilityScores: finalScores,
        skillProficiencies: allSkills,
        savingThrowProficiencies: savingThrows,
        maxHp: hp, currentHp: hp,
        armorClass, speed,
        hitDice: `${level}${classData?.hitDice || 'd8'}`,
        proficiencyBonus: profBonus(multiclassEnabled ? totalLevel : level),
        notes,
        levelingMethod,
        experiencePoints: levelingMethod === 'xp' ? experiencePoints : 0,
        traits: personalityTraits, ideals, bonds, flaws,
        age, height, weight, eyes, hair, skin,
        feats: selectedFeats,
        toolProficiencies: [...allToolProfs, ...(warforgedTool ? [warforgedTool] : [])],
        avatarUrl: portrait,
        ...(multiclassEnabled && extraClasses.length > 0 && {
          classes: [{ class: cls, subclass, level }, ...extraClasses],
        }),
        equipment: selectedEquipmentList,
        preparedSpells: [...racialSpellNames, ...(highElfCantrip ? [highElfCantrip] : []), ...(koboldCantrip ? [koboldCantrip] : []), ...selectedCantrips, ...selectedSpells],
        ...(fightingStyle && { features: [...(classData?.features?.map(f => f.split(' — ')[0]) || []), `Fighting Style: ${fightingStyle}`] }),
        ...(Object.keys(homebrewLevels).length > 0 && { homebrewLevels }),
      });
      if (ok) navigate(`/characters/${data._id}`);
    } catch { alert('Failed to save'); }
    finally { setSaving(false); }
  };

  // ── helpers ──────────────────────────────────────────────
  const badge = (text, style = {}) => (
    <span style={{ fontSize: '11px', padding: '2px 7px', background: 'var(--surface)', border: '1px solid var(--gold-dim)', color: 'var(--gold)', borderRadius: '4px', ...style }}>{text}</span>
  );

  return (
    <div className="page" style={{ maxWidth: '860px' }}>
      <div className="page-header">
        <h2 style={{ fontSize: '26px' }}>New Character</h2>
        <Link to="/characters" className="btn btn-ghost">← Back</Link>
      </div>

      {/* Step bar */}
      <div style={{ display: 'flex', marginBottom: '28px', background: 'var(--surface)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
        {STEPS.map((s, i) => (
          <div key={s} className={i <= step ? 'cc-step-tab cc-skill' : ''} onClick={() => i <= step && setStep(i)} style={{
            flex: 1, padding: '12px 6px', textAlign: 'center', fontSize: '11px',
            textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: i <= step ? 'pointer' : 'default',
            background: i === step ? 'var(--accent)' : i < step ? 'var(--surface)' : 'transparent',
            color: i === step ? 'var(--gold)' : i < step ? 'var(--gold-dim)' : 'var(--text-dim)',
            fontFamily: 'Cinzel, serif', fontWeight: i === step ? 700 : 400,
            borderRight: i < STEPS.length - 1 ? '1px solid var(--border)' : 'none',
            boxShadow: i === step ? 'inset 0 -3px 0 var(--gold)' : 'none',
            opacity: i > step ? 0.4 : 1,
          }}>{i < step ? '✓ ' : `${i + 1}. `}{s}</div>
        ))}
      </div>

      {/* ═══════════════════ STEP 0: RACE ═══════════════════ */}
      {step === 0 && (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '4px', color: 'var(--gold)' }}>Choose Your Race</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '20px' }}>Your race grants racial traits, speed, and ability score increases.</p>
          <div className="grid-3">
            {Object.entries(RACES).map(([rName, rData]) => (
              <Tip key={rName} text={rData.desc}>
                <div className="card cc-card" onClick={() => { setRace(rName); setSubrace(''); setHalfElfBonuses([]); setVariantHumanBonuses([]); setVariantHumanSkill(''); setHalfElfSkills([]); setHighElfCantrip(''); setRacialSkills([]); setWarforgedTool(''); setKoboldLegacy(''); setKoboldCraftSkill(''); setKoboldCantrip(''); }}
                  style={{ cursor: 'pointer', border: race === rName ? '2px solid var(--gold)' : '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '15px', marginBottom: '6px' }}>{rName}</h4>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>Speed: {rData.speed}ft</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {Object.entries(rData.bonuses).map(([ab, v]) => badge(`+${v} ${ABBR[ab]}`))}
                    {rData.halfElfExtra && badge('+1 to 2')}
                  </div>
                </div>
              </Tip>
            ))}
          </div>

          {race && RACES[race] && Object.keys(RACES[race].subraces).length > 0 && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>
                {race === 'Dragonborn' ? 'Choose Draconic Ancestry' : 'Choose Subrace'}
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(RACES[race].subraces).map(([sr, srData]) => (
                  <div key={sr} className="cc-pill" onClick={() => { setSubrace(sr); setHighElfCantrip(''); setVariantHumanBonuses([]); setVariantHumanSkill(''); }} style={{
                    padding: '8px 14px', borderRadius: '6px', cursor: 'pointer',
                    border: subrace === sr ? '2px solid var(--gold)' : '1px solid var(--border)',
                    background: subrace === sr ? 'var(--accent)' : 'var(--surface)',
                    color: subrace === sr ? 'var(--gold)' : 'var(--text)', fontSize: '13px',
                  }}>
                    <div style={{ fontWeight: 600 }}>{sr}</div>
                    {Object.keys(srData.bonuses || {}).length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {Object.entries(srData.bonuses).map(([ab, v]) => `+${v} ${ABBR[ab]}`).join(', ')}
                      </div>
                    )}
                    {srData.speed && <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Speed {srData.speed}ft</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {race === 'Half-Elf' && (
            <div className="card" style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Choose +1 Bonus to 2 Ability Scores (not CHA)</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {ABILITIES.filter(ab => ab !== 'charisma').map(ab => {
                  const checked = halfElfBonuses.includes(ab);
                  return (
                    <label key={ab} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={checked} onChange={e => {
                        if (e.target.checked && halfElfBonuses.length < 2) setHalfElfBonuses(p => [...p, ab]);
                        else if (!e.target.checked) setHalfElfBonuses(p => p.filter(x => x !== ab));
                      }} disabled={!checked && halfElfBonuses.length >= 2} />
                      {ABBR[ab]}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {race && (
            <div className="card" style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '13px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Racial Traits</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[...(RACES[race].traits || []), ...(subrace && RACES[race].subraces[subrace]?.traits || [])].map(t => (
                  <span key={t} style={{ fontSize: '12px', padding: '3px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-dim)' }}>{t}</span>
                ))}
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-dim)' }}>Languages: {RACES[race].languages?.join(', ')}</div>
            </div>
          )}

          {/* ── Variant Human: +1 to two scores + skill ── */}
          {race === 'Human' && subrace === 'Variant' && (
            <div className="card" style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Variant Human Choices</h4>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>+1 to Two Ability Scores</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {ABILITIES.map(ab => {
                    const checked = variantHumanBonuses.includes(ab);
                    return (
                      <label key={ab} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={checked} onChange={e => {
                          if (e.target.checked && variantHumanBonuses.length < 2) setVariantHumanBonuses(p => [...p, ab]);
                          else if (!e.target.checked) setVariantHumanBonuses(p => p.filter(x => x !== ab));
                        }} disabled={!checked && variantHumanBonuses.length >= 2} />
                        {ABBR[ab]}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Bonus Skill Proficiency</div>
                <select value={variantHumanSkill} onChange={e => setVariantHumanSkill(e.target.value)} style={{ maxWidth: '220px' }}>
                  <option value="">— Choose a skill —</option>
                  {ALL_SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-dim)' }}>
                You also gain one feat (choose in the Extras step).
              </div>
            </div>
          )}

          {/* ── Half-Elf: Skill Versatility (2 skills) ── */}
          {race === 'Half-Elf' && (
            <div className="card" style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>Skill Versatility</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px' }}>Choose 2 skill proficiencies from any skill.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px' }}>
                {ALL_SKILLS.map(skill => {
                  const sel = halfElfSkills.includes(skill);
                  const full = halfElfSkills.length >= 2;
                  return (
                    <div key={skill} className="cc-skill" onClick={() => {
                      if (sel) setHalfElfSkills(p => p.filter(s => s !== skill));
                      else if (!full) setHalfElfSkills(p => [...p, skill]);
                    }} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 10px', borderRadius: '4px', cursor: sel || !full ? 'pointer' : 'default',
                      background: sel ? 'var(--accent)' : 'var(--input-bg)',
                      border: sel ? '1px solid var(--gold-dim)' : '1px solid var(--border)',
                      opacity: !sel && full ? 0.4 : 1, fontSize: '12px',
                    }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0, background: sel ? 'var(--gold)' : 'transparent', border: `2px solid ${sel ? 'var(--gold)' : 'var(--border)'}` }} />
                      {skill}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: '11px', color: halfElfSkills.length >= 2 ? 'var(--green-light, #4caf50)' : 'var(--gold)', marginTop: '8px' }}>{halfElfSkills.length}/2 selected</div>
            </div>
          )}

          {/* ── High Elf: Bonus Cantrip ── */}
          {race === 'Elf' && subrace === 'High Elf' && (
            <div className="card" style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>Bonus Cantrip</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px' }}>High Elves learn one cantrip from the wizard spell list.</p>
              {wizardCantrips.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
                  {wizardCantrips.map(spell => {
                    const sel = highElfCantrip === spell.name;
                    return (
                      <div key={spell._id} className="cc-skill" onClick={() => setHighElfCantrip(sel ? '' : spell.name)} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 10px', borderRadius: '4px', cursor: 'pointer',
                        background: sel ? 'var(--accent)' : 'var(--input-bg)',
                        border: sel ? '1px solid var(--gold-dim)' : '1px solid var(--border)',
                        fontSize: '12px',
                      }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0, background: sel ? 'var(--gold)' : 'transparent', border: `2px solid ${sel ? 'var(--gold)' : 'var(--border)'}` }} />
                        <div>
                          <div>{spell.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{spell.school}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Loading cantrips...</div>
              )}
            </div>
          )}

          {/* ── Racial Skill Choices (Kenku, Lizardfolk, Orc, Changeling, Warforged) ── */}
          {race && RACIAL_SKILL_CHOICES[race] && (
            <div className="card" style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>{RACIAL_SKILL_CHOICES[race].label}</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px' }}>Choose {RACIAL_SKILL_CHOICES[race].count} skill proficiency{RACIAL_SKILL_CHOICES[race].count > 1 ? 'ies' : ''}.</p>
              {RACIAL_SKILL_CHOICES[race].from ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {RACIAL_SKILL_CHOICES[race].from.map(skill => {
                    const sel = racialSkills.includes(skill);
                    const full = racialSkills.length >= RACIAL_SKILL_CHOICES[race].count;
                    return (
                      <div key={skill} className="cc-skill" onClick={() => {
                        if (sel) setRacialSkills(p => p.filter(s => s !== skill));
                        else if (!full) setRacialSkills(p => [...p, skill]);
                      }} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 12px', borderRadius: '4px', cursor: sel || !full ? 'pointer' : 'default',
                        background: sel ? 'var(--accent)' : 'var(--input-bg)',
                        border: sel ? '1px solid var(--gold-dim)' : '1px solid var(--border)',
                        opacity: !sel && full ? 0.4 : 1, fontSize: '13px',
                      }}>
                        <span style={{ width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0, background: sel ? 'var(--gold)' : 'transparent', border: `2px solid ${sel ? 'var(--gold)' : 'var(--border)'}` }} />
                        {skill}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Warforged: any skill */
                <select value={racialSkills[0] || ''} onChange={e => setRacialSkills(e.target.value ? [e.target.value] : [])} style={{ maxWidth: '220px' }}>
                  <option value="">— Choose a skill —</option>
                  {ALL_SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <div style={{ fontSize: '11px', color: racialSkills.length >= RACIAL_SKILL_CHOICES[race].count ? 'var(--green-light, #4caf50)' : 'var(--gold)', marginTop: '8px' }}>{racialSkills.length}/{RACIAL_SKILL_CHOICES[race].count} selected</div>
            </div>
          )}

          {/* ── Warforged Tool Choice ── */}
          {race === 'Warforged' && (
            <div className="card" style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>Specialized Design (Tool)</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px' }}>Choose one tool proficiency.</p>
              <select value={warforgedTool} onChange={e => setWarforgedTool(e.target.value)} style={{ maxWidth: '220px' }}>
                <option value="">— Choose a tool —</option>
                {TOOL_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* ── Kobold Legacy ── */}
          {race === 'Kobold' && (
            <div className="card" style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>Kobold Legacy</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px' }}>Choose one legacy benefit.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(KOBOLD_LEGACY_OPTIONS).map(([name, desc]) => {
                  const sel = koboldLegacy === name;
                  return (
                    <div key={name} className="cc-skill" onClick={() => { setKoboldLegacy(sel ? '' : name); setKoboldCraftSkill(''); setKoboldCantrip(''); }} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '10px 14px', borderRadius: '6px', cursor: 'pointer',
                      background: sel ? 'var(--accent)' : 'var(--input-bg)',
                      border: sel ? '2px solid var(--gold)' : '1px solid var(--border)',
                    }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0, marginTop: '2px', background: sel ? 'var(--gold)' : 'transparent', border: `2px solid ${sel ? 'var(--gold)' : 'var(--border)'}` }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: sel ? 'var(--gold)' : 'var(--text)' }}>{name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {koboldLegacy === 'Craftiness' && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>Choose Skill</div>
                  <select value={koboldCraftSkill} onChange={e => setKoboldCraftSkill(e.target.value)} style={{ maxWidth: '200px' }}>
                    <option value="">— Choose —</option>
                    {['Arcana', 'Investigation', 'Medicine', 'Sleight of Hand', 'Survival'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              {koboldLegacy === 'Draconic Sorcery' && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>Choose Sorcerer Cantrip</div>
                  {sorcererCantrips.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
                      {sorcererCantrips.map(spell => {
                        const sel = koboldCantrip === spell.name;
                        return (
                          <div key={spell._id} className="cc-skill" onClick={() => setKoboldCantrip(sel ? '' : spell.name)} style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '6px 10px', borderRadius: '4px', cursor: 'pointer',
                            background: sel ? 'var(--accent)' : 'var(--input-bg)',
                            border: sel ? '1px solid var(--gold-dim)' : '1px solid var(--border)',
                            fontSize: '12px',
                          }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0, background: sel ? 'var(--gold)' : 'transparent', border: `2px solid ${sel ? 'var(--gold)' : 'var(--border)'}` }} />
                            <div>
                              <div>{spell.name}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{spell.school}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Loading cantrips...</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ STEP 1: CLASS ═══════════════════ */}
      {step === 1 && (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '4px', color: 'var(--gold)' }}>Choose Your Class</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '20px' }}>Your class defines your hit dice, proficiencies, and playstyle.</p>
          <div className="grid-3">
            {Object.entries(CLASSES).map(([cName, cData]) => (
              <Tip key={cName} text={cData.desc}>
                <div className="card cc-card" onClick={() => { setCls(cName); setSelectedSkills([]); setSubclass(''); setFightingStyle(''); }}
                  style={{ cursor: 'pointer', border: cls === cName ? '2px solid var(--gold)' : '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <h4 style={{ fontSize: '15px' }}>{cName}</h4>
                    <span className="badge badge-level">{cData.hitDice}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>
                    Saves: {cData.savingThrows.map(s => ABBR[s]).join('+')} · {cData.numSkills} skills
                  </div>
                  {cData.spellcasting && (
                    <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--gold)', borderRadius: '4px' }}>
                      Spells ({ABBR[cData.spellcastingAbility]})
                    </span>
                  )}
                </div>
              </Tip>
            ))}
          </div>

          {cls && classData && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '15px', marginBottom: '14px', color: 'var(--gold)' }}>{cls}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div><div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '3px', textTransform: 'uppercase' }}>Armor</div><div style={{ fontSize: '12px' }}>{classData.armorProf}</div></div>
                <div><div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '3px', textTransform: 'uppercase' }}>Weapons</div><div style={{ fontSize: '12px' }}>{classData.weaponProf}</div></div>
                {classData.toolProf && <div><div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '3px', textTransform: 'uppercase' }}>Tools</div><div style={{ fontSize: '12px' }}>{classData.toolProf}</div></div>}
                <div><div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '3px', textTransform: 'uppercase' }}>Saving Throws</div><div style={{ fontSize: '12px' }}>{classData.savingThrows?.map(s => ABBR[s]).join(', ')}</div></div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Starting Equipment</div>
                {classData.equipment?.map((e, i) => <div key={i} style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '2px' }}>• {e}</div>)}
              </div>
              {classData.features && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Level 1 Features</div>
                  {classData.features.map((f, i) => {
                    const [fName, ...rest] = f.split(' — ');
                    return (
                      <div key={i} style={{ fontSize: '12px', marginBottom: '4px' }}>
                        <strong style={{ color: 'var(--gold)' }}>{fName}</strong>
                        {rest.length > 0 && <span style={{ color: 'var(--text-dim)' }}> — {rest.join(' — ')}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Subclasses (lvl {classData.subclassLevel || 3})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {classData.subclasses?.map(sc => (
                    <Tip key={sc} text={classData.subclassDescs?.[sc]}>
                      <span style={{ fontSize: '12px', padding: '3px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'help', color: 'var(--text)' }}>{sc}</span>
                    </Tip>
                  ))}
                </div>
              </div>
              {/* Level Progression Table */}
              {CLASS_LEVELS[cls] && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Level Progression</div>
                  <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-dark)', position: 'sticky', top: 0, zIndex: 1 }}>
                          <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--gold)', fontWeight: 600, borderBottom: '1px solid var(--border)', width: '42px' }}>Lvl</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--gold)', fontWeight: 600, borderBottom: '1px solid var(--border)', width: '42px' }}>Prof</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--gold)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Features</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: Math.max(20, level) }, (_, i) => i + 1).map(lvl => {
                          const isHomebrew = lvl > 20;
                          const feats = isHomebrew ? (homebrewLevels[lvl] || []).filter(Boolean) : (CLASS_LEVELS[cls][lvl] || []);
                          const prof = lvl <= 4 ? '+2' : lvl <= 8 ? '+3' : lvl <= 12 ? '+4' : lvl <= 16 ? '+5' : '+6';
                          return (
                            <tr key={lvl} style={{ borderBottom: '1px solid var(--border)', background: isHomebrew ? 'var(--accent)' : lvl % 2 === 0 ? 'var(--bg-card)' : 'transparent' }}>
                              <td style={{ padding: '5px 10px', color: isHomebrew ? 'var(--gold-light)' : 'var(--gold)', fontWeight: 600 }}>{lvl}{isHomebrew ? '*' : ''}</td>
                              <td style={{ padding: '5px 10px', color: 'var(--text-dim)' }}>{prof}</td>
                              <td style={{ padding: '5px 10px', color: feats.length ? (isHomebrew ? 'var(--gold-light)' : 'var(--text)') : 'var(--text-dark)' }}>
                                {feats.length ? feats.join(', ') : isHomebrew ? 'Set in Details step' : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Fighting Style ── */}
          {cls && FIGHTING_STYLE_CLASSES[cls] && level >= FIGHTING_STYLE_CLASSES[cls].level && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '4px', color: 'var(--gold)' }}>Fighting Style</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                Choose a fighting style. You can't take a style more than once.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {FIGHTING_STYLE_CLASSES[cls].styles.map(style => {
                  const sel = fightingStyle === style;
                  return (
                    <div key={style} className="cc-skill" onClick={() => setFightingStyle(sel ? '' : style)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      padding: '10px 14px', borderRadius: '6px', cursor: 'pointer',
                      background: sel ? 'var(--accent)' : 'var(--input-bg)',
                      border: sel ? '2px solid var(--gold)' : '1px solid var(--border)',
                    }}>
                      <span style={{
                        width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
                        background: sel ? 'var(--gold)' : 'transparent',
                        border: `2px solid ${sel ? 'var(--gold)' : 'var(--border)'}`,
                      }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: sel ? 'var(--gold)' : 'var(--text)' }}>{style}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{FIGHTING_STYLES[style]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ STEP 2: BACKGROUND ═══════════════════ */}
      {step === 2 && (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '4px', color: 'var(--gold)' }}>Choose Your Background</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '20px' }}>Your background grants two skill proficiencies, tools, and a special feature.</p>
          <div className="grid-3">
            {Object.entries(BACKGROUNDS).map(([bgName, bgData]) => (
              <Tip key={bgName} text={bgData.desc}>
                <div className="card cc-card" onClick={() => setBackground(bgName)}
                  style={{ cursor: 'pointer', border: background === bgName ? '2px solid var(--gold)' : '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '6px' }}>{bgName}</h4>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>Skills: {bgData.skills.join(', ')}</div>
                  {bgData.tools.length > 0 && <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' }}>Tools: {bgData.tools.join(', ')}</div>}
                  {bgData.languages > 0 && <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>+{bgData.languages} language{bgData.languages > 1 ? 's' : ''}</div>}
                </div>
              </Tip>
            ))}
          </div>
          {background && BACKGROUNDS[background] && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--gold)' }}>{background}</h4>
              <div style={{ fontSize: '13px', marginBottom: '6px' }}><strong>Feature:</strong> <span style={{ color: 'var(--text-dim)' }}>{BACKGROUNDS[background].feature}</span></div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}><strong>Equipment:</strong> {BACKGROUNDS[background].equipment}</div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ STEP 3: ABILITY SCORES ═══════════════════ */}
      {step === 3 && (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '4px', color: 'var(--gold)' }}>Ability Scores</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '16px' }}>Racial bonuses are applied automatically.</p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {[['standard', 'Standard Array (15,14,13,12,10,8)'], ['pointbuy', 'Point Buy (27 pts)'], ['manual', 'Manual Entry']].map(([m, lbl]) => (
              <button key={m} onClick={() => setAbilityMethod(m)} className={`btn ${abilityMethod === m ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '12px' }}>{lbl}</button>
            ))}
          </div>

          {abilityMethod === 'standard' && (
            <div className="card">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {STANDARD_ARRAY.map(v => {
                  const used = Object.values(stdAssign).includes(String(v));
                  return <span key={v} style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '18px', fontWeight: 700, background: used ? 'var(--surface)' : 'var(--accent, var(--surface))', border: `1px solid ${used ? 'var(--border)' : 'var(--gold-dim)'}`, color: used ? 'var(--text-dim)' : 'var(--gold)', textDecoration: used ? 'line-through' : 'none' }}>{v}</span>;
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {ABILITIES.map(ab => (
                  <div key={ab} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{ABBR[ab]}</label>
                    <select value={stdAssign[ab]} onChange={e => {
                      const val = e.target.value;
                      setStdAssign(prev => {
                        const next = { ...prev };
                        Object.keys(next).forEach(k => { if (next[k] === val && k !== ab) next[k] = ''; });
                        next[ab] = val;
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
                        {stdAssign[ab]} + {racialBonuses[ab] || 0} = <strong style={{ color: 'var(--gold)' }}>{Number(stdAssign[ab]) + (racialBonuses[ab] || 0)}</strong> ({modStr(Number(stdAssign[ab]) + (racialBonuses[ab] || 0))})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {abilityMethod === 'pointbuy' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', alignItems: 'center' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Scores 8–15. Costs: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9</p>
                <span style={{ fontSize: '18px', fontWeight: 700, color: pbPointsLeft >= 0 ? 'var(--gold)' : 'var(--red-light)' }}>{pbPointsLeft} pts</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {ABILITIES.map(ab => {
                  const COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
                  const v = pbScores[ab];
                  return (
                    <div key={ab} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{ABBR[ab]}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="cc-pm-btn" onClick={() => setPbScores(p => ({ ...p, [ab]: Math.max(8, p[ab] - 1) }))} style={{ width: '28px', height: '28px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text)', fontSize: '16px' }}>−</button>
                        <span style={{ fontSize: '22px', fontWeight: 700, minWidth: '32px', textAlign: 'center', color: 'var(--gold)' }}>{v}</span>
                        <button className="cc-pm-btn" onClick={() => {
                          const COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
                          const costIncrease = (COSTS[v + 1] || 0) - (COSTS[v] || 0);
                          if (v < 15 && pbPointsLeft >= costIncrease) setPbScores(p => ({ ...p, [ab]: p[ab] + 1 }));
                        }} style={{ width: '28px', height: '28px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--text)', fontSize: '16px' }}>+</button>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        +{racialBonuses[ab] || 0} = <strong style={{ color: 'var(--gold)' }}>{v + (racialBonuses[ab] || 0)}</strong> ({modStr(v + (racialBonuses[ab] || 0))})
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {abilityMethod === 'manual' && (
            <div className="card">
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '14px' }}>Enter rolled or custom scores (1–20). Racial bonuses are applied automatically.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {ABILITIES.map(ab => (
                  <div key={ab} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{ABBR[ab]}</label>
                    <input type="number" min={1} max={20} value={manualScores[ab]}
                      onChange={e => setManualScores(p => ({ ...p, [ab]: Number(e.target.value) }))}
                      style={{ width: '72px', textAlign: 'center', fontSize: '20px', fontWeight: 700 }} />
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      +{racialBonuses[ab] || 0} = <strong style={{ color: 'var(--gold)' }}>{manualScores[ab] + (racialBonuses[ab] || 0)}</strong> ({modStr(manualScores[ab] + (racialBonuses[ab] || 0))})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '12px', marginBottom: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Final Scores Preview</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {ABILITIES.map(ab => (
                <div key={ab} className="ability-box">
                  <span className="ability-label">{ABBR[ab]}</span>
                  <span className="ability-score">{finalScores[ab] || 10}</span>
                  <span className="ability-modifier">{modStr(finalScores[ab] || 10)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ STEP 4: SKILLS ═══════════════════ */}
      {step === 4 && (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '4px', color: 'var(--gold)' }}>Choose Skills</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '16px' }}>
            Select <strong style={{ color: 'var(--gold)' }}>{numClassSkills}</strong> skills from your {cls} list. Background gives {bgSkills.join(' & ')} automatically.
          </p>
          <div className="card" style={{ marginBottom: '14px' }}>
            <h4 style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Background Skills (automatic)</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              {bgSkills.map(s => <span key={s} className="badge" style={{ background: 'var(--surface)', border: '1px solid var(--green-light, #27ae60)', color: 'var(--green-light, #27ae60)' }}>{s}</span>)}
            </div>
          </div>
          <div className="card">
            <h4 style={{ fontSize: '12px', marginBottom: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Class Skill Choices — {selectedSkills.length}/{numClassSkills}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px' }}>
              {classSkillChoices.map(skill => {
                const fromBg = bgSkills.includes(skill);
                const sel = selectedSkills.includes(skill);
                return (
                  <div key={skill} className={!fromBg ? 'cc-skill' : ''} onClick={() => {
                    if (fromBg) return;
                    if (sel) setSelectedSkills(p => p.filter(s => s !== skill));
                    else if (selectedSkills.length < numClassSkills) setSelectedSkills(p => [...p, skill]);
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '4px',
                    cursor: fromBg ? 'default' : 'pointer',
                    background: fromBg ? 'var(--surface)' : sel ? 'var(--accent)' : 'var(--input-bg)',
                    border: fromBg ? '1px solid var(--green-light, #27ae60)' : sel ? '1px solid var(--gold-dim)' : '1px solid var(--border)',
                    opacity: !fromBg && !sel && selectedSkills.length >= numClassSkills ? 0.4 : 1,
                  }}>
                    <span style={{ width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0, background: fromBg ? 'var(--green-light, #27ae60)' : sel ? 'var(--gold)' : 'transparent', border: `2px solid ${fromBg ? 'var(--green-light, #27ae60)' : sel ? 'var(--gold)' : 'var(--border)'}` }} />
                    <span style={{ fontSize: '13px' }}>{skill}</span>
                    {fromBg && <span style={{ fontSize: '10px', color: 'var(--green-light, #27ae60)', marginLeft: 'auto' }}>BG</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ STEP 5: DETAILS ═══════════════════ */}
      {step === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '0', color: 'var(--gold)' }}>Character Details</h3>
          <div className="card">
            <h4 style={{ fontSize: '14px', marginBottom: '14px' }}>Identity</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
              <Field label="Character Name *"><input required value={name} onChange={e => setName(e.target.value)} placeholder="Thorin Oakenshield..." /></Field>
              <Field label="Alignment">
                <select value={alignment} onChange={e => setAlignment(e.target.value)}>
                  <option value="">—</option>
                  {ALIGNMENTS.map(a => <option key={a}>{a}</option>)}
                </select>
              </Field>
              <Field label={`${cls} Level`}>
                <input type="number" min={1} max={30} value={level} onChange={e => setLevel(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} />
              </Field>
              <Field label="Leveling">
                <select value={levelingMethod} onChange={e => setLevelingMethod(e.target.value)}>
                  <option value="milestone">Milestone</option>
                  <option value="xp">XP</option>
                </select>
              </Field>
              <Field label={`Subclass${classData && level < (classData.subclassLevel || 3) ? ` (lvl ${classData.subclassLevel || 3}+)` : ''}`}>
                <select value={subclass} onChange={e => setSubclass(e.target.value)}>
                  <option value="">— Choose {classData && level >= (classData.subclassLevel || 3) ? 'subclass' : 'later'} —</option>
                  {classData?.subclasses.map(sc => <option key={sc}>{sc}</option>)}
                </select>
              </Field>
              <Field label="Faith / Deity">
                <input value={faith} onChange={e => setFaith(e.target.value)} placeholder="e.g. Tyr, Selûne, none..." />
              </Field>
            </div>
            {levelingMethod === 'xp' && (
              <div style={{ marginTop: '12px', padding: '12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Experience Points</label>
                    <input type="number" min={0} value={experiencePoints}
                      onChange={e => setExperiencePoints(parseInt(e.target.value) || 0)}
                      style={{ width: '100%', fontSize: '13px', padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', flex: 1 }}>
                    Level {level} needs {xpForLevel(level).toLocaleString()} XP
                    {level < 20 && <><br />Next level: {xpForLevel(level + 1).toLocaleString()} XP</>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Portrait ── */}
          <div className="card">
            <h4 style={{ fontSize: '14px', marginBottom: '14px' }}>Character Portrait</h4>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '8px', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--bg-dark)', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => portraitInputRef.current?.click()}>
                {portrait ? (
                  <img src={portrait} alt="Portrait" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', padding: '8px' }}>Click to upload</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input ref={portraitInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = URL.createObjectURL(file);
                    setCropSrc(url);
                    e.target.value = '';
                  }} />
                <Field label="Or paste image URL">
                  <input value={portrait.startsWith('data:') ? '' : portrait} onChange={e => setPortrait(e.target.value)} placeholder="https://..." />
                </Field>
                {portrait && <button type="button" className="btn btn-ghost" style={{ marginTop: '6px', fontSize: '11px' }} onClick={() => setPortrait('')}>Remove</button>}
              </div>
            </div>
          </div>

          {/* ── Physical Description ── */}
          <div className="card">
            <h4 style={{ fontSize: '14px', marginBottom: '14px' }}>Physical Description</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '14px' }}>
              <Field label="Age"><input value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 45" /></Field>
              <Field label="Height"><input value={height} onChange={e => setHeight(e.target.value)} placeholder="e.g. 5'10&quot;" /></Field>
              <Field label="Weight"><input value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 180 lbs" /></Field>
              <Field label="Eyes"><input value={eyes} onChange={e => setEyes(e.target.value)} placeholder="e.g. Green" /></Field>
              <Field label="Hair"><input value={hair} onChange={e => setHair(e.target.value)} placeholder="e.g. Black" /></Field>
              <Field label="Skin"><input value={skin} onChange={e => setSkin(e.target.value)} placeholder="e.g. Tan" /></Field>
            </div>
          </div>

          {/* ── Personality ── */}
          <div className="card">
            <h4 style={{ fontSize: '14px', marginBottom: '14px' }}>Personality</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Personality Traits">
                <textarea rows={2} value={personalityTraits} onChange={e => setPersonalityTraits(e.target.value)}
                  placeholder="I always have a plan for when things go wrong..." style={{ resize: 'vertical' }} />
              </Field>
              <Field label="Ideals">
                <textarea rows={2} value={ideals} onChange={e => setIdeals(e.target.value)}
                  placeholder="Freedom. Everyone should be free to pursue their livelihood..." style={{ resize: 'vertical' }} />
              </Field>
              <Field label="Bonds">
                <textarea rows={2} value={bonds} onChange={e => setBonds(e.target.value)}
                  placeholder="I owe everything to my mentor who taught me..." style={{ resize: 'vertical' }} />
              </Field>
              <Field label="Flaws">
                <textarea rows={2} value={flaws} onChange={e => setFlaws(e.target.value)}
                  placeholder="I can't resist a pretty face..." style={{ resize: 'vertical' }} />
              </Field>
            </div>
          </div>

          <div className="card">
            <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Notes & Backstory</h4>
            <textarea rows={5} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Character backstory, quest notes, DM instructions..."
              style={{ width: '100%', resize: 'vertical' }} />
          </div>
        </div>
      )}

      {/* ═══════════════════ STEP 6: COMBAT ═══════════════════ */}
      {step === 6 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '0', color: 'var(--gold)' }}>Combat & Armor</h3>

          {/* ── Combat Stats ── */}
          <div className="card">
            <h4 style={{ fontSize: '14px', marginBottom: '14px' }}>Combat Stats</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Max HP</div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--gold)' }}>{computedHp}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Level 1: {classData?.hitDice} max ({classData?.hpBase}) + CON ({modStr(finalScores.constitution || 10)})
                  {level > 1 && <span> · Levels 2–{level}: {hpMethod === 'average' ? 'average' : 'rolled'}</span>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Armor Class</div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--gold)' }}>{armorClass}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {selectedArmor && selectedArmor !== 'none' ? selectedArmor : (cls === 'Barbarian' ? 'Unarmored (DEX+CON)' : cls === 'Monk' ? 'Unarmored (DEX+WIS)' : 'Unarmored')}
                  {hasShield ? ' + Shield' : ''}
                </div>
              </div>
              <Field label={`Speed (from race: ${speed}ft)`}>
                <input value={`${speed}ft`} readOnly style={{ opacity: 0.6 }} />
              </Field>
              <Field label="Hit Dice">
                <input value={`${level}${classData?.hitDice || 'd8'}`} readOnly style={{ opacity: 0.6 }} />
              </Field>
            </div>
            {level > 1 && classData && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>HP Method for Levels 2+</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <button type="button" className={`btn ${hpMethod === 'average' ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '11px' }}
                    onClick={() => setHpMethod('average')}>Average ({Math.floor(classData.hpBase / 2) + 1}/level)</button>
                  <button type="button" className={`btn ${hpMethod === 'rolled' ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '11px' }}
                    onClick={() => setHpMethod('rolled')}>Rolled (manual)</button>
                </div>
                {hpMethod === 'rolled' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {Array.from({ length: level - 1 }, (_, i) => i + 2).map(lvl => (
                      <Field key={lvl} label={`Lvl ${lvl} (${classData.hitDice})`}>
                        <input type="number" min={1} max={classData.hpBase}
                          value={rolledHpPerLevel[lvl] || ''}
                          placeholder={String(Math.floor(classData.hpBase / 2) + 1)}
                          onChange={e => setRolledHpPerLevel(prev => ({ ...prev, [lvl]: Number(e.target.value) || 0 }))}
                          style={{ width: '60px', textAlign: 'center' }} />
                      </Field>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Multiclassing ── */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: multiclassEnabled ? '14px' : '0' }}>
              <h4 style={{ fontSize: '14px', margin: 0 }}>Multiclassing</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-dim)' }}>
                <input type="checkbox" checked={multiclassEnabled} onChange={e => { setMulticlassEnabled(e.target.checked); if (!e.target.checked) setExtraClasses([]); }} />
                Enable
              </label>
            </div>
            {multiclassEnabled && (
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                  Add additional classes. Each requires minimum ability scores. Total level: <strong style={{ color: 'var(--gold)' }}>{totalLevel}</strong>
                </p>
                {extraClasses.map((ec, i) => {
                  const req = MULTICLASS_REQS[ec.class];
                  const meetsReq = !req || Object.entries(req).filter(([k]) => k !== '_or').every(([ab, min]) => (finalScores[ab] || 10) >= min) ||
                    (req._or && Object.entries(req._or).some(([ab, min]) => (finalScores[ab] || 10) >= min));
                  return (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select value={ec.class} onChange={e => {
                        setExtraClasses(prev => { const n = [...prev]; n[i] = { ...n[i], class: e.target.value, subclass: '' }; return n; });
                      }} style={{ minWidth: '140px' }}>
                        <option value="">— Class —</option>
                        {Object.keys(CLASSES).filter(c => c !== cls && !extraClasses.some((x, j) => j !== i && x.class === c)).map(c => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                      <input type="number" min={1} max={20} value={ec.level || 1} style={{ width: '60px' }}
                        onChange={e => setExtraClasses(prev => { const n = [...prev]; n[i] = { ...n[i], level: Math.max(1, Number(e.target.value) || 1) }; return n; })} />
                      {ec.class && CLASSES[ec.class] && (
                        <select value={ec.subclass} onChange={e => setExtraClasses(prev => { const n = [...prev]; n[i] = { ...n[i], subclass: e.target.value }; return n; })}>
                          <option value="">— Subclass —</option>
                          {CLASSES[ec.class].subclasses.map(sc => <option key={sc}>{sc}</option>)}
                        </select>
                      )}
                      {ec.class && !meetsReq && (
                        <span style={{ fontSize: '11px', color: 'var(--red-light, #f06060)', padding: '2px 6px', background: 'var(--surface)', border: '1px solid var(--red-light, #f06060)', borderRadius: '4px', opacity: 0.9 }}>
                          Requires: {Object.entries(MULTICLASS_REQS[ec.class]).filter(([k]) => k !== '_or').map(([ab, min]) => `${ABBR[ab]} ${min}`).join(', ')}
                          {MULTICLASS_REQS[ec.class]._or && ` or ${Object.entries(MULTICLASS_REQS[ec.class]._or).map(([ab, min]) => `${ABBR[ab]} ${min}`).join(', ')}`}
                        </span>
                      )}
                      <button type="button" className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '11px' }}
                        onClick={() => setExtraClasses(prev => prev.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  );
                })}
                <button type="button" className="btn btn-ghost" style={{ fontSize: '12px' }}
                  onClick={() => setExtraClasses(prev => [...prev, { class: '', subclass: '', level: 1 }])}>+ Add Class</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════ STEP 7: EQUIPMENT ═══════════════════ */}
      {step === 7 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '0', color: 'var(--gold)' }}>Equipment</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Select your starting gear. Recommended items for your class are shown below.</p>

          {/* Recommended Starting Gear */}
          {cls && CLASS_RECOMMENDED_GEAR[cls] && (
            <div className="card" style={{ borderLeft: '3px solid var(--gold-dim)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Recommended for {cls}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Typical starting gear for this class</div>
                </div>
                {(() => {
                  const rec = CLASS_RECOMMENDED_GEAR[cls];
                  const allAdded = rec.every(name => customEquipment.some(e => e.name === name));
                  return (
                    <button className={`btn ${allAdded ? 'btn-ghost' : 'btn-primary'}`}
                      style={{ padding: '6px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                      onClick={() => {
                        if (allAdded) {
                          // Remove all recommended
                          const recSet = new Set(rec);
                          setCustomEquipment(prev => prev.filter(e => !recSet.has(e.name)));
                        } else {
                          // Add missing recommended items — fetch from API
                          const missing = rec.filter(name => !customEquipment.some(e => e.name === name));
                          const unique = [...new Set(missing)];
                          Promise.all(unique.map(name =>
                            fetch(`/api/equipment?search=${encodeURIComponent(name)}`)
                              .then(r => r.json())
                              .then(data => data.find(d => d.name === name) || { name })
                              .catch(() => ({ name }))
                          )).then(items => {
                            const toAdd = [];
                            missing.forEach(name => {
                              const item = items.find(it => it.name === name) || { name };
                              toAdd.push({
                                name: item.name, category: item.category, damage: item.damage,
                                damageType: item.damageType, ac: item.ac, properties: item.properties,
                                description: item.description, rarity: item.rarity, magical: item.magical,
                                cost: item.cost, weight: item.weight,
                              });
                            });
                            setCustomEquipment(prev => [...prev, ...toAdd]);
                          });
                        }
                      }}>
                      {allAdded ? '✕ Remove All' : '+ Add All'}
                    </button>
                  );
                })()}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(() => {
                  // Count duplicates
                  const counts = {};
                  CLASS_RECOMMENDED_GEAR[cls].forEach(name => { counts[name] = (counts[name] || 0) + 1; });
                  return Object.entries(counts).map(([name, count]) => {
                    const added = customEquipment.some(e => e.name === name);
                    return (
                      <span key={name} style={{
                        fontSize: '12px', padding: '5px 10px', borderRadius: '4px',
                        background: added ? 'var(--accent)' : 'var(--surface)',
                        border: `1px solid ${added ? 'var(--gold)' : 'var(--border)'}`,
                        color: added ? 'var(--gold)' : 'var(--text)',
                      }}>
                        {name}{count > 1 ? ` ×${count}` : ''}
                      </span>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Background equipment */}
          {background && BACKGROUNDS[background] && (
            <div className="card" style={{ borderLeft: '3px solid var(--gold-dim)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>From Background: {background}</div>
              <div style={{ fontSize: '13px' }}>{BACKGROUNDS[background].equipment}</div>
            </div>
          )}

          {/* Equipment Browser */}
          <div className="card">
            <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>Equipment</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
              Search and add equipment to your inventory.
            </p>

            {/* Selected items */}
            {customEquipment.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                  Added Items ({customEquipment.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {customEquipment.map((item, i) => {
                    const rc = item.rarity && item.rarity !== 'common' ? rarityColor(item.rarity) : 'var(--gold)';
                    const rb = item.rarity && item.rarity !== 'common' ? rarityBg(item.rarity) : 'var(--surface)';
                    return (
                      <span key={i} style={{
                        fontSize: '11px', padding: '3px 8px', background: rb,
                        border: `1px solid ${rc}`, color: rc, borderRadius: '4px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                      }}
                        onClick={() => setCustomEquipment(prev => prev.filter((_, j) => j !== i))}>
                        {item.name} ✕
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search + Category filter */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  placeholder="Search equipment..."
                  value={equipSearch}
                  onChange={e => setEquipSearch(e.target.value)}
                  style={{ width: '100%', paddingRight: equipSearch ? '32px' : undefined }}
                />
                {equipSearch && (
                  <button onClick={() => setEquipSearch('')} style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '16px',
                  }}>✕</button>
                )}
              </div>
              <select value={equipCategory} onChange={e => setEquipCategory(e.target.value)} style={{ minWidth: '140px' }}>
                <option value="">All Categories</option>
                <option value="weapon">Weapons</option>
                <option value="armor">Armor</option>
                <option value="adventuring-gear">Adventuring Gear</option>
                <option value="tool">Tools</option>
                <option value="pack">Packs</option>
              </select>
            </div>

            {/* Results */}
            {(equipSearch || equipCategory) && (
              <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                {equipSearchLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '13px' }}>Loading...</div>
                ) : equipSearchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '13px' }}>No items found.</div>
                ) : (
                  equipSearchResults.map(item => {
                    const alreadyAdded = customEquipment.some(e => e.name === item.name);
                    const isOpen = expandedEquipResult === item._id;
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
                              setCustomEquipment(prev => prev.filter(e => e.name !== item.name));
                            } else {
                              setCustomEquipment(prev => [...prev, {
                                name: item.name, category: item.category, damage: item.damage,
                                damageType: item.damageType, ac: item.ac, properties: item.properties,
                                description: item.description, rarity: item.rarity, magical: item.magical,
                                cost: item.cost, weight: item.weight,
                              }]);
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
                            onClick={e => { e.stopPropagation(); setExpandedEquipResult(isOpen ? null : item._id); }}>
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
            )}

            {!equipSearch && !equipCategory && (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--input-bg)' }}>
                Search or select a category to browse equipment
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════ STEP 8: SPELLS ═══════════════════ */}
      {step === 8 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '0', color: 'var(--gold)' }}>Spells</h3>

          {!spellInfo ? (
            <div className="card">
              <p style={{ fontSize: '14px', color: 'var(--text-dim)', textAlign: 'center', padding: '20px 0' }}>
                {cls ? `${cls}s don't have spellcasting at level ${level}.` : 'Select a class first.'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>
                {cls && ['Paladin','Ranger'].includes(cls) && level < 2 && `${cls}s gain spellcasting at level 2.`}
                {cls && !CLASSES[cls]?.spellcasting && 'This class does not have innate spellcasting.'}
              </p>
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                {spellInfo.type === 'known' && `As a level ${level} ${cls}, you know ${spellInfo.cantrips} cantrips and ${spellInfo.spellsKnown} spells (up to level ${spellInfo.maxLevel}).`}
                {spellInfo.type === 'prepared' && `As a level ${level} ${cls}, you know ${spellInfo.cantrips} cantrips and can prepare up to ${spellInfo.prepareCount} spells (up to level ${spellInfo.maxLevel}).`}
                {spellInfo.type === 'spellbook' && `As a level ${level} ${cls}, you know ${spellInfo.cantrips} cantrips. Your spellbook holds ${spellInfo.spellsKnown} spells — you can prepare ${spellInfo.prepareCount} per day (up to level ${spellInfo.maxLevel}).`}
              </p>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="Search spells..."
                  value={spellSearch}
                  onChange={e => setSpellSearch(e.target.value)}
                  style={{ width: '100%', paddingRight: spellSearch ? '32px' : undefined }}
                />
                {spellSearch && (
                  <button onClick={() => setSpellSearch('')} style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer',
                    fontSize: '16px', padding: '2px 6px',
                  }}>✕</button>
                )}
              </div>

              {loadingSpells ? (
                <div className="card" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>Loading spells...</div>
              ) : (
                <>
                  {/* Spell Card renderer */}
                  {(() => {
                    const renderSpellCard = (spell, sel, full, onToggle) => {
                      const isOpen = expandedCreateSpell === spell._id;
                      return (
                        <div key={spell._id} style={{
                          borderRadius: '6px',
                          background: sel ? 'var(--accent)' : 'var(--input-bg)',
                          border: sel ? '1px solid var(--gold-dim)' : '1px solid var(--border)',
                          opacity: !sel && full ? 0.4 : 1,
                          overflow: 'hidden',
                        }}>
                          <div className="cc-skill" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: sel || !full ? 'pointer' : 'default' }}
                            onClick={onToggle}>
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
                            <span style={{ fontSize: '14px', color: 'var(--text-dim)', padding: '2px 6px', cursor: 'pointer' }}
                              onClick={e => { e.stopPropagation(); setExpandedCreateSpell(isOpen ? null : spell._id); }}>
                              {isOpen ? '−' : '+'}
                            </span>
                          </div>
                          {isOpen && (
                            <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: 'var(--text-dim)', padding: '8px 0' }}>
                                <span><strong>Casting:</strong> {spell.castingTime}</span>
                                <span><strong>Range:</strong> {spell.range}</span>
                                <span><strong>Duration:</strong> {spell.duration}</span>
                                {spell.components?.length > 0 && <span><strong>Components:</strong> {spell.components.join(', ')}{spell.materialComponent ? ` (${spell.materialComponent})` : ''}</span>}
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
                      <>
                        {/* Cantrips */}
                        {spellInfo.cantrips > 0 && (
                          <div className="card">
                            <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>
                              Cantrips
                              <span style={{ fontSize: '12px', color: selectedCantrips.length >= spellInfo.cantrips ? 'var(--green-light, #4caf50)' : 'var(--gold)', marginLeft: '8px', fontWeight: 400 }}>
                                {selectedCantrips.length}/{spellInfo.cantrips}
                              </span>
                            </h4>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '12px' }}>Cantrips are cast at will without using spell slots.</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '6px' }}>
                              {availableSpells
                                .filter(s => s.level === 0)
                                .filter(s => !spellSearch || s.name.toLowerCase().includes(spellSearch.toLowerCase()))
                                .map(spell => {
                                  const sel = selectedCantrips.includes(spell.name);
                                  const full = selectedCantrips.length >= spellInfo.cantrips;
                                  return renderSpellCard(spell, sel, full, () => {
                                    if (sel) setSelectedCantrips(p => p.filter(n => n !== spell.name));
                                    else if (!full) setSelectedCantrips(p => [...p, spell.name]);
                                  });
                                })}
                            </div>
                          </div>
                        )}

                        {/* Leveled Spells */}
                        {spellInfo.maxLevel > 0 && (() => {
                          const maxCount = spellInfo.spellsKnown || spellInfo.prepareCount || 0;
                          const label = spellInfo.type === 'known' ? 'Known' : spellInfo.type === 'spellbook' ? 'Spellbook' : 'Prepared';
                          return (
                            <div className="card">
                              <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>
                                {label} Spells
                                <span style={{ fontSize: '12px', color: selectedSpells.length >= maxCount ? 'var(--green-light, #4caf50)' : 'var(--gold)', marginLeft: '8px', fontWeight: 400 }}>
                                  {selectedSpells.length}/{maxCount}
                                </span>
                              </h4>
                              <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                                {spellInfo.type === 'prepared' && 'Prepared casters can change their spell list after each long rest.'}
                                {spellInfo.type === 'spellbook' && 'These spells go into your spellbook. You prepare a subset each day.'}
                                {spellInfo.type === 'known' && 'You know these spells permanently. You can swap one when you level up.'}
                              </p>

                              {Array.from({ length: spellInfo.maxLevel }, (_, i) => i + 1).map(spLvl => {
                                const spellsAtLevel = availableSpells
                                  .filter(s => s.level === spLvl)
                                  .filter(s => !spellSearch || s.name.toLowerCase().includes(spellSearch.toLowerCase()));
                                if (spellsAtLevel.length === 0) return null;
                                return (
                                  <div key={spLvl} style={{ marginBottom: '14px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', marginBottom: '8px', fontFamily: 'Cinzel, serif' }}>Level {spLvl}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '6px' }}>
                                      {spellsAtLevel.map(spell => {
                                        const sel = selectedSpells.includes(spell.name);
                                        const full = selectedSpells.length >= maxCount;
                                        return renderSpellCard(spell, sel, full, () => {
                                          if (sel) setSelectedSpells(p => p.filter(n => n !== spell.name));
                                          else if (!full) setSelectedSpells(p => [...p, spell.name]);
                                        });
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}

                  {/* Selected summary */}
                  {(selectedCantrips.length > 0 || selectedSpells.length > 0) && (
                    <div className="card" style={{ borderLeft: '3px solid var(--gold-dim)' }}>
                      <h4 style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Selected Spells</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedCantrips.map(s => (
                          <span key={s} style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--surface)', border: '1px solid var(--gold-dim)', color: 'var(--gold)', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => setSelectedCantrips(p => p.filter(n => n !== s))}>
                            {s} ✕
                          </span>
                        ))}
                        {selectedSpells.map(s => (
                          <span key={s} style={{ fontSize: '11px', padding: '3px 8px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => setSelectedSpells(p => p.filter(n => n !== s))}>
                            {s} ✕
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════ STEP 9: EXTRAS ═══════════════════ */}
      {step === 9 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '0', color: 'var(--gold)' }}>Languages, Feats & More</h3>

          {/* ── Languages ── */}
          <div className="card">
            <h4 style={{ fontSize: '14px', marginBottom: '14px' }}>Languages</h4>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>From Race</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {fixedRaceLangs.length > 0
                  ? fixedRaceLangs.map(l => (
                    <span key={l} style={{ fontSize: '12px', padding: '3px 9px', background: 'var(--surface)', border: '1px solid var(--gold-dim)', color: 'var(--text)', borderRadius: '4px' }}>{l}</span>
                  ))
                  : <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Select a race first</span>
                }
              </div>
            </div>
            {totalLangExtras > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  Choose {totalLangExtras} Additional Language{totalLangExtras > 1 ? 's' : ''}
                  <span style={{ fontSize: '10px', fontWeight: 400, textTransform: 'none', marginLeft: '6px' }}>(race extras + background)</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {Array.from({ length: totalLangExtras }).map((_, i) => (
                    <select key={i} value={extraLanguages[i] || ''} onChange={e => {
                      setExtraLanguages(prev => { const next = [...prev]; next[i] = e.target.value; return next; });
                    }} style={{ minWidth: '140px' }}>
                      <option value="">— Choose —</option>
                      {ALL_LANGUAGES.filter(l => !fixedRaceLangs.includes(l) && !extraLanguages.some((el, j) => el === l && j !== i)).map(l => <option key={l}>{l}</option>)}
                    </select>
                  ))}
                </div>
              </div>
            )}
            {totalLangExtras === 0 && fixedRaceLangs.length > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>No additional language choices for this race + background combination.</div>
            )}
          </div>

          {/* ── Tool Proficiencies ── */}
          {(bgToolProfs.length > 0 || (cls && CLASSES[cls]?.toolProf)) && (
            <div className="card">
              <h4 style={{ fontSize: '14px', marginBottom: '14px' }}>Tool Proficiencies</h4>
              {bgToolProfs.filter(t => t !== "Artisan's tools" && t !== 'Gaming set' && t !== 'Musical instrument').length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>From Background</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {bgToolProfs.filter(t => t !== "Artisan's tools" && t !== 'Gaming set' && t !== 'Musical instrument').map(t => (
                      <span key={t} style={{ fontSize: '12px', padding: '3px 9px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: '4px' }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {toolChoiceCount > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Choose {toolChoiceCount} Tool{toolChoiceCount > 1 ? 's' : ''}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {Array.from({ length: toolChoiceCount }).map((_, i) => (
                      <select key={i} value={toolProfs[i] || ''} onChange={e => {
                        setToolProfs(prev => { const n = [...prev]; n[i] = e.target.value; return n; });
                      }} style={{ minWidth: '160px' }}>
                        <option value="">— Choose —</option>
                        {TOOL_OPTIONS.filter(t => !bgToolProfs.includes(t) && !toolProfs.some((tp, j) => tp === t && j !== i)).map(t => <option key={t}>{t}</option>)}
                      </select>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Feats ── */}
          {(() => {
            const isVariantHuman = race === 'Human' && subrace === 'Variant';
            const maxFeats = asiCount + (isVariantHuman ? 1 : 0);
            const featsFull = selectedFeats.length >= maxFeats;
            return (
              <div className="card">
                <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>
                  Feats
                  <span style={{ fontSize: '12px', color: featsFull ? 'var(--green-light, #4caf50)' : 'var(--gold)', marginLeft: '8px', fontWeight: 400 }}>
                    {selectedFeats.length}/{maxFeats}
                  </span>
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '14px' }}>
                  {isVariantHuman ? 'Variant Humans get 1 feat at level 1. ' : ''}
                  Each feat replaces one Ability Score Improvement.
                  {asiCount > 0 && <span style={{ color: 'var(--gold)' }}> You have {asiCount} ASI(s) that can each be swapped for a feat.</span>}
                  {maxFeats === 0 && ' No ASIs available at this level.'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {selectedFeats.map((ft, i) => (
                    <span key={i} style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--surface)', border: '1px solid var(--gold-dim)', color: 'var(--gold)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {ft}
                      <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1 }}
                        onClick={() => setSelectedFeats(prev => prev.filter((_, j) => j !== i))}>✕</button>
                    </span>
                  ))}
                </div>
                {!featsFull && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '6px' }}>
                    {Object.entries(FEATS).filter(([name]) => !selectedFeats.includes(name)).map(([name, data]) => (
                      <Tip key={name} text={`${data.desc}${data.prereq ? `\n\nRequires: ${data.prereq}` : ''}`}>
                        <div className="cc-skill" style={{
                          padding: '10px 12px', borderRadius: '6px', cursor: 'pointer',
                          background: 'var(--input-bg)', border: '1px solid var(--border)',
                        }}
                          onClick={() => setSelectedFeats(prev => [...prev, name])}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0, background: 'transparent', border: '2px solid var(--border)' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px' }}>{name}</div>
                              {data.prereq && <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Requires: {data.prereq}</div>}
                            </div>
                          </div>
                        </div>
                      </Tip>
                    ))}
                  </div>
                )}
                {selectedFeats.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    {selectedFeats.map(ft => FEATS[ft] && (
                      <div key={ft} style={{ fontSize: '12px', marginBottom: '6px' }}>
                        <strong style={{ color: 'var(--gold)' }}>{ft}</strong>
                        {FEATS[ft].prereq && <span style={{ color: 'var(--text-dim)', marginLeft: '6px' }}>(Requires: {FEATS[ft].prereq})</span>}
                        <span style={{ color: 'var(--text-dim)' }}> — {FEATS[ft].desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Homebrew 21+ ── */}
          {level > 20 && cls && (
            <div className="card">
              <h4 style={{ fontSize: '14px', marginBottom: '4px' }}>Homebrew Features (Level 21–{level})</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '14px' }}>
                DM-defined features for levels beyond 20. Add custom features your DM has approved for each level.
              </p>
              {Array.from({ length: level - 20 }, (_, i) => i + 21).map(lvl => (
                <div key={lvl} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gold)', minWidth: '52px' }}>Level {lvl}</span>
                    <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '11px' }}
                      onClick={() => setHomebrewLevels(prev => ({ ...prev, [lvl]: [...(prev[lvl] || []), ''] }))}>
                      + Add Feature
                    </button>
                  </div>
                  {(homebrewLevels[lvl] || []).map((feat, fi) => (
                    <div key={fi} style={{ display: 'flex', gap: '6px', marginBottom: '4px', marginLeft: '60px' }}>
                      <input value={feat} placeholder="Feature name or description..." style={{ flex: 1 }}
                        onChange={e => setHomebrewLevels(prev => { const arr = [...(prev[lvl] || [])]; arr[fi] = e.target.value; return { ...prev, [lvl]: arr }; })} />
                      <button type="button" className="btn btn-danger" style={{ padding: '2px 8px', fontSize: '11px' }}
                        onClick={() => setHomebrewLevels(prev => { const arr = (prev[lvl] || []).filter((_, j) => j !== fi); const next = { ...prev }; if (arr.length) next[lvl] = arr; else delete next[lvl]; return next; })}>✕</button>
                    </div>
                  ))}
                  {!(homebrewLevels[lvl] || []).length && (
                    <div style={{ marginLeft: '60px', fontSize: '11px', color: 'var(--text-dark)' }}>No features added</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ STEP 10: REVIEW ═══════════════════ */}
      {step === 10 && (
        <div>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--gold)' }}>Review Your Character</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="card">
              <h4 style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Identity</h4>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {portrait && <img src={portrait} alt="" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)' }} />}
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>{name || '(unnamed)'}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {race && <span className="badge badge-race">{race}{subrace ? ` · ${subrace}` : ''}</span>}
                    {cls && <span className="badge badge-class">{cls} {level}{subclass ? ` · ${subclass}` : ''}</span>}
                    {multiclassEnabled && extraClasses.filter(ec => ec.class).map((ec, i) => (
                      <span key={i} className="badge badge-class">{ec.class} {ec.level}{ec.subclass ? ` · ${ec.subclass}` : ''}</span>
                    ))}
                    {multiclassEnabled && <span className="badge badge-level">Total Lvl {totalLevel}</span>}
                    {!multiclassEnabled && <span className="badge badge-level">Level {level}</span>}
                    {background && <span className="badge" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>{background}</span>}
                    {alignment && <span className="badge" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>{alignment}</span>}
                  </div>
                  {faith && <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Faith: <strong style={{ color: 'var(--text)' }}>{faith}</strong></div>}
                </div>
              </div>
            </div>
            <div className="card">
              <h4 style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Combat</h4>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div className="stat-block"><span className="stat-value">{computedHp}</span><span className="stat-label">Max HP</span></div>
                <div className="stat-block"><span className="stat-value">{armorClass}</span><span className="stat-label">AC</span></div>
                <div className="stat-block"><span className="stat-value">{speed}ft</span><span className="stat-label">Speed</span></div>
                <div className="stat-block"><span className="stat-value">+{profBonus(multiclassEnabled ? totalLevel : level)}</span><span className="stat-label">Prof</span></div>
              </div>
            </div>
            {(age || height || weight || eyes || hair || skin) && (
              <div className="card">
                <h4 style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Physical</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px' }}>
                  {age && <span><strong>Age:</strong> <span style={{ color: 'var(--text-dim)' }}>{age}</span></span>}
                  {height && <span><strong>Height:</strong> <span style={{ color: 'var(--text-dim)' }}>{height}</span></span>}
                  {weight && <span><strong>Weight:</strong> <span style={{ color: 'var(--text-dim)' }}>{weight}</span></span>}
                  {eyes && <span><strong>Eyes:</strong> <span style={{ color: 'var(--text-dim)' }}>{eyes}</span></span>}
                  {hair && <span><strong>Hair:</strong> <span style={{ color: 'var(--text-dim)' }}>{hair}</span></span>}
                  {skin && <span><strong>Skin:</strong> <span style={{ color: 'var(--text-dim)' }}>{skin}</span></span>}
                </div>
              </div>
            )}
            {(personalityTraits || ideals || bonds || flaws) && (
              <div className="card">
                <h4 style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Personality</h4>
                {personalityTraits && <div style={{ fontSize: '12px', marginBottom: '6px' }}><strong style={{ color: 'var(--gold)' }}>Traits:</strong> <span style={{ color: 'var(--text-dim)' }}>{personalityTraits}</span></div>}
                {ideals && <div style={{ fontSize: '12px', marginBottom: '6px' }}><strong style={{ color: 'var(--gold)' }}>Ideals:</strong> <span style={{ color: 'var(--text-dim)' }}>{ideals}</span></div>}
                {bonds && <div style={{ fontSize: '12px', marginBottom: '6px' }}><strong style={{ color: 'var(--gold)' }}>Bonds:</strong> <span style={{ color: 'var(--text-dim)' }}>{bonds}</span></div>}
                {flaws && <div style={{ fontSize: '12px' }}><strong style={{ color: 'var(--gold)' }}>Flaws:</strong> <span style={{ color: 'var(--text-dim)' }}>{flaws}</span></div>}
              </div>
            )}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ fontSize: '12px', marginBottom: '12px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Ability Scores</h4>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {ABILITIES.map(ab => (
                  <div key={ab} className="ability-box">
                    <span className="ability-label">{ABBR[ab]}</span>
                    <span className="ability-score">{finalScores[ab] || 10}</span>
                    <span className="ability-modifier">{modStr(finalScores[ab] || 10)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h4 style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Proficiencies</h4>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                Saving Throws: <strong>{savingThrows.map(s => ABBR[s]).join(', ')}</strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {allSkills.map(s => <span key={s} style={{ fontSize: '11px', padding: '2px 7px', background: 'var(--surface)', border: '1px solid var(--green-light, #27ae60)', color: 'var(--green-light, #27ae60)', borderRadius: '4px' }}>{s}</span>)}
              </div>
              {[...bgToolProfs.filter(t => t !== "Artisan's tools" && t !== 'Gaming set' && t !== 'Musical instrument'), ...toolProfs.filter(Boolean)].length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Tools:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {[...bgToolProfs.filter(t => t !== "Artisan's tools" && t !== 'Gaming set' && t !== 'Musical instrument'), ...toolProfs.filter(Boolean)].map(t => (
                      <span key={t} style={{ fontSize: '11px', padding: '2px 7px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-dim)', borderRadius: '4px' }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="card">
              <h4 style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Languages</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {[...fixedRaceLangs, ...extraLanguages.filter(Boolean)].map(l => (
                  <span key={l} style={{ fontSize: '11px', padding: '2px 7px', background: 'var(--surface)', border: '1px solid var(--gold-dim)', color: 'var(--text)', borderRadius: '4px' }}>{l}</span>
                ))}
              </div>
            </div>
            {selectedFeats.length > 0 && (
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <h4 style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Feats</h4>
                {selectedFeats.map(ft => FEATS[ft] && (
                  <div key={ft} style={{ fontSize: '12px', marginBottom: '6px' }}>
                    <strong style={{ color: 'var(--gold)' }}>{ft}</strong>
                    <span style={{ color: 'var(--text-dim)' }}> — {FEATS[ft].desc}</span>
                  </div>
                ))}
              </div>
            )}
            {classData?.features && (
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <h4 style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Level 1 Class Features</h4>
                {classData.features.map((f, i) => {
                  const [fName, ...rest] = f.split(' — ');
                  return (
                    <div key={i} style={{ fontSize: '12px', marginBottom: '6px' }}>
                      <strong style={{ color: 'var(--gold)' }}>{fName}</strong>
                      {rest.length > 0 && <span style={{ color: 'var(--text-dim)' }}> — {rest.join(' — ')}</span>}
                    </div>
                  );
                })}
                {fightingStyle && (
                  <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                    <strong style={{ color: 'var(--gold)' }}>Fighting Style: {fightingStyle}</strong>
                    <span style={{ color: 'var(--text-dim)' }}> — {FIGHTING_STYLES[fightingStyle]}</span>
                  </div>
                )}
              </div>
            )}
            {(highElfCantrip || halfElfSkills.length > 0 || variantHumanSkill || racialSkills.length > 0 || warforgedTool || koboldLegacy || koboldCantrip) && (
              <div className="card">
                <h4 style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Racial Choices</h4>
                {highElfCantrip && <div style={{ fontSize: '12px', marginBottom: '4px' }}><strong style={{ color: 'var(--gold)' }}>Bonus Cantrip:</strong> <span style={{ color: 'var(--text-dim)' }}>{highElfCantrip}</span></div>}
                {halfElfSkills.length > 0 && <div style={{ fontSize: '12px', marginBottom: '4px' }}><strong style={{ color: 'var(--gold)' }}>Skill Versatility:</strong> <span style={{ color: 'var(--text-dim)' }}>{halfElfSkills.join(', ')}</span></div>}
                {variantHumanSkill && <div style={{ fontSize: '12px', marginBottom: '4px' }}><strong style={{ color: 'var(--gold)' }}>Bonus Skill:</strong> <span style={{ color: 'var(--text-dim)' }}>{variantHumanSkill}</span></div>}
                {racialSkills.length > 0 && <div style={{ fontSize: '12px', marginBottom: '4px' }}><strong style={{ color: 'var(--gold)' }}>{RACIAL_SKILL_CHOICES[race]?.label || 'Racial Skills'}:</strong> <span style={{ color: 'var(--text-dim)' }}>{racialSkills.join(', ')}</span></div>}
                {race === 'Human' && subrace === 'Variant' && variantHumanBonuses.length > 0 && (
                  <div style={{ fontSize: '12px', marginBottom: '4px' }}><strong style={{ color: 'var(--gold)' }}>Ability Bonuses:</strong> <span style={{ color: 'var(--text-dim)' }}>{variantHumanBonuses.map(ab => `+1 ${ABBR[ab]}`).join(', ')}</span></div>
                )}
                {warforgedTool && <div style={{ fontSize: '12px', marginBottom: '4px' }}><strong style={{ color: 'var(--gold)' }}>Specialized Design Tool:</strong> <span style={{ color: 'var(--text-dim)' }}>{warforgedTool}</span></div>}
                {koboldLegacy && <div style={{ fontSize: '12px', marginBottom: '4px' }}><strong style={{ color: 'var(--gold)' }}>Kobold Legacy:</strong> <span style={{ color: 'var(--text-dim)' }}>{koboldLegacy}{koboldCraftSkill ? ` (${koboldCraftSkill})` : ''}{koboldCantrip ? ` (${koboldCantrip})` : ''}</span></div>}
              </div>
            )}
            {selectedEquipmentList.length > 0 && (
              <div className="card">
                <h4 style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Equipment</h4>
                {selectedEquipmentList.map((e, i) => <div key={i} style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '2px' }}>• {e}</div>)}
              </div>
            )}
            {(racialSpellNames.length > 0 || selectedCantrips.length > 0 || selectedSpells.length > 0) && (
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <h4 style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Spells & Racial Abilities</h4>
                {racialSpellNames.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Racial Abilities:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {racialSpellNames.map(s => <span key={s} style={{ fontSize: '11px', padding: '2px 7px', background: 'var(--surface)', border: '1px solid #6b4a8a', color: '#b07ee0', borderRadius: '4px' }}>{s}</span>)}
                    </div>
                  </div>
                )}
                {selectedCantrips.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Cantrips:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {selectedCantrips.map(s => <span key={s} style={{ fontSize: '11px', padding: '2px 7px', background: 'var(--surface)', border: '1px solid var(--gold-dim)', color: 'var(--gold)', borderRadius: '4px' }}>{s}</span>)}
                    </div>
                  </div>
                )}
                {selectedSpells.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Spells:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {selectedSpells.map(s => <span key={s} style={{ fontSize: '11px', padding: '2px 7px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px' }}>{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}
            {notes && (
              <div className="card">
                <h4 style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Notes</h4>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'pre-wrap' }}>{notes}</div>
              </div>
            )}
            {Object.keys(homebrewLevels).length > 0 && (
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <h4 style={{ fontSize: '12px', marginBottom: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Homebrew Features (21+)</h4>
                {Object.entries(homebrewLevels).sort(([a], [b]) => a - b).map(([lvl, feats]) => {
                  const filtered = feats.filter(Boolean);
                  if (!filtered.length) return null;
                  return (
                    <div key={lvl} style={{ marginBottom: '6px' }}>
                      <strong style={{ color: 'var(--gold-light)', fontSize: '12px' }}>Level {lvl}:</strong>{' '}
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{filtered.join(', ')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
        <button onClick={() => setStep(s => s - 1)} disabled={step === 0} className="btn btn-ghost">← Back</button>
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canProceed} className="btn btn-primary" style={{ minWidth: '130px' }}>
            Next: {STEPS[step + 1]} →
          </button>
        ) : (
          <button onClick={submit} disabled={saving || !name} className="btn btn-primary" style={{ minWidth: '160px' }}>
            {saving ? 'Creating...' : 'Create Character'}
          </button>
        )}
      </div>

      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
          onCrop={(blob) => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
            const reader = new FileReader();
            reader.onload = ev => setPortrait(ev.target.result);
            reader.readAsDataURL(blob);
          }}
        />
      )}
    </div>
  );
}
