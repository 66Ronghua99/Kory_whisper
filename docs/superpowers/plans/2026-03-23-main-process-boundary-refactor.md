# Main-Process Boundary Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce main-process architecture drift by shrinking `src/main/index.js` back to a composition root, introducing a dedicated dictation workflow seam, and making runtime file placement match actual ownership.

**Architecture:** Keep the current directional model intact: `renderer -> main composition root -> workflow service -> platform adapters -> system/runtime`. This refactor is intentionally structural, not product-facing: preserve existing behavior while moving permission handling and dictation flow out of `index.js`, then expand automated proof to the new seam.

**Tech Stack:** Electron main process, Node.js CommonJS modules, node:test, existing repo hardgate lint, guarded-slice coverage with `c8`

---

### Task 1: Freeze The Main-Process Boundary Contract

**Files:**
- Modify: `docs/architecture/layers.md`
- Modify: `docs/architecture/overview.md`
- Modify: `docs/testing/lint-test-design.md`

- [ ] **Step 1: Update the architecture docs to name the intended ownership model**

Document these boundary rules explicitly:

```text
src/main/index.js = app lifecycle, dependency wiring, IPC registration only
src/main/dictation-workflow.js = record -> transcribe -> deliver orchestration
src/main/permission-manager.js = microphone/accessibility permission checks and prompting
src/main/platform/ = platform-specific capture, output delivery, and cue adapters
src/main/legacy/ and src/main/experimental/ = not part of the active runtime contract
```

- [ ] **Step 2: Update the hardgate design doc so the proof target matches the new structure**

Add or revise wording so future boundary checks and coverage expansion point at the new workflow seam instead of treating `index.js` as the workflow owner.

- [ ] **Step 3: Review doc wording for contract clarity**

Expected result:

```text
A future agent can tell, from docs alone, which file owns lifecycle, which file owns the dictation workflow, and which directories are intentionally outside the active runtime path.
```

---

### Task 2: Split Dictation Flow Out Of `index.js`

**Files:**
- Modify: `src/main/index.js`
- Create: `src/main/dictation-workflow.js`
- Test: `tests/dictation-workflow.test.js`

- [ ] **Step 1: Write failing tests for workflow orchestration**

Create focused tests for:

```js
// tests/dictation-workflow.test.js
test('workflow starts recording and plays the start cue on long press start', async () => {});
test('workflow stops recording, transcribes, copies text, and shows success on long press end', async () => {});
test('workflow shows an error when transcription returns empty text', async () => {});
test('workflow shows an error when recording or transcription fails', async () => {});
```

- [ ] **Step 2: Run the new workflow test file and confirm it fails**

Run: `node --test tests/dictation-workflow.test.js`  
Expected: FAIL because `src/main/dictation-workflow.js` does not exist yet

- [ ] **Step 3: Implement `src/main/dictation-workflow.js` as the runtime seam**

Move these responsibilities out of `index.js`:

```text
longPressStart handling
longPressEnd handling
recording state transitions
tray state transitions tied to dictation flow
audio cue playback during workflow
transcription + delivery orchestration
```

Expose a focused interface such as:

```js
class DictationWorkflow {
  async handleLongPressStart() {}
  async handleLongPressEnd() {}
}
```

- [ ] **Step 4: Reduce `index.js` to wiring**

Update `index.js` so it:

```text
creates the workflow with injected dependencies
registers shortcut events that call workflow methods
does not directly own the record -> transcribe -> deliver control flow
```

- [ ] **Step 5: Run workflow tests until they pass**

Run: `node --test tests/dictation-workflow.test.js`  
Expected: PASS

---

### Task 3: Extract Permission Logic Into `permission-manager.js`

**Files:**
- Modify: `src/main/index.js`
- Create: `src/main/permission-manager.js`
- Test: `tests/permission-manager.test.js`

- [ ] **Step 1: Write failing tests for permission handling**

Cover these branches:

```js
// tests/permission-manager.test.js
test('returns granted when microphone permission is already available', async () => {});
test('requests microphone permission when needed', async () => {});
test('prompts for accessibility and input monitoring guidance when accessibility is missing', async () => {});
```

- [ ] **Step 2: Run the permission-manager tests and confirm failure**

Run: `node --test tests/permission-manager.test.js`  
Expected: FAIL because `src/main/permission-manager.js` does not exist yet

- [ ] **Step 3: Implement `src/main/permission-manager.js`**

Move these methods out of `index.js`:

```text
checkPermissions
ensureMicrophonePermission
ensureAccessibilityPermission
```

Keep injected collaborators explicit:

```js
new PermissionManager({ dialog, systemPreferences, logger })
```

- [ ] **Step 4: Update `index.js` to call the new permission manager**

Expected result:

```text
index.js asks one collaborator for permission state and does not hold the platform-specific prompting logic inline.
```

- [ ] **Step 5: Run the permission tests until they pass**

Run: `node --test tests/permission-manager.test.js`  
Expected: PASS

---

### Task 4: Resolve Ambiguous Runtime Files

**Files:**
- Review: `src/main/legacy/input-simulator-legacy.js`
- Review: `src/main/legacy/audio-recorder-legacy.js`
- Review: `src/main/llm-postprocessor.js`
- Review: `src/main/local-llm.js`
- Optionally Create: `src/main/experimental/README.md`

- [ ] **Step 1: Confirm no active runtime path imports the legacy modules**

Run:

```bash
rg "input-simulator|audio-recorder" src/main tests
```

Expected:

```text
Only platform adapters and legacy references remain; no active runtime import points back to the legacy files.
```

- [ ] **Step 2: Decide whether legacy files should stay quarantined or be deleted**

Rule:

```text
Keep them only if they provide short-term migration value.
Delete them if they no longer serve runtime or near-term refactor work.
```

- [ ] **Step 3: Quarantine inactive LLM files if they are not entering the runtime contract in this loop**

Recommended outcome:

```text
If llm-postprocessor.js and local-llm.js are still not wired into the active transcription pipeline, move them under src/main/experimental/ or add an explicit note that they are not active runtime seams.
```

- [ ] **Step 4: Document the decision**

Update the relevant architecture/testing docs so future agents do not mistake legacy or experimental files for active production entrypoints.

---

### Task 5: Expand Automated Proof To The New Workflow Seam

**Files:**
- Modify: `.c8rc.json`
- Modify: `docs/testing/lint-test-design.md`
- Test: `tests/dictation-workflow.test.js`
- Test: `tests/permission-manager.test.js`

- [ ] **Step 1: Add the new seam to the guarded coverage slice**

Target additions:

```json
[
  "src/main/dictation-workflow.js",
  "src/main/permission-manager.js"
]
```

- [ ] **Step 2: Update the lint/test design doc to match the new proof boundary**

Record that the repository now has executable proof for:

```text
workflow orchestration boundary
permission handling seam
existing platform/config guarded slice
```

- [ ] **Step 3: Run lint after the structural refactor**

Run: `npm run lint`  
Expected: PASS with no new boundary violations

- [ ] **Step 4: Run the focused automated tests**

Run: `npm test`  
Expected: PASS including new workflow and permission tests

- [ ] **Step 5: Run guarded-slice coverage**

Run: `npm run test:coverage`  
Expected: PASS with the expanded include-set still meeting thresholds

---

### Task 6: Sync Repository Truth And Evidence

**Files:**
- Modify: `PROGRESS.md`
- Modify: `MEMORY.md`
- Modify: `NEXT_STEP.md`
- Save evidence under: `artifacts/`

- [ ] **Step 1: Update progress tracking**

Record:

```text
index.js no longer owns full dictation control flow
workflow seam and permission seam now exist
coverage scope expanded to match the new seams
```

- [ ] **Step 2: Update memory with new stable boundaries**

Capture the new practical rules:

```text
index.js is composition-only
dictation workflow owns record/transcribe/deliver transitions
permission prompting lives behind permission-manager
legacy and experimental paths are outside the active runtime contract
```

- [ ] **Step 3: Update the one true next step**

Recommended `NEXT_STEP.md` pointer:

```text
Choose the next seam to bring under automated proof after dictation-workflow: shortcut-manager or whisper-engine.
```

- [ ] **Step 4: Save fresh verification evidence**

Capture command outputs under `artifacts/` for:

```text
npm run lint
npm test
npm run test:coverage
```

---

### Suggested Execution Order

- [ ] Task 1: Freeze the boundary contract in docs
- [ ] Task 2: Split dictation flow out of `index.js`
- [ ] Task 3: Extract permission logic
- [ ] Task 5: Expand automated proof
- [ ] Task 6: Sync repository truth
- [ ] Task 4: Finish legacy/experimental quarantine only if still needed after the seam refactor

### Scope Guardrails

- [ ] Do not redesign the product flow or settings UX in this refactor.
- [ ] Do not widen scope into `shortcut-manager.js` or `whisper-engine.js` internals yet beyond dependency injection needed for the workflow seam.
- [ ] Do not claim whole-repo coverage; keep the ratchet honest and seam-based.
- [ ] Do not let legacy cleanup grow into a repo-wide dead-code sweep.
