# npm test

Exit code: 0

```text

> kory-whisper@0.1.0 test
> node --test tests/*.test.js

✔ darwin audio cue player uses Tink and Glass as the default system sounds (3.3196ms)
✔ darwin audio cue player uses configured sound names when provided (0.8631ms)
✔ darwin audio cue player falls back to defaults for unsupported sound names (0.3274ms)
✔ darwin audio cue player does not invoke afplay when disabled (0.2028ms)
✔ darwin audio cue player swallows playback failures after logging (0.791ms)
✔ win32 audio cue player exposes the same cue methods as no-op calls (0.2775ms)
✔ config manager defaults audio cues to enabled with Tink and Glass (1.4991ms)
✔ composition root wires injected services and drives dictation through shortcut events (30.5303ms)
✔ composition root requires injected runtime facts instead of falling back to process.platform (1.8137ms)
✔ prepareTranscriptionService returns null when startup model download is declined (34.0046ms)
✔ prepareTranscriptionService switches models through downloader-backed readiness checks (2.5373ms)
✔ prepareTranscriptionService lets injected whisper engines own their own model lifecycle (2.3153ms)
✔ bootstrap app keeps startup sequencing outside the Electron entrypoint (1.3784ms)
✔ lifecycle module owns Electron event registration and shutdown cleanup (0.517ms)
✔ top-level config manager stays as a compatibility shim for the canonical config home (4.9721ms)
✔ base config defaults stay platform-neutral until profile defaults are applied (1.016ms)
✔ canonical config manager merges platform profile defaults without changing the persisted config shape (3.577ms)
✔ profile defaults can come from explicit profile input instead of hard-coded platform branches (0.3171ms)
✔ unsupported platforms fall back to safe profile defaults that preserve persisted config shape (0.4538ms)
✔ constructor composes partial runtimeEnv with explicit top-level overrides predictably (0.3963ms)
✔ config manager merges nested overrides without dropping defaults (0.4983ms)
✔ config manager deepMerge prefers override arrays and nullish handling is explicit (0.2758ms)
✔ config manager loadVocabulary returns an empty list when the vocabulary file is unreadable (21.4148ms)
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
[Config] Saved config to: C:\Users\rongh\AppData\Local\Temp\kory-whisper-config-grji0R\config.json
[Config] Loaded config from: C:\Users\rongh\AppData\Local\Temp\kory-whisper-config-grji0R\config.json
✔ config manager save and load persist merged config in the configured app directory (26.6257ms)
[Config] Saved config to: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-FnstpX\darwin\config.json
[Config] Loaded config from: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-FnstpX\darwin\config.json
[Config] Saved config to: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-FnstpX\win32\config.json
[Config] Loaded config from: C:\Users\rongh\AppData\Local\Temp\kory-whisper-profile-defaults-FnstpX\win32\config.json
✔ first-run load persists profile defaults for darwin and win32 configs (29.0789ms)
✔ persist stores a capture in a timestamped directory under the provided root (175.8871ms)
✔ persist prunes the oldest captures beyond the retention count of three (48.6276ms)
✔ persist tolerates a missing optional source artifact and records the missing path (23.2937ms)
✔ persist logs and surfaces a real copy failure (17.1855ms)
✔ persist logs best-effort retention cleanup failures without aborting the capture (249.0361ms)
✔ persist leaves foreign directories alone and does not count them against retention (83.7612ms)
✔ persist rolls back a partial capture directory when copying fails (13.1995ms)
✔ persist rolls back a partial capture directory when meta write fails (16.7792ms)
✔ persist rejects an invalid Date object with the explicit timestamp error (3.2904ms)
✔ separate store instances can persist the same timestamp without capture directory collisions (30.7443ms)
✔ retention keeps the newest three same-timestamp captures across store instances (32.8139ms)
✔ retention still prunes when an older capture is missing meta.json after restart (31.1997ms)
✔ startRecordingFeedback marks recording only after recorder start succeeds (5.3415ms)
✔ announceOutputReady updates tray success without waiting for cue completion (0.6749ms)
✔ distribution manifest centralizes bundled binary naming and packaged assets (2.9608ms)
✔ distribution manifest keeps unsupported packaged quadrants behind explicit prerequisites (2.8089ms)
✔ electron-builder config sources platform resource slots from the distribution manifest (0.6725ms)
✔ distribution manifest darwin packaged binary maps to a file that exists in this worktree (0.7784ms)
✔ bundled asset helpers stay aligned with packaged runtime path resolution (0.7718ms)
✔ bundled asset helpers fail explicitly for unsupported packaged win32 binaries (0.3116ms)
[Input] Text copied to clipboard: 你好世界 
✔ normalizeTextForClipboard preserves sentence-final punctuation and respects appendSpace false (1.5992ms)
✔ deliverTextToClipboard copies processed text without reading previous clipboard content (2.4341ms)
✔ deliverTextToClipboard skips empty text without touching the clipboard (0.4126ms)
✔ shared Whisper model paths resolve under the user-space .kory-whisper models directory (1.5292ms)
✔ packaged runs expose a bundled seed path while development runs do not (0.3279ms)
✔ model path helpers fail fast when modelName is undefined (1.8309ms)
✔ platform selector reports the active runtime platform flags consistently (1.7136ms)
✔ platform entrypoint resolves the darwin profile, adapter family, and capabilities (2.2272ms)
✔ platform entrypoint resolves the win32 profile, adapter family, and capabilities (0.5318ms)
✔ platform entrypoint fails fast on unsupported platforms instead of mixing identities (0.767ms)
✔ platform selector returns adapter instances with the expected public methods (1.7138ms)
✔ win32 audio recorder stop resolves even when stdin is unavailable (14.8779ms)
✔ repo hardgate passes against the current repository state (65.1444ms)
✔ repo hardgate formats violations with rule id and remediation detail (0.4934ms)
✔ repo hardgate rejects direct service-layer process.platform access (29.4494ms)
✔ repo hardgate rejects destructured service-layer platform aliases (24.0879ms)
✔ repo hardgate rejects bracket-based service-layer platform access (25.1989ms)
✔ repo hardgate ignores process.platform mentions in comments and strings (22.5035ms)
✔ repo hardgate rejects platform adapter imports outside the selector (27.3543ms)
✔ guarded coverage slice stays on the stable frozen seams instead of the whole main process (0.774ms)
✔ createRuntimeEnv resolves packaged runtime facts from injected Electron state (2.034ms)
✔ runtime-capabilities narrows to runtime facts instead of platform policy declarations (0.6317ms)
✔ createRuntimePaths resolves packaged darwin binaries and shared directories (7.3136ms)
✔ createRuntimePaths resolves development win32 binary naming with the executable suffix (3.0311ms)
✔ createRuntimePaths fails explicitly for unsupported packaged win32 binaries in the current repo state (2.5969ms)
✔ test-keyboard self-test uses the active keyboard listener dependency (151.2176ms)
✔ recording state clears any pending success reset timer (1.6409ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-Wj7K2Z\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-Wj7K2Z\sample.wav -l en -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-Wj7K2Z\sample --no-timestamps
[Whisper] Executing whisper-cli...
[Whisper] Execution completed in 0ms
[Whisper] Looking for output file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-Wj7K2Z\sample.txt
[Whisper] Output file read successfully
[Whisper] Result: hello world
✔ transcribe returns the output text when whisper-cli completes successfully (74.7082ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-i1kXOZ\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-i1kXOZ\sample.wav -l zh -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-i1kXOZ\sample --no-timestamps --prompt 自定义。请使用简体中文输出。Gemini。
[Whisper] stderr: stderr summary
[Whisper] Executing whisper-cli...
[Whisper] Execution completed in 1ms
[Whisper] stdout: stdout summary
[Whisper] Looking for output file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-i1kXOZ\sample.txt
[Whisper] Output file read successfully
[Whisper] Result: 繁体 Gemini
✔ transcribe persists the effective prompt, args, stdout and raw text before cleanup on success (63.7172ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-P2aIST\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-P2aIST\sample.wav -l zh -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-P2aIST\sample --no-timestamps --prompt 请使用简体中文输出。
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
✔ transcribe persists failure evidence before cleanup when whisper-cli exits with an error (46.6682ms)
[Whisper] Starting transcription...
[Whisper] Audio file: C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-YP987Y\sample.wav
[Whisper] Command: /tmp/whisper-cli -m /tmp/model.bin -f C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-YP987Y\sample.wav -l zh -otxt -of C:\Users\rongh\AppData\Local\Temp\kory-whisper-engine-YP987Y\sample --no-timestamps --prompt 请使用简体中文输出。
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
✔ transcribe rejects partial output when whisper-cli exits with an error (49.6082ms)
ℹ tests 76
ℹ suites 0
ℹ pass 76
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 911.9919

```