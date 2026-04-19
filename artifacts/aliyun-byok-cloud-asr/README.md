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

## Manual Gaps

- Settings real-key connection smoke has succeeded according to user report.
- Real packaged dictation smoke still needs one rerun after the saved-key runtime hot-update fix.
