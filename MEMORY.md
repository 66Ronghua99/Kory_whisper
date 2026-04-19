# Memory

## Governance Notes

- `scripts/repo-hardgate.js` now enforces the frozen repo-shape boundaries around platform selection, renderer/runtime separation, and service-layer platform reads.
- `.c8rc.json` tracks only the stable seam subset with `all: true`; the guarded slice is an honest denominator, not a whole-repo coverage claim.
- Runtime facts belong in `src/main/runtime/`, business orchestration in `src/main/services/`, and OS-specific selection/IO in `src/main/platform/`.
- Fresh verification evidence for the decoupling loop should live in tracked markdown files under `artifacts/windows-runtime-decoupling/`.
- Manual macOS smoke evidence must say `blocked/needs-mac-host` when the current machine cannot execute the interactive checks.
- The macOS permission onboarding evidence placeholder now lives at `artifacts/macos-permission-onboarding/README.md`; it should stay honest about which manual macOS cases are still pending.
- Post-processing cleanup now belongs in `src/main/post-processing/`; `src/main/whisper-engine.js` should stay limited to whisper-cli invocation and debug-capture ownership.
- Renderer-facing config reads must sanitize legacy `whisper.llm`, and save paths must preserve hidden legacy config instead of dropping it on partial patches.
- The shared Whisper model store is already canonical on `master`; future worktree reconciliation should compare against `src/main/shared/model-paths.js` before trying to re-merge old model-cache branches.
- Do not recreate deleted top-level shims such as `src/main/config-manager.js` or `src/main/model-paths.js`; import the canonical config/shared modules directly.
- The removed Mac-only legacy bucket and unused local/remote LLM post-process experiments are now outside the repo contract; keep them gone unless a new approved spec explicitly reintroduces them.
- Aliyun BYOK cloud ASR lives under `src/main/asr/`; keep provider-specific protocol and secret redaction out of `DictationService` and injection services.

## Stable Lessons

- Keep platform policy out of business services; prefer injected runtime/profile facts over direct `process.platform` reads.
- Keep doc truth, lint truth, and coverage truth aligned whenever a boundary changes.
- macOS dictation still depends on Accessibility, Microphone, and Input Monitoring style recovery flows; settings navigation must stay accurate.
- Whisper models should stay in the shared store `~/.kory-whisper/models/` instead of per-worktree repo paths.
- Avoid natural-language style instructions in `whisper-cli --prompt`; keep script normalization in post-processing to avoid prompt-echo regressions.
- Keep vocabulary `words` in post-processing only; injecting them into `whisper-cli --prompt` can collapse long speech into prompt-echo outputs like `Keywords Keywords`.
- Long-running Whisper failures should fail fast and preserve debug captures instead of returning partial `.txt` output as success.
- `postProcessing.enabled` is the renderer-visible kill switch; stage-specific preferences can stay persisted even when the top-level switch is off.
- The current permission UX target is: app may launch, but dictation stays `not ready` until Microphone, Accessibility, and Input Monitoring are all resolved; first run should auto-open dedicated onboarding, and the menu bar/settings surfaces must keep recovery visible afterward.
- The approved implementation route for permission UX is: normalize permission facts into one shared readiness snapshot first, then drive tray/menu state, onboarding UI, settings visibility, and dictation guards from that single snapshot.
- Guarded coverage for the permission onboarding loop now includes the canonical shared readiness seam listed in `.c8rc.json`.
- Input Monitoring must stay unresolved at startup when the platform check is only `unknown`; the first real shortcut event should validate it instead of immediately reopening System Settings.
- Cloud ASR must not silently fall back to local Whisper on provider failure; that would surprise users with downloads and privacy behavior.
- Renderer config must never echo stored `asr.cloud.apiKey`; blank API key fields in settings should preserve the already-stored local secret unless the user enters a replacement.
- DashScope Paraformer WebSocket `run-task` messages require `payload.input` even when it is empty; omitting it causes provider error `Missing required parameter 'payload.input'`.
- File logs must serialize `Error.name`, `Error.message`, `Error.code`, and `Error.stack` explicitly; `JSON.stringify(error)` can drop the real failure reason and leave dictation smoke failures as `Processing error: {}`.
- Saving cloud ASR config must update the active Aliyun engine, not only the persisted config object; otherwise real dictation can keep using the startup engine with an empty API key until app restart.
- ASR mode/provider changes are engine-signature changes, not ordinary runtime option edits; the composition root must rebuild `TranscriptionService` and rewire `DictationService.transcriptionService` when switching between cloud and local engines.
- macOS `rec` can exit immediately after `SIGTERM`; register the recorder `close` listener before sending the signal, otherwise `stop()` can miss the event and hang before either local Whisper or cloud ASR starts.
