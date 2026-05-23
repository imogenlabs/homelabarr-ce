# PB-09 — credential leak

## Trigger
R7 secrets scan (gitleaks in CI) or R12 exp 08 crash-log scan finds a secret in logs, repo, or artifacts.

## Severity (default)
P1. Rotate first, investigate after.

## First action (within 5 min)
1. Identify which secret leaked and where (log file, git commit, CI artifact, crash dump)
2. Rotate the leaked secret IMMEDIATELY:
   - JWT key: `bash scripts/rotate-jwt-key.sh` (invalidates all sessions)
   - SQLCipher key: `bash scripts/rotate-sqlcipher-key.sh`
   - Webhook secret: edit `./secrets/alert_webhook_secret`, restart backend
3. Force all users to re-login

## Decision point
| Observation | Next action |
|---|---|
| Leaked in git commit | `git filter-branch` or BFG to remove. Force-push. |
| Leaked in CI artifact | Delete the artifact. Rotate the secret. |
| Leaked in crash log | Fix the logging to redact. Check R6 log.js redaction filter. |

## Containment
Rotate the secret. Revoke all sessions. Block any IP that accessed the leaked value.

## Eradication
Remove the leak source. Update redaction filters. Add the pattern to .gitleaks.toml.

## Recovery
Restart services with new secrets. Verify no further leaks.

## Verification
Gitleaks CI passes. Crash-log scan (R12 exp 08) shows zero matches. `docker inspect` shows no secrets in env.

## Post-incident
- File post-mortem from [04-post-mortem-template.md](../04-post-mortem-template.md)
- Update: `docs/threat-model/07-residual-risk.md`
- File as L finding in next R-round if new gap discovered
