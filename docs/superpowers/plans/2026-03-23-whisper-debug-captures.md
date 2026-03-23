---
doc_type: plan
status: completed
implements:
  - docs/superpowers/specs/2026-03-23-whisper-debug-captures-design.md
verified_by:
  - artifacts/whisper-debug-captures/verify.txt
  - artifacts/whisper-debug-captures/retention-check.txt
supersedes: []
related: []
---

# Whisper Debug Captures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec Path:** `docs/superpowers/specs/2026-03-23-whisper-debug-captures-design.md`

**Goal:** Preserve the latest three Whisper transcription artifacts by default so future debugging can inspect original audio, raw CLI output, and run metadata.

**Allowed Write Scope:** `src/main/**/*.js`, `tests/**`, `PROGRESS.md`, `MEMORY.md`, `NEXT_STEP.md`, `docs/superpowers/specs/**`, `docs/superpowers/plans/**`, `artifacts/**`

**Verification Commands:** `node --test tests/debug-capture-store.test.js`, `node --test tests/whisper-engine.test.js`, `npm run verify`

**Evidence Location:** `artifacts/whisper-debug-captures/`

**Rule:** Do not expand scope during implementation. New requests must be recorded through `CHANGE_REQUEST_TEMPLATE.md`.

---

## File Map

- Create: `src/main/debug-capture-store.js`
- Create: `tests/debug-capture-store.test.js`
- Modify: `src/main/whisper-engine.js`
- Modify: `src/main/index.js`
- Modify: `tests/whisper-engine.test.js`
- Modify: `PROGRESS.md`
- Modify: `MEMORY.md`

## Tasks

### Task 1: Add A Bounded Debug Capture Store

- [x] Write a failing test file for a dedicated capture helper that persists one run into a timestamped directory under an exact capture root path and prunes older captures past a retention count of three.
- [x] Run `node --test tests/debug-capture-store.test.js` and confirm it fails because the helper does not exist yet.
- [x] Implement `src/main/debug-capture-store.js` with focused responsibilities only: create capture directories, copy optional artifacts, write `meta.json`, and prune oldest entries.
- [x] Make the helper treat its constructor input as the final resolved absolute capture root path; runtime wiring must pass `${os.homedir()}/.kory-whisper/debug-captures/` (or the equivalent path from the shared app dir helper plus `/debug-captures`) explicitly rather than relying on implicit path joining inside the helper.
- [x] Re-run `node --test tests/debug-capture-store.test.js` until it passes.
- [x] Keep the helper free of Whisper invocation logic; it should only persist and prune evidence.

### Task 2: Capture Whisper Run Evidence Before Cleanup

- [x] Extend `tests/whisper-engine.test.js` with a failing regression that proves `WhisperEngine` hands the capture helper the effective prompt, args, final text/error, source temp paths, and final capture paths before cleanup.
- [x] Run `node --test tests/whisper-engine.test.js` and confirm the new assertion fails for the expected reason.
- [x] Modify `src/main/whisper-engine.js` so it accepts an injected debug capture store, records a capture on both success and failure paths, and performs normal temp cleanup only after capture persistence is attempted.
- [x] Ensure successful runs copy Whisper's emitted `.txt` verbatim into `raw.txt` before any trim/script conversion/replacements/punctuation are applied to the final returned text.
- [x] Ensure `meta.json` includes timestamp, source temp paths, final capture paths, exact prompt string, args, stdout/stderr summaries, original stdout/stderr character counts, and final text or error message.
- [x] Re-run `node --test tests/whisper-engine.test.js` until it passes.

### Task 3: Wire The Store Into The Runtime And Sync Project State

- [x] Update `src/main/index.js` to instantiate the capture store with the explicit resolved absolute path `${os.homedir()}/.kory-whisper/debug-captures/` (or the equivalent path from the shared app dir helper plus `/debug-captures`) and inject it into `WhisperEngine`.
- [x] Keep the feature always-on with retention fixed to the latest three captures; do not add a renderer setting in this loop.
- [x] Run `npm run verify` and save fresh output to `artifacts/whisper-debug-captures/verify.txt`.
- [x] Record a short manual repeated-run check under `artifacts/whisper-debug-captures/` showing only the latest three capture directories remain after four or more captures.
- [x] Update `PROGRESS.md` and `MEMORY.md` with the new debug-capture capability and how to find the preserved artifacts.
- [x] Update `NEXT_STEP.md` to point at `shortcut-manager`, because this loop materially reduced `whisper-engine`'s remaining proof gap.

## Execution Truth

```yaml
schema: harness-execution-truth.v1
claims:
  - claim_id: plan.whisper-debug-captures.retention
    source_spec: docs/superpowers/specs/2026-03-23-whisper-debug-captures-design.md
    source_anchor: frozen_contracts
    source_hash: latest-three-debug-captures
  - claim_id: plan.whisper-debug-captures.acceptance
    source_spec: docs/superpowers/specs/2026-03-23-whisper-debug-captures-design.md
    source_anchor: acceptance
    source_hash: verify-and-focused-tests
```

## Completion Checklist

- [x] Spec requirements are covered
- [x] Verification commands were run fresh
- [x] Evidence location is populated or explicitly noted
- [x] Repository state docs are updated
