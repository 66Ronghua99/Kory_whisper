# Architecture Overview

## System Goal

Provide a low-friction local dictation workflow that turns a long-press shortcut into transcribed text inserted into the user's active application.

## Major Boundaries

- `src/main/index.js` stays a thin Electron entrypoint
- `src/main/app/` owns startup sequencing and lifecycle wiring
- `src/main/runtime/` owns runtime facts, paths, and capability derivation
- `src/main/config/` owns config defaults and profile defaults
- `src/main/services/` owns business orchestration for dictation, shortcut handling, permissions, recording, transcription, injection, cues, and tray state
- `src/main/platform/` owns platform profiles, adapter selection, and OS-specific adapters
- `src/renderer/` owns settings UI
- `bin/` and `models/` hold external runtime assets

## Invariants

- Platform-specific behavior should stay behind runtime/profile/adapters rather than leaking `process.platform` branching across business services
- Audio capture, transcription, text normalization/post-processing, and text injection should remain separate stages
- Packaged-path resolution must not be hard-coded to development-only paths
- Permission-sensitive failures should surface clearly enough to debug rather than silently degrade

## Related Docs

- `docs/architecture/layers.md`
- `docs/testing/lint-test-design.md`