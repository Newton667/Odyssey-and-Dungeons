import { describe, it, expect } from 'vitest';
import { modVal, profBonus, maxSpellLevel, weaponDamageDice, weaponDamageFormula, normalizeFeatNames, weaponRangeText, cantripDamage, cantripTierBonus } from './dndHelpers';
import { parseDiceFormula } from './diceFormula';

// Seed test suite — also the reference pattern for tests written by /execute.
// Target the pure rules helpers in src/utils/: they hold the D&D math, take plain
// inputs, and return plain values, so they can be asserted exactly.

describe('modVal', () => {
  it('derives the ability modifier as floor((score - 10) / 2)', () => {
    expect(modVal(10)).toBe(0);
    expect(modVal(11)).toBe(0);   // odd scores round down
    expect(modVal(16)).toBe(3);
    expect(modVal(20)).toBe(5);
  });

  it('handles scores below 10 as negative modifiers', () => {
    expect(modVal(8)).toBe(-1);
    expect(modVal(1)).toBe(-5);
  });
});

describe('profBonus', () => {
  it('follows the 5e proficiency table at every tier boundary', () => {
    expect(profBonus(1)).toBe(2);
    expect(profBonus(4)).toBe(2);
    expect(profBonus(5)).toBe(3);   // tier boundary
    expect(profBonus(8)).toBe(3);
    expect(profBonus(9)).toBe(4);
    expect(profBonus(13)).toBe(5);
    expect(profBonus(17)).toBe(6);
    expect(profBonus(20)).toBe(6);
  });
});

describe('maxSpellLevel — ruleset differences', () => {
  it('gives 2014 half-casters no spells at level 1', () => {
    expect(maxSpellLevel('Paladin', 1, '2014')).toBe(0);
    expect(maxSpellLevel('Ranger', 1, '2014')).toBe(0);
  });

  it('gives 2024 half-casters 1st-level spells at level 1', () => {
    expect(maxSpellLevel('Paladin', 1, '2024')).toBe(1);
    expect(maxSpellLevel('Ranger', 1, '2024')).toBe(1);
  });

  it('matches the full-caster progression', () => {
    expect(maxSpellLevel('Wizard', 1)).toBe(1);
    expect(maxSpellLevel('Wizard', 5)).toBe(3);
    expect(maxSpellLevel('Wizard', 17)).toBe(9);
  });
});

describe('weaponDamageDice', () => {
  it('strips the magic bonus baked into a damage string', () => {
    // equipment.json stores +1 Longsword as {damage: "1d8+1", bonus: 1} — the
    // sheet adds wpn.bonus separately, so the baked-in +N must come off first.
    expect(weaponDamageDice('1d8+1')).toBe('1d8');
    expect(weaponDamageDice('1d8+2')).toBe('1d8');
    expect(weaponDamageDice('2d6+1')).toBe('2d6');
  });

  it('leaves a mundane damage string alone', () => {
    expect(weaponDamageDice('1d8')).toBe('1d8');
  });

  it('keeps every dice group on multi-group weapons', () => {
    expect(weaponDamageDice('1d8 + 2d6 fire')).toBe('1d8 + 2d6 fire'); // Flame Tongue
    expect(weaponDamageDice('1d8 + 3d6')).toBe('1d8 + 3d6');           // Oathbow
    expect(weaponDamageDice('1d8 + 1d6 cold')).toBe('1d8 + 1d6 cold'); // Frost Brand
  });

  it('returns null when there are no dice at all', () => {
    expect(weaponDamageDice('1')).toBe(null);   // Blowgun
    expect(weaponDamageDice('—')).toBe(null);   // Net (em dash, U+2014)
    expect(weaponDamageDice(undefined)).toBe(null);
    expect(weaponDamageDice('')).toBe(null);
  });
});

describe('weaponDamageFormula', () => {
  // STR 16 (+3) with a +1 weapon ⇒ dmgBonus 4 (the plan's worked example).
  it('counts a magic weapon bonus once, not twice', () => {
    // Today's `${wpn.damage}+${dmgBonus}` produces '1d8+1+4' — average 13 instead of 12.
    expect(weaponDamageFormula('1d8+1', 4)).toBe('1d8+4');
  });

  it('leaves a mundane weapon unchanged', () => {
    expect(weaponDamageFormula('1d8', 4)).toBe('1d8+4');
  });

  it('makes the two grips agree on a versatile magic weapon', () => {
    expect(weaponDamageFormula('1d10+1', 4)).toBe('1d10+4');
    expect(parseDiceFormula(weaponDamageFormula('1d10+1', 4)).staticBonus)
      .toBe(parseDiceFormula(weaponDamageFormula('1d8+1', 4)).staticBonus);
  });

  it('keeps both dice groups on a multi-group weapon', () => {
    expect(weaponDamageFormula('1d8 + 2d6 fire', 3)).toBe('1d8 + 2d6 fire+3');
  });

  it("keeps a flat-damage weapon's own base damage and adds the modifier", () => {
    // PHB p.149: the Blowgun's damage is a flat '1'. The ability modifier is
    // ADDED to the weapon's damage, so DEX +2 deals 1 + 2 = 3, not 2. That '1'
    // is real damage — unlike a magic weapon's baked-in +N it has no `bonus`
    // field, so there is nothing to double-count against.
    expect(weaponDamageFormula('1', 2)).toBe('1+2');   // Blowgun, DEX +2 → 3
    expect(weaponDamageFormula('1', 0)).toBe('1+0');   // +0 mod still deals its 1
    expect(weaponDamageFormula('5', 3)).toBe('5+3');   // homebrew flat weapon
  });

  it('gives a weapon with no damage value no button at all', () => {
    expect(weaponDamageFormula('—', 2)).toBe(null);  // Net — em dash is truthy, but not damage
    expect(weaponDamageFormula(undefined, 3)).toBe(null);
    expect(weaponDamageFormula('', 3)).toBe(null);
  });

  it('appends a weapon-rider die after the bonus', () => {
    expect(weaponDamageFormula('1d8+1', 4, '+1d6')).toBe('1d8+4+1d6');
    expect(weaponDamageFormula('1', 2, '+1d6')).toBe('1+2+1d6');
  });

  it('round-trips through the dice parser at the right total', () => {
    expect(parseDiceFormula(weaponDamageFormula('1d8+1', 4)).staticBonus).toBe(4);
    const flat = parseDiceFormula(weaponDamageFormula('1', 2));
    expect(flat.staticBonus).toBe(3);   // 1 base + 2 mod
    expect(flat.hasDice).toBe(false);
  });
});

describe('normalizeFeatNames', () => {
  it('passes plain string feats through', () => {
    expect(normalizeFeatNames(['Alert', 'Magic Initiate'])).toEqual(['Alert', 'Magic Initiate']);
  });

  it('extracts the name from feat objects stored by old saves', () => {
    expect(normalizeFeatNames([{ name: 'Magic Initiate', prereq: '', desc: 'Choose a class…' }]))
      .toEqual(['Magic Initiate']);
  });

  it('drops nulls and nameless objects without throwing', () => {
    expect(normalizeFeatNames(['Alert', { name: 'Magic Initiate' }, null, undefined, {}]))
      .toEqual(['Alert', 'Magic Initiate']);
  });

  it('returns an empty array for missing input', () => {
    expect(normalizeFeatNames(undefined)).toEqual([]);
    expect(normalizeFeatNames(null)).toEqual([]);
  });

  it("satisfies the editor picker's visibility condition for object feats", () => {
    expect(normalizeFeatNames([{ name: 'Magic Initiate' }]).includes('Magic Initiate')).toBe(true);
  });

  it('only ever returns strings', () => {
    expect(normalizeFeatNames([{ name: 'Alert' }]).every(f => typeof f === 'string')).toBe(true);
  });
});

// The Actions-row range string. equipment.json stores ammunition weapons as
// "ammunition (150/600)" — 14 entries carry an `ammunition (` property — and the
// old predicate matched only 'range' or 'thrown', so the .find() always missed
// and every bow, crossbow and sling fell through to the hardcoded '80/320 ft.'

describe('weaponRangeText', () => {
  it('finds the ammunition parenthetical instead of falling back', () => {
    expect(weaponRangeText(['ammunition (150/600)', 'two-handed', 'heavy'], true)).toBe('ammunition (150/600)');
    expect(weaponRangeText(['ammunition (30/120)'], true)).toBe('ammunition (30/120)');   // Sling
  });

  it('does not regress the thrown branch', () => {
    expect(weaponRangeText(['thrown (20/60)', 'light'], false)).toBe('thrown (20/60)');   // Handaxe
  });

  it('falls back to melee reach for a weapon with no range property', () => {
    expect(weaponRangeText(['finesse', 'light'], false)).toBe('5 ft.');                   // Shortsword
    expect(weaponRangeText([], false)).toBe('5 ft.');                                     // Longsword
  });

  it('keeps the ranged fallback for a ranged weapon with no parenthetical', () => {
    expect(weaponRangeText([], true)).toBe('80/320 ft.');
  });

  it('handles the optional-chain case where properties is undefined', () => {
    expect(weaponRangeText(undefined, false)).toBe('5 ft.');
    expect(weaponRangeText(undefined, true)).toBe('80/320 ft.');
  });

  it('matches case-insensitively but returns the string verbatim', () => {
    expect(weaponRangeText(['Ammunition (80/320)'], true)).toBe('Ammunition (80/320)');
  });
});

// Cantrip damage scales by CHARACTER level on the 5/11/17 tiers (PHB p.211,
// Acid Splash), in both 2014 and 2024. It is not slot-based — neither edition
// upcasts a cantrip with a slot. The exclusion list is what keeps this from
// being a regression: a blanket "level-0 with dice scales" rule mis-scales at
// least 19 spells.json entries (4 class cantrips and all 15 source: 'race').

describe('cantripTierBonus', () => {
  it('follows the 5/11/17 tiers at and between every boundary', () => {
    expect(cantripTierBonus(1)).toBe(0);
    expect(cantripTierBonus(4)).toBe(0);
    expect(cantripTierBonus(5)).toBe(1);
    expect(cantripTierBonus(10)).toBe(1);
    expect(cantripTierBonus(11)).toBe(2);
    expect(cantripTierBonus(16)).toBe(2);
    expect(cantripTierBonus(17)).toBe(3);
    expect(cantripTierBonus(20)).toBe(3);
    expect(cantripTierBonus(undefined)).toBe(0);
  });
});

describe('cantripDamage', () => {
  it('adds a die at 5, 11 and 17 for an ordinary class cantrip', () => {
    expect(cantripDamage({ level: 0, name: 'Fire Bolt', damage: '1d10', source: 'class' }, 1)).toBe('1d10');
    expect(cantripDamage({ level: 0, name: 'Fire Bolt', damage: '1d10', source: 'class' }, 4)).toBe('1d10');
    expect(cantripDamage({ level: 0, name: 'Fire Bolt', damage: '1d10', source: 'class' }, 5)).toBe('2d10');
    expect(cantripDamage({ level: 0, name: 'Fire Bolt', damage: '1d10', source: 'class' }, 11)).toBe('3d10');
    expect(cantripDamage({ level: 0, name: 'Fire Bolt', damage: '1d10', source: 'class' }, 17)).toBe('4d10');
  });

  it('excludes Eldritch Blast — the rule is more beams, not more dice', () => {
    expect(cantripDamage({ level: 0, name: 'Eldritch Blast', damage: '1d10', source: 'class' }, 17)).toBe('1d10');
  });

  it('excludes Magic Stone — no level progression at all', () => {
    expect(cantripDamage({ level: 0, name: 'Magic Stone', damage: '1d6', source: 'class' }, 17)).toBe('1d6');
  });

  it('excludes Shillelagh — a weapon buff, no level progression', () => {
    expect(cantripDamage({ level: 0, name: 'Shillelagh', damage: '1d8', source: 'class' }, 17)).toBe('1d8');
  });

  it('excludes Green-Flame Blade — its stored 1d8 is already the 5th-level value', () => {
    expect(cantripDamage({ level: 0, name: 'Green-Flame Blade', damage: '1d8', source: 'class' }, 17)).toBe('1d8');
  });

  it("excludes every source: 'race' pseudo-spell — Dragonborn breath uses 1/6/11/16", () => {
    expect(cantripDamage({ level: 0, name: 'Breath Weapon (Red — Fire)', damage: '2d6', source: 'race' }, 17)).toBe('2d6');
  });

  it('does NOT exclude Booming Blade — a guard against over-broad exclusion', () => {
    expect(cantripDamage({ level: 0, name: 'Booming Blade', damage: '1d8', source: 'class' }, 17)).toBe('4d8');
  });

  it('scales homebrew cantrips by design — a homebrew record has no source', () => {
    expect(cantripDamage({ level: 0, name: 'Ashen Spark', damage: '1d6', homebrew: true }, 11)).toBe('3d6');
  });

  it('scales at mid-tier levels, not only at the boundaries', () => {
    expect(cantripDamage({ level: 0, name: 'Acid Splash', damage: '1d6', source: 'class' }, 10)).toBe('2d6');
    expect(cantripDamage({ level: 0, name: 'Acid Splash', damage: '1d6', source: 'class' }, 16)).toBe('3d6');
  });

  it('leaves non-cantrips, damageless cantrips and non-NdM strings alone', () => {
    expect(cantripDamage({ level: 3, name: 'Fireball', damage: '8d6', source: 'class' }, 17)).toBe('8d6');
    expect(cantripDamage({ level: 0, name: 'Guidance', damage: undefined, source: 'class' }, 17)).toBeUndefined();
    expect(cantripDamage({ level: 0, name: 'X', damage: '1d6 + mod', source: 'class' }, 17)).toBe('1d6 + mod');
  });

  it('returns undefined for a missing spell', () => {
    expect(cantripDamage(null, 17)).toBeUndefined();
    expect(cantripDamage(undefined, 17)).toBeUndefined();
  });
});
