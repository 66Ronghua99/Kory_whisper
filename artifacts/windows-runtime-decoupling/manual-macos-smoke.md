# Manual macOS Smoke Matrix

Host: Windows worktree
Status: blocked/needs-mac-host

The required macOS smoke matrix could not be executed on this host. This artifact records the intended checks and the current block rather than pretending the run happened here.

| Check | Expected on macOS | Status | Notes |
| --- | --- | --- | --- |
| Launch | App opens cleanly and reaches idle | blocked/needs-mac-host | No macOS runtime on this host |
| Shortcut long-press | Long press starts and stops dictation | blocked/needs-mac-host | Not executable on Windows host |
| Microphone prompting | Microphone permission prompt/flow appears when needed | blocked/needs-mac-host | Not executable on Windows host |
| Accessibility prompting | Accessibility/Input Monitoring prompts are handled | blocked/needs-mac-host | Not executable on Windows host |
| Tray transitions | Recording, processing, success, and error states transition cleanly | blocked/needs-mac-host | Not executable on Windows host |
| Cue timing | Recording-start and output-ready cues do not block state transitions | blocked/needs-mac-host | Not executable on Windows host |
| Clipboard delivery | Final text lands on clipboard-only output path | blocked/needs-mac-host | Not executable on Windows host |
| Packaged-path model resolution | Packaged app resolves shared model paths correctly | blocked/needs-mac-host | Not executable on Windows host |

## Blocker

A real macOS host is required to perform the interactive smoke matrix, permission prompting, tray observation, and packaged-path validation.