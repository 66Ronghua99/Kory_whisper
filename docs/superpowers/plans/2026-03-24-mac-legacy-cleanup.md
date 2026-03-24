---
doc_type: plan
status: active
implements: []
verified_by: []
supersedes: []
related:
  - docs/superpowers/plans/2026-03-23-main-process-boundary-refactor.md
---

# Mac Legacy Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Mac-only legacy files and shim entrypoints that are outside the active runtime contract, without touching Windows adapter paths.

**Architecture:** Keep the active runtime on the canonical seams under `src/main/app/`, `src/main/config/`, `src/main/shared/`, and `src/main/platform/adapters/**`. Delete unreferenced Mac legacy files, move remaining Mac runtime callers to canonical module paths, and align tests/docs/coverage so the repository truth no longer treats old Mac entrypoints as first-class.

**Tech Stack:** Electron, Node.js built-in test runner, repository hardgate script, c8 coverage

---

**Spec Path:** `docs/superpowers/specs/2026-03-23-windows-migration-runtime-decoupling-design.md`

**Goal:** Remove Mac legacy runtime debris while preserving the current cross-platform architecture split.

**Allowed Write Scope:** `src/main/**`, `tests/**`, `.c8rc.json`, `docs/**`, `PROGRESS.md`, `MEMORY.md`, `NEXT_STEP.md`, `artifacts/**`

**Verification Commands:** `npm run lint`, `npm test`, `npm run test:coverage`

**Evidence Location:** `artifacts/windows-runtime-decoupling/`

**Rule:** Do not expand scope during implementation. Do not delete or rewrite `win32` adapter paths.

## File Map

- Delete: `src/main/legacy/audio-recorder-legacy.js`
- Delete: `src/main/legacy/input-simulator-legacy.js`
- Delete: `src/main/legacy/README.md`
- Delete: `src/main/llm-postprocessor.js`
- Delete: `src/main/local-llm.js`
- Delete: `src/main/config-manager.js`
- Delete: `src/main/model-paths.js`
- Modify: `src/main/app/composition-root.js`
- Modify: `tests/config-manager.test.js`
- Modify: `tests/model-paths.test.js`
- Modify: `tests/repo-hardgate.test.js`
- Modify: `.c8rc.json`
- Modify: `docs/testing/lint-test-design.md`
- Modify: repository docs that still describe deleted Mac legacy/shim entrypoints as active
- Modify: `PROGRESS.md`
- Modify: `MEMORY.md`
- Modify: `NEXT_STEP.md`

## Tasks

### Task 1: Remove shim entrypoints from the active Mac runtime path

- [x] Write failing tests that assert canonical imports are used instead of `src/main/config-manager.js` and `src/main/model-paths.js`
- [x] Run the focused tests and confirm the expected failure
- [x] Update runtime callers/tests/coverage to use canonical paths and delete the shims
- [x] Run focused verification for config/model-paths/hardgate coverage
- [x] Record evidence notes if the guarded slice changes

### Task 2: Delete unreferenced Mac legacy files

- [x] Write failing structural proof for the expected deleted file set
- [x] Run the proof and confirm it fails before deletion
- [x] Delete `src/main/legacy/*`, `src/main/local-llm.js`, and `src/main/llm-postprocessor.js`
- [x] Run focused verification to confirm no runtime/test import still points to them
- [x] Update docs that described those files as surviving runtime seams

### Task 3: Sync repository truth after cleanup

- [x] Update lint/coverage/docs so the repository truth matches the new Mac-only cleanup boundary
- [x] Run `npm run lint`
- [x] Run `npm test`
- [x] Run `npm run test:coverage`
- [x] Update `PROGRESS.md` and `MEMORY.md`, and confirm `NEXT_STEP.md` still points at the separate macOS permission-onboarding loop

## Execution Truth

```yaml
schema: harness-execution-truth.v1
claims:
  - claim_id: plan.mac-legacy-cleanup.remove-mac-shims
    source_spec: docs/superpowers/specs/2026-03-23-windows-migration-runtime-decoupling-design.md
    source_anchor: target_state
    source_hash: unknown
```

## Completion Checklist

- [x] Spec requirements are covered
- [x] Verification commands were run fresh
- [x] Evidence location is populated or explicitly noted
- [x] Repository state docs are updated
