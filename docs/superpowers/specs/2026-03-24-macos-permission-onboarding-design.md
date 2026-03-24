---
doc_type: spec
status: approved
supersedes: []
related: []
---

# macOS Permission Onboarding Spec

## Problem

Kory Whisper currently treats macOS permissions as scattered prompts instead of a coherent readiness flow. Microphone access can trigger the native macOS request, but Accessibility and Input Monitoring mostly rely on warning dialogs plus manual navigation into System Settings. This leaves first-run users without a clear explanation of why the app still cannot work, and it gives returning users no persistent place to see missing permissions or recover from a partial setup.

## Success

- On first launch, if any required macOS permission is missing, Kory Whisper opens a dedicated permission onboarding window instead of relying on one-off dialogs alone.
- The app can launch and open settings, but dictation remains explicitly unavailable until Microphone, Accessibility, and Input Monitoring are all ready.
- The menu bar surface continuously shows whether the app is ready, what permission is missing, and where to fix it.
- Each required permission is presented as its own item with status, reason, and the correct repair action.
- The permission UI reflects real macOS capability boundaries: native request where available, System Settings deep-link and re-check where native request is not available.

## Out Of Scope

- Redesigning the full settings window beyond the permission-specific surfaces needed for status and repair.
- Expanding this flow to Windows or other non-macOS platforms in the same change.
- Adding optional permissions unrelated to the core dictation loop.
- Solving macOS signing, notarization, or TCC reset behavior beyond documenting their impact on validation.

## Critical Paths

1. First launch with one or more missing permissions opens a dedicated onboarding window that lists Microphone, Accessibility, and Input Monitoring separately.
2. A user can open the correct System Settings target for each missing permission directly from the onboarding UI.
3. After returning from System Settings, the user can re-check permission state without restarting the app.
4. The menu bar menu always exposes current readiness, missing permissions, and a path back into the onboarding or repair UI.
5. The dictation workflow refuses to start when readiness is incomplete and explains which required permission is still missing.

## Frozen Contracts
<!-- drift_anchor: frozen_contracts -->

- Kory Whisper must distinguish `microphone`, `accessibility`, and `input-monitoring` as separate readiness surfaces in UI and state, even if some macOS APIs expose them asymmetrically.
- App launch is allowed when permissions are incomplete, but dictation readiness must remain false until all three required permissions are satisfied.
- The first-run missing-permission experience must open a dedicated onboarding window automatically; a transient dialog alone is not sufficient.
- The menu bar menu must expose persistent readiness state and recovery actions even after the onboarding window is dismissed.
- Microphone permission may use a native request flow; Accessibility and Input Monitoring must not pretend to have native request capabilities if macOS only supports deep-link guidance plus re-check.
- Permission repair actions must deep-link to the correct macOS System Settings pane whenever the platform adapter can target it.
- Returning from System Settings must support an in-app re-check path; users must not be forced to quit and relaunch just to refresh status.

## Architecture Invariants

- macOS-specific permission detection and System Settings deep-links stay inside the Darwin permission gateway or adjacent platform adapter code, not the generic workflow layer.
- Permission orchestration stays behind a dedicated service boundary so the composition root and dictation flow consume a unified readiness model instead of encoding platform rules inline.
- The renderer should display permission state from structured data rather than infer readiness from dialog text.
- The menu bar state, onboarding window, and dictation guard must all consume the same canonical permission snapshot to avoid contradictory UI.
- Missing permissions should be treated as explicit unmet prerequisites, not as soft warnings with hidden fallback behavior.

## Failure Policy

- If the app cannot determine permission state, it should fail closed into `not-ready` for the affected surface and show actionable error context instead of assuming permission is granted.
- If a native microphone request is denied, the app should surface that denial and switch to a System Settings repair path; no silent retry loop.
- If deep-linking to a System Settings pane fails, the app should surface the failure clearly and preserve the permission as unresolved.
- If a permission remains missing after re-check, the app should keep the app in `not-ready` state; it must not partially enable hotkey capture or dictation.
- The app may allow users to close the onboarding window, but it must preserve persistent menu bar visibility of the unresolved blocking state.

## Acceptance
<!-- drift_anchor: acceptance -->

- A written permission-state model defines at least these fields: overall readiness, per-surface status for Microphone, Accessibility, and Input Monitoring, recommended action, and a refresh marker.
- A dedicated first-run onboarding surface is specified with per-permission status cards, repair actions, and a re-check action.
- A persistent menu bar status surface is specified that shows `ready` vs `not ready`, missing permissions, and a path to reopen the permission onboarding/repair UI.
- The dictation entry path is specified to block use when readiness is incomplete and to explain the blocking permission state instead of failing silently.
- Manual validation requirements include:
  - first launch with all permissions missing
  - mixed state where one or two permissions are already granted
  - return from System Settings followed by re-check without app restart
  - top bar visibility of unresolved permission state after dismissing onboarding
- Automated proof is defined for the permission-state model and UI-facing orchestration boundaries, even if final macOS authorization still needs manual evidence.

## Deferred Decisions

- Whether the permission onboarding opens as a dedicated BrowserWindow, a native sheet, or a settings-window mode as long as it remains a distinct first-run surface.
- Whether the menu bar should show missing-permission count, a textual status label, or both.
- Whether onboarding should auto-focus the first unresolved permission card after each re-check.
- Whether readiness polling on window focus is sufficient or whether additional timed refresh is worth the complexity.
- Whether a future signed/notarized distribution should adjust copy or validation notes once TCC behavior becomes more stable across builds.

## Proposed Design

### Readiness Model

Introduce a canonical permission readiness snapshot that the rest of the app can consume without knowing platform details. The snapshot should include:

- `isReady`: true only when Microphone, Accessibility, and Input Monitoring are all satisfied
- `surfaces.microphone`
- `surfaces.accessibility`
- `surfaces.inputMonitoring`
- Per surface: `status`, `reason`, `cta`, `settingsTarget`
- `firstRunNeedsOnboarding`

`status` should be expressive enough to distinguish `granted`, `missing`, and `unknown/error`. `cta` should describe the correct next action, not a generic "fix permissions" string.

### First-Run Onboarding Window

When the app starts and `isReady` is false, the app should automatically open a dedicated permission onboarding window. This window should:

- Explain that Kory Whisper is installed and running, but dictation is not available yet.
- Render three permission cards: Microphone, Accessibility, Input Monitoring.
- Show why each permission is needed in product language, not only macOS terminology.
- Offer the correct action per card:
  - Microphone: request natively when possible, then fall back to opening System Settings
  - Accessibility: open the Accessibility pane
  - Input Monitoring: open the Input Monitoring pane
- Provide a top-level `Re-check permissions` action.
- Stay re-openable from the menu bar at any time until readiness is complete.

This window is strong guidance, not a hard process lock. Users may close it, but the app must remain clearly not ready elsewhere.

### Persistent Menu Bar Status

The tray/menu bar layer should expose readiness continuously, not only during failures. When permissions are incomplete, the menu should show:

- A top-level not-ready label.
- A short explanation that dictation is unavailable until setup is completed.
- Each missing permission as its own line item or grouped section.
- An action to reopen the permission onboarding window.
- An action to re-check permissions.
- Per-permission shortcuts to the correct System Settings target if practical in the menu layout.

When all permissions are granted, this status should collapse into a normal ready state without stale warning copy.

### Dictation Guard Behavior

The dictation workflow should check the shared readiness snapshot before attempting to record or start the hotkey-driven path. If readiness is incomplete:

- The workflow must not begin recording.
- The tray state should explain that permissions are incomplete.
- The onboarding window should be reopenable immediately.
- The blocking reason should identify the missing permission surface rather than a generic failure.

This keeps the failure mode honest: the app is open, but the core feature is unavailable because setup is incomplete.

### macOS Boundary Rules

The Darwin permission gateway remains the only layer that knows how macOS exposes each permission. Its responsibilities should expand from simple `check/ensure/openSettings` calls into richer per-surface status reporting, but it should still own:

- Native microphone request
- Accessibility trust check and settings deep-link
- Input Monitoring settings deep-link
- Any best-effort refresh behavior supported by Electron/macOS APIs

Higher layers should not infer that Accessibility also implies Input Monitoring. If Input Monitoring cannot be directly checked with the current API surface, the spec should treat that as an explicit design constraint to solve honestly, for example by carrying an `unknown-needs-user-confirmation` state rather than pretending it is granted.

### Settings Visibility

The settings UI should gain a dedicated permissions section so readiness is not hidden in first-run-only flows. This section should mirror the same three-surface model and allow:

- Viewing current status
- Opening the matching System Settings pane
- Re-checking permission state
- Reading short explanations for why the permission is required

This settings section is a persistent status center, not the only onboarding entry point.

### Validation Plan

Manual validation should capture evidence for:

1. Clean macOS launch with all three permissions missing.
2. Microphone granted but Accessibility and Input Monitoring missing.
3. Accessibility granted but Input Monitoring missing.
4. Dismissing onboarding while still not ready and confirming tray/menu persistence.
5. Completing permissions and confirming the app transitions into ready state without requiring restart if the platform allows it.

Automated coverage should focus on the readiness snapshot, service orchestration, menu-model generation, and onboarding visibility rules. Native macOS authorization behavior remains manual evidence territory.
