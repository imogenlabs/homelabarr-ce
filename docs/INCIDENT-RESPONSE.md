# Incident Response — HomelabARR CE

## 1. Detection Sources
- `audit.log` `honey.hit` events (scanner probes detected)
- `attackTag` middleware `mitre_tid` hits (brute force, JWT tamper, path traversal)
- Pentest harness CI failures (regression in security controls)
- Webhook alerts via `ALERT_WEBHOOK_URL` (login.locked, audit.chain.broken)

## 2. Triage
Severity matrix tied to MITRE ATT&CK tactic:
- **Critical:** Initial Access (TA0001), Execution (TA0002), Privilege Escalation (TA0004)
- **High:** Credential Access (TA0006), Persistence (TA0003)
- **Medium:** Discovery (TA0007), Collection (TA0009)
- **Low:** Reconnaissance (TA0043)

## 3. Containment
```sh
docker compose stop backend          # stop the backend immediately
# Preserve data for forensics:
docker cp homelabarr-backend:/app/data ./forensics-$(date +%s)/
# Rotate the JWT secret:
bash scripts/rotate-jwt-key.sh       # invalidates all sessions
```

## 4. Recovery
```sh
# Restore from backup:
bash scripts/restore-drill.sh        # validates backup integrity
# Restart with new secrets:
bash scripts/init-secrets.sh          # regenerate all secrets
docker compose up -d
```

## 5. Disclosure
- `.well-known/security.txt` — public contact
- GitHub Security Advisory — private disclosure
- Follow the 90-day coordinated disclosure timeline in SECURITY.md

## 6. Postmortem
After resolution:
1. Review `/api/audit` for the full event timeline
2. Verify audit chain integrity: `chain.ok` must be `true`
3. Document root cause, timeline, and remediation
4. Update pentest harness if a new attack vector was discovered
