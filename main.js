const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 720,
    minHeight: 520,
    title: 'Willfine SMS Builder',
    backgroundColor: '#0f1419',
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

function setupAutoUpdater() {
  if (!app.isPackaged) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-available', (info) => {
      if (win) win.webContents.send('update-available', info);
    });
    autoUpdater.on('update-downloaded', (info) => {
      if (win) win.webContents.send('update-downloaded', info);
    });
    // Wait for the renderer to finish loading before checking — otherwise
    // the update-available event fires before the banner listener is registered.
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 2000);
    });
  } catch (e) {}
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Home (pick a camera)',
          accelerator: 'CmdOrCtrl+H',
          click: () => win && win.loadFile('index.html')
        },
        {
          label: 'Open T4.0CG (newer)',
          accelerator: 'CmdOrCtrl+1',
          click: () => win && win.loadFile('willfine_T4.0CG.html')
        },
        {
          label: 'Open 4.0CG (older firmware)',
          accelerator: 'CmdOrCtrl+2',
          click: () => win && win.loadFile('willfine_4.0CG.html')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' }
      ]
    },
    { role: 'windowMenu' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle('get-version', () => app.getVersion());
ipcMain.on('install-update', () => {
  try { require('electron-updater').autoUpdater.quitAndInstall(); } catch (e) {}
});

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
