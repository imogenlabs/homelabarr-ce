# HomelabARR CE — Round 3 Security Audit
## Auth Flow Hardening — Refresh Rotation, Session Revocation, MFA, Password Reset

**Target (live):** https://ce-demo.homelabarr.com/
**Target (repo):** https://github.com/imogenlabs/homelabarr-ce
**Branch / HEAD audited:** main @ 7a0bdd40 (Merge dev: handoff docs update, 2026-05-22)
**Date:** 2026-05-22
**Auditor:** Claude (Imogen Labs audit playbook, Round 3)
**Prerequisite:** Round 2 + Round 2.5 fixes deployed and verified live ✓

---

## §0 — Round 2 + 2.5 carryover (verified live before writing R3)

Re-ran the R2.5 §4 matrix against `ce-demo.homelabarr.com/?_v=r25verify` with cache-busting.

| Check | R2.5 expected | R3 observed | Status |
|---|---|---|---|
| Bundle has no `Bearer` keyword | true | true (0 occurrences) | ✅ |
| Bundle `homelabarr_token` count | 1 (one-shot wipe per spec) | exactly 1 | ✅ |
| Bundle `X-CSRF-Token` present | true | 6 occurrences | ✅ |
| Bundle `X-Requested-With` present | true | 7 occurrences | ✅ |
| Bundle `hl_csrf` cookie name | true | true | ✅ |
| `localStorage` after login | only `theme` | only `theme` (no token, no user) | ✅ |
| Login response body keys | `{success, user}` | `{success, user}` (no token in body) | ✅ |
| `hl_csrf` cookie issued | true | true | ✅ |
| `hl_session` invisible to JS (HttpOnly) | true | true | ✅ |
| `/api/auth/me` cookie-only | 200 | 200 | ✅ |
| `/api/auth/me` no-cookie | 401 | 401 | ✅ |
| Legacy `Authorization: Bearer X.Y.Z` → /auth/me | 401 (legacy closed) | 401 | ✅ |
| Legacy `Authorization: Bearer X.Y.Z` → /containers/*/logs | 401 | 401 | ✅ |
| Logout bare → 403 | true | 403 | ✅ |
| Logout with X-CSRF-Token + X-Requested-With → 200 | true | 200 | ✅ |
| `mjashley` removed from served HTML | true | true (attribute gone) | ✅ |

**Round 2 + 2.5 verdict: SHIPPED CLEAN.** localStorage-JWT exfiltration path is closed end-to-end. Legacy Bearer path is closed server-side. CSRF + XHR double-marker is enforced on every state-change.

---

## §1 — Round 3 Goal

With the **transport** secured (R1 server + R2 + R2.5 client/cookie/CSRF), the remaining auth-domain holes are about the **session lifecycle**:

1. **JWT has no refresh / no rotation** — current `jwt.sign` (server/auth.js:126) issues a single long-lived token. If it leaks (or its session cookie is replayed via XSS that escapes HttpOnly via a future browser bug, or via a Subdomain-Confusion attack, or via a compromised device), there's no way to revoke or rotate it short of changing `JWT_SECRET` and forcing every user to re-login.

2. **No session revocation list** — server has `revoke` references (auth.js:185-215) but they appear to be role/permission revocation, not session revocation. There is no `/api/auth/sessions` (verified 404 live), no `jti` tracking on JWTs, no way for a user (or admin) to kill a stolen session.

3. **No MFA / TOTP** — single-factor password auth. `speakeasy`/`otpauth` not in deps. `/api/auth/totp/*` returns 404 live. Admin account on a homelab dashboard with Docker socket access is exactly the target class where MFA is non-negotiable.

4. **No password reset flow** — neither `/api/auth/forgot-password` nor `/api/auth/reset-password` exist (verified 404). There is no `nodemailer` / SMTP dep. A user who forgets their password has no remediation path except direct file-system access to `users.json`.

5. **No `timingSafeEqual` on token/CSRF comparisons** — server/auth.js has 0 `timingSafeEqual` calls. CSRF double-submit comparison and any token-equality checks should use constant-time comparison.

6. **JWT `expiresIn` ambiguity** — only 1 `expiresIn` reference in server/auth.js. Need to confirm value, ensure short-lived (≤15min) for access tokens with rotation, separate refresh-token lifetime.

7. **No account-lockout email** — login throttle (R1 C-8) blocks at 5/15min per IP+username, but a victim has no signal that their account is under attack.

8. **`scrypt`/`argon2id` vs `bcrypt` 12 rounds** — minor: bcryptjs default 10 rounds; OWASP 2025 recommends Argon2id or bcrypt with cost ≥12. Round 3 includes the cost bump.

**Constraint reminder:** No code changes. Specify diffs only. Agent implements. Loop continues.

---
## §2 — Current State (verified against live + repo @ 7a0bdd40)

### 2.1 Auth-endpoint surface (probed live with credentials:'include')
| Endpoint | Status | Meaning |
|---|---|---|
| POST /api/auth/login | 200 | exists, cookie+CSRF flow |
| POST /api/auth/logout | 200 w/CSRF+XHR; 403 otherwise | exists |
| GET /api/auth/me | 200 w/cookie; 401 otherwise | exists |
| POST /api/auth/refresh | 404 | **missing** |
| POST /api/auth/reset-password | 404 | **missing** |
| POST /api/auth/forgot-password | 404 | **missing** |
| POST /api/auth/mfa/setup | 404 | **missing** |
| POST /api/auth/mfa/verify | 404 | **missing** |
| POST /api/auth/totp/enable | 404 | **missing** |
| GET /api/auth/sessions | 404 | **missing** |
| DELETE /api/auth/sessions/:id | 404 | **missing** |
| POST /api/auth/revoke | 404 | **missing** |

### 2.2 `server/auth.js` static analysis (13,495 bytes / 479 lines)
- `jwt.sign` calls: **1** (L126) — only one token issued at login, no refresh
- `jwt.verify` calls: **1** (L139)
- `expiresIn` configuration entries: **1**
- `bcrypt` usage lines: 5 (L2 import, L81 hash, L107 compare, L306+L312 change-password)
- `refresh` keyword occurrences: **0**
- `jti` (JWT ID, needed for revocation list): **0**
- `blacklist`/`denylist`/`revoke-list`: **0** (the 5× `revoke` matches at L185-215 are role-permission revocation, not session)
- `reset` keyword: **0**
- `timingSafeEqual`: **0**

### 2.3 `server/index.js` static analysis (174,652 bytes / 5152 lines)
- `refresh` references: 0
- `reset-password` route: 0 (one audit-log action string at L446 `action: 'user_password_reset'` but no handler)
- `mfa`/`totp`/`speakeasy`: 0
- `lockout` references: present (R1 C-8 throttle)

### 2.4 `package.json` dependency check
Auth-relevant deps present: `bcryptjs`, `jsonwebtoken`, `express-rate-limit`, `helmet`
Auth-relevant deps **missing**: `speakeasy` or `otpauth` (TOTP), `qrcode` (QR for setup), `nodemailer` (email reset), `cookie-parser` (cookies are being parsed without it — works because of `req.headers.cookie` manual parse; OK but document)

### 2.5 Live behavioral probes
- Login response body: `{success: true, user: {...}}` — no token, no `refreshToken`, no `expiresAt` ✓
- `hl_session` cookie attributes: HttpOnly ✓, Secure ✓ (inferred — invisible to JS over HTTPS); SameSite=Strict (inferred from R2 verification)
- No `hl_refresh` cookie observed → no refresh token
- No `Max-Age` short value observed (cookie persists across browser restart — implies `Max-Age >>` access-token lifetime, which means the cookie itself IS the long-lived session)

### 2.6 Threat model deltas vs. pre-R3
Closed by R1/R2/R2.5:
- XSS exfil of token from localStorage ✓
- Cross-site CSRF on state changes ✓
- Login brute force (5/15min throttle) ✓
- Default admin password / hardcoded JWT secret ✓

Still open after R2.5 (Round 3 scope):
- Stolen session cookie has indefinite validity (no rotation, no revocation)
- Compromised admin = full Docker socket access with no MFA second-factor
- Forgotten password = permanently locked out OR file-system recovery
- Side-channel timing attacks on CSRF token comparison
- No "kill all my sessions" remediation after suspected compromise
- No alert to user when their account is under brute-force attack

---
## §3 — Findings

### Round 3 scorecard
| Severity | Count |
|---|---|
| Critical | 1 |
| High | 4 |
| Medium | 4 |
| Low | 3 |
| **Total** | **12** |

---

### C-R3-1 — JWT has no `jti` and no server-side revocation list (stolen session = permanent access)

**File:** `server/auth.js` L126 (jwt.sign), L139 (jwt.verify)
**Severity:** Critical (single device compromise → indefinite full-system access)

**Impact:** When (not if) one of the following happens — laptop stolen, browser session restored from disk, network MitM in a coffee shop on a not-yet-HSTS-preloaded first visit, Cloudflare zero-day, future browser CSP bypass, or a malicious extension installed — the attacker holds a valid `hl_session` cookie. There is no `jti` claim on the token, no server-side list to mark it revoked, and no UI to "log out all other sessions." The only remediation is `JWT_SECRET` rotation, which kicks out every user including the victim and breaks ongoing work.

**WRONG (current, conceptual — auth.js L126):**
```js
const token = jwt.sign(
  { sub: user.id, username: user.username, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '8h' }
);
res.cookie('hl_session', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 8*60*60*1000 });
```

**RIGHT — short-lived access token + sliding refresh token + revocation list:**

Add a tiny sessions table. SQLite is fine for CE; for the demo use a single JSON file or better, `better-sqlite3`:

```bash
npm i better-sqlite3
```

```js
// server/sessions.js (NEW)
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const db = new Database(path.join(process.env.DATA_DIR || './data', 'sessions.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    jti TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    refresh_hash TEXT NOT NULL,
    user_agent TEXT,
    ip TEXT,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, revoked_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`);

const REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000;  // 14 days

function createSession({ userId, userAgent, ip }) {
  const jti = crypto.randomBytes(16).toString('hex');
  const refresh = crypto.randomBytes(32).toString('base64url');
  const refreshHash = crypto.createHash('sha256').update(refresh).digest('hex');
  const now = Date.now();
  db.prepare(`INSERT INTO sessions (jti, user_id, refresh_hash, user_agent, ip, created_at, last_seen_at, expires_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(jti, userId, refreshHash, userAgent || null, ip || null, now, now, now + REFRESH_TTL_MS);
  return { jti, refresh };
}

function isJtiActive(jti) {
  const row = db.prepare(`SELECT revoked_at, expires_at FROM sessions WHERE jti = ?`).get(jti);
  if (!row) return false;
  if (row.revoked_at) return false;
  if (row.expires_at < Date.now()) return false;
  return true;
}

function rotateRefresh(jti, presentedRefresh, userAgent, ip) {
  const row = db.prepare(`SELECT * FROM sessions WHERE jti = ?`).get(jti);
  if (!row || row.revoked_at || row.expires_at < Date.now()) return null;
  const presentedHash = crypto.createHash('sha256').update(presentedRefresh).digest('hex');
  // timing-safe compare
  const a = Buffer.from(row.refresh_hash);
  const b = Buffer.from(presentedHash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    // refresh token reuse / theft: nuke the whole session and force re-login
    db.prepare(`UPDATE sessions SET revoked_at = ? WHERE jti = ?`).run(Date.now(), jti);
    return null;
  }
  const newRefresh = crypto.randomBytes(32).toString('base64url');
  const newRefreshHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
  db.prepare(`UPDATE sessions SET refresh_hash = ?, last_seen_at = ?, user_agent = ?, ip = ? WHERE jti = ?`)
    .run(newRefreshHash, Date.now(), userAgent || row.user_agent, ip || row.ip, jti);
  return newRefresh;
}

function revoke(jti) {
  db.prepare(`UPDATE sessions SET revoked_at = ? WHERE jti = ? AND revoked_at IS NULL`).run(Date.now(), jti);
}

function revokeAllForUser(userId, exceptJti = null) {
  if (exceptJti) {
    db.prepare(`UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND jti != ? AND revoked_at IS NULL`).run(Date.now(), userId, exceptJti);
  } else {
    db.prepare(`UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`).run(Date.now(), userId);
  }
}

function listForUser(userId) {
  return db.prepare(`SELECT jti, user_agent, ip, created_at, last_seen_at, expires_at, revoked_at FROM sessions WHERE user_id = ? ORDER BY last_seen_at DESC LIMIT 100`).all(userId);
}

// Janitor: hourly
setInterval(() => {
  db.prepare(`DELETE FROM sessions WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)`).run(Date.now(), Date.now() - 7*24*60*60*1000);
}, 60 * 60 * 1000).unref();

module.exports = { createSession, isJtiActive, rotateRefresh, revoke, revokeAllForUser, listForUser };
```

Then update `server/auth.js` login flow:

```js
// server/auth.js — replace the jwt.sign block at L126
const { createSession } = require('./sessions');
const ACCESS_TTL_SEC = 15 * 60;   // 15 minutes

// inside login handler after password verification:
const { jti, refresh } = createSession({ userId: user.id, userAgent: req.headers['user-agent'], ip: req.ip });
const accessToken = jwt.sign(
  { sub: user.id, username: user.username, role: user.role, jti },
  process.env.JWT_SECRET,
  { expiresIn: ACCESS_TTL_SEC, algorithm: 'HS256' }
);

// Access cookie: 15min
res.cookie('hl_session', accessToken, {
  httpOnly: true, secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict', path: '/', maxAge: ACCESS_TTL_SEC * 1000
});
// Refresh cookie: 14d, scoped to /api/auth/refresh ONLY (defense-in-depth)
res.cookie('hl_refresh', refresh + '.' + jti, {
  httpOnly: true, secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict', path: '/api/auth/refresh', maxAge: 14*24*60*60*1000
});
```

And the verify path (the requireAuth middleware):

```js
// server/auth.js — wherever jwt.verify currently lives (L139)
const { isJtiActive } = require('./sessions');

const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
if (!payload.jti || !isJtiActive(payload.jti)) {
  return res.status(401).json({ error: 'session_revoked' });
}
req.user = payload;
```

New refresh endpoint:

```js
// server/auth.js (or server/index.js — wherever auth routes live)
const { rotateRefresh } = require('./sessions');

router.post('/auth/refresh', /* CSRF + XHR already enforced by middleware */ (req, res) => {
  const raw = req.cookies?.hl_refresh || parseCookie(req.headers.cookie || '', 'hl_refresh');
  if (!raw) return res.status(401).json({ error: 'no_refresh' });
  const [presented, jti] = raw.split('.');
  if (!presented || !jti) return res.status(400).json({ error: 'bad_refresh' });

  const newRefresh = rotateRefresh(jti, presented, req.headers['user-agent'], req.ip);
  if (!newRefresh) {
    res.clearCookie('hl_session', { path: '/' });
    res.clearCookie('hl_refresh', { path: '/api/auth/refresh' });
    return res.status(401).json({ error: 'refresh_invalid_or_reused' });
  }
  // Re-issue a fresh access JWT
  const user = getUserById(payloadFromJti(jti).userId);
  const accessToken = jwt.sign(
    { sub: user.id, username: user.username, role: user.role, jti },
    process.env.JWT_SECRET,
    { expiresIn: 15 * 60, algorithm: 'HS256' }
  );
  res.cookie('hl_session', accessToken, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', path: '/', maxAge: 15 * 60 * 1000
  });
  res.cookie('hl_refresh', newRefresh + '.' + jti, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', path: '/api/auth/refresh', maxAge: 14*24*60*60*1000
  });
  res.json({ success: true });
});
```

**Client-side refresh interceptor** (`src/lib/api.ts`):
```ts
let refreshInFlight: Promise<Response> | null = null;
export const apiFetch = async (path: string, init: RequestInit = {}) => {
  const exec = () => fetch(\`\${API_BASE}\${path}\`, { ...init, credentials: 'include', headers: buildHeaders(init as any) });
  let res = await exec();
  if (res.status === 401) {
    const body = await res.clone().json().catch(() => ({}));
    if (body.error === 'session_revoked' || body.error === 'jwt expired' || body.error === 'jwt malformed') {
      // Refresh exactly once concurrently
      refreshInFlight = refreshInFlight || fetch(\`\${API_BASE}/auth/refresh\`, { method: 'POST', credentials: 'include', headers: buildHeaders({ method: 'POST' } as any) });
      const refreshed = await refreshInFlight;
      refreshInFlight = null;
      if (refreshed.ok) {
        res = await exec(); // retry original
      } else {
        // Hard logout — clear local UI state and push to login
        window.dispatchEvent(new CustomEvent('hl-session-dead'));
      }
    }
  }
  return res;
};
```

**Verification:**
```js
// In DevTools after R3 ships:
// 1) Login normally. Check Application > Cookies:
//    hl_session  HttpOnly ✓  Max-Age ≈ 900s (15min)
//    hl_refresh  HttpOnly ✓  Path=/api/auth/refresh  Max-Age ≈ 1209600s (14d)
// 2) Wait 16 minutes (or use DevTools "Cookies > delete value" on hl_session) then call /api/applications.
//    Expect: silent refresh, original call succeeds, hl_session value changed.
// 3) Replay test (refresh token theft simulation):
//    Capture the current hl_refresh value, call /api/auth/refresh once (success), then call /api/auth/refresh AGAIN
//    with the OLD value. Expect: 401, BOTH cookies cleared, the whole session revoked.
```

---
### H-R3-2 — No session-management UI / endpoint (user cannot kill suspicious sessions)

**Surface:** GET `/api/auth/sessions` and DELETE `/api/auth/sessions/:jti` both return 404
**Severity:** High
**Impact:** Even after C-R3-1 adds revocation infrastructure, users have no UI to act on it. "I think my laptop was stolen" or "someone is logged into my account from a country I've never been to" require a click-to-revoke. Without it, the only escape hatch is a server-side script the operator runs by hand.

**WRONG (current):** endpoints don't exist.

**RIGHT — new endpoints:**
```js
// server/auth.js
const { listForUser, revoke, revokeAllForUser } = require('./sessions');

router.get('/auth/sessions', requireAuth, (req, res) => {
  const rows = listForUser(req.user.sub);
  res.json({
    current_jti: req.user.jti,
    sessions: rows.map(r => ({
      jti: r.jti,
      user_agent: r.user_agent,
      ip: r.ip,
      created_at: r.created_at,
      last_seen_at: r.last_seen_at,
      expires_at: r.expires_at,
      revoked: !!r.revoked_at,
      is_current: r.jti === req.user.jti
    }))
  });
});

router.delete('/auth/sessions/:jti', requireAuth, (req, res) => {
  // user can only revoke their own sessions
  const target = req.params.jti;
  const row = db.prepare(`SELECT user_id FROM sessions WHERE jti = ?`).get(target);
  if (!row || row.user_id !== req.user.sub) return res.status(404).json({ error: 'not_found' });
  if (target === req.user.jti) {
    // revoking current session = logout
    res.clearCookie('hl_session', { path: '/' });
    res.clearCookie('hl_refresh', { path: '/api/auth/refresh' });
  }
  revoke(target);
  res.json({ success: true });
});

router.post('/auth/sessions/revoke-all', requireAuth, (req, res) => {
  revokeAllForUser(req.user.sub, /* exceptJti */ req.user.jti);
  res.json({ success: true });
});
```

**RIGHT — minimal UI** in `src/components/UserSettings.tsx` (file already exists, 33KB — add a section):
```tsx
// New "Active Sessions" section
const [sessions, setSessions] = useState<Session[]>([]);
useEffect(() => {
  apiFetch('/auth/sessions').then(r => r.json()).then(d => setSessions(d.sessions));
}, []);

return (
  <section>
    <h3>Active Sessions</h3>
    <ul>
      {sessions.map(s => (
        <li key={s.jti}>
          <div>{s.is_current ? '(this device) ' : ''}{s.user_agent || 'Unknown UA'}</div>
          <div>{s.ip} · last seen {new Date(s.last_seen_at).toLocaleString()}</div>
          {!s.is_current && (
            <button onClick={() => apiFetch(\`/auth/sessions/\${s.jti}\`, { method: 'DELETE' }).then(() => location.reload())}>
              Revoke
            </button>
          )}
        </li>
      ))}
    </ul>
    <button onClick={() => apiFetch('/auth/sessions/revoke-all', { method: 'POST' }).then(() => location.reload())}>
      Sign out of all other sessions
    </button>
  </section>
);
```

**Verification:**
```bash
# Authenticated probes:
curl -i --cookie 'hl_session=...; hl_csrf=...' -H 'X-CSRF-Token: ...' -H 'X-Requested-With: XMLHttpRequest' https://ce-demo.homelabarr.com/api/auth/sessions
# Expect: 200 + JSON listing
```

---

### H-R3-3 — No MFA / TOTP (admin = single-factor on a Docker-socket-root surface)

**Surface:** `/api/auth/mfa/*` and `/api/auth/totp/*` all return 404
**Severity:** High
**Impact:** The admin account on a HomelabARR install effectively has root on every container that the Docker socket can reach. R1 made admin/admin no longer default, R1 added brute-force throttling, R2/R2.5 hardened the cookie. None of that helps if the admin's password is in a leaked credential dump from another site. MFA is the standard control here.

**WRONG (current):** no MFA primitives at all.

**RIGHT — TOTP with backup codes, gated behind a per-user-opt-in flag:**

```bash
npm i otpauth qrcode
```

```js
// server/mfa.js (NEW)
const { TOTP, Secret } = require('otpauth');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function newTotp(username) {
  return new TOTP({
    issuer: 'HomelabARR',
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new Secret({ size: 20 })
  });
}

function makeBackupCodes(n = 10) {
  return Array.from({ length: n }, () => crypto.randomBytes(5).toString('hex')); // 10 chars hex
}

async function hashBackupCodes(codes) {
  return Promise.all(codes.map(c => bcrypt.hash(c, 12)));
}

async function verifyBackupCode(code, hashes) {
  for (let i = 0; i < hashes.length; i++) {
    if (hashes[i] && await bcrypt.compare(code, hashes[i])) return i;
  }
  return -1;
}

module.exports = { newTotp, TOTP, makeBackupCodes, hashBackupCodes, verifyBackupCode };
```

```js
// server/auth.js — TOTP setup / verify / disable endpoints
const { newTotp, TOTP, makeBackupCodes, hashBackupCodes, verifyBackupCode } = require('./mfa');
const QRCode = require('qrcode');

// POST /api/auth/mfa/setup — returns provisioning URI + QR (NOT yet enabled)
router.post('/auth/mfa/setup', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'user') return res.status(403).end();
  const totp = newTotp(req.user.username);
  // Store the candidate secret in a SHORT-LIVED slot (5min), separate from the active secret
  setPendingMfa(req.user.sub, { secret: totp.secret.base32, exp: Date.now() + 5*60*1000 });
  const uri = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(uri);
  res.json({ uri, qr: qrDataUrl });
});

// POST /api/auth/mfa/verify — user enters first code; we activate
router.post('/auth/mfa/verify', requireAuth, async (req, res) => {
  const { code } = req.body;
  const pending = getPendingMfa(req.user.sub);
  if (!pending || pending.exp < Date.now()) return res.status(400).json({ error: 'no_pending_setup' });
  const totp = new TOTP({ secret: Secret.fromBase32(pending.secret), issuer: 'HomelabARR', label: req.user.username });
  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) return res.status(400).json({ error: 'invalid_code' });
  const backup = makeBackupCodes(10);
  const backupHashes = await hashBackupCodes(backup);
  saveMfaForUser(req.user.sub, { secret: pending.secret, backupHashes, enabledAt: Date.now() });
  clearPendingMfa(req.user.sub);
  res.json({ enabled: true, backup_codes: backup }); // ONLY time the cleartext codes are shown
});

// POST /api/auth/mfa/disable — requires fresh password reconfirmation
router.post('/auth/mfa/disable', requireAuth, async (req, res) => {
  const { password } = req.body;
  const user = getUserById(req.user.sub);
  if (!await bcrypt.compare(password, user.passwordHash)) return res.status(401).json({ error: 'bad_password' });
  disableMfaForUser(req.user.sub);
  res.json({ disabled: true });
});

// Modify the LOGIN flow to require MFA when enabled
// POST /api/auth/login:
//   step 1: username + password → if MFA enabled, return { mfa_required: true, ticket: '<short-lived>' }
//   step 2: POST /api/auth/login/mfa with { ticket, code|backup_code } → set cookies
router.post('/auth/login/mfa', /* anti-throttle keyed by ticket */ async (req, res) => {
  const { ticket, code, backup_code } = req.body;
  const userId = consumeLoginTicket(ticket);
  if (!userId) return res.status(401).json({ error: 'bad_ticket' });
  const mfa = getMfaForUser(userId);
  if (!mfa?.secret) return res.status(400).json({ error: 'mfa_not_enabled' });
  let ok = false;
  if (code) {
    const totp = new TOTP({ secret: Secret.fromBase32(mfa.secret), issuer: 'HomelabARR', label: getUserById(userId).username });
    ok = totp.validate({ token: code, window: 1 }) !== null;
  } else if (backup_code) {
    const idx = await verifyBackupCode(backup_code, mfa.backupHashes);
    if (idx >= 0) {
      mfa.backupHashes[idx] = null; // single-use
      saveMfaForUser(userId, mfa);
      ok = true;
    }
  }
  if (!ok) return res.status(401).json({ error: 'mfa_failed' });
  // Issue session as in C-R3-1
  const { jti, refresh } = createSession({ userId, userAgent: req.headers['user-agent'], ip: req.ip });
  // ...same cookie issuance as login
});
```

**RIGHT — frontend UX**: two-step login modal (`src/components/LoginModal.tsx`) — if first POST returns `{ mfa_required, ticket }`, swap form to "Enter 6-digit code" + "Use backup code" link.

**Enforcement policy:** R3 ships TOTP as **opt-in** for users, but **MANDATORY for any account with role=admin**. Migration: existing admins get a banner on first login post-R3-deploy demanding MFA setup before any other action is allowed.

**Verification:**
```bash
curl -i -XPOST https://ce-demo.homelabarr.com/api/auth/mfa/setup -H 'Cookie: hl_session=...' -H 'X-Requested-With: XMLHttpRequest' -H 'X-CSRF-Token: ...'
# Expect: 200 + { uri, qr }

# Then login on a fresh browser session with admin/correct-password:
curl -i -XPOST https://ce-demo.homelabarr.com/api/auth/login -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' -d '{"username":"admin","password":"..."}'
# Expect AFTER MFA enrolled: 200 + { mfa_required: true, ticket: '...' }  (NO hl_session cookie set yet)
```

---

### H-R3-4 — No password-reset flow (forgotten password = file-system intervention)

**Surface:** `/api/auth/forgot-password` and `/api/auth/reset-password` both 404; no SMTP dep
**Severity:** High (operational/availability + security — without a reset flow, users keep weak passwords because they're afraid to forget)

**Impact:** Two concrete harms:
1. A user who forgets their password is locked out until the operator manually edits `users.json` (or whatever backing store) — terrible UX, encourages weak/sticky-note passwords.
2. A user who suspects compromise has no way to rotate their own password without an admin in the loop (R1 added `/auth/change-password` per server/auth.js:298, but that requires the **current** password, which is exactly what the attacker has).

**WRONG (current):** missing endpoints. `change-password` exists but requires current password.

**RIGHT — token-link email reset:**

```bash
npm i nodemailer
```

```js
// server/email.js (NEW) — abstracted so the demo can use a console-logger transport
const nodemailer = require('nodemailer');

let transporter;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
} else {
  // Dev / demo fallback: log to stdout so operator can copy/paste the link
  transporter = { sendMail: async (m) => { console.log('[email-stub]', m); return { messageId: 'stub' }; } };
}
module.exports = transporter;
```

```js
// server/auth.js — reset endpoints
const crypto = require('crypto');
const transporter = require('./email');
const RESET_TTL_MS = 30 * 60 * 1000; // 30min

// POST /api/auth/forgot-password — always 204 regardless of whether the user exists (no enumeration)
router.post('/auth/forgot-password',
  rateLimit({ windowMs: 60*60*1000, max: 5, keyGenerator: r => r.body?.username || r.ip }),
  async (req, res) => {
    const { username } = req.body || {};
    const user = username ? getUserByUsername(username) : null;
    if (user && user.email) {
      const raw = crypto.randomBytes(32).toString('base64url');
      const hash = crypto.createHash('sha256').update(raw).digest('hex');
      saveResetToken(user.id, hash, Date.now() + RESET_TTL_MS);
      const url = \`\${process.env.PUBLIC_BASE_URL}/reset-password?u=\${encodeURIComponent(user.id)}&t=\${raw}\`;
      transporter.sendMail({
        from: process.env.SMTP_FROM || 'homelabarr@localhost',
        to: user.email,
        subject: 'HomelabARR — password reset',
        text: \`Reset link (valid 30 minutes): \${url}\nIf you did not request this, ignore this email.\`
      }).catch(err => logger.error('reset_email_failed', { err: err.message }));
    }
    res.status(204).end(); // identical response shape regardless
  });

// POST /api/auth/reset-password
router.post('/auth/reset-password',
  rateLimit({ windowMs: 15*60*1000, max: 10 }),
  async (req, res) => {
    const { user_id, token, new_password } = req.body || {};
    if (!user_id || !token || !new_password) return res.status(400).json({ error: 'missing_fields' });
    const stored = getResetTokenForUser(user_id);
    if (!stored || stored.exp < Date.now()) return res.status(400).json({ error: 'invalid_or_expired' });
    const presentedHash = crypto.createHash('sha256').update(token).digest('hex');
    const a = Buffer.from(stored.hash); const b = Buffer.from(presentedHash);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(400).json({ error: 'invalid_or_expired' });
    // Enforce password policy
    if (typeof new_password !== 'string' || new_password.length < 12) return res.status(400).json({ error: 'password_too_short' });
    const passwordHash = await bcrypt.hash(new_password, 12);
    updateUserPasswordHash(user_id, passwordHash);
    clearResetToken(user_id);
    // Revoke all existing sessions for this user (forced re-login on every device)
    revokeAllForUser(user_id);
    res.status(200).json({ success: true });
  });
```

**RIGHT — frontend "Forgot password?" link in `LoginModal.tsx`** + `src/pages/ResetPassword.tsx` route at `/reset-password` that reads `?u=` and `?t=` from URL and POSTs to `/auth/reset-password`.

**Demo-mode behavior:** if `SMTP_HOST` is not set (the case for ce-demo.homelabarr.com), `forgot-password` returns 204 immediately and logs the reset link to stdout so the operator can manually retrieve it. `SECURITY.md` documents this.

---

### H-R3-5 — `X-CSRF-Token` comparison is not timing-safe (CSRF token leak via timing)

**Surface:** wherever the server compares `req.headers['x-csrf-token']` to `req.cookies.hl_csrf` — currently almost certainly `===`
**Severity:** High (theoretical; full exploit requires precise network timing measurement)
**Impact:** Standard CSRF double-submit comparisons with `===` leak the prefix of the cookie one character at a time under careful network timing analysis. Once leaked, the attacker can issue arbitrary state-changing requests under the user's session. Mitigation is trivial.

**WRONG (probable current — auth.js or CSRF middleware):**
```js
if (cookieToken !== headerToken) return res.status(403).json({ error: 'csrf' });
```

**RIGHT:**
```js
const crypto = require('crypto');
function safeEqStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const A = Buffer.from(a); const B = Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}
// ...
if (!safeEqStr(cookieToken, headerToken)) return res.status(403).json({ error: 'csrf' });
```

Apply the same to: password-reset token compare (already shown in H-R3-4), API key compare (R1 C-10 uses HMAC + timingSafeEqual — confirm), refresh-token compare (already shown in C-R3-1).

**Verification:** `grep -nE "csrf|CSRF" server/ | grep '===\|=='` → expected zero matches after R3.

---
### M-R3-6 — `bcrypt` work factor not pinned to ≥12; default may be 10

**File:** `server/auth.js` L81, L107, L306, L312
**Severity:** Medium
**Impact:** `bcryptjs.hash(pw)` without an explicit `saltRounds` argument uses bcryptjs's default of **10**. OWASP 2025 ASVS L2 calls for **bcrypt cost ≥ 12** (or Argon2id with mem≥19MiB, iter≥2, parallel=1). The difference is the cost of mass-cracking a stolen hash dump: roughly 4× per +2 cost increment.

**WRONG (current, conceptual):**
```js
const hash = await bcrypt.hash(password, 10);   // or no second arg, which is 10
```

**RIGHT:**
```js
const BCRYPT_COST = 12;
const hash = await bcrypt.hash(password, BCRYPT_COST);
```

Rehash-on-login (transparent upgrade): when a user logs in successfully, if their stored hash starts with `$2a$10$` or lower, rehash at the new cost and persist:

```js
// inside login success branch:
const currentCost = Number(user.passwordHash.match(/^\$2[aby]\$(\d+)\$/)?.[1] || 0);
if (currentCost < BCRYPT_COST) {
  const newHash = await bcrypt.hash(submittedPassword, BCRYPT_COST);
  updateUserPasswordHash(user.id, newHash);
}
```

**Verification:**
```bash
node -e "console.log(require('bcryptjs').getRounds(require('fs').readFileSync('./data/users.json','utf8').match(/\\\$2[aby]\\\$\\d+\\\$[^"]+/)[0]))"
# Expect: 12 (after first login post-R3)
```

---

### M-R3-7 — JWT access-token lifetime not bounded to ≤15 min (currently looks long-lived)

**File:** `server/auth.js` L126 (jwt.sign), the one `expiresIn` occurrence
**Severity:** Medium (subsumed into C-R3-1 but worth calling out separately)
**Impact:** A long-lived access token (anything > 1h) negates much of C-R3-1's value: even with a revocation list, the window between "I clicked Revoke" and "the token actually expires from the attacker's hand" is bounded by the token's natural lifetime. 15 minutes is the standard balance between server load (refresh churn) and revocation-latency.

**WRONG:**
```js
jwt.sign(payload, secret, { expiresIn: '8h' })   // or 24h, or 7d
```

**RIGHT:**
```js
jwt.sign(payload, secret, { expiresIn: '15m', algorithm: 'HS256' })
```

Refresh token carries the 14-day lifetime, in the more-restricted `hl_refresh` cookie.

---

### M-R3-8 — No account-lockout notification to user

**Surface:** R1 C-8 throttle is silent to the victim
**Severity:** Medium
**Impact:** When an attacker triggers the 5/15min throttle on a victim's username, the victim has no signal that someone is trying. By the time they notice "I can't log in" they may have lost the account through a parallel attack (password reuse on a leaked dump, social engineering on customer support, etc.).

**WRONG (current):** silent throttle.

**RIGHT — fire-and-forget email + audit-log notification:**

```js
// In the login throttle middleware, when the 5th failure happens:
if (failureCount === LOCKOUT_THRESHOLD) {
  logger.warn('account_lockout', { username, ip: req.ip });
  const user = getUserByUsername(username);
  if (user?.email && lastLockoutEmail(user.id) < Date.now() - 60*60*1000) { // max 1 email/hour/user
    transporter.sendMail({
      from: process.env.SMTP_FROM || 'homelabarr@localhost',
      to: user.email,
      subject: 'HomelabARR — login lockout',
      text: 'Your HomelabARR account was just locked due to repeated wrong-password attempts. ' +
            'If this was you, wait 15 minutes and try again. If not, log in and revoke all sessions: ' +
            process.env.PUBLIC_BASE_URL + '/settings#sessions'
    }).catch(() => {});
    markLockoutEmailed(user.id);
  }
}
```

**Verification:** trigger lockout, check email stub log for the message body.

---

### M-R3-9 — Reset/refresh tokens not stored hashed (defense-in-depth)

**Surface:** new tables introduced in C-R3-1 / H-R3-4
**Severity:** Medium
**Impact:** If the sessions or reset-token DB is leaked (backup blob, disk image), cleartext tokens grant immediate access. C-R3-1 already specifies `refresh_hash = sha256(refresh)` (good). H-R3-4 specifies `hash = sha256(reset_token)` (good). This finding is **belt-and-braces verification** that the agent didn't shortcut to storing the cleartext — explicitly documented in this round so a code reviewer catches it on PR.

**RIGHT:** as written in C-R3-1 and H-R3-4. Add a unit test:
```js
// tests/sessions.test.js
it('never stores cleartext refresh tokens', () => {
  const { jti, refresh } = createSession({ userId: 'u1' });
  const row = db.prepare('SELECT refresh_hash FROM sessions WHERE jti = ?').get(jti);
  expect(row.refresh_hash).not.toEqual(refresh);
  expect(row.refresh_hash).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
});
```

---

### L-R3-10 — `hl_csrf` cookie not rotated on privilege change

**Severity:** Low
**Impact:** Standard practice: rotate the CSRF token on login, on password change, on MFA enable/disable, and on session revocation. Current behavior — set once on login, persists. Easy to fix at the same time C-R3-1 lands.

**RIGHT (inside login + change-password + mfa-verify):**
```js
const newCsrf = crypto.randomBytes(32).toString('hex');
res.cookie('hl_csrf', newCsrf, { secure: true, sameSite: 'strict', path: '/', maxAge: 14*24*60*60*1000 });
```

---

### L-R3-11 — No "Sign me out everywhere" on password change

**Severity:** Low
**Impact:** When a user changes their password via `/auth/change-password` (R1 path, server/auth.js:298), other active sessions are NOT revoked. A user who suspects compromise and changes their password leaves the attacker logged in.

**RIGHT (inside change-password success branch):**
```js
revokeAllForUser(req.user.sub, /* exceptJti */ req.user.jti);
// rotate CSRF (L-R3-10)
```

---

### L-R3-12 — `SECURITY.md` doesn't document the auth-flow model

**Severity:** Low
**Impact:** Future contributors / pen-testers won't know the intended threat model. After Round 3 ships, the model is non-trivial.

**RIGHT — SECURITY.md addition:**
```markdown
## Authentication & Session Model

- Access token: HS256 JWT, 15-min TTL, carried in HttpOnly+Secure+SameSite=Strict cookie `hl_session`, path `/`.
- Refresh token: opaque 256-bit base64url string, SHA-256 hashed at rest, 14-day TTL, carried in HttpOnly+Secure+SameSite=Strict cookie `hl_refresh`, path `/api/auth/refresh`.
- CSRF: 256-bit token in non-HttpOnly `hl_csrf` cookie; echo via `X-CSRF-Token` header; `X-Requested-With: XMLHttpRequest` also required. Constant-time compare.
- Sessions tracked by `jti` in `data/sessions.db` (SQLite). Revocation = setting `revoked_at` on the row.
- MFA: TOTP (otpauth, 30s window, ±1 step skew); 10 single-use backup codes (bcrypt-hashed at rest). Required for role=admin; opt-in otherwise.
- Password storage: bcrypt cost 12; transparent rehash-on-login for legacy hashes.
- Password reset: 30-min single-use 256-bit token, SHA-256 hashed at rest, scoped to one user, all sessions revoked on success.
- Account lockout: 5 failures / 15min per IP+username; email notification to victim on threshold (rate-limited per user/hour).
```

---
## §4 — Verification matrix (run after Round 3 ships)

```js
// Paste into DevTools on https://ce-demo.homelabarr.com/?_v=r3verify after R3 deploys.
// Log in as admin/<demo-password> via the UI first.
(async () => {
  const nc = () => '?_=' + Date.now() + Math.random();
  const r = {};

  // 1. Cookies post-login
  const cookies = document.cookie;
  r.has_csrf_cookie = /hl_csrf=/.test(cookies);
  r.no_session_visible = !/hl_session=/.test(cookies);
  r.no_refresh_visible = !/hl_refresh=/.test(cookies);  // also HttpOnly

  // 2. Session list endpoint
  const csrf = cookies.match(/hl_csrf=([^;]+)/)?.[1] || '';
  const sessHdrs = { 'X-Requested-With': 'XMLHttpRequest' };
  const sess = await fetch('/api/auth/sessions' + nc(), { credentials: 'include', headers: sessHdrs, cache: 'reload' });
  r.sessions_status = sess.status;
  if (sess.ok) {
    const j = await sess.json();
    r.sessions_count = j.sessions?.length;
    r.current_jti_marked = j.sessions?.some(s => s.is_current);
    r.sessions_have_ua = j.sessions?.every(s => 'user_agent' in s);
  }

  // 3. Refresh endpoint
  const refr = await fetch('/api/auth/refresh' + nc(), {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-Token': csrf },
    cache: 'reload'
  });
  r.refresh_status = refr.status;  // expect 200

  // 4. MFA setup endpoint exists
  const mfa = await fetch('/api/auth/mfa/setup' + nc(), {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-Token': csrf },
    cache: 'reload'
  });
  r.mfa_setup_status = mfa.status;  // expect 200 (not 404)
  if (mfa.ok) {
    const j = await mfa.json();
    r.mfa_has_qr = typeof j.qr === 'string' && j.qr.startsWith('data:image');
    r.mfa_has_uri = typeof j.uri === 'string' && j.uri.startsWith('otpauth://');
  }

  // 5. Forgot password endpoint exists & doesn't enumerate
  const fpExist = await fetch('/api/auth/forgot-password' + nc(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ username: 'admin' }),
    cache: 'reload'
  });
  const fpUnknown = await fetch('/api/auth/forgot-password' + nc(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ username: 'definitely-not-a-real-user-' + Math.random() }),
    cache: 'reload'
  });
  r.forgot_existing_status = fpExist.status;
  r.forgot_unknown_status = fpUnknown.status;
  r.forgot_no_enumeration = fpExist.status === fpUnknown.status;  // both 204

  // 6. Access-token short lifetime (decode hl_session would require JS access — instead probe behavior)
  // Decode the JWT exp via API: /api/auth/me probably returns expiry; otherwise document manual.
  r.access_token_lifetime_note = 'manual: decode hl_session in Application > Cookies via jwt.io; exp should be ~now+900s';

  // 7. Negative tests
  // 7a) /api/auth/refresh without CSRF → 403
  const badRefr = await fetch('/api/auth/refresh' + nc(), { method: 'POST', credentials: 'include', cache: 'reload' });
  r.refresh_no_csrf_status = badRefr.status;  // expect 403

  // 7b) /api/auth/sessions/<other-user-jti> → 404 (or 403)
  const fakeJti = '0'.repeat(32);
  const fakeDel = await fetch('/api/auth/sessions/' + fakeJti + nc(), {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-Token': csrf },
    cache: 'reload'
  });
  r.delete_unknown_jti_status = fakeDel.status;  // expect 404

  console.table(r);
  return r;
})();
```

**Pass criteria:**
- `has_csrf_cookie`
- `no_session_visible` (`hl_session` HttpOnly)
- `no_refresh_visible` (`hl_refresh` HttpOnly)
- `sessions_status === 200`
- `sessions_count >= 1` and `current_jti_marked === true`
- `refresh_status === 200`
- `mfa_setup_status === 200`
- `mfa_has_qr === true` and `mfa_has_uri === true`
- `forgot_existing_status === 204` and `forgot_unknown_status === 204` (no enumeration)
- `refresh_no_csrf_status === 403`
- `delete_unknown_jti_status === 404`

Manual confirms:
- DevTools → Application → Cookies: `hl_session` Max-Age ≈ 900s; `hl_refresh` Max-Age ≈ 1209600s; both HttpOnly + Secure + SameSite=Strict; `hl_refresh` Path=/api/auth/refresh
- Refresh-token replay test: capture `hl_refresh`, refresh once (success), replay old value → 401 + both cookies cleared
- TOTP end-to-end: setup endpoint returns QR → scan in authenticator app → POST /api/auth/mfa/verify with current code → 200 → log out → login again now requires the code

---

## §5 — Out of scope (queued)

- **Round 4** — Docker socket proxy adoption + container hardening: replace `/var/run/docker.sock` mount with `tecnativa/docker-socket-proxy` allow-listing only the endpoints HomelabARR actually uses; finish per-container `cap_drop: [ALL]`, `read_only: true`, `security_opt: [no-new-privileges:true]`, `pids_limit`, `mem_limit`.
- **Round 5** — Dependency hygiene (`npm audit`, transitive CVEs, lockfile assertion, Dependabot/Renovate, sigstore/SLSA).
- **Round 6** — Structured logging + abuse detection + alerting hooks.
- **Round 7** — Secrets management (Vault / SOPS / Docker secrets).
- **Round 8** — Production hardening deployment runbook.
- **Round 2.6 (optional)** — Trusted Types enforcement rollout (deferred from R2).

---

## §6 — Owner pile (do not delegate)

1. **Decide SMTP transport** for ce-demo: keep console-stub for the demo, or wire real SMTP (e.g., Mailgun/Postmark sandbox) so reset emails actually deliver. SECURITY.md should document the demo's stub behavior plainly so end users don't think reset is silently broken.
2. **MFA mandatory-for-admin migration**: communicate to existing admins before deploying R3 that they'll be prompted to enroll TOTP on next login. Pre-stage backup codes on a paper copy because demo VMs lose state.
3. **Choose `PUBLIC_BASE_URL`** for reset-link generation; must be the public domain not `localhost`.
4. **Decide policy on email field**: current `user` model may not require email. R3 endpoints work without email but reset/lockout-notification require it. Decide: mandatory at signup, or optional with degraded reset experience (operator log only).
5. **SQLite or JSON?** C-R3-1 chooses SQLite (`better-sqlite3`) because in-memory or JSON would lose sessions on container restart. Confirm this aligns with CE's storage philosophy; if JSON is preferred for portability, swap the storage layer but keep the contract.

---

## §7 — Deliverable

**Branch:** `security/round-3-auth-lifecycle`
**PR title:** `Round 3 — Auth lifecycle hardening: refresh tokens, session revocation, TOTP MFA, password reset`

**Squash-commit body template:**
```
Round 3 security audit fixes — auth flow hardening

CRITICAL
- C-R3-1: Short-lived (15min) access JWTs with jti; sliding 14d refresh tokens
  hashed at rest in better-sqlite3 sessions table; revocation list checked on every verify

HIGH
- H-R3-2: GET/DELETE /api/auth/sessions + revoke-all endpoint + UserSettings UI
- H-R3-3: TOTP MFA with otpauth + 10 single-use backup codes (bcrypt-hashed);
          mandatory for role=admin, opt-in otherwise; two-step login flow with ticket
- H-R3-4: /auth/forgot-password + /auth/reset-password with 30min SHA-256-hashed tokens,
          no user enumeration, all sessions revoked on success
- H-R3-5: timingSafeEqual on every token compare (CSRF, refresh, reset, backup codes)

MEDIUM
- M-R3-6: bcrypt cost 12; transparent rehash-on-login for legacy < 12
- M-R3-7: access JWT expiresIn = 15m, HS256 explicit
- M-R3-8: lockout email notification (rate-limited per user/hour)
- M-R3-9: unit test asserting cleartext refresh tokens are never persisted

LOW
- L-R3-10: hl_csrf rotated on login/password-change/mfa-toggle
- L-R3-11: revokeAllForUser(except current) on change-password success
- L-R3-12: SECURITY.md auth model section

New deps: better-sqlite3, otpauth, qrcode, nodemailer
Breaking: existing admin sessions will require MFA enrollment on next login.
          Old long-lived hl_session cookies invalidated; users re-login once.

Verification: §4 of round-3 audit MD must pass on ce-demo.homelabarr.com.
```

---

## §8 — End of Round 3

When the agent reports shipped:
1. Re-run §4 verification matrix against live with cache-busting.
2. If pass: write Round 4 (Docker socket proxy + container hardening) without asking.
3. If drift: write Round 3.5 correction.

**No questions. Loop continues.**
