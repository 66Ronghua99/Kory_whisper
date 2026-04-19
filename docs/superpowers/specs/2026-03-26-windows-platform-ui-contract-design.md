---
doc_type: spec
status: draft
supersedes: []
related:
  - docs/architecture/overview.md
  - docs/testing/strategy.md
  - docs/superpowers/specs/2026-03-24-windows-smoke-interactive-design.md
---

# Windows Platform UI Contract Spec

## Problem

The Windows runtime path can now record audio, transcribe, and copy text, and an unpacked Windows build can be produced successfully. However, the regular app UI still leaks macOS assumptions. The settings renderer still hard-codes macOS shortcut options such as `RIGHT COMMAND` and `OPTION`, still exposes macOS-only cue sound names such as `Tink` and `Glass`, and still uses static text that does not reflect the active platform contract. Tray/menu behavior is only partially contract-driven today: permission content has been normalized, but shortcut, cue, and general UI affordances are not yet injected from the platform layer.

This leaves the system in an inconsistent state: the `win32` profile already declares a Windows shortcut default and different capability facts, but the renderer and tray do not consume that profile as a complete UI contract. The result is a Windows build whose core dictation path works while its visible settings and tray surfaces still look and behave like a macOS app.

## Success

- Windows settings UI renders platform-correct shortcut options and defaults instead of exposing macOS-only keys.
- Windows settings UI reflects audio cue capability truth: if cue playback is unsupported or noop-backed, the UI does not advertise macOS system sounds as available behavior.
- Tray/menu copy and behavior that depend on platform-specific affordances are driven by injected platform contract data rather than hard-coded macOS strings.
- The composition root exposes a single renderer/tray-facing platform UI contract so settings and tray consume the same source of truth.
- Shared Whisper speech models continue to resolve from the per-user shared store rather than the repository-local `models/` directory, and the UI/docs stay honest about that storage location.
- New or materially changed executable code introduced in this loop is covered at `100%` relevant line and branch coverage.
- Lint/hardgate proof explicitly protects the platform UI contract ownership model so renderer and service layers cannot drift back to platform-specific hard-coded UI tables.

## Out Of Scope

- Rewriting the entire renderer visual design or replacing the existing settings page structure.
- Shipping a Windows installer, code signing, or notification polish beyond the current unpacked build path.
- Adding a brand-new Windows native cue playback implementation in the same loop if the current contract should simply hide or disable unsupported options.
- Changing the speech transcription pipeline, model formats, or post-processing architecture.

## Critical Paths

1. Platform profiles define UI-facing contract data for shortcut options, cue capability/options, and any platform-specific labels needed by tray/settings.
2. The composition root exposes that platform UI contract to renderer and tray consumers without introducing direct platform branching in business services.
3. The settings renderer stops hard-coding macOS option lists and instead renders platform-appropriate controls from the injected contract and current config.
4. Tray/menu surfaces align with the same contract so Windows no longer shows macOS-flavored affordances where capability truth differs.
5. Model-path messaging stays aligned with runtime truth: shared user-level speech model storage remains canonical, with bundled packaged models treated only as optional seed sources.

## Frozen Contracts
<!-- drift_anchor: frozen_contracts -->

- `src/main/platform/profiles/*.js` remain the owner of platform capability facts and platform UI contract facts; renderer and tray consumers must not reintroduce their own platform-specific hard-coded option tables.
- Shortcut option rendering is contract-driven. The settings page must only show keys that are valid for the active platform contract.
- Audio cue rendering is contract-driven. If a platform marks audio cues unsupported or noop-only, the UI must not imply macOS system sound playback support.
- The composition root remains the bridge from platform profile to renderer/tray, and services stay platform-agnostic.
- Shared Whisper speech models stay canonical under the user-level shared store `~/.kory-whisper/models` (Windows equivalent under the user home directory). Repository-local `models/` is not the primary runtime store for downloaded speech models.
- New platform UI contract code and tests added in this loop must join the guarded coverage slice at `100%` line and branch proof unless an explicit exception ledger is introduced.
- The repo hardgate should fail when renderer or service code reintroduces platform-specific shortcut/audio option tables or bypasses the canonical platform UI contract owner.

## Architecture Invariants

- No new direct `process.platform` branching should be introduced into `src/main/services/` or `src/renderer/`.
- Settings and tray should consume the same normalized platform UI contract instead of each inventing partial platform logic.
- Platform profiles may distinguish between capability truth and UI affordance truth, but both must originate from `src/main/platform/`.
- Unsupported platform features should fail closed or render unavailable explicitly rather than silently pretending to work.

## Failure Policy

- If a renderer or tray consumer receives no platform UI contract, it should fall back to a safe minimal contract that does not advertise unsupported platform-specific behavior.
- Invalid stored shortcut keys or cue selections that are no longer allowed on the active platform should normalize to the platform default rather than leaving the UI in an impossible state.
- Unsupported cue playback on Windows should render as disabled/hidden/noop truth, not as fake macOS sound playback.
- The app may continue launching even if contract-driven UI data is incomplete, but it must not present misleading platform options.

## Acceptance
<!-- drift_anchor: acceptance -->

- Fresh automated verification proves Windows settings rendering no longer exposes macOS-only shortcut defaults/options in Windows mode.
- Fresh automated verification proves Windows settings rendering no longer advertises macOS cue sound behavior when the Windows profile marks cues unsupported.
- Fresh automated verification proves tray/menu surfaces consume injected platform contract data instead of relying on stale macOS-only strings or assumptions.
- Fresh automated verification proves config/profile default merging preserves valid Windows defaults such as `RIGHT CONTROL` and a Windows-safe cue configuration.
- Fresh automated verification proves speech model runtime paths still resolve to the shared user-level model store on Windows and macOS.
- Fresh automated verification proves the new or changed guarded files for this loop meet `100%` relevant line and branch coverage.
- Fresh lint/hardgate verification proves renderer and service layers do not own platform-specific shortcut/audio option tables outside the canonical platform contract owner.
- Repository docs and evidence explicitly record that this loop addresses Windows UI/platform-contract drift on top of the already-working smoke/runtime path.

## Deferred Decisions

- Whether Windows should later gain a real native cue playback implementation instead of a hidden/disabled cue UI.
- Whether tray/menu copy should eventually have fully localized platform-specific variants beyond the current contract cleanup.
- Whether Windows should later support additional shortcut choices beyond the initial safe set required for the dictation loop.
