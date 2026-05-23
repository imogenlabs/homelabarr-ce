# Security

HomelabARR CE ships with a production-grade security envelope by default. This page summarizes the controls that are active on every deployment. For the full disclosure policy, see [SECURITY.md](https://github.com/smashingtags/homelabarr-ce/blob/main/SECURITY.md).

---

## What ships by default

- **Authentication:** JWT access tokens (15-min TTL) + refresh tokens (14-day TTL), both in HttpOnly/Secure/SameSite=Strict cookies. No localStorage tokens.
- **MFA:** TOTP with 10 bcrypt-hashed backup codes. Required for admin accounts.
- **Password hashing:** bcrypt cost 12 with automatic rehash on login.
- **Rate limiting:** 10 attempts per 15 minutes per IP+username. Account lockout with email notification.
- **CSRF protection:** double-submit cookie pattern with constant-time compare.
- **API keys:** HMAC-SHA256 hashed before storage. `hlr_` prefix. Never stored in plaintext.
- **Audit log:** hash-chained tamper-evident log with daily rotation. Every auth event, container action, and admin operation is recorded.
- **Docker socket proxy:** backend never touches the Docker socket directly. A linuxserver socket-proxy sidecar with endpoint allowlist (EXEC=0, BUILD=0) mediates all Docker API access.
- **Container hardening:** `cap_drop: ALL`, `read_only: true`, `no-new-privileges`, memory/PID limits, AppArmor profile.
- **Encryption at rest:** SQLCipher AES-256 on all databases. Key rotation scripts included.

## Security headers

Every response from the nginx frontend includes:

| Header | Value |
|--------|-------|
| Content-Security-Policy | `default-src 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests` |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` |
| Cross-Origin-Opener-Policy | `same-origin` |
| Cross-Origin-Resource-Policy | `same-site` |

## Vulnerability disclosure

Report security issues privately:

- **Email:** michael@mjashley.com
- **GitHub:** [Security Advisories](https://github.com/smashingtags/homelabarr-ce/security/advisories/new)
- **Machine-readable:** [/.well-known/security.txt](https://ce-demo.homelabarr.com/.well-known/security.txt) (RFC 9116)

Response SLA: acknowledge within 48 hours, fix critical within 72 hours.

## For operators

- **Threat model:** [docs/threat-model/](https://github.com/smashingtags/homelabarr-ce/tree/main/docs/threat-model) — asset inventory, trust boundaries, STRIDE analysis, attack trees, residual risk register.
- **Incident response:** [docs/ir/](https://github.com/smashingtags/homelabarr-ce/tree/main/docs/ir) — 11 playbooks covering credential compromise, cosign failures, dependency SLA breaches, and more.
- **Compliance posture:** [compliance/](https://github.com/smashingtags/homelabarr-ce/tree/main/compliance) — CIS Docker v1.6.0, NIST CSF 2.0, OWASP ASVS v4.0.3 L2 alignment.
- **Audit trail:** [docs/audit/](https://github.com/smashingtags/homelabarr-ce/tree/main/docs/audit) — 18 rounds, 201+ findings shipped.
- **Dependency policy:** [docs/governance/dependency-update-policy.md](https://github.com/smashingtags/homelabarr-ce/blob/main/docs/governance/dependency-update-policy.md) — SLA-governed update classes with automated staleness enforcement.
