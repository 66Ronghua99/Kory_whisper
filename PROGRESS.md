# Progress

## Active Milestone

M1: Freeze the Windows runtime decoupling boundary proof and keep the macOS behavior baseline honest.

## Done

- Harness bootstrap and repository governance baseline are in place
- Main-process startup is now routed through `src/main/app/` instead of staying inside `src/main/index.js`
- Runtime facts, paths, and capability derivation now live in `src/main/runtime/`
- Platform profiles and adapters are split under `src/main/platform/`
- Business-service orchestration now lives in `src/main/services/`
- The repo hardgate now blocks direct `process.platform` branching inside `src/main/services/`
- The repo hardgate now blocks direct imports of selector-owned platform adapters outside `src/main/platform/index.js`
- The guarded coverage slice now stays on the stable seam subset instead of pretending to cover the whole main process
- Architecture and testing docs now match the new composition/runtime/profile boundaries and the tracked markdown evidence format

## In Progress

- Preparing the first Windows implementation loop behind the frozen runtime/profile seams

## Pending

- Implement the first Windows-native behavior loop on top of the new `win32` profile and adapter paths
- Run macOS smoke on a mac host when one is available

## Product Snapshot

- `src/main/index.js` is now a thin entrypoint
- `src/main/app/` owns lifecycle/composition sequencing
- `src/main/runtime/` owns runtime facts, path derivation, and capability facts
- `src/main/services/` owns dictation workflow orchestration and must stay platform-agnostic
- `src/main/platform/` owns platform selection, profiles, and OS-specific adapters
- Guarded coverage remains intentionally narrow and honest
- Fresh evidence lives in tracked markdown artifacts under `artifacts/windows-runtime-decoupling/`