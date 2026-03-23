---
doc_type: spec
status: approved
supersedes: []
related: []
---

# Manual Clipboard Output Spec

## Problem

Kory Whisper currently writes transcription text into the clipboard, immediately simulates `Command-V`, then restores the previous clipboard contents. This makes the final delivery path fragile on macOS because simulated paste depends on focus timing, permissions, and app state. It also prevents the user from manually choosing when to paste the recognized text.

## Success

- After transcription succeeds, the latest processed text remains in the system clipboard until the user replaces it.
- Kory Whisper no longer auto-pastes or restores the previous clipboard contents as part of the output step.
- Success feedback matches the new behavior by indicating clipboard delivery instead of automatic input.

## Out Of Scope

- Adding a user-facing toggle between auto-paste mode and clipboard-only mode.
- Redesigning the full input abstraction or cross-platform UX beyond this clipboard delivery contract.

## Critical Paths

1. Transcription completes with non-empty text and copies that text to the clipboard.
2. Tray success state communicates that text is ready to paste manually.

## Frozen Contracts
<!-- drift_anchor: frozen_contracts -->

- `inputSimulator.typeText(text)` must leave the processed text in the clipboard and must not simulate a paste shortcut.
- Clipboard output must not restore the previous clipboard contents after delivery.
- Empty or whitespace-only transcription results must continue to short-circuit without changing the clipboard.

## Architecture Invariants

- The delivery stage remains separate from capture, transcription, and post-processing.
- macOS-specific input delivery logic stays inside the platform input simulator module.

## Failure Policy

- Invalid or empty text should exit early without clipboard writes.
- Clipboard write failures should surface as real errors to the main flow; no silent fallback to simulated typing is allowed.

## Acceptance
<!-- drift_anchor: acceptance -->

- A focused regression test proves non-empty text is copied to the clipboard without triggering any paste command.
- Fresh verification confirms the focused regression test passes after implementation.

## Deferred Decisions

- Whether Windows should expose the same clipboard-only behavior through a settings toggle later.
- Whether the input delivery API should be renamed from `typeText` to a less paste-specific name in a future cleanup.
