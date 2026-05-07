const { app, BrowserWindow, Menu, shell, ipcMain, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const os = require('os');
const { spawn, exec } = require('child_process');

let win;
let pendingUpdate = null;     // { path, version, platform }
let updateChosen = false;
let installing = false;

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

// ── Update check ──────────────────────────────────────────
async function checkForUpdates() {
  if (!app.isPackaged) return;
  if (updateChosen) return;
  try {
    const res = await net.fetch(
      'https://api.github.com/repos/unilordgr/willfine-sms-builder/releases/latest',
      { headers: { 'User-Agent': 'WillfineSMSBuilder-UpdateCheck' } }
    );
    if (!res.ok) return;
    const data = await res.json();
    const latestTag = data.tag_name || '';
    const latestVer = latestTag.replace(/^v/, '');
    const currentVer = app.getVersion();
    if (!latestVer || !isNewerVersion(latestVer, currentVer)) return;

    if (win) win.focus();
    const choice = await dialog.showMessageBox(win, {
      type: 'info',
      title: 'Update Available',
      message: `Willfine SMS Builder ${latestTag} is available`,
      detail: `You're running ${currentVer}.\n\nThe update will download in the background and install automatically when you close the app.`,
      buttons: ['Update', 'Not now'],
      defaultId: 0,
      cancelId: 1,
    });

    if (choice.response === 0) {
      updateChosen = true;
      downloadInBackground(data);
    }
  } catch (e) {
    console.log('[update] check failed:', e.message);
  }
}

async function downloadInBackground(releaseData) {
  const platform = process.platform;
  const arch = process.arch;
  const assets = releaseData.assets || [];
  let asset;
  if (platform === 'darwin') {
    asset = arch === 'arm64'
      ? (assets.find(a => a.name.includes('arm64') && a.name.endsWith('.dmg'))
         || assets.find(a => a.name.endsWith('.dmg') && !a.name.includes('arm64')))
      : (assets.find(a => !a.name.includes('arm64') && a.name.endsWith('.dmg'))
         || assets.find(a => a.name.endsWith('.dmg')));
  } else if (platform === 'win32') {
    asset = assets.find(a => /Setup.*\.exe$/i.test(a.name))
         || assets.find(a => a.name.endsWith('.exe'));
  }
  if (!asset) return;

  const destPath = path.join(os.tmpdir(), asset.name);
  if (win) win.webContents.send('update-status', { state: 'downloading', version: releaseData.tag_name });
  try {
    await downloadFile(asset.browser_download_url, destPath);
    pendingUpdate = { path: destPath, version: releaseData.tag_name, platform };
    if (win) win.webContents.send('update-status', { state: 'ready', version: releaseData.tag_name });
  } catch (e) {
    console.log('[update] download failed:', e.message);
    if (win) win.webContents.send('update-status', { state: 'error', message: e.message });
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const follow = (currentUrl, hops = 0) => {
      if (hops > 10) { reject(new Error('Too many redirects')); return; }
      const u = new URL(currentUrl);
      https.get({
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: { 'User-Agent': 'WillfineSMSBuilder' },
      }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          follow(res.headers.location, hops + 1);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
        res.on('error', reject);
      }).on('error', reject);
    };
    follow(url);
  });
}

function isNewerVersion(latest, current) {
  const parse = v => String(v).split('.').map(n => parseInt(n, 10) || 0);
  const a = parse(latest), b = parse(current);
  for (let i = 0; i < 3; i++) {
    const av = a[i] || 0, bv = b[i] || 0;
    if (av !== bv) return av > bv;
  }
  return false;
}

// ── Install on quit ───────────────────────────────────────
function maybeInstallPendingUpdate() {
  if (!pendingUpdate || installing) return;
  installing = true;
  if (pendingUpdate.platform === 'darwin') {
    installMac(pendingUpdate.path);
  } else if (pendingUpdate.platform === 'win32') {
    installWindows(pendingUpdate.path);
  }
}

function installMac(dmgPath) {
  const appName = 'Willfine SMS Builder.app';
  let targetApp = `/Applications/${appName}`;
  if (app.isPackaged) {
    const bundle = path.dirname(path.dirname(path.dirname(process.execPath)));
    if (bundle.endsWith('.app')) targetApp = bundle;
  }
  const mountPoint = path.join(os.tmpdir(), 'willfine-update-mount');

  // Detached shell script — survives the parent quitting. Strips quarantine
  // off the new bundle, replaces the existing .app in place, unmounts and
  // deletes the DMG, then relaunches the new version.
  const cmd = [
    `hdiutil detach "${mountPoint}" -force -quiet >/dev/null 2>&1 || true`,
    `rm -rf "${mountPoint}"`,
    `mkdir -p "${mountPoint}"`,
    `hdiutil attach "${dmgPath}" -nobrowse -quiet -mountpoint "${mountPoint}"`,
    `sleep 1`,
    `xattr -r -d com.apple.quarantine "${mountPoint}/${appName}" >/dev/null 2>&1 || true`,
    `rm -rf "${targetApp}"`,
    `cp -R "${mountPoint}/${appName}" "${targetApp}"`,
    `xattr -r -d com.apple.quarantine "${targetApp}" >/dev/null 2>&1 || true`,
    `hdiutil detach "${mountPoint}" -quiet >/dev/null 2>&1 || true`,
    `rm -f "${dmgPath}"`,
    `open "${targetApp}"`
  ].join(' && ');

  spawn('/bin/sh', ['-c', cmd], { detached: true, stdio: 'ignore' }).unref();
}

function installWindows(setupPath) {
  // Wait briefly for the app to release locks, then run NSIS installer silently
  // and relaunch. The bat self-deletes when done.
  const batPath = path.join(os.tmpdir(), 'willfine-update.bat');
  const bat = `@echo off
timeout /t 3 /nobreak >nul
"${setupPath}" /S
del "${setupPath}" >nul 2>&1
del "%~f0" >nul 2>&1
`;
  fs.writeFileSync(batPath, bat, 'ascii');
  spawn('cmd.exe', ['/c', batPath], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
}

// ── Menu ──────────────────────────────────────────────────
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Home (pick a camera)', accelerator: 'CmdOrCtrl+H', click: () => win && win.loadFile('index.html') },
        { label: 'Open T4.0CG New', accelerator: 'CmdOrCtrl+1', click: () => win && win.loadFile('willfine_T4.0CG.html') },
        { label: 'Open 4.0P Pro', accelerator: 'CmdOrCtrl+2', click: () => win && win.loadFile('willfine_4.0P.html') },
        { label: 'Open 4.0CG PNY', accelerator: 'CmdOrCtrl+3', click: () => win && win.loadFile('willfine_4.0CG.html') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
        { role: 'togglefullscreen' }, { role: 'toggleDevTools' }
      ]
    },
    { role: 'windowMenu' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC ───────────────────────────────────────────────────
ipcMain.handle('get-version', () => app.getVersion());

// ── Lifecycle ─────────────────────────────────────────────
app.whenReady().then(() => {
  buildMenu();
  createWindow();
  setTimeout(() => checkForUpdates(), 4000);
});

app.on('before-quit', maybeInstallPendingUpdate);
app.on('window-all-closed', () => {
  maybeInstallPendingUpdate();
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
