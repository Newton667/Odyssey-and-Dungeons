import { describe, it, expect } from 'vitest';
import {
  getSubclasses, getSubclassDesc, subclassEdition, offeredSubclass, subclassSelectOptions,
  SUBCLASSES_2024, SAME_IN_BOTH_RULESETS, getSubclassFeatures, listSubclassFeatures,
  thirdCasterSpellInfo, thirdCasterSchoolStatus, subclassHpBonus, subclassHpDelta, subclassRepickHp,
  isSubclassPlaceholder,
} from './subclassData';
import { SUBCLASS_HP_PER_LEVEL, SUBCLASS_UNARMORED_AC } from './dndConstants';
import { SUBCLASS_FEATURES } from './subclassFeatures';
import { SUBCLASS_FEATURES_2024 } from './subclassFeatures2024';
import {
  CLASSES, isThirdCaster, THIRD_CASTER_SUBCLASSES, getMulticlassCasterLevel, getMulticlassSpellSlots,
} from './classData';

// Hardcoded from the research table (Docs/research/2026-09-27-subclass-rules-baseline.md) —
// never read back from the module under test, or the comparison could not go red.
const EXPECTED_2024 = {
  Barbarian: ['Path of the Berserker', 'Path of the Wild Heart', 'Path of the World Tree', 'Path of the Zealot'],
  Bard: ['College of Dance', 'College of Glamour', 'College of Lore', 'College of Valor'],
  Cleric: ['Life Domain', 'Light Domain', 'Trickery Domain', 'War Domain'],
  Druid: ['Circle of the Land', 'Circle of the Moon', 'Circle of the Sea', 'Circle of the Stars'],
  Fighter: ['Battle Master', 'Champion', 'Eldritch Knight', 'Psi Warrior'],
  Monk: ['Warrior of Mercy', 'Warrior of Shadow', 'Warrior of the Elements', 'Warrior of the Open Hand'],
  Paladin: ['Oath of Devotion', 'Oath of Glory', 'Oath of the Ancients', 'Oath of Vengeance'],
  Ranger: ['Beast Master', 'Fey Wanderer', 'Gloom Stalker', 'Hunter'],
  Rogue: ['Arcane Trickster', 'Assassin', 'Soulknife', 'Thief'],
  Sorcerer: ['Aberrant Sorcery', 'Clockwork Sorcery', 'Draconic Sorcery', 'Wild Magic Sorcery'],
  Warlock: ['Archfey Patron', 'Celestial Patron', 'Fiend Patron', 'Great Old One Patron'],
  Wizard: ['Abjurer', 'Diviner', 'Evoker', 'Illusionist'],
};

describe('getSubclasses — 2014 is untouched', () => {
  it('returns the very same CLASSES array for all 13 classes', () => {
    const classes = Object.keys(CLASSES);
    expect(classes).toHaveLength(13);
    for (const cls of classes) expect(getSubclasses(cls, '2014')).toBe(CLASSES[cls].subclasses);
  });

  it('defaults to 2014', () => {
    expect(getSubclasses('Cleric')).toBe(CLASSES.Cleric.subclasses);
  });

  it('returns [] for an empty or unknown class', () => {
    expect(getSubclasses('', '2014')).toEqual([]);
    expect(getSubclasses('Nope', '2014')).toEqual([]);
  });
});

describe('getSubclasses — 2024 lists', () => {
  it('lists exactly the 2024 PHB subclasses, in order, for all 12 PHB classes', () => {
    for (const [cls, names] of Object.entries(EXPECTED_2024)) {
      expect(getSubclasses(cls, '2024'), cls).toEqual(names);
    }
  });

  it('keeps the Artificer list in both rulesets', () => {
    expect(getSubclasses('Artificer', '2024')).toEqual(CLASSES.Artificer.subclasses);
    expect(getSubclasses('Artificer', '2024')).toEqual(['Alchemist', 'Armorer', 'Artillerist', 'Battle Smith']);
    expect(SAME_IN_BOTH_RULESETS.has('Artificer')).toBe(true);
  });

  it('returns [] for an empty class under 2024 (the creator renders before a class is chosen)', () => {
    expect(getSubclasses('', '2024')).toEqual([]);
    expect(getSubclasses('Nope', '2024')).toEqual([]);
  });

  it('has a non-empty description for every 2024 subclass', () => {
    for (const [cls, table] of Object.entries(SUBCLASSES_2024)) {
      for (const [name, desc] of Object.entries(table)) {
        expect(typeof desc, `${cls}/${name}`).toBe('string');
        expect(desc.length, `${cls}/${name}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('subclassEdition', () => {
  it('resolves a name to the edition that offers it', () => {
    expect(subclassEdition('Warlock', 'The Fiend', '2024')).toBe('2014');
    expect(subclassEdition('Fighter', 'Champion', '2024')).toBe('2024');
    expect(subclassEdition('Fighter', 'Champion', '2014')).toBe('2014');
    expect(subclassEdition('Warlock', 'Fiend Patron', '2014')).toBe('2024');
    expect(subclassEdition('Wizard', 'Chronurgy', '2014')).toBe(null);
    expect(subclassEdition('Cleric', '', '2024')).toBe(null);
    expect(subclassEdition('Artificer', 'Armorer', '2024')).toBe('2024');
  });
});

describe('getSubclassDesc', () => {
  it('reads the ruleset table first, then the other one', () => {
    expect(getSubclassDesc('Cleric', 'Knowledge Domain', '2024')).toBe(CLASSES.Cleric.subclassDescs['Knowledge Domain']);
    expect(getSubclassDesc('Cleric', 'Life Domain', '2024')).toBe(SUBCLASSES_2024.Cleric['Life Domain']);
    expect(getSubclassDesc('Cleric', 'Life Domain', '2014')).toBe(CLASSES.Cleric.subclassDescs['Life Domain']);
  });
});

describe('offeredSubclass — the creator save trim', () => {
  it('keeps a subclass only when the ruleset offers it at that class level', () => {
    expect(offeredSubclass('Cleric', 'Life Domain', 2, '2024')).toBe('');
    expect(offeredSubclass('Cleric', 'Life Domain', 3, '2024')).toBe('Life Domain');
    expect(offeredSubclass('Cleric', 'Knowledge Domain', 3, '2024')).toBe('');
    expect(offeredSubclass('Cleric', 'Life Domain', 1, '2014')).toBe('Life Domain');
    expect(offeredSubclass('Wizard', 'School of Evocation', 1, '2014')).toBe('');
    expect(offeredSubclass('Wizard', 'School of Evocation', 2, '2014')).toBe('School of Evocation');
    expect(offeredSubclass('Fighter', '', 3, '2014')).toBe('');
  });
});

describe('subclassSelectOptions — the editor never destroys a value', () => {
  it('appends a legacy value with its edition label', () => {
    const opts = subclassSelectOptions('Cleric', 'Knowledge Domain', '2024');
    expect(opts).toHaveLength(5);
    expect(opts[opts.length - 1]).toMatchObject({ value: 'Knowledge Domain', label: 'Knowledge Domain (2014 rules)', legacy: true });
  });

  it('appends nothing for an offered or empty value', () => {
    expect(subclassSelectOptions('Cleric', 'Life Domain', '2024')).toHaveLength(4);
    expect(subclassSelectOptions('Cleric', '', '2024')).toHaveLength(4);
  });

  it('labels an unknown value as custom', () => {
    const opts = subclassSelectOptions('Wizard', 'Chronurgy', '2014');
    expect(opts).toHaveLength(9);
    expect(opts[opts.length - 1]).toMatchObject({ value: 'Chronurgy', label: 'Chronurgy (custom)' });
  });

  it('labels a 2024 name on a 2014 character', () => {
    const opts = subclassSelectOptions('Warlock', 'Fiend Patron', '2014');
    expect(opts[opts.length - 1]).toMatchObject({ label: 'Fiend Patron (2024 rules)' });
  });
});

describe('isThirdCaster keys on (class, subclass)', () => {
  it('recognises only Eldritch Knight and Arcane Trickster', () => {
    expect(isThirdCaster('Fighter', 'Eldritch Knight')).toBe(true);
    expect(isThirdCaster('Rogue', 'Arcane Trickster')).toBe(true);
    expect(isThirdCaster('Fighter', 'Champion')).toBe(false);
    expect(isThirdCaster('Rogue', 'Thief')).toBe(false);
    expect(isThirdCaster('Wizard', 'Eldritch Knight')).toBe(false);
    expect(THIRD_CASTER_SUBCLASSES).toEqual({ Fighter: 'Eldritch Knight', Rogue: 'Arcane Trickster' });
  });

  it('[guard] still drives the multiclass caster level', () => {
    expect(getMulticlassCasterLevel([{ class: 'Fighter', subclass: 'Eldritch Knight', level: 9 }])).toBe(3);
    expect(getMulticlassSpellSlots([
      { class: 'Wizard', subclass: '', level: 5 },
      { class: 'Fighter', subclass: 'Eldritch Knight', level: 6 },
    ]).standard).toEqual([4, 3, 3, 1, 0, 0, 0, 0, 0]);
  });
});

// Increment 2 — 2024 feature levels per class (Increment 3 extends it).
const LEVELS_2024 = {
  Barbarian: [3, 6, 10, 14], Bard: [3, 6, 14], Cleric: [3, 6, 17], Druid: [3, 6, 10, 14],
  Fighter: [3, 7, 10, 15, 18], Monk: [3, 6, 11, 17],
  // Increment 3
  Paladin: [3, 7, 15, 20], Ranger: [3, 7, 11, 15], Rogue: [3, 9, 13, 17],
  Sorcerer: [3, 6, 14, 18], Warlock: [3, 6, 10, 14], Wizard: [3, 6, 10, 14],
};
const levelsOf = (features) => Object.keys(features).map(Number).sort((a, b) => a - b);

describe('getSubclassFeatures — 2014 resolves to the untouched table', () => {
  it('returns the very same SUBCLASS_FEATURES object for every 2014 subclass', () => {
    for (const cls of Object.keys(CLASSES)) {
      for (const sc of CLASSES[cls].subclasses) {
        const r = getSubclassFeatures(cls, sc, '2014');
        expect(r, `${cls}/${sc}`).not.toBe(null);
        expect(r.features, `${cls}/${sc}`).toBe(SUBCLASS_FEATURES[sc]);
        expect(r.legacy, `${cls}/${sc}`).toBe(false);
      }
    }
  });
});

describe('getSubclassFeatures — 2024 completeness, all classes', () => {
  it('has a 2024 table with exactly the class feature levels for every 2024 subclass', () => {
    for (const [cls, levels] of Object.entries(LEVELS_2024)) {
      for (const sc of getSubclasses(cls, '2024')) {
        const r = getSubclassFeatures(cls, sc, '2024');
        expect(r, `${cls}/${sc}`).not.toBe(null);
        expect(r.legacy, `${cls}/${sc}`).toBe(false);
        expect(levelsOf(r.features), `${cls}/${sc}`).toEqual(levels);
        for (const [lvl, f] of Object.entries(r.features)) {
          expect(typeof f.name === 'string' && f.name.length > 0, `${cls}/${sc}/${lvl} name`).toBe(true);
          expect(typeof f.desc === 'string' && f.desc.length > 0, `${cls}/${sc}/${lvl} desc`).toBe(true);
        }
      }
    }
  });

  it('uses the plan\'s feature names', () => {
    expect(getSubclassFeatures('Fighter', 'Champion', '2024').features[7].name).toBe('Additional Fighting Style');
    expect(getSubclassFeatures('Fighter', 'Champion', '2024').features[3].name).toBe('Improved Critical & Remarkable Athlete');
    expect(getSubclassFeatures('Cleric', 'Life Domain', '2024').features[3].name).toBe('Disciple of Life, Life Domain Spells & Preserve Life');
  });

  it('resolves a shared name to its own edition\'s table', () => {
    const life24 = getSubclassFeatures('Cleric', 'Life Domain', '2024').features;
    expect(life24).not.toBe(SUBCLASS_FEATURES['Life Domain']);
    expect(levelsOf(life24)).toEqual([3, 6, 17]);
    expect(levelsOf(SUBCLASS_FEATURES['Life Domain'])).toEqual([1, 2, 6, 8, 17]);
  });
});

describe('getSubclassFeatures — legacy, Artificer, unknown', () => {
  it('keeps a 2014-only pick on a 2024 character, flagged legacy', () => {
    const r = getSubclassFeatures('Cleric', 'Knowledge Domain', '2024');
    expect(r).toMatchObject({ edition: '2014', legacy: true });
    expect(r.features).toBe(SUBCLASS_FEATURES['Knowledge Domain']);
    expect(levelsOf(r.features)).toEqual([1, 2, 6, 8, 17]);
  });

  it('shares the Artificer table in both rulesets', () => {
    const r = getSubclassFeatures('Artificer', 'Armorer', '2024');
    expect(r.legacy).toBe(false);
    expect(r.features).toBe(SUBCLASS_FEATURES.Armorer);
  });

  it('returns null for homebrew or empty names', () => {
    expect(getSubclassFeatures('Wizard', 'Chronurgy', '2014')).toBe(null);
    expect(getSubclassFeatures('Cleric', '', '2024')).toBe(null);
  });
});

describe('listSubclassFeatures', () => {
  it('lists features up to a level, sorted, with edition info', () => {
    const k = listSubclassFeatures('Cleric', 'Knowledge Domain', '2014', 6);
    expect(k.map(f => f.level)).toEqual([1, 2, 6]);
    for (const f of k) expect(f).toMatchObject({ legacy: false, edition: '2014' });

    const legacy = listSubclassFeatures('Cleric', 'Knowledge Domain', '2024', 20);
    expect(legacy).toHaveLength(5);
    for (const f of legacy) expect(f).toMatchObject({ legacy: true, edition: '2014' });

    expect(listSubclassFeatures('Fighter', 'Champion', '2024', 7).map(f => f.level)).toEqual([3, 7]);
    expect(listSubclassFeatures('Fighter', 'Champion', '2024', 2)).toEqual([]);
    expect(listSubclassFeatures('Fighter', 'Champion', '2014', 20).map(f => f.level)).toEqual([3, 7, 10, 15, 18]);
    expect(listSubclassFeatures('Wizard', 'Chronurgy', '2014', 20)).toEqual([]);
  });
});

describe('getSubclassFeatures — 2024 part 2 spot names', () => {
  it('uses the plan\'s names for the rows the UI checks rely on', () => {
    const evoker = getSubclassFeatures('Wizard', 'Evoker', '2024').features;
    expect(evoker[10].name).toBe('Empowered Evocation');
    expect(evoker[14].name).toBe('Overchannel');
    const hunter = getSubclassFeatures('Ranger', 'Hunter', '2024').features;
    expect(hunter[7].name).toBe('Defensive Tactics');
    expect(hunter[11].name).toBe("Superior Hunter's Prey");
    expect(getSubclassFeatures('Rogue', 'Arcane Trickster', '2024').features[3].name).toBe('Spellcasting & Mage Hand Legerdemain');
  });

  it('states both Draconic Sorcery numbers', () => {
    const desc = getSubclassFeatures('Sorcerer', 'Draconic Sorcery', '2024').features[3].desc;
    expect(desc).toMatch(/\+3/);
    expect(desc).toMatch(/(CHA|Charisma)/);
  });
});

describe('SUBCLASS_FEATURES_2024 hygiene', () => {
  it('[guard] has no key outside the 2024 lists', () => {
    const offered = new Set(Object.keys(LEVELS_2024).flatMap(cls => getSubclasses(cls, '2024')));
    for (const key of Object.keys(SUBCLASS_FEATURES_2024)) expect(offered.has(key), key).toBe(true);
  });

  it('[guard] never names a 2014 level in a 2024 description', () => {
    for (const [sc, table] of Object.entries(SUBCLASS_FEATURES_2024)) {
      for (const [lvl, f] of Object.entries(table)) {
        for (const bad of ['at level 1', '1st level', '2nd level']) {
          expect(f.desc.includes(bad), `${sc}/${lvl}: ${bad}`).toBe(false);
        }
      }
    }
  });
});

describe('thirdCasterSpellInfo', () => {
  it('2014 Eldritch Knight at 3', () => {
    expect(thirdCasterSpellInfo('Fighter', 'Eldritch Knight', 3, '2014')).toEqual({
      cantrips: 2, spells: 3, type: 'known', maxLevel: 1, schools: ['Abjuration', 'Evocation'], anySchool: 1, alwaysKnownCantrips: [],
    });
  });

  it('Arcane Trickster picks exclude the always-known Mage Hand', () => {
    expect(thirdCasterSpellInfo('Rogue', 'Arcane Trickster', 3, '2014').cantrips).toBe(2);
    expect(thirdCasterSpellInfo('Rogue', 'Arcane Trickster', 10, '2024').cantrips).toBe(3);
  });

  it('any-school picks accrue at 3/8/14/20', () => {
    expect(thirdCasterSpellInfo('Fighter', 'Eldritch Knight', 7, '2014').anySchool).toBe(1);
    expect(thirdCasterSpellInfo('Fighter', 'Eldritch Knight', 8, '2014').anySchool).toBe(2);
    expect(thirdCasterSpellInfo('Fighter', 'Eldritch Knight', 14, '2014').anySchool).toBe(3);
    expect(thirdCasterSpellInfo('Fighter', 'Eldritch Knight', 20, '2014').anySchool).toBe(4);
  });

  it('level 20 and the 2024 shape', () => {
    expect(thirdCasterSpellInfo('Fighter', 'Eldritch Knight', 20, '2014')).toMatchObject({ spells: 13, cantrips: 3, maxLevel: 4 });
    expect(thirdCasterSpellInfo('Fighter', 'Eldritch Knight', 10, '2024')).toMatchObject({ spells: 7, type: 'prepared', schools: null, anySchool: 0 });
  });

  it('null below 3 and for non-third-caster subclasses', () => {
    expect(thirdCasterSpellInfo('Fighter', 'Eldritch Knight', 2, '2014')).toBe(null);
    expect(thirdCasterSpellInfo('Fighter', 'Champion', 10, '2014')).toBe(null);
  });
});

describe('thirdCasterSchoolStatus — 2014 school budget', () => {
  const SLEEP = { name: 'Sleep', level: 1, school: 'Enchantment', classes: ['Bard', 'Sorcerer', 'Wizard'] };
  const BURNING = { name: 'Burning Hands', level: 1, school: 'Evocation', classes: ['Sorcerer', 'Wizard'] };
  const FRIENDS = { name: 'Friends', level: 0, school: 'Enchantment', classes: ['Wizard'] };

  it('counts off-school leveled Wizard picks against the any-school budget', () => {
    const info = thirdCasterSpellInfo('Fighter', 'Eldritch Knight', 3, '2014');
    expect(thirdCasterSchoolStatus({ info, pickedSpells: [SLEEP], otherListClasses: [] })).toEqual({ offSchool: 1, allowed: 1, atLimit: true });
    expect(thirdCasterSchoolStatus({ info, pickedSpells: [BURNING], otherListClasses: [] })).toMatchObject({ offSchool: 0, atLimit: false });
    expect(thirdCasterSchoolStatus({ info, pickedSpells: [FRIENDS], otherListClasses: [] })).toMatchObject({ offSchool: 0 });
    expect(thirdCasterSchoolStatus({ info, pickedSpells: [SLEEP], otherListClasses: ['Bard'] })).toMatchObject({ offSchool: 0 });
  });

  it('the budget grows at 8, and 2024 has none', () => {
    const ek8 = thirdCasterSpellInfo('Fighter', 'Eldritch Knight', 8, '2014');
    expect(thirdCasterSchoolStatus({ info: ek8, pickedSpells: [SLEEP], otherListClasses: [] })).toMatchObject({ allowed: 2, atLimit: false });
    const ek24 = thirdCasterSpellInfo('Fighter', 'Eldritch Knight', 3, '2024');
    expect(thirdCasterSchoolStatus({ info: ek24, pickedSpells: [SLEEP], otherListClasses: [] })).toMatchObject({ atLimit: false });
  });
});

describe('Draconic data', () => {
  it('HP and AC tables', () => {
    expect(SUBCLASS_HP_PER_LEVEL).toEqual({ 'Draconic Bloodline': 1, 'Draconic Sorcery': 1 });
    expect(SUBCLASS_UNARMORED_AC).toEqual({
      'Draconic Bloodline': { base: 13, add: ['dex'] },
      'Draconic Sorcery': { base: 10, add: ['dex', 'cha'] },
    });
  });
});

describe('subclassHpBonus / subclassHpDelta', () => {
  it('+1 per Sorcerer level once the subclass is held', () => {
    expect(subclassHpBonus({ class: 'Sorcerer', subclass: 'Draconic Bloodline', level: 1 })).toBe(1);
    expect(subclassHpBonus({ class: 'Sorcerer', subclass: 'Draconic Sorcery', level: 3 })).toBe(3);
    expect(subclassHpBonus({ class: 'Sorcerer', subclass: 'Draconic Sorcery', level: 20 })).toBe(20);
    expect(subclassHpBonus({ class: 'Sorcerer', subclass: 'Wild Magic Sorcery', level: 5 })).toBe(0);
    expect(subclassHpBonus({ class: 'Wizard', subclass: 'Draconic Sorcery', level: 5 })).toBe(0);
  });
  it('the change between two class states', () => {
    expect(subclassHpDelta({ class: 'Sorcerer', subclass: '', level: 2 }, { class: 'Sorcerer', subclass: 'Draconic Sorcery', level: 3 })).toBe(3);
    expect(subclassHpDelta({ class: 'Sorcerer', subclass: 'Draconic Bloodline', level: 1 }, { class: 'Sorcerer', subclass: 'Draconic Bloodline', level: 2 })).toBe(1);
  });
});

describe('subclassRepickHp — never subtracts; flags switches', () => {
  const S = (subclass, level) => ({ class: 'Sorcerer', subclass, level });
  it('applies gains, reminds on losses, flags switches', () => {
    expect(subclassRepickHp(S('Wild Magic Sorcery', 5), S('Draconic Sorcery', 5))).toEqual({ apply: 5, remind: 0, switched: true });
    expect(subclassRepickHp(S('Draconic Sorcery', 5), S('Wild Magic Sorcery', 5))).toEqual({ apply: 0, remind: 5, switched: true });
    expect(subclassRepickHp(S('', 3), S('Draconic Sorcery', 3))).toEqual({ apply: 3, remind: 0, switched: false });
    expect(subclassRepickHp(S('Wild Magic Sorcery', 5), S('Aberrant Sorcery', 5))).toEqual({ apply: 0, remind: 0, switched: true });
  });
});

// Increment 8 (orchestrator-approved deviation): the Progression rows' placeholder match,
// pinned so the 2014 Cleric 8 row (['ASI', 'Destroy Undead (CR 1)', 'Domain Feature'])
// appends the subclass name exactly once.
describe('isSubclassPlaceholder', () => {
  it('matches only the generic "<X> Feature" placeholders', () => {
    for (const n of ['Domain Feature', 'Path Feature', 'Oath Feature', 'Archetype Feature', 'College Feature', 'Circle Feature',
      'Tradition Feature', 'Patron Feature', 'Specialist Feature', 'Origin Feature']) expect(isSubclassPlaceholder(n), n).toBe(true);
    for (const n of ['ASI', 'Fighting Style', 'Destroy Undead (CR 1)', 'Divine Domain', 'Oath Capstone', 'Bard College', '', undefined]) {
      expect(isSubclassPlaceholder(n), String(n)).toBe(false);
    }
  });
});
