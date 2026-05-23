# OWASP ASVS v4.0.3 Level 2 — HomelabARR CE Posture

Scope: web application security requirements applicable to a self-hosted Docker management dashboard with authentication, session management, and container deployment capabilities.

## V2 — Authentication

| Req | Requirement | Status | Implementing Artifact | Evidence |
|-----|-------------|--------|----------------------|----------|
| V2.1.1 | Passwords >= 12 characters | [Met] | server/auth.js password validation | ASVS-V2.1.1.txt |
| V2.1.7 | Passwords checked against breach lists | [Gap] | Not implemented | — |
| V2.2.1 | Anti-automation on auth | [Met] | express-rate-limit SQLite-backed (R6) | ASVS-V2.2.1.txt |
| V2.2.3 | Rate limiting on auth | [Met] | 10 attempts/15min per IP (R1/R6) | ASVS-V2.2.3.txt |
| V2.5.1 | Password reset via secure token | [Met] | /auth/forgot-password + /auth/reset-password (R3) | ASVS-V2.5.1.txt |
| V2.7.1 | MFA available | [Met] | TOTP via otpauth (R3) | ASVS-V2.7.1.txt |
| V2.7.5 | TOTP supported | [Met] | RFC 6238, drift window ±1 (R3) | ASVS-V2.7.5.txt |
| V2.8.1 | Lookup secrets (backup codes) | [Met] | 10 bcrypt-hashed backup codes (R3) | ASVS-V2.8.1.txt |

## V3 — Session Management

| Req | Requirement | Status | Implementing Artifact |
|-----|-------------|--------|----------------------|
| V3.1.1 | Session tokens not in URL | [Met] | HttpOnly cookie, never in query params |
| V3.2.1 | Server-generated session tokens | [Met] | JWT signed HS256 (R3) |
| V3.2.2 | Session tokens >= 128 bits entropy | [Met] | crypto.randomBytes(32) for refresh |
| V3.3.1 | Logout invalidates session | [Met] | jti added to revocation set (R3) |
| V3.3.2 | Idle timeout | [Partial] | Access token 15min TTL; no explicit idle timeout |
| V3.4.1 | Cookie-based tokens use Secure | [Met] | Secure, HttpOnly, SameSite=Strict (R2.5) |
| V3.5.2 | JWT algorithm fixed | [Met] | HS256 only, algorithms: ['HS256'] (R3) |
| V3.7.1 | Session revocation on password change | [Met] | revokeAllForUser on change-password (R3) |

## V4 — Access Control

| Req | Requirement | Status | Implementing Artifact |
|-----|-------------|--------|----------------------|
| V4.1.1 | Access controls on every request | [Met] | requireAuth middleware on all endpoints |
| V4.1.3 | Principle of least privilege | [Met] | Role hierarchy: user < operator < admin (R1) |
| V4.1.5 | Access controls fail closed | [Met] | Missing/invalid token → 401 |
| V4.2.1 | Forced browsing prevented | [Met] | /_routes requires auth (R9.6) |
| V4.3.1 | Admin functions protected | [Met] | requireRole('admin') on admin endpoints |

## V5 — Validation, Sanitization, Encoding

| Req | Requirement | Status | Implementing Artifact |
|-----|-------------|--------|----------------------|
| V5.1.1 | Input validation enforced | [Met] | Body validation on auth endpoints (R3.5) |
| V5.2.1 | HTML output encoding | [Met] | React auto-escapes; zero dangerouslySetInnerHTML (R2) |
| V5.3.4 | SQL injection prevention | [Met] | better-sqlite3 prepared statements only |
| V5.5.1 | Server-side template injection | [Met] | No server-side templating engine |

## V6 — Stored Cryptography

| Req | Requirement | Status | Implementing Artifact |
|-----|-------------|--------|----------------------|
| V6.2.1 | Crypto modules fail securely | [Met] | Node.js crypto, SQLCipher AES-256 (R7) |
| V6.2.5 | Passwords stored with bcrypt >= cost 10 | [Met] | bcryptjs cost 12 with auto-rehash (R3) |
| V6.4.1 | Key management process | [Met] | Docker secrets + rotation scripts (R7) |

## V7 — Error Handling and Logging

| Req | Requirement | Status | Implementing Artifact |
|-----|-------------|--------|----------------------|
| V7.1.1 | No sensitive data in logs | [Met] | PII redaction filter in server/log.js (R6) |
| V7.1.3 | Error messages don't leak internals | [Met] | sendError() strips details in production (R1) |
| V7.3.1 | Auth decisions logged | [Met] | Audit log on every auth event (R6) |
| V7.4.1 | Logs shipped to central system | [Gap] | Not yet implemented — owner decision pending |

## V8 — Data Protection

| Req | Requirement | Status | Implementing Artifact |
|-----|-------------|--------|----------------------|
| V8.2.2 | No sensitive data cached client-side | [Met] | Cache-Control: no-store on API responses |
| V8.3.1 | Sensitive data encrypted at rest | [Met] | SQLCipher AES-256 on homelabarr.db (R7) |

## V9 — Communication

| Req | Requirement | Status | Implementing Artifact |
|-----|-------------|--------|----------------------|
| V9.1.1 | TLS for all connections | [Met] | Cloudflare edge TLS + HSTS preload |
| V9.1.2 | TLS 1.2+ only | [Met] | Traefik TLS options (R8) |

## V13 — API and Web Service

| Req | Requirement | Status | Implementing Artifact |
|-----|-------------|--------|----------------------|
| V13.1.1 | Same auth for API and web | [Met] | Single requireAuth middleware |
| V13.2.1 | HTTP methods enforced | [Met] | Express method-specific routes |
| V13.2.5 | Content-Type validation | [Met] | express.json() middleware |

## V14 — Configuration

| Req | Requirement | Status | Implementing Artifact |
|-----|-------------|--------|----------------------|
| V14.2.1 | All components up to date | [Met] | Dependabot daily (npm) / weekly (actions, docker); governed by [dependency-update-policy](../docs/governance/dependency-update-policy.md) with SLA enforcement via staleness workflow |
| V14.4.1 | Security headers set | [Met] | Full header set via helmet + nginx (R2/R9) |
| V14.4.5 | HSTS set | [Met] | max-age=63072000; includeSubDomains; preload |
| V14.5.3 | CSP set | [Met] | Strict CSP with report-to (R2/R9) |

## Coverage roadmap

Traced this round: V2, V3, V4, V5, V6, V7, V8 (partial), V9, V13, V14 (43 requirements).

Deferred to quarterly cadence reviews (per compliance/update-cadence.md):
- **V1 Architecture** — adds architecture diagram + data-flow map. Next quarter.
- **V8 Data Protection** — beyond V8.2.2; needs PII inventory. Next quarter.
- **V10 Malicious Code** — needs threat model documentation. Q+2.
- **V11 Business Logic** — needs threat model documentation. Q+2.
- **V12 Files and Resources** — likely largely N/A (no file upload feature). Audit Q+2.
