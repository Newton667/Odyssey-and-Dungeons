/**
 * Parse a dice shorthand string into dice + a summed static modifier.
 *
 * The single parser behind `DiceContext.rollDice3D` and the character sheet's
 * advantage/disadvantage math, so a formula scores the same everywhere.
 *
 * @param {string|Array} formula  e.g. '2d8', '1d8+2', '1d8 + 2d6 fire+3',
 *                                '1d20+-2', '1' (flat damage), '—' (no damage),
 *                                or an already-built array of {die, sides}
 * @returns {{dice: Array, staticBonus: number, hasDice: boolean, d1Count: number}}
 *   `hasDice` false means there is nothing to throw — the caller should resolve
 *   with `staticBonus` as the total (a Blowgun's `'1'` is 1 damage, not 0).
 *   `d1Count` lets a caller rebuild the d1-only result shape; d1 dice always
 *   roll 1, so they are folded into `staticBonus` and dropped from `dice`.
 */
export function parseDiceFormula(formula) {
  // Array form: already-built dice, pass straight through.
  if (typeof formula !== 'string') {
    return { dice: formula, staticBonus: 0, hasDice: true, d1Count: 0 };
  }

  let staticBonus = 0;
  // `\d*` (not `\d+`) so a countless die like 'd10' — the shape of
  // `CLASSES[cls].hitDice` — parses as one die rather than a flat +10.
  const groups = formula.match(/(\d*)d(\d+)/g);

  if (!groups || groups.length === 0) {
    // No dice — still sum the bare integers, so '1' → 1 and '1+3' → 4.
    // A leading unsigned integer counts, which /[+-]\s*\d+/ alone would miss.
    const nums = formula.match(/[+-]?\s*\d+/g);
    if (nums) for (const n of nums) staticBonus += parseInt(n.replace(/\s/g, ''), 10);
    return { dice: [], staticBonus, hasDice: false, d1Count: 0 };
  }

  let dice = [];
  for (const g of groups) {
    const m = g.match(/(\d*)d(\d+)/);
    const count = Number(m[1] || 1);   // 'd10' → 1
    const sides = Number(m[2]);
    const die = `d${sides}`;
    for (let i = 0; i < count; i++) dice.push({ die, sides });
  }

  // Sum ALL static modifiers: +5+3-2 = +6. Strip the dice groups first so the
  // digits inside them are never mistaken for a modifier.
  const stripped = formula.replace(/\d*d\d+/g, '');
  const modMatches = stripped.match(/[+-]\s*\d+/g);
  if (modMatches) {
    for (const mod of modMatches) staticBonus += parseInt(mod.replace(/\s/g, ''), 10);
  }

  // d1 dice are flat damage (always 1) — fold into the bonus, don't render them.
  const d1Count = dice.filter(d => d.sides === 1).length;
  if (d1Count > 0) {
    staticBonus += d1Count;
    dice = dice.filter(d => d.sides !== 1);
  }

  return { dice, staticBonus, hasDice: true, d1Count };
}
