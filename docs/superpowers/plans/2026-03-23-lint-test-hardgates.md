---
doc_type: plan
status: completed
implements:
  - docs/testing/lint-test-design.md
verified_by:
  - npm run lint
  - npm test
  - npm run test:coverage
supersedes: []
related:
  - docs/testing/strategy.md
  - docs/architecture/layers.md
---

# Lint And Test Hardgates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Spec Path:** `docs/testing/lint-test-design.md`

**Goal:** Add executable lint and test hardgates that prove stable repo boundaries and ratchet the currently testable platform/config slice.

**Allowed Write Scope:** `package.json`, `package-lock.json`, `.c8rc.json`, `scripts/`, `tests/`, `docs/testing/`, `docs/superpowers/plans/`, `PROGRESS.md`, `MEMORY.md`, `NEXT_STEP.md`, `artifacts/`

**Verification Commands:** `npm run lint`, `npm test`, `npm run test:coverage`

**Evidence Location:** `artifacts/lint-test-design/`

**Rule:** Do not expand scope during implementation. New requests must be recorded through `CHANGE_REQUEST_TEMPLATE.md`.

---

## File Map

- Create: `docs/testing/lint-test-design.md`
- Create: `docs/superpowers/plans/2026-03-23-lint-test-hardgates.md`
- Create: `.c8rc.json`
- Create: `scripts/repo-hardgate.js`
- Create: `tests/config-manager.test.js`
- Create: `tests/platform-index.test.js`
- Create: `tests/repo-hardgate.test.js`
- Modify: `tests/audio-cues.test.js`
- Modify: `package.json`
- Modify: `docs/testing/strategy.md`
- Modify: `PROGRESS.md`
- Modify: `MEMORY.md`
- Modify: `NEXT_STEP.md`

## Tasks

### Task 1: Freeze lint/test design truth

- [x] Record target state, current truth, invariant matrix, exception ledger, and ratchet plan in `docs/testing/lint-test-design.md`
- [x] Save the active implementation plan in `docs/superpowers/plans/2026-03-23-lint-test-hardgates.md`

### Task 2: Add repo hardgate lint

- [x] Write a failing structural proof for forbidden platform-edge imports and renderer runtime leakage
- [x] Implement `scripts/repo-hardgate.js` with actionable failure messages
- [x] Wire `npm run lint`
- [x] Run focused verification
- [x] Record evidence artifact path

### Task 3: Raise guarded-slice proof

- [x] Write failing tests for config manager merge/load behavior, platform selector behavior, and audio cue fallback/error handling
- [x] Implement the minimal changes needed for tests and coverage config
- [x] Wire `npm run test:coverage`
- [x] Run focused verification
- [x] Record evidence artifact path

### Task 4: Sync governance docs and evidence

- [x] Update testing strategy and project state docs to reflect the new hardgates
- [x] Save fresh command outputs under `artifacts/lint-test-design/`
- [x] Set `NEXT_STEP.md` to one direct next action after this closure

## Execution Truth

```yaml
schema: harness-execution-truth.v1
claims:
  - claim_id: lint-test-hardgates.freeze-target-state
    source_spec: docs/testing/lint-test-design.md
    source_anchor: target-state
    source_hash: local-doc-updated-2026-03-23
```

## Completion Checklist

- [x] Spec requirements are covered
- [x] Verification commands were run fresh
- [x] Evidence location is populated or explicitly noted
- [x] Repository state docs are updated
