const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const { autoUpdater } = require('electron-updater');

// ── Auto-updater config ──────────────────────────────────────────────
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

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
    // In development, use the already-running dev server
    serverPort = 12000;
    return `http://localhost:${serverPort}`;
  }

  // In production, start the Next.js production server
  serverPort = await findFreePort(3000);

  const serverPath = path.join(process.resourcesPath, 'app');
  const nodeModulesPath = path.join(serverPath, 'node_modules', '.bin', 'next');

  serverProcess = spawn(
    process.execPath,
    [nodeModulesPath, 'start', '--port', String(serverPort)],
    {
      cwd: serverPath,
      env: { ...process.env, NODE_ENV: 'production', PORT: String(serverPort) },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  serverProcess.stdout.on('data', (d) => console.log('[next]', d.toString().trim()));
  serverProcess.stderr.on('data', (d) => console.error('[next:err]', d.toString().trim()));

  // Wait for the server to be ready
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Open external links in the default browser
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
  try {
    const url = await startNextServer();
    await createWindow(url);

    // Check for updates (only in production)
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }

    setupAutoUpdater();
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

// macOS: re-create window when dock icon is clicked
app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const url = await startNextServer();
    await createWindow(url);
  }
});

// ── Auto-updater events ──────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.on('update-available', (info) => {
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Mise a jour disponible',
      message: `La version ${info.version} est disponible.\n\nChangements : ${info.releaseNotes || 'Non specifies.'}`,
      buttons: ['Telecharger', 'Plus tard'],
      defaultId: 0,
    });
    if (response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[updater] Aucune mise a jour disponible.');
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-progress', Math.round(progress.percent));
    }
  });

  autoUpdater.on('update-downloaded', () => {
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Mise a jour prete',
      message: 'La mise a jour a ete telechargee. Redemarrer maintenant pour l\'installer ?',
      buttons: ['Redemarrer', 'Plus tard'],
      defaultId: 0,
    });
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] Erreur:', err.message);
  });
}

// ── IPC handlers ─────────────────────────────────────────────────────
const { ipcMain } = require('electron');
ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) return { dev: true };
  try {
    const result = await autoUpdater.checkForUpdates();
    return result ? result.updateInfo : null;
  } catch (e) {
    return { error: e.message };
  }
});

ipcMain.handle('get-app-version', () => app.getVersion());
