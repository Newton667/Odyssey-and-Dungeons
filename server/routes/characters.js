const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const LOCAL_DIR = path.resolve(__dirname, '..', 'data', 'characters');

// Ensure folder exists
if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });

// Character ids are randomUUID() output here, or `local-<timestamp>-<base36>` from the client.
// Express decodes %2F in route params, so an unchecked id like `..%2F..%2Fpackage` would reach
// arbitrary .json files outside LOCAL_DIR. Reject anything else outright.
const ID_RE = /^[A-Za-z0-9_-]+$/;

router.param('id', (req, res, next, id) => {
  if (!ID_RE.test(id)) return res.status(400).json({ error: 'Invalid id' });
  next();
});

// ── helpers ──────────────────────────────────────────────
// Second line of defence behind router.param: resolve the path and refuse anything that does not
// land directly inside LOCAL_DIR.
function charFile(id) {
  const file = typeof id === 'string' && ID_RE.test(id) ? path.resolve(LOCAL_DIR, `${id}.json`) : '';
  if (!file.startsWith(LOCAL_DIR + path.sep)) {
    throw Object.assign(new Error('Invalid id'), { status: 400 });
  }
  return file;
}

function readLocal(id) {
  const file = charFile(id);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeLocal(id, data) {
  fs.writeFileSync(charFile(id), JSON.stringify(data, null, 2));
}

function deleteLocal(id) {
  const file = charFile(id);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function listLocal() {
  if (!fs.existsSync(LOCAL_DIR)) return [];
  return fs.readdirSync(LOCAL_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(LOCAL_DIR, f), 'utf8')); }
      catch { return null; }
    })
    .filter(Boolean);
}

// ── GET all characters ───────────────────────────────────
router.get('/', (req, res) => {
  try {
    res.json(listLocal());
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── GET single character ─────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const char = readLocal(req.params.id);
    if (!char) return res.status(404).json({ error: 'Character not found' });
    res.json(char);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── POST create character ────────────────────────────────
router.post('/', (req, res) => {
  try {
    const id = randomUUID();
    // _id after the spread: a body _id must never desync the stored id from the filename.
    const character = {
      ...req.body,
      _id: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeLocal(id, character);
    res.status(201).json(character);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// ── PUT update character ─────────────────────────────────
router.put('/:id', (req, res) => {
  try {
    const existing = readLocal(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Character not found' });
    const updated = { ...existing, ...req.body, _id: req.params.id, updatedAt: new Date().toISOString() };
    writeLocal(req.params.id, updated);
    res.json(updated);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// ── PATCH update HP ──────────────────────────────────────
router.patch('/:id/hp', (req, res) => {
  try {
    const { currentHp, temporaryHp } = req.body;
    const char = readLocal(req.params.id);
    if (!char) return res.status(404).json({ error: 'Character not found' });
    if (currentHp !== undefined) char.currentHp = currentHp;
    if (temporaryHp !== undefined) char.temporaryHp = temporaryHp;
    char.updatedAt = new Date().toISOString();
    writeLocal(req.params.id, char);
    res.json({ currentHp: char.currentHp, temporaryHp: char.temporaryHp, maxHp: char.maxHp });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

// ── DELETE character ─────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const char = readLocal(req.params.id);
    if (!char) return res.status(404).json({ error: 'Character not found' });
    deleteLocal(req.params.id);
    res.json({ message: 'Character deleted' });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
