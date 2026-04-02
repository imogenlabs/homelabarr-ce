# CLI Installation

Prefer the terminal over a web browser? The CLI installer sets everything up interactively.

---

## One-Line Install

```bash
curl -fsSL https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/install-remote.sh | sudo bash
```

!!! info "What this script does"
    You can [review the full script](https://github.com/smashingtags/homelabarr-ce/blob/main/install-remote.sh) before running it — it's on GitHub and open source. It will ask you interactively for your timezone, user ID, and data paths before making any changes.

The installer will:

1. Check that Docker is installed (and tell you if it's not)
2. Download the HomelabARR repo to `/opt/homelabarr`
3. Prompt you for your timezone, user ID (`PUID`/`PGID`), and data directory
4. Configure Docker networks
5. Give you an interactive menu to start deploying apps

---

## CLI vs Web Dashboard

They're two ways to do the same thing — use whichever you prefer, or both:

| | CLI | Web Dashboard |
|--|-----|---------------|
| **Browse apps** | Text menu | Visual catalog with icons |
| **Deploy** | Terminal commands | One-click with real-time progress |
| **Manage containers** | `docker ps`, `docker stop` | Start/stop/restart/logs buttons |
| **Best for** | SSH-only servers, scripting, automation | Visual management, new users |

Both use the same app templates from the `apps/` folder. An app deployed via CLI shows up in the web dashboard, and vice versa — they share the same backend.

---

## Adding the Web Dashboard After CLI Install

Already installed via CLI and want the dashboard too?

```bash
cd /opt/homelabarr

export JWT_SECRET=$(openssl rand -hex 32)
export DOCKER_GID=$(getent group docker | cut -d: -f3)
export CORS_ORIGIN=http://YOUR-SERVER-IP:8084

docker compose -f homelabarr.yml up -d
```

Open `http://YOUR-SERVER-IP:8084` — any containers you deployed via CLI will already show up in the **Deployed Apps** tab.
