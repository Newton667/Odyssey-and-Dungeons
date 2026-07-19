// ─── Multiclass Helpers ───────────────────────────────────────────────
// Normalize single- and multi-class characters into one canonical shape and
// derive combined stats. A single-class character has no `char.classes` array;
// these helpers synthesize one from char.class/subclass/level so every caller
// can treat all characters uniformly. Existing saves keep working untouched.

import { CLASSES, getExtraAttacks } from './classData';
import { HIT_DICE } from './dndConstants';

// Canonical per-class breakdown: [{ class, subclass, level }] (per-class levels).
export function getCharClasses(char) {
  if (!char) return [];
  if (Array.isArray(char.classes) && char.classes.length > 0) {
    return char.classes
      .filter(c => c && c.class)
      .map(c => ({ class: c.class, subclass: c.subclass || '', level: Math.max(1, c.level || 1) }));
  }
  if (!char.class) return [];
  return [{ class: char.class, subclass: char.subclass || '', level: Math.max(1, char.level || 1) }];
}

// Sum of per-class levels (the character's total level).
export function getTotalLevel(char) {
  const cs = getCharClasses(char);
  if (cs.length === 0) return char?.level || 1;
  return cs.reduce((s, c) => s + (c.level || 0), 0);
}

export function isMulticlass(char) {
  return getCharClasses(char).length > 1;
}

// "Fighter 5 / Wizard 3" — optionally with subclass "Fighter (Champion) 5 / …"
export function formatClasses(char, { withSubclass = false } = {}) {
  const cs = getCharClasses(char);
  if (cs.length === 0) return '';
  return cs
    .map(c => `${c.class}${withSubclass && c.subclass ? ` (${c.subclass})` : ''} ${c.level}`)
    .join(' / ');
}

// Per-class hit dice pools merged by die size, largest first: [{ die:'d10', count:5 }, …]
export function getHitDicePools(char) {
  const pools = {};
  for (const c of getCharClasses(char)) {
    const die = CLASSES[c.class]?.hitDice || HIT_DICE[c.class] || 'd8';
    pools[die] = (pools[die] || 0) + (c.level || 0);
  }
  return Object.entries(pools)
    .map(([die, count]) => ({ die, count }))
    .sort((a, b) => parseInt(b.die.slice(1)) - parseInt(a.die.slice(1)));
}

// Compact hit-dice label, e.g. "5d10 + 5d6" or "3d8".
export function formatHitDice(char) {
  const pools = getHitDicePools(char);
  if (pools.length === 0) return '';
  return pools.map(p => `${p.count}${p.die}`).join(' + ');
}

// Extra Attack does NOT stack across classes — take the best single class's value.
export function getMulticlassExtraAttacks(char) {
  let best = 0;
  for (const c of getCharClasses(char)) best = Math.max(best, getExtraAttacks(c.class, c.level));
  return best;
}

// The spellcasting ability for each caster class the character has.
// Returns [{ class, ability }] for classes that actually cast.
export function getSpellcastingClasses(char) {
  const out = [];
  for (const c of getCharClasses(char)) {
    const info = CLASSES[c.class];
    if (info?.spellcasting && info.spellcastingAbility) {
      out.push({ class: c.class, subclass: c.subclass, level: c.level, ability: info.spellcastingAbility });
    }
  }
  return out;
}

// Rebuild the primary/summary fields (class, subclass, level) from a classes
// array so all the single-class display code stays correct. Returns a patch to
// merge into the character. `classes` is [{ class, subclass, level }].
export function syncPrimaryFromClasses(classes) {
  const clean = (classes || []).filter(c => c && c.class && (c.level || 0) > 0);
  const total = clean.reduce((s, c) => s + (c.level || 0), 0);
  const newPB = total <= 4 ? 2 : total <= 8 ? 3 : total <= 12 ? 4 : total <= 16 ? 5 : 6;
  const patch = {
    classes: clean,
    level: total,
    proficiencyBonus: newPB,
  };
  if (clean.length > 0) {
    patch.class = clean[0].class;
    patch.subclass = clean[0].subclass || '';
  }
  return patch;
}
