import { describe, it, expect } from 'vitest';
import { parseDiceFormula } from './diceFormula';

// parseDiceFormula is the single parser behind DiceContext's roll and the
// sheet's advantage/disadvantage math. It must sum *every* static modifier
// (including negatives) and must not report 0 for a flat-damage weapon.

describe('parseDiceFormula', () => {
  it('sums every static modifier alongside the dice', () => {
    const r = parseDiceFormula('1d8+1+4');
    expect(r.dice).toEqual([{ die: 'd8', sides: 8 }]);
    expect(r.staticBonus).toBe(5);
    expect(r.hasDice).toBe(true);
  });

  it('keeps a negative modifier written as +-N (the advantage/disadvantage bug)', () => {
    const r = parseDiceFormula('1d20+-2');
    expect(r.dice).toEqual([{ die: 'd20', sides: 20 }]);
    expect(r.staticBonus).toBe(-2);
  });

  it('reads a plain positive modifier', () => {
    expect(parseDiceFormula('1d20+2').staticBonus).toBe(2);
  });

  it('keeps every dice group in a multi-group formula', () => {
    const r = parseDiceFormula('1d8 + 2d6 fire+3');
    expect(r.dice.length).toBe(3);
    expect(r.dice.filter(d => d.sides === 8).length).toBe(1);
    expect(r.dice.filter(d => d.sides === 6).length).toBe(2);
    expect(r.staticBonus).toBe(3);
  });

  it('expands a dice count into one entry per die', () => {
    const r = parseDiceFormula('2d6');
    expect(r.dice.length).toBe(2);
    expect(r.staticBonus).toBe(0);
    expect(r.hasDice).toBe(true);
  });

  it('sums bare integers when there are no dice at all', () => {
    const r = parseDiceFormula('1+3');
    expect(r.hasDice).toBe(false);
    expect(r.dice).toEqual([]);
    expect(r.staticBonus).toBe(4);
  });

  it('scores a lone flat damage value (Blowgun) as its number, not 0', () => {
    const r = parseDiceFormula('1');
    expect(r.hasDice).toBe(false);
    expect(r.staticBonus).toBe(1);
  });

  it('treats an em dash (Net) as no damage at all', () => {
    const r = parseDiceFormula('—');
    expect(r.hasDice).toBe(false);
    expect(r.staticBonus).toBe(0);
    expect(r.dice).toEqual([]);
  });

  it('folds d1 dice into the static bonus and reports d1Count', () => {
    const r = parseDiceFormula('2d1+1');
    expect(r.dice).toEqual([]);
    expect(r.d1Count).toBe(2);
    expect(r.staticBonus).toBe(3);
    expect(r.hasDice).toBe(true);
  });

  it('sums multiple modifiers of mixed sign', () => {
    expect(parseDiceFormula('2d20+5-2').staticBonus).toBe(3);
  });

  it('passes an array of dice straight through', () => {
    const arr = [{ die: 'd6', sides: 6 }];
    const r = parseDiceFormula(arr);
    expect(r.dice).toBe(arr);
    expect(r.staticBonus).toBe(0);
    expect(r.hasDice).toBe(true);
    expect(r.d1Count).toBe(0);
  });

  it('does not throw on empty or missing input', () => {
    expect(() => parseDiceFormula('')).not.toThrow();
    expect(() => parseDiceFormula(undefined)).not.toThrow();
    expect(parseDiceFormula('').hasDice).toBe(false);
  });
});

// ── Regression: bare die strings (no leading count) ──────────────────
// `CLASSES[cls].hitDice` is 'd10' — no count. The dice regex required a digit
// before the `d`, so 'd10' parsed as a flat +10 and the level-up HP roll
// resolved instantly at maximum without throwing a die.
describe('parseDiceFormula — bare die strings', () => {
  it('treats a countless die as a single die, not a modifier', () => {
    const r = parseDiceFormula('d10');
    expect(r.hasDice).toBe(true);
    expect(r.dice).toEqual([{ die: 'd10', sides: 10 }]);
    expect(r.staticBonus).toBe(0);
  });

  it('handles every class hit die', () => {
    for (const [f, sides] of [['d6', 6], ['d8', 8], ['d10', 10], ['d12', 12]]) {
      const r = parseDiceFormula(f);
      expect(r.hasDice).toBe(true);
      expect(r.dice).toEqual([{ die: `d${sides}`, sides }]);
      expect(r.staticBonus).toBe(0);
    }
  });

  it('still applies modifiers to a bare die', () => {
    const r = parseDiceFormula('d10+2');
    expect(r.dice).toEqual([{ die: 'd10', sides: 10 }]);
    expect(r.staticBonus).toBe(2);
  });

  it('does not change explicit counts', () => {
    expect(parseDiceFormula('1d10').dice).toHaveLength(1);
    expect(parseDiceFormula('2d6').dice).toHaveLength(2);
  });
});
