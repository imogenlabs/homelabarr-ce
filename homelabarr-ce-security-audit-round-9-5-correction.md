# HomelabARR-CE Security Audit — Round 9.5 (Correction)
**Dimension:** Reconcile R9 ship vs R9 spec. Front-half (headers, CSP, health min, FP baseline) landed clean. Back-half (DAST authentication flow, mint exchange, route manifest, internal audit ingress, backup hardening, AppArmor enforce, audit event registration) is NOT on the branch.
**Target:** `smashingtags/homelabarr-ce` @ `security/round-9-dast-zap@115cf4b97c` + live `ce-demo.homelabarr.com`
**Method:** read-only source review (byte-level scanning) + passive live recon. No exploits run. No code changed.

---

## §0 — Why this is a correction round (and not R10)

You reported "zero carry-forwards remaining" based on the **live header surface**, which is genuinely clean:

- `/api/health` → 3 keys (`ok`, `ts`, `state`) ✓
- COOP `same-origin` ✓, CORP `same-site` ✓
- `Referrer-Policy: strict-origin-when-cross-origin` ✓
- `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), ...` ✓
- `X-Frame-Options: SAMEORIGIN` ✓, `X-Content-Type-Options: nosniff` ✓
- `X-Powered-By` absent ✓, origin `Server` stripped (CF still rewrites edge)

That's the front-half of R9 (M-R9-8 / -9 / -10 + CF-D + CF-E) and it shipped clean. But the **back-half** — the active-scan plumbing, mint endpoint exchange, scanner role-token, route manifest, internal audit ingress for backups, AppArmor enforce, and CF-A backup hardening — none of those landed.

This is normal. R9 was the biggest single round in the loop (13 findings + 9 carry-forwards = 22 deliverables). What landed is good. What's missing needs an R9.5 sweep before R10 can be written cleanly.

### Why this matters

R10 is pentest prep + adversary emulation. That assumes the DAST harness from R9 is fully functional. Right now it can run **passive** (R9 baseline workflow works against an unauthenticated demo), but the **authenticated active scan can't actually authenticate** because `/api/auth/cli-mint` is referenced in the workflow but the endpoint is gone from `server/index.js`, **AND** the mint key isn't sourced in the workflow steps. So R10 would be built on quicksand.

---

## §1 — Verification matrix (R9 spec vs what's actually on `security/round-9-dast-zap@115cf4b97c`)

| ID | Spec | Source on R9 branch | Live | Verdict |
|---|---|---|---|---|
| C-R9-1 | dast-baseline.yml | Present 1170B, ZAP baseline action, fail_action:true, 3 uses all SHA-pinned | n/a (not yet run on PR) | PASS |
| C-R9-2a | dast-active.yml structure | Present 3737B, full-scan action, replacer.full_list config | n/a | PASS |
| C-R9-2b | dast-active.yml mint exchange step | **No `cli-mint` reference in workflow** | n/a | **DRIFT** |
| C-R9-2c | dast-active.yml post-scan chain.ok check | **No `chain.ok` reference in workflow** | n/a | **DRIFT** |
| H-R9-3 | .zap/rules.tsv FP baseline | Present, 11 non-comment lines | n/a | PASS |
| H-R9-4a | RULE-HLA-1 (Docker socket) | Present in rules-hla.zaprules | n/a | PASS |
| H-R9-4b | RULE-HLA-2 (template traversal) | Present | n/a | PASS |
| H-R9-4c | RULE-HLA-3 (audit chain integrity) | Present | n/a | PASS |
| H-R9-5 | /api/auth/cli-mint endpoint | **Path string at byte 7755 in server/index.js BUT endpoint behavior unverified** (live test blocked by shim — need owner-side curl) | unknown | **PARTIAL — needs owner verification** |
| H-R9-6 | /api/_routes endpoint | **NOT in server/index.js** (byte scan negative) | live returns 200 (likely passing through to SPA fallback — not the manifest) | **DRIFT** |
| H-R9-7 | branch protection apply | Owner-side, document only | n/a | OWNER PILE (not actionable by agent) |
| M-R9-8 | Referrer-Policy header | Helmet config detected in index.js | live returns `strict-origin-when-cross-origin` | PASS |
| M-R9-9 | Permissions-Policy header | Detected in index.js | live returns full policy (109B) | PASS |
| M-R9-10 | COOP / CORP | Detected in index.js | live returns both | PASS |
| M-R9-11 | CF WAF allow-list | Owner-side | n/a | OWNER PILE |
| L-R9-12 | DAST webhook notifier | Not in dast-active.yml (no `ALERT_HMAC_KEY` reference) | n/a | **DRIFT** |
| L-R9-13 | dast-trend.yml weekly | **Not present in .github/workflows/** | n/a | **DRIFT** |
| CF-A | scripts/backup.sh hardening | Still 559B, no OFFSITE_DEST, no gpg, no rclone, no sha256, no /internal/audit | n/a | **DRIFT** (unchanged from R8) |
| CF-B-1 | server/audit.js register backup/restore/key events | None of the event strings present (byte scan) | live `/api/audit?limit=50` shows 0 backup events | **DRIFT** |
| CF-B-2 | /api/internal/audit ingress | **NOT in server/index.js** | n/a | **DRIFT** |
| CF-C-1 | scripts/install-apparmor.sh `aa-enforce` | Still 971B, no `aa-enforce` line | n/a | **DRIFT** |
| CF-C-2 | homelabarr.yml `security_opt: apparmor=homelabarr-backend` | `security_opt` block exists, `no-new-privileges:true` present, **NO `apparmor=` line** | n/a | **DRIFT (partial)** |
| CF-D-1 | /api/health min to 3 keys | Behavior confirmed (`ok:true, ts` literal at byte 30899) | live returns `{ok:true,ts:...,state:'ready'}` | PASS |
| CF-D-2 | /api/health/detail admin-gated | **Path /api/health/detail NOT in server/index.js byte scan** | live `/health/detail` returns 200 with full DEGRADED payload — **publicly readable** | **DRIFT** |
| CF-E | strip Server + x-powered-by | Both literals detected | live `x-powered-by` absent ✓; `Server: cloudflare` (edge rewrite — origin stripped per spec) | PASS |
| CF-F | SHA-pin last 3 @vN in security-audit.yml | 21/24 SHA-pinned, **3 still on @vN** | n/a | **DRIFT (unchanged from R8)** |
| CF-G | package.json packageManager | `"packageManager": "npm@10.9.0"` present | n/a | PASS |
| CF-H | docs/topology.md + traefik/dynamic.yml | Both **MISSING** still | n/a | **DRIFT (unchanged from R8)** |
| CF-I-1 | SECURITY-CONTACTS expansion | Expanded to 182B but no PGP fingerprint field | n/a | **DRIFT (partial)** |
| CF-I-2 | /.well-known/security.txt | Present 317B, Contact + Expires | live serve depends on SPA fallback (need owner-side `curl /.well-known/security.txt`) | PASS (source) |

**Tally:** 13 PASS / 2 OWNER PILE / 1 PARTIAL / **12 DRIFT**

### Bonus regression (new this round)

- **HSTS:** Live header decoded was `max-age=15552000; includeSubDomains` (180 days, **no `preload`**). In R8 verification it was `max-age=63072000; includeSubDomains; preload` (2 years + preload). Something between R8 deploy and R9 deploy regressed HSTS. This is M-R8-7 partial regression. Could be CF dashboard change or a Traefik dynamic-config edit. **Investigate origin: server/index.js has no HSTS literal at all, so this is being set upstream (CF or Traefik).**

---

## §2 — Findings (12 drifts + 1 regression, ranked)

Each one is a re-issued verbatim diff. Some are restatements from R9 §0.2 because they didn't land. Read these as "the original diff still applies — implement exactly."

### C-R9.5-1 — DAST active workflow can't actually authenticate (highest impact)

**Severity:** CRITICAL
**Why:** Without this, the entire authenticated DAST capability is theatre. Workflow runs, scans the SPA shell, hits 401 on every API route, reports "all clear" and we miss everything.

**WRONG (current dast-active.yml):**

```yaml
      - name: ZAP Full Scan (authenticated)
        uses: zaproxy/action-full-scan@<sha>
        with:
          target: ${{ env.ZAP_TARGET }}
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a -j'        # ← no replacer, no auth
          fail_action: true
```

**RIGHT — full diff:**

```yaml
jobs:
  zap-active:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      ZAP_TARGET: ${{ inputs.target || 'https://ce-demo.homelabarr.com' }}
    steps:
      - name: Checkout
        uses: actions/checkout@<sha>
        with: { persist-credentials: false }

      - name: Mint short-lived scanner JWT
        id: jwt
        env:
          MINT_KEY: ${{ secrets.DAST_MINT_KEY }}
        run: |
          set -e
          test -n "$MINT_KEY" || { echo 'DAST_MINT_KEY secret missing'; exit 1; }
          R=$(curl -fsS -X POST "$ZAP_TARGET/api/auth/cli-mint" \
            -H "X-Mint-Key: $MINT_KEY" \
            -H 'Content-Type: application/json' \
            -d '{"u":"dast-scanner","role":"scanner","ttl_s":1800}')
          T=$(echo "$R" | jq -r .a)
          test -n "$T" -a "$T" != 'null' || { echo 'mint failed'; echo "$R"; exit 1; }
          echo "::add-mask::$T"
          echo "jwt=$T" >> $GITHUB_OUTPUT

      - name: ZAP Full Scan (authenticated)
        uses: zaproxy/action-full-scan@<sha>
        with:
          target: ${{ env.ZAP_TARGET }}
          rules_file_name: '.zap/rules.tsv'
          cmd_options: >-
            -a -j -z "
            -config replacer.full_list(0).description=auth
            -config replacer.full_list(0).enabled=true
            -config replacer.full_list(0).matchtype=REQ_HEADER
            -config replacer.full_list(0).matchstr=Authorization
            -config replacer.full_list(0).regex=false
            -config replacer.full_list(0).replacement=Bearer ${{ steps.jwt.outputs.jwt }}
            -config rules.cookie.ignorelist=__cf_bm,cf_clearance
            -config api.disablekey=true
            "
          fail_action: true
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Verify hash chain held
        if: always()
        run: |
          STATE=$(curl -fsS -H 'Authorization: Bearer ${{ steps.jwt.outputs.jwt }}' \
            "$ZAP_TARGET/api/audit?limit=1" | jq -r '.chain.ok')
          test "$STATE" = 'true' || { echo 'AUDIT CHAIN BROKEN POST-SCAN'; exit 2; }
          echo 'audit chain intact'

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@<sha>
        with:
          name: zap-active-${{ github.run_id }}
          path: |
            report_html.html
            report_md.md
            report_json.json
          retention-days: 90
```

### C-R9.5-2 — server/index.js missing four R9 endpoints

**Severity:** CRITICAL (paired with C-R9.5-1)
**Why:** Byte-level scan confirms `/api/auth/cli-mint` path string IS present (byte 7755), but `/api/_routes`, `/api/internal/audit`, and `/api/health/detail` are NOT in the file.

**WRONG/RIGHT diff (all four endpoints):**

```diff
--- a/server/index.js
+++ b/server/index.js
@@
+// === R9.5: missing endpoints ===
+
+// 1. Health detail — admin-gated. Public /api/health stays as 3-key minimal.
+app.get('/api/health/detail', requireAdmin, (req, res) => {
+  res.set('Cache-Control', 'no-store');
+  res.json({
+    state: degraded ? 'degraded' : 'ready',
+    version: pkg.version,
+    uptime: process.uptime(),
+    platform: { os: os.platform(), arch: os.arch(), node: process.version },
+    docker: getDockerStatus(),
+    database: getDbStatus()
+  });
+});
+
+// 2. Route manifest — scanner-only (role=scanner JWT)
+app.get('/api/_routes', requireScannerJwt, (req, res) => {
+  const routes = app._router.stack
+    .filter(layer => layer.route)
+    .map(layer => ({
+      path: layer.route.path,
+      methods: Object.keys(layer.route.methods).filter(m => layer.route.methods[m]).map(m => m.toUpperCase())
+    }))
+    .sort((a,b) => a.path.localeCompare(b.path));
+  res.json({ count: routes.length, routes });
+});
+
+// 3. Internal audit ingress — for host-side cron (backup.sh, rotation scripts).
+// Protected by INTERNAL_AUDIT_TOKEN env var + bound to 127.0.0.1 by container netpol.
+app.post('/api/internal/audit', express.json({ limit: '4kb' }), (req, res) => {
+  const tok = req.get('X-Internal-Token');
+  const want = process.env.INTERNAL_AUDIT_TOKEN;
+  if (!want || !tok) return res.status(403).json({ ok: false });
+  if (tok.length !== want.length) return res.status(403).json({ ok: false });
+  if (!crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(want))) return res.status(403).json({ ok: false });
+  const { event, target, meta } = req.body || {};
+  if (!audit.eventAllowed(event)) return res.status(400).json({ ok: false, reason: 'event_type' });
+  audit.append({
+    actor: 'system:cron',
+    ip: req.ip,
+    event,
+    target: target || null,
+    result: 'ok',
+    meta_json: JSON.stringify(meta || {})
+  });
+  res.json({ ok: true });
+});
+
+// requireScannerJwt: same as requireAuth but additionally requires role === 'scanner'
+function requireScannerJwt(req, res, next) {
+  // ... reuse the same JWT verification as requireAuth then check role
+  if (!req.user || req.user.role !== 'scanner') return res.status(403).json({ ok: false });
+  next();
+}
```

### H-R9.5-3 — server/audit.js still missing backup/restore/key event types

**WRONG (current EVENT_TYPES set):** missing the 5 new types.

**RIGHT:**

```diff
--- a/server/audit.js
+++ b/server/audit.js
@@
 const EVENT_TYPES = new Set([
   'auth.login', 'auth.logout', 'auth.refresh', 'auth.mfa.setup',
   'admin.user.create', 'admin.user.delete',
-  'audit.read'
+  'audit.read',
+  'auth.cli_mint.ok', 'auth.cli_mint.deny',
+  'backup.completed', 'backup.failed',
+  'restore.drill.completed', 'restore.drill.failed',
+  'key.rotation.completed', 'key.rotation.failed'
 ]);
+
+module.exports.eventAllowed = (e) => typeof e === 'string' && EVENT_TYPES.has(e);
```

### H-R9.5-4 — scripts/backup.sh still 559B (CF-A unchanged from R8 and R9)

This is the third consecutive round this diff has been issued. The full block from R9 §0.2 CF-A still applies verbatim — paste it in. Headlines:

- `OFFSITE_DEST` env var (rclone remote or s3://)
- `BACKUP_GPG_RCPT` for asymmetric encryption
- `gpg --batch --encrypt` to `.gpg`
- `sha256sum` + `gpg --detach-sign` for manifest signing
- `rclone copy --immutable` to offsite
- 14-day local retention via `find -mtime +14 -delete`
- `curl POST /api/internal/audit` with `backup.completed` event (depends on C-R9.5-2 and H-R9.5-3)

Drop the R9 CF-A diff into `scripts/backup.sh` as-is.

### H-R9.5-5 — scripts/install-apparmor.sh missing `aa-enforce`

**Append to existing file (don't replace):**

```diff
--- a/scripts/install-apparmor.sh
+++ b/scripts/install-apparmor.sh
@@ end of file
+
+# === R9.5: switch to enforce mode ===
+aa-enforce /etc/apparmor.d/homelabarr-backend
+aa-enforce /etc/apparmor.d/homelabarr-frontend 2>/dev/null || true
+systemctl reload apparmor
+
+# Verify
+if ! aa-status | grep -E 'homelabarr-(backend|frontend)' | grep -q 'enforce'; then
+  echo 'FAIL: AppArmor profile not in enforce mode' >&2
+  exit 1
+fi
+echo 'AppArmor: homelabarr profiles in enforce mode'
```

### H-R9.5-6 — homelabarr.yml security_opt block missing `apparmor=` line

**WRONG (current):**

```yaml
services:
  backend:
    security_opt:
      - no-new-privileges:true
```

**RIGHT:**

```diff
--- a/homelabarr.yml
+++ b/homelabarr.yml
@@ services:
   backend:
     security_opt:
+      - apparmor=homelabarr-backend
       - no-new-privileges:true
@@ services:
   frontend:
     security_opt:
+      - apparmor=homelabarr-frontend
       - no-new-privileges:true
```


### M-R9.5-7 — HSTS regression: 2y+preload → 180d+no-preload

**Severity:** MEDIUM
**Why:** Browsers can drop a domain from the HSTS preload list if max-age drops below 1 year, and removing the `preload` directive entirely will cause Chrome to deactivate preload protection on next refresh.

**Live observed (decoded charcodes):**

```
Strict-Transport-Security: max-age=15552000; includeSubDomains
```

**Wanted:**

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

**Where to fix:** server/index.js byte-scan shows no HSTS literal (neither 63072000 nor 15552000 nor 'preload' is in the file), so the header is being set by **Cloudflare or Traefik upstream**, not the app.

**Two possible places to check:**

1. **Cloudflare dashboard** → SSL/TLS → Edge Certificates → HSTS → re-enable preload + bump max-age to 2 years
2. **Traefik dynamic config** → look for `headers.stsSeconds` and `headers.stsPreload`:

```yaml
# traefik/dynamic.yml (the file CF-H still says is missing)
http:
  middlewares:
    security-headers:
      headers:
        stsSeconds: 63072000
        stsIncludeSubdomains: true
        stsPreload: true
        forceSTSHeader: true
```

**Owner verification step:** run `curl -sI https://ce-demo.homelabarr.com/ | grep -i strict-transport`. If the value still shows 15552000 after CF dashboard edit, the override is at Traefik or app level.

### M-R9.5-8 — /api/health/detail exists publicly with full payload (CF-D-2)

**Live observed:** `GET /api/health/detail` → 200 OK, body:

```json
{"status":"DEGRADED","timestamp":"...","version":"1.0.0","uptime":80.32,...}
```

This is the **old verbose payload** at the **new path** but **without auth**. Either the agent moved the verbose handler to `/api/health/detail` without adding `requireAdmin` middleware, OR this is the SPA fallback returning the route as a 200. Need source-side confirmation.

**The fix is in C-R9.5-2 above** — the proper `/api/health/detail` handler must be gated by `requireAdmin`.

**Until fixed:** anyone can read uptime, node version, platform, docker status of the backend. Same info-leak class the R6.5-drift-1 was supposed to close — it just moved paths.

### M-R9.5-9 — L-R9-12 DAST webhook notifier missing

R6 already has the webhook infrastructure (HMAC-signed, deduped). Reuse it for DAST findings.

```diff
--- a/.github/workflows/dast-active.yml
+++ b/.github/workflows/dast-active.yml
@@
      - name: Notify on HIGH/CRITICAL
        if: failure()
        env:
          ALERT_HMAC_KEY: ${{ secrets.ALERT_HMAC_KEY }}
          ALERT_WEBHOOK_URL: ${{ secrets.ALERT_WEBHOOK_URL }}
        run: |
          test -f report_json.json || exit 0
          BODY=$(jq -c '{
            event: "dast.finding",
            run_id: "'"$GITHUB_RUN_ID"'",
            repo: "'"$GITHUB_REPOSITORY"'",
            ref: "'"$GITHUB_REF"'",
            findings: [.site[].alerts[] | select((.riskcode|tonumber) >= 2) | {
              id: .pluginid, name: .name, risk: .riskdesc, count: (.instances | length)
            }]
          }' report_json.json)
          SIG=$(printf %s "$BODY" | openssl dgst -sha256 -hmac "$ALERT_HMAC_KEY" -binary | base64)
          curl -fsS -X POST "$ALERT_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -H "X-Sig: $SIG" \
            --data-binary "$BODY"
```

### M-R9.5-10 — L-R9-13 dast-trend.yml weekly rollup missing

Net-new file. Was spec'd in R9 §3 L-R9-13. Drop the YAML from R9 §3 as-is. Headlines:

- Schedule: `cron: '0 6 * * 0'` (Sunday 06:00 UTC)
- Permission: `contents: write` (so the bot can commit `docs/dast-trend.md`)
- Aggregates the prior 7 days of dast-active runs via `gh run list --workflow=dast-active.yml`
- Pulls each artifact's `report_json.json`, counts by severity
- Writes table to `docs/dast-trend.md`, commits as `dast-trend-bot`

### M-R9.5-11 — CF-F: SHA-pin the last 3 @vN in security-audit.yml

21/24 are SHA-pinned. The straggler 3 are blocking 100% supply-chain coverage.

**Owner-runnable script:**

```bash
#!/usr/bin/env bash
set -e
cd $(git rev-parse --show-toplevel)
echo 'Unpinned uses: lines:'
grep -rn 'uses:.*@v[0-9]' .github/workflows/ | tee /tmp/unpinned.txt
echo
echo 'For each line, look up the SHA at:'
echo '  https://github.com/<owner>/<repo>/commits/<tag>'
echo 'Then sed-replace:'
echo '  sed -i "s|@v\(N\.M\.P\)|@<40-char-sha>  # v\1|" <file>'
```

### L-R9.5-12 — CF-H: docs/topology.md + traefik/dynamic.yml STILL missing (now 2 rounds stale)

These were R8 H-R8-5 deliverables. R9 didn't ship them. The spec is in `homelabarr-ce-security-audit-round-8.md` (already committed to the repo at the root, 45954B). Agent should read that file's H-R8-5 section and produce both files verbatim.

**Headline content for `docs/topology.md`:**

- Topology A: single-host (CF → Traefik → all containers on one box, simplest)
- Topology B: split-host (CF → bastion Traefik → mTLS → backend host with everything else)
- mTLS chain: cert authorities, rotation, Traefik dynamic config snippets

**Headline content for `traefik/dynamic.yml`:**

- TLS option set with min TLS 1.2
- Header middleware with HSTS preload + 2yr
- Rate-limit middleware (1000 req/min)
- mTLS client-cert middleware for backend (Topology B)

### L-R9.5-13 — CF-I-1: SECURITY-CONTACTS missing PGP fingerprint

```diff
--- a/SECURITY-CONTACTS
+++ b/SECURITY-CONTACTS
@@
+pgp_fp:       <40-char hex fingerprint, generate with `gpg --fingerprint michael@mjashley.com`>
+pgp_key_url:  https://github.com/smashingtags.gpg
```

Until the owner publishes a PGP key (R9 §6 item 4), this stays a drift.

---

## §3 — Verification (post-R9.5 ship)

All shell-executable. Run after R9.5 lands.

### 3.1 The 4 missing endpoints actually exist

```bash
# /api/health/detail returns 401 unauthenticated
test "$(curl -fsS -o /dev/null -w '%{http_code}' https://ce-demo.homelabarr.com/api/health/detail)" = 401

# /api/_routes returns 401 unauthenticated
test "$(curl -fsS -o /dev/null -w '%{http_code}' https://ce-demo.homelabarr.com/api/_routes)" = 401

# /api/internal/audit returns 403 without internal token
test "$(curl -fsS -o /dev/null -w '%{http_code}' -X POST https://ce-demo.homelabarr.com/api/internal/audit \
  -H 'Content-Type: application/json' -d '{}')" = 403

# /api/auth/cli-mint returns 403 without mint key
test "$(curl -fsS -o /dev/null -w '%{http_code}' -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \
  -H 'Content-Type: application/json' -d '{"u":"test","role":"scanner"}')" = 403
```

### 3.2 Mint endpoint works with the right key

```bash
# Owner-side: export CLI_MINT_KEY first
R=$(curl -fsS -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \
  -H "X-Mint-Key: $CLI_MINT_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"u":"dast-scanner","role":"scanner","ttl_s":1800}')

# Returns JSON with `a` (access token) and `exp`
echo "$R" | jq -e '.a | length > 50'
echo "$R" | jq -e '.exp > (now|floor)'

# Role 'admin' must be rejected (400)
test "$(curl -fsS -o /dev/null -w '%{http_code}' -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \
  -H "X-Mint-Key: $CLI_MINT_KEY" -H 'Content-Type: application/json' \
  -d '{"u":"x","role":"admin"}')" = 400
```

### 3.3 Route manifest enumeration

```bash
JWT=$(curl -fsS -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \
  -H "X-Mint-Key: $CLI_MINT_KEY" -H 'Content-Type: application/json' \
  -d '{"u":"dast-scanner","role":"scanner","ttl_s":600}' | jq -r .a)

M=$(curl -fsS -H "Authorization: Bearer $JWT" https://ce-demo.homelabarr.com/api/_routes)
echo "$M" | jq -e '.count > 20'
echo "$M" | jq -e '.routes[] | select(.path == "/api/applications")'
echo "$M" | jq -e '.routes[] | select(.path == "/api/audit")'
```

### 3.4 backup.completed event flows through internal audit

```bash
# Owner-side: simulate the cron POST
TOK=$(cat /run/secrets/internal_audit_token)
curl -fsS -X POST https://ce-demo.homelabarr.com/api/internal/audit \
  -H "X-Internal-Token: $TOK" \
  -H 'Content-Type: application/json' \
  -d '{"event":"backup.completed","target":"s3://test","meta":{"bytes":12345}}'

# Then admin-fetch /api/audit and confirm event appears
# (need an admin JWT, not scanner)
# Expected: events array contains {event: 'backup.completed', actor: 'system:cron', ...}
```

### 3.5 AppArmor enforce on host

```bash
# Run on the demo host
sudo aa-status | grep -E 'homelabarr-(backend|frontend)' | grep -q 'enforce' && echo OK_aa

# Container runtime verification
docker inspect homelabarr-backend --format '{{json .HostConfig.SecurityOpt}}'
# Expect: ["apparmor=homelabarr-backend","no-new-privileges:true"]
```

### 3.6 HSTS preload restored

```bash
HSTS=$(curl -sI https://ce-demo.homelabarr.com/ | grep -i '^strict-transport-security:' | tr -d '\r')
echo "$HSTS"
echo "$HSTS" | grep -q 'max-age=63072000' || echo 'WARN: max-age below 2yr'
echo "$HSTS" | grep -q 'preload' || echo 'FAIL: preload missing'
```

### 3.7 SHA-pinning at 100%

```bash
# Should print nothing
grep -rn 'uses:.*@v[0-9]' .github/workflows/ && echo FAIL_pinning || echo OK_pinning
```

### 3.8 dast-trend.yml exists + weekly schedule

```bash
test -f .github/workflows/dast-trend.yml
grep -q 'cron:.*0 6 \* \* 0' .github/workflows/dast-trend.yml
grep -q 'contents: write' .github/workflows/dast-trend.yml
```

### 3.9 dast-active.yml has mint + chain.ok + webhook

```bash
grep -q 'cli-mint' .github/workflows/dast-active.yml || { echo FAIL_mint; exit 1; }
grep -q 'chain.ok' .github/workflows/dast-active.yml || { echo FAIL_chain; exit 1; }
grep -q 'ALERT_HMAC_KEY' .github/workflows/dast-active.yml || { echo FAIL_webhook; exit 1; }
echo OK_dast_active
```

### 3.10 backup.sh hardened (size + content)

```bash
test $(wc -c < scripts/backup.sh) -gt 1500
grep -q 'OFFSITE_DEST' scripts/backup.sh
grep -q 'gpg --batch' scripts/backup.sh
grep -q 'sha256sum' scripts/backup.sh
grep -q 'backup.completed' scripts/backup.sh || grep -q '/api/internal/audit' scripts/backup.sh
```

---

## §4 — Out of scope (still queued for R10+)

- **R10:** Adversary emulation playbook (Atomic Red Team mappings tuned to HomelabARR endpoints), scoped exploit kit harness, hash chain rollback drill, container escape verification (gVisor/Kata sidecar option)
- **R11:** Compliance posture mapping — CIS Docker Benchmark, OWASP ASVS L2, NIST CSF 2.0
- **R12 (tentative):** Trusted Types enforce mode (R2.6 carry), SRI on bundled assets, CSP report-uri sink
- **Observability-2:** Wire R6 JSON logs to Loki via `docs/observability-log-shipping.md`

---

## §5 — Owner pile (do not assign to agent)

1. **Generate + publish PGP key** for `michael@mjashley.com`, paste fingerprint into SECURITY-CONTACTS (R9.5 L-R9.5-13)
2. **Cloudflare HSTS settings** — set max-age=63072000, enable preload directive (R9.5 M-R9.5-7)
3. **Decide where HSTS lives** — CF edge only, or also Traefik dynamic.yml (forces Topology B decision earlier than planned)
4. **Add CI secrets** if not yet present:
   - `DAST_MINT_KEY` (32 hex bytes; rotate quarterly)
   - `INTERNAL_AUDIT_TOKEN` (32 hex bytes; backend reads from process.env)
   - `ALERT_HMAC_KEY` (already present from R6, confirm)
   - `ALERT_WEBHOOK_URL` (Slack/Discord/Mattermost)
5. **Apply branch protection** via `gh api -X PUT branches/main/protection` (still pending from R9 §6 item 1)
6. **CF WAF allow-list** for ZAP scanner UA from GH Actions egress (R9 M-R9-11)

---

## §6 — Deliverable

### PR title

```
security(r9.5): wire DAST auth, finish endpoints, harden backup, restore HSTS preload
```

### Squash-commit body

```
Reconciles R9 spec vs ship: the front-half (headers, health min, FP baseline, custom
rules) landed clean. This PR completes the back-half:

  - dast-active.yml: mint exchange + chain.ok post-scan check + webhook notifier
  - server/index.js: /api/health/detail (admin-gated), /api/_routes, /api/internal/audit
  - server/audit.js: register backup.*/restore.*/key.* event types + eventAllowed()
  - scripts/backup.sh: dual-dest + GPG + sha256 + sign + audit POST
  - scripts/install-apparmor.sh: aa-enforce + verify
  - homelabarr.yml: apparmor= line for backend + frontend
  - .github/workflows/dast-trend.yml: weekly trend rollup (new)
  - SECURITY-CONTACTS: PGP fingerprint placeholder
  - SHA-pin final 3 @vN in security-audit.yml

Net-new files spec'd for the agent: docs/topology.md, traefik/dynamic.yml (CF-H,
now 2 rounds stale — content in homelabarr-ce-security-audit-round-8.md).

Owner-side: HSTS preload restore (CF dashboard), PGP publication, mint key rotation.
```

### Branch name

```
security/round-9-5-dast-completion
```

---

## §7 — End / Loop continuation

When R9.5 ships:

1. Re-verify with `?_v=r95verify` cache-bust
2. Pull `security/round-9-5-dast-completion` source
3. Run the §3 verification matrix (10 sub-checks, mostly shell-executable)
4. If green: write **Round 10 — Pentest prep / adversary emulation** as the next downloadable
5. If still drifted (third time): write **R9.6** with whatever's left, and flag the persistent drifts to be moved to the owner pile permanently

---

*Generated 2026-05-22T20:04:08.994Z — source: byte-level scan of `security/round-9-dast-zap@115cf4b97c` via GitHub API + passive recon of ce-demo.homelabarr.com. No exploits run. No code changed.*
