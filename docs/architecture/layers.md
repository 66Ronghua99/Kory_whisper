# Layer Rules

## Canonical Direction

`Renderer UI -> Main Entry -> App Composition -> Business Services -> Runtime Facts / Profiles -> Platform Adapters -> External Binaries / System APIs`

## Rules

1. `src/renderer/` should not call runtime binaries or platform APIs directly.
2. `src/main/index.js` should only boot the app; startup sequencing belongs in `src/main/app/`.
3. Business-service modules in `src/main/services/` should not branch directly on `process.platform`; they must consume injected runtime/profile facts instead.
4. OS-specific logic belongs in `src/main/platform/` profiles or adapters, not scattered across business services.
5. Path resolution for packaged resources should flow through dedicated runtime and distribution helpers instead of ad hoc string concatenation.
6. Failures from permissions, missing binaries, or child-process startup should preserve actionable diagnostics instead of silently falling back.