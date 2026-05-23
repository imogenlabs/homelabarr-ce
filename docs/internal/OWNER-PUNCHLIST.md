# Owner Punch-List — homelabarr-ce

> **This is an internal owner checklist, not an engineering backlog or open audit round.** Contributors should refer to GitHub Issues for code work. This file tracks operational decisions and scheduling commitments that only the repo owner can act on.

**Source:** `docs/audit/R22-owner-closeout.md` (§3, §4, §6)
**Snapshot baseline:** `a99d23c` (2026-05-23). Items added after that baseline are noted with their own commit SHA and date in the "Shipped after closeout" section below.
**Status of audit loop:** CLOSED — 22 rounds + R22.5, 241+ findings shipped, 0 open code findings.
**Maintenance:** Update this file as items are completed or new owner-only items surface. Delete completed sections once all items in them are checked. When every item on this page is done, archive it to `docs/internal/archive/` and remove the file.

---

## Remaining owner-only items

- [ ] **OWN-01a — Tabletop exercise (90 min + 30 min writeup).** Pick a date. Run scenario from `docs/ir/06-tabletop-exercises.md`. Commit after-action to `compliance/binder/exercises/`.
- [ ] **OWN-01b — Chaos gameday (90 min + 30 min writeup).** Pick a date. Run a scenario from `chaos/gameday-playbook.md`. Commit after-action to `compliance/binder/exercises/`.
- [ ] **OWN-02 — Threat-model residual-risk sign-off (~60 min).** Read `docs/threat-model/` end-to-end. Sign the residual-risk section.
- [ ] **OWN-07 — Audit-log off-box destination.** Defer until final hosting target decided.
- [ ] **OWN-09 — Consolidate error-handler middlewares?** Recommendation: skip.
- [ ] **OWN-10 — Pad login response sizes?** Recommendation: accept residual risk.
- [ ] **OWN-11 — Prometheus endpoint?** Recommendation: defer until you run Prometheus.

---

## Quick reference

| Where it lives | What it is |
|---|---|
| `docs/audit/README.md` | Round index — all 22 rounds, status |
| `docs/audit/R22-owner-closeout.md` | Full closeout doc (this list is the summary) |
| `docs/threat-model/` | STRIDE, trust boundaries, attack trees, residual risk |
| `docs/ir/` | Incident response runbook + 11 playbooks |
| `docs/governance/` | Dependency update policy, GitHub security settings |
| `docs/decisions/` | ADRs (0001 = password hash) |
| `compliance/` | CIS Docker, NIST CSF, OWASP ASVS binders + scripts |

---

## Shipped after closeout

- [x] **OWN-03** — Dependabot triage. All 25 alerts dismissed or patched. Security tab at 0. `path-to-regexp` and `qs` overridden to patched versions. (`50d46fc`, 2026-05-23)
- [x] **OWN-04** — INFRASTRUCTURE.md corrected. Docker socket description updated to match shipped compose (socket-proxy, not direct mount). (Earlier in session, 2026-05-23)
- [x] **OWN-05** — LICENSE SPDX confirmed `MIT` in both Dockerfiles since R17. No change needed.
- [x] **OWN-06** — nginx Content-Type fixed. Single `text/plain` on `/health`. Verified live.
- [x] **OWN-08** — Argon2id ADR written. Decision: stay on bcrypt12. `docs/decisions/0001-password-hash.md`. (`ae78dea`, 2026-05-23)
- [x] **R22.5** — Login screen gates unauthenticated visitors. React-side route guard, no mobile app changes. (`af9d6ce`, 2026-05-23)

## ZAP hygiene (not an audit round — small-PR cleanup)

Source: 11 duplicate ZAP issues (#186, #187, #190–#197, #200). Workflow misconfiguration, not a security backlog.

- [x] **Close duplicate issues.** #186, #187, #190–#197, #201 closed as dupes of #200. (`1a02b57`, 2026-05-23)
- [x] **Check /api/applications for private IP.** `10.13.13.0` is WireGuard template default subnet — not a real backend IP. Suppressed in `.zap/rules.tsv`.
- [x] **nginx headers on static paths.** HSTS + X-Content-Type-Options + X-Frame-Options added to robots.txt, humans.txt, analytics.js, .well-known/ paths.
- [x] **ZAP suppressions.** Added 10109, 10050, 10094, 10044, 10024 to `.zap/rules.tsv` with reasons.
- [x] **Fix ZAP workflow.** `allow_issue_writing: false` + removed `issues: write` permission. Reports go to artifacts only.

---

**Bottom line:** Six starred items get you to "top decile open-source security posture for a project this size." Five hygiene items are optional. The audit loop itself is done.
