---
doc_type: spec
status: approved
supersedes: []
related: []
---

# Shared Whisper Model Store Design

## Problem

Kory Whisper stores Whisper models relative to the current repository or packaged app resources. That means each worktree behaves like a fresh installation and may re-download the same model, even though user config and logs already live in `~/.kory-whisper/`.

## Success

- Whisper models are stored in one shared user-space directory: `~/.kory-whisper/models/`.
- Switching repositories, worktrees, or local paths no longer triggers duplicate Whisper model downloads for the same user account.
- Packaged builds can seed the shared store from bundled model resources before falling back to network download.

## Out Of Scope

- Migrating local LLM model storage.
- Changing the `whisper-cli` binary location.
- Designing cross-platform per-OS user data conventions beyond the existing `~/.kory-whisper/` contract.

## Critical Paths

1. Development runs resolve Whisper model paths from `~/.kory-whisper/models/`.
2. Packaged runs resolve Whisper model paths from `~/.kory-whisper/models/`, seeding from bundled app resources when possible.

## Frozen Contracts
<!-- drift_anchor: frozen_contracts -->

- The canonical Whisper model directory is `~/.kory-whisper/models/`.
- Main-process model resolution must not depend on the current repository path or worktree path.
- If a packaged app contains the requested Whisper model in bundled resources and the shared user-space copy is missing, the app should copy the bundled file into the shared store before prompting the user to download.
- Missing shared and bundled copies still fall back to the existing download flow.

## Architecture Invariants

- Model path resolution remains centralized rather than duplicated across downloader, runtime setup, and config defaults.
- User-state storage stays under the existing `~/.kory-whisper/` root so config, logs, vocabulary, and Whisper models remain co-located.

## Failure Policy

- Copy or seed failures should not silently claim success; the app must continue to the normal download path or surface the real error.
- Invalid or missing model files should still be rejected by the existing size checks.

## Acceptance
<!-- drift_anchor: acceptance -->

- A focused regression test proves shared model paths resolve to `~/.kory-whisper/models/` regardless of worktree location.
- A focused regression test proves packaged mode exposes a bundled seed path while development mode does not.
- Fresh verification confirms the focused path-resolution tests pass after implementation.

## Deferred Decisions

- Whether local LLM models should move into the same shared models directory later.
- Whether future Windows support should switch from a Unix-style dot-directory to `AppData` while preserving a similar abstraction boundary.
