# Architecture Overview

## System Goal

Provide a low-friction local dictation workflow that turns a long-press shortcut into transcribed text inserted into the user's active macOS application.

## Major Boundaries

- Main-process orchestration in `src/main/index.js` and supporting managers
- Recording/transcription/post-processing services in `src/main/`
- Platform adapters in `src/main/platform/`
- Settings UI in `src/renderer/`
- External runtime assets in `bin/` and `models/`

## Invariants

- Platform-specific behavior should stay behind `src/main/platform/` rather than leaking conditional branches across the app
- Audio capture, transcription, text normalization/post-processing, and text injection should remain separate stages
- Packaged-path resolution must not be hard-coded to development-only paths
- Permission-sensitive failures should surface clearly enough to debug rather than silently degrade

## Related Docs

- `docs/architecture/layers.md`
- `docs/testing/strategy.md`
