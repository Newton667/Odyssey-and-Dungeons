const express = require('express');
const router = express.Router();
const Homebrew = require('../models/Homebrew');

// List all homebrew items (with optional type filter)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };
    const items = await Homebrew.find(filter).sort({ updatedAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single homebrew item
router.get('/:id', async (req, res) => {
  try {
    const item = await Homebrew.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create homebrew item
router.post('/', async (req, res) => {
  try {
    const item = new Homebrew({ ...req.body, homebrew: true });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update homebrew item
router.put('/:id', async (req, res) => {
  try {
    const item = await Homebrew.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete homebrew item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Homebrew.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Share System ─────────────────────────────────────

// Export: get share string for an item (base64 encoded JSON)
router.get('/:id/export', async (req, res) => {
  try {
    const item = await Homebrew.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'Not found' });
    // Strip DB fields, keep only the content
    const { _id, __v, createdAt, updatedAt, shareCode, ...data } = item;
    const shareString = Buffer.from(JSON.stringify(data)).toString('base64');
    res.json({ shareCode: item.shareCode, shareString });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import: create item from share string
router.post('/import', async (req, res) => {
  try {
    const { shareString } = req.body;
    if (!shareString) return res.status(400).json({ error: 'No share string provided' });
    let data;
    try {
      data = JSON.parse(Buffer.from(shareString, 'base64').toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid share string' });
    }
    if (!data.name || !data.type) return res.status(400).json({ error: 'Invalid homebrew data — missing name or type' });
    // Create as new item (new shareCode will be generated)
    const item = new Homebrew({ ...data, homebrew: true });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
