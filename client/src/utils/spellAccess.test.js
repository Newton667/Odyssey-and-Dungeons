import { describe, it, expect } from 'vitest';
import { allowedSpellClasses, spellMatchesClasses } from './spellAccess';
import { MAGIC_INITIATE_CLASSES } from './dndConstants';

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
