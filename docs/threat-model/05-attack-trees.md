# Attack Trees

## Root 1: Exfiltrate audit logs (A-02)

- **Branch 1.1:** Compromise backend container → read audit JSONL
  - 1.1.1: Exploit dependency RCE → **(mitigated by R4 read-only rootfs, R5 dep scanning)**
  - 1.1.2: Container escape to host → **(mitigated by R4 cap-drop ALL, AppArmor, no docker.sock)**
- **Branch 1.2:** Compromise backup destination → read tarball
  - 1.2.1: Steal rclone credentials → **(mitigated by R7 Docker secrets, not in env)**
  - 1.2.2: Access S3 bucket without auth → **(deferred — owner pile: configure bucket ACL)**
- **Branch 1.3:** Compromise admin account → API export via /api/audit
  - 1.3.1: Brute force password → **(mitigated by R1 rate limit, R6 lockout)**
  - 1.3.2: Steal session cookie via XSS → **(mitigated by R2 CSP, R2.5 HttpOnly cookie)**
  - 1.3.3: Forge JWT → **(mitigated by R3 strict HS256, R7 key rotation)**
- **Branch 1.4:** Tamper with chain to hide prior exfil
  - 1.4.1: Modify audit JSONL directly → **(detected by R6 hash chain, R12 validator)**

## Root 2: Forge admin session (A-01)

- **Branch 2.1:** Steal JWT signing key
  - 2.1.1: Read /run/secrets/ from host → **(mitigated by R7 Docker secrets file permissions)**
  - 2.1.2: Read from container env → **(mitigated by R7: secrets not in env vars)**
  - 2.1.3: Read from backup → **(mitigated by R8 separate trust zones for DB and secrets)**
- **Branch 2.2:** XSS to steal session cookie
  - 2.2.1: Inject script via user input → **(mitigated by R2 CSP, React auto-escaping)**
  - 2.2.2: Inject via third-party script → **(mitigated by R2 CSP script-src 'self' only)**
- **Branch 2.3:** CSRF on admin endpoint
  - 2.3.1: Cross-site form POST → **(mitigated by R2.5 SameSite=Strict + CSRF double-submit)**
- **Branch 2.4:** Time-skew to revive expired JWT
  - 2.4.1: Clock manipulation → **(tested by R12 chaos experiment 05)**

## Root 3: Deploy malicious container image (A-04)

- **Branch 3.1:** Compromise GHCR account
  - 3.1.1: Steal GitHub PAT → **(mitigated by R5 OIDC, no long-lived tokens in CI)**
- **Branch 3.2:** Bypass cosign verify
  - 3.2.1: Push unsigned image → **(mitigated by R5 cosign signing in CI)**
  - 3.2.2: Forge signature → **(mitigated by Sigstore transparency log)**
- **Branch 3.3:** Compromise CI runner
  - 3.3.1: Inject into workflow → **(mitigated by R5 SHA-pinned actions, branch protection)**
- **Branch 3.4:** Tag confusion / mutable tag
  - 3.4.1: Push to :latest over legitimate image → **(mitigated by R5 digest pinning in compose)**
