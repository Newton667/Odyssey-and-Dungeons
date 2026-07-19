// ─── Limited-Use Class Features ───────────────────────────────────────
// Maps a feature's BASE name to its usage allotment and recharge timing so
// the sheet can show a +/- counter and reset it on the right kind of rest.
//   max:      (classLevel, char, className) => number   (0 = no counter / unlimited)
//   recharge: 'short' | 'long' | (classLevel) => 'short' | 'long'
//   unit:     optional label shown after the count (e.g. "HP" for Lay on Hands)

import { modVal } from './dndHelpers';

const mod = (c, a) => modVal(c?.abilityScores?.[a] ?? 10);

export const FEATURE_USES = {
  // Barbarian
  'Rage': { recharge: 'long', max: (l) => l >= 20 ? 0 : l >= 17 ? 6 : l >= 12 ? 5 : l >= 6 ? 4 : l >= 3 ? 3 : 2 },
  // Bard
  'Bardic Inspiration': { recharge: (l) => (l >= 5 ? 'short' : 'long'), max: (l, c) => Math.max(1, mod(c, 'charisma')) },
  // Cleric / Paladin
  'Channel Divinity': { recharge: 'short', max: (l, c, cls) => (cls === 'Cleric' ? (l >= 18 ? 3 : l >= 6 ? 2 : 1) : 1) },
  'Divine Intervention': { recharge: 'long', max: () => 1 },
  // Druid
  'Wild Shape': { recharge: 'short', max: () => 2 },
  // Fighter
  'Second Wind': { recharge: 'short', max: () => 1 },
  'Action Surge': { recharge: 'short', max: (l) => (l >= 17 ? 2 : 1) },
  'Indomitable': { recharge: 'long', max: (l) => (l >= 17 ? 3 : l >= 13 ? 2 : 1) },
  // Monk
  'Ki': { recharge: 'short', max: (l) => l, label: 'Ki Points' },
  // Paladin
  'Divine Sense': { recharge: 'long', max: (l, c) => 1 + mod(c, 'charisma') },
  'Lay on Hands': { recharge: 'long', max: (l) => l * 5, unit: 'HP' },
  'Cleansing Touch': { recharge: 'long', max: (l, c) => Math.max(1, mod(c, 'charisma')) },
  // Rogue
  'Stroke of Luck': { recharge: 'short', max: () => 1 },
  // Sorcerer
  'Font of Magic': { recharge: 'long', max: (l) => l, label: 'Sorcery Points' },
  // Warlock
  'Eldritch Master': { recharge: 'long', max: () => 1 },
  // Wizard
  'Arcane Recovery': { recharge: 'long', max: () => 1 },
  // Artificer
  'Flash of Genius': { recharge: 'long', max: (l, c) => Math.max(1, mod(c, 'intelligence')) },
};

// Strip "(x/day)", "(1/rest)", "(d6)", level qualifiers → stable base/storage key.
export const baseFeatureName = (n) => (n || '').replace(/\s*\([^)]*\)\s*$/, '').trim();

export function featureUsesConfig(name) {
  return FEATURE_USES[name] || FEATURE_USES[baseFeatureName(name)] || null;
}

// Returns { max, recharge, unit } for a feature the character actually has, or null.
export function computeFeatureUses(name, classLevel, char, className) {
  const cfg = featureUsesConfig(name);
  if (!cfg) return null;
  const max = typeof cfg.max === 'function' ? cfg.max(classLevel || 1, char, className) : cfg.max;
  if (!max || max <= 0) return null;   // 0 = unlimited (e.g. Rage 20) → no counter
  const recharge = typeof cfg.recharge === 'function' ? cfg.recharge(classLevel || 1) : cfg.recharge;
  return { max, recharge, unit: cfg.unit };
}
