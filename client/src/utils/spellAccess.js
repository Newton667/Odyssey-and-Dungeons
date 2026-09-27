import { getCharClasses } from './multiclass';
import { spellListClassFor } from './classData';
import { getSubclassSpells, thirdCasterSpellInfo } from './subclassData';

/**
 * The lower-cased class spell lists a character may draw from.
 *
 * That is every class they actually have (via `getCharClasses`, so multiclass
 * characters get all of them) plus any feat-granted list stored on
 * `char.featSpellLists`, e.g. `{ 'Magic Initiate': ['Cleric'] }`. A third-caster
 * subclass (Eldritch Knight / Arcane Trickster) adds the Wizard list from class
 * level 3, keeping the class's own name too.
 *
 * Values are normalised with `[].concat(v)` so a legacy bare string
 * (`{ 'Magic Initiate': 'Cleric' }`) still works.
 *
 * @returns {string[]} lower-cased class names; empty ⇒ the caller should not filter.
 */
export function allowedSpellClasses(char) {
  if (!char) return [];
  const names = [];
  for (const c of getCharClasses(char)) {
    names.push(c.class);
    if (c.level >= 3) names.push(spellListClassFor(c.class, c.subclass));
  }
  for (const value of Object.values(char.featSpellLists || {})) {
    for (const cls of [].concat(value)) if (cls) names.push(cls);
  }
  return [...new Set(names.filter(Boolean).map(c => String(c).toLowerCase()))];
}

/**
 * Does a spell-browser result survive the class filter?
 *
 * A spell with no `classes` (homebrew, racial) is always allowed — that escape
 * hatch predates this helper. An empty `allowed` set means "don't filter".
 */
export function spellMatchesClasses(spell, allowed) {
  if (!allowed?.length) return true;
  if (!spell?.classes?.length) return true;
  return spell.classes.some(c => allowed.includes(String(c).toLowerCase()));
}

// The Circle of the Land pick: the `Circle Land: X` feature (entries may be
// objects from old saves), falling back to a stored `land-terrain` level choice.
function circleLand(char) {
  for (const f of char?.features || []) {
    const name = typeof f === 'string' ? f : f?.name;
    const m = typeof name === 'string' && name.match(/^Circle Land:\s*(.+)$/);
    if (m) return m[1].trim();
  }
  for (const picks of Object.values(char?.levelChoices || {})) {
    const v = picks && picks['land-terrain'];
    if (typeof v === 'string' && v) return v;
  }
  return '';
}

/**
 * Names a 2014 Warlock patron's expanded list adds to the spells the character
 * may pick from (`getSubclassSpells(...).expanded`, across all classes).
 */
export function extraSpellNames(char) {
  const out = new Set();
  if (!char) return out;
  for (const c of getCharClasses(char)) {
    for (const n of getSubclassSpells(c.class, c.subclass, c.level, char.ruleset).expanded) out.add(n);
  }
  return out;
}

/**
 * Subclass spells the character always has prepared, derived (never stored):
 * `[{ name, source }]` with `source` = the subclass name. Includes domain /
 * oath / circle (with the chosen land) / 2024 subclass lists and an Arcane
 * Trickster's always-known Mage Hand. First source wins on a duplicate name.
 */
export function getAlwaysPreparedSpells(char) {
  if (!char) return [];
  const out = [];
  const seen = new Set();
  const add = (name, source) => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    out.push({ name, source });
  };
  for (const c of getCharClasses(char)) {
    if (!c.subclass) continue;
    const land = c.class === 'Druid' ? circleLand(char) : '';
    for (const n of getSubclassSpells(c.class, c.subclass, c.level, char.ruleset, { land }).alwaysPrepared) add(n, c.subclass);
    const third = thirdCasterSpellInfo(c.class, c.subclass, c.level, char.ruleset);
    if (third) for (const n of third.alwaysKnownCantrips) add(n, c.subclass);
  }
  return out;
}

/**
 * The spell objects the sheet shows: the prepared spells as-is plus the
 * always-prepared ones as SHALLOW COPIES tagged `_alwaysPrepared: source`
 * (the shared spell list is never mutated). De-duplicated by name, the
 * always-prepared tag winning, in `allSpells` order (the order the sheet has
 * always listed spells in). Always-prepared names with no spell data are
 * returned in `missing` so the UI can list them by name.
 * @returns {{ spells: object[], missing: string[] }}
 */
export function resolveSheetSpells({ preparedNames = [], alwaysPrepared = [], allSpells = [] } = {}) {
  const sourceOf = new Map();
  for (const { name, source } of alwaysPrepared || []) if (name && !sourceOf.has(name)) sourceOf.set(name, source);
  const prepared = new Set(preparedNames || []);
  const spells = [];
  const used = new Set();
  for (const s of allSpells || []) {
    const name = s?.name;
    if (!name || used.has(name)) continue;
    if (sourceOf.has(name)) spells.push({ ...s, _alwaysPrepared: sourceOf.get(name) });
    else if (prepared.has(name)) spells.push(s);
    else continue;
    used.add(name);
  }
  const missing = [...sourceOf.keys()].filter(n => !used.has(n));
  return { spells, missing };
}

/**
 * Cantrip / leveled counts that count against a character's limits:
 * racial spells and always-prepared subclass spells are excluded.
 */
export function spellLimitCounts(spells) {
  let cantrips = 0;
  let leveled = 0;
  for (const s of spells || []) {
    if (!s || s.source === 'race' || s._alwaysPrepared) continue;
    if (s.level === 0) cantrips++;
    else if (s.level > 0) leveled++;
  }
  return { cantrips, leveled };
}
