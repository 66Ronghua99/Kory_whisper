# Agent Index

## Default Route

1. Load `using-superpowers`.
2. Read `PROGRESS.md`, `NEXT_STEP.md`, `MEMORY.md`, and `.harness/bootstrap.toml`.
3. Route by task type:
   - repository bootstrap or governance baseline setup -> `harness:init`
   - new behavior, workflow, UX, or permission flow design -> `brainstorming`
   - approved multi-step work with frozen scope -> `writing-plans`
   - implementation in this session -> `executing-plans` or `subagent-driven-development`
   - feature or bugfix coding -> `test-driven-development`
   - macOS hotkey, permission, audio, packaging, or regression failure -> `systematic-debugging`
   - repository truth, stale pointers, or spec/plan/evidence drift -> `harness:doc-health`
   - lint design, test design, invariant design, file-role rules, or guardrail design -> `harness:lint-test-design`
   - architecture drift across main process, platform adapters, or runtime boundaries -> `harness:refactor`
   - delivery review -> `requesting-code-review`
   - any completion or "fixed" claim -> `verification-before-completion`
   - branch or worktree wrap-up -> `finishing-a-development-branch`

## Repository-Specific Routing Hints

- Changes to `src/main/platform/` or OS permission handling should assume platform-boundary risk first.
- Changes to recording/transcription/post-processing should preserve the stage split: capture -> transcribe -> normalize/post-process -> inject.
- Plans are currently stored in `.plan/`; new specs should live under `docs/superpowers/specs/`.
- Manual validation is expected for tray state, permission prompts, audio capture, and text injection paths.

## Bootstrap Rule

If `.harness/bootstrap.toml` exists, treat it as the machine-readable bootstrap source of truth.
