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
    return;
  }

  // Prompt the user to restart immediately
  if (win) win.focus();
  const choice = await dialog.showMessageBox(win, {
    type: 'info',
    title: 'Download Finished',
    message: `Willfine SMS Builder ${releaseData.tag_name} is ready to install`,
    detail: 'Restart the app now to apply the update, or do it later — it will also install automatically the next time you close the app.',
    buttons: ['Restart now', 'Later'],
    defaultId: 0,
    cancelId: 1,
  });

  if (choice.response === 0) {
    maybeInstallPendingUpdate();
    setTimeout(() => app.quit(), 200);
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
  const logFile = path.join(os.tmpdir(), 'willfine-update.log');
  const scriptPath = path.join(os.tmpdir(), 'willfine-update.sh');
  const parentPid = process.pid;

  const script = `#!/bin/sh
exec >>"${logFile}" 2>&1
echo ""
echo "=== $(date) starting update for v${pendingUpdate.version} ==="
echo "Parent PID: ${parentPid} — waiting for it to exit..."
i=0
while kill -0 ${parentPid} 2>/dev/null; do
  i=$((i+1))
  if [ $i -gt 60 ]; then echo "Timeout waiting for parent — proceeding anyway"; break; fi
  sleep 0.5
done
echo "Parent exited. Mounting DMG: ${dmgPath}"
hdiutil detach "${mountPoint}" -force -quiet >/dev/null 2>&1 || true
rm -rf "${mountPoint}"
mkdir -p "${mountPoint}"
if ! hdiutil attach "${dmgPath}" -nobrowse -quiet -mountpoint "${mountPoint}"; then
  echo "ERROR: hdiutil attach failed — opening DMG manually"
  open "${dmgPath}"
  exit 1
fi
sleep 1
if [ ! -d "${mountPoint}/${appName}" ]; then
  echo "ERROR: app bundle not found at ${mountPoint}/${appName}"
  ls -la "${mountPoint}"
  hdiutil detach "${mountPoint}" -force -quiet >/dev/null 2>&1
  open "${dmgPath}"
  exit 1
fi
echo "Stripping quarantine on new bundle..."
xattr -r -d com.apple.quarantine "${mountPoint}/${appName}" >/dev/null 2>&1 || true
echo "Removing old app: ${targetApp}"
rm -rf "${targetApp}"
echo "Copying new app into place..."
if ! cp -R "${mountPoint}/${appName}" "${targetApp}"; then
  echo "ERROR: cp failed"
  hdiutil detach "${mountPoint}" -force -quiet >/dev/null 2>&1
  open "${dmgPath}"
  exit 1
fi
xattr -r -d com.apple.quarantine "${targetApp}" >/dev/null 2>&1 || true
echo "Detaching DMG and cleaning up..."
hdiutil detach "${mountPoint}" -quiet >/dev/null 2>&1 || true
rm -f "${dmgPath}"
echo "Relaunching from ${targetApp}"
open "${targetApp}"
echo "=== $(date) update complete ==="
`;
  fs.writeFileSync(scriptPath, script, { mode: 0o755 });
  spawn('/bin/sh', [scriptPath], { detached: true, stdio: 'ignore' }).unref();
}

function installWindows(setupPath) {
  const logFile = path.join(os.tmpdir(), 'willfine-update.log');
  const batPath = path.join(os.tmpdir(), 'willfine-update.bat');
  const parentPid = process.pid;
  const bat = `@echo off
echo. >>"${logFile}"
echo === %DATE% %TIME% starting update === >>"${logFile}"
echo Waiting for PID ${parentPid} to exit... >>"${logFile}"
:wait
tasklist /FI "PID eq ${parentPid}" 2>nul | find "${parentPid}" >nul
if not errorlevel 1 (
  timeout /t 1 /nobreak >nul
  goto wait
)
echo Parent exited. Running installer... >>"${logFile}"
"${setupPath}" /S >>"${logFile}" 2>&1
echo Installer finished, cleaning up. >>"${logFile}"
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
