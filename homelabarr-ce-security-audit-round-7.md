# HomelabARR-CE Security Audit — Round 7
**Dimension:** Secrets management, encryption-at-rest, key rotation
**Target:** `smashingtags/homelabarr-ce` @ `security/round-6-observability@5807987e` (live: ce-demo.homelabarr.com)
**Date:** 2026-05-22
**Status:** R6 core shipped (audit chain, persistent rate-limit, lockout, alert env, X-Request-Id propagation, structured-logging modules). Two R6 deliverables and most R5.5 drifts still pending — see §0.
**Findings:** 12 (1 Critical / 5 High / 3 Medium / 3 Low)

---

## §0 — Prior Round Carryover (Verified Source + Live)

### Round 6 verification matrix (against `security/round-6-observability@5807987e` + live probes)

| Check | Source/Live | Verdict |
|---|---|---|
| `server/audit.js` present | source | **PASS** (3,505 B) |
| `server/log.js` present | source | **PASS** (1,595 B) |
| `server/alert.js` present | source | **PASS** (1,101 B) |
| `server/ratelimit.js` present | source | **PASS** (2,573 B) |
| `/api/audit` endpoint reachable | live | **PASS** (200) |
| `X-Request-Id` round-trip echo | live | **PASS** (custom rid sent → same rid echoed in response header) |
| `winston`, `winston-daily-rotate-file`, `ipaddr.js` deps present | source | **PASS** (`^3.11.0`, `^5.0.0`, `^2.4.0`) |
| `.nvmrc` tightened to `24.16.0` | source | **PASS** |
| `AUDIT_STRICT` env wired in compose | source | **PASS** |
| `ALERT_WEBHOOK_URL`, `ALERT_WEBHOOK_SECRET` env wired | source | **PASS** |
| `/api/health` minimized to 3 keys (H-R6-5) | live | **FAIL — R6.5-drift-1** (still returns full payload incl. `nodeVersion`, `platform`, `status: DEGRADED`) |
| `/api/health/detail` route present (H-R6-5) | live | **FAIL — R6.5-drift-1** (HTTP 404) |
| `packageManager` field in package.json (R5.5-drift-2) | source | **FAIL — carry-forward** |
| Trivy scan of pushed image digest (R5.5-drift-3) | source | **FAIL — carry-forward** |
| CycloneDX SBOM for npm (R5.5-drift-4) | source | **FAIL — carry-forward** |
| `DEFAULT_ADMIN_PASSWORD=${VAR:?}` fail-loud (R5.5-drift-5 / R4.5-drift-1) | source | **FAIL — carry-forward, now 3 rounds stale** |
| Image `tag@sha256:digest` pinning (R5.5-drift-6) | source | **FAIL — carry-forward** (still `:latest` ×2; needs tagged release first) |
| Every `uses:` SHA-pinned (R5.5-drift-7) | source | **FAIL — carry-forward** (0/27 SHA-pinned in this branch; ship report mentioned all 27 pinned but the R6 branch source still shows `@vN` tags — verify which branch actually landed) |
| Live API working (/applications, /containers, /auth/sessions) | live | **PASS** (200/200/200) |

R6 highlights that **shipped**: tamper-evident audit log, persistent rate-limit, lockout state machine, webhook alert plumbing, X-Request-Id middleware. The **`/api/health` minimization** is the one R6 deliverable that did not surface live — promote to **R6.5-drift-1** and ship inside the R7 PR alongside the longer-running R5.5 carry-forwards.

### Action items rolling into R7 PR (verbatim diffs already provided in prior round MDs):

1. **R6.5-drift-1** — minimize `/api/health` to `{status, timestamp, version}` and add `/api/health/detail` behind `requireAdmin`. Resolves R5.5-drift-8 (the DEGRADED reading on the demo) at the same time, because the proxy-aware `dockerProbe()` from R5 §0 is what sets `status` and that probe never made it into the live image.
2. **R5.5-drift-2** — `"packageManager": "npm@10.9.0+sha256.…"` in package.json.
3. **R5.5-drift-3** — `aquasecurity/trivy-action` step with `image-ref: …@${{ steps.build-*.outputs.digest }}` + SARIF upload.
4. **R5.5-drift-4** — `@cyclonedx/cyclonedx-npm` job emitting `sbom-npm.cdx.json` as workflow artifact.
5. **R5.5-drift-5** — `DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:?...}` in compose.
6. **R5.5-drift-6** — tag `v2.3.0`, then `scripts/bump-image-digests.sh v2.3.0` to rewrite compose.
7. **R5.5-drift-7** — verify with `grep -RhE '^\s*-\s*uses:' .github/workflows | grep -vE '@[0-9a-f]{40}' | grep -v '#'` → expect empty. If non-empty, re-run the bulk-SHA-pin recipe from R6 §0.

---

## §1 — Goal

Make secrets and the SQLite DB **safe at rest** and **rotatable without a re-deploy**:

1. **Externalize all six runtime secrets** out of the compose file's environment block and into Docker secrets (or operator-chosen Vault/SOPS source). Today `JWT_SECRET`, `DEFAULT_ADMIN_PASSWORD`, `ALERT_WEBHOOK_SECRET`, and any future SMTP/registry credentials live as environment variables, which means they appear in `docker inspect`, `/proc/<pid>/environ`, and any backup that captures process state.
2. **Encrypt the SQLite databases at rest.** The R3 `sessions` and `users` tables hold password hashes, the R6 `audit_events` table holds login IPs and event metadata, and the new R6 `account_lockouts` and `rate_buckets` reveal attack patterns. A backup or host-FS compromise should not be sufficient to read this. Use SQLCipher via `@journeyapps/sqlcipher` (drop-in replacement for `better-sqlite3` API surface, or the `better-sqlite3-with-sqlcipher` fork) with a key sourced from Docker secrets.
3. **Document and tool key rotation** so `JWT_SECRET` and the SQLCipher key can be rotated with one script, sessions invalidated, audit chain re-anchored, and no downtime beyond a single restart.
4. **Move CSRF + session keys to a key-ring** so rotation can be staged without immediate session loss (current → previous still validates for 24h, then expires).

Threat model: a host compromise that yields read access to `/var/lib/docker/volumes/` (backup theft, snapshot leak) should not yield credentials, password hashes, or the audit history. A maintainer who needs to rotate the JWT secret should be able to do so in &lt;5 minutes without forcing a full re-install.

---

## §2 — Current State (Verified via Source @ `security/round-6-observability` + Live)

### 2.1 — Secrets currently passed as environment variables

`homelabarr.yml` backend service environment block lists at minimum:

```yaml
- JWT_SECRET=${JWT_SECRET:?...}                       # fail-loud ✓  (R4.5)
- ACCESS_TOKEN_TTL=${ACCESS_TOKEN_TTL:-15m}
- REFRESH_TOKEN_TTL=${REFRESH_TOKEN_TTL:-14d}
- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:-admin}   # still :- default ← R5.5-drift-5
- ALERT_WEBHOOK_URL=${ALERT_WEBHOOK_URL:-}
- ALERT_WEBHOOK_SECRET=${ALERT_WEBHOOK_SECRET:-}
- AUDIT_STRICT=${AUDIT_STRICT:-0}
```

All of these are exposed to anyone with `docker inspect` access (every member of the host's `docker` group), and they are written into `/proc/<pid>/environ` on the backend container — readable by any process inside the container with the right uid. The R4 hardening (`user: 1001:1001`, `read_only:true`, etc.) constrains who that is, but the **container's own pid 1** still has the secrets in plaintext in its environment, which means a memory dump or a bug like the `process.env` printing in an unhandled rejection leaks them.

### 2.2 — Persistent volumes and what they contain

R4 named volumes (still in use):

| Volume | Contents | Sensitivity |
|---|---|---|
| `homelabarr-data` | SQLite DB `/app/data/homelabarr.db` (users, sessions, account_lockouts, rate_buckets, audit_events) | HIGH — password hashes, audit history, IPs |
| `homelabarr-config` | `/app/server/config` — users.json (R0 legacy?), api keys, session state | HIGH |
| `homelabarr-activity` | `/app/server/activity-data` — rotated `audit-*.jsonl.gz` (R6 M-R6-6) | HIGH — login IPs, event chain |

Today **none** of these are encrypted at rest. A volume snapshot or off-host backup (which is industry-best-practice — `restic`, `borg`, `duplicity`) carries cleartext copies of every login attempt and every password hash.

### 2.3 — Existing key/secret material that needs an orderly home

| Secret | Used for | Rotation cadence (target) |
|---|---|---|
| `JWT_SECRET` | HS256 signing of access + refresh tokens | 90 days |
| SQLCipher key (new) | Encrypts `homelabarr.db` at rest | 180 days |
| `ALERT_WEBHOOK_SECRET` | HMAC for outbound webhook payloads | 365 days |
| `DEFAULT_ADMIN_PASSWORD` | First-boot bootstrap only | one-shot; cleared after first login |
| CSRF token signing key (if separated from JWT_SECRET) | `hl_csrf` cookie HMAC | 90 days |
| SMTP password (future, for password reset email) | `nodemailer` auth | per provider |

Today: `JWT_SECRET` and `ALERT_WEBHOOK_SECRET` are env-vars. SQLCipher key does not exist. `DEFAULT_ADMIN_PASSWORD` is an env-var. CSRF likely shares `JWT_SECRET` (verify in R7 commit review). SMTP not yet wired (password-reset email is in scope but the SMTP creds story is not).

### 2.4 — What "Docker secrets" actually means for this deployment

Docker Compose supports two flavors:

- **`secrets:`** with `file:` — secret mounted as `/run/secrets/<name>`, accessible only to the service that declared the secret, removed from the container when it stops. Works on standalone Compose v2.
- **`secrets:`** with `external: true` — fetched from `docker secret ls` (Swarm) or from an integration like `docker compose --env-file` plus SOPS/Vault.

For HomelabARR-CE the standalone Compose `file:` form is the right floor: it's portable across single-host installs and doesn't require Swarm or Vault. Users who want Vault/SOPS get an extension path documented in SECURITY.md.

The mount appears as a file inside the container at `/run/secrets/jwt_secret`. Node reads it once at boot:

```js
const JWT_SECRET = readSecret('JWT_SECRET');  // reads /run/secrets/jwt_secret if present, falls back to env
```

That single helper centralizes the env-vs-file decision and is the keystone of R7.

---

## §3 — Findings

Severity scale: **C** Critical (cleartext secrets / cleartext data-at-rest) · **H** High (rotation impossible without downtime / scope creep) · **M** Medium (defense-in-depth) · **L** Low (hygiene)

### C-R7-1 — All runtime secrets are environment variables (cleartext in `docker inspect` and `/proc/<pid>/environ`)

**Where:** `homelabarr.yml` backend service `environment:` block; `server/auth.js` reading `process.env.JWT_SECRET`; `server/alert.js` reading `process.env.ALERT_WEBHOOK_SECRET`.

**What:** Anyone in the host's `docker` group can dump every secret with a single command:

```sh
docker inspect homelabarr-backend --format '{{ range .Config.Env }}{{ println . }}{{ end }}'
```

A backup of `/var/lib/docker/containers/` includes the container config JSON with the same env block in cleartext. The R4 hardening makes the runtime container hard to compromise, but the moment a snapshot leaves the host (which it should — backups are mandatory), the secrets leave with it.

**RIGHT — `server/secrets.js` (new file)**
```js
import fs from 'node:fs';

const SECRET_ROOT = process.env.SECRET_ROOT || '/run/secrets';

/**
 * Read a secret value in this order:
 *   1. /run/secrets/<lowercased name>   (Docker secret file mount)
 *   2. process.env[<NAME>_FILE] then read that path  (12-factor convention)
 *   3. process.env[NAME]                              (legacy fallback, env-only)
 *
 * Reads exactly once and caches; do not call after mutating environment.
 */
const cache = new Map();
export function readSecret(name, { required = true } = {}) {
  if (cache.has(name)) return cache.get(name);

  // (1) Docker secret file
  const dockerPath = SECRET_ROOT + '/' + name.toLowerCase();
  if (fs.existsSync(dockerPath)) {
    const v = fs.readFileSync(dockerPath, 'utf8').replace(/\s+$/, '');
    cache.set(name, v); return v;
  }
  // (2) _FILE indirection
  const filePath = process.env[name + '_FILE'];
  if (filePath && fs.existsSync(filePath)) {
    const v = fs.readFileSync(filePath, 'utf8').replace(/\s+$/, '');
    cache.set(name, v); return v;
  }
  // (3) direct env-var (legacy)
  if (process.env[name] !== undefined) {
    cache.set(name, process.env[name]); return process.env[name];
  }
  if (required) throw new Error('secret-missing: ' + name);
  cache.set(name, null); return null;
}

/** For lifecycle ops: do NOT cache, re-read every call. */
export function readSecretFresh(name) {
  cache.delete(name);
  return readSecret(name, { required: false });
}
```

**`server/auth.js` and `server/alert.js` switch from `process.env` to `readSecret()`:**
```js
// WRONG
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'CHANGE-THIS-TO-A-SECURE-SECRET' || Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
  console.error('[fatal] JWT_SECRET missing'); process.exit(1);
}

// RIGHT
import { readSecret } from './secrets.js';
const JWT_SECRET = readSecret('JWT_SECRET');
if (!JWT_SECRET || JWT_SECRET === 'CHANGE-THIS-TO-A-SECURE-SECRET' || Buffer.byteLength(JWT_SECRET, 'utf8') < 32) {
  console.error('[fatal] JWT_SECRET missing, default, or shorter than 32 bytes — refusing to start');
  process.exit(1);
}
```

**Compose changes — `homelabarr.yml`:**
```yaml
secrets:
  jwt_secret:
    file: ${JWT_SECRET_FILE:-./secrets/jwt_secret}
  default_admin_password:
    file: ${DEFAULT_ADMIN_PASSWORD_FILE:-./secrets/default_admin_password}
  alert_webhook_secret:
    file: ${ALERT_WEBHOOK_SECRET_FILE:-./secrets/alert_webhook_secret}
  sqlcipher_key:                                    # introduced in C-R7-2
    file: ${SQLCIPHER_KEY_FILE:-./secrets/sqlcipher_key}

services:
  backend:
    environment:
      # REMOVE all of these from environment:
      # - JWT_SECRET=...
      # - DEFAULT_ADMIN_PASSWORD=...
      # - ALERT_WEBHOOK_SECRET=...
      # Keep non-secret tuning vars:
      - ACCESS_TOKEN_TTL=${ACCESS_TOKEN_TTL:-15m}
      - REFRESH_TOKEN_TTL=${REFRESH_TOKEN_TTL:-14d}
      - AUDIT_STRICT=${AUDIT_STRICT:-0}
      - ALERT_WEBHOOK_URL=${ALERT_WEBHOOK_URL:-}
      - SECRET_ROOT=/run/secrets                    # explicit; backed up by default in code
    secrets:
      - jwt_secret
      - default_admin_password
      - alert_webhook_secret
      - sqlcipher_key
```

**Bootstrap helper — `scripts/init-secrets.sh` (new)**
```sh
#!/usr/bin/env bash
set -eu
umask 077
mkdir -p ./secrets
need() {
  local name="$1" gen="$2"
  if [ ! -f "./secrets/$name" ]; then
    eval "$gen" > "./secrets/$name"
    echo "wrote ./secrets/$name ($(wc -c < "./secrets/$name") bytes)"
  fi
}
need jwt_secret              'openssl rand -base64 48'
need default_admin_password  'openssl rand -base64 18'
need alert_webhook_secret    'openssl rand -base64 32'
need sqlcipher_key           'openssl rand -base64 32'

echo
echo 'Initial admin secret-value (one-time; will rotate on first login):'
cat ./secrets/default_admin_password
echo
echo 'Keep ./secrets/ out of version control and back it up out-of-band.'
```

**`.gitignore` — append:**
```
/secrets/
```

**Verification:**
```sh
# 1. No secrets in container env block
docker inspect homelabarr-backend --format '{{ range .Config.Env }}{{ println . }}{{ end }}' \
  | grep -iE '^(JWT_SECRET|DEFAULT_ADMIN_PASSWORD|ALERT_WEBHOOK_SECRET|SQLCIPHER_KEY)='
# Expect: NO output

# 2. Secrets visible only to the backend service, as files
docker exec homelabarr-backend ls -la /run/secrets/
# Expect: 4 files, mode 0400 owned by uid 1001

# 3. App still functions
curl -s -o /dev/null -w '%{http_code}\n' https://ce-demo.homelabarr.com/api/health
# Expect: 200

# 4. /proc/<pid>/environ no longer leaks
docker exec homelabarr-backend sh -c 'tr "\0" "\n" < /proc/1/environ | grep -iE "jwt|secret|password"'
# Expect: NO output (env-vars are gone; only the file mounts hold the values)
```

### C-R7-2 — `homelabarr.db` SQLite database is cleartext on disk

**Where:** `/app/data/homelabarr.db` inside the backend, persisted via the `homelabarr-data` Docker volume (host path under `/var/lib/docker/volumes/homelabarr-data/_data/`).

**What:** A snapshot of that volume reveals every password hash, every session row, every audit event with IPs and metadata. `better-sqlite3` does not ship encryption; the right move is the **SQLCipher** family — same SQL surface, transparent page-level AES-256 encryption keyed by a single passphrase.

Choose one of two implementations (functionally equivalent for HomelabARR's read/write profile):

- **`better-sqlite3-multiple-ciphers`** — fork of `better-sqlite3` with SQLCipher v4 compatible page format. Drop-in for the existing API.
- **`@journeyapps/sqlcipher`** — older but widely deployed, asynchronous-only API.

R7 spec: **`better-sqlite3-multiple-ciphers`** for API parity with R6's existing synchronous code paths.

**WRONG (current shape — server/db.js or wherever the DB opens)**
```js
import Database from 'better-sqlite3';
export const db = new Database('/app/data/homelabarr.db');
```

**RIGHT — `server/db.js`**
```js
import Database from 'better-sqlite3-multiple-ciphers';
import { readSecret } from './secrets.js';

const DB_PATH = process.env.DB_PATH || '/app/data/homelabarr.db';

function openEncrypted() {
  const key = readSecret('SQLCIPHER_KEY');
  if (!key || key.length < 32) {
    console.error('[fatal] SQLCIPHER_KEY missing or shorter than 32 chars'); process.exit(1);
  }
  const db = new Database(DB_PATH);
  // Use a raw-key form so we can rotate without re-deriving via PBKDF2 on every open.
  // SQLCipher accepts the key as a quoted string here; PRAGMAs are SQLCipher-specific.
  db.pragma(\`cipher='sqlcipher'\`);
  db.pragma(\`key='${key.replace(/'/g, "''")}'\`);
  db.pragma(\`cipher_page_size=4096\`);
  // Smoke-test: this throws if the key is wrong or the file is unencrypted-but-expected-encrypted, etc.
  db.prepare('SELECT count(*) AS n FROM sqlite_master').get();
  return db;
}
export const db = openEncrypted();
```

**Migration of existing cleartext DB — `scripts/encrypt-db.sh` (one-shot)**
```sh
#!/usr/bin/env bash
set -eu
DB_PATH="${1:?usage: $0 <path/to/homelabarr.db>}"
KEY_FILE="${2:?usage: $0 <db> <path/to/sqlcipher_key>}"
KEY="$(cat "$KEY_FILE")"
TMP="$(dirname "$DB_PATH")/.encrypted.db"

sqlite3 "$DB_PATH" <<EOF
ATTACH DATABASE '$TMP' AS enc KEY '$KEY';
SELECT sqlcipher_export('enc');
DETACH DATABASE enc;
EOF

# Keep a clearly-named backup so the rollback path is obvious
mv "$DB_PATH" "$DB_PATH.preencrypt.$(date -u +%Y%m%dT%H%M%SZ)"
mv "$TMP" "$DB_PATH"
echo "encrypted: $DB_PATH"
echo "backup:    $DB_PATH.preencrypt.*"
```

Run inside the backend container during the R7 deploy maintenance window — backend stopped, encrypt-db.sh runs, backend restarts with the new SQLCipher driver and key in `/run/secrets/sqlcipher_key`.

**`Dockerfile.backend` change** — `better-sqlite3-multiple-ciphers` includes a native build; ensure builder stage has the toolchain:
```dockerfile
# In Dockerfile.backend builder stage (before npm ci):
RUN apk add --no-cache --virtual .gyp python3 make g++ \
 && npm ci --omit=dev \
 && apk del .gyp
```

**Verification:**
```sh
# 1. File is no longer a recognizable SQLite database
docker exec homelabarr-backend sh -c 'head -c 16 /app/data/homelabarr.db | xxd'
# Expect: random bytes — NOT 'SQLite format 3'

# 2. App still reads and writes
curl -s --cookie cj.txt -H 'X-Requested-With: XMLHttpRequest' \
  https://ce-demo.homelabarr.com/api/auth/sessions | jq 'length'
# Expect: numeric (sessions array length)

# 3. Encryption verified
docker exec homelabarr-backend sh -c \
  'sqlite3 /app/data/homelabarr.db "SELECT 1;"' 2>&1 | head -5
# Expect: error "file is not a database" — sqlite3 CLI can't open without SQLCipher

# 4. Audit chain still valid after migration
curl -s --cookie cj.txt -H 'X-Requested-With: XMLHttpRequest' \
  https://ce-demo.homelabarr.com/api/audit | jq '.chain.ok'
# Expect: true
```

---

### H-R7-3 — `JWT_SECRET` rotation requires editing env + a restart and invalidates all sessions instantly

**Where:** `server/auth.js` — `JWT_SECRET` is a single value; rotation = downtime for every logged-in user.

**What:** Real rotation needs a **key ring**: current key used to sign new tokens, previous key still accepted for verify until older tokens expire. With R3's 15-minute access token + 14-day refresh, the previous key is needed for up to 14 days. A key with an `id` (`kid` in JWT terms) lets the verifier pick the right one.

**RIGHT — `server/auth.js` updated**
```js
import jwt from 'jsonwebtoken';
import { readSecret } from './secrets.js';

// Load primary + optional previous. Both are JSON-encoded files containing { kid, secret }.
function loadKey(name) {
  const raw = readSecret(name, { required: name === 'JWT_KEY_CURRENT' });
  if (!raw) return null;
  // Support either raw 32+ byte string (kid = sha256(value).slice(0,8)) or JSON { kid, secret }
  try { const j = JSON.parse(raw); if (j.secret && j.kid) return j; } catch {}
  const kid = require('node:crypto').createHash('sha256').update(raw).digest('hex').slice(0, 8);
  return { kid, secret: raw };
}
const KEYS = {
  current:  loadKey('JWT_KEY_CURRENT'),
  previous: loadKey('JWT_KEY_PREVIOUS'),    // null when no rotation in flight
};
function keyByKid(kid) {
  return [KEYS.current, KEYS.previous].find(k => k && k.kid === kid)?.secret;
}

export function signAccessToken(payload) {
  return jwt.sign(payload, KEYS.current.secret,
    { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL,
      header: { kid: KEYS.current.kid } });
}
export function verifyToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) throw new Error('bad-token');
  const secret = keyByKid(decoded.header.kid);
  if (!secret) throw new Error('unknown-kid');
  return jwt.verify(token, secret, { algorithms: ['HS256'] });
}
```

**Compose secrets:**
```yaml
secrets:
  jwt_key_current:
    file: ./secrets/jwt_key_current
  jwt_key_previous:
    file: ./secrets/jwt_key_previous      # may be missing; that's fine
services:
  backend:
    secrets:
      - jwt_key_current
      - jwt_key_previous
```

**Rotation script — `scripts/rotate-jwt-key.sh`**
```sh
#!/usr/bin/env bash
set -eu
umask 077
cd ./secrets
# 1. Move current to previous
if [ -f jwt_key_current ]; then
  mv jwt_key_current jwt_key_previous
fi
# 2. Generate new current with a fresh kid
KID="$(openssl rand -hex 4)"
SECRET="$(openssl rand -base64 48)"
printf '{"kid":"%s","secret":"%s"}\n' "$KID" "$SECRET" > jwt_key_current
echo "wrote ./secrets/jwt_key_current with kid=$KID"
docker compose restart backend
echo "previous key remains valid until last refresh token aged out (REFRESH_TOKEN_TTL)."
```

Document the operator workflow in SECURITY.md (added in L-R7-11).

**Verification:**
```sh
# Before rotation
TOKEN_BEFORE=$(curl -s ... /api/auth/login -d ... | jq -r '.access')   # if exposed; else use cookie session
KID_BEFORE=$(printf '%s' "$TOKEN_BEFORE" | cut -d. -f1 | base64 -d 2>/dev/null | jq -r .kid)

bash scripts/rotate-jwt-key.sh
sleep 8

# Token signed with the old key still verifies (previous key honored)
curl -s --cookie cj.txt -H 'X-Requested-With: XMLHttpRequest' \
  https://ce-demo.homelabarr.com/api/auth/me | jq -r '.username'
# Expect: 'admin' (or whoever) — no re-login forced

# New login uses new kid
curl -s -X POST ... /api/auth/login -d ...
# Inspect new access token cookie's kid header — expect != KID_BEFORE
```

### H-R7-4 — SQLCipher key rotation needs an explicit ritual, otherwise it's "rotate = re-encrypt entire DB at restart"

**Where:** `server/db.js` introduced in C-R7-2.

**What:** `PRAGMA rekey='<new>'` re-encrypts the entire database in place. For HomelabARR's DB size (low MB range) this is fast (&lt;1s). The operator script must (a) read the current key from `/run/secrets/sqlcipher_key`, (b) open the DB with it, (c) issue `PRAGMA rekey='<new>'`, (d) write the new key to a temp file, (e) atomically swap the secret file, (f) restart backend.

**RIGHT — `scripts/rotate-sqlcipher-key.sh`**
```sh
#!/usr/bin/env bash
set -eu
umask 077
SECRETS_DIR="${SECRETS_DIR:-./secrets}"
DB_PATH="${DB_PATH:-/var/lib/docker/volumes/homelabarr-data/_data/homelabarr.db}"
[ "$EUID" -eq 0 ] || { echo "needs root to touch docker-managed volumes"; exit 1; }

OLD_KEY="$(cat "$SECRETS_DIR/sqlcipher_key")"
NEW_KEY="$(openssl rand -base64 32)"

docker compose stop backend
# Use a one-off helper container with sqlcipher CLI to issue the rekey
docker run --rm -i \
  -v "$(dirname "$DB_PATH"):/work" \
  ghcr.io/utelle/sqlite3mc:latest \
  sqlite3 "/work/$(basename "$DB_PATH")" <<EOF
PRAGMA key='$OLD_KEY';
PRAGMA rekey='$NEW_KEY';
EOF

# Atomically install the new key
printf '%s' "$NEW_KEY" > "$SECRETS_DIR/.sqlcipher_key.new"
mv "$SECRETS_DIR/.sqlcipher_key.new" "$SECRETS_DIR/sqlcipher_key"
docker compose start backend
echo "rekey complete. Verify with: curl … /api/health -> 200"
```

(If the project owner prefers a pure-Node rekey path without a helper container, `better-sqlite3-multiple-ciphers` supports the same PRAGMA — the script can also `docker compose exec backend node -e "…"` while the app is stopped via a maintenance flag.)

**Verification:**
```sh
# Before
docker exec homelabarr-backend node -e "const db=require('./server/db.js').db; console.log(db.prepare('SELECT count(*) c FROM users').get())"
# Expect: { c: N }

# Rotate
bash scripts/rotate-sqlcipher-key.sh

# After — same row counts, new key is in /run/secrets
docker exec homelabarr-backend ls -la /run/secrets/sqlcipher_key
docker exec homelabarr-backend node -e "..." # same query, same N
```

---

### H-R7-5 — Audit-log chain re-anchor on SQLCipher migration

**Where:** `server/audit.js` (C-R6-1) + `scripts/encrypt-db.sh` (C-R7-2).

**What:** `sqlcipher_export` is byte-for-byte identical to the source, so the audit chain (hash of each row including `prev_hash`) survives encryption naturally. **But:** the boot-time `verifyChain()` was introduced in R6 M-R6-8 and must run AFTER the first post-migration boot to confirm nothing was corrupted by the export. Emit a special event noting the migration boundary so future forensics can distinguish "pre-encryption" from "post-encryption" rows.

**RIGHT — `server/index.js` boot path additions**
```js
import { initAudit, audit, verifyChain } from './audit.js';
initAudit(db);

const chain = verifyChain(db);
if (!chain.ok) {
  audit(db, { event: 'audit.chain.broken', actor: 'system', result: 'fail',
              meta: { brokenAt: chain.brokenAt, kind: chain.kind } });
  if (process.env.AUDIT_STRICT === '1') process.exit(1);
} else {
  audit(db, { event: 'audit.chain.verified', actor: 'system', result: 'ok',
              meta: { rows: chain.rows } });
}

// One-time marker: if a sentinel row is absent, write it now to mark the migration boundary.
const haveSentinel = db.prepare("SELECT 1 FROM audit_events WHERE event='audit.cipher.activated' LIMIT 1").get();
if (!haveSentinel) {
  audit(db, { event: 'audit.cipher.activated', actor: 'system', result: 'ok',
              meta: { driver: 'better-sqlite3-multiple-ciphers', cipher: 'sqlcipher' } });
}
```

---

### H-R7-6 — `/app/server/config/users.json` and any legacy JSON state are still cleartext, even after C-R7-2

**Where:** `homelabarr-config` volume mounted at `/app/server/config` (per R4 §2.1). If that path contains any JSON file with credential material (legacy `users.json`, API keys, integration secrets), encrypting the SQLite DB does not help.

**What:** Migrate any credential-bearing JSON into the now-encrypted SQLite. If migration is out of scope this round, at minimum mount the volume `:ro` after first-boot bootstrap and encrypt it host-side via LUKS / age:

**RIGHT (option A — preferred)** — migrate to DB:
```js
// scripts/migrate-config-to-db.js  (one-off, run via docker compose exec backend node scripts/migrate-config-to-db.js)
import fs from 'node:fs';
import { db } from '../server/db.js';

db.exec(\`CREATE TABLE IF NOT EXISTS kv_secrets (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL
);\`);

const candidates = ['/app/server/config/users.json',
                    '/app/server/config/api-keys.json',
                    '/app/server/config/integrations.json'];
for (const p of candidates) {
  if (!fs.existsSync(p)) continue;
  const v = fs.readFileSync(p, 'utf8');
  db.prepare('INSERT OR REPLACE INTO kv_secrets (key, value, updated_at) VALUES (?, ?, ?)')
    .run(p, v, new Date().toISOString());
  fs.renameSync(p, p + '.migrated.' + Date.now());
  console.log('migrated', p);
}
```

**RIGHT (option B — defer)** — document the host-side encryption requirement and add a verification in the deploy runbook (R8):
```md
# SECURITY.md — Host-side at-rest protection (Round 8 deferred)

Until the kv_secrets migration in R7 H-R7-6 is complete, the homelabarr-config
volume MUST be host-mounted on an encrypted block device (LUKS) or
encrypted-at-FS (age-encrypted backups). Treat this volume as 'crown jewels'.
```

---

### M-R7-7 — No automated rotation reminder / cadence enforcement

**Where:** No tooling.

**What:** Secrets rot. Without a reminder, every secret in §2.3 sits at its initial value indefinitely. A trivial cron-ish reminder is enough — query the secret file mtimes weekly and alert if any exceeds its target cadence.

**RIGHT — `scripts/check-secret-age.sh`** (run from a cron on the host, or as a GitHub Action that hits the secrets dir via SSH):
```sh
#!/usr/bin/env bash
set -eu
SECRETS_DIR="${SECRETS_DIR:-./secrets}"
declare -A LIMITS_DAYS=(
  [jwt_key_current]=90
  [sqlcipher_key]=180
  [alert_webhook_secret]=365
)
NOW=$(date +%s); RC=0
for f in "${!LIMITS_DAYS[@]}"; do
  p="$SECRETS_DIR/$f"
  [ -f "$p" ] || { echo "MISSING $f"; RC=1; continue; }
  age=$(( (NOW - $(stat -c %Y "$p")) / 86400 ))
  limit=${LIMITS_DAYS[$f]}
  if [ "$age" -gt "$limit" ]; then
    echo "STALE $f age=${age}d limit=${limit}d"
    RC=2
  else
    echo "ok    $f age=${age}d limit=${limit}d"
  fi
done
exit $RC
```

The owner pile (§6) decides whether to wire this into the webhook alerts from R6 H-R6-3 (`secret.stale` event).

### M-R7-8 — SOPS / Vault path documented but not implemented

**Where:** SECURITY.md.

**What:** Some operators will want secrets sourced from Vault, SOPS-encrypted YAML in git, or 1Password Connect. Document the extension point: `readSecret()` from C-R7-1 already supports `<NAME>_FILE`, so any tool that materializes secrets to disk (vault-agent template, sops exec-file, op inject) plugs in with zero code change.

**RIGHT — append to `SECURITY.md`**
```md
## Optional: sourcing secrets from Vault / SOPS / 1Password

`readSecret()` resolves in this order:
1. /run/secrets/<lowercased name>     (Docker Compose 'secrets:' file mount — default)
2. $<NAME>_FILE                       (path to a file containing the value)
3. $<NAME>                            (direct env var — legacy, discouraged)

To use Vault Agent: configure a template that writes /run/secrets/jwt_key_current,
re-render on lease refresh, then docker compose kill -s HUP backend.

To use SOPS: in your deploy step, run
   sops -d secrets.enc.yaml | yq -o=json | jq -r '.jwt_secret' > ./secrets/jwt_key_current
then docker compose up -d.

To use 1Password Connect: op inject -i secrets.tmpl -o ./secrets/jwt_key_current.

In all cases, secret material lives outside the compose file and outside any
committed artifact.
```

---

### M-R7-9 — `docker compose down -v` will destroy the encrypted DB without a backup hook

**Where:** operational risk, not source code.

**What:** Once the DB is encrypted, losing the SQLCipher key OR losing the volume = data loss (no recovery). Add a backup hook to the deploy scripts and document it.

**RIGHT — `scripts/backup.sh`**
```sh
#!/usr/bin/env bash
set -eu
umask 077
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

# Online backup via SQLCipher (consistent snapshot while backend may be running)
docker exec homelabarr-backend node -e "
  const { db } = require('./server/db.js');
  db.backup('/tmp/homelabarr.$STAMP.db').then(() => process.exit(0));
"
docker cp "homelabarr-backend:/tmp/homelabarr.$STAMP.db" "$BACKUP_DIR/"
docker exec homelabarr-backend rm -f "/tmp/homelabarr.$STAMP.db"

# Snapshot the secrets dir (DO NOT include in the same archive as the DB)
tar -caf "$BACKUP_DIR/secrets.$STAMP.tar.zst" ./secrets
# The DB backup file is itself SQLCipher-encrypted; safe to store with normal access.
# The secrets archive is the crown jewel — store in a separate trust zone.
echo "wrote $BACKUP_DIR/homelabarr.$STAMP.db and $BACKUP_DIR/secrets.$STAMP.tar.zst"
```

Add to README "Production deployment" section.

---

### L-R7-10 — `.env.example` should reflect the new `*_FILE` pattern

**Where:** `.env.example`.

**What:** When operators copy `.env.example` to `.env`, the file should already steer them toward file-based secrets, not env-var secrets.

**RIGHT — `.env.example` (replace the four secret-vars)**
```
# Secrets — pick ONE pattern (file-mount is recommended; env-var is legacy)

# Recommended: ./secrets/jwt_key_current is auto-mounted by docker compose
# (run scripts/init-secrets.sh once to bootstrap)

# Legacy / dev-only env-var form:
# JWT_SECRET=
# DEFAULT_ADMIN_PASSWORD=
# ALERT_WEBHOOK_SECRET=
# SQLCIPHER_KEY=

# Non-secret tuning:
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=14d
AUDIT_STRICT=0
ALERT_WEBHOOK_URL=
LOG_LEVEL=info
LOG_FORMAT=json
```

---

### L-R7-11 — `SECURITY.md` needs a "Key rotation runbook" section

**Where:** `SECURITY.md`.

**What:** With C-R7-1, C-R7-2, H-R7-3, H-R7-4 all introducing rotation pathways, the operator needs one canonical place that walks them through it.

**RIGHT — append to `SECURITY.md`**
```md
## Key rotation runbook

| Secret             | Cadence | Script                              | Side effects |
|--------------------|---------|-------------------------------------|--------------|
| JWT_KEY_CURRENT    | 90 d    | scripts/rotate-jwt-key.sh           | none (previous key honored for REFRESH_TOKEN_TTL) |
| SQLCIPHER_KEY      | 180 d   | scripts/rotate-sqlcipher-key.sh     | ~1s downtime during rekey |
| ALERT_WEBHOOK_SECRET | 365 d | edit ./secrets/alert_webhook_secret then docker compose restart backend | downstream receiver must rotate at the same time |
| DEFAULT_ADMIN_PASSWORD | one-shot | scripts/init-secrets.sh (first boot only) | n/a |

Rotation is logged to /api/audit as 'secret.rotated' with the secret name only
(no values). Verify with:
  curl --cookie cj.txt /api/audit?limit=20 | jq '.events[]|select(.event=="secret.rotated")'
```

Wire the audit emit in each script:
```sh
# at end of rotate-jwt-key.sh:
curl -s --cookie cj.txt -X POST -H 'X-Requested-With: XMLHttpRequest' \
  -H 'Content-Type: application/json' \
  --data '{"event":"secret.rotated","target":"jwt_key_current"}' \
  https://ce-demo.homelabarr.com/api/audit/note || true
```
(or have the backend log the event automatically on next key-load by comparing kid to the previous boot's kid stored in a tiny `server_state` table.)

---

### L-R7-12 — Frontend bundle should not bake in any secret-looking string

**Where:** `src/` and the Vite build output.

**What:** Trivial check that no `process.env.JWT_SECRET`-shaped substitution accidentally lands in the client bundle. Add a CI step.

**RIGHT — add to `.github/workflows/security-audit.yml`**
```yaml
  bundle-secret-scan:
    runs-on: ubuntu-latest
    needs: [ ... ]
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-node@<sha>
        with: { node-version-file: '.nvmrc', cache: 'npm' }
      - run: npm ci --no-audit --no-fund
      - run: npm run build
      - name: Scan dist/ for secret-shaped strings
        run: |
          set -eu
          if grep -rEn 'jwt_secret|JWT_SECRET|sqlcipher_key|alert_webhook_secret' dist/ ; then
            echo "::error::secret-shaped string in client bundle"
            exit 1
          fi
```

---

## §4 — Verification

(Run after R7 ships.)

### 4.1 — Secrets no longer appear in container env block

```sh
docker inspect homelabarr-backend --format '{{ range .Config.Env }}{{ println . }}{{ end }}' \
  | grep -iE '^(JWT_SECRET|JWT_KEY_CURRENT|DEFAULT_ADMIN_PASSWORD|ALERT_WEBHOOK_SECRET|SQLCIPHER_KEY)='
# Expect: NO output

docker exec homelabarr-backend ls -la /run/secrets/
# Expect: jwt_key_current, jwt_key_previous (if rotated), default_admin_password,
#         alert_webhook_secret, sqlcipher_key — mode 0400 owned by uid 1001

docker exec homelabarr-backend sh -c 'tr "\0" "\n" < /proc/1/environ | grep -iE "secret|password|key"'
# Expect: no matches outside compose-tuning vars (ACCESS_TOKEN_TTL etc.)
```

### 4.2 — SQLite DB is SQLCipher-encrypted

```sh
docker exec homelabarr-backend sh -c 'head -c 16 /app/data/homelabarr.db | xxd'
# Expect: random bytes (NOT 'SQLite format 3')

docker exec homelabarr-backend sh -c 'sqlite3 /app/data/homelabarr.db "SELECT 1;"' 2>&1
# Expect: 'file is not a database' or 'Error: file is encrypted'

# App still functions
curl -s -o /dev/null -w '%{http_code}\n' https://ce-demo.homelabarr.com/api/health
# Expect: 200

curl -s --cookie cj.txt -H 'X-Requested-With: XMLHttpRequest' \
  https://ce-demo.homelabarr.com/api/audit | jq '.chain.ok'
# Expect: true
```

### 4.3 — JWT key ring honors previous key during rotation window

```sh
# Capture current login cookie
curl -s -c cj.txt -X POST -H 'X-Requested-With: XMLHttpRequest' \
  -H 'Content-Type: application/json' \
  --data '{"username":"admin","passcode":"<real>"}' \
  https://ce-demo.homelabarr.com/api/auth/login

# Rotate
bash scripts/rotate-jwt-key.sh
sleep 8

# Same session continues to work (previous key still verifies)
curl -s --cookie cj.txt -H 'X-Requested-With: XMLHttpRequest' \
  https://ce-demo.homelabarr.com/api/auth/sessions | jq 'length'
# Expect: a number (NOT a 401)
```

### 4.4 — SQLCipher key rotation completes without data loss

```sh
BEFORE=$(docker exec homelabarr-backend node -e "console.log(require('./server/db.js').db.prepare('SELECT count(*) c FROM audit_events').get().c)")
sudo bash scripts/rotate-sqlcipher-key.sh
AFTER=$(docker exec homelabarr-backend node -e "console.log(require('./server/db.js').db.prepare('SELECT count(*) c FROM audit_events').get().c)")
[ "$BEFORE" = "$AFTER" ] && echo OK || echo MISMATCH
# Expect: OK
```

### 4.5 — Bundle scan catches a planted secret string

```sh
git checkout -b test/planted-bundle-string
echo "export const x = 'JWT_SECRET=abc';" >> src/lib/api.ts
git commit -am 'TEST'
git push origin test/planted-bundle-string
# Expect: bundle-secret-scan job fails CI
# Cleanup
git checkout - && git branch -D test/planted-bundle-string
```

### 4.6 — R6.5 + R5.5 carry-forwards landed

```sh
# R6.5-drift-1: minimized /api/health
curl -s https://ce-demo.homelabarr.com/api/health | jq 'keys'
# Expect: ["status","timestamp","version"]
curl -s -o /dev/null -w '%{http_code}\n' https://ce-demo.homelabarr.com/api/health/detail
# Expect: 401 (unauthenticated)

# R5.5-drift-5: fail-loud admin password
grep -E 'DEFAULT_ADMIN_PASSWORD=\$\{DEFAULT_ADMIN_PASSWORD:\?' homelabarr.yml | wc -l
# Expect: 1   (or 0 if migrated entirely to Docker secrets — which is the C-R7-1 outcome)

# R5.5-drift-6: digest pinning
grep -cE 'ghcr.io/smashingtags/homelabarr-(frontend|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml
# Expect: 2

# R5.5-drift-7: every uses: SHA-pinned
grep -RhE '^\s*-\s*uses:' .github/workflows | grep -vE '@[0-9a-f]{40}' | grep -v '^\s*#' | wc -l
# Expect: 0

# R5.5-drift-3: Trivy on pushed digest
grep -cE 'aquasecurity/trivy-action[\s\S]{0,400}image-ref:[\s\S]{0,200}outputs\.digest' .github/workflows/docker-build-push.yml
# Expect: >= 2  (frontend + backend)

# R5.5-drift-4: CycloneDX
grep -c 'cyclonedx-npm' .github/workflows/security-audit.yml
# Expect: >= 1

# R5.5-drift-2: packageManager
jq -r .packageManager package.json
# Expect: 'npm@10.x.x+sha256.…'
```

### 4.7 — Secret age tooling fires

```sh
touch -t 200001010000 ./secrets/jwt_key_current   # forcibly stale
bash scripts/check-secret-age.sh; echo rc=$?
# Expect: STALE jwt_key_current ...   rc=2

# Restore freshness so prod isn't impacted
touch ./secrets/jwt_key_current
```

---

## §5 — Out of Scope (Queued for Later Rounds)

| Round | Dimension |
|---|---|
| **R8** | Production deployment runbook — Traefik mTLS to backend over the internal network, fail2ban tied to audit `login.locked` events, host-level UFW/nftables, AppArmor/SELinux narrowing for HomelabARR paths, backup + recovery drill, disaster-recovery playbook. |
| **R9** | Application-layer DAST — automated OWASP ZAP baseline run against ce-demo.homelabarr.com on each merge to main; custom rules for HomelabARR's API surface; scheduled deep scans. |
| **R10** | Penetration test prep — engagement scope doc, exclusion list, test account provisioning, audit-log preservation policy for the test window. |
| **R2.6** (optional) | Trusted Types report-only → enforce rollout (deferred since R2). |
| **Observability-2** (later) | Wire R6 JSON logs to Loki/OpenSearch + Grafana dashboards. |

---

## §6 — Owner Pile (Human-Only / Do-Not-Delegate)

1. **Generate the four initial secrets out-of-band** using `scripts/init-secrets.sh` (see C-R7-1). Store `./secrets/` in encrypted offline backup (1Password vault file / encrypted USB / passbolt). Do not commit; `.gitignore` covers it but the human discipline matters.

2. **Decide secret backend.** Floor is Docker Compose `secrets: file:`. Owner picks one of: file (default) / SOPS-encrypted git / Vault Agent / 1Password Connect. R7 supports all four via the `<NAME>_FILE` indirection; pick the one matching your operational maturity.

3. **Schedule and run the SQLCipher migration window.** ~30 seconds on a small DB. Procedure: `docker compose stop backend` → `scripts/encrypt-db.sh` → place `sqlcipher_key` in `./secrets/` → `docker compose start backend` → verify `/api/audit` chain ok.

4. **Set up the host-side backup cron** invoking `scripts/backup.sh` daily, storing the encrypted DB and the secrets archive in **different** trust zones (DB to your backup provider; secrets to your password manager export folder).

5. **Tag and release `v2.3.0`** if not already done — needed for R5.5-drift-6 digest pinning to close.

6. **Re-verify the bulk-SHA-pin actually shipped.** R6 ship report said all 27 actions were SHA-pinned, but the R6 branch source still shows them on `@vN` tags. Confirm whether the pin landed on `dev` / `main` and merged forward, and if not, run the bulk-pin script from R6 §0.

7. **Decide `AUDIT_STRICT`** for production. Recommendation: `AUDIT_STRICT=1` so any tampering with `homelabarr.db` triggers refusal-to-start. The encrypted DB makes tampering harder (the attacker would need the key) but defense in depth still applies.

8. **Document the disaster-recovery sequence** in your operations notes (R8 will formalize). At minimum: where the secrets archive lives, who has access, how to rebuild from a backup if both the volume and the secrets are lost (`spoiler: you can't — that's the cost of at-rest encryption`).

9. **Communicate the change** to anyone who uses your HomelabARR-CE: `v2.3.0` requires a one-time `scripts/init-secrets.sh` plus an opt-in encryption migration. Pin a release note.

---

## §7 — Deliverable

**PR title:**
`security(r7): docker secrets, sqlcipher at-rest, JWT keyring rotation, secret-age tooling + R6.5/R5.5 cleanups`

**Squash-commit body:**
```
Round 7 of the security audit moves all runtime secrets out of compose
environment blocks and encrypts the SQLite database at rest.
Findings: 1 Critical / 5 High / 3 Medium / 3 Low.

C-R7-1   New server/secrets.js with readSecret() resolving
         /run/secrets/<name> first, <NAME>_FILE second, env-var legacy
         third. Compose 'secrets:' file mounts replace environment-block
         JWT_SECRET / DEFAULT_ADMIN_PASSWORD / ALERT_WEBHOOK_SECRET.
         scripts/init-secrets.sh bootstraps ./secrets/ with openssl
         randomness. .gitignore excludes ./secrets/.

C-R7-2   Replace better-sqlite3 with better-sqlite3-multiple-ciphers;
         server/db.js opens with PRAGMA cipher='sqlcipher' + PRAGMA
         key=<value-from-/run/secrets/sqlcipher_key>. scripts/encrypt-db.sh
         migrates the existing cleartext database. Dockerfile.backend
         builder stage adds python3/make/g++ for the native build.

H-R7-3   JWT keyring with kid header. JWT_KEY_CURRENT signs; previous
         still verifies until REFRESH_TOKEN_TTL. scripts/rotate-jwt-key.sh
         performs an in-place rotation with no forced re-login.

H-R7-4   scripts/rotate-sqlcipher-key.sh uses PRAGMA rekey to rotate the
         at-rest key without re-installing.

H-R7-5   Boot-time verifyChain() + one-time 'audit.cipher.activated'
         sentinel row marks the encryption boundary.

H-R7-6   server/db.js gains a kv_secrets table; migrate-config-to-db.js
         pulls any cleartext credential JSON from homelabarr-config volume
         into the encrypted DB.

M-R7-7   scripts/check-secret-age.sh + optional webhook 'secret.stale'
         event; recommend wiring to ALERT_WEBHOOK_URL.

M-R7-8   SECURITY.md documents the Vault Agent / SOPS / 1Password Connect
         extension via readSecret()'s _FILE indirection.

M-R7-9   scripts/backup.sh emits a SQLCipher-encrypted DB snapshot plus a
         separate zstd-archived secrets tarball; warn-loud about
         different trust zones.

L-R7-10  .env.example updated to steer toward file-based secrets.

L-R7-11  SECURITY.md gains a key-rotation runbook table tying each secret
         to its cadence and rotation script.

L-R7-12  New bundle-secret-scan CI job ensures secret-shaped strings can
         never leak into the Vite client build.

R6.5/R5.5 cleanups bundled in same PR (diffs in audit §0):
  R6.5-drift-1  /api/health minimized + /api/health/detail behind admin;
                proxy-aware dockerProbe() resolves DEGRADED reading
  R5.5-drift-2  packageManager pin in package.json
  R5.5-drift-3  Trivy aquasecurity action on pushed image-ref + digest
  R5.5-drift-4  CycloneDX SBOM CI job
  R5.5-drift-5  DEFAULT_ADMIN_PASSWORD:?  (or migrated to /run/secrets)
  R5.5-drift-6  Image digest pinning post-v2.3.0 tag
  R5.5-drift-7  Bulk SHA-pin every uses: in .github/workflows

Verification matrix in audit §4 is the acceptance criteria.
```

---

## §8 — End / Loop Continuation

When R7 ships, I will re-verify:
- `docker inspect` shows no JWT/SQLCipher/admin/webhook secret in Env.
- `docker exec homelabarr-backend ls /run/secrets` shows 4–5 mode-0400 files.
- `head -c 16 /app/data/homelabarr.db` returns random bytes, not "SQLite format 3".
- `scripts/rotate-jwt-key.sh` followed by an authenticated API call still works without re-login.
- `/api/audit` chain ok=true, with an `audit.cipher.activated` row at the migration boundary.
- `/api/health` returns 3 keys (R6.5-drift-1 cleaned).
- `grep -RhE '^\s*-\s*uses:' .github/workflows | grep -vE '@[0-9a-f]{40}' | grep -v '#'` is empty (R5.5-drift-7 cleaned).
- `homelabarr.yml` shows two `tag@sha256:digest` pins (R5.5-drift-6 cleaned).

If everything is green, the next deliverable is **Round 8: production deployment runbook** (Traefik mTLS to backend, fail2ban wired to audit lockout events, host-level UFW/nftables, AppArmor/SELinux narrowing for HomelabARR paths, backup + recovery drill, disaster-recovery playbook). Drafted without asking.

If drift: **Round 7.5 correction MD** first.
