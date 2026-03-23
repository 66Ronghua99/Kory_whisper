---
doc_type: spec
status: approved
supersedes: []
related: []
---

# Audio Cues Design

## Problem

Kory Whisper currently relies on tray state alone to communicate workflow progress. Recording start and successful output delivery do not have audible feedback, so the interaction feels weak during hands-busy dictation. At the same time, the repository is expected to support Windows later, so platform-specific cue logic should not leak into the main workflow.

## Success

- Starting a recording plays an audible macOS system cue once recording has actually started.
- Successful output delivery plays an audible macOS system cue once the final text handoff is complete.
- The main workflow calls a platform-neutral audio cue interface and does not branch on platform details.
- Windows keeps a compatible adapter surface even if cue playback remains a no-op for now.

## Out Of Scope

- Adding a processing-phase sound.
- Choosing final Windows cue behavior.
- Redesigning the broader feedback system beyond the two requested cue points.

## Critical Paths

1. Long press begins, recording starts successfully, and the app emits one audible start cue.
2. Transcription completes, final text delivery succeeds, and the app emits one audible completion cue.

## Frozen Contracts
<!-- drift_anchor: frozen_contracts -->

- `platform.getAudioCuePlayer()` returns an object with platform-neutral cue methods for workflow use.
- Main-process workflow code triggers cue playback only after recording start succeeds and after final text delivery succeeds.
- macOS cue playback uses built-in system behavior and surfaces real playback failures to logs without crashing the main workflow.
- Windows exposes the same cue methods through a dedicated adapter, even if the current implementation is a no-op.

## Architecture Invariants

- Platform branching stays inside `src/main/platform/`.
- Audio cue playback remains separate from tray state and from clipboard delivery logic.
- Main workflow orchestration in `src/main/index.js` depends only on the shared adapter contract.

## Failure Policy

- Failure to start recording still behaves as an error and must not emit a misleading success cue.
- Failure to copy text to the clipboard still behaves as an error and must not emit the completion cue.
- Cue playback failures should be logged and tolerated so they do not block dictation.

## Acceptance
<!-- drift_anchor: acceptance -->

- A focused regression test proves the macOS adapter runs the expected system cue command for both supported cue methods.
- A focused regression test proves the Windows adapter exposes the same cue methods without requiring platform-specific behavior from callers.
- Fresh verification confirms the focused audio cue tests pass after implementation.

## Deferred Decisions

- Which Windows-native sound API should back the win32 adapter later.
- Whether future feedback work should combine tray, sound, and notifications behind a larger feedback service.
