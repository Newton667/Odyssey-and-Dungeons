// ─── Level-Up Choice Definitions ─────────────────────────────────────
// Defines what interactive choices players make at each level per class.

import { getSubclassLevel } from './classData';
import { FEAT_ABILITY_BONUSES } from './dndConstants';

export const METAMAGIC_OPTIONS = {
  'Careful Spell': 'Spend 1 sorcery point: chosen creatures auto-succeed on your spell\'s saving throw.',
  'Distant Spell': 'Spend 1 sorcery point: double the range of a spell (touch becomes 30 ft).',
  'Empowered Spell': 'Spend 1 sorcery point: reroll up to CHA mod damage dice on a spell.',
  'Extended Spell': 'Spend 1 sorcery point: double the duration of a spell (max 24 hours).',
  'Heightened Spell': 'Spend 3 sorcery points: one target has disadvantage on their first save against the spell.',
  'Quickened Spell': 'Spend 2 sorcery points: cast a spell with casting time of 1 action as a bonus action.',
  'Subtle Spell': 'Spend 1 sorcery point: cast without verbal or somatic components.',
  'Twinned Spell': 'Spend sorcery points = spell level (min 1): target a second creature with a single-target spell.',
};

export const ELDRITCH_INVOCATIONS = {
  'Agonizing Blast': { prereq: 'Eldritch Blast cantrip', desc: 'Add CHA modifier to Eldritch Blast damage.' },
  'Armor of Shadows': { prereq: null, desc: 'Cast Mage Armor on yourself at will, without a spell slot.' },
  'Beast Speech': { prereq: null, desc: 'Cast Speak with Animals at will, without a spell slot.' },
  'Beguiling Influence': { prereq: null, desc: 'Gain proficiency in Deception and Persuasion.' },
  'Book of Ancient Secrets': { prereq: 'Pact of the Tome', desc: 'Record ritual spells from any class in your Book of Shadows.' },
  'Devil\'s Sight': { prereq: null, desc: 'See normally in darkness (magical and nonmagical) to 120 feet.' },
  'Eldritch Sight': { prereq: null, desc: 'Cast Detect Magic at will, without a spell slot.' },
  'Eldritch Spear': { prereq: 'Eldritch Blast cantrip', desc: 'Eldritch Blast range becomes 300 feet.' },
  'Eyes of the Rune Keeper': { prereq: null, desc: 'Read all writing.' },
  'Fiendish Vigor': { prereq: null, desc: 'Cast False Life on yourself at will as a 1st-level spell.' },
  'Gaze of Two Minds': { prereq: null, desc: 'Use action to perceive through a willing humanoid\'s senses.' },
  'Mask of Many Faces': { prereq: null, desc: 'Cast Disguise Self at will, without a spell slot.' },
  'Misty Visions': { prereq: null, desc: 'Cast Silent Image at will, without a spell slot.' },
  'Repelling Blast': { prereq: 'Eldritch Blast cantrip', desc: 'Push creature 10 feet away when hit by Eldritch Blast.' },
  'Sculptor of Flesh': { prereq: '7th level', desc: 'Cast Polymorph once using a warlock spell slot.' },
  'Thirsting Blade': { prereq: '5th level, Pact of the Blade', desc: 'Attack twice with your pact weapon.' },
  'Witch Sight': { prereq: '15th level', desc: 'See true form of shapechangers/illusions within 30 feet.' },
};

export const PACT_BOONS = {
  'Pact of the Chain': 'Gain Find Familiar spell; familiar can be imp, pseudodragon, quasit, or sprite. Can attack using your reaction.',
  'Pact of the Blade': 'Create a magical pact weapon (any melee form) that counts as magical. You\'re proficient with it.',
  'Pact of the Tome': 'Gain a Book of Shadows with 3 cantrips from any class spell lists.',
};

export const MANEUVERS = {
  'Commander\'s Strike': 'Forgo one attack; ally uses reaction to attack with bonus damage (superiority die).',
  'Disarming Attack': 'Add superiority die to damage; target must make STR save or drop one held item.',
  'Distracting Strike': 'Add superiority die to damage; next ally attack on the target has advantage.',
  'Evasive Footwork': 'Add superiority die to AC while moving.',
  'Feinting Attack': 'Bonus action: gain advantage on next attack; add superiority die to damage if it hits.',
  'Goading Attack': 'Add superiority die to damage; target has disadvantage on attacks against others (WIS save).',
  'Lunging Attack': 'Increase reach by 5 ft for one attack; add superiority die to damage.',
  'Maneuvering Attack': 'Add superiority die to damage; ally can move half speed without opportunity attacks.',
  'Menacing Attack': 'Add superiority die to damage; target must make WIS save or be frightened.',
  'Parry': 'Reaction: reduce melee damage taken by superiority die + DEX modifier.',
  'Precision Attack': 'Add superiority die to an attack roll (before or after rolling, before knowing result).',
  'Pushing Attack': 'Add superiority die to damage; target must make STR save or be pushed 15 ft.',
  'Rally': 'Bonus action: ally gains superiority die + CHA modifier temporary HP.',
  'Riposte': 'Reaction when missed by melee: make attack with superiority die added to damage.',
  'Sweeping Attack': 'If you hit, deal superiority die damage to another creature within 5 ft.',
  'Trip Attack': 'Add superiority die to damage; target must make STR save or be knocked prone.',
};

export const TOTEM_SPIRITS = {
  3: {
    Bear: 'While raging, you have resistance to all damage except psychic.',
    Eagle: 'While raging, opportunity attacks against you have disadvantage; you can Dash as a bonus action.',
    Wolf: 'While raging, allies have advantage on melee attacks against creatures within 5 ft of you.',
  },
  6: {
    Bear: 'Carrying capacity doubled; advantage on STR checks to push, pull, lift, or break things.',
    Eagle: 'See up to 1 mile clearly; no disadvantage on Perception in dim light.',
    Wolf: 'Track creatures at fast pace; move stealthily at normal pace.',
  },
  14: {
    Bear: 'While raging, creatures within 5 ft have disadvantage on attacks against allies (not you).',
    Eagle: 'Gain a flying speed equal to your walking speed while raging (fall if you end turn in air).',
    Wolf: 'While raging, bonus action to knock a Large or smaller creature prone when you hit with melee.',
  },
};

export const HUNTER_OPTIONS = {
  3: {
    label: "Hunter's Prey",
    options: {
      'Colossus Slayer': 'Once per turn, deal an extra 1d8 damage to a creature below its max HP.',
      'Giant Killer': 'Reaction attack when a Large+ creature within 5 ft attacks you (hit or miss).',
      'Horde Breaker': 'Once per turn, make an additional attack against a different creature within 5 ft of the original target.',
    },
  },
  7: {
    label: 'Defensive Tactics',
    options: {
      'Escape the Horde': 'Opportunity attacks against you are made with disadvantage.',
      'Multiattack Defense': 'After a creature hits you, you gain +4 AC against subsequent attacks from it this turn.',
      'Steel Will': 'Advantage on saving throws against being frightened.',
    },
  },
  11: {
    label: 'Multiattack',
    options: {
      'Volley': 'Action: make a ranged attack against each creature within 10 ft of a point in range.',
      'Whirlwind Attack': 'Action: make a melee attack against each creature within 5 ft of you.',
    },
  },
  15: {
    label: "Superior Hunter's Defense",
    options: {
      'Evasion': 'DEX save for half damage → take no damage on success, half on failure.',
      'Stand Against the Tide': 'When a creature misses you with melee, use reaction to force it to attack another creature.',
      'Uncanny Dodge': 'Reaction: halve the damage from an attack that hits you.',
    },
  },
};

export const LAND_TERRAINS = {
  'Arctic': 'Bonus spells: Hold Person, Spike Growth, Sleet Storm, Slow, Commune with Nature, Cone of Cold',
  'Coast': 'Bonus spells: Mirror Image, Misty Step, Water Breathing, Water Walk, Conjure Elemental, Scrying',
  'Desert': 'Bonus spells: Blur, Silence, Create Food and Water, Protection from Energy, Blight, Hallucinatory Terrain',
  'Forest': 'Bonus spells: Barkskin, Spider Climb, Call Lightning, Plant Growth, Divination, Freedom of Movement',
  'Grassland': 'Bonus spells: Invisibility, Pass Without Trace, Daylight, Haste, Divination, Freedom of Movement',
  'Mountain': 'Bonus spells: Spider Climb, Spike Growth, Lightning Bolt, Meld into Stone, Passwall, Stone Shape',
  'Swamp': 'Bonus spells: Darkness, Acid Arrow, Water Walk, Stinking Cloud, Freedom of Movement, Locate Creature',
  'Underdark': 'Bonus spells: Spider Climb, Web, Gaseous Form, Stinking Cloud, Greater Invisibility, Cloudkill',
};

export const FAVORED_ENEMIES = [
  'Aberrations', 'Beasts', 'Celestials', 'Constructs', 'Dragons',
  'Elementals', 'Fey', 'Fiends', 'Giants', 'Monstrosities',
  'Oozes', 'Plants', 'Undead', 'Humanoids (two types)',
];

export const FAVORED_TERRAINS = [
  'Arctic', 'Coast', 'Desert', 'Forest', 'Grassland',
  'Mountain', 'Swamp', 'Underdark',
];

// Maps class + level to the type of choice available. Every returned choice
// carries its own `level` — the Progression tab stores a pick under that level,
// so a card must never fall back to the character's current level.
export function getLevelChoices(cls, level, subclass, ruleset = '2014') {
  const choices = [];

  // ASI / Feat at standard levels
  const asiLevels = cls === 'Fighter'
    ? [4, 6, 8, 12, 14, 16, 19]
    : cls === 'Rogue'
      ? [4, 8, 10, 12, 16, 19]
      : [4, 8, 12, 16, 19];
  if (asiLevels.includes(level)) {
    choices.push({ type: 'asi', label: 'Ability Score Improvement or Feat' });
  }

  // Fighting Style
  if ((cls === 'Fighter' && level === 1) || (cls === 'Paladin' && level === 2) || (cls === 'Ranger' && level === 2)) {
    choices.push({ type: 'fighting-style', label: 'Choose a Fighting Style' });
  }
  if (cls === 'Fighter' && subclass === 'Champion' && level === 10) {
    choices.push({ type: 'fighting-style', label: 'Additional Fighting Style' });
  }

  // Subclass — ruleset-aware (2024: every class at level 3)
  if (level === getSubclassLevel(cls, ruleset)) {
    choices.push({ type: 'subclass', label: 'Choose a Subclass' });
  }

  // Sorcerer — Metamagic
  if (cls === 'Sorcerer') {
    if (level === 3) choices.push({ type: 'metamagic', label: 'Choose 2 Metamagic Options', count: 2 });
    if (level === 10) choices.push({ type: 'metamagic', label: 'Choose 1 Additional Metamagic', count: 1 });
    if (level === 17) choices.push({ type: 'metamagic', label: 'Choose 1 Additional Metamagic', count: 1 });
  }

  // Warlock — Invocations & Pact Boon
  if (cls === 'Warlock') {
    if (level === 2) choices.push({ type: 'invocations', label: 'Choose 2 Eldritch Invocations', count: 2 });
    if (level === 3) choices.push({ type: 'pact-boon', label: 'Choose a Pact Boon' });
    if ([5, 7, 9, 12, 15, 18].includes(level)) choices.push({ type: 'invocations', label: 'Choose 1 Additional Invocation', count: 1 });
  }

  // Fighter (Battle Master) — Maneuvers
  if (cls === 'Fighter' && subclass === 'Battle Master') {
    if (level === 3) choices.push({ type: 'maneuvers', label: 'Choose 3 Maneuvers', count: 3 });
    if ([7, 10, 15].includes(level)) choices.push({ type: 'maneuvers', label: 'Choose 2 Additional Maneuvers', count: 2 });
  }

  // Barbarian (Totem Warrior) — Totem Spirit
  if (cls === 'Barbarian' && subclass === 'Path of the Totem Warrior') {
    if ([3, 6, 14].includes(level)) choices.push({ type: 'totem', label: 'Choose a Totem Spirit', level });
  }

  // Ranger — Favored Enemy & Terrain
  if (cls === 'Ranger') {
    if (level === 1) {
      choices.push({ type: 'favored-enemy', label: 'Choose a Favored Enemy' });
      choices.push({ type: 'favored-terrain', label: 'Choose a Favored Terrain' });
    }
    if ([6, 14].includes(level)) choices.push({ type: 'favored-enemy', label: 'Choose an Additional Favored Enemy' });
    if ([6, 10].includes(level)) choices.push({ type: 'favored-terrain', label: 'Choose an Additional Favored Terrain' });
  }

  // Ranger (Hunter) subfeatures
  if (cls === 'Ranger' && subclass === 'Hunter') {
    if (HUNTER_OPTIONS[level]) choices.push({ type: 'hunter-option', label: HUNTER_OPTIONS[level].label, level });
  }

  // Druid (Circle of the Land) — terrain
  if (cls === 'Druid' && subclass === 'Circle of the Land' && level === 2) {
    choices.push({ type: 'land-terrain', label: 'Choose Your Land' });
  }

  // Expertise
  if (cls === 'Rogue' && (level === 1 || level === 6)) {
    choices.push({ type: 'expertise', label: `Choose ${level === 1 ? 2 : 2} Skills for Expertise`, count: 2 });
  }
  if (cls === 'Bard' && (level === 3 || level === 10)) {
    choices.push({ type: 'expertise', label: 'Choose 2 Skills for Expertise', count: 2 });
  }

  // Spells (for known casters when spells known increases)
  // This is handled separately in the UI

  return choices.map(c => ({ ...c, level }));
}

const ABILITY_NAMES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

// What an ASI-card selection does: ability deltas plus any saving-throw
// proficiencies it grants. `selection` is "+2 Strength", "+1 Dexterity / +1 Wisdom"
// or a feat name; `featAbility` is the player's pick for a choice half-feat
// (Resilient, Observant, Athlete, …). Reads the shared FEAT_ABILITY_BONUSES table
// the creator uses, so the two can never disagree.
export function asiChoiceEffect(selection, featAbility) {
  const deltas = {};
  const saves = [];
  if (!selection || typeof selection !== 'string') return { deltas, saves };
  if (selection.startsWith('+2 ') || selection.startsWith('+1 ')) {
    for (const part of selection.split(' / ')) {
      const m = part.match(/\+(\d)\s+(\w+)/);
      const ab = m?.[2]?.toLowerCase();
      if (ab && ABILITY_NAMES.includes(ab)) deltas[ab] = (deltas[ab] || 0) + parseInt(m[1], 10);
    }
    return { deltas, saves };
  }
  const cfg = FEAT_ABILITY_BONUSES[selection];
  if (!cfg) return { deltas, saves };
  const ab = cfg.fixed || (cfg.choice?.includes(featAbility) ? featAbility : cfg.choice?.[0]);
  if (ab) {
    deltas[ab] = 1;
    if (cfg.save) saves.push(ab);
  }
  return { deltas, saves };
}

// Old saves stored every Progression pick under the class's level AT THE TIME of picking,
// not the card's level. Such a pick sits on a key whose level has no choice of that type, so
// no card shows it — and picking again re-applied an ASI. Move each orphan to the nearest card
// of that type at or below its key (else the nearest above) that has no pick yet; leave it
// where it is when there's no such card. Returns { changed, levelChoices } (a new object).
export function relocateOrphanedChoices(levelChoices, { cls, subclass = '', ruleset = '2014', namespaced = false }) {
  const prefix = namespaced ? `${cls}:` : '';
  const out = Object.fromEntries(Object.entries(levelChoices || {}).map(([k, v]) => [k, v && typeof v === 'object' ? { ...v } : v]));
  const typesAt = (lvl) => new Set(getLevelChoices(cls, lvl, subclass, ruleset).map(c => c.type));
  const keyLevel = (k) => {
    if (!k.startsWith(prefix)) return null;
    const rest = k.slice(prefix.length);
    return /^\d+$/.test(rest) ? Number(rest) : null;
  };
  let changed = false;
  const keys = Object.keys(out).filter(k => keyLevel(k) != null).sort((a, b) => keyLevel(a) - keyLevel(b));
  for (const key of keys) {
    const level = keyLevel(key);
    const entry = out[key];
    if (!entry || typeof entry !== 'object') continue;
    const here = typesAt(level);
    for (const type of Object.keys(entry)) {
      if (type === 'asiAbility' || here.has(type) || entry[type] == null) continue;
      const below = [];
      const above = [];
      for (let l = 1; l <= 20; l++) {
        if (!typesAt(l).has(type) || out[`${prefix}${l}`]?.[type] != null) continue;
        (l <= level ? below : above).push(l);
      }
      const target = below.length ? below[below.length - 1] : above[0];
      if (target == null) continue;
      const tKey = `${prefix}${target}`;
      out[tKey] = { ...(out[tKey] || {}), [type]: entry[type] };
      if (type === 'asi' && entry.asiAbility) { out[tKey].asiAbility = entry.asiAbility; delete entry.asiAbility; }
      delete entry[type];
      changed = true;
    }
    if (Object.keys(entry).length === 0) delete out[key];
  }
  return { changed, levelChoices: changed ? out : (levelChoices || {}) };
}

// A single-class character stores Progression picks under bare level keys ("4")
// and its style as "Fighting Style: X". Once a second class is added the sheet
// reads "<Class>:4" and "Fighting Style (<Class>): X". Returns the migrated
// { levelChoices, features } for the character's ORIGINAL class.
export function migrateSingleClassChoices(char, cls) {
  const levelChoices = {};
  for (const [k, v] of Object.entries(char?.levelChoices || {})) {
    levelChoices[/^\d+$/.test(k) ? `${cls}:${k}` : k] = v;
  }
  let hasStyle = false;
  const features = (char?.features || []).map(f => {
    if (typeof f !== 'string') return f;
    const m = f.match(/^Fighting Style:\s*(.+)$/);
    if (!m) return f;
    hasStyle = true;
    return `Fighting Style (${cls}): ${m[1].trim()}`;
  });
  if (!hasStyle && char?.fightingStyle) features.push(`Fighting Style (${cls}): ${char.fightingStyle}`);
  return { levelChoices, features };
}
