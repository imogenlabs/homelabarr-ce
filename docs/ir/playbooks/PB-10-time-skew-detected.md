# PB-10 — time skew detected

## Trigger
R12 chaos experiment 05 fires in production (not intentionally). Clock drift > 30s between host and container.

## Severity (default)
P2. Check if JWT auth is affected.

## First action (within 5 min)
1. Check NTP sync on host: `timedatectl status`
2. Check container time: `docker exec backend date -u`
3. Compare to host time — if > 30s drift, JWT `exp` may be affected

## Decision point
| Observation | Next action |
|---|---|
| NTP synced, container drifted | Restart container to re-sync. |
| Host NTP failed | Fix NTP. `systemctl restart systemd-timesyncd`. |
| JWT exp bypassed by clock manipulation | P1 escalation — potential authentication bypass. |

## Containment
If JWT bypass suspected: rotate JWT key immediately. Revoke all sessions.

## Eradication
Fix NTP synchronization. Verify host and container clocks match.

## Recovery
Restart affected services. Monitor for 24h.

## Verification
Host and container clocks within 1s. JWT validation working. Audit-log timestamps monotonic.

## Post-incident
- File post-mortem from [04-post-mortem-template.md](../04-post-mortem-template.md)
- Update: `docs/threat-model/07-residual-risk.md`
- File as L finding in next R-round if new gap discovered
