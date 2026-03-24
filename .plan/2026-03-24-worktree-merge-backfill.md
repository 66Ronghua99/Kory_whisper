---
doc_type: plan
status: active
implements:
  - codex/lightweight-postprocessor:docs/superpowers/specs/2026-03-23-asr-post-processing-pipeline-design.md
  - codex/model-cache:docs/superpowers/specs/2026-03-23-shared-whisper-model-store-design.md
verified_by: []
supersedes: []
related: []
---

# Worktree Merge-Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec Path:** `codex/lightweight-postprocessor:docs/superpowers/specs/2026-03-23-asr-post-processing-pipeline-design.md`, `codex/model-cache:docs/superpowers/specs/2026-03-23-shared-whisper-model-store-design.md`

**Goal:** Merge the remaining useful worktree behavior into the upgraded `master` architecture without regressing the runtime/profile/service split.

**Architecture:** Treat the remaining worktree changes as feature migration, not file-level merge. The ASR post-processing pipeline should plug into `transcription-service` and keep `whisper-engine` focused on Whisper execution, while the shared-model-store branch is reconciled against the already-landed runtime path layer and only missing docs or compatibility deltas should be carried over.

**Tech Stack:** Electron main process, Node.js built-in test runner, OpenCC, repository hardgate

**Allowed Write Scope:** `.plan/`, `src/main/**`, `src/renderer/settings.html`, `tests/**`, `docs/superpowers/specs/**`, `artifacts/**`, `PROGRESS.md`, `MEMORY.md`, `NEXT_STEP.md`

**Verification Commands:** `node --test tests/post-processing-*.test.js tests/config-manager.test.js tests/whisper-engine.test.js tests/composition-root.test.js tests/model-paths.test.js`, `npm run lint`, `npm test`

**Evidence Location:** `artifacts/worktree-merge-backfill/`

**Rule:** Do not expand scope during implementation. New requests must be recorded through `CHANGE_REQUEST_TEMPLATE.md`.

---

## File Map

- Create: `src/main/post-processing/apply-pipeline.js`
- Create: `src/main/post-processing/context.js`
- Create: `src/main/post-processing/create-default-pipeline.js`
- Create: `src/main/post-processing/pipeline.js`
- Create: `src/main/post-processing/stages/basic-itn.js`
- Create: `src/main/post-processing/stages/disfluency-cleanup.js`
- Create: `src/main/post-processing/stages/punctuation.js`
- Create: `src/main/post-processing/stages/script-normalization.js`
- Create: `src/main/post-processing/stages/vocabulary-replacement.js`
- Create: `src/main/vocabulary-data.js`
- Create: `tests/post-processing-runtime.test.js`
- Create: `tests/post-processing-stages.test.js`
- Modify: `src/main/app/composition-root.js`
- Modify: `src/main/config/config-defaults.js`
- Modify: `src/main/config/config-manager.js`
- Modify: `src/main/services/transcription-service.js`
- Modify: `src/main/whisper-engine.js`
- Modify: `src/renderer/settings.html`
- Modify: `tests/config-manager.test.js`
- Modify: `tests/whisper-engine.test.js`
- Modify: `tests/composition-root.test.js`
- Modify: `docs/superpowers/specs/2026-03-23-asr-post-processing-pipeline-design.md`
- Modify: `docs/superpowers/specs/2026-03-23-shared-whisper-model-store-design.md`
- Modify: `artifacts/worktree-merge-backfill/evidence.md`
- Modify: `PROGRESS.md`
- Modify: `MEMORY.md`
- Modify: `NEXT_STEP.md`

## Tasks

### Task 1: Prove the missing post-processing contract on current master

- [x] Write focused failing tests for post-processing context normalization, pipeline behavior, and `transcription-service` / composition-root wiring in the upgraded architecture.
- [x] Run the focused tests and confirm the failures come from missing post-processing files or missing service wiring rather than broken fixtures.
- [x] Add the minimal `src/main/post-processing/` and `src/main/vocabulary-data.js` modules needed to satisfy the contract while keeping `whisper-engine` transcription-focused.
- [x] Re-run the focused post-processing and service tests until they pass.
- [x] Record focused verification output in `artifacts/worktree-merge-backfill/evidence.md`.

### Task 2: Carry the renderer/config surface into the new config layer

- [x] Write or extend failing tests for config defaults/merge behavior and renderer expectations around `postProcessing`.
- [x] Run the focused config tests and confirm the red state is specific to the missing settings/config shape.
- [x] Update `src/main/config/config-defaults.js`, `src/main/config/config-manager.js`, and `src/renderer/settings.html` so saved config keeps the new `postProcessing` surface without reintroducing deprecated LLM-only UI assumptions.
- [x] Run focused config and renderer-related tests until they pass.
- [x] Record the config/UI merge notes in `artifacts/worktree-merge-backfill/evidence.md`.

### Task 3: Reconcile model-cache and documentation truth, then verify the merged branch

- [x] Compare the `codex/model-cache` branch intent against current master and capture whether code deltas are already absorbed or still missing.
- [x] Import the two worktree spec documents into the canonical repo doc tree and note any intentional deviations required by the new architecture.
- [x] Run repository verification: `npm run lint`, `npm test`, and the focused command block from this plan.
- [x] Update `PROGRESS.md`, `MEMORY.md`, and `NEXT_STEP.md` so they describe the post-merge truth and one direct next step.
- [x] Record final evidence and any blocked manual validation in `artifacts/worktree-merge-backfill/evidence.md`.

## Execution Truth

```yaml
schema: harness-execution-truth.v1
claims:
  - claim_id: plan.worktree-merge-backfill.asr-pipeline
    source_spec: codex/lightweight-postprocessor:docs/superpowers/specs/2026-03-23-asr-post-processing-pipeline-design.md
    source_anchor: frozen_contracts
    source_hash: unknown-branch-source
  - claim_id: plan.worktree-merge-backfill.shared-model-store
    source_spec: codex/model-cache:docs/superpowers/specs/2026-03-23-shared-whisper-model-store-design.md
    source_anchor: frozen_contracts
    source_hash: unknown-branch-source
```

## Completion Checklist

- [x] Spec requirements are covered
- [x] Verification commands were run fresh
- [x] Evidence location is populated or explicitly noted
- [x] Repository state docs are updated
