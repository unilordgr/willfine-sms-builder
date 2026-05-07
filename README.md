# Willfine SMS Builder

[![Version](https://img.shields.io/github/v/release/unilordgr/willfine-sms-builder?style=flat-square&color=brightgreen)](https://github.com/unilordgr/willfine-sms-builder/releases/latest)

Offline desktop app for building and decoding SMS commands for Willfine wildlife cameras. No account, no internet, no telemetry — everything runs locally.

Supports **three** firmware variants in one window, each with its own colour-coded tool:

| Tool | Camera | Theme |
|------|--------|-------|
| **T4.0CG New** | Newest firmware | Cyan |
| **4.0P Pro** | Mid-range firmware (4.0P spec) | Green |
| **4.0CG PNY** | Older firmware | Amber |

Switch between them using the tabs at the top, or via the **File** menu (`Cmd/Ctrl+1` / `Cmd/Ctrl+2` / `Cmd/Ctrl+3`). Each tab remembers its own settings independently.

---

## Download

| Platform | Installer | Portable |
|----------|-----------|----------|
| **macOS** (Intel + Apple Silicon) | [![Mac DMG](https://img.shields.io/badge/Mac-DMG-blue?style=for-the-badge&logo=apple)](https://github.com/unilordgr/willfine-sms-builder/releases/latest/download/Willfine-SMS-Builder-1.0.15.dmg) | [![Mac ZIP](https://img.shields.io/badge/Mac-ZIP-blue?style=for-the-badge&logo=apple)](https://github.com/unilordgr/willfine-sms-builder/releases/latest/download/Willfine-SMS-Builder-1.0.15-mac.zip) |
| **Windows** | [![Win Installer](https://img.shields.io/badge/Windows-Installer-0078d4?style=for-the-badge&logo=windows)](https://github.com/unilordgr/willfine-sms-builder/releases/latest/download/Willfine-SMS-Builder-Setup-1.0.15.exe) | [![Win Portable](https://img.shields.io/badge/Windows-Portable-0078d4?style=for-the-badge&logo=windows)](https://github.com/unilordgr/willfine-sms-builder/releases/latest/download/Willfine-SMS-Builder-1.0.15.exe) |

> All releases are also listed on the [Releases page](https://github.com/unilordgr/willfine-sms-builder/releases/latest).

### First-run warnings (unsigned)

The app is not code-signed, so your OS will warn you the first time:

- **macOS:** Right-click the `.app` → **Open** → **Open** in the dialog. Works normally after that.
- **Windows:** Click **More info** → **Run anyway** on the SmartScreen prompt.

---

## Features

### Live SMS command builder

Every change you make immediately updates the generated command string shown at the top of the screen. When you're done, hit **Copy** and send it to the camera.

Five utility buttons are always visible:
- **Copy** — copies the current command to your clipboard
- **Reset to defaults** — resets all fields back to factory defaults
- **Insert default string** — pastes the default command string for the active tab so you can see the format
- **Save preset** — exports the current camera's full configuration to a `.json` file
- **Load preset** — restores a previously saved configuration

A **live summary panel** on the right side shows a plain-English description of what each setting will do to the camera, updating as you change options.

### Auto-save and per-camera memory

Each camera tab has its own independent settings. Changes are saved automatically to local storage as you make them, so when you switch from one tab to another and back, all your selections are still there. Quitting and re-opening the app keeps everything too.

### In-app auto-update

When a new version is published on GitHub:

1. Within a few seconds of opening the app, a native popup appears: **Update / Not now**.
2. Choose **Update** to start a silent background download.
3. When the download finishes, a second popup appears: **Restart now / Later**.
4. **Restart now** quits the app, replaces the installed copy on disk, and relaunches.
5. **Later** keeps the app running — the install runs the same way the next time you close the app.

A small status banner at the top of the window also shows the current download/install state. The whole flow is custom-built (no `electron-updater`) so it works reliably with unsigned builds on macOS.

---

### T4.0CG New — newest firmware (cyan)

#### Basic settings tab (`$01*27#…$`)

27 parameters covering core camera behaviour:

| # | Setting | Options |
|---|---------|---------|
| 1 | Camera Mode | Photo / Video / Pic+Video |
| 2 | Pic Size | 32M / 24M / 12M / 8M / 5M |
| 3 | Video Size | FHD 1080P / HD 720P / WVGA |
| 4 | Video Length | 5 / 10 / 15 / 20 / 30 / 40 / 50 / 59 sec |
| 5 | Multi Shot | 1P / 2P / 3P / 4P / 5P |
| 6 | Night Mode | Max Range / Balanced / Min Blur |
| 7 | Flash LED | High / Low |
| 8 | Stamp | OFF / ON |
| 9 | Battery Type | Alkaline / Ni-MH |
| 10 | SD Cycle | OFF / ON |
| 11 | Frequency | Locked at 0 (not supported on T4.0CG) |
| 12 | PIR Sensitivity | 1 – 9 |
| 13 | PIR Switch | ON / OFF |
| 14 | Language | English |
| 15 | Delay | OFF, or a duration HH:MM:SS (5 sec – 23:59:59) |
| 16 | Time Lapse | OFF, or an interval HH:MM:SS (5 sec – 23:59:59) |
| 17 | Work Timer 1 | OFF, or a start–end time window (24-hour) |
| 18 | Work Timer 2 | OFF, or a start–end time window (24-hour) |
| 19 | TransPic | OFF / ON — whether to send photos over GPRS |
| 20 | TransVideo | OFF / ON — whether to send videos over GPRS |
| 21 | picCount | Bitmask — tick which burst shots (1st–5th) to transmit |
| 22 | Camera ID | OFF, or a custom 12-character alphanumeric identifier |
| 23 | Time Zone | Manual or Auto-sync with UTC offset picker |
| 24–27 | Reserved | Fixed at 0 |

**Time Zone auto-sync** includes a full UTC offset selector (UTC−12 to UTC+14) with two separate city lists — one for Winter/Standard time, one for Summer/DST — so you see the correct offset for your location at any time of year.

**picCount** uses a bitmask: tick each burst position (1st shot = 1, 2nd = 2, 3rd = 4, 4th = 8, 5th = 16) and the app calculates the correct combined value.

#### GPRS settings tab (`$10*13#…$`)

13 parameters for remote transmission behaviour:

| # | Setting | Options |
|---|---------|---------|
| 1 | SMS Remote Control | Daily / Immediately |
| 2 | SMTP/FTP Pic Size | Small / Bigger / Original |
| 3 | Max Num / Day | Unlimited, or 1–99 |
| 4 | Daily Report | OFF, or a time window HH:MM–HH:MM |
| 5 | GPS | OFF / ON |
| 6 | Auto Match | Auto / Manual |
| 7 | MMS | OFF / ON |
| 8 | SMTP | OFF / ON |
| 9 | FTP(s) | FTP / ON / FTPS |
| 10–13 | Reserved | Fixed at 0 |

#### Email settings tab (`$08*8#…$`)

Set up to 4 recipient email addresses for SMTP delivery. The remaining 4 fields are reserved and fixed.

#### Get a Picture tab (`$03*1#1$`)

Single-tap trigger — sends a fixed command to make the camera take a photo or video immediately. No options to configure.

---

### 4.0P Pro — mid-range firmware (green)

Built from the official "4.0P APP Remote Command Codes" spec. Same overall structure as the other tools, with these distinct field differences:

| Feature | 4.0P Pro |
|---------|----------|
| Pic Size | **24M / 12M / 8M / 5M** (default 8M) — adds 24M but not 32M |
| Video Size | FHD 1080P / HD 720P / WVGA |
| Flash LED | High / Low |
| Frequency | **Locked** — not available on 4.0P firmware (per spec) |
| PIR Sensitivity | 3 levels (High / Middle / Low) |
| Camera ID | 12 alphanumeric characters (the spec calls them "characters", letters allowed) |
| GPRS FTP(s) | **FTP / ON / FTPS** — three-way switch with FTPS support |

Includes the same Basic / GPRS / Email / Send to Phone / Get a Picture tabs as the other tools.

---

### 4.0CG PNY — older firmware (amber)

Identical layout to the other tools but reflects the actual differences in the older firmware's command set:

| Feature | T4.0CG (newest) | 4.0P (mid) | **4.0CG PNY (older)** |
|---------|-----------------|------------|-----------------------|
| Pic Size options | 32M / 24M / 12M / 8M / 5M | 24M / 12M / 8M / 5M | **12M / 8M / 5M** |
| Flash LED labels | High / Low | High / Low | **ALL / HALF** |
| Frequency setting | Locked | Locked | **50 Hz / 60 Hz (functional)** |
| PIR Sensitivity | 9 levels (1–9) | 3 levels | 3 levels |
| GPRS Daily Report | Time range HH:MM–HH:MM | Single time HH:MM | Single time HH:MM |
| FTP options | FTP / ON / FTPS | FTP / ON / FTPS | **OFF / ON only** |
| Camera ID | 12 chars | 12 chars | **12 digits (numbers only — letters rejected by the camera)** |
| Time Zone Manual mode | Just sends OFF | Just sends OFF | **Adds Date/Time pickers** as a reminder of what to set on the camera |
| Send to Phone tab | Not present | Present | Present (`$06*8#…$`) |

#### Send to Phone tab (`$06*8#…$`) — only on 4.0P Pro and 4.0CG PNY

Set up to 4 MMS recipient phone numbers. Requires MMS to be enabled in the GPRS tab. The remaining 4 fields are reserved and fixed.

---

### Command decoder

All three tools include a decoder at the bottom of the page. Paste any existing command string and click **Decode** to see a plain-English breakdown of every parameter — useful for checking a command you received or verifying one before sending.

You can also click **Decode the command above ↑** to instantly decode whatever is currently shown in the output box.

The decoder understands all command types:
- `$01*27#…$` — Basic settings
- `$10*13#…$` — GPRS settings
- `$08*8#…$` — Email settings
- `$06*8#…$` — Send to Phone (older firmwares only)
- `$03*1#1$` — Get a Picture

---

## Standalone browser use

The three `willfine_*.html` files are self-contained — you can open them directly in any browser without installing the app. All logic is client-side JavaScript with no dependencies.

---

## Releasing a new build

```bash
git add .
git commit -m "your changes"
git tag v1.0.x          # bump the patch number; must match version in package.json
git push origin main --tags
```

GitHub Actions builds the macOS and Windows installers automatically, attaches them to the release, and marks it as published. The download badges on this page update to the new version. Installed copies pop up the in-app update dialog the next time they're opened.

To trigger a build without creating a release, go to **Actions → Build Mac + Windows installers → Run workflow**. Installers appear as artifacts under the run (kept 90 days).

---

## Building locally (optional)

```bash
npm install
npm start          # run in dev mode
npm run build:mac  # macOS installers (run on Mac)
npm run build:win  # Windows installers (run on Windows)
```

Output lands in `dist/`.

---

## Project layout

```
willfine-sms-app/
├── package.json              electron-builder config + deps
├── main.js                   Electron main process (window, menu, custom auto-update)
├── preload.js                contextBridge for renderer ↔ main
├── index.html                three-tab switcher UI
├── willfine_T4.0CG.html      newest-firmware tool (cyan)
├── willfine_4.0P.html        4.0P Pro mid-firmware tool (green)
├── willfine_4.0CG.html       older-firmware PNY tool (amber)
└── .github/workflows/
    └── build.yml             Mac + Windows GitHub Actions build
```

---

## Auto-update troubleshooting

If the in-app update fails on macOS, check `/tmp/willfine-update.log` for the exact step that failed. The install script falls back to opening the DMG so you can drag-install manually if `hdiutil` or `cp` errors out — your existing app stays intact in that case.

On Windows the equivalent log lives in `%TEMP%\willfine-update.log`.
