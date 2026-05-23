# Asset Inventory

| Asset ID | Asset | Category | Sensitivity | Location | Owner |
|----------|-------|----------|-------------|----------|-------|
| A-01 | Admin credentials (bcrypt hash + JWT signing key) | Credentials | Critical | Docker secrets (/run/secrets/) | Owner |
| A-02 | Audit log JSONL files | Logs / evidence | High | Backend container volume | Agent |
| A-03 | User database (SQLCipher encrypted) | App data | High | Backend container volume | Owner |
| A-04 | Container images (GHCR) | Code artifact | High | ghcr.io/smashingtags/ | Agent |
| A-05 | SBOM + cosign signatures | Supply-chain attestation | High | GHCR attestations | Agent |
| A-06 | TLS certificates | Crypto material | Critical | Cloudflare edge / Traefik | Owner |
| A-07 | Backup archives (GPG encrypted) | Recovery material | High | Off-host destination (TBD) | Owner |
| A-08 | Honey-route bait endpoints | Detection sensor | Medium | Backend code + nginx | Agent |
| A-09 | Compliance evidence bundle | Audit evidence | Medium | CI artifacts (90-day retention) | Agent |
| A-10 | Source repository + branch protection | Code | High | GitHub | Agent |
| A-11 | Docker secrets files (jwt_key, sqlcipher_key, etc.) | Key material | Critical | Host ./secrets/ directory | Owner |
| A-12 | Rate-limit + lockout state (SQLite) | Security state | High | Backend container volume | Agent |
| A-13 | CSRF tokens (hl_csrf cookie) | Session material | Medium | Browser cookie | N/A |
| A-14 | MFA TOTP secrets + backup codes | Auth material | Critical | Server config volume (bcrypt hashed) | Owner |
