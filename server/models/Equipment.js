const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true }, // 'armor', 'weapon', 'adventuring-gear', 'tool', 'pack'
    subcategory: { type: String, default: '' }, // e.g. 'light armor', 'simple melee', 'artisan tools'
    cost: { type: String, default: '' },        // e.g. '10 gp', '5 sp'
    weight: { type: String, default: '' },      // e.g. '3 lb.'
    description: { type: String, default: '' },
    // Armor fields
    ac: { type: String, default: '' },          // e.g. '12 + Dex modifier', '16'
    strReq: { type: Number, default: 0 },       // Strength requirement
    stealthDisadv: { type: Boolean, default: false },
    // Weapon fields
    damage: { type: String, default: '' },      // e.g. '1d8'
    damageType: { type: String, default: '' },  // 'slashing', 'piercing', 'bludgeoning'
    properties: { type: [String], default: [] }, // 'finesse', 'light', 'thrown (20/60)', etc.
    // Rarity & magic
    rarity: { type: String, default: 'common' }, // 'common', 'uncommon', 'rare', 'very-rare', 'legendary', 'artifact'
    magical: { type: Boolean, default: false },
    attunement: { type: Boolean, default: false },
    bonus: { type: Number, default: 0 },        // +1, +2, +3
    // General
    quantity: { type: String, default: '' },    // For packs/bundles
  },
  { timestamps: true }
);

equipmentSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Equipment', equipmentSchema);
