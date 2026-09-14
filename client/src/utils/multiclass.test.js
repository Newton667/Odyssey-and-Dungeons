import { describe, it, expect } from 'vitest';
import { getCharClasses, isMulticlass, getSpellcastingClasses } from './multiclass';

describe('getCharClasses — which copy of class/level/subclass wins', () => {
  // Regression: the sheet's Level Up used to persist `classes: [{…}]` for a
  // single-class character. From then on getCharClasses read that frozen array
  // and ignored char.class/level/subclass — so the editor's Lv Up, a class
  // change, or a subclass picked on the Progression tab silently did nothing.
  it('a one-element classes array defers to the top-level fields, which every writer keeps current', () => {
    const char = {
      class: 'Wizard', level: 6, subclass: 'School of Evocation',
      classes: [{ class: 'Wizard', level: 5, subclass: '' }],
    };
    expect(getCharClasses(char)).toEqual([{ class: 'Wizard', subclass: 'School of Evocation', level: 6 }]);
    expect(isMulticlass(char)).toBe(false);
  });

  it('a real multiclass array still wins over the summary fields', () => {
    const char = {
      class: 'Fighter', level: 8, subclass: 'Champion',
      classes: [{ class: 'Fighter', level: 5, subclass: 'Champion' }, { class: 'Wizard', level: 3, subclass: '' }],
    };
    expect(getCharClasses(char)).toEqual([
      { class: 'Fighter', subclass: 'Champion', level: 5 },
      { class: 'Wizard', subclass: '', level: 3 },
    ]);
    expect(isMulticlass(char)).toBe(true);
  });

  it('ignores blank rows when deciding whether the array is a real multiclass', () => {
    const char = { class: 'Fighter', level: 3, classes: [{ class: 'Fighter', level: 3 }, { class: '', level: 1 }] };
    expect(getCharClasses(char)).toEqual([{ class: 'Fighter', subclass: '', level: 3 }]);
  });
});

describe('getSpellcastingClasses — Spellcasting starts at the class level the ruleset says', () => {
  // 2014 Paladins and Rangers gain Spellcasting at level 2 (PHB p.84, p.91); the
  // sheet used to show a spell save DC and allow prepared spells at level 1.
  it('excludes a level-1 2014 Paladin or Ranger', () => {
    expect(getSpellcastingClasses({ class: 'Paladin', level: 1, ruleset: '2014' })).toEqual([]);
    expect(getSpellcastingClasses({ class: 'Ranger', level: 1 })).toEqual([]);
  });

  it('includes them from level 2 in 2014', () => {
    expect(getSpellcastingClasses({ class: 'Paladin', level: 2, ruleset: '2014' }).map(c => c.class)).toEqual(['Paladin']);
  });

  it('includes a level-1 2024 Paladin or Ranger — the revision moves Spellcasting to level 1', () => {
    expect(getSpellcastingClasses({ class: 'Paladin', level: 1, ruleset: '2024' }).map(c => c.class)).toEqual(['Paladin']);
    expect(getSpellcastingClasses({ class: 'Ranger', level: 1, ruleset: '2024' }).map(c => c.class)).toEqual(['Ranger']);
  });

  it('gates on the class level, not the total level, when multiclassed', () => {
    const char = { ruleset: '2014', class: 'Fighter', level: 6, classes: [{ class: 'Fighter', level: 5 }, { class: 'Paladin', level: 1 }] };
    expect(getSpellcastingClasses(char)).toEqual([]);
  });

  it('leaves full casters untouched at level 1', () => {
    expect(getSpellcastingClasses({ class: 'Wizard', level: 1 })).toEqual([
      { class: 'Wizard', subclass: '', level: 1, ability: 'intelligence' },
    ]);
  });
});
