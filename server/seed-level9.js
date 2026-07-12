require('dotenv').config();
const mongoose = require('mongoose');
const Spell = require('./models/Spell');

const SPELLS = [
  {
    "name": "Astral Projection",
    "level": 9,
    "school": "Necromancy",
    "castingTime": "1 hour",
    "range": "10 feet",
    "components": [
      "V",
      "S",
      "M"
    ],
    "materialComponent": "for each creature, one jacinth worth at least 1,000 gp and one silver bar worth at least 100 gp, consumed",
    "duration": "Special",
    "concentration": false,
    "ritual": false,
    "description": "You and up to eight willing creatures project your astral bodies into the Astral Plane. Your material body is unconscious in suspended animation. Your astral form resembles your mortal form, with a silvery cord tethering you to your body. If the cord is cut you return to your body. Your astral form can travel the Astral Plane and pass through portals to other planes.",
    "higherLevels": "",
    "classes": [
      "Cleric",
      "Warlock",
      "Wizard"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "",
    "saveEffect": ""
  },
  {
    "name": "Blade of Disaster",
    "level": 9,
    "school": "Conjuration",
    "castingTime": "1 bonus action",
    "range": "60 feet",
    "components": [
      "V",
      "S"
    ],
    "materialComponent": "",
    "duration": "Concentration, up to 1 minute",
    "concentration": true,
    "ritual": false,
    "description": "You create a blade-shaped planar rift about 3 feet long. When you cast this spell, you can make up to two melee spell attacks with the blade. On a hit, the target takes 4d12 force damage. Crits on 18+, dealing an extra 8d12 force damage. As a bonus action you can move the blade up to 30 feet and attack again.",
    "higherLevels": "",
    "classes": [
      "Sorcerer",
      "Warlock",
      "Wizard"
    ],
    "attackType": "melee",
    "damage": "4d12",
    "damageType": "force",
    "scaling": "",
    "savingThrow": "",
    "saveEffect": ""
  },
  {
    "name": "Foresight",
    "level": 9,
    "school": "Divination",
    "castingTime": "1 minute",
    "range": "Touch",
    "components": [
      "V",
      "S",
      "M"
    ],
    "materialComponent": "a hummingbird feather",
    "duration": "8 hours",
    "concentration": false,
    "ritual": false,
    "description": "You touch a willing creature and bestow a limited ability to see into the immediate future. For the duration, the target cannot be surprised and has advantage on attack rolls, ability checks, and saving throws. Other creatures have disadvantage on attack rolls against the target.",
    "higherLevels": "",
    "classes": [
      "Bard",
      "Druid",
      "Warlock",
      "Wizard"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "",
    "saveEffect": ""
  },
  {
    "name": "Gate",
    "level": 9,
    "school": "Conjuration",
    "castingTime": "1 action",
    "range": "60 feet",
    "components": [
      "V",
      "S",
      "M"
    ],
    "materialComponent": "a diamond worth at least 5,000 gp",
    "duration": "Concentration, up to 1 minute",
    "concentration": true,
    "ritual": false,
    "description": "You conjure a portal linking an unoccupied space you can see within range to a precise location on a different plane of existence. The portal is a circular opening, 5 to 20 feet in diameter. You can speak a specific creature name to draw it through the portal to you.",
    "higherLevels": "",
    "classes": [
      "Cleric",
      "Sorcerer",
      "Wizard"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "",
    "saveEffect": ""
  },
  {
    "name": "Imprisonment",
    "level": 9,
    "school": "Abjuration",
    "castingTime": "1 minute",
    "range": "30 feet",
    "components": [
      "V",
      "S",
      "M"
    ],
    "materialComponent": "a vellum depiction of the target, and a special component worth at least 500 gp per Hit Die",
    "duration": "Until dispelled",
    "concentration": false,
    "ritual": false,
    "description": "You create a magical restraint to hold a creature. The target must succeed on a Wisdom saving throw or be bound. Choose one form: Burial, Chaining, Hedged Prison, Minimus Containment, or Slumber. The target does not need to breathe, eat, or drink and does not age. Only dispel magic cast as a 9th-level spell can end it.",
    "higherLevels": "",
    "classes": [
      "Warlock",
      "Wizard"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "WIS",
    "saveEffect": "negates"
  },
  {
    "name": "Invulnerability",
    "level": 9,
    "school": "Abjuration",
    "castingTime": "1 action",
    "range": "Self",
    "components": [
      "V",
      "S",
      "M"
    ],
    "materialComponent": "a small piece of adamantine worth at least 500 gp, consumed",
    "duration": "Concentration, up to 10 minutes",
    "concentration": true,
    "ritual": false,
    "description": "You are immune to all damage until the spell ends.",
    "higherLevels": "",
    "classes": [
      "Wizard"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "",
    "saveEffect": ""
  },
  {
    "name": "Mass Heal",
    "level": 9,
    "school": "Evocation",
    "castingTime": "1 action",
    "range": "60 feet",
    "components": [
      "V",
      "S"
    ],
    "materialComponent": "",
    "duration": "Instantaneous",
    "concentration": false,
    "ritual": false,
    "description": "You restore up to 700 hit points, divided as you choose among any number of creatures that you can see within range. Creatures healed are also cured of all diseases and any effect making them blinded or deafened. No effect on undead or constructs.",
    "higherLevels": "",
    "classes": [
      "Cleric"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "",
    "saveEffect": ""
  },
  {
    "name": "Mass Polymorph",
    "level": 9,
    "school": "Transmutation",
    "castingTime": "1 action",
    "range": "120 feet",
    "components": [
      "V",
      "S",
      "M"
    ],
    "materialComponent": "a caterpillar cocoon",
    "duration": "Concentration, up to 1 hour",
    "concentration": true,
    "ritual": false,
    "description": "You transform up to ten creatures that you can see within range. An unwilling target must succeed on a Wisdom saving throw. Each target assumes a beast form of your choice with CR equal to or less than the target's CR or half its level. Game statistics are replaced. A target reverts when it has no more temporary hit points or is dismissed.",
    "higherLevels": "",
    "classes": [
      "Bard",
      "Sorcerer",
      "Wizard"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "WIS",
    "saveEffect": "negates"
  },
  {
    "name": "Meteor Swarm",
    "level": 9,
    "school": "Evocation",
    "castingTime": "1 action",
    "range": "1 mile",
    "components": [
      "V",
      "S"
    ],
    "materialComponent": "",
    "duration": "Instantaneous",
    "concentration": false,
    "ritual": false,
    "description": "Blazing orbs plummet to four points you can see within range. Each creature in a 40-foot-radius sphere must make a Dexterity saving throw. A creature takes 20d6 fire damage and 20d6 bludgeoning damage on a failed save, or half on a success. A creature in multiple bursts is affected only once.",
    "higherLevels": "",
    "classes": [
      "Sorcerer",
      "Wizard"
    ],
    "attackType": "",
    "damage": "20d6",
    "damageType": "fire",
    "scaling": "",
    "savingThrow": "DEX",
    "saveEffect": "half damage"
  },
  {
    "name": "Power Word Heal",
    "level": 9,
    "school": "Evocation",
    "castingTime": "1 action",
    "range": "60 feet",
    "components": [
      "V",
      "S"
    ],
    "materialComponent": "",
    "duration": "Instantaneous",
    "concentration": false,
    "ritual": false,
    "description": "A wave of healing energy washes over a creature you can see within range. The target regains all its hit points. If charmed, frightened, paralyzed, or stunned, the condition ends. If prone, it can use its reaction to stand up. No effect on undead or constructs.",
    "higherLevels": "",
    "classes": [
      "Bard",
      "Cleric"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "",
    "saveEffect": ""
  },
  {
    "name": "Power Word Kill",
    "level": 9,
    "school": "Enchantment",
    "castingTime": "1 action",
    "range": "60 feet",
    "components": [
      "V"
    ],
    "materialComponent": "",
    "duration": "Instantaneous",
    "concentration": false,
    "ritual": false,
    "description": "You utter a word of power that can compel one creature you can see within range to perish instantly. If the creature has 100 hit points or fewer, it is slain. Otherwise, the spell has no effect.",
    "higherLevels": "",
    "classes": [
      "Bard",
      "Sorcerer",
      "Warlock",
      "Wizard"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "",
    "saveEffect": ""
  },
  {
    "name": "Prismatic Wall",
    "level": 9,
    "school": "Abjuration",
    "castingTime": "1 action",
    "range": "60 feet",
    "components": [
      "V",
      "S"
    ],
    "materialComponent": "",
    "duration": "10 minutes",
    "concentration": false,
    "ritual": false,
    "description": "A shimmering multicolored wall up to 90 feet long, 30 feet high, 1 foot thick, or a sphere up to 30 feet in diameter. Seven layers each with a different color and effect: red (10d6 fire), orange (10d6 acid), yellow (10d6 lightning), green (10d6 poison), blue (10d6 cold), indigo (restrained/petrified), violet (blinded/transported). Each layer destroyed by specific means.",
    "higherLevels": "",
    "classes": [
      "Wizard"
    ],
    "attackType": "",
    "damage": "10d6",
    "damageType": "",
    "scaling": "",
    "savingThrow": "DEX",
    "saveEffect": "half damage (varies by layer)"
  },
  {
    "name": "Psychic Scream",
    "level": 9,
    "school": "Enchantment",
    "castingTime": "1 action",
    "range": "90 feet",
    "components": [
      "S"
    ],
    "materialComponent": "",
    "duration": "Instantaneous",
    "concentration": false,
    "ritual": false,
    "description": "You unleash the power of your mind to blast the intellect of up to ten creatures of your choice within range. Creatures with Intelligence 2 or lower are unaffected. Each target must make an Intelligence saving throw. On a failed save, 14d6 psychic damage and stunned. On a success, half damage and not stunned.",
    "higherLevels": "",
    "classes": [
      "Bard",
      "Sorcerer",
      "Warlock",
      "Wizard"
    ],
    "attackType": "",
    "damage": "14d6",
    "damageType": "psychic",
    "scaling": "",
    "savingThrow": "INT",
    "saveEffect": "half damage, not stunned"
  },
  {
    "name": "Ravenous Void",
    "level": 9,
    "school": "Evocation",
    "castingTime": "1 action",
    "range": "1000 feet",
    "components": [
      "V",
      "S",
      "M"
    ],
    "materialComponent": "a small nine-pointed star made of iron",
    "duration": "Concentration, up to 1 minute",
    "concentration": true,
    "ritual": false,
    "description": "You create a 20-foot-radius sphere of destructive gravitational force. The sphere and 100 feet around it are difficult terrain. Nonmagical objects inside are destroyed. Creatures within 100 feet must make a STR save or be pulled toward the center. A creature entering the sphere takes 5d10 force damage and is restrained.",
    "higherLevels": "",
    "classes": [
      "Wizard"
    ],
    "attackType": "",
    "damage": "5d10",
    "damageType": "force",
    "scaling": "",
    "savingThrow": "STR",
    "saveEffect": "not pulled"
  },
  {
    "name": "Shapechange",
    "level": 9,
    "school": "Transmutation",
    "castingTime": "1 action",
    "range": "Self",
    "components": [
      "V",
      "S",
      "M"
    ],
    "materialComponent": "a jade circlet worth at least 1,500 gp",
    "duration": "Concentration, up to 1 hour",
    "concentration": true,
    "ritual": false,
    "description": "You assume the form of a different creature for the duration. The new form can be any creature with CR equal to your level or lower (not construct or undead). Your game statistics are replaced, but you retain alignment, INT, WIS, CHA, skill proficiencies, and class features. You can change form again as an action.",
    "higherLevels": "",
    "classes": [
      "Druid",
      "Wizard"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "",
    "saveEffect": ""
  },
  {
    "name": "Storm of Vengeance",
    "level": 9,
    "school": "Conjuration",
    "castingTime": "1 action",
    "range": "Sight",
    "components": [
      "V",
      "S"
    ],
    "materialComponent": "",
    "duration": "Concentration, up to 1 minute",
    "concentration": true,
    "ritual": false,
    "description": "A churning storm cloud forms in a 360-foot radius. Round 1: 2d6 thunder (CON save). Round 2: 1d6 acid rain. Round 3: six lightning bolts (10d6 lightning, DEX save). Round 4: 2d6 bludgeoning hail. Round 5-10: difficult terrain, heavily obscured, 1d6 cold, ranged attacks impossible.",
    "higherLevels": "",
    "classes": [
      "Druid"
    ],
    "attackType": "",
    "damage": "2d6",
    "damageType": "thunder",
    "scaling": "",
    "savingThrow": "CON",
    "saveEffect": "half damage"
  },
  {
    "name": "Time Ravage",
    "level": 9,
    "school": "Necromancy",
    "castingTime": "1 action",
    "range": "90 feet",
    "components": [
      "V",
      "S",
      "M"
    ],
    "materialComponent": "an hourglass filled with diamond dust worth at least 5,000 gp, consumed",
    "duration": "Instantaneous",
    "concentration": false,
    "ritual": false,
    "description": "You target a creature you can see within range. The target must make a Constitution saving throw, taking 10d12 necrotic damage on a failed save, or half on a success. On a failed save, the target also ages rapidly, gaining disadvantage on attacks, checks, and saves, with halved walking speed. Only wish or greater restoration at 9th level can reverse it.",
    "higherLevels": "",
    "classes": [
      "Wizard"
    ],
    "attackType": "",
    "damage": "10d12",
    "damageType": "necrotic",
    "scaling": "",
    "savingThrow": "CON",
    "saveEffect": "half damage, no aging"
  },
  {
    "name": "Time Stop",
    "level": 9,
    "school": "Transmutation",
    "castingTime": "1 action",
    "range": "Self",
    "components": [
      "V"
    ],
    "materialComponent": "",
    "duration": "Instantaneous",
    "concentration": false,
    "ritual": false,
    "description": "You briefly stop the flow of time for everyone but yourself. You take 1d4 + 1 turns in a row. The spell ends if you affect another creature or an object worn or carried by someone else, or if you move more than 1,000 feet from the casting location.",
    "higherLevels": "",
    "classes": [
      "Sorcerer",
      "Wizard"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "",
    "saveEffect": ""
  },
  {
    "name": "True Polymorph",
    "level": 9,
    "school": "Transmutation",
    "castingTime": "1 action",
    "range": "30 feet",
    "components": [
      "V",
      "S",
      "M"
    ],
    "materialComponent": "a drop of mercury, a dollop of gum arabic, and a wisp of smoke",
    "duration": "Concentration, up to 1 hour",
    "concentration": true,
    "ritual": false,
    "description": "Transform a creature into a different creature, a creature into an object, or an object into a creature. If you concentrate for the full duration, the transformation is permanent until dispelled. Creature into Creature: new form CR must equal or be less than target. Object into Creature: CR 9 or lower. An unwilling creature can make a Wisdom saving throw to resist.",
    "higherLevels": "",
    "classes": [
      "Bard",
      "Warlock",
      "Wizard"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "WIS",
    "saveEffect": "negates (unwilling)"
  },
  {
    "name": "True Resurrection",
    "level": 9,
    "school": "Necromancy",
    "castingTime": "1 hour",
    "range": "Touch",
    "components": [
      "V",
      "S",
      "M"
    ],
    "materialComponent": "holy water and diamonds worth at least 25,000 gp, consumed",
    "duration": "Instantaneous",
    "concentration": false,
    "ritual": false,
    "description": "You restore a creature that has been gone for no longer than 200 years to life with all its hit points if its soul is free and willing. This spell closes all wounds, neutralizes poison, cures diseases, lifts curses, and replaces missing organs and limbs. It can even provide a new body if the original no longer exists.",
    "higherLevels": "",
    "classes": [
      "Cleric",
      "Druid"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "",
    "saveEffect": ""
  },
  {
    "name": "Weird",
    "level": 9,
    "school": "Illusion",
    "castingTime": "1 action",
    "range": "120 feet",
    "components": [
      "V",
      "S"
    ],
    "materialComponent": "",
    "duration": "Concentration, up to 1 minute",
    "concentration": true,
    "ritual": false,
    "description": "Drawing on the deepest fears of a group of creatures, you create illusory creatures in their minds. Each creature in a 30-foot-radius sphere must make a Wisdom saving throw. On a fail, the creature becomes frightened for the duration. At the end of each of its turns, it must succeed on a WIS save or take 4d10 psychic damage. On a success, the spell ends for that creature.",
    "higherLevels": "",
    "classes": [
      "Wizard"
    ],
    "attackType": "",
    "damage": "4d10",
    "damageType": "psychic",
    "scaling": "",
    "savingThrow": "WIS",
    "saveEffect": "negates"
  },
  {
    "name": "Wish",
    "level": 9,
    "school": "Conjuration",
    "castingTime": "1 action",
    "range": "Self",
    "components": [
      "V"
    ],
    "materialComponent": "",
    "duration": "Instantaneous",
    "concentration": false,
    "ritual": false,
    "description": "The mightiest spell a mortal can cast. The basic use duplicates any spell of 8th level or lower without requirements. Alternatively: create an object worth up to 25,000 gp, heal up to twenty creatures fully, grant resistance or immunity to damage types, or undo a recent event. Using wish beyond duplication weakens you: Strength drops to 3 for 2d4 days, and 33% chance you can never cast wish again.",
    "higherLevels": "",
    "classes": [
      "Sorcerer",
      "Wizard"
    ],
    "attackType": "",
    "damage": "",
    "damageType": "",
    "scaling": "",
    "savingThrow": "",
    "saveEffect": ""
  }
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  for (const sp of SPELLS) await Spell.findOneAndUpdate({ name: sp.name, level: sp.level }, sp, { upsert: true });
  console.log('Seeded ' + SPELLS.length + ' level-9 spells');
  process.exit(0);
})();
