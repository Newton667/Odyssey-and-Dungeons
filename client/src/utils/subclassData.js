// ─── Subclass data, ruleset-keyed ─────────────────────────────────────
// The single entry point for "which subclasses does this class offer, and
// what do they do" under a given ruleset. 2014 data stays where it always was
// (CLASSES[cls].subclasses / subclassDescs, SUBCLASS_FEATURES) and is returned
// by reference, so 2014 characters are provably unchanged. 2024 data lives in
// the tables below and in subclassFeatures2024.js.
//
// A subclass name that is offered only by the *other* ruleset is a "legacy
// pick" (e.g. a 2024 character saved with 'The Fiend'): it keeps its own
// edition's features and is labelled with that edition. Nothing is rewritten.
//
// Import rules (keep the graph acyclic): this module may import classData,
// subclassFeatures, subclassFeatures2024, subclassSpells and dndConstants —
// never levelChoices, multiclass, spellAccess or dndHelpers.

import { CLASSES, getSubclassLevel, isThirdCaster } from './classData';
import { SUBCLASS_FEATURES } from './subclassFeatures';
import { SUBCLASS_HP_PER_LEVEL } from './dndConstants';
import { SUBCLASS_FEATURES_2024 } from './subclassFeatures2024';
import { SUBCLASS_SPELLS_2014, SUBCLASS_SPELLS_2024, LAND_SPELLS_2014, LAND_SPELLS_2024, THIRD_CASTER_PROGRESSION } from './subclassSpells';

// Classes whose subclass list and features are identical in both rulesets
// (no 2024 core-PHB version exists).
export const SAME_IN_BOTH_RULESETS = new Set(['Artificer']);

// 2024 Player's Handbook subclasses, in PHB order, with a short mechanical
// description in the app's own words.
export const SUBCLASSES_2024 = {
  Barbarian: {
    'Path of the Berserker': 'Rage harder: Frenzy adds extra damage to your first Reckless hit each turn, and later you shrug off charm and fear while raging.',
    'Path of the Wild Heart': 'Channel animal spirits: pick a bear, eagle or wolf benefit each time you rage, plus nature-speaking magic and animal aspects.',
    'Path of the World Tree': 'Draw on the cosmic tree: raging grants temporary HP to you and allies, lets you teleport foes and extends your reach.',
    'Path of the Zealot': 'Divine warrior: extra radiant or necrotic damage on your first hit each turn, and free revival magic from your god.',
  },
  Bard: {
    'College of Dance': 'Unarmored agility: Bardic Inspiration fuels unarmed strikes and AC from DEX + CHA, and lets you and allies reposition.',
    'College of Glamour': 'Fey charm: Bardic Inspiration grants allies temporary HP and movement, and you can charm crowds with Beguiling Magic.',
    'College of Lore': 'Extra skills and Cutting Words to reduce an enemy roll; later you learn spells from any class list.',
    'College of Valor': 'Martial bard: medium armor, shields and martial weapons, Combat Inspiration for allies, and Extra Attack at 6.',
  },
  Cleric: {
    'Life Domain': 'The dedicated healer: always-prepared healing spells, bonus HP on every healing spell, and Preserve Life to heal many at once.',
    'Light Domain': 'Radiant blaster: fire and light domain spells, Warding Flare to impose disadvantage, and an area burst of radiant damage.',
    'Trickery Domain': 'Stealth and deception: bless an ally\'s Stealth, create an illusory duplicate to cast through, and trickery spells.',
    'War Domain': 'Battle priest: bonus-action weapon attacks, a +10 Guided Strike to hit, and war spells always prepared.',
  },
  Druid: {
    'Circle of the Land': 'Choose a land (Arid, Polar, Temperate or Tropical) for always-prepared spells; recover slots and heal with Land\'s Aid.',
    'Circle of the Moon': 'Combat shapeshifter: stronger Wild Shape forms with extra AC and HP, and moonlight spells always prepared.',
    'Circle of the Sea': 'Storm magic: Wrath of the Sea surrounds you with a damaging aura, plus sea and storm spells always prepared.',
    'Circle of the Stars': 'Starry Form turns Wild Shape into an archer, chalice or dragon constellation; free Guiding Bolt from your Star Map.',
  },
  Fighter: {
    'Battle Master': 'Superiority dice fuel combat maneuvers like Trip, Riposte and Precision Attack. The most tactical fighter.',
    'Champion': 'Criticals on 19-20 (later 18-20), a second Fighting Style, and heroic resilience. Simple and reliable.',
    'Eldritch Knight': 'Wizard spellcasting (INT, third-caster slots) from the Wizard list, plus a bonded weapon and War Magic.',
    'Psi Warrior': 'Psionic energy dice power a protective field, a telekinetic force strike and, later, flight and telekinesis.',
  },
  Monk: {
    'Warrior of Mercy': 'Heal or harm with your hands: spend Focus to restore HP or add necrotic damage to your unarmed strikes.',
    'Warrior of Shadow': 'Ninja: cast Darkness with Focus, see through it, and teleport between shadows.',
    'Warrior of the Elements': 'Elemental strikes: extend your reach, change damage type and push or pull foes with Focus.',
    'Warrior of the Open Hand': 'Master of unarmed combat: Flurry of Blows can knock prone, push away or stop reactions.',
  },
  Paladin: {
    'Oath of Devotion': 'The holy knight: Sacred Weapon adds CHA to attacks, and your aura protects allies from charm.',
    'Oath of Glory': 'Heroic athlete: smites grant temporary HP to allies, bonus to athletics, and a speed-boosting aura.',
    'Oath of the Ancients': 'Guardian of light and nature: restrain foes with vines and give allies resistance to spell damage.',
    'Oath of Vengeance': 'Relentless hunter: Vow of Enmity grants advantage against one foe, and you chase it down.',
  },
  Ranger: {
    'Beast Master': 'Fight alongside a primal companion (beast of the land, sea or sky) that scales with your level.',
    'Fey Wanderer': 'Fey-touched: extra psychic damage on hits, WIS added to CHA checks, and charm-based spells always prepared.',
    'Gloom Stalker': 'Ambusher of the dark: bonus initiative, an extra first-turn attack, darkvision and invisibility to darkvision.',
    'Hunter': 'Choose Colossus Slayer or Horde Breaker for offense, and a defensive tactic at 7th level.',
  },
  Rogue: {
    'Arcane Trickster': 'Wizard spellcasting (INT, third-caster slots) from the Wizard list, with an invisible Mage Hand.',
    'Assassin': 'Advantage on initiative and against foes that have not acted; surprise hits are deadly.',
    'Soulknife': 'Manifest psychic blades as weapons and spend psionic dice to boost failed checks and communicate.',
    'Thief': 'Use items and tools as a bonus action, climb fast and jump far, and later use any magic item.',
  },
  Sorcerer: {
    'Aberrant Sorcery': 'Psionic spells always prepared, telepathy, and psychic tricks that let you cast without components.',
    'Clockwork Sorcery': 'Order magic: cancel advantage or disadvantage on nearby rolls, and ward allies with Bastion of Law.',
    'Draconic Sorcery': 'Draconic Resilience: +3 max HP (then +1 per Sorcerer level) and unarmored AC 10 + DEX + CHA, plus dragon spells.',
    'Wild Magic Sorcery': 'Spells can trigger Wild Magic Surges; Tides of Chaos grants advantage and resets on a surge.',
  },
  Warlock: {
    'Archfey Patron': 'Fey magic: teleport with Misty Step for free and charm or frighten creatures as you do.',
    'Celestial Patron': 'Healing Light: a pool of d6s to heal as a bonus action, and radiant power that grows with level.',
    'Fiend Patron': 'Gain temporary HP when you drop a foe, and bend luck and fire to your advantage.',
    'Great Old One Patron': 'Telepathy, psychic spells, and your spells can deal psychic damage without components.',
  },
  Wizard: {
    'Abjurer': 'Arcane Ward absorbs damage whenever you cast abjuration spells; later you project it onto allies.',
    'Diviner': 'Portent: roll two d20s after a long rest and replace any roll you see with one of them.',
    'Evoker': 'Potent Cantrips and Sculpt Spells to shield allies from your area spells; later add INT to damage.',
    'Illusionist': 'Improved illusions with extra range and sound, and later illusions that become partly real.',
  },
};

const otherRuleset = (ruleset) => (ruleset === '2024' ? '2014' : '2024');

/** The subclass names a class offers under a ruleset. 2014 returns CLASSES' own array. */
export function getSubclasses(cls, ruleset = '2014') {
  if (ruleset !== '2024' || SAME_IN_BOTH_RULESETS.has(cls)) return CLASSES[cls]?.subclasses || [];
  const table = SUBCLASSES_2024[cls];
  return table ? Object.keys(table) : [];
}

function descIn(cls, subclass, ruleset) {
  if (ruleset === '2024' && !SAME_IN_BOTH_RULESETS.has(cls)) return SUBCLASSES_2024[cls]?.[subclass];
  return CLASSES[cls]?.subclassDescs?.[subclass];
}

/** Description of a subclass: the ruleset's table first, then the other edition's. */
export function getSubclassDesc(cls, subclass, ruleset = '2014') {
  if (!subclass) return '';
  return descIn(cls, subclass, ruleset) || descIn(cls, subclass, otherRuleset(ruleset)) || '';
}

/**
 * Which edition's rules a subclass name follows for a character on `ruleset`:
 * the ruleset itself when it offers the name, the other edition when only that
 * one does (a legacy pick), or null (homebrew / typo / empty).
 */
export function subclassEdition(cls, subclass, ruleset = '2014') {
  if (!subclass) return null;
  const rs = ruleset === '2024' ? '2024' : '2014';
  if (getSubclasses(cls, rs).includes(subclass)) return rs;
  const other = otherRuleset(rs);
  if (getSubclasses(cls, other).includes(subclass)) return other;
  return null;
}

/**
 * The subclass to save for a class at `classLevel`: kept only when the class
 * has reached its subclass level under `ruleset` AND the ruleset offers it.
 */
export function offeredSubclass(cls, subclass, classLevel, ruleset = '2014') {
  if (!subclass) return '';
  if ((classLevel || 0) < getSubclassLevel(cls, ruleset)) return '';
  return getSubclasses(cls, ruleset).includes(subclass) ? subclass : '';
}

/**
 * Options for a subclass <select>: the ruleset's list, plus the current value
 * appended (labelled with its edition, or "(custom)") when it is not in the
 * list — so an editor never destroys a legacy or homebrew value.
 */
export function subclassSelectOptions(cls, current, ruleset = '2014') {
  const list = getSubclasses(cls, ruleset);
  const opts = list.map(name => ({ value: name, label: name, legacy: false }));
  if (current && !list.includes(current)) {
    const edition = subclassEdition(cls, current, ruleset);
    opts.push({
      value: current,
      label: edition ? `${current} (${edition} rules)` : `${current} (custom)`,
      legacy: !!edition,
    });
  }
  return opts;
}

// ─── Feature tables ───────────────────────────────────────────────────

function featureTableFor(cls, subclass, edition) {
  if (edition === '2024' && !SAME_IN_BOTH_RULESETS.has(cls)) return SUBCLASS_FEATURES_2024[subclass] || null;
  return SUBCLASS_FEATURES[subclass] || null;
}

/**
 * The feature table a subclass uses for a character on `ruleset`:
 * `{ edition, legacy, features }`, where `features` is `{ [level]: { name, desc } }`.
 * - offered by `ruleset` → that ruleset's table (`legacy: false`);
 * - offered only by the other edition → that edition's table (`legacy: true`);
 * - otherwise (homebrew, typo, empty) → null. A missing table entry is also
 *   null — never the other edition's table.
 */
export function getSubclassFeatures(cls, subclass, ruleset = '2014') {
  const edition = subclassEdition(cls, subclass, ruleset);
  if (!edition) return null;
  const features = featureTableFor(cls, subclass, edition);
  if (!features) return null;
  const rs = ruleset === '2024' ? '2024' : '2014';
  return { edition, legacy: edition !== rs, features };
}

/**
 * Flat, level-sorted list of a subclass's features up to `maxLevel`:
 * `[{ level, name, desc, edition, legacy }]`. `[]` when nothing resolves.
 * This is the one list the sheet's Actions / Features / Progression views use.
 */
export function listSubclassFeatures(cls, subclass, ruleset = '2014', maxLevel = 20) {
  const r = getSubclassFeatures(cls, subclass, ruleset);
  if (!r) return [];
  return Object.entries(r.features)
    .map(([lvl, f]) => ({ level: Number(lvl), name: f.name, desc: f.desc, edition: r.edition, legacy: r.legacy }))
    .filter(f => f.level <= maxLevel)
    .sort((a, b) => a.level - b.level);
}

// ─── Subclass spells ──────────────────────────────────────────────────

// Warlock max spell level by warlock level (1→1, 3→2, 5→3, 7→4, 9→5). Inlined
// rather than importing maxSpellLevel, so this module never imports dndHelpers.
const warlockMaxSpellLevel = (lvl) => Math.min(5, Math.ceil(Math.max(0, lvl || 0) / 2));

const rowsUpTo = (byLevel, max) => Object.entries(byLevel || {})
  .filter(([k]) => Number(k) <= max)
  .sort(([a], [b]) => Number(a) - Number(b))
  .flatMap(([, names]) => names);

/**
 * Spells a subclass grants at a class level:
 * `{ alwaysPrepared: string[], expanded: string[], edition }`.
 * - The table follows `subclassEdition`, so a legacy 2014 patron on a 2024
 *   character stays `expanded` (it only widens the list).
 * - Class-level rows are included up to `classLevel`; the 2014 Warlock's
 *   spell-level rows up to the warlock's max spell level.
 * - Circle of the Land reads `land` from whichever land table contains it
 *   (2014 and 2024 land names are disjoint); no land → nothing.
 * Derived at render — never written into `preparedSpells`.
 */
export function getSubclassSpells(cls, subclass, classLevel, ruleset = '2014', { land } = {}) {
  const edition = subclassEdition(cls, subclass, ruleset);
  const out = { alwaysPrepared: [], expanded: [], edition };
  if (!edition) return out;
  const lvl = classLevel || 0;

  if (cls === 'Druid' && subclass === 'Circle of the Land') {
    const table = land ? (LAND_SPELLS_2014[land] || LAND_SPELLS_2024[land]) : null;
    if (table) out.alwaysPrepared = rowsUpTo(table, lvl);
    return out;
  }

  const entry = (edition === '2024' ? SUBCLASS_SPELLS_2024 : SUBCLASS_SPELLS_2014)[subclass];
  if (!entry) return out;
  const max = entry.keyedBy === 'spellLevel' ? warlockMaxSpellLevel(lvl) : lvl;
  const names = rowsUpTo(entry.byLevel, max);
  if (entry.mode === 'expanded') out.expanded = names;
  else out.alwaysPrepared = names;
  return out;
}

// ─── Eldritch Knight / Arcane Trickster ───────────────────────────────

/**
 * Spell numbers for a third caster at a class level, or null (not a third
 * caster, or below class level 3). The single source for every spell-math
 * site (creator getSpellInfo/maxSpellLevel, editor getSpellLimits, sheet).
 * `cantrips` is what the player PICKS: the book total minus always-known
 * cantrips (the AT's Mage Hand), which are shown separately and not counted.
 */
export function thirdCasterSpellInfo(cls, subclass, level, ruleset = '2014') {
  const lvl = Math.min(level || 0, 20);
  if (!isThirdCaster(cls, subclass) || lvl < 3) return null;
  const table = THIRD_CASTER_PROGRESSION[ruleset === '2024' ? '2024' : '2014'][subclass];
  if (!table) return null;
  const idx = lvl - 1;
  const alwaysKnownCantrips = [...table.alwaysKnownCantrips];
  return {
    cantrips: table.cantrips[idx] - alwaysKnownCantrips.length,
    spells: table.spells[idx],
    type: table.type,
    maxLevel: lvl >= 19 ? 4 : lvl >= 13 ? 3 : lvl >= 7 ? 2 : 1,
    schools: table.schools ? [...table.schools] : null,
    anySchool: table.anySchoolLevels.filter(l => l <= lvl).length,
    alwaysKnownCantrips,
  };
}

/**
 * 2014 EK/AT school budget. Counts leveled picks from the Wizard list whose
 * school is outside `info.schools` and which are not on another spell list the
 * character has (`otherListClasses`). Such picks are limited to `info.anySchool`.
 * 2024 (`schools === null`) has no restriction.
 */
export function thirdCasterSchoolStatus({ info, pickedSpells = [], otherListClasses = [] } = {}) {
  const allowed = info?.anySchool || 0;
  if (!info || !info.schools) return { offSchool: 0, allowed, atLimit: false };
  const lc = (x) => String(x || '').toLowerCase();
  const schools = info.schools.map(lc);
  const others = otherListClasses.map(lc).filter(c => c && c !== 'wizard');
  const offSchool = (pickedSpells || []).filter(sp => {
    if (!sp || !(sp.level >= 1)) return false;
    const classes = (sp.classes || []).map(lc);
    if (!classes.includes('wizard')) return false;
    if (schools.includes(lc(sp.school))) return false;
    return !classes.some(c => others.includes(c));
  }).length;
  return { offSchool, allowed, atLimit: offSchool >= allowed };
}

// ─── Subclass HP (Draconic resilience) ────────────────────────────────
// Applied on events only (creator, Level Up, Progression pick, editor Lv Up) —
// maxHp is a stored stat, so a render-time bonus would double-count.

/** Flat max-HP a class entry `{ class, subclass, level }` gets from its subclass. */
export function subclassHpBonus(entry) {
  if (!entry || entry.class !== 'Sorcerer') return 0;
  return (SUBCLASS_HP_PER_LEVEL[entry.subclass] || 0) * Math.max(0, entry.level || 0);
}

/** Max-HP change between two states of the same class entry (Level Up, first pick). */
export function subclassHpDelta(before, after) {
  return subclassHpBonus(after) - subclassHpBonus(before);
}

/**
 * The decision for a subclass (re-)pick on the Progression tab:
 * - `apply`  (a gain) is added to max HP automatically;
 * - `remind` (a loss) is NEVER subtracted — characters that took Draconic before
 *   this was wired never received the bonus — the sheet shows a reminder instead;
 * - `switched` is true when a subclass was already chosen (a change, not a first pick),
 *   so an `apply` then comes with a notice that it may double-count.
 */
export function subclassRepickHp(before, after) {
  const delta = subclassHpDelta(before, after);
  return { apply: Math.max(delta, 0), remind: Math.max(-delta, 0), switched: !!before?.subclass };
}

// ─── Progression placeholders ─────────────────────────────────────────
// The generic "<X> Feature" rows in CLASS_LEVELS that stand for "a subclass feature
// here". Deliberately NOT the sheet's isFeatureNoise, which also matches 'ASI' /
// 'Fighting Style' and would append the subclass name twice on the 2014 Cleric 8 row.
const SUBCLASS_PLACEHOLDER = /^(Path|Oath|Domain|Archetype|College|Circle|Tradition|Patron|Specialist|Origin) Feature$/;
export function isSubclassPlaceholder(name) {
  return typeof name === 'string' && SUBCLASS_PLACEHOLDER.test(name);
}
