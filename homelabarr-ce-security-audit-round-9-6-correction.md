# HomelabARR-CE Security Audit — Round 9.6 (Correction-2)
**Dimension:** Two HIGH drifts blocking R10. Three minor cleanups. One frontend serving fix.
**Target:** `smashingtags/homelabarr-ce` @ `security/round-9-5-dast-completion@622ab6f700` + live `ce-demo.homelabarr.com`
**Method:** byte-level source scan + live probes. No exploits.
**Size:** Tiny. Should take the agent an hour total. Most of R9.5 landed clean.

---

## §0 — What landed (don't redo)

R9.5 result was good. 12 of 14 items shipped clean and live-verified:

- AppArmor `aa-enforce` in install-apparmor.sh ✓
- audit.js: backup.completed / backup.failed / restore.drill.* / key.rotation.* + eventAllowed() ✓
- homelabarr.yml: `apparmor=homelabarr-backend` line in security_opt ✓
- dast-active.yml: mint exchange + chain.ok post-check + replacer config + ALERT_HMAC webhook ✓
- dast-trend.yml weekly rollup ✓
- docs/topology.md (Topology A vs B) ✓ — finally landed after 2 rounds stale
- traefik/dynamic.yml (TLS + mTLS + rate-limit middleware) ✓ — finally landed after 2 rounds stale
- public/.well-known/security.txt in repo ✓
- HSTS live header: `max-age=63072000; includeSubDomains; preload` ✓ (CF API fix applied)
- Health min `{ok:true, ts, state}` ✓
- All security headers (COOP/CORP/Referrer/Permissions) still live ✓
- Audit chain still verifying (chain.ok:true) ✓

---

## §1 — Two HIGH drifts (block R10)

### H-R9.6-1 — /api/health/detail still returns 200 publicly with full DEGRADED payload

**Severity:** HIGH
**Why blocks R10:** R10 = pentest prep. We can't write "adversary emulation" scenarios while there's an unauthenticated info-leak in plain sight.

**Live observed:**

```
GET https://ce-demo.homelabarr.com/api/health/detail
200 OK
{"status":"DEGRADED","timestamp":"2026-05-22T20:34:38.681Z","version":"1.0.0",
 "uptime":113.57,"platform":{"detected":"linux","process":"linux",
 "architecture":"x64","nodeVersion":"v24.16.0",...}}
```

This is the **same verbose payload** that used to be at `/api/health` before R9 (CF-D). The R9 agent moved the verbose handler to `/api/health/detail` but **did not add the auth middleware**.

**Byte-level scan:** `server/index.js` does not contain the literal `/api/health/detail`. So this route is **defined in another module** the agent created — probably `server/health.js` or wherever the new endpoint registrations live. Find it and add the gate.

**WRONG (wherever the handler lives):**

```js
app.get('/api/health/detail', (req, res) => {
  res.json({ status: ..., timestamp: ..., version: pkg.version, uptime: ..., platform: ... });
});
```

**RIGHT:**

```diff
-app.get('/api/health/detail', (req, res) => {
+app.get('/api/health/detail', requireAdmin, (req, res) => {
   res.set('Cache-Control', 'no-store');
   res.json({ ... });
 });
```

**Where `requireAdmin` is the same middleware already used by `/api/admin/users` or similar admin routes.** If it doesn't exist as a named export, wire it the same way the agent gated `/api/_routes` (which DOES return 403 unauthenticated per live probe — that gating works).

**Verification after fix:**

```bash
# Unauth must be 401
test "$(curl -fsS -o /dev/null -w '%{http_code}' https://ce-demo.homelabarr.com/api/health/detail)" = 401 \
  || { echo FAIL; exit 1; }

# With admin JWT must be 200 and return the verbose payload
# (owner mints a real admin JWT, scanner cannot reach this)
```

---

### H-R9.6-2 — scripts/backup.sh STILL 559B (CF-A, 4th consecutive round)

**Severity:** HIGH
**Why blocks R10:** R10 includes a "backup tamper detection" scenario. We can't test detection of tampered backups when the backup pipeline is `tar -czf homelabarr.db` with no encryption, no signing, no offsite, no audit hook.

This diff has been issued **four times** (R8 CF-A, R9 §0.2 CF-A, R9.5 H-R9.5-4, now). The file is unchanged across every commit. Either the agent is skipping it intentionally or the diff is colliding with the existing 559B content.

**Fix: REPLACE the entire file, not patch it.**

**Full file content for `scripts/backup.sh`:**

```bash
#!/usr/bin/env bash
# HomelabARR-CE encrypted offsite backup
# Required env: OFFSITE_DEST, BACKUP_GPG_RCPT, INTERNAL_AUDIT_TOKEN
set -Eeuo pipefail

TS=$(date +%Y%m%d-%H%M%S)
LOCAL_DIR="${LOCAL_DIR:-/var/backups/homelabarr}"
OFFSITE_DEST="${OFFSITE_DEST:?OFFSITE_DEST required (rclone remote or s3:// URI)}"
RECIPIENT="${BACKUP_GPG_RCPT:?BACKUP_GPG_RCPT required (gpg key id or email)}"
OUT="${LOCAL_DIR}/homelabarr-${TS}.tar"
mkdir -p "$LOCAL_DIR"

# 1. Snapshot DB + audit ledger + secrets metadata (NOT the secrets themselves)
tar -cf "$OUT" \
  -C /app/data homelabarr.db audit.db 2>/dev/null \
  -C /run/secrets/.meta . 2>/dev/null || true

# 2. Encrypt asymmetric (restore host needs only the private key)
gpg --batch --yes --trust-model always --encrypt --recipient "$RECIPIENT" \
    --cipher-algo AES256 --compress-algo zlib --output "${OUT}.gpg" "$OUT"
rm -f "$OUT"

# 3. Hash + sign manifest
sha256sum "${OUT}.gpg" > "${OUT}.gpg.sha256"
gpg --batch --yes --detach-sign --local-user "$RECIPIENT" "${OUT}.gpg.sha256"

# 4. Push to offsite (different trust zone)
rclone copy "${OUT}.gpg" "$OFFSITE_DEST" --immutable || \
  { echo "FAIL: offsite push" >&2; exit 2; }
rclone copy "${OUT}.gpg.sha256" "$OFFSITE_DEST"
rclone copy "${OUT}.gpg.sha256.sig" "$OFFSITE_DEST"

# 5. Local retention: 14 days
find "$LOCAL_DIR" -name 'homelabarr-*.gpg' -mtime +14 -delete

# 6. Audit event via internal ingress (depends on R9.5 /api/internal/audit endpoint)
BYTES=$(stat -c%s "${OUT}.gpg")
TOK=$(cat /run/secrets/internal_audit_token 2>/dev/null || echo "${INTERNAL_AUDIT_TOKEN:-}")
if [ -n "$TOK" ]; then
  curl -fsS -X POST "http://127.0.0.1:3001/api/internal/audit" \
    -H "X-Internal-Token: $TOK" \
    -H 'Content-Type: application/json' \
    -d "{\"event\":\"backup.completed\",\"target\":\"$OFFSITE_DEST\",\"meta\":{\"bytes\":$BYTES,\"ts\":\"$TS\"}}" \
    >/dev/null || \
  curl -fsS -X POST "http://127.0.0.1:3001/api/internal/audit" \
    -H "X-Internal-Token: $TOK" \
    -H 'Content-Type: application/json' \
    -d "{\"event\":\"backup.failed\",\"meta\":{\"out\":\"${OUT}.gpg\"}}" \
    >/dev/null
fi

echo "OK ${OUT}.gpg ($BYTES bytes)"
```

**Required CI secret to add** (have your agent do this via GH API): `INTERNAL_AUDIT_TOKEN` (32 hex bytes via `openssl rand -hex 32`). Same token must be in the backend container env so the verifyToken check matches.

**Verification after fix:**

```bash
test $(wc -c < scripts/backup.sh) -gt 1500 || { echo FAIL_size; exit 1; }
grep -q OFFSITE_DEST scripts/backup.sh
grep -q 'gpg --batch' scripts/backup.sh
grep -q sha256sum scripts/backup.sh
grep -q backup.completed scripts/backup.sh
grep -q /api/internal/audit scripts/backup.sh
echo OK
```

---

## §2 — Three minor cleanups

### M-R9.6-3 — Frontend nginx must serve /.well-known/security.txt

**Live observed:** `GET /.well-known/security.txt` returns 403, not the file body. The file exists in repo (`public/.well-known/security.txt`, 317B).

This is almost certainly because the SPA's nginx config has a catch-all rule that excludes `.` prefixed paths. Fix in whatever nginx config the frontend container uses:

```diff
# nginx.conf or default.conf
+location ^~ /.well-known/ {
+    root /usr/share/nginx/html;
+    default_type text/plain;
+    allow all;
+}
 location / {
     try_files $uri $uri/ /index.html;
 }
```

**Verification:**

```bash
curl -fsS https://ce-demo.homelabarr.com/.well-known/security.txt | grep -q '^Contact:'
```

### M-R9.6-4 — CF-F: finish SHA-pinning the last 3 @vN entries in security-audit.yml

This has been stale 4 rounds now. 21/24 are SHA-pinned. The last 3 need the same treatment.

**Owner-side note:** This is agent's job, but I keep flagging it because something keeps deciding to leave 3 unpinned. The pattern (always 3, never different) suggests the agent's pinning loop has a bug or skips certain action sources.

**Quick fix script for the agent:**

```bash
#!/usr/bin/env bash
set -e
cd "$(git rev-parse --show-toplevel)"
grep -rn 'uses:.*@v[0-9]' .github/workflows/ | while IFS=: read -r file lineno line; do
  # Extract action and version
  ACTION=$(echo "$line" | grep -oP 'uses:\s*\K[^@]+@v[0-9.]+')
  REPO="${ACTION%@*}"
  TAG="${ACTION#*@}"
  # Look up the commit SHA for that tag
  SHA=$(curl -fsS "https://api.github.com/repos/$REPO/git/refs/tags/$TAG" | jq -r .object.sha)
  if [ -z "$SHA" ] || [ "$SHA" = null ]; then
    SHA=$(curl -fsS "https://api.github.com/repos/$REPO/commits/$TAG" | jq -r .sha)
  fi
  echo "$file:$lineno: $ACTION -> @$SHA  # $TAG"
  # Apply the rewrite
  sed -i "s|@$TAG|@$SHA  # $TAG|" "$file"
done
```

### M-R9.6-5 — Verify backup.completed events actually flow (24h after R9.6 ship)

This isn't a code change. After R9.6 ships and backup-cron runs at least once, run:

```bash
# Owner-side or agent-side, with admin JWT
curl -fsS -H "Authorization: Bearer $ADMIN_JWT" \
  https://ce-demo.homelabarr.com/api/audit?limit=100 \
  | jq '[.events[] | select(.event | startswith("backup."))] | length'
# Expect: >= 1 within 24h of merge
```

If still 0 after 24h, the cron isn't firing OR the internal/audit POST is failing silently. Investigate then.

---

## §3 — Deliverable

### PR title

```
security(r9.6): gate /api/health/detail, replace backup.sh, serve .well-known, finish SHA-pin
```

### Branch

```
security/round-9-6-dast-final
```

### Squash-commit body

```
Closes two HIGH drifts that survived R9.5:

  - /api/health/detail now gated by requireAdmin (unauth -> 401)
  - scripts/backup.sh replaced with full hardened version (1.6KB, GPG + sha256 +
    rclone offsite + internal audit POST). Fourth attempt at this file -- this
    PR replaces it wholesale rather than patching.

Plus 3 cleanups:
  - nginx serves /.well-known/security.txt (location block added)
  - SHA-pin final 3 @vN in security-audit.yml (now 24/24)
  - Verification script to confirm backup.completed events flow within 24h

Required new secret (set via GH API + container env): INTERNAL_AUDIT_TOKEN
```

---

## §4 — Loop

When R9.6 ships:

1. Re-verify with `?_v=r96verify`
2. Confirm `/api/health/detail` -> 401 unauth
3. Confirm `scripts/backup.sh` >= 1500 bytes
4. Confirm `/.well-known/security.txt` -> 200 with Contact line
5. If green: **write R10 — pentest prep / adversary emulation**
6. If still drifted: stop the round-9 loop, escalate the persistent drifts to the OWNER README as 'agent cannot do this' permanent owner items

---

*Generated 2026-05-22T20:36:56.379Z — source: byte-level scan of `security/round-9-5-dast-completion@622ab6f700` + live probe of ce-demo.homelabarr.com. No exploits. No code changed.*
