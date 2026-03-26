# Windows Smoke Entry Point Verification

Task 4/5 evidence for the executable Windows smoke command and the official repository-managed Windows Whisper bundle.

## Focused Verification

Command:

```text
npm run lint
npm test
npm run build:win:dir
npm run smoke:windows -- --help
dist\win-unpacked\Kory Whisper.exe --smoke-windows --help
npm run smoke:windows -- --help
npm run smoke:windows
cmd /c "\"%CD%\\bin\\whisper-cli.exe\" --help"
```

Result:

- Passed: `npm run lint`
- Passed: `npm test` with `173` tests and `0` failures
- Passed: `npm run build:win:dir`, producing `dist/win-unpacked/`
- Confirmed `dist/win-unpacked/Kory Whisper.exe` exists and the packaged `resources/bin/` directory contains `ffmpeg.exe`, `whisper-cli.exe`, `whisper.dll`, `ggml.dll`, `ggml-base.dll`, and `ggml-cpu.dll`
- Passed: `dist/win-unpacked/Kory Whisper.exe --smoke-windows --help`
- Passed: `npm run smoke:windows -- --help`
- `npm run smoke:windows` no longer fails immediately with `Model missing and no dialog available for download prompt`; after wiring Electron `dialog` and `BrowserWindow` into smoke mode, the command advances into interactive model-download / runtime flow and then waits for user interaction on this host
- Confirmed `bin/whisper-cli.exe --help` launches successfully on this Windows worktree with the bundled DLL companions present
- Confirmed the official source is `ggml-org/whisper.cpp` release `v1.8.4` published on 2026-03-19 UTC
- Confirmed the downloaded `whisper-bin-x64.zip` SHA-256 matches the release API digest: `74F973345CB52EF5BA3EC9E7E7AF8E48CC8C71722D1528603B80588A11F82E3E`
- Confirmed the module exports `createWindowsSmokeRunner`, `STARTUP_BANNER`, and `DEFAULT_TRIGGER`
- Confirmed the runner rejects non-Windows runtime facts through `preflight()`
- Confirmed the win32 start path registers long-press handlers and delivers transcript text to the clipboard
- Confirmed recording-start failures are reported through diagnostics without leaking promise rejections
- Confirmed logger/onError failures during reporting are fail-safe
- Confirmed a failed recording start does not progress to stop, transcription, or clipboard delivery for that gesture
- Confirmed transcription and clipboard failures are reported without continuing downstream
- Confirmed release-during-start completes the gesture after recording becomes ready
- Confirmed Windows smoke preflight fails closed when the required helper prerequisites are absent with `Windows smoke preflight requires runtimePaths, audioRecorder, permissionGateway`
- Confirmed the wrapper and helper agree that `hookProbe` and `fileExists` may be defaulted while the required dependencies are present
- Confirmed Windows preflight rejects with `Windows hook initialization failed: uiohook init failed` when the shortcut hook probe fails
- Confirmed `createRuntimePaths()` resolves packaged Windows Whisper to `C:\\Program Files\\Kory Whisper\\resources\\bin\\whisper-cli.exe` and does not fall back to PATH discovery
- Confirmed `resolveBundledBinaryPath('whisper-cli', { platform: 'win32', isPackaged: true, ... })` resolves the repository-managed `bin/whisper-cli.exe` path explicitly
- Confirmed packaged win32 distribution metadata now points at the repository-managed `bin/whisper-cli.exe` bundle and includes the required companion DLL filters
- Confirmed Windows smoke preflight rejects with `Repository-managed whisper-cli.exe is missing: C:\\repo\\bin\\whisper-cli.exe` when the repository Whisper binary is absent
- Confirmed Windows preflight rejects with `ffmpeg is missing for Windows recording` when the recorder cannot resolve ffmpeg and with `ffmpeg is missing or invalid at C:\\bad\\ffmpeg.exe` when the resolved path is unusable
- Confirmed Windows preflight rejects microphone access with `Microphone access is blocked`, surfaces `microphone`, and points remediation to `ms-settings:privacy-microphone`
- Confirmed the Win32 permission service treats an empty platform permission contract as ready and does not trigger the accessibility warning path during startup readiness
- Confirmed a nonconforming permission gateway is rejected with `Windows smoke preflight: permissionGateway.check is required`
- Confirmed repository `bin/` now contains `whisper-cli.exe`, `whisper.dll`, `ggml.dll`, `ggml-base.dll`, and `ggml-cpu.dll`
- Confirmed the supported smoke invocation is now `electron . --smoke-windows` / `npm run smoke:windows`, which avoids the hanging `electron src/main/cli/windows-smoke.js` path
- Confirmed the local Windows packaging proof path is `npm run build:win:dir`; the previous default `npm run build` path on this machine was blocked by `winCodeSign` symlink extraction privileges until executable edit/sign work was disabled for the local dir build flow

## Remaining Limitation

- A real end-to-end `npm run smoke:windows` host run with microphone capture and transcription evidence is still pending after the binary bundle drop-in.
- A real end-to-end run of the unpacked Windows app in normal mode is still pending; current proof covers build output and packaged smoke-help startup, not the full tray/settings dictation UX.
