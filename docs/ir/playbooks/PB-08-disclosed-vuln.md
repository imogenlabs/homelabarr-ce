# PB-08 — disclosed vuln

## Trigger
Someone emails the SECURITY.md contact or opens a GitHub Security Advisory.

## Severity (default)
P2. Acknowledge within 24 hours.

## First action (within 5 min)
1. Acknowledge receipt within 24h — use template from [03-comms-templates.md](../03-comms-templates.md)
2. Assign severity per [01-severity-classification.md](../01-severity-classification.md)
3. Do NOT disclose publicly yet

## Decision point
| Observation | Next action |
|---|---|
| Valid RCE/auth bypass | P1 escalation. Patch immediately. |
| Valid but low-impact | P3/P4. Schedule fix for next release. |
| Invalid / not reproducible | Thank reporter, close with explanation. |

## Containment
If critical: apply patch to main, rebuild, deploy immediately.

## Eradication
Fix the vulnerability. Add a pentest atomic if a new attack vector.

## Recovery
Deploy patched version. Notify reporter.

## Verification
Coordinated disclosure within 90 days. Credit reporter in changelog unless they prefer anonymity.

## Post-incident
- File post-mortem from [04-post-mortem-template.md](../04-post-mortem-template.md)
- Update: `docs/threat-model/07-residual-risk.md`
- File as L finding in next R-round if new gap discovered
