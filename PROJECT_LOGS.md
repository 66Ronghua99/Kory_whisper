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
