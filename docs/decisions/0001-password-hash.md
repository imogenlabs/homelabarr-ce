# ADR-0001: Password hashing algorithm

**Status:** Accepted
**Date:** 2026-05-23
**Decision maker:** smashingtags

## Context

HomelabARR CE hashes user passwords with bcryptjs at cost factor 12. This was audited in R20 and confirmed to meet OWASP ASVS v4.0.3 Level 2 requirements (bcrypt is on the ASVS allowed list). The R20 spec raised the question of whether to migrate to Argon2id, which is the OWASP-recommended algorithm for new applications.

bcryptjs is a pure-JavaScript implementation. It avoids native compilation requirements (important for the Alpine Docker image and cross-platform portability) but is ~10x slower than native bcrypt. At cost 12, a single hash takes ~250ms on the production backend — acceptable for login frequency but noticeable under bulk-create scenarios.

Argon2id (via the `argon2` npm package) uses native bindings or a WASM fallback. It provides memory-hardness that bcrypt does not, which is the primary advantage against GPU-based cracking. However, it introduces a native compilation dependency that complicates the multi-arch Docker build and requires python3/make/g++ in the build stage.

## Decision

**Stay on bcryptjs cost 12 as the terminal state.** Do not migrate to Argon2id.

## Rationale

1. **Threat model fit.** HomelabARR CE is a self-hosted homelab orchestrator. The password database is local SQLite encrypted with SQLCipher AES-256 (R7). An attacker who has the password hashes already has the encryption key and full host access — at that point, cracking bcrypt vs Argon2id is irrelevant. The primary threat is online brute-force, which is mitigated by rate limiting (5 attempts / 15 min per IP+username) and account lockout.

2. **Portability.** bcryptjs has zero native dependencies. It works on every platform Node runs on without build tools. The Dockerfile already carries python3/make/g++ for better-sqlite3-multiple-ciphers, but removing that dependency is a long-term goal — adding another native dep moves in the wrong direction.

3. **Migration complexity.** A bcrypt→Argon2id migration requires dual-hash support during the transition window: verify against bcrypt for existing users, rehash to Argon2id on successful login, verify against Argon2id for new/migrated users. The rehash-on-login pattern already exists (R3), but extending it to a cross-algorithm migration adds ~50 lines of code and a permanent conditional branch in the hot auth path, for marginal security benefit given point 1.

4. **OWASP compliance.** bcrypt cost 12 meets ASVS L2. Argon2id is "recommended" but not "required" at L2. Moving to L3 would require Argon2id, but L3 also requires HSM key storage, formal code review, and other controls that are out of scope for a self-hosted demo product.

## Consequences

- Password hashing stays on bcryptjs cost 12 indefinitely.
- SECURITY.md accurately describes bcrypt (confirmed in R20).
- If OWASP ASVS L3 becomes a goal (e.g., for enterprise customers of Eight.ly OS), revisit this decision and implement the migration with the existing rehash-on-login pattern.
- The `BCRYPT_COST` constant in `server/auth.js` can be bumped to 13 or 14 as hardware gets faster, without a migration.
