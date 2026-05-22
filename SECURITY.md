# Security Policy

## Supported Versions

Only the latest release is fully supported. The previous minor version receives security fixes only.

| Version | Supported |
|---------|-----------|
| Latest release | Yes — see [Releases](https://github.com/smashingtags/homelabarr-ce/releases/latest) |
| Previous minor | Security fixes only |
| Older versions | No |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues privately:

- **Email:** michael@mjashley.com
- **Subject line:** `[SECURITY] HomelabARR CE — <brief description>`

### What to include

- Description of the vulnerability
- Steps to reproduce
- Affected version(s)
- Potential impact
- Suggested fix (if you have one)

### Response timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 1 week
- **Fix (critical):** Within 72 hours of confirmation
- **Fix (high):** Within 2 weeks
- **Fix (medium/low):** Next release cycle

### What happens next

1. We confirm receipt and begin investigation
2. We work on a fix in a private branch
3. We release a patched version
4. We publicly disclose the vulnerability after the fix is available
5. We credit the reporter (unless they prefer anonymity)

## Security Architecture

### Authentication & Session Model

- **Access token:** HS256 JWT, 15-minute TTL, carried in `HttpOnly; Secure; SameSite=Strict` cookie `hl_session`, path `/`
- **Refresh token:** opaque 256-bit base64url string, SHA-256 hashed at rest in SQLite (`data/sessions.db`), 14-day TTL, carried in `HttpOnly; Secure; SameSite=Strict` cookie `hl_refresh`, path `/api/auth/refresh`
- **CSRF:** 256-bit token in non-HttpOnly `hl_csrf` cookie; echo via `X-CSRF-Token` header; `X-Requested-With: XMLHttpRequest` also required. Constant-time compare (`crypto.timingSafeEqual`)
- **Sessions** tracked by `jti` claim in the JWT. Revocation = setting `revoked_at` on the DB row. Users can list and revoke sessions via Settings
- **MFA:** TOTP (`otpauth`, 30s window, ±1 step skew); 10 single-use backup codes (bcrypt-hashed at rest). Required for `role=admin`; opt-in otherwise
- **Password storage:** bcrypt cost 12; transparent rehash-on-login for legacy hashes
- **Password reset:** 30-minute single-use 256-bit token, SHA-256 hashed at rest, all sessions revoked on success
- **Account lockout:** 5 failures / 15min per IP+username; email notification to victim on threshold
- **API keys:** HMAC-SHA256 hashed before storage (never stored in plaintext); `hlr_` prefix; validated via `Authorization: Bearer hlr_...` header (mobile/CLI)
- `JWT_SECRET` is **required** (minimum 32 characters) — the server refuses to start without it
- User IDs generated with `crypto.randomBytes`, not `Math.random`

### Authorization

- Role hierarchy: `user` < `operator` < `admin`
- All sensitive endpoints require authentication (container logs, stats, ports, deployment, SSE streams)
- `/health` returns minimal `{status: "ok"}` to unauthenticated callers
- `AUTH_ENABLED=false` is coupled to loopback-only binding — the server refuses to disable auth while bound to a network interface

### Docker Socket

HomelabARR CE requires read-write access to the Docker socket to manage containers. This grants the backend process **full Docker API access**, which is equivalent to root on the host. The authentication boundary is the only thing between an unauthenticated visitor and host-level access.

Mitigations in place:
- Backend container runs as non-root user (`homelabarr:1001`)
- No sudo access in the container
- All Linux capabilities dropped (`cap_drop: ALL`)
- `no-new-privileges` security option enabled
- Read-only root filesystem with explicit tmpfs mounts
- Backend port is not exposed to the host — only reachable over the internal Docker network

**Recommended:** For production deployments, use a [docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) sidecar with a narrow API allowlist instead of direct socket mounting. See the deployment guide for setup instructions.

### Network

- Backend binds to the internal Docker network only (no host port exposure)
- CORS is restricted to explicit origins (no wildcard in production)
- nginx serves the SPA with a full security header set: CSP, HSTS (2 years + preload), COOP, CORP, Permissions-Policy, X-Frame-Options DENY
- Error responses in production are stripped of internal details (file paths, stack traces, Docker status)

### Environment Variables

- Template variables passed to docker-compose are filtered through an explicit allowlist
- Compose commands are pinned to a fixed set (`up -d`, `down`, `logs`)
- `BACKEND_URL` is validated before nginx config injection (protocol + forbidden character checks)

## Security Best Practices for Users

### Required Configuration

1. **Set `JWT_SECRET`** — minimum 32 characters. Generate with: `openssl rand -base64 32`
2. **Change the default admin password** on first login (the UI will prompt you)
3. **Never set `AUTH_ENABLED=false`** on any host reachable from the network

### Recommended Configuration

- Use Traefik with TLS for any internet-facing deployment
- Add Authelia for 2FA on public-facing instances
- Use a docker-socket-proxy sidecar for defense-in-depth
- Keep the Docker `proxy` network isolated from host networking
- Use firewall rules (UFW) to restrict access to management ports
- Review the changelog before upgrading

### Updates

- Watch this repository for new releases
- Pull updated Docker images regularly: `docker compose pull && docker compose up -d`
- Review the changelog before upgrading

## Scope

This policy covers the HomelabARR CE application code, Docker images, and official documentation. It does not cover:

- Third-party Docker images deployed through HomelabARR (report to the image maintainer)
- Your server's operating system or network configuration
- Cloudflare, Traefik, or Authelia vulnerabilities (report to their respective projects)

## Acknowledgments

We appreciate responsible disclosure and will credit security researchers who report valid vulnerabilities.
