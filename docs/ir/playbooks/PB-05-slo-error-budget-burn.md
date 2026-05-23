# PB-05 — slo error budget burn

## Trigger
R12 SLO: /api/health success rate drops below 99.9% (30d window) or p95 latency exceeds 300ms (7d window).

## Severity (default)
P3. Respond within 24 hours.

## First action (within 5 min)
1. Check current error budget: how much of the 0.1% monthly budget is consumed?
2. Check recent deploys: did anything change in the last 24h?
3. Check container resource usage: `docker stats`

## Decision point
| Observation | Next action |
|---|---|
| Budget > 50% burned in < 7d | Freeze non-security deploys per R12 SLO policy. |
| Budget < 25% burned | Monitor, no action. |
| Latency spike from one endpoint | Profile that endpoint. |

## Containment
Freeze deploys if budget burn > 50%. Roll back last deploy if it correlates with the burn.

## Eradication
Fix the root cause (resource limit, slow query, dependency timeout).

## Recovery
Deploy fix. Monitor SLI recovery over 24h.

## Verification
Error budget stops burning. SLI returns to within SLO target.

## Post-incident
- File post-mortem from [04-post-mortem-template.md](../04-post-mortem-template.md)
- Update: `docs/threat-model/07-residual-risk.md`
- File as L finding in next R-round if new gap discovered
