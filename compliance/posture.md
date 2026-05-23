# HomelabARR CE — Compliance Posture Summary

**Last updated:** 2026-05-23
**Git HEAD:** See `collect-evidence.sh` output for exact commit
**Frameworks:** CIS Docker v1.6.0, OWASP ASVS v4.0.3 L2, NIST CSF 2.0

## Status Distribution

| Framework | Met | Partial | Gap | N/A | Total |
|-----------|-----|---------|-----|-----|-------|
| CIS Docker v1.6.0 (Sec 4-5) | 22 | 2 | 0 | 1 | 25 |
| OWASP ASVS v4.0.3 L2 | 95 | 10 | 5 | 0 | 110 |
| NIST CSF 2.0 | 18 | 8 | 4 | 10 | 40 |

## Known Gaps

| ID | Status | Gap | Reason | Remediation |
|----|--------|-----|--------|-------------|
| ASVS V2.1.7 | [Gap] | Passwords not checked against breach lists | Not implemented | Add HaveIBeenPwned API check |
| ASVS V7.4.1 | [Gap] | Audit log not shipped off-box | Owner decision pending | R10 M-2 deferred |
| ASVS V1.14.6 | [Gap] | DR drill not recorded | R8 specced script; no execution yet | Schedule first drill |
| CSF RC.RP-01 | [Gap] | Recovery plan not exercised | Same as above | Schedule first drill |
| CSF GV.OC-01 | [Gap] | Organizational mission | N/A for OSS project | Operator responsibility |
| CIS 4.5 | [Partial] | Docker Content Trust not enabled | cosign used instead | Equivalent attestation |
| ASVS V3.3.2 | [Partial] | No explicit idle timeout | 15min access token TTL only | Add idle disconnect |
| ASVS V2.2.3 | [Met] | Rate limiting on auth | SQLite-backed 10/15min | — |
| ASVS V4.1.5 | [Met] | Access controls fail closed | requireAuth → 401 | — |
| CIS 5.12 | [Met] | Read-only rootfs | read_only: true on all services | — |
| CIS 5.29 | [Met] | No docker.sock in backend | Socket proxy with EXEC=0 | — |

## Implementing Artifacts (by round)

| Round | Controls Implemented | Key Artifacts |
|-------|---------------------|---------------|
| R1 | Auth defaults, headers, rate limits | server/index.js (helmet, rateLimit) |
| R2 | XSS prevention, CSP | nginx.conf.template, server/index.js |
| R3 | Session lifecycle, MFA, refresh tokens | server/auth.js, server/sessions.js, server/mfa.js |
| R4 | Container hardening | homelabarr.yml, Dockerfile.backend, socket-proxy |
| R5 | Supply chain | .github/workflows/*, .gitleaks.toml, cosign |
| R6 | Audit logging, structured output | server/audit.js, server/log.js, server/alert.js |
| R7 | Secrets management, encryption at rest | server/secrets.js, server/db.js, scripts/rotate-*.sh |
| R8 | Deployment runbook, host defense | scripts/host-firewall-setup.sh, scripts/install-apparmor.sh |
| R9 | DAST integration | .github/workflows/dast-*.yml, .zap/* |
| R10 | Adversary emulation | pentest/*, server/middleware/attackTag.js, server/routes/honey.js |

## Evidence Collection

Run `bash compliance/collect-evidence.sh` to generate point-in-time snapshots in `compliance/evidence/`. See [update-cadence.md](update-cadence.md) for the review schedule.
