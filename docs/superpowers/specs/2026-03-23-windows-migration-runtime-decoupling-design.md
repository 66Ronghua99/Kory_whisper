---
doc_type: spec
status: approved
supersedes: []
related:
  - docs/architecture/overview.md
  - docs/architecture/layers.md
---

# Windows Migration Runtime Decoupling Design

## Problem

Kory Whisper already contains early `win32` adapter files, but the main-process entrypoint still owns too many platform-specific responsibilities. `src/main/index.js` currently mixes lifecycle startup, runtime path resolution, permission prompts, shortcut setup, recorder selection, text delivery wiring, and platform branches. At the same time, `src/main/config-manager.js` still carries mac-first defaults such as `RIGHT COMMAND` and `applescript`, while `package.json` only defines a macOS distribution chain.

That combination makes Windows migration risky: every new Windows requirement has to cut through orchestration, config defaults, and packaging assumptions at the same time. Before completing the Windows port, the repository needs a bounded refactor that separates business services from runtime facts and platform composition.

## Success

- Main-process startup composes platform-aware services through explicit runtime and profile modules instead of spreading platform branches through `src/main/index.js`.
- Runtime facts such as OS, architecture, packaged state, resource roots, shared app directories, and binary paths live behind dedicated runtime helpers.
- Platform defaults such as shortcut key, input method, permission semantics, cue capability, and installer prerequisites come from a profile layer instead of being hard-coded in config defaults.
- Business capabilities are expressed as clearly named services, so recording, shortcut handling, permissions, text injection, cue playback, and tray feedback no longer collapse into the main entrypoint.
- Distribution truth for packaged assets and installer prerequisites is explicit enough to align runtime binary resolution with `electron-builder` configuration.
- This refactor preserves current user-visible behavior on macOS while creating a clear seam for later Windows implementation work.

## Out Of Scope

- Completing the actual Windows feature parity work in this spec.
- Changing current user-visible macOS behavior such as shortcut timing, tray copy flow, cue timing, or clipboard-only output.
- Redesigning the settings UI.
- Finalizing Windows-native cue playback behavior.
- Deciding long-term pluginization beyond the bounded runtime/profile/service split.

## Critical Paths

1. App startup resolves runtime facts, selects the active platform profile, and composes business services without leaking ad hoc platform branches across the main workflow.
2. Config loading merges repository-wide defaults with platform-profile defaults so macOS and Windows can diverge safely without embedding platform assumptions in shared config code.
3. Later Windows migration work can add or complete `win32` adapters and distribution assets without reopening the main-process orchestration boundary.

## Frozen Contracts
<!-- drift_anchor: frozen_contracts -->

- `app` modules own lifecycle and composition only; they do not become a catch-all home for platform logic.
- `runtime` modules report environment facts such as `platform`, `arch`, `isPackaged`, shared directories, resource roots, and binary paths; they do not decide business behavior.
- `platform/profiles` define platform policy and defaults, including capability declarations and installer prerequisites, but do not call OS APIs directly.
- `platform/adapters` are the only layer allowed to touch system-facing APIs or external binaries such as `uiohook-napi`, `osascript`, `powershell`, `ffmpeg`, or platform permission surfaces.
- `services` express business capabilities such as shortcut handling, permissions, recording, transcription, injection, cue playback, and tray feedback through explicit interfaces rather than through platform checks.
- `config` merges base defaults with platform-profile defaults; shared config code must not hard-code platform-specific defaults such as `RIGHT COMMAND` or `applescript`.
- `distribution` provides the source of truth for packaged assets and installer prerequisites so runtime path resolution and Electron build configuration stay aligned.

## Proposed Structure

```text
src/main/
  app/
    bootstrap.js
    composition-root.js
    lifecycle.js

  runtime/
    runtime-env.js
    runtime-paths.js
    runtime-capabilities.js

  platform/
    profiles/
      darwin-profile.js
      win32-profile.js
    adapters/
      darwin/
        audio-recorder.js
        input-injector.js
        audio-cue-player.js
        permission-gateway.js
      win32/
        audio-recorder.js
        input-injector.js
        audio-cue-player.js
        permission-gateway.js

  services/
    shortcut-service.js
    dictation-service.js
    transcription-service.js
    injection-service.js
    cue-service.js
    permission-service.js
    tray-service.js

  config/
    config-manager.js
    config-defaults.js
    config-profile-defaults.js

  distribution/
    distribution-manifest.js
    bundled-assets.js

  shared/
    model-paths.js
    debug-capture-store.js
    logger.js
```

## Naming Rules

- Path segments express ownership; filenames express responsibility.
- Avoid low-information file names such as `index.js` except where a directory truly needs a minimal entrypoint.
- Prefer `platform/adapters/win32/audio-recorder.js` over broad names like `audio-win32.js`, because the path already carries platform ownership.
- Keep generic folders narrow. Do not move platform-owned or business-owned behavior into catch-all `utils/` or `helpers/` directories.

## Dependency Rules

Canonical direction:

`renderer -> app -> services -> runtime/config -> platform profiles -> platform adapters -> external binaries/system APIs`

Allowed expectations:

- `app/` may depend on `services/`, `runtime/`, `config/`, `platform/profiles/`, `platform/adapters/`, and `distribution/`.
- `services/` may depend on runtime-neutral contracts and injected collaborators, but must not branch on `process.platform`.
- `runtime/` may depend on Node/Electron environment information, but must not encode user-facing policy.
- `platform/profiles/` may depend on runtime facts and distribution truth, but must not invoke system APIs.
- `platform/adapters/` may invoke system APIs, spawn binaries, or translate platform permission behavior.
- `config/` may depend on runtime/profile defaults, but must not orchestrate the app.
- `renderer/` must not know about runtime binaries, installer prerequisites, or platform-specific permission plumbing.

Explicitly forbidden:

- Direct `process.platform` branching inside business services.
- Hard-coded platform-specific default values inside shared config defaults.
- Ad hoc binary path concatenation inside app orchestration modules.
- New multi-responsibility platform files that combine platform selection, business policy, and OS calls in one place.

## Service Contracts

The refactor should converge toward these service-facing seams:

- `permission-service`: `check()`, `ensure()`, `openSettings()`
- `shortcut-service`: `start()`, `stop()`, `onLongPressStart()`, `onLongPressEnd()`
- `recording-service`: `start()`, `stop()`
- `transcription-service`: `transcribe(audioPath)`
- `injection-service`: `deliverText(text)`
- `cue-service`: `playRecordingStart()`, `playOutputReady()`
- `tray-service`: existing tray state transitions remain intact, but are consumed through a dedicated service boundary instead of through direct entrypoint ownership

These contracts are meant to preserve current product behavior while removing orchestration debt.

## Architecture Invariants

- Main-process orchestration remains separate from recording, transcription, post-processing, injection, and platform adaptation.
- The repository keeps one explicit composition root for startup wiring instead of distributing lifecycle ownership across unrelated files.
- Platform strategy lives in profiles; platform execution lives in adapters.
- Runtime path and packaged-asset resolution flow through dedicated runtime/distribution helpers rather than through repeated string concatenation.
- This refactor does not silently degrade behavior. Missing binaries, unsupported capabilities, and invalid states should still fail explicitly with actionable diagnostics.

## Failure Policy

- If runtime facts cannot resolve a required binary path, the app should fail with an actionable error instead of guessing an ad hoc fallback.
- If a platform profile declares a capability that is not backed by a usable adapter, composition should fail clearly rather than allowing partial wiring to masquerade as supported behavior.
- Config loading should continue to merge persisted user config with defaults, but invalid platform assumptions must surface during composition or usage rather than being silently swallowed.
- Allowed fallback in this refactor is limited to existing, already-approved behavior. This spec does not introduce new silent downgrade paths.

## Rollout Plan

1. Extract `app`, `runtime`, and `distribution` seams from the current main entrypoint while preserving macOS behavior.
2. Move shared config defaults into `config-defaults.js` and add profile-aware defaults in `config-profile-defaults.js`.
3. Introduce `platform/profiles` and remap existing macOS and Windows platform modules into clearer adapter paths.
4. Lift shortcut, permissions, injection, cue, and tray collaboration behind service contracts without changing current behavior.
5. Complete later Windows migration work against the new seams instead of reopening the composition root.

## Acceptance
<!-- drift_anchor: acceptance -->

- Fresh tests prove runtime environment resolution selects the expected binary/resource paths for packaged and development contexts.
- Fresh tests prove config defaults are composed from base defaults plus platform-profile defaults rather than from hard-coded mac-only values.
- Fresh tests prove composition wiring can build the macOS runtime using injected service and adapter contracts without direct platform branching in business services.
- Fresh tests prove distribution manifest data stays consistent with runtime binary/path resolution expectations.
- Fresh architecture verification confirms no new business-service modules branch directly on `process.platform`.

## Deferred Decisions

- Exact first-release Windows support floor, such as Windows 10 versus Windows 11 only.
- Final Windows-native cue playback implementation.
- Whether future evolution should collapse profiles and adapters into a heavier provider/plugin model after the Windows port is complete.
