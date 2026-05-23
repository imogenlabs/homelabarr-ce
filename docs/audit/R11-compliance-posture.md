# Round 11 — Compliance posture mapping

**Date:** 2026-05-23
**Target:** homelabarr-ce main @ `5db8b66ff6`, ce-demo.homelabarr.com
**Predecessor state:** R1-R10.7 shipped. 168 findings live. R10 ATT&CK harness functional with honey IOC pipeline emitting T1595.002 to audit.
**Goal:** Translate the shipped controls into auditor-readable claims against three frameworks: CIS Docker Benchmark v1.6.0, OWASP ASVS v4.0.3 Level 2, NIST CSF 2.0. Produce a single artifact (`compliance/posture.md`) the user can hand to a customer's security questionnaire.

---

## §0 — Carry-forward verification (anon, credentials:omit, body-shape gate)

### Live probes
| Probe | Status | Body shape | Verdict |
|---|---|---|---|
| /api/health | 200, 3 keys | json | ✓ R6.5 |
| /api/health/detail | 401 | "Authentication required" | ✓ R9.6 |
| /api/_routes | 401 | "Authentication required" | ✓ R9.6 |
| /wp-login.php | 404 | 9B `Not Found` text/plain | ✓ honey R10.7 |
| /phpmyadmin | 404 | 9B `Not Found` text/plain | ✓ honey R10.7 |
| /admin.php | 404 | 9B `Not Found` text/plain | ✓ honey R10.7 |
| /xmlrpc.php | 404 | 9B `Not Found` text/plain | ✓ honey R10.7 |
| /.env | 404 | 9B `Not Found` text/plain | ✓ honey R10.7 |
| /.git/config | 404 | 9B `Not Found` text/plain | ✓ honey R10.7 |
| /.aws/credentials | 404 | 9B `Not Found` text/plain | ✓ honey R10.7 |
| /.ssh/id_rsa | 404 | 9B `Not Found` text/plain | ✓ honey R10.7 |
| /api/admin/legacy-debug | 404 | 9B `Not Found` text/plain | ✓ honey R10.7 |
| /api/internal/audit (POST) | 403 | `{"ok":false}` | ✓ R9 |
| /api/auth/cli-mint (POST) | 403 | `{"ok":false}` | ✓ R9 |
| /.well-known/security.txt | 200 | Contact lines | ✓ R6 |

### Source verification
`server/routes/honey.js` handler confirmed (charcode decode of main@5db8b66ff6):
```js
function honeyHandler(req, res) {
  try {
    audit({
      actor: req.user?.username || 'anon',
      ip: req.ip,
      event: 'honey.hit',
      result: 'blocked',
      target: req.originalUrl,
      meta: { mitre_tid: 'T1595.002', mitre_tactic: 'TA0043', ua: ... }
    });
```

main == dev at `5db8b66ff6`. Zero security branches remaining. **Carry-forwards: 0.**

---

## §1 — Goal

Up to now the audit has shipped controls one slice at a time. R11 reverses the lens: given the 168 shipped findings, what compliance claims can the project honestly make against industry frameworks, and where are the residual gaps?

Three deliverables:

1. `compliance/posture.md` — single-page trace table. For each control, list (a) the framework requirement, (b) the implementing artifact in the repo, (c) the verification command, (d) status (Met / Partial / Gap / N/A).
2. `compliance/evidence/` — directory of `.txt` snapshots from the harness (R10) and probe runs (R0 §0 of every round) that an auditor can read without rerunning the test.
3. `compliance/README.md` — explains the scope, threat model, attestation chain, and update cadence.

Three frameworks in scope:

- **CIS Docker Benchmark v1.6.0** — directly relevant; the project is a Dockerized stack.
- **OWASP ASVS v4.0.3 Level 2** — directly relevant; the project ships a web app with auth.
- **NIST CSF 2.0** — broader org-level posture; relevant if customers ask for "framework alignment."

PCI-DSS, HIPAA, SOC 2 are explicitly OUT OF SCOPE — this is an open-source self-hosted dashboard, not a regulated environment. If a downstream operator deploys homelabarr-ce in a PCI scope, they inherit responsibility for their own attestation.

---

## §2 — Current state

### What's already attestable (from shipped rounds)
- R1: helmet, CSP, CORS allowlist, rate limits, secure defaults
- R2: XSS-safe rendering, CSP with hash-pinned scripts
- R3: bcrypt, JWT short TTL, session revocation, MFA via TOTP
- R4: read-only rootfs, cap-drop ALL + minimal-add, AppArmor profile, no docker.sock in backend
- R5: SHA-pinned actions, SBOM via syft, cosign verify, dependabot, scorecard
- R6: hash-chained audit log, structured JSON, /.well-known/security.txt
- R7: docker secrets, SQLCipher at rest, key rotation runbook
- R8: prod runbook, host fail2ban + UFW + AppArmor enforce, backup.sh with offsite + gpg + sha256
- R9 / R9.5 / R9.6: DAST ZAP integration, route gating, mint endpoint auth
- R10 / R10.5 / R10.6 / R10.7: ATT&CK Atomic Red Team harness, attackTag middleware, honey routes emitting T1595.002

### What's NOT yet attestable
- Audit-log off-box shipping (R10 M-2, deferred)
- Time-source attestation (NTP integrity)
- Crypto module FIPS posture (won't fix — out of scope for OSS)
- Privileged access management for the OWNER role
- Disaster recovery exercise log (R8 specced; no recorded drill)
- Vendor risk management (n/a for OSS)

---

## §3 — Findings

### H-1 — No compliance directory exists

**WRONG:** Repo has no `compliance/` directory. Customer questionnaires get answered ad-hoc; nothing is reproducible.

**RIGHT:**

```
compliance/
├── README.md                  # scope, threat model, update cadence
├── posture.md                 # single-source trace table
├── cis-docker-v1.6.0.md       # CIS section-by-section
├── owasp-asvs-v4.0.3-L2.md    # ASVS chapter-by-chapter
├── nist-csf-2.0.md            # CSF function-by-function
├── evidence/
│   ├── R10.7-bodyshape.txt    # honey body-shape proof
│   ├── R9.6-route-gating.txt  # 401 on /health/detail proof
│   ├── R4-cap-drop.txt        # docker inspect cap output
│   ├── R5-cosign-verify.txt   # cosign output for last image
│   ├── R6-audit-chain.txt     # 50 audit events with hash continuity
│   └── ... (one per attestable claim)
└── update-cadence.md          # quarterly review schedule + owner
```

Each file in `compliance/` is plain markdown, no auto-generation. Evidence files are `.txt` because they need to be diff-able and copy-pasteable into a customer's PDF.

---

### H-2 — CIS Docker Benchmark trace

CIS Docker v1.6.0 has 116 controls across 7 sections. Many are operator-responsibility (host config, daemon flags). For an OSS project shipping a compose stack, the achievable subset is sections 4 (Container Images) and 5 (Container Runtime). Map every applicable control:

`compliance/cis-docker-v1.6.0.md` skeleton:

```md
# CIS Docker Benchmark v1.6.0 — homelabarr-ce posture

Scope: container images + runtime configuration shipped by this repo.
Out of scope: host daemon flags, host filesystem, registry config — operator-responsibility.

## Section 4 — Container Images

### 4.1 Ensure that a user for the container has been created     [Met]
Evidence: `grep -n 'USER ' Dockerfile.backend`
Output: `USER node` at line N. Container runs as uid 1000, not root.
File: evidence/CIS-4.1-USER.txt

### 4.2 Ensure that containers use only trusted base images       [Met]
Evidence: cosign verify on every base image in CI (R5)
File: evidence/CIS-4.2-cosign.txt

### 4.3 Ensure unnecessary packages are not installed             [Met]
Evidence: `docker run --rm <img> apk list --installed | wc -l`
Comparable against node:24-alpine baseline. Diff <= 10 packages.
File: evidence/CIS-4.3-package-diff.txt

### 4.4 Ensure images are scanned and rebuilt for vulns           [Met]
Evidence: .github/workflows/security-audit.yml runs Trivy + Grype weekly.
File: evidence/CIS-4.4-trivy-grype.txt

### 4.5 Ensure Content trust for Docker is Enabled                [Partial]
Repo signs images with cosign (R5). Docker Content Trust (DCT) per se
is not enabled. cosign provides equivalent attestation.
File: evidence/CIS-4.5-cosign-equivalent.txt

### 4.6 Ensure HEALTHCHECK instructions are added                 [Met]
Evidence: `grep -n 'HEALTHCHECK' Dockerfile.backend`

### 4.7 Ensure update instructions are not used alone in Dockerfile [Met]
Evidence: `grep -E '^RUN apk' Dockerfile.backend | grep -v 'apk update.*apk add'`
Should return empty.

### 4.9 Ensure that COPY is used instead of ADD                   [Met]
Evidence: `grep -c '^ADD ' Dockerfile.backend` → 0

### 4.10 Ensure secrets are not stored in Dockerfiles             [Met]
Evidence: `gitleaks detect --redact` in CI (R5). Build args documented.

### 4.11 Ensure verified packages are only installed              [Met]
Evidence: `npm ci` with lockfile + dependabot.

## Section 5 — Container Runtime

### 5.1 Ensure AppArmor profile is enabled                        [Met]
Evidence: `docker inspect <c> | jq '.[0].AppArmorProfile'` → `homelabarr-backend`
File: evidence/CIS-5.1-apparmor.txt

### 5.3 Ensure Linux kernel capabilities are restricted           [Met]
Evidence: `docker inspect <c> | jq '.[0].HostConfig.CapDrop, .[0].HostConfig.CapAdd'`
Drops ALL, adds only NET_BIND_SERVICE.
File: evidence/CIS-5.3-caps.txt

### 5.4 Ensure that privileged containers are not used            [Met]
Evidence: privileged=false in compose. CI gate fails on privileged=true.

### 5.5 Ensure sensitive host system directories are not mounted  [Met]
Evidence: `docker inspect <c> | jq '.[0].Mounts'` — only named volumes.

### 5.7 Ensure privileged ports are not mapped within containers  [Met]
Evidence: published ports are 8090/3001, nothing <1024.

### 5.9 Ensure the host's network namespace is not shared         [Met]
Evidence: `docker inspect <c> | jq '.[0].HostConfig.NetworkMode'` → `homelabarr_net`, not `host`.

### 5.10 Ensure that the memory usage for container is limited    [Met]
Evidence: `docker inspect <c> | jq '.[0].HostConfig.Memory'` → > 0.

### 5.11 Ensure CPU priority is set                               [Met]
Evidence: `docker inspect <c> | jq '.[0].HostConfig.CpuShares'` and `CpuQuota`.

### 5.12 Ensure root filesystem is mounted read-only              [Met]
Evidence: `docker inspect <c> | jq '.[0].HostConfig.ReadonlyRootfs'` → `true`.

### 5.14 Ensure no-new-privileges is set                          [Met]
Evidence: `SecurityOpt` array contains `no-new-privileges:true`.

### 5.25 Ensure container is restricted from acquiring new privs  [Met]
Same as 5.14 (R4).

### 5.28 Ensure PID limit is set                                  [Met]
Evidence: `docker inspect <c> | jq '.[0].HostConfig.PidsLimit'` → 200.

### 5.29 Ensure docker.sock is not mounted inside container       [Met]
Backend container has no docker.sock mount (R4). Socket proxy used.
File: evidence/CIS-5.29-no-sock.txt
```

Total CIS controls in scope: ~25. Expected status distribution: 22 Met, 2 Partial, 1 N/A.

---

### H-3 — OWASP ASVS v4.0.3 Level 2 trace

ASVS L2 has ~268 requirements across 14 chapters. The applicable subset for this stack:

| Chapter | Title | In scope? |
|---|---|---|
| V1 | Architecture | yes (partial) |
| V2 | Authentication | yes (full) |
| V3 | Session Management | yes (full) |
| V4 | Access Control | yes (full) |
| V5 | Validation, Sanitization, Encoding | yes (full) |
| V6 | Stored Cryptography | yes (R7) |
| V7 | Error Handling and Logging | yes (R6) |
| V8 | Data Protection | yes (partial) |
| V9 | Communication | yes (TLS) |
| V10 | Malicious Code | partial |
| V11 | Business Logic | partial |
| V12 | Files and Resources | yes |
| V13 | API and Web Service | yes (full) |
| V14 | Configuration | yes (R4/R5/R7) |

`compliance/owasp-asvs-v4.0.3-L2.md` for each in-scope requirement records: req ID, requirement text, implementing artifact, evidence file, status.

Sample entries (highest-leverage):

```md
### V2.1.1 — Verify user passwords are at least 12 characters    [Met]
Source: server/auth/password.js — enforces minLength 12, complexity rules.
Evidence: evidence/ASVS-V2.1.1-policy.txt

### V2.2.3 — Verify rate limiting on authentication              [Met]
Source: server/middleware/rateLimit.js — 5 attempts/15min per ip.
R10 atomic T1110 confirms 429 after 5 attempts.
Evidence: evidence/ASVS-V2.2.3-rate-limit.txt

### V2.7.5 — Verify TOTP is supported for MFA                    [Met]
Source: server/auth/mfa.js — RFC 6238, drift window ±1.
Evidence: evidence/ASVS-V2.7.5-totp.txt

### V3.2.1 — Verify session tokens are server-generated          [Met]
Source: server/auth/jwt.js — HS256 over secret from docker-secret mount.
Evidence: evidence/ASVS-V3.2.1-jwt.txt

### V3.3.1 — Verify logout invalidates the session               [Met]
Source: server/auth/sessions.js — jti added to revocation set on /auth/logout.
Evidence: evidence/ASVS-V3.3.1-revoke.txt

### V4.1.5 — Verify access controls fail closed                  [Met]
Source: server/middleware/requireAuth.js — throws 401 on missing/invalid token.
Evidence: evidence/ASVS-V4.1.5-fail-closed.txt (R10 T1606 atomic)

### V4.2.1 — Verify forced browsing is prevented                 [Met]
R9.6 gate live: /api/_routes returns 401 to anon.
Evidence: evidence/ASVS-V4.2.1-route-gate.txt

### V5.1.1 — Verify input validation enforcement                 [Met]
Source: server/middleware/validate.js (zod schemas per endpoint).
Evidence: evidence/ASVS-V5.1.1-zod.txt

### V5.3.4 — Verify SQL injection prevention                     [Met]
Source: better-sqlite3 prepared statements only. No template-string SQL.
R10 atomic T1190 includes SQLi payload set.
Evidence: evidence/ASVS-V5.3.4-prepared.txt

### V6.2.1 — Verify cryptographic modules fail securely          [Met]
Node 24 LTS crypto subtle. No custom crypto. SQLCipher AES-256-CBC.
Evidence: evidence/ASVS-V6.2.1-crypto-modules.txt

### V7.1.1 — Verify no sensitive data in logs                    [Met]
Source: server/logger.js — redact list includes password, token, secret.
Evidence: evidence/ASVS-V7.1.1-redact.txt

### V7.3.1 — Verify all auth decisions are logged                [Met]
R6 audit log — every requireAuth result emits event.
Evidence: evidence/ASVS-V7.3.1-audit-coverage.txt

### V8.2.2 — Verify sensitive data is not cached client-side     [Met]
Cache-Control: no-store on /api/* responses (R1 helmet).
Evidence: evidence/ASVS-V8.2.2-no-store.txt

### V9.1.1 — Verify TLS for all client-server communication      [Met]
Cloudflare-fronted, HSTS max-age=63072000 preload, A+ rating on SSL Labs.
Evidence: evidence/ASVS-V9.1.1-tls.txt

### V13.2.1 — Verify HTTP methods enforced                       [Met]
Express routes are method-specific. R10 T1190 verifies wrong-verb returns 404.
Evidence: evidence/ASVS-V13.2.1-methods.txt

### V14.4.5 — Verify HSTS header is set                          [Met]
Source: server/index.js helmet hsts config.
Evidence: evidence/ASVS-V14.4.5-hsts.txt
```

Total ASVS L2 in-scope requirements: ~110. Expected distribution: 95 Met, 10 Partial, 5 Gap (auth.log off-box, DR drill log, etc.)

---

### H-4 — NIST CSF 2.0 trace

CSF 2.0 has 6 functions (GOVERN added in 2.0): GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND, RECOVER. For an OSS project, the per-function mapping:

`compliance/nist-csf-2.0.md` skeleton:

```md
# NIST CSF 2.0 — homelabarr-ce alignment

Scope statement: this attestation covers the code shipped in this repository.
Operator-responsibility items (BCP, vendor mgmt, awareness training) are
NOT in scope and are explicitly delegated to the deploying operator.

## GV — GOVERN
- GV.OC-01 Organizational mission … N/A (OSS project, no org)
- GV.RM-01 Risk strategy … docs/SECURITY.md states risk acceptance posture
- GV.PO-01 Cybersecurity policy … docs/SECURITY.md + .well-known/security.txt
- GV.SC-01 Supply chain risk … R5 SBOM + cosign + dependabot

## ID — IDENTIFY
- ID.AM-01 Hardware inventory … N/A
- ID.AM-02 Software inventory … SBOM via syft, attached to each release
- ID.RA-01 Vulnerabilities identified … R5 Trivy weekly, Dependabot daily
- ID.RA-05 Threats identified … R10 ATT&CK matrix coverage

## PR — PROTECT
- PR.AA-01 Identities issued … R3 user mgmt with MFA
- PR.AA-03 Authentication enforced … requireAuth middleware, R10 T1078 atomic
- PR.AA-05 Access permissions managed … requireRole middleware, R9.6 admin gates
- PR.DS-01 Data at rest protected … R7 SQLCipher
- PR.DS-02 Data in transit protected … TLS 1.3 via CF
- PR.IR-01 Resources protected … R4 container hardening
- PR.PS-01 Configuration management … docker-compose pinned, R5 SHA-pinned actions
- PR.PS-02 Software maintained … Dependabot + weekly scans

## DE — DETECT
- DE.CM-01 Network monitored … honey routes (R10.7) + nginx access logs
- DE.CM-03 Personnel activity monitored … R6 audit log
- DE.CM-09 Computing hardware … N/A (containerized)
- DE.AE-02 Potentially adverse events analyzed … attackTag middleware (R10.5) — mitre_tid on events
- DE.AE-03 Information correlated … hash-chained audit log (R6) — tamper-evident

## RS — RESPOND
- RS.MA-01 Incident response plan … docs/INCIDENT-RESPONSE.md (NEW, this round)
- RS.MA-02 Reports triaged … security.txt with PGP-signed disclosure (R6)
- RS.AN-03 Forensics performed … audit log chain provides timeline; harness scripts for verification

## RC — RECOVER
- RC.RP-01 Recovery plan executed … R8 backup.sh + restore drill spec
- RC.RP-02 Recovery actions taken … logged via backup.completed / restore.drill audit events
```

Most CSF subcategories are organizational; the project covers ~40% directly, ~30% by operator delegation, ~30% N/A.

---

### H-5 — Evidence collection script

**WRONG:** Evidence files in §3 H-2/H-3/H-4 don't exist. An auditor asking "show me proof of CIS 5.12 (read-only rootfs)" can't get an answer without rerunning commands manually.

**RIGHT:** `compliance/collect-evidence.sh`:

```sh
#!/bin/sh
# Generate point-in-time evidence snapshots for compliance/evidence/
# Run nightly via cron + on every release tag.

set -e
OUT=compliance/evidence
mkdir -p "$OUT"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
HEAD=$(git rev-parse HEAD)
HOST=ce-demo.homelabarr.com
BACKEND=$(docker compose ps -q backend)

hdr() { echo "# $1"; echo "# timestamp=$TS git=$HEAD"; echo; }

# --- CIS section 5 (runtime) ---
{ hdr "CIS 5.1 AppArmor profile"
  docker inspect "$BACKEND" | jq -r '.[0].AppArmorProfile'
} > "$OUT/CIS-5.1-apparmor.txt"

{ hdr "CIS 5.3 cap drop/add"
  docker inspect "$BACKEND" | jq '.[0].HostConfig | {CapDrop, CapAdd}'
} > "$OUT/CIS-5.3-caps.txt"

{ hdr "CIS 5.12 read-only rootfs"
  docker inspect "$BACKEND" | jq -r '.[0].HostConfig.ReadonlyRootfs'
} > "$OUT/CIS-5.12-rootfs.txt"

{ hdr "CIS 5.14 no-new-privileges"
  docker inspect "$BACKEND" | jq '.[0].HostConfig.SecurityOpt'
} > "$OUT/CIS-5.14-nnp.txt"

{ hdr "CIS 5.28 pids limit"
  docker inspect "$BACKEND" | jq -r '.[0].HostConfig.PidsLimit'
} > "$OUT/CIS-5.28-pids.txt"

{ hdr "CIS 5.29 no docker.sock mount in backend"
  docker inspect "$BACKEND" | jq '.[0].Mounts[] | select(.Source | test("docker.sock"))' | wc -l
} > "$OUT/CIS-5.29-no-sock.txt"

# --- ASVS V4 access control ---
{ hdr "ASVS V4.1.5 fail-closed (R9.6 R10.7 live probe)"
  curl -sI -H 'Cache-Control: no-cache' --cookie '' https://"$HOST"/api/health/detail | head -1
  curl -sI -H 'Cache-Control: no-cache' --cookie '' https://"$HOST"/api/_routes | head -1
} > "$OUT/ASVS-V4.1.5-fail-closed.txt"

{ hdr "ASVS V2.2.3 rate limit (R10 T1110 atomic)"
  bash pentest/atomics/T1110-brute-force/test.sh 2>&1 | tail -20
} > "$OUT/ASVS-V2.2.3-rate-limit.txt"

# --- R10.7 honey body-shape proof ---
{ hdr "R10.7 honey body shape (T1595.002)"
  for p in /wp-login.php /phpmyadmin /.env /.git/config /api/admin/legacy-debug; do
    BODY=$(curl -s --cookie '' "https://$HOST$p")
    LEN=$(printf '%s' "$BODY" | wc -c)
    echo "$p len=$LEN body=\"$BODY\""
  done
} > "$OUT/R10.7-bodyshape.txt"

# --- R6 audit log chain integrity ---
{ hdr "R6 audit chain integrity (last 50 events)"
  docker exec "$BACKEND" sh -c "tail -n 50 /app/data/audit.log | node -e 'process.stdin.on(\"data\",d=>{const lines=d.toString().trim().split(\"\\n\").map(JSON.parse);let ok=0,bad=0;for(let i=1;i<lines.length;i++){if(lines[i].hash_prev===lines[i-1].hash_curr)ok++;else bad++;}console.log({ok,bad,total:lines.length});}'"
} > "$OUT/R6-audit-chain.txt"

# --- R5 cosign verify on latest image ---
{ hdr "R5 cosign verify"
  IMG=$(docker compose config | yq '.services.backend.image')
  cosign verify --certificate-identity-regexp 'smashingtags' --certificate-oidc-issuer https://token.actions.githubusercontent.com "$IMG" 2>&1 || true
} > "$OUT/R5-cosign.txt"

echo "Evidence collected to $OUT/ at $TS"
```

Run via:

```yaml
# .github/workflows/compliance-evidence.yml
on:
  schedule: [{cron: '0 7 * * *'}]
  release: {types: [published]}
  workflow_dispatch:
jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<SHA>
      - run: bash compliance/collect-evidence.sh
      - uses: actions/upload-artifact@<SHA>
        with: {name: compliance-evidence-${{ github.sha }}, path: compliance/evidence/}
```

The artifact retention gives auditors a 90-day window of point-in-time snapshots without having to access the prod box.

---

### M-1 — Update cadence + ownership statement

**RIGHT:** `compliance/update-cadence.md`:

```md
# Compliance posture — update cadence

- **Quarterly review**: full re-trace against current versions of CIS Docker, ASVS, NIST CSF. Owner: maintainer.
- **Per-release**: collect-evidence.sh runs on every `release: published`. Evidence stored as workflow artifact + tagged in releases page.
- **Per-PR**: pentest harness (R10.5) blocks merge if any control regresses. Compliance traces are descriptive — the harness is enforcing.
- **External attestation**: this is self-attested. Independent audit is OUT OF SCOPE for the OSS project. Operators deploying under regulated regimes must perform their own attestation.
```

---

### L-1 — INCIDENT-RESPONSE.md doc

**RIGHT:** `docs/INCIDENT-RESPONSE.md` — short, operator-facing:

```md
# Incident response — homelabarr-ce

1. Detection sources: audit.log honey.hit events, attackTag mitre_tid hits, harness CI failures.
2. Triage: severity matrix tied to MITRE tactic (Initial Access > Execution > Persistence...).
3. Containment: docker compose stop backend; preserve /app/data; rotate JWT secret (R7 runbook).
4. Recovery: backup.sh restore drill (R8 runbook).
5. Disclosure: .well-known/security.txt + GitHub Security Advisory.
6. Postmortem template: docs/templates/postmortem.md.
```

This satisfies NIST CSF RS.MA-01 directly.

---

## §4 — Verification (run after agent ships)

```sh
# 1. compliance/ directory + required files
test -d compliance
test -f compliance/README.md
test -f compliance/posture.md
test -f compliance/cis-docker-v1.6.0.md
test -f compliance/owasp-asvs-v4.0.3-L2.md
test -f compliance/nist-csf-2.0.md
test -f compliance/update-cadence.md
test -f compliance/collect-evidence.sh
test -d compliance/evidence

# 2. collect-evidence.sh runs and produces files
bash compliance/collect-evidence.sh
ls compliance/evidence/ | grep -E '^(CIS|ASVS|R[0-9])' | wc -l
# expect: >= 10

# 3. Evidence files are non-empty and contain expected markers
grep -q 'homelabarr-backend' compliance/evidence/CIS-5.1-apparmor.txt
grep -q '"true"' compliance/evidence/CIS-5.12-rootfs.txt
grep -q '"Not Found"' compliance/evidence/R10.7-bodyshape.txt
grep -q 'len=9' compliance/evidence/R10.7-bodyshape.txt
grep -q '"bad":0' compliance/evidence/R6-audit-chain.txt   # audit chain has zero broken links

# 4. CI workflow runs on schedule + release
test -f .github/workflows/compliance-evidence.yml
grep -q 'release:' .github/workflows/compliance-evidence.yml

# 5. INCIDENT-RESPONSE doc present
test -f docs/INCIDENT-RESPONSE.md
grep -q 'audit.log' docs/INCIDENT-RESPONSE.md
grep -q 'backup.sh restore' docs/INCIDENT-RESPONSE.md

# 6. posture.md is honest — Gaps are listed, not hidden
grep -c '\[Gap\]' compliance/posture.md     # expect: > 0 (be honest)
grep -c '\[Met\]' compliance/posture.md     # expect: > 80
```

The last two lines are deliberate. A compliance trace that claims 100% Met across all three frameworks is a lie. The acceptance criterion is honest gap reporting, not maximal score.

---

## §5 — Out of scope (queue)

- **R12:** Chaos engineering — Litmus / Chaos Mesh experiments against the running stack.
- **R13:** Threat-informed defense — STIX/TAXII feed ingestion, IOC matching, automated containment.
- **R14:** Privacy posture — GDPR Article 32 mapping if EU deployments matter. Out of scope unless requested.
- Audit-log WORM shipping (deferred from R10 M-2). Owner-pile for R11 follow-up if no off-box sink chosen.

---

## §6 — Owner pile

One decision, no work:

- Audit-log off-box destination. Three options:
  - (a) syslog-over-TLS to a collector you already run (Vector, Loki, OpenSearch). Free if infra exists.
  - (b) S3 bucket with Object Lock + 90-day retention. ~$0.50/mo.
  - (c) Skip — accept the documented gap in compliance/posture.md.

Tell the agent which, and they wire it. No agent action without your pick.

---

## §7 — Deliverable

**PR title:** `feat(compliance): CIS Docker + OWASP ASVS L2 + NIST CSF 2.0 posture`

**Squash commit body:**
```
Round 11 — Compliance posture mapping.

Adds compliance/ directory with traces against CIS Docker v1.6.0,
OWASP ASVS v4.0.3 Level 2, and NIST CSF 2.0. Single-source posture.md
plus per-framework files. Evidence collection scripted in
collect-evidence.sh — runs nightly + on every release, uploaded as
workflow artifact for auditor retrieval.

New artifacts:
  compliance/README.md
  compliance/posture.md
  compliance/cis-docker-v1.6.0.md   (~25 controls, 22 Met)
  compliance/owasp-asvs-v4.0.3-L2.md (~110 reqs, 95 Met)
  compliance/nist-csf-2.0.md         (per-function trace)
  compliance/update-cadence.md
  compliance/collect-evidence.sh
  compliance/evidence/*.txt           (point-in-time snapshots)
  docs/INCIDENT-RESPONSE.md
  .github/workflows/compliance-evidence.yml (cron + release trigger)

Honest gap reporting:
  - Audit-log off-box shipping not yet implemented (owner decision pending)
  - DR drill log not yet recorded
  - FIPS crypto module posture — out of scope (OSS project, Node crypto)
```

---

## §8 — End / Loop continuation

After ship: R12 — Chaos engineering. Compliance trace becomes evergreen via collect-evidence.sh; R12 introduces resilience testing.

End R11.
