const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (_, info) => cb(info)),
  // Warehouse + SD card
  whLoad: () => ipcRenderer.invoke('wh:load'),
  whSave: (data) => ipcRenderer.invoke('wh:save', data),
  whPath: () => ipcRenderer.invoke('wh:path'),
  sdVolumes: () => ipcRenderer.invoke('sd:volumes'),
  sdRead: (vol) => ipcRenderer.invoke('sd:read', vol),
  sdWrite: (vol, bytes) => ipcRenderer.invoke('sd:write', vol, bytes),
  sdEject: (vol) => ipcRenderer.invoke('sd:eject', vol),
  sdFormat: (vol, label) => ipcRenderer.invoke('sd:format', vol, label),
  saveCfg: (bytes, name) => ipcRenderer.invoke('file:saveCfg', bytes, name),
  openCfg: () => ipcRenderer.invoke('file:openCfg'),
  exportJson: (text, name) => ipcRenderer.invoke('file:exportJson', text, name),
  importJson: () => ipcRenderer.invoke('file:importJson'),
  cameraAccess: () => ipcRenderer.invoke('cam:access'),
  ocrAvailable: () => ipcRenderer.invoke('ocr:available'),
  ocrRead: (bytes) => ipcRenderer.invoke('ocr:read', bytes),
});
