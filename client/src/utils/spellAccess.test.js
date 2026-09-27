import { describe, it, expect } from 'vitest';
import { allowedSpellClasses, spellMatchesClasses, extraSpellNames, getAlwaysPreparedSpells, resolveSheetSpells, spellLimitCounts } from './spellAccess';
import { MAGIC_INITIATE_CLASSES } from './dndConstants';
import { thirdCasterSpellInfo, thirdCasterSchoolStatus } from './subclassData';

// Which spell lists a character may actually draw from: every class they have
// (multiclass included) plus any feat-granted list. The sheet's browser used to
// filter to char.class alone, which left a Paladin with Magic Initiate staring
// at an empty list — Paladins have no cantrips in either edition.

describe('MAGIC_INITIATE_CLASSES', () => {
  it('offers the six 2014 lists', () => {
    expect(MAGIC_INITIATE_CLASSES['2014']).toEqual(['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']);
    expect(MAGIC_INITIATE_CLASSES['2014'].length).toBe(6);
  });

  it('narrows to three lists under the 2024 rules', () => {
    expect(MAGIC_INITIATE_CLASSES['2024']).toEqual(['Cleric', 'Druid', 'Wizard']);
    expect(MAGIC_INITIATE_CLASSES['2024'].length).toBe(3);
  });

  it('drops the arcane/charisma lists in 2024 — the whole point of the split', () => {
    for (const cls of ['Warlock', 'Bard', 'Sorcerer']) {
      expect(MAGIC_INITIATE_CLASSES['2024']).not.toContain(cls);
    }
  });

  it('never offers Paladin — that is why a Paladin must pick another list', () => {
    expect(MAGIC_INITIATE_CLASSES['2014']).not.toContain('Paladin');
  });
});

describe('allowedSpellClasses', () => {
  const sorted = (char) => [...allowedSpellClasses(char)].sort();

  it('unions a feat-granted list with the character class', () => {
    // The headline case: a Paladin who took Magic Initiate (Cleric).
    expect(sorted({ class: 'Paladin', featSpellLists: { 'Magic Initiate': ['Cleric'] } }))
      .toEqual(['cleric', 'paladin']);
  });

  it('tolerates a legacy bare-string feat list value', () => {
    expect(sorted({ class: 'Paladin', featSpellLists: { 'Magic Initiate': 'Cleric' } }))
      .toEqual(['cleric', 'paladin']);
  });

  it('covers every class of a multiclass character', () => {
    expect(sorted({ class: 'Fighter', classes: [{ class: 'Fighter', level: 3 }, { class: 'Wizard', level: 2 }] }))
      .toEqual(['fighter', 'wizard']);
  });

  it('combines multiclass and feat lists', () => {
    expect(sorted({
      class: 'Fighter',
      classes: [{ class: 'Fighter', level: 3 }, { class: 'Wizard', level: 2 }],
      featSpellLists: { 'Magic Initiate': ['Druid'] },
    })).toEqual(['druid', 'fighter', 'wizard']);
  });

  it('leaves a plain single-class character unchanged', () => {
    expect(sorted({ class: 'Wizard' })).toEqual(['wizard']);
    expect(sorted({ class: 'Paladin', featSpellLists: {} })).toEqual(['paladin']);
  });

  it('returns an empty list rather than throwing on empty input', () => {
    expect(allowedSpellClasses({})).toEqual([]);
    expect(allowedSpellClasses(null)).toEqual([]);
  });

  it('collapses duplicates', () => {
    expect(sorted({ class: 'Cleric', featSpellLists: { 'Magic Initiate': ['Cleric'] } })).toEqual(['cleric']);
  });

  // The editor unions the same way, over a form-shaped object.
  it('gives a non-caster their feat list — the editor case', () => {
    // Fighter is not in SPELLCASTING_CLASSES, so the editor's early return must
    // let it through when a feat list is present.
    expect(sorted({ class: 'Fighter', featSpellLists: { 'Magic Initiate': ['Wizard'] } }))
      .toEqual(['fighter', 'wizard']);
    expect(sorted({ class: 'Paladin', featSpellLists: { 'Magic Initiate': ['Wizard'] } }))
      .toEqual(['paladin', 'wizard']);
  });
});

describe('spellMatchesClasses', () => {
  it('lets a Paladin with a Cleric feat list see Cleric spells', () => {
    // False today — this is the Magic Initiate bug.
    expect(spellMatchesClasses({ name: 'Light', classes: ['Bard', 'Cleric', 'Sorcerer', 'Wizard'] }, ['paladin', 'cleric'])).toBe(true);
  });

  it('still excludes spells from lists the character has no access to', () => {
    expect(spellMatchesClasses({ name: 'Fire Bolt', classes: ['Sorcerer', 'Wizard'] }, ['paladin', 'cleric'])).toBe(false);
  });

  it('lets a multiclass character see their second class list', () => {
    expect(spellMatchesClasses({ name: 'Fire Bolt', classes: ['Sorcerer', 'Wizard'] }, ['fighter', 'wizard'])).toBe(true);
  });

  it('keeps the escape hatch for homebrew/racial spells with no class list', () => {
    expect(spellMatchesClasses({ name: 'Homebrew Bolt' }, ['paladin'])).toBe(true);
    expect(spellMatchesClasses({ name: 'Homebrew Bolt', classes: [] }, ['paladin'])).toBe(true);
  });

  it('does not filter at all when the allowed set is empty', () => {
    expect(spellMatchesClasses({ name: 'Light', classes: ['Cleric'] }, [])).toBe(true);
  });

  it('matches class names case-insensitively', () => {
    expect(spellMatchesClasses({ classes: ['CLERIC'] }, ['cleric'])).toBe(true);
  });
});

describe('allowedSpellClasses — third casters', () => {
  const sorted = (char) => [...allowedSpellClasses(char)].sort();
  it('an Eldritch Knight from level 3 draws on the Wizard list', () => {
    expect(sorted({ class: 'Fighter', subclass: 'Eldritch Knight', level: 3 })).toEqual(['fighter', 'wizard']);
  });
  it('[guard] not before 3, not for other subclasses', () => {
    expect(sorted({ class: 'Fighter', subclass: 'Eldritch Knight', level: 2 })).toEqual(['fighter']);
    expect(sorted({ class: 'Fighter', subclass: 'Champion', level: 3 })).toEqual(['fighter']);
  });
});

describe('extraSpellNames', () => {
  it('adds 2014 patron expanded spells up to the castable level', () => {
    const names = extraSpellNames({ class: 'Warlock', subclass: 'The Fiend', level: 5, ruleset: '2014' });
    expect(names.has('Fireball')).toBe(true);
    expect(names.has('Flame Strike')).toBe(false);
  });
  it('2024 patron spells are prepared, not expanded', () => {
    expect(extraSpellNames({ class: 'Warlock', subclass: 'Fiend Patron', level: 5, ruleset: '2024' }).size).toBe(0);
  });
});

describe('getAlwaysPreparedSpells', () => {
  it('2014 Life Domain at 5', () => {
    const r = getAlwaysPreparedSpells({ class: 'Cleric', subclass: 'Life Domain', level: 5, ruleset: '2014' });
    expect(r).toHaveLength(6);
    for (const e of r) expect(e.source).toBe('Life Domain');
    expect(r.map(e => e.name).sort()).toEqual(['Beacon of Hope', 'Bless', 'Cure Wounds', 'Lesser Restoration', 'Revivify', 'Spiritual Weapon']);
  });

  it('Arcane Trickster always knows Mage Hand from 3', () => {
    expect(getAlwaysPreparedSpells({ class: 'Rogue', subclass: 'Arcane Trickster', level: 3, ruleset: '2024' }))
      .toContainEqual({ name: 'Mage Hand', source: 'Arcane Trickster' });
    expect(getAlwaysPreparedSpells({ class: 'Rogue', subclass: 'Arcane Trickster', level: 2, ruleset: '2024' })).toEqual([]);
  });

  it('reads the land from features (string or object) or levelChoices', () => {
    const base = { class: 'Druid', subclass: 'Circle of the Land', level: 3, ruleset: '2024' };
    const polar = ['Fog Cloud', 'Hold Person', 'Ray of Frost'];
    expect(getAlwaysPreparedSpells({ ...base, features: ['Circle Land: Polar'] }).map(e => e.name).sort()).toEqual(polar);
    expect(getAlwaysPreparedSpells({ ...base, features: [{ name: 'Circle Land: Polar' }] }).map(e => e.name).sort()).toEqual(polar);
    expect(getAlwaysPreparedSpells({ ...base, levelChoices: { '3': { 'land-terrain': 'Polar' } } }).map(e => e.name).sort()).toEqual(polar);
  });

  it('unions across multiclass entries', () => {
    const r = getAlwaysPreparedSpells({ ruleset: '2014', class: 'Cleric', level: 6, classes: [
      { class: 'Cleric', subclass: 'Life Domain', level: 3 }, { class: 'Paladin', subclass: 'Oath of Devotion', level: 3 },
    ] });
    expect(r).toHaveLength(6);
    expect(r.filter(e => e.source === 'Life Domain')).toHaveLength(4);
    expect(r.filter(e => e.source === 'Oath of Devotion')).toHaveLength(2);
  });
});

describe('resolveSheetSpells — never mutates, tags copies', () => {
  const deepFreeze = (o) => { Object.values(o).forEach(v => { if (v && typeof v === 'object') deepFreeze(v); }); return Object.freeze(o); };
  it('tags always-prepared copies and reports missing names', () => {
    const allSpells = deepFreeze([{ name: 'Bless', level: 1 }, { name: 'Shield', level: 1 }]);
    const { spells, missing } = resolveSheetSpells({
      preparedNames: ['Bless', 'Shield'],
      alwaysPrepared: [{ name: 'Bless', source: 'Life Domain' }, { name: 'Commune', source: 'Oath of Devotion' }],
      allSpells,
    });
    expect(allSpells[0]._alwaysPrepared).toBe(undefined);
    const bless = spells.filter(s => s.name === 'Bless');
    expect(bless).toHaveLength(1);
    expect(bless[0]._alwaysPrepared).toBe('Life Domain');
    expect(bless[0]).not.toBe(allSpells[0]);
    expect(spells.some(s => s.name === 'Shield')).toBe(true);
    expect(missing).toEqual(['Commune']);
  });
});

describe('spellLimitCounts', () => {
  it('excludes racial and always-prepared spells', () => {
    expect(spellLimitCounts([
      { level: 0 }, { level: 0, source: 'race' }, { level: 1 }, { level: 2 },
      { level: 1, _alwaysPrepared: 'Life Domain' }, { level: 0, _alwaysPrepared: 'Arcane Trickster' },
    ])).toEqual({ cantrips: 1, leveled: 2 });
  });
});

describe('2014 EK/AT school budget reads every class list', () => {
  // Regression (v1.9.0 review M2): the editor passed only Magic Initiate lists, so a Wizard
  // spell the character's Cleric levels also offer counted as off-school there but not on the sheet.
  const DETECT = { name: 'Detect Magic', level: 1, school: 'Divination', classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Wizard'] };
  const SLEEP = { name: 'Sleep', level: 1, school: 'Enchantment', classes: ['Bard', 'Sorcerer', 'Wizard'] };
  const char = {
    class: 'Fighter', subclass: 'Eldritch Knight', level: 4, ruleset: '2014',
    classes: [{ class: 'Fighter', subclass: 'Eldritch Knight', level: 3 }, { class: 'Cleric', subclass: 'Life Domain', level: 1 }],
  };
  const info = thirdCasterSpellInfo('Fighter', 'Eldritch Knight', 3, '2014');

  it('a spell on another class list is not an off-school pick', () => {
    const lists = allowedSpellClasses(char);
    expect(lists).toContain('cleric');
    expect(thirdCasterSchoolStatus({ info, pickedSpells: [DETECT, SLEEP], otherListClasses: lists })).toEqual({ offSchool: 1, allowed: 1, atLimit: true });
    // The old editor input (feat lists only) over-counted.
    expect(thirdCasterSchoolStatus({ info, pickedSpells: [DETECT, SLEEP], otherListClasses: [] }).offSchool).toBe(2);
  });
});
