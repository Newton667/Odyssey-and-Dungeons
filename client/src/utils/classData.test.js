import { describe, it, expect } from 'vitest';
import {
  CLASSES, getSpellSlots, getMulticlassSpellSlots, spellcastingAbilityFor, spellListClassFor,
  getClassDefenses, getClassLevels, CLASS_LEVELS, getLevel1Features,
} from './classData';
import { FEATURE_DESCRIPTIONS } from './featureDescriptions';

describe('getSpellSlots — third casters', () => {
  it('gives Eldritch Knight / Arcane Trickster the one-third caster table', () => {
    expect(getSpellSlots('Fighter', 3, '2014', 'Eldritch Knight')).toEqual([2, 0, 0, 0]);
    expect(getSpellSlots('Fighter', 7, '2014', 'Eldritch Knight')).toEqual([4, 2, 0, 0]);
    expect(getSpellSlots('Rogue', 19, '2024', 'Arcane Trickster')).toEqual([4, 3, 3, 1]);
    expect(getSpellSlots('Rogue', 20, '2014', 'Arcane Trickster')).toEqual([4, 3, 3, 1]);
  });

  it('[guard] no slots before level 3 or for other subclasses', () => {
    expect(getSpellSlots('Fighter', 2, '2014', 'Eldritch Knight')).toBe(null);
    expect(getSpellSlots('Fighter', 5, '2014', 'Champion')).toBe(null);
  });

  it('[guard] the subclass argument changes nothing for any other class', () => {
    for (const c of Object.keys(CLASSES).filter(c => c !== 'Fighter' && c !== 'Rogue')) {
      for (let l = 1; l <= 20; l++) {
        for (const r of ['2014', '2024']) expect(getSpellSlots(c, l, r, 'X'), `${c} ${l} ${r}`).toEqual(getSpellSlots(c, l, r));
      }
    }
  });
});

describe('getMulticlassSpellSlots — single third caster', () => {
  it('a lone Eldritch Knight uses its own table', () => {
    expect(getMulticlassSpellSlots([{ class: 'Fighter', subclass: 'Eldritch Knight', level: 7 }]).standard).toEqual([4, 2, 0, 0]);
  });

  it('[guard] Wizard 5 + EK 6 combine to caster level 7', () => {
    expect(getMulticlassSpellSlots([
      { class: 'Wizard', subclass: '', level: 5 },
      { class: 'Fighter', subclass: 'Eldritch Knight', level: 6 },
    ]).standard).toEqual([4, 3, 3, 1, 0, 0, 0, 0, 0]);
  });
});

describe('spellcastingAbilityFor / spellListClassFor', () => {
  it('derives INT and the Wizard list for third casters', () => {
    expect(spellcastingAbilityFor('Fighter', 'Eldritch Knight')).toBe('intelligence');
    expect(spellcastingAbilityFor('Rogue', 'Arcane Trickster')).toBe('intelligence');
    expect(spellcastingAbilityFor('Fighter', 'Champion')).toBe(null);
    expect(spellcastingAbilityFor('Cleric', '')).toBe('wisdom');
    expect(spellListClassFor('Fighter', 'Eldritch Knight')).toBe('Wizard');
    expect(spellListClassFor('Rogue', 'Arcane Trickster')).toBe('Wizard');
    expect(spellListClassFor('Cleric', 'Life Domain')).toBe('Cleric');
  });
});

describe('getClassDefenses — Bear Totem', () => {
  const ALL = ['All except Psychic (while raging)'];
  const BPS = ['Bludgeoning (while raging)', 'Piercing (while raging)', 'Slashing (while raging)'];
  const res = (...args) => getClassDefenses(...args).resistances;
  it('the level-3 Bear pick grants resistance to all but psychic', () => {
    expect(res('Barbarian', 3, 'Path of the Totem Warrior', { features: ['Totem Spirit (Lv3): Bear'] })).toEqual(ALL);
    expect(res('Barbarian', 3, 'Path of the Totem Warrior', { features: [{ name: 'Totem Spirit (Lv3): Bear' }] })).toEqual(ALL);
    expect(res('Barbarian', 3, 'Path of the Totem Warrior', { levelChoices: { '3': { totem: 'Bear' } } })).toEqual(ALL);
    expect(res('Barbarian', 3, 'Path of the Totem Warrior', { levelChoices: { 'Barbarian:3': { totem: 'Bear' } } })).toEqual(ALL);
  });
  it('[guard] other picks keep the rage B/P/S resistances', () => {
    expect(res('Barbarian', 3, 'Path of the Totem Warrior', { features: ['Totem Spirit (Lv3): Eagle'] })).toEqual(BPS);
    expect(res('Barbarian', 3, 'Path of the Totem Warrior', { features: ['Totem Spirit (Lv6): Bear'] })).toEqual(BPS);
    expect(res('Barbarian', 3, 'Path of the Totem Warrior')).toEqual(BPS);
    expect(res('Fighter', 5, 'Champion')).toEqual([]);
  });
});

describe('getClassLevels — 2024 de-dupe drops only promoted names', () => {
  const levelsOf = (table, name) => Object.entries(table).filter(([, fs]) => (fs || []).includes(name)).map(([l]) => Number(l)).sort((a, b) => a - b);
  it('keeps subclass placeholders and ASIs at every level', () => {
    const cleric = getClassLevels('Cleric', '2024');
    expect(cleric[17]).toContain('Domain Feature');
    expect(cleric[8]).toContain('ASI');
    expect(cleric[8]).not.toContain('Domain Feature');
    expect(cleric[2]).not.toContain('Domain Feature');
    expect(cleric[6]).toContain('Domain Feature');
    expect(cleric[3]).toContain('Divine Domain');
    expect(cleric[1]).not.toContain('Divine Domain');
    expect(getClassLevels('Wizard', '2024')[10]).toContain('Tradition Feature');
    expect(levelsOf(getClassLevels('Fighter', '2024'), 'Archetype Feature')).toEqual([7, 10, 15, 18]);
    expect(levelsOf(getClassLevels('Barbarian', '2024'), 'Path Feature')).toEqual([6, 10, 14]);
  });
  it('[guard] still drops a promoted name from its old level', () => {
    expect(getClassLevels('Paladin', '2024')[2]).not.toContain('Spellcasting');
    expect(getClassLevels('Paladin', '2024')[1]).toContain('Spellcasting');
  });
  it('ASI levels match the class table under 2024', () => {
    for (const cls of Object.keys(CLASS_LEVELS)) {
      expect(levelsOf(getClassLevels(cls, '2024'), 'ASI'), cls).toEqual(levelsOf(CLASS_LEVELS[cls], 'ASI'));
    }
    expect(levelsOf(getClassLevels('Fighter', '2024'), 'ASI')).toEqual([4, 6, 8, 12, 14, 16, 19]);
    expect(levelsOf(getClassLevels('Rogue', '2024'), 'ASI')).toEqual([4, 8, 10, 12, 16, 19]);
    expect(levelsOf(getClassLevels('Wizard', '2024'), 'ASI')).toEqual([4, 8, 12, 16, 19]);
  });
  it('every other repeated name keeps all its levels', () => {
    const moved = {
      Paladin: ['Spellcasting'], Ranger: ['Spellcasting'], Cleric: ['Domain Feature', 'Divine Domain'],
      Druid: ['Druid Circle'], Sorcerer: ['Sorcerous Origin'], Warlock: ['Otherworldly Patron'], Wizard: ['Arcane Tradition'],
    };
    for (const cls of Object.keys(CLASS_LEVELS)) {
      const names = new Set(Object.values(CLASS_LEVELS[cls]).flat());
      const t24 = getClassLevels(cls, '2024');
      for (const name of names) {
        if ((moved[cls] || []).includes(name)) continue;
        expect(levelsOf(t24, name), `${cls}/${name}`).toEqual(levelsOf(CLASS_LEVELS[cls], name));
      }
    }
  });
  it('[guard] 2014 is the untouched table', () => {
    expect(getClassLevels('Cleric', '2014')).toBe(CLASS_LEVELS.Cleric);
  });
});

describe('getLevel1Features', () => {
  it('drops the subclass choice that 2024 moves to level 3', () => {
    expect(getLevel1Features('Cleric', '2024').some(f => f.startsWith('Divine Domain'))).toBe(false);
    expect(getLevel1Features('Cleric', '2014')).toEqual(CLASSES.Cleric.features);
    expect(getLevel1Features('Cleric', '2014').some(f => f.startsWith('Divine Domain'))).toBe(true);
    expect(getLevel1Features('Sorcerer', '2024').some(f => f.startsWith('Sorcerous Origin'))).toBe(false);
    expect(getLevel1Features('Warlock', '2024').some(f => f.startsWith('Otherworldly Patron'))).toBe(false);
    expect(getLevel1Features('Fighter', '2024')).toEqual(CLASSES.Fighter.features);
  });
});

describe('subclass-choice text names no level', () => {
  const RX = /at (level \d|\d(st|nd|rd|th) level)/;
  it('FEATURE_DESCRIPTIONS', () => {
    for (const n of ['Divine Domain', 'Sacred Oath', 'Sorcerous Origin', 'Otherworldly Patron', 'Arcane Tradition']) {
      expect(FEATURE_DESCRIPTIONS[n], n).toBeTruthy();
      expect(FEATURE_DESCRIPTIONS[n], n).not.toMatch(RX);
    }
  });
  it('the level-1 feature strings', () => {
    const choice = { Cleric: 'Divine Domain', Sorcerer: 'Sorcerous Origin', Warlock: 'Otherworldly Patron' };
    for (const [cls, name] of Object.entries(choice)) {
      const f = CLASSES[cls].features.find(x => x.startsWith(name));
      expect(f, cls).toBeTruthy();
      expect(f, cls).not.toMatch(RX);
    }
  });
});
