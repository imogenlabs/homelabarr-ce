# HomelabARR-CE Security Audit — Round 6
**Dimension:** Structured logging, abuse detection, audit-log tamper-evidence
**Target:** `smashingtags/homelabarr-ce` @ `security/round-5-supply-chain@34bd4138` (live: ce-demo.homelabarr.com, bundle `index-pjntRCiX.js`)
**Date:** 2026-05-22
**Status:** R5 toolchain shipped, 8 drifts carried forward to R5.5 (see §0). Live API at /api/applications returns 200, /api/containers reports proxy connected, /api/auth/sessions 200.
**Findings:** 12 (1 Critical / 4 High / 4 Medium / 3 Low)

---

## §0 — Prior Round Carryover (Verified Source + Live)

### Round 5 verification matrix (against `security/round-5-supply-chain@34bd4138` + live probes)

| Check | Source/Live | Verdict |
|---|---|---|
| `engines.node` in package.json | source | **PASS** (`>=24.0.0 <25.0.0`) |
| `packageManager` field in package.json | source | **FAIL — R5.5-drift-2** |
| `.nvmrc` present | source | **PASS** (value `24`; H-R5-2 spec'd `24.16.0` — pin tighter) |
| `overrides{}` placeholder | source | **PASS** |
| `.gitleaks.toml` present | source | **PASS** |
| OSV-Scanner step in security-audit.yml | source | **PASS** |
| `npm audit --audit-level=high` step | source | **PASS** |
| Gitleaks job present | source | **PASS** |
| License audit job present | source | **PASS** |
| Scorecard workflow | source | **PASS** |
| Cosign installer + sign step | source | **PASS** |
| Cosign signs the pushed digest | source | **PASS** |
| Trivy scan of the pushed image digest | source | **FAIL — R5.5-drift-3** (Trivy installed binary scans the filesystem only; no `image-ref:` against the build's `outputs.digest`) |
| CycloneDX SBOM for npm | source | **FAIL — R5.5-drift-4** |
| Bump-image-digests release script | source | **PASS** |
| `JWT_SECRET=${VAR:?...}` fail-loud | source | **PASS** |
| `DEFAULT_ADMIN_PASSWORD=${VAR:?...}` fail-loud | source | **FAIL — R5.5-drift-5** (R4.5-drift-1 still not cleaned up) |
| HomelabARR images pinned by `tag@sha256:digest` | source | **FAIL — R5.5-drift-6** (still `:latest`, count = 2) |
| Every external action SHA-pinned (40-char) | source | **FAIL — R5.5-drift-7** (0/27 SHA-pinned; 27 still on `@vN` tags) |
| `/api/health` probes the socket-proxy, not unix path | live | **FAIL — R5.5-drift-8** (`status: DEGRADED`, warning still references `/var/run/docker.sock`) |
| `/api/applications` returns 200 | live | **PASS** |
| `/api/containers` reports `docker.status: connected` | live | **PASS** |
| `/api/auth/sessions` returns 200 | live | **PASS** |

13/21 PASS, 8 drifts. None of the drifts block Round 6's scope; bundle them into the next ship cycle.

### R5.5 drift consolidation (one-time cleanup, ship inside R6 PR)

```yaml
# homelabarr.yml — line: DEFAULT_ADMIN_PASSWORD
# WRONG
- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:-admin}
# RIGHT
- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:?must be set on first boot; unset after bootstrap}
```

```yaml
# homelabarr.yml — image lines (replace BOTH services)
# WRONG
image: ghcr.io/smashingtags/homelabarr-frontend:latest
image: ghcr.io/smashingtags/homelabarr-backend:latest
# RIGHT — after first tagged release, run scripts/bump-image-digests.sh <tag>
image: ghcr.io/smashingtags/homelabarr-frontend:v2.2.0@sha256:<64hex>
image: ghcr.io/smashingtags/homelabarr-backend:v2.2.0@sha256:<64hex>
```

```json
// package.json — add field
"packageManager": "npm@10.9.0+sha256.<paste-from-npm-info-on-pinned-version>"
```

```
// .nvmrc — tighten the pin so it actually matches Dockerfile.backend
24.16.0
```

```yaml
# .github/workflows/docker-build-push.yml — add AFTER the existing build step that exposes outputs.digest
- name: Trivy scan pushed digest (frontend)
  uses: aquasecurity/trivy-action@<pin-by-sha>
  with:
    image-ref: ghcr.io/${{ env.NAMESPACE }}/${{ env.FRONTEND_IMAGE_NAME }}@${{ steps.build-frontend.outputs.digest }}
    format: sarif
    output: trivy-frontend.sarif
    severity: CRITICAL,HIGH
    exit-code: '1'
    ignore-unfixed: true
- name: Trivy scan pushed digest (backend)
  uses: aquasecurity/trivy-action@<pin-by-sha>
  with:
    image-ref: ghcr.io/${{ env.NAMESPACE }}/${{ env.BACKEND_IMAGE_NAME }}@${{ steps.build-backend.outputs.digest }}
    format: sarif
    output: trivy-backend.sarif
    severity: CRITICAL,HIGH
    exit-code: '1'
    ignore-unfixed: true
- uses: github/codeql-action/upload-sarif@<pin-by-sha>
  if: always()
  with:
    sarif_file: trivy-backend.sarif
    category: trivy-image-backend
```

```yaml
# .github/workflows/security-audit.yml — add as a new job
  sbom-npm:
    name: CycloneDX SBOM (npm)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<pin-by-sha>
      - uses: actions/setup-node@<pin-by-sha>
        with: { node-version-file: '.nvmrc', cache: 'npm' }
      - run: npm ci --no-audit --no-fund
      - run: npx --yes @cyclonedx/cyclonedx-npm@^1.19.0 --output-format JSON --output-file sbom-npm.cdx.json
      - uses: actions/upload-artifact@<pin-by-sha>
        with: { name: sbom-npm-cyclonedx, path: sbom-npm.cdx.json, retention-days: 90 }
```

```bash
# bulk-SHA-pin recipe for all workflows — run from repo root
for tag_ref in \
  'actions/checkout@v4' \
  'actions/setup-node@v4' \
  'docker/setup-buildx-action@v3' \
  'docker/build-push-action@v5' \
  'docker/login-action@v3' \
  'sigstore/cosign-installer@v3' \
  'github/codeql-action/upload-sarif@v3' \
  'semgrep/semgrep@v1' \
  'gitleaks/gitleaks-action@v2' \
  'google/osv-scanner-action/osv-scanner-action@v1' \
  'ossf/scorecard-action@v2' \
  'actions/upload-artifact@v4'; do
  owner_repo="${tag_ref%@*}"; tag="${tag_ref#*@}"
  sha=$(gh api "repos/${owner_repo%%/*}/${owner_repo#*/}/git/refs/tags/$tag" --jq '.object.sha' 2>/dev/null || \
        gh api "repos/${owner_repo%%/*}/${owner_repo#*/}/commits/$tag" --jq '.sha')
  echo "$tag_ref  ->  $sha"
  grep -RIl "$tag_ref" .github/workflows/ | while read -r f; do
    sed -i.bak -E "s|$tag_ref|${owner_repo}@$sha  # $tag|g" "$f"
    rm -f "$f.bak"
  done
done
```

```js
// server/health.js (or wherever the docker check lives) — see R4 cosmetic-1 verbatim spec
async function checkDocker() {
  const dh = process.env.DOCKER_HOST;
  if (dh && dh.startsWith('tcp://')) {
    const url = new URL(dh.replace('tcp://','http://'));
    try {
      const r = await fetch('http://' + url.hostname + ':' + url.port + '/_ping',
                            { signal: AbortSignal.timeout(2000) });
      return { ok: r.ok, target: dh, kind: 'proxy' };
    } catch { return { ok: false, target: dh, kind: 'proxy' }; }
  }
  const sock = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
  return { ok: fs.existsSync(sock), target: sock, kind: 'unix' };
}
```

---

## §1 — Goal

Make the runtime **observable** and **defensible**:

1. **Structured JSON logging** with stable field names, request-correlated IDs, and PII/secret redaction — so logs are queryable and shippable to a SIEM/Loki/ELK without bespoke parsing.
2. **Audit-log persistence + tamper-evidence** — append-only, hash-chained event log for security-relevant actions (login success/fail, MFA enable/disable, session revoke, role change, container start/stop/remove). Tampering must be detectable.
3. **Abuse-detection signals** — failed-login + 4xx-burst rate limiting that persists across restarts (currently in-memory `express-rate-limit`, lost on every container restart), explicit account-lockout after N failed attempts, IP-allow/deny list capability, /audit endpoint for owners.
4. **Alerting hooks** — webhook (Discord/Slack/generic) fired when any monitored event crosses a configured threshold inside a sliding window. Async, non-blocking, deduplicated.

Threat model: a credential-stuffing attacker grinds against /api/auth/login. Today: rate-limit is per-process and forgets after restart; failure events leave no durable trail; no operator gets paged; a successful compromise leaves no auditable record of when/how. Round 6 closes all four.

---

## §2 — Current State (Verified via Source @ `security/round-5-supply-chain` + Live)

### 2.1 — Logging surface

- `package.json` already includes `winston ^3.x` (good — single library to standardize on).
- `server/index.js` is 182,300 bytes. The current logging strategy mixes ad-hoc `console.log`/`console.error` with whatever winston configuration exists. No request-correlation ID, no structured fields, no PII redaction filter, no log rotation policy.
- `LOG_LEVEL` is configurable via env (R4 §2). `LOG_FORMAT` env from R4 L-R4-12 was spec'd but not detected in source — needs verification on next read.
- Nginx access logs in the frontend container go to stdout (default upstream image). Traefik aggregates them externally — fine, but no shared correlation ID across frontend → backend.

### 2.2 — Rate-limit + lockout surface

- `express-rate-limit ^7.1.5` is a direct dep — good.
- Default `express-rate-limit` is in-memory. **A container restart wipes the rate-limit state**, which means an attacker who knows the deployment pattern can clear their counter at will by triggering a rolling restart, or simply waiting one out.
- No `@express-rate-limit/sqlite`/`rate-limit-better-sqlite3` / Redis-backed store detected.
- No account-lockout table (counter that lives in the same SQLite the R3 sessions table uses).
- No IP allow/deny list configurability.

### 2.3 — Audit-log surface

- No detected `audit_events` / `security_events` table in the SQLite schema. R3 introduced `sessions` and `users`; R6 adds `audit_events`.
- No hash-chained event store (Merkle-style chain so any tampering after the fact is detectable).
- No append-only file backup (`flock`-guarded JSONL at `/app/server/activity-data/audit.jsonl` — already an existing volume per R4 §2.1).
- No `/api/audit` endpoint to retrieve recent events as the authenticated admin.

### 2.4 — Alerting surface

- No outbound webhook plumbing. `nodemailer` is in deps (for password reset, R3) but is request-scoped, not background.
- No deduplication / cooldown logic to prevent webhook storms.

### 2.5 — Live probe confirming why R6 matters

```
GET /api/health → status: DEGRADED
```

The currently shipped `/api/health` returns enough information that an outside scanner can fingerprint the stack: Node version (`v24.16.0`), platform (`linux`, `x64`), JWT_SECRET configured (`true`/`false`), the literal docker-socket path. This isn't a 0-day, but it's an "attacker reconnaissance freebie" that R6's redaction layer should compress to the minimal externally-visible information (`{ status, version, timestamp }` for unauthenticated, full detail only for authenticated admin).

---

## §3 — Findings

Severity scale: **C** Critical (covert compromise / lost forensics) · **H** High (defense-evasion) · **M** Medium (operability) · **L** Low (hygiene)

### C-R6-1 — No tamper-evident audit log of security-sensitive actions

**Where:** `server/` — no `audit_events` table, no append-only file sink, no hash chain.

**What:** A successful credential compromise today leaves the operator with **nothing actionable**: there is no record of which IP logged in, when MFA was enabled or disabled, when sessions were revoked, which containers were started or removed, or which admin made which change. Worse, an attacker with backend RCE can edit whatever ad-hoc logs exist with no detection. R6's audit log must be (a) durable, (b) cheap, (c) tamper-evident.

The design: a SQLite-backed append-only table plus a JSONL mirror file (`/app/server/activity-data/audit.jsonl`, already a R4 named volume), each event linked to the previous by a SHA-256 chain. Any modification breaks the chain; nightly verification flags it.

**WRONG (current — pseudocode of present behavior)**
```js
// server/auth.js — failed login path
res.status(401).json({ error: 'bad creds' });
// No record persists. winston may emit a line to stdout that is rotated/lost.
```

**RIGHT — new module `server/audit.js`**
```js
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const AUDIT_FILE = process.env.AUDIT_FILE || '/app/server/activity-data/audit.jsonl';
let fileHandle = null;

export function initAudit(db) {
  db.exec(\`
    CREATE TABLE IF NOT EXISTS audit_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ts         TEXT    NOT NULL,           -- ISO-8601 UTC
      actor      TEXT,                       -- username or 'system' or null for anon
      ip         TEXT,
      event      TEXT    NOT NULL,           -- e.g. 'login.success', 'mfa.enabled'
      target     TEXT,                       -- entity touched (jti, container id, etc.)
      result     TEXT    NOT NULL,           -- 'ok' | 'fail' | 'denied'
      meta_json  TEXT,                       -- redacted JSON
      prev_hash  TEXT    NOT NULL,           -- SHA-256 hex of prior row's row_hash, or 64 zeros for genesis
      row_hash   TEXT    NOT NULL UNIQUE     -- SHA-256(ts || actor || ip || event || target || result || meta_json || prev_hash)
    );
    CREATE INDEX IF NOT EXISTS idx_audit_event_ts ON audit_events (event, ts);
    CREATE INDEX IF NOT EXISTS idx_audit_actor_ts ON audit_events (actor, ts);
  \`);
  fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
  fileHandle = fs.openSync(AUDIT_FILE, 'a');
}

const REDACT = /^(authorization|cookie|set-cookie|password|passcode|secret|token|x-csrf-token|x-api-key)$/i;
function redact(meta) {
  if (!meta || typeof meta !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (REDACT.test(k)) out[k] = '[REDACTED]';
    else if (v && typeof v === 'object') out[k] = redact(v);
    else out[k] = v;
  }
  return out;
}

export function audit(db, evt) {
  const ts = new Date().toISOString();
  const meta_json = JSON.stringify(redact(evt.meta) || {});
  const prev = db.prepare('SELECT row_hash FROM audit_events ORDER BY id DESC LIMIT 1').get();
  const prev_hash = prev ? prev.row_hash : '0'.repeat(64);
  const row_hash = crypto.createHash('sha256').update(
    [ts, evt.actor || '', evt.ip || '', evt.event, evt.target || '', evt.result, meta_json, prev_hash].join('\u001f')
  ).digest('hex');
  const row = { ts, actor: evt.actor || null, ip: evt.ip || null, event: evt.event,
                target: evt.target || null, result: evt.result, meta_json, prev_hash, row_hash };
  db.prepare(\`INSERT INTO audit_events (ts, actor, ip, event, target, result, meta_json, prev_hash, row_hash)
             VALUES (@ts, @actor, @ip, @event, @target, @result, @meta_json, @prev_hash, @row_hash)\`).run(row);
  // Mirror to append-only JSONL (best effort; never block the response)
  try {
    fs.writeSync(fileHandle, JSON.stringify(row) + '\n');
  } catch (e) { /* swallow; the SQL row is the system of record */ }
  return row_hash;
}

export function verifyChain(db) {
  let expected = '0'.repeat(64);
  const rows = db.prepare('SELECT * FROM audit_events ORDER BY id ASC').all();
  for (const r of rows) {
    if (r.prev_hash !== expected) return { ok: false, brokenAt: r.id, kind: 'prev_hash_mismatch' };
    const recomputed = crypto.createHash('sha256').update(
      [r.ts, r.actor || '', r.ip || '', r.event, r.target || '', r.result, r.meta_json, r.prev_hash].join('\u001f')
    ).digest('hex');
    if (recomputed !== r.row_hash) return { ok: false, brokenAt: r.id, kind: 'row_hash_mismatch' };
    expected = r.row_hash;
  }
  return { ok: true, rows: rows.length };
}
```

**Call sites — `server/auth.js`:**

```js
// WRONG (failed login)
res.status(401).json({ error: 'invalid' });

// RIGHT
audit(db, { actor: username || null, ip: req.ip, event: 'login.fail', target: null,
            result: 'fail', meta: { reason: 'bad-creds' } });
res.status(401).json({ error: 'invalid' });
```

Wire audit() at minimum into these events:
```
login.success, login.fail, login.locked
mfa.enable, mfa.disable, mfa.verify.fail
session.revoke, session.refresh, session.refresh.fail
password.reset.request, password.reset.complete
user.create, user.delete, user.role.change
container.start, container.stop, container.remove, container.exec.denied
audit.chain.verified  (run on boot)
```

**Operator endpoint** — `server/index.js`:
```js
app.get('/api/audit', requireAdmin, requireXhr, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
  const events = db.prepare('SELECT * FROM audit_events ORDER BY id DESC LIMIT ?').all(limit);
  const chain = verifyChain(db);
  res.json({ chain, events });
});
```

**Verification (post-ship):**
```sh
# 1. After a failed login, an entry must exist
curl -s -X POST -H 'X-Requested-With: XMLHttpRequest' -H 'Content-Type: application/json' \
  --data '{"username":"admin","passcode":"WRONG"}' https://ce-demo.homelabarr.com/api/auth/login
# Authenticated as admin:
curl -s --cookie-jar cj.txt --cookie cj.txt -H 'X-Requested-With: XMLHttpRequest' \
  https://ce-demo.homelabarr.com/api/audit?limit=5 | jq '.events[0] | {event, result, ip}'
# Expect: { "event":"login.fail", "result":"fail", "ip":"…" }

# 2. Tamper with one row in SQLite directly (in a test environment); verifyChain must flag it
sqlite3 /app/data/homelabarr.db "UPDATE audit_events SET result='ok' WHERE id=1;"
curl -s ... /api/audit?limit=5 | jq '.chain'
# Expect: { "ok": false, "brokenAt": 1, "kind": "row_hash_mismatch" }

# 3. The JSONL mirror must exist and be append-only-ish
ls -la /app/server/activity-data/audit.jsonl
tail -n 3 /app/server/activity-data/audit.jsonl | jq -c 'del(.meta_json) | {ts, event, result}'
```

### H-R6-2 — `express-rate-limit` is in-memory; lockout state is lost on restart

**Where:** `server/index.js` — `express-rate-limit` configured without a persistent store; no `account_lockouts` table.

**What:** A credential-stuffing attacker who triggers any restart (rolling deploy, OOMKill, even a Dependabot-merged restart) gets a fresh counter. The fix is two-fold: (a) persist the rate-limit counters in SQLite, and (b) introduce an explicit account-level lockout that survives both restarts and IP rotation.

**WRONG (current shape)**
```js
import rateLimit from 'express-rate-limit';
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.post('/api/auth/login', loginLimiter, /* … */);
```

**RIGHT — `server/ratelimit.js` (SQLite-backed store + account lockout)**
```js
import rateLimit from 'express-rate-limit';

class SqliteStore {
  constructor(db, windowMs) {
    this.db = db;
    this.windowMs = windowMs;
    db.exec(\`
      CREATE TABLE IF NOT EXISTS rate_buckets (
        key TEXT PRIMARY KEY, hits INTEGER NOT NULL, reset_at INTEGER NOT NULL
      );
    \`);
  }
  async increment(key) {
    const now = Date.now();
    const row = this.db.prepare('SELECT hits, reset_at FROM rate_buckets WHERE key=?').get(key);
    let hits, resetAt;
    if (!row || row.reset_at <= now) {
      hits = 1; resetAt = now + this.windowMs;
      this.db.prepare('INSERT OR REPLACE INTO rate_buckets (key, hits, reset_at) VALUES (?,?,?)').run(key, hits, resetAt);
    } else {
      hits = row.hits + 1; resetAt = row.reset_at;
      this.db.prepare('UPDATE rate_buckets SET hits=? WHERE key=?').run(hits, key);
    }
    return { totalHits: hits, resetTime: new Date(resetAt) };
  }
  async decrement(key) { /* noop; we don't decrement on success */ }
  async resetKey(key) { this.db.prepare('DELETE FROM rate_buckets WHERE key=?').run(key); }
}

export function loginLimiter(db) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => 'login:' + req.ip,                      // per-IP per 15 min
    store: new SqliteStore(db, 15 * 60 * 1000),
    skipSuccessfulRequests: true,                                  // only count failures
    handler: (req, res) => {
      audit(db, { event: 'login.ratelimited', actor: req.body?.username || null,
                  ip: req.ip, result: 'denied', meta: {} });
      res.status(429).json({ error: 'too_many_attempts' });
    },
  });
}

// Account-level lockout (survives IP rotation)
export function lockoutGuard(db) {
  db.exec(\`
    CREATE TABLE IF NOT EXISTS account_lockouts (
      username     TEXT PRIMARY KEY,
      fail_count   INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER                              -- unix ms
    );
  \`);
  return {
    onFail(username) {
      if (!username) return;
      const row = db.prepare('SELECT fail_count FROM account_lockouts WHERE username=?').get(username);
      const fc = (row?.fail_count || 0) + 1;
      const lockedUntil = fc >= 8 ? Date.now() + 30 * 60 * 1000 : null;     // 30-min lockout after 8 fails
      db.prepare('INSERT OR REPLACE INTO account_lockouts (username, fail_count, locked_until) VALUES (?,?,?)').run(username, fc, lockedUntil);
      if (lockedUntil) audit(db, { actor: username, event: 'login.locked', result: 'denied', meta: { fail_count: fc } });
    },
    onSuccess(username) { db.prepare('DELETE FROM account_lockouts WHERE username=?').run(username); },
    isLocked(username) {
      const r = db.prepare('SELECT locked_until FROM account_lockouts WHERE username=?').get(username);
      return !!(r && r.locked_until && r.locked_until > Date.now());
    },
  };
}
```

**Wire in `server/auth.js`:**

```js
const lockout = lockoutGuard(db);

app.post('/api/auth/login', loginLimiter(db), async (req, res) => {
  const { username, passcode } = req.body || {};
  if (!username || !passcode) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (lockout.isLocked(username)) {
    audit(db, { actor: username, ip: req.ip, event: 'login.locked', result: 'denied', meta: {} });
    return res.status(423).json({ error: 'account_locked' });
  }
  const ok = await verifyUserPasscode(username, passcode);
  if (!ok) {
    lockout.onFail(username);
    audit(db, { actor: username, ip: req.ip, event: 'login.fail', result: 'fail', meta: {} });
    return res.status(401).json({ error: 'invalid' });
  }
  lockout.onSuccess(username);
  // … issue access + refresh tokens (R3 path) …
  audit(db, { actor: username, ip: req.ip, event: 'login.success', result: 'ok', meta: {} });
});
```

Apply analogous logic to `/api/auth/mfa/verify` (lockout on too many wrong TOTP codes) and `/api/auth/refresh` (lockout on too many failures from the same refresh jti).

**Verification:**
```sh
# Fire 10 bad logins, the 11th must be 429 even after a restart
for i in $(seq 1 11); do
  curl -s -o /dev/null -w '%{http_code}\n' -X POST \
    -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
    --data '{"username":"admin","passcode":"WRONG"}' \
    https://ce-demo.homelabarr.com/api/auth/login
done
# Expect: 401 × N then 429s
# Now restart backend, fire another bad login:
docker compose restart backend
curl ... # Expect: 429 (state persisted across restart)

# After 8 bad logins for 'admin', the 9th must be 423 (account locked)
```

---

### H-R6-3 — No alerting webhook on rate-limit / lockout / chain-break events

**Where:** No outbound webhook plumbing anywhere in `server/`.

**What:** Without alerts the audit log is forensic-only — useful after the breach but not for stopping one. Add a tiny, dependency-free webhook dispatcher that fires on configured events with deduplication.

**RIGHT — `server/alert.js`**
```js
const COOLDOWN_MS = 5 * 60 * 1000;
const lastSentByKey = new Map();

const ALERT_HOOK_URL = process.env.ALERT_WEBHOOK_URL || '';     // empty = disabled
const ALERT_SECRET = process.env.ALERT_WEBHOOK_SECRET || '';
const ALERT_ON = new Set((process.env.ALERT_EVENTS || 'login.locked,audit.chain.broken,session.refresh.fail').split(','));

export async function maybeAlert(payload) {
  if (!ALERT_HOOK_URL) return;
  if (!ALERT_ON.has(payload.event)) return;
  const key = payload.event + '|' + (payload.actor || payload.ip || 'anon');
  const now = Date.now();
  if ((lastSentByKey.get(key) || 0) > now - COOLDOWN_MS) return;   // dedup
  lastSentByKey.set(key, now);
  const body = JSON.stringify({ ...payload, source: 'homelabarr-ce' });
  const sig = ALERT_SECRET
    ? require('node:crypto').createHmac('sha256', ALERT_SECRET).update(body).digest('hex')
    : null;
  // Fire-and-forget; cap with timeout. Never throw into the request path.
  fetch(ALERT_HOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
               ...(sig ? { 'X-HomelabARR-Signature': 'sha256=' + sig } : {}) },
    body,
    signal: AbortSignal.timeout(3000),
  }).catch(() => { /* swallow */ });
}
```

Call `maybeAlert(payload)` immediately after every `audit(db, payload)`. New env vars in compose:

```yaml
backend:
  environment:
    - ALERT_WEBHOOK_URL=${ALERT_WEBHOOK_URL:-}
    - ALERT_WEBHOOK_SECRET=${ALERT_WEBHOOK_SECRET:-}
    - ALERT_EVENTS=${ALERT_EVENTS:-login.locked,audit.chain.broken,session.refresh.fail}
```

Default-empty URL = silent; opt-in for operators. The HMAC signature lets the receiver verify authenticity (and pairs with R7 secrets handling later).

### H-R6-4 — `console.log` / unstructured logging mixed with winston; no request correlation; no PII redaction

**Where:** `server/index.js` (182 KB) — winston is in deps but logging is heterogeneous.

**What:** Without a single structured logger with PII/secret redaction and per-request correlation IDs, every shipped log line is a potential leak (passwords in dev-time `console.log`s, full request body in unhandled rejections, etc.) and every incident takes forensic shoe-leather to reconstruct.

**RIGHT — `server/log.js` (winston + redaction + correlation)**
```js
import winston from 'winston';
import { randomUUID } from 'node:crypto';

const REDACT_KEYS = /^(authorization|cookie|set-cookie|password|passcode|secret|jwt_secret|refresh_token|access_token|x-api-key|x-csrf-token)$/i;
function deepRedact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepRedact);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = REDACT_KEYS.test(k) ? '[REDACTED]' : deepRedact(v);
  }
  return out;
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format(info => {
      info.meta = deepRedact(info.meta);
      return info;
    })(),
    process.env.LOG_FORMAT === 'pretty'
      ? winston.format.printf(i => \`${i.timestamp} ${i.level.toUpperCase()} ${i.message} ${JSON.stringify(i.meta||{})}\`)
      : winston.format.json()
  ),
  defaultMeta: { service: 'homelabarr-backend', version: process.env.APP_VERSION || 'dev' },
  transports: [ new winston.transports.Console({ stderrLevels: ['error'] }) ],
});

// Express middleware — attaches a stable request ID and a per-request child logger
export function requestContext(req, res, next) {
  const rid = req.headers['x-request-id'] || randomUUID();
  req.rid = rid;
  req.log = logger.child({ rid, ip: req.ip, method: req.method, path: req.path });
  res.setHeader('X-Request-Id', rid);
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number((process.hrtime.bigint() - t0) / 1000000n);
    req.log.info('http.req', { meta: { status: res.statusCode, ms } });
  });
  next();
}
```

Replace every `console.log`/`console.error` in `server/`:
```js
// WRONG
console.error('login failed for ' + req.body.username);

// RIGHT
req.log.warn('login.fail', { meta: { username: req.body.username } });   // password key is auto-redacted
```

Add the middleware: `app.use(requestContext);` immediately after `helmet()` and before any route.

**Verification:**
```sh
# Every response has X-Request-Id
curl -sI https://ce-demo.homelabarr.com/api/health | tr -d '\r' | grep -i '^x-request-id:'
# Expect: a UUID

# Logs are JSON
docker logs --tail 5 homelabarr-backend 2>&1 | head -1 | jq -r .level
# Expect: 'info' (or whatever)

# Secrets in request bodies don't leak
docker logs --tail 100 homelabarr-backend 2>&1 | grep -iE 'passcode|password|jwt_secret' | grep -v 'REDACTED' | head
# Expect: no matches outside the standard auth-event keys (which themselves redact value)
```

---

### H-R6-5 — `/api/health` leaks too much to unauthenticated callers

**Where:** `server/index.js` — current `/api/health` JSON shape exposes `platform.nodeVersion`, `platform.architecture`, `environment.validation.configuredVariables` (which keys are set), `network.bindAddress`, `network.serviceUrls.database`, and the literal docker-socket path. All of this is recon gold.

**WRONG (current 1.5 KB JSON)** — exposes Node version, OS, container internals, validation state, what env vars are set, network bind address, service URLs.

**RIGHT — two endpoints**
```js
// Unauthenticated: just enough for a load balancer
app.get('/api/health', async (req, res) => {
  const dh = await dockerProbe();   // see R5.5-drift-8 fix
  const ok = dh.ok;
  res.status(ok ? 200 : 503).json({
    status: ok ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || 'dev',
  });
});

// Authenticated admin: the rich detail
app.get('/api/health/detail', requireAdmin, requireXhr, async (req, res) => {
  // … return the existing rich JSON, but with secrets/paths still redacted
  res.json({ /* … existing detailed payload … */ });
});
```

Resolves R5.5-drift-8 (DEGRADED reading) when paired with the proxy-aware `dockerProbe()` from §0.

**Verification:**
```sh
curl -s https://ce-demo.homelabarr.com/api/health | jq 'keys'
# Expect: ["status","timestamp","version"]    (3 keys; no nodeVersion, no platform, no configuredVariables)

# Authenticated:
curl -s --cookie cj.txt -H 'X-Requested-With: XMLHttpRequest' \
  https://ce-demo.homelabarr.com/api/health/detail | jq '.platform.nodeVersion'
# Expect: 'v24.16.0'
```

---

### M-R6-6 — No log rotation policy / size cap on the JSONL mirror

**Where:** `/app/server/activity-data/audit.jsonl` written by C-R6-1.

**What:** Unbounded append-only file fills the volume. Use a daily-rotated file with a retention cap; the SQLite table is the system of record so rotated JSONL can be archived externally.

**RIGHT** — replace single-file append with daily rotation via `winston-daily-rotate-file`:

```json
// package.json — add dep
"winston-daily-rotate-file": "^5.0.0"
```

```js
// server/audit.js — alongside the SQLite insert
import DailyRotateFile from 'winston-daily-rotate-file';
const rotator = new DailyRotateFile({
  filename: '/app/server/activity-data/audit-%DATE%.jsonl',
  datePattern: 'YYYY-MM-DD',
  maxSize: '50m',
  maxFiles: '90d',
  zippedArchive: true,
  level: 'info',
});
const auditLogger = winston.createLogger({ transports: [rotator], format: winston.format.json() });
// inside audit():  auditLogger.info(row);    // instead of fs.writeSync
```

---

### M-R6-7 — No `/api/audit` access controls beyond `requireAdmin`

**Where:** `/api/audit` (new from C-R6-1).

**What:** Logs about logs. Every read of `/api/audit` should itself be audited (with a distinct event `audit.read`) so a compromised admin session can be traced. Also rate-limit the endpoint to prevent enumeration via timing.

**RIGHT**
```js
app.get('/api/audit',
  requireAdmin, requireXhr,
  rateLimit({ store: new SqliteStore(db, 60 * 1000), windowMs: 60 * 1000, max: 30 }),
  (req, res) => {
    audit(db, { actor: req.user.username, ip: req.ip, event: 'audit.read',
                result: 'ok', meta: { limit: req.query.limit } });
    /* … */
  }
);
```

### M-R6-8 — Boot-time chain-verification result not exposed; silent corruption possible

**Where:** `server/audit.js` introduced in C-R6-1.

**What:** `verifyChain(db)` must run at startup and (a) log the result, (b) emit `audit.chain.verified` or `audit.chain.broken` as the next chain entry, (c) trigger the webhook alert (H-R6-3) on broken, (d) optionally refuse to start if the operator opts into strict mode.

**RIGHT — `server/index.js` boot path**
```js
import { initAudit, audit, verifyChain } from './audit.js';
initAudit(db);
const chain = verifyChain(db);
if (!chain.ok) {
  audit(db, { event: 'audit.chain.broken', actor: 'system', result: 'fail',
              meta: { brokenAt: chain.brokenAt, kind: chain.kind } });
  maybeAlert({ event: 'audit.chain.broken', actor: 'system', meta: chain });
  if (process.env.AUDIT_STRICT === '1') {
    logger.error('audit.chain.broken', { meta: chain });
    process.exit(1);
  }
} else {
  audit(db, { event: 'audit.chain.verified', actor: 'system', result: 'ok',
              meta: { rows: chain.rows } });
}
```

---

### M-R6-9 — Nginx access log format does not carry the backend request ID

**Where:** `nginx.conf.template` (frontend), `docker-entrypoint.sh`.

**What:** Once the backend emits `X-Request-Id` on every response (H-R6-4), the frontend's nginx should add an `X-Request-Id` to upstream requests (forward existing, generate if missing) and include it in the access log format. Then a single ID joins nginx-side and node-side log lines for any incident.

**RIGHT — `nginx.conf.template`** (excerpt to add to the `http` or `server` block)
```nginx
log_format json_combined escape=json
  '{'
    '"ts":"$time_iso8601","host":"$host","status":$status,'
    '"method":"$request_method","uri":"$request_uri","ua":"$http_user_agent",'
    '"rid":"$http_x_request_id","upstream_status":"$upstream_status",'
    '"upstream_ms":"$upstream_response_time","request_ms":"$request_time"'
  '}';
access_log /var/log/nginx/access.log json_combined;

map $http_x_request_id $rid { default $http_x_request_id; '' $request_id; }

location /api/ {
  proxy_set_header X-Request-Id $rid;
  proxy_pass ${BACKEND_URL};
  /* … existing config … */
}
```

(Nginx's built-in `$request_id` variable generates a UUID-like value when none is supplied by the client.)

---

### L-R6-10 — No deny-list / allow-list mechanism for source IPs

**Where:** `server/` — no IP filter middleware.

**What:** For a homelab tool exposed via Traefik, blocking known-abuse IPs at the application layer is occasionally useful (per-installation tarpit). Make it operator-configurable, default-empty.

**RIGHT** — middleware:
```js
const denyCIDRs = (process.env.IP_DENYLIST || '').split(',').filter(Boolean);
const allowOnly = (process.env.IP_ALLOWLIST || '').split(',').filter(Boolean);
import ipaddr from 'ipaddr.js';   // add to deps

function ipFilter(req, res, next) {
  const ip = ipaddr.process(req.ip);
  if (allowOnly.length && !allowOnly.some(c => matches(ip, c))) {
    audit(db, { event: 'ip.denied', ip: req.ip, result: 'denied', meta: { reason: 'not-in-allowlist' } });
    return res.status(403).end();
  }
  if (denyCIDRs.some(c => matches(ip, c))) {
    audit(db, { event: 'ip.denied', ip: req.ip, result: 'denied', meta: { reason: 'denylist' } });
    return res.status(403).end();
  }
  next();
}
function matches(ip, cidr) {
  const [base, bits] = cidr.split('/');
  return ip.match(ipaddr.process(base), parseInt(bits || (ip.kind() === 'ipv4' ? '32' : '128'), 10));
}
app.use(ipFilter);
```

Compose:
```yaml
backend:
  environment:
    - IP_ALLOWLIST=${IP_ALLOWLIST:-}
    - IP_DENYLIST=${IP_DENYLIST:-}
```

---

### L-R6-11 — `SECURITY.md` lacks an "incident response" stub

**Where:** `SECURITY.md`.

**What:** With audit + alerting in place, add a minimal IR section: how to read `/api/audit`, how to revoke all sessions, how to rotate secrets, how to dump and archive the JSONL mirror.

**RIGHT — append**
```md
## Incident response (basic)

1. **Read recent security events** — `curl -s --cookie … /api/audit?limit=500 | jq`
2. **Revoke ALL sessions** —
   ```
   sqlite3 /app/data/homelabarr.db "DELETE FROM sessions; DELETE FROM rate_buckets;"
   docker compose restart backend
   ```
3. **Rotate `JWT_SECRET`** — regenerate `openssl rand -base64 48`, update env, restart backend. All outstanding tokens become invalid.
4. **Verify audit chain** — `curl -s … /api/audit | jq '.chain'` — expect `{"ok": true}`.
5. **Archive logs** — `tar -caf "audit-$(date -u +%Y%m%dT%H%M%SZ).tar.zst" /app/server/activity-data/audit-*.jsonl.gz`
```

---

### L-R6-12 — Frontend should send `X-Request-Id` for top-level API calls

**Where:** `src/lib/api.ts` (frontend) — request library.

**What:** When the user clicks "Deploy", the frontend should generate a request ID and send it; the backend reuses it; nginx logs it; the audit row records it. End-to-end tracing for free.

**RIGHT — `src/lib/api.ts`**
```ts
function uuid() {
  return ('crypto' in window && crypto.randomUUID)
    ? crypto.randomUUID()
    : (Date.now().toString(36) + Math.random().toString(36).slice(2));
}

export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('X-Requested-With')) headers.set('X-Requested-With', 'XMLHttpRequest');
  if (!headers.has('X-Request-Id'))     headers.set('X-Request-Id', uuid());
  return fetch(input, { ...init, headers, credentials: 'include' });
}
```

---

## §4 — Verification

(Run after R6 ships.)

### 4.1 — Audit log fires + chain validates

```sh
# Trigger a failed login
curl -s -X POST -H 'X-Requested-With: XMLHttpRequest' -H 'Content-Type: application/json' \
  --data '{"username":"admin","passcode":"WRONG"}' https://ce-demo.homelabarr.com/api/auth/login

# Authenticated:
COOKIE=cj.txt
curl -s --cookie-jar $COOKIE --cookie $COOKIE -X POST -H 'X-Requested-With: XMLHttpRequest' \
  -H 'Content-Type: application/json' --data '{"username":"admin","passcode":"<real>"}' \
  https://ce-demo.homelabarr.com/api/auth/login

curl -s --cookie $COOKIE -H 'X-Requested-With: XMLHttpRequest' \
  https://ce-demo.homelabarr.com/api/audit?limit=10 | jq '{chain, last:.events[0]}'
# Expect: chain.ok=true, last event in {login.success, login.fail, audit.read}
```

### 4.2 — Rate limit + lockout persist across restart

```sh
for i in 1 2 3 4 5 6 7 8 9 10 11; do
  curl -s -o /dev/null -w '%{http_code} ' -X POST -H 'X-Requested-With: XMLHttpRequest' \
    -H 'Content-Type: application/json' --data '{"username":"admin","passcode":"WRONG"}' \
    https://ce-demo.homelabarr.com/api/auth/login
done; echo
# Expect last few: 429

docker compose restart backend && sleep 8
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'X-Requested-With: XMLHttpRequest' \
  -H 'Content-Type: application/json' --data '{"username":"admin","passcode":"WRONG"}' \
  https://ce-demo.homelabarr.com/api/auth/login
# Expect: 429   (state survived restart)
```

### 4.3 — Webhook fires on lockout (if configured)

Configure `ALERT_WEBHOOK_URL` to a test endpoint (e.g., webhook.site) and trigger 8 failures for a single account; the webhook receives one `login.locked` payload with HMAC sig in header.

### 4.4 — `/api/health` minimal payload

```sh
curl -s https://ce-demo.homelabarr.com/api/health | jq 'keys'
# Expect: ["status","timestamp","version"]
```

### 4.5 — Structured JSON logs with request IDs

```sh
RID=$(uuidgen)
curl -sI -H "X-Request-Id: $RID" https://ce-demo.homelabarr.com/api/health | grep -i x-request-id
# Expect: X-Request-Id: <the same RID>

docker logs --tail 200 homelabarr-backend 2>&1 | jq -c "select(.rid==\"$RID\")"
# Expect: at least one JSON line containing rid=$RID
```

### 4.6 — Chain-break detection

In a test instance only:
```sh
sqlite3 /app/data/homelabarr.db "UPDATE audit_events SET result='ok' WHERE id=(SELECT MIN(id) FROM audit_events);"
curl -s --cookie $COOKIE -H 'X-Requested-With: XMLHttpRequest' \
  https://ce-demo.homelabarr.com/api/audit | jq '.chain'
# Expect: { "ok": false, "brokenAt": <id>, "kind": "row_hash_mismatch" }
```

### 4.7 — R5.5 drifts cleaned up (bundled into R6 PR)

```sh
grep -c 'DEFAULT_ADMIN_PASSWORD=\$\{DEFAULT_ADMIN_PASSWORD:\?' homelabarr.yml   # expect 1
grep -cE 'homelabarr-(frontend|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml  # expect 2
jq -r .packageManager package.json                                                  # expect npm@10.x.x+sha256.…
cat .nvmrc                                                                          # expect 24.16.0
grep -RhE '^\s*-\s*uses:' .github/workflows | grep -vE '@[0-9a-f]{40}' | grep -v '#' | wc -l   # expect 0
grep -cE 'aquasecurity/trivy-action[\s\S]*?image-ref:.*outputs\.digest' .github/workflows/docker-build-push.yml  # expect >=2
grep -c 'cyclonedx-npm' .github/workflows/security-audit.yml                        # expect >=1
curl -s https://ce-demo.homelabarr.com/api/health | jq -r .status                    # expect OK
```

---

## §5 — Out of Scope (Queued for Later Rounds)

| Round | Dimension |
|---|---|
| **R7** | Secrets management — Docker secrets / SOPS / Vault for at-rest `JWT_SECRET`, `DEFAULT_ADMIN_PASSWORD`, `ALERT_WEBHOOK_SECRET`. Encryption-at-rest for the SQLite DB (SQLCipher or LUKS on the volume). Key rotation runbook. |
| **R8** | Production deployment runbook — Traefik mTLS to backend over the internal net, fail2ban tied to /api/audit `login.locked` events, host-level UFW/nftables, AppArmor/SELinux profiles narrowed to HomelabARR paths, backup + recovery drill, disaster-recovery playbook. |
| **R9** | Application-layer DAST — automated OWASP ZAP baseline against ce-demo.homelabarr.com on each main-branch merge, custom rules for HomelabARR's API surface, scheduled deep scans. |
| **R2.6** (optional) | Trusted Types report-only → enforce rollout (deferred since R2's verification matrix). |
| **Observability-2** (later) | Wire structured logs to a real backend — Loki or OpenSearch — and ship Grafana dashboards. Out of CE scope but documentable. |

---

## §6 — Owner Pile (Human-Only / Do-Not-Delegate)

1. **Decide alerting destination** for H-R6-3. Discord webhook, Slack incoming-webhook, a generic relay (n8n / webhook.site), or a self-hosted Apprise. The HMAC signature lives in `ALERT_WEBHOOK_SECRET`; choose how to store it (R7 will formalize this).

2. **Decide audit retention.** 90-day rotated JSONL + indefinite SQLite is a sensible default. If GDPR / regional compliance applies, document the policy in `SECURITY.md` and set `maxFiles` accordingly.

3. **Decide `AUDIT_STRICT`.** Default off (boot continues with a warning if the chain breaks); on means refusal-to-start. Pick one for the demo and one for the recommended production profile, document both.

4. **Tag and release a `v2.3.0`** so R5.5-drift-6 (digest pin in compose) has a concrete target. Without a release this drift cannot fully close.

5. **Run the supplied `bulk-SHA-pin` script** from §0 (R5.5-drift-7) — requires `gh` CLI authenticated to a token with `public_repo` scope. The agent can prepare the diff but you should review and merge it.

6. **Enable / verify branch protection** so R5's new CI jobs (`dependency-cves`, `secrets-scan`, `license-audit`, `scorecard`) are required, and add the R6-new jobs whenever they exist (likely: the same dependency-cves runs, plus a new `integration-tests` job if you wire one for R6).

7. **Choose lockout thresholds.** Defaults: 10 failed logins per 15 min per IP (rate-limit), 8 per account (lockout), 30-min unlock. Adjust to taste; tighter values risk locking out legitimate users on a flaky network.

8. **Approve a strategy for log shipping** out of the container to a host volume or external collector. R6's stdout-JSON-and-volume-JSONL approach is intentionally portable; integrating with Loki/Vector is an operator choice.

9. **Review the redaction allowlist** in `server/log.js` (H-R6-4) and add any project-specific secret-shaped fields not covered by the default regex.

---

## §7 — Deliverable

**PR title:**
`security(r6): structured logging, tamper-evident audit log, persistent rate-limit + lockout, webhook alerts, /api/health minimization + R5.5 cleanups`

**Squash-commit body:**
```
Round 6 of the security audit adds observability and abuse-response.
Findings: 1 Critical / 4 High / 4 Medium / 3 Low.

C-R6-1   Introduce server/audit.js with audit_events SQLite table,
         hash-chained tamper-evidence, JSONL mirror to
         /app/server/activity-data/, /api/audit operator endpoint,
         and instrument all auth + session + container actions to
         emit audit events.

H-R6-2   Replace in-memory express-rate-limit with SQLite-backed
         store + account_lockouts table; per-IP rate-limit + per-
         account lockout state survives restart. Wire onto
         /api/auth/login, /api/auth/refresh, /api/auth/mfa/verify.

H-R6-3   Add server/alert.js — opt-in HMAC-signed webhook dispatch
         with 5-minute per-key dedup; default-empty URL = disabled.
         Fired on login.locked, audit.chain.broken, and any
         operator-configured event in ALERT_EVENTS.

H-R6-4   Add server/log.js with winston-based JSON logger, PII/secret
         redaction filter, requestContext middleware that assigns and
         echoes X-Request-Id. Replace every console.log/error across
         server/.

H-R6-5   Split /api/health into a minimal unauthenticated probe
         (status,timestamp,version) and /api/health/detail behind
         requireAdmin. Combined with proxy-aware dockerProbe() this
         resolves R5.5-drift-8 (DEGRADED reading).

M-R6-6   Add winston-daily-rotate-file for /app/server/activity-data
         JSONL mirror; 50 MB rolling, 90-day retention, gzip archive.

M-R6-7   /api/audit itself is audited (audit.read event) and rate-
         limited to 30/min via the new SQLite store.

M-R6-8   Boot-time verifyChain() with audit.chain.broken alert and
         optional AUDIT_STRICT=1 refusal-to-start.

M-R6-9   Nginx access log → JSON format with rid forwarding so
         frontend + backend log lines correlate on a single ID.

L-R6-10  Optional IP_ALLOWLIST / IP_DENYLIST middleware (default
         empty; opt-in) using ipaddr.js.

L-R6-11  SECURITY.md gains a basic incident-response playbook.

L-R6-12  Frontend src/lib/api.ts generates X-Request-Id on outbound
         API calls so end-to-end tracing closes.

R5.5 drift cleanup bundled in same PR (verbatim diffs in audit §0):
  R5.5-drift-2  packageManager pin in package.json
  R5.5-drift-3  Trivy scan of pushed image digest (with image-ref +
                outputs.digest) and SARIF upload
  R5.5-drift-4  CycloneDX SBOM job for npm
  R5.5-drift-5  DEFAULT_ADMIN_PASSWORD=${VAR:?...} fail-loud
  R5.5-drift-6  Image digest pinning in homelabarr.yml (requires
                tagged release first)
  R5.5-drift-7  Bulk SHA-pin every uses: in .github/workflows/
  R5.5-drift-8  /api/health uses proxy-aware dockerProbe() — no more
                DEGRADED reading on demo
  R5.5-drift  .nvmrc tightened from "24" to "24.16.0"

Verification matrix in audit §4 is the acceptance criteria.
```

---

## §8 — End / Loop Continuation

When R6 ships, I will re-verify:
- `POST /api/auth/login` failed → `/api/audit` shows `login.fail` row with hash linkage to prior row, `verifyChain` reports ok.
- 11 rapid failed logins → 429; restart backend; 12th still 429 (state survived).
- 8 failed logins on one account → 423 lockout; `audit.read` on `/api/audit` shows `login.locked` event.
- Every API response carries `X-Request-Id`; `docker logs homelabarr-backend` lines are valid JSON containing the same rid.
- Unauthenticated `/api/health` returns 3 keys only.
- `/api/health/detail` (authenticated admin) returns the rich payload AND `status: OK` (no more DEGRADED).
- `grep -RhE '^\s*-\s*uses:' .github/workflows | grep -vE '@[0-9a-f]{40}' | grep -v '#'` returns nothing.
- `grep -cE 'homelabarr-(frontend|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml` returns 2.
- Optional: configure `ALERT_WEBHOOK_URL` to webhook.site, lock an account, see one signed payload arrive.

If everything is green, next deliverable is **Round 7: secrets management + encryption-at-rest** (Docker secrets / SOPS / Vault for JWT_SECRET, ALERT_WEBHOOK_SECRET, DEFAULT_ADMIN_PASSWORD; SQLCipher binding for the SQLite users + audit DBs; key rotation runbook). Drafted without asking.

If drift: **Round 6.5 correction MD** first.
