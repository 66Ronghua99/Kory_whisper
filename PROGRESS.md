# Progress

## Active Milestone

M0: Validate the combined audio-cues and shared-model-store branch before deciding how to fold it back into the main product line.

## Done

- Existing repository migrated onto the Harness bootstrap skeleton
- Root governance docs and repository map established
- Superpowers templates added under `docs/superpowers/templates/`
- Bootstrap manifest created at `.harness/bootstrap.toml`
- Whisper transcription now fails fast on child-process errors instead of returning partial `.txt` output as a successful result; verification captured at `artifacts/whisper-engine-partial-output/verify.txt`

## In Progress

- Integrated test branch combines platform audio cues with the shared Whisper model store
- Audio cues now expose configurable defaults and settings controls on top of the integrated branch
- Manual macOS smoke validation remains the next gate before broader branch integration
- Lint/test governance baseline now exists with repo-boundary hardgates and guarded-slice coverage ratchet

## Pending

- Decide whether to merge this combined branch into the clipboard-output branch or keep it as a separate staging branch
- Re-freeze the next product scope after this integration test closes
- Expand automated proof beyond the guarded slice once more main-process modules expose seam-friendly collaborators

## Product Snapshot

- Platform focus: macOS desktop voice input via Electron
- Core path: audio capture -> Whisper transcription -> optional post-process -> simulated text input
- Integration test focus on this branch:
  - macOS start/output system cue playback
  - configurable default sounds (`Tink` + `Glass`) via settings
  - shared Whisper models under `~/.kory-whisper/models/`
  - no duplicate model download when changing worktrees
- Governance baseline:
  - `npm run lint` proves platform-selector and renderer boundary invariants
  - `npm run test:coverage` enforces guarded-slice coverage for config/model-path/platform modules
  - evidence captured under `artifacts/lint-test-design/`
