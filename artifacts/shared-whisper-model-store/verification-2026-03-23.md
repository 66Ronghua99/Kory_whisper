# Shared Whisper Model Store Verification

## Commands

1. `node --test tests/model-paths.test.js`
   - Result: PASS
   - Notes: 2 tests passed, 0 failed

2. `node --check src/main/index.js && node --check src/main/model-downloader.js && node --check src/main/model-paths.js && node --check src/main/config-manager.js`
   - Result: PASS
   - Notes: syntax check completed with exit code 0

## Pending Manual Validation

- Start the app from this worktree and confirm the logged models directory is `~/.kory-whisper/models`
- Confirm an already downloaded Whisper model is reused without a second download prompt
