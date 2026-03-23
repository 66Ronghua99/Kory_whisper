# Progress

## Active Milestone

M0: Validate the combined audio-cues and shared-model-store branch before deciding how to fold it back into the main product line.

## Done

- Existing repository migrated onto the Harness bootstrap skeleton
- Root governance docs and repository map established
- Superpowers templates added under `docs/superpowers/templates/`
- Bootstrap manifest created at `.harness/bootstrap.toml`

## In Progress

- Integrated test branch combines platform audio cues with the shared Whisper model store
- Audio cues now expose configurable defaults and settings controls on top of the integrated branch
- Manual macOS smoke validation remains the next gate before broader branch integration

## Pending

- Decide whether to merge this combined branch into the clipboard-output branch or keep it as a separate staging branch
- Re-freeze the next product scope after this integration test closes

## Product Snapshot

- Platform focus: macOS desktop voice input via Electron
- Core path: audio capture -> Whisper transcription -> optional post-process -> simulated text input
- Integration test focus on this branch:
  - macOS start/output system cue playback
  - configurable default sounds (`Tink` + `Glass`) via settings
  - shared Whisper models under `~/.kory-whisper/models/`
  - no duplicate model download when changing worktrees
