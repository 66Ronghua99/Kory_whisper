# Lint And Test Hardgate Design

## Target State

### Layer And File-Role Model

- `src/renderer/` owns settings UI rendering and IPC calls only.
- `src/main/index.js` is the thin Electron entrypoint.
- `src/main/app/` owns startup sequencing and lifecycle wiring.
- `src/main/runtime/` owns runtime facts, path derivation, and capability facts.
- `src/main/config/` owns config defaults and profile defaults.
- `src/main/services/` owns dictation orchestration and other business services.
- `src/main/platform/` owns platform profile selection and OS-specific adapters.
- `tests/` owns executable proof for behavior and structural boundaries.
- `scripts/` owns repo-level hardgates that fail fast with remediation guidance.

### Canonical Ownership Model

- `src/main/index.js` may depend on `src/main/app/`, but it should not own the workflow graph.
- `src/main/platform/index.js` is the only production module allowed to select `src/main/platform/adapters/**` or the remaining legacy OS leaf modules under `src/main/platform/`.
- `src/main/services/` should consume injected runtime/profile facts instead of reading `process.platform`.
- Clipboard delivery remains the canonical output-path boundary for platform input adapters.

## Current Truth

- The repository now has a repo-boundary hardgate and a guarded coverage ratchet.
- The hardgate blocks `src/main/index.js` from reaching selector-owned platform modules directly.
- The hardgate blocks non-selector production files from importing platform adapters or remaining legacy selector-owned platform leaves directly.
- The hardgate blocks direct `process.platform` branching inside `src/main/services/`.
- Tests cover the frozen seams around runtime, config, platform selection, and distribution truth.
- Automated coverage is intentionally meaningful only for the stable seam subset, not for the whole Electron bootstrap path.

## Transition Model

- Phase 1 keeps the honest guarded slice focused on the stable seam subset only:
  - `src/main/config/**`
  - `src/main/distribution/**`
  - `src/main/platform/index.js`
  - `src/main/platform/audio-cues-*.js`
  - `src/main/platform/clipboard-output.js`
  - `src/main/platform/profiles/**`
  - `src/main/runtime/runtime-capabilities.js`
  - `src/main/runtime/runtime-paths.js`
  - `src/main/shared/model-paths.js`
- The app/composition layer, service layer, runtime-env shim, and platform adapter implementations stay behavior-tested or manual-validation-heavy until they gain more isolated proof.
- Whole-repo coverage is intentionally deferred; changed-code proof for the guarded slice remains mandatory now.

## Invariant Matrix

| Invariant Id | Target Model | Current Truth | Drift Prevented | Proof Type |
| --- | --- | --- | --- | --- |
| `LTD-001` | `src/main/index.js` depends only on `src/main/platform/index.js` for platform implementation selection | Automated proof exists | Main-process orchestration reaching into selector-owned platform leaves directly | lint |
| `LTD-002` | Only `src/main/platform/index.js` selects `src/main/platform/adapters/**` and the remaining legacy OS leaf modules | Automated proof exists | Platform implementation selection leaking into workflow files | lint |
| `LTD-003` | Renderer files do not reach child-process, global keyboard, or bundled binary surfaces directly | Automated proof exists | UI layer collapsing into runtime/system API behavior | lint |
| `LTD-004` | Business-service modules do not branch directly on `process.platform` | Automated proof exists | Runtime/platform policy leaking into service orchestration | lint |
| `LTD-005` | Guarded seam coverage stays honest and narrow | Slice coverage is explicit now | Silent erosion of the only currently testable architecture slice | behavior test + coverage gate |

## Lint Rule Matrix

| Invariant Id | Target Model | Current Truth | Drift Prevented | Rule Mechanism | Severity Now | Severity Target | Exception Ledger Ref | Ratchet Trigger | Remediation Signal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `LTD-001` | Main entry imports `./platform` only | Enforced | Direct selector-owned platform-leaf imports from the composition root | `scripts/repo-hardgate.js` | error | error | none | none | Import `./platform` instead of selector-owned platform modules |
| `LTD-002` | Platform selector is the singleton platform-implementation owner | Enforced | Adapter or legacy selector-leaf selection leaking into workflow files | `scripts/repo-hardgate.js` | error | error | none | none | Route platform implementation selection through `src/main/platform/index.js` |
| `LTD-003` | Renderer stays on UI + IPC responsibilities | Enforced | Renderer reaching runtime/system APIs directly | `scripts/repo-hardgate.js` | error | error | none | none | Move runtime/system access behind IPC or platform helpers |
| `LTD-004` | Business services stay platform-agnostic | Enforced | `process.platform` branching inside service orchestration | `scripts/repo-hardgate.js` | error | error | none | none | Resolve runtime/profile facts before branching |

## Test Strategy Matrix

| Invariant Id | Proof Type | Fixture Or Graph Scope | Current Phase | Failure Signal | Evidence Command Or Artifact | Exception Ledger Ref | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `LTD-005` | coverage gate | Stable seam slice only | phase-1 | `npm run test:coverage` fails threshold | `artifacts/windows-runtime-decoupling/test-coverage.md` | `LTE-001` | Slice excludes app/services/adapters/runtime-env until those seams are independently proved |
| `LTD-001` | structural | Real repository import graph | phase-1 | `npm run lint` reports forbidden import edge | `artifacts/windows-runtime-decoupling/lint.md` | none | Repo-shape proof, not runtime behavior |
| `LTD-004` | structural | `src/main/services/**` | phase-1 | `npm run lint` reports direct `process.platform` branching | `artifacts/windows-runtime-decoupling/lint.md` | none | Prevents platform policy from re-entering business services |
| `LTD-005` | behavior | App/runtime/config/platform/distribution seams | phase-1 | `npm test` fails focused assertions | `artifacts/windows-runtime-decoupling/test.md` | none | Keeps the frozen seam set executable |

## Structural Proof Matrix

| Invariant Id | Canonical Owner Or Boundary | Proof Mechanism | Current Phase | Failure Signal | Remediation Signal | Exception Ledger Ref |
| --- | --- | --- | --- | --- | --- | --- |
| `LTD-001` | `src/main/index.js` owns orchestration, not platform implementation selection | Static import scan in `scripts/repo-hardgate.js` | phase-1 | Lint reports direct import of selector-owned platform modules from `src/main/index.js` | Replace the import with `require('./platform')` | none |
| `LTD-002` | `src/main/platform/index.js` is the platform selector singleton | Static import scan in `scripts/repo-hardgate.js` | phase-1 | Lint reports non-selector production file importing platform adapters or legacy selector-owned leaves | Route selection through the platform selector | none |
| `LTD-003` | Renderer remains UI-oriented | Static content scan in `scripts/repo-hardgate.js` | phase-1 | Lint reports renderer use of forbidden runtime modules or binaries | Move system access to the main process and expose it via IPC | none |
| `LTD-004` | `src/main/services/` stays platform-agnostic | Token-based content scan in `scripts/repo-hardgate.js` | phase-1 | Lint reports `process.platform`, destructured aliases, or bracket access inside a service module | Resolve runtime/profile facts first, then branch outside the service layer | none |

## Exception Ledger

| Exception Id | Invariant Id | Owner | Exact Scope | Current-Truth Mismatch | Reason | Target Phase Or Milestone | Removal Trigger | Ratchet Step | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `LTE-001` | `LTD-005` | repository | Coverage scope is limited to the stable seam slice, not whole `src/main/` | Electron bootstrap, service orchestration, runtime-env branching, and platform adapter implementations are not yet seam-friendly enough for honest whole-slice coverage | Avoid fake global threshold while still forcing proof on the cleanest current slice | next workflow-seam refactor milestone | Add isolated seams/tests for the remaining behavior-heavy modules | Expand coverage include-set only when the new seam gets its own proof | active |

## Ratchet Plan

| Scope | Current State | Target State | Ratchet Trigger | Next Tightening Step | Blocking Evidence |
| --- | --- | --- | --- | --- | --- |
| Repo boundary lint | Error-level repo hardgate on four stable invariants | Keep error-level and add more boundaries only after docs/specs freeze them | A new boundary becomes review-repeatable twice | Add new invariant to matrix + hardgate script + tests/docs in the same change | `npm run lint` |
| Guarded slice coverage | Guarded slice tracks the stable seam subset only | Expand the slice only when a new seam is frozen and tested | A module gains isolated seams and focused behavior tests | Add file to coverage include-set and keep the threshold honest | `npm run test:coverage` |
| Legacy manual-only modules | Docs/manual validation only | Mixed behavior + structural proof | A module is touched for behavior change | Require new/changed code tests before merge | plan + evidence updates |

## Passing And Failing Examples

### Passing

- `src/main/index.js` imports `./platform` and asks it for adapters.
- `src/main/services/dictation-service.js` consumes injected runtime/profile facts and never reads `process.platform`.
- `src/main/platform/index.js` selects adapters from `src/main/platform/adapters/**` and remains the singleton owner for any surviving legacy OS leaf modules.
- Config/runtime callers use `src/main/config/config-manager.js` and `src/main/shared/model-paths.js` directly instead of deleted top-level shims.
- `src/renderer/settings.html` uses `ipcRenderer` for config save/load without invoking `child_process`.

### Failing

- A service file branches on `process.platform` to decide which input path to take.
- A workflow file imports `src/main/platform/adapters/win32/audio-recorder.js` or `src/main/platform/audio-darwin.js` directly.
- A renderer file requires `child_process` to shell out to `whisper-cli`.
- A new testable helper in the guarded slice lands without enough test proof and drops coverage below threshold.

## Evidence Expectations

- `npm run lint` proves repo boundary invariants.
- `npm test` proves focused behavior/regression coverage.
- `npm run test:coverage` proves the guarded slice ratchet.
- Save fresh command output under tracked markdown artifacts in `artifacts/windows-runtime-decoupling/` whenever this hardgate set changes: `lint.md`, `test.md`, `test-coverage.md`, and `manual-macos-smoke.md`.
