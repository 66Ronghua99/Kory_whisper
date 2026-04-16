# Aliyun BYOK Cloud ASR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Aliyun Bailian/DashScope Paraformer the default BYOK cloud ASR path while preserving the existing dictation flow.

**Architecture:** Keep `DictationService` unchanged and switch transcription below `TranscriptionService` by composing either a local Whisper engine or an Aliyun cloud engine. Store cloud settings under a new `asr` config surface, redact API keys before logs/renderer/debug metadata, and keep post-processing downstream of raw ASR output.

**Tech Stack:** Electron main process, Node.js `node:test`, `ws` WebSocket client, existing config manager and transcription service.

---

### Task 1: Config Surface And Redaction

**Files:**
- Modify: `src/main/config/config-defaults.js`
- Modify: `src/main/config/config-manager.js`
- Create: `src/main/asr/redact-secrets.js`
- Test: `tests/config-manager.test.js`

- [x] **Step 1: Write the failing test**
- [x] **Step 2: Run red test**

Run: `node --test tests/config-manager.test.js`

Observed before implementation: FAIL because `asr` did not exist and renderer config exposed `sk-secret-key`.

- [x] **Step 3: Implement config defaults and redaction helper**
- [x] **Step 4: Run green test**

Run: `node --test tests/config-manager.test.js`

Observed after implementation: PASS, 14 tests.

### Task 2: Aliyun Provider And Engine

**Files:**
- Create: `src/main/asr/aliyun-paraformer-engine.js`
- Create: `src/main/asr/errors.js`
- Test: `tests/aliyun-paraformer-engine.test.js`

- [x] **Step 1: Write failing tests for missing key, WebSocket events, final text, connection test, and redacted errors**
- [x] **Step 2: Run red test**

Run: `node --test tests/aliyun-paraformer-engine.test.js`

Observed before implementation: FAIL because the module and `testConnection()` did not exist.

- [x] **Step 3: Implement minimal engine**
- [x] **Step 4: Run green test**

Run: `node --test tests/aliyun-paraformer-engine.test.js`

Observed after implementation: PASS, 4 tests.

### Task 3: Transcription Composition

**Files:**
- Modify: `src/main/services/transcription-service.js`
- Modify: `src/main/app/composition-root.js`
- Test: `tests/composition-root.test.js`
- Test: `tests/post-processing-runtime.test.js`

- [x] **Step 1: Write failing tests for cloud-default preparation and post-processing path**
- [x] **Step 2: Run red tests**

Run: `node --test tests/composition-root.test.js tests/post-processing-runtime.test.js`

Observed before implementation: FAIL because cloud mode still ran local Whisper model readiness.

- [x] **Step 3: Wire provider selection**
- [x] **Step 4: Run green tests**

Run: `node --test tests/composition-root.test.js tests/post-processing-runtime.test.js`

Observed after implementation: PASS, 23 tests.

### Task 4: Settings UI And Connection Test

**Files:**
- Modify: `src/renderer/settings.html`
- Modify: `src/main/app/composition-root.js`
- Modify: `src/main/config/config-manager.js`
- Test: `tests/settings-html.test.js`
- Test: `tests/composition-root.test.js`

- [x] **Step 1: Write failing tests for settings controls and IPC**
- [x] **Step 2: Run red tests**

Run: `node --test tests/settings-html.test.js tests/composition-root.test.js`

Observed before implementation: FAIL because UI controls, redaction, and `test-asr-connection` were absent.

- [x] **Step 3: Implement UI and IPC**
- [x] **Step 4: Run green tests**

Run: `node --test tests/settings-html.test.js tests/composition-root.test.js`

Observed after implementation: PASS, 22 tests.

### Task 5: Packaging Shape And Docs Sync

**Files:**
- Modify: `src/main/distribution/distribution-manifest.js`
- Modify: `PROGRESS.md`
- Modify: `MEMORY.md`
- Modify: `NEXT_STEP.md`
- Modify: `PROJECT_LOGS.md`
- Create: `artifacts/aliyun-byok-cloud-asr/README.md`
- Test: `tests/distribution-manifest.test.js`

- [x] **Step 1: Write failing packaging-shape test**
- [x] **Step 2: Run red test**

Run: `node --test tests/distribution-manifest.test.js`

Observed before implementation: FAIL because `models` was still in default `extraResources`.

- [x] **Step 3: Implement smallest distribution/docs sync**
- [x] **Step 4: Run final verification**

Run: `npm run verify`

Observed before final commit: lint PASS (`repo-hardgate: OK`), test PASS 150/150, coverage PASS (Statements 93.27%, Branches 83.33%, Functions 88.76%, Lines 93.27%).
