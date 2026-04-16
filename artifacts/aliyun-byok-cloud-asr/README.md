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

## Manual Gaps

- No real Aliyun API key smoke test was run in this environment.
- No packaged app smoke test was run in this environment.
