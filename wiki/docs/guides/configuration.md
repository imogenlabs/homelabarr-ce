# Configuration

HomelabARR uses environment variables to control how it runs. Set them before starting the containers.

---

## Required Setup

Two things are required. Without them, the stack won't start:

| What | Why | How |
|------|-----|-----|
| `./secrets/` files | The JWT signing keys, the initial admin password, and the database key are read from files, not environment variables | `bash scripts/init-secrets.sh` (run once, from `/opt/homelabarr`) |
| `CORS_ORIGIN` | The exact address you open the dashboard at, e.g. `http://192.0.2.100:8084` or `https://homelabarr.example.com` | `export CORS_ORIGIN=http://YOUR-SERVER-IP:8084` |

You don't need `JWT_SECRET` or `DOCKER_GID` with the shipped `homelabarr.yml`. The JWT key comes from `./secrets/jwt_key_current`, and the backend reaches Docker through the bundled socket proxy.

---

## Server Settings

Optional, but useful:

| Variable | Default | What it does |
|----------|---------|-------------|
| `ALLOW_PLAIN_HTTP` | `false` | Set to `true` only if you open the dashboard at a plain `http://` address with no HTTPS proxy in front. It drops the `Secure` flag from login cookies (otherwise the browser discards them and you can't stay logged in), and turns off HSTS and the CSP `upgrade-insecure-requests` directive. Use it on a trusted LAN only. |
| `FRONTEND_PORT` | `8084` | Port for the web dashboard |
| `BACKEND_PORT` | `8092` | Port for the API server |
| `TZ` | `UTC` | Your timezone (e.g., `America/New_York`, `Europe/London`) |
| `AUTH_ENABLED` | `true` | Set to `false` to disable the login screen |
| `AUDIT_ANCHOR_KEY` | falls back to `JWT_SECRET` | Signs the tamper-evident audit log's out-of-band chain-tip anchor. Leave unset to reuse `JWT_SECRET`; set a dedicated random value (`openssl rand -hex 32`) to keep audit integrity independent of JWT key rotation. |
| `DEMO_MODE` | `false` | Only for a public demo where everyone shares one login. Set to `true` and the server refuses changes to accounts — password changes, creating or deleting users, minting or revoking API keys, and setting up or disabling MFA — so no visitor can lock everyone else out. Everything else, including the app catalog, containers and logs, works normally. Leave it unset on a real install. |
| `ANALYTICS_URL`, `ANALYTICS_WEBSITE_ID` | unset | Frontend only. Off by default: your dashboard sends usage data nowhere. Set both to send page views to your own [Umami](https://umami.is) server, proxied through the dashboard so browsers only talk to it (for example `https://analytics.example.com` and the site's website id). The frontend refuses to start if either looks wrong. |

!!! danger "Don't disable auth on a networked server"
    Setting `AUTH_ENABLED=false` removes the login screen and exposes all API endpoints — including container management and user administration — to anyone who can reach your server. Only use this in isolated local testing environments.

---

## App Settings

These get injected into app templates when you deploy:

| Variable | Default | What it does |
|----------|---------|-------------|
| `APPFOLDER` | `/opt/appdata` | Where deployed apps store their data |
| `ID` | `1000` | The user/group ID containers run as |
| `DOMAIN` | `localhost` | Your domain name (only used in Traefik mode) |
| `DOCKERNETWORK` | `bridge` or `proxy` | Set automatically based on deploy mode |

You don't usually need to change these manually — the deploy modal lets you customise them per app.

---

## Advanced Variables

Rarely needed, but here if you need them:

| Variable | Default | What it does |
|----------|---------|-------------|
| `CLI_BRIDGE_HOST_PATH` | `/opt/homelabarr` | Path to the repo with app templates (must contain `apps/`) |

---

## Using a .env File (Recommended)

Instead of typing `export` commands every time — which only last until you close your terminal — save your settings in a `.env` file next to your `homelabarr.yml`:

```bash
# Required (secrets live in ./secrets/, created by scripts/init-secrets.sh)
CORS_ORIGIN=http://192.0.2.100:8084

# Only for a plain http:// address with no HTTPS proxy in front
ALLOW_PLAIN_HTTP=true

# Recommended
TZ=America/New_York
APPFOLDER=/opt/appdata
```

!!! warning "Keep .env out of git"
    Add `.env` to your `.gitignore`. Keep `./secrets/` out of git as well; it holds your signing keys and admin password. Use `.env.example` with placeholder values if you want to template it:
    
    ```bash
    cp .env .env.example
    # Replace real values with placeholders in .env.example
    # Then: git add .env.example (commit this)
    #       git ignore .env (never commit this)
    ```

Start HomelabARR with your .env file:

```bash
docker compose -f homelabarr.yml --env-file .env up -d
```

---

## Where Does My Data Go?

**App data** goes in `/opt/appdata/` (or wherever `APPFOLDER` points):

```
/opt/appdata/
├── plex/           # Plex libraries and settings
├── radarr/         # Radarr config and database
├── sonarr/         # Sonarr config and database
├── qbittorrent/    # Download client settings
└── ...
```

Each app gets its own folder. **This is what you back up.**

**HomelabARR's own data** (user accounts, sessions) lives in two Docker volumes:

- `homelabarr-data` — app data and logs
- `homelabarr-config` — user accounts, API keys, and sessions (`/app/server/config/`)

Both persist across container restarts and updates automatically.

---

## Credential Security

Your passwords are never stored in plain text.

- **Passwords** are hashed with **bcrypt (12 rounds)** before writing to disk. The stored value looks like `$2a$12$xK9...` — not reversible.
- **JWT tokens** are signed with your `JWT_SECRET` environment variable and expire after 24 hours.
- **API keys** are generated with `crypto.randomBytes(32)` — 256 bits of cryptographic randomness, prefixed with `hlr_`.
- **Sessions** use random IDs via `crypto.randomBytes(12)` and are invalidated on logout.

All auth data is stored in `/app/server/config/` inside the backend container, persisted by the `homelabarr-config` volume.

!!! warning "Set a real JWT_SECRET"
    The install instructions use `openssl rand -base64 32` to generate a secret. If you skip this step, a random key is generated on each container start — which means **all user sessions invalidate on every restart**. Set it once and keep it.

---

## Docker Socket Security

The backend mounts `/var/run/docker.sock` so it can deploy and manage containers. This gives it control over Docker on your server.

For most homelabs, this is fine and expected. If you want to limit what it can do, consider [Docker Socket Proxy](https://github.com/Tecnativa/docker-socket-proxy) — it sits between HomelabARR and Docker and lets you allow only the API calls you want.

If the Docker socket isn't available (e.g., testing without Docker), the backend still starts in catalog-only mode — you can browse apps but can't deploy or manage containers.

---

## Network Setup

**Standard mode:** containers use Docker's bridge network. Each app gets a port and you access it directly.

**Traefik mode:** containers join a network called `proxy` so Traefik can route traffic to them. Create it once:

```bash
docker network create proxy
```

See the [Traefik & Domain Setup](traefik-setup.md) guide for the full walkthrough.
