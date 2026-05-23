# Round 15 — Dependency & supply-chain freshness governance

**Target:** `smashingtags/homelabarr-ce` @ main `7fd3a395dd` (== dev, R14 merged 2026-05-23T02:18:35Z)
**Live:** https://ce-demo.homelabarr.com/
**Date:** 2026-05-23
**Scope:** R5 built the supply-chain machinery (SBOM, cosign verify, SHA-pinned actions). R11/R11.5 wired it into compliance evidence. R14 added the incident response when cosign fails. What's missing is the **policy layer above the machinery**: who reviews dependency PRs, on what cadence, against what criteria, with what staleness threshold, escalating to whom when ignored. Right now 13 dependabot PRs sit open with zero documented disposition — a finding by itself.
**Method:** Spec-only. **No live exploitation.** Pure governance + automation tightening on top of existing R5/R11 controls.

---

## §0 — Verification of R14 (carry-forward)

| # | R14 spec item | Live state (main @ 7fd3a395dd) | Verdict |
|---|---|---|---|
| 1 | `docs/ir/` with 8 top-level files | All 8 present (README + 00-06). | CLEAN |
| 2 | 10 playbooks under `docs/ir/playbooks/PB-NN-*.md` | All 10 present. | CLEAN |
| 3 | Each playbook has all 9 mandatory sections (Trigger / Severity / First action / Decision point / Containment / Eradication / Recovery / Verification / Post-incident) | Sampled PB-01, PB-03, PB-09 — all 9 sections present in each. | CLEAN |
| 4 | First-60-seconds fits on one screen (≤60 lines) | 28 lines. | CLEAN (well under budget) |
| 5 | Severity classification has P1–P4 + decision tree | P1, P4, and decision-tree pattern all present. | CLEAN |
| 6 | Post-mortem template is blameless + has R-round mapping | Both confirmed. | CLEAN |
| 7 | SECURITY.md has Reporting / Disclosure / IR sections | All three present + IR link. | CLEAN |
| 8 | Alerting integration table has 6+ sensors | 8 table rows. | CLEAN |
| 9 | Tabletop has 3 scenarios | 3 confirmed. | CLEAN |
| 10 | Atomic 09 moved out of `T1595-vuln-scanning/` (R13 carry) | Now at `pentest/atomics/audit-continuity/09-audit-log-continuity.sh` with EXPECTED=100. **R13 carry fully resolved.** | CLEAN |
| 11 | Threat-model README, audit index, root README link to docs/ir/ | All three confirmed. | CLEAN |
| 12 | R14 archive present in `docs/audit/` | Present. | CLEAN |

**R14 ship verdict:** 12 of 12 clean. **Zero carry-forwards** into R15 — first fully-clean round since the R10.5 → R10.7 chain.

---

## §1 — Goal of R15

Move dependency management from "dependabot files PRs, they sit there, sometimes they merge" to "dependency updates are governed by a written policy with measurable SLAs, automated review gates, escalation when ignored, and documented audit trail."

Concrete outcomes:
1. Written dependency-update policy (cadence, owner, SLA per update class).
2. Tightened `dependabot.yml` with security-updates + allow stanzas, semver grouping, ignore rules where justified.
3. Automated review gates so the human doesn't have to read 13 PRs by hand.
4. Staleness alerting that escalates to IR playbook PB-NN when an update has sat unmerged past its SLA.
5. Linkage back to R5 supply chain (cosign), R11 compliance (CIS section 6 — version control), R14 IR.

---

## §2 — Current state

- **13 open dependabot PRs**, all created today (same-day batch). Zero documented disposition policy means there's no way to say "these should be merged by X, those can wait, these are blocked because Y."
- **`.github/dependabot.yml` exists** with groups: and schedule: stanzas — solid foundation.
- **Missing from `dependabot.yml`:** `allow:` (what to update), `open-pull-requests-limit:` (cap), `reviewers:` (auto-assign), `labels:` (auto-tag for SLA tracking), and explicit security-update behavior.
- **No `renovate.json`** — fine, dependabot-only stack is a deliberate choice, but the policy doc should say so.
- **No SLA on PR age.** Today's 13 PRs are 0 days old. Without a policy, "0 days" becomes "60 days" silently.
- **No CI gate** that blocks a merge if cosign verify fails on the post-update image.
- **No notion of "patch vs minor vs major" review depth** — a Hono 4.12.12 → 4.12.22 patch and a hypothetical Hono 4 → 5 major get the same one-line PR description.
- **R14 PB-03 (cosign-verify-fail)** is the IR endpoint when a bad image lands. R15's job is to keep bad images from landing in the first place.
---

## §3 — Findings

### H-1 — No written dependency-update policy

**File (new):** `docs/governance/dependency-update-policy.md`

**Current (WRONG):** dependabot opens PRs, 13 of them sit open right now, no documented expectation of when they're handled.

**Required (RIGHT):**

```markdown
# Dependency update policy

## Scope
Applies to all dependency PRs across these ecosystems (from `.github/dependabot.yml`):
- npm (production + dev)
- docker base images
- github-actions

## Update classes & SLA

| Class | Definition | Review SLA | Merge SLA | Reviewer |
|---|---|---|---|---|
| **Security-critical** | dependabot `security-updates` flag OR CVE referenced in PR body | 24h review, 72h merge | 72h | Agent + owner sign-off |
| **Patch (semver patch)** | x.y.Z bump, same minor | 7 days | 14 days | Agent auto-approve if CI green |
| **Minor (semver minor)** | x.Y.z bump, same major | 14 days | 30 days | Agent review, owner sign-off if cosign-verify changes |
| **Major (semver major)** | X.y.z bump | 30 days | Variable (may require code changes) | Owner explicit approval; agent prepares migration notes |
| **GitHub Actions** | any action version bump | 7 days | 14 days | Agent + SHA-pin verify (per R5) |
| **Docker base image** | base image bump | 7 days | 14 days | Agent + image rescan (per R5) |

## Review checklist (per PR class)

### All PRs
- [ ] CI is green
- [ ] No new direct dependencies (only version bumps)
- [ ] No license change to a non-permissive license (check `licenses` from R5 SBOM)
- [ ] If lockfile changes affect a known-vulnerable package, link the CVE

### Security-critical (in addition)
- [ ] CVSS score documented in PR
- [ ] R6 audit-log writer not affected (manual sanity check)
- [ ] R10 honey routes still emit (atomic 04 passes)
- [ ] Cosign verify passes post-merge on next image build

### Minor / Major (in addition)
- [ ] Changelog/release notes link in PR body
- [ ] Breaking-changes section read; impact noted on each R-round control
- [ ] If touching auth/CSP/audit-log code paths, run full pentest harness

## Escalation

A PR that exceeds its review or merge SLA fires the staleness alert (see H-3 below), which routes to:
- **Security-critical past 72h:** IR playbook PB-11 (new — see L-1)
- **Patch past 14d / Minor past 30d / Major past variable:** owner notification, document deferral reason in PR comment, label `update-deferred-by-owner`

## Coverage exceptions

Packages may be added to `.github/dependabot.yml` `ignore:` only with:
- Written justification in this file under "Ignored packages" below
- Annual re-evaluation date
- Compensating control

### Ignored packages
(none currently — populate as exceptions arise)

## Review cadence
- **Weekly:** agent triages open dependency PRs, applies labels per update class
- **Monthly:** owner reviews PRs labeled `update-deferred-by-owner` and signs off or closes
- **Quarterly:** policy itself reviewed; SLAs adjusted based on data from staleness alerts
```

**Acceptance:** file present, all 4 sections (scope, classes table, checklist, escalation), reviewed-on date stamped at bottom.

---

### H-2 — `.github/dependabot.yml` is missing several governance stanzas

**File:** `.github/dependabot.yml` (currently 624B)

**Current (verified): has `groups:` and `schedule:`. Missing:**
- `allow:` — explicit allow list for what to update (vs implicit "everything")
- `open-pull-requests-limit:` per-ecosystem (currently uncapped → 13 open PRs in one batch)
- `reviewers:` and `assignees:` (auto-route)
- `labels:` (so the staleness alert can query by label)
- `commit-message:` prefix override (so policy compliance is visible in git log)
- Explicit security-updates behavior (separate higher cadence)

**Required (RIGHT) — additions, not replacement of existing groups/schedule:**

```yaml
# .github/dependabot.yml — additions on top of existing config
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"           # security-updates surface faster
    open-pull-requests-limit: 5   # cap inflow; force triage
    labels:
      - "dependencies"
      - "npm"
      - "needs-triage"            # staleness alert queries this
    reviewers:
      - "smashingtags"            # owner gets auto-assigned
    commit-message:
      prefix: "chore(deps)"
      prefix-development: "chore(deps-dev)"
      include: "scope"
    allow:
      - dependency-type: "direct"
      - dependency-type: "indirect"  # explicit; was implicit
    # groups: (preserve existing groups stanza unchanged)
    # ignore: (add packages here with justification per H-1 policy)

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 3
    labels:
      - "dependencies"
      - "github-actions"
      - "needs-triage"
    reviewers:
      - "smashingtags"

  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 2
    labels:
      - "dependencies"
      - "docker"
      - "needs-triage"
    reviewers:
      - "smashingtags"
```

**Acceptance:**
- `yq '.updates[] | .open-pull-requests-limit' .github/dependabot.yml` returns numeric limits for all 3 ecosystems
- `yq '.updates[] | .labels' .github/dependabot.yml` returns label arrays
- `yq '.updates[] | .reviewers' .github/dependabot.yml` returns reviewer arrays
- `yq '.updates[] | .commit-message' .github/dependabot.yml` returns commit-message override

---

### H-3 — No staleness alert for unhandled dependency PRs

**File (new):** `.github/workflows/dependency-staleness.yml`

**Required:** a daily workflow that:
1. Queries open PRs with label `dependencies`
2. For each PR, computes age in days
3. Classifies by branch name (`dependabot/.../security-...` vs others)
4. Compares against SLA from policy (H-1):
   - Security-critical past 72h → opens an issue tagged `incident` referencing PB-11 (L-1 below)
   - Patch past 14d / Minor past 30d → comments on PR @-mentioning the owner
   - Major past 30d → adds label `policy-breach` and notifies owner
5. Posts a summary to GitHub Job Summary

**Skeleton (agent fills in details, must be SHA-pinned per R5):**

```yaml
name: dependency-staleness
on:
  schedule:
    - cron: '0 13 * * *'   # daily at 13:00 UTC
  workflow_dispatch:
jobs:
  staleness:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      issues: write
    steps:
      - uses: actions/github-script@<40-char-SHA>
        with:
          script: |
            // List PRs with label 'dependencies'
            // For each, age = now - created_at
            // Classify and act per SLA from docs/governance/dependency-update-policy.md
            // (agent: paste the actual script here)
```

**Acceptance:**
- File exists, SHA-pinned per R5
- Manual workflow_dispatch run posts a job summary listing all open dependency PRs with their age + classification
- A test PR aged past SLA triggers the documented escalation

---

### M-1 — No CI gate on cosign verify after dependency merge

**Files:**
- `.github/workflows/docker-build-push.yml` (existing — extend)
- `.github/workflows/compliance-evidence.yml` (existing — already does cosign verify per R11.5)

**Current (WRONG):** when a dependency PR merges and the image rebuilds, cosign verify runs nightly via R11.5 evidence collection — but the merge itself is not gated. A bad merge can sit live for up to 24h before cosign detection.

**Required (RIGHT):** add a post-merge step to `docker-build-push.yml` that runs cosign verify on the freshly-pushed image and fails the workflow (and posts a comment to the originating PR) if verify fails.

```yaml
# In docker-build-push.yml, after image push step:
- name: Cosign verify freshly-pushed image
  uses: sigstore/cosign-installer@<existing SHA pin from R11.5>
- run: |
    cosign verify \
      --certificate-identity-regexp 'https://github.com/smashingtags/homelabarr-ce/.github/workflows/' \
      --certificate-oidc-issuer https://token.actions.githubusercontent.com \
      ghcr.io/smashingtags/homelabarr-ce:${{ github.sha }}
- name: Comment on PR if verify failed
  if: failure()
  uses: actions/github-script@<40-char-SHA>
  with:
    script: |
      // find PR for this SHA, post comment "cosign verify failed — see PB-03"
```

**Acceptance:** workflow runs include a "Cosign verify freshly-pushed image" step that fails the build on bad signature. PR comment posted on failure.

---

### M-2 — License scanning not part of the dependency PR review

**Files:**
- `.github/workflows/dependency-review.yml` (new)

**Required:** use GitHub's built-in dependency-review-action on every PR that touches `package.json`, `package-lock.json`, `Dockerfile`, or `.github/workflows/*.yml`. Fail the PR if a new dependency:
- has license in `["AGPL-3.0", "GPL-3.0", "SSPL-1.0", "BUSL-1.1"]` (or whatever the owner's deny-list is)
- has a known CVE with CVSS >= 7.0 and no patched version available
- introduces a transitive package with no published source repository

```yaml
name: dependency-review
on:
  pull_request:
    paths:
      - 'package.json'
      - 'package-lock.json'
      - 'Dockerfile'
      - '.github/workflows/*.yml'
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<40-char-SHA>
      - uses: actions/dependency-review-action@<40-char-SHA>
        with:
          fail-on-severity: high
          deny-licenses: AGPL-3.0, GPL-3.0, SSPL-1.0, BUSL-1.1
          comment-summary-in-pr: on-failure
```

**Acceptance:** workflow runs on a test PR that introduces a denied license — fails and posts comment. Owner sees the comment before any merge.

---

### M-3 — R11 compliance binder doesn't reference the new policy

**Files:**
- `compliance/cis-controls-v8.1.md` (existing per R11) — Control 16 / 6 (version control, secure config) needs to reference H-1 policy
- `compliance/nist-csf-2.0.md` (existing per R11) — PR.IP-12 (vulnerability management plan) needs to reference H-1 policy
- `compliance/owasp-asvs-v4.0.3-L2.md` (existing per R11.5) — V14.2 (Dependency) chapter — bring in scope, link to H-1

**Current:** R11 binder lists controls; R15 adds the policy doc; the binder doesn't yet point to it.

**Required:** in each of the three compliance docs, find the control row that covers dependency management and add a column entry pointing to `docs/governance/dependency-update-policy.md`. If V14.2 is currently in the ASVS coverage roadmap as deferred, move it to in-scope.

**Acceptance:** `grep -l "docs/governance/dependency-update-policy.md" compliance/cis-controls-v8.1.md compliance/nist-csf-2.0.md compliance/owasp-asvs-v4.0.3-L2.md` returns all three.

---

### L-1 — IR playbook for "security update past SLA" missing

**File (new):** `docs/ir/playbooks/PB-11-security-update-past-sla.md`

**Trigger:** H-3 staleness workflow opens an issue tagged `incident` because a security-critical dependabot PR is past its 72h merge SLA.

**Severity (default):** P2 (active risk: known vuln in production code path) unless CVSS >= 9.0 in which case P1.

**Why this is a playbook and not just a label:** a security-critical update past SLA means *either* the agent ignored it, *or* CI is broken so the PR can't merge, *or* the owner is actively deferring. Each branch needs a different action. Playbook structure forces that branching to be documented rather than reasoned out at 3am.

**Acceptance:** PB-11 follows the 9-section structure mandated by R14 H-1. Trigger references the staleness workflow output. Decision-point table covers all three branches above.

---

### L-2 — `docs/audit/README.md` index needs an R15 row

**File:** `docs/audit/README.md` (R13 ship)

**Required:** add row:

```markdown
| R15 | Dependency & supply-chain freshness governance | 7 | shipped |
```

(adjust findings count to match agent's actual final tally before commit)

---

### L-3 — No "what we evaluated and rejected" appendix

**File:** `docs/governance/dependency-update-policy.md` (extend)

The policy should briefly document choices considered and rejected, so future revisits don't re-litigate:

- **Renovate vs Dependabot:** chose Dependabot (already running, native to GitHub, sufficient for current scale). Renovate's richer config not worth migration cost on a single-repo demo.
- **Auto-merge patches:** considered, rejected. Patches can still break production (semver lies). Agent review with auto-approve-if-CI-green is the compromise.
- **Snyk / Socket / GuardDog SCA:** considered, rejected for now (cost + integration time vs marginal lift over dependabot security-updates + dependency-review-action). Revisit if a real incident demonstrates gap.

**Acceptance:** "Evaluated and rejected" section present at the bottom of the policy doc with the three items above (or whatever the agent's actual considered set was).
---

## §4 — Verification commands (agent self-check before declaring ship)

```bash
# 1. Policy doc exists with required sections
test -f docs/governance/dependency-update-policy.md || echo "FAIL: policy doc missing"
for sec in "Scope" "Update classes" "Review checklist" "Escalation" "Ignored packages" "Review cadence" "Evaluated and rejected"; do
  grep -q "$sec" docs/governance/dependency-update-policy.md || echo "FAIL: policy missing section: $sec"
done

# 2. dependabot.yml tightened
yq '.updates[] | select(.["open-pull-requests-limit"] == null)' .github/dependabot.yml | grep -q . \
  && echo "FAIL: open-pull-requests-limit missing on some ecosystem" || true
yq '.updates[] | select(.labels == null)' .github/dependabot.yml | grep -q . \
  && echo "FAIL: labels missing on some ecosystem" || true
yq '.updates[] | select(.reviewers == null)' .github/dependabot.yml | grep -q . \
  && echo "FAIL: reviewers missing on some ecosystem" || true
yq '.updates[] | select(.allow == null)' .github/dependabot.yml | grep -q . \
  && echo "FAIL: allow stanza missing on some ecosystem" || true

# 3. Staleness workflow exists and is SHA-pinned
test -f .github/workflows/dependency-staleness.yml || echo "FAIL: staleness workflow missing"
grep -E '^\s+uses:' .github/workflows/dependency-staleness.yml | grep -vE '@[0-9a-f]{40}' \
  && echo "FAIL: staleness workflow has un-pinned actions" || true

# 4. docker-build-push has post-push cosign verify
grep -q "Cosign verify freshly-pushed" .github/workflows/docker-build-push.yml \
  || echo "FAIL: post-push cosign verify step missing"

# 5. Dependency review workflow exists
test -f .github/workflows/dependency-review.yml || echo "FAIL: dependency-review workflow missing"
grep -q "fail-on-severity:" .github/workflows/dependency-review.yml || echo "FAIL: severity gate missing"
grep -q "deny-licenses:" .github/workflows/dependency-review.yml || echo "FAIL: license deny-list missing"

# 6. Compliance binder cross-links
for f in compliance/cis-controls-v8.1.md compliance/nist-csf-2.0.md compliance/owasp-asvs-v4.0.3-L2.md; do
  grep -q "dependency-update-policy" "$f" || echo "FAIL: $f does not link policy doc"
done

# 7. PB-11 exists with all 9 sections
test -f docs/ir/playbooks/PB-11-security-update-past-sla.md || echo "FAIL: PB-11 missing"
for sec in "Trigger" "Severity" "First action" "Decision point" "Containment" "Eradication" "Recovery" "Verification" "Post-incident"; do
  grep -q "## $sec\|^## .*$sec" docs/ir/playbooks/PB-11-security-update-past-sla.md \
    || echo "FAIL: PB-11 missing section: $sec"
done

# 8. Audit index row added
grep -q "^| R15" docs/audit/README.md || echo "FAIL: audit index missing R15 row"

# 9. R15 archive
test -f docs/audit/R15-dependency-supply-chain-freshness.md || echo "FAIL: R15 archive missing"

# 10. Smoke test: trigger the staleness workflow manually
gh workflow run dependency-staleness.yml && sleep 30 && gh run list --workflow=dependency-staleness.yml --limit=1
```

---

## §5 — Out of scope for R15

- Migrating to Renovate. Dependabot is sufficient; documented as evaluated-and-rejected.
- Paid SCA tools (Snyk, Socket, etc.). Evaluated-and-rejected for current scale.
- Auto-merging anything without human review. Agent review with CI-green auto-approve on patches is the limit.
- Modifying R5 cosign machinery itself (already shipped); only adding the post-merge gate.

---

## §6 — Owner pile (human-only decisions)

| # | Decision | Why owner | Recommended |
|---|---|---|---|
| O-1 | Confirm license deny-list (M-2). Current spec uses AGPL/GPL-3.0/SSPL/BUSL — owner may want different list. | Legal/business call | Stick with spec unless legal disagrees |
| O-2 | Confirm reviewer GitHub handle for dependabot.yml. Spec uses `smashingtags`. | Identity | Confirm or add others |
| O-3 | Triage the 13 currently-open dependabot PRs against the new policy once H-1 ships. **This is one-time backlog work, not recurring.** | First application of new SLA can't be agent-only | Half-day sprint with owner sign-off on each |
| O-4 | Carried: audit-log off-box destination (R7) | Cost | Pick one |
| O-5 | Carried: chaos gameday (R12) + tabletop (R14) — schedule together | Calendar | One half-day |
| O-6 | Carried: read + sign off on `docs/threat-model/07-residual-risk.md` (R13) | Acceptance | Within 7 days |

**Reminder:** agent has CF + GH access. `.github/dependabot.yml` edits, workflow file creation, label config, branch protection rules — all agent work.

---

## §7 — Deliverable shape

```
docs/governance/
  dependency-update-policy.md          (NEW — written policy)

.github/
  dependabot.yml                       (EXTEND — allow / limits / labels / reviewers / commit-message)
  workflows/
    dependency-staleness.yml           (NEW — daily SLA enforcement)
    dependency-review.yml              (NEW — per-PR license + CVE gate)
    docker-build-push.yml              (EXTEND — post-push cosign verify + PR comment on fail)

docs/ir/playbooks/
  PB-11-security-update-past-sla.md    (NEW — IR playbook for SLA breach)

compliance/
  cis-controls-v8.1.md                 (EXTEND — link to policy from Control 6/16 row)
  nist-csf-2.0.md                      (EXTEND — link to policy from PR.IP-12 row)
  owasp-asvs-v4.0.3-L2.md              (EXTEND — V14.2 in-scope, link to policy)

docs/audit/
  R15-dependency-supply-chain-freshness.md  (this file, archived)
  README.md                            (EXTEND — add R15 row)
```

**Ship message template:**
```
R15: dependency & supply-chain freshness governance

- Written policy: docs/governance/dependency-update-policy.md (update classes, SLAs, escalation)
- dependabot.yml tightened: allow / limits / labels / reviewers / commit-message stanzas
- New workflows: dependency-staleness (daily SLA), dependency-review (per-PR gate)
- Extended docker-build-push: post-push cosign verify + PR comment on fail
- New IR playbook PB-11 for security-update SLA breach
- R11 compliance binder updated: CIS / NIST / ASVS link to policy
- Audit index R15 row added

Verification: all 10 self-check commands in R15 §4 pass.

Backlog note: 13 dependabot PRs currently open need owner-supervised triage
under the new policy. That's one-time work, not recurring. See R15 §6 O-3.
```

---

## §8 — End of round / loop

If everything in §4 passes: ship and report back. R16 will be the **continuous-evidence + binder-rebuild round** — given we now have R11 compliance binders, R11.5 evidence collector, R12 chaos evidence, R14 IR playbooks, R15 governance — the binders need to be auto-rebuilt from current state rather than hand-maintained, with a single `make compliance-binder` (or workflow) that produces a dated, attested PDF/zip artifact ready for auditor handoff.

If anything in §4 fails: report which line, and we open R15.5 as a pink correction.
