# Memory

## Governance Notes

- `scripts/repo-hardgate.js` now enforces four repo-shape invariants: main-entry platform imports, selector-only platform leaf imports, renderer runtime-system bans, and service-layer `process.platform` bans
- `.c8rc.json` now tracks the stable seam subset only; `src/main/app/**`, `src/main/services/**`, `src/main/platform/adapters/**`, and `src/main/runtime/runtime-env.js` are explicitly outside the guarded slice for now
- Runtime facts come from `src/main/runtime/`, business orchestration comes from `src/main/services/`, and OS selection comes from `src/main/platform/`
- Manual macOS smoke evidence should explicitly say `blocked/needs-mac-host` when the host cannot run it

## Stable Lessons

- Keep platform policy out of business services
- Prefer injected runtime/profile facts over direct `process.platform` reads
- Keep doc truth, lint truth, and coverage truth aligned when a boundary changes