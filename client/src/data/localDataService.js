import equipmentData from './equipment.json';
import spellsData from './spells.json';

export function queryLocalEquipment({ category, subcategory, search, rarity } = {}) {
  let results = [...equipmentData];
  if (category) results = results.filter(i => i.category === category);
  if (subcategory) results = results.filter(i => new RegExp(subcategory, 'i').test(i.subcategory));
  if (search) results = results.filter(i => new RegExp(search, 'i').test(i.name));
  if (rarity) results = results.filter(i => i.rarity === rarity);
  return results.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.subcategory || '').localeCompare(b.subcategory || '') || (a.name || '').localeCompare(b.name || ''));
}

export function queryLocalSpells({ level, school, cls, search, source, sourceRace } = {}) {
  let results = [...spellsData];
  if (level !== undefined && level !== '' && level !== null) results = results.filter(s => s.level === Number(level));
  if (school) results = results.filter(s => new RegExp(school, 'i').test(s.school));
  if (cls) results = results.filter(s => (s.classes || []).includes(cls));
  if (search) results = results.filter(s => new RegExp(search, 'i').test(s.name));
  if (source) results = results.filter(s => s.source === source);
  if (sourceRace) {
    const vals = Array.isArray(sourceRace) ? sourceRace : [sourceRace];
    results = results.filter(s => vals.includes(s.sourceRace));
  }
  return results.sort((a, b) => (a.level || 0) - (b.level || 0) || (a.name || '').localeCompare(b.name || ''));
}

export function getLocalEquipmentByName(name) {
  return equipmentData.find(i => i.name === name) || null;
}

// These return a SHALLOW COPY, never the imported array itself.
// Handing out the module's own array let a caller do `getAllLocalSpells().push(...)`
// and permanently append to the shared list — every later call saw the extra entries,
// and a caller that ran on a timer or an effect accumulated a fresh duplicate each run.
// That is exactly how homebrew spells ended up listed ten times. Keep the spread.
export function getAllLocalSpells() {
  return [...spellsData];
}

export function getAllLocalEquipment() {
  return [...equipmentData];
}
