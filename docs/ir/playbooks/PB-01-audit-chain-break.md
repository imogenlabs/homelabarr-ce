# PB-01 — audit chain break

## Trigger
R6 validator: `R6-audit-chain.txt` shows `bad > 0`. ALERT_WEBHOOK fires `audit.chain.broken`.

## Severity (default)
P1. Immediate.

## First action (within 5 min)
1. Snapshot: `bash compliance/collect-evidence.sh`
2. Read `R6-audit-chain.txt`: note `first_bad.seq` and `first_bad.expected` vs `first_bad.got`
3. Check if a chaos experiment (R12) is running — if yes, this may be expected

## Decision point
| Observation | Next action |
|---|---|
| Chaos experiment running | Verify chain recovers post-experiment. If it does, close as expected. |
| No chaos, bad > 0 | Proceed to Containment. This is a real tampering signal. |

## Containment
Freeze audit writes: `docker compose stop backend`. Preserve the volume — do NOT delete anything.

## Eradication
Identify the break point from `first_bad` field. Compare audit JSONL before and after the break. Look for: deleted lines, modified fields, inserted rows.

## Recovery
Restore from R8 backup to a point BEFORE the break. `bash scripts/restore-drill.sh`. Restart backend.

## Verification
Re-run `bash compliance/collect-evidence.sh`. Confirm `R6-audit-chain.txt` shows `bad=0`.

## Post-incident
- File post-mortem from [04-post-mortem-template.md](../04-post-mortem-template.md)
- Update: `docs/threat-model/07-residual-risk.md`
- File as L finding in next R-round if new gap discovered
