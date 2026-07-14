const mongoose = require('mongoose');

const spellSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    level: { type: Number, min: 0, max: 9, required: true }, // 0 = cantrip
    school: { type: String, default: '' },
    castingTime: { type: String, default: '1 action' },
    range: { type: String, default: 'Self' },
    components: { type: [String], default: [] }, // V, S, M
    materialComponent: { type: String, default: '' },
    duration: { type: String, default: 'Instantaneous' },
    concentration: { type: Boolean, default: false },
    ritual: { type: Boolean, default: false },
    description: { type: String, default: '' },
    higherLevels: { type: String, default: '' },
    classes: { type: [String], default: [] },
    // Combat fields
    attackType: { type: String, default: '' },     // 'melee' | 'ranged' | ''
    damage: { type: String, default: '' },          // base dice e.g. '1d10'
    damageType: { type: String, default: '' },      // 'fire', 'cold', etc.
    scaling: { type: String, default: '' },         // 'cantrip' = auto-scale at 5/11/17
    savingThrow: { type: String, default: '' },     // 'DEX', 'CON', 'WIS', etc.
    saveEffect: { type: String, default: '' },      // brief note on save effect
    source: { type: String, default: 'class' },    // 'class' | 'race' — where this ability comes from
    sourceRace: { type: String, default: '' },      // e.g. 'Dragonborn', 'Tiefling' — which race grants this
    // Area of effect (mirrors client/src/data/spells.json so upload-data preserves these)
    aoe: { type: Boolean, default: false },          // is this an area-of-effect spell?
    aoeShape: { type: String, default: '' },         // Sphere, Cone, Cube, Cylinder, Line, Square, Wall
    aoeSize: { type: Number, default: 0 },           // size in feet (e.g. 20 for a 20-ft-radius sphere)
    aoeDetails: { type: String, default: '' },       // extra info (e.g. '30ft long, 5ft wide' for lines)
  },
  { timestamps: true }
);

spellSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Spell', spellSchema);
