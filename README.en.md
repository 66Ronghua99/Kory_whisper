# Kory Whisper

[中文说明](./README.md)

Kory Whisper is a local voice-to-text input tool for macOS. Hold a shortcut key, speak, release the key, and the app will transcribe your speech with a local Whisper model and type the result into the current focused input.

This English README is a compact companion to the main Chinese README. For the most complete end-user setup guide, see the Chinese version above.

## Current Support

- Stable support: macOS
- Recommended install method: DMG package
- Main features:
  - Local Whisper transcription
  - Hold-to-talk shortcut workflow
  - Custom vocabulary
  - Rule-based ASR post-processing
  - Optional audio cues

## Install

### Option 1: Install from DMG

1. Download the latest macOS release package
2. Open the `.dmg`
3. Drag `Kory Whisper.app` into `Applications`
4. Launch it from `Applications`

Note:

- Current packaged support is focused on macOS
- Apple Silicon is the primary packaged target right now

### Option 2: Run from source

```bash
git clone <repository-url>
cd Kory_whisper
npm install
npm start
```

## First Launch Checklist

When you run the app for the first time:

1. The menu bar icon should appear
2. macOS will ask for microphone access
3. On the first real transcription, the app may prompt to download a Whisper model
4. Downloaded models are cached in `~/.kory-whisper/models/`

## Required Permissions

For the full “record -> transcribe -> inject text” flow to work, check these permissions:

- Microphone
- Accessibility
- Input Monitoring if shortcut listening does not respond on your macOS setup

Useful macOS paths:

- `System Settings -> Privacy & Security -> Microphone`
- `System Settings -> Privacy & Security -> Accessibility`
- `System Settings -> Privacy & Security -> Input Monitoring`

## Basic Usage

1. Launch `Kory Whisper`
2. Put the cursor in any text input field
3. Hold the shortcut for about 500ms
4. Speak
5. Release the key
6. Wait for the transcribed text to be inserted

Default shortcut:

- `RIGHT COMMAND`

Other supported shortcut values:

- `LEFT COMMAND`
- `RIGHT OPTION`
- `LEFT OPTION`
- `RIGHT CTRL`
- `LEFT CTRL`
- `F13`, `F14`, `F15`

## Important Paths

- Config: `~/.kory-whisper/config.json`
- Vocabulary: `~/.kory-whisper/vocabulary.json`
- Models: `~/.kory-whisper/models/`
- Debug captures: `~/.kory-whisper/debug-captures/`

## Recommended Default Config

```json
{
  "shortcut": {
    "key": "RIGHT COMMAND",
    "longPressDuration": 500
  },
  "whisper": {
    "model": "base",
    "language": "zh",
    "outputScript": "simplified",
    "enablePunctuation": true
  },
  "postProcessing": {
    "enabled": true
  },
  "vocabulary": {
    "enabled": true
  }
}
```

## Vocabulary

Edit `~/.kory-whisper/vocabulary.json`:

```json
{
  "words": ["OpenAI", "TypeScript", "Kubernetes"],
  "replacements": {
    "JMI": "Gemini",
    "mini max": "MiniMax"
  }
}
```

- `words` helps Whisper recognize domain terms
- `replacements` fixes recurring misrecognitions after transcription

## Developer Commands

```bash
npm run dev
npm run verify
npm run build
```

## License

MIT
