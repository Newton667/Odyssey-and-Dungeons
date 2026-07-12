const mongoose = require('mongoose');

const abilityScoreSchema = new mongoose.Schema({
  strength: { type: Number, default: 10 },
  dexterity: { type: Number, default: 10 },
  constitution: { type: Number, default: 10 },
  intelligence: { type: Number, default: 10 },
  wisdom: { type: Number, default: 10 },
  charisma: { type: Number, default: 10 },
});

const characterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    race: { type: String, default: '' },
    class: { type: String, default: '' },
    subclass: { type: String, default: '' },
    level: { type: Number, default: 1, min: 1, max: 30 },
    background: { type: String, default: '' },
    alignment: { type: String, default: '' },
    experiencePoints: { type: Number, default: 0 },
    levelingMethod: { type: String, enum: ['milestone', 'xp'], default: 'milestone' },

    // Multiclassing
    classes: {
      type: [{ class: String, subclass: String, level: Number }],
      default: [],
    },

    // Physical description
    age: { type: String, default: '' },
    height: { type: String, default: '' },
    weight: { type: String, default: '' },
    eyes: { type: String, default: '' },
    hair: { type: String, default: '' },
    skin: { type: String, default: '' },

    // Feats
    feats: { type: [String], default: [] },

    // Tool proficiencies
    toolProficiencies: { type: [String], default: [] },

    // Homebrew levels 21+
    homebrewLevels: { type: Map, of: [String], default: {} },

    faith: { type: String, default: '' },
    languages: { type: [String], default: [] },

    // HP
    maxHp: { type: Number, default: 10 },
    currentHp: { type: Number, default: 10 },
    temporaryHp: { type: Number, default: 0 },

    // Core stats
    armorClass: { type: Number, default: 10 },
    initiative: { type: Number, default: 0 },
    speed: { type: Number, default: 30 },
    proficiencyBonus: { type: Number, default: 2 },

    abilityScores: { type: abilityScoreSchema, default: () => ({}) },

    // Saving throws (proficiency flags)
    savingThrowProficiencies: {
      type: [String],
      default: [],
    },

    // Skills proficiency list
    skillProficiencies: { type: [String], default: [] },
    skillExpertise: { type: [String], default: [] },

    // Heroic Inspiration
    inspiration: { type: Boolean, default: false },

    // Combat
    hitDice: { type: String, default: 'd8' },
    hitDiceRemaining: { type: Number, default: 1 },
    deathSaveSuccesses: { type: Number, default: 0 },
    deathSaveFailures: { type: Number, default: 0 },

    // Equipment & inventory
    equipment: { type: [String], default: [] },
    equippedItems: { type: [String], default: [] },
    ammo: { type: Map, of: Number, default: {} },
    gold: { type: Number, default: 0 },
    currency: {
      type: { cp: Number, sp: Number, ep: Number, gp: Number, pp: Number },
      default: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    },

    // Spellcasting
    spellcastingAbility: { type: String, default: '' },
    spellSlots: {
      type: Map,
      of: new mongoose.Schema({ total: Number, used: Number }),
      default: {},
    },
    preparedSpells: { type: [String], default: [] },

    // Features & traits
    features: { type: [String], default: [] },
    traits: { type: String, default: '' },
    ideals: { type: String, default: '' },
    bonds: { type: String, default: '' },
    flaws: { type: String, default: '' },

    notes: { type: String, default: '' },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
    avatarUrl: { type: String, default: '' },

    // Progression choices made at each level (e.g. { "3": { subclass: "Battle Master", maneuvers: [...] } })
    levelChoices: { type: Map, of: Object, default: {} },

    // Spell slot usage tracking: { "1": 0, "2": 1, ... } = number of slots used per level
    usedSpellSlots: { type: Map, of: Number, default: {} },

    // Attunement (max 3 magic items)
    attunedItems: { type: [String], default: [] },

    // Active conditions (Blinded, Poisoned, etc.)
    activeConditions: { type: [String], default: [] },

    // Custom resistances/immunities/vulnerabilities (in addition to racial/class defaults)
    customResistances: { type: [String], default: [] },
    customImmunities: { type: [String], default: [] },
    customVulnerabilities: { type: [String], default: [] },

    // Settings
    trackAmmo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Character', characterSchema);
