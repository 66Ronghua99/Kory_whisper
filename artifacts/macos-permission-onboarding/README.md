# macOS Permission Onboarding Evidence

## Status

- Automated verification in this session:
  - `npm run lint`: PASS
  - `npm test`: PASS
  - `npm run test:coverage`: PASS
- Manual macOS validation: pending capture on a macOS host with permission-state control
- Known limitation: TCC / notarization behavior can vary across machines, so manual evidence should note the exact host and setup state

## Automated Verification

Record the most recent command output here after each run:

- `npm run lint`
- `npm test`
- `npm run test:coverage`

## Manual Validation Notes

Use the matrix from `docs/testing/strategy.md` and record:

- host details
- app build or run mode
- permission state before the run
- permission state after re-check
- whether the onboarding window stayed reopenable from the tray
- whether dictation stayed blocked until all required permissions were granted

## Evidence Log

- `TODO`: add manual macOS smoke notes for the completed permission onboarding loop
