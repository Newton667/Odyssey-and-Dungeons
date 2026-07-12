const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;

// Find the server directory (works in dev and packaged)
function getServerPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'server');
  }
  return path.join(__dirname, '..', 'server');
}

// Find the client dist directory
function getClientPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'client', 'dist');
  }
  return path.join(__dirname, '..', 'client', 'dist');
}

// Start the Express server as a child process
function startServer() {
  return new Promise((resolve, reject) => {
    const serverDir = getServerPath();
    const serverFile = path.join(serverDir, 'server.js');

    if (!fs.existsSync(serverFile)) {
      reject(new Error(`Server not found at ${serverFile}`));
      return;
    }

    // Ensure .env exists
    const envPath = path.join(serverDir, '.env');
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, 'PORT=3001\n');
    }

    serverProcess = fork(serverFile, [], {
      cwd: serverDir,
      env: { ...process.env, PORT: '3001' },
      silent: true,
    });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[Server]', msg);
      if (msg.includes('Server running') || msg.includes('listening')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[Server Error]', data.toString());
    });

    serverProcess.on('error', (err) => {
      console.error('[Server Failed]', err);
      reject(err);
    });

    // Resolve after timeout even if no specific message
    setTimeout(resolve, 3000);
  });
}

function createWindow() {
  const clientPath = getClientPath();
  const indexPath = path.join(clientPath, 'index.html');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'OND - Odyssey and Dragons',
    backgroundColor: '#1a1209',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  // In dev, load from vite dev server; in production, load built files
  const isDev = !app.isPackaged && fs.existsSync(path.join(__dirname, '..', 'client', 'src'));

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else if (fs.existsSync(indexPath)) {
    // Load from local server so API calls work
    mainWindow.loadURL('http://localhost:3001');
  } else {
    mainWindow.loadURL('http://localhost:3001');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Serve static files from client/dist via Express in production
function setupStaticServing() {
  if (app.isPackaged) {
    const serverDir = getServerPath();
    const serverFile = path.join(serverDir, 'server.js');
    // The server already serves the app; we just need to make sure
    // client/dist is available
    const clientDist = getClientPath();
    if (!fs.existsSync(clientDist)) {
      console.warn('Client dist not found at', clientDist);
    }
  }
}

app.whenReady().then(async () => {
  try {
    console.log('Starting OND server...');
    await startServer();
    console.log('Server started, opening window...');
    setupStaticServing();
    createWindow();
  } catch (err) {
    console.error('Failed to start:', err);
    dialog.showErrorBox('OND Startup Error', `Failed to start the server:\n${err.message}\n\nMake sure no other app is using port 3001.`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
