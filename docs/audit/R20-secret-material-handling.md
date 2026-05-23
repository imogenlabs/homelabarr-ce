# R20 — In-App Secret Material Handling

> **Round:** 20 / loop continuing
> **Repo:** smashingtags/homelabarr-ce
> **Main HEAD:** c4ea08d0b8 (2026-05-23T04:05:40Z)
> **R19 status:** closed clean (verified live + source). 19 rounds, 218+ findings shipped.
> **Scope:** in-app handling of secret material — JWT key lifecycle, SQLcipher key lifecycle, default-admin-password flow, alert-webhook signing, log/audit/alert sanitization. Software layer only.
> **Frame:** ce-demo == backbone == eight.ly funnel posture. Rotation that doesn't actually rotate, or doc claims that don't match code, are the kind of finding a paying customer will use against the credibility story.

---

## §0. Pre-flight

Main HEAD: \`c4ea08d\` — R19 merge. Drift monitor (R18 L-3, deploy-drift.yml every 30 min) is operational; no live freshness probe needed at §0 going forward unless an issue surfaces.

---

## §1. Goal

Audit the secret-material lifecycle the application actually implements vs:
1. What SECURITY.md tells prospects.
2. What the rotation scripts promise operators.
3. What the compose declares as available secrets.

The runtime contract (R19) is now strong: Docker secrets are file-mounted at /run/secrets, the loader exists, cache and force-fresh paths exist, key files are owned by the right uid. R20 looks one layer deeper: what does the **application code** do with those keys, and does it match the operator/prospect-facing story.

---

## §2. Current state — what is actually shipping

**server/secrets.js** (29 lines): reads from \`SECRET_ROOT\` (default \`/run/secrets\`), in-memory Map cache, falls back to \`process.env[NAME]\`, exports \`readSecret\` (cached) and \`readSecretFresh\` (uncached). Throws when required and missing.

**server/auth.js**: bcryptjs cost 12; rehash-on-login when stored cost < BCRYPT_COST; JWT signed and verified with single key bound at module load; cookie reads (\`hl_session\`) only.

**server/index.js**: cookie writes for \`hl_session\`, \`hl_refresh\`, \`hl_csrf\` — all with httpOnly:true (csrf:false intentionally), secure:production, sameSite:'strict', path-scoped refresh cookie, csrf double-submit, refresh JTI per token. Strong.

**server/audit.js**: hash chain, HMAC, redaction wired.

**server/log.js**: winston with redaction patterns covering password/token/secret/authorization/cookie keys.

**server/alert.js**: reads ALERT_WEBHOOK_SECRET, HMAC-signs payload as \`X-HomelabARR-Signature: sha256=...\`, cooldown per (event,actor,ip), 3-second fetch timeout.

**scripts/rotate-jwt-key.sh, rotate-sqlcipher-key.sh, check-secret-age.sh**: present, well-formed.

Compose ships 5 secret mounts: jwt_key_current, jwt_key_previous, default_admin_password, alert_webhook_secret, sqlcipher_key.

---

## §3. Findings

### H-1 — `jwt_key_previous` is mounted as a Docker secret but never read by auth.js; rotate-jwt-key.sh promises operators that "previous key preserved (valid until REFRESH_TOKEN_TTL expires)" — the code does not honor that promise

**Severity:** High (correctness + operator-trust)
**Surface:** server/auth.js, scripts/rotate-jwt-key.sh, homelabarr.yml secrets block
**Why it matters:**
- `homelabarr.yml` mounts `jwt_key_previous` as a secret file.
- `scripts/rotate-jwt-key.sh` copies `jwt_key_current` to `jwt_key_previous` before generating a new current key, and prints to the operator: *"Previous key preserved in jwt_key_previous (valid until REFRESH_TOKEN_TTL expires)."*
- `server/auth.js` line 14: `const JWT_SECRET = readSecret('JWT_SECRET', { required: false }) || readSecret('JWT_KEY_CURRENT', { required: true });` — module-level const, **never reads `JWT_KEY_PREVIOUS`**.
- `server/auth.js` line 157: `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })` — verify only uses the single current key.
- Result: after rotation, every token signed with the previous key fails verification immediately. The "previous key valid until refresh TTL expires" promise is false.
- Operators following the script's documented procedure will believe sessions persist across rotation. They don't.

**WRONG (current — server/auth.js:14, 157):**
```js
const JWT_SECRET = readSecret('JWT_SECRET', { required: false })
  || readSecret('JWT_KEY_CURRENT', { required: true });
// ...
const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
```

**RIGHT:**
```js
import { readSecretFresh } from './secrets.js';

function getActiveKeys() {
  // Prefer fresh reads so rotation lands on next request without restart.
  const current = readSecretFresh('JWT_SECRET', { required: false })
    || readSecretFresh('JWT_KEY_CURRENT', { required: true });
  const previous = readSecretFresh('JWT_KEY_PREVIOUS', { required: false }) || null;
  return { current, previous };
}

function signToken(payload) {
  const { current } = getActiveKeys();
  return jwt.sign(payload, current, { algorithm: 'HS256', expiresIn: ACCESS_TOKEN_TTL });
}

function verifyToken(token) {
  const { current, previous } = getActiveKeys();
  try {
    return jwt.verify(token, current, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name !== 'JsonWebTokenError' || !previous) throw err;
    // Only fall through to previous on signature failure, not on expired/malformed.
    return jwt.verify(token, previous, { algorithms: ['HS256'] });
  }
}
```

Couple this with a small TTL cap on previous-key acceptance: e.g., previous-key accepted only when token `iat` is within last 24h, to prevent indefinite acceptance of a leaked old key.

Add a unit test that rotates the keys (write new current, write previous = old current), verifies that a token signed before rotation still verifies, and that a token whose iat is older than the cap is rejected even with previous.

---

### H-2 — Module-level `const` capture of JWT_SECRET defeats rotation entirely; rotate-jwt-key.sh tells operator "Restart backend: docker compose restart backend" — restart drops all in-flight sessions

**Severity:** High (operability)
**Surface:** server/auth.js:14, scripts/rotate-jwt-key.sh:12
**Why it matters:** Even if H-1 is fixed by adding previous-key acceptance, the current key is captured at module load. After rotate-jwt-key.sh writes new current, the running process is still using the old key for *signing*. Every new token after rotation is signed with the old key (now jwt_key_previous), defeating the rotation goal: an attacker who stole the old key continues to sign valid tokens until restart. The script's documented restart step is a brute-force fix that drops every active session.

**FIX:**
1. Use `readSecretFresh` in `signToken` and `verifyToken` (above).
2. Add a periodic background poll: every N seconds, call `readSecretFresh` on the key files; if the value changed, log an audit event `key.rotation.detected`. This gives operators visibility that rotation landed without restart.
3. Update `scripts/rotate-jwt-key.sh`: replace the "Restart backend" echo with "Backend will pick up new key within ~60 seconds; previous key remains valid for the current refresh window."

---

### H-3 — SECURITY.md claims password storage uses Argon2id work-factor 12; code uses bcryptjs cost 12

**Severity:** High (doc-vs-code drift; credibility)
**Surface:** SECURITY.md (lines ~2500), server/auth.js:1, server/auth.js:12
**Why it matters:** SECURITY.md states: *"Argon2id, work factor 12, meets OWASP 2025 ASVS L2."* Code:
- `server/auth.js:1`: `import bcrypt from 'bcryptjs';`
- `server/auth.js:12`: `const BCRYPT_COST = 12;`
- All hash/compare/rehash calls use bcryptjs.

bcryptjs cost 12 is acceptable for OWASP ASVS L2 (bcrypt is on the allowed list) — but the public doc says Argon2id. A prospect or auditor who reads SECURITY.md, then runs `cat package.json` or `grep -r argon2 server/`, will find the discrepancy immediately. Credibility hole.

**FIX (pick one and ship):**

**Option A (recommended, lowest risk):** Update SECURITY.md to accurately describe what ships: *"Password hashing: bcryptjs with cost factor 12. Transparent rehash-on-login when stored cost is below current threshold. Meets OWASP ASVS L2 (bcrypt is on the ASVS allowed list)."*

**Option B (deferred, higher risk):** Migrate to argon2 (the `argon2` npm package, native bindings or wasm fallback). Requires rehash-on-login chain to handle both old bcrypt hashes and new argon2 hashes during the migration window, plus careful native-deps handling in the Dockerfile. Worth tracking as a roadmap item but **not** an R20 ship-blocker.

Recommend A for R20 and add Option B to the R22 owner-closeout as a tracked future item.

---

### H-4 — `SECRETS_DIR` and `SECRET_ROOT` are read from env but secret files are never `.trim()`'d before use

**Severity:** High (latent bug; operator footgun)
**Surface:** server/secrets.js
**Why it matters:** secrets.js reads file contents and returns them as-is. `openssl rand -base64 48 > jwt_key_current` produces a trailing newline. Without `.trim()`, every secret has `\n` appended:
- HMAC keys: HMACs change because of trailing byte.
- JWT secret: signing succeeds but key material differs from the value an external tool would compute if it strips the newline.
- SQLcipher key: PRAGMA key with trailing newline may or may not match depending on driver behavior.

The bug is "works because nothing else strips," but anything that compares the in-process value to an externally computed value (e.g., a webhook receiver running `openssl dgst -hmac` over a file the operator catted with `cat` then trimmed) will silently mismatch.

**FIX (server/secrets.js):**

```js
const raw = await readFile(path, 'utf8');
return raw.replace(/\r?\n$/, '');   // strip exactly one trailing newline, preserve internal whitespace
```

Apply to both the cached and fresh paths. Add a one-line unit test: secret file with trailing \n returns value without \n; secret file with no trailing newline returns value unchanged.

---

### M-1 — server/alert.js silently swallows webhook errors

**Severity:** Medium
**Surface:** server/alert.js:22-24
**Why it matters:**
```js
try {
  await fetch(ALERT_HOOK_URL, { method: 'POST', headers, body, signal: AbortSignal.timeout(3000) });
} catch {}
```
If the webhook receiver is down, DNS broken, signature mismatched, or rate-limited, the audit trail has zero evidence. Operators cannot tell whether the alert pipeline is healthy. The threat model and IR runbook both reference webhook alerts as the primary out-of-band signal — silent failure breaks that promise.

**FIX:**
```js
try {
  const r = await fetch(ALERT_HOOK_URL, { method: 'POST', headers, body, signal: AbortSignal.timeout(3000) });
  if (!r.ok) {
    auditEvent({ event: 'alert.webhook.failed', status: r.status, event_kind: payload.event });
  }
} catch (err) {
  auditEvent({ event: 'alert.webhook.error', message: err.message?.slice(0, 200), event_kind: payload.event });
}
```

Note: write the failure to the local audit log (not back through the alert webhook — infinite loop). Add a healthcheck endpoint (`/health/alerts`) that returns failure rate over the last hour for monitoring tooling to pick up.

---

### M-2 — server/alert.js does not validate ALERT_WEBHOOK_URL scheme

**Severity:** Medium (operator footgun + SSRF-adjacent)
**Surface:** server/alert.js:6
**Why it matters:** `ALERT_WEBHOOK_URL` is taken straight from env. An operator who sets `ALERT_WEBHOOK_URL=http://internal-host/...` (typo, copy-paste, or genuine misconfiguration) sends signed alert payloads in cleartext over the network. An operator who sets `ALERT_WEBHOOK_URL=file:///etc/passwd` triggers fetch behavior that depends on the runtime's fetch implementation.

**FIX:**
```js
const ALERT_HOOK_URL = (() => {
  const raw = process.env.ALERT_WEBHOOK_URL || '';
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') {
      console.error('[alert] ALERT_WEBHOOK_URL must be https; refusing to enable webhook');
      return '';
    }
    return u.toString();
  } catch {
    console.error('[alert] ALERT_WEBHOOK_URL is not a valid URL; refusing to enable webhook');
    return '';
  }
})();
```

Allow http: only for explicit `ALERT_WEBHOOK_ALLOW_INSECURE=true` env override (documented for LAN-only setups, defaulted off).

---

### M-3 — server/alert.js sends payload with no field allowlist; sensitive fields could leak to webhook

**Severity:** Medium
**Surface:** server/alert.js:17
**Why it matters:** `const body = JSON.stringify({ ...payload, source: 'homelabarr-ce', ts: ... })`. The payload object is spread wholesale. If a caller passes `{ event: 'login.locked', actor: 'alice', password_attempt: 'hunter2' }` (hypothetical or accidental), the password attempt goes to the webhook. The webhook receiver is operator-controlled (good) but the receiver may log the body to disk or forward to Slack/Discord (less good).

**FIX:** Define an allowlist of payload fields per event type and drop unknown keys:

```js
const ALLOWED_FIELDS = new Set(['event', 'actor', 'ip', 'user_agent', 'reason', 'count', 'window_seconds']);
const safe = Object.fromEntries(Object.entries(payload).filter(([k]) => ALLOWED_FIELDS.has(k)));
const body = JSON.stringify({ ...safe, source: 'homelabarr-ce', ts: new Date().toISOString() });
```

---

### M-4 — `API_KEY_HMAC_KEY` falls back to `JWT_SECRET` when not set; one key compromise affects both surfaces

**Severity:** Medium (separation of concerns)
**Surface:** server/auth.js:18
**Why it matters:** `const API_KEY_HMAC_KEY = readSecret('API_KEY_HMAC_KEY', { required: false }) || JWT_SECRET;`. If an operator does not set API_KEY_HMAC_KEY, the same secret is used for two purposes: signing user JWTs and HMACing API keys. A leak of JWT_SECRET also compromises every issued API key's HMAC verifier. A clean security architecture separates these.

**FIX:** Either require API_KEY_HMAC_KEY explicitly when API_KEY feature is enabled, or derive it deterministically from JWT_SECRET using HKDF with a different info-string so a leak of the derived value doesn't reveal the root:

```js
import { hkdfSync } from 'node:crypto';
const API_KEY_HMAC_KEY = readSecret('API_KEY_HMAC_KEY', { required: false })
  || Buffer.from(hkdfSync('sha256', JWT_SECRET, Buffer.alloc(0), 'homelabarr-api-key-hmac/v1', 32)).toString('hex');
```

Both directions break the "one leak compromises both" property. Pick one. Document the chosen path in SECURITY.md.

---

### M-5 — check-secret-age.sh exists but is not wired to any schedule or healthcheck

**Severity:** Medium (operability)
**Surface:** scripts/check-secret-age.sh, .github/workflows/, docker-compose healthcheck
**Why it matters:** The script is well-designed (jwt 90d / sqlcipher 180d / alert-webhook 365d, RC=2 stale, RC=1 missing) but nothing invokes it. Rotation cadence is owner-discipline-dependent. The R12 chaos-engineering work and R14 IR runbook both implicitly assume keys get rotated on a schedule; without enforcement, this is aspirational.

**FIX (pick one):**

**Option A (lowest friction):** add a GitHub Action that runs check-secret-age.sh on schedule (weekly) and opens an issue when RC != 0. This requires the workflow to read the actual secret files, which is not possible in CI (secrets are on the production host). So instead, ship a tiny endpoint:

**Option B (recommended):** add `GET /health/secrets` to the backend that runs the same checks against `/run/secrets/*` and returns 200/503 plus JSON `{ jwt_key_age_days: 47, sqlcipher_key_age_days: 102, alert_webhook_secret_age_days: 230, stale: [], missing: [] }`. Hit it from your existing monitoring/uptime tooling.

**Option C:** wire check-secret-age.sh into the docker healthcheck so the container goes unhealthy when a key is stale. Aggressive — would cause auto-restart loops if not paired with a longer threshold or a separate `STALE_BUT_USABLE` warning state.

Recommend B + the existing local script for operators who prefer cron.

---

### M-6 — rotate-sqlcipher-key.sh relies on PRAGMA rekey on next boot; window between write and boot leaves DB in unrecoverable state if old key is also rotated out

**Severity:** Medium (operator footgun)
**Surface:** scripts/rotate-sqlcipher-key.sh
**Why it matters:** Script writes the new key to `sqlcipher_key` immediately, but PRAGMA rekey only runs on next boot. Between the write and the boot, if the container crashes or the old key file is rotated out by anything else (file owner cleanup, manual operator mistake), the database is encrypted with the old key and the only file on disk is the new key.

**FIX:**
1. Script writes the new key to `sqlcipher_key.new` (not the live filename) and prints: *"Restart the backend; on healthy boot, the rekey will complete and the old key file will be archived."*
2. Backend on boot:
   - If `sqlcipher_key.new` exists and `sqlcipher_key` exists: PRAGMA key with old, PRAGMA rekey to new, on success: `mv sqlcipher_key sqlcipher_key.previous && mv sqlcipher_key.new sqlcipher_key`. Audit event `db.rekey.success`.
   - On failure: audit event `db.rekey.failed`, refuse to start (operator must intervene).
3. Add unit test that simulates the new+current-both-present case.

This requires a small code change in db.js. R20 ships the spec; the script change can be one PR with the db.js change in the same merge.

---

### L-1 — server/alert.js cooldown key uses `payload.actor || payload.ip || 'anon'` — an attacker who knows this can suppress alerts about themselves by spoofing actor

**Severity:** Low (defense-in-depth)
**Surface:** server/alert.js:13
**Why it matters:** Cooldown is keyed on `event|actor|ip|'anon'` to prevent legitimate flooding. An adversary on the same IP who triggers a benign-event with attacker-chosen actor field would set the cooldown for that key, causing subsequent malicious-event alerts on the same key to be suppressed for the cooldown window.

**FIX:** key on `event|ip` (not actor), or include a salt of `event_kind:severity` so a low-severity event cannot suppress a high-severity event with the same actor/IP.

---

### L-2 — auth.js has 16 `console.*` calls bypassing the configured winston logger; potential redaction-bypass surface

**Severity:** Low (defense-in-depth, code hygiene)
**Surface:** server/auth.js
**Why it matters:** server/log.js sets up winston with redaction patterns for password/token/secret/authorization/cookie. Direct `console.log` / `console.error` calls bypass redaction. Reviewing the 16 calls in auth.js suggests most are operational (startup, errors), not data-bearing — but the pattern is fragile. A future contributor adding a `console.log(user)` for debug would leak the password hash and email.

**FIX:** Replace all 16 `console.*` in auth.js with the winston logger imported from log.js. Add an ESLint rule `no-console` (with override for specific allowed files: index.js startup banner, log.js itself) to prevent regression.

---

### L-3 — `default_admin_password` secret has no rotation script or stale-check entry

**Severity:** Low
**Surface:** homelabarr.yml, scripts/check-secret-age.sh
**Why it matters:** The default admin password is intended to be one-shot: set before first boot, used on first login, then changed by the operator and the file effectively becomes irrelevant. But it's still a mounted secret with no age tracking. If an operator never logs in and changes it, the default lives on the disk indefinitely.

**FIX:** Either:
- Document in SECURITY.md that default_admin_password is single-use and the operator should `rm /run/secrets/default_admin_password` (or remove from compose) after first login, OR
- On successful first-login password change, the backend logs an audit event `default_admin_password.consumed` and check-secret-age.sh treats existence of this audit event as "default password no longer relevant."

---

### INFO-1 — Cookie hygiene is excellent

No action. Documented for completeness. `hl_session` and `hl_refresh` use `httpOnly: true, secure: production, sameSite: 'strict'`, refresh cookie is path-scoped to `/api/auth/refresh`, CSRF double-submit with crypto.randomBytes(32). This is what auditors look for and it's all present.

---

### INFO-2 — `algorithms: ['HS256']` allowlist in jwt.verify is correctly defensive

No action. Prevents JWT-none and algorithm-confusion attacks. Documented for completeness.

---

## §4. Verification commands (agent-runnable after ship)

```bash
# 1. JWT verify path uses previous-key fallback
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/auth.js \
  | grep -E "(JWT_KEY_PREVIOUS|getActiveKeys|previous.*verify)" | head
# expected: at least one match

# 2. signToken/verifyToken use readSecretFresh, not module-level const
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/auth.js \
  | grep -E "readSecretFresh"
# expected: at least 2 hits (sign + verify)

# 3. SECURITY.md describes bcrypt (or argon2 if option B was chosen) — must match auth.js import
DOC=$(curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/SECURITY.md)
CODE=$(curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/auth.js)
echo "$DOC" | grep -oiE 'argon2|bcrypt' | head -1
echo "$CODE" | grep -oiE 'argon2|bcrypt' | head -1
# expected: same value from both

# 4. secrets.js trims trailing newline
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/secrets.js \
  | grep -E "(\\.trim|replace.*\\\\r.*\\\\n)"
# expected: at least one match

# 5. alert.js logs webhook failures
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/alert.js \
  | grep -E "(alert\\.webhook\\.failed|alert\\.webhook\\.error)"
# expected: at least 2 matches

# 6. alert.js validates URL scheme
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/alert.js \
  | grep -E "(new URL|protocol.*https)"
# expected: at least one match

# 7. alert.js allowlist filter
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/alert.js \
  | grep -E "(ALLOWED_FIELDS|allowlist|Set\\(\\[)"
# expected: at least one match

# 8. /health/secrets endpoint registered
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/index.js \
  | grep -E "/health/secrets"
# expected: at least one route registration

# 9. db.js handles sqlcipher_key.new -> rekey -> swap atomic
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/db.js \
  | grep -iE "(\\.new|PRAGMA rekey)"
# expected: handles the .new sidecar file path

# 10. ESLint no-console rule active
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/.eslintrc.json \
  | grep -i "no-console" || \
  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/eslint.config.js \
  | grep -i "no-console"
# expected: present
```

After ship, run a smoke test of the JWT previous-key path:

```bash
# on ce-prod (sanitized; replace paths as needed)
# 1. Capture current key value
OLD=$(cat /run/secrets/jwt_key_current)
# 2. Sign a test token via the running backend (login flow)
# 3. Trigger rotation
bash /opt/homelabarr/scripts/rotate-jwt-key.sh
# 4. Without restarting, attempt to verify the pre-rotation token
#    (call any authenticated endpoint with the pre-rotation cookie)
# expected: 200, not 401
# 5. Confirm audit log has 'key.rotation.detected' event
grep key.rotation.detected /var/log/homelabarr/audit.log
```

---

## §5. Out of scope

- Argon2id migration (deferred per H-3 Option A; tracked as roadmap item).
- HSM / KMS integration. Docker secrets are the boundary in this round.
- Secret material in transit between containers (covered by R19 — internal network is `internal: true`).
- Cookie hygiene (already excellent — see INFO-1).
- The 25 dependabot vulns triage (carried; R22 will surface).

---

## §6. Owner pile (delta this round)

New items:
- **H-3 Option choice:** confirm Option A (update SECURITY.md to bcrypt). Add argon2id migration to roadmap (R22 closeout).
- **M-4 choice:** require explicit `API_KEY_HMAC_KEY` vs HKDF-derive. Recommend HKDF for zero operator burden.
- **M-5 choice:** /health/secrets endpoint vs cron + script. Recommend endpoint.
- **M-6 rekey-on-boot mechanism:** code change in db.js; not a doc question but worth confirming the agent has bandwidth to ship this alongside the spec.

Carried forward (unchanged):
- Audit-log off-box destination (R7)
- Chaos gameday cadence (R12)
- Tabletop exercise (R14)
- Threat-model residual-risk sign-off (R13)
- 25 dependabot vulns triage (R15)
- License SPDX string for OCI labels (R17 M-3)
- INFRASTRUCTURE.md correction in deploy-pipeline (R19 H-1; production matched repo, deploy doc is stale)

---

## §7. Deliverable

Agent applies §3 H-1 through H-4 and M-1 through M-6 in this repo. L-1 through L-3 are optional within this round, deferrable to follow-up. INFO-1/INFO-2 require no action.

Ship report should include:
1. Confirmation of which option chosen for H-3, M-4, M-5.
2. Whether the M-6 db.js rekey-on-boot landed in the same merge or as a follow-up.
3. The §4 smoke-test result: did the pre-rotation token verify successfully against the post-rotation backend without restart?
4. Any change to SECURITY.md to reflect bcryptjs (H-3 Option A).

---

## §8. End of round

After R20, the secret-material story matches reality: rotation actually rotates, claims match code, alerts are observable, defaults aren't silently long-lived. That closes the "is the application actually doing what its docs say" question for outside observers.

Next rounds (R21 error surface, R22 owner closeout) per the user's "do them all" direction.

Loop continues.
