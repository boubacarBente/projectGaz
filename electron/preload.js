const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (_event, percent) => callback(percent));
  },
  isElectron: true,
});
