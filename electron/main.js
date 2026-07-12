const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');

let splashWindow;
let browserOpened = false;

function getBasePath() {
  return app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
}

function log(msg) {
  console.log(msg);
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.executeJavaScript(
      `document.getElementById('log').innerHTML+=${JSON.stringify(msg+'<br>')};document.getElementById('log').scrollTop=99999;`
    ).catch(() => {});
  }
}

function setStatus(msg) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.executeJavaScript(
      `document.getElementById('status').textContent=${JSON.stringify(msg)};`
    ).catch(() => {});
  }
}

function waitForServer(port) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      if (attempts > 60) { reject(new Error('Server did not start in 30s')); return; }
      const req = http.get('http://localhost:' + port + '/api/health', (res) => {
        if (res.statusCode === 200) resolve();
        else setTimeout(check, 500);
      });
      req.on('error', () => setTimeout(check, 500));
      req.setTimeout(2000, () => { req.destroy(); setTimeout(check, 500); });
    };
    check();
  });
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 360,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    backgroundColor: '#1a1209',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const html = `<!DOCTYPE html><html><head><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#1a1209; color:#e8d5b0; font-family:Segoe UI,sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; padding:30px; }
h1 { color:#c9a227; font-size:36px; letter-spacing:6px; margin-bottom:4px; }
.sub { color:#a08060; font-size:12px; letter-spacing:3px; margin-bottom:30px; text-transform:uppercase; }
#status { color:#c9a227; font-size:14px; font-weight:600; margin-bottom:14px; }
#log { width:100%; flex:1; overflow-y:auto; font-size:11px; color:#a08060; background:#0d0800; border:1px solid #5c3d1e; border-radius:6px; padding:8px; font-family:monospace; }
.bar { width:70%; height:3px; background:#5c3d1e; border-radius:2px; margin-bottom:20px; overflow:hidden; }
.bar-fill { height:100%; background:#c9a227; border-radius:2px; animation:load 1.5s ease-in-out infinite; }
@keyframes load { 0%{width:0} 50%{width:80%} 100%{width:100%} }
</style></head><body>
<h1>OND</h1>
<div class="sub">Odyssey and Dragons</div>
<div class="bar"><div class="bar-fill"></div></div>
<div id="status">Starting up...</div>
<div id="log"></div>
</body></html>`;

  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
}

app.whenReady().then(async () => {
  createSplash();

  const base = getBasePath();
  const serverDir = path.join(base, 'server');

  try {
    // Set working directory and env for server
    process.chdir(serverDir);
    process.env.PORT = process.env.PORT || '3001';
    process.env.NODE_ENV = 'production';

    // Load dotenv from server dir
    setStatus('Loading configuration...');
    log('Loading .env...');
    const dotenvPath = path.join(serverDir, '.env');
    const fs = require('fs');
    if (!fs.existsSync(dotenvPath)) {
      fs.writeFileSync(dotenvPath, 'PORT=3001\n');
      log('Created default .env');
    }

    // Require server directly (runs in Electron's Node.js)
    setStatus('Starting server...');
    log('Starting Express server in-process...');
    require(path.join(serverDir, 'server.js'));

    // Wait for it to be ready
    setStatus('Waiting for server...');
    const port = process.env.PORT || 3001;
    await waitForServer(port);
    log('Server ready on port ' + port);

    // Open browser ONCE
    if (!browserOpened) {
      browserOpened = true;
      setStatus('Opening browser...');
      log('Opening http://localhost:' + port);
      shell.openExternal('http://localhost:' + port);
    }

    // Close splash after 2s
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    }, 2000);

  } catch (err) {
    log('ERROR: ' + err.message);
    setStatus('Failed to start — check log');
    console.error(err);
  }
});

// Keep running in background so server stays alive
app.on('window-all-closed', () => {});
