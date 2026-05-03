# Willfine SMS Builder

Offline desktop app for building SMS commands for Willfine wildlife cameras. Bundles two tools in one window:

- **T4.0CG (newer firmware)** — cyan theme
- **4.0CG (older firmware)** — amber theme, with the extra "Send to Phone" command type

Switch between them using the tabs at the top, or the **File** menu (`Ctrl+1` / `Ctrl+2`, `Cmd+1` / `Cmd+2` on Mac).

The whole app runs offline. No accounts, no internet, no telemetry.

---

## Download

Pre-built installers are produced by GitHub Actions for every release. Grab them from the [Releases page](../../releases/latest):

| OS       | File                              | Notes |
|----------|-----------------------------------|-------|
| macOS    | `Willfine SMS Builder-x.y.z.dmg`  | Universal — works on Intel and Apple Silicon |
| macOS    | `Willfine SMS Builder-x.y.z.zip`  | Same app, zipped instead of disk image |
| Windows  | `Willfine SMS Builder Setup x.y.z.exe` | Installer (NSIS) |
| Windows  | `Willfine SMS Builder x.y.z.exe`  | Portable — no install, just run |

### First-run warnings (unsigned)

The app isn't code-signed (would cost ~$100/year per platform), so the first time you open it your OS will warn you:

- **macOS:** Right-click the `.app` → **Open** → **Open** in the dialog. After that it just opens normally.
- **Windows:** Click **More info** → **Run anyway** on the SmartScreen prompt.

---

## Releasing a new build (the 5-minute version)

Once the repo is set up (see below), every time you want a new build:

```bash
git add .
git commit -m "your changes"
git tag v1.0.1               # bump the version
git push origin main --tags
```

GitHub Actions will:
1. Spin up a Mac runner and build the `.dmg` + `.zip`.
2. Spin up a Windows runner and build the `.exe`s.
3. Create a Release tagged `v1.0.1` and attach all four files to it.

You can also trigger a build manually without tagging — go to **Actions → Build Mac + Windows installers → Run workflow**. Those installers show up under the run as artifacts (kept for 90 days).

---

## First-time GitHub setup

If you've never pushed this folder to GitHub before:

```bash
# 1. Initialize the repo locally
cd "/path/to/willfine-sms-app"
git init -b main
git add .
git commit -m "Initial commit"

# 2. Create the repo on GitHub and push
#    (Replace YOURNAME with your GitHub username)
gh repo create willfine-sms-builder --public --source=. --remote=origin --push
#    OR if you don't have the gh CLI, create the repo on github.com first then:
#    git remote add origin https://github.com/YOURNAME/willfine-sms-builder.git
#    git push -u origin main

# 3. Tag the first release to kick off the build
git tag v1.0.0
git push origin v1.0.0
```

That last `git push --tags` triggers the workflow. Watch it run at `https://github.com/YOURNAME/willfine-sms-builder/actions`. After ~5 minutes the installers appear on the Releases page.

---

## Building locally (optional)

You only need this if you want to test the app on your own machine before pushing. **Otherwise GitHub does the building for you — you can skip this section.**

```bash
# install
npm install

# run the app in dev mode
npm start

# build installers for your current OS
npm run build:mac     # on Mac
npm run build:win     # on Windows
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
├── .github/workflows/
│   └── build.yml             Mac + Windows GitHub Actions build
├── .gitignore
└── README.md
```

The two `willfine_*.html` files are standalone — you can also open them directly in any browser, no Electron needed.

---

## Common changes

| Want to…                          | Edit                                   |
|-----------------------------------|----------------------------------------|
| Change app name in installers     | `productName` in `package.json`        |
| Bump the version                  | `version` in `package.json` + `git tag vX.Y.Z` |
| Add an app icon                   | Drop a `build/icon.icns` (Mac) and `build/icon.ico` (Win); electron-builder picks them up automatically |
| Tweak which OSes get built        | The `matrix.os` list in `.github/workflows/build.yml` |
| Switch between newer/older tool   | The tabs at the top, or `Cmd/Ctrl + 1` / `+ 2` |
| Change a camera setting / option  | Edit the corresponding `willfine_*.html` directly — see the per-tool NOTES files |
