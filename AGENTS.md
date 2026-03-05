# Repository Guidelines

## Project Structure & Module Organization
The app is an Electron-based macOS voice input tool.
- `src/main/`: main-process modules (`index.js`, recorder, whisper engine, shortcut manager, tray, config).
- `src/renderer/settings.html`: settings UI.
- `bin/`: bundled runtime binaries (notably `whisper-cli`).
- `models/`: Whisper model files (`ggml-base.bin`).
- `assets/`: icons and asset scripts.
- `build/`: packaging config (for example mac entitlements).
- `dist/`: build artifacts from `electron-builder`.
- Root docs: `README.md`, `Progress.md`, `Memory.md`.

## Build, Test, and Development Commands
- `npm install`: install Node/Electron dependencies.
- `npm start`: run the app normally.
- `npm run dev`: run with `NODE_ENV=development`.
- `npm run build`: package a macOS app/DMG via `electron-builder`.
- `node test-keyboard.js`: manual keyboard-listener diagnostics.

## Coding Style & Naming Conventions
- Use CommonJS (`require`, `module.exports`) to match existing modules.
- Prefer 2-space indentation, semicolons, and single quotes.
- File names in `src/main` use kebab-case (example: `shortcut-manager.js`).
- Classes use `PascalCase`; methods/variables use `camelCase`.
- Keep modules focused; avoid mixing input, transcription, and UI concerns in one file.
- Preserve file header metadata (`Deps`, `Used By`, `Last Updated`) used across source files.

## Testing Guidelines
Current validation is mostly manual; there is no enforced coverage threshold yet.
- Run `node test-keyboard.js` for low-level key event checks.
- Smoke-test end to end: long-press trigger, recording (16kHz mono), transcription, and text injection.
- Verify macOS permission flows (Microphone + Accessibility) on first run.
- For bug fixes, add a reproducible regression test where practical and document how it is run.

## Commit & Pull Request Guidelines
- Existing history is minimal; use Conventional Commits going forward: `feat:`, `fix:`, `docs:`, `refactor:`.
- Keep commits small and isolated to one intent.
- PRs should include: change summary, risk/compatibility notes, test evidence, and screenshots for UI/tray changes.

## Security & Configuration Tips
- Never commit secrets, tokens, or machine-specific credentials.
- User config lives in `~/.kory-whisper/` (`config.json`, `vocabulary.json`); treat it as local state.
- When packaging, verify dev paths vs `process.resourcesPath` for `bin/` and `models/`.
