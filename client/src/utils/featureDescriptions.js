// ─── Class Feature Descriptions ───────────────────────────────────────
// CLASS_LEVELS lists feature NAMES per level but no text. This map supplies
// concise descriptions keyed by the feature's BASE name (parenthetical/level
// qualifiers stripped), used as a fallback when a feature has no description
// from CLASSES[class].features (level 1) or SUBCLASS_FEATURES.

export const FEATURE_DESCRIPTIONS = {
  // ── Shared ──
  'Spellcasting': 'You can cast spells. Manage your prepared/known spells, slots, save DC, and attack bonus on the Spells tab.',
  'Extra Attack': 'You can attack twice, instead of once, whenever you take the Attack action on your turn (three times at Fighter 11, four at Fighter 20).',
  'Unarmored Defense': 'While not wearing armor, your AC = 10 + your Dexterity modifier + your Constitution modifier (Barbarian) or Wisdom modifier (Monk).',
  'Evasion': "When an effect lets you make a Dexterity save for half damage, you instead take no damage on a success and only half on a failure.",
  'Timeless Body': 'You age far more slowly and can no longer be aged magically.',
  'Expertise': 'Double your proficiency bonus for chosen skill proficiencies.',
  'Channel Divinity': 'Channel divine energy to fuel magical effects (such as Turn Undead). Regain uses on a rest; the number of uses grows with level.',

  // ── Barbarian ──
  'Rage': 'As a bonus action, enter a rage: advantage on Strength checks and saves, bonus melee damage, and resistance to bludgeoning, piercing, and slashing damage. Lasts up to 1 minute.',
  'Reckless Attack': 'You can attack with advantage on Strength-based melee attacks this turn, but attack rolls against you have advantage until your next turn.',
  'Danger Sense': 'You have advantage on Dexterity saving throws against effects you can see, such as traps and spells.',
  'Primal Path': 'Choose your Barbarian subclass (Primal Path), gaining its features.',
  'Fast Movement': "Your speed increases by 10 feet while you aren't wearing heavy armor.",
  'Feral Instinct': "You have advantage on initiative rolls and can't be surprised while conscious; you can still act if you enter your rage.",
  'Brutal Critical': 'You roll one or more additional weapon damage dice on a critical hit with a melee attack (1 at 9th, 2 at 13th, 3 at 17th).',
  'Relentless Rage': "If you drop to 0 HP while raging and don't die outright, you can make a Constitution save (DC 10, rising each use) to drop to 1 HP instead.",
  'Persistent Rage': 'Your rage ends early only if you fall unconscious or choose to end it.',
  'Indomitable Might': 'If your total for a Strength check is less than your Strength score, you can use your Strength score instead.',
  'Primal Champion': 'Your Strength and Constitution scores increase by 4, to a maximum of 24.',

  // ── Bard ──
  'Bardic Inspiration': 'As a bonus action, give a creature a Bardic Inspiration die it can add to one ability check, attack roll, or save within 10 minutes. Uses equal to your Charisma modifier, regained on a rest.',
  'Jack of All Trades': "Add half your proficiency bonus to any ability check you make that doesn't already include it.",
  'Song of Rest': 'During a short rest, allies who spend Hit Dice regain extra HP (die size grows with level).',
  'Bard College': 'Choose your Bard subclass (College), gaining its features.',
  'Font of Inspiration': 'You regain all expended Bardic Inspiration when you finish a short or long rest.',
  'Countercharm': 'As an action, perform to give yourself and allies within 30 feet advantage on saves against being frightened or charmed.',
  'Magical Secrets': "Learn additional spells chosen from any class's spell list.",
  'Superior Inspiration': 'When you roll initiative and have no Bardic Inspiration uses left, you regain one.',

  // ── Cleric ──
  'Divine Domain': 'Choose your Cleric subclass (Divine Domain) at 1st level, gaining domain spells and features.',
  'Destroy Undead': 'When you Turn Undead, undead of a low enough challenge rating are instantly destroyed instead of turned (CR threshold rises with level).',
  'Divine Intervention': 'Call on your deity to intervene: roll d100, succeeding if you roll under your cleric level (automatic at 20th level).',

  // ── Druid ──
  'Druidic': "You know Druidic, the secret language of druids, and can leave hidden messages others can't decipher.",
  'Wild Shape': 'As an action, magically transform into a beast you have seen (CR limit grows with level). You keep your mental stats and can revert as a bonus action.',
  'Druid Circle': 'Choose your Druid subclass (Circle), gaining its features.',
  'Beast Spells': 'You can cast many druid spells while in Wild Shape, using verbal and somatic components in beast form.',
  'Archdruid': 'You can use Wild Shape an unlimited number of times and ignore the verbal and somatic components of your druid spells.',

  // ── Fighter ──
  'Second Wind': 'As a bonus action, regain 1d10 + your fighter level HP. Once per short or long rest.',
  'Action Surge': 'On your turn, take one additional action. Once per short or long rest (twice at 17th level).',
  'Martial Archetype': 'Choose your Fighter subclass (Martial Archetype), gaining its features.',
  'Indomitable': 'Reroll a failed saving throw; you must use the new roll. Uses per long rest grow with level.',

  // ── Monk ──
  'Martial Arts': 'Use Dexterity for unarmed strikes and monk weapons, roll a martial arts die for their damage, and make an unarmed strike as a bonus action after attacking.',
  'Ki': 'You have Ki points (equal to your monk level) to fuel features like Flurry of Blows, Patient Defense, and Step of the Wind. Regained on a short or long rest.',
  'Unarmored Movement': 'Your speed increases while you wear no armor or shield (bonus grows with level); at higher levels you can move along vertical surfaces and across liquids.',
  'Monastic Tradition': 'Choose your Monk subclass (Monastic Tradition), gaining its features.',
  'Deflect Missiles': 'Use your reaction to reduce ranged weapon damage; if you reduce it to 0 you can catch the missile and throw it by spending 1 Ki.',
  'Slow Fall': 'Use your reaction to reduce falling damage by 5 × your monk level.',
  'Stunning Strike': 'When you hit with a melee attack, spend 1 Ki to force a Constitution save or stun the target until the end of your next turn.',
  'Ki-Empowered Strikes': 'Your unarmed strikes count as magical for overcoming resistance and immunity to nonmagical damage.',
  'Stillness of Mind': 'As an action, end one effect on yourself that is causing you to be charmed or frightened.',
  'Purity of Body': 'You are immune to disease and poison.',
  'Tongue of the Sun and Moon': 'You understand all spoken languages, and any creature that understands a language can understand you.',
  'Diamond Soul': 'You gain proficiency in all saving throws, and can spend 1 Ki to reroll a failed save.',
  'Empty Body': 'Spend 4 Ki to become invisible for 1 minute with resistance to all damage except force; you can also spend 8 Ki to cast Astral Projection.',
  'Perfect Self': 'When you roll initiative and have no Ki points, you regain 4.',

  // ── Paladin ──
  'Divine Sense': 'As an action, detect celestials, fiends, and undead within 60 feet until the end of your next turn. Uses equal to 1 + your Charisma modifier per long rest.',
  'Lay on Hands': 'You have a pool of healing equal to 5 × your paladin level. As an action, touch a creature to restore HP from the pool, or spend 5 points to cure a disease or neutralize a poison.',
  'Divine Smite': 'When you hit with a melee weapon, expend a spell slot to deal an extra 2d8 radiant damage (+1d8 per slot level above 1st, and extra against undead and fiends).',
  'Sacred Oath': 'Choose your Paladin subclass (Sacred Oath) at 3rd level, gaining oath spells and Channel Divinity options.',
  'Aura of Protection': 'You and friendly creatures within 10 feet add your Charisma modifier (minimum +1) to saving throws.',
  'Aura of Courage': "You and friendly creatures within 10 feet can't be frightened while you are conscious.",
  'Improved Divine Smite': 'Your melee weapon hits deal an extra 1d8 radiant damage.',
  'Cleansing Touch': 'As an action, end one spell on yourself or a willing creature you touch. Uses equal to your Charisma modifier per long rest.',
  'Aura improvements': 'The range of your auras increases to 30 feet.',
  'Oath Capstone': "Your Sacred Oath's capstone feature (e.g., Holy Nimbus, Elder Champion, or Avenging Angel).",

  // ── Ranger ──
  'Favored Enemy': 'You have advantage on Survival checks to track your favored enemies and Intelligence checks to recall information about them, and learn a related language.',
  'Natural Explorer': "You are adept in a favored terrain: difficult terrain doesn't slow your group, you can't be lost by nonmagical means, and you remain alert to danger.",
  'Ranger Archetype': 'Choose your Ranger subclass (Archetype), gaining its features.',
  'Primeval Awareness': 'Expend a spell slot to sense whether certain creature types are present within 1 mile (6 miles in favored terrain).',
  'Hide in Plain Sight': 'Spend 1 minute camouflaging yourself to gain +10 to Stealth checks while you remain still.',
  'Vanish': "You can Hide as a bonus action, and can't be tracked by nonmagical means unless you choose to leave a trail.",
  'Feral Senses': "You gain awareness of invisible creatures near you and aren't hindered when attacking a creature you can't see.",
  'Foe Slayer': 'Once per turn, add your Wisdom modifier to an attack or damage roll against one of your favored enemies.',

  // ── Rogue ──
  'Sneak Attack': 'Once per turn, deal extra damage to a creature you hit with a finesse or ranged weapon if you have advantage or an ally is adjacent to the target. Damage grows with level.',
  "Thieves' Cant": 'A secret mix of dialect, jargon, and code that lets you hide messages within seemingly normal conversation.',
  'Cunning Action': 'You can take a bonus action on each of your turns to Dash, Disengage, or Hide.',
  'Roguish Archetype': 'Choose your Rogue subclass (Archetype), gaining its features.',
  'Uncanny Dodge': 'Use your reaction to halve the damage from one attack that hits you.',
  'Reliable Talent': "When you make an ability check with a skill you're proficient in, treat a d20 roll of 9 or lower as a 10.",
  'Blindsense': 'You are aware of the location of any hidden or invisible creature within 10 feet of you.',
  'Slippery Mind': 'You gain proficiency in Wisdom saving throws.',
  'Elusive': "No attack roll has advantage against you while you aren't incapacitated.",
  'Stroke of Luck': 'Once per short or long rest, turn a missed attack into a hit or a failed ability check into a 20.',

  // ── Sorcerer ──
  'Sorcerous Origin': 'Choose your Sorcerer subclass (Origin) at 1st level, gaining its features.',
  'Font of Magic': 'You have Sorcery Points you can convert to and from spell slots and use to fuel Metamagic.',
  'Metamagic': 'Alter your spells using Metamagic options (e.g., Twinned, Quickened, Subtle Spell) by spending Sorcery Points.',
  'Sorcerous Restoration': 'You regain 4 expended Sorcery Points when you finish a short rest.',

  // ── Warlock ──
  'Otherworldly Patron': 'Choose your Warlock subclass (Patron) at 1st level, gaining its features and expanded spells.',
  'Pact Magic': 'You cast spells using a small number of slots that are always your highest level and recover on a short rest (see the Spells tab).',
  'Eldritch Invocations': 'You learn Eldritch Invocations — magical abilities that enhance your warlock (listed in your Features).',
  'Pact Boon': 'Gain a Pact Boon: Pact of the Chain, Pact of the Blade, or Pact of the Tome.',
  'Mystic Arcanum': 'You can cast one high-level spell (6th–9th as you advance) once per long rest without expending a spell slot.',
  'Eldritch Master': 'Once per long rest, spend 1 minute entreating your patron to regain all expended Pact Magic spell slots.',

  // ── Wizard ──
  'Arcane Recovery': 'Once per day on a short rest, recover expended spell slots with a combined level up to half your wizard level (rounded up).',
  'Arcane Tradition': 'Choose your Wizard subclass (Arcane Tradition) at 2nd level, gaining its features.',
  'Spell Mastery': 'Choose a 1st- and a 2nd-level spell you can cast at will without expending a spell slot.',
  'Signature Spells': 'Choose two 3rd-level spells you always have prepared and can each cast once without a slot per short rest.',

  // ── Artificer ──
  'Magical Tinkering': 'Imbue tiny objects with minor magical properties (light, a recorded message, a sound, or a smell).',
  'Infuse Item': 'Imbue mundane items with artificer infusions to create magic items.',
  'Artificer Specialist': 'Choose your Artificer subclass (Specialist), gaining its features.',
  'The Right Tool for the Job': "During a short or long rest, magically create one set of artisan's tools.",
  'Tool Expertise': 'Double your proficiency bonus for any tool proficiencies you have.',
  'Flash of Genius': 'As a reaction, add your Intelligence modifier to an ability check or save made by you or a creature within 30 feet. Uses equal to your Intelligence modifier per long rest.',
  'Magic Item Adept': 'You can attune to up to four magic items and craft common/uncommon items faster and more cheaply.',
  'Spell-Storing Item': 'Store a spell in an item so others can cast it a set number of times before it must be recharged.',
  'Magic Item Savant': 'You can attune to up to five magic items and ignore class, race, and level requirements on magic items.',
  'Soul of Artifice': 'You gain +1 to all saving throws per attuned magic item, and can end an infusion to drop to 1 HP instead of 0.',
};

// Look up a description by feature name, tolerating "(x/day)", level qualifiers,
// and "improvement(s)" suffixes present in CLASS_LEVELS entries.
export function featureDescription(name) {
  if (!name) return '';
  if (FEATURE_DESCRIPTIONS[name]) return FEATURE_DESCRIPTIONS[name];
  const stripped = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (FEATURE_DESCRIPTIONS[stripped]) return FEATURE_DESCRIPTIONS[stripped];
  const noImp = stripped.replace(/\s+improvements?$/i, '').trim();
  if (FEATURE_DESCRIPTIONS[noImp]) return FEATURE_DESCRIPTIONS[noImp];
  return '';
}
