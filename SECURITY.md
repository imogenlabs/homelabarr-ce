# Security Policy

For the full threat model, see [docs/threat-model/](docs/threat-model/README.md). For audit round history, see [docs/audit/](docs/audit/README.md).

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
- **Password hashing:** bcrypt cost 12 via `bcryptjs` (pure-JS for portability). This is ~10x slower than native `bcrypt` but avoids native compilation requirements. The work factor of 12 meets OWASP 2025 ASVS L2 requirements.
- **Password storage:** transparent rehash-on-login for legacy hashes
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

## Verifying Release Artifacts

All HomelabARR CE container images published to GHCR are:
- Built reproducibly by GitHub Actions (`.github/workflows/docker-build-push.yml`)
- Signed via Sigstore (cosign keyless, OIDC issuer `token.actions.githubusercontent.com`)
- Accompanied by SLSA build provenance and a BuildKit-attested SBOM
- Scanned with Trivy on the pushed digest; CRITICAL/HIGH findings block release

To verify before pulling:

```
cosign verify \
  --certificate-identity-regexp '^https://github.com/smashingtags/homelabarr-ce/' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  ghcr.io/smashingtags/homelabarr-backend:<tag>
```

To extract the SBOM:

```
docker buildx imagetools inspect \
  ghcr.io/smashingtags/homelabarr-backend:<tag> \
  --format '{{ json .SBOM.SPDX }}' > backend.spdx.json
```

## Production Deployment Checklist

- `JWT_SECRET` set to `openssl rand -base64 48` output (NOT the default)
- `DEFAULT_ADMIN_PASSWORD` set explicitly OR removed after first-boot bootstrap
- `CORS_ORIGIN` pinned to the exact public origin (no wildcards)
- Docker socket proxy (`socket-proxy` service) present with `EXEC=0, BUILD=0`
- `docker inspect homelabarr-backend` shows `ReadonlyRootfs: true` and `CapDrop: [ALL]`
- Images pinned to a tag AND sha256 digest in your compose file

## Incident Response

1. **Read recent security events** — `GET /api/audit?limit=500` (requires admin auth)
2. **Revoke all sessions** — `POST /api/auth/sessions/revoke-all` or directly: `sqlite3 /app/data/sessions.db "UPDATE sessions SET revoked_at = strftime('%s','now') * 1000 WHERE revoked_at IS NULL;"`
3. **Rotate JWT_SECRET** — regenerate with `openssl rand -base64 48`, update the env, restart backend. All outstanding tokens become invalid.
4. **Verify audit chain integrity** — `GET /api/audit` returns `chain.ok: true/false`
5. **Archive audit logs** — rotated JSONL files at `/app/server/activity-data/audit-*.jsonl.gz`

## Key Rotation Runbook

| Secret | Cadence | Script | Side effects |
|--------|---------|--------|--------------|
| JWT_KEY_CURRENT | 90 days | `scripts/rotate-jwt-key.sh` | None (previous key honored for REFRESH_TOKEN_TTL) |
| SQLCIPHER_KEY | 180 days | `scripts/rotate-sqlcipher-key.sh` | ~1s downtime during rekey |
| ALERT_WEBHOOK_SECRET | 365 days | Edit `./secrets/alert_webhook_secret`, restart backend | Downstream receiver must rotate simultaneously |
| DEFAULT_ADMIN_PASSWORD | One-shot | `scripts/init-secrets.sh` (first boot only) | N/A |

## Secrets Management

`readSecret()` resolves in this order:
1. `/run/secrets/<lowercased name>` (Docker Compose `secrets:` file mount -- default)
2. `$<NAME>_FILE` environment variable pointing to a file path
3. `$<NAME>` direct environment variable (legacy, discouraged)

### Using with Vault / SOPS / 1Password

Any tool that materializes secrets to disk works with the `_FILE` indirection:
- **Vault Agent:** template that writes to `/run/secrets/jwt_key_current`, restart backend on lease refresh
- **SOPS:** `sops -d secrets.enc.yaml | yq -o=json | jq -r '.jwt_secret' > ./secrets/jwt_key_current`
- **1Password Connect:** `op inject -i secrets.tmpl -o ./secrets/jwt_key_current`

## Backup & Recovery

Run `scripts/backup.sh` daily. It produces:
- An encrypted DB snapshot (safe to store with normal backup tools)
- A secrets archive (store in a SEPARATE trust zone -- password manager, encrypted USB, not alongside the DB)

**WARNING:** Losing both the volume AND the secrets archive = unrecoverable data loss. This is the cost of at-rest encryption.

## Reporting Security Issues

Email **michael@mjashley.com** or open a [GitHub Security Advisory](https://github.com/smashingtags/homelabarr-ce/security/advisories/new).

### Disclosure Timeline

- **Day 0:** Report received; acknowledged within 72 hours
- **Day 7:** Triage complete, severity assigned
- **Day 30:** Fix in development; reporter updated
- **Day 90:** Coordinated public disclosure

### Safe Harbor

We will not pursue legal action against good-faith security research that limits testing to ce-demo.homelabarr.com or your own self-hosted instance, avoids data destruction, and reports promptly.

## Deployment Topologies

### Topology A — Single Host (default)
Traefik, frontend, backend, and socket-proxy all on the same Docker host. The `homelabarr-internal` bridge network is the trust boundary. No mTLS required.

### Topology B — Split Host (edge VPS + home lab via WireGuard)
1. Traefik on the edge VPS terminates TLS
2. Backend on the home lab, reachable only via WireGuard peer IP
3. Host firewall: `ufw allow from <wg-peer-ip> to any port 8092 proto tcp`
4. For additional security, enable mTLS between Traefik and backend

## Disaster Recovery

### Prerequisites
1. Latest off-host DB backup (encrypted with SQLCipher — safe for standard backup tools)
2. Latest secrets archive from a SEPARATE trust zone (password manager vault)
3. Clean host with Docker and the host firewall script already run

### Procedure
```
git clone https://github.com/smashingtags/homelabarr-ce && cd homelabarr-ce
git checkout v2.3.0
mkdir -p ./secrets && chmod 700 ./secrets
tar -xf <path-to-secrets-archive>
cosign verify --certificate-identity-regexp '^https://github.com/smashingtags/homelabarr-ce/' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  ghcr.io/smashingtags/homelabarr-backend:v2.3.0
docker compose pull && docker compose up -d
docker cp <backup.db> homelabarr-backend:/app/data/homelabarr.db
docker compose restart backend
curl -fsS https://<host>/api/health
```

### What does NOT work after DR
- Pre-disaster session cookies (users must re-login)
- Any data created after the backup timestamp

## Acknowledgments

We appreciate responsible disclosure and will credit security researchers who report valid vulnerabilities.

## Reporting a Vulnerability

Email: michael@mjashley.com
Response SLO: acknowledge within 24 hours, status update within 7 days.

## Disclosure Policy

90-day coordinated disclosure window from acknowledgment. Earlier if patch ships sooner. Coordinated disclosure preferred. See [docs/ir/playbooks/PB-08-disclosed-vuln.md](docs/ir/playbooks/PB-08-disclosed-vuln.md).

## Machine-readable disclosure contact

A copy of this disclosure policy is available at:
- https://ce-demo.homelabarr.com/.well-known/security.txt (RFC 9116)

## Active Incident Response

For active exploitation, see [docs/ir/00-first-60-seconds.md](docs/ir/00-first-60-seconds.md).
