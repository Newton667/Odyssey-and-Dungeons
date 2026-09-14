import { describe, it, expect } from 'vitest';
import { getLevelChoices, migrateSingleClassChoices, asiChoiceEffect, relocateOrphanedChoices } from './levelChoices';

describe('getLevelChoices — every choice knows its own level', () => {
  // Regression: only totem and hunter-option carried `level`. The Progression tab
  // stores a pick under `choice.level || currentLevel`, so a Fighter 8 choosing
  // the level-4 ASI saved it under "8" — and the level-6 card then read it back
  // as its own and "undid" it when a different ASI was picked there.
  it('stamps the level on every choice type', () => {
    const cases = [
      ['Fighter', 4, ''], ['Fighter', 1, ''], ['Sorcerer', 3, ''], ['Warlock', 2, ''],
      ['Warlock', 5, ''], ['Fighter', 7, 'Battle Master'], ['Ranger', 6, ''], ['Rogue', 6, ''],
      ['Barbarian', 6, 'Path of the Totem Warrior'], ['Cleric', 1, ''],
    ];
    for (const [cls, lvl, sub] of cases) {
      const choices = getLevelChoices(cls, lvl, sub);
      expect(choices.length).toBeGreaterThan(0);
      for (const c of choices) expect(c.level).toBe(lvl);
    }
  });
});

describe('getLevelChoices — subclass level follows the ruleset', () => {
  it('keeps the 2014 subclass levels', () => {
    const has = (cls, lvl) => getLevelChoices(cls, lvl, '', '2014').some(c => c.type === 'subclass');
    expect(has('Cleric', 1)).toBe(true);
    expect(has('Wizard', 2)).toBe(true);
    expect(has('Druid', 2)).toBe(true);
    expect(has('Sorcerer', 1)).toBe(true);
    expect(has('Warlock', 1)).toBe(true);
    expect(has('Fighter', 3)).toBe(true);
    expect(has('Cleric', 3)).toBe(false);
  });

  it('defaults to 2014 when no ruleset is passed', () => {
    expect(getLevelChoices('Cleric', 1, '').some(c => c.type === 'subclass')).toBe(true);
  });

  it('offers every 2024 subclass at level 3 and never earlier', () => {
    for (const cls of ['Cleric', 'Sorcerer', 'Warlock', 'Wizard', 'Druid', 'Fighter']) {
      expect(getLevelChoices(cls, 3, '', '2024').some(c => c.type === 'subclass')).toBe(true);
      for (const lvl of [1, 2]) {
        expect(getLevelChoices(cls, lvl, '', '2024').some(c => c.type === 'subclass')).toBe(false);
      }
    }
  });
});

describe('migrateSingleClassChoices — keep earlier picks visible after multiclassing', () => {
  // Single-class characters store picks under plain level keys ("4") and the
  // style as "Fighting Style: X". Once a second class is added the sheet reads
  // "Fighter:4" and "Fighting Style (Fighter): X", so without a migration every
  // earlier card looked unchosen and re-picking an ASI applied it twice.
  it('namespaces bare level keys by the original class', () => {
    const out = migrateSingleClassChoices({
      levelChoices: { 4: { asi: '+2 Strength' }, 1: { 'fighting-style': 'Archery' } },
      features: [],
    }, 'Fighter');
    expect(out.levelChoices).toEqual({ 'Fighter:4': { asi: '+2 Strength' }, 'Fighter:1': { 'fighting-style': 'Archery' } });
  });

  it('leaves already-namespaced keys alone', () => {
    const out = migrateSingleClassChoices({ levelChoices: { 'Wizard:2': { subclass: 'School of Evocation' } } }, 'Fighter');
    expect(out.levelChoices).toEqual({ 'Wizard:2': { subclass: 'School of Evocation' } });
  });

  it('renames the fighting-style feature, handling object entries from old saves', () => {
    const out = migrateSingleClassChoices({
      features: ['Second Wind', 'Fighting Style: Defense', { name: 'Athlete', desc: '…' }],
    }, 'Fighter');
    expect(out.features).toEqual(['Second Wind', 'Fighting Style (Fighter): Defense', { name: 'Athlete', desc: '…' }]);
  });

  it('creates the class-scoped feature from char.fightingStyle when no feature row exists', () => {
    const out = migrateSingleClassChoices({ fightingStyle: 'Dueling', features: ['Second Wind'] }, 'Paladin');
    expect(out.features).toEqual(['Second Wind', 'Fighting Style (Paladin): Dueling']);
  });

  it('copes with a character that has no choices or features at all', () => {
    expect(migrateSingleClassChoices({}, 'Rogue')).toEqual({ levelChoices: {}, features: [] });
  });
});

describe('asiChoiceEffect — what an ASI/feat pick does to the character', () => {
  it('reads +2 and +1/+1 options', () => {
    expect(asiChoiceEffect('+2 Strength')).toEqual({ deltas: { strength: 2 }, saves: [] });
    expect(asiChoiceEffect('+1 Dexterity / +1 Wisdom')).toEqual({ deltas: { dexterity: 1, wisdom: 1 }, saves: [] });
  });

  it('applies a fixed half-feat bonus', () => {
    expect(asiChoiceEffect('Durable')).toEqual({ deltas: { constitution: 1 }, saves: [] });
  });

  // Regression: the sheet's picker had its own copy of the table and always gave
  // the FIRST listed ability — Resilient was always +1 CON and never granted the
  // saving-throw proficiency that is the point of the feat.
  it('uses the chosen ability for a choice feat, and Resilient grants that save', () => {
    expect(asiChoiceEffect('Resilient', 'wisdom')).toEqual({ deltas: { wisdom: 1 }, saves: ['wisdom'] });
    expect(asiChoiceEffect('Observant', 'wisdom')).toEqual({ deltas: { wisdom: 1 }, saves: [] });
  });

  it('ignores a chosen ability the feat does not allow, falling back to the first option', () => {
    expect(asiChoiceEffect('Athlete', 'charisma')).toEqual({ deltas: { strength: 1 }, saves: [] });
  });

  it('gives nothing for a feat with no ability bonus, or no selection', () => {
    expect(asiChoiceEffect('Alert')).toEqual({ deltas: {}, saves: [] });
    expect(asiChoiceEffect(null)).toEqual({ deltas: {}, saves: [] });
  });
});

// Before every choice carried its own level, a pick was stored under the class's CURRENT
// level. Those keys no longer match any card, so the pick looked unchosen — and choosing it
// again applied the ASI a second time. Move each orphan to the card it most likely came from.
describe('relocateOrphanedChoices — repair picks saved under the wrong level', () => {
  const opts = (cls, extra = {}) => ({ cls, subclass: '', ruleset: '2014', namespaced: false, ...extra });

  it('moves an ASI saved at a non-ASI level down to the nearest ASI level, with its ability', () => {
    const r = relocateOrphanedChoices({ 5: { asi: 'Resilient', asiAbility: 'wisdom' } }, opts('Wizard'));
    expect(r.changed).toBe(true);
    expect(r.levelChoices).toEqual({ 4: { asi: 'Resilient', asiAbility: 'wisdom' } });
  });

  it('leaves a pick alone when its level really has that choice', () => {
    const lc = { 8: { asi: '+2 Strength' } };
    const r = relocateOrphanedChoices(lc, opts('Fighter'));
    expect(r.changed).toBe(false);
    expect(r.levelChoices).toEqual(lc);
  });

  it('splits one legacy entry across the levels each choice belongs to', () => {
    const r = relocateOrphanedChoices({ 4: { invocations: ['Agonizing Blast', 'Devil\'s Sight'], 'pact-boon': 'Pact of the Tome' } }, opts('Warlock'));
    expect(r.levelChoices).toEqual({ 2: { invocations: ['Agonizing Blast', 'Devil\'s Sight'] }, 3: { 'pact-boon': 'Pact of the Tome' } });
  });

  it('never overwrites a pick that is already on the target card — it takes the next free card', () => {
    const r = relocateOrphanedChoices({ 4: { asi: 'Alert' }, 5: { asi: '+2 Intelligence' } }, opts('Wizard'));
    expect(r.levelChoices).toEqual({ 4: { asi: 'Alert' }, 8: { asi: '+2 Intelligence' } });
  });

  it('only touches the keys of the class it is given when namespaced', () => {
    const lc = { 'Fighter:3': { asi: '+2 Strength' }, 'Wizard:3': { subclass: 'School of Evocation' } };
    const r = relocateOrphanedChoices(lc, opts('Fighter', { namespaced: true }));
    expect(r.levelChoices).toEqual({ 'Fighter:4': { asi: '+2 Strength' }, 'Wizard:3': { subclass: 'School of Evocation' } });
  });

  it('leaves an orphan with nowhere to go (e.g. maneuvers after switching away from Battle Master)', () => {
    const lc = { 3: { maneuvers: ['Riposte'] } };
    const r = relocateOrphanedChoices(lc, opts('Fighter', { subclass: 'Champion' }));
    expect(r.changed).toBe(false);
    expect(r.levelChoices).toEqual(lc);
  });

  it('copes with a missing or empty levelChoices', () => {
    expect(relocateOrphanedChoices(undefined, opts('Rogue'))).toEqual({ changed: false, levelChoices: {} });
  });
});
