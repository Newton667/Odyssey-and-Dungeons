const mongoose = require('mongoose');

const homebrewSchema = new mongoose.Schema(
  {
    // Type: 'spell', 'weapon', 'armor', 'item', 'ammo'
    type: { type: String, required: true, enum: ['spell', 'weapon', 'armor', 'item', 'ammo'] },
    createdBy: { type: String, default: '' }, // player name

    // Shared fields
    name: { type: String, required: true },
    description: { type: String, default: '' },
    rarity: { type: String, default: 'common' }, // common, uncommon, rare, very-rare, legendary, artifact
    homebrew: { type: Boolean, default: true },

    // Equipment fields (weapon, armor, item, ammo)
    category: { type: String, default: '' }, // weapon, armor, gear, tools, ammo
    subcategory: { type: String, default: '' }, // Simple Melee, Martial Ranged, Light, etc.
    cost: { type: String, default: '' },
    weight: { type: String, default: '' },
    damage: { type: String, default: '' },
    damageType: { type: String, default: '' },
    properties: { type: [String], default: [] },
    ac: { type: String, default: '' },
    magical: { type: Boolean, default: false },
    bonus: { type: Number, default: 0 },
    ammoType: { type: String, default: '' },
    stackSize: { type: Number, default: 1 },
    requiresAttunement: { type: Boolean, default: false },

    // Spell fields
    level: { type: Number, default: 0 },
    school: { type: String, default: '' },
    castingTime: { type: String, default: '' },
    range: { type: String, default: '' },
    components: { type: [String], default: [] },
    materialComponent: { type: String, default: '' },
    duration: { type: String, default: '' },
    concentration: { type: Boolean, default: false },
    ritual: { type: Boolean, default: false },
    classes: { type: [String], default: [] },
    attackType: { type: String, default: '' },
    savingThrow: { type: String, default: '' },
    saveEffect: { type: String, default: '' },
    higherLevels: { type: String, default: '' },
    scaling: { type: String, default: '' },

    // Share code (auto-generated unique ID for sharing)
    shareCode: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

// Generate share code before saving
homebrewSchema.pre('save', function (next) {
  if (!this.shareCode) {
    // Generate a base64-ish code from the document data
    const raw = `${this.type}:${this.name}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    this.shareCode = Buffer.from(raw).toString('base64').replace(/[/+=]/g, '').slice(0, 12).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Homebrew', homebrewSchema);
