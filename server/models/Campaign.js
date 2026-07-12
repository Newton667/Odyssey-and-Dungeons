const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionNumber: Number,
  date: { type: Date, default: Date.now },
  summary: String,
  xpAwarded: { type: Number, default: 0 },
});

const rollLogSchema = new mongoose.Schema({
  playerName: String,
  characterName: String,
  avatarUrl: { type: String, default: '' },
  label: String,
  formula: String,
  total: Number,
  tag: { type: String, default: '' }, // ADV, DIS, CRIT, FAIL
  timestamp: { type: Date, default: Date.now },
});

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    setting: { type: String, default: '' },
    dmName: { type: String, default: '' },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
    sessions: { type: [sessionSchema], default: [] },
    notes: { type: String, default: '' },
    imageUrl: { type: String, default: '' },

    // Multiplayer
    joinCode: { type: String, unique: true, sparse: true },
    players: [{
      playerName: { type: String, required: true },
      characterId: { type: String, default: '' }, // Character _id or local id
      characterName: { type: String, default: '' },
      role: { type: String, enum: ['dm', 'player'], default: 'player' },
      joinedAt: { type: Date, default: Date.now },
    }],
    rollLog: { type: [rollLogSchema], default: [] },
  },
  { timestamps: true }
);

// Generate a random 6-char join code before saving if none exists
campaignSchema.pre('save', function (next) {
  if (!this.joinCode) {
    this.joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Campaign', campaignSchema);
