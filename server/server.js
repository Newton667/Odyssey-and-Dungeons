require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const { execSync, execFile } = require('child_process');

// One bad async handler must not take the whole server down (Node exits on an unhandled rejection).
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));

const characterRoutes = require('./routes/characters');
const campaignRoutes = require('./routes/campaigns');
const spellRoutes = require('./routes/spells');
const equipmentRoutes = require('./routes/equipment');
const homebrewRoutes = require('./routes/homebrew');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());

// Refuse cross-site state changes. cors() is open and the server listens on every interface, so
// without this any web page open in the user's browser could POST /api/pull-update (git reset
// --hard), repoint the database or overwrite characters. Browsers always send Origin on
// cross-origin POST/PUT/PATCH/DELETE. A write is allowed when:
//   - there is no Origin header (curl, scripts, the launchers), or
//   - the Origin's host equals the Host the request arrived on (Express serving client/dist on
//     3001, locally or to another machine on the LAN), or
//   - the Origin is this machine itself (localhost or one of its interface addresses). Needed for
//     dev: Vite expands the string proxy shorthand in client/vite.config.js to
//     `changeOrigin: true`, so a browser on localhost:5173 (or <LAN IP>:5173 with `vite --host`)
//     arrives here with that Origin but `Host: localhost:3001`. A page from any other site cannot
//     carry this machine's own address as its origin.
// `Origin: null` (sandboxed iframes, file://) has no host and is refused.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const isThisMachine = (hostname) => {
  const h = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost') return true;
  return Object.values(os.networkInterfaces())
    .some((addrs) => (addrs || []).some((a) => a.address.toLowerCase().split('%')[0] === h));
};
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (SAFE_METHODS.has(req.method) || origin === undefined) return next();
  let originUrl = null;
  try { originUrl = new URL(origin); } catch { /* unparsable, e.g. "null" */ }
  const host = String(req.headers.host || '').toLowerCase();
  if (originUrl && originUrl.host && (originUrl.host === host || isThisMachine(originUrl.hostname))) return next();
  return res.status(403).json({ error: 'Cross-origin request refused' });
});

app.use(express.json({ limit: '10mb' }));

// Serve built client in production (Electron or deployed)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// Serve uploaded files
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
  cb(null, allowed.test(path.extname(file.originalname)));
}});

// Upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No valid image file' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Mongoose buffers queries while disconnected, so without a DB these routes used to hang ~10 s and
// then 500. Answer immediately instead; the client already treats any non-ok as "not connected".
const requireDb = (req, res, next) => (mongoose.connection.readyState === 1
  ? next()
  : res.status(503).json({ error: 'Database not connected' }));

// Routes
app.use('/api/characters', characterRoutes);
app.use('/api/campaigns', requireDb, campaignRoutes);
app.use('/api/spells', requireDb, spellRoutes);
app.use('/api/equipment', requireDb, equipmentRoutes);
app.use('/api/homebrew', requireDb, homebrewRoutes);

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState; // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  res.json({ status: dbState === 1 ? 'ok' : 'no-db', db: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown' });
});

// Mark repo as safe for git (fixes "dubious ownership" on some systems). Only add the entry when it
// is not already listed, or every server start appends another duplicate to ~/.gitconfig.
const rootDir = path.join(__dirname, '..');
try {
  const safePath = rootDir.replace(/\\/g, '/');
  let listed = [];
  // --get-all exits 1 when safe.directory is not set at all.
  try { listed = execSync('git config --global --get-all safe.directory', { stdio: 'pipe' }).toString().split(/\r?\n/); } catch { /* none yet */ }
  if (!listed.some((line) => line.trim() === safePath)) {
    execSync(`git config --global --add safe.directory "${safePath}"`, { stdio: 'pipe' });
  }
} catch { /* ignore */ }

const git = (args, timeout = 15000) => execSync(`git ${args}`, { cwd: rootDir, timeout, stdio: 'pipe' }).toString().trim();

// Compare HEAD with origin/main (already fetched). An update exists only when HEAD is strictly
// BEHIND: `git reset --hard origin/main` on a HEAD that is ahead or has diverged would silently
// drop local commits that were never pushed.
function updateState() {
  const local = git('rev-parse HEAD');
  const remote = git('rev-parse origin/main');
  if (local === remote) return { local, remote, behind: false };
  let isAncestor = true;
  try {
    execSync('git merge-base --is-ancestor HEAD origin/main', { cwd: rootDir, timeout: 15000, stdio: 'pipe' });
  } catch (err) {
    if (err.status !== 1) throw err; // 1 = "not an ancestor"; anything else is a real git error
    isAncestor = false;
  }
  const behind = isAncestor && Number(git('rev-list --count HEAD..origin/main')) > 0;
  return {
    local,
    remote,
    behind,
    note: behind ? undefined : 'This folder has local commits that are not on origin/main, so no update is offered.',
  };
}

// Check for updates from GitHub
app.get('/api/check-update', (req, res) => {
  try {
    git('fetch origin main', 10000);
    const { local, remote, behind, note } = updateState();
    res.json({ updateAvailable: behind, local: local.slice(0, 7), remote: remote.slice(0, 7), ...(note ? { note } : {}) });
  } catch (err) {
    res.json({ updateAvailable: false, error: 'Could not check for updates: ' + (err.message || 'unknown error') });
  }
});

// Pull latest update from GitHub
app.post('/api/pull-update', async (req, res) => {
  try {
    git('fetch origin main', 30000);
    const { behind, note } = updateState();
    if (!behind) {
      return res.status(409).json({ ok: false, error: note || 'Already up to date.' });
    }
    execSync('git reset --hard origin/main', { cwd: rootDir, timeout: 15000, stdio: 'pipe' });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
  // Dependencies go through scripts/ensure-deps.js, which owns installs (platform marker, wipe of a
  // foreign tree, real exit codes). Async so the server keeps answering while npm runs.
  execFile(process.execPath, [path.join(rootDir, 'scripts', 'ensure-deps.js')], {
    cwd: rootDir,
    timeout: 10 * 60 * 1000,
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  }, (err, stdout, stderr) => {
    const output = `${stdout || ''}${stderr || ''}`.trim();
    if (err) {
      const reason = err.killed ? 'timed out' : (typeof err.code === 'number' ? `exit ${err.code}` : err.message);
      console.error('Update: dependency install failed:', reason);
      return res.status(500).json({ ok: false, error: `Code updated, but installing dependencies failed (${reason}). Run the launcher again to finish.`, output });
    }
    res.json({ ok: true, message: 'Updated! Please restart the app.' });
  });
});

// Upload local data to database
app.post('/api/config/upload-data', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(400).json({ error: 'Database not connected' });
  }
  try {
    const { type } = req.body; // 'equipment', 'spells', or 'both'
    const dataDir = path.join(__dirname, '..', 'client', 'src', 'data');
    const results = {};

    if (type === 'equipment' || type === 'both') {
      const equipData = JSON.parse(fs.readFileSync(path.join(dataDir, 'equipment.json'), 'utf8'));
      const Equipment = require('./models/Equipment');
      await Equipment.deleteMany({});
      // Strip local IDs
      const cleaned = equipData.map(({ _id, ...rest }) => rest);
      await Equipment.insertMany(cleaned);
      results.equipment = cleaned.length;
    }

    if (type === 'spells' || type === 'both') {
      const spellData = JSON.parse(fs.readFileSync(path.join(dataDir, 'spells.json'), 'utf8'));
      const Spell = require('./models/Spell');
      await Spell.deleteMany({});
      const cleaned = spellData.map(({ _id, ...rest }) => rest);
      await Spell.insertMany(cleaned);
      results.spells = cleaned.length;
    }

    res.json({ status: 'ok', ...results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update .env file and reconnect to MongoDB.
// The new URI is tested on a separate connection FIRST; .env and the live connection are only
// touched once it has connected, so a typo can never replace a working configuration.
app.post('/api/config/database', async (req, res) => {
  try {
    const { mongoUri } = req.body || {};
    if (typeof mongoUri !== 'string' || !/^mongodb(\+srv)?:\/\//.test(mongoUri) || /[\r\n]/.test(mongoUri)) {
      return res.status(400).json({ error: 'Invalid MongoDB URI' });
    }

    let test;
    try {
      test = mongoose.createConnection(mongoUri, { serverSelectionTimeoutMS: 8000 });
      await test.asPromise();
    } catch (err) {
      console.error('New MongoDB URI failed to connect:', err.message);
      return res.status(400).json({ error: `Connection failed: ${err.message}` });
    } finally {
      if (test) await test.close().catch(() => {});
    }

    // Write to .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    // Replace or add MONGODB_URI. Function replacer: a string replacement would interpret `$&`,
    // `$$`, `$1` … inside the password and corrupt the file.
    if (/^MONGODB_URI=/m.test(envContent)) {
      envContent = envContent.replace(/^MONGODB_URI=.*$/gm, () => `MONGODB_URI=${mongoUri}`);
    } else {
      envContent += `\nMONGODB_URI=${mongoUri}`;
    }
    // Ensure PORT is present
    if (!envContent.includes('PORT=')) {
      envContent += `\nPORT=${PORT}`;
    }
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    // Update process env
    process.env.MONGODB_URI = mongoUri;
    // Disconnect existing connection and reconnect
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);
    console.log('Reconnected to MongoDB Atlas with new URI');
    res.json({ status: 'ok', message: 'Database connection updated and connected' });
  } catch (err) {
    console.error('Failed to update database config:', err.message);
    res.status(500).json({ error: `Connection failed: ${err.message}` });
  }
});

// Get current connection status
app.get('/api/config/database', (req, res) => {
  const uri = process.env.MONGODB_URI || '';
  // Mask the password in the URI for display
  const masked = uri.replace(/:([^@]+)@/, ':****@');
  res.json({ uri: masked, connected: mongoose.connection.readyState === 1 });
});

// Catch-all: serve React app for client-side routing
if (fs.existsSync(clientDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start server — connect to MongoDB if URI exists, otherwise start without DB
const startServer = () => {
  const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use — is OND already running?`);
    } else {
      console.error('Server failed to start:', err.message);
    }
    process.exit(1);
  });
};

if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB Atlas');
      startServer();
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
      console.log('Starting server without database — configure via Settings page');
      startServer();
    });
} else {
  console.log('No MONGODB_URI set — starting server without database. Configure via Settings page.');
  startServer();
}
