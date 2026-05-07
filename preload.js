const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (_, info) => cb(info)),
});
