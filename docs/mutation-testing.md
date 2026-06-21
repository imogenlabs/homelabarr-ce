# Mutation testing (StrykerJS)

Mutation testing measures how good the test suite is at *catching bugs*, not just
how many lines it executes. [StrykerJS](https://stryker-mutator.io/) makes small
changes ("mutants") to the source — flip a `>` to `>=`, swap `&&` for `||`, drop a
`!` — and re-runs the tests. A mutant that makes a test fail is **killed** (good);
one that all tests still pass against **survives** (a blind spot in the suite).

This is the scoped harness from HLCE-262. CI wiring and score thresholds are
deliberately out of scope here (HLCE-263 / HLCE-264).

## Run it

```bash
npm run test:mutation        # = stryker run
# or
npx stryker run
```

Reports land in `reports/mutation/` (gitignored):

- `mutation.html` — interactive, mutant-by-mutant report (open in a browser)
- the `clear-text` reporter also prints every surviving mutant + the score table
  to the console.

## Scope: which file gets mutated

The harness is intentionally scoped to **one backend file at a time** — a full-repo
run is slow and isn't needed to act on the results. Two knobs control the scope:

| What to change | Where |
|----------------|-------|
| Source file(s) being mutated | `mutate` in `stryker.conf.json` |
| Test file(s) Stryker runs | `include` in `stryker.vitest.config.ts` |

To point the harness at a different backend file, set both — e.g. to mutate
`server/audit.js`:

```jsonc
// stryker.conf.json
"mutate": ["server/audit.js"]
```
```ts
// stryker.vitest.config.ts
include: ["server/audit.test.js"]
```

You can also override the source glob ad-hoc without editing the config:

```bash
npx stryker run --mutate "server/audit.js"
```

## Why a separate Vitest config (the multi-project decision)

The repo's `vite.config.ts` defines **two Vitest projects** — `server` (node) and
`web` (jsdom). Stryker's Vitest runner boots Vitest from a single config and has no
clean way to target one project, so pointing it at the root config makes it spin up
the jsdom/React project even for a pure-backend mutant.

The harness sidesteps this with a dedicated **single-project, node-environment**
config, `stryker.vitest.config.ts`, referenced from `stryker.conf.json` via
`vitest.configFile`. Nothing but `stryker run` reads it, so the normal
`npm test` / `npm run test:coverage` gate is completely unaffected.

When the epic expands to frontend (jsdom) files, add a second Stryker/Vitest config
pair pointed at the `web` environment rather than trying to make one config serve
both.

## Baseline (HLCE-262, `server/ratelimit.js`)

First scoped run, against the brute-force defense module:

| Metric | Value |
|--------|-------|
| Mutation score (total) | **83.52%** |
| Mutation score (covered) | **85.39%** |
| Killed | 76 |
| Survived | 13 |
| No coverage | 2 |
| Errors | 0 |

The 13 survivors are the suite's blind spots in this file (e.g. the limiter's
`legacyHeaders` flag and the `15 * 60 * 1000` window arithmetic aren't asserted
end-to-end). Hardening those — and rolling the harness across more high-risk files
with a score threshold — is HLCE-263.

## Per-module baselines (HLCE-263)

HLCE-263 ran the harness across the five security-critical backend modules,
triaged every surviving mutant, and hardened the suites until each cleared the
**80% mutation-score floor** (AC3). The dangerous-op route files
(`containers.js` / `deploy.js` / `applications.js`) were being rewritten on a
parallel branch and are deferred to a later pass.

| Module | Before | After | Recorded floor | Notes |
|--------|--------|-------|----------------|-------|
| `server/secrets.js`   | 81.58% | **100.00%** | 95% | All mutants killed (lowercase Docker path, default `/run/secrets`, trailing-trim regex, `_FILE`-existence guard). |
| `server/ratelimit.js` | 83.52% | **97.80%**  | 90% | 2 equivalent survivors: the limiter-config `windowMs` (the custom `SqliteStore` supplies its own `resetTime`, so the config window is inert). |
| `server/mfa.js`       | 81.82% | **90.91%**  | 85% | 6 equivalent survivors (see below). |
| `server/audit.js`     | 66.46% | **81.37%**  | 78% | Equivalent/masked survivors (see below). |
| `server/auth.js`      | 61.60% | **80.61%**  | 78% | 526 mutants; residual survivors are logger-message strings + defensive `!== -1` guards + a post-compare regex (see below). |

These floors are **recorded only** — the build-breaking `thresholds.break`
enforcement (which would fail CI when a score regresses) is HLCE-264. They are
set a few points under each module's measured "after" score to absorb the small
run-to-run variance Stryker shows with the Vitest runner.

### Documented equivalent mutants

A mutant is *equivalent* when it changes the source without changing any
observable behaviour, so no test can kill it. Rather than delete mutators to
inflate the score, HLCE-263 leaves these and documents them in the matching
`*.test.js` header. The notable classes:

- **`ratelimit.js:47`** — `createLoginLimiter`'s `windowMs`. `express-rate-limit`
  only uses its own `windowMs` to compute the reset window when the store does
  not provide one; the `SqliteStore` always returns an explicit `resetTime`, so
  the config value is inert (verified empirically).
- **`mfa.js`** — `readFileSync('utf8')` (Node's `JSON.parse` decodes a Buffer the
  same way), `new Secret({ size: 20 })` (otpauth's default size IS 20), the
  `verifyTotp` issuer/label (cosmetic — `validate()` ignores them), and
  `verifyBackupCode`'s `i < hashes.length` → `<=` (the extra slot is `undefined`,
  which the loop's guard skips).
- **`audit.js`** — the `DailyRotateFile`/winston config (the file transport is
  mocked to a no-op), `hashAuditRow`'s private field fallbacks (used identically
  by write + verify, so the round-trip can't observe them), the `id_gap` branch
  (the `prev_hash` walk catches a gap first), and the equal-count / empty-with-tip
  truncation clauses (masked by the leading `rows.length < tip.count` clause).
- **`auth.js`** — `logger.*('message')` argument strings (no code branches on log
  text), the post-`bcrypt.compare` cost regex / optional-chaining (runs only when
  the password is already a valid bcrypt hash, so `.match()` is never null), the
  defensive `userIndex !== -1` guards (the located user is always present in
  normal flow), and the legacy-Bearer warning branch (logging-only side effect).

### Re-running a single module

The committed `stryker.conf.json` + `stryker.vitest.config.ts` are scoped to one
module as a worked example; point both at another module to reproduce its score:

```bash
# stryker.conf.json     -> "mutate": ["server/auth.js"]
# stryker.vitest.config.ts -> include: ["server/auth.test.js"]
npm run test:mutation
# or, ad-hoc without editing the config (still set the vitest include to match):
npx stryker run --mutate "server/auth.js"
```

## Nightly mutation CI (HLCE-264)

Mutation is too slow to gate every PR, so it runs on a schedule instead.
`.github/workflows/mutation.yml` runs nightly (06:17 UTC) and on manual
`workflow_dispatch`, on free hosted `ubuntu-latest`. It is **not a required
status check** — a breach never blocks a merge; it's an over-time signal.

The job runs `node scripts/mutation-ci.mjs`, which mutation-tests each high-risk
module **one at a time** (the harness is single-project/node-only) by overriding
`--mutate` and setting `MUTATION_TEST_FILE` for the vitest include, then reads the
score out of Stryker's JSON report (`reports/mutation/mutation.json`) and **fails
the job if any module is below its recorded floor**:

| Module | Floor |
|--------|-------|
| `secrets.js` | 95% |
| `ratelimit.js` | 90% |
| `mfa.js` | 85% |
| `audit.js` | 78% |
| `auth.js` | 78% |

These floors live in `scripts/mutation-ci.mjs` (the source of truth the ratchet
enforces) — **only ever raise them**, in the same PR that raises the achieved
score, mirroring the coverage ratchet. The per-module HTML reports upload as the
`mutation-report` artifact (14-day retention) even on a breach, so a drop can be
triaged.

Run it locally the same way CI does (all modules, or a subset by name):

```bash
node scripts/mutation-ci.mjs            # all five modules
node scripts/mutation-ci.mjs ratelimit  # just one (faster, for iterating)
```

**Runtime:** each module is a separate Stryker run at `concurrency: 2`; on hosted
CI the full five-module sweep lands within the job's 30-minute budget (≈1 min for
a small module like `ratelimit` locally, more for `auth`/`audit`). Scoping to the
five high-risk modules — not the whole repo — is what keeps it bounded.
