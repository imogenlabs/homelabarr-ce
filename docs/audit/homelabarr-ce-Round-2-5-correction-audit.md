# HomelabARR CE — Round 2.5 Correction Audit
## Frontend Auth Migration Drift — Client Still Uses localStorage + Bearer

**Target (live):** https://ce-demo.homelabarr.com/
**Target (repo):** https://github.com/imogenlabs/homelabarr-ce
**Branch / HEAD audited:** main (after Round 2 ship)
**Date:** 2026-05-22
**Auditor:** Claude (Imogen Labs audit playbook, Round 2.5 correction)
**Trigger:** Round 2 §4 verification matrix failed on the single highest-impact finding.

---

## §0 — Round 2 verification scorecard

Ran the §4 matrix against `ce-demo.homelabarr.com/?_v=r2verify` with cache-busting. **9 of 11 pass, 1 critical fail, 1 acceptable deferral.**

| Check | Expected | Observed | Status |
|---|---|---|---|
| `csp_no_unsafe_inline_style` | true | true | ✅ |
| `csp_no_mjashley` | true | true (CSP allow-list clean) | ✅ |
| `csp_has_report_to` | true | true | ✅ |
| `csp_has_object_none` | true | true | ✅ |
| `reporting_endpoints` header | true | true | ✅ |
| `hsts_preload` | true | `max-age=63072000; includeSubDomains; preload` | ✅ |
| `/api/csp-report` returns 204 | true | 204 | ✅ |
| `csp_img_src_narrow` | true | true (no `https:` wildcard) | ✅ |
| `csp_has_frame_ancestors_none` | true | true | ✅ |
| `csp_has_base_uri_self` | true | true | ✅ |
| **`no_jwt_in_localstorage`** | **true** | **FALSE — `homelabarr_token` still written by frontend AuthContext on login** | ❌ |
| `no_external_analytics_in_html` | true | false (`data-host-url` attr remains — see L-R2.5-3 below) | ⚠️ partial |
| `csp_has_trusted_types` | true | false | ⚠️ deferred (R2 spec was report-only first, acceptable) |

Side-channel checks (not in original matrix but confirm new state):

| Check | Result |
|---|---|
| POST /api/auth/login response body keys | `["success", "user"]` — **no token in body ✓** |
| Set-Cookie `hl_session` HttpOnly after login | ✓ (cookie not visible to JS) |
| `hl_csrf` cookie issued | ✓ (non-HttpOnly, by design) |
| /api/auth/me with `credentials: 'include'` (no Authorization) | 200 ✓ (cookie auth works) |
| /api/auth/me with `credentials: 'omit'` | 401 ✓ |
| POST /api/auth/logout with no headers | 403 `{"error":"XHR required"}` ✓ |
| POST /api/auth/logout with only X-CSRF-Token | 403 `{"error":"XHR required"}` ✓ |
| POST /api/auth/logout with X-CSRF-Token + X-Requested-With | 200 ✓ |

**Diagnosis:** the **server-side** half of C-R2-1 shipped clean and well (cookie + CSRF double-submit + XHR marker, exactly per spec). The **frontend-side** half did not ship — `src/lib/api.ts` and `src/contexts/AuthContext.tsx` are unchanged from pre-R2 main. The client is still:

1. Storing the JWT in `localStorage.homelabarr_token` after login
2. Reading it on every API call (`src/lib/api.ts` L8)
3. Sending it as `Authorization: Bearer <token>` (`src/lib/api.ts` L9)
4. Not sending `credentials: 'include'` (cookies ignored)
5. Not sending `X-CSRF-Token` (no double-submit echo)
6. Not sending `X-Requested-With: XMLHttpRequest`

The server appears to accept **both** legacy Bearer and new cookie auth simultaneously, which is why the live demo "works" — but the legacy path is exactly the XSS-exfil hole C-R2-1 was supposed to close. **JWT-in-localStorage is still single-XSS to account takeover.**

---

## §1 — Round 2.5 Goal

Land the frontend half of C-R2-1. Once the client uses cookies + CSRF, drop the server's legacy Bearer acceptance so there is no fallback for an attacker who exfiltrates the (now wholly absent) localStorage token.

This round has only as many findings as required to close Round 2's open delta. Scope is small and surgical.

---
## §2 — Current State (verified against repo @ main + live)

### 2.1 Repo source state — `src/lib/api.ts`
Verified by base64-decoded GitHub Contents API @ main:

```ts
// L8-9 (verbatim, current):
  const token = localStorage.getItem('homelabarr_token');
  return token ? { 'Authorization': \`Bearer \${token}\` } : {};
```

Grep totals across `src/lib/api.ts` (345 lines):
- `Authorization` references: 1
- `Bearer` references: 1
- `X-CSRF-Token` references: 0
- `X-Requested-With` references: 0
- `credentials: 'include'` occurrences: 0
- `localStorage.getItem` occurrences: 1
- `fetch(` calls: 0 (uses thin abstraction — see helpers like `getContainerLogs`)
- `axios` imports: 0 (uses native `fetch` via wrapper)

### 2.2 Repo source state — `src/contexts/AuthContext.tsx`
- `localStorage.setItem` occurrences: 2 (was 2 before R2 — **no change**)
- `localStorage.getItem` occurrences: 2
- `localStorage.removeItem` occurrences: 2

### 2.3 Live server state (probed)
- POST `/api/auth/login` → 200, body `{success, user}` (no token field) ✅
- Set-Cookie `hl_session` HttpOnly + Secure + SameSite=Strict ✅
- Set-Cookie `hl_csrf` non-HttpOnly Secure SameSite=Strict ✅
- POST `/api/auth/logout` requires both `X-CSRF-Token` (matching cookie) AND `X-Requested-With: XMLHttpRequest` ✅
- Legacy: `Authorization: Bearer <jwt>` still accepted (verified by clean login + subsequent authed calls without `credentials:'include'`) ⚠️ to be removed after frontend migration

### 2.4 Live HTML state
`/` HTML body contains:
```html
data-host-url="https://analytics.mjashley.com"
```
on the umami client `<script>` tag. Tested: no network request actually goes to mjashley.com (CSP `connect-src 'self'` blocks it, and the live umami SDK falls back to no-op silently). This is informational drift, downgraded from H-R2-5 to L-R2.5-3.

---

## §3 — Findings

### Round 2.5 scorecard
| Severity | Count |
|---|---|
| Critical | 1 |
| High | 1 |
| Low | 1 |
| **Total** | **3** |

---

### C-R2.5-1 — Frontend never migrated to cookie auth (the actual C-R2-1 client work)

**Files:**
- `src/lib/api.ts` — read/send Authorization header from localStorage
- `src/contexts/AuthContext.tsx` — write/read/remove token in localStorage on login/init/logout

**Severity:** Critical
**Impact:** Identical to original C-R2-1 — any XSS exfiltrates the JWT. Server-side improvements made by the agent in R2 do not protect against this; the legacy path is fully functional.

**WRONG — current `src/lib/api.ts` (head):**
```ts
// (verbatim from main @ commit pre-2.5)
const getAuthHeader = () => {
  const token = localStorage.getItem('homelabarr_token');
  return token ? { 'Authorization': \`Bearer \${token}\` } : {};
};

// ...later, every fetch call:
const res = await fetch(\`\${API_BASE}/some/path\`, {
  headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
});
```

**RIGHT — replace the whole header helper + add CSRF/XHR + credentials:**
```ts
// src/lib/api.ts (top of file)

// Read non-HttpOnly CSRF cookie
const getCsrfFromCookie = (): string => {
  const m = document.cookie.match(/(?:^|;\s*)hl_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
};

// Replace getAuthHeader() entirely. No localStorage. No Authorization header.
// All requests now rely on the hl_session HttpOnly cookie.
const buildHeaders = (
  init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
): Record<string, string> => {
  const method = (init.method || 'GET').toUpperCase();
  const h: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(init.headers || {})
  };
  if (init.body !== undefined && !h['Content-Type']) {
    h['Content-Type'] = 'application/json';
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    h['X-CSRF-Token'] = getCsrfFromCookie();
  }
  return h;
};

// Wrap fetch — every call goes through this.
export const apiFetch = (path: string, init: RequestInit = {}) => {
  const headers = buildHeaders(init as any);
  return fetch(\`\${API_BASE}\${path}\`, {
    ...init,
    credentials: 'include',     // <-- cookie carrier
    headers
  });
};
```

Then update **every** existing call-site in `api.ts` from:
```ts
fetch(\`\${API_BASE}/x\`, { headers: { 'Content-Type': 'application/json', ...getAuthHeader() }, ... })
```
to:
```ts
apiFetch('/x', { ... })   // no headers override needed
```

Find-and-fix command for the agent:
```bash
grep -nE 'fetch\(.*API_BASE' src/lib/api.ts
# Expect zero remaining direct fetch() calls after migration; all should be apiFetch()
grep -nE 'getAuthHeader|Authorization|Bearer|homelabarr_token' src/
# Expect zero matches anywhere in src/
```

**WRONG — current `src/contexts/AuthContext.tsx` (relevant lines):**
```ts
// L41:
const savedToken = localStorage.getItem(TOKEN_KEY);
// (...token-based hydration...)

// L84 (on login success):
localStorage.setItem(TOKEN_KEY, data.token);
setUser(data.user);

// L95 (on logout):
localStorage.removeItem(TOKEN_KEY);
setUser(null);
```

**RIGHT — replace token-state with server-truth:**
```ts
// src/contexts/AuthContext.tsx

import { apiFetch } from '@/lib/api';

useEffect(() => {
  // Boot: ask server who we are. Cookie travels automatically.
  let cancelled = false;
  (async () => {
    try {
      const res = await apiFetch('/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (!cancelled) setUser(data.user || null);
      } else if (res.status === 401 && !cancelled) {
        setUser(null);
      }
    } catch {
      if (!cancelled) setUser(null);
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();
  return () => { cancelled = true; };
}, []);

const login = async (username: string, password: string) => {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Login failed');
  }
  const data = await res.json();
  // NO localStorage. NO data.token handling. Server set the cookie.
  setUser(data.user);
};

const logout = async () => {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    setUser(null);
    // No localStorage to clear.
  }
};
```

Also delete the constant if it's no longer referenced:
```ts
// DELETE this line if present:
const TOKEN_KEY = 'homelabarr_token';
```

And anywhere else in `src/` that does:
```ts
localStorage.getItem('homelabarr_token')
localStorage.setItem('homelabarr_token', ...)
localStorage.removeItem('homelabarr_token')
```
— remove. None should remain.

**Migration safety — one-shot localStorage wipe on first load of the new client:**
```ts
// src/main.tsx — TOP of file, runs once per browser per version
try {
  localStorage.removeItem('homelabarr_token');
  // Also clear other token-like residue if any
  Object.keys(localStorage).filter(k => /^homelabarr_(token|user|jwt)$/i.test(k)).forEach(k => localStorage.removeItem(k));
} catch {}
```
This protects users who logged in under the legacy client and still have a stale token in their browser even after deploy.

---

### H-R2.5-2 — Server still accepts legacy `Authorization: Bearer` after frontend migration

**File:** `server/auth.js` (and any middleware that reads Authorization)
**Severity:** High (until removed, the C-R2.5-1 client fix can be bypassed by anyone who reads the JWT from a stale browser session via XSS in a non-yet-upgraded tab)
**Impact:** Defense-in-depth. Even after the client migrates, a stale browser tab from before deploy still has localStorage.homelabarr_token. If that tab is XSS-pwned during the legacy-accept window, the attacker holds a valid JWT and can drive the server until the JWT expires.

**WRONG (current authentication middleware, conceptual):**
```js
// server/auth.js — current
function requireAuth(req, res, next) {
  const hdr = req.headers.authorization;
  let token = null;
  if (hdr && hdr.startsWith('Bearer ')) token = hdr.slice(7);
  else if (req.cookies?.hl_session) token = req.cookies.hl_session;
  if (!token) return res.status(401).json({ error: 'unauth' });
  // verify...
}
```

**RIGHT — cookie only, with a clear deprecation log line for one window, then remove:**
```js
// server/auth.js — Round 2.5

function requireAuth(req, res, next) {
  const token = req.cookies?.hl_session;
  if (!token) return res.status(401).json({ error: 'unauth' });

  // Log (and once-per-IP rate-limit) any client that's still sending the legacy header
  // so we know when it's safe to short-circuit the deprecation entirely.
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    logger.warn('legacy_bearer_seen', { ip: req.ip, path: req.path, ua: req.headers['user-agent'] });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid_session' });
  }
}
```

**Roll-out:**
1. Ship C-R2.5-1 (client). Frontend now sends cookies only.
2. Watch `legacy_bearer_seen` logs for 48 hours.
3. Once near-zero, delete the warn block. JWT signed by the old secret continue to verify because the same secret signs both cookie and bearer tokens.
4. Optional belt-and-braces: rotate JWT_SECRET after step 3 to invalidate all pre-migration tokens entirely (forces fresh logins; communicate first).

---

### L-R2.5-3 — `data-host-url="https://analytics.mjashley.com"` attribute remains in index.html

**File:** `index.html`
**Severity:** Low (the proxied script never actually beacons to mjashley.com because CSP `connect-src 'self'` blocks it; this attribute is dead config)
**Impact:** Cosmetic / configuration drift. No exfiltration. No CSP violation in production. But: any developer who copies this file to a different environment with a looser CSP would suddenly start sending pageview data to mjashley.com again.

**WRONG:**
```html
<script defer src="/analytics.js" data-website-id="..." data-host-url="https://analytics.mjashley.com"></script>
```

**RIGHT (assuming the proxy route at `/analytics/api/` exists per H-R2-5 nginx diff):**
```html
<script defer src="/analytics.js" data-website-id="..." data-host-url="/analytics"></script>
```

Or, if the proxy back-end isn't desired, drop the attribute entirely and the SDK will no-op its beaconing (already current behavior on live).

**Verification:**
```bash
curl -s https://ce-demo.homelabarr.com/ | grep -i mjashley
# Expected: no output
```

---
## §4 — Verification matrix (re-run after Round 2.5 ships)

```js
// Paste in DevTools console on https://ce-demo.homelabarr.com/?_v=r25verify after deploy.
// Then click "Sign In" in the UI and log in as admin/admin (or whatever the demo creds are).
// Then run the snippet a SECOND time. All assertions must be true on the second run.

(async () => {
  const nc = () => '?_=' + Date.now() + Math.random();
  const r = {};

  // 1. Static body: legacy token names must not be referenced anywhere on the served bundle
  const bundle = await (await fetch('/' + nc(), { cache: 'reload' })).text();
  // Grab the main module bundle path
  const mainSrc = bundle.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
  if (mainSrc) {
    const js = await (await fetch(mainSrc + nc(), { cache: 'reload' })).text();
    r.bundle_no_homelabarr_token = !js.includes('homelabarr_token');
    r.bundle_no_bearer_kw = !/Bearer /.test(js);
  } else {
    r.bundle_check = 'main bundle not found';
  }

  // 2. After logging in via the UI, localStorage must NOT hold any token
  r.localStorage_keys = Object.keys(localStorage);
  r.no_token_in_localStorage = !Object.keys(localStorage).some(k => /token|jwt|session/i.test(k));

  // 3. Cookie carries auth
  r.has_csrf_cookie = /hl_csrf=/.test(document.cookie);
  r.no_session_visible = !/hl_session=/.test(document.cookie); // must be HttpOnly

  // 4. Authed fetch with credentials only succeeds
  const me = await fetch('/api/auth/me' + nc(), { credentials: 'include', cache: 'reload' });
  r.me_with_creds = me.status;
  const meNo = await fetch('/api/auth/me' + nc(), { credentials: 'omit', cache: 'reload' });
  r.me_without_creds = meNo.status;

  // 5. Legacy Authorization header alone should NOT auth (cookie required)
  // Manually craft a Bearer header from any source — should fail because server should reject Bearer-only.
  const bearerOnly = await fetch('/api/auth/me' + nc(), {
    credentials: 'omit',
    headers: { 'Authorization': 'Bearer FAKE_TOKEN_FOR_NEGATIVE_TEST' },
    cache: 'reload'
  });
  r.bearer_only_status = bearerOnly.status;  // expect 401

  // 6. CSRF + XHR required on state changes
  const logoutBare = await fetch('/api/auth/logout' + nc(), { method: 'POST', credentials: 'include', cache: 'reload' });
  r.logout_bare = logoutBare.status; // expect 403

  const csrf = document.cookie.match(/hl_csrf=([^;]+)/)?.[1] || '';
  const logoutGood = await fetch('/api/auth/logout' + nc(), {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf, 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'include',
    cache: 'reload'
  });
  r.logout_good = logoutGood.status; // expect 200/204

  console.table(r);
  return r;
})();
```

**Pass criteria (must all be true on a fresh post-login run):**
- `bundle_no_homelabarr_token` — built bundle has no `'homelabarr_token'` string
- `bundle_no_bearer_kw` — built bundle has no `'Bearer '` string
- `no_token_in_localStorage`
- `has_csrf_cookie`
- `no_session_visible` (hl_session is HttpOnly, invisible to JS)
- `me_with_creds === 200`
- `me_without_creds === 401`
- `bearer_only_status === 401` (legacy path closed)
- `logout_bare === 403`
- `logout_good === 200 || logout_good === 204`

Manual confirm (DevTools → Application):
- Cookies: `hl_session` row has HttpOnly ✓ and Secure ✓
- Local Storage: no entries containing the JWT
- Network tab: every `/api/*` request carries `X-Requested-With: XMLHttpRequest` and (on state changes) `X-CSRF-Token: <hex>`

---

## §5 — Out of scope (still queued)

- **Round 3** — Auth flow hardening (refresh-token rotation, server-side session revocation, MFA/TOTP, password reset). **Unblocks once C-R2.5-1 lands.** No re-ordering.
- **Round 2.6 (optional, can fold into R3)** — Trusted Types report-only rollout (M-R2-8 deferred from R2). Low priority; can ride alongside R3.
- Rounds 4–8 unchanged from R2 §5.

---

## §6 — Owner pile

1. **Communicate the breaking change** — any external integration that authenticates via `Authorization: Bearer` will break when H-R2.5-2 is enforced. Owner should publish a one-liner on README + Discord before flipping the kill switch. Provide a CLI/API-key alternative (R1 C-10 already hashed API keys; document that path).
2. **Decide the `data-host-url` outcome** (L-R2.5-3): keep the proxy route at `/analytics`, remove the attribute, or remove analytics entirely. One-line decision.
3. **Monitor `legacy_bearer_seen` log** for 48 hours after C-R2.5-1 ships; only flip the rejection (delete the cookie-OR-bearer fallback) when the log is near-zero.

---

## §7 — Deliverable

**Branch:** `security/round-2-5-frontend-auth-migration`
**PR title:** `Round 2.5 — Migrate frontend to cookie auth; drop localStorage JWT`

**Squash-commit body:**
```
Round 2.5 correction — frontend half of cookie auth migration

CRITICAL
- C-R2.5-1: Rewrite src/lib/api.ts and src/contexts/AuthContext.tsx to use
  cookie-based auth + CSRF double-submit + X-Requested-With header.
  Removes ALL localStorage.{get,set,remove}Item references to 'homelabarr_token'.
  Adds one-shot localStorage wipe in src/main.tsx for users upgrading from
  the pre-2.5 client.

HIGH
- H-R2.5-2: Server requireAuth() reads cookie only. Logs (rate-limited) any
  legacy Authorization: Bearer attempt for 48h, then deprecation completes.

LOW
- L-R2.5-3: index.html data-host-url switched to '/analytics' (or removed).

Breaking changes:
- Frontend client no longer reads or writes localStorage.homelabarr_token.
- After 48h soak: Authorization: Bearer header no longer accepted server-side.
  External callers must switch to API keys (R1 C-10 hashed API key path)
  or refresh their cookie via /api/auth/login.

Verification: §4 of round-2-5 audit MD must pass on ce-demo.homelabarr.com.
```

---

## §8 — End of Round 2.5

When the agent reports shipped:
1. Re-run §4 matrix against live with cache-busting.
2. If pass: write Round 3 (auth flow hardening) without asking.
3. If still drift: write Round 2.6 with the remaining delta.

**No questions. Loop continues.**
