---
doc_type: plan
status: active
implements:
  - docs/superpowers/specs/2026-03-23-shared-whisper-model-store-design.md
verified_by: []
supersedes: []
related: []
---

# Shared Whisper Model Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Whisper model resolution to a shared user-space directory so worktrees and packaged builds reuse the same model files.

**Architecture:** Add a small path-resolution helper that defines the canonical Whisper model store under `~/.kory-whisper/models/`. Update runtime initialization, download logic, and docs to use that helper, and let packaged builds seed the shared store from bundled resources when present.

**Tech Stack:** Electron main process, Node.js built-in test runner, Node.js `fs/promises`

**Spec Path:** `docs/superpowers/specs/2026-03-23-shared-whisper-model-store-design.md`

**Allowed Write Scope:** `src/main/**/*.js`, `tests/**`, `README.md`, `Progress.md`, `Memory.md`, `NEXT_STEP.md`, `docs/superpowers/specs/**`, `docs/superpowers/plans/**`, `artifacts/**`

**Verification Commands:** `node --test tests/model-paths.test.js`

**Evidence Location:** `artifacts/shared-whisper-model-store/`

**Rule:** Do not expand scope into local LLM model migration during this loop.

---

## File Map

- Create: `src/main/model-paths.js`
- Modify: `src/main/index.js`
- Modify: `src/main/model-downloader.js`
- Modify: `src/main/config-manager.js`
- Create: `tests/model-paths.test.js`
- Modify: `README.md`
- Update: `Progress.md`
- Update: `Memory.md`
- Update: `NEXT_STEP.md`

## Tasks

### Task 1: Lock the shared path contract with failing tests

- [x] Write a failing test proving shared Whisper model paths resolve under `~/.kory-whisper/models/`
- [x] Write a failing test proving packaged runs expose a bundled seed path while development runs do not
- [x] Run `node --test tests/model-paths.test.js` and confirm the failure is expected

### Task 2: Implement shared model path resolution

- [x] Add a focused helper for shared Whisper model directories and bundled seed lookup
- [x] Update runtime model resolution in `src/main/index.js` to use the shared helper
- [x] Update default config values that currently imply repo-local Whisper model storage
- [x] Run `node --test tests/model-paths.test.js` and confirm it passes

### Task 3: Seed from bundled resources when available

- [x] Teach the downloader path flow to copy packaged bundled models into the shared store before prompting for download
- [x] Keep existing size validation and download fallback behavior intact
- [x] Run `node --test tests/model-paths.test.js` again
- [x] Run `node --check src/main/index.js && node --check src/main/model-downloader.js && node --check src/main/model-paths.js && node --check src/main/config-manager.js`

### Task 4: Sync docs and evidence

- [x] Update `README.md` to document the shared Whisper model location
- [x] Record verification evidence under `artifacts/shared-whisper-model-store/`
- [x] Update `Progress.md`, `Memory.md`, and `NEXT_STEP.md`

## Execution Truth

```yaml
schema: harness-execution-truth.v1
claims:
  - claim_id: plan.shared-whisper-model-store.frozen-contracts
    source_spec: docs/superpowers/specs/2026-03-23-shared-whisper-model-store-design.md
    source_anchor: frozen_contracts
    source_hash: pending
```

## Completion Checklist

- [x] Spec requirements are covered
- [x] Verification commands were run fresh
- [x] Evidence location is populated or explicitly noted
- [x] Repository state docs are updated
