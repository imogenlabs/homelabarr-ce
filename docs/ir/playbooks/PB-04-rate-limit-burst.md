# PB-04 — rate limit burst

## Trigger
R1/R6 rate limiter triggers repeatedly. `login.ratelimited` or `login.locked` events spike in audit log.

## Severity (default)
P2. Respond within 1 hour.

## First action (within 5 min)
1. Check audit log for source IPs: `jq 'select(.event | startswith("login."))' audit-*.jsonl | jq .ip | sort | uniq -c | sort -rn | head`
2. Distinguish brute-force (few IPs) vs distributed (many IPs)
3. Check if any login succeeded from the attacking IPs

## Decision point
| Observation | Next action |
|---|---|
| Few IPs, many attempts | Block IPs at Cloudflare. |
| Many IPs, few attempts each | Enable CF Challenge Mode. |
| Successful login from attack IP | P1 escalation — account compromised. Rotate credentials. |

## Containment
Block IPs at Cloudflare WAF. Enable CF Under Attack mode if distributed.

## Eradication
If account compromised: rotate password, revoke all sessions (`/auth/sessions/revoke-all`), rotate JWT key (`scripts/rotate-jwt-key.sh`).

## Recovery
Resume normal operation. Monitor for 24h.

## Verification
Rate-limit events return to baseline. No further successful logins from attack sources.

## Post-incident
- File post-mortem from [04-post-mortem-template.md](../04-post-mortem-template.md)
- Update: `docs/threat-model/07-residual-risk.md`
- File as L finding in next R-round if new gap discovered
