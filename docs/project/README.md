# Project Context

## Purpose

`Kory Whisper` is an Electron desktop app for local voice dictation. It captures speech, runs Whisper locally, optionally applies post-processing, and injects the final text into the active app on macOS.

## Success Criteria

- A user can long-press the configured shortcut, speak, release, and receive text in the focused application
- The app remains usable when launched from Finder, not just from a developer shell
- Packaging, bundled binaries, model resolution, and macOS permissions behave consistently across dev and packaged environments

## Constraints

- The repository is currently validation-light; significant behavior still depends on manual smoke tests
- macOS Accessibility, Input Monitoring, and Microphone permissions are external dependencies that affect runtime behavior
- Runtime binaries and model assets must resolve correctly in both source and packaged layouts
- Existing historical implementation notes live in `.plan/` and need gradual migration into approved Superpowers specs/plans

## Related Docs

- `docs/project/current-state.md`
- `docs/architecture/overview.md`
- `docs/testing/strategy.md`
- `docs/superpowers/templates/SPEC_TEMPLATE.md`
