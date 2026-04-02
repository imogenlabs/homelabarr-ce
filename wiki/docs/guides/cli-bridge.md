# CLI Bridge

The CLI Bridge is how the dashboard knows about all 100+ apps. It reads Docker Compose files from the `apps/` folder and turns them into the browsable, deployable catalog you see in the UI.

!!! info "Who this page is for"
    Developers who want to understand how app templates work, or anyone adding custom apps beyond simple ones in `apps/myapps/`. You don't need to read this to use HomelabARR.

    For day-to-day usage: the [Web Dashboard](web-dashboard.md) guide covers adding custom apps in one paragraph.
    For the broader system: see [Architecture](architecture.md).
    To contribute a new app template: see [Contributing](contributing.md).

---

## How It Works

When the backend starts, it:

1. Scans every subfolder in `apps/` for `.yml` files
2. Reads each file to discover the app's name, image, ports, and labels
3. Makes them available in the dashboard catalog via the API
4. When you click Deploy, takes the YAML, transforms it for your chosen mode, fills in variables, and runs `docker compose up -d`

---

## App Folder Structure

```
apps/
├── ai/                  # Ollama, ComfyUI, Stable Diffusion, LocalAI…
├── backup/              # Duplicati, Restic, Rsnapshot
├── downloads/           # qBittorrent, SABnzbd, NZBGet, Prowlarr, Jackett…
├── media-management/    # Radarr, Sonarr, Lidarr, Bazarr, Tautulli…
├── media-servers/       # Plex, Jellyfin, Emby
├── monitoring/          # Netdata, Grafana, Speedtest, Notifiarr…
├── myapps/              # ← Your custom templates go here
├── self-hosted/         # Nextcloud, Bitwarden, Pi-hole, Home Assistant, n8n…
├── system/              # Portainer, Dozzle, Uptime Kuma, Watchtower…
├── transcoding/         # Tdarr, Handbrake, MakeMKV, Unmanic
└── virtual-desktops/    # Chrome, Firefox, Steam (Kasm-powered)
```

The folder name maps to the category displayed in the dashboard. Add a file to any folder and it appears automatically after a backend restart.

---

## Template Format

Each app is a standard Docker Compose file with `${VARIABLE}` placeholders. Here's a typical example:

```yaml
version: "3"
services:
  radarr:
    image: lscr.io/linuxserver/radarr:latest
    container_name: radarr
    restart: unless-stopped
    ports:
      - 7878:7878
    environment:
      - PUID=${ID}
      - PGID=${ID}
      - TZ=${TZ}
    volumes:
      - ${APPFOLDER}/radarr:/config
    labels:
      - traefik.enable=true
      - traefik.http.routers.radarr.rule=Host(`radarr.${DOMAIN}`)
      - traefik.http.services.radarr.loadbalancer.server.port=7878
```

### Available Variables

| Variable | Default | What it does |
|----------|---------|-------------|
| `${TZ}` | `UTC` | Timezone (e.g., `America/New_York`) |
| `${ID}` | `1000` | User/group ID for file permissions |
| `${APPFOLDER}` | `/opt/appdata` | Where app data gets stored |
| `${DOMAIN}` | `localhost` | Your domain for Traefik routing |
| `${DOCKERNETWORK}` | set by mode | Docker network (injected automatically based on deploy mode) |

---

## What Happens During Deployment

The bridge transforms the template differently depending on which mode you pick:

**Standard mode:**
- Strips out all `traefik.*` labels
- Removes any external networks
- Sets network to bridge (direct port access)
- Result: `http://server:PORT`

**Traefik mode:**
- Deploys the template as-is
- Adds the `proxy` network
- Traefik picks it up via Docker labels and starts routing
- Result: `https://appname.yourdomain.com` with automatic SSL

**Traefik + Authelia mode:**
- Same as Traefik
- Adds `chain-authelia` middleware to the Traefik router
- Authelia intercepts requests and requires login before passing through
- Result: `https://appname.yourdomain.com` with authentication gate

---

## Adding Your Own Apps

1. Create `apps/myapps/my-app.yml`
2. Use the template format above — standard Docker Compose with `${VARIABLE}` placeholders
3. Refresh the dashboard — your app shows up in **My Apps**

!!! tip "Test in Standard mode first"
    Get your custom app working in Standard mode before adding Traefik labels. Easier to debug one thing at a time.

!!! tip "Contributing an app to the catalog"
    If your template works well and others would benefit, open a PR. See [Contributing](contributing.md) for the submission process.
