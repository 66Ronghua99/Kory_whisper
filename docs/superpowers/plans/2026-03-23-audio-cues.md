---
doc_type: plan
status: active
implements:
  - docs/superpowers/specs/2026-03-23-audio-cues-design.md
verified_by: []
supersedes: []
related: []
---

# Audio Cues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add audible recording-start and output-ready cues behind a platform-neutral adapter contract.

**Architecture:** Introduce an `AudioCuePlayer` adapter surface inside `src/main/platform/`, with a real macOS implementation and a Windows-compatible no-op implementation. Keep workflow orchestration in `src/main/index.js` platform-agnostic by resolving the adapter from the platform layer once during startup.

**Tech Stack:** Electron main process, Node.js `child_process`, Node.js built-in test runner

**Spec Path:** `docs/superpowers/specs/2026-03-23-audio-cues-design.md`

**Allowed Write Scope:** `src/main/index.js`, `src/main/platform/*.js`, `tests/**`, `Progress.md`, `Memory.md`, `NEXT_STEP.md`, `docs/superpowers/specs/**`, `docs/superpowers/plans/**`, `artifacts/**`

**Verification Commands:** `node --test tests/audio-cues.test.js`

**Evidence Location:** `artifacts/audio-cues/`

**Rule:** Do not expand scope during implementation. Processing-state sound work and Windows-native playback are explicitly deferred.

---

## File Map

- Create: `src/main/platform/audio-cues-darwin.js`
- Create: `src/main/platform/audio-cues-win32.js`
- Modify: `src/main/platform/index.js`
- Modify: `src/main/index.js`
- Create: `tests/audio-cues.test.js`
- Update: `Progress.md`
- Update: `Memory.md`
- Update: `NEXT_STEP.md`

## Tasks

### Task 1: Lock the adapter contract with failing tests

- [x] Write a failing test proving the macOS adapter runs the system cue command for recording start and output-ready events
- [x] Write a failing test proving the Windows adapter exposes the same methods as no-op calls
- [x] Run `node --test tests/audio-cues.test.js` and confirm the failure is expected

### Task 2: Implement the platform adapter surface

- [x] Add the macOS audio cue adapter with injectable command execution for testability
- [x] Add the Windows audio cue adapter with the same method contract and no-op behavior
- [x] Extend `src/main/platform/index.js` with `getAudioCuePlayer()`
- [x] Run `node --test tests/audio-cues.test.js` and confirm it passes

### Task 3: Wire cues into the main workflow

- [x] Resolve the shared audio cue player during app initialization
- [x] Play the start cue only after recording starts successfully
- [x] Play the output-ready cue only after final text delivery succeeds
- [x] Run `node --test tests/audio-cues.test.js` again
- [x] Run `node --check src/main/index.js && node --check src/main/platform/index.js && node --check src/main/platform/audio-cues-darwin.js && node --check src/main/platform/audio-cues-win32.js`

### Task 4: Sync repository state docs

- [x] Update `Progress.md` with the active audio-cues loop
- [x] Update `Memory.md` with the new platform-boundary rule for audio cues
- [x] Update `NEXT_STEP.md` to the next direct action after this branch

## Execution Truth

```yaml
schema: harness-execution-truth.v1
claims:
  - claim_id: plan.audio-cues.frozen-contracts
    source_spec: docs/superpowers/specs/2026-03-23-audio-cues-design.md
    source_anchor: frozen_contracts
    source_hash: pending
```

## Completion Checklist

- [x] Spec requirements are covered
- [x] Verification commands were run fresh
- [x] Evidence location is populated or explicitly noted
- [x] Repository state docs are updated
