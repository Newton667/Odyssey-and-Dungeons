const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Spell = require('../models/Spell');

// Query strings are user input: escape them before building a RegExp, or `+1 Longsword` throws
// "Nothing to repeat" (500) and a crafted pattern could be arbitrarily slow.
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A malformed ObjectId makes findById throw a CastError (500); it simply names nothing.
router.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return res.status(404).json({ error: 'Spell not found' });
  next();
});

router.get('/', async (req, res) => {
  try {
    const { level, school, class: spellClass, search, source, sourceRace } = req.query;
    const filter = {};
    if (level !== undefined) filter.level = Number(level);
    if (school) filter.school = new RegExp(escapeRegex(school), 'i');
    if (spellClass) filter.classes = String(spellClass);
    if (search) filter.name = new RegExp(escapeRegex(search), 'i');
    if (source) filter.source = String(source);
    if (sourceRace) filter.sourceRace = String(sourceRace);

    const spells = await Spell.find(filter).sort({ level: 1, name: 1 });
    res.json(spells);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const spell = await Spell.findById(req.params.id);
    if (!spell) return res.status(404).json({ error: 'Spell not found' });
    res.json(spell);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const spell = new Spell(req.body);
    await spell.save();
    res.status(201).json(spell);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const spell = await Spell.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!spell) return res.status(404).json({ error: 'Spell not found' });
    res.json(spell);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const spell = await Spell.findByIdAndDelete(req.params.id);
    if (!spell) return res.status(404).json({ error: 'Spell not found' });
    res.json({ message: 'Spell deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
