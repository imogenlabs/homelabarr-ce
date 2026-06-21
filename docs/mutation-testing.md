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
