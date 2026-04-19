# Progress

## Active Milestone

M1: Freeze the Windows runtime decoupling boundary proof and start the first Windows implementation loop without regressing the macOS baseline.

## Done

- Harness bootstrap and repository governance baseline are in place.
- Main-process startup now flows through `src/main/app/` instead of staying in `src/main/index.js`.
- Runtime facts, paths, and capability derivation now live in `src/main/runtime/`.
- Platform profiles and adapters are split under `src/main/platform/`.
- Business-service orchestration now lives in `src/main/services/`.
- Electron Builder config moved into `electron-builder.config.js`, with distribution truth sourced from the manifest layer.
- The repo hardgate now blocks direct `process.platform` branching inside `src/main/services/`.
- The repo hardgate now blocks direct imports of selector-owned platform adapters and remaining legacy platform leaf modules outside `src/main/platform/index.js`.
- Guarded coverage now stays on the stable seam subset instead of pretending to cover the whole main process.
- Architecture/testing docs and tracked markdown evidence now match the new composition/runtime/profile boundaries.
- Whisper transcription still fails fast on child-process errors, preserves debug captures, and avoids the simplified-Chinese prompt-echo regression.
- The remaining `codex/lightweight-postprocessor` worktree behavior now lives on `master` through `src/main/post-processing/`, `src/main/services/transcription-service.js`, and the renderer/config merge path.
- Renderer config now exposes `postProcessing.enabled`, keeps legacy `whisper.llm` state inert, and preserves hidden config on partial saves.
- The `codex/model-cache` worktree has been reconciled against current `master`; the shared Whisper model store behavior was already absorbed by the runtime/shared-path layer.
- Mac-only legacy runtime debris has been removed from the active repository shape, including `src/main/legacy/`, the unused `local-llm`/`llm-postprocessor` experiments, and the deleted top-level config/model-path shim entrypoints.
- The composition root and focused tests now import `src/main/config/config-manager.js` and `src/main/shared/model-paths.js` directly.
- Guarded coverage and current-state docs no longer treat the deleted shim files as part of the canonical seam slice.
- The macOS permission onboarding loop is now recorded as complete in the repo truth files, with fresh evidence scaffolding under `artifacts/macos-permission-onboarding/`.
- Whisper prompt construction no longer injects vocabulary words; vocabulary remains a post-processing concern to avoid prompt-echo regressions such as `Keywords Keywords`.
- Aliyun BYOK cloud ASR is implemented as the new default ASR mode: users provide their own Bailian/DashScope key, Kory Whisper keeps the dictation flow local except for direct Aliyun transcription, and local Whisper remains an explicit offline mode.
- Runtime config saves now rebuild the transcription service when switching between Aliyun cloud ASR and local Whisper, so dictation uses the newly selected engine instead of a stale startup instance.

## In Progress

- Preparing the first Windows-native implementation loop behind the frozen runtime/profile seams.
- macOS permission onboarding verification is complete at the repo-doc level; manual macOS evidence still needs a real host capture.

## Pending

- Run real-key Aliyun BYOK cloud and local Whisper dictation smokes after relaunching the rebuilt packaged app, then capture result evidence under `artifacts/aliyun-byok-cloud-asr/`.
- Implement the first Windows-native behavior loop on top of the `win32` profile and adapter paths.
- Run the macOS interactive smoke matrix on a mac host to refresh tray/permission/path evidence.
- Run a manual dictation/settings smoke pass for the merged ASR post-processing path on a mac host and capture fresh evidence.

## Product Snapshot

- `src/main/index.js` is now a thin entrypoint.
- `src/main/app/` owns lifecycle and composition sequencing.
- `src/main/runtime/` owns runtime facts, path derivation, and capability facts.
- `src/main/services/` owns dictation workflow orchestration and should remain platform-agnostic.
- `src/main/platform/` owns platform selection, profiles, and OS-specific adapters.
- `src/main/config/config-manager.js` and `src/main/shared/model-paths.js` are the canonical config/path entrypoints.
- `src/main/post-processing/` now owns ASR cleanup stages, while `src/main/services/transcription-service.js` owns vocabulary loading and pipeline invocation.
- `src/main/asr/` owns cloud ASR provider adapters and secret redaction helpers.
- Guarded coverage remains intentionally narrow and honest.
- Fresh decoupling evidence lives in tracked markdown artifacts under `artifacts/windows-runtime-decoupling/`.
- Fresh merge-back evidence for the worktree reconciliation lives under `artifacts/worktree-merge-backfill/`.
- Permission onboarding evidence and validation notes live under `artifacts/macos-permission-onboarding/`.
- Aliyun BYOK cloud ASR evidence lives under `artifacts/aliyun-byok-cloud-asr/`.
