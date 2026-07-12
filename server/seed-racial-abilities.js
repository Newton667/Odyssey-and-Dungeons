require('dotenv').config();
const mongoose = require('mongoose');
const Spell = require('./models/Spell');

const racialAbilities = [
  // ── Dragonborn Breath Weapons ──
  {
    name: 'Breath Weapon (Black — Acid)',
    level: 0, school: 'Racial', castingTime: '1 action', range: '5×30ft line',
    components: [], duration: 'Instantaneous',
    description: 'You exhale a line of destructive acid. Each creature in a 5-by-30-foot line must make a DEX saving throw (DC = 8 + CON mod + proficiency bonus). On a failed save, the creature takes 2d6 acid damage, or half as much on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level. You can use this once per short or long rest.',
    damage: '2d6', damageType: 'acid', savingThrow: 'DEX', saveEffect: 'Half damage',
    classes: [], source: 'race', sourceRace: 'Dragonborn (Black)',
  },
  {
    name: 'Breath Weapon (Blue — Lightning)',
    level: 0, school: 'Racial', castingTime: '1 action', range: '5×30ft line',
    components: [], duration: 'Instantaneous',
    description: 'You exhale a line of crackling lightning. Each creature in a 5-by-30-foot line must make a DEX saving throw (DC = 8 + CON mod + proficiency bonus). On a failed save, the creature takes 2d6 lightning damage, or half as much on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level. You can use this once per short or long rest.',
    damage: '2d6', damageType: 'lightning', savingThrow: 'DEX', saveEffect: 'Half damage',
    classes: [], source: 'race', sourceRace: 'Dragonborn (Blue)',
  },
  {
    name: 'Breath Weapon (Brass — Fire)',
    level: 0, school: 'Racial', castingTime: '1 action', range: '5×30ft line',
    components: [], duration: 'Instantaneous',
    description: 'You exhale a line of scorching flame. Each creature in a 5-by-30-foot line must make a DEX saving throw (DC = 8 + CON mod + proficiency bonus). On a failed save, the creature takes 2d6 fire damage, or half as much on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level. You can use this once per short or long rest.',
    damage: '2d6', damageType: 'fire', savingThrow: 'DEX', saveEffect: 'Half damage',
    classes: [], source: 'race', sourceRace: 'Dragonborn (Brass)',
  },
  {
    name: 'Breath Weapon (Bronze — Lightning)',
    level: 0, school: 'Racial', castingTime: '1 action', range: '5×30ft line',
    components: [], duration: 'Instantaneous',
    description: 'You exhale a line of repelling lightning. Each creature in a 5-by-30-foot line must make a DEX saving throw (DC = 8 + CON mod + proficiency bonus). On a failed save, the creature takes 2d6 lightning damage, or half as much on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level. You can use this once per short or long rest.',
    damage: '2d6', damageType: 'lightning', savingThrow: 'DEX', saveEffect: 'Half damage',
    classes: [], source: 'race', sourceRace: 'Dragonborn (Bronze)',
  },
  {
    name: 'Breath Weapon (Copper — Acid)',
    level: 0, school: 'Racial', castingTime: '1 action', range: '5×30ft line',
    components: [], duration: 'Instantaneous',
    description: 'You exhale a line of corrosive acid. Each creature in a 5-by-30-foot line must make a DEX saving throw (DC = 8 + CON mod + proficiency bonus). On a failed save, the creature takes 2d6 acid damage, or half as much on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level. You can use this once per short or long rest.',
    damage: '2d6', damageType: 'acid', savingThrow: 'DEX', saveEffect: 'Half damage',
    classes: [], source: 'race', sourceRace: 'Dragonborn (Copper)',
  },
  {
    name: 'Breath Weapon (Gold — Fire)',
    level: 0, school: 'Racial', castingTime: '1 action', range: '15ft cone',
    components: [], duration: 'Instantaneous',
    description: 'You exhale a cone of searing flame. Each creature in a 15-foot cone must make a DEX saving throw (DC = 8 + CON mod + proficiency bonus). On a failed save, the creature takes 2d6 fire damage, or half as much on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level. You can use this once per short or long rest.',
    damage: '2d6', damageType: 'fire', savingThrow: 'DEX', saveEffect: 'Half damage',
    classes: [], source: 'race', sourceRace: 'Dragonborn (Gold)',
  },
  {
    name: 'Breath Weapon (Green — Poison)',
    level: 0, school: 'Racial', castingTime: '1 action', range: '15ft cone',
    components: [], duration: 'Instantaneous',
    description: 'You exhale a cloud of noxious poison gas. Each creature in a 15-foot cone must make a CON saving throw (DC = 8 + CON mod + proficiency bonus). On a failed save, the creature takes 2d6 poison damage, or half as much on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level. You can use this once per short or long rest.',
    damage: '2d6', damageType: 'poison', savingThrow: 'CON', saveEffect: 'Half damage',
    classes: [], source: 'race', sourceRace: 'Dragonborn (Green)',
  },
  {
    name: 'Breath Weapon (Red — Fire)',
    level: 0, school: 'Racial', castingTime: '1 action', range: '15ft cone',
    components: [], duration: 'Instantaneous',
    description: 'You exhale a devastating cone of fire. Each creature in a 15-foot cone must make a DEX saving throw (DC = 8 + CON mod + proficiency bonus). On a failed save, the creature takes 2d6 fire damage, or half as much on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level. You can use this once per short or long rest.',
    damage: '2d6', damageType: 'fire', savingThrow: 'DEX', saveEffect: 'Half damage',
    classes: [], source: 'race', sourceRace: 'Dragonborn (Red)',
  },
  {
    name: 'Breath Weapon (Silver — Cold)',
    level: 0, school: 'Racial', castingTime: '1 action', range: '15ft cone',
    components: [], duration: 'Instantaneous',
    description: 'You exhale a blast of frigid air. Each creature in a 15-foot cone must make a CON saving throw (DC = 8 + CON mod + proficiency bonus). On a failed save, the creature takes 2d6 cold damage, or half as much on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level. You can use this once per short or long rest.',
    damage: '2d6', damageType: 'cold', savingThrow: 'CON', saveEffect: 'Half damage',
    classes: [], source: 'race', sourceRace: 'Dragonborn (Silver)',
  },
  {
    name: 'Breath Weapon (White — Cold)',
    level: 0, school: 'Racial', castingTime: '1 action', range: '15ft cone',
    components: [], duration: 'Instantaneous',
    description: 'You exhale a blast of freezing breath. Each creature in a 15-foot cone must make a CON saving throw (DC = 8 + CON mod + proficiency bonus). On a failed save, the creature takes 2d6 cold damage, or half as much on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level. You can use this once per short or long rest.',
    damage: '2d6', damageType: 'cold', savingThrow: 'CON', saveEffect: 'Half damage',
    classes: [], source: 'race', sourceRace: 'Dragonborn (White)',
  },

  // ── Tiefling — Infernal Legacy ──
  {
    name: 'Infernal Legacy: Thaumaturgy',
    level: 0, school: 'Racial (Transmutation)', castingTime: '1 action', range: '30 feet',
    components: ['V'], duration: 'Up to 1 minute',
    description: 'Innate racial cantrip. You manifest a minor wonder within range: your voice booms up to three times as loud, you cause flames to flicker/brighten/dim/change color, you cause harmless tremors, you create an instantaneous sound, you cause a door or window to fly open or slam shut, or you alter the appearance of your eyes. You can have up to three effects active at once.',
    classes: [], source: 'race', sourceRace: 'Tiefling',
  },
  {
    name: 'Infernal Legacy: Hellish Rebuke',
    level: 1, school: 'Racial (Evocation)', castingTime: '1 reaction', range: '60 feet',
    components: ['V', 'S'], duration: 'Instantaneous',
    description: 'Racial ability available at 3rd level (1/long rest, cast as 2nd-level). When a creature you can see within 60 feet damages you, you point your finger and the creature is momentarily surrounded by hellish flames. The creature must make a DEX saving throw, taking 3d10 fire damage on a failed save or half on success.',
    damage: '3d10', damageType: 'fire', savingThrow: 'DEX', saveEffect: 'Half damage',
    classes: [], source: 'race', sourceRace: 'Tiefling',
  },
  {
    name: 'Infernal Legacy: Darkness',
    level: 2, school: 'Racial (Evocation)', castingTime: '1 action', range: '60 feet',
    components: ['V', 'M'], duration: 'Up to 10 minutes', concentration: true,
    description: 'Racial ability available at 5th level (1/long rest). Magical darkness spreads from a point you choose within range to fill a 15-foot-radius sphere. Darkvision cannot see through it. Non-magical light cannot illuminate it. If overlapping with light from a spell of 2nd level or lower, the light spell is dispelled.',
    classes: [], source: 'race', sourceRace: 'Tiefling',
  },

  // ── Drow — Drow Magic ──
  {
    name: 'Drow Magic: Dancing Lights',
    level: 0, school: 'Racial (Evocation)', castingTime: '1 action', range: '120 feet',
    components: ['V', 'S', 'M'], duration: 'Up to 1 minute', concentration: true,
    description: 'Innate racial cantrip. You create up to four torch-sized lights within range, making them appear as torches, lanterns, or glowing orbs that hover in the air. Each light sheds dim light in a 10-foot radius. You can combine the four lights into one glowing humanoid form of Medium size.',
    classes: [], source: 'race', sourceRace: 'Elf (Dark Elf/Drow)',
  },
  {
    name: 'Drow Magic: Faerie Fire',
    level: 1, school: 'Racial (Evocation)', castingTime: '1 action', range: '60 feet',
    components: ['V'], duration: 'Up to 1 minute', concentration: true,
    description: 'Racial ability available at 3rd level (1/long rest). Each object in a 20-foot cube within range is outlined in blue, green, or violet light. Any creature in the area must succeed on a DEX saving throw or be outlined. Affected creatures and objects shed dim light in a 10-foot radius. Attack rolls against affected creatures have advantage. An affected creature or object can\'t benefit from being invisible.',
    savingThrow: 'DEX', saveEffect: 'Negates outline',
    classes: [], source: 'race', sourceRace: 'Elf (Dark Elf/Drow)',
  },
  {
    name: 'Drow Magic: Darkness',
    level: 2, school: 'Racial (Evocation)', castingTime: '1 action', range: '60 feet',
    components: ['V', 'M'], duration: 'Up to 10 minutes', concentration: true,
    description: 'Racial ability available at 5th level (1/long rest). Magical darkness spreads from a point you choose within range to fill a 15-foot-radius sphere. Darkvision cannot see through it. Non-magical light cannot illuminate it.',
    classes: [], source: 'race', sourceRace: 'Elf (Dark Elf/Drow)',
  },

  // ── Forest Gnome ──
  {
    name: 'Natural Illusionist: Minor Illusion',
    level: 0, school: 'Racial (Illusion)', castingTime: '1 action', range: '30 feet',
    components: ['S', 'M'], duration: '1 minute',
    description: 'Innate racial cantrip. You create a sound or an image of an object within range that lasts for the duration. The illusion ends if you dismiss it or cast the spell again. If you create a sound, its volume can range from a whisper to a scream. If you create an image of an object, it must be no larger than a 5-foot cube. The image can\'t create sound, light, smell, or any other sensory effect. Physical interaction reveals it as an illusion.',
    classes: [], source: 'race', sourceRace: 'Gnome (Forest)',
  },

  // ── Aasimar ──
  {
    name: 'Light Bearer: Light',
    level: 0, school: 'Racial (Evocation)', castingTime: '1 action', range: 'Touch',
    components: ['V', 'M'], duration: '1 hour',
    description: 'Innate racial cantrip. You touch one object no larger than 10 feet in any dimension. The object sheds bright light in a 20-foot radius and dim light for an additional 20 feet. The light can be colored as you like. Covering the object blocks the light. The spell ends if you cast it again or dismiss it.',
    classes: [], source: 'race', sourceRace: 'Aasimar',
  },
  {
    name: 'Healing Hands',
    level: 0, school: 'Racial', castingTime: '1 action', range: 'Touch',
    components: [], duration: 'Instantaneous',
    description: 'Racial ability (1/long rest). As an action, you can touch a creature and cause it to regain hit points equal to your level. Once you use this trait, you can\'t use it again until you finish a long rest.',
    damage: '', damageType: 'healing',
    classes: [], source: 'race', sourceRace: 'Aasimar',
  },

  // ── Firbolg ──
  {
    name: 'Firbolg Magic: Detect Magic',
    level: 1, school: 'Racial (Divination)', castingTime: '1 action', range: 'Self',
    components: ['V', 'S'], duration: 'Up to 10 minutes', concentration: true,
    description: 'Racial ability (1/short rest). For the duration, you sense the presence of magic within 30 feet of you. If you sense magic in this way, you can use your action to see a faint aura around any visible creature or object in the area that bears magic, and you learn its school of magic.',
    classes: [], source: 'race', sourceRace: 'Firbolg',
  },
  {
    name: 'Firbolg Magic: Disguise Self',
    level: 1, school: 'Racial (Illusion)', castingTime: '1 action', range: 'Self',
    components: ['V', 'S'], duration: '1 hour',
    description: 'Racial ability (1/short rest). You make yourself — including your clothing, armor, weapons, and other belongings — look different until the spell ends. You can seem up to 1 foot shorter or taller and appear thin, fat, or in between. You can\'t change your body type. The changes wrought by this spell fail to hold up to physical inspection. As a Firbolg, you can also appear up to 3 feet shorter to blend in with other humanoids.',
    classes: [], source: 'race', sourceRace: 'Firbolg',
  },
  {
    name: 'Hidden Step',
    level: 0, school: 'Racial', castingTime: '1 bonus action', range: 'Self',
    components: [], duration: 'Until start of next turn',
    description: 'Racial ability (1/short rest). As a bonus action, you can magically turn invisible until the start of your next turn or until you attack, make a damage roll, or force someone to make a saving throw.',
    classes: [], source: 'race', sourceRace: 'Firbolg',
  },

  // ── Genasi ──
  {
    name: 'Mingle with Wind: Levitate',
    level: 2, school: 'Racial (Transmutation)', castingTime: '1 action', range: 'Self',
    components: ['V', 'S', 'M'], duration: 'Up to 10 minutes', concentration: true,
    description: 'Racial ability for Air Genasi (1/long rest). You rise vertically up to 20 feet and remain suspended there for the duration. You can move only by pushing or pulling against fixed objects or surfaces within reach, which allows you to move as if you were climbing. You can change altitude by up to 20 feet in either direction on your turn.',
    classes: [], source: 'race', sourceRace: 'Genasi (Air)',
  },
  {
    name: 'Merge with Stone: Pass Without Trace',
    level: 2, school: 'Racial (Abjuration)', castingTime: '1 action', range: 'Self',
    components: ['V', 'S', 'M'], duration: 'Up to 1 hour', concentration: true,
    description: 'Racial ability for Earth Genasi (1/long rest). A veil of shadows and silence radiates from you, masking you and your companions from detection. For the duration, each creature you choose within 30 feet of you has a +10 bonus to Stealth checks and can\'t be tracked except by magical means.',
    classes: [], source: 'race', sourceRace: 'Genasi (Earth)',
  },
  {
    name: 'Reach to the Blaze: Produce Flame',
    level: 0, school: 'Racial (Conjuration)', castingTime: '1 action', range: 'Self',
    components: ['V', 'S'], duration: '10 minutes',
    description: 'Innate racial cantrip for Fire Genasi. A flickering flame appears in your hand. The flame remains for the duration and harms neither you nor your equipment. It sheds bright light in a 10-foot radius and dim light for an additional 10 feet. You can hurl the flame at a creature within 30 feet — make a ranged spell attack. On a hit, the target takes 1d8 fire damage. The damage increases at higher levels.',
    damage: '1d8', damageType: 'fire', attackType: 'ranged', scaling: 'cantrip',
    classes: [], source: 'race', sourceRace: 'Genasi (Fire)',
  },
  {
    name: 'Reach to the Blaze: Burning Hands',
    level: 1, school: 'Racial (Evocation)', castingTime: '1 action', range: 'Self (15ft cone)',
    components: ['V', 'S'], duration: 'Instantaneous',
    description: 'Racial ability for Fire Genasi available at 3rd level (1/long rest). A thin sheet of flames shoots forth from your outstretched fingertips. Each creature in a 15-foot cone must make a DEX saving throw. A creature takes 3d6 fire damage on a failed save, or half as much on a successful one.',
    damage: '3d6', damageType: 'fire', savingThrow: 'DEX', saveEffect: 'Half damage',
    classes: [], source: 'race', sourceRace: 'Genasi (Fire)',
  },
  {
    name: 'Call to the Wave: Shape Water',
    level: 0, school: 'Racial (Transmutation)', castingTime: '1 action', range: '30 feet',
    components: ['S'], duration: 'Instantaneous or 1 hour',
    description: 'Innate racial cantrip for Water Genasi. You choose an area of water that you can see within range and that fits within a 5-foot cube. You can instantaneously move or otherwise change the flow of the water, cause the water to form simple shapes, change the color or opacity, or freeze the water (for 1 hour).',
    classes: [], source: 'race', sourceRace: 'Genasi (Water)',
  },
  {
    name: 'Call to the Wave: Create or Destroy Water',
    level: 1, school: 'Racial (Transmutation)', castingTime: '1 action', range: '30 feet',
    components: ['V', 'S', 'M'], duration: 'Instantaneous',
    description: 'Racial ability for Water Genasi available at 3rd level (1/long rest). You either create up to 10 gallons of clean water within range in an open container, or create rain in a 30-foot cube within range, extinguishing exposed flames. Alternatively, you can destroy up to 10 gallons of water in an open container, or destroy fog in a 30-foot cube.',
    classes: [], source: 'race', sourceRace: 'Genasi (Water)',
  },

  // ── Triton ──
  {
    name: 'Control Air and Water: Fog Cloud',
    level: 1, school: 'Racial (Conjuration)', castingTime: '1 action', range: '120 feet',
    components: ['V', 'S'], duration: 'Up to 1 hour', concentration: true,
    description: 'Racial ability for Triton (1/long rest). You create a 20-foot-radius sphere of fog centered on a point within range. The sphere spreads around corners, and its area is heavily obscured. It lasts for the duration or until a wind of moderate or greater speed disperses it.',
    classes: [], source: 'race', sourceRace: 'Triton',
  },
  {
    name: 'Control Air and Water: Gust of Wind',
    level: 2, school: 'Racial (Evocation)', castingTime: '1 action', range: 'Self (60ft line)',
    components: ['V', 'S', 'M'], duration: 'Up to 1 minute', concentration: true,
    description: 'Racial ability for Triton available at 3rd level (1/long rest). A line of strong wind 60 feet long and 10 feet wide blasts from you in a direction you choose. Each creature that starts its turn in the line must succeed on a STR saving throw or be pushed 15 feet away from you. Any creature in the line must spend 2 feet of movement for every 1 foot it moves toward you.',
    savingThrow: 'STR', saveEffect: 'Negates push',
    classes: [], source: 'race', sourceRace: 'Triton',
  },
  {
    name: 'Control Air and Water: Wall of Water',
    level: 3, school: 'Racial (Evocation)', castingTime: '1 action', range: '60 feet',
    components: ['V', 'S', 'M'], duration: 'Up to 10 minutes', concentration: true,
    description: 'Racial ability for Triton available at 5th level (1/long rest). You create a wall of water on the ground at a point you can see within range. The wall is up to 30 feet long, 10 feet high, and 1 foot thick. The wall grants three-quarters cover to creatures behind it. Ranged weapon attacks passing through take disadvantage. Fire damage is halved passing through.',
    classes: [], source: 'race', sourceRace: 'Triton',
  },

  // ── Yuan-ti Pureblood ──
  {
    name: 'Yuan-ti Innate: Poison Spray',
    level: 0, school: 'Racial (Conjuration)', castingTime: '1 action', range: '10 feet',
    components: ['V', 'S'], duration: 'Instantaneous',
    description: 'Innate racial cantrip. You extend your hand toward a creature you can see within range and project a puff of noxious gas. The creature must succeed on a CON saving throw or take 1d12 poison damage. The damage increases at higher levels.',
    damage: '1d12', damageType: 'poison', savingThrow: 'CON', saveEffect: 'Negates', scaling: 'cantrip',
    classes: [], source: 'race', sourceRace: 'Yuan-ti Pureblood',
  },
  {
    name: 'Yuan-ti Innate: Animal Friendship (Snakes)',
    level: 1, school: 'Racial (Enchantment)', castingTime: '1 action', range: '30 feet',
    components: ['V', 'S', 'M'], duration: '24 hours',
    description: 'Racial ability (at will, snakes only). You convince a snake that you mean it no harm. Choose a snake that you can see within range. It must succeed on a WIS saving throw or be charmed by you for the spell\'s duration. If you or one of your companions harms the target, the spell ends.',
    savingThrow: 'WIS', saveEffect: 'Negates charm',
    classes: [], source: 'race', sourceRace: 'Yuan-ti Pureblood',
  },
  {
    name: 'Yuan-ti Innate: Suggestion',
    level: 2, school: 'Racial (Enchantment)', castingTime: '1 action', range: '30 feet',
    components: ['V', 'M'], duration: 'Up to 8 hours', concentration: true,
    description: 'Racial ability available at 3rd level (1/long rest). You suggest a course of activity (limited to a sentence or two) and magically influence a creature you can see within range that can hear and understand you. The suggestion must be worded to sound reasonable. The target must make a WIS saving throw or pursue the course of action you described.',
    savingThrow: 'WIS', saveEffect: 'Negates',
    classes: [], source: 'race', sourceRace: 'Yuan-ti Pureblood',
  },

  // ── Aarakocra ──
  {
    name: 'Wind Caller: Gust of Wind',
    level: 2, school: 'Racial (Evocation)', castingTime: '1 action', range: 'Self (60ft line)',
    components: ['V', 'S', 'M'], duration: 'Up to 1 minute', concentration: true,
    description: 'Racial ability for Aarakocra available at 3rd level (1/long rest). A line of strong wind 60 feet long and 10 feet wide blasts from you. Each creature that starts its turn in the line must succeed on a STR saving throw or be pushed 15 feet away.',
    savingThrow: 'STR', saveEffect: 'Negates push',
    classes: [], source: 'race', sourceRace: 'Aarakocra',
  },

  // ── Aasimar Transformations ──
  {
    name: 'Radiant Soul (Protector)',
    level: 0, school: 'Racial', castingTime: '1 action', range: 'Self',
    components: [], duration: '1 minute',
    description: 'Racial ability available at 3rd level (1/long rest). You unleash divine energy, causing two luminous, incorporeal wings to sprout from your back. Your flying speed equals your walking speed. Once on each of your turns, you can deal extra radiant damage equal to your level to one target when you deal damage to it with an attack or a spell.',
    damageType: 'radiant',
    classes: [], source: 'race', sourceRace: 'Aasimar (Protector)',
  },
  {
    name: 'Radiant Consumption (Scourge)',
    level: 0, school: 'Racial', castingTime: '1 action', range: 'Self (10ft radius)',
    components: [], duration: '1 minute',
    description: 'Racial ability available at 3rd level (1/long rest). You unleash searing light that radiates from you, pouring out of your eyes and mouth. At the end of each of your turns, each creature within 10 feet of you takes radiant damage equal to half your level (rounded up). In addition, once on each of your turns, you can deal extra radiant damage equal to your level to one target when you deal damage with an attack or spell. You also take the half-level radiant damage yourself.',
    damageType: 'radiant',
    classes: [], source: 'race', sourceRace: 'Aasimar (Scourge)',
  },
  {
    name: 'Necrotic Shroud (Fallen)',
    level: 0, school: 'Racial', castingTime: '1 action', range: 'Self (10ft radius)',
    components: [], duration: '1 minute',
    description: 'Racial ability available at 3rd level (1/long rest). You unleash shadowy, flightless wings and an aura of menace. Any creature within 10 feet of you that can see you must succeed on a CHA saving throw (DC = 8 + proficiency + CHA mod) or become frightened of you until the end of your next turn. Once on each of your turns, you can deal extra necrotic damage equal to your level to one target when you deal damage with an attack or spell.',
    damageType: 'necrotic', savingThrow: 'CHA', saveEffect: 'Negates frighten',
    classes: [], source: 'race', sourceRace: 'Aasimar (Fallen)',
  },

  // ── Goblin ──
  {
    name: 'Fury of the Small',
    level: 0, school: 'Racial', castingTime: 'Free (on hit)', range: 'Self',
    components: [], duration: 'Instantaneous',
    description: 'Racial ability (1/short rest). When you damage a creature with an attack or a spell and the creature\'s size is larger than yours, you can cause the attack or spell to deal extra damage to the creature. The extra damage equals your level.',
    classes: [], source: 'race', sourceRace: 'Goblin',
  },

  // ── Bugbear ──
  {
    name: 'Surprise Attack',
    level: 0, school: 'Racial', castingTime: 'Free (on hit)', range: 'Self',
    components: [], duration: 'Instantaneous',
    description: 'Racial ability. If you surprise a creature and hit it with an attack on your first turn in combat, the attack deals an extra 2d6 damage to it.',
    damage: '2d6',
    classes: [], source: 'race', sourceRace: 'Bugbear',
  },

  // ── Lizardfolk ──
  {
    name: 'Hungry Jaws',
    level: 0, school: 'Racial', castingTime: '1 bonus action', range: 'Melee (5ft)',
    components: [], duration: 'Instantaneous',
    description: 'Racial ability (1/short rest). As a bonus action, you can make a special bite attack. If the attack hits, it deals its normal damage, and you gain temporary hit points equal to your CON modifier (minimum 1).',
    damage: '1d6', damageType: 'piercing', attackType: 'melee',
    classes: [], source: 'race', sourceRace: 'Lizardfolk',
  },

  // ── Goliath ──
  {
    name: "Stone's Endurance",
    level: 0, school: 'Racial', castingTime: '1 reaction', range: 'Self',
    components: [], duration: 'Instantaneous',
    description: 'Racial ability (1/short rest). When you take damage, you can use your reaction to roll a d12 and add your CON modifier. Reduce the damage by that total.',
    damage: '1d12', damageType: 'healing',
    classes: [], source: 'race', sourceRace: 'Goliath',
  },

  // ── Kobold ──
  {
    name: 'Draconic Cry',
    level: 0, school: 'Racial', castingTime: '1 bonus action', range: 'Self (10ft)',
    components: [], duration: 'Until start of next turn',
    description: 'Racial ability (proficiency bonus uses/long rest). As a bonus action, you let out a cry at your enemies within 10 feet of you. Until the start of your next turn, you and your allies have advantage on attack rolls against any of those enemies who could hear you.',
    classes: [], source: 'race', sourceRace: 'Kobold',
  },

  // ── Shifter ──
  {
    name: 'Shifting',
    level: 0, school: 'Racial', castingTime: '1 bonus action', range: 'Self',
    components: [], duration: '1 minute',
    description: 'Racial ability (1/short rest). As a bonus action, you can assume a more bestial appearance for 1 minute. You gain temporary hit points equal to your level + your CON modifier (minimum 1 temporary HP). The specific benefits depend on your subrace: Beasthide (+1 AC), Longtooth (bite attack as bonus action, 1d6+STR piercing), Swiftstride (+10ft speed, no opportunity attacks when you move), Wildhunt (advantage on WIS checks, no creature within 30ft can have advantage on attacks against you).',
    classes: [], source: 'race', sourceRace: 'Shifter',
  },

  // ── Tabaxi ──
  {
    name: 'Feline Agility',
    level: 0, school: 'Racial', castingTime: 'Free (on move)', range: 'Self',
    components: [], duration: '1 turn',
    description: 'Racial ability. When you move on your turn in combat, you can double your speed until the end of the turn. Once you use this trait, you can\'t use it again until you move 0 feet on one of your turns.',
    classes: [], source: 'race', sourceRace: 'Tabaxi',
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Seeding racial abilities...');

  let added = 0, skipped = 0;
  for (const ability of racialAbilities) {
    const exists = await Spell.findOne({ name: ability.name, source: 'race' });
    if (exists) {
      skipped++;
      continue;
    }
    await Spell.create(ability);
    added++;
    console.log(`  + ${ability.name}`);
  }

  console.log(`\nDone: ${added} added, ${skipped} skipped (already exist).`);
  console.log(`Total racial abilities in DB: ${await Spell.countDocuments({ source: 'race' })}`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
