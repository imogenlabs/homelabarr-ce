# Round 14 — Incident Response runbook (the 3am companion to R12 chaos)

**Target:** `smashingtags/homelabarr-ce` @ main `b9e836031e` (== dev, R13 merged 2026-05-23T02:04:53Z)
**Live:** https://ce-demo.homelabarr.com/
**Date:** 2026-05-23
**Scope:** R12 documented what should happen when infrastructure fails on purpose. R14 documents what the *human operator* does when something fails *not* on purpose — at 3am, half-awake, no agent on hand. This is the runbook layer: detect → triage → contain → eradicate → recover → post-mortem. Maps each playbook to a specific signal from R6 audit chain, R10 honey routes, R12 SLOs, or R12 chaos atomics.
**Method:** Spec-only. **No live exploitation.** No new code, no new gates — pure operational documentation with verifiable triggers.

---

## §0 — Verification of R13 (carry-forward)

| # | R13 spec item | Live state (main @ b9e836031e) | Verdict |
|---|---|---|---|
| 1 | `docs/threat-model/` with 9 files (README + 8 chapters) | All 9 present. | CLEAN |
| 2 | 01-asset-inventory.md has 10+ assets | 14 A-NN rows. | CLEAN (exceeds spec) |
| 3 | 02-trust-boundaries.md has 7+ boundaries | 9 numbered boundaries. | CLEAN (exceeds spec) |
| 4 | 03-data-flow-diagram.md has mermaid block | Mermaid present, 946B. | CLEAN |
| 5 | 04-stride-per-element.md has STRIDE tables with Rx mappings | 5 sections, 32 Rx references. | CLEAN |
| 6 | 05-attack-trees.md has 3+ trees with leaf dispositions | 18 leaf dispositions (17 mitigated, 1 deferred). | CLEAN |
| 7 | 06-control-mapping.md has 15+ controls | 34 control rows. | CLEAN (exceeds spec) |
| 8 | 07-residual-risk.md has 4-col risk table | Present, 1250B. | CLEAN |
| 9 | 08-framework-crosswalk.md has 4 crosswalk tables | 8 STRIDE references (STRIDE→Top10/CWE/ATT&CK/ASVS). | CLEAN |
| 10 | `docs/threat-model/README.md` has review cadence + last-reviewed | Both sections present. | CLEAN |
| 11 | `docs/audit/README.md` index of all rounds | 21 R-rows listed. | CLEAN |
| 12 | README.md / CONTRIBUTING.md / SECURITY.md link to threat-model | All three link. | CLEAN |
| 13 | Atomic 09 raised to EXPECTED=100 | Confirmed. | CLEAN |
| 14 | Atomic 09 moved to semantically correct path | **NOT MOVED** — still at `pentest/atomics/T1595-vuln-scanning/09-audit-log-continuity.sh`. R13 L-1 asked to move to `pentest/atomics/audit-continuity/` or rename to T1565.001. | MINOR DRIFT — carry to R14 L-1 |

**R13 ship verdict:** 13 of 14 clean, 1 minor drift (atomic 09 path unchanged). Fold into R14 §3 L-1; no pink round.

---

## §1 — Goal of R14

After R13 we know *what* could go wrong (threat model) and after R12 we know *how the system behaves* under chaos. R14 closes the operational loop: **when a real signal fires, what does the human do, in what order, in what time budget?**

R14 produces the IR runbook as a set of playbooks indexed by trigger signal. Each playbook is short (one screen), actionable (no abstract advice), and ends in either "resolved" or "escalate to post-mortem."

---

## §2 — Current state

- Detection sensors exist (R6 audit chain, R10 honey routes, R12 SLOs, R12 chaos atomics) — but firing a sensor doesn't tell the operator *what to do next*.
- No `SECURITY.md` IR-contact section (the file exists per R13 but only links to threat model).
- No documented severity classification (what is a "P1" vs a "P3"?).
- No documented post-mortem template.
- No on-call rotation (single-operator demo — that's fine, but it should be explicit).
- No "first 60 seconds" checklist — the highest-value document in any IR program.
---

## §3 — Findings

### L-1 (R13-carry) — atomic 09 path not moved to semantically correct location

**File:** `pentest/atomics/T1595-vuln-scanning/09-audit-log-continuity.sh`

**Current:** EXPECTED=100 ✓ (R13 ship), but file still lives under T1595 (active scanning). Audit-log continuity is not active scanning.

**Required:** move to one of:
- `pentest/atomics/audit-continuity/09-audit-log-continuity.sh` (preferred — not a MITRE technique, it's an integrity test)
- `pentest/atomics/T1565.001-stored-data-manipulation/09-audit-log-continuity.sh` (if keeping MITRE structure)

Update any harness reference in `pentest/harness/run.sh` to the new path.

**Acceptance:** `pentest/atomics/T1595-vuln-scanning/09-audit-log-continuity.sh` does not exist; new path exists and is executable; `bash pentest/harness/run.sh` still green.

---

### H-1 — No incident response runbook directory

**Files (new):**

```
docs/ir/
  README.md                            (index + how to use)
  00-first-60-seconds.md               (the universal first-touch checklist)
  01-severity-classification.md        (P1-P4 definitions + decision tree)
  02-on-call-and-contacts.md           (who, how, escalation)
  03-comms-templates.md                (status messages: investigating / mitigated / resolved)
  04-post-mortem-template.md           (blameless post-mortem template)
  playbooks/
    PB-01-audit-chain-break.md         (trigger: R6 validator bad > 0)
    PB-02-honey-route-hit.md           (trigger: R10 honey emission)
    PB-03-cosign-verify-fail.md        (trigger: R5 cosign verify nonzero)
    PB-04-rate-limit-burst.md          (trigger: R12 SLO burn — auth burst)
    PB-05-slo-error-budget-burn.md     (trigger: R12 SLO burn — health)
    PB-06-container-restart-storm.md   (trigger: docker events > 3/24h per svc)
    PB-07-backup-restore-fail.md       (trigger: R8 drill or real restore fails)
    PB-08-disclosed-vuln.md            (trigger: someone emails SECURITY.md)
    PB-09-credential-leak.md           (trigger: R7 secrets scan hit on a log/repo)
    PB-10-time-skew-detected.md        (trigger: R12 exp 05 alert in production)
```

Each playbook is specced in §3 subsections below.

**WRONG:** `docs/ir/` does not exist.
**RIGHT:** all 5 top-level files + all 10 playbooks present.

---

#### 00-first-60-seconds.md (RIGHT shape)

The single most important IR document. Must fit on one screen, no scrolling.

```markdown
# First 60 seconds

You just got paged / saw a red light. Before you do anything else:

1. **Acknowledge** the alert so it doesn't keep paging.
2. **Identify the trigger.** What sensor fired?
   - R6 audit-chain bad > 0 → PB-01
   - R10 honey emission → PB-02
   - Cosign verify fail → PB-03
   - SLO burn → PB-04 or PB-05
   - Container restart storm → PB-06
   - Backup/restore fail → PB-07
   - External disclosure → PB-08
   - Secret leak → PB-09
   - Time skew → PB-10
   - Unknown → keep reading, default to "Investigating"
3. **Open the incident channel** (or a private note if solo): write one line "INCIDENT START <UTC time> — <trigger> — investigating"
4. **Don't fix yet. Observe.** What is the user-visible impact right now?
5. **Snapshot evidence before changing state:** \`docker ps -a > /tmp/inc-\$(date +%s)-ps.txt\` and \`bash compliance/collect-evidence.sh\` BEFORE you touch anything. The evidence collector is your forensic snapshot.
6. **Pick a playbook.** Open the corresponding PB-NN file.

Do NOT: restart containers, rotate credentials, or block IPs in the first 60 seconds. Those are mitigation steps and belong in the playbook.
```

**WRONG:** longer than one screen, contains abstract advice, no snapshot-before-touch rule.
**RIGHT:** fits on one screen, six numbered steps, explicit "snapshot before change" rule.

---

#### 01-severity-classification.md (RIGHT shape)

| Severity | Definition | Response time | Examples |
|---|---|---|---|
| **P1** | Confirmed compromise OR data exfiltration OR audit-chain tampering OR signed image bypass | Immediate (start IR within 15 min) | cosign verify fails on running image; audit-chain bad > 0 with no chaos experiment running |
| **P2** | Active attack signal, no confirmed compromise OR critical SLO burn > 75% in 24h | < 1 hour | Sustained honey-route emission from single source; auth burst exceeding rate limit |
| **P3** | Degraded posture, no active attack OR SLO burn 25-75% | < 24 hours | Container restart storm with no security signal; backup drill failure |
| **P4** | Configuration drift OR low-impact finding from R-round audit | Next business day | New CVE in dependabot; compliance evidence missing field |

Decision tree (mermaid or ASCII):
```
Is there confirmed unauthorized access or data movement? --YES--> P1
                                                          --NO-->
  Is a detection sensor actively firing AND there's no chaos experiment running? --YES--> P2
                                                                                  --NO-->
    Is an SLO burning OR a service degraded? --YES--> P3
                                              --NO--> P4
```

**WRONG:** no severity definitions OR no response time targets OR no decision tree.
**RIGHT:** 4-row table + decision tree.

---

#### 02-on-call-and-contacts.md (RIGHT shape)

For a single-operator demo this is short, but it must be explicit.

```markdown
## On-call rotation
Single operator: <owner GitHub handle>. No formal rotation. PagerDuty / SMS / email destinations listed below.

## Contacts
| Role | Channel | Notes |
|---|---|---|
| Primary | <pager / SMS / email> | Owner only |
| Agent assist | Anthropic Claude session | For analysis, not for unilateral action |
| Cloudflare account | <CF account email> | For DNS / WAF rule changes |
| GHCR / GitHub | <GH handle> | For image / repo intervention |
| External legal/PR (if needed) | <none for demo> | N/A for demo |

## Escalation
If solo operator cannot resolve a P1 within 4 hours: declare partial outage, post status, accept the breach window.
```

**WRONG:** missing escalation rule.
**RIGHT:** contacts table + escalation rule + explicit "single operator" acknowledgment.

---

#### 03-comms-templates.md (RIGHT shape)

Three templates, copy-pasteable, time-stamped placeholders:

```markdown
## Investigating (within 15 min of P1/P2)
> [<UTC time>] Investigating a potential issue with ce-demo. We have signal from <sensor>. Service may be degraded. Updates every 30 minutes.

## Mitigated
> [<UTC time>] Mitigated. <one sentence: what happened, what we did>. Continuing to monitor. Full post-mortem within 5 business days.

## Resolved
> [<UTC time>] Resolved. Post-mortem: <link>. Affected window: <start>–<end> UTC. Root cause: <one sentence>. Remediation: <one sentence>.
```

**WRONG:** templates missing OR no time-stamped placeholders OR longer than one paragraph each.
**RIGHT:** all three present, each one paragraph, all time-stamped.

---

#### 04-post-mortem-template.md (RIGHT shape)

Blameless format. Must include:

```markdown
# Incident <YYYY-MM-DD>-<short-name>

**Severity:** P<n>
**Detection:** <sensor, time to detect from first impact>
**Duration:** <start UTC>–<end UTC>, total <hh:mm>
**Affected:** <users / services / data>
**Root cause:** <one paragraph, blameless — describe systems, not people>

## Timeline (UTC)
| Time | Actor | Action |
|---|---|---|

## What went well
- 

## What went poorly
- 

## Action items (with R-round mapping)
| # | Owner | Action | Due | Tracks to R-round |
|---|---|---|---|---|

## Threat-model update
- Does this incident require an update to \`docs/threat-model/\`? Which file?

## Audit-log evidence
- \`R6-audit-chain.txt\` from incident window: <link>
- \`compliance/collect-evidence.sh\` snapshot taken at: <UTC>
```

**WRONG:** missing blameless framing OR no action-item-to-R-round mapping OR no threat-model update section.
**RIGHT:** all sections present, mapping to R-rounds explicit.

---

#### Playbooks (PB-01 through PB-10) — RIGHT shape per playbook

Each PB-NN file must contain exactly these sections in this order:

```markdown
# PB-NN — <name>

## Trigger
Exact sensor + threshold + how you got paged. e.g. "R6 validator: \`R6-audit-chain.txt\` shows \`bad > 0\`"

## Severity (default)
P<n>. Adjust per 01-severity-classification.md.

## First action (within 5 min)
1. <action>
2. <action>
3. <action>
Stop at step 3 if any step changes state — go to "Decision point" below.

## Decision point
| Observation | Next action |
|---|---|
| <observation A> | <next step> |
| <observation B> | <next step> |

## Containment
What to do to stop further damage. Reversible actions preferred (block IP > kill container > revert deploy).

## Eradication
Remove the cause. Specific commands.

## Recovery
Bring service back to steady state. Specific commands.

## Verification
How you know it's actually resolved. Re-run \`bash compliance/collect-evidence.sh\` and compare to pre-incident snapshot.

## Post-incident
- File post-mortem from 04-post-mortem-template.md
- Update which threat-model file? (default: 07-residual-risk.md)
- Update which R-round? (file as L finding in next round)
```

**WRONG per playbook:** missing any of the 7 sections OR no concrete commands in Containment/Eradication/Recovery.
**RIGHT:** all 7 sections, concrete shell commands or exact actions, links to R-round controls.

**Specific must-haves per playbook:**

- **PB-01 (audit-chain break):** containment = freeze writes (read-only mount); eradication = identify break point from \`first_bad\` field in JSON; recovery = restore from R8 backup BEFORE the break point; verify = R6 validator returns bad=0.
- **PB-02 (honey route hit):** containment = block source IP at Cloudflare (agent can do this); never engage attacker; verify = no further hits in 60 min.
- **PB-03 (cosign verify fail):** P1 by default. Containment = do NOT deploy. Eradication = identify which image, which tag, when first appeared. Compare to last known good in \`R5-cosign.txt\` history.
- **PB-04 (rate-limit burst):** distinguish brute-force (from few IPs) vs DDoS (many IPs). Brute-force → block IPs. DDoS → CF challenge mode.
- **PB-05 (SLO burn):** check error budget first. If >50% burned in <7d, freeze non-security deploys per R12 SLO policy.
- **PB-06 (restart storm):** check disk pressure, OOM kills (\`dmesg | tail\`), then container logs for leak scan (R12 exp 08 pattern).
- **PB-07 (backup/restore fail):** P1 if real restore is needed; P3 if drill. Either way: do NOT consider backup proven until you've restored to a clean target and \`R6-audit-chain.txt\` shows bad=0 post-restore.
- **PB-08 (disclosed vuln):** acknowledge within 24h via SECURITY.md contact. 90-day disclosure window if vendor is responsive.
- **PB-09 (credential leak):** rotate first, investigate after. JWT signing key → invalidate all sessions. DB password → rotate + redeploy. Find scope via grep on chaos/leak-scan-results.txt history.
- **PB-10 (time skew):** check NTP sync on host + containers. If JWT \`exp\` was bypassed by clock manipulation, treat as P1 (potential authentication bypass).

---

### M-1 — SECURITY.md missing IR-contact and disclosure-window sections

**File:** `SECURITY.md` (already exists per R13)

**Current:** links to threat model per R13 M-1.
**Required (additions):**

```markdown
## Reporting a vulnerability
Email: <owner contact>
PGP key: <fingerprint or link, optional>
Response SLO: acknowledge within 24h, status update within 7 days.

## Disclosure policy
90-day disclosure window from acknowledgment. Earlier if patch is shipped sooner. Coordinated disclosure preferred.

## Incident response
For active exploitation, see \`docs/ir/00-first-60-seconds.md\`. Public status page: <none for demo / TBD>.
```

**Acceptance:** SECURITY.md contains "Reporting a vulnerability", "Disclosure policy", and "Incident response" sections with the fields above filled (placeholders allowed where owner decision required).

---

### M-2 — No alerting integration documented

**File (new):** `docs/ir/05-alerting-integration.md`

The R12 SLO doc defined what should be measured but didn't say *how* the operator gets paged. Document the actual signal path:

| Sensor | Emission point | Sink | Pager mechanism |
|---|---|---|---|
| R6 audit chain | \`compliance/collect-evidence.sh\` cron | \`R6-audit-chain.txt\` | Cron job: if \`jq .bad\` > 0 → email/SMS |
| R10 honey routes | backend handler → audit log | audit JSONL | Same as above; tail-watcher service |
| R5 cosign | CI \`compliance-evidence.yml\` | workflow status | GitHub notification on workflow failure |
| R12 SLO p95 | nginx access log | grep/awk cron | Email if 7d avg p95 > 300ms |
| R12 SLO health | nginx access log | grep cron | Email if 30d success < 99.9% |
| R12 restart storm | \`docker events\` | tail-watcher | Email if > 3 restarts / 24h / service |

For each sensor, the file must document:
- How it emits (file write? log line? webhook?)
- How it's polled or watched (cron? systemd timer? tail-f?)
- What the pager destination is (email? SMS? PD? a list of all three is fine for a single-operator demo)
- Time-to-detect target (e.g. "within 5 min of bad > 0")

**WRONG:** no alerting integration file.
**RIGHT:** file present with sensor → sink → pager table for all 6 sensors.

---

### L-2 — No "tabletop exercise" doc

**File (new):** `docs/ir/06-tabletop-exercises.md`

Three short scenarios the operator should mentally rehearse (or walk through with the agent) every quarter:

1. **Scenario A: "It's 3am and the audit-chain validator returned bad=1."** Walk through PB-01 in writing. Time it.
2. **Scenario B: "A security researcher emails SECURITY.md saying they have RCE proof-of-concept."** Walk through PB-08.
3. **Scenario C: "GHCR shows a new tag for the backend image you didn't push."** Walk through PB-03.

Each tabletop has: scenario / expected playbook / scoring rubric (did you snapshot first? did you communicate? did you escalate correctly?).

**WRONG:** no tabletop file.
**RIGHT:** file with 3 scenarios + scoring rubric.

---

### L-3 — IR docs not linked from threat-model or audit index

**Files affected:** `docs/threat-model/README.md`, `docs/audit/README.md`, `SECURITY.md`, root `README.md`

**Current:** threat-model + audit index exist but don't reference docs/ir/.
**Required:** each of the four files above gets a one-line link to `docs/ir/README.md` near the top.

**Acceptance:** `grep -rl "docs/ir/" docs/threat-model/README.md docs/audit/README.md SECURITY.md README.md` returns all four paths.
---

## §4 — Verification commands (agent self-check before declaring ship)

```bash
# 1. IR directory + top-level docs
for f in README.md 00-first-60-seconds.md 01-severity-classification.md \
         02-on-call-and-contacts.md 03-comms-templates.md 04-post-mortem-template.md \
         05-alerting-integration.md 06-tabletop-exercises.md; do
  test -f docs/ir/$f || echo "FAIL: docs/ir/$f missing"
done

# 2. All 10 playbooks
for n in 01 02 03 04 05 06 07 08 09 10; do
  ls docs/ir/playbooks/PB-$n-*.md >/dev/null 2>&1 || echo "FAIL: PB-$n missing"
done

# 3. Each playbook has all 7 mandatory sections
for f in docs/ir/playbooks/PB-*.md; do
  for sec in "Trigger" "Severity" "First action" "Decision point" "Containment" "Eradication" "Recovery" "Verification" "Post-incident"; do
    grep -q "## $sec\|^## .*$sec" "$f" || echo "FAIL: $f missing section: $sec"
  done
done

# 4. First-60-seconds is ONE screen (heuristic: <= 50 lines)
test "$(wc -l < docs/ir/00-first-60-seconds.md)" -le 60 || echo "FAIL: 00-first-60-seconds too long"

# 5. Severity classification has 4 levels + decision tree
grep -q "P1" docs/ir/01-severity-classification.md && grep -q "P4" docs/ir/01-severity-classification.md \
  || echo "FAIL: severity levels missing"

# 6. Post-mortem template is blameless + has R-round mapping
grep -qi "blameless" docs/ir/04-post-mortem-template.md || echo "FAIL: post-mortem not blameless"
grep -qi "R-round" docs/ir/04-post-mortem-template.md || echo "FAIL: post-mortem lacks R-round mapping"

# 7. SECURITY.md has IR sections
grep -q "Reporting a vulnerability" SECURITY.md || echo "FAIL: SECURITY.md missing reporting section"
grep -q "Disclosure policy" SECURITY.md || echo "FAIL: SECURITY.md missing disclosure section"
grep -q "docs/ir/" SECURITY.md || echo "FAIL: SECURITY.md doesn't link IR"

# 8. Alerting integration table has 6 sensors
test "$(grep -c '^|' docs/ir/05-alerting-integration.md)" -ge 7 || echo "FAIL: alerting table too thin"

# 9. Tabletop has 3 scenarios
grep -cE "Scenario [A-C]" docs/ir/06-tabletop-exercises.md | grep -q "3" || echo "FAIL: <3 scenarios"

# 10. R13 carry: atomic 09 moved out of T1595
test ! -f pentest/atomics/T1595-vuln-scanning/09-audit-log-continuity.sh \
  || echo "FAIL: atomic 09 still in T1595"
ls pentest/atomics/audit-continuity/09-audit-log-continuity.sh \
   pentest/atomics/T1565*/09-audit-log-continuity.sh 2>/dev/null | head -1 \
  || echo "FAIL: atomic 09 not at new path"

# 11. Cross-links
grep -q "docs/ir/" docs/threat-model/README.md || echo "FAIL: threat-model README does not link IR"
grep -q "docs/ir/" docs/audit/README.md || echo "FAIL: audit README does not link IR"
grep -q "docs/ir/" README.md || echo "FAIL: root README does not link IR"

# 12. R14 archive
test -f docs/audit/R14-incident-response-runbook.md || echo "FAIL: R14 archive missing"
```

---

## §5 — Out of scope for R14

- Buying / configuring PagerDuty, OpsGenie, etc. Owner decision; documented as "TBD: pick one."
- Public status page hosting. Owner decision.
- Live incident drill (this round is doc-only; first real drill is owner-scheduled).
- Legal disclosure templates beyond a 90-day policy statement.

---

## §6 — Owner pile (human-only decisions)

| # | Decision | Why owner | Recommended |
|---|---|---|---|
| O-1 | Pick pager destination (email vs SMS vs PD) and fill in 02-on-call-and-contacts.md | Owner's preference + budget | Email + SMS for free-tier demo |
| O-2 | Pick disclosure-window response email + (optional) PGP key for SECURITY.md | Owner identity | Use existing security@ alias or owner email |
| O-3 | Schedule first tabletop exercise within 30 days of R14 ship | Calendar | One 30-min session |
| O-4 | Carried: audit-log off-box destination (R7-onwards) | Cost decision | Pick one |
| O-5 | Carried: quarterly chaos gameday (R12) | Calendar | Schedule next |
| O-6 | Carried: read + sign off on `docs/threat-model/07-residual-risk.md` (R13) | Acceptance is an owner act | Within 7 days |

**Reminder:** agent has CF API + GH access. Cloudflare WAF rules, GitHub repo settings, GHCR cleanup — all agent work.

---

## §7 — Deliverable shape

```
docs/ir/
  README.md
  00-first-60-seconds.md
  01-severity-classification.md
  02-on-call-and-contacts.md
  03-comms-templates.md
  04-post-mortem-template.md
  05-alerting-integration.md
  06-tabletop-exercises.md
  playbooks/
    PB-01-audit-chain-break.md
    PB-02-honey-route-hit.md
    PB-03-cosign-verify-fail.md
    PB-04-rate-limit-burst.md
    PB-05-slo-error-budget-burn.md
    PB-06-container-restart-storm.md
    PB-07-backup-restore-fail.md
    PB-08-disclosed-vuln.md
    PB-09-credential-leak.md
    PB-10-time-skew-detected.md

docs/audit/
  R14-incident-response-runbook.md     (this file, archived)
  README.md                            (extended: add R14 row, link to docs/ir/)

docs/threat-model/
  README.md                            (extended: link to docs/ir/)

SECURITY.md                            (extended: Reporting / Disclosure / IR sections)
README.md                              (extended: link to docs/ir/)

pentest/atomics/
  (move 09-audit-log-continuity.sh out of T1595-vuln-scanning/ — R13 L-1 carry)
```

**Ship message template:**
```
R14: incident response runbook

- Created docs/ir/ with 8 top-level files + 10 playbooks
- First-60-seconds checklist, severity classification, post-mortem template
- Alerting integration map for all 6 R6/R10/R5/R12 sensors
- 3 tabletop scenarios for quarterly rehearsal
- Extended SECURITY.md with reporting + disclosure + IR sections
- Moved atomic 09 to semantically correct path (R13 carry)
- Cross-linked from threat-model, audit index, root README, SECURITY.md

Verification: all 12 self-check commands in R14 §4 pass.
```

---

## §8 — End of round / loop

If everything in §4 passes: ship and report back. R15 will be the **dependency + supply-chain freshness audit** — given the bot has 13 open dependabot PRs and we have cosign verify shipped, the next layer is "what's our actual policy on dependency updates, who reviews, what's the staleness threshold, how does this connect back to R5 supply chain?" That's a governance round on top of the supply-chain machinery R5 built.

If anything in §4 fails: report which line, and we open R14.5 as a pink correction.
