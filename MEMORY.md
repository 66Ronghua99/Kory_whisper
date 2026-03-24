# Memory

## Governance Notes

- `scripts/repo-hardgate.js` now enforces the frozen repo-shape boundaries around platform selection, renderer/runtime separation, and service-layer platform reads.
- `.c8rc.json` tracks only the stable seam subset with `all: true`; the guarded slice is an honest denominator, not a whole-repo coverage claim.
- Runtime facts belong in `src/main/runtime/`, business orchestration in `src/main/services/`, and OS-specific selection/IO in `src/main/platform/`.
- Fresh verification evidence for the decoupling loop should live in tracked markdown files under `artifacts/windows-runtime-decoupling/`.
- Manual macOS smoke evidence must say `blocked/needs-mac-host` when the current machine cannot execute the interactive checks.

## Stable Lessons

- Keep platform policy out of business services; prefer injected runtime/profile facts over direct `process.platform` reads.
- Keep doc truth, lint truth, and coverage truth aligned whenever a boundary changes.
- macOS dictation still depends on Accessibility, Microphone, and Input Monitoring style recovery flows; settings navigation must stay accurate.
- Whisper models should stay in the shared store `~/.kory-whisper/models/` instead of per-worktree repo paths.
- Avoid natural-language style instructions in `whisper-cli --prompt`; keep script normalization in post-processing to avoid prompt-echo regressions.
- Long-running Whisper failures should fail fast and preserve debug captures instead of returning partial `.txt` output as success.
