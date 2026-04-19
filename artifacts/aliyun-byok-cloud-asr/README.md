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

## Manual Gaps

- Settings real-key connection smoke has succeeded according to user report.
- Real packaged dictation smoke still needs one rerun after the logger observability fix to capture the concrete cloud ASR failure.
