// ─── Rollable Class Features ──────────────────────────────────────────
// Convenience dice for class features that involve a roll (healing, damage,
// or a granted die), so the sheet can show a roll button next to them.
//   featureRoll(name, ctx) → { formula, type, label, note? } | null
//   ctx: { classLevel }   (level in the feature's source class)
//   type: 'healing' | 'damage' | 'utility'  (drives the roll button colour)

import { baseFeatureName } from './featureUses';

// Bard die scales at 5/10/15; Song of Rest at 9/13/17.
const bardInspirationDie = (l) => (l >= 15 ? 12 : l >= 10 ? 10 : l >= 5 ? 8 : 6);
const songOfRestDie = (l) => (l >= 17 ? 12 : l >= 13 ? 10 : l >= 9 ? 8 : 6);

export function featureRoll(name, ctx = {}) {
  const lvl = ctx.classLevel || 1;
  switch (baseFeatureName(name)) {
    case 'Second Wind':
      return { formula: `1d10+${lvl}`, type: 'healing', label: 'Second Wind' };
    case 'Sneak Attack':
      // 1d6 at level 1-2, +1d6 every two levels → ceil(level / 2) d6.
      return { formula: `${Math.ceil(lvl / 2)}d6`, type: 'damage', label: 'Sneak Attack' };
    case 'Divine Smite':
      return { formula: '2d8', type: 'damage', label: 'Divine Smite', note: '2d8 radiant on a 1st-level slot (+1d8 per higher slot level, +1d8 vs Undead/Fiend, max 5d8).' };
    case 'Bardic Inspiration':
      return { formula: `1d${bardInspirationDie(lvl)}`, type: 'utility', label: 'Bardic Inspiration', note: 'Give this die to another creature to add to an attack, check, or save.' };
    case 'Song of Rest':
      return { formula: `1d${songOfRestDie(lvl)}`, type: 'healing', label: 'Song of Rest', note: 'Extra healing to each ally who spends Hit Dice during a short rest.' };
    default:
      return null;
  }
}
