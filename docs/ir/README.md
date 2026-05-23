# Incident Response — HomelabARR CE

When something goes wrong, start at [00-first-60-seconds.md](00-first-60-seconds.md).

## Index

| File | Purpose |
|------|---------|
| [00-first-60-seconds.md](00-first-60-seconds.md) | Universal first-touch checklist |
| [01-severity-classification.md](01-severity-classification.md) | P1-P4 definitions + decision tree |
| [02-on-call-and-contacts.md](02-on-call-and-contacts.md) | Who to page, how to escalate |
| [03-comms-templates.md](03-comms-templates.md) | Status messages: investigating / mitigated / resolved |
| [04-post-mortem-template.md](04-post-mortem-template.md) | Blameless post-mortem template |
| [05-alerting-integration.md](05-alerting-integration.md) | How sensors reach the pager |
| [06-tabletop-exercises.md](06-tabletop-exercises.md) | Quarterly rehearsal scenarios |

## Playbooks

| PB | Trigger | Severity |
|----|---------|----------|
| [PB-01](playbooks/PB-01-audit-chain-break.md) | R6 audit chain bad > 0 | P1 |
| [PB-02](playbooks/PB-02-honey-route-hit.md) | R10 honey emission | P2 |
| [PB-03](playbooks/PB-03-cosign-verify-fail.md) | R5 cosign verify fail | P1 |
| [PB-04](playbooks/PB-04-rate-limit-burst.md) | Auth burst exceeds rate limit | P2 |
| [PB-05](playbooks/PB-05-slo-error-budget-burn.md) | R12 SLO burn > 50% in 7d | P3 |
| [PB-06](playbooks/PB-06-container-restart-storm.md) | > 3 restarts / 24h per service | P3 |
| [PB-07](playbooks/PB-07-backup-restore-fail.md) | R8 backup or restore fails | P1/P3 |
| [PB-08](playbooks/PB-08-disclosed-vuln.md) | External vulnerability report | P2 |
| [PB-09](playbooks/PB-09-credential-leak.md) | Secret found in logs/repo | P1 |
| [PB-10](playbooks/PB-10-time-skew-detected.md) | Clock drift > 30s | P2 |

## Related docs

- [Threat model](../threat-model/README.md) — what we're protecting and from whom
- [Audit rounds](../audit/README.md) — how controls were built
- [Compliance posture](../../compliance/posture.md) — framework alignment
- [Chaos experiments](../../chaos/README.md) — resilience testing
