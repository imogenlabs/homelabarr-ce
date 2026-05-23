# Round 16 — Continuous-evidence binder rebuild

**Target:** `smashingtags/homelabarr-ce` @ main `a1e2c7de8f` (== dev, R15 merged 2026-05-23T02:35:52Z)
**Live:** https://ce-demo.homelabarr.com/
**Date:** 2026-05-23
**Scope:** Compliance binders (R11 CIS / NIST / ASVS), evidence collector (R11.5), chaos evidence (R12), IR runbook (R14), and dependency policy (R15) are now all hand-maintained markdown. R16's job is to produce a single repeatable command that **rebuilds the full compliance binder from live system state**, producing a dated, attested artifact (zip + index.html + SHA-256 manifest) ready for auditor handoff — with **zero hand-editing**.
**Method:** Spec-only. No live exploitation. Pure tooling/automation round on top of existing R5/R11/R11.5 machinery.

---

## §0 — Verification of R15 (carry-forward)

| # | R15 spec item | Live state (main @ a1e2c7de8f) | Verdict |
|---|---|---|---|
| 1 | `docs/governance/dependency-update-policy.md` with 7 required sections | All 7 sections present. | CLEAN |
| 2 | `.github/dependabot.yml` has `open-pull-requests-limit`, `labels`, `reviewers`, `allow`, `commit-message` for all 3 ecosystems (npm, github-actions, docker) | All 5 stanzas present 3× (once per ecosystem). | CLEAN |
| 3 | `.github/workflows/dependency-staleness.yml` exists, SHA-pinned, cron daily | Present. All `uses:` lines SHA-pinned (40-char). Cron stanza present. | CLEAN |
| 4 | `.github/workflows/dependency-review.yml` with `fail-on-severity` + `deny-licenses` | Both present. | CLEAN |
| 5 | `.github/workflows/docker-build-push.yml` extended with post-push cosign verify + PR comment on fail | Cosign verify step present; PR comment on failure present. | CLEAN |
| 6 | `docs/ir/playbooks/PB-11-security-update-past-sla.md` with all 9 R14 sections | All 9 sections present. | CLEAN |
| 7 | Audit index has R15 row | Present. | CLEAN |
| 8 | R15 archive in `docs/audit/` | Present. | CLEAN |
| 9 | Cross-links from CIS / NIST CSF / OWASP ASVS to dependency-update-policy | **NIST and ASVS link. CIS does not.** | DRIFT — carry to R16 L-1 |
| 10 | Staleness workflow runs cleanly on first fire | Not yet fired (cron is daily 13:00 UTC; current is ~02:35 UTC). 13 dependabot PRs queued for the first SLA pass. | DEFERRED (will verify after first run) |

**R15 ship verdict:** 8 of 9 static checks clean, 1 drift (CIS binder missing the cross-link that NIST and ASVS got), 1 deferred (first cron fire). Fold into R16 §3 L-1 and L-2.

---

## §1 — Goal of R16

Every compliance artifact in the repo should be **rebuilt from current state, not edited by hand**. Today, if an auditor asks "what's your current cosign verify status / audit-chain integrity / SLO posture / open security-critical dependency PRs," the answer requires:

1. running `compliance/collect-evidence.sh` (gives raw evidence files)
2. cross-referencing those files against `compliance/cis-controls-v8.1.md`, `compliance/nist-csf-2.0.md`, `compliance/owasp-asvs-v4.0.3-L2.md` by hand
3. zipping the result and emailing it

R16 collapses that into one command:

```bash
make compliance-binder      # or: bash compliance/build-binder.sh
```

Output: `compliance/dist/binder-<YYYY-MM-DD>-<sha>.zip` containing
- `index.html` — single-page navigable view of all controls + live status
- `evidence/` — output of `collect-evidence.sh`
- `binders/` — the 3 framework binder MDs as committed
- `manifest.sha256` — SHA-256 of every file in the zip
- `attestation.json` — cosign-signed (or sigstore-bundle) attestation that this binder was produced by the workflow run

---

## §2 — Current state

- Compliance binders exist as MDs (R11/R11.5).
- Evidence collector exists (R11.5 / R12).
- No binder builder script.
- No `compliance/dist/` output directory.
- No single artifact to hand an auditor.
- No attestation that "this binder reflects the system at SHA X on date Y."
- R8 restore-drill log section exists but is hand-edited.
- R12 SLO data is hand-narrated in `docs/audit/R12-slo.md`, not computed.
- R15 staleness workflow output is not aggregated into binder evidence.
---

## §3 — Findings

### L-1 (R15-carry) — CIS binder missing cross-link to dependency-update-policy

**File:** `compliance/cis-controls-v8.1.md`

**Current (WRONG):** NIST CSF and OWASP ASVS binders both include a link to `docs/governance/dependency-update-policy.md` from their dependency-management control rows. CIS does not.

**Required (RIGHT):** in the CIS binder, find the row covering CIS Control 7 (Continuous Vulnerability Management) — specifically 7.4 (perform automated application patch management) and 7.7 (remediate detected software vulnerabilities) — and add the policy link to the Evidence column. Also CIS Control 16 (Application Software Security), specifically 16.4 (establish process to accept and address reports of software vulnerabilities) should link to `docs/ir/playbooks/PB-11-security-update-past-sla.md` and `docs/ir/playbooks/PB-08-disclosed-vuln.md`.

**Acceptance:** `grep -q "dependency-update-policy" compliance/cis-controls-v8.1.md && grep -q "PB-11" compliance/cis-controls-v8.1.md` returns 0.

---

### L-2 (R15-carry) — Verify first staleness workflow run

**File:** none — this is a runtime check.

**Required:** after the next `13:00 UTC` cron fire (or manual `workflow_dispatch`), confirm:
- Workflow ran to completion (status: success)
- Job summary lists current 13 open dependabot PRs with age + classification
- No false positives (PRs created today should not yet be past SLA)
- No silent failures (workflow errored mid-script without comment)

**Acceptance:** record the first run's URL + outcome in the R15 archive (`docs/audit/R15-dependency-supply-chain-freshness.md` — append a "First run log" section) OR in the R16 archive.

---

### H-1 — No binder builder script

**File (new):** `compliance/build-binder.sh`

**Required behavior:**

```bash
#!/bin/bash
# compliance/build-binder.sh
# Builds compliance/dist/binder-<YYYY-MM-DD>-<sha>.zip from current state.
# Inputs: live containers (for collect-evidence.sh), git state (for sha + binder MDs).
# Outputs: zip artifact + side-by-side unzipped copy in compliance/dist/binder-<id>/

set -euo pipefail

DATE=$(date -u +%Y-%m-%d)
SHA=$(git rev-parse --short HEAD)
ID="binder-${DATE}-${SHA}"
OUT="compliance/dist/${ID}"

mkdir -p "${OUT}/evidence" "${OUT}/binders" "${OUT}/governance" "${OUT}/ir" "${OUT}/threat-model" "${OUT}/audit"

# 1. Collect live evidence (R11.5 / R12)
EVIDENCE_OUT="${OUT}/evidence" bash compliance/collect-evidence.sh

# 2. Copy binders (R11) as-committed
cp compliance/cis-controls-v8.1.md "${OUT}/binders/"
cp compliance/nist-csf-2.0.md "${OUT}/binders/"
cp compliance/owasp-asvs-v4.0.3-L2.md "${OUT}/binders/"

# 3. Copy governance (R15)
cp docs/governance/dependency-update-policy.md "${OUT}/governance/"

# 4. Copy IR runbook (R14)
cp -r docs/ir/ "${OUT}/ir/"

# 5. Copy threat model (R13)
cp -r docs/threat-model/ "${OUT}/threat-model/"

# 6. Copy audit round MDs (R1–R15)
cp docs/audit/*.md "${OUT}/audit/"

# 7. Generate index.html (H-2 below)
node compliance/render-binder-index.js "${OUT}" > "${OUT}/index.html"

# 8. SHA-256 manifest
( cd "${OUT}" && find . -type f -not -name manifest.sha256 -print0 | xargs -0 sha256sum > manifest.sha256 )

# 9. Attestation (H-3 below)
node compliance/render-attestation.js "${OUT}" > "${OUT}/attestation.json"

# 10. Zip
( cd compliance/dist && zip -qr "${ID}.zip" "${ID}" )

echo "Binder built: compliance/dist/${ID}.zip"
echo "Index:        compliance/dist/${ID}/index.html"
```

**Acceptance:** running `bash compliance/build-binder.sh` from a clean checkout against a healthy ce-demo stack produces `compliance/dist/binder-YYYY-MM-DD-<sha>.zip` with all sections populated and `manifest.sha256` covering every file.

---

### H-2 — No single-page navigable view of the binder

**File (new):** `compliance/render-binder-index.js`

**Required:** Node script (no external deps beyond what's already in package.json) that takes the binder output directory and emits an HTML index page. Must include:

- Top: build metadata (date, sha, hostname, evidence collector exit code)
- Live status panel:
  - R5 cosign verify: read `evidence/R5-cosign.txt`, render pass/fail badge
  - R6 audit-chain integrity: read `evidence/R6-audit-chain.txt`, render `{ok, bad, total}` from JSON
  - R12 SLO snapshot (placeholder if not yet computed — see M-1 below)
  - R15 open dependency PRs past SLA (from latest staleness workflow artifact — see M-2 below)
- Navigation: links to all binders (CIS/NIST/ASVS), governance, IR, threat-model, audit
- Footer: SHA-256 of the manifest itself + attestation pointer

**Style:** plain HTML + minimal inline CSS, no JS frameworks. Must be readable in any browser including printable/PDF-export with no JS.

**Acceptance:** `open compliance/dist/binder-*/index.html` shows a one-page view with all four live-status panels populated and all binder links resolvable to files within the zip.

---

### H-3 — No attestation that the binder reflects live state

**File (new):** `compliance/render-attestation.js`

**Required:** Node script producing `attestation.json` with fields:

```json
{
  "builder": "compliance/build-binder.sh",
  "build_time_utc": "<ISO-8601>",
  "git_sha": "<full SHA>",
  "git_branch": "<branch>",
  "git_dirty": <bool>,
  "host": {
    "hostname": "<hostname>",
    "kernel": "<uname -r>",
    "docker_version": "<docker version>"
  },
  "stack": {
    "backend_image": "ghcr.io/.../backend@sha256:...",
    "nginx_image": "ghcr.io/.../nginx@sha256:...",
    "cosign_verify_backend": "<pass|fail>",
    "cosign_verify_nginx": "<pass|fail>"
  },
  "evidence_files": [
    {"path":"evidence/R5-cosign.txt","sha256":"...","bytes":N},
    {"path":"evidence/R6-audit-chain.txt","sha256":"...","bytes":N}
  ],
  "manifest_sha256": "<sha of manifest.sha256>"
}
```

If `cosign` is available and the workflow has signing identity (OIDC in CI), the script should additionally produce `attestation.json.sig` via `cosign sign-blob --bundle`. If running locally without signing identity, the file gets a top-level `"signed": false` and the build continues — but the workflow path (H-4) requires signing.

**Acceptance:** `jq .git_sha attestation.json` returns the current short SHA. `jq '.evidence_files[].sha256' attestation.json` returns SHAs that match `sha256sum evidence/*` independently.

---

### H-4 — No workflow to produce the binder on demand or on schedule

**File (new):** `.github/workflows/compliance-binder.yml`

**Required:**

```yaml
name: compliance-binder
on:
  workflow_dispatch:
    inputs:
      reason:
        description: "Why is this binder being built (audit / spot-check / release)?"
        required: true
  schedule:
    - cron: '0 6 1 * *'   # monthly, 1st of month, 06:00 UTC
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write      # for cosign keyless signing of attestation
      actions: read
    steps:
      - uses: actions/checkout@<40-char-SHA>
      - name: Boot ce-demo stack in CI for evidence collection
        run: docker compose -f docker-compose.ci.yml up -d --wait
      - name: Build binder
        run: bash compliance/build-binder.sh
      - uses: sigstore/cosign-installer@<existing SHA pin>
      - name: Sign attestation
        run: |
          BINDER=$(ls compliance/dist/*.zip | head -1)
          cosign sign-blob --bundle "${BINDER}.cosign.bundle" "${BINDER}"
      - uses: actions/upload-artifact@<40-char-SHA>
        with:
          name: compliance-binder-${{ github.sha }}
          path: |
            compliance/dist/*.zip
            compliance/dist/*.cosign.bundle
          retention-days: 90
```

**Acceptance:**
- Workflow file present, all `uses:` SHA-pinned
- Manual `workflow_dispatch` run produces an artifact zip + cosign.bundle, both downloadable from the run
- Monthly cron runs successfully and archives 90-day retention

---

### M-1 — R12 SLO doc is hand-narrated, not computed

**File (extend):** `compliance/collect-evidence.sh`

**Required:** add an R12-SLO section to the evidence collector that computes the current SLI values:

```bash
# --- R12 SLO snapshot ---
{ hdr "R12 SLO snapshot (last 24h)"
  # Health success rate: count nginx access log 200s vs total on /api/health
  if [ -r /var/log/nginx/access.log ]; then
    HEALTH_TOTAL=$(grep -c ' /api/health ' /var/log/nginx/access.log || echo 0)
    HEALTH_200=$(grep ' /api/health ' /var/log/nginx/access.log | grep -c ' 200 ' || echo 0)
    LOGIN_TIMES=$(grep 'POST /api/auth/login' /var/log/nginx/access.log | awk '{print $NF}' | sort -n)
    P95=$(echo "$LOGIN_TIMES" | awk 'BEGIN{c=0} {a[c++]=$1} END{print a[int(c*0.95)]}')
    echo "{\"health_total\":${HEALTH_TOTAL},\"health_200\":${HEALTH_200},\"login_p95_seconds\":\"${P95:-null}\"}"
  else
    echo "{\"error\":\"nginx access log not readable from collector\"}"
  fi
} > "$OUT/R12-slo-snapshot.txt"
```

**Acceptance:** `evidence/R12-slo-snapshot.txt` exists, parses as JSON, contains numeric `health_total`, `health_200`, and `login_p95_seconds` keys.

---

### M-2 — R15 staleness workflow output not aggregated into binder

**File (extend):** `compliance/collect-evidence.sh`

**Required:** add an R15 section that pulls the most recent staleness workflow summary into evidence:

```bash
# --- R15 dependency staleness snapshot ---
{ hdr "R15 dependency staleness snapshot"
  if command -v gh >/dev/null 2>&1; then
    # Latest staleness run's job summary
    RUN_ID=$(gh run list --workflow=dependency-staleness.yml --limit=1 --json databaseId -q '.[0].databaseId' 2>/dev/null || echo "")
    if [ -n "${RUN_ID}" ]; then
      gh run view "${RUN_ID}" --log 2>/dev/null | tail -100 || echo "(could not fetch staleness log)"
    else
      echo "(no staleness runs yet)"
    fi
    # Current open dependency PR count
    gh pr list --label dependencies --state open --json number,title,createdAt 2>/dev/null > /tmp/dep-prs.json || true
    if [ -s /tmp/dep-prs.json ]; then
      jq 'length as $n | {open_dep_prs: $n, prs: .}' /tmp/dep-prs.json
    fi
  else
    echo "(gh not available; skipping)"
  fi
} > "$OUT/R15-dep-staleness.txt"
```

**Acceptance:** `evidence/R15-dep-staleness.txt` exists; contains either staleness log tail + JSON PR list, or a gracefully-handled "not available" message.

---

### M-3 — Makefile entry point

**File (new):** `Makefile` (or extend existing if present)

**Required:**

```makefile
.PHONY: compliance-binder evidence verify

evidence:
	bash compliance/collect-evidence.sh

compliance-binder:
	bash compliance/build-binder.sh

verify:
	jq .bad evidence-out/R6-audit-chain.txt | grep -q '^0$$' || { echo "audit chain broken"; exit 1; }
	grep -q PASS evidence-out/R5-cosign.txt || { echo "cosign verify failed"; exit 1; }
	@echo "verify: OK"
```

**Acceptance:** `make compliance-binder` produces the zip; `make verify` exits 0 on healthy stack, nonzero on bad state.

---

### L-3 — Binder reproducibility test

**File (new):** `compliance/test-binder-reproducibility.sh`

**Required:** simple smoke test that builds the binder twice in succession (without underlying state changing) and confirms the **file list and SHAs other than time-stamped fields** match. Any drift indicates non-determinism in the builder (e.g. iteration order, embedded timestamps in places other than the manifest header).

This protects against silently regressing the "reproducible build" property over time.

**Acceptance:** script exists; manual run shows OK; documented limitations (which fields legitimately vary — `build_time_utc`, the zip's own mtime — are listed and excluded from the diff).

---

### L-4 — Audit index row for R16

**File:** `docs/audit/README.md`

**Required:** add row:

```markdown
| R16 | Continuous-evidence binder rebuild | <count> | shipped |
```

(adjust findings count to match actual final tally)
---

## §4 — Verification commands (agent self-check before declaring ship)

```bash
# 1. CIS binder R15 cross-link (R15 carry)
grep -q "dependency-update-policy" compliance/cis-controls-v8.1.md || echo "FAIL: CIS missing policy link"
grep -q "PB-11" compliance/cis-controls-v8.1.md || echo "FAIL: CIS missing PB-11 link"

# 2. Builder script
test -x compliance/build-binder.sh || echo "FAIL: build-binder.sh not executable"

# 3. Renderers
test -f compliance/render-binder-index.js || echo "FAIL: render-binder-index.js missing"
test -f compliance/render-attestation.js || echo "FAIL: render-attestation.js missing"

# 4. Workflow
test -f .github/workflows/compliance-binder.yml || echo "FAIL: compliance-binder workflow missing"
grep -E '^\s+uses:' .github/workflows/compliance-binder.yml | grep -vE '@[0-9a-f]{40}' \
  && echo "FAIL: workflow has un-pinned actions" || true

# 5. Makefile
test -f Makefile || echo "FAIL: Makefile missing"
grep -q "^compliance-binder:" Makefile || echo "FAIL: Makefile target missing"

# 6. Evidence collector extensions (M-1, M-2)
grep -q "R12-slo-snapshot" compliance/collect-evidence.sh || echo "FAIL: SLO snapshot section missing"
grep -q "R15-dep-staleness" compliance/collect-evidence.sh || echo "FAIL: staleness snapshot section missing"

# 7. End-to-end build
bash compliance/build-binder.sh
ID=$(ls -t compliance/dist/*.zip | head -1)
test -n "${ID}" || echo "FAIL: no zip produced"
unzip -l "${ID}" | grep -q index.html || echo "FAIL: index.html missing in zip"
unzip -l "${ID}" | grep -q manifest.sha256 || echo "FAIL: manifest missing in zip"
unzip -l "${ID}" | grep -q attestation.json || echo "FAIL: attestation missing in zip"

# 8. Attestation has required fields
DIR=$(echo "${ID}" | sed 's/\.zip$//')
jq -e '.git_sha and .build_time_utc and .evidence_files and .stack' "${DIR}/attestation.json" \
  || echo "FAIL: attestation missing required fields"

# 9. Manifest covers every file
( cd "${DIR}" && find . -type f -not -name manifest.sha256 | sort > /tmp/files-found )
( cd "${DIR}" && awk '{print $2}' manifest.sha256 | sort > /tmp/files-manifest )
diff /tmp/files-found /tmp/files-manifest && echo "OK: manifest complete" \
  || echo "FAIL: manifest does not cover all files"

# 10. Index renders without JS (curl + grep for required panels)
grep -E "R5 cosign|R6 audit-chain|R12 SLO|R15" "${DIR}/index.html" \
  || echo "FAIL: index.html missing required status panels"

# 11. Reproducibility smoke test
bash compliance/test-binder-reproducibility.sh || echo "FAIL: builder not reproducible"

# 12. Audit index
grep -q "^| R16" docs/audit/README.md || echo "FAIL: audit index missing R16"

# 13. R16 archive
test -f docs/audit/R16-continuous-evidence-binder-rebuild.md || echo "FAIL: R16 archive missing"

# 14. R15 carry: staleness first run logged (deferred — may not be done at ship time; warn only)
grep -q "First run log" docs/audit/R15-dependency-supply-chain-freshness.md \
  || echo "WARN: R15 first staleness run not yet logged (deferred)"
```

---

## §5 — Out of scope for R16

- Generating PDF from `index.html` (browser print-to-PDF is sufficient; no headless-chrome dependency).
- Storing binder artifacts long-term (90-day GH Actions artifact retention is adequate for ce-demo).
- Auditor portal / shared workspace (zip + email is the handoff mechanism).
- Multi-stack support (single-stack ce-demo).

---

## §6 — Owner pile (human-only decisions)

| # | Decision | Why owner | Recommended |
|---|---|---|---|
| O-1 | Monthly binder cadence (cron `0 6 1 * *`) — accept or change | Operational preference | Accept; first of month at 06:00 UTC is fine |
| O-2 | 90-day artifact retention — accept or extend (longer = GH storage cost) | Cost | 90d is GitHub's default; fine for demo |
| O-3 | Carried: 25 dependabot vulns reported by GitHub. Owner triages under R15 policy. | First application of new SLA needs owner sign-off | Half-day session with agent |
| O-4 | Carried: audit-log off-box destination (R7) | Cost | Pick one |
| O-5 | Carried: chaos gameday + tabletop (R12 + R14) | Calendar | Half-day |
| O-6 | Carried: sign off on `docs/threat-model/07-residual-risk.md` (R13) | Acceptance | 7 days |

**Reminder:** agent has CF + GH access. Workflow creation, artifact retention config, branch protection, GHCR — all agent work.

---

## §7 — Deliverable shape

```
compliance/
  build-binder.sh                        (NEW — main builder)
  render-binder-index.js                 (NEW — index.html generator)
  render-attestation.js                  (NEW — attestation.json generator)
  test-binder-reproducibility.sh         (NEW — smoke test)
  collect-evidence.sh                    (EXTEND — add R12 SLO + R15 staleness sections)
  cis-controls-v8.1.md                   (EXTEND — add policy + PB-11 + PB-08 links, R15 carry)
  dist/                                  (gitignore — output dir)
    .gitkeep

.github/workflows/
  compliance-binder.yml                  (NEW — workflow_dispatch + monthly cron, cosign-signed)

Makefile                                 (NEW — compliance-binder / evidence / verify targets)

.gitignore                               (EXTEND — compliance/dist/*.zip etc.)

docs/audit/
  R16-continuous-evidence-binder-rebuild.md   (this file, archived)
  README.md                              (EXTEND — R16 row)
  R15-dependency-supply-chain-freshness.md    (EXTEND — append "First run log" when staleness fires)
```

**Ship message template:**
```
R16: continuous-evidence binder rebuild

- compliance/build-binder.sh: one command rebuilds full binder from live state
- index.html + attestation.json (cosign-signed in CI) + SHA-256 manifest
- .github/workflows/compliance-binder.yml: workflow_dispatch + monthly cron
- collect-evidence.sh extended with R12 SLO + R15 staleness snapshots
- Makefile entry points (compliance-binder / evidence / verify)
- Reproducibility smoke test
- CIS binder cross-link to dependency policy + PB-11 (R15 carry)

Verification: all 13 self-check commands in R16 §4 pass; first artifact zip
attached to the workflow run.
```

---

## §8 — End of round / loop

If everything in §4 passes: ship and report back. R17 will be the **public-disclosure surface audit** — given we now have SECURITY.md + PB-08 + 90-day disclosure policy + signed binder artifacts, the next gap is: what does the *outside view* of the security posture look like? robots.txt + security.txt (RFC 9116) + meta tags + GitHub security advisories config + npm package metadata + GHCR repo-level visibility settings + Cloudflare WAF rule transparency. Essentially, prove the posture to an unauthenticated outsider before they have to ask.

If anything in §4 fails: report which line, and we open R16.5 as a pink correction.
