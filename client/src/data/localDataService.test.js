import { describe, it, expect } from 'vitest';
import { getAllLocalSpells, getAllLocalEquipment, queryLocalSpells, queryLocalEquipment } from './localDataService';

describe('localDataService — search text is literal, never a regular expression', () => {
  // Regression: `new RegExp(search, 'i')` threw "Invalid regular expression" as soon
  // as the user typed `+` (the start of "+1 Longsword") or `(`, inside a load effect —
  // the error boundary then replaced the whole Equipment/Spells page.
  it('does not throw on regex metacharacters', () => {
    for (const q of ['+', '+1', '(', ')', '[', '?', '*', '\\', 'Acid (vial']) {
      expect(() => queryLocalEquipment({ search: q })).not.toThrow();
      expect(() => queryLocalSpells({ search: q })).not.toThrow();
    }
  });

  it('matches names containing the literal characters', () => {
    const plusOne = queryLocalEquipment({ search: '+1' });
    expect(plusOne.length).toBeGreaterThan(0);
    expect(plusOne.every(i => i.name.toLowerCase().includes('+1'))).toBe(true);
  });

  it('treats a dot as a dot, not "any character"', () => {
    const dotted = queryLocalEquipment({ search: '.' });
    expect(dotted.every(i => i.name.includes('.'))).toBe(true);
  });

  it('is still case-insensitive', () => {
    expect(queryLocalSpells({ search: 'FIRE BOLT' }).map(s => s.name)).toContain('Fire Bolt');
  });
});

describe('localDataService — getters must not hand out the shared array', () => {
  // Regression: getAllLocalSpells() used to return the imported spells.json array itself.
  // CharacterSheet did `getAllLocalSpells().push(...homebrewSpells)`, which permanently
  // appended to that shared array. The effect re-ran on every prepared-spell change and on
  // every debounced spell-browser keystroke, so homebrew spells accumulated one duplicate
  // per run — the reported "custom spells listed 10 times".
  it('returns a fresh array each call, so a caller mutating it cannot poison the source', () => {
    const first = getAllLocalSpells();
    const baseline = first.length;

    first.push({ name: 'ZZ Injected Spell', level: 0 });
    expect(first.length).toBe(baseline + 1);

    const second = getAllLocalSpells();
    expect(second.length).toBe(baseline);
    expect(second.some(s => s.name === 'ZZ Injected Spell')).toBe(false);
    expect(second).not.toBe(first);
  });

  it('survives repeated mutation without accumulating duplicates', () => {
    const baseline = getAllLocalSpells().length;
    for (let i = 0; i < 10; i++) {
      getAllLocalSpells().push({ name: 'ZZ Homebrew Cantrip', level: 0 });
    }
    const after = getAllLocalSpells();
    expect(after.length).toBe(baseline);
    expect(after.filter(s => s.name === 'ZZ Homebrew Cantrip')).toHaveLength(0);
  });

  it('applies the same protection to equipment', () => {
    const baseline = getAllLocalEquipment().length;
    getAllLocalEquipment().push({ name: 'ZZ Injected Item' });
    expect(getAllLocalEquipment().length).toBe(baseline);
  });

  it('query helpers were already safe and stay safe', () => {
    const baseline = queryLocalSpells({ search: 'fire' }).length;
    queryLocalSpells({ search: 'fire' }).push({ name: 'ZZ' });
    expect(queryLocalSpells({ search: 'fire' }).length).toBe(baseline);
  });
});
