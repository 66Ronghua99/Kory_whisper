---
doc_type: spec
status: approved
supersedes: []
related:
  - docs/testing/lint-test-design.md
---

# ASR Post-Processing Pipeline Design

## Problem

Kory Whisper's current Whisper output is acceptable as a transcription baseline, but it still regularly needs lightweight cleanup before it is ready to paste: vocabulary correction, punctuation restoration, basic spoken-form normalization, and obvious filler or repetition cleanup. The earlier local-LLM path proved too slow and too unreliable for this input-method-style workflow. We need a lightweight post-processing layer that improves final text quality without changing Whisper itself or reintroducing a generative model into the default path.

## Success

- The main delivery path becomes `audio -> Whisper -> PostProcessorPipeline -> injection`.
- Whisper remains the transcription owner; post-processing becomes a separate, pluggable layer under `src/main/post-processing/`.
- `v1` improves high-value ASR cleanup tasks without materially changing the dictation feel or requiring a model server.
- Adding a new stage later does not require rewriting `src/main/whisper-engine.js`.
- Existing user-visible `outputScript`, vocabulary, and punctuation behavior remain preserved as compatibility requirements during the move.

## Out Of Scope

- Replacing Whisper with a streaming ASR stack.
- Reintroducing generative local-LLM rewriting or semantic polishing in the default path.
- Building an audio-plus-text multimodal post-processor in `v1`.

## Critical Paths

1. Whisper returns non-empty text and `TranscriptionService` applies ordered cleanup stages before the text reaches injection.
2. A stage that is disabled, not applicable, or effectively a no-op exits quickly without affecting later stages.
3. Future stage additions plug into the same pipeline contract instead of modifying `src/main/whisper-engine.js` or `src/main/app/composition-root.js` directly.
4. Renderer settings expose one top-level `postProcessing.enabled` switch while preserving hidden legacy `whisper.llm` state in persisted config.

## Frozen Contracts
<!-- drift_anchor: frozen_contracts -->

- Post-processing lives under `src/main/post-processing/` and stays independent from `src/main/whisper-engine.js`.
- `WhisperEngine` remains transcription-only; it must not own vocabulary cleanup, ITN, or punctuation logic.
- `TranscriptionService` owns vocabulary loading, post-processing context creation, and pipeline invocation for the default runtime path.
- The main process treats post-processing as one composable pipeline, not as ad-hoc rule calls.
- Each stage implements one uniform contract equivalent to `process(state, context) -> { text, meta }`, where `state` carries the current `{ text, meta }`.
- `v1` pipeline stages are limited to lightweight ASR cleanup: script normalization for existing `outputScript` behavior, vocabulary replacement, basic ITN, disfluency cleanup, and punctuation restoration.
- `v1` pipeline input is text plus lightweight context; raw audio is not a required input for the first version.
- Future stages may extend context with timestamps or pause data, but they must still compose through the same pipeline abstraction.
- Renderer-facing config must hide legacy `whisper.llm` controls while preserving any existing persisted `whisper.llm` data on save.

## Architecture Invariants

- `src/main/app/composition-root.js` owns orchestration only and wires the pipeline through `prepareTranscriptionService`.
- `src/main/services/transcription-service.js` owns config-aware runtime preparation, vocabulary loading, and the single post-processing entrypoint.
- `src/main/post-processing/pipeline.js` owns stage ordering and stage execution.
- `src/main/post-processing/stages/` owns individual transformations; each stage should do one focused task.
- Vocabulary data remains an external context input, not a hard-coded stage constant.
- Injection remains downstream from post-processing and does not absorb cleanup logic.

## Failure Policy

- If Whisper returns empty or whitespace-only text, the pipeline must short-circuit without changing output behavior.
- If an individual stage fails, the failure must be observable in logs and the pipeline must fall back to the last known-good text instead of blocking dictation entirely.
- Stages must not silently rewrite text beyond their declared scope; invalid transformations should fail honest and leave prior text unchanged.
- Legacy config preservation should not silently reactivate LLM behavior on the default runtime path; hidden state remains inert unless a future explicit feature reintroduces it.

## Acceptance
<!-- drift_anchor: acceptance -->

- Focused automated tests prove pipeline sequencing, stage registration, no-op behavior, and failure handling.
- Focused automated tests prove the initial `v1` stages on representative ASR text cases: script normalization, vocabulary replacement, basic ITN, punctuation restoration, and obvious repetition/filler cleanup.
- Focused automated tests prove `TranscriptionService` loads vocabulary once and routes raw Whisper text through the pipeline.
- Focused automated tests prove renderer/config handling hides legacy `whisper.llm` controls while preserving hidden state on save.
- Fresh verification proves the repository baseline still passes after the post-processing layer is introduced.

## Deferred Decisions

- Whether `v1.5` should add timestamp- or pause-aware punctuation using Whisper timing data.
- Whether a dedicated small punctuation or ASR-correction model should become a future optional stage after the rule-based pipeline is stable.
- Whether legacy `whisper.llm` config should eventually get a formal migration or removal path.
