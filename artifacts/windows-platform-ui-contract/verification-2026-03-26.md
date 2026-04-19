# Windows Platform UI Contract Verification

Date: 2026-03-26

## Scope Validated

- Platform profiles now own shortcut and audio-cue UI contract data for `darwin` and `win32`.
- Composition root exposes `platformUiContract` to the renderer and tray synchronization path.
- Tray manager stores the injected platform UI contract for later menu rendering.
- Settings renderer builds shortcut and audio-cue controls from the injected contract instead of macOS-only assumptions.
- Shared Whisper model storage hint is surfaced in the UI and config defaults.
- Windows now uses fixed native system sounds for cues, keeps the enable/disable toggle visible, and hides the cue dropdowns because there are no extra selectable names.
- Composition-root download progress tests now match the object-shaped progress payload emitted by the current model download bridge.

## Verification Run

Commands:

```text
node --test tests\audio-cues.test.js tests\config-manager.test.js tests\platform-index.test.js tests\settings-html.test.js tests\composition-root.test.js
npm run lint
npm test
npm run test:coverage
```

Results:

- Focused contract slice: passed
- `npm run lint`: passed
- `npm test`: passed (`204` tests passed, `0` failed)
- `npm run test:coverage`: passed

## Coverage Notes

- `scripts/repo-hardgate.js` now stays at `100%` lines / branches / functions / statements after the race-tolerant ENOENT branch was added.
- `src/main/config/config-defaults.js` now stays at `100%` lines / branches / functions / statements.
- `src/main/config/config-profile-defaults.js` now stays at `100%` lines / branches / functions / statements.
- `src/main/platform/profiles/darwin-profile.js` and `src/main/platform/profiles/win32-profile.js` stay at `100%` lines / branches / functions / statements.
- The new Windows cue/profile guardrail slice still holds `100%` line and branch coverage for `src/main/platform/profiles/win32-profile.js`.

## Notes

- The renderer no longer carries any platform-specific shortcut fallback table; if the platform contract is unavailable it renders a safe unavailable state instead of advertising fake keys.
- The repo hardgate no longer carries a temporary `settings.html` exception for platform UI ownership.
- Windows cue playback now maps to `Asterisk` for recording start and `Exclamation` for output ready, with no extra Windows sound picker.
- Full-repository verification is now recorded for this loop; the remaining gap is real Windows host validation of the unpacked app in normal mode and smoke mode, including hearing the native cue playback on host.
