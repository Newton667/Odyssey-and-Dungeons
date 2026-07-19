// ─── Race, Class, and Level Data ─────────────────────────────────────
// Extracted from CharacterCreate to reduce file size and share across pages.

export const RACES = {
  Dwarf: {
    desc: 'Stout and hardy folk from mountain halls. Resistant to poison, skilled with axes and hammers, and see in the dark.',
    bonuses: { constitution: 2 }, speed: 25,
    traits: ['Darkvision 60ft', 'Dwarven Resilience', 'Dwarven Combat Training', 'Stonecunning'],
    languages: ['Common', 'Dwarvish'],
    subraces: {
      'Hill Dwarf': { bonuses: { wisdom: 1 }, traits: ['Dwarven Toughness (+1 HP/level)'] },
      'Mountain Dwarf': { bonuses: { strength: 2 }, traits: ['Dwarven Armor Training (light & medium)'] },
    },
  },
  Elf: {
    desc: 'Graceful and long-lived with keen senses. Resistant to charm, immune to magical sleep, and don\'t need to sleep (trance instead).',
    bonuses: { dexterity: 2 }, speed: 30,
    traits: ['Darkvision 60ft', 'Keen Senses (Perception proficiency)', 'Fey Ancestry', 'Trance'],
    languages: ['Common', 'Elvish'],
    subraces: {
      'High Elf': { bonuses: { intelligence: 1 }, traits: ['Elf Weapon Training', 'Cantrip (wizard list)', 'Extra Language'] },
      'Wood Elf': { bonuses: { wisdom: 1 }, speed: 35, traits: ['Elf Weapon Training', 'Fleet of Foot (speed 35)', 'Mask of the Wild'] },
      'Dark Elf (Drow)': { bonuses: { charisma: 1 }, traits: ['Superior Darkvision 120ft', 'Sunlight Sensitivity', 'Drow Magic', 'Drow Weapon Training'] },
    },
  },
  Halfling: {
    desc: 'Small, cheerful, and surprisingly lucky. Can reroll natural 1s, brave against fear, and slip through larger creatures\' spaces.',
    bonuses: { dexterity: 2 }, speed: 25,
    traits: ['Lucky', 'Brave', 'Halfling Nimbleness'],
    languages: ['Common', 'Halfling'],
    subraces: {
      'Lightfoot': { bonuses: { charisma: 1 }, traits: ['Naturally Stealthy'] },
      'Stout': { bonuses: { constitution: 1 }, traits: ['Stout Resilience (poison resistance)'] },
    },
  },
  Human: {
    desc: 'The most versatile race. +1 to all ability scores (standard) or +1 to two plus a feat and skill (variant). Adaptable to any class.',
    bonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
    speed: 30, traits: ['Extra Language'],
    languages: ['Common', 'One extra language'],
    subraces: {
      'Standard': { bonuses: {}, traits: ['+1 to all ability scores'] },
      'Variant': { bonuses: {}, traits: ['+1 to two ability scores', '1 skill proficiency', '1 feat'] },
    },
  },
  Dragonborn: {
    desc: 'Proud dragon-descended warriors with a breath weapon attack. Choose a draconic ancestry that determines your damage type and resistance.',
    bonuses: { strength: 2, charisma: 1 }, speed: 30,
    traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
    languages: ['Common', 'Draconic'],
    subraces: {
      'Black (Acid)':      { bonuses: {}, traits: ['Breath: 5×30ft line, DEX save — Acid', 'Resistance: Acid'] },
      'Blue (Lightning)':  { bonuses: {}, traits: ['Breath: 5×30ft line, DEX save — Lightning', 'Resistance: Lightning'] },
      'Brass (Fire)':      { bonuses: {}, traits: ['Breath: 5×30ft line, DEX save — Fire', 'Resistance: Fire'] },
      'Bronze (Lightning)':{ bonuses: {}, traits: ['Breath: 5×30ft line, DEX save — Lightning', 'Resistance: Lightning'] },
      'Copper (Acid)':     { bonuses: {}, traits: ['Breath: 5×30ft line, DEX save — Acid', 'Resistance: Acid'] },
      'Gold (Fire)':       { bonuses: {}, traits: ['Breath: 15ft cone, DEX save — Fire', 'Resistance: Fire'] },
      'Green (Poison)':    { bonuses: {}, traits: ['Breath: 15ft cone, CON save — Poison', 'Resistance: Poison'] },
      'Red (Fire)':        { bonuses: {}, traits: ['Breath: 15ft cone, DEX save — Fire', 'Resistance: Fire'] },
      'Silver (Cold)':     { bonuses: {}, traits: ['Breath: 15ft cone, CON save — Cold', 'Resistance: Cold'] },
      'White (Cold)':      { bonuses: {}, traits: ['Breath: 15ft cone, CON save — Cold', 'Resistance: Cold'] },
    },
  },
  Gnome: {
    desc: 'Tiny, curious, and clever. Advantage on INT/WIS/CHA saves against magic. Natural tinkerers and illusionists.',
    bonuses: { intelligence: 2 }, speed: 25,
    traits: ['Darkvision 60ft', 'Gnome Cunning (ADV on INT/WIS/CHA saves vs magic)'],
    languages: ['Common', 'Gnomish'],
    subraces: {
      'Forest Gnome': { bonuses: { dexterity: 1 }, traits: ['Natural Illusionist (minor illusion)', 'Speak with Small Beasts'] },
      'Rock Gnome': { bonuses: { constitution: 1 }, traits: ["Artificer's Lore", 'Tinker'] },
    },
  },
  'Half-Elf': {
    desc: 'Charismatic blend of human and elf. +2 CHA, +1 to two other scores, two extra skills, darkvision, and fey ancestry. Extremely versatile.',
    bonuses: { charisma: 2 }, speed: 30,
    traits: ['Darkvision 60ft', 'Fey Ancestry', 'Skill Versatility (+2 skill proficiencies)', 'Extra Language'],
    languages: ['Common', 'Elvish', 'One extra'],
    subraces: {},
    halfElfExtra: true,
  },
  'Half-Orc': {
    desc: 'Powerful warriors with orcish blood. Drop to 1 HP instead of 0 once per rest, extra crit damage, and Intimidation proficiency.',
    bonuses: { strength: 2, constitution: 1 }, speed: 30,
    traits: ['Darkvision 60ft', 'Menacing (Intimidation proficiency)', 'Relentless Endurance', 'Savage Attacks'],
    languages: ['Common', 'Orc'],
    subraces: {},
  },
  Tiefling: {
    desc: 'Infernal heritage grants fire resistance and innate spellcasting (thaumaturgy, hellish rebuke, darkness). Charismatic but often mistrusted.',
    bonuses: { intelligence: 1, charisma: 2 }, speed: 30,
    traits: ['Darkvision 60ft', 'Hellish Resistance (fire)', 'Infernal Legacy (thaumaturgy, hellish rebuke, darkness)'],
    languages: ['Common', 'Infernal'],
    subraces: {},
  },
  Aasimar: {
    desc: 'Celestial-touched with healing hands, light cantrip, and a powerful transformation at level 3 (radiant wings, searing aura, or shadowy shroud).',
    bonuses: { charisma: 2 }, speed: 30,
    traits: ['Darkvision 60ft', 'Celestial Resistance (acid & necrotic)', 'Healing Hands (heal Xd4 HP = your level, 1/long rest)', 'Light Bearer (light cantrip)'],
    languages: ['Common', 'Celestial'],
    subraces: {
      'Protector': { bonuses: { wisdom: 1 }, traits: ['Radiant Soul — sprout wings, gain fly speed = walk speed, deal +1d4 radiant on attacks for 1 min (1/long rest)'] },
      'Scourge':   { bonuses: { constitution: 1 }, traits: ['Radiant Consumption — emit searing light, deal ½-level necrotic to nearby creatures + extra radiant on attacks (1/long rest)'] },
      'Fallen':    { bonuses: { strength: 1 }, traits: ['Necrotic Shroud — emit shadowy energy, frighten nearby creatures, deal extra necrotic on attacks for 1 min (1/long rest)'] },
    },
  },
  Bugbear: {
    desc: 'Large goblinoid ambush predators. Extra reach on your first turn, Stealth proficiency, and bonus damage when surprising enemies.',
    bonuses: { strength: 2, dexterity: 1 }, speed: 30,
    traits: ['Darkvision 60ft', 'Long-Limbed (+5ft reach on first turn of combat)', 'Powerful Build (count as Large for carry weight)', 'Sneaky (Stealth proficiency)', 'Surprise Attack (+2d6 damage if creature hasn\'t acted this combat)'],
    languages: ['Common', 'Goblin'],
    subraces: {},
  },
  Firbolg: {
    desc: 'Gentle forest giants who can turn invisible, detect magic, disguise self, and communicate with plants and animals.',
    bonuses: { wisdom: 2, strength: 1 }, speed: 30,
    traits: ['Firbolg Magic (detect magic & disguise self 1/short rest each)', 'Hidden Step (turn invisible as bonus action until next attack or end of turn, 1/short rest)', 'Powerful Build (count as Large for carry weight)', 'Speech of Beast and Leaf (communicate simple ideas with beasts and plants)'],
    languages: ['Common', 'Elvish', 'Giant'],
    subraces: {},
  },
  Goblin: {
    desc: 'Small and nimble. Disengage or Hide as a bonus action every turn, and deal extra damage to creatures larger than you.',
    bonuses: { dexterity: 2, constitution: 1 }, speed: 30,
    traits: ['Darkvision 60ft', 'Fury of the Small (deal extra damage = your level when hitting creature larger than you, 1/short rest)', 'Nimble Escape (Disengage or Hide as bonus action each turn)'],
    languages: ['Common', 'Goblin'],
    subraces: {},
  },
  Hobgoblin: {
    desc: 'Disciplined goblinoid warriors. Light/medium armor proficiency, two martial weapons, and a bonus to failed rolls when allies are nearby.',
    bonuses: { constitution: 2, intelligence: 1 }, speed: 30,
    traits: ['Darkvision 60ft', 'Martial Training (light & medium armor + 2 martial weapons)', 'Saving Face (add bonus = number of visible allies to a failed roll, 1/short rest)'],
    languages: ['Common', 'Goblin'],
    subraces: {},
  },
  Kenku: {
    desc: 'Flightless crow-folk who can perfectly mimic any sound. Expert forgers with proficiency in two skills from Acrobatics, Deception, Stealth, or Sleight of Hand.',
    bonuses: { dexterity: 2, wisdom: 1 }, speed: 30,
    traits: ['Expert Forgery (duplicate handwriting and craftsmanship perfectly)', 'Kenku Training (proficiency in 2 of: Acrobatics, Deception, Stealth, Sleight of Hand)', 'Mimicry (flawlessly copy sounds heard — Insight/Perception check to detect)'],
    languages: ['Common', 'Auran (spoken only through mimicry)'],
    subraces: {},
  },
  Kobold: {
    desc: 'Tiny dragon-kin. Pack Tactics gives advantage when an ally is adjacent. Draconic Cry grants allies advantage on nearby targets.',
    bonuses: { dexterity: 2 }, speed: 30,
    traits: ['Darkvision 60ft', 'Draconic Cry (bonus action — creatures within 10ft have ADV on attacks vs them until your next turn, 1/short rest)', 'Pack Tactics (ADV on attacks when an ally is adjacent to target)', 'Kobold Legacy (choose one benefit: Craftiness, Defiance, or Draconic Sorcery)'],
    languages: ['Common', 'Draconic'],
    subraces: {},
  },
  Lizardfolk: {
    desc: 'Reptilian survivors with natural armor (AC 13+DEX), a bite attack, swim speed, and the ability to craft weapons from slain creatures.',
    bonuses: { constitution: 2, wisdom: 1 }, speed: 30,
    traits: ['Bite (1d6 piercing melee weapon attack)', 'Cunning Artisan (craft weapons/shields from slain creature parts on short rest)', 'Hold Breath (up to 15 minutes)', 'Hunter\'s Lore (2 skills from Animal Handling, Nature, Perception, Stealth, Survival)', 'Natural Armor (AC = 13 + DEX, ignores worn armor)', 'Hungry Jaws (bite as bonus action + gain CON-mod temp HP, 1/short rest)', 'Swim speed 30ft'],
    languages: ['Common', 'Draconic'],
    subraces: {},
  },
  Orc: {
    desc: 'Powerful warriors who can dash toward enemies as a bonus action. Count as Large for carrying, with proficiency in several nature/survival skills.',
    bonuses: { strength: 2, constitution: 1 }, speed: 30,
    traits: ['Darkvision 60ft', 'Aggressive (bonus action to move up to speed toward a hostile creature)', 'Powerful Build (count as Large for carry weight)', 'Primal Intuition (2 skills from Animal Handling, Insight, Intimidation, Medicine, Nature, Perception, Survival)'],
    languages: ['Common', 'Orc'],
    subraces: {},
  },
  Tabaxi: {
    desc: 'Cat-folk with climb speed, claws, and Feline Agility to double your movement for a turn. Perception and Stealth proficiency.',
    bonuses: { dexterity: 2, charisma: 1 }, speed: 30,
    traits: ['Darkvision 60ft', 'Feline Agility (double speed for one turn, can\'t use again until standing still for a turn)', 'Cat\'s Claws (climb speed 20ft; 1d4 slashing unarmed strike)', 'Cat\'s Talent (Perception & Stealth proficiency)'],
    languages: ['Common', 'One extra language'],
    subraces: {},
  },
  Triton: {
    desc: 'Aquatic guardians of the deep. Breathe air and water, swim speed 30ft, cold resistance, and innate water/air control spells.',
    bonuses: { strength: 1, constitution: 1, charisma: 1 }, speed: 30,
    traits: ['Amphibious (breathe air and water)', 'Control Air and Water (fog cloud, gust of wind at 3rd level, wall of water at 5th — each 1/long rest)', 'Darkvision 60ft', 'Emissary of the Sea (communicate simple ideas with water-breathing creatures)', 'Guardians of the Depths (resistance to cold damage)', 'Swim speed 30ft'],
    languages: ['Common', 'Primordial'],
    subraces: {},
  },
  'Yuan-ti Pureblood': {
    desc: 'Serpent-folk with poison immunity, Magic Resistance (advantage on all saves vs. spells), and innate spellcasting. Very powerful defensively.',
    bonuses: { intelligence: 1, charisma: 2 }, speed: 30,
    traits: ['Darkvision 60ft', 'Innate Spellcasting — poison spray cantrip; animal friendship (snakes) at will; suggestion 1/long rest (CHA)', 'Magic Resistance (ADV on saving throws vs spells & magical effects)', 'Poison Immunity'],
    languages: ['Common', 'Abyssal', 'Draconic'],
    subraces: {},
  },
  Aarakocra: {
    desc: 'Bird-folk with 50ft fly speed (can\'t wear medium/heavy armor). Talons deal 1d4 slashing. Incredibly mobile.',
    bonuses: { dexterity: 2, wisdom: 1 }, speed: 25,
    traits: ['Flight (fly speed 50ft — can\'t wear medium or heavy armor)', 'Talons (1d4 slashing unarmed strike)', 'Wind Caller (gust of wind 1/long rest at 3rd level)'],
    languages: ['Common', 'Aarakocra', 'Auran'],
    subraces: {},
  },
  Genasi: {
    desc: 'Elemental-touched humanoids. Choose Air, Earth, Fire, or Water — each grants unique resistances, movement, and innate spells.',
    bonuses: { constitution: 2 }, speed: 30,
    traits: [],
    languages: ['Common', 'Primordial'],
    subraces: {
      'Air Genasi':   { bonuses: { dexterity: 1 }, traits: ['Unending Breath (hold breath indefinitely)', 'Mingle with Wind (levitate 1/short rest; feather fall at will)'] },
      'Earth Genasi': { bonuses: { strength: 1 }, traits: ['Earth Walk (move through difficult terrain made of earth/stone freely)', 'Merge with Stone (pass without trace 1/long rest; meld into stone 1/long rest at 5th)'] },
      'Fire Genasi':  { bonuses: { intelligence: 1 }, traits: ['Darkvision 60ft', 'Fire Resistance', 'Reach to the Blaze (produce flame cantrip; burning hands 1/long rest at 3rd level)'] },
      'Water Genasi': { bonuses: { wisdom: 1 }, traits: ['Acid Resistance', 'Amphibious (breathe air and water)', 'Swim speed 30ft', 'Call to the Wave (shape water cantrip; create/destroy water 1/long rest at 3rd)'] },
    },
  },
  Changeling: {
    desc: 'Shapeshifters who can alter their appearance at will as a bonus action. Excellent for social encounters and infiltration.',
    bonuses: { charisma: 2, dexterity: 1 }, speed: 30,
    traits: ['Shapechanger (bonus action — alter appearance, height, weight, voice; opposed by Insight)', 'Changeling Instincts (2 skills from Deception, Insight, Intimidation, Performance, Persuasion)'],
    languages: ['Common', 'Two extra languages'],
    subraces: {},
  },
  Kalashtar: {
    desc: 'Psychically bonded with dream spirits. Advantage on WIS saves, psychic resistance, telepathy, and immunity to dream manipulation.',
    bonuses: { wisdom: 2, charisma: 1 }, speed: 30,
    traits: ['Dual Mind (ADV on WIS saves)', 'Mental Discipline (resistance to psychic damage)', 'Mind Link (telepathically speak with one willing creature within 60ft you can see)', 'Severed from Dreams (immune to dream/nightmare effects; Lullaby spell doesn\'t affect you)', 'Psychic Glamour (ADV on one of: Insight, Intimidation, Performance, or Persuasion)'],
    languages: ['Common', 'Quori', 'One extra'],
    subraces: {},
  },
  Shifter: {
    desc: 'Lycanthropic heritage lets you Shift as a bonus action for temporary buffs. Four subraces: tanky, biting, speedy, or perception-focused.',
    bonuses: {}, speed: 30,
    traits: ['Darkvision 60ft', 'Shifting (bonus action — gain benefits below for 1 min, 1/short rest)'],
    languages: ['Common'],
    subraces: {
      'Beasthide':   { bonuses: { constitution: 2, strength: 1 }, traits: ['Shifting: gain 1d6 + CON mod temp HP and +1 AC'] },
      'Longtooth':   { bonuses: { strength: 2, dexterity: 1 }, traits: ['Shifting: fangs become melee weapon (1d6 piercing); attack with them as bonus action'] },
      'Swiftstride': { bonuses: { dexterity: 2, charisma: 1 }, traits: ['Shifting: +10ft speed; Acrobatics proficiency; creatures can\'t make OA against you when you move'] },
      'Wildhunt':    { bonuses: { wisdom: 2, dexterity: 1 }, traits: ['Shifting: can\'t be surprised; all creatures within 30ft are visible even through magical darkness'] },
    },
  },
  Warforged: {
    desc: 'Living constructs built for war. +1 AC always, poison resistance, no need for food/water/air/sleep, and disease immunity.',
    bonuses: { constitution: 2, intelligence: 1 }, speed: 30,
    traits: ['Constructed Resilience (ADV vs poison; resistance to poison; immune to disease; no food/drink/air needed; immune to magic sleep)', 'Sentry\'s Rest (instead of sleeping, enter inactive state for 6 hrs; still aware of surroundings)', 'Integrated Protection (+1 AC always; can still don armor for additional AC)', 'Specialized Design (1 skill proficiency + 1 tool proficiency of your choice)'],
    languages: ['Common', 'One extra language'],
    subraces: {},
  },
  Tortle: {
    desc: 'Turtle-folk with natural AC 17 (no armor needed). Can withdraw into shell for +4 AC. Claws, hold breath 1 hour, and swim speed.',
    bonuses: { strength: 2, wisdom: 1 }, speed: 30,
    traits: ['Claws (1d4 slashing unarmed strike)', 'Hold Breath (up to 1 hour)', 'Natural Armor (AC = 17; can\'t benefit from worn armor or shields)', 'Shell Defense (withdraw into shell as action — AC +4, ADV DEX saves, speed 0, prone; emerge with action)', 'Survival Instinct (Survival proficiency)', 'Swim speed 30ft'],
    languages: ['Common', 'Aquan'],
    subraces: {},
  },
  Goliath: {
    desc: 'Mountain-dwelling giants. Athletics proficiency, cold resistance, count as Large for carrying, and reduce incoming damage as a reaction.',
    bonuses: { strength: 2, constitution: 1 }, speed: 30,
    traits: ['Natural Athlete (Athletics proficiency)', 'Stone\'s Endurance (reaction — reduce incoming damage by 1d12 + CON mod, 1/short rest)', 'Powerful Build (count as Large for carry weight)', 'Mountain Born (resistance to cold damage; acclimated to high altitude)'],
    languages: ['Common', 'Giant'],
    subraces: {},
  },
};

export const CLASS_LEVELS = {
  Barbarian: { 1: ['Rage (2/day)', 'Unarmored Defense'], 2: ['Reckless Attack', 'Danger Sense'], 3: ['Primal Path'], 4: ['ASI'], 5: ['Extra Attack', 'Fast Movement (+10ft)'], 6: ['Path Feature'], 7: ['Feral Instinct'], 8: ['ASI'], 9: ['Brutal Critical (+1 die)'], 10: ['Path Feature'], 11: ['Relentless Rage'], 12: ['ASI'], 13: ['Brutal Critical (+2 dice)'], 14: ['Path Feature'], 15: ['Persistent Rage'], 16: ['ASI'], 17: ['Brutal Critical (+3 dice)'], 18: ['Indomitable Might'], 19: ['ASI'], 20: ['Primal Champion (+4 STR/CON)'] },
  Bard: { 1: ['Spellcasting', 'Bardic Inspiration (d6)'], 2: ['Jack of All Trades', 'Song of Rest (d6)'], 3: ['Bard College', 'Expertise'], 4: ['ASI'], 5: ['Bardic Inspiration (d8)', 'Font of Inspiration'], 6: ['Countercharm', 'College Feature'], 7: [], 8: ['ASI'], 9: ['Song of Rest (d8)'], 10: ['Bardic Inspiration (d10)', 'Expertise', 'Magical Secrets'], 11: [], 12: ['ASI'], 13: ['Song of Rest (d10)'], 14: ['Magical Secrets', 'College Feature'], 15: ['Bardic Inspiration (d12)'], 16: ['ASI'], 17: ['Song of Rest (d12)'], 18: ['Magical Secrets'], 19: ['ASI'], 20: ['Superior Inspiration'] },
  Cleric: { 1: ['Spellcasting', 'Divine Domain'], 2: ['Channel Divinity (1/rest)', 'Domain Feature'], 3: [], 4: ['ASI'], 5: ['Destroy Undead (CR 1/2)'], 6: ['Channel Divinity (2/rest)', 'Domain Feature'], 7: [], 8: ['ASI', 'Destroy Undead (CR 1)', 'Domain Feature'], 9: [], 10: ['Divine Intervention'], 11: ['Destroy Undead (CR 2)'], 12: ['ASI'], 13: [], 14: ['Destroy Undead (CR 3)'], 15: [], 16: ['ASI'], 17: ['Destroy Undead (CR 4)', 'Domain Feature'], 18: ['Channel Divinity (3/rest)'], 19: ['ASI'], 20: ['Divine Intervention (auto)'] },
  Druid: { 1: ['Druidic', 'Spellcasting'], 2: ['Wild Shape (CR 1/4)', 'Druid Circle'], 3: [], 4: ['ASI', 'Wild Shape (CR 1/2)'], 5: [], 6: ['Circle Feature'], 7: [], 8: ['ASI', 'Wild Shape (CR 1)'], 9: [], 10: ['Circle Feature'], 11: [], 12: ['ASI'], 13: [], 14: ['Circle Feature'], 15: [], 16: ['ASI'], 17: [], 18: ['Timeless Body', 'Beast Spells'], 19: ['ASI'], 20: ['Archdruid (unlimited Wild Shape)'] },
  Fighter: { 1: ['Fighting Style', 'Second Wind'], 2: ['Action Surge (1/rest)'], 3: ['Martial Archetype'], 4: ['ASI'], 5: ['Extra Attack'], 6: ['ASI'], 7: ['Archetype Feature'], 8: ['ASI'], 9: ['Indomitable (1/rest)'], 10: ['Archetype Feature'], 11: ['Extra Attack (2)'], 12: ['ASI'], 13: ['Indomitable (2/rest)'], 14: ['ASI'], 15: ['Archetype Feature'], 16: ['ASI'], 17: ['Action Surge (2/rest)', 'Indomitable (3/rest)'], 18: ['Archetype Feature'], 19: ['ASI'], 20: ['Extra Attack (3)'] },
  Monk: { 1: ['Unarmored Defense', 'Martial Arts (d4)'], 2: ['Ki', 'Unarmored Movement (+10ft)'], 3: ['Monastic Tradition', 'Deflect Missiles'], 4: ['ASI', 'Slow Fall'], 5: ['Extra Attack', 'Stunning Strike'], 6: ['Ki-Empowered Strikes', 'Tradition Feature'], 7: ['Evasion', 'Stillness of Mind'], 8: ['ASI'], 9: ['Unarmored Movement Improvement'], 10: ['Purity of Body'], 11: ['Martial Arts (d8)', 'Tradition Feature'], 12: ['ASI'], 13: ['Tongue of the Sun and Moon'], 14: ['Diamond Soul'], 15: ['Timeless Body'], 16: ['ASI'], 17: ['Martial Arts (d10)', 'Tradition Feature'], 18: ['Empty Body'], 19: ['ASI'], 20: ['Perfect Self'] },
  Paladin: { 1: ['Divine Sense', 'Lay on Hands'], 2: ['Fighting Style', 'Spellcasting', 'Divine Smite'], 3: ['Sacred Oath', 'Channel Divinity'], 4: ['ASI'], 5: ['Extra Attack'], 6: ['Aura of Protection'], 7: ['Oath Feature'], 8: ['ASI'], 9: [], 10: ['Aura of Courage'], 11: ['Improved Divine Smite'], 12: ['ASI'], 13: [], 14: ['Cleansing Touch'], 15: ['Oath Feature'], 16: ['ASI'], 17: [], 18: ['Aura improvements (30ft)'], 19: ['ASI'], 20: ['Oath Capstone'] },
  Ranger: { 1: ['Favored Enemy', 'Natural Explorer'], 2: ['Fighting Style', 'Spellcasting'], 3: ['Ranger Archetype', 'Primeval Awareness'], 4: ['ASI'], 5: ['Extra Attack'], 6: ['Favored Enemy improvement', 'Natural Explorer improvement'], 7: ['Archetype Feature'], 8: ['ASI'], 9: [], 10: ['Natural Explorer improvement', 'Hide in Plain Sight'], 11: ['Archetype Feature'], 12: ['ASI'], 13: [], 14: ['Favored Enemy improvement', 'Vanish'], 15: ['Archetype Feature'], 16: ['ASI'], 17: [], 18: ['Feral Senses'], 19: ['ASI'], 20: ['Foe Slayer'] },
  Rogue: { 1: ['Expertise (2)', 'Sneak Attack (1d6)', "Thieves' Cant"], 2: ['Cunning Action'], 3: ['Roguish Archetype', 'Sneak Attack (2d6)'], 4: ['ASI'], 5: ['Uncanny Dodge', 'Sneak Attack (3d6)'], 6: ['Expertise (4)'], 7: ['Evasion', 'Sneak Attack (4d6)'], 8: ['ASI'], 9: ['Archetype Feature', 'Sneak Attack (5d6)'], 10: ['ASI'], 11: ['Reliable Talent', 'Sneak Attack (6d6)'], 12: ['ASI'], 13: ['Archetype Feature', 'Sneak Attack (7d6)'], 14: ['Blindsense'], 15: ['Slippery Mind', 'Sneak Attack (8d6)'], 16: ['ASI'], 17: ['Archetype Feature', 'Sneak Attack (9d6)'], 18: ['Elusive'], 19: ['ASI', 'Sneak Attack (10d6)'], 20: ['Stroke of Luck'] },
  Sorcerer: { 1: ['Spellcasting', 'Sorcerous Origin'], 2: ['Font of Magic (Sorcery Points)'], 3: ['Metamagic (2 options)'], 4: ['ASI'], 5: [], 6: ['Origin Feature'], 7: [], 8: ['ASI'], 9: [], 10: ['Metamagic (3 options)'], 11: [], 12: ['ASI'], 13: [], 14: ['Origin Feature'], 15: [], 16: ['ASI'], 17: ['Metamagic (4 options)'], 18: ['Origin Feature'], 19: ['ASI'], 20: ['Sorcerous Restoration'] },
  Warlock: { 1: ['Otherworldly Patron', 'Pact Magic'], 2: ['Eldritch Invocations (2)'], 3: ['Pact Boon'], 4: ['ASI'], 5: ['Eldritch Invocations (3)'], 6: ['Patron Feature'], 7: ['Eldritch Invocations (4)'], 8: ['ASI'], 9: ['Eldritch Invocations (5)'], 10: ['Patron Feature'], 11: ['Mystic Arcanum (6th)'], 12: ['ASI', 'Eldritch Invocations (6)'], 13: ['Mystic Arcanum (7th)'], 14: ['Patron Feature'], 15: ['Mystic Arcanum (8th)', 'Eldritch Invocations (7)'], 16: ['ASI'], 17: ['Mystic Arcanum (9th)'], 18: ['Eldritch Invocations (8)'], 19: ['ASI'], 20: ['Eldritch Master'] },
  Wizard: { 1: ['Spellcasting', 'Arcane Recovery'], 2: ['Arcane Tradition'], 3: [], 4: ['ASI'], 5: [], 6: ['Tradition Feature'], 7: [], 8: ['ASI'], 9: [], 10: ['Tradition Feature'], 11: [], 12: ['ASI'], 13: [], 14: ['Tradition Feature'], 15: [], 16: ['ASI'], 17: [], 18: ['Spell Mastery'], 19: ['ASI'], 20: ['Signature Spells'] },
  Artificer: { 1: ['Magical Tinkering', 'Spellcasting'], 2: ['Infuse Item'], 3: ['Artificer Specialist', 'The Right Tool for the Job'], 4: ['ASI'], 5: ['Specialist Feature'], 6: ['Tool Expertise'], 7: ['Flash of Genius'], 8: ['ASI'], 9: ['Specialist Feature'], 10: ['Magic Item Adept'], 11: ['Spell-Storing Item'], 12: ['ASI'], 13: [], 14: ['Magic Item Savant'], 15: ['Specialist Feature'], 16: ['ASI'], 17: [], 18: [], 19: ['ASI'], 20: ['Soul of Artifice'] },
};

export const CLASSES = {
  Barbarian: { desc: 'A fierce warrior who channels primal rage to deal devastating damage and shrug off blows. Best in melee combat with heavy weapons.', hitDice: 'd12', hpBase: 12, primaryAbility: 'strength', armorProf: 'Light armor, medium armor, shields', weaponProf: 'Simple weapons, martial weapons', savingThrows: ['strength', 'constitution'], skillChoices: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'], numSkills: 2, subclasses: ['Path of the Berserker', 'Path of the Totem Warrior'], subclassLevel: 3, subclassDescs: { 'Path of the Berserker': 'Go into a frenzy for extra attacks, but risk exhaustion. Pure offensive rage.', 'Path of the Totem Warrior': 'Channel animal spirits for defensive and utility powers. Bear totem gives resistance to all damage while raging.' }, spellcasting: false, features: ['Rage — Enter a fury (bonus action, 2 uses/long rest). Advantage on STR checks/saves, +2 melee damage, resistance to bludgeoning/piercing/slashing', 'Unarmored Defense — While not wearing armor, AC = 10 + DEX mod + CON mod'], equipment: ['(a) a greataxe or (b) any martial melee weapon', '(a) two handaxes or (b) any simple weapon', "An explorer's pack and four javelins"] },
  Bard: { desc: 'A charismatic performer who weaves magic through music and words. Inspires allies, casts versatile spells, and excels at social encounters.', hitDice: 'd8', hpBase: 8, primaryAbility: 'charisma', armorProf: 'Light armor', weaponProf: 'Simple weapons, hand crossbows, longswords, rapiers, shortswords', savingThrows: ['dexterity', 'charisma'], skillChoices: ['Acrobatics','Animal Handling','Arcana','Athletics','Deception','History','Insight','Intimidation','Investigation','Medicine','Nature','Perception','Performance','Persuasion','Religion','Sleight of Hand','Stealth','Survival'], numSkills: 3, subclasses: ['College of Lore', 'College of Valor'], subclassLevel: 3, subclassDescs: { 'College of Lore': 'More skills, extra magical secrets, and Cutting Words to debuff enemies.', 'College of Valor': 'Medium armor, shields, martial weapons, and Combat Inspiration for allies.' }, spellcasting: true, spellcastingAbility: 'charisma', features: ['Spellcasting (CHA) — 2 cantrips known, 2 first-level spell slots, 4 spells known', 'Bardic Inspiration (d6) — Bonus action: give an ally a d6 to add to one ability check, attack, or save within 10 min. CHA mod uses per long rest'], equipment: ['(a) a rapier, (b) a longsword, or (c) any simple weapon', "(a) a diplomat's pack or (b) an entertainer's pack", '(a) a lute or (b) any other musical instrument', 'Leather armor and a dagger'] },
  Cleric: { desc: 'A holy warrior empowered by a divine domain. Heals allies, wears armor, and channels the power of their deity through prayers and spells.', hitDice: 'd8', hpBase: 8, primaryAbility: 'wisdom', armorProf: 'Light armor, medium armor, shields', weaponProf: 'Simple weapons', savingThrows: ['wisdom', 'charisma'], skillChoices: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'], numSkills: 2, subclasses: ['Knowledge Domain', 'Life Domain', 'Light Domain', 'Nature Domain', 'Tempest Domain', 'Trickery Domain', 'War Domain'], subclassLevel: 1, subclassDescs: { 'Knowledge Domain': 'Expertise in knowledge skills, read thoughts, and learn any spell briefly.', 'Life Domain': 'The best healer in the game. Heavy armor and boosted healing spells.', 'Light Domain': 'Blasts of radiant fire, Warding Flare to protect yourself, area damage spells.', 'Nature Domain': 'Heavy armor druid-cleric hybrid. Command plants, animals, and elements.', 'Tempest Domain': 'Heavy armor, martial weapons, thunder/lightning spells, maximize lightning damage.', 'Trickery Domain': 'Stealth, illusions, disguise, and creating duplicates. The sneaky cleric.', 'War Domain': 'Heavy armor, martial weapons, bonus attacks, and guided strikes.' }, spellcasting: true, spellcastingAbility: 'wisdom', features: ['Spellcasting (WIS) — 3 cantrips known, 2 first-level spell slots. Prepare WIS mod + 1 spells each day', 'Divine Domain — Choose a domain at level 1, granting bonus spells and domain features'], equipment: ['(a) a mace or (b) a warhammer', '(a) scale mail, (b) leather, or (c) chain mail', "(a) a light crossbow and 20 bolts or (b) any simple weapon", "(a) a priest's pack or (b) an explorer's pack", 'A shield and a holy symbol'] },
  Druid: { desc: 'A guardian of nature who draws power from the natural world. Can shapeshift into animals, cast nature spells, and control the elements.', hitDice: 'd8', hpBase: 8, primaryAbility: 'wisdom', armorProf: 'Light armor (non-metal), medium armor (non-metal), shields (non-metal)', weaponProf: 'Clubs, daggers, darts, javelins, maces, quarterstaffs, scimitars, sickles, slings, spears', savingThrows: ['intelligence', 'wisdom'], skillChoices: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'], numSkills: 2, subclasses: ['Circle of the Land', 'Circle of the Moon'], subclassLevel: 2, subclassDescs: { 'Circle of the Land': 'Extra spells based on your chosen terrain. Better spell recovery and more casting focused.', 'Circle of the Moon': 'Transform into powerful beasts in combat. The best shapeshifter — tank with Wild Shape.' }, spellcasting: true, spellcastingAbility: 'wisdom', features: ['Druidic — You know Druidic, a secret language only druids can speak and leave hidden messages in', 'Spellcasting (WIS) — 2 cantrips known, 2 first-level spell slots. Prepare WIS mod + 1 spells each day'], equipment: ['(a) a wooden shield or (b) any simple weapon', '(a) a scimitar or (b) any simple melee weapon', "Leather armor, explorer's pack, and a druidic focus"] },
  Fighter: { desc: 'A master of martial combat trained in a variety of weapons and armor. Tough, versatile, and deadly — the backbone of any adventuring party.', hitDice: 'd10', hpBase: 10, primaryAbility: 'strength', armorProf: 'All armor, shields', weaponProf: 'Simple weapons, martial weapons', savingThrows: ['strength', 'constitution'], skillChoices: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Perception', 'Survival'], numSkills: 2, subclasses: ['Champion', 'Battle Master', 'Eldritch Knight'], subclassLevel: 3, subclassDescs: { 'Champion': 'Simple but effective. Improved critical hits, extra fighting style, and remarkable athleticism.', 'Battle Master': 'Tactical combat maneuvers like Trip, Riposte, and Disarm. The most versatile fighter.', 'Eldritch Knight': 'Combines fighting with wizard spells. Abjuration and evocation magic plus weapon bond.' }, spellcasting: false, features: ['Fighting Style — Choose one: Archery (+2 ranged attacks), Defense (+1 AC in armor), Dueling (+2 damage one-handed), Great Weapon Fighting (reroll 1s/2s on two-handed damage), Protection (impose disadvantage with shield), Two-Weapon Fighting (add modifier to offhand damage)', 'Second Wind — Bonus action: regain 1d10 + fighter level HP. Once per short rest'], equipment: ['(a) chain mail or (b) leather armor, longbow, and 20 arrows', '(a) a martial weapon and shield or (b) two martial weapons', "(a) a light crossbow and 20 bolts or (b) two handaxes", "(a) a dungeoneer's pack or (b) an explorer's pack"] },
  Monk: { desc: 'A disciplined martial artist who harnesses ki energy. Strikes fast, dodges attacks, and needs no armor or weapons to be deadly.', hitDice: 'd8', hpBase: 8, primaryAbility: 'dexterity', armorProf: 'None', weaponProf: 'Simple weapons, shortswords', savingThrows: ['strength', 'dexterity'], skillChoices: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'], numSkills: 2, subclasses: ['Way of the Open Hand', 'Way of Shadow', 'Way of the Four Elements'], subclassLevel: 3, subclassDescs: { 'Way of the Open Hand': 'The classic martial artist. Knock enemies prone, push them, or prevent reactions with Flurry of Blows.', 'Way of Shadow': 'Ninja-like abilities: darkness, silence, pass without trace, and shadow teleportation.', 'Way of the Four Elements': 'Channel ki into elemental spells like fireball and water whip. Spellcasting monk.' }, spellcasting: false, features: ['Unarmored Defense — While not wearing armor, AC = 10 + DEX mod + WIS mod', 'Martial Arts — Unarmed strikes use d4 damage and can use DEX. Bonus action unarmed strike after attacking with a monk weapon'], equipment: ['(a) a shortsword or (b) any simple weapon', "(a) a dungeoneer's pack or (b) an explorer's pack", '10 darts'] },
  Paladin: { desc: 'A holy knight sworn to an oath. Combines heavy armor and martial prowess with divine magic to smite evil and protect allies.', hitDice: 'd10', hpBase: 10, primaryAbility: 'strength', armorProf: 'All armor, shields', weaponProf: 'Simple weapons, martial weapons', savingThrows: ['wisdom', 'charisma'], skillChoices: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'], numSkills: 2, subclasses: ['Oath of Devotion', 'Oath of the Ancients', 'Oath of Vengeance'], subclassLevel: 3, subclassDescs: { 'Oath of Devotion': 'The classic holy knight. Sacred Weapon, Turn the Unholy, and protective auras.', 'Oath of the Ancients': 'Fey-themed paladin. Resistance to spell damage for nearby allies, nature-based powers.', 'Oath of Vengeance': 'Relentless hunter of evil. Vow of Enmity for advantage, and spells to chase down foes.' }, spellcasting: true, spellcastingAbility: 'charisma', features: ['Divine Sense — Action: detect celestials, fiends, or undead within 60 ft. 1 + CHA mod uses per long rest', 'Lay on Hands — Touch a creature to restore HP from a pool of 5 x paladin level. Can also spend 5 points to cure a disease or poison'], equipment: ['(a) a martial weapon and shield or (b) two martial weapons', "(a) five javelins or (b) any simple melee weapon", "(a) a priest's pack or (b) an explorer's pack", 'Chain mail and a holy symbol'] },
  Ranger: { desc: 'A skilled hunter and tracker at home in the wilderness. Combines martial ability with nature magic, specializing against chosen foes and terrain.', hitDice: 'd10', hpBase: 10, primaryAbility: 'dexterity', armorProf: 'Light armor, medium armor, shields', weaponProf: 'Simple weapons, martial weapons', savingThrows: ['strength', 'dexterity'], skillChoices: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'], numSkills: 3, subclasses: ['Hunter', 'Beast Master'], subclassLevel: 3, subclassDescs: { 'Hunter': 'Specialized at slaying specific prey. Choose abilities for fighting hordes, giants, or evasion.', 'Beast Master': 'Bond with an animal companion that fights alongside you in combat.' }, spellcasting: true, spellcastingAbility: 'wisdom', features: ['Favored Enemy — Choose a creature type (beasts, fey, humanoids, undead, etc.). Advantage on Survival checks to track and INT checks to recall info about them. Learn one of their languages', 'Natural Explorer — Choose a terrain (forest, mountain, swamp, etc.). Double proficiency on INT/WIS checks in that terrain, difficult terrain doesn\'t slow your group, always alert to danger'], equipment: ['(a) scale mail or (b) leather armor', '(a) two shortswords or (b) two simple melee weapons', "(a) a dungeoneer's pack or (b) an explorer's pack", 'A longbow and a quiver of 20 arrows'] },
  Rogue: { desc: 'A cunning scoundrel who relies on stealth, trickery, and precision strikes. Excels at skills, scouting, and dealing massive single-hit damage.', hitDice: 'd8', hpBase: 8, primaryAbility: 'dexterity', armorProf: 'Light armor', weaponProf: "Simple weapons, hand crossbows, longswords, rapiers, shortswords, thieves' tools", savingThrows: ['dexterity', 'intelligence'], skillChoices: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth'], numSkills: 4, subclasses: ['Thief', 'Assassin', 'Arcane Trickster'], subclassLevel: 3, subclassDescs: { 'Thief': 'Fast hands, second-story work, and supreme stealth. Use items as a bonus action.', 'Assassin': 'Disguise expert and ambush specialist. Auto-crits on surprised enemies.', 'Arcane Trickster': 'Combines rogue skills with wizard illusion and enchantment magic. Invisible Mage Hand.' }, spellcasting: false, features: ['Expertise — Choose 2 skill proficiencies: your proficiency bonus is doubled for those skills', 'Sneak Attack (1d6) — Once per turn, deal extra 1d6 damage when you have advantage or an ally is within 5 ft of the target. Must use a finesse or ranged weapon', "Thieves' Cant — A secret mix of dialect, jargon, and code that lets you hide messages in normal conversation. Only other rogues understand it"], equipment: ['(a) a rapier or (b) a shortsword', '(a) a shortbow and 20 arrows or (b) a shortsword', "(a) a burglar's pack, (b) dungeoneer's pack, or (c) explorer's pack", "Leather armor, two daggers, and thieves' tools"] },
  Sorcerer: { desc: 'A spellcaster born with innate magical power. Fewer spells known than a wizard, but can twist and enhance them with metamagic.', hitDice: 'd6', hpBase: 6, primaryAbility: 'charisma', armorProf: 'None', weaponProf: 'Daggers, darts, slings, quarterstaffs, light crossbows', savingThrows: ['constitution', 'charisma'], skillChoices: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'], numSkills: 2, subclasses: ['Draconic Bloodline', 'Wild Magic'], subclassLevel: 1, subclassDescs: { 'Draconic Bloodline': 'Dragon ancestry grants extra HP, natural armor (AC 13+DEX), and elemental affinity at higher levels.', 'Wild Magic': 'Unpredictable surges of random magic. Chaotic but potentially very powerful effects on every spell.' }, spellcasting: true, spellcastingAbility: 'charisma', features: ['Spellcasting (CHA) — 4 cantrips known, 2 first-level spell slots, 2 spells known', 'Sorcerous Origin — Choose your innate magic source at level 1. Draconic Bloodline: +1 HP/level, AC 13 + DEX unarmored. Wild Magic: spells can trigger random magical surges'], equipment: ['(a) a light crossbow and 20 bolts or (b) any simple weapon', '(a) a component pouch or (b) an arcane focus', "(a) a dungeoneer's pack or (b) an explorer's pack", 'Two daggers'] },
  Warlock: { desc: 'A spellcaster who made a pact with a powerful being for magical power. Few spell slots but they recover on short rests, plus unique invocations.', hitDice: 'd8', hpBase: 8, primaryAbility: 'charisma', armorProf: 'Light armor', weaponProf: 'Simple weapons', savingThrows: ['wisdom', 'charisma'], skillChoices: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'], numSkills: 2, subclasses: ['The Archfey', 'The Fiend', 'The Great Old One'], subclassLevel: 1, subclassDescs: { 'The Archfey': 'Pact with a fey lord. Charm and frighten enemies, misty escape, and beguiling defenses.', 'The Fiend': 'Pact with a demon or devil. Gain temp HP on kills, luck manipulation, and fire resistance.', 'The Great Old One': 'Pact with an eldritch being. Telepathy, thought shield, and mind-bending abilities.' }, spellcasting: true, spellcastingAbility: 'charisma', features: ['Otherworldly Patron — Choose your patron at level 1. The Archfey: Fey Presence (charm/frighten nearby). The Fiend: Dark One\'s Blessing (temp HP on kills). The Great Old One: Awakened Mind (telepathy 30 ft)', 'Pact Magic (CHA) — 2 cantrips known, 1 first-level spell slot (recovers on short rest), 2 spells known'], equipment: ['(a) a light crossbow and 20 bolts or (b) any simple weapon', '(a) a component pouch or (b) an arcane focus', "(a) a scholar's pack or (b) a dungeoneer's pack", 'Leather armor, any simple weapon, and two daggers'] },
  Wizard: { desc: 'A scholarly mage who learns spells from a spellbook. The largest spell list in the game — versatile, powerful, but fragile.', hitDice: 'd6', hpBase: 6, primaryAbility: 'intelligence', armorProf: 'None', weaponProf: 'Daggers, darts, slings, quarterstaffs, light crossbows', savingThrows: ['intelligence', 'wisdom'], skillChoices: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion'], numSkills: 2, subclasses: ['School of Abjuration', 'School of Conjuration', 'School of Divination', 'School of Enchantment', 'School of Evocation', 'School of Illusion', 'School of Necromancy', 'School of Transmutation'], subclassLevel: 2, subclassDescs: { 'School of Abjuration': 'Protective magic. Arcane Ward absorbs damage, and your abjuration spells are cheaper to copy.', 'School of Conjuration': 'Summon creatures and objects, and teleport. Minor Conjuration creates small objects at will.', 'School of Divination': 'See the future. Portent lets you replace any roll with pre-rolled dice. Extremely powerful.', 'School of Enchantment': 'Mind control and charm magic. Hypnotic Gaze and split enchantment targets.', 'School of Evocation': 'Damage spells. Sculpt Spells around allies so fireballs never hurt your friends.', 'School of Illusion': 'Master of illusions. Make illusions real, and your illusion spells are cheaper to copy.', 'School of Necromancy': 'Raise undead minions, drain life to heal yourself. Undead thralls are stronger.', 'School of Transmutation': 'Transform matter. Transmuter\'s Stone grants buffs, and your transmutation spells are cheaper.' }, spellcasting: true, spellcastingAbility: 'intelligence', features: ['Spellcasting (INT) — 3 cantrips known, 2 first-level spell slots. Your spellbook starts with 6 first-level spells; prepare INT mod + 1 each day', 'Arcane Recovery — Once per day during a short rest, recover spell slots totaling up to half your wizard level (rounded up)'], equipment: ['(a) a quarterstaff or (b) a dagger', '(a) a component pouch or (b) an arcane focus', "(a) a scholar's pack or (b) an explorer's pack", 'A spellbook'] },
  Artificer: { desc: 'A magical inventor who infuses items with arcane power. Combines spellcasting with crafting to create magical tools, weapons, and armor.', hitDice: 'd8', hpBase: 8, primaryAbility: 'intelligence', armorProf: 'Light armor, medium armor, shields', weaponProf: 'Simple weapons', toolProf: "Thieves' tools, tinker's tools, one type of artisan's tools", savingThrows: ['constitution', 'intelligence'], skillChoices: ['Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Sleight of Hand'], numSkills: 2, subclasses: ['Alchemist', 'Armorer', 'Artillerist', 'Battle Smith'], subclassLevel: 3, subclassDescs: { 'Alchemist': 'Brew magical elixirs that grant random buffs. Healing and support focused.', 'Armorer': 'Infuse armor with magical power. Guardian mode for tanking, Infiltrator for stealth.', 'Artillerist': 'Create magical cannons (force ballista, flamethrower, or protector). Blasting focused.', 'Battle Smith': 'Fight with a Steel Defender companion. Use INT for weapon attacks instead of STR/DEX.' }, spellcasting: true, spellcastingAbility: 'intelligence', features: ['Magical Tinkering — Imbue a tiny nonmagical object with a magical property: emit light, play a sound, emit an odor, or display a short message. INT mod objects at a time', 'Spellcasting (INT) — 2 cantrips known, 2 first-level spell slots. Prepare INT mod + 1 spells each day. Requires tools as a spellcasting focus'], equipment: ['Two any simple weapons', "(a) a light crossbow and 20 bolts or (b) any simple weapon", "(a) a dungeoneer's pack or (b) an explorer's pack", 'Leather armor, any simple weapon, thieves\' tools'] },
};

// ─── Spell Slot Progression (PHB) ─────────────────────
// Full casters: Bard, Cleric, Druid, Sorcerer, Wizard
// Half casters: Paladin, Ranger (start at level 2)
// Warlock uses Pact Magic (separate system)
// Artificer: half-caster (rounded up), starts at level 1

// [level] => [1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th, 9th]
const FULL_CASTER_SLOTS = {
  1:  [2,0,0,0,0,0,0,0,0],
  2:  [3,0,0,0,0,0,0,0,0],
  3:  [4,2,0,0,0,0,0,0,0],
  4:  [4,3,0,0,0,0,0,0,0],
  5:  [4,3,2,0,0,0,0,0,0],
  6:  [4,3,3,0,0,0,0,0,0],
  7:  [4,3,3,1,0,0,0,0,0],
  8:  [4,3,3,2,0,0,0,0,0],
  9:  [4,3,3,3,1,0,0,0,0],
  10: [4,3,3,3,2,0,0,0,0],
  11: [4,3,3,3,2,1,0,0,0],
  12: [4,3,3,3,2,1,0,0,0],
  13: [4,3,3,3,2,1,1,0,0],
  14: [4,3,3,3,2,1,1,0,0],
  15: [4,3,3,3,2,1,1,1,0],
  16: [4,3,3,3,2,1,1,1,0],
  17: [4,3,3,3,2,1,1,1,1],
  18: [4,3,3,3,3,1,1,1,1],
  19: [4,3,3,3,3,2,1,1,1],
  20: [4,3,3,3,3,2,2,1,1],
};

const HALF_CASTER_SLOTS = {
  1:  [0,0,0,0,0], 2:  [2,0,0,0,0], 3:  [3,0,0,0,0], 4:  [3,0,0,0,0],
  5:  [4,2,0,0,0], 6:  [4,2,0,0,0], 7:  [4,3,0,0,0], 8:  [4,3,0,0,0],
  9:  [4,3,2,0,0], 10: [4,3,2,0,0], 11: [4,3,3,0,0], 12: [4,3,3,0,0],
  13: [4,3,3,1,0], 14: [4,3,3,1,0], 15: [4,3,3,2,0], 16: [4,3,3,2,0],
  17: [4,3,3,3,1], 18: [4,3,3,3,1], 19: [4,3,3,3,2], 20: [4,3,3,3,2],
};

// Warlock Pact Magic: all slots are same level, recover on short rest
const WARLOCK_PACT_SLOTS = {
  1:  { slots: 1, level: 1 }, 2:  { slots: 2, level: 1 },
  3:  { slots: 2, level: 2 }, 4:  { slots: 2, level: 2 },
  5:  { slots: 2, level: 3 }, 6:  { slots: 2, level: 3 },
  7:  { slots: 2, level: 4 }, 8:  { slots: 2, level: 4 },
  9:  { slots: 2, level: 5 }, 10: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 }, 12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 }, 14: { slots: 3, level: 5 },
  15: { slots: 3, level: 5 }, 16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 }, 18: { slots: 4, level: 5 },
  19: { slots: 4, level: 5 }, 20: { slots: 4, level: 5 },
};

// Artificer: rounded-up half-caster
const ARTIFICER_SLOTS = {
  1:  [2,0,0,0,0], 2:  [2,0,0,0,0], 3:  [3,0,0,0,0], 4:  [3,0,0,0,0],
  5:  [4,2,0,0,0], 6:  [4,2,0,0,0], 7:  [4,3,0,0,0], 8:  [4,3,0,0,0],
  9:  [4,3,2,0,0], 10: [4,3,2,0,0], 11: [4,3,3,0,0], 12: [4,3,3,0,0],
  13: [4,3,3,1,0], 14: [4,3,3,1,0], 15: [4,3,3,2,0], 16: [4,3,3,2,0],
  17: [4,3,3,3,1], 18: [4,3,3,3,1], 19: [4,3,3,3,2], 20: [4,3,3,3,2],
};

/**
 * Get spell slots for a class at a given level.
 * Returns array of 9 numbers [1st..9th] for standard casters,
 * or { pact: true, slots, level } for warlocks.
 */
export function getSpellSlots(className, level) {
  if (!className || !level) return null;
  const cls = className.trim();
  const fullCasters = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'];
  const halfCasters = ['Paladin', 'Ranger'];
  if (fullCasters.includes(cls)) return FULL_CASTER_SLOTS[level] || null;
  if (halfCasters.includes(cls)) return HALF_CASTER_SLOTS[level] || null;
  if (cls === 'Warlock') return { pact: true, ...(WARLOCK_PACT_SLOTS[level] || { slots: 0, level: 0 }) };
  if (cls === 'Artificer') return ARTIFICER_SLOTS[level] || null;
  // Eldritch Knight (Fighter) and Arcane Trickster (Rogue) — 1/3 casters
  return null;
}

// ─── Multiclass Spellcasting ──────────────────────────
// Combined caster level: full casters add their full level, half casters add
// level÷2 (down), Artificer adds level÷2 (up), third-casters (Eldritch Knight /
// Arcane Trickster) add level÷3 (down). Warlock's Pact Magic is NOT combined.
const FULL_CASTERS = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'];
const HALF_CASTERS = ['Paladin', 'Ranger'];
const isThirdCaster = (c) => (c.class === 'Fighter' && c.subclass === 'Eldritch Knight')
  || (c.class === 'Rogue' && c.subclass === 'Arcane Trickster');
const isStandardCaster = (c) => FULL_CASTERS.includes(c.class) || HALF_CASTERS.includes(c.class)
  || c.class === 'Artificer' || isThirdCaster(c);

export function getMulticlassCasterLevel(classes) {
  let cl = 0;
  for (const c of classes || []) {
    const lvl = c.level || 0;
    if (FULL_CASTERS.includes(c.class)) cl += lvl;
    else if (HALF_CASTERS.includes(c.class)) cl += Math.floor(lvl / 2);
    else if (c.class === 'Artificer') cl += Math.ceil(lvl / 2);
    else if (isThirdCaster(c)) cl += Math.floor(lvl / 3);
  }
  return cl;
}

/**
 * Spell slots for a (possibly multiclass) set of classes.
 * Returns { standard: number[]|null, pact: {pact,slots,level}|null }.
 * - Exactly one standard caster → that class's own table (RAW single-class rule).
 * - Two or more standard casters → combined-caster-level multiclass table.
 * - Warlock Pact Magic is always reported separately in `pact`.
 */
export function getMulticlassSpellSlots(classes) {
  const list = classes || [];
  const standardCasters = list.filter(isStandardCaster);
  const warlock = list.find(c => c.class === 'Warlock');

  let standard = null;
  if (standardCasters.length === 1) {
    // Single standard caster uses its own class progression table.
    const c = standardCasters[0];
    standard = getSpellSlots(c.class, c.level);
    // Third-caster single-class returns null (unsupported alone) — leave as null.
  } else if (standardCasters.length > 1) {
    const casterLevel = getMulticlassCasterLevel(standardCasters);
    if (casterLevel > 0) standard = FULL_CASTER_SLOTS[Math.min(casterLevel, 20)] || null;
  }

  let pact = null;
  if (warlock) {
    const p = WARLOCK_PACT_SLOTS[Math.min(warlock.level, 20)];
    if (p) pact = { pact: true, ...p };
  }
  return { standard, pact };
}

// ─── Extra Attack by Class/Level ──────────────────────
export function getExtraAttacks(className, level) {
  if (!className || !level) return 0;
  const cls = className.trim();
  if (cls === 'Fighter') {
    if (level >= 20) return 3;
    if (level >= 11) return 2;
    if (level >= 5) return 1;
  }
  if (['Barbarian', 'Monk', 'Paladin', 'Ranger'].includes(cls) && level >= 5) return 1;
  return 0;
}

// ─── Racial Resistances / Immunities ──────────────────
export const RACE_DEFENSES = {
  Dwarf:     { resistances: ['Poison'], immunities: [], vulnerabilities: [] },
  'Hill Dwarf':     { resistances: ['Poison'], immunities: [], vulnerabilities: [] },
  'Mountain Dwarf': { resistances: ['Poison'], immunities: [], vulnerabilities: [] },
  Elf:       { resistances: [], immunities: ['Magical Sleep'], vulnerabilities: [] },
  'High Elf': { resistances: [], immunities: ['Magical Sleep'], vulnerabilities: [] },
  'Wood Elf': { resistances: [], immunities: ['Magical Sleep'], vulnerabilities: [] },
  'Dark Elf (Drow)': { resistances: [], immunities: ['Magical Sleep'], vulnerabilities: [] },
  Tiefling:  { resistances: ['Fire'], immunities: [], vulnerabilities: [] },
  Dragonborn: { resistances: [], immunities: [], vulnerabilities: [] }, // resistance depends on ancestry
  'Gold Dragonborn': { resistances: ['Fire'], immunities: [], vulnerabilities: [] },
  'Red Dragonborn': { resistances: ['Fire'], immunities: [], vulnerabilities: [] },
  'Blue Dragonborn': { resistances: ['Lightning'], immunities: [], vulnerabilities: [] },
  'Bronze Dragonborn': { resistances: ['Lightning'], immunities: [], vulnerabilities: [] },
  'Green Dragonborn': { resistances: ['Poison'], immunities: [], vulnerabilities: [] },
  'Black Dragonborn': { resistances: ['Acid'], immunities: [], vulnerabilities: [] },
  'Copper Dragonborn': { resistances: ['Acid'], immunities: [], vulnerabilities: [] },
  'White Dragonborn': { resistances: ['Cold'], immunities: [], vulnerabilities: [] },
  'Silver Dragonborn': { resistances: ['Cold'], immunities: [], vulnerabilities: [] },
  'Brass Dragonborn': { resistances: ['Fire'], immunities: [], vulnerabilities: [] },
  'Half-Elf': { resistances: [], immunities: ['Magical Sleep'], vulnerabilities: [] },
  Halfling:  { resistances: [], immunities: [], vulnerabilities: [] },
  'Lightfoot Halfling': { resistances: [], immunities: [], vulnerabilities: [] },
  'Stout Halfling': { resistances: ['Poison'], immunities: [], vulnerabilities: [] },
  Gnome:     { resistances: [], immunities: [], vulnerabilities: [] },
  'Rock Gnome': { resistances: [], immunities: [], vulnerabilities: [] },
  'Forest Gnome': { resistances: [], immunities: [], vulnerabilities: [] },
  'Human':   { resistances: [], immunities: [], vulnerabilities: [] },
  'Human (Variant)': { resistances: [], immunities: [], vulnerabilities: [] },
  'Half-Orc': { resistances: [], immunities: [], vulnerabilities: [] },
};

// Class-granted defenses (e.g., Bear Totem Barbarian gets resistance to all damage except psychic while raging)
export function getClassDefenses(className, level, subclass) {
  const defenses = { resistances: [], immunities: [], vulnerabilities: [] };
  if (className === 'Barbarian') {
    // Rage grants resistance to bludgeoning/piercing/slashing (while raging — always show)
    defenses.resistances.push('Bludgeoning (while raging)', 'Piercing (while raging)', 'Slashing (while raging)');
    if (subclass === 'Path of the Bear Totem' && level >= 3) {
      defenses.resistances = ['All except Psychic (while raging)'];
    }
  }
  return defenses;
}

export const SAVING_THROWS_BY_CLASS = {
  Barbarian: ['strength', 'constitution'], Bard: ['dexterity', 'charisma'],
  Cleric: ['wisdom', 'charisma'], Druid: ['intelligence', 'wisdom'],
  Fighter: ['strength', 'constitution'], Monk: ['strength', 'dexterity'],
  Paladin: ['wisdom', 'charisma'], Ranger: ['strength', 'dexterity'],
  Rogue: ['dexterity', 'intelligence'], Sorcerer: ['constitution', 'charisma'],
  Warlock: ['wisdom', 'charisma'], Wizard: ['intelligence', 'wisdom'],
  Artificer: ['constitution', 'intelligence'],
};
