# Memory

## Governance Notes

- `scripts/repo-hardgate.js` now enforces the frozen repo-shape boundaries around platform selection, renderer/runtime separation, and service-layer platform reads.
- `.c8rc.json` tracks only the stable seam subset with `all: true`; the guarded slice is an honest denominator, not a whole-repo coverage claim.
- Runtime facts belong in `src/main/runtime/`, business orchestration in `src/main/services/`, and OS-specific selection/IO in `src/main/platform/`.
- Fresh verification evidence for the decoupling loop should live in tracked markdown files under `artifacts/windows-runtime-decoupling/`.
- Manual macOS smoke evidence must say `blocked/needs-mac-host` when the current machine cannot execute the interactive checks.
- Post-processing cleanup now belongs in `src/main/post-processing/`; `src/main/whisper-engine.js` should stay limited to whisper-cli invocation and debug-capture ownership.
- Renderer-facing config reads must sanitize legacy `whisper.llm`, and save paths must preserve hidden legacy config instead of dropping it on partial patches.
- The shared Whisper model store is already canonical on `master`; future worktree reconciliation should compare against `src/main/shared/model-paths.js` before trying to re-merge old model-cache branches.
- Do not recreate deleted top-level shims such as `src/main/config-manager.js` or `src/main/model-paths.js`; import the canonical config/shared modules directly.
- The removed Mac-only legacy bucket and unused local/remote LLM post-process experiments are now outside the repo contract; keep them gone unless a new approved spec explicitly reintroduces them.

## Stable Lessons

- Keep platform policy out of business services; prefer injected runtime/profile facts over direct `process.platform` reads.
- Keep doc truth, lint truth, and coverage truth aligned whenever a boundary changes.
- macOS dictation still depends on Accessibility, Microphone, and Input Monitoring style recovery flows; settings navigation must stay accurate.
- Whisper models should stay in the shared store `~/.kory-whisper/models/` instead of per-worktree repo paths.
- Avoid natural-language style instructions in `whisper-cli --prompt`; keep script normalization in post-processing to avoid prompt-echo regressions.
- Long-running Whisper failures should fail fast and preserve debug captures instead of returning partial `.txt` output as success.
- `postProcessing.enabled` is the renderer-visible kill switch; stage-specific preferences can stay persisted even when the top-level switch is off.
- The current permission UX target is: app may launch, but dictation stays `not ready` until Microphone, Accessibility, and Input Monitoring are all resolved; first run should auto-open dedicated onboarding, and the menu bar/settings surfaces must keep recovery visible afterward.
- The approved implementation route for permission UX is: normalize permission facts into one shared readiness snapshot first, then drive tray/menu state, onboarding UI, settings visibility, and dictation guards from that single snapshot.
