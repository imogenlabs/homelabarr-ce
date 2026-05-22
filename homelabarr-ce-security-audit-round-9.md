# HomelabARR-CE Security Audit — Round 9
**Dimension:** Application-layer DAST, OWASP ZAP baseline-in-CI with HomelabARR-specific active rules, authenticated scan profile, false-positive baseline, blocking gates
**Target:** `smashingtags/homelabarr-ce` @ commit on `security/round-8-deployment-runbook` (06cafcc8bf) + live `ce-demo.homelabarr.com`
**Verified bundle:** `index-BfJq5FsW.js` (first frontend rebuild since R3 — fresh asset, rescan required)
**Method:** read-only source review + passive live recon. No exploits run.
**Format:** Each finding = WRONG / RIGHT diff an agent can implement verbatim.

---

## §0 — Round 8 ship verification + carry-forward consolidation

### 0.1 R8 verification matrix (20 spec items × source + live)

| ID | Spec | Source on `security/round-8-deployment-runbook@06cafcc8bf` | Live | Verdict |
|---|---|---|---|---|
| C-R8-1a | `scripts/backup.sh` w/ dual destination + GPG/age | Present 559B — no dual dest, no encryption, no audit hook | n/a | **DRIFT** |
| C-R8-1b | `scripts/restore-drill.sh` verify path | Present 1205B — verify regex matched | n/a | PASS |
| C-R8-1c | `scripts/backup-cron.sh` schedule + audit hook | Present 746B — schedule + audit pattern matched | n/a | PASS |
| H-R8-2 | fail2ban filter + jail | `docs/fail2ban/homelabarr-filter.conf` (129B) + `homelabarr-jail.conf` (268B). Path atypical but functional. | not externally probeable | PASS (path-shift) |
| H-R8-3 | UFW/nftables host firewall | `scripts/host-firewall-setup.sh` (1315B) — ufw + nft, 22/80/443, default-deny | n/a | PASS |
| H-R8-4 | AppArmor profile + loader | `scripts/install-apparmor.sh` (971B) — profile concept, no `aa-enforce` literal | n/a | **DRIFT** |
| H-R8-5a | `docs/topology.md` A vs B | **MISSING** | n/a | **DRIFT** |
| H-R8-5b | `traefik/dynamic.yml` mTLS chain | **MISSING** (only `traefik/templates/*` exists) | n/a | **DRIFT** |
| H-R8-6 | DR playbook `docs/dr-drill.sh` | Present 1213B — no `throwaway`/`fresh`/`wipe` literal | n/a | **DRIFT** |
| M-R8-7 | HSTS preload max-age 2y | live root returns `max-age=63072000; includeSubDomains; preload` (decoded charcodes) — source location unclear (CF or Traefik, not in server/index.js) | confirmed via charcode probe | PASS |
| M-R8-8 | Strip Server + X-Powered-By | `server/index.js` — no `removeHeader('Server')` / `hidePoweredBy` literal matched | live `Server: cloudflare` (CF terminates, can't see origin) | **DRIFT** (source) |
| M-R8-9a | Disclosure policy in SECURITY.md | Present 12087B — disclosure language matched | n/a | PASS |
| M-R8-9b | PGP key + SECURITY-CONTACTS | `SECURITY-CONTACTS` = 21B = `michael@mjashley.com\n`. No PGP key. | n/a | **DRIFT** |
| M-R8-10 | `observability/vector.toml` stub | **MISSING** — replaced with `docs/observability-log-shipping.md` (spec only, no runnable toml) | n/a | **DRIFT** |
| L-R8-11 | README prod deployment checklist | README 16814B — need line-level grep next round | n/a | DEFERRED |
| L-R8-12 | Makefile w/ guarded danger-wipe | Present 879B, 10 targets, `danger-wipe` target, CONFIRM guard | n/a | PASS |
| L-R8-13 | `backup.completed` audit event | `server/audit.js` has no `backup.completed` / `backup.success` / `backup.fail` literal | `/api/audit` returns 16 events, **0 backup events** | **DRIFT** |
| CF-1 | R6.5-drift-1 health min | n/a — `server/index.js` still emits full payload | `/api/health` returns `DEGRADED` + `nodeVersion` + `platform` (≥400B) — **3 rounds stale** | **DRIFT** |
| CF-2 | R5.5-drift-7 SHA-pinning | `security-audit.yml` uses: 24, SHA-pinned 21, `@vN`-pinned 3 | n/a | **DRIFT (partial)** |
| CF-3 | R5.5-drift-2 packageManager | package.json has `engines` but no `packageManager` field | n/a | **DRIFT** — 5 rounds stale |


### 0.2 Consolidated carry-forwards (verbatim diffs for the agent)

The R8 ship was solid on fail2ban / host firewall / HSTS / Makefile but left a tail. Bundle these into the R8.5 correction MD if you want to keep R9 pure, or fold into R9 PR. Verbatim diffs below.

#### CF-A — scripts/backup.sh hardening (C-R8-1a drift)

```diff
--- a/scripts/backup.sh   # current 559B
+++ b/scripts/backup.sh   # target >=1.6KB
@@
-#!/usr/bin/env bash
-set -euo pipefail
-TS=$(date +%Y%m%d-%H%M%S)
-OUT="/var/backups/homelabarr/${TS}.tar.gz"
-mkdir -p "$(dirname "$OUT")"
-tar -C /app/data -czf "$OUT" homelabarr.db
-echo "OK $OUT"
+#!/usr/bin/env bash
+set -Eeuo pipefail
+TS=$(date +%Y%m%d-%H%M%S)
+LOCAL_DIR="${LOCAL_DIR:-/var/backups/homelabarr}"
+OFFSITE_DEST="${OFFSITE_DEST:?OFFSITE_DEST required (rclone remote or s3:// URI)}"
+RECIPIENT="${BACKUP_GPG_RCPT:?BACKUP_GPG_RCPT required}"
+OUT="${LOCAL_DIR}/homelabarr-${TS}.tar"
+mkdir -p "$LOCAL_DIR"
+
+# 1. Snapshot DB + audit ledger + secrets metadata (NOT secrets themselves)
+tar -cf "$OUT" \
+  -C /app/data homelabarr.db audit.db \
+  -C /run/secrets/.meta . 2>/dev/null || true
+
+# 2. Encrypt to recipient (asymmetric — restore host needs private key only)
+gpg --batch --yes --trust-model always --encrypt --recipient "$RECIPIENT" \
+    --cipher-algo AES256 --compress-algo zlib --output "${OUT}.gpg" "$OUT"
+rm -f "$OUT"
+
+# 3. Hash + sign manifest
+sha256sum "${OUT}.gpg" > "${OUT}.gpg.sha256"
+gpg --batch --yes --detach-sign --local-user "$RECIPIENT" "${OUT}.gpg.sha256"
+
+# 4. Push to offsite (different trust zone, NOT same host)
+rclone copy "${OUT}.gpg" "$OFFSITE_DEST" --immutable --s3-acl=bucket-owner-full-control || \
+  { echo "FAIL: offsite push" >&2; exit 2; }
+rclone copy "${OUT}.gpg.sha256" "$OFFSITE_DEST"
+rclone copy "${OUT}.gpg.sha256.sig" "$OFFSITE_DEST"
+
+# 5. Retention: keep 14 local daily + 12 monthly offsite (offsite enforced via lifecycle rule)
+find "$LOCAL_DIR" -name 'homelabarr-*.gpg' -mtime +14 -delete
+
+# 6. Emit audit event (required by L-R8-13)
+curl -fsS -X POST "http://127.0.0.1:3001/api/internal/audit" \
+  -H "X-Internal-Token: $(cat /run/secrets/internal_audit_token)" \
+  --data-binary '{"event":"backup.completed","target":"'"$OFFSITE_DEST"'","meta":{"bytes":'"$(stat -c%s ${OUT}.gpg)"'}}' \
+  >/dev/null || echo "WARN: audit POST failed" >&2
+
+echo "OK ${OUT}.gpg"
```

#### CF-B — server/audit.js register backup.* event types (L-R8-13 drift)

```diff
--- a/server/audit.js
+++ b/server/audit.js
@@
 const EVENT_TYPES = new Set([
-  'auth.login', 'auth.logout', 'auth.refresh', 'auth.mfa.setup',
-  'admin.user.create', 'admin.user.delete',
-  'audit.read'
+  'auth.login', 'auth.logout', 'auth.refresh', 'auth.mfa.setup',
+  'admin.user.create', 'admin.user.delete',
+  'audit.read',
+  'backup.completed', 'backup.failed',
+  'restore.drill.completed', 'restore.drill.failed',
+  'key.rotation.completed'
 ]);
```

Internal audit ingress endpoint for the cron job (bound to 127.0.0.1):

```diff
--- a/server/index.js
+++ b/server/index.js
@@
+app.post('/api/internal/audit', express.json({ limit: '4kb' }), (req, res) => {
+  const tok = req.get('X-Internal-Token');
+  const want = process.env.INTERNAL_AUDIT_TOKEN;
+  if (!want || !tok || !crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(want))) {
+    return res.status(403).json({ ok: false });
+  }
+  const { event, target, meta } = req.body || {};
+  if (!audit.eventAllowed(event)) return res.status(400).json({ ok: false, reason: 'event_type' });
+  audit.append({ actor: 'system:cron', ip: req.ip, event, target: target || null, result: 'ok', meta_json: JSON.stringify(meta || {}) });
+  res.json({ ok: true });
+});
```

#### CF-C — AppArmor enforce-mode (H-R8-4 drift)

```diff
--- a/scripts/install-apparmor.sh
+++ b/scripts/install-apparmor.sh
@@
+# Final step: switch profile to enforce mode (not complain)
+aa-enforce /etc/apparmor.d/homelabarr-backend
+aa-enforce /etc/apparmor.d/homelabarr-frontend 2>/dev/null || true
+systemctl reload apparmor
+
+aa-status | grep -E 'homelabarr-(backend|frontend)' | grep -q 'enforce' \
+  || { echo 'FAIL: AppArmor profile not in enforce mode' >&2; exit 1; }
+echo 'AppArmor: homelabarr profiles in enforce mode'
```

Wire to compose:

```diff
--- a/homelabarr.yml
+++ b/homelabarr.yml
@@ services:
   backend:
+    security_opt:
+      - apparmor=homelabarr-backend
+      - no-new-privileges:true
```

#### CF-D — /api/health minimization (R6.5-drift-1, 3 rounds stale — MUST land this round)

```diff
--- a/server/index.js
+++ b/server/index.js
@@
-app.get('/api/health', (req, res) => {
-  res.json({ status: degraded ? 'DEGRADED' : 'OK', timestamp: ..., version: pkg.version,
-    uptime: process.uptime(), platform: { ..., nodeVersion: process.version, ... },
-    docker: {...}, database: {...} });
-});
+// Public health: 3 keys only. No version, no node version, no platform.
+app.get('/api/health', (req, res) => {
+  res.set('Cache-Control', 'no-store');
+  res.json({ ok: true, ts: Math.floor(Date.now()/1000), state: degraded ? 'degraded' : 'ready' });
+});
+
+// Detail: admin-only, behind auth middleware
+app.get('/api/health/detail', requireAdmin, (req, res) => {
+  res.json({ state: degraded ? 'degraded' : 'ready', version: pkg.version,
+    uptime: process.uptime(), platform: { os: os.platform(), arch: os.arch(), node: process.version },
+    docker: getDockerStatus(), database: getDbStatus() });
+});
```

#### CF-E — Strip Server + X-Powered-By at origin (M-R8-8 drift)

```diff
--- a/server/index.js
+++ b/server/index.js
@@
 const app = express();
+app.disable('x-powered-by');
+app.use((req, res, next) => { res.removeHeader('Server'); next(); });
```

(CF rewrites Server on the edge so externally invisible, but defense-in-depth and matters for split-host Topology B where Traefik proxies a non-CF backend.)

#### CF-F — Finish SHA-pinning the last 3 uses: entries (R5.5-drift-7)

security-audit.yml still has 3 entries on @vN mutable tags. Run:

```bash
grep -rn 'uses:.*@v[0-9]' .github/workflows/ | tee /tmp/unpinned.txt
# For each line, look up SHA at github.com/<owner>/<repo>/commits/<tag>
# Replace @vN -> @<40-char-sha>  # <vN>
```

#### CF-G — Add packageManager to package.json (R5.5-drift-2, 5 rounds stale)

```diff
--- a/package.json
+++ b/package.json
@@
   "engines": { "node": ">=20.0.0", "npm": ">=9.0.0" },
+  "packageManager": "npm@10.8.2+sha512.<corepack-published-hash>",
```

(Get the exact hash from `corepack use npm@10.8.2` then commit the resulting field.)

#### CF-H — docs/topology.md + traefik/dynamic.yml (H-R8-5 drift)

Net-new files. Spec stays as written in R8 §3 H-R8-5 (Topology A vs B + mTLS chain) — agent should reference homelabarr-ce-security-audit-round-8.md already committed to the repo.

#### CF-I — Expand SECURITY-CONTACTS + add /.well-known/security.txt (M-R8-9b drift)

```diff
--- a/SECURITY-CONTACTS
+++ b/SECURITY-CONTACTS
@@
-michael@mjashley.com
+# HomelabARR-CE security contacts
+# Coordinated disclosure: 90 days from confirmed receipt
+primary:      michael@mjashley.com
+pgp_fp:       <40-char hex fingerprint>
+pgp_key_url:  https://github.com/smashingtags.gpg
+response_sla: 72h initial ack, weekly status thereafter
+canary:       https://ce-demo.homelabarr.com/.well-known/security.txt
```

And add /.well-known/security.txt as a static asset (public/.well-known/security.txt):

```text
Contact: mailto:michael@mjashley.com
Contact: https://github.com/smashingtags/homelabarr-ce/security/advisories/new
Expires: 2027-01-01T00:00:00.000Z
Preferred-Languages: en
Canonical: https://ce-demo.homelabarr.com/.well-known/security.txt
Policy: https://github.com/smashingtags/homelabarr-ce/blob/main/SECURITY.md
```

---

## §1 — Goal

Round 9 builds the **outside-in attack surface verifier**: an automated DAST pipeline that runs in CI on every PR + on a nightly schedule against `ce-demo.homelabarr.com`. We treat the running container the way an unauthenticated remote attacker does — no source access, no privileged probes, just HTTP. We layer two ZAP scan modes:

1. **Baseline (passive)** — non-attacking spider + passive rules. Fast (<5min). Runs on every PR.
2. **Active scan (authenticated)** — authenticated as a low-priv user (via JWT injected from a CI secret), runs active attack rules (SQLi, XSS, SSRF, command injection, path traversal, IDOR). Slower (15-25min). Runs nightly + on `security/*` branches.

Both gated by a **false-positive baseline** (`zap-baseline.json`) checked into the repo so noise is suppressed and only NEW findings break the build. Critical/High findings outside the baseline = job fails = PR blocked.

Plus three HomelabARR-specific active rules nobody else writes for us:
- **RULE-HLA-1**: Docker socket exfiltration via /api/containers parameter injection
- **RULE-HLA-2**: Template name path traversal in /api/applications/:id (the 116-app catalog is the attack surface)
- **RULE-HLA-3**: Audit-log truncation via X-Forwarded-For spoofing (the R6 hash chain must hold even with header injection)

### Threat model addressed

- Unauthenticated remote attacker with curl + ZAP
- Low-priv authenticated user attempting privilege escalation
- Supply-chain implant in a dependency that ships a backdoor route (caught by full-route enumeration vs OpenAPI manifest)
- Regression risk: future PRs accidentally remove a header, re-expose a debug route, or break CSP

### Out of model (defer)

- White-box code-injection fuzzing (R10 pentest prep)
- Compliance attestation (R11 ASVS / NIST CSF / CIS Docker mapping)
- Kernel-level eBPF runtime monitoring (separate workstream)

---

## §2 — Current state (verified)

### 2.1 What's already running

- `.github/workflows/security-audit.yml` (21523B on R8 branch) — runs npm audit, Trivy, Hadolint, gitleaks, Semgrep, CodeQL. **No DAST.**
- `.github/workflows/scorecard.yml` — OSSF Scorecard. **No DAST.**
- `.github/workflows/whitelabel-audit.yml` — branding/license check. **No DAST.**
- Live `ce-demo.homelabarr.com` has CF in front + Traefik + 5 containers. HSTS preload confirmed. Bundle `index-BfJq5FsW.js` is fresh (rebuild detected this round).

### 2.2 What's missing

- Zero authenticated-scan coverage. The 116-app catalog endpoint, `/api/applications/:id`, `/api/containers`, `/api/audit`, `/api/auth/*` family — none have been hit by an automated scanner against the live binding.
- No FP baseline → any DAST today would dump thousands of low-confidence findings and get muted within a week.
- No nightly scheduled scan. The only thing hitting the prod-like demo is humans.
- No OpenAPI / route manifest published, so scanners can't enumerate the surface exhaustively — they have to guess.

### 2.3 Live recon snapshot (passive, captured 2026-05-22T19:14:52.588Z)

- `/api/applications` → 200, 116 apps catalog, JSON Content-Type
- `/api/containers` → 200, empty list, `docker.status: connected`, message `CLI-based Docker access` (R4 socket-proxy active)
- `/api/audit` → 200, returns last events + hash chain {ok:true, rows:15}
- `/api/health` → 200, full payload incl `DEGRADED`+`nodeVersion`+`platform` (CF-D drift)
- `/api/health/detail` → 404 (path doesn't exist yet)
- `/api/auth/login` → endpoint reachable (probe blocked by content shim)
- `/api/auth/refresh` → endpoint reachable
- `/api/auth/mfa/setup` → endpoint reachable
- `X-Request-Id` round-trip: sent `r8verify-oaqgrh`, received same back in response → R6 tracing live
- Root response headers: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: <missing>`, `Server: cloudflare` (origin obscured), HSTS preload confirmed via decoded charcodes (max-age=63072000)
- Bundle: `index-BfJq5FsW.js` (fresh — first rebuild since R3-era `index-pjntRCiX.js`)

---

## §3 — Findings (this round)

Severity = impact on the loop **if not shipped**. Each one has a verbatim WRONG/RIGHT diff or net-new file body the agent can drop in.

### C-R9-1 — No DAST in CI at all (the entire round)

**Severity:** CRITICAL
**Why:** We've spec'd 112 inside-out improvements over 8 rounds and zero outside-in verification. A single regression PR could remove `helmet()` or revert CSP and we'd find out from a human, not a job.

**WRONG:** No DAST workflow.

**RIGHT:** Net-new file `.github/workflows/dast-baseline.yml`

```yaml
name: DAST Baseline (ZAP)

on:
  pull_request:
    branches: [main]
    paths:
      - 'server/**'
      - 'src/**'
      - 'homelabarr.yml'
      - 'Dockerfile*'
      - '.github/workflows/dast-*.yml'
  schedule:
    - cron: '17 3 * * *'  # 03:17 UTC daily, offset from other jobs
  workflow_dispatch:

permissions:
  contents: read
  issues: write          # to file findings as issues
  pull-requests: write   # to comment on PR

concurrency:
  group: dast-baseline-${{ github.ref }}
  cancel-in-progress: true

jobs:
  zap-baseline:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@<40-char-sha>  # v4.x
        with:
          persist-credentials: false

      - name: Resolve target
        id: target
        run: |
          # PR: use demo. Scheduled: use demo. workflow_dispatch: allow override.
          TARGET='${{ inputs.target || vars.DAST_TARGET || 'https://ce-demo.homelabarr.com' }}'
          echo "target=$TARGET" >> $GITHUB_OUTPUT

      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@<40-char-sha>  # v0.13.0
        with:
          target: ${{ steps.target.outputs.target }}
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a -j -z "-config rules.cookie.ignorelist=__cf_bm,cf_clearance -config api.disablekey=true"'
          allow_issue_writing: true
          issue_title: 'DAST baseline finding'
          fail_action: true       # FAIL the job on new C/H/M
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@<40-char-sha>  # v4.x
        with:
          name: zap-baseline-${{ github.run_id }}
          path: |
            report_html.html
            report_md.md
            report_json.json
          retention-days: 30
```

### C-R9-2 — Authenticated active scan (nightly)

**Severity:** CRITICAL (paired with C-R9-1)
**Why:** Baseline is passive only. The actual app logic — auth flows, audit chain, application install endpoints, container endpoints — is only reachable to a logged-in user. Without authenticated scanning, the entire backend surface is dark to DAST.

**RIGHT:** Net-new file `.github/workflows/dast-active.yml`

```yaml
name: DAST Active Scan (authenticated)

on:
  schedule:
    - cron: '47 4 * * *'  # 04:47 UTC daily
  push:
    branches: ['security/**']
  workflow_dispatch:
    inputs:
      target:
        description: 'Target URL'
        required: false
      profile:
        description: 'Scan profile'
        required: true
        default: 'full'
        type: choice
        options: [full, quick, ajax]

permissions:
  contents: read
  issues: write

jobs:
  zap-active:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      ZAP_TARGET: ${{ inputs.target || 'https://ce-demo.homelabarr.com' }}
      ZAP_USER_USERNAME: ${{ secrets.DAST_USER }}
      ZAP_USER_TOKEN_NAME: ${{ secrets.DAST_USER_TOKEN_NAME }}
      ZAP_USER_TOKEN_VALUE: ${{ secrets.DAST_USER_TOKEN_VALUE }}
    steps:
      - name: Checkout
        uses: actions/checkout@<40-char-sha>
        with:
          persist-credentials: false

      - name: Mint short-lived JWT for the scanner
        id: jwt
        run: |
          # Mint a 30-min low-priv access token via the demo's CLI mint endpoint
          # (mint endpoint is admin-locked; secret is held in GH actions secret).
          T=$(curl -fsS -X POST "$ZAP_TARGET/api/auth/cli-mint" \
            -H 'X-Mint-Key: '"${{ secrets.DAST_MINT_KEY }}" \
            -H 'Content-Type: application/json' \
            -d '{"u":"'"$ZAP_USER_USERNAME"'","role":"viewer","ttl_s":1800}' \
            | jq -r .a)
          test -n "$T" && test "$T" != null
          echo "::add-mask::$T"
          echo "jwt=$T" >> $GITHUB_OUTPUT

      - name: ZAP Full Scan (authenticated)
        uses: zaproxy/action-full-scan@<40-char-sha>  # v0.10.0
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

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@<40-char-sha>
        with:
          name: zap-active-${{ github.run_id }}
          path: |
            report_html.html
            report_md.md
            report_json.json
          retention-days: 90

      - name: Verify hash chain held
        if: always()
        run: |
          # The audit chain MUST still verify after the scan or rule RULE-HLA-3 failed.
          RESULT=$(curl -fsS -H 'Authorization: Bearer ${{ steps.jwt.outputs.jwt }}' \
            "$ZAP_TARGET/api/audit?limit=1" | jq -r '.chain.ok')
          test "$RESULT" = 'true' || { echo 'AUDIT CHAIN BROKEN POST-SCAN'; exit 2; }
```

### H-R9-3 — `.zap/rules.tsv` FP baseline (suppresses known-false, keeps real)

**WRONG:** No baseline → every scan dumps the same `Content-Type: text/html` warnings on docs paths, the CF-set cookies as `cookie not HttpOnly`, etc., and the job is muted.

**RIGHT:** Net-new file `.zap/rules.tsv` (tab-separated, no blanks)

```tsv
10202	IGNORE	(Absence of Anti-CSRF Tokens) GET-only endpoints
10038	IGNORE	(CSP) — covered by ours; ZAP misreads connect-src wildcard
10049	IGNORE	(Cookies set via CF __cf_bm) — not ours
10055	IGNORE	(CSP scanner) — false positive on Cloudflare RUM
10063	WARN	(Permissions-Policy) — track but don't fail
90004	IGNORE	(Insufficient Site Isolation) — SPA, no third-party iframes
10096	WARN	(Timestamp Disclosure) — uptime in /api/health (drift, will fix)
10027	IGNORE	(Information Disclosure - Suspicious Comments) — source maps OK in dev/demo
```

### H-R9-4 — Custom rule pack `.zap/rules-hla.zaprules` (the three HomelabARR-specific actives)

**WRONG:** Stock ZAP has no rule that knows our route shape.

**RIGHT:** Net-new file `.zap/rules-hla.zaprules` (custom passive + active rules in ZAP JSON-rules format)

```json
{
  "rules": [
    {
      "id": "RULE-HLA-1",
      "name": "Docker socket exfiltration probe via /api/containers",
      "description": "Send /api/containers?cmd=ps&args=; cat /var/run/docker.sock — must NOT return non-empty body. Backend should reject any extra params.",
      "severity": "HIGH",
      "type": "active",
      "target": "/api/containers",
      "payloads": [
        "?cmd=ps&args=$(cat /var/run/docker.sock)",
        "?image=alpine;cat /var/run/docker.sock",
        "?filter[]=../../../var/run/docker.sock"
      ],
      "detect": ["^application/octet-stream", "HTTP/1\\.[01].* 200", "docker.sock"]
    },
    {
      "id": "RULE-HLA-2",
      "name": "Template path traversal in /api/applications/:id",
      "description": "The 116-app catalog serves template YAML by id. Verify ids are whitelisted and ../ is rejected.",
      "severity": "HIGH",
      "type": "active",
      "target": "/api/applications/{id}",
      "payloads": [
        "../../../etc/passwd",
        "..%2f..%2f..%2fetc%2fpasswd",
        "....//....//etc/passwd",
        "plex/../../../etc/hostname"
      ],
      "detect": ["root:x:0:0", "daemon:x:1:1", "^[a-z0-9-]+$"],
      "expected_status": [400, 404]
    },
    {
      "id": "RULE-HLA-3",
      "name": "Audit hash-chain integrity under header spoofing",
      "description": "Send authenticated traffic with X-Forwarded-For: 127.0.0.1, X-Real-IP: <admin>, X-Original-User: admin. After scan, /api/audit?limit=1 chain.ok must still be true.",
      "severity": "CRITICAL",
      "type": "active",
      "headers": {
        "X-Forwarded-For": "127.0.0.1",
        "X-Real-IP": "127.0.0.1",
        "X-Original-User": "admin",
        "X-Forwarded-User": "admin",
        "X-Remote-User": "admin"
      },
      "post_scan_check": "GET /api/audit?limit=1 | jq .chain.ok == true"
    }
  ]
}
```

And register the rule pack in `.zap/scan-config.yml`:

```yaml
env:
  contexts:
    - name: homelabarr
      urls: ['https://ce-demo.homelabarr.com']
      includePaths: ['https://ce-demo.homelabarr.com/.*']
      excludePaths:
        - 'https://ce-demo.homelabarr.com/api/auth/forgot-password.*'  # don't spam the email queue
        - 'https://ce-demo.homelabarr.com/api/auth/reset-password.*'
      authentication:
        method: bearer
        parameters:
          loginPageUrl: ''
          # token supplied via -config replacer above
      sessionManagement:
        method: headers
  parameters:
    failOnError: true
    progressToStdout: true
customRulesFile: '.zap/rules-hla.zaprules'
```

### H-R9-5 — CLI mint endpoint for short-lived scanner JWT

**Why:** Storing long-lived admin JWTs in GitHub Actions secrets is a recurring pwn vector. Instead, hold a high-entropy mint key, exchange it for a 30-min low-priv scan token at job start, scope to `viewer`.

**WRONG:** No mint endpoint exists; CI would have to store a long-lived JWT.

**RIGHT:** Net-new route, gated by env-supplied mint key.

```diff
--- a/server/index.js
+++ b/server/index.js
@@
+// CLI/CI mint endpoint — exchanges a high-entropy mint key for a short-lived JWT.
+// Mint key is rotated quarterly via scripts/rotate-mint-key.sh.
+app.post('/api/auth/cli-mint', express.json({ limit: '1kb' }), async (req, res) => {
+  const mintKey = req.get('X-Mint-Key');
+  const want = process.env.CLI_MINT_KEY;
+  if (!want || !mintKey || !crypto.timingSafeEqual(Buffer.from(mintKey), Buffer.from(want))) {
+    audit.append({ actor: 'unknown', ip: req.ip, event: 'auth.cli_mint.deny', result: 'fail', meta_json: '{}' });
+    return res.status(403).json({ ok: false });
+  }
+  const { u, role = 'viewer', ttl_s = 1800 } = req.body || {};
+  if (!u || typeof u !== 'string' || !/^[a-z0-9._-]{3,32}$/.test(u)) return res.status(400).json({ ok: false });
+  if (!['viewer', 'scanner'].includes(role)) return res.status(400).json({ ok: false });
+  if (ttl_s < 60 || ttl_s > 3600) return res.status(400).json({ ok: false });
+  const a = await mintAccessJwt({ sub: u, role, scope: 'ci_scan', kid: currentKid() }, ttl_s);
+  audit.append({ actor: u, ip: req.ip, event: 'auth.cli_mint.ok', result: 'ok', meta_json: JSON.stringify({ role, ttl_s }) });
+  res.json({ a, exp: Math.floor(Date.now()/1000) + ttl_s });
+});
```

### H-R9-6 — Route manifest endpoint `/api/_routes` (CI-only, gated)

**Why:** Without an enumeration, ZAP only finds what it can spider. Hidden routes (admin-only, debug, internal) escape. Publish a manifest the scanner can read so coverage is verifiable.

**WRONG:** No route manifest, no scanner-side coverage measurement.

**RIGHT:**

```diff
--- a/server/index.js
+++ b/server/index.js
@@
+// Route manifest — emits the full route table for scanner enumeration.
+// Gated on the same mint key + role=scanner JWT.
+app.get('/api/_routes', requireScannerJwt, (req, res) => {
+  const routes = app._router.stack
+    .filter(layer => layer.route)
+    .map(layer => ({
+      path: layer.route.path,
+      methods: Object.keys(layer.route.methods).filter(m => layer.route.methods[m]).map(m => m.toUpperCase()),
+      // Don't emit middleware names or handler bodies — just shape.
+    }))
+    .sort((a,b) => a.path.localeCompare(b.path));
+  res.json({ count: routes.length, routes });
+});
```

And add a coverage-check step to `dast-active.yml`:

```yaml
      - name: Verify scanner hit every route
        run: |
          MANIFEST=$(curl -fsS -H 'Authorization: Bearer ${{ steps.jwt.outputs.jwt }}' "$ZAP_TARGET/api/_routes" | jq -r '.routes[].path')
          HIT=$(jq -r '.site[].alerts[].instances[].uri' report_json.json | awk -F/ 'NF>=4{print "/"$4"/"$5}' | sort -u)
          MISSED=$(comm -23 <(echo "$MANIFEST"|sort) <(echo "$HIT"|sort))
          if [ -n "$MISSED" ]; then
            echo "Routes not exercised by scan:"
            echo "$MISSED"
            # Don't fail the build (yet) — just warn. Failing is the next round.
          fi
```

### H-R9-7 — Block CodeQL + Trivy + DAST findings as PR-gate

**WRONG:** Findings currently file as advisories but don't block merge. PRs can ship with C/H criticals.

**RIGHT:** Branch protection rule (owner-side action, document only) + workflow `required` status checks:

```yaml
# .github/branch-protection.yml (documentation only; applied via gh CLI by owner)
# After R9 ships:
#   gh api -X PUT \
#     repos/smashingtags/homelabarr-ce/branches/main/protection \
#     -F required_status_checks.strict=true \
#     -F required_status_checks.contexts[]=zap-baseline \
#     -F required_status_checks.contexts[]=zap-active \
#     -F required_status_checks.contexts[]=codeql \
#     -F required_status_checks.contexts[]=trivy \
#     -F enforce_admins=true \
#     -F required_pull_request_reviews.required_approving_review_count=1
```

### M-R9-8 — Referrer-Policy header (gap caught in live probe)

Live `/api/applications` returns no `Referrer-Policy`. CF doesn't set one. Origin should.

```diff
--- a/server/index.js
+++ b/server/index.js
@@
 app.use(helmet({
   contentSecurityPolicy: { ... },
+  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
 }));
```

### M-R9-9 — Permissions-Policy (modern replacement for Feature-Policy)

```diff
--- a/server/index.js
+++ b/server/index.js
@@
+app.use((req, res, next) => {
+  res.setHeader('Permissions-Policy', [
+    'accelerometer=()', 'camera=()', 'geolocation=()', 'gyroscope=()',
+    'magnetometer=()', 'microphone=()', 'payment=()', 'usb=()',
+    'interest-cohort=()', 'browsing-topics=()'
+  ].join(', '));
+  next();
+});
```

### M-R9-10 — Cross-Origin headers (COOP / COEP / CORP)

```diff
--- a/server/index.js
+++ b/server/index.js
@@
 app.use(helmet({
+  crossOriginOpenerPolicy: { policy: 'same-origin' },
+  crossOriginResourcePolicy: { policy: 'same-site' },
+  // COEP intentionally NOT set to 'require-corp' — would break embeddable widgets.
+  // Document the choice in SECURITY.md.
 }));
```

### M-R9-11 — Scanner allow-list bypass for CF Bot Fight Mode

**Problem:** Cloudflare's Bot Fight Mode will rate-limit / 403 the ZAP scanner UA after the first few hundred requests, killing scan coverage.

**RIGHT:** Owner-side config note — create a CF WAF Custom Rule:

```text
Rule name: dast-scanner-allowlist
Expression: (http.user_agent contains "ZAP/2") and (ip.src in {<github-actions-egress-cidrs>})
Action: Skip → Bot Fight Mode, Browser Integrity Check, Rate Limiting
```

(GitHub publishes egress IP ranges at `https://api.github.com/meta` under `actions` — refresh quarterly via owner-side script.)

### L-R9-12 — Slack / webhook DAST finding notifier

```diff
--- a/.github/workflows/dast-active.yml
+++ b/.github/workflows/dast-active.yml
@@
      - name: Notify on new HIGH/CRITICAL
        if: failure()
        env:
          ALERT_HMAC_KEY: ${{ secrets.ALERT_HMAC_KEY }}
          ALERT_WEBHOOK_URL: ${{ secrets.ALERT_WEBHOOK_URL }}
        run: |
          BODY=$(jq -c '{ event: "dast.finding", run_id: env.GITHUB_RUN_ID, repo: env.GITHUB_REPOSITORY, findings: [.site[].alerts[] | select(.riskcode|tonumber>=2)] }' report_json.json)
          SIG=$(printf %s "$BODY" | openssl dgst -sha256 -hmac "$ALERT_HMAC_KEY" -binary | base64)
          curl -fsS -X POST "$ALERT_WEBHOOK_URL" -H 'Content-Type: application/json' -H "X-Sig: $SIG" --data-binary "$BODY"
```

### L-R9-13 — Weekly trend doc `docs/dast-trend.md` (auto-generated)

Add a job that runs `Sunday 06:00 UTC`, aggregates the prior 7 days of DAST runs, and commits a trend table to `docs/dast-trend.md`. Lets the maintainer see if FP-baseline drift or finding-count regression is happening week over week.

```yaml
# .github/workflows/dast-trend.yml
name: DAST Trend
on:
  schedule: [{ cron: '0 6 * * 0' }]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  trend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<40-char-sha>
      - run: |
          gh run list --workflow=dast-active.yml --created='>$(date -u -d "7 days ago" +%Y-%m-%d)' --json databaseId,conclusion,createdAt > runs.json
          # Pull each artifact, parse report_json.json, aggregate counts by severity
          # ...
          # Write docs/dast-trend.md and commit
          git config user.name 'dast-trend-bot'
          git config user.email 'noreply@github.com'
          git add docs/dast-trend.md
          git commit -m 'chore(dast): weekly trend update' || exit 0
          git push
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## §4 — Verification (post-ship)

After the agent ships R9, run these on a clean checkout + against `ce-demo.homelabarr.com`. Each one is shell-executable; if you can't reach the demo from your dev box, paste them into the workflow's `workflow_dispatch` and capture artifacts.

### 4.1 Baseline workflow exists + structure

```bash
test -f .github/workflows/dast-baseline.yml || { echo FAIL baseline missing; exit 1; }
grep -q 'zaproxy/action-baseline' .github/workflows/dast-baseline.yml || { echo FAIL baseline action; exit 1; }
grep -q 'fail_action: true' .github/workflows/dast-baseline.yml || { echo FAIL not gating; exit 1; }
grep -q '@[a-f0-9]\{40\}' .github/workflows/dast-baseline.yml || { echo FAIL not SHA-pinned; exit 1; }
echo 'OK baseline workflow'
```

### 4.2 Active workflow exists + auth replacer wired

```bash
test -f .github/workflows/dast-active.yml || { echo FAIL active missing; exit 1; }
grep -q 'zaproxy/action-full-scan' .github/workflows/dast-active.yml
grep -q 'replacer.full_list' .github/workflows/dast-active.yml
grep -q 'cli-mint' .github/workflows/dast-active.yml
grep -q 'chain.ok' .github/workflows/dast-active.yml  # post-scan integrity check
echo 'OK active workflow'
```

### 4.3 FP baseline + custom rules

```bash
test -f .zap/rules.tsv
test -f .zap/rules-hla.zaprules
test -f .zap/scan-config.yml
jq -e '.rules | length == 3' .zap/rules-hla.zaprules > /dev/null
jq -e '.rules[] | select(.id == "RULE-HLA-1")' .zap/rules-hla.zaprules > /dev/null
jq -e '.rules[] | select(.id == "RULE-HLA-2")' .zap/rules-hla.zaprules > /dev/null
jq -e '.rules[] | select(.id == "RULE-HLA-3")' .zap/rules-hla.zaprules > /dev/null
echo 'OK rule pack'
```

### 4.4 Mint endpoint behaves

```bash
# Wrong key → 403
curl -fsS -o /dev/null -w '%{http_code}' -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \
  -H 'X-Mint-Key: wrong' -H 'Content-Type: application/json' \
  -d '{"u":"dast","role":"viewer"}' | grep -q 403

# Right key → 200 with short JWT
R=$(curl -fsS -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \
  -H "X-Mint-Key: $CLI_MINT_KEY" -H 'Content-Type: application/json' \
  -d '{"u":"dast","role":"viewer","ttl_s":1800}')
echo "$R" | jq -e '.a | length > 50' > /dev/null
echo "$R" | jq -e '.exp > (now|floor)' > /dev/null

# Role 'admin' must be rejected
curl -fsS -o /dev/null -w '%{http_code}' -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \
  -H "X-Mint-Key: $CLI_MINT_KEY" -H 'Content-Type: application/json' \
  -d '{"u":"dast","role":"admin"}' | grep -q 400
echo 'OK mint endpoint'
```

### 4.5 Route manifest enumeration

```bash
JWT=$(curl -fsS -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \
  -H "X-Mint-Key: $CLI_MINT_KEY" -H 'Content-Type: application/json' \
  -d '{"u":"dast","role":"scanner","ttl_s":600}' | jq -r .a)

R=$(curl -fsS -H "Authorization: Bearer $JWT" https://ce-demo.homelabarr.com/api/_routes)
echo "$R" | jq -e '.count > 20' > /dev/null
echo "$R" | jq -e '.routes[] | select(.path == "/api/applications")' > /dev/null
echo "$R" | jq -e '.routes[] | select(.path == "/api/audit")' > /dev/null
echo 'OK route manifest'
```

### 4.6 RULE-HLA-1 (Docker socket exfil) returns 400/404

```bash
for P in '?cmd=ps&args=$(cat /var/run/docker.sock)' '?image=alpine;cat /var/run/docker.sock' '?filter[]=../../../var/run/docker.sock'; do
  CODE=$(curl -fsS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $JWT" \
    "https://ce-demo.homelabarr.com/api/containers$P")
  echo "$P -> $CODE"
  case "$CODE" in 400|404|422) ;; *) echo FAIL RULE-HLA-1 $P returned $CODE; exit 1 ;; esac
done
echo 'OK RULE-HLA-1'
```

### 4.7 RULE-HLA-2 (template traversal) returns 400/404

```bash
for P in '../../../etc/passwd' '..%2f..%2f..%2fetc%2fpasswd' '....//....//etc/passwd' 'plex/../../../etc/hostname'; do
  CODE=$(curl -fsS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $JWT" \
    "https://ce-demo.homelabarr.com/api/applications/$P")
  echo "$P -> $CODE"
  case "$CODE" in 400|404) ;; *) echo FAIL RULE-HLA-2 $P returned $CODE; exit 1 ;; esac
done
echo 'OK RULE-HLA-2'
```

### 4.8 RULE-HLA-3 (header spoof + audit chain integrity)

```bash
# Pre-scan baseline
PRE=$(curl -fsS -H "Authorization: Bearer $JWT" 'https://ce-demo.homelabarr.com/api/audit?limit=1' | jq -r '.chain.ok')
test "$PRE" = 'true'

# Send 200 requests with spoofed identity headers
for i in $(seq 1 200); do
  curl -fsS -o /dev/null \
    -H "Authorization: Bearer $JWT" \
    -H 'X-Forwarded-For: 127.0.0.1' \
    -H 'X-Real-IP: 127.0.0.1' \
    -H 'X-Original-User: admin' \
    -H 'X-Forwarded-User: admin' \
    https://ce-demo.homelabarr.com/api/audit?limit=1 || true
done

# Chain must still verify
POST=$(curl -fsS -H "Authorization: Bearer $JWT" 'https://ce-demo.homelabarr.com/api/audit?limit=1' | jq -r '.chain.ok')
test "$POST" = 'true' || { echo FAIL audit chain broken; exit 1; }
echo 'OK RULE-HLA-3'
```

### 4.9 New security headers landed

```bash
H=$(curl -sI https://ce-demo.homelabarr.com/api/applications)
echo "$H" | grep -qi '^Referrer-Policy:' || { echo FAIL referrer-policy; exit 1; }
echo "$H" | grep -qi '^Permissions-Policy:' || { echo FAIL permissions-policy; exit 1; }
echo "$H" | grep -qi '^Cross-Origin-Opener-Policy:' || { echo FAIL coop; exit 1; }
echo "$H" | grep -qi '^Cross-Origin-Resource-Policy:' || { echo FAIL corp; exit 1; }
echo 'OK new headers'
```

### 4.10 Carry-forward drifts cleared

```bash
# CF-D: /api/health min — 3 keys only
curl -fsS https://ce-demo.homelabarr.com/api/health | jq -e 'keys|sort == ["ok","state","ts"]' > /dev/null && echo 'OK CF-D' || { echo FAIL CF-D health still verbose; exit 1; }

# CF-D: /api/health/detail requires auth
test "$(curl -fsS -o /dev/null -w '%{http_code}' https://ce-demo.homelabarr.com/api/health/detail)" = 401 || { echo FAIL CF-D detail not gated; exit 1; }

# CF-B + L-R8-13: backup.completed events flowing
curl -fsS -H "Authorization: Bearer $JWT" https://ce-demo.homelabarr.com/api/audit?limit=50 | jq -e '[.events[].event] | any(. == "backup.completed")' > /dev/null && echo 'OK CF-B'

# CF-C: AppArmor enforce
# (run on host) aa-status | grep homelabarr-backend | grep enforce

# CF-G: packageManager field
jq -e '.packageManager' package.json > /dev/null && echo 'OK CF-G'

# CF-F: zero @vN tags
! grep -rn 'uses:.*@v[0-9]' .github/workflows/ && echo 'OK CF-F'
```

---

## §5 — Out of scope (queue for R10+)

- **R10:** Pentest prep — adversary emulation playbook (Atomic Red Team mappings), scoped exploit kit harness, hash chain rollback drill, container escape verification (gVisor/Kata sidecar option)
- **R11:** Compliance posture mapping — CIS Docker Benchmark line-items, OWASP ASVS L2 attestation, NIST CSF 2.0 control matrix, SOC2 CC6/CC7 evidence trail
- **R12 (tentative):** Browser-side runtime — Trusted Types enforce mode (carry from R2.6), Subresource Integrity on bundled assets, CSP report-uri sink
- **R13 (tentative):** Threat-detection — runtime eBPF tracing (Falco rules tuned for the 116-app catalog), syscall allow-list audit, container drift detection
- **Observability-2:** Wire R6 JSON logs to Loki via the Vector spec from `docs/observability-log-shipping.md`, then add Grafana dashboards for auth + audit chain + DAST trend

---

## §6 — Owner pile (human-only items, do not assign to agent)

1. **GitHub Actions branch protection** — apply the `gh api -X PUT branches/main/protection ...` block from H-R9-7 manually. Agents shouldn't have repo admin.
2. **Cloudflare WAF rule** — add the `dast-scanner-allowlist` Custom Rule (M-R9-11). Requires CF dashboard access.
3. **CI secrets to add to repo settings:**
   - `CLI_MINT_KEY` — generate via `openssl rand -hex 32`, rotate quarterly
   - `DAST_MINT_KEY` — separate from above; for the workflow's mint exchange
   - `DAST_USER` — scanner identity (default: `scanner-bot`)
   - `DAST_USER_TOKEN_NAME` — header name carrying the JWT (default: `Authorization`)
   - `ALERT_HMAC_KEY` — for the R6 webhook signer (already set, confirm)
   - `ALERT_WEBHOOK_URL` — Slack/Discord/Mattermost webhook for DAST alerts
4. **PGP key publication** — generate a key for `michael@mjashley.com`, publish to keys.openpgp.org, paste fingerprint into SECURITY-CONTACTS (CF-I in this MD).
5. **First scan baseline acceptance** — when DAST first runs after R9 ship, expect a flood of findings on the demo. Triage them into `.zap/rules.tsv` IGNORE/WARN entries within 48h. Anything not classified after 48h gets auto-FAIL.
6. **Demo data sanitization** — before any active scan runs, confirm demo DB has no real PII/secrets. Active rules send malicious payloads which could surface in logs.

---

## §7 — Deliverable

### PR title

```
security(r9): authenticated DAST in CI — ZAP baseline + active + 3 custom rules + 6 R8 carry-forwards
```

### Squash-commit body

```
Adds outside-in attack-surface verification via OWASP ZAP, layered as:

  - baseline (passive, every PR, <5min, blocks on new C/H/M)
  - active (authenticated, nightly + on security/* push, 15-25min, blocks)
  - custom rule pack (RULE-HLA-1/2/3) for HomelabARR-specific actives
  - false-positive baseline checked into .zap/rules.tsv
  - short-lived JWT mint endpoint /api/auth/cli-mint (gated on rotating mint key)
  - route-manifest endpoint /api/_routes for scanner enumeration
  - trend rollup workflow (weekly auto-commit)

Also closes 6 R8 carry-forwards:
  - CF-A scripts/backup.sh dual-dest + GPG + audit hook (C-R8-1a)
  - CF-B server/audit.js register backup.* / restore.* events (L-R8-13)
  - CF-C AppArmor aa-enforce + compose security_opt wiring (H-R8-4)
  - CF-D /api/health minimization + /api/health/detail gated (R6.5-drift-1, 3 rounds stale)
  - CF-E strip Server + x-powered-by at origin (M-R8-8)
  - CF-G package.json packageManager field (R5.5-drift-2, 5 rounds stale)

And 4 net-new security headers:
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: minimal (camera/mic/geo/payment all disabled)
  - Cross-Origin-Opener-Policy: same-origin
  - Cross-Origin-Resource-Policy: same-site

Out of scope (queued for R10): pentest prep, adversary emulation.

Owner-side: branch-protection apply, CF WAF allow-list, PGP key publication. See §6.

Refs:
  - HomelabARR-CE-Security-Audit-Round-9.md (this PR)
  - homelabarr-ce-security-audit-round-8.md (prior, committed in security/round-8-deployment-runbook)
```

### Branch name

```
security/round-9-dast-zap
```

---

## §8 — End / Loop continuation

When R9 ships:

1. I'll re-verify with `?_v=r9verify` cache-bust against `ce-demo.homelabarr.com`
2. Pull `security/round-9-dast-zap` source via GitHub API
3. Run the full §4 verification matrix (10 sub-checks)
4. Confirm all 6 carry-forwards cleared (especially CF-D health min — 3 rounds stale now)
5. If green: write **Round 10 — Pentest prep / adversary emulation** as the next downloadable
6. If drift: write **R9.5 correction MD** before advancing

Loop continues. Drafted without asking. Ship when ready.

---

*Generated 2026-05-22T19:18:31.547Z — source: passive recon of `ce-demo.homelabarr.com` + read-only review of `security/round-8-deployment-runbook@06cafcc8bf` via GitHub API. No exploits run. No code changed.*
