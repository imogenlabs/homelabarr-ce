# Owner Punch-List — homelabarr-ce

> **This is an internal owner checklist, not an engineering backlog or open audit round.** Contributors should refer to GitHub Issues for code work. This file tracks operational decisions and scheduling commitments that only the repo owner can act on.

**Source:** `docs/audit/R22-owner-closeout.md` (§3, §4, §6)
**Snapshot baseline:** `a99d23c` (2026-05-23). Items added after that baseline are noted with their own commit SHA and date in the "Shipped after closeout" section below.
**Status of audit loop:** CLOSED — 22 rounds + R22.5, 241+ findings shipped, 0 open code findings.
**Maintenance:** Update this file as items are completed or new owner-only items surface. Delete completed sections once all items in them are checked. When every item on this page is done, archive it to `docs/internal/archive/` and remove the file.

---

## Sprint 1 — This week (~2 hours total)

- [ ] **OWN-05 — LICENSE SPDX (5 min).** Confirm `MIT` is the value of `org.opencontainers.image.licenses` in `Dockerfile` and `Dockerfile.backend`. Two-line PR, merge.
- [ ] **OWN-06 — Reload nginx on ce-demo (15 min, delegate to agent).** Live `/health` still returns comma-joined `application/octet-stream, text/plain`. Source at `a99d23c` is clean. Agent rebuilds + redeploys nginx image. Verify with `curl -sI https://ce-demo.homelabarr.com/health | grep -i content-type` — should be one token, not two.
- [ ] **OWN-04 — Fix INFRASTRUCTURE.md in deploy-pipeline (~25 min, delegate to agent).** Tell the agent: "Reconcile `deploy-pipeline/INFRASTRUCTURE.md` against current `homelabarr.yml` at `smashingtags/homelabarr-ce@main`. Open a PR with the corrections." Merge after one read.
- [ ] **OWN-02 — Threat-model residual-risk sign-off (~60 min).** Read `docs/threat-model/` end-to-end. Sign the residual-risk section: `smashingtags, 2026-MM-DD`. Commit. If anything surprises you, open an issue tagged `threat-model-followup`.

## Sprint 2 — Next week (~4 hours)

- [ ] **OWN-03 — Triage 25 Dependabot vulns (~4 hours).** Use `docs/governance/dependency-update-policy.md` to classify each: deploy-blocking / next-sprint / accept-with-rationale / not-applicable. Dismiss the not-applicable / accept-with-rationale ones with a written rationale (lands in the audit trail). Goal: Security tab ≤ 5 actionable. Delegable to agent with "use R15 policy, ask me only for accept-with-rationale calls."

## Sprint 3 — Within 30 days (~4 hours)

- [ ] **OWN-01a — Tabletop exercise (90 min + 30 min writeup).** Pick a date. Run scenario from `docs/ir/06-tabletop-exercises.md`. Commit a 5-line after-action to `compliance/binder/exercises/YYYY-MM-DD-tabletop.md`.
- [ ] **OWN-01b — Chaos gameday (90 min + 30 min writeup).** Pick a date. Run a scenario from `chaos/gameday-playbook.md`. Commit a 5-line after-action to `compliance/binder/exercises/YYYY-MM-DD-gameday.md`.

## Whenever — no urgency

- [ ] **OWN-07 — Audit-log off-box destination.** Defer until you pick your final hosting target. Note in `docs/threat-model/07-residual-risk.md` as "accepted pending hosting migration."
- [ ] **OWN-08 — Argon2id roadmap.** `docs/decisions/0001-password-hash.md` already exists — confirm it states the decision clearly (stay on bcrypt12, or migrate to argon2id at user-count threshold N). 30 min if it needs editing.
- [ ] **OWN-09 — R21 M-4: consolidate error-handler middlewares?** Recommendation: skip. Three-handler split is idiomatic Express.
- [ ] **OWN-10 — R21 L-2: pad login response sizes?** Recommendation: don't pad. Rate-limit already covers bulk enumeration. Document the decision in threat model.
- [ ] **OWN-11 — R21 L-3: Prometheus `/api/metrics` endpoint?** Recommendation: defer until you actually run Prometheus against it. JSON fields on `/health` are enough for now.

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
