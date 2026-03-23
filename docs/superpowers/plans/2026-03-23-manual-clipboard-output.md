---
doc_type: plan
status: completed
implements:
  - docs/superpowers/specs/2026-03-23-manual-clipboard-output-design.md
verified_by:
  - artifacts/manual-clipboard-output/node-test.txt
supersedes: []
related: []
---

# Manual Clipboard Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec Path:** `docs/superpowers/specs/2026-03-23-manual-clipboard-output-design.md`

**Goal:** Leave recognized text in the clipboard for manual paste instead of auto-pasting and restoring the old clipboard.

**Architecture:** Keep the delivery-stage boundary intact by changing the platform input simulator to perform a clipboard write only. Update the success feedback so the menu bar state matches the new manual-paste workflow.

**Tech Stack:** Electron main process, platform-specific input simulator modules, Node.js built-in test runner

**Allowed Write Scope:** `src/main/index.js`, `src/main/platform/*.js`, `src/main/tray-manager.js`, `tests/**`, `PROGRESS.md`, `MEMORY.md`, `NEXT_STEP.md`, plan/spec docs, `artifacts/**`

**Verification Commands:** `node --test tests/input-simulator-darwin.test.js`

**Evidence Location:** `artifacts/manual-clipboard-output/`

**Rule:** Do not expand scope during implementation. New requests must be recorded through `CHANGE_REQUEST_TEMPLATE.md`.

---

## File Map

- Modify: `src/main/platform/input-darwin.js`
- Modify: `src/main/platform/input-win32.js`
- Modify: `src/main/tray-manager.js`
- Test: `tests/input-simulator-darwin.test.js`
- Update: `PROGRESS.md`
- Update: `MEMORY.md`
- Update: `NEXT_STEP.md`

## Tasks

### Task 1: Lock the regression with a failing test

- [x] Write the failing test or equivalent red-state proof
- [x] Run it and confirm the failure is the expected one
- [x] Implement the smallest change that satisfies the requirement
- [x] Run focused verification
- [x] Record evidence or artifact paths

### Task 2: Align user-facing success feedback

- [x] Update the success tooltip/message to say the text was copied to the clipboard
- [x] Run focused verification again
- [x] Record evidence or artifact paths

## Execution Truth

```yaml
schema: harness-execution-truth.v1
claims:
  - claim_id: plan.manual-clipboard-output.frozen-contracts
    source_spec: docs/superpowers/specs/2026-03-23-manual-clipboard-output-design.md
    source_anchor: frozen_contracts
    source_hash: 36a8d61f16276213c0a98544d36c3d87a449879d0f941ed0e3591dab1877b03a
```

## Completion Checklist

- [x] Spec requirements are covered
- [x] Verification commands were run fresh
- [x] Evidence location is populated or explicitly noted
- [x] Repository state docs are updated
