#!/usr/bin/env node
// Nightly mutation-testing runner (HLCE-264). Runs StrykerJS over the high-risk
// security modules from HLCE-263, one at a time (the harness is single-project,
// node-only — see docs/mutation-testing.md), and FAILS if any module's mutation
// score drops below its recorded floor. Designed for the scheduled CI job in
// .github/workflows/mutation.yml; non-gating for PRs (it's not a required check).
//
// Per-module floors are enforced here rather than via Stryker's single global
// `thresholds.break`: each module has its own floor, so we read the score out of
// Stryker's JSON report and compare. The floors are the ratchet — only raise them
// (in the same PR that raises the achieved score), never lower.
//
// Usage:
//   node scripts/mutation-ci.mjs            # all modules
//   node scripts/mutation-ci.mjs ratelimit  # one or more by name (local/dev)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// The recorded per-module mutation-score floors (HLCE-263 baselines, with
// headroom below the achieved scores for run-to-run variance). This list is the
// source of truth the nightly ratchet enforces; mirror it in docs/mutation-testing.md.
const MODULES = [
  { name: "secrets", src: "server/secrets.js", test: "server/secrets.test.js", floor: 95 },
  { name: "ratelimit", src: "server/ratelimit.js", test: "server/ratelimit.test.js", floor: 90 },
  { name: "mfa", src: "server/mfa.js", test: "server/mfa.test.js", floor: 85 },
  { name: "audit", src: "server/audit.js", test: "server/audit.test.js", floor: 78 },
  { name: "auth", src: "server/auth.js", test: "server/auth.test.js", floor: 78 },
];

const REPORT_DIR = "reports/mutation";
const JSON_REPORT = path.join(REPORT_DIR, "mutation.json");
const HTML_REPORT = path.join(REPORT_DIR, "mutation.html");

// Mutation score (total) = detected / (detected + undetected), where detected =
// Killed + Timeout and undetected = Survived + NoCoverage. Errors/Ignored are
// excluded from the denominator — matching Stryker's "total" metric.
function scoreFromJson(file) {
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  let killed = 0, timeout = 0, survived = 0, noCoverage = 0;
  for (const f of Object.values(report.files ?? {})) {
    for (const m of f.mutants ?? []) {
      if (m.status === "Killed") killed++;
      else if (m.status === "Timeout") timeout++;
      else if (m.status === "Survived") survived++;
      else if (m.status === "NoCoverage") noCoverage++;
    }
  }
  const detected = killed + timeout;
  const total = detected + survived + noCoverage;
  return {
    score: total === 0 ? 100 : (detected / total) * 100,
    killed, timeout, survived, noCoverage,
  };
}

const requested = process.argv.slice(2);
const modules = requested.length
  ? MODULES.filter((m) => requested.includes(m.name))
  : MODULES;
if (requested.length && modules.length !== requested.length) {
  console.error(`Unknown module(s): ${requested.filter((r) => !MODULES.some((m) => m.name === r)).join(", ")}`);
  process.exit(2);
}

const results = [];
for (const m of modules) {
  console.log(`\n=== Mutation: ${m.name} (floor ${m.floor}%) ===`);
  fs.rmSync(JSON_REPORT, { force: true });
  try {
    execFileSync("npx", ["stryker", "run", "--mutate", m.src], {
      stdio: "inherit",
      env: { ...process.env, MUTATION_TEST_FILE: m.test },
    });
  } catch (err) {
    // Stryker's break threshold is unset, so a non-zero exit means a real
    // failure (crash/timeout), not a score breach — record it as an error.
    console.error(`Stryker errored on ${m.name}: ${err.message}`);
  }
  if (!fs.existsSync(JSON_REPORT)) {
    results.push({ ...m, score: null, error: "no JSON report produced" });
    continue;
  }
  const s = scoreFromJson(JSON_REPORT);
  // Preserve this module's HTML report (Stryker overwrites it each run) so the
  // CI artifact carries all modules.
  if (fs.existsSync(HTML_REPORT)) fs.copyFileSync(HTML_REPORT, path.join(REPORT_DIR, `${m.name}.html`));
  results.push({ ...m, ...s });
}

console.log("\n──────────── Mutation summary ────────────");
let failed = false;
for (const r of results) {
  if (r.score === null) {
    failed = true;
    console.log(`✗ ${r.name.padEnd(10)} ERROR (${r.error})`);
    continue;
  }
  const ok = r.score >= r.floor;
  if (!ok) failed = true;
  console.log(
    `${ok ? "✓" : "✗"} ${r.name.padEnd(10)} ${r.score.toFixed(2)}% (floor ${r.floor}%)  ` +
    `[killed ${r.killed} / survived ${r.survived} / nocov ${r.noCoverage} / timeout ${r.timeout}]`
  );
}
console.log("──────────────────────────────────────────");

if (failed) {
  console.error("\nMutation score dropped below a recorded floor (or a module errored). See above.");
  process.exit(1);
}
console.log("\nAll modules at or above their mutation-score floor.");
