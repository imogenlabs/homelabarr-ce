# Privacy

## Analytics

A self-hosted HomelabARR sends no usage data anywhere. Analytics are off unless whoever runs the dashboard sets `ANALYTICS_URL` and `ANALYTICS_WEBSITE_ID` on the frontend container.

The public demo at demo.homelabarr.com sets them. It runs first-party [Umami](https://umami.is) analytics at `/analytics.js`, proxied through the demo's own nginx to an Umami instance operated by the project maintainer. Umami collects aggregate metrics only (page views, referrers, browser and OS), sets no cookies, and stores no personal data. The demo's website ID is embedded in its pages by design; it is not a secret.

Before v2.6.7 every install loaded the project's analytics script and sent page views to the project's Umami server. Updating to v2.6.7 or later stops that.

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
