# Migration Guide

Moving to HomelabARR CE from another platform? This guide walks you through it step by step. Your app data (Plex database, Sonarr configs, everything in `/opt/appdata/`) carries over — we use the same paths.

!!! tip "The golden rule"
    **Your data is safe.** HomelabARR CE stores everything in `/opt/appdata/` — the same place most Docker media server platforms use. We don't touch your existing configs. We just give you a better way to manage them.

---

## Before You Start

Figure out which platform you're coming from, because the migration steps are slightly different:

| Coming from | Difficulty | Why |
|---|---|---|
| **Saltbox** | Easy | Same paths, modern Traefik, just move configs |
| **Cloudbox** | Easy | Same paths, but Traefik v1 → v3 upgrade needed |
| **PGBlitz / PlexGuide** | Medium | Older setup, may need network + Traefik changes |
| **Dockserver** | Easy | Nearly identical structure, closest relative |
| **Custom Docker Compose** | Easy | If you use `/opt/appdata/`, you're already 90% there |

!!! danger "Back up before you touch anything. Non-negotiable."
    Migration goes wrong sometimes. A backup means you can recover. No backup means lost config, lost watch history, possibly worse.

    ```bash
    # Back up ALL your app data — this may take 10-30+ minutes depending on library size
    sudo tar czf /opt/homelabarr-backup-$(date +%Y%m%d).tar.gz /opt/appdata/

    # Save a list of what's running right now
    docker ps --format "{{.Names}}" > ~/my-running-containers.txt

    # Back up your .env if you have one
    cp /opt/appdata/compose/.env ~/env-backup.txt 2>/dev/null
    ```

    Verify the backup completed before continuing:
    ```bash
    ls -lh /opt/homelabarr-backup-*.tar.gz
    ```

---

## Step 1: Install HomelabARR CE

Don't stop your old containers yet. Install CE alongside them first so you can verify it works.

```bash
# Get the code
git clone https://github.com/smashingtags/homelabarr-ce.git /opt/homelabarr
cd /opt/homelabarr

# Set required environment variables
export JWT_SECRET=$(openssl rand -base64 32)
export DOCKER_GID=$(getent group docker | cut -d: -f3)
export CORS_ORIGIN=http://$(hostname -I | awk '{print $1}'):8084

# Start the CE dashboard
docker compose -f homelabarr.yml up -d
```

Open `http://your-server-ip:8084` in your browser. You should see the dashboard with 100+ apps.

!!! tip "Just checking"
    At this point, your OLD containers are still running. CE is running alongside them. Nothing has changed yet. You're just making sure CE starts up properly before touching anything.

---

## Step 2: Migrate Apps (One at a Time)

This is the important part. **Do NOT stop everything at once.** Migrate one app, verify it works, then move to the next.

**Suggested order** (least risky first):

1. Monitoring apps (Tautulli, Dozzle, Uptime Kuma) — ~2 min each
2. Download clients (NZBGet, qBittorrent, SABnzbd) — ~3 min each
3. Media managers (Sonarr, Radarr, Lidarr, Prowlarr) — ~3-5 min each
4. Media servers (Plex, Jellyfin — save these for last) — 10-30+ min if your library is large

!!! tip "Plex libraries can take a while"
    Plex re-scans its library on startup. If you have thousands of movies and TV episodes, expect the first startup after migration to take 15-30 minutes before everything shows up correctly.

**For each app:**

```bash
# 1. Stop and remove the OLD container
docker stop sonarr && docker rm sonarr

# 2. Open the CE dashboard → find Sonarr → click Deploy
#    Pick your deployment mode:
#    - Standard = no reverse proxy, access via IP:port
#    - Traefik = SSL + custom domain (sonarr.yourdomain.com)
#    - Traefik + Authelia = SSL + custom domain + login protection

# 3. Check that it started and loaded your config
docker logs sonarr --tail 20
```

The new container mounts `/opt/appdata/sonarr` automatically — your series, settings, history, everything is already there.

!!! warning "Why one at a time?"
    If you stop everything and something goes wrong, you've lost ALL your services. One at a time means you can roll back a single app if needed.

**After each app, verify:**

- **Sonarr/Radarr:** Open the web UI → check that your series/movies are listed
- **qBittorrent:** Check that torrents are still there and paths are correct
- **Plex/Jellyfin:** Check libraries → play something → confirm watch history survived
- **NZBGet/SABnzbd:** Check download queue and completed folder path

---

## Step 3: Handle Network Differences

Different platforms use different Docker network names. CE uses a network called `proxy`. If your old platform used a different name, you may need to update Traefik.

| Old Platform | Old Network | CE Network |
|---|---|---|
| Saltbox | `saltbox` | `proxy` |
| Cloudbox | `cloudbox` | `proxy` |
| PGBlitz | `plexguide` | `proxy` |
| Dockserver | `proxy` | `proxy` (same!) |

Create the CE network if it doesn't exist:

```bash
docker network create proxy 2>/dev/null || true
```

!!! warning "Traefik network setting"
    If Traefik is configured to discover containers on the OLD network name, it won't see CE containers. Check:
    
    ```bash
    docker inspect traefik --format '{{json .Args}}' | grep docker.network
    ```
    
    If it says `docker.network=saltbox` (or `cloudbox` or `plexguide`), you need to update it to `docker.network=proxy`. This is a one-time fix.

---

## Platform-Specific Notes

Click your platform to expand the instructions:

??? info "Coming from Saltbox"
    Saltbox stores configs at `/opt/<app>/` (without the `appdata` folder). CE expects `/opt/appdata/<app>/`. Move them:

    ```bash
    sudo mkdir -p /opt/appdata

    for app in sonarr radarr lidarr readarr prowlarr bazarr plex jellyfin tautulli nzbget sabnzbd qbittorrent; do
      if [ -d "/opt/$app" ]; then
        sudo mv /opt/$app /opt/appdata/$app
        echo "Moved $app"
      fi
    done

    sudo chown -R 1000:1000 /opt/appdata
    ```

    **Keep your Traefik:** Saltbox runs Traefik v3 — same as CE. If yours is working, leave it alone. CE templates are compatible.

    **Keep your Authelia:** If it's running, don't redeploy it. CE's Traefik + Authelia mode works with your existing Authelia setup — it just needs the `chain-authelia` middleware to be defined.

??? info "Coming from Cloudbox"
    Same path move as Saltbox — configs go from `/opt/<app>/` to `/opt/appdata/<app>/`. But Cloudbox runs **Traefik v1**, which is too old for CE templates.

    **Replace Traefik:**

    ```bash
    docker stop traefik && docker rm traefik
    ```

    Then deploy fresh Traefik through CE's dashboard (System & Utilities → Traefik).

    Cloudbox uses a specific media path structure:

    ```
    /mnt/unionfs/Media/Movies/
    /mnt/unionfs/Media/TV/
    ```

    If your media is still at `/mnt/unionfs/`, create a symlink:

    ```bash
    sudo ln -sf /mnt/unionfs/Media /mnt/Media
    ```

    After redeploying each media app, check the root folder paths in Sonarr/Radarr settings — they may need updating to match the new mount points.

??? info "Coming from PGBlitz / PlexGuide"
    The oldest migration path. PGBlitz uses Ansible (not Docker Compose), Traefik v1, and the `plexguide` Docker network.

    The good news: **app data is already in `/opt/appdata/`** — same as CE. No file moves needed.

    Steps:

    1. Create the CE network: `docker network create proxy`
    2. Install CE alongside PGBlitz (see Step 1 above)
    3. Deploy fresh Traefik through CE — don't try to keep Traefik v1
    4. Migrate apps one at a time

    **Cloud storage:** PGBlitz was built around Google Drive + rclone. If you're still using cloud storage, your rclone mounts at `/mnt` will continue working with CE. To move to local NAS storage instead, see [Moving from Cloud to Local](#moving-from-cloud-to-local-storage) below.

??? success "Coming from Dockserver"
    The easiest migration — Dockserver and HomelabARR CE share the same DNA. Same `/opt/appdata/` structure, same `proxy` network, same Traefik setup.

    1. Install CE alongside Dockserver
    2. Migrate apps one at a time through the CE dashboard
    3. Done

    Your `.env` variables, Traefik rules, and Authelia configs carry over as-is.

??? note "Coming from a custom Docker Compose setup"
    If you've been managing containers manually and using `/opt/appdata/` for data, you're already 90% there.

    1. Install CE (see Step 1)
    2. Redeploy your apps through the CE dashboard — they'll pick up the same configs
    3. Create the `proxy` network if you're using Traefik: `docker network create proxy`

    The main thing to verify: CE templates use `${APPFOLDER}/<app>` as the config volume path, which defaults to `/opt/appdata/<app>`. As long as your existing data is there, it carries over automatically.

---

## Moving from Cloud to Local Storage

If you're leaving Google Drive / rclone behind for local NAS storage:

### 1. Download your media

```bash
# Sync from Google Drive to your NAS
rclone sync gdrive:media /mnt/nas/media --progress --transfers 8
```

This can take days depending on library size. Start it in a `tmux` or `screen` session.

### 2. Set up NAS mounts

```bash
# SMB mount
sudo mkdir -p /mnt/nas/media
sudo mount -t cifs //nas.local/media /mnt/nas/media \
  -o uid=1000,gid=1000,username=user,password=pass
```

Add to `/etc/fstab` so it survives reboots:

```
//nas.local/media  /mnt/nas/media  cifs  uid=1000,gid=1000,username=user,password=pass,_netdev  0  0
```

### 3. Update app paths

After mounting your NAS, update the root folders in each media app:

| App | Setting Location | Old Path | New Path |
|-----|---|---|---|
| Sonarr | Settings → Media Management → Root Folders | `/mnt/unionfs/media/tv` | `/mnt/nas/media/tv` |
| Radarr | Settings → Media Management → Root Folders | `/mnt/unionfs/media/movies` | `/mnt/nas/media/movies` |
| Plex | Settings → Libraries | `/data/TV`, `/data/Movies` | Update to match new mounts |
| qBittorrent | Options → Downloads → Save Path | `/mnt/unionfs/downloads` | `/mnt/nas/downloads` |

### Why go local?

- **No API rate limits** — Google limits how fast you can read files
- **No cloud subscription costs** — your hardware, your storage
- **Better performance** — local I/O is way faster than cloud transfers
- **Simpler setup** — no rclone configs, mount scripts, or token refreshes

---

## Step 4: Clean Up

Once all your apps are running through CE and verified:

```bash
# Remove old platform files (pick the one that applies)
sudo rm -rf ~/cloudbox ~/saltbox /opt/plexguide /opt/pgblitz 2>/dev/null

# Remove old Docker network (after all containers are on proxy)
docker network rm cloudbox saltbox plexguide 2>/dev/null

# Clean up unused Docker images (frees disk space)
docker image prune -a

# Remove old cron jobs from previous platforms
crontab -l | grep -v "plexguide\|pgblitz\|saltbox\|cloudbox" | crontab -
```

!!! tip "Keep your rclone config"
    Even if you moved to local storage, keep a backup of `~/.config/rclone/rclone.conf`. You might need it to download remaining files from Google Drive later.

---

## Quick Reference

CE expects these paths and settings:

| What | Expected Value |
|---|---|
| App configs | `/opt/appdata/<app>/` |
| Docker network | `proxy` |
| Reverse proxy | Traefik v2 or v3 |
| Authentication | Authelia (optional) |
| SSL | Let's Encrypt via Cloudflare DNS |
| User/Group | 1000:1000 |

If your existing setup already matches these, migration is basically just "install CE and redeploy through the dashboard."

---

## Need Help?

- **[Discord](https://discord.gg/Pc7mXX786x)** — Ask in #help, someone's usually around
- **[GitHub Discussions](https://github.com/smashingtags/homelabarr-ce/discussions)** — For longer questions
- **[FAQ](faq.md)** — Common issues and fixes
