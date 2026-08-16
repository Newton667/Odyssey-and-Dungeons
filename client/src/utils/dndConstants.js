// ─── Shared D&D Constants ────────────────────────────────────────────

export const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
export const ABBR = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
export const ALIGNMENTS = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'];

export const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const ALL_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception',
  'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine',
  'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion',
  'Sleight of Hand', 'Stealth', 'Survival',
];

export const SKILLS_WITH_ABILITY = [
  { name: 'Acrobatics', ability: 'dexterity' }, { name: 'Animal Handling', ability: 'wisdom' },
  { name: 'Arcana', ability: 'intelligence' }, { name: 'Athletics', ability: 'strength' },
  { name: 'Deception', ability: 'charisma' }, { name: 'History', ability: 'intelligence' },
  { name: 'Insight', ability: 'wisdom' }, { name: 'Intimidation', ability: 'charisma' },
  { name: 'Investigation', ability: 'intelligence' }, { name: 'Medicine', ability: 'wisdom' },
  { name: 'Nature', ability: 'intelligence' }, { name: 'Perception', ability: 'wisdom' },
  { name: 'Performance', ability: 'charisma' }, { name: 'Persuasion', ability: 'charisma' },
  { name: 'Religion', ability: 'intelligence' }, { name: 'Sleight of Hand', ability: 'dexterity' },
  { name: 'Stealth', ability: 'dexterity' }, { name: 'Survival', ability: 'wisdom' },
];

export const HIT_DICE = { Barbarian: 'd12', Fighter: 'd10', Paladin: 'd10', Ranger: 'd10', Monk: 'd8', Bard: 'd8', Cleric: 'd8', Druid: 'd8', Rogue: 'd8', Warlock: 'd8', Wizard: 'd6', Sorcerer: 'd6', Artificer: 'd8' };

export const RARITY_COLORS = { common: 'var(--text-dim)', uncommon: '#1eff00', rare: '#0070ff', 'very-rare': '#a335ee', legendary: '#ff8000', artifact: '#e6cc80' };
export const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, 'very-rare': 3, legendary: 4, artifact: 5 };

export const TOOL_OPTIONS = [
  "Alchemist's supplies", "Brewer's supplies", "Calligrapher's supplies", "Carpenter's tools",
  "Cartographer's tools", "Cobbler's tools", "Cook's utensils", "Glassblower's tools",
  "Jeweler's tools", "Leatherworker's tools", "Mason's tools", "Painter's supplies",
  "Potter's tools", "Smith's tools", "Tinker's tools", "Weaver's tools", "Woodcarver's tools",
  "Disguise kit", "Forgery kit", "Herbalism kit", "Navigator's tools", "Poisoner's kit",
  "Thieves' tools", "Bagpipes", "Drum", "Dulcimer", "Flute", "Lute", "Lyre", "Horn",
  "Pan flute", "Shawm", "Viol", "Dice set", "Dragonchess set", "Playing card set",
  "Three-Dragon Ante set", "Vehicles (land)", "Vehicles (water)",
];

export const FEATS = {
  'Alert': { prereq: null, desc: 'Initiative bonus (2014: +5; 2024: +proficiency bonus). 2014 also: can\'t be surprised while conscious, hidden creatures don\'t gain advantage on you. 2024 also: swap initiative with a willing ally.' },
  'Athlete': { prereq: null, desc: '+1 STR or DEX. Standing from prone costs 5ft. Climbing doesn\'t halve speed. Running long/high jumps need only 5ft move.' },
  'Actor': { prereq: null, desc: '+1 CHA. Advantage on Deception and Performance checks when pretending to be someone else. Mimic speech/sounds.' },
  'Charger': { prereq: null, desc: 'When you Dash, you can make one melee attack or shove as a bonus action with +5 damage.' },
  'Crossbow Expert': { prereq: null, desc: 'Ignore loading for crossbows. No disadvantage on ranged attacks within 5ft. Bonus action hand crossbow attack.' },
  'Defensive Duelist': { prereq: 'DEX 13+', desc: 'When wielding a finesse weapon, use reaction to add proficiency bonus to AC against one melee attack.' },
  'Dual Wielder': { prereq: null, desc: '+1 AC when dual wielding. Two-weapon fight with non-light weapons. Draw/stow two weapons at once.' },
  'Dungeon Delver': { prereq: null, desc: 'Advantage to detect secret doors. Advantage on saves vs traps. Resistance to trap damage. Search for traps at normal pace.' },
  'Durable': { prereq: null, desc: '+1 CON. When you roll Hit Dice to regain HP, minimum roll equals twice your CON modifier.' },
  'Elemental Adept': { prereq: 'Spellcasting', desc: 'Choose a damage type (acid/cold/fire/lightning/thunder). Spells ignore resistance. Treat 1s on damage dice as 2s.' },
  'Grappler': { prereq: 'STR 13+', desc: 'Advantage on attacks against creatures you\'re grappling. You can pin a grappled creature, restraining both of you.' },
  'Great Weapon Master': { prereq: null, desc: 'On crit or killing blow, bonus action melee attack. Take -5 to hit for +10 damage with heavy weapons.' },
  'Healer': { prereq: null, desc: 'Stabilize with healer\'s kit and restore 1 HP. Spend one use of kit to heal 1d6+4+creature\'s max HD.' },
  'Heavily Armored': { prereq: 'Medium armor prof', desc: '+1 STR. Gain proficiency with heavy armor.' },
  'Heavy Armor Master': { prereq: 'Heavy armor prof', desc: '+1 STR. While wearing heavy armor, reduce nonmagical bludgeoning/piercing/slashing damage by 3.' },
  'Inspiring Leader': { prereq: 'CHA 13+', desc: 'After 10 min speech, up to 6 creatures gain temporary HP equal to your level + CHA modifier.' },
  'Keen Mind': { prereq: null, desc: '+1 INT. Always know which way is north, hours until sunrise/sunset, and recall anything seen/heard within past month.' },
  'Lightly Armored': { prereq: null, desc: '+1 STR or DEX. Gain proficiency with light armor.' },
  'Linguist': { prereq: null, desc: '+1 INT. Learn 3 languages. Create written ciphers that require INT check (DC = INT score + prof) to decode.' },
  'Lucky': { prereq: null, desc: '3 luck points per long rest. Spend one to roll extra d20 on attacks, saves, or ability checks, or force attacker reroll.' },
  'Mage Slayer': { prereq: null, desc: 'Reaction melee attack when adjacent creature casts spell. Advantage on saves vs spells from adjacent casters. Impose disadvantage on concentration.' },
  'Magic Initiate': { prereq: null, desc: 'Learn 2 cantrips and 1 first-level spell from one class\'s spell list. Cast the spell once per long rest.' },
  'Martial Adept': { prereq: null, desc: 'Learn 2 Battle Master maneuvers. Gain 1 superiority die (d6) that is regained on short/long rest.' },
  'Medium Armor Master': { prereq: 'Medium armor prof', desc: 'Medium armor doesn\'t impose disadvantage on Stealth. Add up to +3 DEX modifier (instead of +2) in medium armor.' },
  'Mobile': { prereq: null, desc: '+10ft speed. When you Dash, difficult terrain doesn\'t cost extra movement. No opportunity attacks from creatures you\'ve attacked.' },
  'Moderately Armored': { prereq: 'Light armor prof', desc: '+1 STR or DEX. Gain proficiency with medium armor and shields.' },
  'Mounted Combatant': { prereq: null, desc: 'Advantage on melee attacks vs unmounted creatures smaller than mount. Force attacks targeting mount to target you instead. Evasion for mount.' },
  'Observant': { prereq: null, desc: '+1 INT or WIS. Read lips. +5 to passive Perception and passive Investigation.' },
  'Polearm Master': { prereq: null, desc: 'Bonus action attack (1d4) with butt end of glaive/halberd/quarterstaff. Opportunity attack when creatures enter your reach.' },
  'Resilient': { prereq: null, desc: '+1 to chosen ability score. Gain proficiency in saving throws for that ability.' },
  'Ritual Caster': { prereq: 'INT or WIS 13+', desc: 'Learn 2 first-level ritual spells. Can cast any ritual spell in your ritual book without preparing it.' },
  'Savage Attacker': { prereq: null, desc: 'Once per turn, reroll melee weapon damage dice and use either result.' },
  'Sentinel': { prereq: null, desc: 'Opportunity attacks reduce speed to 0. Creatures within 5ft provoke opportunity attacks even if they Disengage. Reaction attack when ally is attacked.' },
  'Sharpshooter': { prereq: null, desc: 'No disadvantage at long range. Ignore half/three-quarters cover. Take -5 to hit for +10 damage with ranged weapons.' },
  'Shield Master': { prereq: null, desc: 'Bonus action shove with shield. Add shield AC bonus to DEX saves vs single-target effects. Use reaction to take no damage on successful DEX save.' },
  'Skilled': { prereq: null, desc: 'Gain proficiency in any combination of 3 skills or tools.' },
  'Skulker': { prereq: 'DEX 13+', desc: 'Can hide when lightly obscured. Missing ranged attack doesn\'t reveal position. No disadvantage on Perception in dim light.' },
  'Spell Sniper': { prereq: 'Spellcasting', desc: 'Double range of attack spells. Ignore half/three-quarters cover for spell attacks. Learn one attack cantrip.' },
  'Tavern Brawler': { prereq: null, desc: '+1 STR or CON. Proficient with improvised weapons. Unarmed strike deals 1d4. Bonus action grapple after unarmed/improvised hit.' },
  'Tough': { prereq: null, desc: 'Max HP increases by 2 per level (including retroactive).' },
  'War Caster': { prereq: 'Spellcasting', desc: 'Advantage on concentration saves. Somatic components with hands full. Cast spell as opportunity attack instead of melee.' },
  'Weapon Master': { prereq: null, desc: '+1 STR or DEX. Gain proficiency with 4 weapons of your choice.' },
};

// Feats that grant player-chosen skill/tool proficiencies. `count` = number of picks.
// Each pick may be any skill OR any tool ("skillsOrTools"). Wired up in the creator/editor
// feat pickers; chosen skills merge into skillProficiencies, chosen tools into toolProficiencies.
export const FEAT_PROFICIENCY_GRANTS = {
  Skilled: { count: 3, type: 'skillsOrTools' },
};

// Feats that grant a +1 ability score increase (the "half-feats"). Applied to abilityScores at
// creation so they flow into every derived stat (HP, AC, save DCs, checks). `fixed` = always that
// ability; `choice` = player picks one of the listed abilities (creator shows a picker, defaulting
// to the first). `save: true` (Resilient) also grants saving-throw proficiency in the chosen ability.
export const FEAT_ABILITY_BONUSES = {
  Actor: { fixed: 'charisma' },
  Athlete: { choice: ['strength', 'dexterity'] },
  Durable: { fixed: 'constitution' },
  'Heavily Armored': { fixed: 'strength' },
  'Heavy Armor Master': { fixed: 'strength' },
  'Keen Mind': { fixed: 'intelligence' },
  'Lightly Armored': { choice: ['strength', 'dexterity'] },
  Linguist: { fixed: 'intelligence' },
  'Moderately Armored': { choice: ['strength', 'dexterity'] },
  Observant: { choice: ['intelligence', 'wisdom'] },
  Resilient: { choice: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'], save: true },
  'Tavern Brawler': { choice: ['strength', 'constitution'] },
  'Weapon Master': { choice: ['strength', 'dexterity'] },
};

// Spell lists Magic Initiate may draw from, by ruleset. 2014 (PHB p.168) offers
// six lists; the 2024 Origin feat is limited to Cleric/Druid/Wizard. Routed through
// char.ruleset / form.ruleset / the creator's ruleset — never hardcode one edition.
// The chosen list is persisted as char.featSpellLists = { 'Magic Initiate': ['Cleric'] }
// (array-valued, so the repeatable 2024 feat needs no data migration later).
export const MAGIC_INITIATE_CLASSES = {
  '2014': ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'],
  '2024': ['Cleric', 'Druid', 'Wizard'],
};

// Feats that add flat max-HP. Tough: +2 per character level, applied at creation and on level-up.
export const FEAT_HP_PER_LEVEL = {
  Tough: 2,
};

// Unconditional, always-on ADDITIVE numeric bonuses that feats apply to DERIVED character-sheet
// stats (initiative, passive scores). Summed by CharacterSheet's `featEffects` memo.
// - Ability-score increases from feats (+1 STR, etc.) are applied to abilityScores at creation,
//   so they are intentionally NOT repeated here.
// - Stored/editable stats (speed, max HP — Mobile, Tough) are excluded to avoid double-counting.
// - Context-conditional feats are handled inline in CharacterSheet, not here:
//   Medium Armor Master (medium-armor DEX cap 2→3 in calcAC), Tavern Brawler (unarmed die 1d4).
// - Alert's value here is the 2014 flat +5; under the 2024 ruleset CharacterSheet swaps it for
//   +proficiency bonus (the 2024 Alert change), so this stays the 2014 baseline.
export const FEAT_EFFECTS = {
  Alert: { initiative: 5 },
  Observant: { passivePerception: 5, passiveInvestigation: 5 },
};

export const ALL_LANGUAGES = [
  'Abyssal', 'Aarakocra', 'Aquan', 'Auran', 'Celestial', 'Deep Speech', 'Draconic',
  'Dwarvish', 'Elvish', 'Giant', 'Gith', 'Gnomish', 'Goblin', 'Halfling', 'Ignan',
  'Infernal', 'Orc', 'Primordial', 'Quori', 'Sylvan', 'Terran', 'Undercommon',
];

export const BACKGROUNDS = {
  Acolyte: { desc: 'You spent your life in service to a temple. Shelter of the Faithful means temples will support you.', skills: ['Insight', 'Religion'], tools: [], languages: 2, feature: 'Shelter of the Faithful', equipment: 'A holy symbol, prayer book, 5 incense sticks, vestments, common clothes, 15 gp' },
  Charlatan: { desc: 'You\'ve always had a way with people and a knack for deception. You have a complete second identity including documents.', skills: ['Deception', 'Sleight of Hand'], tools: ['Disguise kit', 'Forgery kit'], languages: 0, feature: 'False Identity', equipment: 'Fine clothes, disguise kit, con tools, 15 gp' },
  Criminal: { desc: 'You have a reliable criminal contact who can get you information and pass messages through the underworld.', skills: ['Deception', 'Stealth'], tools: ['Gaming set', "Thieves' tools"], languages: 0, feature: 'Criminal Contact', equipment: 'Crowbar, dark hooded clothes, 15 gp' },
  Entertainer: { desc: 'You thrive in front of an audience. You can always find a place to perform and receive free lodging in return.', skills: ['Acrobatics', 'Performance'], tools: ['Disguise kit', 'Musical instrument'], languages: 0, feature: 'By Popular Demand', equipment: 'Musical instrument, admirer favor, costume, 15 gp' },
  'Folk Hero': { desc: 'You stood up against a tyrant or monster and the common folk see you as a hero. Commoners will shelter and aid you.', skills: ['Animal Handling', 'Survival'], tools: ["Artisan's tools", 'Vehicles (land)'], languages: 0, feature: 'Rustic Hospitality', equipment: "Artisan's tools, shovel, iron pot, common clothes, 10 gp" },
  'Guild Artisan': { desc: 'A member of a craftsman\'s guild. Your guild provides lodging, legal support, and political connections.', skills: ['Insight', 'Persuasion'], tools: ["Artisan's tools"], languages: 1, feature: 'Guild Membership', equipment: "Artisan's tools, guild introduction letter, traveler's clothes, 15 gp" },
  Hermit: { desc: 'You lived in seclusion for years and made a unique discovery. Knowledge and insight from your time alone.', skills: ['Medicine', 'Religion'], tools: ['Herbalism kit'], languages: 1, feature: 'Discovery', equipment: 'Scroll case with notes, winter blanket, common clothes, herbalism kit, 5 gp' },
  Noble: { desc: 'Born to privilege and title. Welcome in high society, commoners try to accommodate you, and you have noble connections.', skills: ['History', 'Persuasion'], tools: ['Gaming set'], languages: 1, feature: 'Position of Privilege', equipment: 'Fine clothes, signet ring, scroll of pedigree, 25 gp' },
  Outlander: { desc: 'You grew up in the wilds. You have excellent memory for maps and geography and can always find food and water.', skills: ['Athletics', 'Survival'], tools: ['Musical instrument'], languages: 1, feature: 'Wanderer', equipment: "Staff, hunting trap, animal trophy, traveler's clothes, 10 gp" },
  Sage: { desc: 'A lifelong scholar. When you don\'t know information, you know exactly where and from whom to obtain it.', skills: ['Arcana', 'History'], tools: [], languages: 2, feature: 'Researcher', equipment: 'Black ink, quill, small knife, letter from dead colleague, common clothes, 10 gp' },
  Sailor: { desc: 'You sailed on a ship for years. You can secure free passage on sailing ships for you and your party.', skills: ['Athletics', 'Perception'], tools: ["Navigator's tools", 'Vehicles (water)'], languages: 0, feature: "Ship's Passage", equipment: 'Belaying pin, 50ft silk rope, lucky charm, common clothes, 10 gp' },
  Soldier: { desc: 'You served in a military force. Your rank is recognized by other soldiers, and you can invoke your authority.', skills: ['Athletics', 'Intimidation'], tools: ['Gaming set', 'Vehicles (land)'], languages: 0, feature: 'Military Rank', equipment: 'Insignia of rank, enemy trophy, gaming set, common clothes, 10 gp' },
  Urchin: { desc: 'You grew up on the streets. You know the secret passages and shortcuts of cities and can travel through them twice as fast.', skills: ['Sleight of Hand', 'Stealth'], tools: ['Disguise kit', "Thieves' tools"], languages: 0, feature: 'City Secrets', equipment: 'Small knife, city map, pet mouse, parent token, common clothes, 10 gp' },
};

export const CANTRIPS_KNOWN = {
  Bard:      [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  Cleric:    [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
  Druid:     [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  Sorcerer:  [4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6],
  Warlock:   [2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4],
  Wizard:    [3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5],
  Artificer: [2,2,2,2,2,2,2,2,2,3,3,3,3,4,4,4,4,4,4,4],
};

export const SPELLS_KNOWN = {
  Bard:     [4,5,6,7,8,9,10,11,12,14,15,15,16,16,17,17,18,18,19,22],
  Sorcerer: [2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15],
  Warlock:  [2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15],
  Ranger:   [0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11],
};

// Spells that add an extra damage die to your WEAPON attacks while active
// (persistent buffs, usually requiring concentration). The Spells tab shows an
// Activate toggle for these; while active, the die is added to weapon damage
// rolls on the Actions tab. Damage type is informational.
export const SPELL_WEAPON_RIDERS = {
  "Hunter's Mark": { die: '1d6', type: "weapon's type" },
  'Hex': { die: '1d6', type: 'necrotic' },
  'Divine Favor': { die: '1d4', type: 'radiant' },
  'Elemental Weapon': { die: '1d4', type: 'elemental' },
};

export const MULTICLASS_REQS = {
  Barbarian: { strength: 13 },
  Bard: { charisma: 13 },
  Cleric: { wisdom: 13 },
  Druid: { wisdom: 13 },
  Fighter: { strength: 13, _or: { dexterity: 13 } },
  Monk: { dexterity: 13, wisdom: 13 },
  Paladin: { strength: 13, charisma: 13 },
  Ranger: { dexterity: 13, wisdom: 13 },
  Rogue: { dexterity: 13 },
  Sorcerer: { charisma: 13 },
  Warlock: { charisma: 13 },
  Wizard: { intelligence: 13 },
  Artificer: { intelligence: 13 },
};

// Reduced proficiencies gained when a class is taken as a MULTICLASS (PHB ch.6),
// distinct from the fuller set granted at 1st level. `skills` = number of skill
// choices, `tools` = tool proficiencies granted. armor/weapons are recorded as a
// visible note (the app doesn't track armor/weapon proficiency as data).
export const MULTICLASS_PROFICIENCIES = {
  Barbarian: { armor: ['Shields'], weapons: ['Simple weapons', 'Martial weapons'] },
  Bard: { armor: ['Light armor'], skills: 1, tools: ['One musical instrument'] },
  Cleric: { armor: ['Light armor', 'Medium armor', 'Shields'] },
  Druid: { armor: ['Light armor', 'Medium armor', 'Shields (non-metal)'] },
  Fighter: { armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'] },
  Monk: { weapons: ['Simple weapons', 'Shortswords'] },
  Paladin: { armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'] },
  Ranger: { armor: ['Light armor', 'Medium armor', 'Shields'], weapons: ['Simple weapons', 'Martial weapons'], skills: 1 },
  Rogue: { armor: ['Light armor'], skills: 1, tools: ["Thieves' tools"] },
  Sorcerer: {},
  Warlock: { armor: ['Light armor'], weapons: ['Simple weapons'] },
  Wizard: {},
  Artificer: { armor: ['Light armor', 'Medium armor', 'Shields'], tools: ["Thieves' tools", "Tinker's tools"] },
};

export const RACIAL_SPELL_MAP = {
  Dragonborn: (sub) => sub ? `Dragonborn (${sub.split(' (')[0]})` : null,
  Tiefling: () => 'Tiefling',
  Elf: (sub) => sub === 'Dark Elf (Drow)' ? 'Elf (Dark Elf/Drow)' : null,
  Gnome: (sub) => sub === 'Forest Gnome' ? 'Gnome (Forest)' : null,
  Aasimar: (sub) => sub ? [`Aasimar`, `Aasimar (${sub})`] : ['Aasimar'],
  Firbolg: () => 'Firbolg',
  Goblin: () => 'Goblin',
  Bugbear: () => 'Bugbear',
  Lizardfolk: () => 'Lizardfolk',
  Goliath: () => 'Goliath',
  Kobold: () => 'Kobold',
  Shifter: () => 'Shifter',
  Tabaxi: () => 'Tabaxi',
  Triton: () => 'Triton',
  'Yuan-ti Pureblood': () => 'Yuan-ti Pureblood',
  Aarakocra: () => 'Aarakocra',
  Genasi: (sub) => sub ? `Genasi (${sub.replace(' Genasi', '')})` : null,
};

export const RACIAL_SKILL_CHOICES = {
  Kenku:      { count: 2, from: ['Acrobatics', 'Deception', 'Stealth', 'Sleight of Hand'], label: 'Kenku Training' },
  Lizardfolk: { count: 2, from: ['Animal Handling', 'Nature', 'Perception', 'Stealth', 'Survival'], label: "Hunter's Lore" },
  Orc:        { count: 2, from: ['Animal Handling', 'Insight', 'Intimidation', 'Medicine', 'Nature', 'Perception', 'Survival'], label: 'Primal Intuition' },
  Changeling: { count: 2, from: ['Deception', 'Insight', 'Intimidation', 'Performance', 'Persuasion'], label: 'Changeling Instincts' },
  Warforged:  { count: 1, from: null, label: 'Specialized Design (Skill)' },
};

export const RACIAL_TOOL_CHOICES = {
  Warforged: { count: 1, label: 'Specialized Design (Tool)' },
};

export const KOBOLD_LEGACY_OPTIONS = {
  'Craftiness':       'Proficiency in one of: Arcana, Investigation, Medicine, Sleight of Hand, or Survival.',
  'Defiance':         'Advantage on saving throws to avoid or end the frightened condition on yourself.',
  'Draconic Sorcery':  'You know one cantrip from the sorcerer spell list. CHA is your spellcasting ability.',
};

export const FIGHTING_STYLES = {
  Archery:              'You gain a +2 bonus to attack rolls with ranged weapons.',
  Defense:              'While wearing armor, you gain a +1 bonus to AC.',
  Dueling:              'When wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.',
  'Great Weapon Fighting': 'When you roll a 1 or 2 on a damage die for an attack with a two-handed or versatile melee weapon, you can reroll the die.',
  Protection:           'When a creature you can see attacks a target other than you within 5 ft, you can use your reaction to impose disadvantage (requires shield).',
  'Two-Weapon Fighting':  'When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.',
};

export const FIGHTING_STYLE_CLASSES = {
  Fighter: { level: 1, styles: Object.keys(FIGHTING_STYLES) },
  Paladin: { level: 2, styles: ['Defense', 'Dueling', 'Great Weapon Fighting', 'Protection'] },
  Ranger:  { level: 2, styles: ['Archery', 'Defense', 'Dueling', 'Two-Weapon Fighting'] },
};

export const CLASS_RECOMMENDED_GEAR = {
  Barbarian: ['Greataxe', 'Handaxe', 'Handaxe', 'Javelin', 'Javelin', 'Javelin', 'Javelin', "Explorer's Pack"],
  Bard: ['Rapier', 'Lute', 'Leather Armor', 'Dagger', "Diplomat's Pack"],
  Cleric: ['Mace', 'Scale Mail', 'Light Crossbow', 'Shield', 'Holy Symbol', "Priest's Pack"],
  Druid: ['Wooden Shield', 'Scimitar', 'Leather Armor', "Explorer's Pack", 'Druidic Focus'],
  Fighter: ['Chain Mail', 'Longsword', 'Shield', 'Light Crossbow', "Dungeoneer's Pack"],
  Monk: ['Shortsword', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', 'Dart', "Dungeoneer's Pack"],
  Paladin: ['Longsword', 'Shield', 'Javelin', 'Javelin', 'Javelin', 'Javelin', 'Javelin', 'Chain Mail', 'Holy Symbol', "Priest's Pack"],
  Ranger: ['Scale Mail', 'Shortsword', 'Shortsword', 'Longbow', "Dungeoneer's Pack"],
  Rogue: ['Rapier', 'Shortbow', 'Leather Armor', 'Dagger', 'Dagger', "Burglar's Pack", "Thieves' Tools"],
  Sorcerer: ['Light Crossbow', 'Arcane Focus', 'Dagger', 'Dagger', "Dungeoneer's Pack"],
  Warlock: ['Light Crossbow', 'Arcane Focus', 'Leather Armor', 'Dagger', 'Dagger', "Scholar's Pack"],
  Wizard: ['Quarterstaff', 'Arcane Focus', 'Spellbook', "Scholar's Pack"],
  Artificer: ['Leather Armor', 'Light Crossbow', "Thieves' Tools", "Dungeoneer's Pack"],
};

export const ARMORS = {
  'Padded':        { category: 'light',  base: 11, stealthDis: true },
  'Leather':       { category: 'light',  base: 11, stealthDis: false },
  'Studded Leather': { category: 'light', base: 12, stealthDis: false },
  'Hide':          { category: 'medium', base: 12, stealthDis: false },
  'Chain Shirt':   { category: 'medium', base: 13, stealthDis: false },
  'Scale Mail':    { category: 'medium', base: 14, stealthDis: true },
  'Breastplate':   { category: 'medium', base: 14, stealthDis: false },
  'Half Plate':    { category: 'medium', base: 15, stealthDis: true },
  'Ring Mail':     { category: 'heavy',  base: 14, stealthDis: true, strReq: 0 },
  'Chain Mail':    { category: 'heavy',  base: 16, stealthDis: true, strReq: 13 },
  'Splint':        { category: 'heavy',  base: 17, stealthDis: true, strReq: 15 },
  'Plate':         { category: 'heavy',  base: 18, stealthDis: true, strReq: 15 },
};

export const PB_COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

// ─── Weapon Masteries (2024 PHB) ─────────────────────────────────────
// Each weapon has a mastery property; classes with "Weapon Mastery" can use it.
export const WEAPON_MASTERIES = {
  Cleave:  { desc: 'If you hit a creature, you can make an attack roll against a second creature within 5 feet of it, using the same modifier. On a hit, the second creature takes the weapon\'s damage dice (no modifier).' },
  Graze:   { desc: 'If you miss with a melee attack, the target still takes damage equal to your ability modifier (minimum 0) of the weapon\'s damage type.' },
  Nick:    { desc: 'When you make the extra attack of the Light property, you can make it as part of the Attack action instead of a bonus action. You can only make this extra attack once per turn.' },
  Push:    { desc: 'On a hit, you can push the target 10 feet straight away from you if it is Large or smaller.' },
  Sap:     { desc: 'On a hit, the target has disadvantage on its next attack roll before the start of your next turn.' },
  Slow:    { desc: 'On a hit, the target\'s speed is reduced by 10 feet until the start of your next turn. If hit more than once, the speed reduction doesn\'t exceed 10 feet.' },
  Topple:  { desc: 'On a hit, you can force the target to make a Constitution saving throw (DC = 8 + your ability modifier + proficiency bonus). On a failure, it is knocked prone.' },
  Vex:     { desc: 'On a hit, you have advantage on your next attack roll against that creature before the end of your next turn.' },
};

// Map each weapon to its mastery
export const WEAPON_MASTERY_MAP = {
  'Club': 'Slow', 'Dagger': 'Nick', 'Greatclub': 'Push', 'Handaxe': 'Vex',
  'Javelin': 'Slow', 'Light Hammer': 'Nick', 'Mace': 'Sap', 'Quarterstaff': 'Topple',
  'Sickle': 'Nick', 'Spear': 'Sap',
  'Light Crossbow': 'Slow', 'Dart': 'Vex', 'Shortbow': 'Vex', 'Sling': 'Slow',
  'Battleaxe': 'Topple', 'Flail': 'Sap', 'Glaive': 'Graze', 'Greataxe': 'Cleave',
  'Greatsword': 'Graze', 'Halberd': 'Cleave', 'Lance': 'Topple', 'Longsword': 'Sap',
  'Maul': 'Topple', 'Morningstar': 'Sap', 'Pike': 'Push', 'Rapier': 'Vex',
  'Scimitar': 'Nick', 'Shortsword': 'Vex', 'Trident': 'Topple', 'War Pick': 'Sap',
  'Warhammer': 'Push', 'Whip': 'Slow',
  'Blowgun': 'Vex', 'Hand Crossbow': 'Vex', 'Heavy Crossbow': 'Push',
  'Longbow': 'Slow', 'Net': 'Slow',
};

// Classes that get Weapon Mastery feature and at which levels they gain mastery slots
export const WEAPON_MASTERY_CLASSES = {
  Fighter:   { startLevel: 1, masterySlots: { 1: 3, 4: 4, 10: 5, 16: 6 } },
  Barbarian: { startLevel: 1, masterySlots: { 1: 2, 4: 3, 10: 4 } },
  Rogue:     { startLevel: 1, masterySlots: { 1: 2, 4: 3 } },
  Paladin:   { startLevel: 1, masterySlots: { 1: 2, 4: 3 } },
  Ranger:    { startLevel: 1, masterySlots: { 1: 2, 4: 3 } },
  Monk:      { startLevel: 1, masterySlots: { 1: 2, 4: 3 } },
};
