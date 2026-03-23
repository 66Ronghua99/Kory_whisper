# Testing Strategy

## Goal

Protect the end-to-end dictation path and the repository's architectural boundaries while the automated test surface is still limited.

## Required Layers

1. Build/package verification with `npm run build`
2. Focused diagnostic verification with `node test-keyboard.js` when shortcut handling changes
3. Manual end-to-end smoke tests for record -> transcribe -> inject on macOS
4. Manual permission-path validation for Accessibility, Input Monitoring, and Microphone flows
5. Future automated tests should target the stage boundaries and packaging/path-resolution regressions first

## Evidence Rule

Before claiming completion, record the commands run, the app mode used for validation, and the evidence produced under `artifacts/`.
