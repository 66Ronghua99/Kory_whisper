# Next Step

Run one manual macOS smoke test of the merged clipboard + audio-cues + shared-model flow:

1. Launch the app from the repository root with `npm start`.
2. Hold the shortcut and speak a short phrase.
3. Confirm recording start plays `Tink` by default and output completion plays `Glass` by default.
4. Open settings, change the cue sounds, save, and confirm the new sounds take effect immediately.
5. Confirm the tray success state says the text was copied to the clipboard.
6. Paste manually with `Command-V` in a target app and confirm the latest transcription is still in the clipboard.
7. Confirm logs show `Models directory: ~/.kory-whisper/models` and no download prompt appears for already copied Whisper models.
