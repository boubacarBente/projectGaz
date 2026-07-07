const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const http = require('http');
let autoUpdater = null;
try {
  ({ autoUpdater } = require('electron-updater'));
} catch (error) {
  console.warn('[updater] disabled:', error.message);
}

// ── Auto-updater config ──────────────────────────────────────────────
if (autoUpdater) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
}

function getErrorMessage(error) {
  if (!error) return 'Erreur inconnue';
  return error.message || String(error);
}

function updaterLogPath() {
  const basePath = app.isReady() ? app.getPath('userData') : process.env.ELECTRON_APP_PATH;
  return basePath ? path.join(basePath, 'updater.log') : null;
}

function logUpdater(level, message, extra) {
  const line = `[${new Date().toISOString()}] [${level}] ${message}${extra ? ` ${extra}` : ''}`;
  const logger = console[level] || console.log;
  logger(line);

  try {
    const filePath = updaterLogPath();
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${line}\n`, 'utf8');
  } catch (error) {
    console.warn('[updater] log write failed:', getErrorMessage(error));
  }
}

function sendUpdaterEvent(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

async function runUpdateCheck(source = 'manual') {
  if (!app.isPackaged) {
    return { status: 'dev', version: app.getVersion() };
  }

  if (!autoUpdater) {
    return { status: 'unavailable' };
  }

  try {
    logUpdater('info', `Verification des mises a jour (${source}) - version actuelle ${app.getVersion()}`);
    sendUpdaterEvent('update-checking', { source, version: app.getVersion() });
    const result = await autoUpdater.checkForUpdates();
    return { status: 'ok', updateInfo: result ? result.updateInfo : null };
  } catch (error) {
    const message = getErrorMessage(error);
    logUpdater('error', `Erreur de verification (${source}): ${message}`);
    sendUpdaterEvent('update-error', { source, message });
    return { status: 'error', error: message };
  }
}

// ── Next.js server management ────────────────────────────────────────
let serverProcess = null;
let serverPort = 3000;

function findFreePort(startPort) {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => resolve(findFreePort(startPort + 1)));
  });
}

async function startNextServer() {
  const isDev = !app.isPackaged;

  if (isDev) {
    serverPort = 12000;
    return `http://localhost:${serverPort}`;
  }

  serverPort = await findFreePort(3000);

  // app.getAppPath() donne la racine de l'app (dev: racine projet, packagée: resources/app/)
  const serverScript = app.isPackaged
    ? path.join(app.getAppPath(), 'server.js')
    : path.join(app.getAppPath(), '.next', 'standalone', 'server.js');

  serverProcess = fork(serverScript, [], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(serverPort),
      ELECTRON_APP_PATH: app.getPath('userData'),
    },
    stdio: 'inherit',
  });

  const url = `http://localhost:${serverPort}`;
  await waitForServer(url);
  return url;
}

function waitForServer(url, retries = 60, delay = 1000) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode < 500) resolve();
          else retry();
        })
        .on('error', retry);
    };
    const retry = () => {
      count++;
      if (count >= retries) reject(new Error(`Server not ready after ${retries} retries`));
      else setTimeout(check, delay);
    };
    check();
  });
}

function stopNextServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

// ── Window creation ──────────────────────────────────────────────────
let mainWindow = null;

async function createWindow(url) {
  mainWindow = new BrowserWindow({
    title: 'Gestion Gaz',
    width: 1280,
    height: 800,
    minWidth: 400,
    minHeight: 600,
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Ouvre DevTools automatiquement si DEBUG=1 (ou via F12)
  if (process.env.DEBUG) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // Log les erreurs du process de rendu
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[electron] render-process-gone:', details);
  });
  mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('[electron] preload-error:', error);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(url);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App lifecycle ────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Définir le chemin DB persistant AVANT de démarrer le serveur
  process.env.ELECTRON_APP_PATH = app.getPath('userData');

  try {
    const url = await startNextServer();
    await createWindow(url);

    if (autoUpdater) {
      setupAutoUpdater();
    }

    if (app.isPackaged && autoUpdater) {
      setTimeout(() => {
        runUpdateCheck('startup');
      }, 3000);
    }
  } catch (err) {
    console.error('Failed to start:', err);
    dialog.showErrorBox('Erreur de demarrage', err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  stopNextServer();
  app.quit();
});

app.on('before-quit', () => {
  stopNextServer();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const url = await startNextServer();
    await createWindow(url);
  }
});

// ── Auto-updater events ──────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.logger = {
    info: (message) => logUpdater('info', String(message)),
    warn: (message) => logUpdater('warn', String(message)),
    error: (message) => logUpdater('error', String(message)),
    debug: (message) => logUpdater('debug', String(message)),
  };

  autoUpdater.on('checking-for-update', () => {
    logUpdater('info', 'Verification en cours...');
    sendUpdaterEvent('update-checking', { version: app.getVersion() });
  });

  autoUpdater.on('update-available', (info) => {
    logUpdater('info', `Mise a jour ${info.version} disponible, telechargement automatique...`);
    sendUpdaterEvent('update-available', { version: info.version });
  });

  autoUpdater.on('update-not-available', (info) => {
    logUpdater('info', `Aucune mise a jour disponible. Derniere version distante: ${info.version}`);
    sendUpdaterEvent('update-not-available', { version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    sendUpdaterEvent('update-progress', { percent });
  });

  autoUpdater.on('update-downloaded', (info) => {
    logUpdater('info', `Mise a jour ${info.version} telechargee.`);
    sendUpdaterEvent('update-downloaded', { version: info.version });
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Mise a jour prete',
      message: "La mise a jour a ete telechargee. Redemarrer maintenant pour l'installer ?",
      buttons: ['Redemarrer', 'Plus tard'],
      defaultId: 0,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', (err) => {
    const message = getErrorMessage(err);
    logUpdater('error', `Erreur: ${message}`);
    sendUpdaterEvent('update-error', { message });
  });
}

// ── IPC handlers ─────────────────────────────────────────────────────
ipcMain.handle('check-for-updates', async () => {
  return runUpdateCheck('manual');
});

ipcMain.handle('get-app-version', () => app.getVersion());
