# Worktree Merge Backfill Evidence

Date: 2026-03-24

## Scope

- Merged the remaining `codex/lightweight-postprocessor` behavior into the upgraded `master` architecture by moving cleanup out of `src/main/whisper-engine.js` and into `src/main/post-processing/` plus `src/main/services/transcription-service.js`.
- Replaced the old renderer LLM controls with a top-level `postProcessing.enabled` surface while preserving hidden legacy `whisper.llm` config on save.
- Reconciled `codex/model-cache` against current `master` and confirmed the shared-model-store code path was already absorbed by `src/main/shared/model-paths.js`, `src/main/model-downloader.js`, `tests/model-paths.test.js`, and the existing shared-store spec.

## Verification

### Focused red-green proof

Command:

```bash
node --test tests/post-processing-runtime.test.js tests/post-processing-stages.test.js tests/settings-html.test.js tests/config-manager.test.js tests/composition-root.test.js tests/whisper-engine.test.js
```

Result:

- Exit code `0`
- `40` tests passed
- Proved the post-processing modules, service wiring, config normalization, renderer config sanitization, and Whisper ownership split

### Repository gate

Command:

```bash
npm run verify
```

Result:

- Exit code `0`
- `repo-hardgate: OK`
- `100` tests passed in `npm test`
- Coverage passed under `c8`
- Coverage summary from the fresh run:
  - Statements: `90.3%`
  - Branches: `83.25%`
  - Functions: `85.18%`
  - Lines: `90.3%`

## Review Notes

- Requested-code-review workflow requires a reviewer subagent, but this thread did not have explicit delegation permission.
- Performed a local delivery self-review against the staged diff instead, focusing on architecture boundary regressions, renderer config loss, and test/spec drift.
- No blocking issues were found after the self-review and fresh verification run.

## Manual Validation Status

- No fresh interactive Electron smoke run was performed in this turn.
- macOS tray/permission/settings smoke remains a follow-up validation task on a host that can run the full interactive matrix.
