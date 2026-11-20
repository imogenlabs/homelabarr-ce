# Privacy

## Usage analytics

From v2.6.8, HomelabARR sends anonymous usage data to the project unless you turn it off. We use it to see how many installs are in use, on which version, and which parts of the dashboard get used.

**To turn it off**, set `ANALYTICS=off` on the frontend container (in `.env` next to `homelabarr.yml`, or as a container variable) and restart it. With it off, the dashboard loads no analytics code and sends nothing.

What is sent, to [PostHog](https://posthog.com) (US cloud), through your dashboard's own address at `/ingest/`:

- A random install id, made by your backend on first start. It is not derived from anything about you or your server.
- The HomelabARR version, and your browser, operating system, screen size, language and time zone.
- Page views, as a path such as `/settings`.
- Clicks, as the kind of element clicked. Text on the page and element attributes are masked.
- Four named events: signed in, deploy started (with the catalog app id, such as `plex`, and the deploy mode), deploy failed (catalog app id and HTTP status), and app removed.

What is never sent: your dashboard's address or hostname, referrers, usernames, passwords, container names, environment values, logs, or anything you type. No cookies are set and nothing is stored in your browser for analytics, apart from one flag that remembers you have seen the notice. Session recording is off.

Because the data goes out from your server, PostHog sees the public IP address your server connects from, as any web service does. The project is set to discard it.

Your browser only ever talks to your own dashboard. If your server has no internet access, or blocks PostHog, the dashboard works as normal and nothing is sent.

Nothing is sent when you open the dashboard in the HomelabARR mobile app.

The public demo at demo.homelabarr.com reports the same things, except that each visitor's browser keeps its own random id (in local storage) so we can count visitors.

**This changes what we said in v2.6.7.** That release turned analytics off by default and this page said a self-hosted install sends no usage data. v2.6.8 turns anonymous analytics on by default, because without it we cannot tell whether anyone uses the project. Before v2.6.7, installs sent page views to a Umami server run by the maintainer; that is gone, and the `ANALYTICS_URL` and `ANALYTICS_WEBSITE_ID` settings no longer do anything.

## Data stored by the application

HomelabARR CE stores the following data locally in a SQLCipher-encrypted SQLite database:

- User accounts (username, bcrypt-hashed password, role, MFA secrets)
- Session records (JWT ID, creation time, revocation status)
- API key hashes (HMAC-SHA256, never stored in plaintext)
- Audit log entries (hash-chained, tamper-evident)

Apart from the usage analytics described above, the application sends no data to external services. Docker container metadata is read from the local Docker daemon via a socket proxy.

## Cookies

| Cookie | Purpose | Flags |
|--------|---------|-------|
| `hl_session` | JWT access token (15min TTL) | HttpOnly, Secure, SameSite=Strict |
| `hl_refresh` | Opaque refresh token (14d TTL) | HttpOnly, Secure, SameSite=Strict |
| `hl_csrf` | CSRF double-submit token | Secure, SameSite=Strict |

No advertising, tracking, or third-party cookies are set.
