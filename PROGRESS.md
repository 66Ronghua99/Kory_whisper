# Progress

## Active Milestone

M0: Bring `Kory Whisper` under the governance-only Harness baseline and freeze the next approved spec.

## Done

- Existing repository migrated onto the Harness bootstrap skeleton
- Root governance docs and repository map established
- Superpowers templates added under `docs/superpowers/templates/`
- Bootstrap manifest created at `.harness/bootstrap.toml`

## In Progress

- Align legacy project context with the new governance docs
- Decide and write the next approved spec for the active product loop

## Pending

- Convert the next intended change into a spec under `docs/superpowers/specs/`
- Re-express active implementation work from legacy `.plan/` notes into the approved Superpowers flow
- Declare stronger repository validation/invariant rules as the testing surface matures

## Product Snapshot

- Platform focus: macOS desktop voice input via Electron
- Core path: audio capture -> Whisper transcription -> optional post-process -> simulated text input
- Current unfinished product thread: local LLM post-processing path has implementation notes in `.plan/local_llm_postprocess.md` but has not yet been re-approved as the next Harness-tracked scope
