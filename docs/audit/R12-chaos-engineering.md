# Round 12 — Chaos engineering: prove the controls hold when the floor falls out

**Target:** `smashingtags/homelabarr-ce` @ main `1170de586a` (== dev, R11.5 merged 2026-05-23T01:34:36Z)
**Live:** https://ce-demo.homelabarr.com/
**Date:** 2026-05-23
**Scope:** Resilience layer on top of R1–R11.5 security/compliance posture. Assume the controls hold; assume the *infrastructure* fails. Map each chaos experiment to expected behavior in the previously-shipped controls (R6 audit chain, R8 backup/restore, R10 attackTag IOC pipeline). This round adds **observed resilience evidence** to the compliance binder rather than new gates.
**Method:** Spec-only. Agent implements + runs the experiments. Owner observes. **No live exploitation.**

---

## §0 — Verification of R11.5 (carry-forward)

| # | R11.5 spec item | Live state (main @ 1170de586a) | Verdict |
|---|---|---|---|
| 1 | `compliance/collect-evidence.sh` adds R5 cosign verify section writing `R5-cosign.txt` | Present at offset 2978. `cosign verify` invoked, evidence file written, keyless/fulcio-style flags referenced. | CLEAN |
| 2 | `compliance/collect-evidence.sh` adds R6 audit-chain integrity check (assert prev hash == curr hash, write `{ok, bad, total}` JSON) | Present at offset 2632 but **block is only 341 bytes**. It runs `docker exec $BACKEND sh -c 'tail -n 50 /app/server/activity-data/audit-*.jsonl'` and writes raw tail to `R6-audit-chain.txt`. **No chain validation, no prev/curr comparison, no {ok, bad, total} JSON.** Partial implementation. | DRIFT — carry to L-1 below |
| 3 | `.github/workflows/compliance-evidence.yml` adds `sigstore/cosign-installer@<40-char-SHA>` pin step | Present: `sigstore/cosign-installer@f713795cb21599bc4e5c4b58cbad1da852d7eeb9`. SHA-pinned, valid. | CLEAN |
| 4 | `compliance/owasp-asvs-v4.0.3-L2.md` "Coverage roadmap" section listing V1/V8/V10/V11/V12 deferrals | Section present, all five chapters referenced. | CLEAN |

**R11.5 ship verdict:** 3 of 4 clean, 1 drift (R6 audit-chain validator is a tail-dump, not a validator). Carried forward as **L-1 (R12-carry)** below — does not warrant its own correction round, fold into R12.

---

## §1 — Goal of R12

Validate that the security posture shipped in R1–R11.5 **degrades gracefully** when the underlying infrastructure misbehaves. Specifically prove:

1. **Audit-log continuity (R6):** events are not silently dropped during pod kill, disk pressure, or network partition.
2. **Backup/restore (R8):** the documented restore runbook actually works against a clean-room rebuild (not just a "backup file exists" check).
3. **AttackTag pipeline (R10):** honey-route IOC emission survives backend restart and audit-log rotation.
4. **Rate-limit & CSP (R1, R2):** behavior under burst load + cold cache matches steady-state.
5. **Secret hygiene (R7):** no secrets leak via crash logs, core dumps, or restart noise.

---

## §2 — Current state

- No chaos experiments exist in the repo. Zero `litmus`, `chaos-mesh`, `pumba`, or `stress-ng` references.
- `docs/audit/R8-deployment-runbook.md` describes backup/restore conceptually but has never been exercised against a clean target.
- R10 pentest harness (`tests/pentest/atomics/`) hits live endpoints but assumes a healthy backend.
- No SLO/SLI definitions; no error budget; no documented "this is what graceful degradation looks like" baseline.
---

## §3 — Findings

### L-1 (R12-carry) — R6 audit-chain validator is a tail-dump, not a validator

**File:** `compliance/collect-evidence.sh` (main @ 1170de586a, offset 2632, block size 341B)

**Current (WRONG — partial R11.5 fix):**
```bash
# --- R6 audit log chain integrity ---
if command -v docker >/dev/null 2>&1 && docker ps -q --filter "name=$BACKEND" | grep -q .; then
  { hdr "R6 audit chain integrity (last 50 events)"
    docker exec "$BACKEND" sh -c 'tail -n 50 /app/server/activity-data/audit-*.jsonl 2>/dev/null || echo "no audit JSONL"'
  } > "$OUT/R6-audit-chain.txt"
fi
```

This only dumps content. It does not verify the chain. A broken chain (tampered, missing, or reordered events) will produce identical output to a healthy chain.

**Required (RIGHT — actual validator):**
```bash
# --- R6 audit log chain integrity ---
if command -v docker >/dev/null 2>&1 && docker ps -q --filter "name=$BACKEND" | grep -q .; then
  { hdr "R6 audit chain integrity"
    docker exec "$BACKEND" sh -c 'node -e "
      const fs = require(\"fs\");
      const path = require(\"path\");
      const dir = \"/app/server/activity-data\";
      const files = fs.readdirSync(dir).filter(f => /^audit-.*\\.jsonl$/.test(f)).sort();
      let prev = null, ok = 0, bad = 0, total = 0, first_bad = null;
      for (const f of files) {
        const lines = fs.readFileSync(path.join(dir, f), \"utf8\").split(\"\\n\").filter(Boolean);
        for (const line of lines) {
          total++;
          try {
            const e = JSON.parse(line);
            if (prev !== null && e.prev_hash !== prev) {
              bad++;
              if (!first_bad) first_bad = { seq: total, expected: prev, got: e.prev_hash };
            } else { ok++; }
            prev = e.hash;
          } catch (err) { bad++; if (!first_bad) first_bad = { seq: total, err: String(err) }; }
        }
      }
      console.log(JSON.stringify({ ok, bad, total, first_bad, files: files.length }));
    " 2>/dev/null || echo "{\"error\":\"audit-chain validator failed\"}"'
  } > "$OUT/R6-audit-chain.txt"
fi
```

**Acceptance:** `R6-audit-chain.txt` contains a single JSON object with keys `ok`, `bad`, `total`, `first_bad`, `files`. On a healthy stack `bad` must equal `0` and `ok + bad === total`. The exact field names `prev_hash` / `hash` must match the actual fields emitted by the R6 audit-log writer in `server/audit/` — if the writer uses different names (e.g. `prevHash` / `hash`), update the validator to match. **Read the source first, do not assume.**

---

### H-1 — No chaos experiments in the repo

**Files (new):**
- `chaos/README.md` — index of experiments, how to run, expected outcomes
- `chaos/experiments/01-pod-kill-backend.yml` — Litmus / Chaos Mesh manifest OR a plain `docker kill` shell wrapper
- `chaos/experiments/02-disk-pressure.yml`
- `chaos/experiments/03-network-partition-backend-nginx.yml`
- `chaos/experiments/04-memory-exhaustion.yml`
- `chaos/experiments/05-time-skew.yml` — NTP drift / clock jump (tests JWT `exp`, audit timestamps, rate-limit windows)
- `chaos/experiments/06-rapid-restart.yml` — kill/restart 5x in 60s
- `chaos/experiments/07-cold-cache-burst.yml` — wipe nginx cache, hit /api/auth/login at 50 req/s

**Each experiment file must contain (WRONG = file missing; RIGHT = file present with these sections):**

```markdown
# Experiment NN — <name>

## Hypothesis (steady state)
What is true *before* the chaos. E.g. "audit-chain integrity = 0 bad events, /api/health = 200, login p95 < 200ms"

## Method
Exact command(s) to inject the fault. Bounded blast radius. Time-boxed (max 5 min).

## Expected behavior under chaos
- R6 audit chain: <expected — events buffered? dropped? emitted on recovery?>
- R8 backup: <expected>
- R10 attackTag: <expected>
- User-facing: <expected — 5xx? slow? auth fails?>

## Steady-state recovery check
What must be true 60s after the fault clears. Includes a re-run of `compliance/collect-evidence.sh` and a diff against the pre-chaos evidence bundle.

## Run log
Captured stdout from agent run. Timestamp, observed metrics, deviations from expected.
```

**Acceptance per experiment:** the run-log section must show at least one successful run on the ce-demo stack with no observed deviation from "expected behavior under chaos." If a deviation is observed, file it as a finding in R12.5.

---

### H-2 — No SLO/SLI baseline so no way to detect "degraded but not failed"

**File (new):** `docs/audit/R12-slo.md`

Must define, at minimum:

| SLI | SLO target | Measurement |
|---|---|---|
| /api/health success rate | 99.9% over 30d | nginx access log, status 200 |
| Login p95 latency | < 300ms over 7d | nginx `$request_time` for POST /api/auth/login |
| Audit-chain integrity | bad == 0 (hard) | `R6-audit-chain.txt` from collect-evidence.sh |
| Attack-tag emission lag | < 5s from honey-route hit to audit-log entry | timestamp diff in audit JSONL |
| Container restart count | < 3 per 24h per service | `docker events` |

Error budget: stated explicitly. E.g. "0.1% of /api/health requests may fail per 30d window. Burning >50% of budget in <7d triggers a freeze on non-security deploys."

**WRONG:** file missing.
**RIGHT:** file present with the table above + error budget policy + "what tooling reads these" (Prometheus? raw log grep? Both noted as acceptable for a single-node ce-demo).

---

### M-1 — R8 backup runbook has never been exercised against a clean target

**File:** `docs/audit/R8-deployment-runbook.md` (add section)

**Current (WRONG):** runbook describes restore steps but has no "this was last successfully exercised on YYYY-MM-DD against a fresh VM" attestation.

**Required (RIGHT):**

Append a section:

```markdown
## Restore drill log

Each entry must contain:
- Date of drill
- SHA of main at time of drill
- VM/host used (must NOT be the production ce-demo host)
- Time-to-restore (clock-on-the-wall, from "docker compose down" on clean target to "compliance/collect-evidence.sh exit 0")
- Audit-chain integrity post-restore (ok / bad / total from R6-audit-chain.txt)
- Cosign verify post-restore (R5-cosign.txt result)
- Any manual steps required that aren't in the runbook (these become P0 runbook bugs)

### Drill 001 — <date> — <sha>
| field | value |
|---|---|
| host | <hostname/VM ID> |
| time-to-restore | <mm:ss> |
| audit-chain post-restore | <ok>/<bad>/<total> |
| cosign post-restore | <pass/fail> |
| manual interventions | <list or "none"> |
```

**Acceptance:** at least one Drill entry committed within 14 days of R12 ship. Cadence: one drill per quarter going forward (add to compliance roadmap in `compliance/owasp-asvs-v4.0.3-L2.md` Coverage roadmap section).

---

### M-2 — Crash logs are not inspected for secret leakage

**File (new):** `chaos/experiments/08-crash-log-scan.md`

After each chaos experiment that involves a crash/restart (01, 04, 06), the experiment must:

1. Capture `docker logs $SERVICE` from 60s before fault to 60s after recovery
2. Run a leak scan against the captured logs using the same patterns as R7 secrets scanning (the `compliance/collect-evidence.sh` R7 section)
3. Append findings to `chaos/leak-scan-results.txt`

**WRONG:** crash logs are not collected, scanned, or retained.
**RIGHT:** experiments 01, 04, 06 each include a "post-mortem leak scan" step that produces evidence in `chaos/leak-scan-results.txt`. Hits trigger an immediate R12.5 correction round.

**Acceptance:** `chaos/leak-scan-results.txt` exists post-first-run and contains either "no matches" per experiment OR specific hits with file+line references.

---

### L-2 — R10 atomics assume a healthy backend; no "atomics-during-chaos" variant

**File:** `tests/pentest/atomics/README.md` (extend)

Add a section:

```markdown
## Running atomics during chaos

For each chaos experiment in `chaos/experiments/`, the following atomics should be re-run *during the fault window* and *60s after recovery*:

- 01_unauth_admin_routes.sh
- 04_honey_route_emission.sh
- 09_audit_log_continuity.sh (NEW — see below)
- 13_rate_limit_burst.sh

### 09_audit_log_continuity.sh (NEW)

Generates 100 known events (login failures with a unique tag), then asserts all 100 appear in the audit log with correct chain hashes. Pass criterion: 100/100 events present, 0 chain breaks. Used during chaos experiments to detect dropped events.
```

**WRONG:** atomics directory has 15 scripts, none of which are designed to detect *dropped* events under load.
**RIGHT:** new atomic `09_audit_log_continuity.sh` exists. README section above present. Chaos experiments 01, 04, 06 each invoke this atomic during their fault window.

---

### L-3 — Time skew is not modeled; JWT `exp` and rate-limit windows are clock-dependent

**File (new):** `chaos/experiments/05-time-skew.yml` (covered in H-1 but called out separately because it's the highest-risk non-obvious failure mode)

**Test cases:**
1. Backend clock jumps +1h forward so all unexpired JWTs become "expired" so users force-logged-out simultaneously — does the rate limiter block their re-login attempts as a burst?
2. Backend clock jumps -1h backward so audit-log timestamps become non-monotonic — does the chain validator (L-1 fix above) flag this as `bad`?
3. NTP drift of 30s between nginx host and backend container — does session refresh get caught in a skew loop?

**Acceptance:** experiment file exists with all three test cases, each with a hypothesis + observed behavior + remediation if deviation found.
---

## §4 — Verification commands (for agent self-check before declaring ship)

```bash
# 1. R11.5 carry-forward: R6 validator must be JSON, not tail
docker exec $BACKEND sh -c 'cat /app/server/activity-data/audit-*.jsonl | wc -l'  # baseline event count
bash compliance/collect-evidence.sh
cat evidence-out/R6-audit-chain.txt | jq .  # MUST parse as JSON, must have ok/bad/total keys
test "$(jq .bad evidence-out/R6-audit-chain.txt)" = "0" || echo "FAIL: chain has breaks"

# 2. Chaos experiment files
test -d chaos/experiments || echo "FAIL: chaos dir missing"
for n in 01 02 03 04 05 06 07; do
  ls chaos/experiments/$n-*.yml chaos/experiments/$n-*.md 2>/dev/null | head -1 \
    || echo "FAIL: experiment $n missing"
done

# 3. SLO doc
test -f docs/audit/R12-slo.md || echo "FAIL: SLO doc missing"
grep -qE "p95|99\.9|error budget" docs/audit/R12-slo.md || echo "FAIL: SLO doc lacks targets"

# 4. R8 restore drill log
grep -q "Drill 001" docs/audit/R8-deployment-runbook.md || echo "FAIL: no drill log entry"

# 5. Crash log leak scan output
test -f chaos/leak-scan-results.txt || echo "WARN: leak scan not yet run"

# 6. New atomic
test -x tests/pentest/atomics/09_audit_log_continuity.sh || echo "FAIL: atomic 09 missing"

# 7. R10 atomics still pass on healthy stack
bash tests/pentest/run-all.sh && echo "OK: atomics still green on healthy stack"
```

---

## §5 — Out of scope for R12

- Migrating to Kubernetes to run Litmus/Chaos Mesh natively. Single-node Docker Compose with `docker kill` / `docker pause` / `tc qdisc` / `stress-ng` is sufficient for ce-demo.
- Continuous chaos (gameday is fine; production continuous chaos is not).
- Customer-facing SLA. The SLO doc is internal; no external commitments.
- Multi-region failover (single-node demo).

---

## §6 — Owner pile (human-only decisions, not agent work)

| # | Decision | Why owner | Recommended |
|---|---|---|---|
| O-1 | Pick a quarterly chaos gameday cadence and put it on the calendar | Requires owner's calendar | One half-day per quarter |
| O-2 | Pick error budget burn policy: freeze deploys, page on-call, or just record | Business decision | Record + alert; no auto-freeze on a single-node demo |
| O-3 | Decide whether the R8 restore drill VM is a permanent test host or spun up on demand | Cost vs convenience | On-demand (cheaper, more realistic) |
| O-4 | Outstanding from prior rounds: audit-log off-box destination (syslog-TLS / S3 Object Lock ~\$0.50/mo / accept gap) | Cost decision | Still pending owner pick |

**Reminder:** agent has CF API + GH access. Anything touching Cloudflare DNS, GitHub workflows, repo settings, or branch protection is NOT owner work — that's agent work.

---

## §7 — Deliverable shape (what the agent commits)

```
chaos/
  README.md
  experiments/
    01-pod-kill-backend.yml         (or .md if shell-wrapped)
    02-disk-pressure.yml
    03-network-partition-backend-nginx.yml
    04-memory-exhaustion.yml
    05-time-skew.yml
    06-rapid-restart.yml
    07-cold-cache-burst.yml
    08-crash-log-scan.md
  leak-scan-results.txt             (generated; .gitignore the empty version)
docs/audit/
  R12-slo.md
  R12-chaos-engineering.md          (this file, copied in)
  R8-deployment-runbook.md          (extended with drill log section)
compliance/
  collect-evidence.sh               (R6 validator replaced per L-1 above)
tests/pentest/atomics/
  09_audit_log_continuity.sh        (new)
  README.md                         (extended)
```

**Ship message template:**
```
R12: chaos engineering + R11.5 carry

- Replaced R6 audit-chain tail-dump with proper validator emitting {ok, bad, total} JSON
- Added 8 chaos experiments under chaos/experiments/
- Added SLO doc with 5 SLIs + error budget policy
- Extended R8 runbook with restore-drill log + ran Drill 001
- Added atomic 09_audit_log_continuity.sh
- Extended R10 atomics README with chaos-window invocation guidance

Verification: bash compliance/collect-evidence.sh && jq .bad evidence-out/R6-audit-chain.txt == 0
```

---

## §8 — End of round / loop

If everything in §4 passes: ship and report back. R13 will be the **threat-model formalization** round (STRIDE per data-flow, attack trees per asset class, mapping back to R1–R12 controls) — i.e. assemble the security work to date into a defensible threat model document rather than a list of findings.

If anything in §4 fails: report which line, and we open R12.5 as a pink correction.
