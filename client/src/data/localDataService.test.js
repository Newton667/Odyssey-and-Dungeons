import { describe, it, expect } from 'vitest';
import { getAllLocalSpells, getAllLocalEquipment, queryLocalSpells } from './localDataService';

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
