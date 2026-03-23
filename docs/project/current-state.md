# Current State

## Detected Markers

- `.git`
- `package.json`
- `src/`
- `.plan/`
- existing root docs from pre-Harness work (`README.md`, `MEMORY.md`, legacy progress notes)

## Code Topology

- `src/main/` holds the Electron main-process workflow and the feature surface that matters most
- `src/main/platform/` isolates platform-specific audio and input behavior
- `src/renderer/settings.html` is a thin settings UI, not the core workflow owner
- `bin/` and `models/` are packaged runtime dependencies, not source-only assets

## Known Migration Realities

- Legacy task tracking existed before Harness and is still represented in `.plan/`
- Validation today is a mix of `npm run build`, `node test-keyboard.js`, and manual end-to-end smoke tests
- The next active product decision appears to be around local LLM post-processing, but that scope is not yet re-frozen as a Harness-approved spec

## Follow-Up

- Write the next approved spec before resuming implementation work
- Tighten architecture/testing docs whenever a new spec clarifies stable boundaries
