const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');

// List all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find().select('name setting dmName status sessions imageUrl joinCode players');
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get campaign by ID
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create campaign
router.post('/', async (req, res) => {
  try {
    const campaign = new Campaign(req.body);
    await campaign.save();
    res.status(201).json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update campaign
router.put('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add session
router.post('/:id/sessions', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    campaign.sessions.push({ ...req.body, sessionNumber: campaign.sessions.length + 1 });
    await campaign.save();
    res.status(201).json(campaign);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Multiplayer Endpoints ────────────────────────────

// Join campaign by code
router.post('/join', async (req, res) => {
  try {
    const { joinCode, playerName, characterId, characterName } = req.body;
    if (!joinCode || !playerName) return res.status(400).json({ error: 'joinCode and playerName required' });

    const campaign = await Campaign.findOne({ joinCode: joinCode.toUpperCase() });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found. Check your join code.' });

    // Check if player already in campaign
    const existing = campaign.players.find(p => p.playerName === playerName);
    if (existing) {
      // Update character info
      existing.characterId = characterId || existing.characterId;
      existing.characterName = characterName || existing.characterName;
    } else {
      campaign.players.push({ playerName, characterId: characterId || '', characterName: characterName || '', role: 'player' });
    }
    await campaign.save();
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leave campaign
router.post('/:id/leave', async (req, res) => {
  try {
    const { playerName } = req.body;
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    campaign.players = campaign.players.filter(p => p.playerName !== playerName);
    await campaign.save();
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update player's character in campaign
router.patch('/:id/player', async (req, res) => {
  try {
    const { playerName, characterId, characterName } = req.body;
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const player = campaign.players.find(p => p.playerName === playerName);
    if (!player) return res.status(404).json({ error: 'Player not found in campaign' });
    if (characterId) player.characterId = characterId;
    if (characterName) player.characterName = characterName;
    await campaign.save();
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post a roll to the shared roll log
router.post('/:id/rolls', async (req, res) => {
  try {
    const { playerName, characterName, avatarUrl, label, formula, total, tag } = req.body;
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    campaign.rollLog.push({ playerName, characterName, avatarUrl, label, formula, total, tag: tag || '' });
    // Keep last 200 rolls
    if (campaign.rollLog.length > 200) campaign.rollLog = campaign.rollLog.slice(-200);
    await campaign.save();
    res.json({ roll: campaign.rollLog[campaign.rollLog.length - 1] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get roll log (with optional since timestamp for polling)
router.get('/:id/rolls', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).select('rollLog');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const since = req.query.since ? new Date(req.query.since) : null;
    const rolls = since
      ? campaign.rollLog.filter(r => new Date(r.timestamp) > since)
      : campaign.rollLog.slice(-50); // Default: last 50
    res.json(rolls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get players + their character summaries (for polling)
router.get('/:id/players', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).select('players');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign.players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
