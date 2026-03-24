# npm test

Exit code: 0

```text

> kory-whisper@0.1.0 test
> node --test tests/*.test.js

✔ darwin audio cue player uses Tink and Glass as the default system sounds (3.7289ms)
✔ darwin audio cue player uses configured sound names when provided (0.5079ms)
✔ darwin audio cue player falls back to defaults for unsupported sound names (0.3779ms)
✔ darwin audio cue player does not invoke afplay when disabled (0.226ms)
✔ darwin audio cue player swallows playback failures after logging (0.8748ms)
✔ win32 audio cue player exposes the same cue methods as no-op calls (0.443ms)
✔ config manager defaults audio cues to enabled with Tink and Glass (2.0264ms)
✔ composition root wires injected services and drives dictation through shortcut events (33.6152ms)
✔ composition root requires injected runtime facts instead of falling back to process.platform (1.248ms)
✔ prepareTranscriptionService returns null when startup model download is declined (39.5433ms)
✔ prepareTranscriptionService switches models through downloader-backed readiness checks (2.046ms)
✔ prepareTranscriptionService lets injected whisper engines own their own model lifecycle (0.7439ms)
✔ bootstrap app keeps startup sequencing outside the Electron entrypoint (1.4412ms)
✔ lifecycle module owns Electron event registration and shutdown cleanup (0.5439ms)
✔ top-level config manager stays as a compatibility shim for the canonical config home (2.6891ms)
✔ base config defaults stay platform-neutral until profile defaults are applied (2.3122ms)
✔ canonical config manager merges platform profile defaults without changing the persisted config shape (2.3465ms)
✔ profile defaults can come from explicit profile input instead of hard-coded platform branches (6.2537ms)
✔ unsupported platforms fall back to safe profile defaults that preserve persisted config shape (0.7492ms)
✔ constructor composes partial runtimeEnv with explicit top-level overrides predictably (0.4069ms)
✔ config manager merges nested overrides without dropping defaults (1.3372ms)
✔ config manager deepMerge prefers override arrays and nullish handling is explicit (0.3229ms)
✔ config manager loadVocabulary returns an empty list when the vocabulary file is unreadable (15.8366ms)
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
[Config] Saved config to: C:\Users\rongh\AppData\Local\Temp\kory-whisper-config-NLiaFt\config.json
[Config] Loaded config from: C:\Users\rongh\AppData\Local\Temp\kory-whisper-config-NLiaFt\config.json
✔ config manager save and load persist merged config in the configured app directory (20.37ms)
[Config] Saved config to: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-k6VrIr\darwin\config.json
[Config] Loaded config from: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-k6VrIr\darwin\config.json
[Config] Saved config to: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-k6VrIr\win32\config.json
[Config] Loaded config from: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-k6VrIr\win32\config.json
✔ first-run load persists profile defaults for darwin and win32 configs (77.1922ms)
✔ persist stores a capture in a timestamped directory under the provided root (126.7237ms)
✔ persist prunes the oldest captures beyond the retention count of three (44.8697ms)
✔ persist tolerates a missing optional source artifact and records the missing path (12.735ms)
✔ persist logs and surfaces a real copy failure (15.2008ms)
✔ persist logs best-effort retention cleanup failures without aborting the capture (36.6753ms)
✔ persist leaves foreign directories alone and does not count them against retention (97.1843ms)
✔ persist rolls back a partial capture directory when copying fails (66.2939ms)
✔ persist rolls back a partial capture directory when meta write fails (31.0095ms)
✔ persist rejects an invalid Date object with the explicit timestamp error (3.9654ms)
✔ separate store instances can persist the same timestamp without capture directory collisions (36.9823ms)
✔ retention keeps the newest three same-timestamp captures across store instances (81.9211ms)
✔ retention still prunes when an older capture is missing meta.json after restart (37.4881ms)
✔ startRecordingFeedback marks recording only after recorder start succeeds (2.0814ms)
✔ announceOutputReady updates tray success without waiting for cue completion (0.8752ms)
✔ distribution manifest centralizes bundled binary naming and packaged assets (6.0366ms)
✔ distribution manifest keeps unsupported packaged quadrants behind explicit prerequisites (13.0786ms)
✔ electron-builder config sources platform resource slots from the distribution manifest (0.5324ms)
✔ distribution manifest darwin packaged binary maps to a file that exists in this worktree (1.1162ms)
✔ bundled asset helpers stay aligned with packaged runtime path resolution (3.2401ms)
✔ bundled asset helpers fail explicitly for unsupported packaged win32 binaries (0.4946ms)
[Input] Text copied to clipboard: 你好世界
✔ normalizeTextForClipboard preserves sentence-final punctuation and respects appendSpace false (1.1906ms)
✔ deliverTextToClipboard copies processed text without reading previous clipboard content (3.5827ms)
✔ deliverTextToClipboard skips empty text without touching the clipboard (0.2924ms)
✔ shared Whisper model paths resolve under the user-space .kory-whisper models directory (2.217ms)
✔ packaged runs expose a bundled seed path while development runs do not (0.3934ms)
✔ model path helpers fail fast when modelName is undefined (1.4786ms)
✔ platform selector reports the active runtime platform flags consistently (2.1205ms)
✔ platform entrypoint resolves the darwin profile, adapter family, and capabilities (1.2427ms)
✔ platform entrypoint resolves the win32 profile, adapter family, and capabilities (0.2888ms)
✔ platform entrypoint fails fast on unsupported platforms instead of mixing identities (0.9439ms)
✔ platform selector returns adapter instances with the expected public methods (0.6853ms)
✔ win32 audio recorder stop resolves even when stdin is unavailable (13.9915ms)
✔ repo hardgate passes against the current repository state (32.4491ms)
✔ repo hardgate formats violations with rule id and remediation detail (1.543ms)
✔ repo hardgate rejects platform adapter imports outside the selector (21.7177ms)
✔ repo hardgate rejects service-layer platform branching through direct access, destructuring, and bracket access (19.8087ms)
✔ repo hardgate ignores process.platform mentions in comments and strings (19.2905ms)
✔ guarded coverage slice stays on the stable frozen seams instead of the whole main process (0.5246ms)
✔ createRuntimeEnv resolves packaged runtime facts from injected Electron state (2.4286ms)
✔ runtime-capabilities narrows to runtime facts instead of platform policy declarations (1.3399ms)
✔ createRuntimePaths resolves packaged darwin binaries and shared directories (2.6513ms)
✔ createRuntimePaths resolves development win32 binary naming with the executable suffix (3.0136ms)
✔ createRuntimePaths fails explicitly for unsupported packaged win32 binaries in the current repo state (1.1626ms)
✔ test-keyboard self-test uses the active keyboard listener dependency (122.2894ms)
✔ recording state clears any pending success reset timer (1.1862ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-mfvD2V\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-mfvD2V\sample.wav -l en -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-mfvD2V\sample --no-timestamps
[Whisper] Executing whisper-cli...
[Whisper] Execution completed in 0ms
[Whisper] Looking for output file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-mfvD2V\sample.txt
[Whisper] Output file read successfully
[Whisper] Result: hello world
✔ transcribe returns the output text when whisper-cli completes successfully (65.6468ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-fEZWWH\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-fEZWWH\sample.wav -l zh -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-fEZWWH\sample --no-timestamps --prompt 自定义。请使用简体中文输出。Gemini。
[Whisper] Executing whisper-cli...
[Whisper] stderr: stderr summary
[Whisper] Execution completed in 0ms
[Whisper] stdout: stdout summary
[Whisper] Looking for output file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-fEZWWH\sample.txt
[Whisper] Output file read successfully
[Whisper] Result: 繁体 Gemini
✔ transcribe persists the effective prompt, args, stdout and raw text before cleanup on success (56.8564ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-29Ba9x\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-29Ba9x\sample.wav -l zh -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-29Ba9x\sample --no-timestamps --prompt 请使用简体中文输出。
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
✔ transcribe persists failure evidence before cleanup when whisper-cli exits with an error (53.02ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-ZPZSOk\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-ZPZSOk\sample.wav -l zh -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-ZPZSOk\sample --no-timestamps --prompt 请使用简体中文输出。
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
✔ transcribe rejects partial output when whisper-cli exits with an error (31.9775ms)
ℹ tests 74
ℹ suites 0
ℹ pass 74
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 783.5357

```