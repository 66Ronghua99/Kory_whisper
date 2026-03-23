---
doc_type: spec
status: approved
supersedes: []
related:
  - docs/superpowers/plans/2026-03-23-whisper-debug-captures.md
---

# Whisper Debug Captures Spec

## Problem

Recent dictation regressions are hard to diagnose because the app deletes temporary `.wav` and `.txt` transcription files immediately after a run. When a user reports that Whisper returned only a trailing fragment or echoed a prompt-like phrase, there is no preserved audio or raw CLI output left to inspect.

## Success

- The app preserves enough evidence from the latest three transcription attempts to let a later debugging session re-run `whisper-cli` against the original captured audio.
- Each preserved capture includes the original audio, raw Whisper text output when available, and structured metadata showing the actual CLI arguments, prompt, and result/error summary used for that run.
- The capture store self-prunes so the feature can stay on by default without unbounded disk growth.

## Out Of Scope

- No renderer/UI settings are added for this loop.
- No change is made yet to the current prompt strategy or Whisper decoding parameters.
- No long-term archive, export flow, or cloud upload is introduced.

## Critical Paths

1. A successful transcription stores `audio.wav`, `raw.txt`, and `meta.json` under a stable debug-capture directory before temporary files are cleaned up.
2. A failed transcription still stores `audio.wav` when available plus `meta.json`, and stores `raw.txt` only if Whisper produced one before failing.
3. After each capture write, the store removes older entries so only the most recent three remain.

## Frozen Contracts
<!-- drift_anchor: frozen_contracts -->

- Debug captures live under the resolved absolute path `${os.homedir()}/.kory-whisper/debug-captures/` (or the equivalent path derived from the existing shared app dir helper plus `/debug-captures`).
- The retention policy is always-on and fixed to the latest three captures for this scope.
- Each capture is stored in its own timestamped directory and contains only repo-local debugging artifacts: `audio.wav`, optional `raw.txt`, and `meta.json`.
- `raw.txt`, when present, is copied verbatim from Whisper's emitted `.txt` before trim/script conversion/vocabulary replacements/punctuation or any other post-processing.
- `meta.json` must record enough information to reproduce the run context: timestamp, source temp paths, final capture paths, Whisper args, effective prompt string, stdout/stderr summaries, and final text or error message.
- stdout/stderr summaries are stored as truncated text previews capped at 4096 characters each, plus original character counts, so debugging keeps evidence without unbounded log growth.
- Capture persistence must happen before temporary cleanup so debugging evidence survives normal runtime cleanup.

## Architecture Invariants

- Capture retention is implemented as a dedicated main-process helper with one responsibility: persist a bounded amount of debugging evidence.
- `src/main/whisper-engine.js` remains the owner of Whisper invocation and decides what run metadata is handed to the capture helper.
- Normal user-facing behavior remains unchanged except for the existence of the retained debug artifacts.

## Failure Policy

- If writing a debug capture fails, the app logs the failure and continues the dictation flow; capture persistence must never block or fail the user-facing transcription result by itself.
- Invalid or missing temporary artifacts are tolerated explicitly: keep whatever evidence exists, record the missing piece in metadata, and continue.
- Retention cleanup deletes oldest capture directories first; partial cleanup failures are logged and do not abort the current run.

## Acceptance
<!-- drift_anchor: acceptance -->

- `node --test tests/debug-capture-store.test.js`
- `node --test tests/whisper-engine.test.js`
- `npm run verify`
- Manual repeated-run inspection recorded under `artifacts/whisper-debug-captures/` proves only the latest three capture directories remain after four or more transcriptions.
- Manual inspection shows `${os.homedir()}/.kory-whisper/debug-captures/` contains at most three recent capture directories after repeated runs.

## Deferred Decisions

- Whether to expose a UI toggle or retention count in settings.
- Whether to remove or change the simplified-Chinese prompt injection after enough capture evidence is collected.
- Whether to preserve additional artifacts such as JSON output, token timestamps, or full stderr logs.
