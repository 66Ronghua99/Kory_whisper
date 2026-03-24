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

## Manual Mac Validation Matrix

Use this matrix for the macOS permission onboarding loop before claiming the flow is fully verified:

| Scenario | What to check | Expected result |
| --- | --- | --- |
| Clean launch with all required permissions missing | Start the app on a fresh macOS profile or reset TCC state, then open the first-run experience | Permission onboarding opens automatically; the app stays launchable but dictation remains not ready |
| Mixed granted/missing state | Grant only Microphone, or grant Microphone plus Accessibility while Input Monitoring remains unresolved | The onboarding and tray surfaces list the granted and missing permissions separately, with the correct repair action per surface |
| Input Monitoring unknown-but-listening state | Leave Input Monitoring as unresolved in the app, then press the configured global shortcut once after the listener is active | The app treats that first real shortcut as validation, updates readiness in place, and does not immediately bounce back into System Settings |
| Return from System Settings without restart | Open a permission pane, change a permission, come back to the app, and trigger re-check | The app refreshes readiness in place and does not require a quit/relaunch to show the new state |
| Onboarding dismissed while still blocked | Close the onboarding window while permissions are still incomplete | The tray/menu bar still shows the blocked state and keeps the reopen/recheck path visible |
| Permissions completed | Finish the missing permissions and re-check readiness | The app transitions into ready state and removes the stale blocked copy without losing the normal menu state |

## Evidence Rule

Before claiming completion, record the commands run, the app mode used for validation, and the evidence produced under `artifacts/`.
