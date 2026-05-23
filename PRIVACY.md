# Privacy

## Analytics

This demo runs first-party [Umami](https://umami.is) analytics at `/analytics.js`. The script sends pageview events to a same-origin endpoint proxied through nginx. No PII is collected, no third-party cookies are set, and no data is transmitted to external services.

The website ID `7f290439-4876-4f84-966d-a26da50bf4b6` is embedded in HTML by design; it is not a secret. Umami is configured for aggregate metrics only (page views, referrers, browser/OS breakdowns).

The analytics instance is self-hosted at `analytics.mjashley.com` and operated by the project maintainer.

## Data stored by the application

HomelabARR CE stores the following data locally in a SQLCipher-encrypted SQLite database:

- User accounts (username, bcrypt-hashed password, role, MFA secrets)
- Session records (JWT ID, creation time, revocation status)
- API key hashes (HMAC-SHA256, never stored in plaintext)
- Audit log entries (hash-chained, tamper-evident)

No data is transmitted to external services by the application itself. Docker container metadata is read from the local Docker daemon via a socket proxy.

## Cookies

| Cookie | Purpose | Flags |
|--------|---------|-------|
| `hl_session` | JWT access token (15min TTL) | HttpOnly, Secure, SameSite=Strict |
| `hl_refresh` | Opaque refresh token (14d TTL) | HttpOnly, Secure, SameSite=Strict |
| `hl_csrf` | CSRF double-submit token | Secure, SameSite=Strict |

No advertising, tracking, or third-party cookies are set.
