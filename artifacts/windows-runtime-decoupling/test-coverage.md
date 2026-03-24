# npm run test:coverage

Exit code: 0

```text

> kory-whisper@0.1.0 test:coverage
> c8 node --test tests/*.test.js

✔ darwin audio cue player uses Tink and Glass as the default system sounds (3.8043ms)
✔ darwin audio cue player uses configured sound names when provided (0.4073ms)
✔ darwin audio cue player falls back to defaults for unsupported sound names (0.2528ms)
✔ darwin audio cue player does not invoke afplay when disabled (0.2579ms)
✔ darwin audio cue player swallows playback failures after logging (0.879ms)
✔ win32 audio cue player exposes the same cue methods as no-op calls (0.3415ms)
✔ config manager defaults audio cues to enabled with Tink and Glass (2.6511ms)
✔ composition root wires injected services and drives dictation through shortcut events (41.6373ms)
✔ composition root requires injected runtime facts instead of falling back to process.platform (0.9669ms)
✔ prepareTranscriptionService returns null when startup model download is declined (36.5603ms)
✔ prepareTranscriptionService switches models through downloader-backed readiness checks (1.6748ms)
✔ prepareTranscriptionService lets injected whisper engines own their own model lifecycle (1.6708ms)
✔ bootstrap app keeps startup sequencing outside the Electron entrypoint (1.1611ms)
✔ lifecycle module owns Electron event registration and shutdown cleanup (0.7346ms)
✔ top-level config manager stays as a compatibility shim for the canonical config home (3.5129ms)
✔ base config defaults stay platform-neutral until profile defaults are applied (0.9449ms)
✔ canonical config manager merges platform profile defaults without changing the persisted config shape (3.4145ms)
✔ profile defaults can come from explicit profile input instead of hard-coded platform branches (1.7003ms)
✔ unsupported platforms fall back to safe profile defaults that preserve persisted config shape (0.5974ms)
✔ constructor composes partial runtimeEnv with explicit top-level overrides predictably (1.5667ms)
✔ config manager merges nested overrides without dropping defaults (0.6912ms)
✔ config manager deepMerge prefers override arrays and nullish handling is explicit (0.4184ms)
✔ config manager loadVocabulary returns an empty list when the vocabulary file is unreadable (21.2472ms)
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
[Config] Saved config to: C:\Users\rongh\AppData\Local\Temp\kory-whisper-config-V7xUvh\config.json
[Config] Loaded config from: C:\Users\rongh\AppData\Local\Temp\kory-whisper-config-V7xUvh\config.json
✔ config manager save and load persist merged config in the configured app directory (18.0624ms)
[Config] Saved config to: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-JaU3KI\darwin\config.json
[Config] Loaded config from: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-JaU3KI\darwin\config.json
[Config] Saved config to: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-JaU3KI\win32\config.json
[Config] Loaded config from: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-JaU3KI\win32\config.json
✔ first-run load persists profile defaults for darwin and win32 configs (37.9496ms)
✔ persist stores a capture in a timestamped directory under the provided root (95.4923ms)
✔ persist prunes the oldest captures beyond the retention count of three (66.5811ms)
✔ persist tolerates a missing optional source artifact and records the missing path (24.8382ms)
✔ persist logs and surfaces a real copy failure (12.9587ms)
✔ persist logs best-effort retention cleanup failures without aborting the capture (30.3204ms)
✔ persist leaves foreign directories alone and does not count them against retention (28.188ms)
✔ persist rolls back a partial capture directory when copying fails (9.7974ms)
✔ persist rolls back a partial capture directory when meta write fails (10.7891ms)
✔ persist rejects an invalid Date object with the explicit timestamp error (1.7333ms)
✔ separate store instances can persist the same timestamp without capture directory collisions (18.8336ms)
✔ retention keeps the newest three same-timestamp captures across store instances (24.009ms)
✔ retention still prunes when an older capture is missing meta.json after restart (22.6457ms)
✔ startRecordingFeedback marks recording only after recorder start succeeds (2.6627ms)
✔ announceOutputReady updates tray success without waiting for cue completion (1.64ms)
✔ distribution manifest centralizes bundled binary naming and packaged assets (2.6657ms)
✔ distribution manifest keeps unsupported packaged quadrants behind explicit prerequisites (1.0938ms)
✔ electron-builder config sources platform resource slots from the distribution manifest (0.6913ms)
✔ distribution manifest darwin packaged binary maps to a file that exists in this worktree (0.7039ms)
✔ bundled asset helpers stay aligned with packaged runtime path resolution (0.825ms)
✔ bundled asset helpers fail explicitly for unsupported packaged win32 binaries (0.3417ms)
[Input] Text copied to clipboard: 你好世界 
✔ normalizeTextForClipboard preserves sentence-final punctuation and respects appendSpace false (5.5049ms)
✔ deliverTextToClipboard copies processed text without reading previous clipboard content (3.7542ms)
✔ deliverTextToClipboard skips empty text without touching the clipboard (0.2816ms)
✔ shared Whisper model paths resolve under the user-space .kory-whisper models directory (2.3816ms)
✔ packaged runs expose a bundled seed path while development runs do not (0.3885ms)
✔ model path helpers fail fast when modelName is undefined (1.167ms)
✔ platform selector reports the active runtime platform flags consistently (2.4882ms)
✔ platform entrypoint resolves the darwin profile, adapter family, and capabilities (1.4096ms)
✔ platform entrypoint resolves the win32 profile, adapter family, and capabilities (0.2673ms)
✔ platform entrypoint fails fast on unsupported platforms instead of mixing identities (0.7141ms)
✔ platform selector returns adapter instances with the expected public methods (0.8796ms)
✔ win32 audio recorder stop resolves even when stdin is unavailable (11.4489ms)
✔ repo hardgate passes against the current repository state (49.6087ms)
✔ repo hardgate formats violations with rule id and remediation detail (1.0203ms)
✔ repo hardgate rejects direct service-layer process.platform access (31.6425ms)
✔ repo hardgate rejects destructured service-layer platform aliases (24.7386ms)
✔ repo hardgate rejects bracket-based service-layer platform access (22.362ms)
✔ repo hardgate ignores process.platform mentions in comments and strings (22.6443ms)
✔ repo hardgate rejects platform adapter imports outside the selector (21.5002ms)
✔ guarded coverage slice stays on the stable frozen seams instead of the whole main process (0.4643ms)
✔ createRuntimeEnv resolves packaged runtime facts from injected Electron state (3.6175ms)
✔ runtime-capabilities narrows to runtime facts instead of platform policy declarations (0.8298ms)
✔ createRuntimePaths resolves packaged darwin binaries and shared directories (4.6755ms)
✔ createRuntimePaths resolves development win32 binary naming with the executable suffix (0.5055ms)
✔ createRuntimePaths fails explicitly for unsupported packaged win32 binaries in the current repo state (0.9339ms)
✔ test-keyboard self-test uses the active keyboard listener dependency (141.8893ms)
✔ recording state clears any pending success reset timer (3.1955ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-ijM4xM\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-ijM4xM\sample.wav -l en -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-ijM4xM\sample --no-timestamps
[Whisper] Executing whisper-cli...
[Whisper] Execution completed in 0ms
[Whisper] Looking for output file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-ijM4xM\sample.txt
[Whisper] Output file read successfully
[Whisper] Result: hello world
✔ transcribe returns the output text when whisper-cli completes successfully (68.6259ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-gPPt7z\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-gPPt7z\sample.wav -l zh -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-gPPt7z\sample --no-timestamps --prompt 自定义。请使用简体中文输出。Gemini。
[Whisper] Executing whisper-cli...
[Whisper] Execution completed in 0ms
[Whisper] stderr: stderr summary
[Whisper] stdout: stdout summary
[Whisper] Looking for output file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-gPPt7z\sample.txt
[Whisper] Output file read successfully
[Whisper] Result: 繁体 Gemini
✔ transcribe persists the effective prompt, args, stdout and raw text before cleanup on success (36.062ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-aAPVfO\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-aAPVfO\sample.wav -l zh -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-aAPVfO\sample --no-timestamps --prompt 请使用简体中文输出。
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
✔ transcribe persists failure evidence before cleanup when whisper-cli exits with an error (36.7854ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-2cnmWS\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-2cnmWS\sample.wav -l zh -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-2cnmWS\sample --no-timestamps --prompt 请使用简体中文输出。
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
✔ transcribe rejects partial output when whisper-cli exits with an error (15ms)
ℹ tests 76
ℹ suites 0
ℹ pass 76
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 645.4423
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