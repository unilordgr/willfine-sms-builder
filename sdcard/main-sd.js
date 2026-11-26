// Main-process side of the Warehouse / SD-card feature.
// Registers IPC handlers for: warehouse storage, SD-card volumes, reading/writing
// Parameter.cfg, file dialogs and webcam permission.
const { app, ipcMain, dialog, systemPreferences, session, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const CFG_NAME = 'Parameter.cfg';

function warehousePath() { return path.join(app.getPath('userData'), 'warehouse.json'); }

function readWarehouse() {
  try {
    const data = JSON.parse(fs.readFileSync(warehousePath(), 'utf8'));
    if (data && Array.isArray(data.cameras)) return data;
  } catch (_) { /* first run or unreadable */ }
  return { version: 1, cameras: [] };
}

function writeWarehouse(data) {
  if (!data || !Array.isArray(data.cameras)) throw new Error('Invalid warehouse data');
  const file = warehousePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Never let an empty list silently replace a warehouse that has cameras.
  if (!data.cameras.length && fs.existsSync(file)) {
    try { if ((JSON.parse(fs.readFileSync(file, 'utf8')).cameras || []).length > 1 && !data.allowEmpty) throw new Error('Refusing to replace the warehouse with an empty one.'); }
    catch (e) { if (/Refusing/.test(e.message)) throw e; }
  }
  delete data.allowEmpty;
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, file + '.bak');
    // One backup per day, last 30 days kept, in .../backups/
    const dir = path.join(path.dirname(file), 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    fs.copyFileSync(file, path.join(dir, 'warehouse-' + day + '.json'));
    const old = fs.readdirSync(dir).filter(n => /^warehouse-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort().slice(0, -30);
    for (const n of old) { try { fs.unlinkSync(path.join(dir, n)); } catch (_) {} }
  }
  const tmp = file + '.tmp';
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeSync(fd, JSON.stringify(data, null, 1)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
  return true;
}

function run(cmd, args) {
  return new Promise(resolve => {
    execFile(cmd, args, { timeout: 15000 }, (err, stdout) => resolve(err ? null : stdout));
  });
}

async function macVolumeInfo(mount) {
  const out = await run('/usr/sbin/diskutil', ['info', '-plist', mount]);
  if (!out) return {};
  const json = await new Promise(resolve => {
    const p = execFile('/usr/bin/plutil', ['-convert', 'json', '-o', '-', '-'], (err, stdout) => {
      try { resolve(err ? {} : JSON.parse(stdout)); } catch (_) { resolve({}); }
    });
    p.stdin.end(out);
  });
  return json;
}

async function listVolumes() {
  const vols = [];
  if (process.platform === 'darwin') {
    let names = [];
    try { names = fs.readdirSync('/Volumes'); } catch (_) {}
    for (const n of names) {
      const mount = path.join('/Volumes', n);
      let real;
      try { real = fs.realpathSync(mount); } catch (_) { continue; }
      if (real === '/') continue; // the boot disk
      const info = await macVolumeInfo(mount);
      if (info.Internal === true && !info.RemovableMedia && !info.Removable) continue;
      if (info.FilesystemType === 'apfs' && info.Internal) continue;
      vols.push({
        path: mount,
        name: info.VolumeName || n,
        sizeBytes: info.TotalSize || info.Size || null,
        fs: info.FilesystemUserVisibleName || info.FilesystemType || '',
        removable: !!(info.RemovableMedia || info.Removable || info.Ejectable),
        hasConfig: fs.existsSync(path.join(mount, CFG_NAME)),
      });
    }
  } else if (process.platform === 'win32') {
    for (let c = 68; c <= 90; c++) { // D: .. Z:
      const root = String.fromCharCode(c) + ':\\';
      try { fs.accessSync(root); } catch (_) { continue; }
      vols.push({ path: root, name: root, sizeBytes: null, fs: '', removable: true,
        hasConfig: fs.existsSync(path.join(root, CFG_NAME)) });
    }
  } else {
    for (const base of ['/media', '/run/media']) {
      try {
        for (const u of fs.readdirSync(base)) {
          const p = path.join(base, u);
          for (const n of fs.readdirSync(p)) {
            const mount = path.join(p, n);
            vols.push({ path: mount, name: n, removable: true, hasConfig: fs.existsSync(path.join(mount, CFG_NAME)) });
          }
        }
      } catch (_) {}
    }
  }
  return vols;
}

// Only allow paths that are currently-listed removable volumes.
async function checkVolume(vol) {
  const vols = await listVolumes();
  const v = vols.find(x => x.path === vol);
  if (!v) throw new Error('That card is no longer connected.');
  return v;
}

// ── OCR (macOS Vision via the bundled "wfocr" helper) ─────
// One long-running helper; requests are answered in order, one JSON line each.
let ocrProc = null, ocrQueue = [], ocrBuf = '';
function ocrPath() {
  if (process.platform !== 'darwin') return null;
  const p = app.isPackaged ? path.join(process.resourcesPath, 'ocr', 'wfocr') : path.join(__dirname, '..', 'ocr', 'bin', 'wfocr');
  return fs.existsSync(p) ? p : null;
}
function ocrStart() {
  if (ocrProc) return ocrProc;
  const p = ocrPath(); if (!p) return null;
  ocrProc = require('child_process').spawn(p, [], { stdio: ['pipe', 'pipe', 'ignore'] });
  ocrProc.stdout.setEncoding('utf8');
  ocrProc.stdout.on('data', chunk => {
    ocrBuf += chunk;
    let i;
    while ((i = ocrBuf.indexOf('\n')) >= 0) {
      const line = ocrBuf.slice(0, i); ocrBuf = ocrBuf.slice(i + 1);
      const job = ocrQueue.shift(); if (!job) continue;
      clearTimeout(job.timer);
      try { job.resolve(JSON.parse(line)); } catch (_) { job.resolve([]); }
    }
  });
  const reset = () => { ocrProc = null; ocrBuf = ''; ocrQueue.splice(0).forEach(j => { clearTimeout(j.timer); j.resolve([]); }); };
  ocrProc.on('exit', reset); ocrProc.on('error', reset);
  return ocrProc;
}
function ocrRead(bytes) {
  const proc = ocrStart();
  if (!proc) return Promise.resolve(null);
  return new Promise(resolve => {
    const job = { resolve, timer: setTimeout(() => { // a stuck helper is restarted on next use
      const k = ocrQueue.indexOf(job); if (k >= 0) ocrQueue.splice(k, 1);
      resolve([]); if (ocrProc) ocrProc.kill();
    }, 8000) };
    ocrQueue.push(job);
    proc.stdin.write(Buffer.from(bytes).toString('base64') + '\n');
  });
}
app.on('will-quit', () => { if (ocrProc) ocrProc.kill(); });

function register(getWin) {
  ipcMain.handle('ocr:available', () => !!ocrPath());
  ipcMain.handle('ocr:read', (_e, bytes) => ocrRead(bytes));

  ipcMain.handle('wh:load', () => readWarehouse());
  ipcMain.handle('wh:save', (_e, data) => writeWarehouse(data));
  ipcMain.handle('wh:path', () => warehousePath());

  ipcMain.handle('sd:volumes', () => listVolumes());

  ipcMain.handle('sd:read', async (_e, vol) => {
    await checkVolume(vol);
    const file = path.join(vol, CFG_NAME);
    if (!fs.existsSync(file)) return null;
    return new Uint8Array(fs.readFileSync(file));
  });

  ipcMain.handle('sd:write', async (_e, vol, bytes) => {
    await checkVolume(vol);
    const buf = Buffer.from(bytes);
    if (buf.length < 0x200 || buf.slice(0, 3).toString('latin1') !== 'MMS') throw new Error('Refusing to write: not a valid config.');
    const file = path.join(vol, CFG_NAME);
    const fd = fs.openSync(file, 'w');
    try { fs.writeSync(fd, buf, 0, buf.length, 0); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    const back = fs.readFileSync(file);
    if (!back.equals(buf)) throw new Error('Verification failed: the card returned different data. Try another card.');
    // macOS leaves an AppleDouble "._Parameter.cfg" on FAT cards; keep the card clean for the camera.
    try { fs.unlinkSync(path.join(vol, '._' + CFG_NAME)); } catch (_) {}
    return { path: file, bytes: buf.length };
  });

  // Erase the card as FAT32 (what the cameras use). Only removable, non-internal volumes;
  // the user confirms in a native dialog that names the card and its size.
  ipcMain.handle('sd:format', async (_e, vol, label) => {
    const v = await checkVolume(vol);
    if (process.platform !== 'darwin') return { ok: false, message: 'Formatting is only available on macOS.' };
    const info = await macVolumeInfo(vol);
    const dev = info.DeviceIdentifier;
    if (!dev || info.Internal === true || !(info.RemovableMedia || info.Removable || info.Ejectable) || fs.realpathSync(vol) === '/') {
      return { ok: false, message: 'This does not look like a removable SD card — not formatting it.' };
    }
    const name = String(label || 'CAMERA').toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 11) || 'CAMERA';
    const gb = info.TotalSize ? (info.TotalSize / 1e9).toFixed(1) + ' GB' : 'unknown size';
    const r = await dialog.showMessageBox(getWin(), {
      type: 'warning', buttons: ['Cancel', 'Erase card'], defaultId: 0, cancelId: 0,
      title: 'Format SD card',
      message: `Erase "${v.name}" (${gb}, /dev/${dev})?`,
      detail: `Everything on this card — photos, videos and settings — will be permanently deleted. It will be formatted as FAT32 and named "${name}". This cannot be undone.`,
    });
    if (r.response !== 1) return { ok: false, cancelled: true };
    const out = await new Promise(resolve => execFile('/usr/sbin/diskutil', ['eraseVolume', 'FAT32', name, '/dev/' + dev],
      { timeout: 180000 }, (err, stdout, stderr) => resolve({ err, stdout, stderr })));
    if (out.err) return { ok: false, message: (out.stderr || out.err.message || 'diskutil failed').trim() };
    return { ok: true, path: path.join('/Volumes', name), name };
  });

  ipcMain.handle('sd:eject', async (_e, vol) => {
    await checkVolume(vol);
    if (process.platform !== 'darwin') return { ok: false, message: 'Use the system eject on this OS.' };
    const out = await run('/usr/sbin/diskutil', ['eject', vol]);
    return { ok: out != null };
  });

  ipcMain.handle('file:saveCfg', async (_e, bytes, suggested) => {
    const r = await dialog.showSaveDialog(getWin(), {
      title: 'Save camera config', defaultPath: suggested || CFG_NAME,
      filters: [{ name: 'Camera config', extensions: ['cfg'] }],
    });
    if (r.canceled || !r.filePath) return null;
    fs.writeFileSync(r.filePath, Buffer.from(bytes));
    return r.filePath;
  });

  ipcMain.handle('file:openCfg', async () => {
    const r = await dialog.showOpenDialog(getWin(), {
      title: 'Open camera config', properties: ['openFile'],
      filters: [{ name: 'Camera config', extensions: ['cfg', 'CFG'] }, { name: 'All files', extensions: ['*'] }],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    return { name: path.basename(r.filePaths[0]), bytes: new Uint8Array(fs.readFileSync(r.filePaths[0])) };
  });

  ipcMain.handle('file:exportJson', async (_e, text, suggested) => {
    const r = await dialog.showSaveDialog(getWin(), {
      title: 'Export warehouse', defaultPath: suggested || 'warehouse.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePath) return null;
    fs.writeFileSync(r.filePath, text);
    return r.filePath;
  });

  ipcMain.handle('file:importJson', async () => {
    const r = await dialog.showOpenDialog(getWin(), {
      title: 'Import warehouse', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    return fs.readFileSync(r.filePaths[0], 'utf8');
  });

  ipcMain.handle('cam:access', async () => {
    if (process.platform !== 'darwin') return true;
    const st = systemPreferences.getMediaAccessStatus('camera');
    if (st === 'granted') return true;
    if (st === 'denied' || st === 'restricted') return false;
    return systemPreferences.askForMediaAccess('camera');
  });

  // Allow webcam (video only) for our own local pages.
  app.whenReady().then(() => {
    const ses = session.defaultSession;
    ses.setPermissionRequestHandler((wc, permission, cb, details) => {
      const local = (details.requestingUrl || wc.getURL() || '').startsWith('file://');
      cb(local && permission === 'media' && !(details.mediaTypes || []).includes('audio'));
    });
    ses.setPermissionCheckHandler((wc, permission, origin) =>
      permission === 'media' && (!origin || origin.startsWith('file://')));
  });
}

module.exports = { register };
