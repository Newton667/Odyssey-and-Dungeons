import { XP_THRESHOLDS, RARITY_COLORS, CANTRIPS_KNOWN, SPELLS_KNOWN } from './dndConstants';
import { parseDiceFormula } from './diceFormula';   // no imports of its own — no cycle

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

export function maxSpellLevel(cls, lvl, ruleset = '2014') {
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
    // 2024 Paladin/Ranger cast from level 1; 2014 half-casters start at level 2.
    if (lvl < 2) return ruleset === '2024' ? 1 : 0;
    if (lvl >= 17) return 5; if (lvl >= 13) return 4; if (lvl >= 9) return 3;
    if (lvl >= 5) return 2; return 1;
  }
  if (cls === 'Artificer') {
    if (lvl >= 17) return 5; if (lvl >= 13) return 4; if (lvl >= 9) return 3;
    if (lvl >= 5) return 2; return 1;
  }
  return 0;
}

export function getSpellInfo(cls, lvl, abilityMod, CLASSES, ruleset = '2014') {
  const hasSpells = CLASSES[cls]?.spellcasting;
  if (!hasSpells) return null;
  // 2024 Paladin/Ranger gain Spellcasting at level 1; in 2014 they start at level 2.
  const halfCasterStart = ruleset === '2024' ? 1 : 2;
  if (['Paladin','Ranger'].includes(cls) && lvl < halfCasterStart) return null;

  const idx = Math.min(lvl, 20) - 1;
  const cantrips = CANTRIPS_KNOWN[cls]?.[idx] || 0;
  const maxLvl = maxSpellLevel(cls, lvl, ruleset);

  // 2024 Ranger prepares spells (WIS mod + half level) instead of knowing a fixed number.
  const rangerPrepared2024 = ruleset === '2024' && cls === 'Ranger';
  if (SPELLS_KNOWN[cls] && !rangerPrepared2024) {
    return { cantrips, spellsKnown: SPELLS_KNOWN[cls][idx] || 0, type: 'known', maxLevel: maxLvl };
  }
  if (['Cleric','Druid'].includes(cls)) {
    return { cantrips, prepareCount: Math.max(1, abilityMod + lvl), type: 'prepared', maxLevel: maxLvl };
  }
  if (cls === 'Paladin' || rangerPrepared2024) {
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

// ─── Feat Helpers ────────────────────────────────────────────────────

/**
 * Feat arrays hold either name strings or `{name, prereq, desc}` objects from
 * old saves. Always normalise to names before comparing or rendering — a bare
 * `.includes('Magic Initiate')` silently fails on the object form.
 *
 * @returns {string[]} names only; nulls and nameless entries are dropped.
 */
export function normalizeFeatNames(feats) {
  if (!Array.isArray(feats)) return [];
  return feats
    .map(f => (typeof f === 'string' ? f : (f?.name || '')))
    .filter(Boolean);
}

// ─── Weapon Damage Helpers ───────────────────────────────────────────

/**
 * Strip the flat modifier a magic weapon bakes into its damage string.
 *
 * `equipment.json` stores a +1 Longsword as `{damage: "1d8+1", bonus: 1}` — the
 * bonus is in *both* fields. The sheet adds `wpn.bonus` into its own damage
 * modifier, so rolling `damage` raw counts the +1 twice. Sanitise at read time.
 *
 * Only a `[+-]N` that is **not** part of another dice group is removed: multi-
 * group weapons (Flame Tongue `"1d8 + 2d6 fire"`, Oathbow `"1d8 + 3d6"`) must
 * keep both groups.
 *
 * @returns {string|null} the dice-only damage string, or null when the weapon
 *   has no dice at all (Blowgun `"1"`, Net `"—"`).
 */
export function weaponDamageDice(damage) {
  if (typeof damage !== 'string' || !/\d+d\d+/.test(damage)) return null;
  // The negative lookahead is load-bearing — '+ 2d6' is a dice group, not a
  // modifier, and '[\d\s]*d' blocks the backtrack that would strip '+ 1' of '+ 12d6'.
  return damage.replace(/[+-]\s*\d+(?![\d\s]*d)/g, '').trim();
}

/**
 * Build the roll string for a weapon's damage button.
 *
 * The one place the sanitised dice, the sheet's damage modifier and any active
 * weapon-rider die (Hunter's Mark, Hex) are combined — the button's label must
 * render this same string, or the text and the roll disagree.
 *
 * @param {string} damage      `wpn.damage`, e.g. '1d8+1', '1' (Blowgun), '—' (Net)
 * @param {number} dmgBonus    ability mod + weapon bonus + ammo + fighting style
 * @param {string} riderSuffix e.g. '+1d6', or '' when no buff is active
 * @returns {string|null} the roll string, or null when the weapon has no
 *   rollable damage at all. Note `'—'` is truthy but is *not* damage — the
 *   guard is "has dice, or has a number", never raw truthiness.
 */
export function weaponDamageFormula(damage, dmgBonus, riderSuffix = '') {
  const dice = weaponDamageDice(damage);
  if (dice) return `${dice}+${dmgBonus}${riderSuffix}`;
  // No dice, but a flat damage value is still the weapon's OWN damage and must
  // be kept — PHB p.149 lists the Blowgun as "1 piercing", and the ability
  // modifier is added to that, so DEX +2 deals 1 + 2 = 3. Unlike a magic
  // weapon's baked-in +N, a flat value has no `bonus` field to double-count.
  // A weapon with no numeric damage at all (Net, '—') gets no button.
  if (typeof damage === 'string' && /\d/.test(damage)) {
    const flat = parseDiceFormula(damage).staticBonus;
    return `${flat}+${dmgBonus}${riderSuffix}`;
  }
  return null;
}
