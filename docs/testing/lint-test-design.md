# Lint And Test Hardgate Design

## Target State

### Layer And File-Role Model

- `src/renderer/` owns settings UI rendering and IPC calls only.
- `src/main/index.js` is the only main-process composition root and lifecycle owner.
- `src/main/` owns workflow services and runtime helpers.
- `src/main/platform/` owns OS-specific adapters and the canonical adapter selector.
- `tests/` owns executable proof for behavior and structural boundaries.
- `scripts/` owns repo-level hardgates that fail fast with remediation guidance.

### Canonical Ownership Model

- `src/main/index.js` may depend on `src/main/platform/index.js`, but not directly on OS adapter leaf files.
- `src/main/platform/index.js` is the only production module allowed to select `*-darwin.js` or `*-win32.js` adapters.
- Clipboard delivery remains the canonical output path boundary for platform input adapters.

## Current Truth

- The repository had no `lint` script or executable repo-boundary check.
- Architecture intent existed in docs, but boundary regressions would only be caught in review.
- Tests existed for a few focused modules, but no explicit coverage gate or structural proof existed.
- Automated coverage is currently meaningful only for a narrow guarded slice, not for the whole Electron app bootstrap path.

## Transition Model

- Phase 1 adds repo-level boundary lint plus coverage ratchet for a guarded slice:
  - `src/main/config-manager.js`
  - `src/main/model-paths.js`
  - `src/main/platform/index.js`
  - `src/main/platform/audio-cues-*.js`
  - `src/main/platform/clipboard-output.js`
- Legacy modules outside that slice remain behavior-tested or manual-validation-heavy until they get isolated seams.
- Whole-repo coverage is intentionally deferred; changed-code proof for the guarded slice becomes mandatory now.

## Invariant Matrix

| Invariant Id | Target Model | Current Truth | Drift Prevented | Proof Type |
| --- | --- | --- | --- | --- |
| `LTD-001` | `src/main/index.js` depends only on `src/main/platform/index.js` for adapter selection | No automated proof existed | Main-process orchestration reaching into platform leaf adapters directly | lint |
| `LTD-002` | Only `src/main/platform/index.js` selects `*-darwin.js` / `*-win32.js` production adapters | No automated proof existed | Platform branching leaking across workflow files | lint |
| `LTD-003` | Renderer files do not reach child-process, global keyboard, or bundled binary surfaces directly | No automated proof existed | UI layer collapsing into runtime/system API behavior | lint |
| `LTD-004` | Guarded platform/config slice stays covered with executable proof | Slice coverage was implicit only | Silent erosion of the only currently testable architecture slice | behavior test + coverage gate |
| `LTD-005` | Config defaults/merge rules and audio cue fallback behavior remain stable | Partially covered | Regression in runtime defaults and supported cue semantics | behavior test |

## Lint Rule Matrix

| Invariant Id | Target Model | Current Truth | Drift Prevented | Rule Mechanism | Severity Now | Severity Target | Exception Ledger Ref | Ratchet Trigger | Remediation Signal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `LTD-001` | Main entry imports `./platform` only | No enforcement before this change | Direct adapter-leaf imports from composition root | `scripts/repo-hardgate.js` | error | error | none | none | Import `./platform` instead of `./platform/*-darwin.js` or `./platform/*-win32.js` |
| `LTD-002` | Platform selector is the singleton adapter owner | No enforcement before this change | OS branches leaking into workflow services | `scripts/repo-hardgate.js` | error | error | none | none | Route adapter creation through `src/main/platform/index.js` |
| `LTD-003` | Renderer stays on UI + IPC responsibilities | No enforcement before this change | Renderer reaching runtime/system APIs directly | `scripts/repo-hardgate.js` | error | error | none | none | Move runtime/system access behind main-process IPC or platform helpers |

## Test Strategy Matrix

| Invariant Id | Proof Type | Fixture Or Graph Scope | Current Phase | Failure Signal | Evidence Command Or Artifact | Exception Ledger Ref | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `LTD-004` | coverage gate | Guarded platform/config slice | phase-1 | `npm run test:coverage` fails threshold | `artifacts/lint-test-design/test-coverage.txt` | `LTE-001` | Threshold applies only to guarded slice |
| `LTD-005` | unit/regression | `ConfigManager`, audio cue players, platform selector | phase-1 | `npm test` fails focused assertions | `artifacts/lint-test-design/test.txt` | none | Adds proof around defaults, fallbacks, and selector behavior |
| `LTD-001` | structural | Real repository import graph | phase-1 | `npm run lint` reports forbidden import edge | `artifacts/lint-test-design/lint.txt` | none | Repo-shape proof, not runtime behavior |

## Structural Proof Matrix

| Invariant Id | Canonical Owner Or Boundary | Proof Mechanism | Current Phase | Failure Signal | Remediation Signal | Exception Ledger Ref |
| --- | --- | --- | --- | --- | --- | --- |
| `LTD-001` | `src/main/index.js` owns orchestration, not platform leaf selection | Static import scan in `scripts/repo-hardgate.js` | phase-1 | Lint reports direct import of `src/main/platform/*-darwin.js` or `*-win32.js` from `src/main/index.js` | Replace leaf import with `require('./platform')` | none |
| `LTD-002` | `src/main/platform/index.js` is the adapter selector singleton | Static import scan in `scripts/repo-hardgate.js` | phase-1 | Lint reports non-selector production file importing platform leaf adapters | Route selection through platform selector | none |
| `LTD-003` | Renderer remains UI-oriented | Static content scan in `scripts/repo-hardgate.js` | phase-1 | Lint reports renderer use of forbidden runtime modules or binaries | Move system access to main process and expose via IPC | none |

## Exception Ledger

| Exception Id | Invariant Id | Owner | Exact Scope | Current-Truth Mismatch | Reason | Target Phase Or Milestone | Removal Trigger | Ratchet Step | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `LTE-001` | `LTD-004` | repository | Coverage scope limited to guarded slice, not whole `src/main/` | Electron bootstrap and permission-heavy modules are not yet seam-friendly enough for honest whole-repo coverage | Avoid fake global threshold while still forcing proof on the cleanest current slice | next workflow-seam refactor milestone | Add isolated seams/tests for `whisper-engine`, `shortcut-manager`, or `index.js` collaborators | Expand coverage include-set before raising whole-repo claims | active |

## Ratchet Plan

| Scope | Current State | Target State | Ratchet Trigger | Next Tightening Step | Blocking Evidence |
| --- | --- | --- | --- | --- | --- |
| Repo boundary lint | New error-level repo hardgate on three stable invariants | Keep error-level and extend to more boundaries only after docs/specs freeze them | A new boundary becomes review-repeatable twice | Add new invariant to matrix + hardgate script + tests/docs in same change | `npm run lint` |
| Guarded slice coverage | Guarded slice must stay at or above 90 line / 85 branch / 85 function coverage | Expand guarded slice toward more `src/main/` services | A module gains isolated seams and at least one focused behavior test | Add file to coverage include-set and raise threshold if needed | `npm run test:coverage` |
| Legacy manual-only modules | Docs/manual validation only | Mixed behavior + structural proof | A module is touched for behavior change | Require new/changed code tests before merge | plan + evidence updates |

## Passing And Failing Examples

### Passing

- `src/main/index.js` imports `./platform` and asks it for adapters.
- `src/main/platform/index.js` selects `audio-cues-darwin.js` or `audio-cues-win32.js`.
- `src/renderer/settings.html` uses `ipcRenderer` for config save/load without invoking `child_process`.

### Failing

- A workflow file imports `src/main/platform/input-darwin.js` directly.
- A renderer file requires `child_process` to shell out to `whisper-cli`.
- A new testable helper in the guarded slice lands without enough test proof and drops coverage below threshold.

## Evidence Expectations

- `npm run lint` proves repo boundary invariants.
- `npm test` proves focused behavior/regression coverage.
- `npm run test:coverage` proves the guarded slice ratchet.
- Save fresh command output under `artifacts/lint-test-design/` whenever this hardgate set changes.
