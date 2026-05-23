# PB-02 — honey route hit

## Trigger
R10 honey handler emits `honey.hit` with `mitre_tid=T1595.002` to audit log. ALERT_WEBHOOK fires.

## Severity (default)
P2. Respond within 1 hour.

## First action (within 5 min)
1. Check audit log for source IP: `docker exec backend sh -c 'tail -n 100 /app/server/activity-data/audit-*.jsonl | jq select(.event=="honey.hit")'`
2. Note the path, IP, user-agent
3. Is this a known scanner (Shodan, Censys, GoogleBot)? If yes, likely noise.

## Decision point
| Observation | Next action |
|---|---|
| Known scanner UA | Log and close. |
| Unknown IP, multiple paths probed | Block IP at Cloudflare. Proceed to Containment. |
| Authenticated user hitting honey | P1 escalation — compromised account. |

## Containment
Block source IP at Cloudflare WAF. Never engage the attacker.

## Eradication
Review all requests from that IP in the last 24h. Check if any non-honey endpoints were hit.

## Recovery
Unblock IP only after investigation completes. Monitor for 7 days.

## Verification
No further honey.hit events from the blocked IP for 60 minutes.

## Post-incident
- File post-mortem from [04-post-mortem-template.md](../04-post-mortem-template.md)
- Update: `docs/threat-model/07-residual-risk.md`
- File as L finding in next R-round if new gap discovered
