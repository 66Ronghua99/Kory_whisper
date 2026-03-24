---
doc_type: plan
status: draft
implements:
  - docs/superpowers/specs/2026-03-24-macos-permission-onboarding-design.md
verified_by:
  - npm run lint
  - npm test
  - npm run test:coverage
supersedes: []
related: []
---

# macOS Permission Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec Path:** `docs/superpowers/specs/2026-03-24-macos-permission-onboarding-design.md`

**Goal:** Add a first-run macOS permission onboarding flow and persistent readiness visibility so Kory Whisper stays launchable but clearly unusable until Microphone, Accessibility, and Input Monitoring are all resolved.

**Architecture:** Keep platform-specific permission facts in the Darwin gateway, then normalize them into one canonical readiness snapshot inside the service layer. Feed that shared snapshot into tray/menu state, onboarding/settings UI, and dictation guards so every surface agrees on whether the app is ready and what the user should do next.

**Tech Stack:** Electron main process, BrowserWindow renderer HTML, Node.js CommonJS modules, `node:test`, repo hardgate lint, guarded-slice coverage with `c8`

**Allowed Write Scope:** `src/main/app/`, `src/main/platform/`, `src/main/services/`, `src/main/tray-manager.js`, `src/renderer/`, `tests/`, `.c8rc.json`, `docs/testing/`, `PROGRESS.md`, `MEMORY.md`, `NEXT_STEP.md`, `artifacts/`

**Verification Commands:** `node --test tests/permission-readiness.test.js tests/permission-service.test.js tests/tray-manager.test.js tests/settings-html.test.js tests/permission-onboarding-html.test.js tests/dictation-service.test.js tests/composition-root.test.js -v`, `npm run lint`, `npm test`, `npm run test:coverage`

**Evidence Location:** `artifacts/macos-permission-onboarding/`

**Rule:** Do not expand scope during implementation. New requests must be recorded through `CHANGE_REQUEST_TEMPLATE.md`.

---

## File Map

- Create: `src/main/services/permission-readiness.js`
- Create: `src/renderer/permission-onboarding.html`
- Create: `tests/permission-readiness.test.js`
- Create: `tests/permission-onboarding-html.test.js`
- Create: `tests/dictation-service.test.js`
- Modify: `src/main/platform/adapters/darwin/permission-gateway.js`
- Modify: `src/main/platform/profiles/darwin-profile.js`
- Modify: `src/main/services/permission-service.js`
- Modify: `src/main/services/dictation-service.js`
- Modify: `src/main/services/tray-service.js`
- Modify: `src/main/app/composition-root.js`
- Modify: `src/main/tray-manager.js`
- Modify: `src/renderer/settings.html`
- Modify: `tests/permission-service.test.js`
- Modify: `tests/tray-manager.test.js`
- Modify: `tests/settings-html.test.js`
- Modify: `tests/composition-root.test.js`
- Modify: `.c8rc.json`
- Modify: `docs/testing/strategy.md`
- Modify: `PROGRESS.md`
- Modify: `MEMORY.md`
- Modify: `NEXT_STEP.md`

## Tasks

### Task 1: Freeze The Permission Readiness Snapshot

**Files:**
- Create: `src/main/services/permission-readiness.js`
- Modify: `src/main/platform/adapters/darwin/permission-gateway.js`
- Modify: `src/main/platform/profiles/darwin-profile.js`
- Modify: `src/main/services/permission-service.js`
- Create: `tests/permission-readiness.test.js`
- Modify: `tests/permission-service.test.js`

- [ ] **Step 1: Write failing tests for the canonical readiness shape**

Add focused tests for:

```js
// tests/permission-readiness.test.js
test('builds not-ready snapshot when input monitoring is missing or unknown', () => {});
test('builds ready snapshot only when microphone accessibility and input monitoring are granted', () => {});
test('preserves per-surface cta and settings target in the normalized snapshot', () => {});

// tests/permission-service.test.js
test('permission service exposes readiness snapshot from gateway state', async () => {});
test('permission service re-check keeps the three surfaces distinct', async () => {});
```

- [ ] **Step 2: Run the focused permission tests and confirm the red state**

Run: `node --test tests/permission-readiness.test.js tests/permission-service.test.js -v`
Expected: FAIL because `src/main/services/permission-readiness.js` does not exist yet and the old service shape does not expose the new snapshot contract.

- [ ] **Step 3: Implement the smallest readiness model**

Create `src/main/services/permission-readiness.js` with a pure helper that converts raw gateway facts into a normalized snapshot like:

```js
{
  isReady: false,
  firstRunNeedsOnboarding: true,
  surfaces: {
    microphone: { status: 'missing', reason: 'required-for-recording', cta: 'request-or-open-settings', settingsTarget: 'microphone' },
    accessibility: { status: 'granted', reason: 'required-for-text-injection', cta: null, settingsTarget: 'accessibility' },
    inputMonitoring: { status: 'unknown', reason: 'required-for-global-hotkey', cta: 'open-settings-and-recheck', settingsTarget: 'input-monitoring' }
  }
}
```

Update the Darwin gateway so it reports three distinct surfaces, and update the Darwin profile so the declared permission surfaces include `input-monitoring`.

- [ ] **Step 4: Refit `PermissionService` around the shared snapshot**

Add explicit methods that higher layers can call without re-deriving platform rules:

```js
await permissionService.getReadiness();
await permissionService.ensureStartupPermissions();
await permissionService.recheckReadiness();
permissionService.openSettings('input-monitoring');
```

Keep old one-off dialog methods only if they still serve onboarding copy; do not let dialogs remain the source of truth.

- [ ] **Step 5: Re-run the focused permission tests until they pass**

Run: `node --test tests/permission-readiness.test.js tests/permission-service.test.js -v`
Expected: PASS

- [ ] **Step 6: Commit the readiness slice**

```bash
git add src/main/services/permission-readiness.js src/main/platform/adapters/darwin/permission-gateway.js src/main/platform/profiles/darwin-profile.js src/main/services/permission-service.js tests/permission-readiness.test.js tests/permission-service.test.js
git commit -m "feat: add permission readiness snapshot"
```

### Task 2: Make The Tray/Menu Bar Show Blocking Permission State

**Files:**
- Modify: `src/main/tray-manager.js`
- Modify: `src/main/services/tray-service.js`
- Modify: `tests/tray-manager.test.js`

- [ ] **Step 1: Write failing tests for persistent permission visibility**

Add coverage for:

```js
test('tray menu shows not-ready status and missing permissions when readiness is blocked', () => {});
test('tray exposes reopen-onboarding and recheck actions while permissions are incomplete', () => {});
test('transient success or error states do not erase the underlying permission-blocked menu model', () => {});
```

- [ ] **Step 2: Run the tray tests and confirm failure**

Run: `node --test tests/tray-manager.test.js -v`
Expected: FAIL because the tray currently knows only transient dictation states and has no permission-readiness model.

- [ ] **Step 3: Implement the minimal tray readiness API**

Extend `TrayManager` and `TrayService` with a persistent readiness model separate from transient states, for example:

```js
trayService.setPermissionReadiness(snapshot);
trayService.showPermissionBlocked(reasonSummary);
trayManager.openPermissionOnboarding();
```

Update the menu template so it can show:

- a top-level `Not Ready` label
- missing permissions
- `Open Permission Setup`
- `Re-check Permissions`
- direct settings actions where the menu stays readable

- [ ] **Step 4: Preserve current recording/processing/success/error feedback**

Keep the existing title/tooltip feedback loop, but ensure that once transient feedback clears, the menu and tooltip return to the correct readiness state instead of always falling back to generic `idle`.

- [ ] **Step 5: Re-run the tray tests until they pass**

Run: `node --test tests/tray-manager.test.js -v`
Expected: PASS

- [ ] **Step 6: Commit the tray slice**

```bash
git add src/main/tray-manager.js src/main/services/tray-service.js tests/tray-manager.test.js
git commit -m "feat: surface permission readiness in tray"
```

### Task 3: Add The Dedicated Permission Onboarding Window And Settings Section

**Files:**
- Create: `src/renderer/permission-onboarding.html`
- Modify: `src/renderer/settings.html`
- Modify: `src/main/tray-manager.js`
- Modify: `src/main/app/composition-root.js`
- Create: `tests/permission-onboarding-html.test.js`
- Modify: `tests/settings-html.test.js`
- Modify: `tests/composition-root.test.js`

- [ ] **Step 1: Write failing tests for renderer and IPC surfaces**

Add coverage for:

```js
// tests/permission-onboarding-html.test.js
test('permission onboarding html contains three permission cards and a recheck action', () => {});
test('permission onboarding html exposes buttons for microphone accessibility and input monitoring repair', () => {});

// tests/settings-html.test.js
test('settings html includes a persistent permissions section with status and repair actions', () => {});

// tests/composition-root.test.js
test('composition root registers permission-status ipc handlers and tray repair events', async () => {});
```

- [ ] **Step 2: Run the renderer/composition tests and confirm failure**

Run: `node --test tests/permission-onboarding-html.test.js tests/settings-html.test.js tests/composition-root.test.js -v`
Expected: FAIL because the onboarding window, new settings section, and permission IPC handlers do not exist yet.

- [ ] **Step 3: Build the onboarding surface**

Create `src/renderer/permission-onboarding.html` as a dedicated BrowserWindow UI that:

- lists Microphone, Accessibility, and Input Monitoring separately
- shows current status and why each one matters
- provides per-surface action buttons
- exposes a top-level `Re-check permissions` button
- makes it obvious that the app is running but not ready

Stay visually simple and native-leaning; do not introduce a large design-system detour.

- [ ] **Step 4: Add persistent permission visibility to settings**

Modify `src/renderer/settings.html` so the settings window includes a dedicated permissions section that mirrors the same three-surface snapshot and repair actions. Reuse the same IPC endpoints as onboarding instead of inventing a parallel status path.

- [ ] **Step 5: Wire BrowserWindow and IPC ownership in `composition-root`**

Register IPC handlers and tray events for:

```text
get-permission-readiness
recheck-permission-readiness
open-permission-settings
open-permission-onboarding
```

Keep BrowserWindow creation in the tray/main-process layer, but keep readiness data sourcing in the permission service.

- [ ] **Step 6: Re-run the renderer/composition tests until they pass**

Run: `node --test tests/permission-onboarding-html.test.js tests/settings-html.test.js tests/composition-root.test.js -v`
Expected: PASS

- [ ] **Step 7: Commit the UI slice**

```bash
git add src/renderer/permission-onboarding.html src/renderer/settings.html src/main/tray-manager.js src/main/app/composition-root.js tests/permission-onboarding-html.test.js tests/settings-html.test.js tests/composition-root.test.js
git commit -m "feat: add permission onboarding window"
```

### Task 4: Gate Startup And Dictation On The Shared Readiness Contract

**Files:**
- Modify: `src/main/app/composition-root.js`
- Modify: `src/main/services/dictation-service.js`
- Create: `tests/dictation-service.test.js`
- Modify: `tests/composition-root.test.js`

- [ ] **Step 1: Write failing tests for startup gating and dictation refusal**

Add coverage for:

```js
// tests/dictation-service.test.js
test('dictation start refuses to record and opens the matching repair flow when readiness is not ready', async () => {});
test('dictation start still allows recording when readiness is ready', async () => {});

// tests/composition-root.test.js
test('initialize opens permission onboarding on startup when readiness is blocked', async () => {});
test('initialize pushes permission readiness into tray state before shortcut startup', async () => {});
```

- [ ] **Step 2: Run the startup/dictation tests and confirm failure**

Run: `node --test tests/dictation-service.test.js tests/composition-root.test.js -v`
Expected: FAIL because startup currently only shows dialogs and dictation only checks microphone access.

- [ ] **Step 3: Update startup sequencing**

Refactor startup so `CompositionRoot.initialize()`:

- loads the readiness snapshot
- pushes it into tray/menu state
- opens onboarding automatically on first blocked startup
- continues launching the app shell
- starts shortcuts only under an honest readiness policy

If shortcut startup still happens before full readiness due to platform constraints, keep the app in a blocked state and do not claim that shortcuts are usable.

- [ ] **Step 4: Update dictation guards**

Refactor `DictationService.handleShortcutStart()` so it gates on the shared readiness snapshot instead of microphone alone. When blocked:

- do not start recording
- show a precise tray error or blocked state
- open the best matching repair surface
- keep the reason tied to the unresolved permission surface

- [ ] **Step 5: Re-run the startup/dictation tests until they pass**

Run: `node --test tests/dictation-service.test.js tests/composition-root.test.js -v`
Expected: PASS

- [ ] **Step 6: Commit the gating slice**

```bash
git add src/main/app/composition-root.js src/main/services/dictation-service.js tests/dictation-service.test.js tests/composition-root.test.js
git commit -m "feat: gate startup and dictation on permission readiness"
```

### Task 5: Expand Verification, Evidence, And Repository Truth

**Files:**
- Modify: `.c8rc.json`
- Modify: `docs/testing/strategy.md`
- Modify: `PROGRESS.md`
- Modify: `MEMORY.md`
- Modify: `NEXT_STEP.md`
- Create: `artifacts/macos-permission-onboarding/README.md`

- [ ] **Step 1: Add the new seam files to guarded coverage**

Expand `.c8rc.json` to include the new permission-readiness and permission-orchestration files that are expected to stay under automated proof.

- [ ] **Step 2: Update testing guidance**

Add the manual validation matrix from the approved spec to `docs/testing/strategy.md`, including:

- clean machine with all permissions missing
- mixed granted/missing states
- return from System Settings without restart
- onboarding dismissed but tray still blocked

- [ ] **Step 3: Create the evidence placeholder**

Create `artifacts/macos-permission-onboarding/README.md` with sections for:

- automated verification command output
- manual macOS validation notes
- known limitations such as notarization/TCC instability

- [ ] **Step 4: Run strong verification after all code changes land**

Run:

```bash
npm run lint
npm test
npm run test:coverage
```

Expected: PASS on all three commands.

- [ ] **Step 5: Sync repository state docs**

Update `PROGRESS.md`, `MEMORY.md`, and `NEXT_STEP.md` so they record:

- the completed permission onboarding loop
- where evidence lives
- the single next actionable follow-up

- [ ] **Step 6: Commit the verification/doc slice**

```bash
git add .c8rc.json docs/testing/strategy.md artifacts/macos-permission-onboarding/README.md PROGRESS.md MEMORY.md NEXT_STEP.md
git commit -m "docs: record permission onboarding verification"
```

## Execution Truth

```yaml
schema: harness-execution-truth.v1
claims:
  - claim_id: plan.macos-permission-onboarding.frozen-contracts
    source_spec: docs/superpowers/specs/2026-03-24-macos-permission-onboarding-design.md
    source_anchor: frozen_contracts
    source_hash: a3ca5baf8e4478bd921fc5838104556e4ed2cf069646544039427c502a482856
  - claim_id: plan.macos-permission-onboarding.acceptance
    source_spec: docs/superpowers/specs/2026-03-24-macos-permission-onboarding-design.md
    source_anchor: acceptance
    source_hash: a3ca5baf8e4478bd921fc5838104556e4ed2cf069646544039427c502a482856
```

## Completion Checklist

- [ ] Spec requirements are covered
- [ ] Verification commands were run fresh
- [ ] Evidence location is populated or explicitly noted
- [ ] Repository state docs are updated
