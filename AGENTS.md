# AGENTS.md

> Repository guide for `Kory Whisper`. This file is the map, not the encyclopedia.

## Read First

1. `PROGRESS.md`
2. `NEXT_STEP.md`
3. `MEMORY.md`
4. `AGENT_INDEX.md`
5. `.harness/bootstrap.toml`

## Repository Map

- `src/main/`: Electron main-process orchestration, recording, transcription, post-processing, tray, and config
- `src/main/platform/`: OS-specific audio/input adapters
- `src/renderer/`: settings UI
- `bin/`: bundled runtime binaries such as `whisper-cli`
- `models/`: local Whisper model assets
- `docs/project/`: current state, goals, and migration context
- `docs/architecture/`: architecture boundaries and layering rules
- `docs/testing/`: testing strategy and validation expectations
- `docs/superpowers/templates/`: source templates for spec, plan, change request, and evidence docs
- `.plan/`: current and historical execution plans/checklists carried over from pre-Harness work
- `artifacts/`: validation evidence, logs, screenshots, and delivery proof

## Working Rules

- Prefer repository-local documents over chat-only context.
- Load `using-superpowers` first, then route through the matching process skill before implementation.
- Treat `.harness/bootstrap.toml` as the machine-readable bootstrap source of truth.
- `Superpowers` drives workflow execution; `Harness` defines governance standards and repository truth.
- Create new specs from `docs/superpowers/templates/SPEC_TEMPLATE.md`.
- Create new implementation plans from `docs/superpowers/templates/PLAN_TEMPLATE.md`, then store active plan/checklist work under `.plan/` unless a future repo doc changes that convention.
- Keep `NEXT_STEP.md` to one direct next action.
- Do not claim completion without fresh verification evidence.

## Repo-Specific Notes

- This is an Electron-based macOS voice input tool: audio capture -> Whisper transcription -> optional post-process -> simulated text input.
- Packaged-path versus dev-path handling is a recurring risk area for `bin/` and `models/`.
- Permission-sensitive flows on macOS (Accessibility, Input Monitoring, Microphone) are part of normal validation, not optional polish.
- Manual validation is still significant in this repository; record evidence whenever a change depends on interactive testing.
