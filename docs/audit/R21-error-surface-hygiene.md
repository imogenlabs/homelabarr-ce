# R21 — Error Surface Hygiene

> **Round:** 21 / loop continuing
> **Repo:** smashingtags/homelabarr-ce
> **Main HEAD:** cb7755f437 (2026-05-23T05:10:09Z)
> **R20 status:** closed clean (verified live + source). 20 rounds, 235+ findings shipped. Refactor split index.js 5,313 → 262 lines clean. R20 H-4 was a false positive on my part — \`secrets.js\` has had \`replace(/\\s+$/, '')\` since R7. Owning that.
> **Scope:** what the application reveals when things go wrong. Error paths, 404 handlers, body-parser failures, framework fingerprinting, timing differentials on auth.
> **Frame:** ce-demo == backbone == eight.ly funnel posture. A hostile auditor or paying prospect runs \`curl /api/nonexistent\`, \`curl -X DELETE /api/auth/login\`, and \`curl --data 'not-json' /api/auth/login\` within the first 60 seconds. What they see decides credibility.

---

## §0. Pre-flight verification (R20 + refactor close-out)

**Live (ce-demo.homelabarr.com, cache-busted, credentials:'omit'):**

| Check | Result | Pass |
|---|---|---|
| /api/health | 200 application/json | yes |
| /api/health/secrets | 401 (correctly gated) | yes |
| Root /, robots, humans, security.txt, well-known | as per R18/R17.5 | yes |

**Source (main @ cb7755f437):**

| R20 check | Pass |
|---|---|
| jwt_key_previous read in verify path | yes (\`getActiveKeys()\` returns \`{ current, previous }\`) |
| \`readSecretFresh\` called from sign/verify | 5 calls across auth.js + routes/auth.js |
| SECURITY.md hash algo matches code | both bcrypt |
| secrets.js trims trailing whitespace | already present since R7 — false positive in R20 spec |
| alert.js logs webhook failures | yes |
| alert.js validates URL scheme | yes |
| alert.js payload allowlist | yes |
| /health/secrets endpoint gated | yes (401 anon, would be 200 authed) |
| Cookie hygiene preserved through refactor | httpOnly, sameSite:strict, refresh path-scoped, csrf double-submit, all intact |
| jwt.verify algorithms allowlist preserved | yes |
| Refactor: index.js shrunk + routes split | 187,289 → 9,764 chars (-94.8%); 10 route modules |
| rotate-jwt-key.sh language matches code | \"no restart needed; previous accepted up to 24h\" |

**R20 status: CLOSED ✓ (R20 H-4 retracted as false positive)**

**Carry-forward into R21 findings:**
- **CF-1 → L-1:** Doubled \`Content-Type: application/octet-stream, text/plain\` on nginx-served \`/health\` and \`/health/secrets\` (same shape as R18 M-3, but on a different nginx location block).
- **CF-2 → INFO-2:** Nginx intercepts \`/health\` and \`/health/secrets\` returning static \"healthy\" before request reaches backend. Backend secret-age JSON is reachable only via \`/api/health/secrets\` with auth. Likely intentional, captured for operator clarity.

---

## §1. Goal

Audit what the application reveals on error paths. Specifically:

1. Does 4xx return JSON for /api/* paths, or does it leak Express default HTML 404 with framework fingerprinting?
2. Does invalid request-body shape (malformed JSON, wrong content-type, oversized payload) return correct status codes or fall through to 500?
3. Does the auth path leak user-existence via timing or error-message differential?
4. Does any error path reflect attacker-controlled input in a renderable way?
5. Are unhandled promise rejections / uncaught exceptions terminated cleanly with audit-chain integrity preserved?

---

## §2. Current state — what is actually well-handled

The error-handling story is **mostly clean**. Static analysis across 17 server modules:

- **0** stack traces sent to clients anywhere.
- **0** raw error objects in \`res.json(err)\` patterns.
- **0** empty catch blocks.
- **0** XSS-renderable reflections (URL paths come back URL-encoded; no raw HTML reflection found).
- **No SQL injection differential** — login probe with \`username: "' OR 1=1--"\` returns identical response shape and timing to a normal wrong-credentials attempt.
- **No login timing differential beyond noise** — 20-trial median timing for nonexistent-user vs known-user-wrong-password differs by 6.6ms (well within network jitter). Constant-time work performed for both paths.
- **Error-handler middleware registered** in index.js, routes/auth.js, routes/auth-admin.js — three layers of catch-all coverage.

That's the foundation. R21 findings are at the next layer of polish.

---

## §3. Findings

### H-1 — Malformed JSON body returns 500 Internal Server Error instead of 400 Bad Request

**Severity:** High (incorrect status + monitoring noise + client-error masquerades as server-error)
**Surface:** server/index.js (body-parser middleware), error-handler middleware
**Why it matters:**
Live probe: `POST /api/auth/login` with body `not-json` and `Content-Type: application/json` returns:
```
status=500 ct=application/json; charset=utf-8 len=33
body: {"error":"Internal Server Error"}
```
The body-parser `SyntaxError: Unexpected token ... in JSON at position 0` bubbles to the generic error handler which returns 500. Two problems:

1. **Wrong status code.** Malformed JSON is a *client* error (RFC 7807: 400 Bad Request). 500 is reserved for *server* errors. Returning 500 here pollutes monitoring dashboards, makes legitimate 500s harder to diagnose, and breaks the contract a smart client uses to distinguish "I sent bad data, fix and retry" from "server is broken, retry later with backoff."

2. **Hides legitimate 500s.** Any monitoring that alerts on 500-rate now has baseline noise from malformed requests (which can be triggered by any client, intentionally or not).

**FIX (server/index.js, before route registration):**

```js
import express from 'express';
const app = express();

// JSON body parser with explicit error capture
app.use(express.json({
  limit: '256kb',  // also addresses oversized-payload concern
  strict: true,
}));

// Catch body-parser SyntaxError BEFORE it reaches the catch-all error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  next(err);
});

// ... routes ...

// Catch-all 500 handler (last)
app.use((err, req, res, next) => {
  // log via structured logger; never expose err to client
  logger.error({ event: 'request.unhandled', path: req.path, method: req.method, message: err.message?.slice(0, 200) });
  res.status(500).json({ error: 'Internal Server Error' });
});
```

Verification: `curl -X POST -H 'Content-Type: application/json' -d 'not-json' https://ce-demo.homelabarr.com/api/auth/login` should return 400.

---

### H-2 — Express default 404 HTML handler exposed for unknown /api/* paths and unsupported methods on /api/auth/login

**Severity:** High (framework fingerprinting + structural disclosure + content-type mismatch)
**Surface:** server/index.js (404 fall-through), routes/auth.js (method gating)
**Why it matters:**
Live probes:
```
GET /api/__no_such_endpoint_<ts>
  status=404 ct=text/html; charset=utf-8 len=171
  body: <!DOCTYPE html>...<pre>Cannot GET /__no_such_endpoint_<ts></pre>...

DELETE /api/auth/login
  status=404 ct=text/html; charset=utf-8 len=152
  body: <!DOCTYPE html>...<pre>Cannot DELETE /auth/login</pre>...

GET /api/auth/admin/users
  status=404 ct=text/html; charset=utf-8 len=155
  body: <!DOCTYPE html>...<pre>Cannot GET /auth/admin/users</pre>...
```

Problems:
1. **Returns HTML for /api/* paths.** JSON API clients now have to detect the response is HTML and handle it. A misconfigured client may try to JSON.parse the HTML and crash.
2. **`Cannot METHOD /path` is Express-specific framework fingerprinting.** A pentester or scanner sees this and knows: Node.js Express, no custom 404. Sets the baseline assumption set for follow-on probes (prototype pollution, package vulns in known Express middleware, etc.).
3. **The path is reflected (URL-encoded, so not XSS) but it reveals the api-prefix is stripped.** Response says `/auth/login` but request was `/api/auth/login`. Confirms a sub-router mounted at `/api` — useful recon.
4. **The 152-byte canonical Express 404 body** is fingerprintable by automated tooling (nuclei templates, etc.) and labels the app as "unhardened Express app."

**FIX (server/index.js, registered LAST after all routes):**

```js
// JSON 404 for unknown /api/* paths (includes unknown methods on known paths)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// SPA fallback for everything else (frontend handles client routes)
// — nginx already does this at the proxy layer; keep here as defense-in-depth
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});
```

After ship, all four probes should return:
```
status=404 ct=application/json; charset=utf-8
body: {"error":"Not found"}
```

Verification: § 4 commands cover all four cases.

---

### H-3 — `deploy-without-auth` reveals "XHR required" gate before authentication check; gives attacker the gate to bypass

**Severity:** High (information disclosure on protected endpoint)
**Surface:** routes/deploy.js (or wherever the XHR-required CSRF gate sits)
**Why it matters:**
Live probe: `POST /api/deploy` with no XHR header and no auth cookies returns:
```
status=403 ct=application/json; charset=utf-8 len=24
body: {"error":"XHR required"}
```
The XHR-required check is a defense-in-depth CSRF mitigation (browsers don't allow custom headers like `X-Requested-With: XMLHttpRequest` on cross-origin form submissions without preflight). It belongs on the deploy endpoint.

The problem is **order of operations**: the XHR check runs *before* the authentication check. An unauthenticated attacker probing the API learns:
1. `/api/deploy` exists.
2. It requires both XHR header AND auth.
3. The XHR gate is the first hurdle — set `X-Requested-With: XMLHttpRequest` and now the response will reveal whether auth is the next gate (401 if you don't have it, or whatever).

This is small but it's the kind of detail prospects notice.

**FIX:** Reorder middleware so authentication runs first. Unauthenticated requests should always get 401 *before* any structural revelation:

```js
// WRONG (current)
router.post('/deploy', requireXHR, requireAuth, deployHandler);

// RIGHT
router.post('/deploy', requireAuth, requireXHR, deployHandler);
```

Result: unauthenticated probe to `/api/deploy` returns `401 Authentication required` — same shape as every other protected endpoint, no information leak.

This applies to any other endpoint where requireXHR runs before requireAuth. Audit all router.post/put/delete handlers for the order.

---

### M-1 — No `process.on('unhandledRejection')` or `process.on('uncaughtException')` handler anywhere in server/

**Severity:** Medium (operability + audit-chain integrity)
**Surface:** server/index.js (process-level handlers)
**Why it matters:** Static analysis confirms **zero** `process.on('unhandledRejection'|'uncaughtException')` handlers across all 17 server-side modules. In Node, an unhandled promise rejection or uncaught exception:
- Logs to stderr (which the structured logger may or may not capture, depending on winston config).
- Crashes the process **after** writing the default Node error message — bypassing the structured logger and the audit chain.
- For an audit-chain-dependent app (R16 binder explicitly depends on append-only audit integrity), a crash mid-batch leaves the in-flight audit events un-emitted.

**FIX (server/index.js, near startup):**

```js
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ event: 'process.unhandled_rejection', reason: String(reason).slice(0, 500) });
  auditEvent({ event: 'process.unhandled_rejection', reason: String(reason).slice(0, 500) }).catch(() => {});
  // Don't exit on rejection alone; Node will keep running. Surface it loudly instead.
});

process.on('uncaughtException', (err) => {
  logger.error({ event: 'process.uncaught_exception', message: err.message?.slice(0, 500), stack_first_line: err.stack?.split('\n')[0] });
  auditEvent({ event: 'process.uncaught_exception', message: err.message?.slice(0, 500) }).catch(() => {});
  // Force a clean exit so dumb-init + docker restart_policy bring us back up.
  // Wait 100ms to give the audit write a chance to flush.
  setTimeout(() => process.exit(1), 100);
});
```

Combined with R19 H-3 (dumb-init as PID 1) and the compose `restart: unless-stopped`, this gives a clean shutdown → audit flush → restart loop on any uncaught exception. Better than silent crash.

---

### M-2 — `routes/deploy.js` has 20 direct `console.*` calls (8 error + 12 log) bypassing the structured logger

**Severity:** Medium (defense-in-depth + log integrity)
**Surface:** server/routes/deploy.js
**Why it matters:** R20 L-2 flagged 16 `console.*` calls in `server/auth.js` (mostly operational, not data-bearing). `routes/deploy.js` is worse — 20 calls in the *highest-risk route module* (the one that orchestrates Docker socket operations and template substitution). Each `console.*` call bypasses the winston redaction patterns from `server/log.js` (which redact password/token/secret/authorization/cookie keys).

A future contributor adding `console.log('Deploying', { container, env })` for debugging leaks every env var of the container to stdout, including secrets that should be redacted.

**FIX:**
1. Replace all 20 `console.*` calls in `routes/deploy.js` with the winston logger.
2. Same for the 16 in `auth.js` (R20 L-2 carry).
3. Same for the 2 in `routes/containers.js` (analysis found 2 `console.error`).
4. Same for the 2 in `index.js` (operational startup).
5. Add an ESLint rule `no-console` to prevent regression. Allow it only in a small allowlist of files (e.g., the startup banner in index.js if the operator wants it).

Total replacements: ~40 calls across 4 files. Mechanical work.

---

### M-3 — `server/index.js` has only 4 `try` / 3 `catch` blocks; route modules carry the load

**Severity:** Medium (defense-in-depth)
**Surface:** server/index.js (top-level), and the routes that may throw outside their own try
**Why it matters:** Static analysis tally of try/catch blocks:

| Module | try | catch | empty catch |
|---|---|---|---|
| index.js | 4 | 3 | 0 |
| routes/auth.js | 8 | 8 | 0 |
| routes/auth-admin.js | 12 | 11 | 0 |
| routes/deploy.js | 13 | 14 | 0 |
| routes/containers.js | 11 | 11 | 0 |
| routes/enhanced-mount.js | 10 | 10 | 0 |
| (others) | 4-6 each | 3-4 each | 0 |

Most route handlers wrap their body in try/catch and translate to a JSON error response. But the **catch-all error middleware in index.js is the safety net**. If a route handler throws *outside* its try (e.g., during req.body access if the body was malformed and the try didn't yet start), the express default error handler kicks in — which is what produces the H-1 and H-2 leaks.

This isn't a separate fix; H-1 and H-2 together cover the safety net. Flagged for completeness so the agent knows the route modules are doing their job and the gap is purely in the top-level catch.

---

### M-4 — Three error-handler middlewares registered (index, routes/auth, routes/auth-admin); audit which is reached first for which path

**Severity:** Medium (clarity)
**Surface:** server/index.js, server/routes/auth.js, server/routes/auth-admin.js
**Why it matters:** Express middleware-error-handlers are matched by mount path + registration order. Three handlers register `(err, req, res, next) => {...}`. If they have different behavior (different status codes, different error message shapes), the same error on different paths could return different responses. A pentester correlates response shape to map the routing tree.

**FIX:**
1. Audit the three handlers — confirm they all produce the same response shape: `{ error: '...' }` JSON with the appropriate 4xx/5xx status. No stack trace. No request path echoed. No framework fingerprint.
2. Consider consolidating into one global handler in index.js to simplify the matrix.
3. If kept separate for module isolation, document why and ensure the response shapes match.

---

### M-5 — `huge-payload` (20KB JSON) was accepted and processed before validation

**Severity:** Medium (DOS surface)
**Surface:** server/index.js (body-parser limit)
**Why it matters:** Live probe sent 20,000 + 20,000 chars in a single JSON body. Response was 401 (correct outcome) but the server still parsed the full 40KB body. No explicit `limit` on `express.json()` defaults to 100KB. A malicious client can send 99KB payloads in a tight loop to consume parsing CPU.

**FIX:** Combined with H-1 fix:

```js
app.use(express.json({ limit: '64kb', strict: true }));
```

64KB is generous for any login/auth/deploy payload in this app. Adjust per-route if specific endpoints need more (e.g., container template uploads — likely none in this product).

Also add the matching 413 handler from H-1 fix.

---

### L-1 — Doubled `Content-Type: application/octet-stream, text/plain` on nginx-served /health and /health/secrets

**Severity:** Low (config hygiene)
**Surface:** nginx config (separate from R18 M-3 fix on robots/humans)
**Why it matters:** Carried from R20 post-ship verification. Same finding shape as R18 M-3 but on a different nginx location block — the static-health-response location was not part of the R18 fix because it didn't exist at R18 time (or wasn't probed).

**FIX:** In the nginx config, locate the static-string return for `/health` and `/health/secrets`. It should be a single `default_type text/plain;` or single `add_header Content-Type text/plain;` — not both. Same hygiene fix as R18 M-3.

---

### L-2 — Login response shape includes 200/401 distinguishability via Content-Length

**Severity:** Low (defense-in-depth)
**Surface:** routes/auth.js login handler
**Why it matters:** Successful login responds with user object + session cookies. Failed login responds with `{ "error": "Invalid username or password" }` (40 bytes). A network observer (TLS-terminating proxy logs, MITM in a misconfigured network) can distinguish success vs failure by response size even without reading the body.

This is a defense-in-depth concern for environments where transit security is partially compromised. Mitigation is padding the failure response to a similar size — usually not worth the complexity for a self-hosted app, but worth noting.

**FIX (optional, low priority):** Pad failure responses to a constant length, or accept the tradeoff and document the residual risk in the threat model.

---

### L-3 — No process-level rejection metric exposed for monitoring

**Severity:** Low (operability)
**Surface:** server/routes/health.js or server/index.js
**Why it matters:** Once M-1 lands and `unhandledRejection` / `uncaughtException` are captured, expose a counter so monitoring can alert. Either as a Prometheus metric (if instrumentation exists — check) or a JSON field in `/api/health`:

```json
{
  "ok": true,
  "ts": 1779514235,
  "state": "ready",
  "process": {
    "uptime_seconds": 12345,
    "unhandled_rejections_total": 0,
    "uncaught_exceptions_total": 0
  }
}
```

Monitoring rule: alert if either total > 0 over any 5-minute window.

---

### INFO-1 — Login path does constant-time work for nonexistent vs existing user

**Status:** No action required.
20-trial median timing for nonexistent-user vs known-user-wrong-password differs by 6.6ms (within network noise). The auth path is either running bcrypt.compare against a sentinel hash for nonexistent users, or both code paths converge on the same work. This kills the classic user-enumeration-via-timing attack. Keep it.

---

### INFO-2 — Nginx static `/health` and `/health/secrets` intercepts vs backend `/api/health/secrets` with auth

**Status:** Likely intentional; documented for operator clarity.
`/health` and `/health/secrets` at the nginx layer return static "healthy" — appropriate for load-balancer health checks that need a fast, unauthenticated 200 without exercising the backend. The backend's own `/api/health/secrets` requires authentication and returns secret-age JSON. Operators wiring monitoring should hit `/api/health/secrets` with auth for actual secret-age data; the unauthenticated `/health/secrets` is only liveness.

Worth a one-line comment in routes/health.js or SECURITY.md to make this distinction explicit.

---

### INFO-3 — SQL-injection-style probe on login returns identical response shape to wrong-creds

**Status:** No action required.
`POST /api/auth/login` with `username: "' OR 1=1--"` returns 401 with identical body and timing to a normal wrong-credentials attempt. Confirms parameterized queries (or whatever DB layer) is not differential to injection attempts. Documented for completeness.

---

## §4. Verification commands (agent-runnable after ship)

```bash
BASE=https://ce-demo.homelabarr.com

# 1. Malformed JSON returns 400 not 500
RESP=$(curl -s -o /tmp/r21_h1.body -w '%{http_code} %{content_type}' -X POST -H 'Content-Type: application/json' -d 'not-json' $BASE/api/auth/login)
echo "H-1 invalid-json: $RESP"
cat /tmp/r21_h1.body
# expected: 400 application/json {"error":"Invalid JSON in request body"}

# 2. Unknown /api/* path returns JSON 404
RESP=$(curl -s -o /tmp/r21_h2a.body -w '%{http_code} %{content_type}' $BASE/api/__nope_$(date +%s))
echo "H-2 unknown-path: $RESP"
cat /tmp/r21_h2a.body
# expected: 404 application/json {"error":"Not found"}

# 3. Wrong method on known endpoint returns JSON 404 (or 405 if route advertises Allow header)
RESP=$(curl -s -o /tmp/r21_h2b.body -w '%{http_code} %{content_type}' -X DELETE $BASE/api/auth/login)
echo "H-2 wrong-method: $RESP"
cat /tmp/r21_h2b.body
# expected: 404 or 405 application/json — NOT 404 text/html with "Cannot DELETE"

# 4. /api/auth/admin/* without auth returns 401 not 404 HTML
RESP=$(curl -s -o /tmp/r21_h2c.body -w '%{http_code} %{content_type}' $BASE/api/auth/admin/users)
echo "H-2 admin-no-auth: $RESP"
cat /tmp/r21_h2c.body
# expected: 401 application/json or 404 application/json — NOT HTML

# 5. Deploy without auth returns 401 (not "XHR required" 403)
RESP=$(curl -s -o /tmp/r21_h3.body -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' $BASE/api/deploy)
echo "H-3 deploy-no-auth: $RESP"
cat /tmp/r21_h3.body
# expected: 401 application/json {"error":"Authentication required"}

# 6. Oversized body rejected with 413 not 401
RESP=$(curl -s -o /tmp/r21_m5.body -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data-raw "{\"username\":\"$(head -c 100000 /dev/urandom | base64)\",\"password\":\"x\"}" $BASE/api/auth/login)
echo "M-5 oversized: $RESP"
cat /tmp/r21_m5.body
# expected: 413 application/json {"error":"Request body too large"}

# 7. Process-level handlers present
curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/index.js \
  | grep -E "(unhandledRejection|uncaughtException)"
# expected: at least 2 hits

# 8. console.* call count in route modules
for f in server/routes/deploy.js server/auth.js server/routes/containers.js server/index.js; do
  COUNT=$(curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/$f | grep -cE 'console\.(log|error|warn|info|debug)')
  echo "$f: $COUNT console calls"
done
# expected: 0 in routes/*, allowed small count in index.js startup

# 9. ESLint no-console rule active
cat .eslintrc.json 2>/dev/null || cat eslint.config.js 2>/dev/null | grep -i 'no-console'
# expected: rule configured

# 10. nginx Content-Type on /health single header
curl -sI "$BASE/health" | grep -i content-type
# expected: single text/plain, not "text/plain, application/octet-stream"
```

Smoke verification of the §0 carry-forwards:
```bash
# CF-1 / L-1: doubled content-type on /health and /health/secrets
for p in /health /health/secrets /robots.txt /humans.txt; do
  echo -n "$p: "
  curl -sI "$BASE$p?_=$(date +%s)" | grep -i content-type
done
# expected: each path returns exactly ONE Content-Type
```

---

## §5. Out of scope

- Rate-limit response shape audit (covered in earlier rounds; deferred to a future round if specific issues surface).
- WebSocket / SSE error handling (`server/progress-stream.js` and the SSE endpoints — not exercised in this round's probes; flag for future round if relevant).
- CSP violation report endpoint behavior (R8/R9 work; not in scope here).

---

## §6. Owner pile (delta this round)

New items:
- **M-4 audit:** confirm the three error-handler middlewares (index, routes/auth, routes/auth-admin) produce identical response shapes. Decide whether to consolidate.
- **L-2 padding decision:** owner choice on whether to pad failure-response sizes. Recommend "no, accept residual risk, document in threat model" for self-hosted product.
- **L-3 monitoring metric:** decide format (Prometheus or JSON health-endpoint field).

Carried forward (unchanged):
- Audit-log off-box destination (R7)
- Chaos gameday cadence (R12)
- Tabletop exercise (R14)
- Threat-model residual-risk sign-off (R13)
- 25 dependabot vulns triage (R15)
- License SPDX string for OCI labels (R17 M-3)
- INFRASTRUCTURE.md correction in deploy-pipeline (R19 H-1)
- Argon2id migration tracked as roadmap (R20 H-3 Option B)

---

## §7. Deliverable

Agent applies §3 H-1, H-2, H-3, M-1, M-2, M-3 (overlap with H-1/H-2), M-4 (audit), M-5, L-1, L-3. L-2 is owner-decision; INFO findings need no action.

Ship report should include:
1. Confirmation of the 6 live verification commands (1-6) returning expected status + shape.
2. Confirmation of the source-side checks (7-9): unhandledRejection/uncaughtException handlers landed, console.* counts dropped to ~0 in route modules, ESLint no-console active.
3. L-1 nginx fix landed (single Content-Type on /health* paths).

---

## §8. End of round

After R21, the error surface tells outside observers nothing they didn't already deserve to know: 404 is JSON, 400 is JSON, 401 is JSON, 500 is rare and generic. No framework fingerprinting, no path echoing, no auth-gate ordering leaks.

Next round (R22, final): GREEN OWNER CLOSEOUT MD. Pull the carried owner-pile (R7 audit-log destination, R12 chaos gameday, R13 threat-model sign-off, R14 tabletop, R15 dependabot triage, R17 license-SPDX, R19 H-1 INFRASTRUCTURE.md correction, R20 H-3 argon2 roadmap, R21 M-4/L-2/L-3 choices) into a dated checklist with eight.ly-funnel-credibility-blocking items flagged separately. Convert "the audit binder" into "the operating checklist."

Loop continues.
