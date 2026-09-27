import { describe, it, expect } from 'vitest';
import {
  getLevelChoices, migrateSingleClassChoices, asiChoiceEffect, relocateOrphanedChoices, dropChampionStyle,
  getHunterOptions, getLandOptions, HUNTER_OPTIONS, LAND_TERRAINS, LAND_TERRAINS_2024,
} from './levelChoices';

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

// ─── Subclass-dependent choices per ruleset (subclass rework, Increment 6) ───

const typeAt = (choices, type) => choices.find(c => c.type === type);

describe('Circle of the Land — land choice follows the subclass level', () => {
  it('2024 picks the land at 3, stamped with its edition', () => {
    expect(getLevelChoices('Druid', 3, 'Circle of the Land', '2024')).toContainEqual(expect.objectContaining({ type: 'land-terrain', edition: '2024' }));
    expect(typeAt(getLevelChoices('Druid', 2, 'Circle of the Land', '2024'), 'land-terrain')).toBeUndefined();
  });
  it('2014 keeps level 2', () => {
    expect(getLevelChoices('Druid', 2, 'Circle of the Land', '2014')).toContainEqual(expect.objectContaining({ type: 'land-terrain', edition: '2014' }));
    expect(typeAt(getLevelChoices('Druid', 3, 'Circle of the Land', '2014'), 'land-terrain')).toBeUndefined();
  });
});

describe('Hunter — per-edition choice points', () => {
  const hunterLevels = (rs) => Array.from({ length: 20 }, (_, i) => i + 1)
    .filter(l => typeAt(getLevelChoices('Ranger', l, 'Hunter', rs), 'hunter-option'));
  it('2024 chooses at 3 and 7 only; 2014 at 3/7/11/15', () => {
    expect(hunterLevels('2024')).toEqual([3, 7]);
    expect(hunterLevels('2014')).toEqual([3, 7, 11, 15]);
    expect(typeAt(getLevelChoices('Ranger', 7, 'Hunter', '2024'), 'hunter-option')).toMatchObject({ label: 'Defensive Tactics', edition: '2024' });
  });
  it('getHunterOptions per edition', () => {
    expect(getHunterOptions(3, '2024').options.map(o => o.name).sort()).toEqual(['Colossus Slayer', 'Horde Breaker']);
    expect(getHunterOptions(7, '2024').options.map(o => o.name).sort()).toEqual(['Escape the Horde', 'Multiattack Defense']);
    expect(getHunterOptions(3, '2014').options).toHaveLength(3);
  });
  it('appends a stored pick from the other edition, labelled', () => {
    const legacy = getHunterOptions(3, '2024', 'Giant Killer').options;
    expect(legacy).toHaveLength(3);
    expect(legacy[legacy.length - 1]).toMatchObject({ name: 'Giant Killer', legacy: true });
    expect(legacy[legacy.length - 1].label).toMatch(/Giant Killer \(2014 rules\)/);
    expect(getHunterOptions(3, '2014', 'Giant Killer').options).toHaveLength(3);
    expect(getHunterOptions(3, '2024', 'Colossus Slayer').options).toHaveLength(2);
  });
  it('[guard] keeps the 2014 HUNTER_OPTIONS export', () => {
    expect(Object.keys(HUNTER_OPTIONS)).toEqual(['3', '7', '11', '15']);
  });
});

describe('Champion — Additional Fighting Style per edition', () => {
  it('2024 at 7, 2014 at 10, flagged additional', () => {
    expect(getLevelChoices('Fighter', 7, 'Champion', '2024')).toContainEqual(expect.objectContaining({ type: 'fighting-style', additional: true }));
    expect(typeAt(getLevelChoices('Fighter', 10, 'Champion', '2024'), 'fighting-style')).toBeUndefined();
    expect(getLevelChoices('Fighter', 10, 'Champion', '2014')).toContainEqual(expect.objectContaining({ type: 'fighting-style', additional: true }));
    expect(typeAt(getLevelChoices('Fighter', 7, 'Champion', '2014'), 'fighting-style')).toBeUndefined();
    expect(typeAt(getLevelChoices('Fighter', 1, 'Champion', '2014'), 'fighting-style').additional).toBeFalsy();
  });
});

describe('Unchanged schedules', () => {
  it('[guard] a legacy Totem Warrior keeps 3/6/14; Battle Master maneuvers unchanged', () => {
    expect(typeAt(getLevelChoices('Barbarian', 6, 'Path of the Totem Warrior', '2024'), 'totem')).toBeDefined();
    expect(typeAt(getLevelChoices('Fighter', 7, 'Battle Master', '2024'), 'maneuvers')).toBeDefined();
  });
});

describe('relocateOrphanedChoices — per-edition picks', () => {
  const opts = (cls, extra = {}) => ({ cls, subclass: '', ruleset: '2014', namespaced: false, ...extra });

  it('[guard] a 2014 Hunter L11 pick stays put under 2024', () => {
    expect(relocateOrphanedChoices({ 11: { 'hunter-option': 'Volley' } }, opts('Ranger', { subclass: 'Hunter', ruleset: '2024' })).changed).toBe(false);
  });
  it('never moves level-specific picks (hunter options, totems)', () => {
    expect(relocateOrphanedChoices({ 5: { 'hunter-option': 'Colossus Slayer' } }, opts('Ranger', { subclass: 'Hunter' })).changed).toBe(false);
    expect(relocateOrphanedChoices({ 5: { totem: 'Bear' } }, opts('Barbarian', { subclass: 'Path of the Totem Warrior' })).changed).toBe(false);
  });
  it('moves a 2014 land pick to the 2024 card at 3', () => {
    expect(relocateOrphanedChoices({ 2: { 'land-terrain': 'Forest' } }, opts('Druid', { subclass: 'Circle of the Land', ruleset: '2024' })))
      .toEqual({ changed: true, levelChoices: { 3: { 'land-terrain': 'Forest' } } });
    expect(relocateOrphanedChoices({ 'Druid:2': { 'land-terrain': 'Forest' } }, opts('Druid', { subclass: 'Circle of the Land', ruleset: '2024', namespaced: true })).levelChoices)
      .toEqual({ 'Druid:3': { 'land-terrain': 'Forest' } });
  });
  it('a Champion additional style only moves to an additional card', () => {
    expect(relocateOrphanedChoices({ 7: { 'fighting-style': 'Defense' } }, opts('Fighter', { subclass: 'Champion', ruleset: '2014' })).levelChoices)
      .toEqual({ 10: { 'fighting-style': 'Defense' } });
  });
  it('[guard] a correctly placed 2014 Champion pick never moves', () => {
    expect(relocateOrphanedChoices({ 10: { 'fighting-style': 'Defense' } }, opts('Fighter', { subclass: 'Champion', ruleset: '2014' })).changed).toBe(false);
  });
  it('a 2014 Champion L10 style moves to the 2024 L7 card', () => {
    expect(relocateOrphanedChoices({ 10: { 'fighting-style': 'Defense' } }, opts('Fighter', { subclass: 'Champion', ruleset: '2024' })).levelChoices)
      .toEqual({ 7: { 'fighting-style': 'Defense' } });
  });
  it('a 2024 Champion with L1 and L7 styles stays put', () => {
    expect(relocateOrphanedChoices({ 1: { 'fighting-style': 'Dueling' }, 7: { 'fighting-style': 'Defense' } }, opts('Fighter', { subclass: 'Champion', ruleset: '2024' })).changed).toBe(false);
  });
});

describe('land option helpers and text', () => {
  it('lists each edition\'s lands and appends a legacy pick', () => {
    expect(getLandOptions('2024').map(o => o.name)).toEqual(['Arid', 'Polar', 'Temperate', 'Tropical']);
    const legacy = getLandOptions('2024', 'Arctic');
    expect(legacy).toHaveLength(5);
    expect(legacy[legacy.length - 1]).toMatchObject({ name: 'Arctic', legacy: true });
    expect(legacy[legacy.length - 1].label).toMatch(/\(2014 rules\)/);
    expect(getLandOptions('2024', 'Polar')).toHaveLength(4);
    const other = getLandOptions('2014', 'Polar');
    expect(other[other.length - 1].label).toMatch(/\(2024 rules\)/);
  });
  it('land tables keep their keys and list every circle spell', () => {
    expect(Object.keys(LAND_TERRAINS)).toEqual(['Arctic', 'Coast', 'Desert', 'Forest', 'Grassland', 'Mountain', 'Swamp', 'Underdark']);
    expect(Object.keys(LAND_TERRAINS_2024)).toEqual(['Arid', 'Polar', 'Temperate', 'Tropical']);
    expect(LAND_TERRAINS.Arctic).toContain('Ice Storm');
    expect(LAND_TERRAINS.Arctic).toContain('Freedom of Movement');
    expect(LAND_TERRAINS.Swamp).toContain("Melf's Acid Arrow");
    expect(LAND_TERRAINS.Swamp).toContain('Scrying');
    expect(LAND_TERRAINS_2024.Polar).toContain('Ray of Frost');
  });
});

describe('dropChampionStyle — leaving Champion drops its Additional Fighting Style', () => {
  // Regression (v1.9.0 review M1): a Fighter 10 with Archery + Champion Defense switched to
  // Battle Master kept Defense (+1 AC), and relocation moved the L10 pick onto the L1 card.
  const char = {
    features: ['Fighting Style: Archery', 'Fighting Style (Champion): Defense', 'Second Wind'],
    levelChoices: { 4: { asi: '+2 Dexterity' }, 10: { 'fighting-style': 'Defense' } },
  };

  it('removes the feature and the L10 pick once no class is a Champion', () => {
    const r = dropChampionStyle(char, [{ class: 'Fighter', subclass: 'Battle Master', level: 10 }]);
    expect(r.changed).toBe(true);
    expect(r.features).toEqual(['Fighting Style: Archery', 'Second Wind']);
    expect(r.levelChoices).toEqual({ 4: { asi: '+2 Dexterity' } });
    // …so relocation has nothing left to move onto the level-1 style card.
    expect(relocateOrphanedChoices(r.levelChoices, { cls: 'Fighter', subclass: 'Battle Master', ruleset: '2014' }).changed).toBe(false);
  });

  it('leaves a Champion untouched', () => {
    const r = dropChampionStyle(char, [{ class: 'Fighter', subclass: 'Champion', level: 10 }]);
    expect(r.changed).toBe(false);
    expect(r.features).toBe(char.features);
    expect(r.levelChoices).toBe(char.levelChoices);
  });

  it('multiclass keys, 2024 level 7, and other picks at the same level survive', () => {
    const mc = {
      features: [{ name: 'Fighting Style (Champion): Dueling' }, 'Fighting Style (Fighter): Defense'],
      levelChoices: { 'Fighter:7': { 'fighting-style': 'Dueling', other: 'x' }, 'Wizard:4': { asi: 'Alert' } },
    };
    const r = dropChampionStyle(mc, [{ class: 'Fighter', subclass: 'Psi Warrior', level: 7 }, { class: 'Wizard', subclass: '', level: 4 }]);
    expect(r.features).toEqual(['Fighting Style (Fighter): Defense']);
    expect(r.levelChoices).toEqual({ 'Fighter:7': { other: 'x' }, 'Wizard:4': { asi: 'Alert' } });
  });

  it('keeps a pick at 7/10 that is not the Champion style (an old-save level-1 orphan)', () => {
    const old = { features: ['Fighting Style (Champion): Defense'], levelChoices: { 7: { 'fighting-style': 'Archery' } } };
    const r = dropChampionStyle(old, [{ class: 'Fighter', subclass: 'Battle Master', level: 10 }]);
    expect(r.features).toEqual([]);
    expect(r.levelChoices).toEqual({ 7: { 'fighting-style': 'Archery' } });
  });

  it('no Champion feature → no change', () => {
    const r = dropChampionStyle({ features: ['Fighting Style: Archery'], levelChoices: {} }, [{ class: 'Fighter', subclass: 'Battle Master', level: 10 }]);
    expect(r.changed).toBe(false);
  });
});
