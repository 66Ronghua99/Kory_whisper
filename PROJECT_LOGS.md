# Project Logs

Append-only project timeline for decisions, attempts, turns, verification notes, and direction changes.

## 2026-04-16

- Drafted the BYOK Aliyun cloud ASR direction as a new spec under `docs/superpowers/specs/2026-04-16-aliyun-byok-cloud-asr-design.md`.
- Product decision captured: Kory Whisper remains a local desktop app; users provide their own Aliyun Bailian/DashScope API key and pay Aliyun directly.
- Design constraint captured: visible dictation behavior should not change beyond replacing the transcription backend.
- API route decision captured: prefer Aliyun Paraformer real-time WebSocket in post-recording mode for v1, because recorded-file REST recognition expects an audio URL and would force extra storage setup.
- Approved the Aliyun BYOK cloud ASR spec and implemented the first pass on branch `codex/aliyun-byok-cloud-asr`.
- Added `src/main/asr/aliyun-paraformer-engine.js` using DashScope WebSocket protocol with post-recording audio streaming and a `testConnection()` provider reachability check.
- Added ASR config defaults, renderer/API-key redaction, settings UI for cloud/local mode, `test-asr-connection` IPC, and `ws` runtime dependency.
- Updated distribution metadata so Whisper model assets remain known but are no longer included in default `extraResources`.
- Verification before final commit: `npm test` passed 149/149, `npm run lint` passed with `repo-hardgate: OK`, and `npm run test:coverage` passed with c8 coverage summary.

## 2026-04-19

- Debugged real-key Aliyun settings connection failure: provider returned `Missing required parameter 'payload.input'`.
- Confirmed root cause in `src/main/asr/aliyun-paraformer-engine.js`: `run-task` messages included `payload.parameters` but omitted required empty `payload.input`.
- Added regression assertions in `tests/aliyun-paraformer-engine.test.js` and patched `createRunTaskMessage()` to send `input: {}`.
- Verification after patch: `node --test tests/aliyun-paraformer-engine.test.js`, `npm run verify`, and `npm run build` passed; packaged engine inspection showed `payload.input` is `{}`.
- Investigated real dictation smoke failure after settings connection succeeded: app log showed two recent `[Main] Processing error: {}` entries after recording stopped, confirming a real processing failure but with the `Error.message` lost.
- Added `tests/logger.test.js` regression coverage and updated `src/main/logger.js` to serialize `Error.name`, `Error.message`, `Error.code`, `Error.stack`, and custom fields explicitly.
- Verification after logger observability patch: `node --test tests/logger.test.js`, `node --test tests/aliyun-paraformer-engine.test.js`, `npm run verify`, and `npm run build` passed; packaged logger inspection confirmed the fix is present under `dist/mac-arm64/Kory Whisper.app`.
- Debugged the next real dictation smoke failure: logs still reported `Aliyun API key is required for cloud ASR` even after the config file contained a saved key, showing the running cloud engine was stale rather than the key missing from disk.
- Added hot-update regression coverage in `tests/post-processing-runtime.test.js` and `tests/aliyun-paraformer-engine.test.js`; patched `TranscriptionService.applyConfig()` to forward cloud ASR runtime options and added `AliyunParaformerEngine.updateRuntimeOptions()`.
- Verification after cloud-runtime hot-update patch: red tests reproduced the stale-key bug, focused tests passed after the patch, `npm run verify` passed with 153/153 tests, `npm run build` passed, and packaged app inspection confirmed the hot-update code is present in `dist/mac-arm64/Kory Whisper.app`.
- Rechecked latest user config and app log after restart: `~/.kory-whisper/config.json` contained a stored Aliyun key, and the new app log no longer showed `Aliyun API key is required`; the latest trace stopped after `Long press ended - processing...` without a success/error line. The same inspection showed `asr.mode` still persisted as `cloud` despite the user trying local mode.
- Added ASR mode-switch regression coverage in `tests/composition-root.test.js` and patched `src/main/app/composition-root.js` so cloud/local or provider signature changes rebuild the active transcription service and rewire the dictation service. Verification after patch: focused composition-root tests passed, `npm run verify` passed with 154/154 tests and coverage gate, `npm run build` passed, and packaged app inspection confirmed the rebuild code is present in `dist/mac-arm64/Kory Whisper.app`.
