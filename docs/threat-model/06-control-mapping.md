# Control Mapping — R1–R12 Controls → Threats

| Control | Round | Threat(s) mitigated | Evidence |
|---------|-------|---------------------|----------|
| Rate limiting on auth | R1, R6 | DoS (D), Brute force (S) | R10 atomic T1110 |
| Helmet security headers | R1, R9 | XSS (T/I), Clickjacking (T) | Response header probes |
| CSP with no unsafe-inline | R2 | XSS (T/I/E) | CSP header verification |
| HttpOnly+Secure cookies | R2.5 | Cookie theft (I) | DevTools cookie inspection |
| CSRF double-submit | R2.5, R3 | CSRF (E) | Login flow verification |
| bcrypt cost 12 | R3 | Password cracking (S) | Source: server/auth.js |
| JWT 15min TTL + refresh | R3 | Token replay (S) | Token decode verification |
| TOTP MFA | R3 | Credential stuffing (S) | MFA setup flow |
| Session revocation on password change | R3 | Stolen session persistence (S) | Logout flow |
| Container cap-drop ALL | R4 | Container escape (E) | docker inspect evidence |
| Read-only rootfs | R4 | LD_PRELOAD injection (E) | CIS-5.12 evidence |
| Socket proxy (EXEC=0, BUILD=0) | R4 | Docker API abuse (E) | CIS-5.29 evidence |
| AppArmor profile | R4, R8 | File system access (E) | CIS-5.1 evidence |
| cosign image signing | R5 | Supply chain (T) | R5-cosign.txt evidence |
| SHA-pinned GitHub Actions | R5 | CI compromise (T) | Workflow grep |
| gitleaks secrets scanning | R5 | Committed secrets (I) | CI workflow |
| Hash-chained audit log | R6 | Tampering (T), Repudiation (R) | R6-audit-chain.txt |
| Persistent rate-limit store | R6 | Rate-limit bypass (D) | SQLite store survives restart |
| Account lockout | R6 | Brute force (S) | 8 failures → 30min lock |
| Webhook alerts | R6 | Detection blind spot | ALERT_WEBHOOK_URL |
| Docker secrets (not env vars) | R7 | Secret leakage (I) | docker inspect shows no secrets |
| SQLCipher encryption at rest | R7 | Data theft from volume (I) | DB header is random bytes |
| JWT key rotation | R7 | Key compromise window (S) | rotate-jwt-key.sh |
| Host firewall (UFW/nftables) | R8 | Network exposure (D/I) | host-firewall-setup.sh |
| fail2ban wired to audit log | R8 | Persistent brute force (S/D) | fail2ban jail config |
| Backup with GPG + offsite | R8 | Data loss, backup theft (I) | backup.sh |
| ZAP DAST in CI | R9 | Regression (all STRIDE) | dast-baseline.yml |
| Route gating (/health/detail, /_routes) | R9.6 | Info disclosure (I) | 401 on unauth |
| ATT&CK pentest harness | R10 | 16 techniques | pentest/atomics/ |
| Honey routes + attackTag | R10.5, R10.7 | Scanner detection (I precursor) | 9-byte "Not Found" body |
| CIS/ASVS/NIST compliance trace | R11 | Governance gap | compliance/*.md |
| Chaos experiments | R12 | Resilience under failure | chaos/experiments/ |
| SLO baseline | R12 | Operational visibility | R12-slo.md |
