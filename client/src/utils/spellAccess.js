import { getCharClasses } from './multiclass';

/**
 * The lower-cased class spell lists a character may draw from.
 *
 * That is every class they actually have (via `getCharClasses`, so multiclass
 * characters get all of them) plus any feat-granted list stored on
 * `char.featSpellLists`, e.g. `{ 'Magic Initiate': ['Cleric'] }`.
 *
 * Values are normalised with `[].concat(v)` so a legacy bare string
 * (`{ 'Magic Initiate': 'Cleric' }`) still works.
 *
 * @returns {string[]} lower-cased class names; empty ⇒ the caller should not filter.
 */
export function allowedSpellClasses(char) {
  if (!char) return [];
  const names = getCharClasses(char).map(c => c.class);
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
