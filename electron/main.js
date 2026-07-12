const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');

let splashWindow;
let serverProcess;

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

function waitForServer(port, maxRetries) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const max = maxRetries || 30;
    const check = () => {
      attempts++;
      const req = http.get('http://localhost:' + port + '/api/health', () => resolve());
      req.on('error', () => {
        if (attempts >= max) reject(new Error('Server did not start in time'));
        else setTimeout(check, 500);
      });
      req.setTimeout(1000, () => req.destroy());
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

  const html = '<!DOCTYPE html><html><head><style>'
    + '* { margin:0; padding:0; box-sizing:border-box; }'
    + 'body { background:#1a1209; color:#e8d5b0; font-family:Segoe UI,sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; padding:30px; }'
    + 'h1 { color:#c9a227; font-size:36px; letter-spacing:6px; margin-bottom:4px; }'
    + '.sub { color:#a08060; font-size:12px; letter-spacing:3px; margin-bottom:30px; text-transform:uppercase; }'
    + '#status { color:#c9a227; font-size:14px; font-weight:600; margin-bottom:14px; }'
    + '#log { width:100%; flex:1; overflow-y:auto; font-size:11px; color:#a08060; background:#0d0800; border:1px solid #5c3d1e; border-radius:6px; padding:8px; font-family:monospace; }'
    + '.bar { width:70%; height:3px; background:#5c3d1e; border-radius:2px; margin-bottom:20px; overflow:hidden; }'
    + '.bar-fill { height:100%; background:#c9a227; border-radius:2px; animation:load 1.5s ease-in-out infinite; }'
    + '@keyframes load { 0%{width:0%} 50%{width:80%} 100%{width:100%} }'
    + '</style></head><body>'
    + '<h1>OND</h1>'
    + '<div class="sub">Odyssey and Dragons</div>'
    + '<div class="bar"><div class="bar-fill"></div></div>'
    + '<div id="status">Starting up...</div>'
    + '<div id="log"></div>'
    + '</body></html>';

  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
}

app.whenReady().then(async () => {
  createSplash();

  const base = getBasePath();
  const serverDir = path.join(base, 'server');

  try {
    // Ensure .env exists
    const envPath = path.join(serverDir, '.env');
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, 'PORT=3001\n');
      log('Created default .env');
    }

    // Start Express server (serves both API and built client)
    setStatus('Starting server...');
    log('Starting server...');

    serverProcess = spawn(process.execPath, ['server.js'], {
      cwd: serverDir,
      env: Object.assign({}, process.env, { PORT: '3001', NODE_ENV: 'production' }),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    serverProcess.stdout.on('data', (d) => log(d.toString().trim()));
    serverProcess.stderr.on('data', (d) => log(d.toString().trim()));
    serverProcess.on('error', (e) => log('Server error: ' + e.message));

    // Wait for server to respond
    setStatus('Waiting for server...');
    await waitForServer(3001);
    log('Server ready!');

    // Open in default browser
    setStatus('Opening browser...');
    log('Opening http://localhost:3001');
    shell.openExternal('http://localhost:3001');

    // Close splash
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    }, 2000);

  } catch (err) {
    log('ERROR: ' + err.message);
    setStatus('Failed to start');
  }
});

// Keep running in background (server stays alive)
app.on('window-all-closed', () => {});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});
