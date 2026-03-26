---
doc_type: plan
status: draft
implements:
  - docs/superpowers/specs/2026-03-24-windows-smoke-interactive-design.md
verified_by: []
supersedes: []
related:
  - PROGRESS.md
  - NEXT_STEP.md
  - MEMORY.md
---

# Windows Smoke Interactive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec Path:** `docs/superpowers/specs/2026-03-24-windows-smoke-interactive-design.md`

**Goal:** Build a Windows-only smoke entrypoint that proves `RIGHT CONTROL` long-press capture, microphone recording, repository-managed Whisper transcription, console output, and clipboard delivery.

**Architecture:** Add a dedicated Windows smoke runner that composes the existing shortcut, recording, transcription, permission, and clipboard seams without changing the default Electron startup path. Promote reusable Windows preflight and binary-resolution logic into runtime/platform/distribution helpers so the smoke proof can later be folded back into the formal `app`, `runtime`, and `platform` boundaries.

**Tech Stack:** Node.js, Electron clipboard surface, `uiohook-napi`, Windows `ffmpeg`/DirectShow capture, existing Whisper engine/runtime helpers, Node test runner

---

**Allowed Write Scope:** `src/main/cli/`, `src/main/platform/adapters/win32/`, `src/main/runtime/`, `src/main/distribution/`, `src/main/services/`, `tests/`, `package.json`, `PROGRESS.md`, `NEXT_STEP.md`, `MEMORY.md`, `artifacts/windows-smoke-interactive/`

**Verification Commands:** `npm test`, `npm run lint`, focused smoke usage instructions for a Windows host

**Evidence Location:** `artifacts/windows-smoke-interactive/`

**Rule:** Do not expand scope during implementation. New requests must be recorded through `CHANGE_REQUEST_TEMPLATE.md`.

## File Map

- Create: `src/main/cli/windows-smoke.js`
- Create: `tests/windows-smoke.test.js`
- Create: `artifacts/windows-smoke-interactive/verification-2026-03-24.md`
- Modify: `package.json`
- Modify: `src/main/platform/adapters/win32/permission-gateway.js`
- Modify: `src/main/platform/adapters/win32/audio-recorder.js`
- Modify: `src/main/runtime/runtime-paths.js`
- Modify: `src/main/distribution/distribution-manifest.js`
- Modify: `src/main/services/transcription-service.js`
- Modify: `PROGRESS.md`
- Modify: `NEXT_STEP.md`
- Modify: `MEMORY.md`
- Test: `tests/platform-index.test.js`
- Test: `tests/permission-service.test.js`
- Test: `tests/composition-root.test.js`

## Tasks

### Task 1: Lock Windows smoke entrypoint shape

- [ ] Write the failing test or equivalent red-state proof for a Windows-only smoke runner module that rejects non-Windows hosts and exposes the preflight/start hooks needed by the smoke flow.
- [ ] Run the focused test and confirm the expected failure is missing smoke entrypoint behavior.
- [ ] Implement `src/main/cli/windows-smoke.js` with startup banner text, Windows host guard, and composition points for preflight, shortcut, recording, transcription, and clipboard delivery.
- [ ] Run the focused test again and confirm the smoke runner contract passes.
- [ ] Record evidence notes or command output paths under `artifacts/windows-smoke-interactive/`.

### Task 2: Add Windows preflight and permission-guidance checks

- [ ] Write failing tests for Windows preflight behavior covering hook initialization failure, missing `whisper-cli.exe`, missing/invalid `ffmpeg`, and microphone-guidance surfaces.
- [ ] Run the focused tests and confirm the failures match the intended diagnostics.
- [ ] Replace the placeholder success-only behavior in `src/main/platform/adapters/win32/permission-gateway.js` with explicit detection/guidance APIs suitable for the smoke loop, and promote any reusable runtime checks into `src/main/runtime/` or nearby helper seams.
- [ ] Run focused permission/preflight tests and confirm the expected diagnostics and settings guidance are produced.
- [ ] Record the final failure messages and expected remediation notes in the evidence doc.

### Task 3: Make repository-managed Windows Whisper resolution explicit

- [ ] Write failing tests for Windows runtime/distribution resolution that assert the smoke path requires `bin/whisper-cli.exe` and does not silently fall back to PATH discovery.
- [ ] Run the focused tests and confirm the failure proves Windows Whisper packaging/runtime support is still incomplete.
- [ ] Update `src/main/distribution/distribution-manifest.js`, `src/main/runtime/runtime-paths.js`, and any related helper seams so the smoke flow resolves repository-managed Windows Whisper paths explicitly and fails clearly when the file is absent.
- [ ] Run focused runtime/distribution tests and confirm both the explicit success path and explicit missing-binary failure path behave as designed.
- [ ] Record the runtime path expectations and missing-binary error text in the evidence doc.

### Task 4: Wire the smoke dictation loop end to end

- [ ] Write the failing tests for the smoke runner’s `RIGHT CONTROL` long-press flow covering start recording, stop recording, call transcription, print transcript, and copy transcript to clipboard.
- [ ] Run the focused tests and confirm the event ordering fails for the expected missing behavior.
- [ ] Implement the minimal smoke orchestration by reusing the existing shortcut, recording, transcription, and clipboard service seams; keep text injection out of scope.
- [ ] Run focused smoke-loop tests and confirm the transcript reaches both console/log output and clipboard delivery.
- [ ] Record the validated event flow and any Windows-host manual smoke instructions in the evidence doc.

### Task 5: Expose the smoke command and keep docs truthful

- [ ] Write the failing test or red-state proof for the new package script / documented entrypoint if coverage exists; otherwise capture the before-state as a doc/evidence note.
- [ ] Add the Windows smoke command to `package.json` and any minimal usage help text required for execution.
- [ ] Run `npm run lint` and `npm test` to verify the repository still passes after the smoke entrypoint work.
- [ ] Update `PROGRESS.md`, `NEXT_STEP.md`, and `MEMORY.md` so repository truth reflects the new Windows smoke milestone, remaining packaging gaps, and next direct action.
- [ ] Finalize `artifacts/windows-smoke-interactive/verification-2026-03-24.md` with fresh verification output, limitations, and any blocked-on-Windows-host checks.

## Execution Truth

```yaml
schema: harness-execution-truth.v1
claims:
  - claim_id: plan.windows-smoke-interactive.frozen-contracts
    source_spec: docs/superpowers/specs/2026-03-24-windows-smoke-interactive-design.md
    source_anchor: frozen_contracts
    source_hash: 5c2444b67c97
  - claim_id: plan.windows-smoke-interactive.acceptance
    source_spec: docs/superpowers/specs/2026-03-24-windows-smoke-interactive-design.md
    source_anchor: acceptance
    source_hash: 5c2444b67c97
```

## Completion Checklist

- [ ] Spec requirements are covered
- [ ] Verification commands were run fresh
- [ ] Evidence location is populated or explicitly noted
- [ ] Repository state docs are updated
