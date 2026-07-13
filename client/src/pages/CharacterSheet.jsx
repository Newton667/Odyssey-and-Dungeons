import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDice } from '../context/DiceContext';
import { useCharacter } from '../hooks/useCharacterSync';
import NumInput from '../components/NumInput';
import DebouncedTextarea from '../components/DebouncedTextarea';
import Tip from '../components/Tip';
import { ABILITIES, ABBR, SKILLS_WITH_ABILITY, HIT_DICE, RARITY_COLORS, RARITY_ORDER, FEATS, FIGHTING_STYLES, FIGHTING_STYLE_CLASSES } from '../utils/dndConstants';
import { CLASS_LEVELS, CLASSES, getSpellSlots, getExtraAttacks, RACE_DEFENSES, getClassDefenses } from '../utils/classData';
import { getLevelChoices, METAMAGIC_OPTIONS, ELDRITCH_INVOCATIONS, PACT_BOONS, MANEUVERS, TOTEM_SPIRITS, HUNTER_OPTIONS, LAND_TERRAINS, FAVORED_ENEMIES, FAVORED_TERRAINS } from '../utils/levelChoices';
import { SUBCLASS_FEATURES } from '../utils/subclassFeatures';
import { modVal, modStr, xpForLevel, rarityColor, rarityBg, hpColor } from '../utils/dndHelpers';
import { queryLocalEquipment, queryLocalSpells, getLocalEquipmentByName, getAllLocalSpells } from '../data/localDataService';

const SKILLS = SKILLS_WITH_ABILITY;

// Default widget layout — each widget has id, col (left/right), order, and optional width
const DEFAULT_LAYOUT = [
  { id: 'combat-stats', col: 'left', order: 0 },
  { id: 'saving-throws', col: 'left', order: 1 },
  { id: 'skills', col: 'left', order: 2 },
  { id: 'senses', col: 'left', order: 3 },
  { id: 'proficiencies', col: 'left', order: 4 },
  { id: 'conditions', col: 'left', order: 5 },
  { id: 'defenses', col: 'left', order: 6 },
  { id: 'carrying', col: 'left', order: 7 },
  { id: 'attunement', col: 'left', order: 8 },
  { id: 'currency', col: 'left', order: 9 },
  { id: 'xp-bar', col: 'right', order: 0 },
  { id: 'hp-section', col: 'right', order: 1 },
  { id: 'tabs-section', col: 'right', order: 2 },
];

function getLayout(charId) {
  try {
    const saved = localStorage.getItem(`ond-layout-${charId}`);
    if (!saved) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(saved);
    // Ensure all widgets exist
    const ids = new Set(parsed.map(w => w.id));
    for (const def of DEFAULT_LAYOUT) {
      if (!ids.has(def.id)) parsed.push({ ...def });
    }
    return parsed;
  } catch { return DEFAULT_LAYOUT; }
}
function saveLayout(charId, layout) {
  localStorage.setItem(`ond-layout-${charId}`, JSON.stringify(layout));
}

function getSidebarWidth(charId) {
  try {
    const saved = localStorage.getItem(`ond-sidebar-${charId}`);
    return saved ? parseInt(saved) : 340;
  } catch { return 340; }
}
function saveSidebarWidth(charId, w) {
  localStorage.setItem(`ond-sidebar-${charId}`, String(w));
}
function getColumnCount(charId) {
  try {
    const saved = localStorage.getItem(`ond-columns-${charId}`);
    return saved ? parseInt(saved) : 2;
  } catch { return 2; }
}
function saveColumnCount(charId, count) {
  localStorage.setItem(`ond-columns-${charId}`, String(count));
}

export default function CharacterSheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { rollDice3D } = useDice();
  const [syncEnabled, setSyncEnabled] = useState(() => {
    const stored = localStorage.getItem(`ond-sync-${id}`);
    return stored === 'true'; // default false (local only)
  });
  const { char, loading, syncing, syncError, setChar: updateChar, updateField, updateHp, forceSync } = useCharacter(id, { syncEnabled });

  // Remember last viewed character
  useEffect(() => { if (id) localStorage.setItem('ond-last-character', id); }, [id]);
  const [hpDelta, setHpDelta] = useState('');
  const [xpDelta, setXpDelta] = useState('');
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem(`ond-tab-${id}`) || 'actions');
  const [sidePanel, setSidePanelRaw] = useState(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const panelTimer = useRef(null);
  const setSidePanel = useCallback((val) => {
    if (val) {
      setSidePanelRaw(val);
      // Trigger open on next frame so transition fires
      requestAnimationFrame(() => setPanelVisible(true));
    } else {
      setPanelVisible(false);
      if (panelTimer.current) clearTimeout(panelTimer.current);
      panelTimer.current = setTimeout(() => setSidePanelRaw(null), 300);
    }
  }, []);
  const [spellData, setSpellData] = useState([]);
  const [loadingSpells, setLoadingSpells] = useState(false);
  const [invSearch, setInvSearch] = useState('');
  const [invCategory, setInvCategory] = useState('');
  const [invResults, setInvResults] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invExpanded, setInvExpanded] = useState(null);
  const [showInvBrowser, setShowInvBrowser] = useState(false);
  const [expandedChoices, setExpandedChoices] = useState({});
  const equipCache = useRef({});
  const [useLocalData, setUseLocalData] = useState(() => localStorage.getItem('ond-data-source') !== 'db');

  // Parse default ammo count from item name, e.g. "Bolts +3 (10)" → 10
  const defaultAmmoCount = (name) => {
    const m = name?.match(/\((\d+)\)/);
    return m ? parseInt(m[1]) : 20;
  };

  // Widget layout
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [editMode, setEditMode] = useState(false);
  const [columnCount, setColumnCount] = useState(2);

  // Sidebar resize
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const resizing = useRef(false);
  const resizeStart = useRef({ x: 0, w: 0 });

  // Roll context menu & results
  const [rollMenu, setRollMenu] = useState(null);
  const [rollResults, setRollResults] = useState({});
  const [rollLog, setRollLog] = useState([]);
  const [rollToast, setRollToast] = useState(null);
  const [healToast, setHealToast] = useState(null);
  const [showRollLog, setShowRollLog] = useState(false);
  const [defensePicker, setDefensePicker] = useState(null); // null or { field, label, color }
  const [showAvatar, setShowAvatar] = useState(false);
  const [showConditionPicker, setShowConditionPicker] = useState(false);
  const [shortRestModal, setShortRestModal] = useState(null); // null or { diceToSpend, rolls, totalHealed }
  const [upcastLevels, setUpcastLevels] = useState({});
  const [showSpellBrowser, setShowSpellBrowser] = useState(false);
  const [spellBrowserSearch, setSpellBrowserSearch] = useState('');
  const [spellBrowserResults, setSpellBrowserResults] = useState([]);
  const [spellBrowserLevel, setSpellBrowserLevel] = useState('');
  const spellBrowserTimer = useRef(null);
  const toastTimer = useRef(null);
  const healTimer = useRef(null);

  // Close roll context menu on click outside
  useEffect(() => {
    const close = () => setRollMenu(null);
    if (rollMenu) document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [rollMenu]);

  // Load layout/sidebar when char loads
  useEffect(() => {
    if (char?._id) {
      setLayout(getLayout(char._id));
      setSidebarWidth(getSidebarWidth(char._id));
      setColumnCount(getColumnCount(char._id));
    }
  }, [char?._id]);

  useEffect(() => {
    if (!char?.preparedSpells?.length) { setSpellData([]); return; }
    setLoadingSpells(true);
    const names = new Set(char.preparedSpells);
    if (useLocalData) {
      const all = getAllLocalSpells();
      setSpellData(all.filter(s => names.has(s.name)));
      setLoadingSpells(false);
    } else {
      fetch('/api/spells')
        .then(r => r.json())
        .then(all => {
          setSpellData(all.filter(s => names.has(s.name)));
          setLoadingSpells(false);
        })
        .catch(() => {
          // Fallback to local if DB fails
          const all = getAllLocalSpells();
          setSpellData(all.filter(s => names.has(s.name)));
          setLoadingSpells(false);
        });
    }
  }, [char?.preparedSpells, useLocalData]);

  // Spell browser search
  useEffect(() => {
    if (!showSpellBrowser) return;
    if (!spellBrowserSearch && spellBrowserLevel === '') { setSpellBrowserResults([]); return; }
    if (spellBrowserTimer.current) clearTimeout(spellBrowserTimer.current);
    spellBrowserTimer.current = setTimeout(() => {
      const all = getAllLocalSpells();
      let filtered = all;
      if (spellBrowserSearch) {
        const q = spellBrowserSearch.toLowerCase();
        filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
      }
      if (spellBrowserLevel !== '') {
        filtered = filtered.filter(s => s.level === Number(spellBrowserLevel));
      }
      // Filter by class if character has a class
      if (char?.class) {
        const cls = char.class.toLowerCase();
        filtered = filtered.filter(s => !s.classes?.length || s.classes.some(c => c.toLowerCase() === cls));
      }
      setSpellBrowserResults(filtered.slice(0, 50));
    }, 200);
  }, [spellBrowserSearch, spellBrowserLevel, showSpellBrowser, char?.class]);

  const invSearchTimer = useRef(null);
  useEffect(() => {
    if (!invSearch && !invCategory) { setInvResults([]); return; }
    setInvLoading(true);
    if (invSearchTimer.current) clearTimeout(invSearchTimer.current);
    invSearchTimer.current = setTimeout(() => {
      if (useLocalData) {
        const data = queryLocalEquipment({ search: invSearch || undefined, category: invCategory || undefined });
        data.sort((a, b) => (RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0));
        setInvResults(data);
        setInvLoading(false);
        data.forEach(d => { equipCache.current[d.name] = d; });
      } else {
        const params = new URLSearchParams();
        if (invSearch) params.set('search', invSearch);
        if (invCategory) params.set('category', invCategory);
        fetch(`/api/equipment?${params}`)
          .then(r => r.json())
          .then(data => {
            data.sort((a, b) => (RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0));
            setInvResults(data);
            setInvLoading(false);
            data.forEach(d => { equipCache.current[d.name] = d; });
          })
          .catch(() => {
            // Fallback to local
            const data = queryLocalEquipment({ search: invSearch || undefined, category: invCategory || undefined });
            data.sort((a, b) => (RARITY_ORDER[a.rarity] || 0) - (RARITY_ORDER[b.rarity] || 0));
            setInvResults(data);
            setInvLoading(false);
            data.forEach(d => { equipCache.current[d.name] = d; });
          });
      }
    }, 300);
    return () => { if (invSearchTimer.current) clearTimeout(invSearchTimer.current); };
  }, [invSearch, invCategory, useLocalData]);

  // Pre-fetch equipment data for inventory items
  const [equipDataLoaded, setEquipDataLoaded] = useState(false);
  useEffect(() => {
    const items = char?.equipment;
    if (!items?.length || equipDataLoaded) return;
    const uncached = items.filter(name => !equipCache.current[name]);
    if (uncached.length === 0) { setEquipDataLoaded(true); return; }
    if (useLocalData) {
      uncached.forEach(name => {
        const match = getLocalEquipmentByName(name);
        if (match) equipCache.current[name] = match;
      });
      setEquipDataLoaded(true);
    } else {
      Promise.all(uncached.map(name =>
        fetch(`/api/equipment?search=${encodeURIComponent(name)}`)
          .then(r => r.json())
          .then(data => {
            const match = data.find(d => d.name === name);
            if (match) equipCache.current[name] = match;
          })
          .catch(() => {
            const local = getLocalEquipmentByName(name);
            if (local) equipCache.current[name] = local;
          })
      )).then(() => setEquipDataLoaded(true));
    }
  }, [char?.equipment, equipDataLoaded, useLocalData]);

  // Sidebar resize handlers
  useEffect(() => {
    const onMove = (e) => {
      if (!resizing.current) return;
      const dx = e.clientX - resizeStart.current.x;
      const newW = Math.max(260, Math.min(600, resizeStart.current.w + dx));
      setSidebarWidth(newW);
    };
    const onUp = () => {
      if (resizing.current) {
        resizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (char?._id) saveSidebarWidth(char._id, sidebarWidth);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [char, sidebarWidth]);

  const addEquipItem = (name) => {
    const updated = [...(char.equipment || []), name];
    updateField('equipment', updated);
  };

  const removeEquipItem = (index) => {
    const itemName = char.equipment[index];
    const updated = char.equipment.filter((_, j) => j !== index);
    updateField('equipment', updated);
    // Also unequip if equipped
    if (char.equippedItems?.includes(itemName)) {
      updateField('equippedItems', (char.equippedItems || []).filter(n => n !== itemName));
    }
  };

  const toggleEquip = (itemName, e) => {
    e.stopPropagation();
    const equipped = char.equippedItems || [];
    if (equipped.includes(itemName)) {
      updateField('equippedItems', equipped.filter(n => n !== itemName));
    } else {
      updateField('equippedItems', [...equipped, itemName]);
    }
  };

  const fetchAndOpenItem = async (itemName) => {
    // Check cache first
    if (equipCache.current[itemName]) {
      openItemPanel(equipCache.current[itemName]);
      return;
    }
    // Check current invResults
    const found = invResults.find(r => r.name === itemName);
    if (found) {
      equipCache.current[itemName] = found;
      openItemPanel(found);
      return;
    }
    // Try local data first
    const localMatch = getLocalEquipmentByName(itemName);
    if (localMatch) {
      equipCache.current[itemName] = localMatch;
      openItemPanel(localMatch);
    } else {
      openItemPanel({ name: itemName, category: 'adventuring-gear' });
    }
  };

  const applyHp = (sign) => {
    const delta = parseInt(hpDelta) || 0;
    if (!delta) return;
    const newHp = Math.min(char.maxHp, Math.max(0, char.currentHp + sign * delta));
    updateHp(newHp);
    setHpDelta('');
  };

  // Log a roll and show toast notification (+ sync to campaign if linked)
  const logRoll = useCallback((label, formula, total, tag) => {
    const entry = { label, formula, total, tag, time: Date.now(), who: char?.name || 'Unknown', avatar: char?.avatarUrl || null };
    setRollLog(prev => [entry, ...prev].slice(0, 50)); // keep last 50
    setRollToast(entry);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setRollToast(null), 4000);
    if (char?.campaignId) {
      const playerName = localStorage.getItem('ond-player-name') || 'Unknown';
      fetch(`/api/campaigns/${char.campaignId}/rolls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, characterName: char.name, avatarUrl: char.avatarUrl || '', label, formula, total, tag: tag || '' }),
      }).catch(() => {});
    }
  }, [char?.campaignId, char?.name, char?.avatarUrl]);

  // Short Rest: spend hit dice to heal
  const doShortRest = useCallback(() => {
    if (!char) return;
    const remaining = char.hitDiceRemaining ?? char.level;
    if (remaining <= 0 && char.currentHp >= char.maxHp) {
      setHealToast({ amount: 0, newHp: char.currentHp, maxHp: char.maxHp, diceUsed: 0, diceMax: char.level, error: 'No hit dice and already full HP!' });
      if (healTimer.current) clearTimeout(healTimer.current);
      healTimer.current = setTimeout(() => setHealToast(null), 2500);
      return;
    }
    // Open short rest modal
    setShortRestModal({ rolls: [], totalHealed: 0, diceSpent: 0 });
  }, [char]);

  const shortRestRollDie = useCallback(async () => {
    if (!char || !shortRestModal) return;
    const remaining = (char.hitDiceRemaining ?? char.level) - shortRestModal.diceSpent;
    if (remaining <= 0) return;
    if (char.currentHp + shortRestModal.totalHealed >= char.maxHp) return;

    const hd = HIT_DICE[char.class] || 'd8';
    const conMod = modVal(char.abilityScores?.constitution ?? 10);
    const formula = `1${hd}${conMod >= 0 ? '+' : ''}${conMod}`;
    const { total } = await rollDice3D(formula, 'Short Rest — Hit Die');
    const healed = Math.max(1, total);
    logRoll('Short Rest Hit Die', formula, total, 'Short Rest');

    setShortRestModal(prev => ({
      ...prev,
      rolls: [...prev.rolls, { formula, total: healed }],
      totalHealed: prev.totalHealed + healed,
      diceSpent: prev.diceSpent + 1,
    }));
  }, [char, shortRestModal, rollDice3D, logRoll]);

  const shortRestFinish = useCallback(() => {
    if (!char || !shortRestModal) return;
    const healed = shortRestModal.totalHealed;
    const newHp = Math.min(char.maxHp, char.currentHp + healed);
    const actualHealed = newHp - char.currentHp;
    const newRemaining = (char.hitDiceRemaining ?? char.level) - shortRestModal.diceSpent;

    const updates = { currentHp: newHp, hitDiceRemaining: newRemaining };
    // Warlock pact slots recover on short rest
    if (char.class === 'Warlock') {
      updates.usedSpellSlots = { ...(char.usedSpellSlots || {}), pact: 0 };
    }
    updateChar(prev => ({ ...prev, ...updates }));

    setShortRestModal(null);
    if (actualHealed > 0) {
      setHealToast({ amount: actualHealed, newHp, maxHp: char.maxHp, diceUsed: newRemaining, diceMax: char.level });
      if (healTimer.current) clearTimeout(healTimer.current);
      healTimer.current = setTimeout(() => setHealToast(null), 3500);
    }
  }, [char, shortRestModal, updateChar]);

  // Long Rest — full HP, all spell slots, regain ALL hit dice, reset death saves
  const doLongRest = useCallback(() => {
    if (!char) return;
    const maxDice = char.level || 1;
    updateChar(prev => ({ ...prev, currentHp: prev.maxHp, hitDiceRemaining: maxDice, deathSaveSuccesses: 0, deathSaveFailures: 0, usedSpellSlots: {} }));
  }, [char, updateChar]);

  // Roll with result tracking
  const doRollWithResult = useCallback(async (label, formula) => {
    const result = await rollDice3D(formula, label);
    setRollResults(prev => ({ ...prev, [label]: { total: result.total, time: Date.now() } }));
    setTimeout(() => setRollResults(prev => {
      const next = { ...prev };
      if (next[label]?.time && Date.now() - next[label].time >= 7500) delete next[label];
      return next;
    }), 8000);
    logRoll(label, formula, result.total);
    return result;
  }, [rollDice3D, logRoll]);

  const doAdvantage = useCallback(async (label, formula) => {
    const bonusMatch = formula.match(/1d20([+-]\d+)/);
    const bonus = bonusMatch ? parseInt(bonusMatch[1]) : 0;
    const result = await rollDice3D(`2d20${bonus >= 0 ? '+' : ''}${bonus}`, `${label} (Advantage)`);
    const d20s = result.results.filter(r => r.sides === 20);
    const higher = Math.max(...d20s.map(r => r.value));
    const total = higher + bonus;
    setRollResults(prev => ({ ...prev, [label]: { total, time: Date.now(), tag: 'ADV' } }));
    setTimeout(() => setRollResults(prev => { const n = { ...prev }; if (n[label]?.time && Date.now() - n[label].time >= 7500) delete n[label]; return n; }), 8000);
    logRoll(label, formula, total, 'ADV');
  }, [rollDice3D, logRoll]);

  const doDisadvantage = useCallback(async (label, formula) => {
    const bonusMatch = formula.match(/1d20([+-]\d+)/);
    const bonus = bonusMatch ? parseInt(bonusMatch[1]) : 0;
    const result = await rollDice3D(`2d20${bonus >= 0 ? '+' : ''}${bonus}`, `${label} (Disadvantage)`);
    const d20s = result.results.filter(r => r.sides === 20);
    const lower = Math.min(...d20s.map(r => r.value));
    const total = lower + bonus;
    setRollResults(prev => ({ ...prev, [label]: { total, time: Date.now(), tag: 'DIS' } }));
    setTimeout(() => setRollResults(prev => { const n = { ...prev }; if (n[label]?.time && Date.now() - n[label].time >= 7500) delete n[label]; return n; }), 8000);
    logRoll(label, formula, total, 'DIS');
  }, [rollDice3D, logRoll]);

  const doCrit = useCallback(async (label, formula) => {
    const critFormula = formula.replace(/(\d+)d(\d+)/g, (_, n, s) => `${parseInt(n) * 2}d${s}`);
    const result = await rollDice3D(critFormula, `${label} (CRIT!)`);
    setRollResults(prev => ({ ...prev, [label]: { total: result.total, time: Date.now(), tag: 'CRIT' } }));
    setTimeout(() => setRollResults(prev => { const n = { ...prev }; if (n[label]?.time && Date.now() - n[label].time >= 7500) delete n[label]; return n; }), 8000);
    logRoll(label, critFormula, result.total, 'CRIT');
  }, [rollDice3D, logRoll]);

  // Widget move handlers — button-based for reliability
  const allColumns = columnCount === 2 ? ['left', 'right'] : columnCount === 3 ? ['left', 'right', 'mid'] : ['left', 'right', 'mid', 'far'];

  const moveWidget = (widgetId, direction) => {
    // direction: 'up', 'down', 'toLeft', 'toRight'
    setLayout(prev => {
      const next = prev.map(w => ({ ...w }));
      const widget = next.find(w => w.id === widgetId);
      if (!widget) return prev;

      if (direction === 'toLeft' || direction === 'toRight') {
        const colIdx = allColumns.indexOf(widget.col);
        const targetIdx = direction === 'toLeft' ? colIdx - 1 : colIdx + 1;
        if (targetIdx < 0 || targetIdx >= allColumns.length) return prev;
        const targetCol = allColumns[targetIdx];
        const oldCol = widget.col;
        widget.col = targetCol;
        const targetWidgets = next.filter(w => w.col === targetCol && w.id !== widgetId);
        widget.order = targetWidgets.length;
        next.filter(w => w.col === oldCol && w.id !== widgetId)
          .sort((a, b) => a.order - b.order)
          .forEach((w, i) => { w.order = i; });
      } else {
        const colWidgets = next.filter(w => w.col === widget.col).sort((a, b) => a.order - b.order);
        const idx = colWidgets.findIndex(w => w.id === widgetId);
        if (direction === 'up' && idx > 0) {
          const swapWith = colWidgets[idx - 1];
          const tmp = widget.order;
          widget.order = swapWith.order;
          swapWith.order = tmp;
        } else if (direction === 'down' && idx < colWidgets.length - 1) {
          const swapWith = colWidgets[idx + 1];
          const tmp = widget.order;
          widget.order = swapWith.order;
          swapWith.order = tmp;
        } else {
          return prev;
        }
      }

      if (char?._id) saveLayout(char._id, next);
      return next;
    });
  };


  const profBonus = char?.proficiencyBonus || 2;
  const scores = char?.abilityScores || {};
  const passivePerception = 10 + modVal(scores.wisdom ?? 10) + (char?.skillProficiencies?.includes('Perception') ? profBonus : 0);
  const passiveInvestigation = 10 + modVal(scores.intelligence ?? 10) + (char?.skillProficiencies?.includes('Investigation') ? profBonus : 0);
  const passiveInsight = 10 + modVal(scores.wisdom ?? 10) + (char?.skillProficiencies?.includes('Insight') ? profBonus : 0);
  const initiative = modVal(scores.dexterity ?? 10);
  const dexMod = modVal(scores.dexterity ?? 10);

  // Auto-calculate AC from equipped armor
  const calcAC = useMemo(() => {
    if (!char) return 10;
    const equipped = char.equippedItems || [];
    const cache = equipCache.current;
    let baseAC = 10 + dexMod; // unarmored default
    let shieldBonus = 0;
    let hasArmor = false;

    for (const name of equipped) {
      const item = cache[name];
      if (!item || item.category !== 'armor') continue;
      const ac = parseInt(item.ac);
      if (isNaN(ac)) continue;
      const sub = (item.subcategory || '').toLowerCase();

      if (sub.includes('shield')) {
        shieldBonus = Math.max(shieldBonus, ac || 2);
      } else if (sub.includes('heavy')) {
        baseAC = ac;
        hasArmor = true;
      } else if (sub.includes('medium')) {
        baseAC = ac + Math.min(dexMod, 2);
        hasArmor = true;
      } else if (sub.includes('light')) {
        baseAC = ac + dexMod;
        hasArmor = true;
      } else {
        // Unknown armor type — use AC + DEX as fallback
        if (ac > baseAC) { baseAC = ac + dexMod; hasArmor = true; }
      }
    }
    return baseAC + shieldBonus;
  }, [char?.equippedItems, dexMod, equipDataLoaded]);

  // Check if equipped armor gives stealth disadvantage
  const hasStealthDisadvantage = useMemo(() => {
    if (!char) return false;
    return (char.equippedItems || []).some(name => {
      const item = equipCache.current[name];
      return item?.category === 'armor' && item?.stealthDisadvantage === true;
    });
  }, [char?.equippedItems, equipDataLoaded]);

  // Update char.armorClass when calculated AC changes
  useEffect(() => {
    if (char && calcAC !== char.armorClass) {
      updateField('armorClass', calcAC);
    }
  }, [calcAC, char?.armorClass]);

  if (loading) return <div className="page" style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>;
  if (!char) return <div className="page" style={{ textAlign: 'center', padding: '60px' }}>Character not found.</div>;

  // Spell slots
  const spellSlotData = getSpellSlots(char.class, char.level);
  const usedSlots = char.usedSpellSlots || {};

  // Extra Attack
  const extraAttacks = getExtraAttacks(char.class, char.level);

  // Carrying capacity
  const carryCapacity = (scores.strength ?? 10) * 15;

  // Resistances / Immunities / Vulnerabilities
  const raceDef = RACE_DEFENSES[char.race] || { resistances: [], immunities: [], vulnerabilities: [] };
  const classDef = getClassDefenses(char.class, char.level, char.subclass);
  const allResistances = [...new Set([...(raceDef.resistances || []), ...(classDef.resistances || []), ...(char.customResistances || [])])];
  const allImmunities = [...new Set([...(raceDef.immunities || []), ...(classDef.immunities || []), ...(char.customImmunities || [])])];
  const allVulnerabilities = [...new Set([...(raceDef.vulnerabilities || []), ...(classDef.vulnerabilities || []), ...(char.customVulnerabilities || [])])];
  const hasDefenses = allResistances.length > 0 || allImmunities.length > 0 || allVulnerabilities.length > 0;

  // Attunement
  const attunedItems = char.attunedItems || [];

  // Active conditions
  const activeConditions = char.activeConditions || [];
  // Condition effects on rolls (5e rules)
  const CONDITION_EFFECTS = {
    Blinded: { attacks: 'disadvantage', attackedBy: 'advantage', desc: 'Attack rolls have disadvantage. Attacks against you have advantage.' },
    Frightened: { abilities: 'disadvantage', attacks: 'disadvantage', desc: 'Disadvantage on ability checks and attack rolls while source of fear is in sight.' },
    Invisible: { attacks: 'advantage', attackedBy: 'disadvantage', desc: 'Attack rolls have advantage. Attacks against you have disadvantage.' },
    Paralyzed: { autoFail: ['strength', 'dexterity'], desc: 'Auto-fail STR and DEX saves. Attacks against you have advantage and auto-crit within 5ft.' },
    Petrified: { autoFail: ['strength', 'dexterity'], resistAll: true, desc: 'Auto-fail STR and DEX saves. Resistance to all damage.' },
    Poisoned: { abilities: 'disadvantage', attacks: 'disadvantage', desc: 'Disadvantage on attack rolls and ability checks.' },
    Prone: { meleeAttackedBy: 'advantage', rangedAttackedBy: 'disadvantage', attacks: 'disadvantage', desc: 'Disadvantage on attack rolls. Melee attacks against you have advantage, ranged have disadvantage.' },
    Restrained: { attacks: 'disadvantage', attackedBy: 'advantage', dexSaves: 'disadvantage', desc: 'Disadvantage on attack rolls and DEX saves. Attacks against you have advantage.' },
    Stunned: { autoFail: ['strength', 'dexterity'], desc: 'Auto-fail STR and DEX saves. Attacks against you have advantage.' },
    Unconscious: { autoFail: ['strength', 'dexterity'], desc: 'Auto-fail STR and DEX saves. Attacks against you have advantage and auto-crit within 5ft.' },
    Exhaustion: { desc: 'Level 1: Disadvantage on ability checks. Further levels impose more penalties.' },
  };
  const ALL_CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'];

  // Check if conditions impose disadvantage on attacks
  const hasAttackDisadvantage = activeConditions.some(c => CONDITION_EFFECTS[c]?.attacks === 'disadvantage');
  const hasAttackAdvantage = activeConditions.some(c => CONDITION_EFFECTS[c]?.attacks === 'advantage');
  // Check if conditions impose disadvantage on ability checks
  const hasAbilityDisadvantage = activeConditions.some(c => CONDITION_EFFECTS[c]?.abilities === 'disadvantage') || activeConditions.includes('Exhaustion');

  // Upcast helper: compute scaled damage formula
  const getUpcastDamage = (spell, castLevel) => {
    if (!spell.damage || !spell.scaling || spell.level === 0) return spell.damage;
    const levelsAbove = castLevel - spell.level;
    if (levelsAbove <= 0) return spell.damage;
    const scaleMatch = spell.scaling.match(/(\d+)d(\d+)/);
    if (!scaleMatch) return spell.damage;
    const scaleCount = parseInt(scaleMatch[1]) * levelsAbove;
    const scaleDie = scaleMatch[2];
    return `${spell.damage}+${scaleCount}d${scaleDie}`;
  };
  const setUpcast = (spellName, level) => setUpcastLevels(prev => ({ ...prev, [spellName]: level }));

  const cantrips = spellData.filter(s => s.level === 0 && s.source !== 'race');
  const racialAbilities = spellData.filter(s => s.source === 'race');
  const tabs = ['actions', 'spells', 'inventory', 'features', 'progression', 'background', 'notes'];

  // Get sorted widgets for each column (hide xp-bar if not using XP leveling)
  const isXpMode = char?.levelingMethod === 'xp';
  const visibleLayout = layout.filter(w => w.id !== 'xp-bar' || isXpMode);
  const leftWidgets = visibleLayout.filter(w => w.col === 'left').sort((a, b) => a.order - b.order);
  const rightWidgets = visibleLayout.filter(w => w.col === 'right').sort((a, b) => a.order - b.order);
  const midWidgets = visibleLayout.filter(w => w.col === 'mid').sort((a, b) => a.order - b.order);
  const farWidgets = visibleLayout.filter(w => w.col === 'far').sort((a, b) => a.order - b.order);

  // ─── Styles ──────────────────────────────────────────
  const st = {
    sheet: { maxWidth: '1400px', margin: '0 auto', padding: '16px', position: 'relative' },
    header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', padding: '12px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' },
    abilityBar: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginBottom: '16px' },
    abilityCell: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px',
      padding: '8px 4px', cursor: 'pointer', transition: 'border-color 0.15s',
    },
    layout: { display: 'grid', gridTemplateColumns: columnCount === 2 ? `${sidebarWidth}px 1fr` : columnCount === 3 ? `${sidebarWidth}px 1fr 1fr` : `${sidebarWidth}px 1fr 1fr 1fr`, gap: '16px', alignItems: 'start', position: 'relative' },
    sidebar: { display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' },
    sideCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' },
    sideLabel: { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '8px', fontFamily: 'Cinzel, serif' },
    combatBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 16px', minWidth: '70px' },
    tabBar: { display: 'flex', gap: '0', borderBottom: '2px solid var(--border)', marginBottom: '16px', flexWrap: 'wrap' },
    tab: (active) => ({
      padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
      color: active ? 'var(--gold)' : 'var(--text-dim)',
      borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
      fontFamily: 'Cinzel, serif', fontSize: '12px', textTransform: 'uppercase',
      letterSpacing: '0.5px', fontWeight: active ? 700 : 400,
      marginBottom: '-2px', transition: 'color 0.15s',
    }),
    panelOverlay: { position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, background: 'rgba(0,0,0,0.2)', zIndex: 1000, transition: 'opacity 0.3s ease' },
    panel: { position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', maxWidth: '90vw', background: 'var(--bg-dark)', borderLeft: '2px solid var(--gold-dim)', zIndex: 1001, overflowY: 'auto', padding: '24px', boxShadow: '-4px 0 30px rgba(0,0,0,0.6)', transition: 'transform 0.3s ease' },
  };

  // ─── Reusable components ──────────────────────────────
  const RollBtn = ({ label, formula, children, style: extraStyle, type = 'attack', onRoll }) => {
    const result = rollResults[label];
    const isAttack = type === 'attack' || formula.includes('d20');
    const isDamage = type === 'damage' || !formula.includes('d20');
    // Auto-apply condition effects to attack rolls
    const conditionRoll = isAttack && hasAttackDisadvantage && !hasAttackAdvantage
      ? () => doDisadvantage(label, formula)
      : isAttack && hasAttackAdvantage && !hasAttackDisadvantage
      ? () => doAdvantage(label, formula)
      : () => doRollWithResult(label, formula);

    return (
      <button
        onClick={(e) => { e.stopPropagation(); conditionRoll(); if (onRoll) onRoll(); }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setRollMenu({ x: e.clientX, y: e.clientY, label, formula, type: isAttack ? 'attack' : 'damage' });
        }}
        title={`Roll ${formula} · Right-click for options`}
        className="cc-skill"
        style={{
          background: result ? 'var(--accent)' : 'var(--surface)',
          border: `1px solid ${result ? 'var(--gold)' : 'var(--border)'}`,
          borderRadius: '6px',
          color: 'var(--gold)', cursor: 'pointer', fontSize: '12px', padding: '4px 12px',
          fontFamily: 'Cinzel, serif', display: 'inline-flex', alignItems: 'center', gap: '6px',
          transition: 'all 0.15s', fontWeight: 600, minWidth: '48px', justifyContent: 'center',
          ...extraStyle,
        }}>
        {children || formula}
        {result && (
          <>
            <span style={{ fontSize: '14px', fontWeight: 800, color: result.tag === 'CRIT' ? '#ff4444' : 'var(--gold)', marginLeft: '4px' }}>{result.total}</span>
            {result.tag && <span style={{ fontSize: '8px', opacity: 0.7, letterSpacing: '0.5px' }}>{result.tag}</span>}
          </>
        )}
      </button>
    );
  };

  const ProfDot = ({ filled, expert }) => (
    <span style={{
      width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
      background: expert ? 'var(--gold)' : filled ? 'var(--green-light)' : 'transparent',
      border: `2px solid ${expert ? 'var(--gold)' : filled ? 'var(--green-light)' : 'var(--border)'}`,
    }} />
  );

  const SkillRow = ({ skill }) => {
    const baseScore = scores[skill.ability] ?? 10;
    const baseMod = modVal(baseScore);
    const prof = char.skillProficiencies?.includes(skill.name);
    const expert = char.skillExpertise?.includes(skill.name);
    const bonus = baseMod + (expert ? profBonus * 2 : prof ? profBonus : 0);
    const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
    const formula = `1d20${bonus >= 0 ? '+' : ''}${bonus}`;
    const result = rollResults[skill.name];
    // Conditions and armor affect ability checks
    const armorStealthDis = skill.name === 'Stealth' && hasStealthDisadvantage;
    const condDis = hasAbilityDisadvantage || armorStealthDis;
    const rollFn = condDis ? () => doDisadvantage(skill.name, formula) : () => doRollWithResult(skill.name, formula);
    return (
      <div
        className="cc-skill"
        onClick={rollFn}
        onContextMenu={(e) => {
          e.preventDefault();
          setRollMenu({ x: e.clientX, y: e.clientY, label: skill.name, formula, type: 'attack' });
        }}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}>
        <ProfDot filled={prof} expert={expert} />
        <span style={{ width: '30px', color: 'var(--text-dim)', fontSize: '12px' }}>{ABBR[skill.ability]}</span>
        <span style={{ flex: 1 }}>{skill.name}{condDis && <span style={{ fontSize: '9px', color: '#f87171', marginLeft: '4px' }}>DIS</span>}</span>
        <span style={{ fontWeight: 700, color: 'var(--gold)', minWidth: '28px', textAlign: 'right' }}>{bonusStr}</span>
        {result && (
          <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--gold)', minWidth: '36px', textAlign: 'center', background: 'var(--accent)', borderRadius: '4px', padding: '1px 6px', border: '1px solid var(--gold-dim)' }}>
            {result.total}
            {result.tag && <span style={{ fontSize: '7px', marginLeft: '2px', opacity: 0.7 }}>{result.tag}</span>}
          </span>
        )}
      </div>
    );
  };

  const SaveRow = ({ ab }) => {
    const baseScore = scores[ab] ?? 10;
    const baseMod = modVal(baseScore);
    const prof = char.savingThrowProficiencies?.includes(ab);
    const bonus = baseMod + (prof ? profBonus : 0);
    const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
    const formula = `1d20${bonus >= 0 ? '+' : ''}${bonus}`;
    const label = `${ab.charAt(0).toUpperCase() + ab.slice(1)} Save`;
    const result = rollResults[label];
    // Conditions: auto-fail STR/DEX saves, disadvantage on DEX saves
    const autoFail = activeConditions.some(c => CONDITION_EFFECTS[c]?.autoFail?.includes(ab));
    const dexDis = ab === 'dexterity' && activeConditions.some(c => CONDITION_EFFECTS[c]?.dexSaves === 'disadvantage');
    const rollFn = autoFail ? null : dexDis ? () => doDisadvantage(label, formula) : () => doRollWithResult(label, formula);
    return (
      <div
        className="cc-skill"
        onClick={() => { if (autoFail) { logRoll(label, 'Auto-fail', 0, 'FAIL'); } else rollFn(); }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!autoFail) setRollMenu({ x: e.clientX, y: e.clientY, label, formula, type: 'attack' });
        }}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px', opacity: autoFail ? 0.5 : 1 }}>
        <ProfDot filled={prof} />
        <span style={{ flex: 1, textTransform: 'capitalize' }}>{ab}{autoFail && <span style={{ fontSize: '9px', color: '#f87171', marginLeft: '4px' }}>AUTO-FAIL</span>}{dexDis && <span style={{ fontSize: '9px', color: '#f87171', marginLeft: '4px' }}>DIS</span>}</span>
        <span style={{ fontWeight: 700, color: autoFail ? '#f87171' : 'var(--gold)' }}>{autoFail ? 'Fail' : bonusStr}</span>
        {result && (
          <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--gold)', background: 'var(--accent)', borderRadius: '4px', padding: '1px 6px', border: '1px solid var(--gold-dim)' }}>
            {result.total}
            {result.tag && <span style={{ fontSize: '7px', marginLeft: '2px', opacity: 0.7 }}>{result.tag}</span>}
          </span>
        )}
      </div>
    );
  };

  const SpellCard = ({ spell, onClick }) => {
    const isRacial = spell.source === 'race';
    const canUpcast = spell.level > 0 && spell.damage && spell.scaling;
    const castLevel = upcastLevels[spell.name] || spell.level;
    const effectiveDamage = canUpcast ? getUpcastDamage(spell, castLevel) : spell.damage;
    const maxSlot = spellSlotData?.pact ? spellSlotData.level : (spellSlotData ? spellSlotData.reduce((max, total, i) => total > 0 ? i + 1 : max, 0) : 9);
    return (
      <div onClick={() => onClick(spell)}
        className="cc-skill"
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
          background: 'var(--input-bg)', border: `1px solid ${castLevel > spell.level ? '#2a6a2a' : 'var(--border)'}`,
        }}>
        {/* Unprepare button */}
        {!isRacial && (
          <button onClick={(e) => {
            e.stopPropagation();
            const current = char.preparedSpells || [];
            updateField('preparedSpells', current.filter(n => n !== spell.name));
          }}
            title="Unprepare spell"
            style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'var(--gold)', border: 'none', color: 'var(--bg-dark)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>✓</button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {spell.name}
            {canUpcast && (
              <select value={castLevel} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); setUpcast(spell.name, parseInt(e.target.value)); }}
                style={{ padding: '1px 4px', fontSize: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: castLevel > spell.level ? '#4ade80' : 'var(--text-dim)', cursor: 'pointer', fontWeight: 600 }}>
                {Array.from({ length: maxSlot - spell.level + 1 }, (_, i) => spell.level + i).map(lvl => (
                  <option key={lvl} value={lvl}>{lvl === spell.level ? `Lv${lvl}` : `Lv${lvl} ↑`}</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span>{spell.school}</span>
            {spell.concentration && <span style={{ color: 'var(--gold)' }}>C</span>}
            {spell.ritual && <span style={{ color: 'var(--gold)' }}>R</span>}
            {isRacial && <span style={{ color: '#b07ee0' }}>Racial</span>}
            {spell.damageType && <span>{spell.damageType}</span>}
            {canUpcast && castLevel > spell.level && <span style={{ color: '#4ade80' }}>→ Lv{castLevel}</span>}
          </div>
        </div>
        {effectiveDamage && (
          <RollBtn label={`${spell.name} Damage${castLevel > spell.level ? ` (Lv${castLevel})` : ''}`} formula={effectiveDamage} type="damage">
            {effectiveDamage}
          </RollBtn>
        )}
        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{spell.castingTime}</span>
      </div>
    );
  };

  const openSpellPanel = (spell) => setSidePanel({ type: 'spell', data: spell });
  const openItemPanel = (item) => setSidePanel({ type: 'item', data: item });

  const WIDGET_NAMES = {
    'combat-stats': 'Combat Stats',
    'saving-throws': 'Saving Throws',
    'skills': 'Skills',
    'senses': 'Senses',
    'proficiencies': 'Proficiencies',
    'currency': 'Currency',
    'xp-bar': 'Experience',
    'hp-section': 'HP & AC',
    'tabs-section': 'Tabs',
  };

  // Widget wrapper with move controls
  const editBtnStyle = (disabled) => ({
    background: disabled ? 'var(--surface)' : 'var(--accent)',
    border: `1px solid ${disabled ? 'var(--border)' : 'var(--gold-dim)'}`,
    color: disabled ? 'var(--text-dim)' : 'var(--gold)',
    cursor: disabled ? 'default' : 'pointer',
    borderRadius: '4px', padding: '2px 6px', fontSize: '14px',
    opacity: disabled ? 0.3 : 1, lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '26px', height: '26px',
  });

  const wrapWidget = (wid, children) => {
    if (!editMode) return children;

    const w = visibleLayout.find(l => l.id === wid);
    const colWidgets = visibleLayout.filter(l => l.col === w.col).sort((a, b) => a.order - b.order);
    const idx = colWidgets.findIndex(l => l.id === wid);
    const isFirst = idx === 0;
    const isLast = idx === colWidgets.length - 1;
    const colIdx = allColumns.indexOf(w.col);
    const isLeftmost = colIdx <= 0;
    const isRightmost = colIdx >= allColumns.length - 1;

    return (
      <div style={{
        position: 'relative',
        outline: '1px dashed var(--border-light)',
        outlineOffset: '4px',
        borderRadius: '8px',
      }}>
        <div style={{
          position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', zIndex: 10,
          display: 'flex', gap: '3px', alignItems: 'center',
          background: 'var(--bg-dark)', padding: '2px 6px', borderRadius: '6px',
          border: '1px solid var(--gold-dim)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.5px', marginRight: '4px', textTransform: 'uppercase' }}>
            {WIDGET_NAMES[wid] || wid}
          </span>
          <button style={editBtnStyle(isFirst)} onClick={() => !isFirst && moveWidget(wid, 'up')} title="Move up">↑</button>
          <button style={editBtnStyle(isLast)} onClick={() => !isLast && moveWidget(wid, 'down')} title="Move down">↓</button>
          <button style={editBtnStyle(isLeftmost)} onClick={() => !isLeftmost && moveWidget(wid, 'toLeft')} title="Move left">←</button>
          <button style={editBtnStyle(isRightmost)} onClick={() => !isRightmost && moveWidget(wid, 'toRight')} title="Move right">→</button>
        </div>
        {children}
      </div>
    );
  };

  // ─── Widget content renderers ──────────────────────────
  const renderWidget = (wid) => {
    switch (wid) {
      case 'combat-stats':
        return wrapWidget(wid,
            <div style={{ display: 'grid', gridTemplateColumns: extraAttacks > 0 ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: '6px' }}>
              <div style={st.combatBox}>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '1px', fontWeight: 600 }}>Prof</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gold)' }}>+{profBonus}</span>
              </div>
              <div style={st.combatBox}>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '1px', fontWeight: 600 }}>Speed</span>
                <span style={{ fontSize: '20px', fontWeight: 700 }}>{char.speed}ft</span>
              </div>
              <Tip text="Roll Initiative — Click to roll 1d20 + DEX modifier to determine turn order in combat.">
                <div style={{ ...st.combatBox, cursor: 'pointer', borderColor: 'var(--gold)', boxShadow: 'inset 0 0 0 2px var(--gold-dim)' }} className="cc-skill"
                  onClick={() => doRollWithResult('Initiative', `1d20${initiative >= 0 ? '+' : ''}${initiative}`)}>
                  <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--gold)', letterSpacing: '1px', fontWeight: 700 }}>Initiative</span>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--gold)' }}>{initiative >= 0 ? `+${initiative}` : initiative}</span>
                </div>
              </Tip>
              {extraAttacks > 0 && (
                <Tip text={`You can attack ${extraAttacks + 1} times when you take the Attack action on your turn.`}>
                  <div style={{ ...st.combatBox, borderColor: '#4ade80' }}>
                    <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#4ade80', letterSpacing: '1px', fontWeight: 600 }}>Attacks</span>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#4ade80' }}>{extraAttacks + 1}</span>
                  </div>
                </Tip>
              )}
            </div>
        );

      case 'saving-throws':
        return wrapWidget(wid,
            <div style={st.sideCard}>
              <div style={st.sideLabel}>Saving Throws</div>
              {ABILITIES.map(ab => <SaveRow key={ab} ab={ab} />)}
            </div>
        );

      case 'senses':
        return wrapWidget(wid,
            <div style={st.sideCard}>
              <div style={st.sideLabel}>Senses</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { label: 'Passive Perception', value: passivePerception },
                  { label: 'Passive Investigation', value: passiveInvestigation },
                  { label: 'Passive Insight', value: passiveInsight },
                ].map(p => (
                  <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '26px', height: '26px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', color: 'var(--gold)', flexShrink: 0 }}>{p.value}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
        );

      case 'proficiencies':
        return wrapWidget(wid,
            <div style={st.sideCard}>
              <div style={st.sideLabel}>Proficiencies</div>
              {char.languages?.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Languages</div>
                  <div style={{ fontSize: '12px', color: 'var(--text)' }}>{char.languages.join(', ')}</div>
                </div>
              )}
              {char.toolProficiencies?.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>Tools</div>
                  <div style={{ fontSize: '12px', color: 'var(--text)' }}>{char.toolProficiencies.join(', ')}</div>
                </div>
              )}
            </div>
        );

      case 'conditions':
        return wrapWidget(wid,
            <div style={st.sideCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={st.sideLabel}>Conditions</div>
                <button onClick={() => setShowConditionPicker(!showConditionPicker)}
                  style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: showConditionPicker ? '#3a1a1a' : 'var(--surface)', border: `1px solid ${showConditionPicker ? '#6a2a2a' : 'var(--border)'}`, color: showConditionPicker ? '#f87171' : 'var(--text-dim)', cursor: 'pointer' }}>
                  {showConditionPicker ? '▴ Close' : '+ Edit'}
                </button>
              </div>
              {activeConditions.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                  {activeConditions.map(cond => {
                    const effect = CONDITION_EFFECTS[cond];
                    return (
                      <Tip key={cond} text={effect?.desc || cond}>
                        <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: '#3a1a1a', border: '1px solid #6a2a2a', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'default' }}>
                          {cond}
                          <button onClick={() => updateField('activeConditions', activeConditions.filter(c => c !== cond))}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px', padding: 0, lineHeight: 1, opacity: 0.7 }}>×</button>
                        </span>
                      </Tip>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>No active conditions</div>
              )}
              {/* Effects summary */}
              {activeConditions.length > 0 && (
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
                  {hasAttackDisadvantage && <div style={{ color: '#f87171' }}>Disadvantage on attack rolls</div>}
                  {hasAbilityDisadvantage && <div style={{ color: '#f87171' }}>Disadvantage on ability checks</div>}
                  {activeConditions.some(c => CONDITION_EFFECTS[c]?.autoFail) && <div style={{ color: '#f87171' }}>Auto-fail STR/DEX saves</div>}
                  {activeConditions.some(c => CONDITION_EFFECTS[c]?.dexSaves === 'disadvantage') && <div style={{ color: '#f87171' }}>Disadvantage on DEX saves</div>}
                  {hasAttackAdvantage && <div style={{ color: '#4ade80' }}>Advantage on attack rolls</div>}
                </div>
              )}
              {/* Picker */}
              {showConditionPicker && (
                <div style={{ marginTop: '6px', padding: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {ALL_CONDITIONS.map(cond => {
                      const isActive = activeConditions.includes(cond);
                      const effect = CONDITION_EFFECTS[cond];
                      return (
                        <Tip key={cond} text={effect?.desc || cond}>
                          <button
                            onClick={() => {
                              if (isActive) updateField('activeConditions', activeConditions.filter(c => c !== cond));
                              else updateField('activeConditions', [...activeConditions, cond]);
                            }}
                            className="cc-skill"
                            style={{
                              fontSize: '11px', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer',
                              background: isActive ? '#3a1a1a' : 'var(--surface)',
                              border: `1px solid ${isActive ? '#6a2a2a' : 'var(--border)'}`,
                              color: isActive ? '#f87171' : 'var(--text-dim)',
                            }}>
                            {isActive ? '✓ ' : ''}{cond}
                          </button>
                        </Tip>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
        );

      case 'defenses': {
        const DAMAGE_TYPES = ['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'];
        const CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Magical Sleep', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'];
        const ALL_OPTIONS = [...DAMAGE_TYPES, '—', ...CONDITIONS];
        const sections = [
          { label: 'Resistances', items: allResistances, color: '#4ade80', bg: '#1a3a1a', border: '#2a6a2a', field: 'customResistances' },
          { label: 'Immunities', items: allImmunities, color: '#60b0e0', bg: '#1a2a3a', border: '#2a5a8a', field: 'customImmunities' },
          { label: 'Vulnerabilities', items: allVulnerabilities, color: '#f87171', bg: '#3a1a1a', border: '#6a2a2a', field: 'customVulnerabilities' },
        ];
        return wrapWidget(wid,
            <div style={st.sideCard}>
              <div style={st.sideLabel}>Defenses</div>
              {sections.map(section => (
                <div key={section.label} style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '11px', color: section.color, textTransform: 'uppercase', marginBottom: '3px', fontWeight: 600 }}>{section.label}</div>
                    <button
                      onClick={() => setDefensePicker(defensePicker?.field === section.field ? null : section)}
                      style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: defensePicker?.field === section.field ? section.bg : 'var(--surface)', border: `1px solid ${section.border}`, color: section.color, cursor: 'pointer', opacity: 0.8 }}>
                      {defensePicker?.field === section.field ? '▴ Close' : '+ Edit'}
                    </button>
                  </div>
                  {section.items.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                      {section.items.map(r => {
                        const isCustom = (char[section.field] || []).includes(r);
                        return (
                          <span key={r} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: section.bg, border: `1px solid ${section.border}`, color: section.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {r}
                            {isCustom && (
                              <button onClick={() => updateField(section.field, (char[section.field] || []).filter(x => x !== r))}
                                style={{ background: 'none', border: 'none', color: section.color, cursor: 'pointer', fontSize: '12px', padding: 0, lineHeight: 1, opacity: 0.7 }}>×</button>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '4px' }}>None</div>
                  )}
                  {/* Picker panel */}
                  {defensePicker?.field === section.field && (
                    <div style={{ marginTop: '4px', padding: '8px', background: 'var(--bg-card)', border: `1px solid ${section.border}`, borderRadius: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Damage Types</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                        {DAMAGE_TYPES.map(dt => {
                          const customList = char[section.field] || [];
                          const isActive = customList.includes(dt);
                          const isRacial = section.items.includes(dt) && !isActive;
                          return (
                            <button key={dt}
                              onClick={() => {
                                if (isRacial) return;
                                if (isActive) updateField(section.field, customList.filter(x => x !== dt));
                                else updateField(section.field, [...customList, dt]);
                              }}
                              className="cc-skill"
                              style={{
                                fontSize: '11px', padding: '3px 8px', borderRadius: '4px', cursor: isRacial ? 'default' : 'pointer',
                                background: isActive || isRacial ? section.bg : 'var(--surface)',
                                border: `1px solid ${isActive || isRacial ? section.border : 'var(--border)'}`,
                                color: isActive || isRacial ? section.color : 'var(--text-dim)',
                                opacity: isRacial ? 0.5 : 1,
                              }}
                              title={isRacial ? 'Granted by race/class' : isActive ? 'Click to remove' : 'Click to add'}>
                              {isRacial ? '★ ' : isActive ? '✓ ' : ''}{dt}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conditions</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {CONDITIONS.map(cond => {
                          const customList = char[section.field] || [];
                          const isActive = customList.includes(cond);
                          const isRacial = section.items.includes(cond) && !isActive;
                          return (
                            <button key={cond}
                              onClick={() => {
                                if (isRacial) return;
                                if (isActive) updateField(section.field, customList.filter(x => x !== cond));
                                else updateField(section.field, [...customList, cond]);
                              }}
                              className="cc-skill"
                              style={{
                                fontSize: '11px', padding: '3px 8px', borderRadius: '4px', cursor: isRacial ? 'default' : 'pointer',
                                background: isActive || isRacial ? section.bg : 'var(--surface)',
                                border: `1px solid ${isActive || isRacial ? section.border : 'var(--border)'}`,
                                color: isActive || isRacial ? section.color : 'var(--text-dim)',
                                opacity: isRacial ? 0.5 : 1,
                              }}
                              title={isRacial ? 'Granted by race/class' : isActive ? 'Click to remove' : 'Click to add'}>
                              {isRacial ? '★ ' : isActive ? '✓ ' : ''}{cond}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
        );
      }

      case 'attunement': {
        const maxAttune = 3;
        return wrapWidget(wid,
            <div style={st.sideCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={st.sideLabel}>Attunement</div>
                <span style={{ fontSize: '12px', color: attunedItems.length >= maxAttune ? '#f87171' : 'var(--text-dim)' }}>{attunedItems.length}/{maxAttune}</span>
              </div>
              {attunedItems.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>No attuned items</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {attunedItems.map((item, i) => {
                    const cached = equipCache.current[item];
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '12px', color: cached ? rarityColor(cached.rarity) : 'var(--text)', fontWeight: 500 }}>{item}</span>
                        <button onClick={() => {
                          const newAttuned = attunedItems.filter((_, j) => j !== i);
                          updateField('attunedItems', newAttuned);
                        }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Attune from equipped magic items */}
              {attunedItems.length < maxAttune && (() => {
                const magicEquipped = (char.equippedItems || [])
                  .filter(name => {
                    const c = equipCache.current[name];
                    return c?.magical && !attunedItems.includes(name);
                  });
                if (magicEquipped.length === 0) return null;
                return (
                  <div style={{ marginTop: '6px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px' }}>Attune equipped item:</div>
                    {magicEquipped.map(name => {
                      const c = equipCache.current[name];
                      return (
                        <button key={name} className="cc-skill" onClick={() => updateField('attunedItems', [...attunedItems, name])}
                          style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: '12px', padding: '3px 8px', marginBottom: '2px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', color: rarityColor(c?.rarity), cursor: 'pointer' }}>
                          + {name}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
        );
      }

      case 'carrying': {
        const totalWeight = (char.equipment || []).reduce((sum, name) => {
          const cached = equipCache.current[name];
          if (!cached?.weight) return sum;
          const w = parseFloat(cached.weight);
          return sum + (isNaN(w) ? 0 : w);
        }, 0);
        const pct = Math.min(100, (totalWeight / carryCapacity) * 100);
        const encumbered = totalWeight > carryCapacity;
        const nearLimit = pct > 75;
        return wrapWidget(wid,
            <div style={st.sideCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={st.sideLabel}>Carrying Capacity</div>
                <span style={{ fontSize: '12px', color: encumbered ? '#f87171' : nearLimit ? '#fbbf24' : 'var(--text-dim)', fontWeight: 600 }}>
                  {totalWeight.toFixed(1)} / {carryCapacity} lb.
                </span>
              </div>
              <div style={{ height: '8px', background: 'var(--surface)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{
                  height: '100%', borderRadius: '4px', transition: 'width 0.3s',
                  width: `${Math.max(1, pct)}%`,
                  background: encumbered ? '#f87171' : nearLimit ? '#fbbf24' : 'var(--gold)',
                }} />
              </div>
              {encumbered && (
                <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 600, marginTop: '4px' }}>
                  Encumbered! Speed reduced by 10 ft.
                </div>
              )}
            </div>
        );
      }

      case 'currency': {
        const cur = char.currency || {};
        const coins = [
          { key: 'cp', label: 'CP', color: '#b87333', val: cur.cp || 0 },
          { key: 'sp', label: 'SP', color: '#c0c0c0', val: cur.sp || 0 },
          { key: 'ep', label: 'EP', color: '#8a9a5b', val: cur.ep || 0 },
          { key: 'gp', label: 'GP', color: 'var(--gold)', val: cur.gp ?? char.gold ?? 0 },
          { key: 'pp', label: 'PP', color: '#e5e4e2', val: cur.pp || 0 },
        ];
        // Conversion rates: cp→sp (10:1), sp→gp (10:1), ep→gp (2:1), gp→pp (10:1)
        const conversions = [
          { from: 'cp', to: 'sp', rate: 10, label: '10 CP → 1 SP' },
          { from: 'sp', to: 'cp', rate: 1, gives: 10, label: '1 SP → 10 CP' },
          { from: 'sp', to: 'gp', rate: 10, label: '10 SP → 1 GP' },
          { from: 'gp', to: 'sp', rate: 1, gives: 10, label: '1 GP → 10 SP' },
          { from: 'ep', to: 'gp', rate: 2, label: '2 EP → 1 GP' },
          { from: 'gp', to: 'ep', rate: 1, gives: 2, label: '1 GP → 2 EP' },
          { from: 'gp', to: 'pp', rate: 10, label: '10 GP → 1 PP' },
          { from: 'pp', to: 'gp', rate: 1, gives: 10, label: '1 PP → 10 GP' },
        ];
        const doConvert = (conv) => {
          const c = { ...(char.currency || {}) };
          const fromVal = c[conv.from] || 0;
          if (fromVal < conv.rate) return;
          c[conv.from] = fromVal - conv.rate;
          c[conv.to] = (c[conv.to] || 0) + (conv.gives || 1);
          updateField('currency', c);
        };
        const totalGP = ((cur.cp || 0) / 100) + ((cur.sp || 0) / 10) + ((cur.ep || 0) / 2) + (cur.gp ?? char.gold ?? 0) + ((cur.pp || 0) * 10);
        return wrapWidget(wid,
            <div style={st.sideCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={st.sideLabel}>Currency</div>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Total: <strong style={{ color: 'var(--gold)' }}>{totalGP.toFixed(1)} GP</strong></span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {coins.map(c => (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: c.color }}>{c.label}</span>
                    <NumInput
                      min={0}
                      value={c.val}
                      onChange={v => {
                        updateField('currency', { ...(char.currency || {}), [c.key]: v });
                      }}
                      style={{ width: '52px', textAlign: 'center', padding: '3px 4px', fontSize: '13px', fontWeight: 700, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: c.color }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600 }}>Convert</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {conversions.map(conv => {
                    const fromVal = (char.currency || {})[conv.from] || 0;
                    const canConvert = fromVal >= conv.rate;
                    return (
                      <button key={conv.label} onClick={() => doConvert(conv)} disabled={!canConvert}
                        style={{
                          fontSize: '12px', padding: '3px 7px', borderRadius: '4px', cursor: canConvert ? 'pointer' : 'default',
                          background: canConvert ? 'var(--surface)' : 'transparent',
                          border: `1px solid ${canConvert ? 'var(--border)' : 'var(--surface)'}`,
                          color: canConvert ? 'var(--text)' : 'var(--text-dim)',
                          opacity: canConvert ? 1 : 0.4,
                        }}>
                        {conv.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
        );
      }

      case 'skills':
        return wrapWidget(wid,
            <div style={st.sideCard}>
              <div style={st.sideLabel}>Skills</div>
              {SKILLS.map(skill => <SkillRow key={skill.name} skill={skill} />)}
            </div>
        );

      case 'xp-bar':
        // Only show if leveling method is XP
        if (char.levelingMethod !== 'xp') return null;
        {
          const currentXp = char.experiencePoints || 0;
          const currentLevelXp = xpForLevel(char.level || 1);
          const nextLevelXp = (char.level || 1) < 20 ? xpForLevel((char.level || 1) + 1) : xpForLevel(20);
          const progress = nextLevelXp > currentLevelXp ? Math.min(100, ((currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100) : 100;
          const readyToLevel = currentXp >= nextLevelXp && (char.level || 1) < 20;
          return wrapWidget(wid,
              <div style={{ background: 'var(--bg-card)', border: `1px solid ${readyToLevel ? 'var(--gold)' : 'var(--border)'}`, borderRadius: '8px', padding: '14px 16px', boxShadow: readyToLevel ? '0 0 12px rgba(201,162,39,0.2)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-dim)', fontWeight: 600 }}>Experience Points</span>
                  <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--gold)' }}>
                    Level {char.level || 1}
                  </span>
                </div>

                {/* XP Progress Bar */}
                <div style={{ position: 'relative', height: '18px', background: 'var(--surface)', borderRadius: '9px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '10px' }}>
                  <div style={{
                    height: '100%', borderRadius: '9px', transition: 'width 0.4s ease',
                    background: readyToLevel ? 'linear-gradient(90deg, var(--gold), #e6cc80)' : 'linear-gradient(90deg, #5a4a1a, var(--gold))',
                    width: `${Math.max(2, progress)}%`,
                  }} />
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text)', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                    {currentXp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP
                  </span>
                </div>

                {/* Ready to level up notice + button */}
                {readyToLevel && (
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600, marginBottom: '6px', animation: 'pulse 2s infinite' }}>
                      Ready to level up!
                    </div>
                    <button className="btn" style={{ padding: '6px 20px', fontSize: '13px', background: 'linear-gradient(135deg, #1a3a1a, #2a5a2a)', border: '1px solid #4ade80', color: '#4ade80', fontWeight: 700 }}
                      onClick={async () => {
                        const newLevel = (char.level || 1) + 1;
                        const hd = HIT_DICE[char.class] || 'd8';
                        const dieMax = parseInt(hd.replace('d', ''));
                        const conMod = modVal(scores.constitution ?? 10);
                        const avg = Math.floor(dieMax / 2) + 1;
                        const useAvg = confirm(`Level up to ${newLevel}!\n\nHP increase: ${hd} (avg ${avg}) + ${conMod} CON mod = ${avg + conMod}\n\nOK = Take average (${avg + conMod} HP)\nCancel = Roll ${hd}`);
                        let hpGain;
                        if (useAvg) {
                          hpGain = avg + conMod;
                        } else {
                          const { total } = await rollDice3D(hd);
                          hpGain = Math.max(1, total + conMod);
                          logRoll('Level Up HP', hd, total, 'Level Up');
                        }
                        const newMaxHp = (char.maxHp || 0) + hpGain;
                        const newPB = newLevel <= 4 ? 2 : newLevel <= 8 ? 3 : newLevel <= 12 ? 4 : newLevel <= 16 ? 5 : 6;
                        updateChar(prev => ({
                          ...prev,
                          level: newLevel,
                          maxHp: newMaxHp,
                          currentHp: newMaxHp,
                          hitDice: `${newLevel}${hd}`,
                          hitDiceRemaining: newLevel,
                          proficiencyBonus: newPB,
                        }));
                      }}>
                      Level Up to {(char.level || 1) + 1}
                    </button>
                  </div>
                )}

                {/* Add/Remove XP controls */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="number" min={0} placeholder="XP"
                    value={xpDelta} onChange={e => setXpDelta(e.target.value)}
                    style={{ width: '80px', textAlign: 'center', padding: '5px 6px', fontSize: '13px' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const d = parseInt(xpDelta) || 0;
                        if (d > 0) { updateField('experiencePoints', currentXp + d); setXpDelta(''); }
                      }
                    }}
                  />
                  <button className="btn" style={{ padding: '5px 14px', fontSize: '12px', background: '#1a3a1a', border: '1px solid #2a6a2a', color: '#4ade80' }}
                    onClick={() => { const d = parseInt(xpDelta) || 0; if (d > 0) { updateField('experiencePoints', currentXp + d); setXpDelta(''); } }}>
                    + Add
                  </button>
                  <button className="btn" style={{ padding: '5px 14px', fontSize: '12px', background: '#3a1a1a', border: '1px solid #6a2a2a', color: '#f87171' }}
                    onClick={() => { const d = parseInt(xpDelta) || 0; if (d > 0) { updateField('experiencePoints', Math.max(0, currentXp - d)); setXpDelta(''); } }}>
                    - Remove
                  </button>
                </div>

                {/* Level thresholds hint */}
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Lv {char.level}: {currentLevelXp.toLocaleString()}</span>
                  {(char.level || 1) < 20 && <span>Lv {(char.level || 1) + 1}: {nextLevelXp.toLocaleString()}</span>}
                </div>
              </div>
          );
        }

      case 'hp-section':
        return wrapWidget(wid,
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'stretch', flexWrap: 'wrap' }}>
              {/* AC Box */}
              <div style={{ ...st.combatBox, minWidth: '90px' }}>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '1px', fontWeight: 600 }}>Armor</span>
                <span style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1 }}>{char.armorClass}</span>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '1px' }}>Class</span>
              </div>

              {/* HP */}
              <div style={{ flex: 1, minWidth: '260px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-dim)', fontWeight: 600 }}>Hit Points</span>
                  <span style={{ fontWeight: 700, fontSize: '18px', color: hpColor(char.currentHp, char.maxHp) }}>
                    {char.currentHp} <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '14px' }}>/</span> {char.maxHp}
                    {char.temporaryHp > 0 && <span style={{ color: '#60b0e0', fontSize: '13px', fontWeight: 400 }}> +{char.temporaryHp}</span>}
                  </span>
                </div>
                <div className="hp-bar-wrap" style={{ height: '10px', marginBottom: '10px' }}>
                  <div className="hp-bar-fill" style={{
                    width: `${Math.max(0, (char.currentHp / char.maxHp) * 100)}%`,
                    background: hpColor(char.currentHp, char.maxHp),
                  }} />
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="number" min={0} placeholder="0"
                    value={hpDelta} onChange={e => setHpDelta(e.target.value)}
                    style={{ width: '56px', textAlign: 'center', padding: '4px 6px', fontSize: '13px' }}
                    onKeyDown={e => { if (e.key === 'Enter') applyHp(1); }}
                  />
                  <button className="btn btn-danger" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => applyHp(-1)}>Damage</button>
                  <button className="btn" style={{ padding: '4px 12px', fontSize: '12px', background: 'var(--green)', color: 'var(--text)' }} onClick={() => applyHp(1)}>Heal</button>
                </div>
              </div>

              {/* Death Saves */}
              <div style={{ ...st.combatBox, minWidth: '160px', justifyContent: 'center', gap: '8px', padding: '12px 16px' }}>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '1px', fontWeight: 600 }}>Death Saves</span>
                {/* Successes */}
                {(() => {
                  const successes = char.deathSaveSuccesses || 0;
                  return (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button onClick={() => { if (successes <= 0) return; updateField('deathSaveSuccesses', successes - 1); }}
                        className="cc-skill"
                        style={{ width: '24px', height: '24px', borderRadius: '6px', cursor: successes > 0 ? 'pointer' : 'default', background: successes > 0 ? '#3a1a1a' : 'var(--surface)', border: `1px solid ${successes > 0 ? '#6a2a2a' : 'var(--border)'}`, color: successes > 0 ? '#f87171' : 'var(--text-dim)', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: successes > 0 ? 1 : 0.3, padding: 0 }}
                        title="Remove success">−</button>
                      {[1, 2, 3].map(n => (
                        <span key={`s${n}`} style={{
                          width: '16px', height: '16px', borderRadius: '50%',
                          background: n <= successes ? '#4ade80' : 'transparent',
                          border: `2px solid ${n <= successes ? '#4ade80' : '#4a6a4a'}`,
                          transition: 'all 0.15s',
                          boxShadow: n <= successes ? '0 0 6px rgba(74,222,128,0.4)' : 'none',
                        }} />
                      ))}
                      <button onClick={() => { if (successes >= 3) return; updateField('deathSaveSuccesses', successes + 1); }}
                        className="cc-skill"
                        style={{ width: '24px', height: '24px', borderRadius: '6px', cursor: successes < 3 ? 'pointer' : 'default', background: successes < 3 ? '#1a3a1a' : 'var(--surface)', border: `1px solid ${successes < 3 ? '#2a6a2a' : 'var(--border)'}`, color: successes < 3 ? '#4ade80' : 'var(--text-dim)', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: successes < 3 ? 1 : 0.3, padding: 0 }}
                        title="Add success">+</button>
                      <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600, minWidth: '12px' }}>S</span>
                    </div>
                  );
                })()}
                {/* Failures */}
                {(() => {
                  const failures = char.deathSaveFailures || 0;
                  return (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button onClick={() => { if (failures <= 0) return; updateField('deathSaveFailures', failures - 1); }}
                        className="cc-skill"
                        style={{ width: '24px', height: '24px', borderRadius: '6px', cursor: failures > 0 ? 'pointer' : 'default', background: failures > 0 ? '#1a3a1a' : 'var(--surface)', border: `1px solid ${failures > 0 ? '#2a6a2a' : 'var(--border)'}`, color: failures > 0 ? '#4ade80' : 'var(--text-dim)', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: failures > 0 ? 1 : 0.3, padding: 0 }}
                        title="Remove failure">−</button>
                      {[1, 2, 3].map(n => (
                        <span key={`f${n}`} style={{
                          width: '16px', height: '16px', borderRadius: '50%',
                          background: n <= failures ? '#f87171' : 'transparent',
                          border: `2px solid ${n <= failures ? '#f87171' : '#6a4a4a'}`,
                          transition: 'all 0.15s',
                          boxShadow: n <= failures ? '0 0 6px rgba(248,113,113,0.4)' : 'none',
                        }} />
                      ))}
                      <button onClick={() => { if (failures >= 3) return; updateField('deathSaveFailures', failures + 1); }}
                        className="cc-skill"
                        style={{ width: '24px', height: '24px', borderRadius: '6px', cursor: failures < 3 ? 'pointer' : 'default', background: failures < 3 ? '#3a1a1a' : 'var(--surface)', border: `1px solid ${failures < 3 ? '#6a2a2a' : 'var(--border)'}`, color: failures < 3 ? '#f87171' : 'var(--text-dim)', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: failures < 3 ? 1 : 0.3, padding: 0 }}
                        title="Add failure">+</button>
                      <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 600, minWidth: '12px' }}>F</span>
                    </div>
                  );
                })()}
                {/* Reset button */}
                {((char.deathSaveSuccesses || 0) > 0 || (char.deathSaveFailures || 0) > 0) && (
                  <button
                    onClick={() => updateChar(prev => ({ ...prev, deathSaveSuccesses: 0, deathSaveFailures: 0 }))}
                    style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', padding: '2px 10px' }}>
                    Reset
                  </button>
                )}
              </div>

              {/* Hit Dice */}
              <div style={{ ...st.combatBox, minWidth: '80px', justifyContent: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '1px', fontWeight: 600 }}>Hit Dice</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gold)' }}>{char.hitDiceRemaining ?? char.level}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{char.hitDice || HIT_DICE[char.class] || 'd8'}</span>
              </div>
            </div>

        );

      case 'tabs-section':
        return wrapWidget(wid,
          <>
            <div style={st.tabBar}>
              {tabs.map(t => (
                <button key={t} onClick={() => { setActiveTab(t); localStorage.setItem(`ond-tab-${id}`, t); }} style={st.tab(activeTab === t)}>
                  {t === 'features' ? 'Features & Traits' : t}
                </button>
              ))}
            </div>
            {activeTab === 'actions' && renderActionsTab()}
            {activeTab === 'spells' && renderSpellsTab()}
            {activeTab === 'inventory' && renderInventoryTab()}
            {activeTab === 'features' && renderFeaturesTab()}
            {activeTab === 'progression' && renderProgressionTab()}
            {activeTab === 'background' && renderBackgroundTab()}
            {activeTab === 'notes' && renderNotesTab()}
          </>
        );

      default: return null;
    }
  };

  // ─── Tab renderers ──────────────────────────────────
  const renderActionsTab = () => {
    const spellMod = modVal(scores[char.spellcastingAbility] ?? scores.intelligence ?? 10);
    const attackSpells = spellData.filter(sp => sp.damage || sp.attackType || sp.savingThrow);
    const strMod = modVal(scores.strength ?? 10);

    // Equipped weapons from cache
    const equippedWeapons = (char.equippedItems || [])
      .map(name => equipCache.current[name])
      .filter(item => item && item.category === 'weapon');

    const actionHeader = (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: '0', fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', padding: '4px 10px', letterSpacing: '0.5px', borderBottom: '1px solid var(--border)' }}>
        <span>Attack</span><span>Range</span><span>Hit</span><span>Damage</span>
      </div>
    );

    return (
      <div>
        {/* ── Weapon Attacks ── */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--gold)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Cinzel, serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Weapon Attacks
            {hasAttackDisadvantage && <span style={{ fontSize: '10px', color: '#f87171', padding: '1px 6px', borderRadius: '3px', background: '#3a1a1a', border: '1px solid #6a2a2a', textTransform: 'none', letterSpacing: 0 }}>Disadvantage</span>}
            {hasAttackAdvantage && <span style={{ fontSize: '10px', color: '#4ade80', padding: '1px 6px', borderRadius: '3px', background: '#1a3a1a', border: '1px solid #2a6a2a', textTransform: 'none', letterSpacing: 0 }}>Advantage</span>}
          </div>
          {actionHeader}

          {equippedWeapons.map((wpn, i) => {
            const isFinesse = wpn.properties?.some(p => p.toLowerCase().includes('finesse'));
            const isRanged = (wpn.subcategory || '').toLowerCase().includes('ranged');
            const needsAmmo = wpn.properties?.some(p => p.toLowerCase().includes('ammunition'));
            const rangeText = wpn.properties?.find(p => p.toLowerCase().includes('range') || p.toLowerCase().includes('thrown'))
              || (isRanged ? '80/320 ft.' : '5 ft.');

            // Find EQUIPPED ammo items compatible with this weapon
            const wpnLow = wpn.name.toLowerCase();
            const equippedAmmo = needsAmmo ? (char.equippedItems || []).filter(name => {
              const low = name.toLowerCase();
              const isAmmoItem = low.includes('arrow') || low.includes('bolt') || low.includes('bullet') || low.includes('needle');
              if (!isAmmoItem) return false;
              if (wpnLow.includes('crossbow')) return low.includes('bolt');
              if (wpnLow.includes('sling')) return low.includes('bullet');
              return low.includes('arrow');
            }) : [];
            // Selected ammo for this weapon (or first equipped)
            const selectedAmmo = (char.ammo?.selected?.[wpn.name]) || equippedAmmo[0] || null;
            const ammoCount = selectedAmmo ? (char.ammo?.[selectedAmmo] ?? defaultAmmoCount(selectedAmmo)) : 0;
            // Ammo bonus (from +1/+2/+3 magical ammo)
            const ammoCached = selectedAmmo ? equipCache.current[selectedAmmo] : null;
            const ammoBonus = ammoCached?.bonus || 0;

            // Calculate hit/damage with weapon + ammo bonuses
            const abilityMod = isRanged ? dexMod : (isFinesse ? Math.max(strMod, dexMod) : strMod);
            const hitBonus = abilityMod + profBonus + (wpn.bonus || 0) + ammoBonus;
            const dmgBonus = abilityMod + (wpn.bonus || 0) + ammoBonus;
            const dmgFormula = wpn.damage ? `${wpn.damage}+${dmgBonus}` : null;

            const useAmmo = () => {
              if (!needsAmmo || char.trackAmmo === false || !selectedAmmo) return;
              const current = char.ammo?.[selectedAmmo] ?? defaultAmmoCount(selectedAmmo);
              if (current <= 0) return;
              const newCount = current - 1;
              const newAmmo = { ...(char.ammo || {}), [selectedAmmo]: newCount };
              if (newCount <= 0) {
                // Remove empty ammo from equipment and equipped
                const newEquip = (char.equipment || []).filter(n => n !== selectedAmmo);
                const newEquipped = (char.equippedItems || []).filter(n => n !== selectedAmmo);
                updateChar(prev => ({ ...prev, ammo: newAmmo, equipment: newEquip, equippedItems: newEquipped }));
              } else {
                updateField('ammo', newAmmo);
              }
            };

            const selectAmmoForWeapon = (e, ammoName) => {
              e.stopPropagation();
              updateField('ammo', { ...(char.ammo || {}), selected: { ...(char.ammo?.selected || {}), [wpn.name]: ammoName } });
            };

            return (
              <div key={`wpn-${i}`} className="cc-skill"
                onClick={() => openItemPanel(wpn)}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: '0',
                  padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid var(--surface)',
                  fontSize: '13px', alignItems: 'center',
                }}>
                <div>
                  <div style={{ fontWeight: 500, color: wpn.rarity && wpn.rarity !== 'common' ? rarityColor(wpn.rarity) : undefined }}>{wpn.name}{wpn.bonus ? ` +${wpn.bonus}` : ''}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>{wpn.subcategory || 'Weapon'}</span>
                    {needsAmmo && char.trackAmmo !== false && (
                      equippedAmmo.length > 0 ? (
                        equippedAmmo.length > 1 ? (
                          <select
                            value={selectedAmmo || ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => selectAmmoForWeapon(e, e.target.value)}
                            style={{ fontSize: '11px', padding: '1px 4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text)', maxWidth: '140px' }}>
                            {equippedAmmo.map(a => (
                              <option key={a} value={a}>{a} ({char.ammo?.[a] ?? defaultAmmoCount(a)})</option>
                            ))}
                          </select>
                        ) : (() => {
                          const ammoCached = equipCache.current[selectedAmmo];
                          const ammoRarity = ammoCached?.rarity && ammoCached.rarity !== 'common' ? ammoCached.rarity : null;
                          return (
                            <span style={{
                              color: ammoCount <= 0 ? '#f87171' : ammoCount <= 5 ? '#fbbf24' : (ammoRarity ? rarityColor(ammoRarity) : 'var(--text-dim)'),
                              fontWeight: 600,
                            }}>
                              {selectedAmmo}: {ammoCount}
                            </span>
                          );
                        })()
                      ) : (
                        <span style={{ color: '#f87171', fontSize: '11px', fontStyle: 'italic' }}>No ammo equipped</span>
                      )
                    )}
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{rangeText}</span>
                <span style={{ fontSize: '12px' }}>
                  <RollBtn label={`${wpn.name} Attack`} formula={`1d20+${hitBonus}`} onRoll={useAmmo}>
                    +{hitBonus}
                  </RollBtn>
                </span>
                <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {dmgFormula && (
                    <RollBtn label={`${wpn.name} Damage`} formula={dmgFormula} type="damage">
                      {wpn.damage}+{dmgBonus}
                    </RollBtn>
                  )}
                  {wpn.damageType && <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{wpn.damageType}</span>}
                </span>
              </div>
            );
          })}

          {/* Unarmed Strike */}
          <div className="cc-skill" style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: '0',
            padding: '8px 10px', borderBottom: '1px solid var(--surface)',
            fontSize: '13px', alignItems: 'center', cursor: 'pointer',
          }}
            onClick={() => setSidePanel({ type: 'action', data: {
              name: 'Unarmed Strike',
              actionType: '1 Action',
              attackType: 'Melee Attack',
              toHit: strMod + profBonus,
              damage: char?.class === 'Monk' ? `${char.level >= 17 ? '1d10' : char.level >= 11 ? '1d8' : char.level >= 5 ? '1d6' : '1d4'}+${strMod}` : `1+${strMod}`,
              damageType: 'Bludgeoning',
              stat: 'STR',
              range: '5ft. Reach',
              proficient: true,
              description: `Instead of using a weapon to make a melee attack, you can use a punch, kick, head-butt, or similar forceful blow. In game terms, this is an Unarmed Strike—a melee attack that involves you using your body to damage, grapple, or shove a target within 5 feet of you.\n\nWhenever you use your Unarmed Strike, choose one of the following options for its effect.\n\nDamage. You make an attack roll against the target. Your bonus to the roll equals your Strength modifier plus your Proficiency Bonus. On a hit, the target takes Bludgeoning damage equal to 1 plus your Strength modifier.\n\nGrapple. The target must succeed on a Strength or Dexterity saving throw (it chooses which), or it has the Grappled condition. The DC for the saving throw and any escape attempts equals 8 plus your Strength modifier and Proficiency Bonus. This grapple is possible only if the target is no more than one size larger than you and if you have a hand free to grab it.\n\nShove. The target must succeed on a Strength or Dexterity saving throw (it chooses which), or you either push it 5 feet away or cause it to have the Prone condition. The DC for the saving throw equals 8 plus your Strength modifier and Proficiency Bonus. This shove is possible only if the target is no more than one size larger than you.`,
            }})}
          >
            <div>
              <div style={{ fontWeight: 500 }}>Unarmed Strike</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Melee Attack</div>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>5 ft.</span>
            <span style={{ fontSize: '12px' }}>
              <RollBtn label="Unarmed Strike Attack" formula={`1d20+${strMod + profBonus}`}>
                +{strMod + profBonus}
              </RollBtn>
            </span>
            <span style={{ fontSize: '12px' }}>
              <RollBtn label="Unarmed Strike Damage" formula={char?.class === 'Monk' ? `${char.level >= 17 ? '1d10' : char.level >= 11 ? '1d8' : char.level >= 5 ? '1d6' : '1d4'}+${strMod}` : `1d1+${strMod}`}>
                {char?.class === 'Monk' ? `${char.level >= 17 ? '1d10' : char.level >= 11 ? '1d8' : char.level >= 5 ? '1d6' : '1d4'}` : '1'} + {strMod}
              </RollBtn>
              {' '}<span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>bludg.</span>
            </span>
          </div>

          {equippedWeapons.length === 0 && (
            <div style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
              Equip weapons in the Inventory tab to see them here.
            </div>
          )}
        </div>

        {/* ── Spell Attacks ── */}
        {attackSpells.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--gold)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Cinzel, serif' }}>
              Spell Attacks
            </div>
            {actionHeader}
            {attackSpells.map(sp => {
              const hitBonus = sp.attackType ? spellMod + profBonus : null;
              const saveDC = sp.savingThrow ? 8 + spellMod + profBonus : null;
              const canUpcast = sp.level > 0 && sp.damage && sp.scaling;
              const castLevel = upcastLevels[sp.name] || sp.level;
              const effectiveDamage = canUpcast ? getUpcastDamage(sp, castLevel) : sp.damage;
              // Max spell slot level available
              const maxSlot = spellSlotData?.pact ? spellSlotData.level : (spellSlotData ? spellSlotData.reduce((max, total, i) => total > 0 ? i + 1 : max, 0) : 9);
              return (
                <div key={sp._id} className="cc-skill"
                  onClick={() => openSpellPanel(sp)}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: '0',
                    padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid var(--surface)',
                    fontSize: '13px', alignItems: 'center',
                  }}>
                  <div>
                    <div style={{ fontWeight: 500, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {sp.name}
                      {canUpcast && (
                        <select value={castLevel} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); setUpcast(sp.name, parseInt(e.target.value)); }}
                          style={{ padding: '1px 4px', fontSize: '11px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: castLevel > sp.level ? '#4ade80' : 'var(--text-dim)', cursor: 'pointer', fontWeight: 600 }}>
                          {Array.from({ length: maxSlot - sp.level + 1 }, (_, i) => sp.level + i).map(lvl => (
                            <option key={lvl} value={lvl}>{lvl === sp.level ? `Lv${lvl}` : `Lv${lvl} ↑`}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                      {sp.source === 'race' ? `Racial · ${sp.sourceRace}` : `${sp.level === 0 ? 'Cantrip' : `Level ${sp.level}`} · ${sp.school}`}
                      {canUpcast && castLevel > sp.level && <span style={{ color: '#4ade80', marginLeft: '4px' }}>→ Lv{castLevel}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{sp.range}</span>
                  <span style={{ fontSize: '12px' }}>
                    {hitBonus !== null && (
                      <RollBtn label={`${sp.name} Attack`} formula={`1d20+${hitBonus}`}>
                        +{hitBonus}
                      </RollBtn>
                    )}
                    {saveDC !== null && <span style={{ color: 'var(--gold)' }}>DC {saveDC}</span>}
                    {hitBonus === null && saveDC === null && <span style={{ color: 'var(--text-dim)' }}>—</span>}
                  </span>
                  <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {effectiveDamage && (
                      <RollBtn label={`${sp.name} Damage${castLevel > sp.level ? ` (Lv${castLevel})` : ''}`} formula={effectiveDamage} type="damage">
                        {effectiveDamage}
                      </RollBtn>
                    )}
                    {sp.damageType && <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{sp.damageType}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSpellsTab = () => {
    // Spell save DC & spell attack bonus
    const castAbility = char.spellcastingAbility || '';
    const castMod = castAbility ? modVal(scores[castAbility] ?? 10) : 0;
    const spellSaveDC = castAbility ? 8 + profBonus + castMod : null;
    const spellAttackBonus = castAbility ? profBonus + castMod : null;

    return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
        {/* Spell Save DC & Attack Bonus */}
        {spellSaveDC && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>Spell Save DC</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gold)' }}>{spellSaveDC}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>Spell Attack</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gold)' }}>+{spellAttackBonus}</span>
            </div>
          </div>
        )}
        <div onClick={() => { const next = !useLocalData; setUseLocalData(next); localStorage.setItem('ond-data-source', next ? 'local' : 'db'); }}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '10px' }}>
          <div style={{ width: '24px', height: '12px', borderRadius: '6px', position: 'relative', background: useLocalData ? 'var(--gold)' : '#4ade80', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: '2px', left: useLocalData ? '12px' : '2px', width: '8px', height: '8px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
          </div>
          <span style={{ color: useLocalData ? 'var(--gold)' : '#4ade80', fontWeight: 600 }}>{useLocalData ? 'Local' : 'Database'}</span>
        </div>
      </div>

      {/* ── Spell Slots ── */}
      {spellSlotData && !spellSlotData.pact && (
        <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>Spell Slots</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {spellSlotData.map((total, i) => {
              if (total === 0) return null;
              const lvl = i + 1;
              const used = usedSlots[String(lvl)] || 0;
              const remaining = total - used;
              return (
                <div key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, minWidth: '28px' }}>{lvl}{lvl === 1 ? 'st' : lvl === 2 ? 'nd' : lvl === 3 ? 'rd' : 'th'}</span>
                  <button onClick={() => {
                    if (remaining <= 0) return;
                    const newUsed = { ...(char.usedSpellSlots || {}) };
                    newUsed[String(lvl)] = used + 1;
                    updateField('usedSpellSlots', newUsed);
                  }}
                    className="cc-skill"
                    style={{ width: '28px', height: '28px', borderRadius: '6px', cursor: remaining > 0 ? 'pointer' : 'default', background: remaining > 0 ? '#3a1a1a' : 'var(--surface)', border: `1px solid ${remaining > 0 ? '#6a2a2a' : 'var(--border)'}`, color: remaining > 0 ? '#f87171' : 'var(--text-dim)', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: remaining > 0 ? 1 : 0.3 }}
                    title="Use a spell slot">−</button>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {Array.from({ length: total }, (_, s) => (
                      <span key={s} style={{
                        width: '14px', height: '14px', borderRadius: '50%',
                        background: s < remaining ? 'var(--gold)' : 'transparent',
                        border: `2px solid ${s < remaining ? 'var(--gold)' : 'var(--border)'}`,
                        transition: 'all 0.15s',
                        boxShadow: s < remaining ? '0 0 4px rgba(201,162,39,0.3)' : 'none',
                      }} />
                    ))}
                  </div>
                  <button onClick={() => {
                    if (used <= 0) return;
                    const newUsed = { ...(char.usedSpellSlots || {}) };
                    newUsed[String(lvl)] = used - 1;
                    updateField('usedSpellSlots', newUsed);
                  }}
                    className="cc-skill"
                    style={{ width: '28px', height: '28px', borderRadius: '6px', cursor: used > 0 ? 'pointer' : 'default', background: used > 0 ? '#1a3a1a' : 'var(--surface)', border: `1px solid ${used > 0 ? '#2a6a2a' : 'var(--border)'}`, color: used > 0 ? '#4ade80' : 'var(--text-dim)', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: used > 0 ? 1 : 0.3 }}
                    title="Restore a spell slot">+</button>
                  <span style={{ fontSize: '12px', color: remaining > 0 ? 'var(--gold)' : 'var(--text-dim)', fontWeight: 600, minWidth: '30px', textAlign: 'center' }}>{remaining}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Warlock Pact Magic Slots */}
      {spellSlotData?.pact && (
        <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>
            Pact Magic Slots <span style={{ color: 'var(--gold)', fontSize: '11px' }}>(Level {spellSlotData.level})</span>
          </div>
          {(() => {
            const pactUsed = usedSlots['pact'] || 0;
            const pactRemaining = spellSlotData.slots - pactUsed;
            return (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => {
                  if (pactRemaining <= 0) return;
                  const newUsed = { ...(char.usedSpellSlots || {}) };
                  newUsed.pact = pactUsed + 1;
                  updateField('usedSpellSlots', newUsed);
                }}
                  className="cc-skill"
                  style={{ width: '28px', height: '28px', borderRadius: '6px', cursor: pactRemaining > 0 ? 'pointer' : 'default', background: pactRemaining > 0 ? '#3a1a1a' : 'var(--surface)', border: `1px solid ${pactRemaining > 0 ? '#6a2a2a' : 'var(--border)'}`, color: pactRemaining > 0 ? '#f87171' : 'var(--text-dim)', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pactRemaining > 0 ? 1 : 0.3 }}
                  title="Use a pact slot">−</button>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {Array.from({ length: spellSlotData.slots }, (_, s) => (
                    <span key={s} style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: s < pactRemaining ? '#a335ee' : 'transparent',
                      border: `2px solid ${s < pactRemaining ? '#a335ee' : 'var(--border)'}`,
                      transition: 'all 0.15s',
                      boxShadow: s < pactRemaining ? '0 0 6px rgba(163,53,238,0.4)' : 'none',
                    }} />
                  ))}
                </div>
                <button onClick={() => {
                  if (pactUsed <= 0) return;
                  const newUsed = { ...(char.usedSpellSlots || {}) };
                  newUsed.pact = pactUsed - 1;
                  updateField('usedSpellSlots', newUsed);
                }}
                  className="cc-skill"
                  style={{ width: '28px', height: '28px', borderRadius: '6px', cursor: pactUsed > 0 ? 'pointer' : 'default', background: pactUsed > 0 ? '#2a1a3a' : 'var(--surface)', border: `1px solid ${pactUsed > 0 ? '#6a3a8a' : 'var(--border)'}`, color: pactUsed > 0 ? '#a335ee' : 'var(--text-dim)', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pactUsed > 0 ? 1 : 0.3 }}
                  title="Restore a pact slot">+</button>
                <span style={{ fontSize: '12px', color: '#a335ee', fontWeight: 600 }}>{pactRemaining}/{spellSlotData.slots}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>(Short rest recovery)</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Manage Prepared Spells ── */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{(char.preparedSpells || []).length} spells prepared</span>
        <button onClick={() => setShowSpellBrowser(!showSpellBrowser)}
          className="cc-skill"
          style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '6px', background: showSpellBrowser ? 'var(--gold)' : 'var(--surface)', border: `1px solid ${showSpellBrowser ? 'var(--gold)' : 'var(--border)'}`, color: showSpellBrowser ? 'var(--bg-dark)' : 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>
          {showSpellBrowser ? '▴ Close' : '+ Add / Remove Spells'}
        </button>
      </div>

      {showSpellBrowser && (
        <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={spellBrowserSearch}
              onChange={e => setSpellBrowserSearch(e.target.value)}
              placeholder="Search spells..."
              style={{ flex: 1, padding: '6px 10px', fontSize: '13px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
            />
            <select value={spellBrowserLevel} onChange={e => setSpellBrowserLevel(e.target.value)}
              style={{ padding: '6px 8px', fontSize: '13px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}>
              <option value="">All Levels</option>
              <option value="0">Cantrips</option>
              {[1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>Level {l}</option>)}
            </select>
          </div>
          {spellBrowserResults.length > 0 ? (
            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {spellBrowserResults.map(sp => {
                const isPrepared = (char.preparedSpells || []).includes(sp.name);
                return (
                  <div key={sp.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px', borderRadius: '4px', background: isPrepared ? 'rgba(201,162,39,0.1)' : 'transparent', border: `1px solid ${isPrepared ? 'var(--gold-dim)' : 'transparent'}` }}>
                    <button
                      onClick={() => {
                        const current = char.preparedSpells || [];
                        if (isPrepared) updateField('preparedSpells', current.filter(n => n !== sp.name));
                        else updateField('preparedSpells', [...current, sp.name]);
                      }}
                      style={{ width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, background: isPrepared ? 'var(--gold)' : 'var(--surface)', border: `1px solid ${isPrepared ? 'var(--gold)' : 'var(--border)'}`, color: isPrepared ? 'var(--bg-dark)' : 'var(--text-dim)', padding: 0 }}>
                      {isPrepared ? '✓' : '+'}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: isPrepared ? 'var(--gold)' : 'var(--text)' }}>{sp.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{sp.level === 0 ? 'Cantrip' : `Level ${sp.level}`} · {sp.school}{sp.concentration ? ' · C' : ''}{sp.ritual ? ' · R' : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (spellBrowserSearch || spellBrowserLevel !== '') ? (
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '12px' }}>No spells found</div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '12px' }}>Search or select a level to browse spells</div>
          )}
        </div>
      )}

      {loadingSpells ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>Loading spells...</div>
      ) : spellData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)', fontSize: '13px' }}>No spells prepared. Click "+ Add / Remove Spells" above to prepare spells.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {racialAbilities.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#b07ee0', marginBottom: '8px', fontFamily: 'Cinzel, serif' }}>Racial Abilities</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {racialAbilities.map(sp => <SpellCard key={sp._id} spell={sp} onClick={openSpellPanel} />)}
              </div>
            </div>
          )}
          {cantrips.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--gold)', marginBottom: '8px', fontFamily: 'Cinzel, serif' }}>Cantrips</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {cantrips.map(sp => <SpellCard key={sp._id} spell={sp} onClick={openSpellPanel} />)}
              </div>
            </div>
          )}
          {Array.from({ length: 9 }, (_, i) => i + 1).map(lvl => {
            const atLevel = spellData.filter(sp => sp.level === lvl && sp.source !== 'race');
            if (atLevel.length === 0) return null;
            return (
              <div key={lvl}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--gold)', fontFamily: 'Cinzel, serif' }}>Level {lvl}</span>
                  {/* Inline slot indicators per level */}
                  {spellSlotData && !spellSlotData.pact && spellSlotData[lvl - 1] > 0 && (() => {
                    const slotTotal = spellSlotData[lvl - 1];
                    const slotUsed = usedSlots[String(lvl)] || 0;
                    const slotRemaining = slotTotal - slotUsed;
                    return (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button onClick={(e) => { e.stopPropagation(); if (slotRemaining <= 0) return; const n = { ...(char.usedSpellSlots || {}) }; n[String(lvl)] = slotUsed + 1; updateField('usedSpellSlots', n); }}
                        className="cc-skill" style={{ width: '22px', height: '22px', borderRadius: '4px', cursor: slotRemaining > 0 ? 'pointer' : 'default', background: slotRemaining > 0 ? '#3a1a1a' : 'var(--surface)', border: `1px solid ${slotRemaining > 0 ? '#6a2a2a' : 'var(--border)'}`, color: slotRemaining > 0 ? '#f87171' : 'var(--text-dim)', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: slotRemaining > 0 ? 1 : 0.3, padding: 0 }}
                        title="Use slot">−</button>
                      {Array.from({ length: slotTotal }, (_, s) => (
                          <span key={s} style={{
                              width: '12px', height: '12px', borderRadius: '50%',
                              background: s < slotRemaining ? 'var(--gold)' : 'transparent',
                              border: `2px solid ${s < slotRemaining ? 'var(--gold)' : 'var(--border)'}`,
                              transition: 'all 0.15s',
                            }} />
                        ))}
                      <button onClick={(e) => { e.stopPropagation(); if (slotUsed <= 0) return; const n = { ...(char.usedSpellSlots || {}) }; n[String(lvl)] = slotUsed - 1; updateField('usedSpellSlots', n); }}
                        className="cc-skill" style={{ width: '22px', height: '22px', borderRadius: '4px', cursor: slotUsed > 0 ? 'pointer' : 'default', background: slotUsed > 0 ? '#1a3a1a' : 'var(--surface)', border: `1px solid ${slotUsed > 0 ? '#2a6a2a' : 'var(--border)'}`, color: slotUsed > 0 ? '#4ade80' : 'var(--text-dim)', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: slotUsed > 0 ? 1 : 0.3, padding: 0 }}
                        title="Restore slot">+</button>
                      <span style={{ fontSize: '11px', color: slotRemaining > 0 ? 'var(--gold)' : 'var(--text-dim)', fontWeight: 600 }}>{slotRemaining}/{slotTotal}</span>
                    </div>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {atLevel.map(sp => <SpellCard key={sp._id} spell={sp} onClick={openSpellPanel} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    );
  };

  const renderInventoryTab = () => {
    // Calculate total weight from cached equipment data
    const totalWeight = (char.equipment || []).reduce((sum, name) => {
      const cached = equipCache.current[name];
      if (!cached?.weight) return sum;
      const w = parseFloat(cached.weight);
      return sum + (isNaN(w) ? 0 : w);
    }, 0);

    return (
    <div>
      {char.equipment?.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', fontWeight: 600 }}>
              {char.equipment.length} Item{char.equipment.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Total Weight: <strong style={{ color: 'var(--text)' }}>{totalWeight > 0 ? `${totalWeight} lb.` : '—'}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '14px' }}>
            {char.equipment.map((item, i) => {
              const isEquipped = char.equippedItems?.includes(item);
              const cached = equipCache.current[item];
              const isWeapon = cached?.category === 'weapon';
              const isArmor = cached?.category === 'armor';
              const hasRarity = cached?.rarity && cached.rarity !== 'common';
              const itemColor = hasRarity ? rarityColor(cached.rarity) : null;
              // Detect ammo items
              const low = item.toLowerCase();
              const isAmmoItem = low.includes('arrow') || low.includes('bolt') || low.includes('bullet') || low.includes('dart') || low.includes('needle');
              const ammoLeft = isAmmoItem ? (char.ammo?.[item] ?? defaultAmmoCount(item)) : null;
              return (
                <div key={i} className="cc-skill" style={{
                  padding: '8px 12px', borderRadius: '4px',
                  background: hasRarity ? rarityBg(cached.rarity) : (isEquipped ? 'var(--surface)' : 'var(--input-bg)'),
                  border: `1px solid ${hasRarity ? itemColor + '40' : (isEquipped ? 'var(--gold-dim)' : 'var(--border)')}`,
                  borderLeft: hasRarity ? `3px solid ${itemColor}` : undefined,
                  fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                }}
                  onClick={() => fetchAndOpenItem(item)}>
                  <button onClick={(e) => toggleEquip(item, e)}
                    title={isEquipped ? 'Unequip' : 'Equip'}
                    style={{
                      background: 'none', border: `2px solid ${isEquipped ? 'var(--gold)' : 'var(--border)'}`,
                      borderRadius: isWeapon ? '2px' : '50%', width: '18px', height: '18px', flexShrink: 0,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--gold)', fontSize: '12px', padding: 0,
                    }}>
                    {isEquipped ? '✓' : ''}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: isEquipped ? 600 : 400, color: hasRarity ? itemColor : (isEquipped ? 'var(--text)' : undefined) }}>{item}</span>
                    {cached && (
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
                        {isWeapon && cached.damage && <span>{cached.damage} {cached.damageType}</span>}
                        {isArmor && cached.ac && <span>AC {cached.ac}</span>}
                        {cached.weight && <span>{cached.weight}</span>}
                        {hasRarity && <span style={{ fontSize: '10px', color: itemColor, fontWeight: 600, textTransform: 'capitalize' }}>{cached.rarity.replace('-', ' ')}</span>}
                      </div>
                    )}
                    {isAmmoItem && ammoLeft !== null && char.trackAmmo !== false && (
                      <div style={{ fontSize: '12px', color: ammoLeft <= 0 ? '#f87171' : ammoLeft <= 5 ? '#fbbf24' : 'var(--text-dim)', marginTop: '2px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Remaining: {ammoLeft}
                        <button onClick={(e) => { e.stopPropagation(); updateField('ammo', { ...(char.ammo || {}), [item]: ammoLeft + 1 }); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '12px', padding: '0 3px', lineHeight: 1 }}>+</button>
                        <button onClick={(e) => { e.stopPropagation(); if (ammoLeft > 0) updateField('ammo', { ...(char.ammo || {}), [item]: ammoLeft - 1 }); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '12px', padding: '0 3px', lineHeight: 1 }}>−</button>
                      </div>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeEquipItem(i); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', opacity: 0.6 }}
                    title="Remove item">✕</button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {(() => {
        const cur = char.currency || {};
        const hasGold = char.gold > 0;
        const hasCurrency = cur.cp || cur.sp || cur.ep || cur.gp || cur.pp || hasGold;
        if (!hasCurrency) return null;
        const coins = [
          { key: 'cp', label: 'CP', color: '#b87333', val: cur.cp || 0 },
          { key: 'sp', label: 'SP', color: '#c0c0c0', val: cur.sp || 0 },
          { key: 'ep', label: 'EP', color: '#8a9a5b', val: cur.ep || 0 },
          { key: 'gp', label: 'GP', color: 'var(--gold)', val: cur.gp ?? char.gold ?? 0 },
          { key: 'pp', label: 'PP', color: '#e5e4e2', val: cur.pp || 0 },
        ].filter(c => c.val > 0);
        return (
          <div style={{ marginBottom: '14px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--gold-dim)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {coins.map(c => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: c.color, fontWeight: 700, fontSize: '15px' }}>{c.val}</span>
                <span style={{ fontSize: '12px', color: c.color, fontWeight: 600, opacity: 0.8 }}>{c.label}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {!showInvBrowser ? (
        <button className="btn btn-ghost" style={{ width: '100%', padding: '10px', fontSize: '13px', justifyContent: 'center' }}
          onClick={() => setShowInvBrowser(true)}>
          + Add Equipment
        </button>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)' }}>Browse Equipment</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div onClick={() => { const next = !useLocalData; setUseLocalData(next); localStorage.setItem('ond-data-source', next ? 'local' : 'db'); setEquipDataLoaded(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '10px' }}>
                <div style={{ width: '24px', height: '12px', borderRadius: '6px', position: 'relative', background: useLocalData ? 'var(--gold)' : '#4ade80', transition: 'background 0.2s' }}>
                  <div style={{ position: 'absolute', top: '2px', left: useLocalData ? '12px' : '2px', width: '8px', height: '8px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                </div>
                <span style={{ color: useLocalData ? 'var(--gold)' : '#4ade80', fontWeight: 600 }}>{useLocalData ? 'Local' : 'Database'}</span>
              </div>
              <button onClick={() => { setShowInvBrowser(false); setInvSearch(''); setInvCategory(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input placeholder="Search equipment..." value={invSearch} onChange={e => setInvSearch(e.target.value)}
                style={{ width: '100%', fontSize: '13px', paddingRight: invSearch ? '32px' : undefined }} />
              {invSearch && (
                <button onClick={() => setInvSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              )}
            </div>
            <select value={invCategory} onChange={e => setInvCategory(e.target.value)} style={{ minWidth: '130px', fontSize: '12px' }}>
              <option value="">All</option>
              <option value="weapon">Weapons</option>
              <option value="armor">Armor</option>
              <option value="adventuring-gear">Gear</option>
              <option value="tool">Tools</option>
              <option value="pack">Packs</option>
            </select>
          </div>
          {(invSearch || invCategory) ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
              {invLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '13px' }}>Loading...</div>
              ) : invResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '13px' }}>No items found.</div>
              ) : (
                invResults.map(item => {
                  const isOpen = invExpanded === item._id;
                  const hasRarity = item.rarity && item.rarity !== 'common';
                  const rc = hasRarity ? rarityColor(item.rarity) : null;
                  return (
                    <div key={item._id} style={{
                      borderBottom: '1px solid var(--surface)',
                      background: hasRarity ? rarityBg(item.rarity) : 'var(--input-bg)',
                      borderLeft: hasRarity ? `3px solid ${rc}` : 'none',
                    }}>
                      <div className="cc-skill" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer' }}
                        onClick={() => addEquipItem(item.name)}>
                        <span style={{ color: 'var(--green-light)', fontSize: '14px', flexShrink: 0 }}>+</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: hasRarity ? rc : 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {item.name}
                            {hasRarity && (
                              <span style={{
                                fontSize: '12px', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase',
                                background: rarityBg(item.rarity), color: rc, border: `1px solid ${rc}`,
                                letterSpacing: '0.5px', fontWeight: 600,
                              }}>{item.rarity.replace('-', ' ')}</span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span>{item.subcategory || item.category}</span>
                            {item.damage && <span>{item.damage} {item.damageType}</span>}
                            {item.ac && <span>AC {item.ac}</span>}
                            {item.cost && <span>{item.cost}</span>}
                            {item.weight && <span>{item.weight}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: '14px', color: 'var(--text-dim)', padding: '2px 6px' }}
                          onClick={e => { e.stopPropagation(); setInvExpanded(isOpen ? null : item._id); }}>
                          {isOpen ? '−' : '+'}
                        </span>
                      </div>
                      {isOpen && (
                        <div style={{ padding: '0 12px 10px', borderTop: `1px solid ${hasRarity ? rc + '30' : 'var(--border)'}` }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', color: 'var(--text-dim)', padding: '8px 0 4px' }}>
                            {item.cost && <span><strong>Cost:</strong> {item.cost}</span>}
                            {item.weight && <span><strong>Weight:</strong> {item.weight}</span>}
                            {item.damage && <span><strong>Damage:</strong> {item.damage} {item.damageType}</span>}
                            {item.ac && <span><strong>AC:</strong> {item.ac}</span>}
                          </div>
                          {item.properties?.length > 0 && (
                            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>
                              <strong>Properties:</strong> {item.properties.join(', ')}
                            </div>
                          )}
                          {item.description && (
                            <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5, margin: '4px 0 0' }}>{item.description}</p>
                          )}
                          {item.magical && (
                            <div style={{ marginTop: '6px', fontSize: '12px', color: hasRarity ? rc : 'var(--gold)', fontStyle: 'italic' }}>
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
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
              Search or select a category to browse
            </div>
          )}
        </div>
      )}
      {!char.equipment?.length && !showInvBrowser && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: '13px' }}>No equipment yet.</div>
      )}
    </div>
  );
  };

  const renderFeaturesTab = () => {
    // Get subclass features up to current level
    const subFeatures = char.subclass ? SUBCLASS_FEATURES[char.subclass] : null;
    const unlockedSubFeatures = subFeatures ? Object.entries(subFeatures).filter(([lvl]) => parseInt(lvl) <= (char.level || 1)).map(([lvl, feat]) => ({ ...feat, level: parseInt(lvl) })) : [];

    return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Subclass Features */}
      {unlockedSubFeatures.length > 0 && (
        <div style={st.sideCard}>
          <div style={st.sideLabel}>{char.subclass}</div>
          {unlockedSubFeatures.map((f, i) => (
            <div key={i} style={{ fontSize: '12px', marginBottom: '8px', padding: '8px 10px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <strong style={{ color: 'var(--gold)', fontSize: '13px' }}>{f.name}</strong>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Lv {f.level}</span>
              </div>
              <div style={{ color: 'var(--text-dim)', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* Class Features */}
      {char.features?.length > 0 && (
        <div style={st.sideCard}>
          <div style={st.sideLabel}>Class Features</div>
          {char.features.map((f, i) => {
            const [name, ...desc] = f.split(': ');
            return (
              <div key={i} style={{ fontSize: '12px', marginBottom: '6px', padding: '4px 0', borderBottom: i < char.features.length - 1 ? '1px solid var(--surface)' : 'none' }}>
                <strong style={{ color: 'var(--gold)' }}>{name}</strong>
                {desc.length > 0 && <span style={{ color: 'var(--text-dim)' }}> — {desc.join(': ')}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Feats with descriptions */}
      {char.feats?.length > 0 && (
        <div style={st.sideCard}>
          <div style={st.sideLabel}>Feats</div>
          {char.feats.map((f, i) => {
            const name = typeof f === 'string' ? f : f?.name || f?.desc || 'Unknown Feat';
            const featData = FEATS[name] || (typeof f === 'object' ? f : null);
            return (
              <div key={i} style={{ fontSize: '12px', marginBottom: '8px', padding: '8px 10px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, color: 'var(--gold)', fontSize: '13px', marginBottom: '3px' }}>{name}</div>
                {featData?.prereq && <div style={{ fontSize: '11px', color: 'var(--gold-dim)', fontStyle: 'italic', marginBottom: '2px' }}>Requires: {featData.prereq}</div>}
                {featData?.desc && <div style={{ color: 'var(--text-dim)', lineHeight: 1.5 }}>{featData.desc}</div>}
              </div>
            );
          })}
        </div>
      )}

      <div style={st.sideCard}>
        <div style={st.sideLabel}>Race: {char.race}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
          Racial traits are reflected in your ability scores, skills, and racial abilities in the Spells tab.
        </div>
      </div>
      {(char.traits || char.ideals || char.bonds || char.flaws) && (
        <div style={st.sideCard}>
          <div style={st.sideLabel}>Personality</div>
          {char.traits && <div style={{ fontSize: '12px', marginBottom: '8px' }}><strong style={{ color: 'var(--gold)', fontSize: '12px', textTransform: 'uppercase' }}>Traits</strong><p style={{ color: 'var(--text-dim)', marginTop: '2px', lineHeight: 1.5 }}>{char.traits}</p></div>}
          {char.ideals && <div style={{ fontSize: '12px', marginBottom: '8px' }}><strong style={{ color: 'var(--gold)', fontSize: '12px', textTransform: 'uppercase' }}>Ideals</strong><p style={{ color: 'var(--text-dim)', marginTop: '2px', lineHeight: 1.5 }}>{char.ideals}</p></div>}
          {char.bonds && <div style={{ fontSize: '12px', marginBottom: '8px' }}><strong style={{ color: 'var(--gold)', fontSize: '12px', textTransform: 'uppercase' }}>Bonds</strong><p style={{ color: 'var(--text-dim)', marginTop: '2px', lineHeight: 1.5 }}>{char.bonds}</p></div>}
          {char.flaws && <div style={{ fontSize: '12px' }}><strong style={{ color: 'var(--gold)', fontSize: '12px', textTransform: 'uppercase' }}>Flaws</strong><p style={{ color: 'var(--text-dim)', marginTop: '2px', lineHeight: 1.5 }}>{char.flaws}</p></div>}
        </div>
      )}
    </div>
  );
  };

  const renderBackgroundTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={st.sideCard}>
        <div style={st.sideLabel}>Background</div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gold)', marginBottom: '8px' }}>{char.background || 'None'}</div>
        {char.faith && <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}><strong>Faith:</strong> {char.faith}</div>}
        {char.alignment && <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}><strong>Alignment:</strong> {char.alignment}</div>}
      </div>
      {(char.age || char.height || char.weight || char.eyes || char.hair || char.skin) && (
        <div style={st.sideCard}>
          <div style={st.sideLabel}>Physical Description</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', fontSize: '12px' }}>
            {char.age && <div><span style={{ color: 'var(--text-dim)' }}>Age:</span> {char.age}</div>}
            {char.height && <div><span style={{ color: 'var(--text-dim)' }}>Height:</span> {char.height}</div>}
            {char.weight && <div><span style={{ color: 'var(--text-dim)' }}>Weight:</span> {char.weight}</div>}
            {char.eyes && <div><span style={{ color: 'var(--text-dim)' }}>Eyes:</span> {char.eyes}</div>}
            {char.hair && <div><span style={{ color: 'var(--text-dim)' }}>Hair:</span> {char.hair}</div>}
            {char.skin && <div><span style={{ color: 'var(--text-dim)' }}>Skin:</span> {char.skin}</div>}
          </div>
        </div>
      )}
    </div>
  );

  const renderProgressionTab = () => {
    const cls = char.class || '';
    const lvl = char.level || 1;
    const levels = CLASS_LEVELS[cls] || {};
    const classInfo = CLASSES[cls] || {};
    const nextLvl = lvl < 20 ? lvl + 1 : null;
    const nextFeatures = nextLvl ? (levels[nextLvl] || []) : [];
    const nextChoices = nextLvl ? getLevelChoices(cls, nextLvl, char.subclass) : [];

    // Get options for a choice type
    const getChoiceOptions = (choice) => {
      switch (choice.type) {
        case 'asi': {
          // Generate ASI options: +2 to one score, +1 to two, or a feat
          const asiOptions = [];
          // +2 options
          ABILITIES.forEach(ab => asiOptions.push({ name: `+2 ${ab.charAt(0).toUpperCase() + ab.slice(1)}`, desc: `Increase ${ab} by 2 (max 20).` }));
          // +1/+1 combos (most common ones)
          for (let i = 0; i < ABILITIES.length; i++) {
            for (let j = i + 1; j < ABILITIES.length; j++) {
              asiOptions.push({ name: `+1 ${ABILITIES[i].charAt(0).toUpperCase() + ABILITIES[i].slice(1)} / +1 ${ABILITIES[j].charAt(0).toUpperCase() + ABILITIES[j].slice(1)}`, desc: `Increase ${ABILITIES[i]} and ${ABILITIES[j]} by 1 each (max 20).` });
            }
          }
          // Separator + feats
          const featOptions = Object.keys(FEATS).map(f => ({ name: f, desc: FEATS[f].desc, prereq: FEATS[f].prereq }));
          return { desc: 'Choose: +2 to one ability, +1 to two abilities, or take a Feat.', options: [...asiOptions, ...featOptions] };
        }
        case 'fighting-style': {
          const fsData = FIGHTING_STYLE_CLASSES[cls];
          const styles = fsData ? fsData.styles : Object.keys(FIGHTING_STYLES);
          return { options: styles.map(s => ({ name: s, desc: FIGHTING_STYLES[s] })) };
        }
        case 'subclass': return { options: (classInfo.subclasses || []).map(s => ({ name: s, desc: classInfo.subclassDescs?.[s] || '' })) };
        case 'metamagic': return { options: Object.entries(METAMAGIC_OPTIONS).map(([k, v]) => ({ name: k, desc: v })) };
        case 'invocations': return { options: Object.entries(ELDRITCH_INVOCATIONS).map(([k, v]) => ({ name: k, ...v })) };
        case 'pact-boon': return { options: Object.entries(PACT_BOONS).map(([k, v]) => ({ name: k, desc: v })) };
        case 'maneuvers': return { options: Object.entries(MANEUVERS).map(([k, v]) => ({ name: k, desc: v })) };
        case 'totem': return { options: Object.entries(TOTEM_SPIRITS[choice.level] || {}).map(([k, v]) => ({ name: k, desc: v })) };
        case 'hunter-option': return { options: Object.entries(HUNTER_OPTIONS[choice.level]?.options || {}).map(([k, v]) => ({ name: k, desc: v })) };
        case 'land-terrain': return { options: Object.entries(LAND_TERRAINS).map(([k, v]) => ({ name: k, desc: v })) };
        case 'favored-enemy': return { options: FAVORED_ENEMIES.map(e => ({ name: e })) };
        case 'favored-terrain': return { options: FAVORED_TERRAINS.map(t => ({ name: t })) };
        case 'expertise': return { desc: 'Double your proficiency bonus for chosen skills.' };
        default: return {};
      }
    };

    const renderChoiceCard = (choice, idx) => {
      const data = getChoiceOptions(choice);
      const key = `${choice.type}-${idx}`;
      const expanded = expandedChoices[key];
      // Get saved choices for this type
      const savedChoices = char.levelChoices || {};
      const choiceKey = choice.type;
      // Find what's already been selected
      const getSelected = () => {
        for (const [, val] of Object.entries(savedChoices)) {
          if (val?.[choiceKey]) return val[choiceKey];
        }
        // Check direct character fields
        if (choiceKey === 'subclass') return char.subclass || null;
        if (choiceKey === 'fighting-style') return char.fightingStyle || null;
        return null;
      };
      const selected = getSelected();
      const isMulti = choice.count && choice.count > 1;
      const selectedArr = Array.isArray(selected) ? selected : (selected ? [selected] : []);

      const selectOption = (name) => {
        const lc = { ...(char.levelChoices || {}) };
        const lvlKey = String(choice.level || lvl);
        if (!lc[lvlKey]) lc[lvlKey] = {};

        if (isMulti) {
          const current = Array.isArray(lc[lvlKey][choiceKey]) ? [...lc[lvlKey][choiceKey]] : [];
          if (current.includes(name)) {
            lc[lvlKey][choiceKey] = current.filter(n => n !== name);
          } else {
            if (current.length < choice.count) current.push(name);
            else { current.shift(); current.push(name); }
            lc[lvlKey][choiceKey] = current;
          }
        } else {
          lc[lvlKey][choiceKey] = name;
        }
        // Apply the choice to character stats
        const updates = { levelChoices: lc };

        if (choiceKey === 'subclass') {
          updates.subclass = name;
        }
        if (choiceKey === 'fighting-style') {
          updates.fightingStyle = name;
          // Add to features
          const feat = `Fighting Style: ${name}`;
          if (!(char.features || []).includes(feat)) {
            updates.features = [...(char.features || []).filter(f => !f.startsWith('Fighting Style:')), feat];
          }
        }
        if (choiceKey === 'asi') {
          const FEAT_ASI = {
            'Athlete': { choose: ['strength', 'dexterity'], amount: 1 },
            'Actor': { fixed: { charisma: 1 } },
            'Durable': { fixed: { constitution: 1 } },
            'Heavily Armored': { fixed: { strength: 1 } },
            'Heavy Armor Master': { fixed: { strength: 1 } },
            'Keen Mind': { fixed: { intelligence: 1 } },
            'Lightly Armored': { choose: ['strength', 'dexterity'], amount: 1 },
            'Linguist': { fixed: { intelligence: 1 } },
            'Moderately Armored': { choose: ['strength', 'dexterity'], amount: 1 },
            'Observant': { choose: ['intelligence', 'wisdom'], amount: 1 },
            'Resilient': { chooseAny: 1 },
            'Tavern Brawler': { choose: ['strength', 'constitution'], amount: 1 },
            'Weapon Master': { choose: ['strength', 'dexterity'], amount: 1 },
          };

          // Helper: get the ASI deltas for a given selection name
          const getAsiDeltas = (selName) => {
            const deltas = {};
            if (!selName) return deltas;
            if (FEATS[selName]) {
              const d = FEAT_ASI[selName];
              if (d?.fixed) Object.entries(d.fixed).forEach(([ab, amt]) => { deltas[ab] = (deltas[ab] || 0) + amt; });
              if (d?.choose) deltas[d.choose[0]] = (deltas[d.choose[0]] || 0) + (d.amount || 1);
              if (d?.chooseAny) deltas.constitution = (deltas.constitution || 0) + 1;
            } else if (selName.startsWith('+2 ') || selName.startsWith('+1 ')) {
              selName.split(' / ').forEach(part => {
                const m = part.match(/\+(\d)\s+(\w+)/i);
                if (m && ABILITIES.includes(m[2].toLowerCase())) deltas[m[2].toLowerCase()] = (deltas[m[2].toLowerCase()] || 0) + parseInt(m[1]);
              });
            }
            return deltas;
          };

          // Find previous selection and undo it
          const prevSelection = selected || (Array.isArray(selectedArr) && selectedArr[0]) || null;
          const prevDeltas = prevSelection && prevSelection !== name ? getAsiDeltas(prevSelection) : {};
          const newDeltas = getAsiDeltas(name);

          const scores = { ...(char.abilityScores || {}) };
          // Undo previous
          for (const [ab, amt] of Object.entries(prevDeltas)) {
            scores[ab] = (scores[ab] || 10) - amt;
          }
          // Apply new
          for (const [ab, amt] of Object.entries(newDeltas)) {
            scores[ab] = Math.min(20, (scores[ab] || 10) + amt);
          }
          updates.abilityScores = scores;

          // Update feats list
          const currentFeats = (char.feats || []).filter(f => f !== prevSelection);
          if (FEATS[name]) {
            if (!currentFeats.includes(name)) updates.feats = [...currentFeats, name];
            else updates.feats = currentFeats;
          } else {
            // Remove old feat if switching from feat to ASI
            updates.feats = currentFeats;
          }
        }
        if (choiceKey === 'metamagic') {
          // Collect all metamagic from all levels
          const allMeta = [];
          for (const [, val] of Object.entries(lc)) {
            if (Array.isArray(val?.metamagic)) allMeta.push(...val.metamagic);
          }
          // Add as features
          const nonMeta = (char.features || []).filter(f => !f.startsWith('Metamagic:'));
          updates.features = [...nonMeta, ...allMeta.map(m => `Metamagic: ${m}`)];
        }
        if (choiceKey === 'invocations') {
          const allInv = [];
          for (const [, val] of Object.entries(lc)) {
            if (Array.isArray(val?.invocations)) allInv.push(...val.invocations);
          }
          const nonInv = (char.features || []).filter(f => !f.startsWith('Invocation:'));
          updates.features = [...nonInv, ...allInv.map(m => `Invocation: ${m}`)];
        }
        if (choiceKey === 'pact-boon') {
          const nonPact = (char.features || []).filter(f => !f.startsWith('Pact Boon:'));
          updates.features = [...nonPact, `Pact Boon: ${name}`];
        }
        if (choiceKey === 'maneuvers') {
          const allMan = [];
          for (const [, val] of Object.entries(lc)) {
            if (Array.isArray(val?.maneuvers)) allMan.push(...val.maneuvers);
          }
          const nonMan = (char.features || []).filter(f => !f.startsWith('Maneuver:'));
          updates.features = [...nonMan, ...allMan.map(m => `Maneuver: ${m}`)];
        }
        if (choiceKey === 'totem') {
          const nonTotem = (char.features || []).filter(f => !f.startsWith('Totem Spirit'));
          updates.features = [...nonTotem, `Totem Spirit (Lv${choice.level || lvl}): ${name}`];
        }
        if (choiceKey === 'hunter-option') {
          const label = HUNTER_OPTIONS[choice.level]?.label || 'Hunter Feature';
          const nonHunter = (char.features || []).filter(f => !f.startsWith(`${label}:`));
          updates.features = [...nonHunter, `${label}: ${name}`];
        }
        if (choiceKey === 'land-terrain') {
          const nonLand = (char.features || []).filter(f => !f.startsWith('Circle Land:'));
          updates.features = [...nonLand, `Circle Land: ${name}`];
        }
        if (choiceKey === 'expertise') {
          const currentExp = [...(char.skillExpertise || [])];
          if (!currentExp.includes(name)) {
            updates.skillExpertise = [...currentExp, name];
          } else {
            updates.skillExpertise = currentExp.filter(s => s !== name);
          }
        }
        if (choiceKey === 'favored-enemy') {
          const nonFE = (char.features || []).filter(f => !f.startsWith('Favored Enemy:'));
          const allFE = [];
          for (const [, val] of Object.entries(lc)) {
            if (val?.['favored-enemy']) allFE.push(val['favored-enemy']);
          }
          updates.features = [...(updates.features || nonFE), ...allFE.map(e => `Favored Enemy: ${e}`)];
        }
        if (choiceKey === 'favored-terrain') {
          const nonFT = (char.features || []).filter(f => !f.startsWith('Natural Explorer:'));
          const allFT = [];
          for (const [, val] of Object.entries(lc)) {
            if (val?.['favored-terrain']) allFT.push(val['favored-terrain']);
          }
          updates.features = [...(updates.features || nonFT), ...allFT.map(t => `Natural Explorer: ${t}`)];
        }

        updateChar(prev => ({ ...prev, ...updates }));
      };

      return (
        <div key={idx} style={{ padding: '10px 12px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--gold-dim)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setExpandedChoices(prev => ({ ...prev, [key]: !prev[key] }))}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gold)' }}>
                {choice.label}
                {selectedArr.length > 0 && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: '#4ade80', fontWeight: 400 }}>
                    ✓ {selectedArr.join(', ')}
                  </span>
                )}
              </div>
              {data.desc && <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>{data.desc}</div>}
              {isMulti && <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>Select {choice.count} {selectedArr.length > 0 ? `(${selectedArr.length}/${choice.count} chosen)` : ''}</div>}
            </div>
            <span style={{ color: 'var(--gold)', fontSize: '14px' }}>{expanded ? '▾' : '▸'}</span>
          </div>
          {expanded && data.options && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '400px', overflowY: 'auto' }}>
              {data.options.map((opt, oi) => {
                const name = typeof opt === 'string' ? opt : opt.name;
                const desc = typeof opt === 'object' ? opt.desc : (choice.type === 'asi' ? FEATS[opt]?.desc : null);
                const prereq = typeof opt === 'object' ? opt.prereq : (choice.type === 'asi' ? FEATS[opt]?.prereq : null);
                const isSelected = selectedArr.includes(name);
                return (
                  <div key={oi}
                    onClick={(e) => { e.stopPropagation(); selectOption(name); }}
                    className="cc-skill"
                    style={{
                      padding: '8px 10px', borderRadius: '4px', cursor: 'pointer',
                      background: isSelected ? 'rgba(74, 222, 128, 0.1)' : 'var(--input-bg)',
                      border: `1px solid ${isSelected ? '#4ade80' : 'var(--border)'}`,
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '16px', height: '16px', borderRadius: isMulti ? '3px' : '50%', flexShrink: 0,
                        border: `2px solid ${isSelected ? '#4ade80' : 'var(--border)'}`,
                        background: isSelected ? '#4ade80' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--bg-dark)', fontSize: '10px', fontWeight: 700,
                      }}>
                        {isSelected ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? '#4ade80' : 'var(--text)' }}>{name}</div>
                        {prereq && <div style={{ fontSize: '11px', color: 'var(--gold-dim)', fontStyle: 'italic' }}>Requires: {prereq}</div>}
                        {desc && <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{desc}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Next level preview with choices */}
        {nextLvl && (nextFeatures.length > 0 || nextChoices.length > 0) && (
          <div style={{ ...st.sideCard, border: '1px solid var(--gold-dim)', background: 'rgba(200, 168, 78, 0.05)' }}>
            <div style={{ ...st.sideLabel, color: 'var(--gold)' }}>Next Level — Level {nextLvl}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {nextFeatures.filter(f => f !== 'ASI').map((feat, fi) => (
                <div key={fi} style={{ padding: '8px 10px', borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{feat}</div>
                </div>
              ))}
              {nextChoices.map((choice, ci) => renderChoiceCard(choice, `next-${ci}`))}
            </div>
          </div>
        )}

        {/* Current level choices (if any still need to be made) */}
        {(() => {
          const currentChoices = getLevelChoices(cls, lvl, char.subclass);
          if (currentChoices.length === 0) return null;
          return (
            <div style={{ ...st.sideCard, border: '1px solid #4ade80', background: 'rgba(74, 222, 128, 0.05)' }}>
              <div style={{ ...st.sideLabel, color: '#4ade80' }}>Current Level {lvl} — Available Choices</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {currentChoices.map((choice, ci) => renderChoiceCard(choice, `cur-${ci}`))}
              </div>
            </div>
          );
        })()}

        {/* Class info */}
        <div style={st.sideCard}>
          <div style={st.sideLabel}>{cls} — Level {lvl}</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
            <span>Hit Die: <strong style={{ color: 'var(--text)' }}>{classInfo.hitDice || HIT_DICE[cls] || 'd8'}</strong></span>
            {classInfo.subclassLevel && <span>Subclass at Level: <strong style={{ color: 'var(--text)' }}>{classInfo.subclassLevel}</strong></span>}
            {classInfo.spellcasting && <span>Spellcasting: <strong style={{ color: 'var(--text)' }}>{classInfo.spellcastingAbility}</strong></span>}
            {char.subclass && <span>Subclass: <strong style={{ color: 'var(--gold)' }}>{char.subclass}</strong></span>}
          </div>
        </div>

        {/* Full progression table */}
        <div style={st.sideCard}>
          <div style={st.sideLabel}>Class Progression</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {Array.from({ length: 20 }, (_, i) => i + 1).map(l => {
              const features = levels[l] || [];
              const choices = getLevelChoices(cls, l, char.subclass);
              const isCurrent = l === lvl;
              const isPast = l < lvl;
              const isFuture = l > lvl;
              const isNext = l === nextLvl;
              const hasContent = features.length > 0 || choices.length > 0;
              if (!hasContent && !isCurrent) return null;
              const levelExpanded = expandedChoices[`lvl-${l}`];
              return (
                <div key={l}>
                  <div
                    onClick={() => { if (choices.length > 0) setExpandedChoices(prev => ({ ...prev, [`lvl-${l}`]: !prev[`lvl-${l}`] })); }}
                    style={{
                      display: 'flex', gap: '10px', padding: '8px 10px', borderRadius: '6px', cursor: choices.length > 0 ? 'pointer' : 'default',
                      background: isCurrent ? 'rgba(200, 168, 78, 0.1)' : isNext ? 'rgba(74, 222, 128, 0.05)' : 'transparent',
                      border: isCurrent ? '1px solid var(--gold-dim)' : isNext ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid transparent',
                      opacity: isFuture && !isNext ? 0.6 : 1,
                    }}>
                    <div style={{
                      minWidth: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700, fontFamily: 'Cinzel, serif',
                      background: isCurrent ? 'var(--gold)' : isPast ? 'var(--surface)' : 'transparent',
                      color: isCurrent ? 'var(--bg-dark)' : isPast ? 'var(--text)' : 'var(--text-dim)',
                      border: isCurrent ? 'none' : `2px solid ${isPast ? 'var(--gold-dim)' : 'var(--border)'}`,
                    }}>
                      {l}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
                      {features.map((feat, fi) => {
                        const isASI = feat === 'ASI';
                        // Check if this is a generic subclass feature placeholder
                        const isSubFeature = feat.includes('Feature') && (feat.includes('Path') || feat.includes('Archetype') || feat.includes('Tradition') || feat.includes('College') || feat.includes('Domain') || feat.includes('Circle') || feat.includes('Origin') || feat.includes('Patron') || feat.includes('Oath') || feat.includes('Specialist'));
                        const subFeatData = isSubFeature && char.subclass && SUBCLASS_FEATURES[char.subclass]?.[l];
                        return (
                          <div key={fi} style={{
                            fontSize: '12px', fontWeight: isASI ? 600 : 400,
                            color: isASI ? 'var(--gold)' : (isCurrent ? 'var(--text)' : 'var(--text-dim)'),
                            padding: '1px 0',
                          }}>
                            {isPast ? '✓ ' : ''}{isASI ? 'Ability Score Improvement / Feat' : feat}
                            {subFeatData && (
                              <span style={{ color: 'var(--gold-dim)', fontWeight: 400 }}> — {subFeatData.name}</span>
                            )}
                          </div>
                        );
                      })}
                      {choices.filter(c => c.type !== 'asi').map((c, ci) => (
                        <div key={`c${ci}`} style={{ fontSize: '11px', color: 'var(--gold-dim)', fontStyle: 'italic', padding: '1px 0' }}>
                          ↳ {c.label}
                        </div>
                      ))}
                      {!hasContent && (
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>Current level</div>
                      )}
                    </div>
                    {choices.length > 0 && (
                      <span style={{ color: 'var(--gold-dim)', fontSize: '12px', alignSelf: 'center' }}>{levelExpanded ? '▾' : '▸'}</span>
                    )}
                  </div>
                  {levelExpanded && choices.length > 0 && (
                    <div style={{ marginLeft: '42px', marginTop: '6px', marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {choices.map((choice, ci) => renderChoiceCard(choice, `lvl${l}-${ci}`))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderNotesTab = () => (
    <div style={st.sideCard}>
      <div style={st.sideLabel}>Notes & Backstory</div>
      <DebouncedTextarea
        rows={14} value={char.notes || ''}
        onChange={v => updateField('notes', v)}
        placeholder="Write notes, backstory, quest log..."
        style={{ width: '100%', resize: 'vertical', fontSize: '13px', lineHeight: 1.6 }}
      />
    </div>
  );

  return (
    <div style={st.sheet}>
      {/* ═══ HEADER ═══ */}
      <div style={st.header}>
        {char.avatarUrl ? (
          <img src={char.avatarUrl} alt="" onClick={() => setShowAvatar(true)} style={{ width: '96px', height: '96px', borderRadius: '6px', objectFit: 'cover', border: '2px solid var(--gold-dim)', flexShrink: 0, cursor: 'pointer' }} />
        ) : (
          <div style={{ width: '96px', height: '96px', borderRadius: '6px', background: 'var(--surface)', border: '2px solid var(--gold-dim)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: 'var(--gold-dim)', fontFamily: 'Cinzel, serif', fontWeight: 700 }}>
            {(char.name || '?')[0].toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link to="/characters" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>← Back</Link>
            <label
              title={syncEnabled ? (syncing ? 'Syncing to server...' : syncError || 'Synced to server') : 'Sync disabled — local only'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)', userSelect: 'none' }}
            >
              <div
                onClick={() => {
                  const next = !syncEnabled;
                  setSyncEnabled(next);
                  localStorage.setItem(`ond-sync-${id}`, String(next));
                  if (next) forceSync();
                }}
                style={{
                  width: '32px', height: '16px', borderRadius: '8px', position: 'relative', cursor: 'pointer',
                  background: syncEnabled ? '#4ade80' : 'var(--border)', transition: 'background 0.2s',
                }}>
                <div style={{
                  position: 'absolute', top: '2px', left: syncEnabled ? '16px' : '2px',
                  width: '12px', height: '12px', borderRadius: '50%',
                  background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
              <span style={{ color: !syncEnabled ? 'var(--text-dim)' : syncError ? '#f87171' : syncing ? 'var(--gold-dim)' : '#4ade80' }}>
                {syncEnabled ? (syncing ? 'Syncing' : syncError ? 'Error' : 'Synced') : 'Local Only'}
              </span>
            </label>
          </div>
          <h1 style={{ fontSize: '24px', margin: '2px 0 4px', lineHeight: 1 }}>{char.name}</h1>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {char.race && <span className="badge badge-race">{char.race}</span>}
            {char.class && <span className="badge badge-class">{char.class}{char.subclass ? ` · ${char.subclass}` : ''}</span>}
            <span className="badge badge-level">Level {char.level}</span>
            {char.alignment && <span className="badge" style={{ background: '#1a1a2e', border: '1px solid #3a3a6e', color: '#8080c0' }}>{char.alignment}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          <Tip text={char.inspiration
            ? 'You have Heroic Inspiration! Click to use it. Add 1d20 to any attack, save, or ability check you make.'
            : 'Grant Heroic Inspiration. When active, you can add 1d20 to any attack roll, saving throw, or ability check.'}>
            <button
              onClick={() => updateField('inspiration', !char.inspiration)}
              style={{
                padding: '8px 16px', fontSize: '13px', fontWeight: 700,
                fontFamily: 'Cinzel, serif', letterSpacing: '0.5px',
                borderRadius: '8px', cursor: 'pointer',
                border: char.inspiration ? '2px solid var(--gold)' : '2px solid var(--border)',
                background: char.inspiration
                  ? 'linear-gradient(135deg, rgba(200, 168, 78, 0.25), rgba(200, 168, 78, 0.1))'
                  : 'var(--surface)',
                color: char.inspiration ? 'var(--gold)' : 'var(--text-dim)',
                boxShadow: char.inspiration ? '0 0 12px rgba(200, 168, 78, 0.3), inset 0 0 8px rgba(200, 168, 78, 0.1)' : 'none',
                animation: char.inspiration ? 'pulse 2s infinite' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {char.inspiration ? '★' : '☆'} Heroic Inspiration
            </button>
          </Tip>
          <Tip text={`Short Rest: Spend 1 hit die (${char.hitDice || HIT_DICE[char.class] || 'd8'} + CON mod) to heal.\n${char.hitDiceRemaining ?? char.level} of ${char.level} hit dice remaining.`}>
            <button onClick={doShortRest}
              style={{
                padding: '8px 14px', fontSize: '12px', fontWeight: 600,
                fontFamily: 'Cinzel, serif', borderRadius: '8px', cursor: 'pointer',
                border: '2px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text-dim)', transition: 'all 0.2s ease',
              }}>
              Short Rest
            </button>
          </Tip>
          <Tip text="Long Rest: Restore all HP, all spell slots, regain half your hit dice (min 1), and reset death saves. Takes 8 hours.">
            <button onClick={doLongRest}
              style={{
                padding: '8px 14px', fontSize: '12px', fontWeight: 600,
                fontFamily: 'Cinzel, serif', borderRadius: '8px', cursor: 'pointer',
                border: '2px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text-dim)', transition: 'all 0.2s ease',
              }}>
              Long Rest
            </button>
          </Tip>
          <Tip text={editMode ? 'Exit layout edit mode.' : 'Rearrange widgets: move them between columns and reorder them.'}>
            <button
              onClick={() => setEditMode(m => !m)}
              style={{
                padding: '8px 12px', fontSize: '14px', fontWeight: 600,
                borderRadius: '8px', cursor: 'pointer',
                border: editMode ? '2px solid var(--gold)' : '2px solid var(--border)',
                background: editMode ? 'rgba(200, 168, 78, 0.15)' : 'var(--surface)',
                color: editMode ? 'var(--gold)' : 'var(--text-dim)',
                transition: 'all 0.2s ease',
              }}>
              {editMode ? '✓ Done' : '⋮⋮'}
            </button>
          </Tip>
          <Tip text="Edit Character: Change ability scores, class, race, spells, equipment, and other character details.">
            <button
              onClick={() => navigate(`/characters/${id}/edit`)}
              style={{
                padding: '8px 12px', fontSize: '14px', fontWeight: 600,
                borderRadius: '8px', cursor: 'pointer',
                border: '2px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text-dim)', transition: 'all 0.2s ease',
              }}>
              ⚙
            </button>
          </Tip>
        </div>
      </div>

      {/* ═══ ABILITY SCORE BAR ═══ */}
      <div style={st.abilityBar}>
        {ABILITIES.map(ab => {
          const score = scores[ab] ?? 10;
          const mod = modVal(score);
          const bonus = mod >= 0 ? `+${mod}` : `${mod}`;
          return (
            <div key={ab} style={st.abilityCell} className="cc-skill"
              onClick={() => {
                const label = `${ab.charAt(0).toUpperCase() + ab.slice(1)} Check`;
                const formula = `1d20${bonus}`;
                if (hasAbilityDisadvantage) doDisadvantage(label, formula);
                else doRollWithResult(label, formula);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setRollMenu({ x: e.clientX, y: e.clientY, label: `${ab.charAt(0).toUpperCase() + ab.slice(1)} Check`, formula: `1d20${bonus}`, type: 'attack' });
              }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-dim)', fontWeight: 600 }}>{ab.toUpperCase()}</span>
              {rollResults[`${ab.charAt(0).toUpperCase() + ab.slice(1)} Check`] ? (
                <span style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1.1, color: 'var(--gold)' }}>
                  {rollResults[`${ab.charAt(0).toUpperCase() + ab.slice(1)} Check`].total}
                </span>
              ) : (
                <span style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.1 }}>{bonus}</span>
              )}
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', background: 'var(--surface)', borderRadius: '10px', padding: '1px 8px', marginTop: '2px', border: '1px solid var(--border)' }}>{score}</span>
            </div>
          );
        })}
      </div>

      {/* Edit mode bar */}
      {editMode && (
        <div style={{
          marginBottom: '12px', padding: '8px 16px', background: 'var(--accent)',
          border: '1px solid var(--gold-dim)', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>
            Layout Edit Mode — Drag sidebar edge to resize.
          </span>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Columns:</span>
            {[2, 3, 4].map(n => (
              <button key={n} className="cc-skill"
                onClick={() => { setColumnCount(n); if (char?._id) saveColumnCount(char._id, n); }}
                style={{
                  width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                  background: columnCount === n ? 'var(--gold)' : 'var(--surface)',
                  border: `1px solid ${columnCount === n ? 'var(--gold)' : 'var(--border)'}`,
                  color: columnCount === n ? 'var(--bg-dark)' : 'var(--text-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}>{n}</button>
            ))}
            <button className="btn btn-primary" style={{ padding: '4px 14px', fontSize: '12px', marginLeft: '8px' }}
              onClick={() => { setLayout(DEFAULT_LAYOUT); setColumnCount(2); if (char?._id) { saveLayout(char._id, DEFAULT_LAYOUT); setSidebarWidth(340); saveSidebarWidth(char._id, 340); saveColumnCount(char._id, 2); } }}>
              Reset Layout
            </button>
          </div>
        </div>
      )}

      {/* ═══ MAIN LAYOUT ═══ */}
      <div style={st.layout}>
        {/* Left column */}
        <div style={st.sidebar}>
          {leftWidgets.map(w => (
            <div key={w.id} style={{ marginTop: editMode ? '16px' : '0' }}>
              {renderWidget(w.id)}
            </div>
          ))}
          {leftWidgets.length === 0 && (
            <div style={{ minHeight: '60px', border: '1px dashed var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
              {editMode ? 'Use ← arrows to move widgets here' : ''}
            </div>
          )}
        </div>

        {/* Resize handle */}
        <div
          style={{
            position: 'absolute', left: `${sidebarWidth - 2}px`, top: 0, bottom: 0,
            width: '6px', cursor: 'col-resize', zIndex: 20,
            background: editMode ? 'var(--gold-dim)' : 'transparent',
            opacity: editMode ? 0.5 : 0,
            borderRadius: '3px',
            transition: 'opacity 0.15s, background 0.15s',
          }}
          onMouseDown={e => {
            resizing.current = true;
            resizeStart.current = { x: e.clientX, w: sidebarWidth };
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          onMouseEnter={e => { if (!resizing.current) e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={e => { if (!resizing.current) e.currentTarget.style.opacity = editMode ? '0.5' : '0'; }}
        />

        {/* Right column */}
        <div>
          {rightWidgets.map(w => (
            <div key={w.id} style={{ marginTop: editMode ? '16px' : '0' }}>
              {renderWidget(w.id)}
            </div>
          ))}
          {rightWidgets.length === 0 && editMode && (
            <div style={{ minHeight: '60px', border: '1px dashed var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
              Drop widgets here
            </div>
          )}
        </div>

        {/* Mid column (3+ columns) */}
        {columnCount >= 3 && (
          <div>
            {midWidgets.map(w => (
              <div key={w.id} style={{ marginTop: editMode ? '16px' : '0' }}>
                {renderWidget(w.id)}
              </div>
            ))}
            {midWidgets.length === 0 && editMode && (
              <div style={{ minHeight: '60px', border: '1px dashed var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                Drop widgets here
              </div>
            )}
          </div>
        )}

        {/* Far column (4 columns) */}
        {columnCount >= 4 && (
          <div>
            {farWidgets.map(w => (
              <div key={w.id} style={{ marginTop: editMode ? '16px' : '0' }}>
                {renderWidget(w.id)}
              </div>
            ))}
            {farWidgets.length === 0 && editMode && (
              <div style={{ minHeight: '60px', border: '1px dashed var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                Drop widgets here
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ ROLL CONTEXT MENU ═══ */}
      {rollMenu && (
        <div style={{
          position: 'fixed', left: rollMenu.x, top: rollMenu.y, zIndex: 2000,
          background: 'var(--bg-card)', border: '1px solid var(--gold-dim)', borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7)', overflow: 'hidden', minWidth: '180px',
        }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)' }}>
            {rollMenu.label}
          </div>
          {/* Normal roll */}
          <div
            className="cc-skill"
            onClick={() => { doRollWithResult(rollMenu.label, rollMenu.formula); setRollMenu(null); }}
            style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--surface)' }}>
            <span style={{ fontSize: '16px' }}>🎲</span> Normal Roll
          </div>
          {rollMenu.type === 'attack' ? (
            <>
              {/* Advantage */}
              <div
                className="cc-skill"
                onClick={() => { doAdvantage(rollMenu.label, rollMenu.formula); setRollMenu(null); }}
                style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', borderBottom: '1px solid var(--surface)' }}>
                <span style={{ fontSize: '16px' }}>⬆</span> Advantage <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.6 }}>2d20 take high</span>
              </div>
              {/* Disadvantage */}
              <div
                className="cc-skill"
                onClick={() => { doDisadvantage(rollMenu.label, rollMenu.formula); setRollMenu(null); }}
                style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                <span style={{ fontSize: '16px' }}>⬇</span> Disadvantage <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.6 }}>2d20 take low</span>
              </div>
            </>
          ) : (
            <>
              {/* Crit */}
              <div
                className="cc-skill"
                onClick={() => { doCrit(rollMenu.label, rollMenu.formula); setRollMenu(null); }}
                style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', borderBottom: '1px solid var(--surface)' }}>
                <span style={{ fontSize: '16px' }}>💥</span> Critical Hit <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.6 }}>double dice</span>
              </div>
              {/* Half damage */}
              <div
                className="cc-skill"
                onClick={async () => {
                  const r = await rollDice3D(rollMenu.formula, `${rollMenu.label} (Half)`);
                  const half = Math.floor(r.total / 2);
                  setRollResults(prev => ({ ...prev, [rollMenu.label]: { total: half, time: Date.now(), tag: 'HALF' } }));
                  setTimeout(() => setRollResults(prev => { const n = { ...prev }; if (n[rollMenu.label]?.time && Date.now() - n[rollMenu.label].time >= 7500) delete n[rollMenu.label]; return n; }), 8000);
                  setRollMenu(null);
                }}
                style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24' }}>
                <span style={{ fontSize: '16px' }}>½</span> Half Damage <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.6 }}>save success</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ SIDE PANEL OVERLAY ═══ */}
      {sidePanel && (
        <>
          <div style={{ ...st.panelOverlay, opacity: panelVisible ? 1 : 0 }} onClick={() => setSidePanel(null)} />
          <div style={{ ...st.panel, transform: panelVisible ? 'translateX(0)' : 'translateX(100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', lineHeight: 1.2, margin: 0, color: sidePanel.data.rarity && sidePanel.data.rarity !== 'common' ? rarityColor(sidePanel.data.rarity) : undefined }}>{sidePanel.data.name}</h2>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {sidePanel.type === 'spell' && (
                    <>
                      {sidePanel.data.level === 0
                        ? <span className="badge badge-level">Cantrip</span>
                        : sidePanel.data.level > 0 && <span className="badge badge-level">Level {sidePanel.data.level}</span>
                      }
                      {sidePanel.data.school && <span className="badge badge-class">{sidePanel.data.school}</span>}
                      {sidePanel.data.source === 'race' && <span className="badge" style={{ background: '#1a102a', border: '1px solid #6b4a8a', color: '#b07ee0' }}>Racial</span>}
                      {sidePanel.data.concentration && <span className="badge" style={{ background: '#1a2a1a', border: '1px solid #4a8a4a', color: '#80c080' }}>Concentration</span>}
                      {sidePanel.data.ritual && <span className="badge" style={{ background: '#1a1a2e', border: '1px solid #4a4a8a', color: '#8080c0' }}>Ritual</span>}
                    </>
                  )}
                  {sidePanel.type === 'item' && (
                    <>
                      {sidePanel.data.category && <span className="badge badge-class">{sidePanel.data.subcategory || sidePanel.data.category}</span>}
                      {sidePanel.data.rarity && sidePanel.data.rarity !== 'common' && (
                        <span className="badge" style={{ background: '#1a2a1a', border: '1px solid var(--gold-dim)', color: 'var(--gold)' }}>{sidePanel.data.rarity}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
              <button className="cc-skill" onClick={() => setSidePanel(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '20px', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px', lineHeight: 1 }}>✕</button>
            </div>

            {/* Spell panel */}
            {sidePanel.type === 'spell' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  {[
                    { label: 'Casting Time', value: sidePanel.data.castingTime },
                    { label: 'Range', value: sidePanel.data.range },
                    { label: 'Duration', value: sidePanel.data.duration },
                    { label: 'Components', value: sidePanel.data.components?.join(', ') || '—' },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'var(--surface)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '2px' }}>{item.label}</div>
                      <div style={{ fontSize: '13px' }}>{item.value || '—'}</div>
                    </div>
                  ))}
                </div>

                {(sidePanel.data.attackType || sidePanel.data.savingThrow || sidePanel.data.damage) && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {sidePanel.data.attackType && (() => {
                      const spMod = modVal(scores[char.spellcastingAbility] ?? scores.intelligence ?? 10);
                      return (
                        <RollBtn label={`${sidePanel.data.name} Attack`} formula={`1d20+${spMod + profBonus}`}
                          style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', background: 'var(--accent)', border: '1px solid var(--gold-dim)' }}>
                          Attack: +{spMod + profBonus}
                        </RollBtn>
                      );
                    })()}
                    {sidePanel.data.savingThrow && (() => {
                      const spMod = modVal(scores[char.spellcastingAbility] ?? scores.intelligence ?? 10);
                      const dc = 8 + spMod + profBonus;
                      return (
                        <div style={{ background: 'var(--accent)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', border: '1px solid var(--gold-dim)' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Save: </span>
                          <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{sidePanel.data.savingThrow} DC {dc}</span>
                          {sidePanel.data.saveEffect && <span style={{ color: 'var(--text-dim)' }}> ({sidePanel.data.saveEffect})</span>}
                        </div>
                      );
                    })()}
                    {sidePanel.data.damage && (
                      <RollBtn label={`${sidePanel.data.name} Damage`} formula={sidePanel.data.damage} type="damage"
                        style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', background: 'var(--accent)', border: '1px solid var(--gold-dim)' }}>
                        Damage: {sidePanel.data.damage} {sidePanel.data.damageType || ''}
                      </RollBtn>
                    )}
                  </div>
                )}

                {sidePanel.data.materialComponent && (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px', padding: '6px 10px', background: 'var(--surface)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <strong style={{ color: 'var(--text)' }}>Material:</strong> {sidePanel.data.materialComponent}
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '6px' }}>Description</div>
                  <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{sidePanel.data.description}</p>
                </div>

                {sidePanel.data.higherLevels && (
                  <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--gold-dim)' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--gold)', marginBottom: '4px', fontWeight: 600 }}>At Higher Levels</div>
                    <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--text-dim)' }}>{sidePanel.data.higherLevels}</p>
                  </div>
                )}

                {sidePanel.data.sourceRace && (
                  <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-dim)', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <span style={{ color: '#b07ee0' }}>Source:</span> {sidePanel.data.sourceRace}
                  </div>
                )}
              </>
            )}

            {/* Item panel */}
            {sidePanel.type === 'item' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  {[
                    { label: 'Cost', value: sidePanel.data.cost },
                    { label: 'Weight', value: sidePanel.data.weight },
                    sidePanel.data.damage && { label: 'Damage', value: `${sidePanel.data.damage} ${sidePanel.data.damageType || ''}` },
                    sidePanel.data.ac && { label: 'Armor Class', value: sidePanel.data.ac },
                  ].filter(Boolean).map(item => (
                    <div key={item.label} style={{ background: 'var(--surface)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '2px' }}>{item.label}</div>
                      <div style={{ fontSize: '13px' }}>{item.value || '—'}</div>
                    </div>
                  ))}
                </div>

                {sidePanel.data.damage && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <RollBtn label={`${sidePanel.data.name} Damage`} formula={sidePanel.data.damage} type="damage"
                      style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', background: 'var(--accent)', border: '1px solid var(--gold-dim)' }}>
                      Roll Damage: {sidePanel.data.damage}
                    </RollBtn>
                  </div>
                )}

                {sidePanel.data.properties?.length > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                    <strong style={{ color: 'var(--text)' }}>Properties:</strong> {sidePanel.data.properties.join(', ')}
                  </div>
                )}

                {sidePanel.data.properties?.some(p => p.toLowerCase().includes('ammunition')) && (() => {
                  const wpnName = sidePanel.data.name.toLowerCase();
                  // Find equipped ammo matching this weapon
                  const matchingAmmo = (char.equippedItems || []).filter(name => {
                    const low = name.toLowerCase();
                    const isAmmo = low.includes('arrow') || low.includes('bolt') || low.includes('bullet') || low.includes('needle');
                    if (!isAmmo) return false;
                    if (wpnName.includes('crossbow')) return low.includes('bolt');
                    if (wpnName.includes('sling')) return low.includes('bullet');
                    return low.includes('arrow');
                  });
                  const ammoLabel = wpnName.includes('crossbow') ? 'Bolts' : wpnName.includes('sling') ? 'Bullets' : 'Arrows';
                  return (
                    <div style={{ fontSize: '12px', marginBottom: '12px', padding: '8px 10px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ marginBottom: matchingAmmo.length > 0 ? '6px' : 0 }}>
                        <strong style={{ color: 'var(--text)' }}>Ammunition:</strong>{' '}
                        <span style={{ color: 'var(--text-dim)' }}>Uses {ammoLabel}</span>
                      </div>
                      {matchingAmmo.length > 0 ? matchingAmmo.map(a => {
                        const count = char.ammo?.[a] ?? defaultAmmoCount(a);
                        return (
                          <div key={a} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                            <span style={{ color: 'var(--text-dim)' }}>{a}</span>
                            <span style={{ fontWeight: 700, color: count <= 0 ? '#f87171' : count <= 5 ? '#fbbf24' : 'var(--gold)' }}>
                              {count} left
                            </span>
                          </div>
                        );
                      }) : (
                        <div style={{ color: '#f87171', fontStyle: 'italic', fontSize: '11px' }}>No {ammoLabel.toLowerCase()} equipped</div>
                      )}
                    </div>
                  );
                })()}

                {sidePanel.data.description && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '6px' }}>Description</div>
                    <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{sidePanel.data.description}</p>
                  </div>
                )}
              </>
            )}

            {/* Action panel */}
            {sidePanel.type === 'action' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  {[
                    { label: 'Action Type', value: sidePanel.data.actionType },
                    { label: 'Attack Type', value: sidePanel.data.attackType },
                    { label: 'To Hit', value: `+${sidePanel.data.toHit}` },
                    { label: 'Damage', value: sidePanel.data.damage },
                    { label: 'Damage Type', value: sidePanel.data.damageType },
                    { label: 'Stat', value: sidePanel.data.stat },
                    { label: 'Range/Area', value: sidePanel.data.range },
                    { label: 'Proficient', value: sidePanel.data.proficient ? 'Yes' : 'No' },
                  ].filter(i => i.value).map(item => (
                    <div key={item.label} style={{ background: 'var(--surface)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '2px' }}>{item.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {sidePanel.data.description && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '6px' }}>Description</div>
                    <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{sidePanel.data.description}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ═══ HEAL TOAST ═══ */}
      {healToast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: 0, right: 0, marginInline: 'auto', width: 'fit-content',
          background: healToast.error
            ? 'radial-gradient(ellipse at center, rgba(40, 16, 16, 0.97), rgba(20, 8, 8, 0.97))'
            : 'radial-gradient(ellipse at center, rgba(16, 40, 16, 0.97), rgba(8, 20, 8, 0.97))',
          border: `2px solid ${healToast.error ? '#f87171' : '#4ade80'}`,
          borderRadius: '16px', padding: '20px 32px',
          zIndex: 9500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
          boxShadow: healToast.error
            ? '0 0 40px rgba(248, 113, 113, 0.3), 0 8px 32px rgba(0,0,0,0.8)'
            : '0 0 40px rgba(74, 222, 128, 0.3), 0 8px 32px rgba(0,0,0,0.8)',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ fontSize: '14px', color: healToast.error ? '#f87171' : '#4ade80', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'Cinzel, serif', fontWeight: 600 }}>
            Short Rest
          </div>
          {healToast.error ? (
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#f87171', fontFamily: 'Cinzel, serif', textAlign: 'center' }}>
              {healToast.error}
            </div>
          ) : (
            <div style={{ fontSize: '48px', fontWeight: 800, color: '#4ade80', fontFamily: 'Cinzel, serif', lineHeight: 1, textShadow: '0 0 20px rgba(74, 222, 128, 0.5)' }}>
              +{healToast.amount} HP
            </div>
          )}
          <div style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '4px' }}>
            <span style={{ color: healToast.error ? '#f87171' : '#4ade80', fontWeight: 700 }}>{healToast.newHp}</span>
            <span> / {healToast.maxHp} HP</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
            {healToast.diceUsed} / {healToast.diceMax} hit dice remaining
          </div>
        </div>
      )}

      {/* ═══ ROLL TOAST NOTIFICATION ═══ */}
      {rollToast && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-dark, #0d0800)', border: '1px solid var(--gold-dim)',
          borderRadius: '10px', padding: '12px 20px', zIndex: 9000,
          display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.7)', minWidth: '200px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gold)', fontFamily: 'Cinzel, serif', minWidth: '40px', textAlign: 'center' }}>
            {rollToast.total}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              {rollToast.label}
              {rollToast.tag && (
                <span style={{
                  marginLeft: '6px', fontSize: '12px', padding: '2px 6px', borderRadius: '3px',
                  background: rollToast.tag === 'CRIT' ? '#3a1a1a' : rollToast.tag === 'ADV' ? '#1a3a1a' : '#3a3a1a',
                  color: rollToast.tag === 'CRIT' ? '#ff6666' : rollToast.tag === 'ADV' ? '#4ade80' : '#fbbf24',
                  border: `1px solid ${rollToast.tag === 'CRIT' ? '#ff4444' : rollToast.tag === 'ADV' ? '#2a6a2a' : '#6a6a2a'}`,
                  textTransform: 'uppercase', fontWeight: 700,
                }}>{rollToast.tag}</span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{rollToast.formula}</div>
          </div>
        </div>
      )}

      {/* ═══ ROLL LOG TOGGLE ═══ */}
      {!sidePanel && <button
        onClick={() => setShowRollLog(v => !v)}
        style={{
          position: 'fixed', top: '80px', right: '20px', zIndex: 8999,
          width: '36px', height: '36px', borderRadius: '8px',
          background: showRollLog ? 'var(--gold)' : 'var(--bg-card)',
          color: showRollLog ? 'var(--bg-dark)' : 'var(--gold)',
          border: '1px solid var(--gold-dim)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
          fontFamily: 'Cinzel, serif', fontWeight: 700,
        }}
        title="Roll Log"
      >
        {rollLog.length > 0 ? rollLog.length : '⋮'}
      </button>}

      {/* ═══ ROLL LOG PANEL ═══ */}
      {!sidePanel && showRollLog && (
        <div style={{
          position: 'fixed', top: '124px', right: '20px', zIndex: 8998,
          width: '380px', maxHeight: '500px', overflowY: 'auto',
          background: 'var(--bg-card, #1a1a2e)', border: '1px solid var(--gold-dim)',
          borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
          padding: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--gold)', fontFamily: 'Cinzel, serif' }}>Roll Log</span>
            {rollLog.length > 0 && (
              <button onClick={() => setRollLog([])}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '12px' }}>
                Clear
              </button>
            )}
          </div>
          {rollLog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: '12px' }}>
              No rolls yet. Click a skill, save, or attack to roll.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {rollLog.map((entry, i) => {
                const ago = Math.floor((Date.now() - entry.time) / 1000);
                const timeStr = ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.floor(ago / 60)}m ago` : `${Math.floor(ago / 3600)}h ago`;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                    borderRadius: '6px', background: 'var(--surface)', border: '1px solid var(--border)',
                  }}>
                    {entry.avatar ? (
                      <img src={entry.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--gold)', fontWeight: 700, flexShrink: 0, border: '1px solid var(--gold-dim)' }}>
                        {(entry.who || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {entry.label}
                        {entry.tag && (
                          <span style={{
                            fontSize: '12px', padding: '2px 5px', borderRadius: '3px',
                            background: entry.tag === 'CRIT' ? '#3a1a1a' : entry.tag === 'ADV' ? '#1a3a1a' : '#3a3a1a',
                            color: entry.tag === 'CRIT' ? '#ff6666' : entry.tag === 'ADV' ? '#4ade80' : '#fbbf24',
                            fontWeight: 700,
                          }}>{entry.tag}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span><span style={{ color: 'var(--gold-dim)', fontWeight: 500 }}>{entry.who}</span> · {entry.formula}</span>
                        <span>{timeStr}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gold)', minWidth: '36px', textAlign: 'center', fontFamily: 'Cinzel, serif' }}>
                      {entry.total}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Avatar enlarged modal */}
      {showAvatar && char.avatarUrl && (
        <div onClick={() => setShowAvatar(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexDirection: 'column', gap: '16px' }}>
          <img src={char.avatarUrl} alt={char.name} style={{ maxWidth: '85vw', maxHeight: '80vh', borderRadius: '8px', border: '2px solid var(--gold-dim)', objectFit: 'contain' }} />
          <div style={{ fontSize: '22px', fontFamily: 'Cinzel, serif', color: 'var(--gold)', fontWeight: 700, letterSpacing: '1px' }}>{char.name}</div>
        </div>
      )}

      {/* Short Rest Modal */}
      {shortRestModal && (() => {
        const hd = HIT_DICE[char.class] || 'd8';
        const conMod = modVal(scores.constitution ?? 10);
        const remaining = (char.hitDiceRemaining ?? char.level) - shortRestModal.diceSpent;
        const currentHpAfter = Math.min(char.maxHp, char.currentHp + shortRestModal.totalHealed);
        const atMax = currentHpAfter >= char.maxHp;
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg-card)', border: '2px solid var(--gold-dim)', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%' }}>
              <h3 style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold)', marginBottom: '16px', fontSize: '20px' }}>Short Rest</h3>

              {/* HP Bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-dim)' }}>HP</span>
                  <span style={{ fontWeight: 700 }}>{currentHpAfter} / {char.maxHp}</span>
                </div>
                <div style={{ height: '8px', background: 'var(--surface)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(currentHpAfter / char.maxHp) * 100}%`, background: hpColor(currentHpAfter, char.maxHp), borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
              </div>

              {/* Hit Dice remaining */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Hit Dice Remaining</span>
                <span style={{ fontWeight: 700, color: remaining > 0 ? 'var(--gold)' : '#f87171' }}>{remaining} / {char.level} ({hd})</span>
              </div>

              {/* Roll log */}
              {shortRestModal.rolls.length > 0 && (
                <div style={{ marginBottom: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                  {shortRestModal.rolls.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: i % 2 === 0 ? 'var(--surface)' : 'transparent', borderRadius: '4px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Die {i + 1}: {r.formula}</span>
                      <span style={{ fontWeight: 700, color: '#4ade80' }}>+{r.total} HP</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderTop: '1px solid var(--border)', marginTop: '4px', fontSize: '14px', fontWeight: 700 }}>
                    <span>Total Healed</span>
                    <span style={{ color: '#4ade80' }}>+{shortRestModal.totalHealed} HP</span>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn" style={{ flex: 1, padding: '8px 16px', fontSize: '14px', background: remaining > 0 && !atMax ? 'linear-gradient(135deg, #1a3a1a, #2a5a2a)' : 'var(--surface)', border: `1px solid ${remaining > 0 && !atMax ? '#4ade80' : 'var(--border)'}`, color: remaining > 0 && !atMax ? '#4ade80' : 'var(--text-dim)', fontWeight: 700 }}
                  disabled={remaining <= 0 || atMax}
                  onClick={shortRestRollDie}>
                  Roll {hd} + {conMod}
                </button>
                <button className="btn" style={{ flex: 1, padding: '8px 16px', fontSize: '14px', background: 'var(--accent)', border: '1px solid var(--gold-dim)', color: 'var(--gold)', fontWeight: 700 }}
                  onClick={shortRestFinish}>
                  {shortRestModal.rolls.length > 0 ? 'Finish Rest' : 'Rest Without Healing'}
                </button>
              </div>

              {atMax && <div style={{ textAlign: 'center', fontSize: '12px', color: '#4ade80', marginTop: '8px' }}>Already at full HP!</div>}
              {remaining <= 0 && !atMax && <div style={{ textAlign: 'center', fontSize: '12px', color: '#f87171', marginTop: '8px' }}>No hit dice remaining!</div>}

              <button onClick={() => setShortRestModal(null)} style={{ display: 'block', margin: '12px auto 0', padding: '4px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '12px' }}>
                Cancel
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
