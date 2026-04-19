# Aliyun BYOK Cloud ASR Evidence

Date: 2026-04-16

## Scope

Implemented the approved Aliyun BYOK cloud ASR path while preserving the existing dictation workflow:

- Default ASR config is cloud mode with Aliyun Paraformer.
- Users provide their own Aliyun Bailian/DashScope API key.
- `DictationService` remains unchanged: shortcut, recording, post-processing, and injection stay on the same logical flow.
- `TranscriptionService` composes either the cloud engine or local Whisper engine.
- Renderer config and provider errors redact `sk-...` secrets.
- Default packaging no longer includes Whisper model assets.

## Verification

- `node --test tests/config-manager.test.js` -> PASS, 14 tests.
- `node --test tests/aliyun-paraformer-engine.test.js` -> PASS, 4 tests.
- `node --test tests/composition-root.test.js tests/post-processing-runtime.test.js` -> PASS, 23 tests.
- `node --test tests/settings-html.test.js tests/composition-root.test.js` -> PASS, 22 tests.
- `node --test tests/distribution-manifest.test.js` -> PASS, 7 tests.
- `npm test` -> PASS, 150 tests.
- `npm run lint` -> PASS, `repo-hardgate: OK`.
- `npm run test:coverage` -> PASS, Statements 93.27%, Branches 83.33%, Functions 88.76%, Lines 93.27%.
- `npm run verify` -> PASS for the combined lint/test/coverage gate.

## 2026-04-19 Real-Key Connection Regression

- User-reported settings connection failure: `Aliyun ASR failed: Missing required parameter 'payload.input'. Please follow the protocol!`.
- Root cause: `run-task` messages omitted the DashScope-required empty `payload.input` object.
- Regression: `tests/aliyun-paraformer-engine.test.js` now asserts `runTask.payload.input` is `{}` for both transcription and connection-test flows.
- Verification after patch: `node --test tests/aliyun-paraformer-engine.test.js` PASS, `npm run verify` PASS, `npm run build` PASS, and packaged engine inspection confirmed `payload.input` is `{}`.

## 2026-04-19 Real Dictation Smoke Observability

- User-reported packaged dictation smoke after successful settings test showed the tray error state.
- Local app log confirmed recent real dictation failures after recording stopped, but the failure body was only `[Main] Processing error: {}`.
- Root cause of missing detail: `src/main/logger.js` used `JSON.stringify(error)`, which drops non-enumerable `Error.message` and `Error.stack`.
- Regression: `tests/logger.test.js` now asserts file logs include an `Error` message and code instead of `Processing error: {}`.
- Verification after patch: `node --test tests/logger.test.js` PASS, `node --test tests/aliyun-paraformer-engine.test.js` PASS, `npm run verify` PASS, `npm run build` PASS, and packaged logger inspection confirmed the fix is present in `dist/mac-arm64/Kory Whisper.app`.
- Next manual step: relaunch the rebuilt packaged app, run one real dictation smoke, then inspect `~/.kory-whisper/app.log` for the concrete Aliyun/audio failure message.

## 2026-04-19 Saved-Key Runtime Hot Update

- User-reported real dictation still failed after saving the Aliyun key.
- Local app log showed the active runtime still threw `Aliyun API key is required for cloud ASR`, while `~/.kory-whisper/config.json` contained a saved `asr.cloud.apiKey`.
- Root cause: saving settings updated persisted config and `TranscriptionService.config`, but the existing `AliyunParaformerEngine` instance kept the startup API key value.
- Regression: `tests/post-processing-runtime.test.js` now asserts cloud ASR config updates are forwarded to the active engine, and `tests/aliyun-paraformer-engine.test.js` now asserts later transcriptions use an updated API key.
- Verification after patch: red tests reproduced the stale-key failure, then `node --test tests/post-processing-runtime.test.js` PASS, `node --test tests/aliyun-paraformer-engine.test.js` PASS, `npm run verify` PASS with 153/153 tests, `npm run build` PASS, and packaged source inspection confirmed the hot-update path is present in `dist/mac-arm64/Kory Whisper.app`.
- Next manual step: relaunch the rebuilt packaged app and run one real dictation smoke. If it still fails, inspect `~/.kory-whisper/app.log`; the expected next failure, if any, should now come from the provider/audio path rather than missing local API key.

## 2026-04-19 ASR Mode Switch Rebuild

- User reported that switching to the local model still showed the tray error state.
- Local config inspection still showed `asr.mode: cloud` with a stored Aliyun key, so the latest user-visible local switch had not persisted as local at inspection time.
- Runtime root cause found in code: saving config could update an existing transcription service, but cloud/local mode changes require replacing the underlying engine instance and rewiring the dictation service.
- Regression: `tests/composition-root.test.js` now asserts saving `asr.mode: local` from a cloud startup rebuilds `TranscriptionService`, disposes the old cloud service, and updates `DictationService.transcriptionService`.
- Verification after patch: `node --test tests/composition-root.test.js` PASS with 20/20 tests, `npm run verify` PASS with 154/154 tests and coverage gate, `npm run build` PASS, and packaged app inspection confirmed `shouldRebuildTranscriptionService()` and `rebuildTranscriptionService()` are present in `dist/mac-arm64/Kory Whisper.app`.
- Manual gap: real packaged smoke still needs a rerun after relaunching the newly rebuilt app, testing cloud and local modes separately.

## 2026-04-19 Darwin Recorder Stop Race

- User reported both local and cloud dictation still showed failure after the ASR mode-switch rebuild.
- Latest app log showed recent `Long press ended - processing...` entries with no corresponding processing error, and recent wav/debug-capture evidence showed local/cloud shared the same recording-stop boundary before diverging.
- Root cause: darwin `AudioRecorder.stop()` sent `SIGTERM` to `rec` before registering the `close` listener; if `rec` exited immediately, the promise could hang and neither local Whisper nor cloud ASR would start.
- Regression: `tests/platform-index.test.js` now simulates `rec` emitting `close` synchronously from `kill()` and asserts `stop()` still resolves with the wav path.
- Verification after patch: red test reproduced the hang, `node --test tests/platform-index.test.js` PASS with 8/8 tests, `npm run verify` PASS with 155/155 tests and coverage gate, `npm run build` PASS, and packaged source inspection confirmed the listener-order fix is present in `dist/mac-arm64/Kory Whisper.app`.
- Manual gap: relaunch the rebuilt packaged app and rerun local/cloud smokes; if cloud still fails after the recorder fix, the next log should now reach provider-level Aliyun diagnostics rather than stopping at the recording boundary.

## Manual Gaps

- Settings real-key connection smoke has succeeded according to user report.
- Real packaged dictation smoke still needs one rerun after the darwin recorder stop race fix.
