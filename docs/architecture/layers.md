# Layer Rules

## Canonical Direction

`Renderer UI -> Main Entry/Managers -> Workflow Services -> Platform Adapters -> External Binaries/System APIs`

## Rules

1. `src/renderer/` should not call runtime binaries or platform APIs directly.
2. Workflow services should own recording, transcription, post-processing, and injection decisions without collapsing into one large module.
3. OS-specific logic belongs in `src/main/platform/` or clearly named adapters, not scattered across unrelated modules.
4. Path resolution for packaged resources should flow through dedicated config/runtime helpers instead of ad hoc string concatenation.
5. Failures from permissions, missing binaries, or child-process startup should preserve actionable diagnostics instead of silently falling back.
