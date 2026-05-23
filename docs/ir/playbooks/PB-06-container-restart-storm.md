# PB-06 — container restart storm

## Trigger
R12 SLI: > 3 container restarts per 24h per service. `docker events --filter type=container --filter event=die`.

## Severity (default)
P3. Respond within 24 hours.

## First action (within 5 min)
1. `docker ps -a` — which service is restarting?
2. `docker logs <container> --tail 100` — what's the exit reason?
3. `dmesg | tail -50` — OOMKill? Disk full? AppArmor deny?

## Decision point
| Observation | Next action |
|---|---|
| OOMKill | Increase mem_limit in compose or investigate memory leak. |
| Disk pressure | Clear tmpfs or increase size. |
| AppArmor deny | Check if a new path needs to be allowed in the profile. |
| Application error | Check application logs, fix the bug. |

## Containment
If OOMKill: temporarily increase mem_limit. If disk: clear space.

## Eradication
Fix the root cause. Adjust compose limits or fix the application code.

## Recovery
Restart the service. Monitor for 24h.

## Verification
Zero restarts in 24h post-fix. Run crash-log leak scan (R12 exp 08).

## Post-incident
- File post-mortem from [04-post-mortem-template.md](../04-post-mortem-template.md)
- Update: `docs/threat-model/07-residual-risk.md`
- File as L finding in next R-round if new gap discovered
