# Willfine SMS Builder

[![Version](https://img.shields.io/github/v/release/unilordgr/willfine-sms-builder?style=flat-square&color=brightgreen)](https://github.com/unilordgr/willfine-sms-builder/releases/latest)

Offline desktop app for building and decoding SMS commands for Willfine wildlife cameras. No account, no internet, no telemetry — everything runs locally.

Supports two firmware generations in one window, each with its own colour-coded tool:

| Tool | Camera | Theme |
|------|--------|-------|
| **T4.0CG** | Newer firmware | Cyan |
| **4.0CG** | Older firmware | Amber |

Switch between them using the tabs at the top, or via the **File** menu (`Cmd/Ctrl+1` / `Cmd/Ctrl+2`).

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

Three utility buttons are always visible:
- **Copy** — copies the current command to your clipboard
- **Reset to defaults** — resets all fields back to factory defaults
- **Insert default string** — pastes the default command string for the active tab so you can see the format

A **live summary panel** on the right side shows a plain-English description of what each setting will do to the camera, updating as you change options.

---

### T4.0CG — newer firmware (cyan)

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
| 23 | Time Zone | Manual (leave as-is) or Auto-sync with UTC offset picker |
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

### 4.0CG — older firmware (amber)

Identical layout to the T4.0CG tool but reflects the actual differences in the older firmware's command set:

| Feature | T4.0CG (newer) | 4.0CG (older) |
|---------|---------------|---------------|
| Pic Size options | 32M / 24M / 12M / 8M / 5M | 12M / 8M / 5M |
| Flash LED labels | High / Low | ALL / HALF |
| Frequency setting | Locked (not supported) | 50 Hz / 60 Hz (fully functional) |
| PIR Sensitivity | 9 levels (1–9) | 3 levels (High / Middle / Low) |
| GPRS Daily Report | Time range HH:MM–HH:MM | Single time HH:MM |
| FTP options | FTP / ON / FTPS | OFF / ON only |
| Send to Phone tab | Not present | **Yes** — `$06*8#…$` |

#### Send to Phone tab (`$06*8#…$`) — older firmware only

Set up to 4 MMS recipient phone numbers. Requires MMS to be enabled in the GPRS tab. The remaining 4 fields are reserved and fixed.

---

### Command decoder

Both tools include a decoder at the bottom of the page. Paste any existing command string and click **Decode** to see a plain-English breakdown of every parameter — useful for checking a command you received or verifying one before sending.

You can also click **Decode the command above ↑** to instantly decode whatever is currently shown in the output box.

The decoder understands all command types:
- `$01*27#…$` — Basic settings
- `$10*13#…$` — GPRS settings
- `$08*8#…$` — Email settings
- `$06*8#…$` — Send to Phone (older firmware only)
- `$03*1#1$` — Get a Picture

---

## Standalone browser use

The two `willfine_*.html` files are self-contained — you can open them directly in any browser without installing the app. All logic is client-side JavaScript with no dependencies.

---

## Releasing a new build

```bash
git add .
git commit -m "your changes"
git tag v1.0.x          # bump the patch number; must match version in package.json
git push origin main --tags
```

GitHub Actions builds the macOS and Windows installers automatically, attaches them to the release, and marks it as published. The download badges on this page update to the new version. Installed copies receive an in-app update prompt automatically.

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
├── main.js                   Electron main process (window + menu)
├── index.html                two-tab switcher UI
├── willfine_T4.0CG.html      newer-firmware tool (cyan)
├── willfine_4.0CG.html       older-firmware tool (amber)
└── .github/workflows/
    └── build.yml             Mac + Windows GitHub Actions build
```
