# CLAUDE.md — HomelabARR CE

## What this is

HomelabARR Community Edition — free, open-source Docker container management dashboard. Single-click app deployment with 116+ curated templates.

- Repo: `smashingtags/homelabarr-ce` (private)
- Owner: Michael (smashingtags)
- License: MIT
- Live demo: https://ce-demo.homelabarr.com
- Wiki: https://wiki.homelabarr.com (GitHub Pages, MkDocs Material)

## Current State (2026-05-23)

**22-round security audit COMPLETE.** 241+ findings shipped. Login screen gates unauthenticated visitors (R22.5). Index.js refactored from 5313 → 262 lines across 12 route modules.

### Branches
- `main` and `dev` even at `080917c`. No staging branch (tags used instead).
- Dependabot branches may exist — triage per R15 policy.

### GHCR Tags
- `:latest` — prod/demo (ce-demo.homelabarr.com)
- `:staging` — staging (ce-staging.homelabarr.com)
- `:dev` — dev (ce-dev.homelabarr.com)

All three tags currently point to the same digest.

## Stack

- **Backend**: Node.js 24 + Express 4 + better-sqlite3-multiple-ciphers (SQLCipher)
- **Frontend**: React 19 + Vite + Tailwind 4 + shadcn/ui
- **Container**: nginx:1.31-alpine (frontend), node:24-alpine (backend), dumb-init as PID 1
- **Auth**: JWT (HttpOnly cookies) + TOTP MFA + bcrypt cost 12 + CSRF double-submit
- **Docker**: linuxserver/socket-proxy sidecar (EXEC=0, BUILD=0), cap_drop ALL, read_only rootfs

## Environments

| Env | VM | IP | URL | Image Tag | Compose |
|-----|-----|-----|-----|-----------|---------|
| Prod/Demo | 121 (ce-prod) | 192.168.1.231 | ce-demo.homelabarr.com | `:latest` | docker-compose.ce.yml |
| Staging | 122 (ce-staging) | 192.168.1.232 | ce-staging.homelabarr.com | `:staging` | docker-compose.ce.yml |
| Dev | 123 (ce-dev) | 192.168.1.233 | ce-dev.homelabarr.com | `:dev` | docker-compose.ce-dev.yml |

Demo backend has `REQUIRE_DOCKER=false` — no Docker socket access. Watchtower polls all three.

## Build & Deploy

Build on ce-prod (192.168.1.231) — native x86_64, fast. Do NOT build backend on the iMac (ARM + QEMU = painfully slow).

```bash
# Clone, build, push, deploy (all on ce-prod)
ssh michael@192.168.1.231
cd /tmp && rm -rf homelabarr-ce-build
git clone --depth 1 --branch main https://github.com/smashingtags/homelabarr-ce.git homelabarr-ce-build
cd homelabarr-ce-build

# Frontend
docker build --no-cache -t ghcr.io/smashingtags/homelabarr-frontend:latest -f Dockerfile .
docker push ghcr.io/smashingtags/homelabarr-frontend:latest

# Backend
docker build --no-cache -t ghcr.io/smashingtags/homelabarr-backend:latest -f Dockerfile.backend .
docker push ghcr.io/smashingtags/homelabarr-backend:latest

# Deploy
cd /opt/appdata/compose
docker compose -f docker-compose.ce.yml up -d --force-recreate homelabarr-demo-frontend homelabarr-demo-backend

# Tag for staging/dev too
docker tag ghcr.io/smashingtags/homelabarr-frontend:latest ghcr.io/smashingtags/homelabarr-frontend:staging
docker tag ghcr.io/smashingtags/homelabarr-frontend:latest ghcr.io/smashingtags/homelabarr-frontend:dev
docker push ghcr.io/smashingtags/homelabarr-frontend:staging
docker push ghcr.io/smashingtags/homelabarr-frontend:dev
# (same for backend)

rm -rf /tmp/homelabarr-ce-build
```

## Server Structure (post-refactor)

```
server/
  index.js                 262 lines  — app setup, middleware, router mounts, server.listen
  docker-manager.js       1182 lines  — DockerConnectionManager class
  docker-errors.js         205 lines  — error classification, troubleshooting
  auth.js                           — JWT dual-key, bcrypt, API keys, MFA, sessions
  secrets.js                        — Docker secrets reader (readSecret, readSecretFresh)
  audit.js                          — hash-chained tamper-evident audit log
  alert.js                          — webhook dispatcher with HMAC + allowlist
  log.js                            — winston structured logger with PII redaction
  ratelimit.js                      — SQLite-backed rate limit + account lockout
  mfa.js                            — TOTP + backup codes
  sessions.js                       — SQLite session store
  db.js                             — SQLCipher DB opener
  routes/
    auth.js              388 lines  — login, logout, sessions, MFA, refresh
    auth-admin.js        345 lines  — users, API keys, stars, activity, audit
    health.js            199 lines  — /health, /health/detail, /health/secrets
    deploy.js            637 lines  — POST /deploy
    containers.js        497 lines  — container CRUD + stats helpers
    enhanced-mount.js    401 lines  — rclone mount management
    applications.js       98 lines  — app catalog
    deployments.js        92 lines  — deployment modes, SSE, status
    ports.js             107 lines  — port check/available
    honey.js              39 lines  — honey endpoints
```

## Security Audit

22 rounds + R22.5. 241+ findings. Audit loop CLOSED.

Key artifacts:
- `docs/audit/README.md` — round index
- `docs/threat-model/` — STRIDE, trust boundaries, attack trees, residual risk
- `docs/ir/` — incident response runbook + 11 playbooks (PB-01 through PB-11)
- `docs/governance/` — dependency update policy, GitHub security settings
- `docs/decisions/` — ADR-0001 (password hash: bcrypt12 terminal)
- `compliance/` — CIS Docker v1.6.0, NIST CSF 2.0, OWASP ASVS v4.0.3 L2
- `docs/internal/OWNER-PUNCHLIST.md` — remaining owner-only items

## Rules

- Build on ce-prod (231), not the iMac. Backend native compilation under QEMU is 10+ minutes vs 30 seconds native.
- Always push to GHCR after building. Watchtower will revert local-only builds within 5 minutes.
- Always tag `:dev` and `:staging` when pushing `:latest` so all environments stay current.
- JWT_SECRET must be 32+ characters. Dev was crashlooping because of a 22-char secret — fixed 2026-05-23.
- `checkAuth` in AuthContext uses `apiFetchRaw` (bypasses refresh interceptor) to avoid burning rate-limit attempts on page load.
- Don't touch the mobile app (`homelabarr-mobile`) — it's approved on the App Store. The WebView + fetch shim pattern works with the React-side auth gate.
