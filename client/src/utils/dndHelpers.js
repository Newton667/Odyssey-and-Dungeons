import { XP_THRESHOLDS, RARITY_COLORS, CANTRIPS_KNOWN, SPELLS_KNOWN } from './dndConstants';

// ─── Core Helpers ────────────────────────────────────────────────────

export function modVal(score) { return Math.floor((score - 10) / 2); }
export function modStr(score) { const m = modVal(score); return m >= 0 ? `+${m}` : `${m}`; }
export function profBonus(lvl) { return Math.ceil(lvl / 4) + 1; }
export function xpForLevel(lvl) { return XP_THRESHOLDS[Math.min(Math.max(lvl - 1, 0), 19)] || 0; }

// ─── Rarity ──────────────────────────────────────────────────────────

export function rarityColor(r) { return RARITY_COLORS[r] || RARITY_COLORS.common; }
export function rarityBg(r) {
  return r === 'uncommon' ? '#1a2e1a' : r === 'rare' ? '#1a1a3e' : r === 'very-rare' ? '#2e1a3e' : r === 'legendary' ? '#3e2e0a' : r === 'artifact' ? '#3e1a0a' : 'transparent';
}

// ─── HP Bar Color ────────────────────────────────────────────────────

export function hpColor(current, max) {
  const pct = current / max;
  if (pct > 0.5) return 'var(--hp-bar)';
  if (pct > 0.25) return 'var(--hp-low)';
  return 'var(--hp-crit)';
}

// ─── Spell Helpers ───────────────────────────────────────────────────

export function maxSpellLevel(cls, lvl) {
  if (['Bard','Cleric','Druid','Sorcerer','Wizard'].includes(cls)) {
    if (lvl >= 17) return 9; if (lvl >= 15) return 8; if (lvl >= 13) return 7;
    if (lvl >= 11) return 6; if (lvl >= 9) return 5; if (lvl >= 7) return 4;
    if (lvl >= 5) return 3; if (lvl >= 3) return 2; return 1;
  }
  if (cls === 'Warlock') {
    if (lvl >= 9) return 5; if (lvl >= 7) return 4; if (lvl >= 5) return 3;
    if (lvl >= 3) return 2; return 1;
  }
  if (['Paladin','Ranger'].includes(cls)) {
    if (lvl < 2) return 0;
    if (lvl >= 17) return 5; if (lvl >= 13) return 4; if (lvl >= 9) return 3;
    if (lvl >= 5) return 2; return 1;
  }
  if (cls === 'Artificer') {
    if (lvl >= 17) return 5; if (lvl >= 13) return 4; if (lvl >= 9) return 3;
    if (lvl >= 5) return 2; return 1;
  }
  return 0;
}

export function getSpellInfo(cls, lvl, abilityMod, CLASSES) {
  const hasSpells = CLASSES[cls]?.spellcasting;
  if (!hasSpells) return null;
  if (['Paladin','Ranger'].includes(cls) && lvl < 2) return null;

  const idx = Math.min(lvl, 20) - 1;
  const cantrips = CANTRIPS_KNOWN[cls]?.[idx] || 0;
  const maxLvl = maxSpellLevel(cls, lvl);

  if (SPELLS_KNOWN[cls]) {
    return { cantrips, spellsKnown: SPELLS_KNOWN[cls][idx] || 0, type: 'known', maxLevel: maxLvl };
  }
  if (['Cleric','Druid'].includes(cls)) {
    return { cantrips, prepareCount: Math.max(1, abilityMod + lvl), type: 'prepared', maxLevel: maxLvl };
  }
  if (cls === 'Paladin') {
    return { cantrips: 0, prepareCount: Math.max(1, abilityMod + Math.floor(lvl / 2)), type: 'prepared', maxLevel: maxLvl };
  }
  if (cls === 'Wizard') {
    const bookSize = 6 + (lvl - 1) * 2;
    return { cantrips, spellsKnown: bookSize, prepareCount: Math.max(1, abilityMod + lvl), type: 'spellbook', maxLevel: maxLvl };
  }
  if (cls === 'Artificer') {
    return { cantrips, prepareCount: Math.max(1, abilityMod + Math.floor(lvl / 2)), type: 'prepared', maxLevel: maxLvl };
  }
  return { cantrips, spellsKnown: 0, type: 'known', maxLevel: maxLvl };
}

// ─── Armor Helpers ───────────────────────────────────────────────────

export function getArmorCategories(armorProfStr) {
  if (!armorProfStr) return [];
  const s = armorProfStr.toLowerCase();
  const cats = [];
  if (s.includes('all armor') || s.includes('heavy')) cats.push('light', 'medium', 'heavy');
  else {
    if (s.includes('light')) cats.push('light');
    if (s.includes('medium')) cats.push('medium');
  }
  return cats;
}

export function canUseShield(armorProfStr) {
  if (!armorProfStr) return false;
  return armorProfStr.toLowerCase().includes('shield');
}

// ─── Language Helpers ────────────────────────────────────────────────

export function countLangExtras(langArray) {
  return langArray.reduce((n, l) => {
    const low = l.toLowerCase();
    if (low.includes('two extra')) return n + 2;
    if (low.includes('extra')) return n + 1;
    return n;
  }, 0);
}
