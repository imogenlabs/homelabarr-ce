# HomelabARR CE Changelog

Latest releases and what changed in each.


## [Unreleased]

### ⬆️ Dependencies & Framework
- **React 18 → 19**: upgraded `react`, `react-dom`, and their `@types` to 19.2.7. Resolves the recurring mismatched-major hazard where Dependabot tried to bump `react-dom` to 19 alone.
- **shadcn/ui modernization**: all `React.forwardRef` wrappers across the 16 `ui/` components converted to React 19 ref-as-prop. No behavioral change.
- **lucide-react 0.344 → 1.21** (React 19 peer support), **radix-ui** group to latest, **dockerode** 4 → 5, **better-sqlite3** 12.11.1, **nodemailer** 8 → 9, **@types/node** 26.

### ✅ Tests
- Added the project's first unit test (`server/email.test.js`) covering the email transporter and nodemailer 9.

---

## [v2.3.0] - 2026-08-12

### 🚀 Features

- swap octopus for new HomelabARR mascot (placeholder) by @smashingtags in #151

### 🐛 Bug Fixes

- whitelabel-audit workflow opens PR instead of direct push by @smashingtags in #156
- harden users.json loader + DialogDescription a11y by @smashingtags in #165

### 📚 Documentation

- changelog for v2.2.0 by @github-actions[bot] in #149
- add White-Label & Forking guide (self-maintaining) by @smashingtags in #152
- remove Pro Edition section + Author → Developer by @smashingtags in #155
- flatten nav + move Discord/Discussions to header icons by @smashingtags in #160
- refresh CE UI screenshots (dark + light) by @smashingtags in #161
- fix broken README mascot image by @smashingtags in #163

### ⬆️ Dependencies

- bump hono from 4.12.12 to 4.12.14 in the npm_and_yarn group across 1 directory by @dependabot[bot] in #167
- bump the npm_and_yarn group across 1 directory with 5 updates by @dependabot[bot] in #170
- bump the actions group across 1 directory with 14 updates by @dependabot[bot] in #198
- bump nginx from 1.31-alpine to 1.31.1-alpine by @dependabot[bot] in #210
- bump @babel/plugin-transform-react-jsx-source from 7.27.1 to 7.29.7 by @dependabot[bot] in #214
- bump the actions group across 1 directory with 3 updates by @dependabot[bot] in #222
- bump express and @types/express by @dependabot[bot] in #213
- bump better-sqlite3-multiple-ciphers from 11.10.0 to 12.10.0 by @dependabot[bot] in #215
- bump react-markdown from 9.1.0 to 10.1.0 by @dependabot[bot] in #216
- bump vitest and @vitest/ui by @dependabot[bot] in #224
- bump the dev-tools group across 1 directory with 37 updates by @dependabot[bot] in #227
- bump nginx from `d1aedbc` to `8b1e787` by @dependabot[bot] in #246
- bump the radix-ui group across 1 directory with 38 updates by @dependabot[bot] in #250
- bump nginx from 1.31.1-alpine to 1.31.2-alpine by @dependabot[bot] in #323
- bump the dev-tools group across 1 directory with 15 updates by @dependabot[bot] in #361
- bump the actions group across 1 directory with 3 updates by @dependabot[bot] in #324
- bump helmet from 7.2.0 to 8.2.0 by @dependabot[bot] in #351
- bump dockerode from 5.0.0 to 5.0.1 by @dependabot[bot] in #360
- bump @ungap/structured-clone from 1.3.1 to 1.3.2 by @dependabot[bot] in #356
- bump actions/setup-python from 6.2.0 to 6.3.0 in the actions group across 1 directory by @dependabot[bot] in #363
- bump the actions group with 7 updates by @dependabot[bot] in #381
- bump range-parser from 1.2.1 to 1.3.0 by @dependabot[bot] in #373
- bump nan from 2.27.0 to 2.28.0 by @dependabot[bot] in #372
- bump nginx from `2031656` to `54f2a90` by @dependabot[bot] in #374
- bump tar-fs from 2.1.4 to 2.1.5 by @dependabot[bot] in #375
- bump lucide-react from 1.21.0 to 1.22.0 by @dependabot[bot] in #376
- bump the dev-tools group across 1 directory with 49 updates by @dependabot[bot] in #416
- bump the actions group across 1 directory with 8 updates by @dependabot[bot] in #414
- bump fast-uri from 3.1.2 to 3.1.4 by @dependabot[bot] in #413
- bump the radix-ui group across 1 directory with 37 updates by @dependabot[bot] in #410
- bump nginx from 1.31.2-alpine to 1.31.3-alpine by @dependabot[bot] in #403
- bump @protobufjs/utf8 from 1.1.1 to 1.1.2 by @dependabot[bot] in #400
- bump protobufjs from 7.6.4 to 7.6.5 by @dependabot[bot] in #399
- bump helmet from 8.2.0 to 8.3.0 by @dependabot[bot] in #398
- bump brace-expansion from 5.0.6 to 5.0.8 by @dependabot[bot] in #412
- bump the dev-tools group across 1 directory with 32 updates by @dependabot[bot] in #436
- bump the actions group across 1 directory with 5 updates by @dependabot[bot] in #433
- bump node from `2bdb65e` to `d32cdf6` by @dependabot[bot] in #440
- bump the dev-tools group with 3 updates by @dependabot[bot] in #442
- bump @base-ui/react from 1.6.0 to 1.7.0 by @dependabot[bot] in #443
- bump ipaddr.js from 2.4.0 to 2.5.0 by @dependabot[bot] in #444
- bump react-dom and @types/react-dom by @dependabot[bot] in #447
- bump google/osv-scanner-action/osv-scanner-action from 2.3.8 to 2.5.0 in the actions group by @dependabot[bot] in #441
- bump the dev-tools group with 2 updates by @dependabot[bot] in #450
- bump lucide-react from 1.22.0 to 1.30.0 by @dependabot[bot] in #451
- bump nodemailer from 9.0.1 to 9.0.5 by @dependabot[bot] in #453

### 🔧 Maintenance

- remove stale tracked files by @smashingtags in #150
- remove stale octopus favicons by @smashingtags in #153
- optimize app icons (PNG → WebP, 5.9MB → 1.2MB) by @smashingtags in #154
- remove unused react-query, bump shadcn (kills all npm deprecation warnings) by @smashingtags in #158
- regenerate white-label audit by @github-actions[bot] in #159
- regenerate white-label audit by @github-actions[bot] in #162
- regenerate white-label audit by @github-actions[bot] in #164
- regenerate white-label audit by @github-actions[bot] in #166
- regenerate white-label audit by @github-actions[bot] in #168
- bump hono from 4.12.12 to 4.12.14 in the npm_and_yarn group across 1 directory by @dependabot[bot] in #167
- bump the npm_and_yarn group across 1 directory with 5 updates by @dependabot[bot] in #170
- regenerate white-label audit by @github-actions[bot] in #169
- regenerate white-label audit by @github-actions[bot] in #171
- regenerate white-label audit by @github-actions[bot] in #172
- regenerate white-label audit by @github-actions[bot] in #173
- bump the actions group across 1 directory with 14 updates by @dependabot[bot] in #198
- regenerate white-label audit by @github-actions[bot] in #207
- bump nginx from 1.31-alpine to 1.31.1-alpine by @dependabot[bot] in #210
- bump @babel/plugin-transform-react-jsx-source from 7.27.1 to 7.29.7 by @dependabot[bot] in #214
- bump the actions group across 1 directory with 3 updates by @dependabot[bot] in #222
- regenerate white-label audit by @github-actions[bot] in #209
- bump express and @types/express by @dependabot[bot] in #213
- bump better-sqlite3-multiple-ciphers from 11.10.0 to 12.10.0 by @dependabot[bot] in #215
- bump react-markdown from 9.1.0 to 10.1.0 by @dependabot[bot] in #216
- bump vitest and @vitest/ui by @dependabot[bot] in #224
- bump the dev-tools group across 1 directory with 37 updates by @dependabot[bot] in #227
- bump nginx from `d1aedbc` to `8b1e787` by @dependabot[bot] in #246
- bump the radix-ui group across 1 directory with 38 updates by @dependabot[bot] in #250
- regenerate white-label audit by @github-actions[bot] in #261
- regenerate white-label audit by @github-actions[bot] in #281
- regenerate white-label audit by @github-actions[bot] in #283
- regenerate white-label audit by @github-actions[bot] in #286
- regenerate white-label audit by @github-actions[bot] in #290
- bump nginx from 1.31.1-alpine to 1.31.2-alpine by @dependabot[bot] in #323
- bump the dev-tools group across 1 directory with 15 updates by @dependabot[bot] in #361
- bump the actions group across 1 directory with 3 updates by @dependabot[bot] in #324
- bump helmet from 7.2.0 to 8.2.0 by @dependabot[bot] in #351
- bump dockerode from 5.0.0 to 5.0.1 by @dependabot[bot] in #360
- bump @ungap/structured-clone from 1.3.1 to 1.3.2 by @dependabot[bot] in #356
- regenerate white-label audit by @github-actions[bot] in #362
- bump actions/setup-python from 6.2.0 to 6.3.0 in the actions group across 1 directory by @dependabot[bot] in #363
- regenerate white-label audit by @github-actions[bot] in #364
- bump the actions group with 7 updates by @dependabot[bot] in #381
- bump range-parser from 1.2.1 to 1.3.0 by @dependabot[bot] in #373
- bump nan from 2.27.0 to 2.28.0 by @dependabot[bot] in #372
- regenerate white-label audit by @github-actions[bot] in #366
- bump nginx from `2031656` to `54f2a90` by @dependabot[bot] in #374
- bump tar-fs from 2.1.4 to 2.1.5 by @dependabot[bot] in #375
- bump lucide-react from 1.21.0 to 1.22.0 by @dependabot[bot] in #376
- regenerate white-label audit by @github-actions[bot] in #386
- bump the dev-tools group across 1 directory with 49 updates by @dependabot[bot] in #416
- bump the actions group across 1 directory with 8 updates by @dependabot[bot] in #414
- bump fast-uri from 3.1.2 to 3.1.4 by @dependabot[bot] in #413
- bump the radix-ui group across 1 directory with 37 updates by @dependabot[bot] in #410
- bump nginx from 1.31.2-alpine to 1.31.3-alpine by @dependabot[bot] in #403
- bump @protobufjs/utf8 from 1.1.1 to 1.1.2 by @dependabot[bot] in #400
- bump protobufjs from 7.6.4 to 7.6.5 by @dependabot[bot] in #399
- bump helmet from 8.2.0 to 8.3.0 by @dependabot[bot] in #398
- regenerate white-label audit by @github-actions[bot] in #394
- bump brace-expansion from 5.0.6 to 5.0.8 by @dependabot[bot] in #412
- regenerate white-label audit by @github-actions[bot] in #417
- bump the dev-tools group across 1 directory with 32 updates by @dependabot[bot] in #436
- bump the actions group across 1 directory with 5 updates by @dependabot[bot] in #433
- regenerate white-label audit by @github-actions[bot] in #425
- regenerate white-label audit by @github-actions[bot] in #439
- bump node from `2bdb65e` to `d32cdf6` by @dependabot[bot] in #440
- bump the dev-tools group with 3 updates by @dependabot[bot] in #442
- bump @base-ui/react from 1.6.0 to 1.7.0 by @dependabot[bot] in #443
- bump ipaddr.js from 2.4.0 to 2.5.0 by @dependabot[bot] in #444
- bump react-dom and @types/react-dom by @dependabot[bot] in #447
- bump google/osv-scanner-action/osv-scanner-action from 2.3.8 to 2.5.0 in the actions group by @dependabot[bot] in #441
- regenerate white-label audit by @github-actions[bot] in #448
- bump the dev-tools group with 2 updates by @dependabot[bot] in #450
- bump lucide-react from 1.22.0 to 1.30.0 by @dependabot[bot] in #451
- bump nodemailer from 9.0.1 to 9.0.5 by @dependabot[bot] in #453
- regenerate white-label audit by @github-actions[bot] in #449
- regenerate white-label audit by @github-actions[bot] in #455

### 🏗️ Infrastructure

- bump Playwright workers from 1 to 4 by @smashingtags in #157
- auto-build :dev on dev pushes (ce-dev auto-deploy) by @smashingtags in #249


- Add OWNER-PUNCHLIST for project management by @smashingtags in #203
- HLCE-182: revert cosign-installer to v3 (fix red build from #222) by @smashingtags in #228
- HLCE-182: fix cosign verify identity (org migration smashingtags->imogenlabs) by @smashingtags in #229
- HLCE-183: fix vitest e2e exclusion + drop deprecated tsconfig baseUrl by @smashingtags in #230
- HLCE-184: manualChunks function form for Vite 8/rolldown (unblocks #227) by @smashingtags in #231
- HLCE-185: run security/compliance CI suite on self-hosted runners by @smashingtags in #232
- HLCE-185: revert to GitHub-hosted (public repo = free minutes; self-hosted blocked for public) by @smashingtags in #233
- HLCE-186: fix backend crash loop (path-to-regexp override vs Express 5) by @smashingtags in #234
- HLCE-187: fix DAST Baseline duplicate-artifact 409 by @smashingtags in #236
- HLCE-188: TruffleHog (CI) + Betterleaks (pre-commit) — drop license-blocked gitleaks-action by @smashingtags in #237
- HLCE-189: fix compose-security-validation install (mkdir -p ~/.local/bin) by @smashingtags in #238
- HLCE-189: fix compose validation step (filter + --no-interpolate) + tubesync volume by @smashingtags in #239
- HLCE-189: validate compose templates as YAML+services (runner-stable) by @smashingtags in #240
- HLCE-190: scope docker vuln scan to own images + fix multi-run SARIF by @smashingtags in #241
- HLCE-191: rewrite E2E suite to run the real product locally by @smashingtags in #242
- Release dev → main: HLCE-191 E2E + INFRA-64/70 cleanup by @smashingtags in #243
- HLCE-192: stabilize E2E on CI (cold-hydration timeouts + docker-free harness) by @smashingtags in #244
- Release dev → main: /auth/me reload fix, E2E on ce-dev, Dependabot unblock by @smashingtags in #248
- HLCE-199: React 18 → 19 upgrade (core bump + forwardRef modernization) by @smashingtags in #273
- HLCE-202: roll up Dependabot deps + fix lucide-react React 19 peer by @smashingtags in #276
- HLCE-202: roll up remaining Dependabot PRs (radix transitive, dev-tools, nodemailer) by @smashingtags in #277
- HLCE-202: nodemailer 9 regression test + React 19 changelog by @smashingtags in #278
- HLCE-199: documentation sweep for React 19 upgrade by @smashingtags in #280
- HLCE-199: fix broken wiki links (strict mkdocs build passes) by @smashingtags in #282
- HLCE-194: migrate GHCR namespace + deploy wiring smashingtags → imogenlabs by @smashingtags in #285
- HLCE-195: build-push workflow manual-dispatch only (minutes out is permanent) by @smashingtags in #287
- HLCE-197: add CodeQL SAST workflow by @smashingtags in #288
- HLCE-199: pages.yml → ubuntu-latest (unblock wiki publish) by @smashingtags in #289
- HLCE-203: revert pages.yml to self-hosted (gitrunners fixed) by @smashingtags in #291
- HLCE-204: pages.yml on ubuntu-latest (public repo cannot use self-hosted runners) by @smashingtags in #293
- HLCE-210: test harness + Wave 1 unit tests (166 green) by @smashingtags in #294
- HLCE-211: Unit/coverage CI gate on ubuntu-latest with ratcheting floor by @smashingtags in #295
- HLCE-212: Unit tests for auth core (JWT, bcrypt, API keys, secrets) by @smashingtags in #296
- HLCE-214: Unit tests for MFA (TOTP + backup codes) by @smashingtags in #297
- HLCE-209: CHANGELOG for Wave-2 auth + MFA tests (HLCE-212, HLCE-214) by @smashingtags in #298
- HLCE-215: tests for rate-limit & account lockout by @smashingtags in #299
- HLCE-216: supertest integration tests for auth HTTP routes by @smashingtags in #300
- HLCE-221: persistence-integrity tests (db / stars / activity / loggers) by @smashingtags in #301
- HLCE-217: audit hash-chain + secure-logging tests (audit/log/alert) by @smashingtags in #302
- HLCE-256: fix SQLCipher encryption-at-rest init (key before WAL) by @smashingtags in #303
- HLCE-219: docker-manager tests (mocked dockerode) by @smashingtags in #304
- HLCE-220: deploy/SSE + startup-guard + network tests by @smashingtags in #305
- HLCE-223: React contexts & hooks tests (AuthContext 100%) by @smashingtags in #306
- HLCE-225: high-value component tests (RTL) by @smashingtags in #307
- HLCE-228: Bug-lock regression — fix safeUrl / deployment.ts / cli-bridge appId by @smashingtags in #308
- HLCE-227: Security-invariant regression suite (permanent guardrails) by @smashingtags in #309
- HLCE-229: integration tests for dangerous ops (delete, deploy spawn, down -v) by @smashingtags in #310
- HLCE-259: fix SSE broadcast skipping a client after a failing one by @smashingtags in #311
- HLCE-255: make login limiter's skipSuccessfulRequests effective by @smashingtags in #312
- HLCE-257: frame audit row_hash with JSON to close boundary-ambiguous tamper by @smashingtags in #313
- HLCE-258: probe the Docker daemon instead of hardcoding healthy by @smashingtags in #314
- HLCE-254: enforce react-hooks v7 rules as errors by @smashingtags in #315
- HLCE-226: Playwright E2E seeded target + critical journeys (and fix deploy 404) by @smashingtags in #316
- HLCE-260: README — E2E lanes + app count 117 by @smashingtags in #317
- HLCE-265: /health/detail 200→500 on internal error by @smashingtags in #318
- HLCE-266: validation path check case-insensitive on field key by @smashingtags in #319
- HLCE-268: unify password minimum length to 12 by @smashingtags in #320
- HLCE-267: validate container web port in all enhanced-mount handlers by @smashingtags in #321
- HLCE-269: detect audit-log tail truncation (chain tip) by @smashingtags in #322
- HLCE-262: StrykerJS mutation-testing harness + scoped baseline by @smashingtags in #325
- HLCE-271: integration tests for untested backend routes (+ Router() bug fix) by @smashingtags in #326
- HLCE-272: frontend security-component tests + lib/api gaps (+ password-min fix) by @smashingtags in #327
- HLCE-273: deploy-execution + backend-branch coverage (+ dead-code removal) by @smashingtags in #328
- HLCE-274: E2E round 2 — failure/permission/account journeys + harden (+ mount-wizard stub, bug fix) by @smashingtags in #329
- HLCE-275: make GET /containers?stats=true non-blocking (async exec) by @smashingtags in #331
- HLCE-263: mutation pass on high-risk security modules (≥80% score) by @smashingtags in #332
- HLCE-264: nightly mutation-testing CI + per-module score ratchet by @smashingtags in #333
- HLCE-276: client port-conflict validation for text-typed catalog port fields by @smashingtags in #335
- HLCE-278: cover the remaining enhanced-mount route handlers by @smashingtags in #336
- HLCE-277: mutation pass on the dangerous-op routes (+ final coverage ratchet) by @smashingtags in #337
- HLCE-280: frontend security fixes (rclone XSS, credential log, port validation) by @smashingtags in #338
- HLCE-282: audit/log/alert/db hardening (redaction drift, SQLCipher, alert) by @smashingtags in #339
- HLCE-281: cli-bridge — stop process.env pollution + deployStandard hardening by @smashingtags in #340
- HLCE-283: mandatory CSRF token + route hardening (health path, dockerode stats) by @smashingtags in #341
- HLCE-285: harden auth routes — cli-mint jti-less+ttl, constant-time validatePassword, MFA invariant pins by @smashingtags in #342
- HLCE-284: track Docker/SSE timers, fix health lie, lock down SSE CORS + subscribe auth by @smashingtags in #343
- HLCE-279: ratchet coverage floor + consolidated remediation CHANGELOG by @smashingtags in #344
- HLCE-288: deploy.js outer catch is unreachable — trim dead branches + pin parser boundary by @smashingtags in #345
- HLCE-287: out-of-band HMAC-signed audit chain-tip anchor by @smashingtags in #346
- HLCE-286: CHANGELOG for audit anchor + deploy-catch cleanup by @smashingtags in #348
- HLCE-287: document AUDIT_ANCHOR_KEY + out-of-band audit anchor by @smashingtags in #349
- HLCE-291: resolve open code-scanning alerts by @smashingtags in #354
- HLCE-291: make log-injection sanitizer CodeQL-recognized by @smashingtags in #355
- HLCE-290: restore Trivy default-branch reporting by @smashingtags in #353
- HLCE-290: patch npm-bundled undici (CVE-2026-12151) in backend image by @smashingtags in #365
- HLCE-290: fix undici patch — pack-and-replace npm's bundled copy by @smashingtags in #367
- HLCE-293: restore dual-registry auto-publish (Docker Hub regression fix) by @smashingtags in #368
- HLCE-295: smoke E2E reuses one session (fix 15-min rate-limit cascade) by @smashingtags in #369
- HLCE-296: bump backend base + weekly no-cache rebuild (fix stale docker-cli CVE) by @smashingtags in #370
- HLCE-300: ignore typescript >=6.1.0 in dependabot dev-tools group by @smashingtags in #387
- HLCE-302: resolve 4 open security alerts by @smashingtags in #418
- HLCE-305: consolidate four lock bumps and pin node to major 24 by @smashingtags in #437
- HLCE-304: remove npm from the backend image instead of patching its deps by @smashingtags in #438
- HLCE-306: guard the native build and give the E2E lane real diagnostics by @smashingtags in #446
- HLCE-308: drop the unused better-sqlite3 dependency by @smashingtags in #454
- HLCE-309: release v2.3.0 by @smashingtags in #456

## [v2.2.0] - April 14, 2026

### 🐛 Bug Fixes (Backported from Eight.ly fork)
- **Container delete/stop/restart**: Docker client was never passed to the CLI manager. All container operations now work correctly. ([#146](https://github.com/imogenlabs/homelabarr-ce/pull/146))
- **Docker socket permissions**: Apps that mount `docker.sock` (Portainer, etc.) now get `group_add` injected at deploy time so they can read/write the socket. ([#146](https://github.com/imogenlabs/homelabarr-ce/pull/146))
- **Read-only template volumes**: Temp deploy YAMLs now write to `server/data/` instead of next to the source YAML, so deploys don't fail with EACCES on read-only mounts. ([#146](https://github.com/imogenlabs/homelabarr-ce/pull/146))
- **Deploy progress stream**: SSE `connected` event now includes the server-assigned `clientId`, fixing "Client not found" 500s on subscribe. ([#146](https://github.com/imogenlabs/homelabarr-ce/pull/146))

### 🔒 Security
- **npm vulnerabilities patched**: vite, hono, @hono/node-server bumped to address 9 advisories (3 high, 6 moderate). ([#145](https://github.com/imogenlabs/homelabarr-ce/pull/145))
- **Workflow permissions**: Added explicit `permissions: contents: read` to all workflows missing it. Resolves CodeQL alert. ([#144](https://github.com/imogenlabs/homelabarr-ce/pull/144))

### 📚 Documentation
- **Wiki cleanup**: Removed Professional Edition section; replaced placeholder octopus with optimized v3b WebP at proper sizes. ([#147](https://github.com/imogenlabs/homelabarr-ce/pull/147))

---

## [v2.0.0] - September 2025

### 🗄️ ARCHIVED COMPONENTS
- **Mount Enhanced Legacy System**: Moved obsolete cloud storage mounting system to archives
  - **Location**: `MASTER_DOCUMENTATION/8_ARCHIVES/OBSOLETE_COMPONENTS/mount-enhanced-legacy/`
  - **Reason**: Technology shift from cloud storage to local NAS solutions
  - **Impact**: Zero impact on core system functionality
  - **Components Archived**:
    - Complete Node.js backend with multi-provider integration
    - Docker configuration and deployment files
    - Technical documentation and setup guides
    - API documentation and troubleshooting guides

### 📋 CONTEXT
- **Google Drive Unlimited Ended**: Original use case no longer viable
- **Community Shift**: Users moved to local NAS solutions (Synology, QNAP, Unraid, TrueNAS)
- **Simplified Architecture**: Focus on Docker + local storage integration
- **Code Preservation**: All functionality preserved in archive for future reference

### ✅ SYSTEM STATUS
- **Core Functionality**: Unaffected
- **Docker Management**: Fully operational
- **Application Deployment**: All 100+ applications available
- **Traefik + Authelia**: Fully functional
- **React Frontend**: Enhanced and optimized
- **CLI Bridge**: Seamless shell script integration

---

## Previous Versions
*Historical changelog entries would be added here as the system evolves*