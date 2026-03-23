# Progress

## Active Milestone

M0: Bring `Kory Whisper` under the governance-only Harness baseline while tracking small approved product loops through spec + plan + evidence.

## Done

- Existing repository migrated onto the Harness bootstrap skeleton
- Root governance docs and repository map established
- Superpowers templates added under `docs/superpowers/templates/`
- Bootstrap manifest created at `.harness/bootstrap.toml`
- Approved and implemented manual clipboard output loop:
  spec `docs/superpowers/specs/2026-03-23-manual-clipboard-output-design.md`
  plan `docs/superpowers/plans/2026-03-23-manual-clipboard-output.md`
  evidence `artifacts/manual-clipboard-output/node-test.txt`

## In Progress

- Align legacy project context with the new governance docs
- Re-express the next larger product loop from legacy `.plan/` notes into approved Superpowers specs/plans

## Pending

- Re-express active implementation work from legacy `.plan/` notes into the approved Superpowers flow
- Declare stronger repository validation/invariant rules as the testing surface matures

## Product Snapshot

- Platform focus: macOS desktop voice input via Electron
- Core path: audio capture -> Whisper transcription -> optional post-process -> clipboard copy for manual paste
- Current unfinished product thread: local LLM post-processing path has implementation notes in `.plan/local_llm_postprocess.md` but has not yet been re-approved as the next Harness-tracked scope
