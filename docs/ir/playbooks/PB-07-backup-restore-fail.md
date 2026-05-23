# PB-07 — backup restore fail

## Trigger
R8 `scripts/backup.sh` exits nonzero, OR `scripts/restore-drill.sh` fails on a clean target.

## Severity (default)
P1 if real restore needed. P3 if drill failure.

## First action (within 5 min)
1. Check backup script output: which step failed? (tar, gpg, rclone, audit POST?)
2. Check if the backup file exists and is non-empty
3. If restore: check SQLCipher key availability in ./secrets/

## Decision point
| Observation | Next action |
|---|---|
| Backup script failed (network) | Retry. Check rclone config. |
| Backup script failed (gpg) | Check GPG key. Is BACKUP_GPG_RCPT set? |
| Restore failed (bad key) | Wrong sqlcipher_key. Check secrets archive. |
| Restore failed (corrupt DB) | Try previous backup. |

## Containment
Do NOT consider backup proven until restored to a clean target with R6-audit-chain.txt showing bad=0.

## Eradication
Fix the failing step. Re-run the script.

## Recovery
Successful backup + successful restore drill on clean target.

## Verification
`R6-audit-chain.txt` shows bad=0 post-restore. `/api/health` returns 200.

## Post-incident
- File post-mortem from [04-post-mortem-template.md](../04-post-mortem-template.md)
- Update: `docs/threat-model/07-residual-risk.md`
- File as L finding in next R-round if new gap discovered
