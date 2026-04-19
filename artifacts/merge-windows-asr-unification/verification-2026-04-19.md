# Windows And Aliyun ASR Merge Verification

Date: 2026-04-19
Host: macOS arm64 development host

## Scope

- Merged remote Windows smoke/runtime, native cue, packaging icon, and release workflow work into the local Aliyun BYOK cloud ASR line.
- Preserved `ws` as a runtime dependency for the Aliyun DashScope WebSocket adapter.
- Preserved Aliyun API-key redaction and blank-field-save behavior while adopting renderer platform UI contracts.
- Preserved Windows RIGHT CONTROL, clipboard delivery, repository-managed `whisper-cli.exe` bundle, fixed native cue sounds, and Windows release workflow.
- Added regression coverage that Windows profile defaults still inherit the cloud ASR default (`aliyun-paraformer`, `paraformer-realtime-v2`).

## Conflict Decisions

- `src/renderer/settings.html`: combined cloud ASR config preservation with platform UI contract normalization.
- `tests/config-manager.test.js`: kept both cloud ASR defaults and shared model storage / platform contract assertions.
- `tests/platform-index.test.js`: kept both the Darwin fast-recorder-stop regression and Windows ffmpeg DirectShow tests.
- `PROGRESS.md`, `MEMORY.md`, `NEXT_STEP.md`: kept both Aliyun ASR and Windows runtime/release project truth, with one current next-step pointer.
- `package.json` / `package-lock.json`: kept Windows scripts from remote and retained `ws` for cloud WebSocket ASR.

## Verification

```text
node --test tests/config-manager.test.js tests/platform-index.test.js tests/settings-html.test.js tests/aliyun-paraformer-engine.test.js tests/composition-root.test.js
npm run verify
npm run build
```

Results:

- Focused ASR / Windows / settings / composition slice: passed, 67 tests.
- `npm run verify`: passed.
- `npm run lint`: passed with `repo-hardgate: OK`.
- `npm test`: passed, 220 tests.
- `npm run test:coverage`: passed coverage gate.
- `npm run build`: passed and produced the macOS arm64 DMG; Electron Builder reported the expected unsigned macOS build warning.

## Manual Gaps

- Real-key Aliyun cloud dictation smoke still needs a live app run.
- Real Windows host validation is still pending for normal app mode, `--smoke-windows`, native cue playback, and RIGHT CONTROL -> record -> transcribe -> clipboard.
