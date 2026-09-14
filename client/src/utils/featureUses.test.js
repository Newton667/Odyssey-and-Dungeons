import { describe, it, expect } from 'vitest';
import { computeFeatureUses } from './featureUses';

describe('computeFeatureUses', () => {
  // The sheet's effective score is base + abilityBonuses; counters used to read
  // the base alone, so a Bard whose item bonus raised CHA 14 → 16 still had
  // two Bardic Inspirations while the sheet showed a +3 modifier.
  it('reads the effective ability score (base + misc bonus)', () => {
    const char = { abilityScores: { charisma: 14 }, abilityBonuses: { charisma: 2 } };
    expect(computeFeatureUses('Bardic Inspiration', 3, char, 'Bard').max).toBe(3);
    expect(computeFeatureUses('Divine Sense', 3, char, 'Paladin').max).toBe(4);
  });

  it('still works when abilityBonuses is missing (old saves)', () => {
    expect(computeFeatureUses('Bardic Inspiration', 3, { abilityScores: { charisma: 14 } }, 'Bard').max).toBe(2);
  });

  // Archdruid (level 20): Wild Shape any number of times — no counter, like Rage at 20.
  it('drops the Wild Shape counter at druid level 20', () => {
    expect(computeFeatureUses('Wild Shape', 19, {}, 'Druid')).toEqual({ max: 2, recharge: 'short', unit: undefined });
    expect(computeFeatureUses('Wild Shape', 20, {}, 'Druid')).toBeNull();
  });

  // 2024 Druid: 2 uses, 3 at level 6, 4 at level 17 — and the 2024 capstone no longer
  // makes Wild Shape unlimited.
  it('scales Wild Shape uses under the 2024 rules', () => {
    const c = { ruleset: '2024' };
    expect(computeFeatureUses('Wild Shape', 2, c, 'Druid').max).toBe(2);
    expect(computeFeatureUses('Wild Shape', 6, c, 'Druid').max).toBe(3);
    expect(computeFeatureUses('Wild Shape', 17, c, 'Druid').max).toBe(4);
    expect(computeFeatureUses('Wild Shape', 20, c, 'Druid').max).toBe(4);
  });
});
