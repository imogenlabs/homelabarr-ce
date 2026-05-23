# Trust Boundaries

1. **Internet → Cloudflare edge** — TLS termination, DDoS mitigation, bot fight mode. Protocol: HTTPS. Auth: none (public). Controls: R2 CSP headers set at CF edge, R8 HSTS preload.

2. **Cloudflare → nginx (frontend container)** — HTTPS or HTTP (depends on tunnel config). Auth: CF edge cert. Controls: R2 CSP, R4 container hardening (read-only rootfs, cap-drop ALL).

3. **nginx → backend container** — HTTP over Docker bridge network. Auth: none (network isolation is the boundary). Controls: R4 internal network (`homelabarr-internal`), R9.6 route gating.

4. **Backend → socket-proxy → Docker daemon** — HTTP/TCP over internal Docker network. Auth: none (endpoint allowlist on proxy). Controls: R4 socket proxy with EXEC=0/BUILD=0, R4 cap-drop ALL on backend.

5. **Backend → data volume (SQLCipher DB)** — Filesystem read/write. Auth: SQLCipher key from Docker secrets. Controls: R7 encryption at rest, R6 hash-chained audit log.

6. **Backend → activity-data volume (audit JSONL)** — Append-only filesystem writes. Auth: none (filesystem permissions). Controls: R6 hash chain, R12 chaos validation.

7. **Browser → SPA** — HTTPS + cookies. Auth: hl_session HttpOnly cookie + hl_csrf double-submit. Controls: R2 CSP, R2.5 cookie-based auth, R3 CSRF.

8. **CI runner → GHCR** — HTTPS + OIDC token. Auth: GitHub OIDC. Controls: R5 cosign signing, R5 SHA-pinned actions, R11 evidence collection.

9. **Host → backup destination** — Protocol TBD (rclone/rsync/S3). Auth: rclone config or AWS credentials. Controls: R8 GPG encryption, R8 sha256 manifest signing.

10. **Browser → analytics (first-party Umami)** — Pageview events sent to `/analytics.js` (nginx proxies to `analytics.mjashley.com/script.js`). No PII collected, no third-party cookies, no cross-origin data transmission. Website ID `7f290439-...` is embedded in HTML by design (not a secret). CSP `script-src 'self'` covers the proxied script. Controls: R17 PRIVACY.md documents the flow; nginx proxy strips Set-Cookie headers from analytics responses.
