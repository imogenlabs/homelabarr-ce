# HomelabARR CE Changelog

## [Unreleased]

### ⬆️ Dependencies & Framework
- **React 18 → 19**: upgraded `react`, `react-dom`, `@types/react`, `@types/react-dom` to 19.2.7 (matched majors). Resolves the recurring mismatched-major hazard where Dependabot tried to bump `react-dom` to 19 alone. ([#273](https://github.com/imogenlabs/homelabarr-ce/pull/273), HLCE-200)
- **shadcn/ui modernization**: converted all 83 `React.forwardRef` wrappers across 16 `src/components/ui/*` components to React 19 ref-as-prop. No behavioral change. ([#273](https://github.com/imogenlabs/homelabarr-ce/pull/273), HLCE-201)
- **lucide-react 0.344 → 1.21**: required for React 19 peer support (the old range hard-blocked installs). Brand icons were removed in lucide 1.x — swapped the `Github` icon on the login screen for `GitFork`. ([#276](https://github.com/imogenlabs/homelabarr-ce/pull/276)/[#277](https://github.com/imogenlabs/homelabarr-ce/pull/277), HLCE-202)
- **radix-ui group**: all `@radix-ui/*` (direct + transitive) bumped to latest.
- **Other deps**: `dockerode` 4 → 5, `better-sqlite3` 12.11.1, `nodemailer` 8 → 9, `@types/node` 26, dev-tools group. ([#276](https://github.com/imogenlabs/homelabarr-ce/pull/276)/[#277](https://github.com/imogenlabs/homelabarr-ce/pull/277), HLCE-202)

### ✅ Tests
- Added `server/email.test.js` (the repo's first unit test) covering the email transporter — stub fallback, real SMTP path, and an offline nodemailer 9 end-to-end send — to lock in the nodemailer 9 upgrade.
- **Automated test foundation + Wave 1** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), [#294](https://github.com/imogenlabs/homelabarr-ce/pull/294)): stood up the vitest harness — jsdom + Testing Library, `@vitest/coverage-v8`, two-project config (server/node + web/jsdom), and a `supertest`-drivable Express app (`export { app }`, `NODE_ENV=test` guard). Added **166 passing tests** across session rotation/reuse-revocation (HLCE-213), Docker injection gates + error classification (HLCE-218), frontend security logic — safeUrl / api refresh interceptor / validation (HLCE-222), and pure frontend logic (HLCE-224). Coverage ~13% → ~22% overall; high-risk modules 81–100%. Three latent source bugs (safeUrl `/[ -]/` regex, deployment.ts literal `${template.id}`, cli-bridge `appId.split('-')`) are pinned as regression tests pending their fix in HLCE-228.
- **Unit/coverage CI gate** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-211): added `.github/workflows/unit-tests.yml` — lint + `tsc --noEmit` + `vitest --coverage` on free hosted `ubuntu-latest`, on every PR and on `main`/`dev` pushes, uploading the coverage report as an artifact. Wired ratcheting coverage thresholds in `vite.config.ts` (seeded just under the ~22% baseline so day one is green; floor only ever rises, in the PR that adds the tests) and removed `passWithNoTests` so an empty run now fails loudly. Cleared the 60 pre-existing ESLint errors (`no-explicit-any` ×40, unused vars, case-declarations, etc.) so lint is a hard gate; the three new `react-hooks` v7 architectural rules (`set-state-in-effect`, `purity`, `immutability`) are temporarily `warn` pending the context/component test stories (HLCE-223/225).
- **Auth core tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-212, [#296](https://github.com/imogenlabs/homelabarr-ce/pull/296)): **56 tests** for the root of trust — `server/auth.js` (JWT sign/verify incl. forged-signature, alg-confusion none/RS256/HS384, expiry, jti revocation and previous-key rotation within max-age; `validatePassword` safe-user return + bcrypt sub-cost rehash; HMAC API keys with `timingSafeEqual`, tamper/revoke/legacy-migration; single-use login tickets; RBAC; `requireAuth`/`optionalAuth`) and `server/secrets.js` (Docker-secret > `_FILE` > env precedence, required-missing throw, cache + `readSecretFresh`). Coverage: `auth.js` 86%, `secrets.js` 100%. Added a `CONFIG_DIR`/`DATA_DIR` test seam to `auth.js`.
- **MFA tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-214, [#297](https://github.com/imogenlabs/homelabarr-ce/pull/297)): **10 tests** for `server/mfa.js` — deterministic TOTP under fake time (the ±1-step `window:1` boundary), wrong/short/long/non-numeric rejection, backup codes (uniqueness, index match, `-1` miss, consumed-slot skip), and pending-MFA TTL. Coverage: `mfa.js` 100% lines. Added a `CONFIG_DIR` seam. Overall repo coverage ~22% → **~29%**; the CI coverage floor was ratcheted up with each PR.
- **Rate-limit & lockout tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-215, [#299](https://github.com/imogenlabs/homelabarr-ce/pull/299)): **10 tests** for `server/ratelimit.js` — the `SqliteStore` window count/reset under fake time, the 15-fail / 30-min account-lockout boundary (`onFail`/`onSuccess`/`isLocked`, empty-username no-op), the login limiter returning 429 after the 25-request max from one IP (supertest), the `RATE_LIMIT_DISABLED` escape hatch firing only for the exact string `"true"`, and bucket/lockout persistence across a simulated process restart (file-backed DB). Coverage: `ratelimit.js` **96.55% lines / 100% branches**. Pinned one divergence as a regression test: `skipSuccessfulRequests` is currently ineffective because `SqliteStore.decrement()` is a no-op, so successful (2xx) logins still count toward the limit — a follow-up ticket should implement `decrement`. Overall repo coverage **~30%**; the ratcheting CI floor was raised to lines 29 / statements 29 / functions 41 / branches 25.
- **Auth HTTP route integration tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-216, [#300](https://github.com/imogenlabs/homelabarr-ce/pull/300)): **31 supertest tests** driving the real Express app (`server/index.js` `app`) end-to-end across `server/routes/auth.js` and `auth-admin.js` — the largest untested attack surface. Covers login cookie flags (HttpOnly / SameSite=Strict / path-scoped refresh / JS-readable CSRF), bad-creds 401 and 15-fail account lockout 423, MFA-gated login (ticket + no session cookie, TOTP and single-use backup codes), refresh rotation + reuse detection, session listing/deletion with jti-format and IDOR (404) enforcement, logout revocation, the CSRF/XHR double-submit guard, change-password, MFA setup/verify/disable, admin RBAC (401 unauth / 403 non-admin) on user management + audit + activity-log, password reset replay/expiry/forgery + no-user-enumeration on forgot-password, the `cli-mint` and `internal/audit` token guards (incl. the `timingSafeEqual` length-mismatch path), API keys, and starred apps. Coverage: `routes/auth.js` **90% lines**, `routes/auth-admin.js` **88% lines**; driving the whole app lifted overall repo coverage **~30% → ~40%** (lines). Replaced the Wave-1 `app.smoke.test.js` placeholder (its harness/404 assertions folded into the route suite). Ratcheting CI floor raised to lines 39 / statements 40 / functions 50 / branches 36.
- **Persistence-integrity tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-221): **18 tests** across `server/db.js`, `stars.js`, `activity-logger.js`, and `deployment-logger.js` — the data-loss + encryption surface. Covers SQLCipher encryption-at-rest and the silent-downgrade contract (key < 32 chars opens plaintext), stars add/remove/dedupe round-trip + corrupt-file degradation, activity-log newest-first ordering / filter / pagination / `MAX_ENTRIES` cap / corrupt-file reset, a pinned lost-update-race regression marker, and DeploymentLogger structured-entry shape. Coverage: `db.js` **100% lines**, `stars.js` **88%**, activity + deployment loggers **~80%**; overall repo coverage **~40% → ~45%** (lines). Pinned a real bug as a regression test (filed as a follow-up): `db.js` runs `journal_mode = WAL` **before** the SQLCipher key, so creating a fresh encrypted DB throws "file is not a database" — encryption-at-rest cannot initialise when `SQLCIPHER_KEY` is set (latent today because the CE deployments run unencrypted). Ratcheting CI floor raised to lines 44 / statements 45 / functions 51 / branches 42.

---

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

## [v1.0.0] - September 2025

- Initial public release
- Docker container management via CLI bridge
- 100+ curated app templates
- React frontend with dark mode
- Traefik + Authelia integration
- MkDocs wiki