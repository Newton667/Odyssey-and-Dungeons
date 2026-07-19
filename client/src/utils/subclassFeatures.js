export const SUBCLASS_FEATURES = {
  // ==================== BARBARIAN (3, 6, 10, 14) ====================
  'Path of the Berserker': {
    3: { name: 'Frenzy', desc: 'While raging, you can choose to frenzy. You can make a single melee weapon attack as a bonus action on each turn. When the rage ends, you suffer one level of exhaustion.' },
    6: { name: 'Mindless Rage', desc: 'You can\'t be charmed or frightened while raging. If you are charmed or frightened when you enter rage, the effect is suspended for the duration.' },
    10: { name: 'Intimidating Presence', desc: 'As an action, you can frighten one creature you can see within 30 feet (DC = 8 + proficiency + Cha modifier). The target must succeed on a Wisdom save or be frightened until the end of your next turn. You can use your action on subsequent turns to extend the duration.' },
    14: { name: 'Retaliation', desc: 'When you take damage from a creature within 5 feet of you, you can use your reaction to make a melee weapon attack against that creature.' },
  },
  'Path of the Totem Warrior': {
    3: { name: 'Totem Spirit', desc: 'Choose Bear (resistance to all damage except psychic while raging), Eagle (opportunity attacks against you have disadvantage, and you can Dash as a bonus action while raging), or Wolf (while raging, allies have advantage on melee attack rolls against hostile creatures within 5 feet of you).' },
    6: { name: 'Aspect of the Beast', desc: 'Choose Bear (carrying capacity doubles and you have advantage on Strength checks to push, pull, lift, or break objects), Eagle (you can see up to 1 mile away with no difficulty and dim light doesn\'t impose disadvantage on Perception checks), or Wolf (you can track creatures at a fast pace and move stealthily at a normal pace).' },
    10: { name: 'Spirit Walker', desc: 'You can cast Commune with Nature as a ritual. The spell manifests as a spiritual version of your totem animal.' },
    14: { name: 'Totemic Attunement', desc: 'Choose Bear (while raging, hostile creatures within 5 feet have disadvantage on attacks against your allies), Eagle (while raging, you gain a flying speed equal to your walking speed, but you fall if you end your turn in the air), or Wolf (while raging, you can use a bonus action to knock a Large or smaller creature prone when you hit it with a melee weapon attack).' },
  },

  // ==================== BARD (3, 6, 14) ====================
  'College of Lore': {
    3: { name: 'Bonus Proficiencies & Cutting Words', desc: 'You gain proficiency with any three skills. Additionally, when a creature you can see within 60 feet makes an attack roll, ability check, or damage roll, you can use your reaction to expend a Bardic Inspiration die and subtract the result from the creature\'s roll.' },
    6: { name: 'Additional Magical Secrets', desc: 'You learn two spells from any class\'s spell list. These count as bard spells for you and count against your number of spells known.' },
    14: { name: 'Peerless Skill', desc: 'When you make an ability check, you can expend one use of Bardic Inspiration and add the die roll to your ability check. You can do this after rolling but before knowing if you succeed or fail.' },
  },
  'College of Valor': {
    3: { name: 'Bonus Proficiencies & Combat Inspiration', desc: 'You gain proficiency with medium armor, shields, and martial weapons. Additionally, a creature that uses your Bardic Inspiration die can add it to a weapon damage roll or to AC against one attack (using their reaction).' },
    6: { name: 'Extra Attack', desc: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.' },
    14: { name: 'Battle Magic', desc: 'When you use your action to cast a bard spell, you can make one weapon attack as a bonus action.' },
  },
  'College of Eloquence': {
    3: { name: 'Silver Tongue & Unsettling Words', desc: 'Silver Tongue: when you make a Persuasion or Deception check, treat a d20 roll of 9 or lower as a 10. Unsettling Words: as a bonus action, expend one Bardic Inspiration die and choose a creature within 60 feet; subtract the number rolled from the next saving throw it makes before the start of your next turn.' },
    6: { name: 'Unfailing Inspiration & Universal Speech', desc: 'Unfailing Inspiration: when a creature adds one of your Bardic Inspiration dice to an ability check, attack, or save and still fails, it keeps the die. Universal Speech: as an action, choose creatures within 60 feet (up to your CHA modifier); for 1 hour they can understand you whatever language you speak. Usable CHA modifier times per long rest (or by expending a spell slot).' },
    14: { name: 'Infectious Inspiration', desc: 'When a creature within 60 feet succeeds on a roll using one of your Bardic Inspiration dice, you can use your reaction to give a different creature within 60 feet a Bardic Inspiration die without spending one of your uses. Usable CHA modifier times per long rest.' },
  },

  // ==================== CLERIC (1, 2, 6, 8, 17) ====================
  'Knowledge Domain': {
    1: { name: 'Blessings of Knowledge', desc: 'You learn two languages and gain proficiency in two of the following skills: Arcana, History, Nature, or Religion. Your proficiency bonus is doubled for ability checks using those skills.' },
    2: { name: 'Knowledge of the Ages', desc: 'As an action, you can use Channel Divinity to gain proficiency with one skill or tool for 10 minutes.' },
    6: { name: 'Read Thoughts', desc: 'You can use Channel Divinity to read a creature\'s thoughts within 60 feet (Wisdom save). On a failure, you read its surface thoughts for 1 minute and can cast Suggestion on it without expending a spell slot (no save needed).' },
    8: { name: 'Potent Spellcasting', desc: 'You add your Wisdom modifier to the damage you deal with any cleric cantrip.' },
    17: { name: 'Visions of the Past', desc: 'You can spend at least 1 minute meditating to receive visions related to an object you hold or your immediate surroundings. Object Reading reveals prior owners and recent events; Area Reading reveals significant events in the past.' },
  },
  'Life Domain': {
    1: { name: 'Bonus Proficiency & Disciple of Life', desc: 'You gain proficiency with heavy armor. Whenever you use a spell of 1st level or higher to restore hit points, the creature regains additional HP equal to 2 + the spell\'s level.' },
    2: { name: 'Preserve Life', desc: 'As an action, you can use Channel Divinity to restore a total number of hit points equal to 5 times your cleric level, divided among creatures within 30 feet. Cannot restore a creature above half its HP maximum.' },
    6: { name: 'Blessed Healer', desc: 'When you cast a spell of 1st level or higher that restores HP to another creature, you also regain HP equal to 2 + the spell\'s level.' },
    8: { name: 'Divine Strike', desc: 'Once on each turn, you can deal an extra 1d8 radiant damage when you hit a creature with a weapon attack. At 14th level, this increases to 2d8.' },
    17: { name: 'Supreme Healing', desc: 'When you would normally roll dice to restore hit points with a healing spell, you instead use the highest number possible for each die.' },
  },
  'Light Domain': {
    1: { name: 'Bonus Cantrip & Warding Flare', desc: 'You gain the Light cantrip. When you are attacked by a creature within 30 feet that you can see, you can use your reaction to impose disadvantage on the attack roll (Wisdom modifier times per long rest).' },
    2: { name: 'Radiance of the Dawn', desc: 'As an action, you can use Channel Divinity to dispel magical darkness within 30 feet and deal 2d10 + cleric level radiant damage (Constitution save for half) to hostile creatures within 30 feet.' },
    6: { name: 'Improved Flare', desc: 'You can use your Warding Flare feature when a creature you can see within 30 feet attacks a creature other than you.' },
    8: { name: 'Potent Spellcasting', desc: 'You add your Wisdom modifier to the damage you deal with any cleric cantrip.' },
    17: { name: 'Corona of Light', desc: 'As an action, you can activate an aura of sunlight that lasts for 1 minute, shedding bright light in a 60-foot radius and dim light 30 feet beyond that. Enemies in the bright light have disadvantage on saving throws against spells that deal fire or radiant damage.' },
  },
  'Nature Domain': {
    1: { name: 'Acolyte of Nature & Bonus Proficiency', desc: 'You learn one druid cantrip and gain proficiency in one of Animal Handling, Nature, or Survival. You also gain proficiency with heavy armor.' },
    2: { name: 'Charm Animals and Plants', desc: 'As an action, you can use Channel Divinity to charm all beasts and plant creatures within 30 feet (Wisdom save). They are charmed for 1 minute or until they take damage.' },
    6: { name: 'Dampen Elements', desc: 'When you or a creature within 30 feet takes acid, cold, fire, lightning, or thunder damage, you can use your reaction to grant resistance to that instance of damage.' },
    8: { name: 'Divine Strike', desc: 'Once on each turn, you can deal an extra 1d8 cold, fire, or lightning damage (your choice) when you hit a creature with a weapon attack. At 14th level, this increases to 2d8.' },
    17: { name: 'Master of Nature', desc: 'You can command creatures charmed by your Charm Animals and Plants feature as a bonus action, giving them verbal orders.' },
  },
  'Tempest Domain': {
    1: { name: 'Bonus Proficiency & Wrath of the Storm', desc: 'You gain proficiency with martial weapons and heavy armor. When a creature within 5 feet hits you with an attack, you can use your reaction to deal 2d8 lightning or thunder damage (Dexterity save for half). Usable Wisdom modifier times per long rest.' },
    2: { name: 'Destructive Wrath', desc: 'When you roll lightning or thunder damage, you can use Channel Divinity to deal maximum damage instead of rolling.' },
    6: { name: 'Thunderbolt Strike', desc: 'When you deal lightning damage to a Large or smaller creature, you can push it up to 10 feet away from you.' },
    8: { name: 'Divine Strike', desc: 'Once on each turn, you can deal an extra 1d8 thunder damage when you hit a creature with a weapon attack. At 14th level, this increases to 2d8.' },
    17: { name: 'Stormborn', desc: 'You have a flying speed equal to your walking speed whenever you are outdoors.' },
  },
  'Trickery Domain': {
    1: { name: 'Blessing of the Trickster', desc: 'As an action, you can touch a willing creature (other than yourself) to give it advantage on Dexterity (Stealth) checks. This lasts for 1 hour or until you use it again.' },
    2: { name: 'Invoke Duplicity', desc: 'As an action, you can use Channel Divinity to create an illusory duplicate of yourself within 30 feet that lasts for 1 minute. You can cast spells as though you were in the duplicate\'s space, and you have advantage on attacks when you and the duplicate are within 5 feet of the target.' },
    6: { name: 'Cloak of Shadows', desc: 'You can use Channel Divinity to become invisible until the end of your next turn. You become visible if you attack or cast a spell.' },
    8: { name: 'Divine Strike', desc: 'Once on each turn, you can deal an extra 1d8 poison damage when you hit a creature with a weapon attack. At 14th level, this increases to 2d8.' },
    17: { name: 'Improved Duplicity', desc: 'You can create up to four duplicates of yourself instead of one when you use Invoke Duplicity. You can move any number of them up to 30 feet as a bonus action.' },
  },
  'War Domain': {
    1: { name: 'Bonus Proficiency & War Priest', desc: 'You gain proficiency with martial weapons and heavy armor. When you take the Attack action, you can make one weapon attack as a bonus action. Usable Wisdom modifier times per long rest.' },
    2: { name: 'Guided Strike', desc: 'When you make an attack roll, you can use Channel Divinity to gain a +10 bonus to the roll. You make this choice after you see the roll but before the DM says whether it hits.' },
    6: { name: 'War God\'s Blessing', desc: 'When a creature within 30 feet makes an attack roll, you can use your reaction to grant it a +10 bonus using Channel Divinity. You make this choice after you see the roll but before the DM says whether it hits.' },
    8: { name: 'Divine Strike', desc: 'Once on each turn, you can deal an extra 1d8 damage of the same type as your weapon when you hit a creature with a weapon attack. At 14th level, this increases to 2d8.' },
    17: { name: 'Avatar of Battle', desc: 'You have resistance to bludgeoning, piercing, and slashing damage from nonmagical weapons.' },
  },

  // ==================== DRUID (2, 6, 10, 14) ====================
  'Circle of the Land': {
    2: { name: 'Bonus Cantrip & Natural Recovery', desc: 'You learn one additional druid cantrip. During a short rest, you can recover expended spell slots with a combined level equal to or less than half your druid level (rounded up), and none of the slots can be 6th level or higher. Usable once per long rest.' },
    6: { name: 'Land\'s Stride', desc: 'Moving through nonmagical difficult terrain costs you no extra movement. You can also pass through nonmagical plants without being slowed or taking damage. You have advantage on saves against plants that are magically created or manipulated.' },
    10: { name: 'Nature\'s Ward', desc: 'You can\'t be charmed or frightened by elementals or fey, and you are immune to poison and disease.' },
    14: { name: 'Nature\'s Sanctuary', desc: 'Beasts and plant creatures that attack you must make a Wisdom saving throw against your druid spell save DC. On a failure, they must choose a different target or the attack misses. On a success, the creature is immune to this effect for 24 hours.' },
  },
  'Circle of the Moon': {
    2: { name: 'Combat Wild Shape & Circle Forms', desc: 'You can use Wild Shape as a bonus action. You can transform into beasts with a CR as high as 1 (CR increases to your druid level divided by 3 at higher levels, rounded down). While in beast form, you can expend a spell slot as a bonus action to regain 1d8 HP per level of the slot.' },
    6: { name: 'Primal Strike', desc: 'Your attacks in beast form count as magical for the purpose of overcoming resistance and immunity to nonmagical attacks and damage.' },
    10: { name: 'Elemental Wild Shape', desc: 'You can expend two uses of Wild Shape to transform into an air, earth, fire, or water elemental.' },
    14: { name: 'Thousand Forms', desc: 'You can cast Alter Self at will without expending a spell slot.' },
  },

  // ==================== FIGHTER (3, 7, 10, 15, 18) ====================
  'Champion': {
    3: { name: 'Improved Critical', desc: 'Your weapon attacks score a critical hit on a roll of 19 or 20.' },
    7: { name: 'Remarkable Athlete', desc: 'You can add half your proficiency bonus (rounded up) to any Strength, Dexterity, or Constitution check you make that doesn\'t already use your proficiency bonus. Your running long jump distance increases by a number of feet equal to your Strength modifier.' },
    10: { name: 'Additional Fighting Style', desc: 'You choose a second Fighting Style option from the fighter class list.' },
    15: { name: 'Superior Critical', desc: 'Your weapon attacks score a critical hit on a roll of 18, 19, or 20.' },
    18: { name: 'Survivor', desc: 'At the start of each of your turns, you regain hit points equal to 5 + your Constitution modifier if you have no more than half your hit points remaining. You don\'t gain this benefit if you have 0 hit points.' },
  },
  'Battle Master': {
    3: { name: 'Combat Superiority & Student of War', desc: 'You learn three maneuvers and gain four superiority dice (d8). You regain all expended dice on a short or long rest. Maneuver save DC = 8 + proficiency + Str or Dex modifier. You also gain proficiency with one artisan\'s tools.' },
    7: { name: 'Know Your Enemy', desc: 'If you spend at least 1 minute observing or interacting with a creature outside combat, you can learn if it is equal, superior, or inferior to you in two of the following: Strength, Dexterity, Constitution, AC, current HP, total class levels, or fighter class levels.' },
    10: { name: 'Improved Combat Superiority', desc: 'Your superiority dice become d10s.' },
    15: { name: 'Relentless', desc: 'When you roll initiative and have no superiority dice remaining, you regain one superiority die.' },
    18: { name: 'Improved Combat Superiority (d12)', desc: 'Your superiority dice become d12s.' },
  },
  'Eldritch Knight': {
    3: { name: 'Spellcasting & Weapon Bond', desc: 'You learn cantrips and spells from the wizard spell list (primarily abjuration and evocation). You can bond with up to two weapons over a short rest; a bonded weapon can\'t be disarmed and you can summon it to your hand as a bonus action.' },
    7: { name: 'War Magic', desc: 'When you use your action to cast a cantrip, you can make one weapon attack as a bonus action.' },
    10: { name: 'Eldritch Strike', desc: 'When you hit a creature with a weapon attack, that creature has disadvantage on the next saving throw it makes against a spell you cast before the end of your next turn.' },
    15: { name: 'Arcane Charge', desc: 'When you use Action Surge, you can teleport up to 30 feet to an unoccupied space you can see. You can teleport before or after the additional action.' },
    18: { name: 'Improved War Magic', desc: 'When you use your action to cast a spell, you can make one weapon attack as a bonus action.' },
  },

  // ==================== MONK (3, 6, 11, 17) ====================
  'Way of the Open Hand': {
    3: { name: 'Open Hand Technique', desc: 'When you hit a creature with a Flurry of Blows attack, you can impose one effect: knock it prone (Dex save), push it 15 feet away (Str save), or prevent it from taking reactions until the end of your next turn (no save).' },
    6: { name: 'Wholeness of Body', desc: 'As an action, you can regain hit points equal to three times your monk level. Usable once per long rest.' },
    11: { name: 'Tranquility', desc: 'At the end of a long rest, you gain the effect of a Sanctuary spell (save DC = 8 + Wisdom modifier + proficiency bonus) that lasts until the start of your next long rest. The effect ends early if you make an attack or cast a spell that affects an enemy.' },
    17: { name: 'Quivering Palm', desc: 'When you hit a creature with an unarmed strike, you can spend 3 ki points to set up lethal vibrations that last for a number of days equal to your monk level. As an action, you can end the vibrations: the creature must make a Constitution save or be reduced to 0 HP. On a success, it takes 10d10 necrotic damage.' },
  },
  'Way of Shadow': {
    3: { name: 'Shadow Arts', desc: 'You can spend 2 ki points to cast Darkness, Darkvision, Pass without Trace, or Silence without material components. You also learn the Minor Illusion cantrip if you don\'t already know it.' },
    6: { name: 'Shadow Step', desc: 'When you are in dim light or darkness, as a bonus action you can teleport up to 60 feet to an unoccupied space you can see that is also in dim light or darkness. You then have advantage on the first melee attack you make before the end of the turn.' },
    11: { name: 'Cloak of Shadows', desc: 'When you are in an area of dim light or darkness, you can use your action to become invisible. You remain invisible until you make an attack, cast a spell, or are in an area of bright light.' },
    17: { name: 'Opportunist', desc: 'When a creature within 5 feet of you is hit by an attack made by a creature other than you, you can use your reaction to make a melee attack against that creature.' },
  },
  'Way of the Four Elements': {
    3: { name: 'Disciple of the Elements', desc: 'You learn elemental disciplines that let you spend ki points to cast spells or produce magical effects. You learn Elemental Attunement (minor elemental manipulation at will) plus one other discipline of your choice. Spell save DC = 8 + proficiency + Wisdom modifier.' },
    6: { name: 'Additional Elemental Discipline', desc: 'You learn one additional elemental discipline. You can also replace one discipline you know with a different one.' },
    11: { name: 'Additional Elemental Discipline', desc: 'You learn one additional elemental discipline. You can select from disciplines that require higher monk levels (11th or lower). You can also replace one discipline you know.' },
    17: { name: 'Additional Elemental Discipline', desc: 'You learn one additional elemental discipline. You can select from disciplines that require higher monk levels (17th or lower). You can also replace one discipline you know.' },
  },

  // ==================== PALADIN (3, 7, 15, 20) ====================
  'Oath of Devotion': {
    3: { name: 'Sacred Weapon & Turn the Unholy', desc: 'Channel Divinity: Sacred Weapon adds your Charisma modifier to attack rolls with one weapon for 1 minute (the weapon also emits bright light). Turn the Unholy forces fiends and undead within 30 feet to flee for 1 minute (Wisdom save).' },
    7: { name: 'Aura of Devotion', desc: 'You and friendly creatures within 10 feet can\'t be charmed while you are conscious. At 18th level, the range increases to 30 feet.' },
    15: { name: 'Purity of Spirit', desc: 'You are always under the effects of a Protection from Evil and Good spell.' },
    20: { name: 'Holy Nimbus', desc: 'As an action, you emanate an aura of sunlight for 1 minute. You shed bright light in a 30-foot radius and dim light 30 feet beyond that. Enemies that start their turn in the bright light take 10 radiant damage. You also have advantage on saves against spells cast by fiends or undead. Usable once per long rest.' },
  },
  'Oath of the Ancients': {
    3: { name: 'Nature\'s Wrath & Turn the Faithless', desc: 'Channel Divinity: Nature\'s Wrath restrains a creature within 10 feet with spectral vines (Strength or Dexterity save each turn to escape). Turn the Faithless forces fey and fiends within 30 feet to flee for 1 minute (Wisdom save).' },
    7: { name: 'Aura of Warding', desc: 'You and friendly creatures within 10 feet have resistance to damage from spells. At 18th level, the range increases to 30 feet.' },
    15: { name: 'Undying Sentinel', desc: 'When you are reduced to 0 hit points but not killed outright, you drop to 1 hit point instead. Usable once per long rest. Additionally, you suffer none of the drawbacks of old age and can\'t be aged magically.' },
    20: { name: 'Elder Champion', desc: 'As an action, you transform for 1 minute: you regain 10 HP at the start of each turn, paladin spells you cast have their casting time reduced to a bonus action, and enemies within 10 feet have disadvantage on saves against your paladin spells and Channel Divinity. Usable once per long rest.' },
  },
  'Oath of Vengeance': {
    3: { name: 'Abjure Enemy & Vow of Enmity', desc: 'Channel Divinity: Abjure Enemy frightens one creature within 60 feet and reduces its speed to 0 (Wisdom save; fiends and undead have disadvantage). Vow of Enmity grants advantage on attack rolls against one creature within 10 feet for 1 minute.' },
    7: { name: 'Relentless Avenger', desc: 'When you hit a creature with an opportunity attack, you can move up to half your speed immediately after as part of the same reaction. This movement doesn\'t provoke opportunity attacks.' },
    15: { name: 'Soul of Vengeance', desc: 'When a creature under your Vow of Enmity makes an attack, you can use your reaction to make a melee weapon attack against it if it\'s within range.' },
    20: { name: 'Avenging Angel', desc: 'As an action, you transform for 1 hour: you sprout wings (60-foot flying speed) and emanate a 30-foot aura of menace. Enemies that enter or start their turn in the aura must make a Wisdom save or be frightened for 1 minute. Usable once per long rest.' },
  },
  'Oath of Glory': {
    3: { name: 'Peerless Athlete & Inspiring Smite', desc: 'Channel Divinity: Peerless Athlete — as a bonus action, gain advantage on Athletics and Acrobatics checks, increase carrying capacity, and add 10 feet to your jump distance for 10 minutes. Inspiring Smite — immediately after dealing Divine Smite damage, distribute temporary hit points totaling 2d8 + your paladin level among creatures of your choice within 30 feet.' },
    7: { name: 'Aura of Alacrity', desc: 'Your walking speed increases by 10 feet. Allies that start their turn within 5 feet of you gain +10 feet of speed until the end of that turn. At 18th level, the aura range increases to 30 feet.' },
    15: { name: 'Glorious Defense', desc: 'When you or a creature within 10 feet of you is hit by an attack, you can use your reaction to add your Charisma modifier to that target\'s AC against the attack, potentially causing it to miss. If it misses, you can make one weapon attack against the attacker as part of the reaction. Usable Charisma modifier times per long rest.' },
    20: { name: 'Living Legend', desc: 'As a bonus action, become the stuff of legend for 1 minute: you have advantage on all Charisma checks; once per turn you can turn one of your missed weapon attacks into a hit; and once during the duration you can succeed on a saving throw you fail. Usable once per long rest, or by expending a 5th-level spell slot.' },
  },

  // ==================== RANGER (3, 7, 11, 15) ====================
  'Hunter': {
    3: { name: 'Hunter\'s Prey', desc: 'Choose one: Colossus Slayer (deal an extra 1d8 damage once per turn to a creature below its HP max), Giant Killer (use reaction to attack a Large or larger creature within 5 feet that attacks you), or Horde Breaker (make an additional attack against a different creature within 5 feet of the original target).' },
    7: { name: 'Defensive Tactics', desc: 'Choose one: Escape the Horde (opportunity attacks against you are made with disadvantage), Multiattack Defense (gain +4 AC against subsequent attacks from a creature that hits you), or Steel Will (advantage on saves against being frightened).' },
    11: { name: 'Multiattack', desc: 'Choose one: Volley (use your action to make a ranged attack against any number of creatures within 10 feet of a point you can see within range, with ammunition for each) or Whirlwind Attack (use your action to make a melee attack against each creature within 5 feet of you).' },
    15: { name: 'Superior Hunter\'s Defense', desc: 'Choose one: Evasion (Dex saves for half damage become no damage on success, half on fail), Stand Against the Tide (when a creature misses you with a melee attack, you can force it to repeat the attack against another creature), or Uncanny Dodge (halve the damage of an attack that hits you as a reaction).' },
  },
  'Beast Master': {
    3: { name: 'Ranger\'s Companion', desc: 'You gain a beast companion with a CR of 1/4 or lower. It acts on your turn and obeys your commands. It adds your proficiency bonus to its AC, attack rolls, damage rolls, saves, and skills. Its HP maximum equals its normal maximum or four times your ranger level, whichever is higher.' },
    7: { name: 'Exceptional Training', desc: 'On any turn you don\'t command your beast to attack, it can use Dash, Disengage, Dodge, or Help as a bonus action. Additionally, its attacks now count as magical for overcoming resistance and immunity.' },
    11: { name: 'Bestial Fury', desc: 'Your beast companion can make two attacks when you command it to take the Attack action, or it can take the Multiattack action if it has one.' },
    15: { name: 'Share Spells', desc: 'When you cast a spell targeting yourself, you can also affect your beast companion if it is within 30 feet of you.' },
  },

  // ==================== ROGUE (3, 9, 13, 17) ====================
  'Thief': {
    3: { name: 'Fast Hands & Second-Story Work', desc: 'You can use the bonus action from Cunning Action to make a Sleight of Hand check, use thieves\' tools to disarm a trap or pick a lock, or take the Use an Object action. Additionally, climbing no longer costs extra movement, and your running jump distance increases by a number of feet equal to your Dexterity modifier.' },
    9: { name: 'Supreme Sneak', desc: 'You have advantage on Dexterity (Stealth) checks if you move no more than half your speed on the same turn.' },
    13: { name: 'Use Magic Device', desc: 'You can ignore all class, race, and level requirements on the use of magic items.' },
    17: { name: 'Thief\'s Reflexes', desc: 'You can take two turns during the first round of any combat. You take your first turn at your normal initiative and your second turn at your initiative minus 10. You can\'t use this if you are surprised.' },
  },
  'Assassin': {
    3: { name: 'Bonus Proficiencies & Assassinate', desc: 'You gain proficiency with the disguise kit and poisoner\'s kit. You have advantage on attack rolls against creatures that haven\'t taken a turn yet. Additionally, any hit you score against a surprised creature is a critical hit.' },
    9: { name: 'Infiltration Expertise', desc: 'You can create a false identity over 7 days (spending 25 gp). You establish a history, profession, and affiliations. The identity holds up to casual scrutiny.' },
    13: { name: 'Impostor', desc: 'You can unerringly mimic another person\'s speech, writing, and behavior after studying them for at least 3 hours. Casual observers can\'t tell you\'re not that person; a suspicious creature can see through the ruse with a contested Insight vs. Deception check.' },
    17: { name: 'Death Strike', desc: 'When you hit a surprised creature, it must make a Constitution save (DC = 8 + Dex modifier + proficiency bonus). On a failure, the attack\'s damage is doubled.' },
  },
  'Arcane Trickster': {
    3: { name: 'Spellcasting & Mage Hand Legerdemain', desc: 'You learn cantrips and spells from the wizard spell list (primarily enchantment and illusion). Your Mage Hand is invisible, and you can use it to stow or retrieve objects in a creature\'s container, use thieves\' tools at range, all as a bonus action.' },
    9: { name: 'Magical Ambush', desc: 'If you are hidden from a creature when you cast a spell on it, the creature has disadvantage on any saving throw it makes against the spell.' },
    13: { name: 'Versatile Trickster', desc: 'As a bonus action, you can designate a creature within 5 feet of your Mage Hand. You have advantage on attack rolls against that creature until the end of the turn.' },
    17: { name: 'Spell Thief', desc: 'When a creature casts a spell targeting you or including you in its area, you can use your reaction to force a save (DC = your spell save DC). On failure, you negate the spell\'s effect on you, and you steal the spell for 8 hours if it\'s of a level you can cast. Usable once per long rest.' },
  },

  // ==================== SORCERER (1, 6, 14, 18) ====================
  'Draconic Bloodline': {
    1: { name: 'Dragon Ancestor & Draconic Resilience', desc: 'You choose a dragon ancestor type, gaining associated damage type benefits later. Your HP maximum increases by 1 per sorcerer level, and your base AC is 13 + Dexterity modifier when not wearing armor.' },
    6: { name: 'Elemental Affinity', desc: 'When you cast a spell that deals damage of the type associated with your draconic ancestry, you can add your Charisma modifier to one damage roll. You can also spend 1 sorcery point to gain resistance to that damage type for 1 hour.' },
    14: { name: 'Dragon Wings', desc: 'As a bonus action, you can sprout spectral dragon wings, gaining a flying speed equal to your current walking speed. The wings last until you dismiss them. You can\'t manifest them while wearing armor unless it\'s made to accommodate them.' },
    18: { name: 'Draconic Presence', desc: 'As an action, you can spend 5 sorcery points to create a 60-foot aura of draconic presence for 1 minute. Hostile creatures that start their turn in the aura must make a Wisdom save or be charmed (if you choose awe) or frightened (if you choose fear) until the aura ends.' },
  },
  'Wild Magic': {
    1: { name: 'Wild Magic Surge & Tides of Chaos', desc: 'After casting a sorcerer spell of 1st level or higher, the DM may have you roll a d20; on a 1, you roll on the Wild Magic Surge table. Tides of Chaos lets you gain advantage on one attack roll, ability check, or saving throw once per long rest (or sooner if the DM triggers a Wild Magic Surge).' },
    6: { name: 'Bend Luck', desc: 'When another creature you can see makes an attack roll, ability check, or saving throw, you can use your reaction and spend 2 sorcery points to add or subtract 1d4 from the roll.' },
    14: { name: 'Controlled Chaos', desc: 'When you roll on the Wild Magic Surge table, you can roll twice and use either result.' },
    18: { name: 'Spell Bombardment', desc: 'When you roll damage for a spell and roll the highest number possible on any of the dice, you can roll that die one additional time and add it to the damage. You can use this once per turn.' },
  },

  // ==================== WARLOCK (1, 6, 10, 14) ====================
  'The Archfey': {
    1: { name: 'Fey Presence', desc: 'As an action, you can cause each creature in a 10-foot cube originating from you to make a Wisdom save. Those that fail are charmed or frightened (your choice) until the end of your next turn. Usable once per short or long rest.' },
    6: { name: 'Misty Escape', desc: 'When you take damage, you can use your reaction to turn invisible and teleport up to 60 feet. You remain invisible until the start of your next turn or until you attack or cast a spell. Usable once per short or long rest.' },
    10: { name: 'Beguiling Defenses', desc: 'You can\'t be charmed, and when another creature attempts to charm you, you can use your reaction to turn the charm back on it (Wisdom save using your spell save DC).' },
    14: { name: 'Dark Delirium', desc: 'As an action, you can create an illusory realm around one creature within 60 feet for 1 minute (Wisdom save). The target is charmed or frightened (your choice) and thinks it\'s lost in a misty realm. It can\'t see or hear anything other than the illusion. Usable once per short or long rest.' },
  },
  'The Fiend': {
    1: { name: 'Dark One\'s Blessing', desc: 'When you reduce a hostile creature to 0 hit points, you gain temporary hit points equal to your Charisma modifier + your warlock level.' },
    6: { name: 'Dark One\'s Own Luck', desc: 'When you make an ability check or saving throw, you can add a d10 to the roll. You can do so after seeing the roll but before effects are applied. Usable once per short or long rest.' },
    10: { name: 'Fiendish Resilience', desc: 'When you finish a short or long rest, you can choose one damage type. You gain resistance to that damage type until you choose a different one. Damage from magical weapons or silver weapons ignores this resistance.' },
    14: { name: 'Hurl Through Hell', desc: 'When you hit a creature with an attack, you can instantly transport it through the lower planes. It disappears and hurtles through a nightmare landscape, taking 10d10 psychic damage at the end of your next turn when it returns. Usable once per long rest.' },
  },
  'The Great Old One': {
    1: { name: 'Awakened Mind', desc: 'You can telepathically speak to any creature you can see within 30 feet. You don\'t need to share a language, but the creature must understand at least one language. Communication is one-way (you to them) unless they choose to respond.' },
    6: { name: 'Entropic Ward', desc: 'When a creature makes an attack roll against you, you can use your reaction to impose disadvantage. If the attack misses, your next attack roll against that creature has advantage if made before the end of your next turn. Usable once per short or long rest.' },
    10: { name: 'Thought Shield', desc: 'Your thoughts can\'t be read by telepathy or other means unless you allow it. You also have resistance to psychic damage, and when a creature deals psychic damage to you, that creature takes the same amount.' },
    14: { name: 'Create Thrall', desc: 'As an action, you touch an incapacitated humanoid to charm it until a Remove Curse is cast on it, or you use this feature again. You can communicate telepathically with it regardless of distance (if on the same plane).' },
  },

  // ==================== WIZARD (2, 6, 10, 14) ====================
  'School of Abjuration': {
    2: { name: 'Abjuration Savant & Arcane Ward', desc: 'Copying abjuration spells costs half gold and time. When you cast an abjuration spell of 1st level or higher, you create a magical ward with HP equal to twice your wizard level + Intelligence modifier. The ward absorbs damage dealt to you.' },
    6: { name: 'Projected Ward', desc: 'When a creature you can see within 30 feet takes damage, you can use your reaction to have your Arcane Ward absorb the damage instead.' },
    10: { name: 'Improved Abjuration', desc: 'When you cast an abjuration spell that requires an ability check (such as Counterspell or Dispel Magic), you add your proficiency bonus to that check.' },
    14: { name: 'Spell Resistance', desc: 'You have advantage on saving throws against spells, and you have resistance to damage from spells.' },
  },
  'School of Conjuration': {
    2: { name: 'Conjuration Savant & Minor Conjuration', desc: 'Copying conjuration spells costs half gold and time. As an action, you can conjure an inanimate object (up to 3 feet on a side, no more than 10 pounds) in an unoccupied space within 10 feet. It is visibly magical, emits dim light in 5 feet, and disappears after 1 hour or if it takes or deals damage.' },
    6: { name: 'Benign Transposition', desc: 'As an action, you teleport up to 30 feet to an unoccupied space, or swap places with a willing Small or Medium creature within 30 feet. Usable once per long rest, or until you cast a conjuration spell of 1st level or higher.' },
    10: { name: 'Focused Conjuration', desc: 'Your concentration on a conjuration spell can\'t be broken as a result of taking damage.' },
    14: { name: 'Durable Summons', desc: 'Any creature you summon or create with a conjuration spell has 30 temporary hit points.' },
  },
  'School of Divination': {
    2: { name: 'Divination Savant & Portent', desc: 'Copying divination spells costs half gold and time. After a long rest, you roll two d20s and record the numbers. You can replace any attack roll, saving throw, or ability check made by you or a creature you can see with one of these rolls. You must choose before the roll.' },
    6: { name: 'Expert Divination', desc: 'When you cast a divination spell of 2nd level or higher using a spell slot, you regain one expended spell slot of a level lower than the spell you cast (maximum 5th level).' },
    10: { name: 'The Third Eye', desc: 'As an action, you gain one of the following until your next short or long rest: darkvision 60 feet, ethereal sight 60 feet, ability to read any language, or ability to see invisible creatures and objects within 10 feet.' },
    14: { name: 'Greater Portent', desc: 'You roll three d20s for your Portent feature instead of two.' },
  },
  'School of Enchantment': {
    2: { name: 'Enchantment Savant & Hypnotic Gaze', desc: 'Copying enchantment spells costs half gold and time. As an action, you can charm a creature within 5 feet (Wisdom save each turn). While charmed, it is incapacitated and has a speed of 0. The effect ends if you move more than 5 feet away, if the target takes damage, or if it passes the save.' },
    6: { name: 'Instinctive Charm', desc: 'When a creature you can see within 30 feet attacks you, you can use your reaction to redirect the attack to another creature within range (Wisdom save negates). Usable once per long rest, or after you cast an enchantment spell of 1st level or higher.' },
    10: { name: 'Split Enchantment', desc: 'When you cast an enchantment spell that targets only one creature, you can target a second creature with the same spell.' },
    14: { name: 'Alter Memories', desc: 'When you cast an enchantment spell that charms a creature, you can make one target unaware it was charmed. Additionally, you can use an action before the spell ends to make the target forget some or all of the time it was charmed (Intelligence save, DC = your spell save DC).' },
  },
  'School of Evocation': {
    2: { name: 'Evocation Savant & Sculpt Spells', desc: 'Copying evocation spells costs half gold and time. When you cast an evocation spell that affects other creatures you can see, you can choose a number of them equal to 1 + the spell\'s level. Those creatures automatically succeed on their saves and take no damage from the spell.' },
    6: { name: 'Potent Cantrip', desc: 'When a creature succeeds on a saving throw against your cantrip, it still takes half the cantrip\'s damage but suffers no additional effects.' },
    10: { name: 'Empowered Evocation', desc: 'You can add your Intelligence modifier to one damage roll of any wizard evocation spell you cast.' },
    14: { name: 'Overchannel', desc: 'When you cast a wizard spell of 1st through 5th level that deals damage, you can deal maximum damage with that spell. After the first use, each additional use before a long rest deals 2d12 necrotic damage per spell level to you (bypasses resistance/immunity).' },
  },
  'School of Illusion': {
    2: { name: 'Illusion Savant & Improved Minor Illusion', desc: 'Copying illusion spells costs half gold and time. When you cast Minor Illusion, you can create both a sound and an image with a single casting.' },
    6: { name: 'Malleable Illusions', desc: 'When you cast an illusion spell with a duration of 1 minute or longer, you can use your action to change the nature of the illusion (using the spell\'s normal parameters).' },
    10: { name: 'Illusory Self', desc: 'When a creature makes an attack roll against you, you can use your reaction to create an illusory duplicate that causes the attack to automatically miss. Usable once per short or long rest.' },
    14: { name: 'Illusory Reality', desc: 'When you cast an illusion spell of 1st level or higher, you can choose one inanimate, nonmagical object that is part of the illusion and make it real for 1 minute. The object can\'t deal damage or directly harm anyone.' },
  },
  'School of Necromancy': {
    2: { name: 'Necromancy Savant & Grim Harvest', desc: 'Copying necromancy spells costs half gold and time. When you kill a creature with a spell of 1st level or higher, you regain HP equal to twice the spell\'s level (three times if it\'s a necromancy spell). Doesn\'t work on undead or constructs.' },
    6: { name: 'Undead Thralls', desc: 'You add Animate Dead to your spellbook. When you cast Animate Dead, you can target one additional corpse or pile of bones. Undead you create with necromancy spells have extra HP equal to your wizard level and add your proficiency bonus to their damage rolls.' },
    10: { name: 'Inured to Undeath', desc: 'You have resistance to necrotic damage, and your hit point maximum can\'t be reduced.' },
    14: { name: 'Command Undead', desc: 'As an action, you can target one undead you can see within 60 feet. It must make a Charisma save. On a failure, it obeys your commands. If its Intelligence is 8 or higher, it has advantage on the save. If 12 or higher, it can repeat the save when it takes damage.' },
  },
  'School of Transmutation': {
    2: { name: 'Transmutation Savant & Minor Alchemy', desc: 'Copying transmutation spells costs half gold and time. You can transform one nonmagical object (wood, stone, iron, copper, or silver) into another of those materials. For each 10 minutes spent, you transform up to 1 cubic foot. It reverts after 1 hour or if you lose concentration.' },
    6: { name: 'Transmuter\'s Stone', desc: 'You can spend 8 hours creating a transmuter\'s stone that grants one of: darkvision 60 feet, +10 speed, proficiency in Constitution saves, or resistance to one of acid/cold/fire/lightning/thunder. You can change the property when you cast a transmutation spell of 1st level or higher.' },
    10: { name: 'Shapechanger', desc: 'You add Polymorph to your spellbook. You can cast Polymorph without expending a spell slot to transform into a beast with CR 1 or lower. Usable once per short or long rest.' },
    14: { name: 'Master Transmuter', desc: 'As an action, you can destroy your transmuter\'s stone to produce one of: transmute a nonmagical object into another (up to 5-foot cube), remove all curses/diseases/poisons from a creature, cast Raise Dead without a slot, or reduce a creature\'s apparent age by 3d10 years. Usable once per long rest (must create a new stone).' },
  },

  // ==================== ARTIFICER (3, 5, 9, 15) ====================
  'Alchemist': {
    3: { name: 'Tool Proficiency, Alchemist Spells & Experimental Elixir', desc: 'You gain proficiency with alchemist\'s supplies and learn additional spells at certain levels. You can create experimental elixirs (one free per long rest, or spend a spell slot for more). Elixir effects include healing (2d4+Int mod), swiftness (+10 speed), resilience (+1 AC), boldness (1d4 to attacks/saves), flight (10 ft flying), or transformation (alter appearance).' },
    5: { name: 'Alchemical Savant', desc: 'When you cast a spell using alchemist\'s supplies as your spellcasting focus that restores HP or deals acid, fire, necrotic, or poison damage, you add your Intelligence modifier to one roll of the spell (minimum +1).' },
    9: { name: 'Restorative Reagents', desc: 'You can cast Lesser Restoration without expending a spell slot a number of times equal to your Intelligence modifier per long rest. Additionally, when a creature drinks one of your experimental elixirs, it gains temporary HP equal to 2d6 + your Intelligence modifier.' },
    15: { name: 'Chemical Mastery', desc: 'You gain resistance to acid and poison damage and are immune to the poisoned condition. You can cast Greater Restoration and Heal each once per long rest without expending a spell slot or material components (using alchemist\'s supplies as the focus).' },
  },
  'Armorer': {
    3: { name: 'Tool Proficiency, Armorer Spells, Arcane Armor & Armor Model', desc: 'You gain proficiency with heavy armor and smith\'s tools, and learn additional spells. As an action, you can turn a suit of armor into Arcane Armor (no Str requirement, replaces missing limbs, can don/doff as an action, covers your fists). Choose Guardian model (thunder gauntlets: 1d8 thunder, impose disadvantage on attacking others; defensive field: temp HP = Int mod) or Infiltrator model (lightning launcher: 1d6 lightning ranged 90/300 plus 1d6 once per turn; 5 ft walking speed bonus; advantage on Stealth).' },
    5: { name: 'Extra Attack', desc: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.' },
    9: { name: 'Armor Modifications', desc: 'Your Arcane Armor now counts as separate items for infusion purposes: armor (chest), boots, helmet, and weapon. You can infuse each piece separately, and the maximum number of items you can infuse increases by 2.' },
    15: { name: 'Perfected Armor', desc: 'Guardian: When a Large or smaller creature you can see ends its turn within 30 feet, you can pull it up to 30 feet toward you in a straight line, and if it ends within 5 feet, you can make a melee attack (uses reaction, Int mod times per long rest). Infiltrator: Any creature hit by your lightning launcher glimmers, and the next attack against it before your next turn has advantage; if the attack hits, it deals an extra 1d6 lightning damage.' },
  },
  'Artillerist': {
    3: { name: 'Tool Proficiency, Artillerist Spells & Eldritch Cannon', desc: 'You gain proficiency with woodcarver\'s tools and learn additional spells. As an action, you create a Small or Tiny Eldritch Cannon in an unoccupied space within 5 feet. Choose: Flamethrower (15-ft cone, Dex save, 2d8 fire), Force Ballista (ranged attack, 2d8 force, push 5 ft), or Protector (1d8+Int mod temp HP to creatures of your choice within 10 ft). Activate as a bonus action. Lasts 1 hour.' },
    5: { name: 'Arcane Firearm', desc: 'You can turn a wand, staff, or rod into an arcane firearm (takes 1 hour). When you cast an artificer spell through it, you roll a d8 and add it to one damage or healing roll of the spell.' },
    9: { name: 'Explosive Cannon', desc: 'Your Eldritch Cannon\'s damage increases by 1d8 (to 3d8 for Flamethrower/Ballista, 2d8+Int for Protector). As an action, you can command a cannon to detonate within 20 feet: creatures in a 20-ft radius make a Dex save or take 3d8 force damage (half on success).' },
    15: { name: 'Fortified Position', desc: 'You can now create two Eldritch Cannons with a single use of the feature (they can be different types). You and allies within 10 feet of a cannon have half cover (+2 AC and Dex saves).' },
  },
  'Battle Smith': {
    3: { name: 'Tool Proficiency, Battle Smith Spells, Battle Ready & Steel Defender', desc: 'You gain proficiency with smith\'s tools and martial weapons, and learn additional spells. You can use Intelligence instead of Strength or Dexterity for magic weapon attacks. You gain a Steel Defender companion (AC 15, HP = 5x artificer level + Int mod + 5, deals 1d8+2 force damage). It acts on your initiative and can use Deflect Attack as a reaction to impose disadvantage on an attack against a creature within 5 feet of it.' },
    5: { name: 'Extra Attack', desc: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.' },
    9: { name: 'Arcane Jolt', desc: 'When you or your Steel Defender hits with a magic weapon attack, you can deal an extra 2d6 force damage or restore 2d6 HP to a creature within 30 feet of the target. Usable Intelligence modifier times per long rest. Increases to 4d6 at 15th level.' },
    15: { name: 'Improved Defender', desc: 'Your Arcane Jolt damage/healing increases to 4d6. Your Steel Defender gains +2 to AC and its Deflect Attack deals 1d4 + your Intelligence modifier force damage to the attacker when it imposes disadvantage.' },
  },
};
