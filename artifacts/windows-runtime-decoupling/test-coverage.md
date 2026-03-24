# npm run test:coverage

Exit code: 0

```text

> kory-whisper@0.1.0 test:coverage
> c8 node --test tests/*.test.js

✔ darwin audio cue player uses Tink and Glass as the default system sounds (4.981ms)
✔ darwin audio cue player uses configured sound names when provided (0.4355ms)
✔ darwin audio cue player falls back to defaults for unsupported sound names (0.255ms)
✔ darwin audio cue player does not invoke afplay when disabled (0.3072ms)
✔ darwin audio cue player swallows playback failures after logging (0.9041ms)
✔ win32 audio cue player exposes the same cue methods as no-op calls (0.3249ms)
✔ config manager defaults audio cues to enabled with Tink and Glass (1.519ms)
✔ composition root wires injected services and drives dictation through shortcut events (38.1941ms)
✔ composition root requires injected runtime facts instead of falling back to process.platform (1.0457ms)
✔ prepareTranscriptionService returns null when startup model download is declined (38.5576ms)
✔ prepareTranscriptionService switches models through downloader-backed readiness checks (1.4166ms)
✔ prepareTranscriptionService lets injected whisper engines own their own model lifecycle (0.5917ms)
✔ bootstrap app keeps startup sequencing outside the Electron entrypoint (0.9808ms)
✔ lifecycle module owns Electron event registration and shutdown cleanup (1.2235ms)
✔ top-level config manager stays as a compatibility shim for the canonical config home (2.0806ms)
✔ base config defaults stay platform-neutral until profile defaults are applied (0.9984ms)
✔ canonical config manager merges platform profile defaults without changing the persisted config shape (2.3774ms)
✔ profile defaults can come from explicit profile input instead of hard-coded platform branches (0.5456ms)
✔ unsupported platforms fall back to safe profile defaults that preserve persisted config shape (0.5026ms)
✔ constructor composes partial runtimeEnv with explicit top-level overrides predictably (0.3484ms)
✔ config manager merges nested overrides without dropping defaults (0.446ms)
✔ config manager deepMerge prefers override arrays and nullish handling is explicit (0.4377ms)
✔ config manager loadVocabulary returns an empty list when the vocabulary file is unreadable (23.4171ms)
[Config] Failed to load vocabulary: Error: ENOENT: no such file or directory, open 'C:\path\that\does\not\exist\vocabulary.json'
    at async open (node:internal/fs/promises:637:25)
    at async Object.readFile (node:internal/fs/promises:1269:14)
    at async ConfigManager.loadVocabulary (C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\src\main\config\config-manager.js:98:20)
    at async TestContext.<anonymous> (C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\tests\config-manager.test.js:165:22)
    at async Test.run (node:internal/test_runner/test:1125:7)
    at async Test.processPendingSubtests (node:internal/test_runner/test:787:7) {
  errno: -4058,
  code: 'ENOENT',
  syscall: 'open',
  path: 'C:\\path\\that\\does\\not\\exist\\vocabulary.json'
}
[Config] Saved config to: C:\Users\rongh\AppData\Local\Temp\kory-whisper-config-Ndi771\config.json
[Config] Loaded config from: C:\Users\rongh\AppData\Local\Temp\kory-whisper-config-Ndi771\config.json
✔ config manager save and load persist merged config in the configured app directory (106.2261ms)
[Config] Saved config to: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-wnTSWv\darwin\config.json
[Config] Loaded config from: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-wnTSWv\darwin\config.json
[Config] Saved config to: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-wnTSWv\win32\config.json
[Config] Loaded config from: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-wnTSWv\win32\config.json
✔ first-run load persists profile defaults for darwin and win32 configs (38.3613ms)
✔ persist stores a capture in a timestamped directory under the provided root (93.6529ms)
✔ persist prunes the oldest captures beyond the retention count of three (66.8036ms)
✔ persist tolerates a missing optional source artifact and records the missing path (14.694ms)
✔ persist logs and surfaces a real copy failure (11.2204ms)
✔ persist logs best-effort retention cleanup failures without aborting the capture (24.5753ms)
✔ persist leaves foreign directories alone and does not count them against retention (24.8921ms)
✔ persist rolls back a partial capture directory when copying fails (5.8936ms)
✔ persist rolls back a partial capture directory when meta write fails (8.0298ms)
✔ persist rejects an invalid Date object with the explicit timestamp error (2.2829ms)
✔ separate store instances can persist the same timestamp without capture directory collisions (12.5026ms)
✔ retention keeps the newest three same-timestamp captures across store instances (27.0581ms)
✔ retention still prunes when an older capture is missing meta.json after restart (27.3663ms)
✔ startRecordingFeedback marks recording only after recorder start succeeds (9.7067ms)
✔ announceOutputReady updates tray success without waiting for cue completion (1.8137ms)
✔ distribution manifest centralizes bundled binary naming and packaged assets (4.6091ms)
✔ distribution manifest keeps unsupported packaged quadrants behind explicit prerequisites (0.9841ms)
✔ electron-builder config sources platform resource slots from the distribution manifest (0.3585ms)
✔ distribution manifest darwin packaged binary maps to a file that exists in this worktree (0.4793ms)
✔ bundled asset helpers stay aligned with packaged runtime path resolution (0.9315ms)
✔ bundled asset helpers fail explicitly for unsupported packaged win32 binaries (0.4269ms)
[Input] Text copied to clipboard: 你好世界
✔ normalizeTextForClipboard preserves sentence-final punctuation and respects appendSpace false (1.479ms)
✔ deliverTextToClipboard copies processed text without reading previous clipboard content (3.4214ms)
✔ deliverTextToClipboard skips empty text without touching the clipboard (0.2521ms)
✔ shared Whisper model paths resolve under the user-space .kory-whisper models directory (2.8986ms)
✔ packaged runs expose a bundled seed path while development runs do not (0.3866ms)
✔ model path helpers fail fast when modelName is undefined (1.3812ms)
✔ platform selector reports the active runtime platform flags consistently (1.9355ms)
✔ platform entrypoint resolves the darwin profile, adapter family, and capabilities (1.4522ms)
✔ platform entrypoint resolves the win32 profile, adapter family, and capabilities (0.2998ms)
✔ platform entrypoint fails fast on unsupported platforms instead of mixing identities (1.0767ms)
✔ platform selector returns adapter instances with the expected public methods (0.8093ms)
✔ win32 audio recorder stop resolves even when stdin is unavailable (14.1133ms)
✔ repo hardgate passes against the current repository state (40.3798ms)
✔ repo hardgate formats violations with rule id and remediation detail (3.5609ms)
✔ repo hardgate rejects platform adapter imports outside the selector (23.4228ms)
✔ repo hardgate rejects service-layer platform branching through direct access, destructuring, and bracket access (24.5099ms)
✔ repo hardgate ignores process.platform mentions in comments and strings (23.9158ms)
✔ guarded coverage slice stays on the stable frozen seams instead of the whole main process (0.6502ms)
✔ createRuntimeEnv resolves packaged runtime facts from injected Electron state (3.8776ms)
✔ runtime-capabilities narrows to runtime facts instead of platform policy declarations (0.7166ms)
✔ createRuntimePaths resolves packaged darwin binaries and shared directories (5.8871ms)
✔ createRuntimePaths resolves development win32 binary naming with the executable suffix (0.4258ms)
✔ createRuntimePaths fails explicitly for unsupported packaged win32 binaries in the current repo state (0.9903ms)
✔ test-keyboard self-test uses the active keyboard listener dependency (116.7241ms)
✔ recording state clears any pending success reset timer (3.8782ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-cm61rH\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-cm61rH\sample.wav -l en -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-cm61rH\sample --no-timestamps
[Whisper] Executing whisper-cli...
[Whisper] Execution completed in 0ms
[Whisper] Looking for output file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-cm61rH\sample.txt
[Whisper] Output file read successfully
[Whisper] Result: hello world
✔ transcribe returns the output text when whisper-cli completes successfully (61.2028ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-6jI9l7\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-6jI9l7\sample.wav -l zh -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-6jI9l7\sample --no-timestamps --prompt 自定义。请使用简体中文输出。Gemini。
[Whisper] Executing whisper-cli...
[Whisper] Execution completed in 0ms
[Whisper] stdout: stdout summary
[Whisper] Looking for output file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-6jI9l7\sample.txt
[Whisper] stderr: stderr summary
[Whisper] Output file read successfully
[Whisper] Result: 繁体 Gemini
✔ transcribe persists the effective prompt, args, stdout and raw text before cleanup on success (29.9622ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-6ed5mN\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-6ed5mN\sample.wav -l zh -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-6ed5mN\sample --no-timestamps --prompt 请使用简体中文输出。
[Whisper] Executing whisper-cli...
[Whisper] Execution completed in 0ms
[Whisper] Process error: Error: Command failed because it timed out
    at WhisperEngine.modelPath (C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\tests\whisper-engine.test.js:204:21)
    at C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\src\main\whisper-engine.js:82:7
    at new Promise (<anonymous>)
    at WhisperEngine.transcribe (C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\src\main\whisper-engine.js:78:12)
    at C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\tests\whisper-engine.test.js:216:22
    at waitForActual (node:assert:632:21)
    at strict.rejects (node:assert:769:31)
    at C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\tests\whisper-engine.test.js:215:20
    at withMockedExecFile (C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\tests\whisper-engine.test.js:17:11)
    at TestContext.<anonymous> (C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\tests\whisper-engine.test.js:203:11) {
  killed: true,
  signal: 'SIGTERM'
}
[Whisper] stderr: process timed out after 60000ms
✔ transcribe persists failure evidence before cleanup when whisper-cli exits with an error (32.3303ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-kMh3x0\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-kMh3x0\sample.wav -l zh -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-kMh3x0\sample --no-timestamps --prompt 请使用简体中文输出。
[Whisper] Executing whisper-cli...
[Whisper] Execution completed in 0ms
[Whisper] Process error: Error: Command failed because it timed out
    at WhisperEngine.modelPath (C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\tests\whisper-engine.test.js:244:21)
    at C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\src\main\whisper-engine.js:82:7
    at new Promise (<anonymous>)
    at WhisperEngine.transcribe (C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\src\main\whisper-engine.js:78:12)
    at C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\tests\whisper-engine.test.js:255:22
    at waitForActual (node:assert:632:21)
    at strict.rejects (node:assert:769:31)
    at C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\tests\whisper-engine.test.js:254:20
    at withMockedExecFile (C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\tests\whisper-engine.test.js:17:11)
    at TestContext.<anonymous> (C:\Users\rongh\code\Kory_whisper\.worktrees\windows-runtime-decoupling\tests\whisper-engine.test.js:243:11) {
  killed: true,
  signal: 'SIGTERM'
}
[Whisper] stderr: process timed out after 60000ms
✔ transcribe rejects partial output when whisper-cli exits with an error (13.0444ms)
ℹ tests 74
ℹ suites 0
ℹ pass 74
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 584.1078
-----------------------------|---------|----------|---------|---------|-----------------------------
File                         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------------------|---------|----------|---------|---------|-----------------------------
All files                    |   96.07 |    83.33 |   98.33 |   96.07 |
 main                        |     100 |      100 |     100 |     100 |
  config-manager.js          |     100 |      100 |     100 |     100 |
  model-paths.js             |     100 |      100 |     100 |     100 |
 main/config                 |   96.01 |    77.77 |     100 |   96.01 |
  config-defaults.js         |     100 |    57.14 |     100 |     100 | 11,13
  config-manager.js          |   95.13 |    78.94 |     100 |   95.13 | 67-69,87-89,99
  config-profile-defaults.js |   93.54 |    83.33 |     100 |   93.54 | 27-28,31-32
 main/distribution           |   93.96 |    81.63 |     100 |   93.96 |
  bundled-assets.js          |    91.3 |    84.61 |     100 |    91.3 | 13-14,19-20
  distribution-manifest.js   |   94.77 |    80.55 |     100 |   94.77 | ...,100-101,117-118,121-122
 main/platform               |   95.29 |    92.68 |   94.73 |   95.29 |
  audio-cues-darwin.js       |   86.25 |    92.85 |   85.71 |   86.25 | 67-77
  audio-cues-win32.js        |     100 |      100 |     100 |     100 |
  clipboard-output.js        |     100 |     90.9 |     100 |     100 | 29
  index.js                   |     100 |     90.9 |     100 |     100 | 53
 main/platform/profiles      |     100 |      100 |     100 |     100 |
  darwin-profile.js          |     100 |      100 |     100 |     100 |
  win32-profile.js           |     100 |      100 |     100 |     100 |
 main/runtime                |     100 |     87.5 |     100 |     100 |
  runtime-capabilities.js    |     100 |      100 |     100 |     100 |
  runtime-paths.js           |     100 |       80 |     100 |     100 | 13
 main/shared                 |   96.55 |    81.48 |     100 |   96.55 |
  model-paths.js             |   96.55 |    81.48 |     100 |   96.55 | 27-28,36
-----------------------------|---------|----------|---------|---------|-----------------------------

=============================== Coverage summary ===============================
Statements   : 96.07% ( 906/943 )
Branches     : 83.33% ( 160/192 )
Functions    : 98.33% ( 59/60 )
Lines        : 96.07% ( 906/943 )
================================================================================

```