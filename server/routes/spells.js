const express = require('express');
const router = express.Router();
const Spell = require('../models/Spell');

router.get('/', async (req, res) => {
  try {
    const { level, school, class: spellClass, search, source, sourceRace } = req.query;
    const filter = {};
    if (level !== undefined) filter.level = Number(level);
    if (school) filter.school = new RegExp(school, 'i');
    if (spellClass) filter.classes = spellClass;
    if (search) filter.name = new RegExp(search, 'i');
    if (source) filter.source = source;
    if (sourceRace) filter.sourceRace = sourceRace;

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
