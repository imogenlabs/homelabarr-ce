# FAQ & Troubleshooting

---

## Before Installing

### What is HomelabARR CE?

HomelabARR CE (Community Edition) is a free, open-source dashboard for deploying and managing Docker containers on your own server. It comes with 100+ pre-configured apps — media servers, download clients, AI tools, and more. Just click Deploy.

### What do I need to run it?

| Component | Minimum |
|-----------|---------|
| OS | Ubuntu 22.04+ / Debian 12+ / any Docker-capable Linux |
| CPU | 2 cores |
| RAM | 4 GB |
| Disk | 20 GB |
| Docker | 24.0+ with Compose v2 |

Both **x86_64** and **ARM64** are supported — runs on Raspberry Pi 4/5, standard Intel/AMD servers, Apple Silicon Macs, and ARM cloud instances.

### I'm new to Docker. Can I still use this?

Yes — that's the point. HomelabARR was built so you don't have to write Docker Compose files just to run Plex or Nextcloud. The dashboard handles all of that. You do need to run a few shell commands during setup, but the [Quick Start guide](quick-start.md) walks through every step.

### How is this different from Portainer?

Portainer is a general Docker management tool — powerful, but you need to know what you want to run. HomelabARR gives you a curated catalog of 100+ homelab apps with one-click deployment. Think of it as an app store for your server. They work great together — Portainer is even in the catalog.

### Can I use it without Docker?

No. HomelabARR runs as Docker containers and deploys Docker containers. Docker is required.

### Is it free?

CE (Community Edition) is 100% free and open source under the MIT license. There's also a paid [HomelabARR Mobile](https://homelabarr.com/#editions) app for managing your CE instance from your phone.

---

## After Installing

### The dashboard loads but no apps show up ("Failed to load applications")

The app templates are missing. Make sure you ran the `git clone` step:

```bash
git clone https://github.com/smashingtags/homelabarr-ce.git /opt/homelabarr
```

The 100+ app templates live in the `apps/` folder inside the repo. Without it, the catalog is empty. This is the most common setup mistake.

### I get a CORS error or API calls fail after login

`CORS_ORIGIN` must match **exactly** how you access the dashboard in your browser — same protocol, IP or hostname, and port.

```bash
export CORS_ORIGIN=http://192.168.1.100:8084
docker compose -f homelabarr.yml up -d
```

Common mistake: `CORS_ORIGIN=http://server-hostname:8084` but you browse to `http://192.168.1.100:8084`. They must be identical.

### "Port already in use"

Something's already using port 8084 or 8092. Find it:

```bash
sudo ss -tlnp | grep 8084
```

Change the port in your `.env` file:

```bash
FRONTEND_PORT=8085
```

### Docker socket permission denied

`DOCKER_GID` must match your server's Docker group ID:

```bash
getent group docker | cut -d: -f3  # Find your GID
export DOCKER_GID=YOUR_NUMBER
docker compose -f homelabarr.yml up -d
```

### Running in a Proxmox LXC container

Docker inside LXC needs AppArmor disabled at the Proxmox host level:

```bash
# Run on the Proxmox host, not inside the container
echo 'lxc.apparmor.profile: unconfined' >> /etc/pve/lxc/YOUR-VMID.conf
```

Replace `YOUR-VMID` with your container's ID (like `100`). Restart the LXC from the Proxmox UI.

---

## Deploying Apps

### What are the three deployment modes?

1. **Standard** — simplest. App gets a port, access it at `http://your-server:PORT`. No extra setup. **Choose this if you're not sure.**
2. **Traefik** — real URL like `https://plex.yourdomain.com` with automatic free SSL. Requires a domain and Traefik. ([Setup guide](traefik-setup.md))
3. **Traefik + Authelia** — same as Traefik, plus a login page in front of the app. Recommended for anything internet-facing.

### My deployed app isn't accessible

Work through these in order:

```bash
docker ps | grep app-name         # Is it running?
docker logs app-name --tail 30    # Any errors?
docker port app-name              # What port did it get?
sudo ufw allow PORT/tcp           # Firewall blocking it?
```

### Can I deploy without the web UI?

Yes. The templates in `apps/` are standard Docker Compose files:

```bash
docker compose -f apps/media-servers/plex.yml --env-file .env up -d
```

---

## Security

### The default login is admin/admin — is that safe?

No. Change it immediately after setup. Anyone on your local network can log in until you do. Click your username in the top right after signing in to update your password.

### Should I expose HomelabARR to the internet?

Only with authentication in front of it. Use Traefik + Authelia mode for any app you expose publicly. Never put an unauthenticated dashboard on the public internet.

### What are API keys and when should I use them?

API keys (`hlr_` prefix) are long-lived credentials for scripts, automation, and the mobile app. They don't expire until you revoke them. JWT tokens (from `/auth/login`) expire after a short period — fine for interactive sessions, but not for automation that runs overnight.

**Key rules:**
- Keep API keys out of public repositories
- Revoke keys for devices you no longer use (Dashboard → your username → API Keys → Delete)
- The full key is shown only once when created — save it somewhere safe

### How do I keep the Docker socket secure?

Mounting `/var/run/docker.sock` gives HomelabARR control over Docker on your server. For most homelabs this is fine. If you want to restrict what it can do, use [Docker Socket Proxy](https://github.com/Tecnativa/docker-socket-proxy) — it sits between HomelabARR and Docker and lets you allow only specific API calls.

---

## Data & Backups

### Where's my data?

- **App configs and data**: `/opt/appdata/` — each deployed app gets its own subfolder
- **HomelabARR settings** (users, sessions): `homelabarr-data` Docker volume

### How do I back up everything?

```bash
sudo tar -czf homelabarr-backup-$(date +%Y%m%d).tar.gz /opt/appdata/
```

### How do I update to the latest version?

```bash
docker compose -f homelabarr.yml pull
docker compose -f homelabarr.yml up -d
```

Your data and settings are untouched — only the app itself updates.

---

## Advanced Topics

### Can I add my own apps?

Yes. Create a Docker Compose file in `apps/myapps/`:

```yaml
# apps/myapps/my-app.yml
version: "3"
services:
  my-app:
    image: my-image:latest
    container_name: my-app
    restart: unless-stopped
    ports:
      - 9000:9000
    environment:
      - TZ=${TZ}
    volumes:
      - ${APPFOLDER}/my-app:/config
```

Refresh the dashboard and your app shows up in **My Apps**. See [CLI Bridge](cli-bridge.md) for all available `${VARIABLE}` placeholders.

### How does authentication work?

Two options: JWT tokens (short-lived, from `/auth/login`) and API keys (`hlr_` prefix, permanent until revoked). The dashboard uses JWT. For scripts, automation, and the mobile app, use API keys. See [API Reference](api-reference.md) for full details.

### Can I disable the login screen?

Yes, set `AUTH_ENABLED=false` in your `.env` file. **Only do this on an isolated local network** — disabling auth exposes all API endpoints including container management and user administration to anyone who can reach your server.

---

## Getting Help

- **[Discord](https://discord.gg/Pc7mXX786x)** — fastest, someone's usually around — ask in #help
- **[GitHub Issues](https://github.com/smashingtags/homelabarr-ce/issues)** — bug reports
- **[GitHub Discussions](https://github.com/smashingtags/homelabarr-ce/discussions)** — questions and feature requests
- **[homelabarr.com](https://homelabarr.com)** — product page
