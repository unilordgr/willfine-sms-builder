# Willfine SMS Builder

Offline desktop app for building SMS commands for Willfine wildlife cameras. Bundles two tools in one window:

- **T4.0CG (newer firmware)** — cyan theme
- **4.0CG (older firmware)** — amber theme, with the extra "Send to Phone" command type

Switch between them using the tabs at the top, or the **File** menu (`Ctrl+1` / `Ctrl+2`, `Cmd+1` / `Cmd+2` on Mac).

The whole app runs offline. No accounts, no internet, no telemetry.

---

## Download

[![Download latest release](https://img.shields.io/github/v/release/unilordgr/willfine-sms-builder?label=Download&style=for-the-badge&color=brightgreen)](https://github.com/unilordgr/willfine-sms-builder/releases/latest)

| OS      | File                                   | Notes |
|---------|----------------------------------------|-------|
| macOS   | `Willfine SMS Builder-x.y.z.dmg`       | Universal — works on Intel and Apple Silicon |
| macOS   | `Willfine SMS Builder-x.y.z.zip`       | Same app, zipped instead of disk image |
| Windows | `Willfine SMS Builder Setup x.y.z.exe` | Installer (NSIS) |
| Windows | `Willfine SMS Builder x.y.z.exe`       | Portable — no install, just run |

### First-run warnings (unsigned)

The app isn't code-signed (would cost ~$100/year per platform), so the first time you open it your OS will warn you:

- **macOS:** Right-click the `.app` → **Open** → **Open** in the dialog. After that it just opens normally.
- **Windows:** Click **More info** → **Run anyway** on the SmartScreen prompt.

---

## Releasing a new build

```bash
git add .
git commit -m "your changes"
git tag v1.0.1               # bump the version
git push origin main --tags
```

GitHub Actions will spin up Mac and Windows runners, build the installers, and attach them to a new Release automatically.

You can also trigger a build manually without tagging — go to **Actions → Build Mac + Windows installers → Run workflow**. Installers appear as artifacts under the run (kept 90 days).

---

## Building locally (optional)

```bash
npm install
npm start          # run in dev mode
npm run build:mac  # build macOS installers (on Mac)
npm run build:win  # build Windows installers (on Windows)
```

Output lands in `dist/`.

---

## Project layout

```
willfine-sms-app/
├── package.json              electron-builder config + deps
├── main.js                   Electron main process (window + menu)
├── index.html                wrapper UI with the two-tab switcher
├── willfine_T4.0CG.html      newer-camera tool (cyan)
├── willfine_4.0CG.html       older-camera tool (amber)
└── .github/workflows/
    └── build.yml             Mac + Windows GitHub Actions build
```

The two `willfine_*.html` files are standalone — you can open them directly in any browser, no Electron needed.

---

## Common changes

| Want to…                          | Edit                                            |
|-----------------------------------|-------------------------------------------------|
| Change app name in installers     | `productName` in `package.json`                 |
| Bump the version                  | `version` in `package.json` + `git tag vX.Y.Z` |
| Add an app icon                   | Drop `build/icon.icns` (Mac) + `build/icon.ico` (Win); electron-builder picks them up automatically |
| Change a camera setting / option  | Edit the corresponding `willfine_*.html` directly |
