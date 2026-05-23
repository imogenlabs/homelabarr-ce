# Framework Crosswalk

## STRIDE → OWASP Top 10 (2021)

| STRIDE | OWASP Top 10 | HomelabARR controls |
|--------|-------------|---------------------|
| Spoofing | A07 Identification and Authentication Failures | R1 rate limit, R3 MFA/JWT, R7 key rotation |
| Tampering | A03 Injection, A08 Software and Data Integrity | R2 CSP, R5 cosign, R6 audit chain |
| Repudiation | A09 Security Logging and Monitoring Failures | R6 hash-chained audit, R10 attackTag |
| Information Disclosure | A01 Broken Access Control, A02 Cryptographic Failures | R7 SQLCipher, R9.6 route gating |
| Denial of Service | A05 Security Misconfiguration | R1 rate limit, R4 cgroup limits, R12 chaos |
| Elevation of Privilege | A01 Broken Access Control | R3 role hierarchy, R4 container hardening |

## STRIDE → CWE Top 25

| STRIDE | CWE | HomelabARR controls |
|--------|-----|---------------------|
| Spoofing | CWE-287 Improper Authentication | R3 requireAuth, R3 MFA |
| Spoofing | CWE-798 Hard-coded Credentials | R7 Docker secrets (no env vars) |
| Tampering | CWE-79 XSS | R2 CSP, React auto-escaping |
| Tampering | CWE-89 SQL Injection | better-sqlite3 prepared statements |
| Information Disclosure | CWE-200 Exposure of Sensitive Information | R9.6 health/detail gated, R6 PII redaction |
| Information Disclosure | CWE-532 Information Exposure Through Log Files | R6 log.js redaction filter |
| Elevation of Privilege | CWE-269 Improper Privilege Management | R3 role hierarchy, R4 cap-drop ALL |
| Denial of Service | CWE-400 Uncontrolled Resource Consumption | R4 pids_limit + mem_limit |

## STRIDE → MITRE ATT&CK Tactics

| STRIDE | ATT&CK Tactic | HomelabARR atomics |
|--------|--------------|-------------------|
| Spoofing | TA0001 Initial Access | T1190, T1133, T1078 |
| Spoofing | TA0006 Credential Access | T1110, T1606 |
| Tampering | TA0005 Defense Evasion | T1562 (audit tamper — detected by R6 chain) |
| Information Disclosure | TA0007 Discovery | T1613, T1083 |
| Information Disclosure | TA0043 Reconnaissance | T1595 (honey routes) |
| Elevation of Privilege | TA0004 Privilege Escalation | T1611 (container escape) |
| Denial of Service | TA0040 Impact | T1499 (endpoint DoS) |

## STRIDE → ASVS Chapters

| STRIDE | ASVS Chapter | Coverage |
|--------|-------------|----------|
| Spoofing | V2 Authentication | 8 reqs traced (R11) |
| Spoofing | V3 Session Management | 8 reqs traced (R11) |
| Tampering | V5 Validation | 4 reqs traced (R11) |
| Repudiation | V7 Error Handling and Logging | 4 reqs traced (R11) |
| Information Disclosure | V8 Data Protection | 2 reqs traced (R11) |
| Denial of Service | V13 API | 3 reqs traced (R11) |
| Elevation of Privilege | V4 Access Control | 5 reqs traced (R11) |
