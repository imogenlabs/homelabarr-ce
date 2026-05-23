# Dependency update policy

Last reviewed: 2026-05-22

## Scope

Applies to all dependency PRs across these ecosystems (from `.github/dependabot.yml`):
- npm (production + dev)
- Docker base images
- GitHub Actions

Tool choice: **Dependabot** (native GitHub integration, already running, sufficient for single-repo scale). See [Evaluated and rejected](#evaluated-and-rejected) for alternatives considered.

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

A PR that exceeds its review or merge SLA fires the staleness alert (`.github/workflows/dependency-staleness.yml`), which routes to:
- **Security-critical past 72h:** IR playbook [PB-11](../ir/playbooks/PB-11-security-update-past-sla.md)
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

## Evaluated and rejected

| Option | Reason rejected |
|---|---|
| **Renovate** | Already running Dependabot; native GitHub integration sufficient for single-repo scale. Renovate's richer config not worth migration cost. |
| **Auto-merge patches** | Patches can still break production (semver lies). Agent review with auto-approve-if-CI-green is the compromise. |
| **Snyk / Socket / GuardDog SCA** | Cost + integration time vs marginal lift over dependabot security-updates + dependency-review-action. Revisit if a real incident demonstrates gap. |
