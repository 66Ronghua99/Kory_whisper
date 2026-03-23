---
doc_type: evidence
status: draft
supersedes: []
related: []
---

# Evidence Record

## Scenario

[What path, bug, or claim does this evidence support?]

## Commands Run

```bash
# command 1
# command 2
```

## Before Evidence

- [Screenshot, log, trace, or failing test path]

## After Evidence

- [Passing output, screenshot, log, or trace path]

## Verified Claims

```yaml
schema: harness-verified-claims.v1
verified_claims:
  - claim_id: evidence.example.frozen-contracts
    plan_path: docs/superpowers/plans/example-plan.md
    plan_claim_id: plan.example.frozen-contracts
    plan_hash: 0123456789ab
    artifacts:
      - artifacts/example/evidence.md
```

## Residual Risks

- [Known gap 1]
- [Known gap 2]
