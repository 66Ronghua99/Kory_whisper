# Windows Release Workflow Verification

Date: 2026-03-26

## Scope Validated

- Electron Builder now reads the packaged app icon from tracked `build/icon.png` for both `mac` and `win` targets.
- The repository now checks in `build/entitlements.mac.plist` so mac packaging inputs are no longer local-only.
- A dedicated GitHub Actions Windows workflow now lives at `.github/workflows/release-windows.yml`.
- The Windows release workflow builds the NSIS installer through `npm run build:win:release` and uploads `dist/*.exe` artifacts.

## Verification Run

Commands:

```text
node --test tests\distribution-manifest.test.js
node --test tests\release-workflow.test.js
npm run lint
npm test
npm run test:coverage
npm run build:win:release
```

Results:

- Focused distribution/workflow slice: passed
- `npm run lint`: passed
- `npm test`: passed (`206` tests passed, `0` failed)
- `npm run test:coverage`: passed
- `npm run build:win:release`: passed

## Artifact Notes

- Local Windows release packaging produced `dist/Kory Whisper Setup 0.1.0.exe`.
- The tray/runtime icon source remains `assets/iconTemplate.png`; the packaged app icon now mirrors that asset through the tracked `build/icon.png` build resource.
- The repository root `Kory_whisper.png` is currently an untracked loose source asset and is not part of the packaged resource contract.
