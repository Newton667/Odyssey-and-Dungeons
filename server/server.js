require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const characterRoutes = require('./routes/characters');
const campaignRoutes = require('./routes/campaigns');
const spellRoutes = require('./routes/spells');
const equipmentRoutes = require('./routes/equipment');
const homebrewRoutes = require('./routes/homebrew');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
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

// Routes
app.use('/api/characters', characterRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/spells', spellRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/homebrew', homebrewRoutes);

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState; // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  res.json({ status: dbState === 1 ? 'ok' : 'no-db', db: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown' });
});

// Mark repo as safe for git (fixes "dubious ownership" on some systems)
const { execSync } = require('child_process');
const rootDir = path.join(__dirname, '..');
try { execSync(`git config --global --add safe.directory "${rootDir.replace(/\\/g, '/')}"`, { stdio: 'pipe' }); } catch { /* ignore */ }

// Check for updates from GitHub
app.get('/api/check-update', (req, res) => {
  try {
    execSync('git fetch origin main', { cwd: rootDir, timeout: 10000, stdio: 'pipe' });
    const local = execSync('git rev-parse HEAD', { cwd: rootDir, stdio: 'pipe' }).toString().trim();
    const remote = execSync('git rev-parse origin/main', { cwd: rootDir, stdio: 'pipe' }).toString().trim();
    res.json({ updateAvailable: local !== remote, local: local.slice(0, 7), remote: remote.slice(0, 7) });
  } catch (err) {
    res.json({ updateAvailable: false, error: 'Could not check for updates: ' + (err.message || 'unknown error') });
  }
});

// Pull latest update from GitHub
app.post('/api/pull-update', (req, res) => {
  try {
    execSync('git reset --hard origin/main', { cwd: rootDir, timeout: 15000, stdio: 'pipe' });
    execSync('git pull origin main', { cwd: rootDir, timeout: 30000, stdio: 'pipe' });
    // Reinstall dependencies
    try { execSync('npm install --silent', { cwd: path.join(rootDir, 'server'), timeout: 60000, stdio: 'pipe' }); } catch { /* ignore */ }
    try { execSync('npm install --silent', { cwd: path.join(rootDir, 'client'), timeout: 60000, stdio: 'pipe' }); } catch { /* ignore */ }
    res.json({ ok: true, message: 'Updated! Please restart the app.' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
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

// Update .env file and reconnect to MongoDB
app.post('/api/config/database', async (req, res) => {
  const { mongoUri } = req.body;
  if (!mongoUri || !mongoUri.startsWith('mongodb')) {
    return res.status(400).json({ error: 'Invalid MongoDB URI' });
  }
  try {
    // Write to .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    // Replace or add MONGODB_URI
    if (envContent.includes('MONGODB_URI=')) {
      envContent = envContent.replace(/MONGODB_URI=.*/g, `MONGODB_URI=${mongoUri}`);
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
    if (mongoose.connection.readyState === 1) {
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
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
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
