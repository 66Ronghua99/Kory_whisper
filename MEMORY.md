# Memory

## Governance Notes

- `scripts/repo-hardgate.js` now enforces four repo-shape invariants: main-entry platform adapter imports, selector-only platform adapter imports, renderer runtime-system bans, and service-layer `process.platform` bans
- `.c8rc.json` now tracks the stable seam subset only with `all: true`; the tracked slice is the honest denominator, not a repo-wide claim
- Runtime facts come from `src/main/runtime/`, business orchestration comes from `src/main/services/`, and OS selection comes from `src/main/platform/`
- Manual macOS smoke evidence should explicitly say `blocked/needs-mac-host` when the host cannot run it
- Fresh evidence should be written to tracked markdown artifacts in `artifacts/windows-runtime-decoupling/` so the proof is auditable from commit history

## Stable Lessons

- Keep platform policy out of business services
- Prefer injected runtime/profile facts over direct `process.platform` reads
- Keep doc truth, lint truth, and coverage truth aligned when a boundary changes