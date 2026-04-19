---
doc_type: plan
status: draft
implements:
  - docs/superpowers/specs/2026-03-26-windows-platform-ui-contract-design.md
verified_by: []
supersedes: []
related:
  - PROGRESS.md
  - NEXT_STEP.md
  - MEMORY.md
---

# Windows Platform UI Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec Path:** `docs/superpowers/specs/2026-03-26-windows-platform-ui-contract-design.md`

**Goal:** Remove macOS-specific UI assumptions from the Windows app path by making settings and tray render from a shared platform UI contract.

**Architecture:** Keep platform truth in `src/main/platform/profiles/`, normalize it through composition-root-owned payloads, and make renderer/tray consumers render only what the active platform contract allows. Preserve the existing runtime/service boundaries and keep shared speech model storage canonical under the user-level shared store.

**Tech Stack:** Electron main/renderer, platform profiles, config/profile defaults, Node test runner

---

**Allowed Write Scope:** `src/main/app/`, `src/main/platform/profiles/`, `src/main/config/`, `src/main/tray-manager.js`, `src/renderer/`, `tests/`, `scripts/repo-hardgate.js`, `.c8rc.json`, `docs/testing/`, `PROGRESS.md`, `NEXT_STEP.md`, `MEMORY.md`, `artifacts/`

**Verification Commands:** `npm run lint`, `npm test`, `npm run test:coverage`, manual Windows unpacked-app settings/tray smoke when available

**Evidence Location:** `artifacts/windows-platform-ui-contract/`

**Rule:** Do not expand scope during implementation. New requests must be recorded through `CHANGE_REQUEST_TEMPLATE.md`.

## File Map

- Create: `artifacts/windows-platform-ui-contract/verification-2026-03-26.md`
- Modify: `src/main/platform/profiles/darwin-profile.js`
- Modify: `src/main/platform/profiles/win32-profile.js`
- Modify: `src/main/config/config-profile-defaults.js`
- Modify: `src/main/config/config-defaults.js`
- Modify: `src/main/app/composition-root.js`
- Modify: `src/main/tray-manager.js`
- Modify: `src/renderer/settings.html`
- Modify: `scripts/repo-hardgate.js`
- Modify: `.c8rc.json`
- Modify: `docs/testing/lint-test-design.md`
- Modify: `docs/testing/strategy.md`
- Test: `tests/config-manager.test.js`
- Test: `tests/composition-root.test.js`
- Test: `tests/settings-html.test.js`
- Test: `tests/tray-manager.test.js`
- Test: `tests/model-paths.test.js`
- Test: `tests/repo-hardgate.test.js`
- Test: `tests/post-processing-runtime.test.js`
- Modify: `PROGRESS.md`
- Modify: `NEXT_STEP.md`
- Modify: `MEMORY.md`

## Tasks

### Task 1: Freeze the platform UI contract surface

- [ ] Write the failing test or equivalent red-state proof for platform profiles exposing renderer/tray-facing shortcut and cue UI metadata instead of only capability facts.
- [ ] Run the focused test and confirm the failure is the expected missing contract shape.
- [ ] Add the minimum shared platform UI contract fields needed for shortcut choices, cue support/options, and any tray/settings labels that differ by platform.
- [ ] Run focused platform/config tests and confirm the new contract shape is stable.
- [ ] Record the contract fields and ownership boundary in the evidence note.

### Task 2: Align config defaults and normalization with the active platform

- [ ] Write the failing tests that prove Windows config/profile defaults normalize to Windows-safe shortcut and cue values instead of macOS-biased fallbacks.
- [ ] Run the focused tests and confirm the expected failure.
- [ ] Update config default/profile default handling so invalid or stale platform-specific values normalize to the active platform contract.
- [ ] Run focused config tests and confirm Windows defaults remain `RIGHT CONTROL` and cue config stays platform-safe.
- [ ] Record any normalization rules that intentionally change old persisted values.

### Task 3: Make settings rendering contract-driven

- [ ] Write the failing renderer tests showing that Windows mode still exposes macOS-only shortcut keys and cue sound options.
- [ ] Run the focused tests and confirm the renderer is currently driven by hard-coded option lists.
- [ ] Update `src/renderer/settings.html` and the composition-root payload so settings controls render from injected platform contract data instead of static macOS tables.
- [ ] Run focused settings/composition-root tests and confirm Windows only shows valid shortcut/cue affordances.
- [ ] Record the Windows-vs-macOS settings differences in the evidence note.

### Task 4: Make tray/menu behavior consume the same contract

- [ ] Write the failing tray tests showing the current tray/menu still relies on non-contracted defaults or misleading platform assumptions.
- [ ] Run the focused tray tests and confirm the expected failure.
- [ ] Update tray/menu rendering so non-permission platform-specific affordances also read from the normalized platform contract.
- [ ] Run focused tray tests and confirm Windows tray behavior no longer implies unsupported macOS-specific features.
- [ ] Record any intentionally retained cross-platform copy that does not need platform branching.

### Task 5: Raise lint and coverage guardrails for the new contract

- [ ] Write the failing tests or red-state proof for renderer/service/platform ownership hardgates that should now be mechanically enforced.
- [ ] Run the focused hardgate tests and confirm the expected failure.
- [ ] Update `scripts/repo-hardgate.js`, `.c8rc.json`, and any matching lint/test strategy docs so this loop's platform UI contract files are guarded and new content must reach `100%` relevant line and branch coverage.
- [ ] Run focused hardgate/coverage tests and confirm the new enforcement model is honest and passing.
- [ ] Record the invariant matrix and ratchet expectation in the evidence note.

### Task 6: Keep model storage truth explicit and sync repository state

- [ ] Write the failing test or red-state proof, if needed, that locks the shared-model-store path as the canonical runtime target.
- [ ] Run focused path/config tests and confirm the expected runtime storage location.
- [ ] Tighten any docs or UI hints that still imply speech models live primarily in the repository-local `models/` directory.
- [ ] Run `npm run lint`, `npm test`, and `npm run test:coverage`.
- [ ] Update `PROGRESS.md`, `NEXT_STEP.md`, `MEMORY.md`, and finalize `artifacts/windows-platform-ui-contract/verification-2026-03-26.md`.

## Execution Truth

```yaml
schema: harness-execution-truth.v1
claims:
  - claim_id: plan.windows-platform-ui-contract.frozen-contracts
    source_spec: docs/superpowers/specs/2026-03-26-windows-platform-ui-contract-design.md
    source_anchor: frozen_contracts
    source_hash: pending
  - claim_id: plan.windows-platform-ui-contract.acceptance
    source_spec: docs/superpowers/specs/2026-03-26-windows-platform-ui-contract-design.md
    source_anchor: acceptance
    source_hash: pending
```

## Completion Checklist

- [ ] Spec requirements are covered
- [ ] Verification commands were run fresh
- [ ] Evidence location is populated or explicitly noted
- [ ] Repository state docs are updated
