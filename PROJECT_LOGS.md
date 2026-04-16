# Project Logs

Append-only project timeline for decisions, attempts, turns, verification notes, and direction changes.

## 2026-04-16

- Drafted the BYOK Aliyun cloud ASR direction as a new spec under `docs/superpowers/specs/2026-04-16-aliyun-byok-cloud-asr-design.md`.
- Product decision captured: Kory Whisper remains a local desktop app; users provide their own Aliyun Bailian/DashScope API key and pay Aliyun directly.
- Design constraint captured: visible dictation behavior should not change beyond replacing the transcription backend.
- API route decision captured: prefer Aliyun Paraformer real-time WebSocket in post-recording mode for v1, because recorded-file REST recognition expects an audio URL and would force extra storage setup.
