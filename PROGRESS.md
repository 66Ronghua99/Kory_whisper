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
- The dedicated Windows smoke entrypoint is now a command-line path with explicit usage help and RIGHT CONTROL orchestration.
- The repository now contains the official Windows `whisper-cli.exe` bundle plus required `ggml`/`whisper` DLL companions under `bin/`.
- The Windows smoke command now routes through the Electron app entrypoint via `electron . --smoke-windows`, and `npm run smoke:windows -- --help` exits cleanly instead of hanging on `electron <script>` startup.
- Windows packaging now has a dedicated `npm run build:win:dir` path, and `electron-builder` no longer blocks that unpacked build on `winCodeSign` executable-editing prerequisites.
- Fresh Windows unpacked builds now emit `dist/win-unpacked/Kory Whisper.exe`, and the packaged executable can start and render the smoke help text through `--smoke-windows --help`.
- The Windows platform UI contract loop is now merged: settings and tray consume injected platform UI contract data instead of keeping macOS-only shortcut/audio assumptions in the renderer.
- Windows cue playback now uses fixed native system sounds (`Asterisk` for recording start, `Exclamation` for output ready), and the Windows settings surface keeps only the cue enable toggle instead of exposing fake macOS-style sound choices.
- The repo hardgate now blocks renderer/service ownership of platform-specific shortcut/audio option tables without any remaining `settings.html` exception.
- Fresh verification for the Windows platform UI contract loop now includes `npm run lint`, `npm test`, and `npm run test:coverage`, and the new guarded config/hardgate files for this loop hold `100%` line and branch coverage.
- The full repository test suite is green again after aligning the composition-root progress expectation with the current object-shaped model download progress payload.
- Electron Builder now sources app icons from tracked `build/icon.png`, with mac entitlements checked in under `build/entitlements.mac.plist` instead of relying on local-only build resources.
- A dedicated GitHub Actions Windows release workflow now exists at `.github/workflows/release-windows.yml`, builds an NSIS installer through `npm run build:win:release`, and targets `dist/*.exe` release uploads.

## In Progress

- macOS permission onboarding verification is complete at the repo-doc level; manual macOS evidence still needs a real host capture.
- Real Windows host validation is still pending for the newly contract-driven settings/tray surfaces, native Windows cue playback, and the unpacked app's normal-mode loop.

## Pending

- Run the dedicated Windows smoke command on a real Windows host and refresh evidence with the first end-to-end host run.
- Launch the unpacked Windows app build in normal mode on a real Windows host and prove the regular app path can complete the dictation loop instead of only the smoke CLI path.
- Validate the contract-driven Windows settings page, tray surfaces, and fixed native cue playback on a real Windows host now that macOS-specific renderer assumptions are removed.
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
- `src/main/cli/windows-smoke.js` owns the dedicated Windows smoke command and long-press proof loop.
- `electron-builder.config.js` now keeps a Windows unpacked build path viable by disabling executable edit/sign work for the local `dir` build flow.
- `electron-builder.config.js` now also points macOS and Windows app-icon slots at the tracked `build/icon.png` resource, while the runtime tray icon remains under `assets/iconTemplate.png`.
- `src/main/platform/profiles/*.js` now own renderer/tray-facing shortcut and audio-cue UI contract data, and `src/renderer/settings.html` renders only from injected contract payloads.
- `src/main/platform/adapters/win32/audio-cue-player.js` and `src/main/platform/audio-cues-win32.js` now map Windows cue playback to native `SystemSounds` instead of a no-op placeholder.
- `.github/workflows/release-windows.yml` now owns the Windows release path and publishes the NSIS installer artifact built by `npm run build:win:release`.
- Guarded coverage remains intentionally narrow and honest.
- Fresh decoupling evidence lives in tracked markdown artifacts under `artifacts/windows-runtime-decoupling/`.
- Fresh merge-back evidence for the worktree reconciliation lives under `artifacts/worktree-merge-backfill/`.
- Permission onboarding evidence and validation notes live under `artifacts/macos-permission-onboarding/`.
- Fresh Windows platform UI contract evidence lives under `artifacts/windows-platform-ui-contract/`.
