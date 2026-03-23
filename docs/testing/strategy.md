# Testing Strategy

## Goal

Protect the end-to-end dictation path and the repository's architectural boundaries while the automated test surface is still limited.

## Required Layers

1. Repo-boundary verification with `npm run lint`
2. Focused automated regression verification with `npm test`
3. Guarded-slice coverage verification with `npm run test:coverage`
4. Build/package verification with `npm run build` when packaging/runtime asset behavior changes
5. Focused diagnostic verification with `node test-keyboard.js` when shortcut handling changes
6. Manual end-to-end smoke tests for record -> transcribe -> inject on macOS
7. Manual permission-path validation for Accessibility, Input Monitoring, and Microphone flows

## Current Automated Scope

- Repo lint currently proves:
  - `src/main/index.js` does not reach platform leaf adapters directly
  - `src/main/platform/index.js` is the only production adapter selector
  - `src/renderer/` does not shell out to child processes, global keyboard hooks, or bundled runtime binaries
- Coverage ratchet currently applies only to the guarded slice listed in `.c8rc.json`
- Whole-repo coverage is intentionally deferred until more main-process seams become testable

## Evidence Rule

Before claiming completion, record the commands run, the app mode used for validation, and the evidence produced under `artifacts/`.
