---
doc_type: spec
status: draft
supersedes: []
related:
  - docs/superpowers/specs/2026-03-23-asr-post-processing-pipeline-design.md
  - docs/testing/lint-test-design.md
---

# Aliyun BYOK Cloud ASR Design

## Problem

Kory Whisper currently ships as a local Whisper-based dictation tool. That keeps transcription offline, but it also increases package and first-run model weight, creates model download friction, and makes recognition quality depend on local hardware and model size. We need a cloud ASR option that can become the default for new users while preserving the existing input-method workflow.

The product decision for this spec is bring-your-own-key. Users use their own Aliyun account, create their own Bailian/DashScope API key, recharge their own account, and pay Aliyun directly by usage. Kory Whisper remains a local desktop app and does not introduce a Kory-hosted backend, account system, billing system, or shared API key.

The user-visible dictation flow must not change except for the backend used to transcribe audio. Users still press and hold the configured shortcut, speak, release, wait briefly, and receive injected text. Existing permissions, recording behavior, post-processing, vocabulary, punctuation, script normalization, and text injection behavior remain on the same logical path.

## Success

- New installs default to cloud ASR with Aliyun Bailian/DashScope Paraformer.
- Existing dictation behavior stays equivalent: record audio, transcribe once recording ends, post-process text, then inject text.
- Local Whisper remains available as an explicit offline mode, but new users are not forced to download a Whisper model during first run.
- Users can configure an Aliyun API key locally and test whether the key can reach the selected ASR provider before using dictation.
- The settings UI explains how to create an Aliyun Bailian/DashScope API key, recharge the Aliyun account, and understand pay-as-you-go pricing.
- API keys are stored locally, redacted from logs, excluded from debug captures, and never sent to any Kory-owned service.

## Out Of Scope

- Building or operating a Kory backend proxy for ASR.
- Kory-managed accounts, subscriptions, payment, credit balance, or quota enforcement.
- Supporting Tencent Cloud, Baidu, iFlytek, Volcano Engine, OpenAI, or other ASR providers in the first implementation.
- Real-time visible transcription while the user is still speaking.
- Changing the shortcut, permission, recording, post-processing, vocabulary, punctuation, script normalization, or injection workflows.
- Adding cloud LLM rewriting or semantic polishing.
- Uploading user audio to Kory-controlled storage.
- Requiring users to configure OSS buckets, temporary public URLs, or cloud storage credentials for v1.

## Critical Paths

1. First-run default path: app starts with `asr.mode = cloud`, shows Aliyun setup status, and blocks dictation with an actionable setup message until a local API key is configured.
2. Configured cloud path: user records audio exactly as today, the local recorder writes the same kind of temporary audio file, `TranscriptionService.transcribe(audioPath)` delegates to an Aliyun cloud engine, and returned text enters the existing post-processing pipeline.
3. Offline path: user switches to local Whisper, Kory Whisper uses the existing model readiness and local `whisper-cli` path without changing downstream behavior.
4. Settings path: user can switch between cloud and local modes, paste or update an Aliyun API key, run a connection test, and open official Aliyun help links for API key creation and account recharge.
5. Failure path: missing key, invalid key, insufficient balance, network failure, provider error, unsupported audio, and timeout all fail visibly without silent fallback to another ASR backend.

## Frozen Contracts
<!-- drift_anchor: frozen_contracts -->

- The dictation workflow remains `shortcut -> record -> TranscriptionService.transcribe(audioPath) -> post-processing -> injection`.
- `DictationService` must not learn provider-specific Aliyun details.
- `TranscriptionService` remains the boundary that receives `audioPath` and returns final post-processed text.
- Cloud ASR replaces only the transcription engine/provider below `TranscriptionService`; it must not bypass the existing post-processing pipeline.
- Vocabulary loading, punctuation, script normalization, basic ITN, disfluency cleanup, and injection stay downstream of raw ASR output.
- The first supported cloud provider is Aliyun Bailian/DashScope Paraformer only.
- The first cloud mode is BYOK only: users provide their own API key and pay Aliyun directly.
- Kory Whisper does not proxy, store remotely, meter, or resell cloud ASR usage.
- The application must not silently fall back from cloud ASR to local Whisper when cloud transcription fails.
- Local Whisper stays available as an explicit user-selected mode and continues to use the existing shared model store.
- New installs default to cloud mode; existing users should keep their current effective mode unless a migration rule explicitly chooses otherwise.
- API keys must be treated as secrets in config, logs, debug captures, errors, and UI rendering.

## Architecture Invariants

- Provider choice should be represented by a new ASR config surface, not by overloading `whisper.model`.
- Suggested config shape:

```js
asr: {
  mode: 'cloud',
  cloud: {
    provider: 'aliyun-paraformer',
    model: 'paraformer-realtime-v2',
    apiKey: '',
    timeoutMs: 30000
  },
  local: {
    model: 'base'
  }
}
```

- Legacy `whisper` config may continue to hold local Whisper-specific language, prompt, and model details during migration, but new cloud-provider state belongs under `asr`.
- The cloud engine should expose the same minimal contract as the existing local engine: `transcribe(audioPath) -> rawText`.
- The Aliyun provider adapter owns DashScope authentication, request construction, response parsing, timeout handling, and provider error normalization.
- Secret redaction must be centralized enough that logs and debug captures cannot accidentally persist API keys.
- The selected provider should be injected during composition instead of checked with scattered conditionals throughout services.
- Provider errors should preserve enough context for troubleshooting without leaking request credentials or full audio payloads.
- The UI should describe cloud ASR as local BYOK operation: audio is sent from the local app to Aliyun, keys stay on the user's machine, and charges are paid directly to Aliyun.

## Aliyun API Choice

Aliyun's recorded-file Paraformer API is cheaper, but the official RESTful recorded-speech path is URL-based. It expects an audio file URL rather than a direct local file upload. That does not fit the v1 product constraint because it would force users to configure OSS or another storage path before dictation can work.

For v1, use Aliyun Paraformer real-time WebSocket API in a post-recording mode: after the user releases the shortcut and the local audio file is complete, Kory Whisper streams that file's audio frames to DashScope over WebSocket and waits for the final transcript. This preserves the visible workflow while avoiding any extra user setup beyond an API key.

The initial model target is `paraformer-realtime-v2`. The spec does not require live partial transcript display, even though the underlying API is streaming-capable.

## User Setup Content

Settings and help content should guide users through these tasks:

- Create or log into an Aliyun account.
- Open the Aliyun Bailian/DashScope API key page.
- Create an API key, preferably in the default workspace unless the user already manages multiple workspaces.
- Copy the `sk-...` API key into Kory Whisper.
- Recharge the Aliyun account or confirm available balance in Aliyun's cost center.
- Understand that Paraformer pricing is pay-as-you-go by input audio duration and that the exact bill is controlled by Aliyun.
- Understand that free quota, model prices, and billing rules may change, so the app should link to official Aliyun pricing instead of hard-coding promises as contractual copy.

The UI may show an approximate cost note for orientation, but it must state that Aliyun's official bill is authoritative.

## Failure Policy

- Missing API key blocks cloud dictation and opens the setup path or shows a direct setup action.
- Invalid API key fails with a clear authentication error and a link to the API key help page.
- Insufficient balance fails with a clear billing/balance message and a link to Aliyun recharge or billing help.
- Network and provider timeouts fail fast enough for dictation use and do not leave recording state stuck.
- Provider response parsing failures should be observable in logs with redacted request identifiers when available.
- Cloud transcription failures must not automatically retry indefinitely.
- Cloud transcription failures must not silently switch to local Whisper, because that could trigger model downloads or create unexpected privacy behavior.
- API keys must be redacted from all error strings before rendering, logging, or debug capture persistence.

## Acceptance
<!-- drift_anchor: acceptance -->

- Focused tests prove default config for new users selects cloud ASR with Aliyun Paraformer.
- Focused tests prove existing post-processing still runs after cloud ASR raw text is returned.
- Focused tests prove local Whisper mode still prepares and invokes the existing local engine path.
- Focused tests prove missing and invalid API keys produce actionable setup failures without invoking local Whisper.
- Focused tests prove API keys are redacted from provider errors, logs, and debug capture metadata.
- Focused tests prove provider selection is composed at the transcription boundary and does not introduce provider-specific logic into dictation or injection services.
- Settings UI verification proves users can select cloud/local mode, enter an API key, test connectivity, and open Aliyun setup/billing help links.
- Manual smoke verification proves the visible dictation flow remains unchanged: press, hold, speak, release, receive injected text.
- Packaging verification proves cloud-default builds can run without bundled Whisper model assets, while local Whisper mode still handles model readiness when selected.

## Deferred Decisions

- Whether to add Tencent Cloud ASR as a second BYOK provider after the Aliyun path is stable.
- Whether to support Aliyun recorded-file REST API later through optional user-provided OSS or another explicit upload strategy.
- Whether to display live partial transcripts from the WebSocket API.
- Whether to add per-user local usage estimates in the app based on recorded audio duration.
- Whether to migrate API key storage to an OS keychain abstraction if the first implementation starts with encrypted local config.
- Whether existing users should be migrated to cloud mode automatically or retain local mode by default.

## Source Notes

- Aliyun Bailian/DashScope API key help: https://help.aliyun.com/zh/model-studio/get-api-key
- Aliyun Paraformer real-time speech recognition API: https://help.aliyun.com/zh/model-studio/developer-reference/paraformer-real-time-speech-recognition-api
- Aliyun Paraformer recorded speech recognition RESTful API: https://help.aliyun.com/zh/model-studio/paraformer-recorded-speech-recognition-restful-api
- Aliyun model pricing should remain linked rather than copied as a stable contract: https://help.aliyun.com/zh/model-studio/models
