import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const PRESETS = {
  'Dark Fantasy': {
    '--bg-dark': '#1a1209', '--bg-gradient': '#2a1a05', '--bg-card': '#231a0e',
    '--bg-card-hover': '#2e2210', '--border': '#5c3d1e', '--gold': '#c9a227',
    '--gold-light': '#e8c547', '--gold-dim': '#8a6f1a', '--text': '#e8d5b0',
    '--text-dim': '#a08060', '--accent': '#7b3f00', '--surface': '#1e1509',
    '--nav-bg': '#0d0800', '--input-bg': '#120d05',
  },
  'Arcane': {
    '--bg-dark': '#0e0a1a', '--bg-gradient': '#1a1030', '--bg-card': '#160f26',
    '--bg-card-hover': '#1e1530', '--border': '#3a2060', '--gold': '#a060e0',
    '--gold-light': '#c090ff', '--gold-dim': '#6030a0', '--text': '#d0c0f0',
    '--text-dim': '#8060a0', '--accent': '#2a0a5a', '--surface': '#120d22',
    '--nav-bg': '#080514', '--input-bg': '#0c0818',
  },
  'Emerald': {
    '--bg-dark': '#091409', '--bg-gradient': '#122012', '--bg-card': '#0f1e0e',
    '--bg-card-hover': '#152816', '--border': '#1e5c1a', '--gold': '#4caf50',
    '--gold-light': '#80e080', '--gold-dim': '#2a7a2a', '--text': '#c8e8c0',
    '--text-dim': '#60a060', '--accent': '#0a3008', '--surface': '#0c1a0c',
    '--nav-bg': '#060e06', '--input-bg': '#080f08',
  },
  'Infernal': {
    '--bg-dark': '#1a0808', '--bg-gradient': '#2e0e08', '--bg-card': '#260e0e',
    '--bg-card-hover': '#341212', '--border': '#6a1a1a', '--gold': '#ff6b35',
    '--gold-light': '#ff9060', '--gold-dim': '#c04020', '--text': '#f0d0c0',
    '--text-dim': '#a06050', '--accent': '#5a1000', '--surface': '#1e0a0a',
    '--nav-bg': '#100404', '--input-bg': '#140606',
  },
  'Frost': {
    '--bg-dark': '#0a0f1a', '--bg-gradient': '#101828', '--bg-card': '#0f1626',
    '--bg-card-hover': '#161e30', '--border': '#1a3a6a', '--gold': '#60b0e0',
    '--gold-light': '#90d0ff', '--gold-dim': '#2a7aaa', '--text': '#c0d8f0',
    '--text-dim': '#5080a0', '--accent': '#0a2040', '--surface': '#0c1220',
    '--nav-bg': '#060a14', '--input-bg': '#080d18',
  },
  'Necromancer': {
    '--bg-dark': '#0a0a0e', '--bg-gradient': '#101018', '--bg-card': '#111118',
    '--bg-card-hover': '#181820', '--border': '#2a2a40', '--gold': '#7aff7a',
    '--gold-light': '#a0ffa0', '--gold-dim': '#3a8a3a', '--text': '#c0d0c0',
    '--text-dim': '#507050', '--accent': '#0a1a0a', '--surface': '#0d0d14',
    '--nav-bg': '#060608', '--input-bg': '#090910',
  },
  'Parchment': {
    '--bg-dark': '#f2e4c4', '--bg-gradient': '#fdf5e0', '--bg-card': '#e8d8b0',
    '--bg-card-hover': '#dfd0a8', '--border': '#a08050', '--gold': '#5a2d06',
    '--gold-light': '#7a3e0a', '--gold-dim': '#8a5520', '--text': '#1e1206',
    '--text-dim': '#5a3820', '--accent': '#d4b882', '--surface': '#ede0bc',
    '--nav-bg': '#d8c898', '--input-bg': '#e4d4a8',
  },
  'Midnight': {
    '--bg-dark': '#080c18', '--bg-gradient': '#0e1428', '--bg-card': '#0e1424',
    '--bg-card-hover': '#141c2e', '--border': '#1e2a4a', '--gold': '#e8b840',
    '--gold-light': '#ffda70', '--gold-dim': '#a07820', '--text': '#d0d8f0',
    '--text-dim': '#6070a0', '--accent': '#101830', '--surface': '#0c1020',
    '--nav-bg': '#060810', '--input-bg': '#0a0e1a',
  },
  'Blood Moon': {
    '--bg-dark': '#120408', '--bg-gradient': '#1e0610', '--bg-card': '#1a0610',
    '--bg-card-hover': '#240810', '--border': '#6a0a20', '--gold': '#e03060',
    '--gold-light': '#ff6080', '--gold-dim': '#a01840', '--text': '#f0c0c8',
    '--text-dim': '#a05060', '--accent': '#4a0814', '--surface': '#160508',
    '--nav-bg': '#0c0206', '--input-bg': '#0e0306',
  },
  'Ocean Depths': {
    '--bg-dark': '#071318', '--bg-gradient': '#0e2232', '--bg-card': '#0d1e28',
    '--bg-card-hover': '#122430', '--border': '#1a4a5a', '--gold': '#20c0d0',
    '--gold-light': '#60e0f0', '--gold-dim': '#10808a', '--text': '#b0e0f0',
    '--text-dim': '#4080a0', '--accent': '#083040', '--surface': '#0a1820',
    '--nav-bg': '#040e12', '--input-bg': '#081016',
  },
  'Rose': {
    '--bg-dark': '#120610', '--bg-gradient': '#1e0c1e', '--bg-card': '#1a0a16',
    '--bg-card-hover': '#241020', '--border': '#602050', '--gold': '#f060b0',
    '--gold-light': '#ff90d0', '--gold-dim': '#a03080', '--text': '#f0c0e0',
    '--text-dim': '#a06090', '--accent': '#3a0830', '--surface': '#160814',
    '--nav-bg': '#0c040c', '--input-bg': '#0e0610',
  },
  'Galaxy': {
    '--bg-dark': '#04050e', '--bg-gradient': '#080c1c', '--bg-card': '#080a18',
    '--bg-card-hover': '#0e1022', '--border': '#1a1e48', '--gold': '#e8e8ff',
    '--gold-light': '#ffffff', '--gold-dim': '#9090c0', '--text': '#e0e8ff',
    '--text-dim': '#7080b0', '--accent': '#0c1030', '--surface': '#060816',
    '--nav-bg': '#02040c', '--input-bg': '#060810',
  },
  'Toxic': {
    '--bg-dark': '#060c04', '--bg-gradient': '#0c1808', '--bg-card': '#0a1206',
    '--bg-card-hover': '#101c08', '--border': '#2a5010', '--gold': '#b8f000',
    '--gold-light': '#d8ff40', '--gold-dim': '#788000', '--text': '#d0f090',
    '--text-dim': '#609030', '--accent': '#0c2004', '--surface': '#081006',
    '--nav-bg': '#040a02', '--input-bg': '#060e04',
  },
  'Autumn': {
    '--bg-dark': '#110a10', '--bg-gradient': '#1c1018', '--bg-card': '#191015',
    '--bg-card-hover': '#221620', '--border': '#5a3050', '--gold': '#e87830',
    '--gold-light': '#ffa050', '--gold-dim': '#b04c10', '--text': '#f0cca8',
    '--text-dim': '#a07060', '--accent': '#401030', '--surface': '#150c14',
    '--nav-bg': '#0c060c', '--input-bg': '#0e0810',
  },
  'Monochrome': {
    '--bg-dark': '#0c0c0c', '--bg-gradient': '#181818', '--bg-card': '#141414',
    '--bg-card-hover': '#1e1e1e', '--border': '#3c3c3c', '--gold': '#c0c0c0',
    '--gold-light': '#e8e8e8', '--gold-dim': '#707070', '--text': '#d8d8d8',
    '--text-dim': '#707070', '--accent': '#242424', '--surface': '#101010',
    '--nav-bg': '#080808', '--input-bg': '#0e0e0e',
  },
  'Synthwave': {
    '--bg-dark': '#0d0221', '--bg-gradient': '#1a0438', '--bg-card': '#130330',
    '--bg-card-hover': '#1c0542', '--border': '#6a0dad', '--gold': '#ff2d78',
    '--gold-light': '#ff6eb4', '--gold-dim': '#b01050', '--text': '#f0e0ff',
    '--text-dim': '#9060c0', '--accent': '#2a0060', '--surface': '#100228',
    '--nav-bg': '#080116', '--input-bg': '#0f021e',
  },
  'Vaporwave': {
    '--bg-dark': '#1a0a2e', '--bg-gradient': '#2a1050', '--bg-card': '#211040',
    '--bg-card-hover': '#2c1858', '--border': '#b967ff', '--gold': '#01cdfe',
    '--gold-light': '#05ffa1', '--gold-dim': '#0090b0', '--text': '#ffe6ff',
    '--text-dim': '#c080d0', '--accent': '#3a0060', '--surface': '#180838',
    '--nav-bg': '#10051e', '--input-bg': '#160730',
  },
};

export const DICE_PRESETS = {
  // ── Matching UI themes ──
  'Dark Fantasy':  { bodyColor: '#3a2a10', metalness: 0.7,  roughness: 0.3,  emissive: '#1a0f05', textColor: '#e8d5b0', edgeColor: '#c9a227', glowColor: '#c9a227', numberScale: 1.1 },
  'Arcane':        { bodyColor: '#2a1040', metalness: 0.7,  roughness: 0.3,  emissive: '#100820', textColor: '#d0c0f0', edgeColor: '#6030a0', glowColor: '#a060e0', numberScale: 1.1 },
  'Emerald':       { bodyColor: '#0a2a10', metalness: 0.7,  roughness: 0.3,  emissive: '#041008', textColor: '#c8e8c0', edgeColor: '#1e5c1a', glowColor: '#4caf50', numberScale: 1.1 },
  'Infernal':      { bodyColor: '#3a1008', metalness: 0.7,  roughness: 0.3,  emissive: '#1a0604', textColor: '#f0d0c0', edgeColor: '#c04020', glowColor: '#ff6b35', numberScale: 1.1 },
  'Frost':         { bodyColor: '#1a3050', metalness: 0.6,  roughness: 0.25, emissive: '#081828', textColor: '#c0d8f0', edgeColor: '#2a7aaa', glowColor: '#60b0e0', numberScale: 1.1 },
  'Necromancer':   { bodyColor: '#111118', metalness: 0.8,  roughness: 0.25, emissive: '#050508', textColor: '#c0d0c0', edgeColor: '#2a2a40', glowColor: '#7aff7a', numberScale: 1.1 },
  'Parchment':     { bodyColor: '#c8b890', metalness: 0.2,  roughness: 0.7,  emissive: '#403020', textColor: '#2a1808', edgeColor: '#c8a870', glowColor: '#7a3e0a', numberScale: 1.1 },
  'Midnight':      { bodyColor: '#0e1424', metalness: 0.7,  roughness: 0.3,  emissive: '#060810', textColor: '#d0d8f0', edgeColor: '#1e2a4a', glowColor: '#e8b840', numberScale: 1.1 },
  'Blood Moon':    { bodyColor: '#2a0610', metalness: 0.7,  roughness: 0.3,  emissive: '#100308', textColor: '#f0c0c8', edgeColor: '#6a0a20', glowColor: '#e03060', numberScale: 1.1 },
  'Ocean Depths':  { bodyColor: '#0d1e28', metalness: 0.6,  roughness: 0.3,  emissive: '#061018', textColor: '#b0e0f0', edgeColor: '#1a4a5a', glowColor: '#20c0d0', numberScale: 1.1 },
  'Rose':          { bodyColor: '#2a0a20', metalness: 0.6,  roughness: 0.3,  emissive: '#100510', textColor: '#f0c0e0', edgeColor: '#602050', glowColor: '#f060b0', numberScale: 1.1 },
  'Galaxy':        { bodyColor: '#080a18', metalness: 0.8,  roughness: 0.15, emissive: '#040510', textColor: '#e0e8ff', edgeColor: '#1a1e48', glowColor: '#e8e8ff', numberScale: 1.1 },
  'Toxic':         { bodyColor: '#0a1206', metalness: 0.7,  roughness: 0.3,  emissive: '#040a02', textColor: '#d0f090', edgeColor: '#2a5010', glowColor: '#b8f000', numberScale: 1.1 },
  'Autumn':        { bodyColor: '#221015', metalness: 0.6,  roughness: 0.35, emissive: '#100808', textColor: '#f0cca8', edgeColor: '#5a3050', glowColor: '#e87830', numberScale: 1.1 },
  'Monochrome':    { bodyColor: '#1a1a1a', metalness: 0.5,  roughness: 0.4,  emissive: '#0a0a0a', textColor: '#d8d8d8', edgeColor: '#3c3c3c', glowColor: '#c0c0c0', numberScale: 1.1 },
  'Synthwave':     { bodyColor: '#4a1068', metalness: 0.7,  roughness: 0.25, emissive: '#2a0840', textColor: '#f0e0ff', edgeColor: '#6a0dad', glowColor: '#ff2d78', numberScale: 1.1 },
  'Vaporwave':     { bodyColor: '#5a2890', metalness: 0.6,  roughness: 0.3,  emissive: '#2a1050', textColor: '#ffe6ff', edgeColor: '#b967ff', glowColor: '#01cdfe', numberScale: 1.1 },
  // ── Extra styles ──
  'Silver Steel':  { bodyColor: '#4a4a50', metalness: 0.8,  roughness: 0.2,  emissive: '#1a1a20', textColor: '#e8eef5', edgeColor: '#8899aa', glowColor: '#b0c4de', numberScale: 1.1 },
  'Obsidian':      { bodyColor: '#101010', metalness: 0.9,  roughness: 0.15, emissive: '#050505', textColor: '#ff4444', edgeColor: '#440000', glowColor: '#ff2020', numberScale: 1.1 },
  'Bone':          { bodyColor: '#c8b890', metalness: 0.2,  roughness: 0.7,  emissive: '#403020', textColor: '#1a1008', edgeColor: '#a09070', glowColor: '#8a6a2a', numberScale: 1.1 },
  'Copper':        { bodyColor: '#5a3020', metalness: 0.85, roughness: 0.2,  emissive: '#2a1810', textColor: '#ffe0c0', edgeColor: '#a06030', glowColor: '#d08040', numberScale: 1.1 },
  'Crystal':       { bodyColor: '#2a3040', metalness: 0.3,  roughness: 0.1,  emissive: '#101828', textColor: '#ffffff', edgeColor: '#5060a0', glowColor: '#e0e0ff', numberScale: 1.1 },
  'Classic Red':   { bodyColor: '#8b1a1a', metalness: 0.15, roughness: 0.6,  emissive: '#2a0808', textColor: '#ffffff', edgeColor: '#8b1a1a', glowColor: '#ff4040', numberScale: 1.1 },
  'Classic Blue':  { bodyColor: '#1a3a8b', metalness: 0.15, roughness: 0.6,  emissive: '#081028', textColor: '#ffffff', edgeColor: '#1a3a8b', glowColor: '#4080ff', numberScale: 1.1 },
  'Classic Black': { bodyColor: '#1a1a1a', metalness: 0.15, roughness: 0.6,  emissive: '#080808', textColor: '#ffffff', edgeColor: '#1a1a1a', glowColor: '#aaaaaa', numberScale: 1.1 },
  'Classic Green': { bodyColor: '#1a6a2a', metalness: 0.15, roughness: 0.6,  emissive: '#082010', textColor: '#ffffff', edgeColor: '#1a6a2a', glowColor: '#40e060', numberScale: 1.1 },
};

const THEME_KEY = 'ond-theme';
const CUSTOM_KEY = 'ond-custom-presets';
const DICE_THEME_KEY = 'ond-dice-theme';
const CUSTOM_DICE_KEY = 'ond-custom-dice-presets';

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function applyVars(vars) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  const bgDark = vars['--bg-dark'] || '#1a1209';
  const bgGrad = vars['--bg-gradient'] || bgDark;
  document.body.style.backgroundImage = `radial-gradient(ellipse at top, ${bgGrad} 0%, ${bgDark} 60%), url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%235c3d1e' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;
  document.body.style.backgroundColor = bgDark;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const saved = readStorage(THEME_KEY, {});
  const [preset, setPreset] = useState(() => {
    const p = saved.preset;
    return (p && (PRESETS[p] || p === '__custom__')) ? p : 'Dark Fantasy';
  });
  const [overrides, setOverrides] = useState(() => saved.overrides || {});
  const [activeCustomName, setActiveCustomName] = useState(() => saved.activeCustomName || null);
  const [customPresets, setCustomPresets] = useState(() => readStorage(CUSTOM_KEY, {}));
  const [diceTheme, setDiceThemeState] = useState(() => readStorage(DICE_THEME_KEY, { name: 'Dark Fantasy', ...DICE_PRESETS['Dark Fantasy'] }));
  const [customDicePresets, setCustomDicePresets] = useState(() => readStorage(CUSTOM_DICE_KEY, {}));

  useEffect(() => {
    const base = PRESETS[preset] || PRESETS['Dark Fantasy'];
    applyVars({ ...base, ...overrides });
  }, [preset, overrides]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, JSON.stringify({ preset, overrides, activeCustomName }));
  }, [preset, overrides, activeCustomName]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(customPresets));
  }, [customPresets]);

  useEffect(() => {
    localStorage.setItem(DICE_THEME_KEY, JSON.stringify(diceTheme));
  }, [diceTheme]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_DICE_KEY, JSON.stringify(customDicePresets));
  }, [customDicePresets]);

  const applyPreset = useCallback((name) => {
    setPreset(name);
    setOverrides({});
    setActiveCustomName(null);
  }, []);

  const applyCustomPreset = useCallback((name, vars) => {
    setPreset('__custom__');
    setOverrides(vars);
    setActiveCustomName(name);
  }, []);

  const saveCustomPreset = useCallback((name, vars) => {
    setCustomPresets(prev => ({ ...prev, [name]: vars }));
  }, []);

  const deleteCustomPreset = useCallback((name) => {
    setCustomPresets(prev => { const n = { ...prev }; delete n[name]; return n; });
    setActiveCustomName(prev => prev === name ? null : prev);
  }, []);

  const setVar = useCallback((key, value) => {
    setOverrides(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetVar = useCallback((key) => {
    setOverrides(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const resetOverrides = useCallback(() => setOverrides({}), []);

  const setDiceTheme = useCallback((name) => {
    const vars = DICE_PRESETS[name];
    if (vars) setDiceThemeState({ name, ...vars });
  }, []);

  const setDiceThemeCustom = useCallback((name, vars) => {
    setDiceThemeState({ name, ...vars });
  }, []);

  const setDiceThemeVar = useCallback((key, value) => {
    setDiceThemeState(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveCustomDicePreset = useCallback((name, vars) => {
    setCustomDicePresets(prev => ({ ...prev, [name]: vars }));
  }, []);

  const deleteCustomDicePreset = useCallback((name) => {
    setCustomDicePresets(prev => { const n = { ...prev }; delete n[name]; return n; });
  }, []);

  const currentVars = { ...(PRESETS[preset] || PRESETS['Dark Fantasy']), ...overrides };

  return (
    <ThemeContext.Provider value={{
      preset, overrides, currentVars, customPresets, activeCustomName,
      applyPreset, applyCustomPreset,
      saveCustomPreset, deleteCustomPreset,
      setVar, resetVar, resetOverrides,
      diceTheme, setDiceTheme, setDiceThemeCustom, setDiceThemeVar,
      customDicePresets, saveCustomDicePreset, deleteCustomDicePreset,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
