const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process'); // fork au lieu de spawn
const http = require('http');
const fs = require('fs');
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
    serverPort = 12000;
    return `http://localhost:${serverPort}`;
  }

  serverPort = await findFreePort(3000);

  const appPath = path.join(process.resourcesPath, 'app');
  const standaloneDir = path.join(appPath, '.next', 'standalone');
  const serverScript = path.join(standaloneDir, 'server.js');

  console.log(`[server] Port: ${serverPort}`);
  console.log(`[server] standaloneDir: ${standaloneDir}`);
  console.log(`[server] server.js existe: ${fs.existsSync(serverScript)}`);

  if (!fs.existsSync(serverScript)) {
    throw new Error(
      `server.js introuvable:\n${serverScript}\n\nVérifie que output: 'standalone' est dans next.config.ts`
    );
  }

  serverProcess = fork(serverScript, [], {
    execPath: process.execPath,
    cwd: standaloneDir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(serverPort),
      HOSTNAME: '127.0.0.1',
      ELECTRON_APP_PATH: app.getPath('userData'),
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (d) => console.log('[next]', d.toString().trim()));
  serverProcess.stderr.on('data', (d) => console.error('[next:err]', d.toString().trim()));
  serverProcess.on('error', (err) => console.error('[server] fork error:', err.message));
  serverProcess.on('exit', (code) => console.log(`[server] exit code: ${code}`));

  const url = `http://localhost:${serverPort}`;
  await waitForServer(url, 120, 1000);
  return url;
}

function waitForServer(url, retries = 120, delay = 1000) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const check = () => {
      http
        .get(url, (res) => {
          console.log(`[ping ${count}] status: ${res.statusCode}`);
          if (res.statusCode < 500) resolve();
          else retry();
        })
        .on('error', (err) => {
          console.log(`[ping ${count}] ${err.message}`);
          retry();
        });
    };
    const retry = () => {
      count++;
      if (count >= retries) reject(new Error(`Serveur non prêt après ${retries} tentatives`));
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
    backgroundColor: '#f8fafc',
  });

  mainWindow.setMenuBarVisibility(false);

  // Écran de chargement
  mainWindow.loadURL('data:text/html,' + encodeURIComponent(`
    <html>
      <head>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            height: 100vh; font-family: Arial, sans-serif;
            background: #f8fafc; color: #334155;
          }
          .spinner {
            width: 52px; height: 52px;
            border: 5px solid #e2e8f0;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 24px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          h2 { font-size: 22px; margin-bottom: 8px; }
          p  { font-size: 14px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>Gestion Gaz</h2>
        <p>Démarrage en cours, veuillez patienter...</p>
      </body>
    </html>
  `));

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

  // Charger l'app après que le serveur est prêt
  mainWindow.loadURL(url);

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ────────────────────────────────────────────────────
app.whenReady().then(async () => {
  process.env.ELECTRON_APP_PATH = app.getPath('userData');
  console.log(`[app] userData: ${app.getPath('userData')}`);

  try {
    const url = await startNextServer();
    console.log(`[app] Serveur prêt: ${url}`);
    await createWindow(url);

    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }

    setupAutoUpdater();
  } catch (err) {
    console.error('[app] Failed to start:', err);
    dialog.showErrorBox('Erreur de démarrage', err.message);
    app.quit();
  }
});

app.on('window-all-closed', () => { stopNextServer(); app.quit(); });
app.on('before-quit', () => { stopNextServer(); });

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
      title: 'Mise à jour disponible',
      message: `La version ${info.version} est disponible.\n\nChangements : ${info.releaseNotes || 'Non spécifiés.'}`,
      buttons: ['Télécharger', 'Plus tard'],
      defaultId: 0,
    });
    if (response === 0) autoUpdater.downloadUpdate();
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[updater] Aucune mise à jour disponible.');
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) mainWindow.webContents.send('update-progress', Math.round(progress.percent));
  });

  autoUpdater.on('update-downloaded', () => {
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Mise à jour prête',
      message: "La mise à jour a été téléchargée. Redémarrer maintenant pour l'installer ?",
      buttons: ['Redémarrer', 'Plus tard'],
      defaultId: 0,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] Erreur:', err.message);
  });
}

// ── IPC handlers ─────────────────────────────────────────────────────
ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) return { dev: true };
  try {
    const result = await autoUpdater.checkForUpdates();
    return result ? result.updateInfo : null;
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle('get-app-version', () => app.getVersion());