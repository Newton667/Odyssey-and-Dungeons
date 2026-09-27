import { describe, it, expect } from 'vitest';
import * as S from './subclassSpells';
import { getSubclassSpells } from './subclassData';
import { THIRD_CASTER_SLOTS } from './classData';
import spells from '../data/spells.json';

const have = new Set(spells.map(s => s.name));
const sorted = (xs) => [...xs].sort();

describe('subclass spell names exist in spells.json', () => {
  it('every table name is in spells.json or listed as missing', () => {
    for (const name of S.allSubclassSpellNames()) {
      expect(have.has(name) || S.SUBCLASS_SPELLS_NOT_IN_DATA.has(name), name).toBe(true);
    }
  });

  it('every "missing" name is really absent (adding a spell forces the set to be cleaned)', () => {
    for (const name of S.SUBCLASS_SPELLS_NOT_IN_DATA) expect(have.has(name), name).toBe(false);
  });

  it('lists exactly the seven known missing names', () => {
    expect([...S.SUBCLASS_SPELLS_NOT_IN_DATA].sort()).toEqual(
      ['Commune', 'Commune with Nature', 'Fount of Moonlight', 'Hallow', "Rary's Telepathic Bond", 'Starry Wisp', 'Summon Dragon'],
    );
  });
});

describe('getSubclassSpells — 2014 always-prepared (class-level rows)', () => {
  it('Life Domain grows with cleric level', () => {
    expect(sorted(getSubclassSpells('Cleric', 'Life Domain', 1, '2014').alwaysPrepared)).toEqual(['Bless', 'Cure Wounds']);
    expect(sorted(getSubclassSpells('Cleric', 'Life Domain', 5, '2014').alwaysPrepared)).toEqual(
      ['Beacon of Hope', 'Bless', 'Cure Wounds', 'Lesser Restoration', 'Revivify', 'Spiritual Weapon'],
    );
    const nine = getSubclassSpells('Cleric', 'Life Domain', 9, '2014').alwaysPrepared;
    expect(nine).toHaveLength(10);
    expect(nine).toContain('Mass Cure Wounds');
    expect(nine).toContain('Raise Dead');
  });

  it('Light Domain includes the bonus Light cantrip', () => {
    expect(sorted(getSubclassSpells('Cleric', 'Light Domain', 1, '2014').alwaysPrepared)).toEqual(['Burning Hands', 'Faerie Fire', 'Light']);
  });

  it('Paladin oaths start at paladin level 3', () => {
    expect(sorted(getSubclassSpells('Paladin', 'Oath of Devotion', 3, '2014').alwaysPrepared)).toEqual(['Protection from Evil and Good', 'Sanctuary']);
    expect(getSubclassSpells('Paladin', 'Oath of Devotion', 2, '2014').alwaysPrepared).toEqual([]);
    const glory = getSubclassSpells('Paladin', 'Oath of Glory', 17, '2014').alwaysPrepared;
    expect(glory).toContain('Commune');
    expect(glory).toContain('Flame Strike');
  });
});

describe('getSubclassSpells — 2024 always-prepared', () => {
  it('Life Domain starts at 3', () => {
    expect(getSubclassSpells('Cleric', 'Life Domain', 2, '2024').alwaysPrepared).toEqual([]);
    expect(sorted(getSubclassSpells('Cleric', 'Life Domain', 3, '2024').alwaysPrepared)).toEqual(['Aid', 'Bless', 'Cure Wounds', 'Lesser Restoration']);
    expect(sorted(getSubclassSpells('Cleric', 'Life Domain', 5, '2024').alwaysPrepared)).toEqual(
      ['Aid', 'Bless', 'Cure Wounds', 'Lesser Restoration', 'Mass Healing Word', 'Revivify'],
    );
  });

  it('a shared name uses its own edition table', () => {
    expect(sorted(getSubclassSpells('Paladin', 'Oath of Devotion', 3, '2024').alwaysPrepared)).toEqual(['Protection from Evil and Good', 'Shield of Faith']);
    const glory = getSubclassSpells('Paladin', 'Oath of Glory', 17, '2024').alwaysPrepared;
    expect(glory).toContain('Legend Lore');
    expect(glory).toContain("Yolande's Regal Presence");
    expect(glory).not.toContain('Commune');
  });

  it('Stars and 2024 patrons are prepared', () => {
    expect(sorted(getSubclassSpells('Druid', 'Circle of the Stars', 9, '2024').alwaysPrepared)).toEqual(['Guidance', 'Guiding Bolt']);
    expect(sorted(getSubclassSpells('Warlock', 'Fiend Patron', 3, '2024').alwaysPrepared)).toEqual(['Burning Hands', 'Command', 'Scorching Ray', 'Suggestion']);
    const fiend5 = getSubclassSpells('Warlock', 'Fiend Patron', 5, '2024');
    expect(fiend5.alwaysPrepared).toContain('Fireball');
    expect(fiend5.expanded).toEqual([]);
    expect(fiend5.edition).toBe('2024');
  });
});

describe('getSubclassSpells — 2014 Warlock expanded (spell-level rows)', () => {
  it('widens the list up to the warlock\'s max spell level, never prepares', () => {
    const f1 = getSubclassSpells('Warlock', 'The Fiend', 1, '2014');
    expect(f1.alwaysPrepared).toEqual([]);
    expect(sorted(f1.expanded)).toEqual(['Burning Hands', 'Command']);

    const f5 = getSubclassSpells('Warlock', 'The Fiend', 5, '2014');
    expect(f5.alwaysPrepared).toEqual([]);
    expect(sorted(f5.expanded)).toEqual(['Blindness/Deafness', 'Burning Hands', 'Command', 'Fireball', 'Scorching Ray', 'Stinking Cloud']);

    const f9 = getSubclassSpells('Warlock', 'The Fiend', 9, '2014').expanded;
    expect(f9).toHaveLength(10);
    expect(f9).toContain('Flame Strike');
    expect(f9).toContain('Hallow');
  });

  it('a legacy 2014 patron on a 2024 character stays expanded', () => {
    const r = getSubclassSpells('Warlock', 'The Fiend', 5, '2024');
    expect(sorted(r.expanded)).toEqual(['Blindness/Deafness', 'Burning Hands', 'Command', 'Fireball', 'Scorching Ray', 'Stinking Cloud']);
    expect(r.alwaysPrepared).toEqual([]);
    expect(r.edition).toBe('2014');
  });
});

describe('getSubclassSpells — Circle of the Land', () => {
  it('reads the chosen land from either edition\'s table', () => {
    expect(sorted(getSubclassSpells('Druid', 'Circle of the Land', 3, '2024', { land: 'Arid' }).alwaysPrepared)).toEqual(['Blur', 'Burning Hands', 'Fire Bolt']);
    expect(sorted(getSubclassSpells('Druid', 'Circle of the Land', 3, '2024', { land: 'Polar' }).alwaysPrepared)).toEqual(['Fog Cloud', 'Hold Person', 'Ray of Frost']);
    expect(getSubclassSpells('Druid', 'Circle of the Land', 3, '2024').alwaysPrepared).toEqual([]);
    expect(sorted(getSubclassSpells('Druid', 'Circle of the Land', 3, '2014', { land: 'Arctic' }).alwaysPrepared)).toEqual(['Hold Person', 'Spike Growth']);
    const arctic9 = getSubclassSpells('Druid', 'Circle of the Land', 9, '2014', { land: 'Arctic' }).alwaysPrepared;
    expect(arctic9).toHaveLength(8);
    expect(arctic9).toContain('Freedom of Movement');
    expect(arctic9).toContain('Ice Storm');
    expect(arctic9).toContain('Cone of Cold');
    expect(getSubclassSpells('Druid', 'Circle of the Land', 2, '2014', { land: 'Arctic' }).alwaysPrepared).toEqual([]);
  });

  it('a 2024 save that already holds a 2014 land uses the 2014 spells', () => {
    expect(sorted(getSubclassSpells('Druid', 'Circle of the Land', 3, '2024', { land: 'Forest' }).alwaysPrepared)).toEqual(['Barkskin', 'Spider Climb']);
  });
});

describe('getSubclassSpells — no table', () => {
  it('returns empty lists for subclasses without spells', () => {
    for (const sc of ['Champion', 'Eldritch Knight']) {
      const r = getSubclassSpells('Fighter', sc, 10, '2014');
      expect(r.alwaysPrepared, sc).toEqual([]);
      expect(r.expanded, sc).toEqual([]);
    }
  });
});

describe('THIRD_CASTER_PROGRESSION', () => {
  it('every array has 20 entries and never decreases', () => {
    for (const rs of ['2014', '2024']) {
      for (const sc of ['Eldritch Knight', 'Arcane Trickster']) {
        for (const key of ['cantrips', 'spells']) {
          const arr = S.THIRD_CASTER_PROGRESSION[rs][sc][key];
          expect(arr, `${rs}/${sc}/${key}`).toHaveLength(20);
          for (let i = 1; i < 20; i++) expect(arr[i] >= arr[i - 1], `${rs}/${sc}/${key}[${i}]`).toBe(true);
        }
      }
    }
  });

  it('2014 Eldritch Knight', () => {
    const ek = S.THIRD_CASTER_PROGRESSION['2014']['Eldritch Knight'];
    expect(ek.cantrips[2]).toBe(2);
    expect(ek.cantrips[9]).toBe(3);
    expect(ek.spells[2]).toBe(3);
    expect(ek.spells[9]).toBe(7);
    expect(ek.spells[19]).toBe(13);
    expect(ek).toMatchObject({ type: 'known', schools: ['Abjuration', 'Evocation'], anySchoolLevels: [3, 8, 14, 20], alwaysKnownCantrips: [] });
  });

  it('2014 Arcane Trickster', () => {
    const at = S.THIRD_CASTER_PROGRESSION['2014']['Arcane Trickster'];
    expect(at.cantrips[2]).toBe(3);
    expect(at.cantrips[9]).toBe(4);
    expect(at.schools).toEqual(['Enchantment', 'Illusion']);
    expect(at.alwaysKnownCantrips).toEqual(['Mage Hand']);
  });

  it('2024 (least-certain counts)', () => {
    const ek = S.THIRD_CASTER_PROGRESSION['2024']['Eldritch Knight'];
    expect(ek).toMatchObject({ type: 'prepared', schools: null, anySchoolLevels: [] });
    expect(ek.spells).toEqual(S.THIRD_CASTER_PROGRESSION['2014']['Eldritch Knight'].spells);
    expect(S.THIRD_CASTER_PROGRESSION['2024']['Arcane Trickster'].alwaysKnownCantrips).toEqual(['Mage Hand']);
  });
});

describe('THIRD_CASTER_SLOTS', () => {
  it('follows the one-third caster table', () => {
    expect(THIRD_CASTER_SLOTS[2] ?? null).toBe(null);
    expect(THIRD_CASTER_SLOTS[3]).toEqual([2, 0, 0, 0]);
    expect(THIRD_CASTER_SLOTS[6]).toEqual([3, 0, 0, 0]);
    expect(THIRD_CASTER_SLOTS[7]).toEqual([4, 2, 0, 0]);
    expect(THIRD_CASTER_SLOTS[10]).toEqual([4, 3, 0, 0]);
    expect(THIRD_CASTER_SLOTS[13]).toEqual([4, 3, 2, 0]);
    expect(THIRD_CASTER_SLOTS[16]).toEqual([4, 3, 3, 0]);
    expect(THIRD_CASTER_SLOTS[19]).toEqual([4, 3, 3, 1]);
    expect(THIRD_CASTER_SLOTS[20]).toEqual([4, 3, 3, 1]);
  });
});
