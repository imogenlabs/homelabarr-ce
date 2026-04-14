# HomelabARR CE

<p align="center">
    <a href="https://github.com/smashingtags/homelabarr-ce">
      <img src="wiki/docs/img/homelabarr-octopus-v2b.jpg" alt="HomelabARR CE" width="300">
    </a>
</p>

<p align="center"><strong>Your homelab, one dashboard.</strong></p>

<p align="center">
    <a href="https://github.com/smashingtags/homelabarr-ce/releases/latest">
        <img src="https://img.shields.io/github/v/release/smashingtags/homelabarr-ce?label=Release&logo=github" alt="Release">
    </a>
    <a href="https://github.com/smashingtags/homelabarr-ce/blob/main/LICENSE">
        <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License">
    </a>
    <a href="https://discord.gg/Pc7mXX786x">
        <img src="https://img.shields.io/discord/1334411584927301682?label=Discord&logo=discord&color=5865F2" alt="Discord">
    </a>
    <a href="https://wiki.homelabarr.com">
        <img src="https://img.shields.io/badge/Docs-Wiki-blue?logo=readthedocs&logoColor=white" alt="Documentation">
    </a>
    <a href="https://www.reddit.com/r/homelabarr/">
        <img src="https://img.shields.io/badge/Reddit-r/homelabarr-FF4500?logo=reddit&logoColor=white" alt="Reddit">
    </a>
</p>

<p align="center">
    <a href="https://github.com/smashingtags/homelabarr-ce/actions/workflows/github-code-scanning/codeql">
        <img src="https://github.com/smashingtags/homelabarr-ce/actions/workflows/github-code-scanning/codeql/badge.svg" alt="CodeQL">
    </a>
    <a href="https://snyk.io/test/github/smashingtags/homelabarr-ce">
        <img src="https://snyk.io/test/github/smashingtags/homelabarr-ce/badge.svg" alt="Snyk">
    </a>
</p>

<p align="center">
    <a href="https://ce-demo.homelabarr.com">
        <img src="https://img.shields.io/badge/Try_the_Demo-Live-brightgreen?logo=docker&logoColor=white" alt="CE Demo">
    </a>
    <a href="https://homelabarr.com">
        <img src="https://img.shields.io/badge/Website-homelabarr.com-FF8C1A?logo=firefox&logoColor=white" alt="HomelabARR">
    </a>
    <a href="https://imogenlabs.ai">
        <img src="https://img.shields.io/badge/Imogen_Labs-AI-8B5CF6" alt="Imogen Labs">
    </a>
</p>

---

## Project Status

> **Community-maintained.** HomelabARR CE is stable and actively used. New features go through the `dev` branch → `staging` → `main`. PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## What is HomelabARR?

You know how setting up self-hosted apps usually means Googling Docker Compose files, copying YAML, editing ports, and hoping it works? HomelabARR skips all of that.

It's a dashboard. You open it, you see a catalog of 100+ apps, you click **Deploy**, and the app is running. That's it.

Plex, Sonarr, Radarr, Jellyfin, Ollama, Home Assistant, qBittorrent — they're all in there, ready to go.

**Free and open source.** MIT license. No account required. No telemetry.

<p align="center">
    <img src="wiki/docs/img/screenshots/dark-dashboard.png" alt="HomelabARR Dashboard" width="700">
</p>

---

## Try It Right Now

Don't want to install anything yet? [**Open the live demo →**](https://ce-demo.homelabarr.com)

Login: `admin` / `admin`. Browse apps, click around. Nothing you do in the demo touches a real server.

---

## Install It (5 minutes)

You need a Linux machine with Docker installed. You don't need to write Compose files, but you do need basic shell access to your server.

```bash
# 1. Grab the code (cloning to /opt/homelabarr is recommended — it matches the default template path)
git clone https://github.com/smashingtags/homelabarr-ce.git /opt/homelabarr
cd /opt/homelabarr

# 2. Set three things (copy-paste these exactly)
export JWT_SECRET=$(openssl rand -base64 32)
export DOCKER_GID=$(getent group docker | cut -d: -f3)
export CORS_ORIGIN=http://$(hostname -I | awk '{print $1}'):8084

# 3. Start it
docker compose -f homelabarr.yml up -d
```

Open `http://your-server-ip:8084` in a browser. Log in with `admin` / `admin`. **Change the password right away** — or set `DEFAULT_ADMIN_PASSWORD` in your `.env` before first start if this won't be a throwaway local install.

That's the whole install.

> 💾 **For a permanent setup**, move those exports into a `.env` file in the same directory as `homelabarr.yml` instead of re-running them on every reboot. See the [configuration docs](https://wiki.homelabarr.com/guides/configuration/) for the full list of options.

> 📁 **Cloned somewhere other than `/opt/homelabarr`?** Set `CLI_BRIDGE_HOST_PATH` in your `.env` to match your clone path, or the app catalog won't load.

> 💡 **Don't have Docker?** Run `curl -fsSL https://get.docker.com | sh` first. Takes about a minute.

> ⚠️ **Running in a Proxmox LXC?** You might need to add `lxc.apparmor.profile: unconfined` to the container config. See the [FAQ](https://wiki.homelabarr.com/guides/faq/) for details.

Want to build from source instead? Check the [full install guide](https://wiki.homelabarr.com/guides/quick-start/).

---

## What You Get

- **100+ apps, one click each.** Media servers, download clients, monitoring, AI tools, virtual desktops, backup, and more.
- **Three ways to deploy.** Just IP:port, or with Traefik reverse proxy for SSL, or Traefik + Authelia for 2FA on top.
- **Manage running containers.** Start, stop, restart, remove, view logs — all from the dashboard.
- **Port Manager.** See every port in use across all your containers. Catch conflicts before they happen.
- **Add your own apps.** Drop a YAML file in `apps/myapps/` and it shows up in the catalog automatically.
- **Secure by default.** Login required, API keys for automation, rate limiting, security headers.
- **Dark mode.** Obviously.
- **Mobile app.** iOS and Android — manage your homelab from the couch.
- **CLI tool.** If you'd rather type than click, there's a terminal interface too.

---

## What Apps Are Included?

| Category | # | Some highlights |
|----------|---|-----------------|
| 🤖 AI & Machine Learning | 14 | Ollama, Open WebUI, ComfyUI, Stable Diffusion, LocalAI |
| 🎬 Media Servers | 5 | Plex, Jellyfin, Emby |
| 📚 Media Management | 16 | Sonarr, Radarr, Lidarr, Bazarr, Prowlarr |
| ⬇️ Downloads | 14 | qBittorrent, SABnzbd, NZBGet, Deluge, Transmission |
| 📊 Monitoring | 9 | Grafana, Netdata, Uptime Kuma, Tautulli |
| 🌐 Self-hosted | 37 | Nextcloud, Vaultwarden, Immich, Home Assistant, n8n |
| ⚙️ System | 13 | Portainer, Dozzle, Watchtower, Traefik |
| 🖥️ Virtual Desktops | 10 | Kasm Workspaces, Firefox, Chrome, Tor Browser |
| 🎞️ Transcoding | 5 | Tdarr, Handbrake, MakeMKV |
| 💾 Backup | 3 | Duplicati, Restic |
| 📁 My Apps | — | Whatever you add |

Every template is just a Docker Compose YAML file in `apps/<category>/`. You can read them, edit them, or write your own.

---

## What Does It Look Like Inside?

Two containers. That's the whole thing.

| Piece | What it does | Port |
|-------|-------------|------|
| **Frontend** | The dashboard you see in your browser. React app served by nginx. | 8084 |
| **Backend** | Reads app templates, talks to Docker, handles login. Node.js + Express. | 8092 |

The frontend sends API requests to the backend. The backend talks to the Docker socket to start and stop containers. Simple.

<p align="center">
    <img src="wiki/docs/img/diagrams/system-architecture.png" alt="How it works" width="700">
</p>

Want the deep dive? [Architecture docs →](https://wiki.homelabarr.com/guides/architecture/)

---

## Settings You Might Want to Change

| Setting | Do you need it? | What it does |
|---------|----------------|-------------|
| `JWT_SECRET` | **Yes** | Keeps your login secure. The install command generates one for you. |
| `DOCKER_GID` | **Yes** | Tells the backend which group can talk to Docker. The install command figures this out. |
| `CORS_ORIGIN` | **Yes** | The URL you open the dashboard at. If login won't work, this is probably wrong. |
| `DEFAULT_ADMIN_PASSWORD` | Optional | Change the default password (it's `admin` if you don't set this). |
| `TZ` | Optional | Your timezone. Defaults to `America/New_York`. |

All the config options: [wiki.homelabarr.com/guides/configuration](https://wiki.homelabarr.com/guides/configuration/)

---

## Repo Structure

```
homelabarr-ce/
├── src/              # React frontend (Vite + shadcn/ui)
├── server/           # Node.js + Express backend
├── apps/             # App templates (one YAML per app, organized by category)
│   ├── ai/           # AI & machine learning tools
│   ├── downloads/    # Download clients
│   ├── media-servers/
│   ├── self-hosted/
│   ├── myapps/       # ← your custom templates go here
│   └── ...
├── wiki/             # Source for wiki.homelabarr.com (MkDocs)
├── .github/          # CI workflows, issue/PR templates, security policy
├── traefik/          # Example Traefik config for reverse proxy setup
├── homelabarr.yml    # The Docker Compose file you run
└── nginx.conf        # nginx config baked into the frontend image
```

---

## Want to Hack on It?

```bash
npm install
npm run dev       # Runs the dashboard on :5173 and the API on :8092
npm run build     # Build for production
npm test          # Run the test suite
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to submit changes.

---

## Security

We scan this project with four different tools, automatically, on every push:

| Tool | What it checks |
|------|---------------|
| [CodeQL](https://github.com/smashingtags/homelabarr-ce/security/code-scanning) | The actual code — injection bugs, XSS, that kind of thing |
| [Snyk](https://snyk.io/test/github/smashingtags/homelabarr-ce) | Every npm package and Docker base image for known vulnerabilities |
| [Dependabot](https://github.com/smashingtags/homelabarr-ce/security/dependabot) | Outdated packages that have security patches available |
| [Docker Scout](https://hub.docker.com/r/smashingtags/homelabarr-frontend) | The finished container images, plus supply chain attestations |

<p align="center">
    <img src="docs/images/scout-frontend-A.png" alt="Frontend Scout Score A" width="500">
</p>
<p align="center"><em>Frontend image — Scout Score A</em></p>

Containers run as a non-root user. All the usual security headers are on. Rate limiting is on. Session tokens use `crypto.randomBytes`, not `Math.random`.

### How Credentials Are Stored

Your passwords never touch disk in plain text.

| What | How it's protected |
|------|-------------------|
| **Passwords** | Hashed with bcrypt (12 rounds). Even if someone gets the file, they get `$2a$12$xK9...`, not your password. |
| **JWT tokens** | Signed with your `JWT_SECRET` env var. Expire after 24 hours. |
| **API keys** | Generated with `crypto.randomBytes(32)` — 256 bits of entropy, prefixed `hlr_`. |
| **Sessions** | Random IDs via `crypto.randomBytes(12)`. Stored server-side, invalidated on logout. |

User accounts, API keys, and sessions are stored in `/app/server/config/` inside the backend container. The `homelabarr-config` Docker volume persists this data across container updates. If you're running behind Traefik + Authelia (which the templates include), you get an additional layer of authentication before anyone even reaches the login page.

**Important:** Set a real `JWT_SECRET` when you deploy. The install instructions use `openssl rand -base64 32` to generate one. If you skip this, a random key is generated on each container start — which means all sessions invalidate on every restart.

Found a vulnerability? Email **michael@mjashley.com** — see [SECURITY.md](SECURITY.md).

---

## Links

| | |
|---|---|
| 🌐 **Website** | [homelabarr.com](https://homelabarr.com) |
| 📖 **Docs** | [wiki.homelabarr.com](https://wiki.homelabarr.com) |
| 🎮 **Demo** | [ce-demo.homelabarr.com](https://ce-demo.homelabarr.com) — log in with admin / admin |
| 💬 **Discord** | [discord.gg/Pc7mXX786x](https://discord.gg/Pc7mXX786x) |
| 📣 **Reddit** | [r/homelabarr](https://www.reddit.com/r/homelabarr/) |
| 🏢 **Company** | [imogenlabs.ai](https://imogenlabs.ai) |
| 👤 **Developer** | [mjashley.com](https://mjashley.com) |

---

## Contributors

<table>
<tr>
    <td align="center"><a href="https://github.com/smashingtags"><img src="https://avatars.githubusercontent.com/u/48292010?v=4" width="50" style="border-radius:50%" /><br /><sub><b>smashingtags</b></sub></a></td>
    <td align="center"><a href="https://github.com/fscorrupt"><img src="https://avatars.githubusercontent.com/u/45659314?v=4" width="50" style="border-radius:50%" /><br /><sub><b>FSCorrupt</b></sub></a></td>
    <td align="center"><a href="https://github.com/drag0n141"><img src="https://avatars.githubusercontent.com/u/44865095?v=4" width="50" style="border-radius:50%" /><br /><sub><b>DrAg0n141</b></sub></a></td>
    <td align="center"><a href="https://github.com/aelfa"><img src="https://avatars.githubusercontent.com/u/60222501?v=4" width="50" style="border-radius:50%" /><br /><sub><b>Aelfa</b></sub></a></td>
    <td align="center"><a href="https://github.com/cyb3rgh05t"><img src="https://avatars.githubusercontent.com/u/5200101?v=4" width="50" style="border-radius:50%" /><br /><sub><b>cyb3rgh05t</b></sub></a></td>
    <td align="center"><a href="https://github.com/justinglock40"><img src="https://avatars.githubusercontent.com/u/23133649?v=4" width="50" style="border-radius:50%" /><br /><sub><b>justinglock40</b></sub></a></td>
    <td align="center"><a href="https://github.com/mrfret"><img src="https://avatars.githubusercontent.com/u/72273384?v=4" width="50" style="border-radius:50%" /><br /><sub><b>mrfret</b></sub></a></td>
</tr>
<tr>
    <td align="center"><a href="https://github.com/dan3805"><img src="https://avatars.githubusercontent.com/u/35934387?v=4" width="50" style="border-radius:50%" /><br /><sub><b>DoCtEuR3805</b></sub></a></td>
    <td align="center"><a href="https://github.com/brtbach"><img src="https://avatars.githubusercontent.com/u/24246495?v=4" width="50" style="border-radius:50%" /><br /><sub><b>brtbach</b></sub></a></td>
    <td align="center"><a href="https://github.com/ramsaytc"><img src="https://avatars.githubusercontent.com/u/16809662?v=4" width="50" style="border-radius:50%" /><br /><sub><b>ramsaytc</b></sub></a></td>
    <td align="center"><a href="https://github.com/Shayne55434"><img src="https://avatars.githubusercontent.com/u/37595910?v=4" width="50" style="border-radius:50%" /><br /><sub><b>Shayne</b></sub></a></td>
    <td align="center"><a href="https://github.com/Nossersvinet"><img src="https://avatars.githubusercontent.com/u/83166809?v=4" width="50" style="border-radius:50%" /><br /><sub><b>Nossersvinet</b></sub></a></td>
    <td align="center"><a href="https://github.com/ookla-ariel-ride"><img src="https://avatars.githubusercontent.com/u/42082417?v=4" width="50" style="border-radius:50%" /><br /><sub><b>Ookla, Ariel, Ride!</b></sub></a></td>
</tr>
<tr>
    <td align="center"><a href="https://github.com/townsmcp"><img src="https://avatars.githubusercontent.com/u/14061617?v=4" width="50" style="border-radius:50%" /><br /><sub><b>James Townsend</b></sub></a></td>
    <td align="center"><a href="https://github.com/red-daut"><img src="https://avatars.githubusercontent.com/u/78737369?v=4" width="50" style="border-radius:50%" /><br /><sub><b>Red Daut</b></sub></a></td>
    <td align="center"><a href="https://github.com/DomesticWarlord"><img src="https://avatars.githubusercontent.com/u/57776315?v=4" width="50" style="border-radius:50%" /><br /><sub><b>DomesticWarlord</b></sub></a></td>
</tr>
</table>

## License

[MIT](LICENSE) — do whatever you want with it.
