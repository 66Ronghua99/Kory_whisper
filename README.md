# Kory Whisper

[中文说明](./README.zh-CN.md)

Kory Whisper is a local voice-to-text input tool for macOS. Hold a shortcut key to record while pressing, release to transcribe, and let the result be inserted into the active text field automatically.

## Current Support

- Stable support: macOS
- Windows: in development
- Recommended install method: DMG package
- Notable capabilities:
  - Local Whisper transcription (no text sent to remote services by default)
  - Hold-to-talk shortcut workflow
  - Vocabulary customization
  - Rule-based ASR post-processing
  - Optional audio cues

## Installation

### 1) Install from DMG (recommended for normal users)

1. Download the latest `Kory Whisper` macOS package from the release page.
2. Double-click the `.dmg` file.
3. Drag `Kory Whisper.app` into `Applications`.
4. Start `Kory Whisper` from `Applications`.

Notes:

- Packaged distribution currently targets Apple Silicon/macOS primarily.
- If macOS blocks the app from an unknown developer, allow it in `System Settings -> Privacy & Security`.

### 2) Run from source

For developers or advanced users:

```bash
git clone <repository-url>
cd Kory_whisper
npm install
npm start
```

If you are a normal user, prefer the DMG installer to reduce environment dependencies.

## First Launch Flow

On first launch, you normally see:

1. A menu bar icon appears.
2. The app may request microphone access.
3. On first real dictation, it may ask to download a Whisper model.
4. After download, model files are cached in `~/.kory-whisper/models/`.

## Required Authorizations

These three permissions are required for end-to-end input:

- Microphone
- Accessibility
- Input Monitoring (for some macOS setups)

Paths:

- `System Settings -> Privacy & Security -> Microphone`
- `System Settings -> Privacy & Security -> Accessibility`
- `System Settings -> Privacy & Security -> Input Monitoring`

## Usage

1. Start `Kory Whisper`.
2. Confirm the menu bar icon appears.
3. Put the cursor in an editable text area.
4. Hold the shortcut for about 500 ms (default).
5. Speak.
6. Release the key.
7. Wait for transcribed text insertion.

Default shortcut:

- `RIGHT COMMAND`

Alternatives in settings:

- `LEFT COMMAND`
- `RIGHT OPTION`
- `LEFT OPTION`
- `RIGHT CONTROL`
- `LEFT CONTROL`
- `F13`, `F14`, `F15`

## Settings

- Shortcut and long-press duration
- Whisper model
- Language
- Output script (simplified/traditional)
- ASR post-processing toggle
- Vocabulary toggle
- Punctuation restoration
- Audio cues

This section uses rule-based local ASR post-processing only (no online LLM post-processing).

## Paths

- Config: `~/.kory-whisper/config.json`
- Vocabulary: `~/.kory-whisper/vocabulary.json`
- Models: `~/.kory-whisper/models/`
- Debug captures: `~/.kory-whisper/debug-captures/`

## Model Files and Storage

Model download checks are made against size thresholds before use.

| Whisper model key | File name       | Disk size (approx.) |
| --- | --- | --- |
| base   | `ggml-base.bin`   | 141 MB |
| small  | `ggml-small.bin`  | 466 MB |
| medium | `ggml-medium.bin` | 769 MB |

All models are resolved to:

- `~/.kory-whisper/models/<filename>`

This folder is shared between source builds, packaged apps, and different worktrees.

## Installation and Model Download Troubleshooting (Most common issue)

When the model is missing, the app opens a download dialog:

1. `Download model`
2. `Quit`

### If model download fails

Typical symptoms:

- Dialog shows an error after trying to download.
- The model still appears as missing on next launch.
- Download progress sticks or no progress is shown.

Common causes and quick checks:

- No network / unstable network.
- Corporate proxy, VPN split tunnel, or firewall blocking `huggingface.co`.
- Permission denied when writing `~/.kory-whisper/models/`.
- Partially downloaded model file (too small/invalid size).
- App started from restricted environment where permission dialogs are not available.

### Step-by-step recovery

1. Choose a stable network.
2. Retry once from the app.
3. If it still fails, remove the broken model file if present and retry:

```bash
rm -f ~/.kory-whisper/models/ggml-base.bin
rm -f ~/.kory-whisper/models/ggml-small.bin
rm -f ~/.kory-whisper/models/ggml-medium.bin
```

4. Keep one model selected in settings and try again.
5. If download is still blocked in your network, use manual install below.

### Manual model installation (what to place and where)

You can place model files directly under:

- `~/.kory-whisper/models/`

with exact file names expected by the app.

#### Option A: copy from project `models/` folder

From source checkout:

```bash
cp <your-repo>/models/ggml-base.bin ~/.kory-whisper/models/
# or
cp <your-repo>/models/ggml-small.bin ~/.kory-whisper/models/
```

#### Option B: download with command line

```bash
mkdir -p ~/.kory-whisper/models
curl -L -o ~/.kory-whisper/models/ggml-base.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

Use `ggml-small.bin` or `ggml-medium.bin` if you selected those models in app settings.

After placing the file, restart the app.

To verify size quickly:

```bash
ls -lh ~/.kory-whisper/models/
```

Expected thresholds (minimum accepted):

- `ggml-base.bin` > 100 MB
- `ggml-small.bin` > 300 MB
- `ggml-medium.bin` > 700 MB

If the file is smaller than this, delete and replace it.

### Where to report/collect logs

When asking for help, include:

- macOS version and chip architecture
- App channel used (DMG or source)
- Model key in settings
- Exact error text shown in the download error box
- Output of `ls -lh ~/.kory-whisper/models/`

## Workflow Issues (quick triage)

- App opens but shortcut does nothing:
  - Check Accessibility + Input Monitoring in `System Settings`.
  - Ensure no global shortcut conflict.
- You can record but text is not injected:
  - Accessibility is usually missing.
  - Current focused app may block synthetic input.
- Repeated errors while switching models:
  - Confirm selected model file exists in `~/.kory-whisper/models/`.
  - Confirm file naming matches selection.

## Development Commands

```bash
npm run dev
npm run verify
npm run build
```

## Roadmap

- Windows support: actively in development.
- Current focus remains on improving macOS stability and installation robustness.

## Privacy

- Transcription uses local Whisper by default.
- Audio/transcripts are not uploaded by default.
- User data and cache are kept in `~/.kory-whisper/`.

## License

MIT
