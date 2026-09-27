// ─── 2024 subclass feature tables ─────────────────────────────────────
// Same shape as the 2014 SUBCLASS_FEATURES: { [subclass]: { [level]: { name, desc } } },
// one entry per level (several features gained together are joined with " & ").
// Descriptions are short mechanical summaries in the app's own words.
// Read through getSubclassFeatures() in subclassData.js — never directly from a page.

export const SUBCLASS_FEATURES_2024 = {
  // ==================== BARBARIAN (3, 6, 10, 14) ====================
  'Path of the Berserker': {
    3: { name: 'Frenzy', desc: 'While raging, the first time each turn you hit with a Reckless Attack using Strength, add extra damage dice equal to your Rage Damage bonus (d6s).' },
    6: { name: 'Mindless Rage', desc: 'You are immune to the Charmed and Frightened conditions while raging, and entering a rage ends those conditions on you.' },
    10: { name: 'Retaliation', desc: 'When a creature within 5 feet damages you, you can use your reaction to make one melee attack against it.' },
    14: { name: 'Intimidating Presence', desc: 'As a bonus action, force creatures of your choice in a 30-foot emanation to make a Wisdom save or be Frightened for 1 minute. Once per long rest, or by spending a Rage use.' },
  },
  'Path of the Wild Heart': {
    3: { name: 'Animal Speaker & Rage of the Wilds', desc: 'Cast Beast Sense and Speak with Animals as rituals. Each time you rage, choose Bear (resist every damage type but force, necrotic, psychic and radiant), Eagle (Dash and Disengage as part of the bonus action) or Wolf (allies have advantage against enemies next to you).' },
    6: { name: 'Aspect of the Wilds', desc: 'Choose one lasting benefit, changeable on a long rest: Owl (60 ft darkvision), Panther (climb speed equal to your speed) or Salmon (swim speed equal to your speed).' },
    10: { name: 'Nature Speaker', desc: 'Cast Commune with Nature as a ritual.' },
    14: { name: 'Power of the Wilds', desc: 'Each time you rage, choose Falcon (fly speed while unarmored), Lion (enemies next to you have disadvantage attacking others) or Ram (knock Large or smaller creatures prone when you hit them).' },
  },
  'Path of the World Tree': {
    3: { name: 'Vitality of the Tree', desc: 'Entering a rage grants you temporary HP equal to your barbarian level. At the start of each of your turns while raging, give an ally within 10 feet temporary HP equal to a number of d6s equal to your Rage Damage bonus.' },
    6: { name: 'Branches of the Tree', desc: 'While raging, use your reaction when a creature starts its turn within 30 feet: it must pass a Strength save or be teleported next to you and have its speed reduced to 0 until the end of the turn.' },
    10: { name: 'Battering Roots', desc: 'Your reach with Heavy or Versatile melee weapons grows by 10 feet, and you can apply the Push or Topple mastery in addition to the weapon\'s own mastery.' },
    14: { name: 'Travel along the Tree', desc: 'When you rage, and as a bonus action while raging, teleport up to 60 feet. Once per rage you can instead teleport up to 150 feet and bring up to six willing creatures along.' },
  },
  'Path of the Zealot': {
    3: { name: 'Divine Fury & Warrior of the Gods', desc: 'While raging, your first hit each turn deals an extra 1d6 + half your barbarian level of necrotic or radiant damage. You also have a pool of d12s (four at first) that you can spend as a bonus action to heal yourself; it refills on a long rest.' },
    6: { name: 'Fanatical Focus', desc: 'Once per rage, when you fail a saving throw, reroll it with a bonus equal to your Rage Damage bonus; you must use the new roll.' },
    10: { name: 'Zealous Presence', desc: 'As a bonus action, up to ten creatures of your choice within 60 feet gain advantage on attack rolls and saving throws until the start of your next turn. Once per long rest, or by spending a Rage use.' },
    14: { name: 'Rage of the Gods', desc: 'When you rage, take a divine form for 1 minute: fly speed equal to your speed, resistance to necrotic, psychic and radiant damage, and a reaction to spend a Rage use to keep a creature within 30 feet from dropping to 0 HP. Once per long rest.' },
  },

  // ==================== BARD (3, 6, 14) ====================
  'College of Dance': {
    3: { name: 'Dazzling Footwork', desc: 'While unarmored and without a shield: advantage on Performance checks involving dance, AC equals 10 + DEX + CHA, unarmed strikes use DEX and deal a Bardic Inspiration die plus DEX in bludgeoning damage, and using Bardic Inspiration lets you make an unarmed strike as part of that action.' },
    6: { name: 'Inspiring Movement & Tandem Footwork', desc: 'When an enemy ends its turn within 5 feet of you, spend a Bardic Inspiration die to move half your speed without provoking, and let an ally within 30 feet move too. When you roll initiative, spend a die to add it to your and nearby allies\' initiative.' },
    14: { name: 'Leading Evasion', desc: 'When you are subjected to an effect that allows a DEX save for half damage, you take no damage on a success and half on a failure; creatures within 5 feet of you can share this benefit when they make the same save.' },
  },
  'College of Glamour': {
    3: { name: 'Beguiling Magic & Mantle of Inspiration', desc: 'You always have Charm Person and Mirror Image prepared, and after casting an enchantment or illusion spell you can force a creature within 60 feet to save or be Charmed or Frightened. As a bonus action, spend Bardic Inspiration to give allies temporary HP and let them move without provoking.' },
    6: { name: 'Mantle of Majesty', desc: 'As a bonus action, cast Command without a slot and take on an unearthly appearance for 1 minute; each turn you can cast Command again as a bonus action without a slot. Once per long rest, or by spending a 3rd-level-or-higher slot.' },
    14: { name: 'Unbreakable Majesty', desc: 'As a bonus action, take a majestic presence for 1 minute. The first time a creature attacks you each turn, it must make a CHA save or pick a different target, and it has disadvantage on saves against your spells until your next turn. Once per short or long rest.' },
  },
  'College of Lore': {
    3: { name: 'Bonus Proficiencies & Cutting Words', desc: 'Gain proficiency in three skills of your choice. When a creature within 60 feet makes a damage roll or succeeds on an ability check or attack roll, use your reaction and a Bardic Inspiration die to subtract the roll from it.' },
    6: { name: 'Magical Discoveries', desc: 'Learn two spells of your choice from the Cleric, Druid or Wizard lists (any level you can cast). They are always prepared and count as bard spells.' },
    14: { name: 'Peerless Skill', desc: 'When you fail an ability check or attack roll, expend a Bardic Inspiration die and add it to the roll; if the roll still fails, the die is not spent.' },
  },
  'College of Valor': {
    3: { name: 'Combat Inspiration & Martial Training', desc: 'A creature holding your Bardic Inspiration die can add it to a weapon damage roll, or use its reaction to add it to AC against one attack. You gain proficiency with martial weapons, medium armor and shields, and can use a weapon as a spellcasting focus.' },
    6: { name: 'Extra Attack', desc: 'You attack twice when you take the Attack action, and you can replace one of those attacks with a cantrip that takes an action.' },
    14: { name: 'Battle Magic', desc: 'After you cast a spell that takes an action, you can make one weapon attack as a bonus action.' },
  },

  // ==================== CLERIC (3, 6, 17) ====================
  'Life Domain': {
    3: { name: 'Disciple of Life, Life Domain Spells & Preserve Life', desc: 'Your healing spells restore extra HP equal to 2 + the spell\'s level. Life domain spells are always prepared. Channel Divinity: restore HP equal to five times your cleric level, split among creatures within 30 feet (up to half their max HP each).' },
    6: { name: 'Blessed Healer', desc: 'When you cast a spell with a slot that heals another creature, you also regain HP equal to 2 + the slot level.' },
    17: { name: 'Supreme Healing', desc: 'When you roll dice to restore HP with a spell or Channel Divinity, use the highest number possible for each die instead of rolling.' },
  },
  'Light Domain': {
    3: { name: 'Light Domain Spells, Radiance of the Dawn & Warding Flare', desc: 'Light domain spells are always prepared. Channel Divinity: dispel magical darkness within 30 feet and deal 2d10 + cleric level radiant damage to chosen creatures (CON save for half). Reaction: impose disadvantage on an attack against you or a creature within 30 feet, WIS modifier times per long rest.' },
    6: { name: 'Improved Warding Flare', desc: 'Warding Flare recharges on a short rest, and its target gains temporary HP equal to 2d6 + your WIS modifier.' },
    17: { name: 'Corona of Light', desc: 'As an action, emit bright light for 1 minute; enemies in it have disadvantage on saves against your Radiance of the Dawn and fire or radiant spells. WIS modifier uses per long rest.' },
  },
  'Trickery Domain': {
    3: { name: 'Blessing of the Trickster, Invoke Duplicity & Trickery Domain Spells', desc: 'Give a willing creature advantage on Stealth checks until your next long rest. Channel Divinity: create an illusory duplicate for 1 minute that you can cast spells through and that grants advantage on attacks against creatures next to it. Trickery domain spells are always prepared.' },
    6: { name: 'Trickster\'s Transposition', desc: 'Whenever you create or move your duplicate, you can teleport to swap places with it.' },
    17: { name: 'Improved Duplicity', desc: 'Your duplicate grants the advantage to allies too, and when it ends you or a creature within 5 feet of it regain HP equal to your cleric level.' },
  },
  'War Domain': {
    3: { name: 'Guided Strike, War Domain Spells & War Priest', desc: 'Channel Divinity: when you or a creature within 30 feet misses an attack, add +10 to the roll. War domain spells are always prepared. Make one weapon attack or unarmed strike as a bonus action, WIS modifier times per short or long rest.' },
    6: { name: 'War God\'s Blessing', desc: 'Spend Channel Divinity to cast Shield of Faith or Spiritual Weapon without a slot; the spell needs no concentration and lasts 1 minute.' },
    17: { name: 'Avatar of Battle', desc: 'You have resistance to bludgeoning, piercing and slashing damage.' },
  },

  // ==================== DRUID (3, 6, 10, 14) ====================
  'Circle of the Land': {
    3: { name: 'Circle of the Land Spells & Land\'s Aid', desc: 'Choose Arid, Polar, Temperate or Tropical land after each long rest; its circle spells are always prepared. Spend a Wild Shape use to create a 10-foot-radius burst within 60 feet that deals 2d6 necrotic damage to chosen creatures (CON save for half) and heals one creature for 2d6.' },
    6: { name: 'Natural Recovery', desc: 'Cast one always-prepared circle spell without a slot once per long rest, and once per long rest recover spell slots on a short rest totalling up to half your druid level (no slot above 5th).' },
    10: { name: 'Nature\'s Ward', desc: 'You are immune to the Poisoned condition and resist a damage type tied to your current land (fire, cold, lightning or poison).' },
    14: { name: 'Nature\'s Sanctuary', desc: 'Spend a Wild Shape use to raise spectral trees and vines in a 15-foot cube for 1 minute; you and allies inside have half cover and your land\'s resistance.' },
  },
  'Circle of the Moon': {
    3: { name: 'Circle Forms & Circle of the Moon Spells', desc: 'Wild Shape into beasts up to CR equal to a third of your druid level; your AC in beast form is at least 13 + WIS and you gain temporary HP equal to three times your druid level. Moon circle spells are always prepared and castable in beast form.' },
    6: { name: 'Improved Circle Forms', desc: 'In Wild Shape your attacks can deal radiant damage, and you add your WIS modifier to CON saves.' },
    10: { name: 'Moonlight Step', desc: 'As a bonus action, teleport up to 30 feet and gain advantage on your next attack roll this turn. WIS modifier uses per long rest, or spend a 2nd-level-or-higher slot.' },
    14: { name: 'Lunar Form', desc: 'Once per turn in Wild Shape, deal an extra 2d10 radiant damage on a hit, and Moonlight Step can bring a willing creature along.' },
  },
  'Circle of the Sea': {
    3: { name: 'Circle of the Sea Spells & Wrath of the Sea', desc: 'Sea circle spells are always prepared. Spend a Wild Shape use to wreathe yourself in a 5-foot emanation of ocean spray for 10 minutes; as a bonus action, force a creature in it to make a CON save or take cold damage (d6s equal to your WIS modifier) and be pushed 15 feet.' },
    6: { name: 'Aquatic Affinity', desc: 'Wrath of the Sea\'s emanation grows to 10 feet, and you gain a swim speed equal to your speed.' },
    10: { name: 'Stormborn', desc: 'While Wrath of the Sea is active you have a fly speed equal to your speed and resistance to cold, lightning and thunder damage.' },
    14: { name: 'Oceanic Gift', desc: 'You can place Wrath of the Sea on a willing creature instead of yourself, or spend two Wild Shape uses to share it with both of you.' },
  },
  'Circle of the Stars': {
    3: { name: 'Star Map & Starry Form', desc: 'You always have Guidance and Guiding Bolt prepared and can cast Guiding Bolt without a slot WIS-modifier times per long rest. Spend Wild Shape to take a starry form: Archer (bonus-action radiant ranged attack), Chalice (healing spells heal another creature) or Dragon (treat low INT/WIS checks and concentration saves as 10).' },
    6: { name: 'Cosmic Omen', desc: 'After a long rest, roll a die: even gives Weal, odd gives Woe. As a reaction, add (Weal) or subtract (Woe) a d6 from a creature\'s d20 test within 30 feet, WIS modifier times per long rest.' },
    10: { name: 'Twinkling Constellations', desc: 'Starry Form\'s d8s become 2d8s, the Dragon form grants a 20-foot fly speed, and you can change constellation at the start of each turn.' },
    14: { name: 'Full of Stars', desc: 'While in Starry Form you have resistance to bludgeoning, piercing and slashing damage.' },
  },

  // ==================== FIGHTER (3, 7, 10, 15, 18) ====================
  'Battle Master': {
    3: { name: 'Combat Superiority & Student of War', desc: 'Learn three maneuvers and gain four d8 Superiority Dice (regained on a short or long rest) to fuel them; maneuver save DC is 8 + proficiency + STR or DEX. Gain one artisan\'s tool proficiency and one Fighter skill proficiency.' },
    7: { name: 'Know Your Enemy', desc: 'As a bonus action, learn whether a creature within 30 feet has any immunities, resistances or vulnerabilities, and what they are. Once per long rest, or by spending a Superiority Die.' },
    10: { name: 'Improved Combat Superiority', desc: 'Your Superiority Dice become d10s.' },
    15: { name: 'Relentless', desc: 'Once per turn, when you use a maneuver, you can roll a d8 and use it instead of spending a Superiority Die.' },
    18: { name: 'Ultimate Combat Superiority', desc: 'Your Superiority Dice become d12s.' },
  },
  'Champion': {
    3: { name: 'Improved Critical & Remarkable Athlete', desc: 'Your weapon attacks and unarmed strikes score a critical hit on a 19 or 20. You have advantage on initiative and Athletics checks, and after a critical hit you can move half your speed without provoking opportunity attacks.' },
    7: { name: 'Additional Fighting Style', desc: 'Gain a second Fighting Style feat of your choice.' },
    10: { name: 'Heroic Warrior', desc: 'In combat, if you start your turn without Heroic Inspiration, you gain it.' },
    15: { name: 'Superior Critical', desc: 'Your weapon attacks and unarmed strikes score a critical hit on an 18-20.' },
    18: { name: 'Survivor', desc: 'You have advantage on death saving throws and treat an 18-20 as a 20. At the start of each turn, if you are Bloodied and above 0 HP, regain 5 + CON modifier HP.' },
  },
  'Eldritch Knight': {
    3: { name: 'Spellcasting & War Bond', desc: 'Cast Wizard spells using INT, with third-caster spell slots, two cantrips and prepared spells from the Wizard list. Bond with up to two weapons: you cannot be disarmed of them and can summon one to your hand as a bonus action.' },
    7: { name: 'War Magic', desc: 'When you take the Attack action, you can replace one of the attacks with casting a cantrip.' },
    10: { name: 'Eldritch Strike', desc: 'When you hit a creature with a weapon, it has disadvantage on its next saving throw against a spell you cast before the end of your next turn.' },
    15: { name: 'Arcane Charge', desc: 'When you use Action Surge, you can teleport up to 30 feet to an unoccupied space you can see.' },
    18: { name: 'Improved War Magic', desc: 'When you take the Attack action, you can replace two of the attacks with casting a 1st- or 2nd-level spell that takes an action.' },
  },
  'Psi Warrior': {
    3: { name: 'Psionic Power', desc: 'Gain Psionic Energy dice (d6s, count by level). Protective Field: reaction to reduce damage to a creature within 30 feet by a die + INT. Psionic Strike: add a die + INT force damage on a hit. Telekinetic Movement: move an object or creature telekinetically.' },
    7: { name: 'Telekinetic Adept', desc: 'Psi-Powered Leap: spend a die to gain a fly speed of twice your speed for the turn. Telekinetic Thrust: a Psionic Strike can knock the target prone or push it 10 feet (STR save).' },
    10: { name: 'Guarded Mind', desc: 'You have resistance to psychic damage, and at the start of your turn you can spend a die to end the Charmed and Frightened conditions on yourself.' },
    15: { name: 'Bulwark of Force', desc: 'As a bonus action, give up to INT-modifier creatures within 30 feet half cover for 1 minute. Once per long rest, or by spending a die.' },
    18: { name: 'Telekinetic Master', desc: 'Cast Telekinesis without components using INT, and while concentrating on it you can make one weapon attack as a bonus action. Once per long rest, or by spending a die.' },
  },

  // ==================== MONK (3, 6, 11, 17) ====================
  'Warrior of Mercy': {
    3: { name: 'Hand of Harm, Hand of Healing & Implements of Mercy', desc: 'Once per turn, spend 1 Focus to add a Martial Arts die + WIS necrotic damage to an unarmed hit. Spend 1 Focus to heal a creature you touch for a Martial Arts die + WIS (it can replace a Flurry of Blows strike). Gain Insight and Medicine and the herbalism kit.' },
    6: { name: 'Physician\'s Touch', desc: 'Hand of Harm can also Poison the target until your next turn, and Hand of Healing can end the Blinded, Deafened, Paralyzed, Poisoned or Stunned condition.' },
    11: { name: 'Flurry of Healing and Harm', desc: 'When you use Flurry of Blows, you can replace each strike with Hand of Healing without spending Focus, and use Hand of Harm on a Flurry strike without spending Focus (WIS modifier times per long rest).' },
    17: { name: 'Hand of Ultimate Mercy', desc: 'Spend 5 Focus to touch a creature that died within the last 24 hours and return it to life with 4d10 + WIS HP, cured of the listed conditions. Once per long rest.' },
  },
  'Warrior of Shadow': {
    3: { name: 'Shadow Arts', desc: 'Spend 1 Focus to cast Darkness without components; you can see through it and move it. Gain 60 ft darkvision (or +60 ft), and you know the Minor Illusion cantrip (WIS).' },
    6: { name: 'Shadow Step', desc: 'While in dim light or darkness, teleport up to 60 feet to another shadowy space as a bonus action, gaining advantage on your next melee attack this turn.' },
    11: { name: 'Improved Shadow Step', desc: 'Spend 1 Focus to Shadow Step without needing to start or end in darkness, and make an unarmed strike right after teleporting.' },
    17: { name: 'Cloak of Shadows', desc: 'Spend 3 Focus to become shadow for 1 minute: invisible, able to move through creatures and objects, and Flurry of Blows costs no Focus.' },
  },
  'Warrior of the Elements': {
    3: { name: 'Elemental Attunement & Manipulate Elements', desc: 'Spend 1 Focus to gain 10 minutes of elemental power: +10 ft reach on unarmed strikes, which can deal acid, cold, fire, lightning or thunder damage and push or pull the target 10 feet. You know the Elementalism cantrip.' },
    6: { name: 'Elemental Burst', desc: 'Spend 2 Focus to create a 20-foot-radius burst within 120 feet: three Martial Arts dice of an element\'s damage, DEX save for half.' },
    11: { name: 'Stride of the Elements', desc: 'While Elemental Attunement is active you have a fly speed and swim speed equal to your speed.' },
    17: { name: 'Elemental Epitome', desc: 'While attuned: resistance to one element (changeable each turn), Step of the Wind boosts your speed and damages foes you pass, and once per turn a strike deals an extra Martial Arts die of the chosen element.' },
  },
  'Warrior of the Open Hand': {
    3: { name: 'Open Hand Technique', desc: 'When you hit with a Flurry of Blows strike, choose one: the target can\'t take reactions until its next turn, it must make a STR save or be pushed 15 feet, or a DEX save or fall prone.' },
    6: { name: 'Wholeness of Body', desc: 'As a bonus action, regain HP equal to a Martial Arts die roll + WIS modifier. WIS modifier uses per long rest.' },
    11: { name: 'Fleet Step', desc: 'When you take a bonus action other than Step of the Wind, you can also use Step of the Wind immediately after it.' },
    17: { name: 'Quivering Palm', desc: 'Spend 4 Focus when you hit with an unarmed strike to set lethal vibrations; later you can end them to force a CON save for 10d12 force damage (half on a success).' },
  },

  // ==================== PALADIN (3, 7, 15, 20) ====================
  'Oath of Devotion': {
    3: { name: 'Oath of Devotion Spells & Sacred Weapon', desc: 'Devotion oath spells are always prepared. When you take the Attack action, spend Channel Divinity to add your CHA modifier to attack rolls with a weapon for 10 minutes; it sheds light and can deal radiant damage.' },
    7: { name: 'Aura of Devotion', desc: 'You and allies in your Aura of Protection are immune to the Charmed condition; entering the aura ends it.' },
    15: { name: 'Smite of Protection', desc: 'When you cast Divine Smite, you and allies in your aura have half cover until the start of your next turn.' },
    20: { name: 'Holy Nimbus', desc: 'As a bonus action, radiate holy light for 10 minutes: advantage on saves against fiends and undead, enemies starting in the aura take CHA + proficiency radiant damage, and bright light around you. Once per long rest, or spend a 5th-level slot.' },
  },
  'Oath of Glory': {
    3: { name: 'Inspiring Smite, Oath of Glory Spells & Peerless Athlete', desc: 'After Divine Smite, spend Channel Divinity to share 2d8 + paladin level temporary HP among creatures within 30 feet. Glory oath spells are always prepared. Spend Channel Divinity for 1 hour of advantage on Athletics and Acrobatics and longer jumps.' },
    7: { name: 'Aura of Alacrity', desc: 'Your speed increases by 10 feet, and allies who start their turn in your aura, or enter it, gain +10 feet of speed until the end of their turn.' },
    15: { name: 'Glorious Defense', desc: 'When you or a creature within 10 feet is hit, use your reaction to add your CHA modifier to its AC; if the attack misses, you can make one weapon attack against the attacker. CHA modifier uses per long rest.' },
    20: { name: 'Living Legend', desc: 'As a bonus action, gain 10 minutes of legend: advantage on CHA checks, turn a missed attack into a hit once per turn, and reroll failed saves as a reaction. Once per long rest, or spend a 5th-level slot.' },
  },
  'Oath of the Ancients': {
    3: { name: 'Nature\'s Wrath & Oath of the Ancients Spells', desc: 'Spend Channel Divinity to conjure spectral vines around you; creatures of your choice within 15 feet must pass a STR save or be Restrained for 1 minute. Ancients oath spells are always prepared.' },
    7: { name: 'Aura of Warding', desc: 'You and allies in your Aura of Protection have resistance to necrotic, psychic and radiant damage.' },
    15: { name: 'Undying Sentinel', desc: 'Once per long rest, when you would drop to 0 HP without dying, drop to 1 HP instead and heal three times your paladin level. You also stop aging magically.' },
    20: { name: 'Elder Champion', desc: 'As a bonus action, become a force of nature for 1 minute: regain 10 HP each turn, cast paladin spells that take an action as a bonus action, and enemies in your aura have disadvantage on saves against your spells and Channel Divinity. Once per long rest, or spend a 5th-level slot.' },
  },
  'Oath of Vengeance': {
    3: { name: 'Oath of Vengeance Spells & Vow of Enmity', desc: 'Vengeance oath spells are always prepared. When you take the Attack action, spend Channel Divinity to gain advantage on attack rolls against one creature within 30 feet for 1 minute; you can move the vow when the target drops to 0 HP.' },
    7: { name: 'Relentless Avenger', desc: 'When you hit a creature with an opportunity attack, reduce its speed to 0 for the turn and move up to half your speed without provoking.' },
    15: { name: 'Soul of Vengeance', desc: 'When the target of your Vow of Enmity attacks, use your reaction to make a melee attack against it if it is within range.' },
    20: { name: 'Avenging Angel', desc: 'As a bonus action, gain wings (60 ft fly speed) and a frightening aura for 10 minutes; enemies that start their turn in the aura must pass a WIS save or be Frightened. Once per long rest, or spend a 5th-level slot.' },
  },

  // ==================== RANGER (3, 7, 11, 15) ====================
  'Beast Master': {
    3: { name: 'Primal Companion', desc: 'Summon a beast of the land, sea or sky that shares your initiative and acts on your turn; command it with a bonus action (or it Dodges). Its stats scale with your level, and you can restore it with a spell slot if it dies.' },
    7: { name: 'Exceptional Training', desc: 'When you command your companion, it can also Dash, Disengage, Dodge or Help as a bonus action, and its attacks can deal force damage.' },
    11: { name: 'Bestial Fury', desc: 'When you command your companion to Beast\'s Strike, it attacks twice; the first hit each turn on your Hunter\'s Mark target adds the spell\'s damage.' },
    15: { name: 'Share Spells', desc: 'When you cast a spell targeting yourself, you can also affect your companion if it is within 30 feet.' },
  },
  'Fey Wanderer': {
    3: { name: 'Dreadful Strikes, Fey Wanderer Spells & Otherworldly Glamour', desc: 'Once per turn a weapon hit deals an extra 1d4 psychic damage. Fey Wanderer spells are always prepared. Add your WIS modifier to CHA checks and gain one of Deception, Performance or Persuasion.' },
    7: { name: 'Beguiling Twist', desc: 'You have advantage on saves against Charmed and Frightened. When a creature within 120 feet succeeds on such a save, use your reaction to force another creature to save or be Charmed or Frightened for 1 minute.' },
    11: { name: 'Fey Reinforcements', desc: 'Cast Summon Fey without a material component, once without a slot per long rest, and optionally without concentration (1-minute duration).' },
    15: { name: 'Misty Wanderer', desc: 'Cast Misty Step without a slot WIS-modifier times per long rest, and bring a willing creature within 5 feet along.' },
  },
  'Gloom Stalker': {
    3: { name: 'Dread Ambusher, Gloom Stalker Spells & Umbral Sight', desc: 'Add WIS to initiative, gain +10 ft speed on your first turn, and once per turn add 2d6 psychic to a hit (WIS-modifier times per long rest). Gloom Stalker spells are always prepared. Gain 60 ft darkvision and be invisible to darkvision while in darkness.' },
    7: { name: 'Iron Mind', desc: 'Gain proficiency in Wisdom saving throws, or in Intelligence or Charisma saves if you already have it.' },
    11: { name: 'Stalker\'s Flurry', desc: 'Dread Ambusher\'s extra damage can instead let you make another attack (Sudden Strike) or frighten creatures near the target (Mass Fear).' },
    15: { name: 'Shadowy Dodge', desc: 'When a creature attacks you with advantage, use your reaction to remove the advantage, then teleport up to 30 feet to a space you can see.' },
  },
  'Hunter': {
    3: { name: 'Hunter\'s Lore & Hunter\'s Prey', desc: 'While a creature is marked by your Hunter\'s Mark, you learn its immunities, resistances and vulnerabilities. Choose Colossus Slayer (+1d8 once per turn on a wounded target) or Horde Breaker (an extra attack against a second nearby creature); you can swap on a rest.' },
    7: { name: 'Defensive Tactics', desc: 'Choose Escape the Horde (opportunity attacks against you have disadvantage) or Multiattack Defense (after a creature hits you, its other attacks this turn have disadvantage); you can swap on a rest.' },
    11: { name: 'Superior Hunter\'s Prey', desc: 'Once per turn, when you damage your Hunter\'s Mark target, you can deal the mark\'s extra damage to another creature within 30 feet of it.' },
    15: { name: 'Superior Hunter\'s Defense', desc: 'When you take damage, use your reaction to gain resistance to that damage and any other damage of that type until the end of the turn.' },
  },

  // ==================== ROGUE (3, 9, 13, 17) ====================
  'Arcane Trickster': {
    3: { name: 'Spellcasting & Mage Hand Legerdemain', desc: 'Cast Wizard spells using INT, with third-caster spell slots and prepared spells from the Wizard list. You always know Mage Hand; your hand is invisible, can pick locks and pockets, and you can control it as a bonus action.' },
    9: { name: 'Magical Ambush', desc: 'If you are hidden when you cast a spell, creatures have disadvantage on saving throws against it this turn.' },
    13: { name: 'Versatile Trickster', desc: 'When you use Cunning Strike\'s Trip option, you can also trip a creature within 5 feet of your Mage Hand.' },
    17: { name: 'Spell Thief', desc: 'When a creature casts a spell that targets you or includes you, use your reaction to force an INT save; on a failure you negate it and can steal a leveled spell you can cast for 8 hours. Once per long rest.' },
  },
  'Assassin': {
    3: { name: 'Assassinate & Assassin\'s Tools', desc: 'Advantage on initiative, and advantage on attacks against creatures that have not taken a turn yet; in the first round your Sneak Attack also adds your Rogue level as damage. Gain a disguise kit and a poisoner\'s kit.' },
    9: { name: 'Infiltration Expertise', desc: 'Unerringly mimic another person\'s speech, handwriting or both after studying it for an hour, and your Steady Aim no longer reduces your speed to 0.' },
    13: { name: 'Envenom Weapons', desc: 'When you use the Poison option of Cunning Strike, the target also takes 2d6 poison damage whether or not it saves, ignoring resistance.' },
    17: { name: 'Death Strike', desc: 'When you Sneak Attack in the first round of combat, the target must pass a CON save or take double the attack\'s damage.' },
  },
  'Soulknife': {
    3: { name: 'Psionic Power & Psychic Blades', desc: 'Gain Psionic Energy dice (d6s) to add to failed skill checks and to speak telepathically. Manifest psychic blades as a free hand weapon: 1d6 psychic (finesse, thrown 60 ft) plus a 1d4 bonus-action off-hand blade.' },
    9: { name: 'Soul Blades', desc: 'Homing Strikes: spend a die to add it to a missed psychic blade attack. Psychic Teleportation: throw a blade and spend a die to teleport to where it lands.' },
    13: { name: 'Psychic Veil', desc: 'Become Invisible for 1 hour or until you deal damage or force a save. Once per long rest, or by spending a Psionic Energy die.' },
    17: { name: 'Rend Mind', desc: 'When you Sneak Attack with a psychic blade, force a WIS save or the target is Stunned for 1 minute (save each turn). Once per long rest, or by spending three Psionic Energy dice.' },
  },
  'Thief': {
    3: { name: 'Fast Hands & Second-Story Work', desc: 'Cunning Action lets you Search, use Sleight of Hand, use thieves\' tools, or use a magic item that takes an action. You gain a climb speed equal to your speed and can jump using DEX.' },
    9: { name: 'Supreme Sneak', desc: 'Gain the Stealth Attack Cunning Strike option: spend 1d6 of Sneak Attack to avoid ending your Hide when you attack while hidden.' },
    13: { name: 'Use Magic Device', desc: 'Attune to up to four magic items, ignore class requirements on items, and roll to keep a charge when an item\'s charges are spent; you can use any spell scroll (INT check for higher-level spells).' },
    17: { name: 'Thief\'s Reflexes', desc: 'You take two turns in the first round of combat: one at your initiative and one at your initiative minus 10.' },
  },

  // ==================== SORCERER (3, 6, 14, 18) ====================
  'Aberrant Sorcery': {
    3: { name: 'Psionic Spells & Telepathic Speech', desc: 'Aberrant (psionic) spells are always prepared. As a bonus action, form a telepathic link with a creature within 30 feet for a number of minutes equal to your sorcerer level.' },
    6: { name: 'Psionic Sorcery & Psychic Defenses', desc: 'Cast your psionic spells using Sorcery Points (equal to the spell level) with no verbal or somatic components. Resistance to psychic damage and advantage on saves against Charmed and Frightened.' },
    14: { name: 'Revelation in Flesh', desc: 'Spend Sorcery Points as a bonus action to gain aberrant traits for 10 minutes: see invisible creatures, a fly speed, a swim speed with water breathing, or squeeze through 1-inch gaps.' },
    18: { name: 'Warping Implosion', desc: 'As an action, teleport up to 120 feet; creatures within 30 feet of where you left must make a STR save or take 3d10 force damage and be pulled to that spot. Once per long rest, or by spending 5 Sorcery Points.' },
  },
  'Clockwork Sorcery': {
    3: { name: 'Clockwork Spells & Restore Balance', desc: 'Clockwork spells are always prepared. As a reaction, cancel advantage or disadvantage on a d20 test made by a creature within 60 feet. CHA-modifier uses per long rest.' },
    6: { name: 'Bastion of Law', desc: 'Spend 1-5 Sorcery Points to give a creature within 30 feet that many d8s of ward; when it takes damage it can roll some of them to reduce the damage.' },
    14: { name: 'Trance of Order', desc: 'As a bonus action, enter a trance for 1 minute: attacks against you can\'t have advantage, and your d20 tests treat a roll of 9 or lower as a 10. Once per long rest, or by spending 5 Sorcery Points.' },
    18: { name: 'Clockwork Cavalcade', desc: 'Summon spirits of order in a 30-foot cube: restore up to 100 HP split among creatures inside, repair objects, and end spells of 6th level or lower on creatures you choose. Once per long rest, or by spending 7 Sorcery Points.' },
  },
  'Draconic Sorcery': {
    3: { name: 'Draconic Resilience & Draconic Spells', desc: 'HP maximum +3, then +1 more every time you gain a Sorcerer level. While not wearing armor, your base AC equals 10 + DEX modifier + CHA modifier (a shield still applies). Draconic spells are always prepared.' },
    6: { name: 'Elemental Affinity', desc: 'Choose acid, cold, fire, lightning or poison: you resist that damage type, and add your CHA modifier to one damage roll of a sorcerer spell dealing that type.' },
    14: { name: 'Dragon Wings', desc: 'As a bonus action, sprout wings for 1 hour and gain a 60 ft fly speed. Once per long rest, or by spending 3 Sorcery Points.' },
    18: { name: 'Dragon Companion', desc: 'Cast Summon Dragon once per long rest without a slot, and you can cast it without concentration (1-minute duration).' },
  },
  'Wild Magic Sorcery': {
    3: { name: 'Wild Magic Surge & Tides of Chaos', desc: 'Once per turn, after casting a sorcerer spell with a slot, roll a d20; on a 20, roll on the Wild Magic Surge table. Tides of Chaos grants advantage on one d20 test, and recharges when a surge happens or on a long rest.' },
    6: { name: 'Bend Luck', desc: 'When a creature you can see makes a d20 test, spend 1 Sorcery Point as a reaction to add or subtract 1d4 from the roll.' },
    14: { name: 'Controlled Chaos', desc: 'Whenever you roll on the Wild Magic Surge table, you can roll twice and choose either result.' },
    18: { name: 'Tamed Surge', desc: 'Once per long rest, after casting a sorcerer spell with a slot, choose any effect from the Wild Magic Surge table (except the final row) instead of rolling.' },
  },

  // ==================== WARLOCK (3, 6, 10, 14) ====================
  'Archfey Patron': {
    3: { name: 'Archfey Spells & Steps of the Fey', desc: 'Archfey spells are always prepared. Cast Misty Step without a slot CHA-modifier times per long rest; each time, you can also gain a Refreshing Step (1d10 temporary HP to a creature near you) or a Taunting Step (disadvantage on attacks against others).' },
    6: { name: 'Misty Escape', desc: 'Cast Misty Step as a reaction when you take damage, and your Steps of the Fey can also make you Invisible (Disappearing Step) or Charm or Frighten nearby creatures (Dreadful Step).' },
    10: { name: 'Beguiling Defenses', desc: 'You are immune to the Charmed condition. When a creature hits you, use your reaction to halve the damage and force a WIS save; on a failure it takes psychic damage equal to the damage you took. Once per long rest, or with a Pact Magic slot.' },
    14: { name: 'Bewitching Magic', desc: 'When you cast an enchantment or illusion spell with an action and a slot, you can also cast Misty Step as part of it without a slot.' },
  },
  'Celestial Patron': {
    3: { name: 'Celestial Spells & Healing Light', desc: 'Celestial spells are always prepared. You gain a pool of d6s (1 + warlock level); as a bonus action, spend up to CHA-modifier dice to heal a creature within 60 feet. The pool refills on a long rest.' },
    6: { name: 'Radiant Soul', desc: 'You have resistance to radiant damage, and once per turn you add your CHA modifier to one fire or radiant damage roll of a spell.' },
    10: { name: 'Celestial Resilience', desc: 'When you finish a short or long rest or use Magical Cunning, gain temporary HP equal to warlock level + CHA, and give up to five creatures half your level + CHA temporary HP.' },
    14: { name: 'Searing Vengeance', desc: 'When you or an ally within 60 feet makes a death save, the creature can instead regain half its HP and stand; enemies within 30 feet take 2d8 + CHA radiant damage and are Blinded. Once per long rest.' },
  },
  'Fiend Patron': {
    3: { name: 'Dark One\'s Blessing & Fiend Spells', desc: 'When you reduce an enemy to 0 HP, or one near you is reduced to 0 HP, gain temporary HP equal to your CHA modifier + warlock level. Fiend spells are always prepared.' },
    6: { name: 'Dark One\'s Own Luck', desc: 'When you make an ability check or saving throw, add a d10 to the roll after seeing it. CHA-modifier uses per long rest (at most once per roll).' },
    10: { name: 'Fiendish Resilience', desc: 'After a short or long rest, choose one damage type other than force; you have resistance to it until you choose another.' },
    14: { name: 'Hurl Through Hell', desc: 'Once per turn when you hit, force a CHA save; on a failure the target vanishes through the lower planes, taking 8d10 psychic damage and becoming Incapacitated until the end of your next turn. Once per long rest, or with a Pact Magic slot.' },
  },
  'Great Old One Patron': {
    3: { name: 'Awakened Mind, Great Old One Spells & Psychic Spells', desc: 'Form a telepathic link with a creature within 30 feet. Great Old One spells are always prepared. Your enchantment and illusion warlock spells can deal psychic damage and need no verbal or somatic components.' },
    6: { name: 'Clairvoyant Combatant', desc: 'When you link with a creature through Awakened Mind, force a WIS save; on a failure you have advantage on attacks against it and it has disadvantage against you for the link\'s duration. Once per short or long rest, or with a Pact Magic slot.' },
    10: { name: 'Eldritch Hex & Thought Shield', desc: 'You always have Hex prepared, and its target has disadvantage on saves of the ability you choose for the hex. Your thoughts can\'t be read, you resist psychic damage, and a creature that deals psychic damage to you takes the same amount.' },
    14: { name: 'Create Thrall', desc: 'When you cast Summon Aberration, it needs no concentration, and the aberration gains temporary HP equal to your warlock level + CHA. Its first hit each turn deals extra psychic damage to Hex targets.' },
  },

  // ==================== WIZARD (3, 6, 10, 14) ====================
  'Abjurer': {
    3: { name: 'Abjuration Savant & Arcane Ward', desc: 'Add two abjuration spells to your spellbook for free, plus one each time you gain a new spell level. When you cast an abjuration spell with a slot, create or recharge a ward with HP equal to twice your wizard level + INT that absorbs damage you take.' },
    6: { name: 'Projected Ward', desc: 'When a creature within 30 feet takes damage, use your reaction to have your Arcane Ward absorb it instead.' },
    10: { name: 'Spell Breaker', desc: 'Counterspell and Dispel Magic are always prepared; you can cast Dispel Magic as a bonus action and add your proficiency bonus to its ability check, and a failed Counterspell does not spend the slot.' },
    14: { name: 'Spell Resistance', desc: 'You have advantage on saving throws against spells and resistance to the damage of spells.' },
  },
  'Diviner': {
    3: { name: 'Divination Savant & Portent', desc: 'Add two divination spells to your spellbook for free, plus one each time you gain a new spell level. After a long rest, roll two d20s and keep them; you can replace any d20 test made by a creature you can see with one of them.' },
    6: { name: 'Expert Divination', desc: 'When you cast a divination spell using a slot of level 2 or higher, regain one expended slot of a lower level (no higher than 5th).' },
    10: { name: 'The Third Eye', desc: 'As a bonus action, gain one benefit until you are Incapacitated or take a rest: 120 ft darkvision, seeing into the Ethereal Plane, reading any language, or seeing invisible creatures.' },
    14: { name: 'Greater Portent', desc: 'Portent now gives you three d20s instead of two.' },
  },
  'Evoker': {
    3: { name: 'Evocation Savant & Potent Cantrip', desc: 'Add two evocation spells to your spellbook for free, plus one each time you gain a new spell level. When a creature succeeds on a save against your damaging cantrip or you miss with one, it still takes half the damage.' },
    6: { name: 'Sculpt Spells', desc: 'When you cast an evocation spell, choose up to 1 + spell level creatures: they automatically succeed on its save and take no damage from it.' },
    10: { name: 'Empowered Evocation', desc: 'Add your INT modifier to one damage roll of any wizard evocation spell you cast.' },
    14: { name: 'Overchannel', desc: 'When you cast a damaging wizard spell of level 1-5 with a slot, deal maximum damage. The first use per long rest is free; each further use before then deals growing necrotic damage to you.' },
  },
  'Illusionist': {
    3: { name: 'Illusion Savant & Improved Illusions', desc: 'Add two illusion spells to your spellbook for free, plus one each time you gain a new spell level. Illusion spells need no verbal components and their range grows by 60 feet; you know Minor Illusion and can create both a sound and an image with it, as a bonus action.' },
    6: { name: 'Phantasmal Creatures', desc: 'Summon Beast and Summon Fey are always prepared and can be cast as illusions; once per long rest each, you can cast one without a slot, with the summon at half HP.' },
    10: { name: 'Illusory Self', desc: 'When a creature makes an attack roll against you, use your reaction to make it miss automatically. Once per short or long rest, or by spending a slot of level 2 or higher.' },
    14: { name: 'Illusory Reality', desc: 'When you cast an illusion spell with a slot, choose one inanimate, nonmagical object in the illusion and make it real for 1 minute.' },
  },
};
