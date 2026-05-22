# HomelabARR-CE Security Audit — Round 5
**Dimension:** Dependency hygiene, supply-chain hardening, transitive CVE management
**Target:** `smashingtags/homelabarr-ce` @ `security/round-4-container-hardening@15812e2b` (live: ce-demo.homelabarr.com, bundle `index-pjntRCiX.js`)
**Date:** 2026-05-22
**Status:** Round 4 verified live, 2 minor drifts queued for R4.5 (see §0). Round 3.5 (mfa/verify 400) hot-patched — verified.
**Findings:** 13 (1 Critical / 4 High / 5 Medium / 3 Low)

---

## §0 — Prior Round Carryover (Verified Live + Source)

### Round 4 verification matrix (against `homelabarr.yml` @ `security/round-4-container-hardening` + live probes)

| Check | Source/Live | Verdict |
|---|---|---|
| LinuxServer socket-proxy service in compose | source | **PASS** |
| Direct `docker.sock:rw` mount removed | source | **PASS** |
| Proxy socket mount `:ro` | source | **PASS** |
| `DOCKER_HOST=tcp://socket-proxy:2375` env | source | **PASS** |
| `cap_drop: [ALL]` on backend + frontend | source | **PASS** |
| `security_opt: [no-new-privileges:true]` | source | **PASS** |
| `read_only: true` rootfs | source | **PASS** |
| `tmpfs` mounts for /tmp, /run, /var/cache/nginx | source | **PASS** |
| `pids_limit` + `mem_limit` | source | **PASS** |
| `internal: true` network for socket-proxy | source | **PASS** |
| `group_add` removed | source | **PASS** |
| CLI-bridge bind switched to `:ro` | source | **PASS** |
| `JWT_SECRET=${VAR:?...}` fail-loud | source | **PASS** |
| `ACCESS_TOKEN_TTL=15m` aligned to R3 | source | **PASS** |
| `DEFAULT_ADMIN_PASSWORD=${VAR:?...}` fail-loud | source | **FAIL — R4.5-drift-1** |
| `image:tag@sha256:digest` pinning | source | **FAIL — R4.5-drift-2** |
| R3.5 hot-patch: `POST /api/auth/mfa/verify` empty body → 400 | live | **PASS** |
| R3.5 hot-patch: `POST /api/auth/reset-password` empty body → 400 | live | **PASS** |
| `/api/applications` returns 200 | live | **PASS** |
| `/api/auth/sessions` returns 200 | live | **PASS** |

### R4.5 drifts to clean up in the next ship cycle (small, can ride in R5 PR)

**R4.5-drift-1** — `homelabarr.yml` still has `- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:-admin}`. Should be `:?` so deploys fail loud on first boot if unset.

```yaml
# WRONG
- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:-admin}
# RIGHT
- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:?must be set on first boot; unset after bootstrap}
```

**R4.5-drift-2** — Images in `homelabarr.yml` still reference `:latest` for the HomelabARR-published frontend and backend. Pin by digest after the first tagged release; see also Round 5 finding **H-R5-3** which raises this with a concrete pin recipe.

**R4-cosmetic-1** — `GET /api/health` still reports `"docker":"unix:///var/run/docker.sock"` and `"warnings":["Docker socket not found at /var/run/docker.sock"]` even though the backend now talks to the proxy. Status reads `DEGRADED` based on this stale check. Cosmetic — `/api/containers` returns 200 with `"docker":{"status":"connected"}` and the app functions — but the health endpoint should be updated to probe `tcp://socket-proxy:2375/_ping` instead.

```js
// server/health.js (or wherever the docker check lives)
// WRONG
const dockerPath = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
const ok = fs.existsSync(dockerPath);

// RIGHT
async function checkDocker() {
  const dh = process.env.DOCKER_HOST;
  if (dh && dh.startsWith('tcp://')) {
    const url = new URL(dh.replace('tcp://','http://'));
    try {
      const r = await fetch('http://' + url.hostname + ':' + url.port + '/_ping',
                            { signal: AbortSignal.timeout(2000) });
      return { ok: r.ok, target: dh, kind: 'proxy' };
    } catch { return { ok: false, target: dh, kind: 'proxy' }; }
  }
  const sock = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
  return { ok: fs.existsSync(sock), target: sock, kind: 'unix' };
}
```

---

## §1 — Goal

Close the supply-chain attack surface. The runtime is now hardened (R1–R4); R5 hardens what feeds the runtime:

1. **Catch transitive CVEs before merge** — currently Dependabot opens PRs but nothing blocks `npm audit --audit-level=high` from going red on `main`.
2. **Sign and verify published images** — provenance + SBOM are attached, but no cosign signature, no consumer verify recipe, and no Trivy scan of the **pushed digest** (only source).
3. **Pin everything by content hash** — GitHub Actions by SHA, npm transitives by `overrides`, container base images by digest, deployed images by digest.
4. **Detect drift between intended deps and actual deps** — lockfile freshness check, license audit, secrets scanning in commits.
5. **Establish an OpenSSF Scorecard baseline** so improvements are measurable across rounds.

The threat model: a compromised transitive npm package (the canonical `event-stream`/`ua-parser-js`/`solana` pattern), a typosquat on a Dependabot-merged PR, or a hijacked GitHub Action tag publishing a malicious new `@v5`.

---

## §2 — Current State (Verified via Source @ `security/round-4-container-hardening`)

### 2.1 — `package.json` dependency profile

```
name: homelabarr            version: 2.2.0            type: module
dependencies:    42 packages
devDependencies: 24 packages
engines:           (none)             ← H-R5-2
packageManager:    (none)             ← H-R5-2
overrides:         (none)             ← C-R5-1
resolutions:       (none)             ← C-R5-1
package-lock.json: 460,331 bytes      (transitive graph present and locked)
```

**Notable security-sensitive direct deps that ship with the backend:**

```
bcryptjs ^3.0.2          better-sqlite3 ^12.10.0   cookie-parser ^1.4.7
cors ^2.8.5              dockerode ^4.0.2          express ^4.21.2
express-rate-limit ^7.1.5  helmet ^7.1.0           jsonwebtoken ^9.0.2
nodemailer ^8.0.7        otpauth ^9.5.1            qrcode ^1.5.4
winston ^3.x             yaml ^2.x
```

All are caret-pinned to **minor**, not patch, and several are floor-pinned to **major** ranges that still resolve to old minors:

- `cors ^2.8.5` — `cors@2` has not had a major bump since 2018; not unsafe but worth flagging as "unmaintained" in policy.
- `helmet ^7.1.0` — Helmet 8 is current (CSP defaults updated); ^7 is on long-tail.
- `bcryptjs` rather than native `bcrypt` — fine for portability, but `bcryptjs` is ~10× slower for the same work factor; Round 3's cost-12 hashes are noticeably slower.

### 2.2 — `.github/dependabot.yml` (already shipped in R4)

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

Good baseline. Gaps:
- No `docker` ecosystem (won't open PRs for `node:24-alpine3.23` → `node:24-alpine3.24`).
- No `grouping` rules — `@radix-ui/*` will flood as 13 separate PRs each week.
- No `allow:`/`ignore:` of major bumps for runtime-critical deps (express, jsonwebtoken) — those should be tracked under a dedicated PR with a deliberate test cycle, not auto-merged.
- No `assignees:`/`reviewers:`/`labels:` for triage.
- No `directory:` for `server/` if the backend ever gets its own `package.json` (currently shared, OK).

### 2.3 — `.github/workflows/security-audit.yml` (no R4 changes detected)

Current SAST profile (from line-pattern survey):

| Tool | Hits in workflow |
|---|---|
| Trivy | 25 |
| Semgrep | 12 |
| CodeQL | 1 |
| SARIF upload | 6 |
| **OSV-Scanner** | **0** ← M-R5-6 |
| **npm audit** | **0** ← C-R5-1 |
| **gitleaks/trufflehog** | **0** ← H-R5-5 |
| **OpenSSF Scorecard** | **0** ← M-R5-8 |
| **Docker Scout** | **0** ← M-R5-7 |
| **license-checker** | **0** ← L-R5-11 |
| **CycloneDX SBOM (npm)** | **0** ← M-R5-7 |

Trivy + Semgrep are good source-scan coverage but neither follows the npm transitive graph the way **OSV-Scanner** does (it queries the OSV database directly using `package-lock.json`'s exact resolved versions, which catches what Trivy's package-detection misses on Node projects).

### 2.4 — `.github/workflows/docker-build-push.yml` (no R4 changes detected)

| Control | Present |
|---|---|
| `provenance: true` | YES |
| `sbom: true` (BuildKit attestation) | YES |
| Multi-platform amd64+arm64 | YES |
| `cosign sign` | **NO** ← C-R5-1 / H-R5-3 |
| Trivy on **pushed digest** | **NO** ← C-R5-1 |
| Docker Scout CVE report | **NO** ← M-R5-7 |
| GitHub Actions pinned by 40-char SHA | **NO** (mutable tags) ← H-R5-4 |
| `permissions:` job-scoped (least privilege) | partial — workflow-level only ← M-R5-9 |

R4's M-R4-8 spec'd cosign signing and Trivy-on-digest, but the workflow didn't change. Promoting to **Critical** for R5 because (a) it's now blocking the digest-pinning recipe in H-R5-3 from being meaningfully verifiable, and (b) provenance without a signature is checked-but-not-trusted.

### 2.5 — Lockfile freshness vs. `package.json`

`package-lock.json` is 460 KB and present — good. No CI step verifies that `package.json` and `package-lock.json` agree (i.e., that someone didn't bump `package.json` and forget to `npm install`). `npm ci` in the Dockerfile catches this at build time but only after CI has already passed.

---

## §3 — Findings

Severity scale: **C** Critical (transitive RCE or supply-chain compromise path) · **H** High (drift detection / signature gap) · **M** Medium (defense-in-depth) · **L** Low (hygiene)

### C-R5-1 — No transitive CVE gate, no published-image signature, no published-image scan

**Where:**
- `.github/workflows/security-audit.yml` — runs Trivy on **source**, not on `package-lock.json` against the OSV database, and not on the published image digest.
- `.github/workflows/docker-build-push.yml` — publishes with provenance + SBOM attestations but **does not sign with cosign** and **does not scan the pushed digest**.
- `package.json` — no `overrides` to pin transitives when a CVE drops on a deep dep.

**What:** A new HIGH/CRITICAL CVE on any of the ~600 transitive deps under `express`, `dockerode`, `better-sqlite3`, or `nodemailer` will:
1. **Not be caught** by current CI (Trivy's Node detection is shallower than OSV-Scanner against `package-lock.json`).
2. **Not be blockable** even when discovered, because `npm audit` is not in CI and `overrides` are absent — there's no mechanism to pin a transitive without waiting for the direct dep to bump.
3. **Not be detectable in the published image** — no Trivy/Scout scan against the pushed digest.
4. **Not be cryptographically attributable** — consumers cannot `cosign verify` to prove they're running an image actually produced by this repo's CI.

This is the highest-leverage supply-chain gap in the codebase right now.

**WRONG (current) — `.github/workflows/security-audit.yml`**
No `google/osv-scanner-action` step, no `npm audit --audit-level=high` step, no SARIF feed from either to GitHub Security tab.

**RIGHT — add to `.github/workflows/security-audit.yml` (new job)**

```yaml
  dependency-cves:
    name: Dependency CVE scan (OSV + npm audit)
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write   # upload SARIF
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11   # v4.1.1 — pin by SHA
        with:
          persist-credentials: false

      - uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8  # v4.0.2
        with:
          node-version-file: '.nvmrc'   # see H-R5-2
          cache: 'npm'

      - name: Install (frozen lockfile)
        run: npm ci --no-audit --no-fund

      # 1. npm audit — fast, blocks on HIGH+
      - name: npm audit (HIGH+)
        run: npm audit --audit-level=high --omit=dev --json | tee npm-audit.json
        continue-on-error: false

      # 2. OSV-Scanner — best transitive CVE coverage for npm
      - uses: google/osv-scanner-action/osv-scanner-action@<pin-by-sha>   # latest
        with:
          scan-args: |-
            --recursive
            --skip-git
            --lockfile=./package-lock.json
            --format=sarif
            --output=osv.sarif
        continue-on-error: true   # let SARIF upload run before failing

      - name: Upload OSV SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@<pin-by-sha>
        with:
          sarif_file: osv.sarif
          category: osv-scanner

      - name: Fail on OSV HIGH/CRITICAL
        if: always()
        run: |
          jq -e '
            [.runs[].results[]
             | select(.level == "error" or
                      (.properties.severity? // "") | ascii_downcase
                      | test("high|critical"))] | length == 0
          ' osv.sarif
```

**RIGHT — add to `.github/workflows/docker-build-push.yml` (after the existing build-push step that outputs `steps.build.outputs.digest`)**

```yaml
      - name: Install cosign
        uses: sigstore/cosign-installer@e11c0892438d2c0a48e49dee376e4883f10f2e59   # v3.4.0 — pin by SHA

      - name: Sign image (cosign keyless)
        env:
          COSIGN_EXPERIMENTAL: "1"
        run: |
          set -eu
          for img in homelabarr-frontend homelabarr-backend; do
            cosign sign --yes "ghcr.io/${{ github.repository_owner }}/$img@${{ steps.build.outputs.digest }}"
          done

      - name: Trivy scan (pushed digest, fail on CRITICAL/HIGH)
        uses: aquasecurity/trivy-action@<pin-by-sha>
        with:
          image-ref: ghcr.io/${{ github.repository_owner }}/homelabarr-backend@${{ steps.build.outputs.digest }}
          format: sarif
          output: trivy-image-backend.sarif
          severity: CRITICAL,HIGH
          exit-code: '1'
          ignore-unfixed: true

      - name: Upload Trivy SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@<pin-by-sha>
        with:
          sarif_file: trivy-image-backend.sarif
          category: trivy-image-backend
```

**RIGHT — add `overrides` block to `package.json` (empty placeholder so future CVE pins land cleanly)**

```json
{
  "overrides": {
    "//": "Pin transitives here when a CVE drops and the direct dep has not bumped yet.",
    "//example": { "semver": "^7.5.4" }
  }
}
```

**Verification (post-ship):**

```sh
# 1. CI must run OSV-Scanner and npm audit
gh workflow view security-audit.yml | grep -E 'osv-scanner|npm audit'

# 2. Published image must be cosign-verifiable
cosign verify \
  --certificate-identity-regexp '^https://github.com/smashingtags/homelabarr-ce/' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  ghcr.io/smashingtags/homelabarr-backend@sha256:<digest-from-latest-build>
# Expect: 'Verified OK' with rekor entry

# 3. Trivy SARIF must appear in the Security tab
gh api repos/smashingtags/homelabarr-ce/code-scanning/alerts?tool_name=trivy-image-backend | jq 'length'
# Expect: integer >= 0 (a number, not an HTTP error)

# 4. Intentional regression test:
#    a) add a known-vulnerable dep like 'minimist@0.0.8' to package.json
#    b) push branch
#    c) expect: CI fails on 'npm audit (HIGH+)' step AND on OSV SARIF
```

### H-R5-2 — `package.json` has no `engines`, no `packageManager`, and no `.nvmrc`

**Where:** repo root.

**What:** Three closely-related drift surfaces:

1. **No `engines.node` floor.** Dockerfile.backend is on `node:24-alpine3.23`, but a developer running `npm install` on Node 18 LTS would not be warned — and several deps (`better-sqlite3@12`, `@vitejs/plugin-react@4`) silently fail or compile against the wrong ABI.
2. **No `packageManager` field.** Corepack will not pin npm to a known version, so a developer with npm 6 vs. npm 10 will resolve different transitives despite the lockfile (different bug-class but real — npm 6 ignores some `overrides` semantics introduced in npm 8.3).
3. **No `.nvmrc`.** CI can't `actions/setup-node@…` with `node-version-file` because the file isn't there. Today the workflow likely hardcodes a version; that drifts from the Dockerfile.

**WRONG**
```json
{
  "name": "homelabarr",
  "version": "2.2.0",
  "type": "module",
  "scripts": { ... },
  "dependencies": { ... },
  "devDependencies": { ... }
}
```

**RIGHT — `package.json`**
```json
{
  "name": "homelabarr",
  "version": "2.2.0",
  "type": "module",
  "engines": {
    "node": ">=24.0.0 <25.0.0",
    "npm": ">=10.0.0"
  },
  "packageManager": "npm@10.9.0+sha256.<paste-from-npm-info-on-the-pinned-version>",
  "scripts": { ... }
}
```

**RIGHT — `.nvmrc` (new file at repo root)**
```
24.16.0
```

(That value mirrors what `/api/health` reports as the live `nodeVersion` — `v24.16.0`. Keep this file in lockstep with `Dockerfile.backend`'s `FROM node:<x>` whenever it bumps.)

**Verification:**

```sh
# 1. engines must be honored by CI
node -e "process.exit(require('semver').satisfies(process.versions.node, require('./package.json').engines.node) ? 0 : 1)"
# Expect: rc=0

# 2. packageManager must be honored by corepack
corepack prepare --activate
npm -v
# Expect: matches the version pinned in package.json
```

---

### H-R5-3 — Compose still on `:latest` for the HomelabARR-published images (R4.5-drift-2 promoted)

**Where:** `homelabarr.yml` lines `image: ghcr.io/smashingtags/homelabarr-frontend:latest` and `image: ghcr.io/smashingtags/homelabarr-backend:latest`.

**What:** R4 added cosign and Trivy gates to the supply chain (per C-R5-1), but until the **consumer-side compose file** pins by digest, the trust anchor is meaningless — every `docker compose pull` resolves `:latest` to whatever digest is current, including a digest published five minutes after an attacker steals an OIDC token. Round 5 is when the digest pin lands, because Round 5 is when the signature exists to verify it against.

**WRONG**
```yaml
frontend:
  image: ghcr.io/smashingtags/homelabarr-frontend:latest
backend:
  image: ghcr.io/smashingtags/homelabarr-backend:latest
```

**RIGHT — pin by tag AND digest (tag for humans, digest for trust)**
```yaml
frontend:
  # docker buildx imagetools inspect ghcr.io/smashingtags/homelabarr-frontend:v2.2.0 --format '{{json .Manifest.Digest}}'
  image: ghcr.io/smashingtags/homelabarr-frontend:v2.2.0@sha256:<64hex>
backend:
  image: ghcr.io/smashingtags/homelabarr-backend:v2.2.0@sha256:<64hex>
```

And ship a release-time bumper script `scripts/bump-image-digests.sh`:

```sh
#!/usr/bin/env bash
set -eu
TAG="${1:?usage: $0 <tag e.g. v2.2.0>}"
for img in homelabarr-frontend homelabarr-backend; do
  digest=$(docker buildx imagetools inspect "ghcr.io/smashingtags/$img:$TAG" --format '{{.Manifest.Digest}}')
  # in-place rewrite of homelabarr.yml
  sed -i.bak -E \
    "s|ghcr.io/smashingtags/$img:[^@\"'[:space:]]+(@sha256:[a-f0-9]+)?|ghcr.io/smashingtags/$img:$TAG@$digest|g" \
    homelabarr.yml
done
rm -f homelabarr.yml.bak
echo "Pinned to $TAG with current digests."
echo "Now verify and commit:"
echo "  cosign verify --certificate-identity-regexp '^https://github.com/smashingtags/homelabarr-ce/' \\"
echo "    --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \\"
echo "    ghcr.io/smashingtags/homelabarr-backend:$TAG"
```

Mark this script executable and reference it in `SECURITY.md` as the release-time ritual.

**Verification:**

```sh
grep -E 'ghcr.io/smashingtags/homelabarr-(frontend|backend):[^@]+@sha256:' homelabarr.yml | wc -l
# Expect: >= 2

# No bare :latest anywhere
grep -E 'image:.*homelabarr-(frontend|backend):latest($|[[:space:]])' homelabarr.yml | wc -l
# Expect: 0
```

---

### H-R5-4 — Third-party GitHub Actions pinned by mutable tags (`@v5`, `@v4`)

**Where:** `.github/workflows/*.yml`.

**What:** Same class as M-R4-11, restated here with concrete data: I counted **7 `uses:` entries** in `docker-build-push.yml` and **12** in `security-audit.yml`, all on `@vN` mutable tags. A compromised maintainer of any one of these actions (the `tj-actions/changed-files` incident in March 2025 is the canonical example) can exfiltrate the `GITHUB_TOKEN`, the GHCR PAT, and the OIDC ID-token used by cosign — owning the entire supply chain.

**WRONG (sample)**
```yaml
- uses: actions/checkout@v4
- uses: docker/setup-buildx-action@v3
- uses: docker/build-push-action@v5
- uses: docker/login-action@v3
- uses: aquasecurity/trivy-action@master
- uses: github/codeql-action/upload-sarif@v3
- uses: semgrep/semgrep@v1
```

**RIGHT — pin every third-party action by 40-char SHA, with the human-readable version in a trailing comment**
```yaml
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11           # v4.1.1
- uses: docker/setup-buildx-action@d70bba72b1f3fd22344832f00baa16ece964efeb # v3.3.0
- uses: docker/build-push-action@v15  # placeholder — replace with current SHA pin
- uses: docker/login-action@v3        # placeholder — replace with current SHA pin
- uses: aquasecurity/trivy-action@v0  # placeholder — NEVER pin to @master; use SHA
- uses: github/codeql-action/upload-sarif@v3  # placeholder — replace with SHA
- uses: semgrep/semgrep@v1            # placeholder — replace with SHA
```

(Placeholders above — the agent should run `gh api repos/<owner>/<repo>/commits/<tag>` for each action's latest tag to capture the 40-char SHA at pin time. Dependabot's `github-actions` ecosystem will then bump SHAs with a code-review PR.)

Add to `.github/dependabot.yml` (extend existing block):
```yaml
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      actions:
        patterns: ["*"]
    labels: ["dependencies", "security/actions"]
```

**Verification:**
```sh
# Every uses: line must reference a 40-char SHA, not a tag
grep -RhE 'uses:' .github/workflows | \
  grep -vE 'uses: \./|uses: actions/[^@]+@[0-9a-f]{40}|uses: [^@]+@[0-9a-f]{40}' | \
  grep -v '^\s*#'
# Expect: NO output (every external action is SHA-pinned)
```

---

### H-R5-5 — No secrets scanning in CI (gitleaks/trufflehog)

**Where:** `.github/workflows/security-audit.yml` — neither gitleaks nor trufflehog is invoked.

**What:** GitHub's built-in secret scanning catches **known provider patterns** (AWS, Stripe, etc.) but misses (a) generic high-entropy strings, (b) custom token prefixes, (c) historical commits if push-protection is bypassed once. A `JWT_SECRET` or a `DEFAULT_ADMIN_PASSWORD` accidentally committed in a `.env` file would pass the current CI cleanly.

**WRONG (current)** — no secrets-scanning step in the workflow.

**RIGHT — add a job to `.github/workflows/security-audit.yml`**
```yaml
  secrets-scan:
    name: Secrets scan (gitleaks)
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11   # v4.1.1
        with:
          fetch-depth: 0          # full history so we scan everything, not just HEAD
          persist-credentials: false

      - uses: gitleaks/gitleaks-action@v2     # pin by SHA at apply time
        env:
          GITLEAKS_ENABLE_UPLOAD_ARTIFACT: "true"
          GITLEAKS_ENABLE_SUMMARY: "true"
          GITLEAKS_VERSION: "8.18.4"          # pin
        with:
          config-path: .gitleaks.toml
```

And `.gitleaks.toml` (new file at repo root):
```toml
title = "homelabarr-ce gitleaks config"

[extend]
useDefault = true

[[rules]]
id = "homelabarr-jwt-secret"
description = "Possible JWT signing secret committed to repo"
regex = '''(?i)(jwt[_-]?secret|access[_-]?token[_-]?ttl)\s*[:=]\s*['"]?[A-Za-z0-9+/=._-]{20,}'''
keywords = ["jwt_secret", "JWT_SECRET"]

[[rules]]
id = "homelabarr-admin-password"
description = "Default admin password committed in env files"
regex = '''(?i)default[_-]?admin[_-]?password\s*[:=]\s*['"]?(?!\$\{)\S{4,}'''
keywords = ["default_admin_password", "DEFAULT_ADMIN_PASSWORD"]

[allowlist]
description = "Examples and placeholders allowed"
regexes = [
  '''CHANGE-THIS-TO-A-SECURE-SECRET''',
  '''must be set on first boot''',
  '''openssl rand''',
]
paths = [
  '''(?i)\.env\.example$''',
  '''(?i)SECURITY\.md$''',
  '''(?i)README\.md$''',
]
```

**Verification:**
```sh
# Inject a fake secret and confirm CI rejects it
cat >>.env.test <<'EOF'
JWT_SECRET=k4j2h3kj4h2k3j4h2k3jh4k2j3h4k2j3h4k2j3h4
EOF
git add .env.test && git commit -m 'TEST: should be caught'
# Push the branch → gitleaks job must fail
```

### M-R5-6 — OSV-Scanner missing even though Trivy is present (covered inside C-R5-1; standalone reference here)

**Why standalone:** Trivy is a great image scanner; OSV-Scanner is a great **lockfile** scanner. They overlap ~70%; the missing 30% is exactly the long-tail of npm-only advisories. Keep both, run them on different schedules so a CVE published at 03:00 UTC against an indirect dep is caught at the next CI run, not at the next image rebuild.

(See C-R5-1 for the YAML; this entry exists so the §3 finding list maps 1-1 to the squash-commit body.)

---

### M-R5-7 — Docker Scout / CycloneDX SBOM for npm not emitted

**Where:** `.github/workflows/docker-build-push.yml` and `.github/workflows/security-audit.yml`.

**What:** BuildKit's `sbom: true` attestation gives a container-level SBOM (apk packages, Node binary), but **not** a per-application-dep CycloneDX SBOM tied to `package-lock.json`. Downstream consumers who want to ingest into Dependency-Track or Anchore need that file. Docker Scout adds a curated CVE feed on top of Trivy.

**RIGHT — add to `.github/workflows/security-audit.yml` (separate job)**
```yaml
  sbom:
    name: Emit CycloneDX SBOM for npm
    runs-on: ubuntu-latest
    permissions:
      contents: read
      actions: read
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11    # v4.1.1
      - uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci --no-audit --no-fund
      - run: npx --yes @cyclonedx/cyclonedx-npm@^1.19.0 --output-format JSON --output-file sbom-npm.cdx.json
      - uses: actions/upload-artifact@<pin-by-sha>
        with:
          name: sbom-npm-cyclonedx
          path: sbom-npm.cdx.json
          retention-days: 90
```

And — optionally — Docker Scout CVE feed in `.github/workflows/docker-build-push.yml` after the build-push step:
```yaml
      - name: Docker Scout — CVEs
        uses: docker/scout-action@<pin-by-sha>
        with:
          command: cves
          image: ghcr.io/${{ github.repository_owner }}/homelabarr-backend@${{ steps.build.outputs.digest }}
          sarif-file: scout-cves.sarif
          summary: true
      - uses: github/codeql-action/upload-sarif@<pin-by-sha>
        if: always()
        with:
          sarif_file: scout-cves.sarif
          category: scout
```

---

### M-R5-8 — No OpenSSF Scorecard baseline workflow

**Where:** `.github/workflows/` — no `scorecard.yml`.

**What:** OpenSSF Scorecard rates a repo's security posture across 18 checks (Branch-Protection, Code-Review, Dangerous-Workflow, Pinned-Dependencies, Token-Permissions, Signed-Releases, SAST, Vulnerabilities, etc.). Running it weekly with results uploaded to the Security tab provides a single number that rolls up the health of everything R1-R5 just shipped. Required for any project that wants the OpenSSF Best Practices badge.

**RIGHT — `.github/workflows/scorecard.yml` (new file)**
```yaml
name: OpenSSF Scorecard
on:
  branch_protection_rule:
  schedule:
    - cron: '17 4 * * 1'   # weekly Monday 04:17 UTC
  push:
    branches: [ "main" ]

permissions: read-all

jobs:
  analysis:
    name: Scorecard analysis
    runs-on: ubuntu-latest
    permissions:
      security-events: write   # upload SARIF
      id-token: write          # OIDC publish
      contents: read
      actions: read

    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11   # v4.1.1
        with:
          persist-credentials: false

      - uses: ossf/scorecard-action@dc50aa9510b46c811795eb24b2f1ba02a914e534   # v2.3.3 — pin by SHA
        with:
          results_file: scorecard.sarif
          results_format: sarif
          publish_results: true

      - uses: github/codeql-action/upload-sarif@<pin-by-sha>
        with:
          sarif_file: scorecard.sarif
          category: scorecard
```

After it lands, add the badge to `README.md`:
```md
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/smashingtags/homelabarr-ce/badge)](https://securityscorecards.dev/viewer/?uri=github.com/smashingtags/homelabarr-ce)
```

**Verification:**
```sh
gh workflow view scorecard.yml
curl -fsS 'https://api.securityscorecards.dev/projects/github.com/smashingtags/homelabarr-ce' | jq '.score'
# Expect: a numeric score in [0, 10]; aim for >=7 after R1-R5
```

---

### M-R5-9 — Workflow `permissions:` set at workflow level, not job level

**Where:** `.github/workflows/docker-build-push.yml`.

**What:** Every job inherits the workflow's permission set. `id-token: write` is needed only for the cosign signing job, not for, say, a lint job that runs in the same workflow. Least privilege says scope it to the one job that needs it.

**WRONG (current shape)**
```yaml
name: build-push
on: ...
permissions:
  contents: read
  packages: write
  id-token: write
  attestations: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps: [ ... ]
```

**RIGHT**
```yaml
name: build-push
on: ...
permissions:
  contents: read   # default for all jobs
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write       # GHCR push
      id-token: write       # OIDC for cosign keyless
      attestations: write   # SLSA provenance
    steps: [ ... ]
```

---

### M-R5-10 — `.nvmrc` missing; `actions/setup-node` cannot use `node-version-file`

**Where:** repo root.

**What:** Covered as part of H-R5-2 but worth a separate finding because it's a 1-line fix that unlocks several other workflows to drop hardcoded Node versions and consume `.nvmrc` instead. Lower the drift surface by exactly one constant.

**RIGHT** — `.nvmrc` already shown in H-R5-2. Update every workflow's `actions/setup-node` block:
```yaml
- uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8   # v4.0.2
  with:
    node-version-file: '.nvmrc'
    cache: 'npm'
```

Remove any hardcoded `node-version: 20` / `node-version: 24` lines.

### L-R5-11 — No license audit; copyleft/AGPL/SSPL drift can land via Dependabot

**Where:** `.github/workflows/security-audit.yml` — no `license-checker` step.

**What:** A weekly Dependabot bump could pull in an AGPL-licensed transitive (legitimate but operationally significant for a self-hostable tool) without anyone noticing. A license-audit step in CI catches it before merge.

**RIGHT — add to `.github/workflows/security-audit.yml`**
```yaml
  license-audit:
    name: License audit
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11    # v4.1.1
      - uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci --no-audit --no-fund
      - name: License whitelist check
        run: |
          npx --yes license-checker-rseidelsohn@^4.4.2 \
            --production \
            --onlyAllow 'MIT;ISC;Apache-2.0;BSD-2-Clause;BSD-3-Clause;CC0-1.0;Unlicense;0BSD;Python-2.0;BlueOak-1.0.0' \
            --excludePackages 'homelabarr@2.2.0' \
            --summary
```

If a legitimate but unusual license (e.g., `MPL-2.0`) needs to land, extend `--onlyAllow` deliberately with a PR comment justifying it. Document the policy in `SECURITY.md`.

---

### L-R5-12 — `bcryptjs` instead of native `bcrypt` — performance not security

**Where:** `package.json` — `"bcryptjs": "^3.0.2"`.

**What:** `bcryptjs` is pure-JS and ~10× slower than `bcrypt` for the same cost factor. R3 set work factor to 12 (good); under load, login latency becomes user-visible (~500-700ms per check on a typical container CPU budget). Worse: if work factor is dropped to compensate, the security baseline drops. This is a Low for now because it's a perf concern that hasn't actually manifested as a security regression, but document the tradeoff and revisit in R6 when load testing happens.

**Either:** Switch to `bcrypt` (native) — requires `build-base python3` in the Dockerfile.backend builder stage:
```json
"dependencies": { "bcrypt": "^5.1.1" }
```
```dockerfile
# In Dockerfile.backend builder stage:
RUN apk add --no-cache --virtual .build python3 make g++ \
 && npm ci --omit=dev \
 && apk del .build
```

**Or:** Document that `bcryptjs` is an explicit portability choice in `SECURITY.md` and pin the work factor at 12 (current) with a note that bumping requires re-benchmarking.

---

### L-R5-13 — No `SECURITY.md` recipe for `cosign verify` / SBOM consumption (R4 L-R4-14 carry-forward)

**Where:** `SECURITY.md` (7058 bytes on the R4 branch — content not yet inspected for this round, but the cosign recipe was not in the R4 diff).

**What:** Roll the R4 L-R4-14 recipe forward into this round — now that C-R5-1 actually emits a cosign signature and the digest pin in H-R5-3 references it, the recipe in `SECURITY.md` becomes a real consumer guarantee instead of a forward-looking promise.

**RIGHT** — append to `SECURITY.md` (or replace the section if a placeholder already exists):
```md
## Verifying release artifacts

All HomelabARR-CE container images published to GHCR are:
- Built reproducibly by the GitHub Actions workflow in `.github/workflows/docker-build-push.yml`.
- Signed via Sigstore (cosign keyless, OIDC issuer `token.actions.githubusercontent.com`).
- Accompanied by SLSA build provenance and a BuildKit-attested SBOM.
- Scanned with Trivy on the pushed digest; CRITICAL/HIGH findings block release.

To verify before pulling:

    cosign verify \\
      --certificate-identity-regexp '^https://github.com/smashingtags/homelabarr-ce/' \\
      --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \\
      ghcr.io/smashingtags/homelabarr-backend:<tag>

To extract the SBOM:

    docker buildx imagetools inspect \\
      ghcr.io/smashingtags/homelabarr-backend:<tag> --format '{{ json .SBOM.SPDX }}' \\
      > backend.spdx.json
```

---

## §4 — Verification

Run after R5 ships.

### 4.1 — Dependency CVE gate fires on intentional regression

```sh
git checkout -b test/intentional-cve
npm pkg set dependencies.minimist=0.0.8           # known prototype-pollution CVE
git add package.json package-lock.json && npm install
git commit -am 'TEST: intentional CVE'
git push origin test/intentional-cve
# Expect: dependency-cves job fails on both 'npm audit' and OSV-Scanner steps
# Cleanup:
git checkout - && git branch -D test/intentional-cve
```

### 4.2 — Published image is cosign-verifiable

```sh
LATEST=$(gh api repos/smashingtags/homelabarr-ce/packages/container/homelabarr-backend/versions \
         --jq '.[0].metadata.container.tags[0]')
cosign verify \
  --certificate-identity-regexp '^https://github.com/smashingtags/homelabarr-ce/' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  ghcr.io/smashingtags/homelabarr-backend:$LATEST
# Expect: 'Verified OK' + rekor entry
```

### 4.3 — Image digest pin honored in `homelabarr.yml`

```sh
grep -cE 'ghcr.io/smashingtags/homelabarr-(frontend|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml
# Expect: 2

grep -cE 'image:.*homelabarr-(frontend|backend):latest($|[[:space:]])' homelabarr.yml
# Expect: 0
```

### 4.4 — Every `uses:` is SHA-pinned

```sh
grep -RhE '^\s*-\s*uses:' .github/workflows | \
  grep -vE 'uses:\s*\./|uses:\s*[^@]+@[0-9a-f]{40}' | \
  grep -vE '^\s*#'
# Expect: no output
```

### 4.5 — Secrets scanning catches a planted fake

```sh
git checkout -b test/planted-secret
echo 'JWT_SECRET=k4j2h3kj4h2k3j4h2k3jh4k2j3h4k2j3h4k2j3h4' >> .env.test
git add .env.test && git commit -m 'TEST: planted'
git push origin test/planted-secret
# Expect: secrets-scan job fails
# Cleanup
git checkout - && git branch -D test/planted-secret
```

### 4.6 — `engines` and `packageManager` enforced

```sh
node -e "const s=require('semver');const p=require('./package.json');process.exit(s.satisfies(process.versions.node,p.engines.node)?0:1)"
# Expect: rc=0

corepack prepare --activate && npm -v
# Expect: matches package.json packageManager pin
```

### 4.7 — Scorecard published and scoring

```sh
curl -fsS 'https://api.securityscorecards.dev/projects/github.com/smashingtags/homelabarr-ce' | jq '{score, checks:[.checks[]|{name,score}]}'
# Expect: numeric overall score, per-check breakdown; aim >= 7
```

### 4.8 — R4.5 drifts (must be cleaned up alongside R5)

```sh
grep -E 'DEFAULT_ADMIN_PASSWORD=\$\{DEFAULT_ADMIN_PASSWORD:\?' homelabarr.yml
# Expect: 1 match

# /api/health no longer DEGRADED if everything else works (R4-cosmetic-1):
curl -fsS https://ce-demo.homelabarr.com/api/health | jq '.status, .environment.validation.warnings'
# Expect: "OK" (or HEALTHY) and an empty warnings array — no more "Docker socket not found"
```

---

## §5 — Out of Scope (Queued for Later Rounds)

| Round | Dimension |
|---|---|
| **R6** | Structured logging (pino/winston JSON), abuse-detection signals (failed-login + 4xx-burst rate limiting persisted across restarts), alerting hooks (webhook on >N 4xx/5xx in window), audit-log persistence + tamper-evidence (hash-chained JSONL or SQLite append-only) |
| **R7** | Secrets management — Docker secrets / SOPS / Vault for at-rest `JWT_SECRET` and `DEFAULT_ADMIN_PASSWORD`, rotation runbook, encryption-at-rest for the SQLite users DB (`better-sqlite3` + SQLCipher binding or LUKS on the volume) |
| **R8** | Production deployment runbook — Traefik mTLS to backend over the internal network, fail2ban for SSH, host-level UFW/nftables, SELinux/AppArmor profiles narrowed to HomelabARR paths, backup + recovery drill, disaster-recovery playbook |
| **R9** | Application-layer DAST — automated OWASP ZAP baseline run against ce-demo.homelabarr.com on every merge to main, custom rules for the HomelabARR API surface, scheduled deep scans |
| **R2.6** (optional) | Trusted Types report-only → enforce rollout (deferred since R2's verification matrix) |

---

## §6 — Owner Pile (Human-Only / Do-Not-Delegate)

1. **Configure branch protection on `main`** so the new CI jobs in C-R5-1 are required: `dependency-cves`, `secrets-scan`, `sbom`, `license-audit`, `scorecard` analysis. Without branch protection, a maintainer can still merge a red CI with admin override.

2. **Enable GitHub's "Require signed commits" on `main`** if you're not already. Pairs naturally with the cosign signing flow — humans sign commits, CI signs images.

3. **Decide policy on auto-merge for Dependabot.** Recommended:
   - **Auto-merge:** patch bumps for devDependencies after CI green.
   - **Manual review:** every dependency bump (any range) and any change touching `server/auth.js`, `server/index.js`, or `homelabarr.yml`.
   - **Block:** major bumps anywhere — those get human-driven upgrade tickets.

4. **Tag a release (v2.2.0 or v2.3.0)** so the digest pin recipe in H-R5-3 has a concrete target. Without a tag, "pin to digest" floats with every push.

5. **Run the `bump-image-digests.sh` script as part of the release ritual** and commit the resulting `homelabarr.yml` diff alongside the tag. Document in `CONTRIBUTING.md`.

6. **Generate and store the production `JWT_SECRET` and `DEFAULT_ADMIN_PASSWORD`** out-of-band (1Password / Bitwarden / pass) — same instruction as R4 §6 item 1, restated because R5's fail-loud guards make this unmissable for any new deployer.

7. **Set up an OpenSSF Scorecard public badge in README** once the workflow has completed at least one run — gates: `Score >= 6.0`.

8. **Review the license-audit allowlist** (L-R5-11) and confirm acceptable licenses for HomelabARR-CE's distribution model (you may want to add `MPL-2.0` if you're OK with weak copyleft, or remove `Python-2.0` if you don't ship anything that needs it).

9. **Subscribe to GitHub Advanced Security alerts** for the repo (Security tab → Code scanning / Secret scanning / Dependabot alerts) — the SARIF uploads from R5 land here, but they only notify if you've enabled email on the repo.

---

## §7 — Deliverable

**PR title:**
`security(r5): transitive CVE gates, cosign signing, image-digest pinning, SHA-pinned actions, secrets/license/SBOM/scorecard`

**Squash-commit body:**
```
Round 5 of the security audit hardens the supply chain feeding the
already-hardened runtime. Findings: 1 Critical / 4 High / 5 Medium / 3 Low.

C-R5-1   Add dependency-cves CI job: npm audit --audit-level=high +
         google/osv-scanner with SARIF upload to GitHub Security tab,
         fails on HIGH/CRITICAL. Add cosign keyless signing of pushed
         frontend+backend digests in docker-build-push.yml. Add Trivy
         scan of pushed digest with SARIF upload and exit-code:1 on
         CRITICAL/HIGH. Add empty package.json overrides block as the
         landing pad for future transitive pins.

H-R5-2   Add engines.node and packageManager to package.json;
         add .nvmrc=24.16.0 mirroring Dockerfile.backend FROM.

H-R5-3   Pin both HomelabARR-published images in homelabarr.yml by
         tag@sha256:digest. Add scripts/bump-image-digests.sh to
         re-pin at release time. (R4.5-drift-2 promoted to High.)

H-R5-4   SHA-pin every third-party GitHub Action in
         .github/workflows/*.yml (40-char SHA + tag comment). Extend
         dependabot.yml with actions grouping + labels.

H-R5-5   Add secrets-scan CI job: gitleaks with project .gitleaks.toml
         configuring custom rules for jwt_secret / default_admin_password
         and allowlisting docs/example files.

M-R5-6   (covered by C-R5-1 OSV-Scanner step; separate finding for
         squash-commit traceability)

M-R5-7   Emit a CycloneDX SBOM for npm via @cyclonedx/cyclonedx-npm,
         upload as workflow artifact (90-day retention). Add Docker
         Scout CVE step on pushed digest with SARIF upload.

M-R5-8   Add OpenSSF Scorecard workflow (weekly + on push to main),
         SARIF upload + public badge in README.

M-R5-9   Scope permissions: at job level (least privilege), not
         workflow level, in docker-build-push.yml.

M-R5-10  Wire actions/setup-node to node-version-file: '.nvmrc' in
         every workflow that uses Node.

L-R5-11  Add license-audit CI job with explicit allowlist; document
         policy in SECURITY.md.

L-R5-12  Document the bcryptjs vs bcrypt trade-off in SECURITY.md;
         defer migration to native bcrypt to R6 load-testing window.

L-R5-13  Document cosign verify + SBOM extraction recipe in SECURITY.md
         now that the signature actually exists.

R4.5 drifts cleaned up in same PR:
  R4.5-drift-1  DEFAULT_ADMIN_PASSWORD=${VAR:?...} fail-loud in homelabarr.yml.
  R4.5-drift-2  See H-R5-3 (image digest pinning).
  R4-cosmetic-1 /api/health probes DOCKER_HOST=tcp://socket-proxy:2375/_ping
                instead of the legacy unix socket path.

Verification matrix in audit §4 is the acceptance criteria.
```

---

## §8 — End / Loop Continuation

When R5 ships, I will re-verify:
- New CI jobs (`dependency-cves`, `secrets-scan`, `sbom`, `license-audit`, `scorecard`) appear in workflow runs on the R5 branch.
- `cosign verify` succeeds against the latest published backend digest.
- `homelabarr.yml` shows 2 `tag@sha256:digest` pins, zero `:latest` for HomelabARR-published images.
- Every `uses:` line in `.github/workflows/*.yml` is SHA-pinned.
- `/api/health` no longer reports DEGRADED with the legacy-socket warning.
- Intentional regression tests in §4.1 and §4.5 fail CI as expected.

If everything is green, the next deliverable is **Round 6: structured logging + abuse detection + audit-log tamper-evidence**. Drafted without asking.

If drift: **Round 5.5 correction MD** first.
