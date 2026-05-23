# STRIDE Per Element

## Browser (USER)

| Threat | Description | Likelihood | Impact | Controls | Residual |
|--------|-------------|-----------|--------|----------|----------|
| **S**poofing | Attacker impersonates user via stolen cookie | Medium | High | R2.5 HttpOnly+Secure+SameSite=Strict, R3 short-lived JWT (15min) | Low |
| **T**ampering | XSS modifies DOM to exfiltrate data | Low | High | R2 CSP (no unsafe-inline), R2 no dangerouslySetInnerHTML | Low |
| **R**epudiation | User denies action | Low | Medium | R6 audit log with IP + user agent | Low |
| **I**nfo Disclosure | Session cookie leaked via XSS | Low | Critical | R2.5 HttpOnly cookie (JS can't read) | Low |
| **D**enial of Service | Client-side resource exhaustion | Low | Low | R1 rate limiting | Low |
| **E**levation | CSRF to invoke admin action | Low | High | R2.5 CSRF double-submit + X-Requested-With | Low |

## nginx (Frontend)

| Threat | Description | Likelihood | Impact | Controls | Residual |
|--------|-------------|-----------|--------|----------|----------|
| **S**poofing | Fake origin header | Low | Low | R9 Referrer-Policy + CORS | Low |
| **T**ampering | Response injection | Low | High | R2 CSP, R9 COOP/CORP | Low |
| **I**nfo Disclosure | Server header leaks version | Low | Low | R9 Server header stripped | Low |
| **D**enial of Service | Request flood | Medium | Medium | R1 rate limiting, CF L7 | Medium |

## Backend

| Threat | Description | Likelihood | Impact | Controls | Residual |
|--------|-------------|-----------|--------|----------|----------|
| **S**poofing | Forged JWT / alg:none | Low | Critical | R3 strict HS256, R7 key rotation | Low |
| **T**ampering | Audit log modification | Low | High | R6 hash chain, R12 validator | Low |
| **R**epudiation | Admin denies container action | Low | Medium | R6 audit + R10 attackTag | Low |
| **I**nfo Disclosure | /api/health leaks internals | Resolved | Medium | R9.6 route gating (401) | Low |
| **D**enial of Service | Brute force login | Medium | Medium | R1 rate limit, R6 persistent store, R6 account lockout | Low |
| **E**levation | Container escape to host | Low | Critical | R4 cap-drop ALL, AppArmor, read-only rootfs, no docker.sock | Low |

## Socket Proxy

| Threat | Description | Likelihood | Impact | Controls | Residual |
|--------|-------------|-----------|--------|----------|----------|
| **S**poofing | Bypass proxy to direct socket | Low | Critical | R4 no docker.sock mount in backend | Low |
| **T**ampering | Modify proxy config | Low | High | R4 read-only rootfs on proxy | Low |
| **E**levation | EXEC/BUILD via proxy | Low | Critical | R4 EXEC=0, BUILD=0 allowlist | Low |

## Data Volumes (DB + Audit)

| Threat | Description | Likelihood | Impact | Controls | Residual |
|--------|-------------|-----------|--------|----------|----------|
| **T**ampering | Modify DB records | Low | High | R7 SQLCipher encryption | Low |
| **I**nfo Disclosure | Backup theft reveals data | Medium | High | R7 SQLCipher + R8 GPG on backups | Low |
| **D**enial of Service | Disk exhaustion | Medium | Medium | R4 tmpfs limits, R6 log rotation | Medium |
