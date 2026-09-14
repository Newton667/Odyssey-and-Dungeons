const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Equipment = require('../models/Equipment');

// Query strings are user input: escape them before building a RegExp, or `+1 Longsword` throws
// "Nothing to repeat" (500) and a crafted pattern could be arbitrarily slow.
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A malformed ObjectId makes findById throw a CastError (500); it simply names nothing.
router.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return res.status(404).json({ error: 'Item not found' });
  next();
});

router.get('/', async (req, res) => {
  try {
    const { category, subcategory, search, rarity } = req.query;
    const filter = {};
    if (category) filter.category = String(category);
    if (subcategory) filter.subcategory = new RegExp(escapeRegex(subcategory), 'i');
    if (search) filter.name = new RegExp(escapeRegex(search), 'i');
    if (rarity) filter.rarity = String(rarity);

    const items = await Equipment.find(filter).sort({ category: 1, subcategory: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Equipment.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const item = new Equipment(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await Equipment.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
