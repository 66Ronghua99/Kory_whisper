---
doc_type: spec
status: draft
supersedes: []
related:
  - docs/superpowers/specs/2026-03-23-windows-migration-runtime-decoupling-design.md
  - docs/architecture/overview.md
  - docs/testing/strategy.md
---

# Windows Smoke Interactive Spec

## Problem

Kory Whisper already has a `win32` profile, Windows recorder/input adapter shells, and Electron Builder Windows configuration, but the current Windows path is still incomplete for real interaction testing. Packaged Windows support is blocked because the repository does not yet bundle `bin/whisper-cli.exe`, and the current Windows permission gateway still returns placeholder success values instead of exposing real runtime checks.

At the same time, the user wants to prioritize interaction proof over installer completion. The most valuable next step is to prove that a Windows host can run the core dictation loop from a command-line smoke entrypoint: hold `RIGHT CONTROL`, record microphone input, run repository-managed Whisper, print the transcript, and copy the final text to the clipboard. That proof needs to happen without bypassing the refactored architecture or introducing a second long-lived implementation path.

## Success

- A Windows-only smoke entrypoint can be launched from the repository and clearly announces that it is listening for long-press `RIGHT CONTROL`.
- Holding `RIGHT CONTROL` for the configured threshold starts microphone recording, and releasing it stops recording and triggers transcription.
- The smoke flow invokes repository-managed `bin/whisper-cli.exe` rather than relying on a globally installed binary.
- Successful transcription is printed to the console and copied to the Windows clipboard.
- Missing or invalid prerequisites such as `whisper-cli.exe`, `ffmpeg`, microphone capture availability, or failed global key hook initialization fail explicitly with actionable diagnostics.

## Out Of Scope

- Producing a distributable Windows installer or claiming packaged Windows parity.
- Completing tray, settings-window, or Windows-native text injection UX in this spec.
- Inventing silent fallback behavior when hook, recorder, or whisper prerequisites are missing.
- Replacing the existing Electron startup flow in the same step as the smoke proof.

## Critical Paths

1. Startup preflight verifies that the host is `win32`, `uiohook-napi` can initialize, `ffmpeg` can be resolved for Windows recording, and `bin/whisper-cli.exe` exists in the repository runtime path.
2. The smoke entrypoint registers long-press `RIGHT CONTROL` through the existing shortcut service path and wires long-press start/end into recording and transcription services.
3. When dictation completes, the final transcript is printed to the console and copied through the existing clipboard delivery path.
4. After the smoke loop is proven, the implementation can be folded back into the formal composition/runtime/platform seams instead of remaining a permanent parallel path.

## Frozen Contracts
<!-- drift_anchor: frozen_contracts -->

- The first Windows interaction proof is a dedicated smoke entrypoint, not a hidden branch inside the regular Electron startup flow.
- `RIGHT CONTROL` is the fixed default trigger for this smoke loop unless a later approved spec changes it.
- The smoke flow must reuse existing service and adapter seams where practical; it is not allowed to become a throwaway one-off script that reimplements recording and transcription business logic from scratch.
- Repository-managed Windows Whisper execution must resolve through `bin/whisper-cli.exe`; the smoke flow must not silently fall back to PATH-based global Whisper discovery.
- Windows permission handling in this loop is detection and guidance, not fake success and not macOS-style permission API mimicry.
- Clipboard output is the only required delivery target for this smoke proof; focus-app text injection is explicitly deferred.

## Architecture Invariants

- Business orchestration remains separate from platform-facing adapters; the smoke entrypoint may compose services, but it must not absorb OS-specific recording or whisper process logic directly.
- Windows-specific environment checks belong in runtime/platform/distribution helpers or adapters, so the later Electron integration can reuse them.
- The repository continues to fail fast on unsupported or missing prerequisites rather than layering on speculative fallback paths.
- Smoke-only wiring must have a clear migration path back into `src/main/app/`, `src/main/platform/`, and related service boundaries after the interaction loop is proven.

## Failure Policy

- If the current host is not Windows, startup fails immediately with a message that the smoke entrypoint is Windows-only.
- If `uiohook-napi` cannot initialize the global listener, startup fails explicitly and reports that global hotkey capture is unavailable on the current machine.
- If `ffmpeg` cannot be found or cannot capture from the expected Windows input path, recording fails with the underlying diagnostic preserved.
- If `bin/whisper-cli.exe` is missing, the smoke flow fails immediately and reports that repository-managed Windows Whisper support is incomplete.
- If transcription fails, the process reports the error and preserves the existing debug/error evidence behavior instead of returning partial success.
- Allowed recovery is limited to actionable user guidance such as pointing to Windows microphone privacy settings when capture is blocked.

## Acceptance
<!-- drift_anchor: acceptance -->

- Fresh verification proves a Windows smoke command starts, performs preflight, and registers the `RIGHT CONTROL` long-press listener.
- Fresh verification on a Windows host proves long-press start/end drives microphone recording and Whisper transcription through repository-managed binaries.
- Fresh verification proves the successful transcript is both printed to the console and copied to the clipboard.
- Fresh verification proves missing `whisper-cli.exe`, missing `ffmpeg`, and failed hook initialization surface explicit errors rather than silent fallbacks.
- Project docs, progress state, next-step routing, and evidence links are updated when implementation work lands.

## Deferred Decisions

- Whether the final Windows product should keep `RIGHT CONTROL` as the default trigger beyond the smoke phase.
- Whether Windows text delivery should later support focus-app injection in addition to clipboard output.
- Whether Windows packaged builds should bundle `ffmpeg` directly or declare it as a separate prerequisite.
- The exact shape of the final Windows Electron startup UX, including tray integration and settings-driven troubleshooting surfaces.
