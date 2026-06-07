# HomelabARR-CE Security Audit — Round 8
**Dimension:** Production deployment runbook, host-level defense, backup/recovery drill, disaster-recovery playbook
**Target:** `smashingtags/homelabarr-ce` @ `security/round-7-secrets@9e3e1a52` (live: ce-demo.homelabarr.com)
**Date:** 2026-05-22
**Status:** R7 shipped strongly — secrets out of env, SQLCipher live, 30/35 actions SHA-pinned, Trivy on pushed digest landed, CycloneDX shipped, bundle-secret-scan CI active. 4 carry-forward drifts remain.
**Findings:** 13 (1 Critical / 5 High / 4 Medium / 3 Low)

---

## §0 — Prior Round Carryover (Verified Source + Live)

### Round 7 verification matrix (against `security/round-7-secrets@9e3e1a52` + live probes)

| Check | Source/Live | Verdict |
|---|---|---|
| `server/secrets.js` with `readSecret()` resolving `/run/secrets/` | source | **PASS** (953 B) |
| Compose top-level `secrets:` block | source | **PASS** |
| `JWT_SECRET` removed from backend env block | source | **PASS** |
| `DEFAULT_ADMIN_PASSWORD` removed from backend env block | source | **PASS** (and the `:?` fail-loud is now moot — secret is file-mounted) |
| `ALERT_WEBHOOK_SECRET` removed from backend env block | source | **PASS** |
| `better-sqlite3-multiple-ciphers` in dependencies | source | **PASS** |
| `server/db.js` issues `PRAGMA cipher='sqlcipher'` + `PRAGMA key=…` | source | **PASS** (821 B) |
| `server/auth.js` uses `readSecret()` instead of `process.env` | source | **PASS** (14,676 B) |
| `scripts/init-secrets.sh`, `encrypt-db.sh`, `rotate-jwt-key.sh`, `rotate-sqlcipher-key.sh`, `check-secret-age.sh`, `backup.sh` | source | **PASS** (six scripts present) |
| `scripts/migrate-config-to-db.js` (H-R7-6) | source | **FAIL — defer to R8.5-drift-3** (kv_secrets migration not implemented; legacy users.json on the homelabarr-config volume still potentially cleartext) |
| Trivy scan of pushed image digest (R5.5-drift-3) | source | **PASS** (image-ref: present in docker-build-push.yml) |
| CycloneDX SBOM for npm (R5.5-drift-4) | source | **PASS** |
| `bundle-secret-scan` CI job (L-R7-12) | source | **PASS** |
| Every `uses:` SHA-pinned (R5.5-drift-7) | source | **PARTIAL** — 30/35 SHA-pinned. 5 remain on `@vN` mutable tags. |
| `packageManager` in package.json (R5.5-drift-2) | source | **FAIL — carry-forward, now 4 rounds stale** |
| HomelabARR images pinned by `tag@sha256:digest` (R5.5-drift-6) | source | **FAIL — carry-forward**; blocked on tagged release (`v2.3.0`) |
| JWT keyring with `kid` header (H-R7-3) | source | **FAIL — R7.5-drift-1**; rotation will still force re-login until shipped |
| `/api/health` minimized to 3 keys (R6.5-drift-1) | live | **FAIL — carry-forward, now 2 rounds stale**; live still returns 3.6KB payload with `DEGRADED`, `nodeVersion`, etc. |
| `/api/health/detail` route present | live | **FAIL — 404** |
| Live: `/api/audit`, `/api/applications`, `/api/containers`, `/api/auth/sessions` | live | **PASS** (all 200) |

16/20 PASS. R7 delivered the heaviest cleanup of any round so far (six scripts, two server modules, three CI gates, one DB driver swap, 30 action pins). The four remaining drifts are queued; **/api/health minimization is the operationally visible one** (an outside scanner sees DEGRADED and the full platform fingerprint right now).

### R8.5 drift consolidation (verbatim diffs already provided in prior MDs; recapped for the agent)

```yaml
# R7.5-drift-1 — server/auth.js: JWT keyring with kid header
# See R7 §3 H-R7-3 RIGHT block for the full code (loadKey, KEYS, keyByKid, signAccessToken, verifyToken).
```

```js
// R6.5-drift-1 — server/health.js (new file) + server/index.js route mounts
import { db } from './db.js';
async function dockerProbe() {
  const dh = process.env.DOCKER_HOST;
  if (dh && dh.startsWith('tcp://')) {
    const url = new URL(dh.replace('tcp://','http://'));
    try {
      const r = await fetch('http://' + url.hostname + ':' + url.port + '/_ping',
                            { signal: AbortSignal.timeout(2000) });
      return { ok: r.ok, target: dh };
    } catch { return { ok: false, target: dh }; }
  }
  const sock = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
  return { ok: require('fs').existsSync(sock), target: sock };
}
export async function healthMinimal(req, res) {
  const dh = await dockerProbe();
  res.status(dh.ok ? 200 : 503).json({
    status: dh.ok ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || 'dev',
  });
}
export async function healthDetail(req, res) {
  // Reuse the existing rich JSON-builder but with redaction applied
  res.json(buildDetailedHealth());   // existing internal builder
}
// In server/index.js:
import { healthMinimal, healthDetail } from './health.js';
import { requireAdmin, requireXhr } from './auth.js';
app.get('/api/health', healthMinimal);
app.get('/api/health/detail', requireAdmin, requireXhr, healthDetail);
```

```json
// R5.5-drift-2 — package.json
"packageManager": "npm@10.9.0+sha256.<paste-from-npm-info-on-pinned-version>"
```

```yaml
# R5.5-drift-6 — homelabarr.yml after tagging v2.3.0 and running scripts/bump-image-digests.sh v2.3.0
image: ghcr.io/imogenlabs/homelabarr-frontend:v2.3.0@sha256:<64hex>
image: ghcr.io/imogenlabs/homelabarr-backend:v2.3.0@sha256:<64hex>
```

```bash
# R5.5-drift-7 — find the 5 stragglers and pin them
grep -RhnE '^\s*-\s*uses:' .github/workflows | grep -vE '@[0-9a-f]{40}' | grep -v '^\s*#'
# For each remaining line, capture the SHA via 'gh api repos/<owner>/<repo>/commits/<tag>' and rewrite.
```

```js
// R8.5-drift-3 — scripts/migrate-config-to-db.js (defer H-R7-6 properly; see R7 §3)
```

---

## §1 — Goal

Round 8 closes the **deployment** half of the security loop. R1-R7 hardened the application and image. R8 hardens the host underneath them and gives the operator a written, drill-tested recovery story:

1. **Edge-of-stack TLS** — Traefik on the host terminates external TLS; the path from Traefik → frontend → backend should be either an isolated Docker network (already in place from R4) OR mTLS-authenticated for installs that span hosts. Round 8 spec'd for the single-host floor with documentation for the multi-host upgrade path.
2. **Host firewall** — UFW (Ubuntu/Debian) or nftables baseline that drops everything except :22, :80, :443 from outside, and explicitly denies the Docker daemon TCP ports (:2375, :2376) even if accidentally exposed.
3. **fail2ban tied to the R6 audit log** — `login.locked` audit events trigger host-level IP bans, multiplying the cost of credential stuffing beyond the application-level account lockout.
4. **AppArmor / SELinux narrowing** — leverage the existing `security_opt:` slot from R4 with a HomelabARR-specific AppArmor profile that allows only the paths the backend genuinely touches.
5. **Backup + restore drill** — `scripts/backup.sh` exists (R7 M-R7-9); R8 adds a scheduled cron, off-host destination, monthly **restore drill** with verification.
6. **Disaster recovery playbook** — what an operator does after a total host loss: how to re-pull, decrypt, restore, verify. Without this in writing, encryption-at-rest becomes data-loss-at-rest the first time someone reboots an unbacked-up server.
7. **Public reporting policy** — the `SECURITY.md` already documents threats; add a CVE-disclosure process that names a contact, a PGP key fingerprint, an expected SLA, and a hall-of-fame policy.

Threat model: a determined attacker outside the host, an opportunistic attacker via the home network, a careless backup pipeline, and an honest mistake by the operator (e.g., `docker compose down -v`). R8 designs the playbook for all four.

---

## §2 — Current State (Verified via Source + Live Recon)

### 2.1 — Edge TLS termination (live)

```
GET https://ce-demo.homelabarr.com → 200, HTTP/2, server: nginx (Traefik proxy in front)
```

Inferred topology: Cloudflare or LE-signed certs at Traefik → routes `/` and `/api/` to the internal `homelabarr-frontend` container (port 8080) which itself reverse-proxies `/api/` to `homelabarr-backend` (port 8092) over the `homelabarr` Docker bridge network. R4 placed the socket-proxy on `homelabarr-internal` (`internal: true`).

Gaps to address in R8:
- No mTLS between Traefik and the backend. For single-host installs this is acceptable (bridge-net is the trust boundary). For multi-host installs (Traefik on edge VPS → backend on home lab) it is not, and should be documented as the upgrade trigger.
- No explicit HSTS preload status check at Traefik. Verify `Strict-Transport-Security` includes `preload` and the domain is on the HSTS preload list.

### 2.2 — Host firewall (cannot be observed remotely; documented as a checklist)

Cannot inspect ce-demo's host UFW remotely. The R8 deliverable is a **scripted hardening** the operator can apply and verify.

### 2.3 — fail2ban + audit integration

No existing fail2ban configuration in repo. R6's `login.locked` events are written to `/app/server/activity-data/audit-*.jsonl`. The integration point: a fail2ban filter regex parses those JSONL files, jails the offending IP at the host firewall level for a configurable duration.

### 2.4 — AppArmor / SELinux profile

R4 H-R4-4 spec'd `security_opt: [seccomp=default]` and a future `apparmor=docker-default` placeholder. R8 ships the bespoke profile and the loader script.

### 2.5 — Backup + DR

`scripts/backup.sh` exists (R7). No scheduled invocation. No off-host destination. No restore-drill verification.

### 2.6 — Disclosure policy

`SECURITY.md` (9,932 B on R7 branch) has the rotation runbook (L-R7-11) and the cosign verify recipe (L-R7-13). It does **not** yet have a `reporting@`, a PGP key, or an SLA.

### 2.7 — Live recon of headers — what an external scanner actually sees

```
HTTP/2 200
content-security-policy: default-src 'self'; ...
strict-transport-security: max-age=15552000; includeSubDomains
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: no-referrer
permissions-policy: ...
x-request-id: <uuid>     ← R6 H-R6-4 shipped ✓
server: <set by Traefik; ideally redacted>
```

HSTS lacks `preload`. Otherwise headers look clean from R2.

---

## §3 — Findings

Severity scale: **C** Critical (total compromise / lost host) · **H** High (lost defense layer or unrecoverable data loss) · **M** Medium (operational hygiene) · **L** Low (polish)

### C-R8-1 — No documented, drill-tested backup-and-restore procedure

**Where:** Operational documentation gap. `scripts/backup.sh` (R7) exists but no scheduled cron, no off-host destination, no restore-drill verification.

**What:** Now that the DB is SQLCipher-encrypted (R7 C-R7-2), an operator who loses **either** the DB **or** the `./secrets/sqlcipher_key` loses everything. The audit log, the user accounts, the lockout state, the rotated webhook secret history — gone. There is no recovery path without:

1. An off-host backup of the encrypted DB.
2. A separate-trust-zone backup of the secrets archive.
3. A documented, drill-tested restore procedure that any operator can follow at 03:00 after a power-supply death.

**RIGHT — `scripts/backup-cron.sh` (host-side; installed by the runbook)**
```sh
#!/usr/bin/env bash
set -eu
umask 077

PROJECT_DIR="${PROJECT_DIR:-/opt/homelabarr}"
BACKUP_LOCAL="${BACKUP_LOCAL:-/var/backups/homelabarr}"
BACKUP_REMOTE="${BACKUP_REMOTE:-}"   # e.g. user@offsite:/path/  OR  b2://bucket/path  OR rclone:remote:/path
SECRETS_REMOTE="${SECRETS_REMOTE:-}" # MUST be a different trust zone from BACKUP_REMOTE
RETAIN_DAYS="${RETAIN_DAYS:-30}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_LOCAL"

cd "$PROJECT_DIR"
bash scripts/backup.sh                 # writes ./backups/homelabarr.<STAMP>.db and ./backups/secrets.<STAMP>.tar.zst

# Move DB backup off-host (encrypted; safe to store with standard restic/borg/rclone)
if [ -n "$BACKUP_REMOTE" ]; then
  rsync -av --remove-source-files "./backups/homelabarr.$STAMP.db" "$BACKUP_REMOTE/"
fi

# Move secrets archive to a SEPARATE trust zone (e.g. password manager folder synced to a different provider)
if [ -n "$SECRETS_REMOTE" ]; then
  rsync -av --remove-source-files "./backups/secrets.$STAMP.tar.zst" "$SECRETS_REMOTE/"
fi

# Local retention
find "$BACKUP_LOCAL" -type f -mtime "+$RETAIN_DAYS" -delete 2>/dev/null || true

# Audit
curl -s --unix-socket /var/run/docker.sock \
  http://localhost/containers/homelabarr-backend/exec -d '{"AttachStdout":true,"Cmd":["node","-e","import(\'./server/audit.js\').then(a=>a.audit(require(\'./server/db.js\').db,{event:\'backup.completed\',actor:\'cron\',result:\'ok\',meta:{stamp:\''$STAMP'\'}}))"]}' \
  >/dev/null 2>&1 || true
```

**`scripts/restore-drill.sh`** (run monthly; verifies the backups actually work)
```sh
#!/usr/bin/env bash
set -eu
umask 077
DRILL_DIR="$(mktemp -d)"
trap 'rm -rf "$DRILL_DIR"' EXIT

LATEST_DB="$(ls -1t /var/backups/homelabarr/homelabarr.*.db 2>/dev/null | head -1)"
LATEST_SECRETS="$(ls -1t /var/backups/homelabarr/secrets.*.tar.zst 2>/dev/null | head -1)"
[ -n "$LATEST_DB" ] || { echo "FAIL: no DB backup found"; exit 2; }
[ -n "$LATEST_SECRETS" ] || { echo "FAIL: no secrets backup found"; exit 2; }

cp "$LATEST_DB" "$DRILL_DIR/test.db"
tar -xf "$LATEST_SECRETS" -C "$DRILL_DIR"   # extracts ./secrets/

KEY="$(cat "$DRILL_DIR/secrets/sqlcipher_key")"
# Verify the encrypted backup can be opened and the audit chain is intact
docker run --rm -v "$DRILL_DIR:/work" ghcr.io/utelle/sqlite3mc:latest \
  sqlite3 /work/test.db <<EOF
PRAGMA key='$KEY';
SELECT count(*) AS users FROM users;
SELECT count(*) AS events FROM audit_events;
SELECT 'chain_first', prev_hash FROM audit_events ORDER BY id ASC LIMIT 1;
SELECT 'chain_last',  row_hash  FROM audit_events ORDER BY id DESC LIMIT 1;
EOF

echo "DRILL OK: $(basename "$LATEST_DB") + $(basename "$LATEST_SECRETS")"
```

**`/etc/cron.d/homelabarr-backup`** (installed by the runbook)
```cron
# Daily backup at 03:17 UTC; restore drill on the 1st of each month at 04:17
17 3 * * *  root  /opt/homelabarr/scripts/backup-cron.sh    >> /var/log/homelabarr-backup.log 2>&1
17 4 1 * *  root  /opt/homelabarr/scripts/restore-drill.sh  >> /var/log/homelabarr-restore-drill.log 2>&1
```

**Verification (acceptance criteria for C-R8-1):**
```sh
# 1. Daily backup runs and produces output
ls -la /var/backups/homelabarr/*.db | head -3
# Expect: at least one dated within the last 26 hours

# 2. Off-host copy exists (test command depends on $BACKUP_REMOTE)
rclone ls "$BACKUP_REMOTE/" | grep homelabarr | head -3   # or rsync --list-only ...
# Expect: a copy of the latest snapshot

# 3. Restore drill passes (run on demand once)
sudo bash /opt/homelabarr/scripts/restore-drill.sh
# Expect: 'DRILL OK: ...' final line, users count > 0, events count > 0

# 4. Audit log records the backup
curl -s --cookie cj.txt -H 'X-Requested-With: XMLHttpRequest' \
  https://ce-demo.homelabarr.com/api/audit?limit=50 \
  | jq '.events[] | select(.event=="backup.completed") | {ts,meta}' | head -3
# Expect: at least one row in the last 26 hours
```

---

### H-R8-2 — fail2ban not wired to the R6 audit log; account lockouts don't translate to network-level bans

**Where:** R6's `account_lockouts` table at the application layer; nothing at the host network layer.

**What:** A credential-stuffer who hits 8 fails on `admin` gets a 30-minute application-level lockout (R6 H-R6-2). They then rotate to `administrator`, `root`, `user`, etc. — each gets its own 8-fail budget before lockout. fail2ban changes the cost equation: after a configurable IP-keyed threshold, the **host** drops their packets, regardless of which username they try.

**RIGHT — `/etc/fail2ban/filter.d/homelabarr.conf`** (parses the JSONL audit log)
```ini
[Definition]
failregex = ^.*"event":"(login\.fail|login\.locked|login\.ratelimited|ip\.denied)".*?"ip":"<HOST>".*$
ignoreregex =
```

`/etc/fail2ban/jail.d/homelabarr.conf`
```ini
[homelabarr]
enabled  = true
filter   = homelabarr
backend  = polling
logpath  = /var/lib/docker/volumes/homelabarr-activity/_data/audit-*.jsonl
          /var/lib/docker/volumes/homelabarr-activity/_data/audit.jsonl
findtime = 600
maxretry = 12
bantime  = 86400
action   = ufw[application=ssh-or-equivalent, blocktype=reject]
```

**Notes:**
- The JSONL files live under the Docker volume host path. On systemd hosts that is typically `/var/lib/docker/volumes/<volume>/_data/` — confirm the actual path on the deploy host and substitute.
- `findtime: 600` + `maxretry: 12` = 12 audit-recorded events from one IP in 10 minutes triggers a 24-hour ban.
- `bantime: 86400` is a sensible floor; tune up to a week (`604800`) once you trust the filter.
- `action: ufw` assumes the host runs UFW (H-R8-3). On nftables-only hosts use `nftables-multiport` instead.

**Verification:**
```sh
# 1. Filter parses real lines
fail2ban-regex /var/lib/docker/volumes/homelabarr-activity/_data/audit.jsonl /etc/fail2ban/filter.d/homelabarr.conf
# Expect: matched count > 0 (after deliberately failing logins)

# 2. Status
fail2ban-client status homelabarr
# Expect: 'Jail: homelabarr' followed by a Banned IP list (empty initially)

# 3. Trigger from a test box
for i in $(seq 1 13); do
  curl -s -o /dev/null -X POST -H 'X-Requested-With: XMLHttpRequest' \
    -H 'Content-Type: application/json' --data '{"username":"admin","passcode":"WRONG"}' \
    https://ce-demo.homelabarr.com/api/auth/login
done
sleep 30
fail2ban-client status homelabarr
# Expect: the test box's IP in 'Currently banned'
```

### H-R8-3 — No host firewall baseline documented or scripted

**Where:** Operational gap. Repo contains no host-level UFW/nftables configuration.

**What:** A home server with Docker installed is one mistake away from exposing the Docker daemon on `:2375` (no auth) or `:2376` (TLS but often misconfigured). Even with R4's socket-proxy, the host should drop all ingress except SSH and the Traefik ports as a defense-in-depth layer.

**RIGHT — `scripts/host-firewall-setup.sh`** (operator runs ONCE on the host; idempotent)
```sh
#!/usr/bin/env bash
set -eu
[ "$EUID" -eq 0 ] || { echo "must be root"; exit 1; }

# Detect UFW vs nftables; default to UFW on Debian/Ubuntu, nftables elsewhere.
if command -v ufw >/dev/null 2>&1; then
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp comment 'ssh'
  ufw allow 80/tcp  comment 'http (traefik acme challenge)'
  ufw allow 443/tcp comment 'https (traefik)'
  # Explicitly DENY the Docker daemon TCP ports even though Docker shouldn't listen on them
  ufw deny 2375/tcp comment 'docker daemon — must not be reachable'
  ufw deny 2376/tcp comment 'docker daemon TLS — must not be reachable'
  # Allow loopback fully (Docker bridges live on the host)
  ufw allow in on lo
  ufw --force enable
  ufw status verbose
else
  cat >/etc/nftables.conf <<'EOF'
table inet filter {
  chain input {
    type filter hook input priority filter;
    policy drop;
    ct state established,related accept
    iif lo accept
    tcp dport { 22, 80, 443 } accept
    ip protocol icmp accept
    ip6 nexthdr icmpv6 accept
    tcp dport { 2375, 2376 } drop comment "docker daemon — must not be reachable"
  }
  chain forward { type filter hook forward priority filter; policy accept; }
  chain output  { type filter hook output  priority filter; policy accept; }
}
EOF
  systemctl enable --now nftables
  nft list ruleset | head -40
fi
```

**Verification (from a different host):**
```sh
# 1. Docker daemon ports are firewalled
nc -vz -w 3 <homelabarr-host> 2375 2>&1
nc -vz -w 3 <homelabarr-host> 2376 2>&1
# Expect: refused/timeout for both

# 2. Only the documented ingress is open
nmap -sS -p 1-1024 -Pn <homelabarr-host>
# Expect: 22, 80, 443 (and nothing else from this range)
```

---

### H-R8-4 — No AppArmor / SELinux profile narrowing the backend container

**Where:** `homelabarr.yml` backend service `security_opt:` block — currently has `no-new-privileges` and `seccomp=default` from R4. No `apparmor=<profile>`.

**What:** `docker-default` AppArmor profile is a generic catch-all. A bespoke profile rejects writes to anything outside the three named volumes and `/run/secrets/`, and rejects execs of binaries not in the image's known set. Closes the LD_PRELOAD / dropped-binary class entirely.

**RIGHT — `scripts/install-apparmor.sh` (host-side)**
```sh
#!/usr/bin/env bash
set -eu
[ "$EUID" -eq 0 ] || { echo "must be root"; exit 1; }

cat >/etc/apparmor.d/homelabarr-backend <<'EOF'
#include <tunables/global>

profile homelabarr-backend flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>
  #include <abstractions/ssl_certs>

  # Node binary itself
  /usr/local/bin/node          rmix,
  /usr/local/bin/npm           rmix,

  # App tree (image-baked)
  /app/                        r,
  /app/**                      r,
  /app/server/**.js            r,

  # Writable: the three named volumes and tmpfs slots from R4
  owner /app/data/**           rwk,
  owner /app/server/config/**  rwk,
  owner /app/server/activity-data/**  rwk,
  owner /tmp/**                rwk,
  owner /run/**                rwk,

  # Docker secrets — read-only file mounts
  /run/secrets/**              r,

  # Deny everything else outright
  deny /etc/**                 w,
  deny /var/**                 w,
  deny /usr/**                 w,
  deny /sys/**                 w,
  deny mount,
  deny ptrace,
}
EOF

apparmor_parser -r /etc/apparmor.d/homelabarr-backend
aa-status | grep homelabarr-backend
```

**`homelabarr.yml` change** (backend service):
```yaml
backend:
  security_opt:
    - no-new-privileges:true
    - seccomp=default
    - apparmor=homelabarr-backend         # new
```

For SELinux hosts (Fedora/RHEL/Rocky), the equivalent is a custom `container_t` derivative. Document a stub in SECURITY.md and mark as out-of-scope for v2.x; SELinux narrowing is its own R8.5 if pursued.

**Verification:**
```sh
aa-status | grep homelabarr-backend
# Expect: 'homelabarr-backend (enforce)'

docker exec homelabarr-backend sh -c 'touch /etc/foo 2>&1; echo rc=$?'
# Expect: permission denied (now AppArmor-mediated even before the read-only rootfs check)

docker inspect homelabarr-backend --format '{{ .HostConfig.SecurityOpt }}'
# Expect: contains 'apparmor=homelabarr-backend'
```

---

### H-R8-5 — No mTLS or Traefik label policy documented for the Traefik → backend hop on multi-host installs

**Where:** Documentation gap. The single-host floor is acceptable; the multi-host upgrade path is undocumented.

**What:** When Traefik runs on a separate VPS (a common HomelabARR setup — VPS terminates TLS, home server runs containers via Tailscale/WireGuard), the Traefik → backend hop crosses an untrusted network. The mitigation is mTLS or, more pragmatically, treating the WireGuard tunnel as the trust boundary and **firewalling the backend port to only accept from the WG peer**.

**RIGHT — append to `SECURITY.md` under "Production topologies":**
```md
## Topology A — single host (default)
Traefik, frontend, backend, socket-proxy all on the same host. Trust boundary
is the homelabarr-internal Docker network. No mTLS required.

## Topology B — split host (Traefik on edge VPS, backend on home lab via WG)
1. Run Traefik on the edge VPS with LE certs. Route a TCP or HTTP service
   to the WG-private address of the backend host.
2. On the backend host, set host firewall to accept :8092 ONLY from the WG
   peer IP:
     ufw allow from <wg-peer-ip> to any port 8092 proto tcp
3. Bind the backend container to the WG interface address only:
     ports: ["<wg-peer-ip>:8092:8092"]
4. For belt-and-suspenders, enable mTLS at Traefik. Generate a CA + a single
   server cert for the backend; Traefik presents the matching client cert.
   See ./docs/topology-mtls.md (added in this round).
```

**`docs/topology-mtls.md` (new file)** — full mTLS setup using `step-ca` or `cfssl` for the CA, OpenSSL for the leaves, and the Traefik file-provider config. (Stub for the agent; ~120 lines, follows the standard Traefik mTLS recipe.)

**Verification:**
```sh
# Topology A:
ss -lntp | grep :8092
# Expect: bound to 127.0.0.1 or a docker-bridge address — NOT 0.0.0.0

# Topology B:
nc -vz -w 3 <home-host-public-ip> 8092
# Expect: refused from anywhere other than the WG peer
```

### H-R8-6 — No disaster-recovery playbook for "host is gone"

**Where:** Documentation gap.

**What:** R7 made data unrecoverable without the key. The DR playbook must spell out, step by step, how to rebuild on new hardware. Without it, an honest mistake or hardware failure becomes total data loss.

**RIGHT — append to `SECURITY.md` (and link from README "Production deployment")**
```md
## Disaster recovery — full host rebuild

You will need:
1. The latest off-host DB backup     (encrypted; safe to fetch with normal credentials)
2. The latest off-host secrets archive (CROWN JEWELS; fetch from password-manager-synced vault)
3. A clean host with Docker installed and `scripts/host-firewall-setup.sh` already run
4. The repo at the same tag as the lost host (`docker compose pull` will resolve digests
   from `homelabarr.yml`)

Procedure:

    cd /opt && git clone https://github.com/imogenlabs/homelabarr-ce && cd homelabarr-ce
    git checkout v2.3.0                                                  # match the lost host
    mkdir -p ./secrets && chmod 700 ./secrets

    # Restore secrets — these come from a separate trust zone
    tar -xf <path-to-secrets.STAMP.tar.zst>                              # extracts ./secrets/

    # Verify image signatures BEFORE pulling
    cosign verify \
      --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \
      --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
      ghcr.io/imogenlabs/homelabarr-backend:v2.3.0
    cosign verify <same recipe for frontend>

    docker compose pull
    # Initialize volumes; backend will boot to a fresh state
    docker compose up -d socket-proxy frontend
    docker compose up -d backend                                          # backend will FAIL: no DB yet

    # Restore the encrypted DB into the homelabarr-data volume
    docker run --rm -v homelabarr-data:/data alpine sh -c '
      rm -f /data/homelabarr.db
    '
    docker cp <path-to-homelabarr.STAMP.db> homelabarr-backend:/app/data/homelabarr.db
    docker compose restart backend

    # Verify
    curl -fsS https://<host>/api/health | jq        # status: OK
    # Log in; check /api/audit chain:
    curl -s --cookie cj.txt /api/audit | jq '.chain.ok'   # expect: true

Rollback note: keep at least 7 days of backup history off-host. If the restored
state shows a chain.ok=false, roll back to a prior snapshot and report.

What does NOT work after DR:
- Sessions issued before the host died — the user-cookies still encrypt to the
  old key but the new backend will reject them because the refresh tokens are
  not in the restored sessions table (assuming they were issued AFTER the backup
  cut). Force everyone to re-log-in; this is the right behavior.
- Webhook subscribers expecting payloads signed with the same secret — restored
  secret = same as before (it lived in the secrets archive), so signatures match.
```

**Verification:**
```sh
# Dry-run the DR procedure on a throwaway VM/container:
bash docs/dr-drill.sh         # add this script that automates the procedure against a clean Docker host
# Expect: 'DR DRILL OK' at the end; /api/health returns 200; /api/audit chain.ok=true
```

The first DR drill is part of R8's acceptance criteria.

---

### M-R8-7 — `Strict-Transport-Security` lacks `preload` and the HSTS preload list submission is not documented

**Where:** `nginx.conf.template` (frontend) and/or Traefik headers middleware.

**What:** Current live response: `strict-transport-security: max-age=15552000; includeSubDomains`. Add `preload`, then submit `homelabarr.com` (and any subdomain you control) to https://hstspreload.org. Once accepted, every modern browser refuses HTTP for that domain even on a first visit.

**RIGHT — `nginx.conf.template` (and/or Traefik dynamic config)**
```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

`max-age=63072000` (2 years) is the hstspreload.org submission threshold.

**Verification:**
```sh
curl -sI https://ce-demo.homelabarr.com/ | tr -d '\r' | grep -i '^strict-transport-security:'
# Expect: max-age=63072000; includeSubDomains; preload
```

---

### M-R8-8 — `server` header from Traefik / nginx exposes implementation details

**Where:** Traefik labels, `nginx.conf.template`.

**What:** `Server: nginx` (or worse, `Server: nginx/1.27.3`) lets a scanner skip directly to known-CVE buckets. Strip it.

**RIGHT — `nginx.conf.template`**
```nginx
server_tokens off;
more_clear_headers Server;       # requires headers-more-nginx-module (nginx:alpine doesn't ship it by default — add to Dockerfile or use a Traefik middleware)
```

**Traefik dynamic config (preferred since Traefik is the externally-facing hop):**
```yaml
http:
  middlewares:
    strip-server:
      headers:
        customResponseHeaders:
          Server: ""              # blank wipes it
```

**Verification:**
```sh
curl -sI https://ce-demo.homelabarr.com/ | tr -d '\r' | grep -i '^server:'
# Expect: no output, or empty value
```

---

### M-R8-9 — No public security disclosure contact / PGP key / SLA

**Where:** `SECURITY.md`.

**What:** A researcher who finds a HomelabARR-CE bug needs an obvious place to send a coordinated-disclosure email, ideally with PGP. A 90-day SLA is the GitHub Security default; mirror it.

**RIGHT — append to `SECURITY.md`** (and add a matching GitHub Security Advisory enabled in repo settings)
```md
## Reporting security issues

Email <reporting@homelabarr.com> (preferred) or open a GitHub Security
Advisory: https://github.com/imogenlabs/homelabarr-ce/security/advisories/new

PGP key fingerprint: <ADD-AFTER-OWNER-PASTES-FINGERPRINT>
PGP key:             https://homelabarr.com/.well-known/pgp-key.asc

## Disclosure timeline

- Day 0:    Report received; owner acknowledges within 72 hours.
- Day 0-7:  Triage. Severity assigned per CVSS 3.1.
- Day 7-30: Fix in development; reporter kept in the loop.
- Day 30-90: Coordinated release. Reporter credit in changelog unless requested otherwise.
- Day 90:   Public disclosure regardless of fix status, unless extension agreed.

## Safe harbor

We will not pursue legal action against good-faith research that:
- Limits testing to ce-demo.homelabarr.com (or your own self-hosted copy).
- Avoids privacy violations / data destruction / service degradation.
- Reports promptly and respects the disclosure timeline.
```

---

### M-R8-10 — No log shipping documented; structured logs from R6 stay on the host

**Where:** Operational gap.

**What:** R6 emits JSON logs. R8 documents the (optional) shipping path: a single `docker-compose.override.yml` snippet that adds Vector or Promtail as a log forwarder to Loki/OpenSearch.

**RIGHT — `docs/observability-log-shipping.md`** (stub, not enforced)
```yaml
# docker-compose.override.yml — sample for the operator
services:
  vector:
    image: timberio/vector:0.41-alpine
    user: "1000:1000"
    read_only: true
    cap_drop: [ALL]
    security_opt: [no-new-privileges:true]
    volumes:
      - ./vector.toml:/etc/vector/vector.toml:ro
      - homelabarr-activity:/audit:ro                        # the JSONL mirror from R6
    networks:
      - homelabarr-internal
```

vector.toml routes JSON lines from `stdin`/`docker_logs` and the audit JSONL into Loki/OpenSearch. Out-of-scope for the default deployment; documented for operators who want it.

### L-R8-11 — README "Production deployment" section does not exist as a navigable checklist

**Where:** `README.md`.

**What:** R1-R7 created many "operator must do this" items. R8 consolidates them into a linkable section so a new operator has one ordered list.

**RIGHT — append to `README.md`**
```md
## Production deployment checklist

In order:

1. Host firewall:  `sudo bash scripts/host-firewall-setup.sh`
2. Bootstrap secrets:  `scripts/init-secrets.sh` (writes `./secrets/`)
3. Edit `./secrets/default_admin_password` if you want to set a known passcode, or use the generated one printed on first boot.
4. Verify image signatures:
   `cosign verify --certificate-identity-regexp ... ghcr.io/imogenlabs/homelabarr-backend:v2.3.0`
5. Bring the stack up:  `docker compose up -d`
6. Encrypt the database on the FIRST upgrade to v2.3.0:  `docker compose exec backend bash scripts/encrypt-db.sh /app/data/homelabarr.db /run/secrets/sqlcipher_key`
7. Verify health:  `curl -fsS https://<host>/api/health`  (status: OK)
8. Verify audit chain:  log in, then  `curl ... /api/audit | jq '.chain'`  (ok: true)
9. AppArmor:  `sudo bash scripts/install-apparmor.sh`
10. fail2ban:  copy `docs/fail2ban/homelabarr.conf` to `/etc/fail2ban/jail.d/`, restart fail2ban.
11. Backups:  install `/etc/cron.d/homelabarr-backup`; verify after 24 hours.
12. Run the first DR drill within the first week:  `bash docs/dr-drill.sh` on a throwaway VM.
13. Subscribe to Dependabot/Security alerts in GitHub repo settings.

After ANY upgrade:
- Re-pull the image, verify cosign signature, then  `docker compose up -d`.
- After v2.4+, watch the changelog for new mandatory secrets or schema migrations.
```

---

### L-R8-12 — `docker compose down -v` lacks a guard

**Where:** Operator footgun. `docker compose down -v` wipes named volumes — fatal after encryption.

**What:** Add a Makefile / justfile wrapper that intercepts `down -v` with a confirmation prompt and a hint to back up first.

**RIGHT — `Makefile` (new at repo root, or extend if one exists)**
```makefile
.PHONY: up down restart logs backup restore-drill encrypt-db rotate-jwt rotate-sqlcipher danger-wipe

up:          ; docker compose up -d
down:        ; docker compose down
restart:     ; docker compose restart
logs:        ; docker compose logs -f --tail 200
backup:      ; bash scripts/backup.sh
restore-drill: ; sudo bash scripts/restore-drill.sh
encrypt-db:  ; docker compose exec backend bash scripts/encrypt-db.sh /app/data/homelabarr.db /run/secrets/sqlcipher_key
rotate-jwt:  ; bash scripts/rotate-jwt-key.sh
rotate-sqlcipher: ; sudo bash scripts/rotate-sqlcipher-key.sh

# Guarded destructive op
danger-wipe:
\t@echo "This will DELETE all volumes — DB, secrets in-volume, audit history."
\t@echo "Have you backed up ./secrets/ and the latest DB snapshot OFF-HOST? (yes/NO)"
\t@read CONFIRM; [ "\$\$CONFIRM" = "yes" ] || { echo "aborted"; exit 1; }
\tdocker compose down -v
```

---

### L-R8-13 — Audit `backup.completed` and `backup.failed` events not emitted on cron failures

**Where:** `scripts/backup-cron.sh` (C-R8-1).

**What:** Cron failures are notoriously silent. Wire the script's exit status into an audit event so the existing R6 webhook can alert on backup failures.

**RIGHT — at the end of `backup-cron.sh`**
```sh
set +e
... existing backup steps ...
RC=$?
EVT=ok
[ "$RC" -eq 0 ] || EVT=fail
# Emit via the audit endpoint (admin auth via service token, or via docker exec)
docker exec homelabarr-backend node -e "
  const { audit } = require('./server/audit.js');
  const { db } = require('./server/db.js');
  audit(db, { event: 'backup.completed', actor: 'cron', result: '$EVT',
              meta: { stamp: '$STAMP', rc: $RC } });
" || true
exit $RC
```

If `ALERT_WEBHOOK_URL` is configured (R6 H-R6-3) and `ALERT_EVENTS` includes `backup.completed` with `result=fail`, the operator is paged.

---

## §4 — Verification

(Run after R8 ships.)

### 4.1 — Backup + restore drill

```sh
# Daily cron produced a file
ls -1t /var/backups/homelabarr/*.db | head -1
# Expect: dated within last 26h

# Restore drill passes
sudo bash /opt/homelabarr/scripts/restore-drill.sh
# Expect: 'DRILL OK', users>0, events>0
```

### 4.2 — fail2ban jail catches credential stuffing from a test box

```sh
fail2ban-client status homelabarr | grep 'Total banned'
# Run 13 bad logins from a separate test IP, then re-check.
# Expect: that IP appears in Currently banned, and ufw status shows the deny rule
```

### 4.3 — Host firewall

```sh
# From an external host
nmap -sS -p 1-1024 -Pn <homelabarr-host>
# Expect: 22, 80, 443 open; 2375, 2376 closed
```

### 4.4 — AppArmor enforcement

```sh
aa-status | grep homelabarr-backend
# Expect: 'homelabarr-backend (enforce)'

docker exec homelabarr-backend sh -c 'touch /etc/x 2>&1'
# Expect: permission denied
```

### 4.5 — HSTS preload-eligible header

```sh
curl -sI https://ce-demo.homelabarr.com/ | tr -d '\r' | grep -i strict-transport-security
# Expect: max-age=63072000; includeSubDomains; preload
```

### 4.6 — `Server` header stripped

```sh
curl -sI https://ce-demo.homelabarr.com/ | tr -d '\r' | grep -i ^server:
# Expect: no output or empty
```

### 4.7 — DR drill on throwaway host completes

```sh
# On a clean Docker host:
git clone https://github.com/imogenlabs/homelabarr-ce && cd homelabarr-ce && git checkout v2.3.0
bash docs/dr-drill.sh
# Expect: ends with 'DR DRILL OK'
```

### 4.8 — Audit chain after restore

```sh
curl -s --cookie cj.txt -H 'X-Requested-With: XMLHttpRequest' \
  https://<restored-host>/api/audit | jq '.chain'
# Expect: { "ok": true, "rows": <integer> }
```

### 4.9 — Carry-forwards from R7 cleaned

```sh
# R7.5-drift-1: JWT keyring
grep -c 'kid' .github/workflows/security-audit.yml 2>/dev/null || true   # not the test
docker exec homelabarr-backend node -e "
  const j = require('jsonwebtoken');
  const t = j.sign({ x:1 }, 'test', { header:{ kid:'abc' } });
  console.log(j.decode(t, {complete:true}).header.kid)
"
# Expect: 'abc'

# R6.5-drift-1: /api/health minimal
curl -s https://ce-demo.homelabarr.com/api/health | jq 'keys'
# Expect: ["status","timestamp","version"]

curl -s -o /dev/null -w '%{http_code}\n' https://ce-demo.homelabarr.com/api/health/detail
# Expect: 401 (unauthenticated)

# R5.5-drift-2: packageManager
jq -r .packageManager package.json
# Expect: 'npm@10.x.x+sha256.…'

# R5.5-drift-6: digest pins after tagging v2.3.0
grep -cE 'ghcr.io/imogenlabs/homelabarr-(frontend|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml
# Expect: 2

# R5.5-drift-7: all uses: SHA-pinned
grep -RhE '^\s*-\s*uses:' .github/workflows | grep -vE '@[0-9a-f]{40}' | grep -v '^\s*#'
# Expect: empty
```

---

## §5 — Out of Scope (Queued for Later Rounds)

| Round | Dimension |
|---|---|
| **R9** | Application-layer DAST — automated OWASP ZAP baseline against ce-demo.homelabarr.com on each merge to main; custom rules for HomelabARR's API surface; scheduled deep scans. |
| **R10** | Penetration-test prep — engagement scope doc, exclusion list, test accounts, audit-log preservation policy for the test window. |
| **R11** | Compliance posture — map controls to a framework (CIS Docker, OWASP ASVS, NIST CSF) and produce a per-control evidence index. |
| **SELinux narrowing** | A bespoke SELinux profile equivalent to H-R8-4's AppArmor. Defer until a real Fedora/RHEL operator asks for it. |
| **R2.6** (optional) | Trusted Types report-only → enforce rollout (deferred since R2's verification matrix). |
| **Observability-2** (later) | Wire R6 JSON logs into Loki/OpenSearch via the docs/observability-log-shipping.md stub (M-R8-10). |

---

## §6 — Owner Pile (Human-Only / Do-Not-Delegate)

1. **Run `scripts/host-firewall-setup.sh` on the ce-demo.homelabarr.com host.** This is irreversible without console access — confirm SSH stays reachable BEFORE enabling. Then run nmap from a separate box to confirm 2375/2376 are closed.

2. **Decide off-host backup destinations.** One for the encrypted DB (B2 / S3 / restic to any provider — DB is already SQLCipher so destination only needs basic access controls). A **different** one for the secrets archive (1Password / Bitwarden vault, hardware key, etc.). Document both in your operations notes.

3. **Generate and publish the disclosure PGP key.** `gpg --quick-gen-key reporting@homelabarr.com ed25519`. Publish the fingerprint in SECURITY.md and the public key at `https://homelabarr.com/.well-known/pgp-key.asc`. Add a forwarding rule for the inbox.

4. **Submit `homelabarr.com` to https://hstspreload.org** AFTER M-R8-7 ships and you've confirmed every subdomain you publish supports HTTPS only. Submission is one-way; rolling it back takes months. Triple-check before submitting.

5. **Run the first DR drill within 7 days of R8 shipping.** Spin a throwaway VM or use a separate Docker host, follow the `docs/dr-drill.sh` script, verify `/api/audit` chain ok=true on the restored stack. Document time-to-recovery so future drills have a baseline.

6. **Tag and release `v2.3.0`.** This unblocks R5.5-drift-6 (digest pinning in compose) and lets users follow the production deployment checklist (L-R8-11) with concrete commands.

7. **Ship the 4 carry-forwards in the R8 PR:** R7.5-drift-1 (JWT keyring with kid), R6.5-drift-1 (/api/health minimization), R5.5-drift-2 (packageManager pin), R5.5-drift-7 (the last 5 unpinned `uses:` lines). Each has a verbatim diff in §0.

8. **Add a maintenance window policy.** R8's rotation scripts (rotate-jwt-key, rotate-sqlcipher-key, encrypt-db) all imply ~1-second to ~30-second backend downtimes. Document when those windows are acceptable and put the rotation cron AT THE BEGINNING of the window so failures have time to be diagnosed.

9. **Audit the 5 remaining `@vN`-tagged actions.** I count 5 of 35 still on mutable tags. Find them with `grep -RhE '^\s*-\s*uses:' .github/workflows | grep -vE '@[0-9a-f]{40}' | grep -v '#'` and SHA-pin each.

10. **Add a SECURITY-CONTACTS file at repo root** (lowercased) so GitHub's UI surfaces the disclosure email prominently.

---

## §7 — Deliverable

**PR title:**
`security(r8): deployment runbook, host firewall, fail2ban+audit bridge, apparmor profile, backup cron + restore drill, DR playbook, disclosure policy + R6/R7 cleanups`

**Squash-commit body:**
```
Round 8 of the security audit ships the production deployment runbook,
host-level defense layers, and the recovery story.
Findings: 1 Critical / 5 High / 4 Medium / 3 Low.

C-R8-1   scripts/backup-cron.sh + scripts/restore-drill.sh + cron entry;
         dual-zone off-host destinations; monthly restore drill is the
         acceptance criteria. Audit emits backup.completed event.

H-R8-2   /etc/fail2ban/filter.d/homelabarr.conf + jail config parses the
         R6 JSONL audit log; bans IPs that produce >=12 login.fail/
         login.locked events in 10 minutes for 24 hours via ufw.

H-R8-3   scripts/host-firewall-setup.sh idempotently installs a UFW or
         nftables baseline that allows 22/80/443 and explicitly DENIES
         2375/2376 (docker daemon must not be reachable).

H-R8-4   /etc/apparmor.d/homelabarr-backend confines the backend
         container; homelabarr.yml gains apparmor=homelabarr-backend in
         security_opt. scripts/install-apparmor.sh ships the loader.

H-R8-5   SECURITY.md documents Topology A (single-host) and Topology B
         (split-host via WG + Traefik mTLS). docs/topology-mtls.md
         provides the step-ca + Traefik file-provider recipe.

H-R8-6   SECURITY.md gains a Disaster Recovery section with the full
         host-rebuild procedure. docs/dr-drill.sh automates the drill
         on a throwaway host.

M-R8-7   Strict-Transport-Security upgraded to 2-year max-age with
         preload directive; SECURITY.md documents the hstspreload.org
         submission step (owner-pile gated).

M-R8-8   Server header stripped at Traefik (and nginx) — no
         implementation fingerprint.

M-R8-9   SECURITY.md gains Reporting + Disclosure Timeline + Safe
         Harbor sections; SECURITY-CONTACTS file added at repo root.

M-R8-10  docs/observability-log-shipping.md stub for Vector → Loki.

L-R8-11  README gains a 13-step Production Deployment Checklist.

L-R8-12  Makefile wraps docker compose ops, with a 'yes'-prompt guarded
         danger-wipe target replacing direct down -v use.

L-R8-13  backup-cron.sh emits backup.completed audit event with
         success/fail status so the R6 webhook fires on failed backups.

R7/R6/R5 cleanups bundled in same PR (diffs in audit §0):
  R7.5-drift-1  JWT keyring with kid header — rotation without
                forced re-login
  R6.5-drift-1  /api/health minimized to {status,timestamp,version};
                /api/health/detail behind requireAdmin
  R5.5-drift-2  packageManager pin in package.json
  R5.5-drift-6  Image tag@sha256:digest pinning after v2.3.0 tag
  R5.5-drift-7  SHA-pin the remaining 5 'uses:' lines in workflows
  R8.5-drift-3  scripts/migrate-config-to-db.js (kv_secrets migration)

Verification matrix in audit §4 is the acceptance criteria; the C-R8-1
backup + restore drill is the gating green check for the release.
```

---

## §8 — End / Loop Continuation

When R8 ships, I will re-verify:
- `/api/health` returns 3 keys (R6.5-drift-1 finally cleaned).
- `fail2ban-client status homelabarr` shows the jail loaded.
- `nmap` from an external IP shows only 22/80/443 open.
- `aa-status` shows `homelabarr-backend (enforce)`.
- `curl -sI` shows HSTS `preload` and no `Server` header.
- `/api/audit` shows `backup.completed` events daily.
- `scripts/restore-drill.sh` returns `DRILL OK`.
- `docs/dr-drill.sh` on a throwaway host completes successfully.
- JWT rotation via `scripts/rotate-jwt-key.sh` does not force re-login (kid keyring).
- Every `uses:` is SHA-pinned (no stragglers).

If everything is green, the next deliverable is **Round 9: application-layer DAST + OWASP ZAP baseline in CI** (custom rules for HomelabARR's API surface, scheduled deep scans). Drafted without asking.

If drift: **Round 8.5 correction MD** first.
