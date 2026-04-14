# White-Label Audit (auto-generated)

> **Generated:** 2026-04-14 09:37 UTC · **Source:** `scripts/generate-whitelabel-audit.sh`
>
> This file is regenerated automatically on every push to `main`.
> Do not edit by hand — your changes will be overwritten. See the companion
> [White-Label & Forking guide](white-label.md) for the narrative walkthrough.

**Total brand references found:** 360

---

## User-facing UI (`src/`, `index.html`)

**20 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `src/App.tsx` | 522 | `              const isEnhancedMount = app.name.includes('homelabarr-mount-enhanced') \|\|` |
| `src/App.tsx` | 877 | `            <a href="https://wiki.homelabarr.com" target="_blank" rel="noopener noreferrer" className="hover:text-foregr` |
| `src/App.tsx` | 878 | `            <a href="https://discord.gg/Pc7mXX786x" target="_blank" rel="noopener noreferrer" className="hover:text-fore` |
| `src/App.tsx` | 879 | `            <a href="https://github.com/smashingtags/homelabarr-ce" target="_blank" rel="noopener noreferrer" className=` |
| `src/components/DeploymentProgressModal.tsx` | 135 | `      const token = localStorage.getItem('homelabarr_token');` |
| `src/components/EnhancedMountOnboarding.tsx` | 36 | `      helpUrl: 'https://docs.homelabarr.com/installation/traefik'` |
| `src/components/EnhancedMountOnboarding.tsx` | 44 | `      helpUrl: 'https://docs.homelabarr.com/installation/authelia'` |
| `src/components/EnhancedMountOnboarding.tsx` | 52 | `      helpUrl: 'https://docs.homelabarr.com/setup/domain'` |
| `src/components/HelpModal.tsx` | 107 | `                  { label: "Wiki & Docs", href: "https://wiki.homelabarr.com", desc: "Full documentation" },` |
| `src/components/HelpModal.tsx` | 108 | `                  { label: "GitHub", href: "https://github.com/smashingtags/homelabarr-ce", desc: "Source code & issues"` |
| `src/components/HelpModal.tsx` | 109 | `                  { label: "Discord Community", href: "https://discord.gg/Pc7mXX786x", desc: "Get help & chat" },` |
| `src/components/HelpModal.tsx` | 110 | `                  { label: "Reddit", href: "https://reddit.com/r/homelabarr", desc: "r/homelabarr" },` |
| `src/contexts/AuthContext.tsx` | 31 | `const TOKEN_KEY = 'homelabarr_token';` |
| `src/contexts/AuthContext.tsx` | 32 | `const USER_KEY = 'homelabarr_user';` |
| `src/data/app-metadata.ts` | 198 | `  'homelabarr-uploader': Zap,` |
| `src/data/app-metadata.ts` | 199 | `  'homelabarr-web-interface': LayoutDashboard,` |
| `src/lib/api.ts` | 8 | `  const token = localStorage.getItem('homelabarr_token');` |
| `src/lib/api.ts` | 19 | `      localStorage.removeItem('homelabarr_token');` |
| `src/lib/api.ts` | 20 | `      localStorage.removeItem('homelabarr_user');` |
| `src/utils/iconMap.ts` | 14 | `const availableIcons = new Set(["alltube", "amd", "aria", "autoscan", "backup", "bazarr", "bazarr4k", "bitwarden", "cali` |

## Backend & server (`server/`, `docker-entrypoint.sh`)

**19 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `server/auth.js` | 23 | `  email: 'admin@homelabarr.local',` |
| `server/cli-bridge.js` | 708 | `      ARIA_RPC_SECRET: 'homelabarr',` |
| `server/environment-manager.js` | 101 | `      jwtSecret: process.env.JWT_SECRET \|\| 'homelabarr-default-secret-change-in-production',` |
| `server/environment-manager.js` | 208 | `      if (config.jwtSecret === 'homelabarr-default-secret-change-in-production') {` |
| `server/index.js` | 3622 | `        const containerName = 'homelabarr-${appId}-${Date.now()}';` |
| `server/index.js` | 3759 | `        const containerName = 'homelabarr-${appId}-${Date.now()}';` |
| `server/index.js` | 3865 | `        const containerName = 'homelabarr-${appId}-${Date.now()}';` |
| `server/index.js` | 4019 | `          // Create homelabarr network if it doesn't exist` |
| `server/index.js` | 4020 | `          const homelabarrExists = networks.some(n => n.Name === 'homelabarr');` |
| `server/index.js` | 4021 | `          if (!homelabarrExists) {` |
| `server/index.js` | 4022 | `            console.log('Creating homelabarr network');` |
| `server/index.js` | 4024 | `              Name: 'homelabarr',` |
| `server/index.js` | 4127 | `        NetworkMode: 'homelabarr', // Use homelabarr network by default` |
| `server/index.js` | 4191 | `          const homelabarrNetwork = docker.getNetwork('homelabarr');` |
| `server/index.js` | 4192 | `          await homelabarrNetwork.connect({ Container: container.id });` |
| `server/index.js` | 4193 | `          console.log('Connected to homelabarr network');` |
| `server/network-manager.js` | 139 | `                'sqlite://./data/homelabarr.db',` |
| `server/network-manager.js` | 161 | `      serviceUrls.database = process.env.DATABASE_URL \|\| 'sqlite:///app/data/homelabarr.db';` |
| `server/start.sh` | 61 | `# Fix ownership if running as homelabarr but files are root-owned (bind mount)` |

## Docker (`Dockerfile*`, `homelabarr.yml`)

**41 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `Dockerfile` | 21 | `RUN addgroup -g 1001 -S homelabarr &&     adduser -S homelabarr -u 1001 -G homelabarr` |
| `Dockerfile` | 31 | `RUN mkdir -p /var/cache/nginx/client_temp              /var/cache/nginx/proxy_temp              /var/cache/nginx/fastcgi` |
| `Dockerfile` | 33 | `USER homelabarr` |
| `Dockerfile` | 46 | `LABEL org.opencontainers.image.source="https://github.com/smashingtags/homelabarr-ce"` |
| `Dockerfile.backend` | 33 | `# Create homelabarr user with sudo access` |
| `Dockerfile.backend` | 34 | `RUN addgroup -g 1001 homelabarr && \` |
| `Dockerfile.backend` | 35 | `    adduser -u 1001 -G homelabarr -s /bin/bash -D homelabarr && \` |
| `Dockerfile.backend` | 36 | `    echo 'homelabarr ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers` |
| `Dockerfile.backend` | 54 | `RUN mkdir -p /homelabarr` |
| `Dockerfile.backend` | 66 | `    /var/log/homelabarr && \` |
| `Dockerfile.backend` | 67 | `    chown -R homelabarr:homelabarr \` |
| `Dockerfile.backend` | 69 | `    /homelabarr \` |
| `Dockerfile.backend` | 70 | `    /var/log/homelabarr` |
| `Dockerfile.backend` | 81 | `# Switch to homelabarr user` |
| `Dockerfile.backend` | 82 | `USER homelabarr` |
| `Dockerfile.backend` | 96 | `LABEL org.opencontainers.image.source="https://github.com/smashingtags/homelabarr-ce"` |
| `homelabarr.yml` | 5 | `# 1. Set CLI_BRIDGE_HOST_PATH to your actual homelabarr installation path` |
| `homelabarr.yml` | 11 | `#   docker-compose -f homelabarr.yml up -d` |
| `homelabarr.yml` | 15 | `    image: ghcr.io/smashingtags/homelabarr-frontend:latest` |
| `homelabarr.yml` | 16 | `    container_name: homelabarr-frontend` |
| `homelabarr.yml` | 24 | `      - homelabarr` |
| `homelabarr.yml` | 35 | `    image: ghcr.io/smashingtags/homelabarr-backend:latest` |
| `homelabarr.yml` | 36 | `    container_name: homelabarr-backend` |
| `homelabarr.yml` | 52 | `      - CLI_BRIDGE_PATH=/homelabarr` |
| `homelabarr.yml` | 70 | `      # CLI Bridge mount - CRITICAL: Update this path to your actual homelabarr installation` |
| `homelabarr.yml` | 72 | `      #   - /opt/homelabarr:/homelabarr:rw                    # Standard Linux installation` |
| `homelabarr.yml` | 73 | `      #   - /home/user/homelabarr:/homelabarr:rw              # User installation` |
| `homelabarr.yml` | 74 | `      #   - /Users/username/homelabarr:/homelabarr:rw         # macOS installation` |
| `homelabarr.yml` | 75 | `      - ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:rw` |
| `homelabarr.yml` | 78 | `      - homelabarr-data:/app/data` |
| `homelabarr.yml` | 81 | `      - homelabarr-config:/app/server/config` |
| `homelabarr.yml` | 84 | `      - homelabarr-activity:/app/server/activity-data` |
| `homelabarr.yml` | 89 | `      - homelabarr` |
| `homelabarr.yml` | 100 | `  homelabarr:` |
| `homelabarr.yml` | 101 | `    name: homelabarr` |
| `homelabarr.yml` | 105 | `  homelabarr-data:` |
| `homelabarr.yml` | 106 | `    name: homelabarr-data` |
| `homelabarr.yml` | 108 | `  homelabarr-config:` |
| `homelabarr.yml` | 109 | `    name: homelabarr-config` |
| `homelabarr.yml` | 111 | `  homelabarr-activity:` |
| `homelabarr.yml` | 112 | `    name: homelabarr-activity` |

## CI/CD workflows (`.github/workflows/`)

**12 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `.github/workflows/docker-build-push.yml` | 19 | `  NAMESPACE: smashingtags` |
| `.github/workflows/docker-build-push.yml` | 20 | `  FRONTEND_IMAGE_NAME: homelabarr-frontend` |
| `.github/workflows/docker-build-push.yml` | 21 | `  BACKEND_IMAGE_NAME: homelabarr-backend` |
| `.github/workflows/docker-build-push.yml` | 145 | `        # Update homelabarr.yml with latest image tags` |
| `.github/workflows/docker-build-push.yml` | 146 | `        sed -i 's\|ghcr.io/.*/homelabarr-frontend:.*\|${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.FRONTEND_IMAGE_NA` |
| `.github/workflows/docker-build-push.yml` | 147 | `        sed -i 's\|ghcr.io/.*/homelabarr-backend:.*\|${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.BACKEND_IMAGE_NAME` |
| `.github/workflows/docker-build-push.yml` | 170 | `        echo "curl -o homelabarr.yml https://raw.githubusercontent.com/${{ github.repository }}/main/homelabarr.yml" >> ` |
| `.github/workflows/docker-build-push.yml` | 173 | `        echo "export CLI_BRIDGE_HOST_PATH=/path/to/your/homelabarr-cli" >> $GITHUB_STEP_SUMMARY` |
| `.github/workflows/docker-build-push.yml` | 180 | `        echo "docker-compose -f homelabarr.yml up -d" >> $GITHUB_STEP_SUMMARY` |
| `.github/workflows/docker-build-push.yml` | 197 | `        payload="{\"embeds\":[{\"title\":\"HomelabARR CE $TAG Released\",\"author\":{\"name\":\"Imogen Labs\"},\"color\"` |
| `.github/workflows/e2e-tests.yml` | 20 | `            url: https://ce-dev.homelabarr.com` |
| `.github/workflows/e2e-tests.yml` | 23 | `          #   url: https://ce-staging.homelabarr.com` |

## Config files (`package.json`, `CNAME`, `.env.example`, `nginx.conf.template`)

**4 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `.env.example` | 23 | `# If you cloned to /opt/homelabarr (recommended), leave this as-is.` |
| `.env.example` | 24 | `CLI_BRIDGE_HOST_PATH=/opt/homelabarr` |
| `CNAME` | 1 | `wiki.homelabarr.com` |
| `package.json` | 2 | `  "name": "homelabarr",` |

## Install & utility scripts

**34 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `install-remote.sh` | 4 | `# Usage: sudo wget -qO- https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/install-remote.sh \| sudo bash` |
| `install-remote.sh` | 9 | `REPO="https://github.com/smashingtags/homelabarr-ce.git"` |
| `install-remote.sh` | 10 | `INSTALL_DIR="/opt/homelabarr"` |
| `install-remote.sh` | 11 | `BIN_NAME="homelabarr-cli"` |
| `install-remote.sh` | 69 | `echo "    Run the installer:  sudo homelabarr-cli -i"` |
| `install-remote.sh` | 72 | `echo "    Wiki: https://smashingtags.github.io/homelabarr-ce/"` |
| `install-remote.sh` | 73 | `echo "    Discord: https://discord.gg/Pc7mXX786x"` |
| `preinstall/README.md` | 26 | `Image: ghcr.io/smashingtags/homelabarr-cli/docker-local-persist:latest` |
| `preinstall/README.md` | 71 | `cd /path/to/homelabarr-cli` |
| `preinstall/installer/subinstall/lxc.sh` | 16 | `  if [[ ! -f "/home/.lxcstart.sh" ]]; then $(command -v rsync) -aqhv /opt/homelabarr/preinstall/installer/subinstall/lxc` |
| `preinstall/installer/subinstall/lxc.sh` | 20 | `    $(command -v ansible-playbook) /opt/homelabarr/preinstall/installer/subinstall/lxc.yml 1>/dev/null 2>&1` |
| `preinstall/installer/subinstall/lxc.sh` | 23 | `  if [[ -f "/home/.lxcstart.sh" ]]; then $(command -v ansible-playbook) /opt/homelabarr/preinstall/installer/subinstall/` |
| `preinstall/installer/ubuntu.sh` | 57 | `mkdir -p /opt/homelabarr` |
| `preinstall/installer/ubuntu.sh` | 61 | `chown -R 1000:1000 /opt/homelabarr` |
| `preinstall/templates/local/gpu.sh` | 5 | `# Docker owned homelabarr-cli                 #` |
| `preinstall/templates/local/gpu.sh` | 6 | `# Docker Maintainer homelabarr-cli            #` |
| `preinstall/templates/local/gpu.sh` | 9 | `# Author(s):  homelabarr-cli                  #` |
| `scripts/detect-lxc-storage.sh` | 214 | `        echo "   • Edit: /opt/homelabarr/config/storage-override.json"` |
| `scripts/detect-lxc-storage.sh` | 234 | `    local CONFIG_DIR="/opt/homelabarr/config"` |
| `scripts/fix-storage-detection.sh` | 14 | `CONFIG_DIR="/opt/homelabarr/config"` |
| `scripts/fix-storage-detection.sh` | 151 | `echo "  3. Check logs: docker logs homelabarr-api"` |
| `scripts/intelligent-storage-detection.sh` | 383 | `    local CONFIG_DIR="/opt/homelabarr/config"` |
| `scripts/test/test-ecosystem.sh` | 174 | `    # Test homelabarr network` |
| `scripts/test/test-ecosystem.sh` | 175 | `    if docker network inspect homelabarr > /dev/null 2>&1; then` |
| `scripts/test/test-ecosystem.sh` | 182 | `    if docker ps --filter "name=homelabarr_backend" --format "{{.Names}}" \| grep -q "homelabarr_backend"; then` |
| `scripts/test/test-ecosystem.sh` | 183 | `        test_service_connectivity "homelabarr_backend" "mount-enhanced" "8080"` |
| `scripts/test/test-ecosystem.sh` | 184 | `        test_service_connectivity "homelabarr_backend" "homelabarr-uploader" "9999"` |
| `scripts/test/test-ecosystem.sh` | 197 | `    if docker ps --filter "name=homelabarr_backend" --format "{{.Ports}}" \| grep -q "8092"; then` |
| `scripts/test/test-ecosystem.sh` | 228 | `        "/opt/appdata/homelabarr"` |
| `scripts/test/test-ecosystem.sh` | 269 | `        "apps/system/homelabarr-uploader.yml"` |
| `scripts/test/test-ecosystem.sh` | 270 | `        "apps/system/homelabarr-web-interface.yml"` |
| `scripts/test/test-ecosystem.sh` | 327 | `        "homelabarr_backend_data:/opt/appdata/homelabarr/backend/data"` |
| `scripts/test/test-ecosystem.sh` | 367 | `            echo "  • Web Interface: https://homelabarr.$domain"` |
| `scripts/validate-templates.sh` | 15 | `RESULTS_DIR="/tmp/homelabarr-validate"` |

## Root documentation

**59 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `CHANGELOG.md` | 6 | `- **Container delete/stop/restart**: Docker client was never passed to the CLI manager. All container operations now wor` |
| `CHANGELOG.md` | 7 | `- **Docker socket permissions**: Apps that mount 'docker.sock' (Portainer, etc.) now get 'group_add' injected at deploy ` |
| `CHANGELOG.md` | 8 | `- **Read-only template volumes**: Temp deploy YAMLs now write to 'server/data/' instead of next to the source YAML, so d` |
| `CHANGELOG.md` | 9 | `- **Deploy progress stream**: SSE 'connected' event now includes the server-assigned 'clientId', fixing "Client not foun` |
| `CHANGELOG.md` | 12 | `- **npm vulnerabilities patched**: vite, hono, @hono/node-server bumped to address 9 advisories (3 high, 6 moderate). ([` |
| `CHANGELOG.md` | 13 | `- **Workflow permissions**: Added explicit 'permissions: contents: read' to all workflows missing it. Resolves CodeQL al` |
| `CHANGELOG.md` | 16 | `- **Wiki cleanup**: Removed Professional Edition section; replaced placeholder octopus with optimized v3b WebP at proper` |
| `CONTRIBUTING.md` | 7 | `1. **Ideas start in Discord** — Drop suggestions in [#feature-requests](https://discord.gg/Pc7mXX786x) or open a [GitH` |
| `CONTRIBUTING.md` | 17 | `\| 'main' \| Production — stable, released \| [ce-demo.homelabarr.com](https://ce-demo.homelabarr.com) \| Safe to run ` |
| `CONTRIBUTING.md` | 18 | `\| 'staging' \| Release candidate — 1 week community soak \| [ce-staging.homelabarr.com](https://ce-staging.homelabarr` |
| `CONTRIBUTING.md` | 19 | `\| 'dev' \| Active development — proposed changes \| [ce-dev.homelabarr.com](https://ce-dev.homelabarr.com) \| May bre` |
| `CONTRIBUTING.md` | 55 | `- Open a [GitHub Issue](https://github.com/smashingtags/homelabarr-ce/issues)` |
| `CONTRIBUTING.md` | 56 | `- Or drop it in [#help](https://discord.gg/Pc7mXX786x) on Discord` |
| `CONTRIBUTING.md` | 61 | `- **Discord**: [discord.gg/Pc7mXX786x](https://discord.gg/Pc7mXX786x)` |
| `CONTRIBUTING.md` | 62 | `- **Reddit**: [r/homelabarr](https://reddit.com/r/homelabarr)` |
| `CONTRIBUTING.md` | 63 | `- **Ko-fi**: [ko-fi.com/homelabarr](https://ko-fi.com/homelabarr)` |
| `CONTRIBUTING.md` | 64 | `- **Discussions**: [GitHub Discussions](https://github.com/smashingtags/homelabarr-ce/discussions)` |
| `README.md` | 4 | `    <a href="https://github.com/smashingtags/homelabarr-ce">` |
| `README.md` | 5 | `      <img src="wiki/docs/img/homelabarr-octopus-v2b.jpg" alt="HomelabARR CE" width="300">` |
| `README.md` | 12 | `    <a href="https://github.com/smashingtags/homelabarr-ce/releases/latest">` |
| `README.md` | 13 | `        <img src="https://img.shields.io/github/v/release/smashingtags/homelabarr-ce?label=Release&logo=github" alt="Rel` |
| `README.md` | 15 | `    <a href="https://github.com/smashingtags/homelabarr-ce/blob/main/LICENSE">` |
| `README.md` | 18 | `    <a href="https://discord.gg/Pc7mXX786x">` |
| `README.md` | 21 | `    <a href="https://wiki.homelabarr.com">` |
| `README.md` | 24 | `    <a href="https://www.reddit.com/r/homelabarr/">` |
| `README.md` | 25 | `        <img src="https://img.shields.io/badge/Reddit-r/homelabarr-FF4500?logo=reddit&logoColor=white" alt="Reddit">` |
| `README.md` | 30 | `    <a href="https://github.com/smashingtags/homelabarr-ce/actions/workflows/github-code-scanning/codeql">` |
| `README.md` | 31 | `        <img src="https://github.com/smashingtags/homelabarr-ce/actions/workflows/github-code-scanning/codeql/badge.svg"` |
| `README.md` | 33 | `    <a href="https://snyk.io/test/github/smashingtags/homelabarr-ce">` |
| `README.md` | 34 | `        <img src="https://snyk.io/test/github/smashingtags/homelabarr-ce/badge.svg" alt="Snyk">` |
| `README.md` | 39 | `    <a href="https://ce-demo.homelabarr.com">` |
| `README.md` | 42 | `    <a href="https://homelabarr.com">` |
| `README.md` | 43 | `        <img src="https://img.shields.io/badge/Website-homelabarr.com-FF8C1A?logo=firefox&logoColor=white" alt="HomelabA` |
| `README.md` | 76 | `Don't want to install anything yet? [**Open the live demo →**](https://ce-demo.homelabarr.com)` |
| `README.md` | 87 | `# 1. Grab the code (cloning to /opt/homelabarr is recommended — it matches the default template path)` |
| `README.md` | 88 | `git clone https://github.com/smashingtags/homelabarr-ce.git /opt/homelabarr` |
| `README.md` | 89 | `cd /opt/homelabarr` |
| `README.md` | 97 | `docker compose -f homelabarr.yml up -d` |
| `README.md` | 104 | `> 💾 **For a permanent setup**, move those exports into a '.env' file in the same directory as 'homelabarr.yml' instea` |
| `README.md` | 106 | `> 📁 **Cloned somewhere other than '/opt/homelabarr'?** Set 'CLI_BRIDGE_HOST_PATH' in your '.env' to match your clone ` |
| `README.md` | 110 | `> ⚠️ **Running in a Proxmox LXC?** You might need to add 'lxc.apparmor.profile: unconfined' to the container config.` |
| `README.md` | 112 | `Want to build from source instead? Check the [full install guide](https://wiki.homelabarr.com/guides/quick-start/).` |
| `README.md` | 165 | `Want the deep dive? [Architecture docs →](https://wiki.homelabarr.com/guides/architecture/)` |
| `README.md` | 179 | `All the config options: [wiki.homelabarr.com/guides/configuration](https://wiki.homelabarr.com/guides/configuration/)` |
| `README.md` | 186 | `homelabarr-ce/` |
| `README.md` | 196 | `├── wiki/             # Source for wiki.homelabarr.com (MkDocs)` |
| `README.md` | 199 | `├── homelabarr.yml    # The Docker Compose file you run` |
| `README.md` | 224 | `\| [CodeQL](https://github.com/smashingtags/homelabarr-ce/security/code-scanning) \| The actual code — injection bugs,` |
| `README.md` | 225 | `\| [Snyk](https://snyk.io/test/github/smashingtags/homelabarr-ce) \| Every npm package and Docker base image for known v` |
| `README.md` | 226 | `\| [Dependabot](https://github.com/smashingtags/homelabarr-ce/security/dependabot) \| Outdated packages that have securi` |
| `README.md` | 227 | `\| [Docker Scout](https://hub.docker.com/r/smashingtags/homelabarr-frontend) \| The finished container images, plus supp` |
| `README.md` | 247 | `User accounts, API keys, and sessions are stored in '/app/server/config/' inside the backend container. The 'homelabarr-` |
| `README.md` | 259 | `\| 🌐 **Website** \| [homelabarr.com](https://homelabarr.com) \|` |
| `README.md` | 260 | `\| 📖 **Docs** \| [wiki.homelabarr.com](https://wiki.homelabarr.com) \|` |
| `README.md` | 261 | `\| 🎮 **Demo** \| [ce-demo.homelabarr.com](https://ce-demo.homelabarr.com) — log in with admin / admin \|` |
| `README.md` | 262 | `\| 💬 **Discord** \| [discord.gg/Pc7mXX786x](https://discord.gg/Pc7mXX786x) \|` |
| `README.md` | 263 | `\| 📣 **Reddit** \| [r/homelabarr](https://www.reddit.com/r/homelabarr/) \|` |
| `README.md` | 273 | `    <td align="center"><a href="https://github.com/smashingtags"><img src="https://avatars.githubusercontent.com/u/48292` |
| `SECURITY.md` | 9 | `\| Latest release \| Yes — see [Releases](https://github.com/smashingtags/homelabarr-ce/releases/latest) \|` |

## Wiki content

**78 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `wiki/docs/CNAME` | 1 | `wiki.homelabarr.com` |
| `wiki/docs/guides/architecture.md` | 98 | `homelabarr-data/        # Docker volume — HomelabARR settings (users, sessions)` |
| `wiki/docs/guides/architecture.md` | 127 | `2. Pushes to GitHub Container Registry ('ghcr.io/smashingtags/')` |
| `wiki/docs/guides/cli-installation.md` | 10 | `curl -fsSL https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/install-remote.sh \| sudo bash` |
| `wiki/docs/guides/cli-installation.md` | 14 | `    You can [review the full script](https://github.com/smashingtags/homelabarr-ce/blob/main/install-remote.sh) before r` |
| `wiki/docs/guides/cli-installation.md` | 19 | `2. Download the HomelabARR repo to '/opt/homelabarr'` |
| `wiki/docs/guides/cli-installation.md` | 46 | `cd /opt/homelabarr` |
| `wiki/docs/guides/cli-installation.md` | 52 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/configuration.md` | 56 | `\| 'CLI_BRIDGE_HOST_PATH' \| '/opt/homelabarr' \| Path to the repo with app templates (must contain 'apps/') \|` |
| `wiki/docs/guides/configuration.md` | 62 | `Instead of typing 'export' commands every time — which only last until you close your terminal — save your settings ` |
| `wiki/docs/guides/configuration.md` | 91 | `docker compose -f homelabarr.yml --env-file .env up -d` |
| `wiki/docs/guides/configuration.md` | 113 | `- 'homelabarr-data' — app data and logs` |
| `wiki/docs/guides/configuration.md` | 114 | `- 'homelabarr-config' — user accounts, API keys, and sessions ('/app/server/config/')` |
| `wiki/docs/guides/configuration.md` | 129 | `All auth data is stored in '/app/server/config/' inside the backend container, persisted by the 'homelabarr-config' volu` |
| `wiki/docs/guides/contributing.md` | 8 | `- Report issues through [GitHub Issues](https://github.com/smashingtags/homelabarr-ce/issues)` |
| `wiki/docs/guides/contributing.md` | 52 | `git clone https://github.com/YOUR_USERNAME/homelabarr-ce.git` |
| `wiki/docs/guides/contributing.md` | 53 | `cd homelabarr-ce` |
| `wiki/docs/guides/contributing.md` | 56 | `git remote add upstream https://github.com/smashingtags/homelabarr-ce.git` |
| `wiki/docs/guides/contributing.md` | 387 | `- **Discord**: [HomelabARR Community](https://discord.gg/Pc7mXX786x)` |
| `wiki/docs/guides/contributing.md` | 436 | `**☕ [Support on Ko-fi](https://ko-fi.com/homelabarr)** - Help fund development time, infrastructure costs, and project` |
| `wiki/docs/guides/faq.md` | 37 | `CE (Community Edition) is 100% free and open source under the MIT license. There's also a paid [HomelabARR Mobile](https` |
| `wiki/docs/guides/faq.md` | 48 | `git clone https://github.com/smashingtags/homelabarr-ce.git /opt/homelabarr` |
| `wiki/docs/guides/faq.md` | 59 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/faq.md` | 85 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/faq.md` | 160 | `- **HomelabARR settings** (users, sessions): 'homelabarr-data' Docker volume` |
| `wiki/docs/guides/faq.md` | 165 | `sudo tar -czf homelabarr-backup-$(date +%Y%m%d).tar.gz /opt/appdata/` |
| `wiki/docs/guides/faq.md` | 171 | `docker compose -f homelabarr.yml pull` |
| `wiki/docs/guides/faq.md` | 172 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/faq.md` | 215 | `- **[Discord](https://discord.gg/Pc7mXX786x)** — fastest, someone's usually around — ask in #help` |
| `wiki/docs/guides/faq.md` | 216 | `- **[GitHub Issues](https://github.com/smashingtags/homelabarr-ce/issues)** — bug reports` |
| `wiki/docs/guides/faq.md` | 217 | `- **[GitHub Discussions](https://github.com/smashingtags/homelabarr-ce/discussions)** — questions and feature requests` |
| `wiki/docs/guides/faq.md` | 218 | `- **[homelabarr.com](https://homelabarr.com)** — product page` |
| `wiki/docs/guides/migration.md` | 27 | `    sudo tar czf /opt/homelabarr-backup-$(date +%Y%m%d).tar.gz /opt/appdata/` |
| `wiki/docs/guides/migration.md` | 38 | `    ls -lh /opt/homelabarr-backup-*.tar.gz` |
| `wiki/docs/guides/migration.md` | 49 | `git clone https://github.com/smashingtags/homelabarr-ce.git /opt/homelabarr` |
| `wiki/docs/guides/migration.md` | 50 | `cd /opt/homelabarr` |
| `wiki/docs/guides/migration.md` | 58 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/migration.md` | 314 | `- **[Discord](https://discord.gg/Pc7mXX786x)** — Ask in #help, someone's usually around` |
| `wiki/docs/guides/migration.md` | 315 | `- **[GitHub Discussions](https://github.com/smashingtags/homelabarr-ce/discussions)** — For longer questions` |
| `wiki/docs/guides/mobile-app.md` | 24 | `\| **Build from source** \| Always free \| [github.com/smashingtags/homelabarr-mobile](https://github.com/smashingtags/h` |
| `wiki/docs/guides/mobile-app.md` | 41 | `\| Traefik + domain \| 'https://homelabarr.yourdomain.com' \|` |
| `wiki/docs/guides/mobile-app.md` | 42 | `\| Cloudflare Tunnel \| 'https://homelabarr.yourdomain.com' \|` |
| `wiki/docs/guides/mobile-app.md` | 64 | `- Is your CE server running? Check: 'docker ps \| grep homelabarr'` |
| `wiki/docs/guides/mobile-app.md` | 80 | `- **Source:** [github.com/smashingtags/homelabarr-mobile](https://github.com/smashingtags/homelabarr-mobile)` |
| `wiki/docs/guides/mobile-app.md` | 86 | `- **URL:** 'https://ce-demo.homelabarr.com'` |
| `wiki/docs/guides/quick-start.md` | 43 | `git clone https://github.com/smashingtags/homelabarr-ce.git /opt/homelabarr` |
| `wiki/docs/guides/quick-start.md` | 46 | `This downloads the entire repo — including all 100+ app templates — to '/opt/homelabarr'. The 'apps/' folder inside ` |
| `wiki/docs/guides/quick-start.md` | 51 | `cd /opt/homelabarr` |
| `wiki/docs/guides/quick-start.md` | 81 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/quick-start.md` | 129 | `curl -fsSL https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/install-remote.sh \| sudo bash` |
| `wiki/docs/guides/quick-start.md` | 133 | `    You can [review the script](https://github.com/smashingtags/homelabarr-ce/blob/main/install-remote.sh) before runnin` |
| `wiki/docs/guides/quick-start.md` | 138 | `2. Clone the repo to '/opt/homelabarr'` |
| `wiki/docs/guides/quick-start.md` | 173 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/quick-start.md` | 186 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/img/diagrams/generate_diagrams.py` | 49 | `    ax.text(0.99, 0.015, 'homelabarr.com  \|  Imogen Labs',` |
| `wiki/docs/img/diagrams/generate_diagrams.py` | 67 | `    ax.text(0.5, 0.97, 'HOMELABARR CE  --  SYSTEM ARCHITECTURE',` |
| `wiki/docs/img/diagrams/generate_diagrams.py` | 153 | `    ax.text(0.17, 0.115, 'homelabarr-data', fontsize=8,` |
| `wiki/docs/index.md` | 25 | `git clone https://github.com/smashingtags/homelabarr-ce.git /opt/homelabarr` |
| `wiki/docs/index.md` | 26 | `cd /opt/homelabarr` |
| `wiki/docs/index.md` | 34 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/index.md` | 87 | `- [HomelabARR](https://homelabarr.com) — Product home` |
| `wiki/docs/index.md` | 88 | `- [GitHub](https://github.com/smashingtags/homelabarr-ce)` |
| `wiki/docs/index.md` | 89 | `- [Discord](https://discord.gg/Pc7mXX786x) — Get help, share your setup` |
| `wiki/docs/index.md` | 90 | `- [Demo](https://ce-demo.homelabarr.com) — Try it live (login: admin/admin)` |
| `wiki/docs/install/changelog.md` | 9 | `- **Container delete/stop/restart**: Docker client was never passed to the CLI manager. All container operations now wor` |
| `wiki/docs/install/changelog.md` | 10 | `- **Docker socket permissions**: Apps that mount 'docker.sock' (Portainer, etc.) now get 'group_add' injected at deploy ` |
| `wiki/docs/install/changelog.md` | 11 | `- **Read-only template volumes**: Temp deploy YAMLs now write to 'server/data/' instead of next to the source YAML, so d` |
| `wiki/docs/install/changelog.md` | 12 | `- **Deploy progress stream**: SSE 'connected' event now includes the server-assigned 'clientId', fixing "Client not foun` |
| `wiki/docs/install/changelog.md` | 15 | `- **npm vulnerabilities patched**: vite, hono, @hono/node-server bumped to address 9 advisories (3 high, 6 moderate). ([` |
| `wiki/docs/install/changelog.md` | 16 | `- **Workflow permissions**: Added explicit 'permissions: contents: read' to all workflows missing it. Resolves CodeQL al` |
| `wiki/docs/install/changelog.md` | 19 | `- **Wiki cleanup**: Removed Professional Edition section; replaced placeholder octopus with optimized v3b WebP at proper` |
| `wiki/mkdocs.yml` | 4 | `site_url: "https://wiki.homelabarr.com"` |
| `wiki/mkdocs.yml` | 10 | `repo_url: https://github.com/smashingtags/homelabarr-ce` |
| `wiki/mkdocs.yml` | 11 | `edit_uri: https://github.com/smashingtags/homelabarr-ce/edit/main/wiki/docs/` |
| `wiki/mkdocs.yml` | 81 | `      link: https://homelabarr.com` |
| `wiki/mkdocs.yml` | 84 | `      link: https://github.com/smashingtags/homelabarr-ce` |
| `wiki/mkdocs.yml` | 87 | `      link: https://discord.gg/Pc7mXX786x` |
| `wiki/mkdocs.yml` | 90 | `      link: https://github.com/smashingtags/homelabarr-ce/discussions` |

## Other

**93 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `.github/CODEOWNERS` | 1 | `*  @smashingtags` |
| `.github/FUNDING.yml` | 1 | `ko_fi: homelabarr` |
| `.github/ISSUE_TEMPLATE/bug_report.md` | 6 | `assignees: 'smashingtags'` |
| `.installer/homelabber` | 5 | `# Visit homelabarr.com               #` |
| `.installer/homelabber` | 13 | `homelabarr=/opt/homelabarr` |
| `.installer/homelabber` | 15 | `if [[ -d ${homelabarr} ]];then` |
| `.installer/homelabber` | 17 | `   $(command -v cd) ${homelabarr} && $(command -v bash) install.sh` |
| `.installer/homelabber` | 24 | `homelabarr=/opt/homelabarr` |
| `.installer/homelabber` | 31 | `     $(command -v rsync) ${homelabarr}/homelabarr-ce/docker.yml $basefolder/$compose -aqhv` |
| `.installer/homelabber` | 38 | `     $(command -v chown) -cR 1000:1000 ${homelabarr} 1>/dev/null 2>&1` |
| `.installer/homelabber` | 48 | `  cd /opt/homelabarr/` |
| `.installer/homelabber` | 50 | `  appfolder="/opt/homelabarr"` |
| `.installer/homelabber` | 52 | `  find /opt/homelabarr-cli/apps/ -type f -name '*${APP}*' -exec cp "{}" $basefolder/$compose \;` |
| `.installer/homelabber` | 84 | `homelabarr="/opt/homelabarr-cli"` |
| `.installer/homelabber` | 85 | `envmigrate="$homelabarr/apps/.subactions/envmigrate.sh"` |
| `.installer/ubuntu.sh` | 5 | `# Docker Maintainer smashingtags    #` |
| `.installer/ubuntu.sh` | 23 | `file=/opt/homelabarr/.installer/homelabber` |
| `.installer/ubuntu.sh` | 24 | `store=/bin/homelabarr-cli` |
| `.installer/ubuntu.sh` | 25 | `store2=/usr/bin/homelabarr-cli` |
| `.installer/ubuntu.sh` | 26 | `if [[ -f "/bin/homelabarr-cli" ]];then` |
| `.installer/ubuntu.sh` | 37 | `   # Support both traditional /opt/homelabarr and current directory` |
| `.installer/ubuntu.sh` | 38 | `   if [[ -d "/opt/homelabarr/${LOCATION}" ]]; then` |
| `.installer/ubuntu.sh` | 39 | `      cd /opt/homelabarr/${LOCATION} && $(command -v bash) install.sh` |
| `apps/.installer/ubuntu.sh` | 6 | `# Docker owned homelabarr           #` |
| `apps/.installer/ubuntu.sh` | 7 | `# Docker Maintainer homelabarr      #` |
| `apps/.installer/ubuntu.sh` | 71 | `buildshow=$(ls -1p /opt/homelabarr/apps/ \| grep '/$' \| $(command -v sed) 's/\/$//')` |
| `apps/.installer/ubuntu.sh` | 86 | `     checksection=$(ls -1p /opt/homelabarr/apps/ \| grep '/$' \| $(command -v sed) 's/\/$//' \| grep -x $section)` |
| `apps/.installer/ubuntu.sh` | 93 | `buildshow=$(ls -1p /opt/homelabarr/apps/${section}/ \| sed -e 's/.yml//g' )` |
| `apps/.installer/ubuntu.sh` | 108 | `     buildapp=$(ls -1p /opt/homelabarr/apps/${section}/ \| $(command -v sed) -e 's/.yml//g' \| grep -x $typed)` |
| `apps/.installer/ubuntu.sh` | 191 | `  --exclude-from=/opt/homelabarr/apps/.backup/backup_excludes \` |
| `apps/.installer/ubuntu.sh` | 212 | `   appfolder=/opt/homelabarr/apps/` |
| `apps/.installer/ubuntu.sh` | 238 | `  --exclude-from=/opt/homelabarr/apps/.backup/backup_excludes \` |
| `apps/.installer/ubuntu.sh` | 259 | `   appfolder=/opt/homelabarr/apps/` |
| `apps/.installer/ubuntu.sh` | 386 | `   appfolder=/opt/homelabarr/apps/` |
| `apps/.installer/ubuntu.sh` | 408 | `  appfolder="/opt/homelabarr/apps"` |
| `apps/.installer/ubuntu.sh` | 724 | `appfolder="/opt/homelabarr/apps"` |
| `apps/backup/restic.yml` | 11 | `    image: "ghcr.io/smashingtags/docker-restic:1.0.0"` |
| `apps/downloads/nzbget.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:nzbget\|ghcr.io/smashingtags/homelabarr-mod-nzbget:v1.0.0"` |
| `apps/downloads/qbittorrent.yml` | 12 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:qbittorrent\|ghcr.io/smashingtags/homelabarr-mod-qbittorrent:v1.0.` |
| `apps/downloads/sabnzbd.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:sabnzbd\|ghcr.io/smashingtags/homelabarr-mod-sabnzbd:v1.0.0"` |
| `apps/media-management/bazarr.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:bazarr\|ghcr.io/smashingtags/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/lidarr.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:lidarr\|ghcr.io/smashingtags/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/radarr.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:radarr\|ghcr.io/smashingtags/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/readarr.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:readarr\|ghcr.io/smashingtags/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/sonarr.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:sonarr\|ghcr.io/smashingtags/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/tautulli.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:tautulli\|ghcr.io/smashingtags/homelabarr-mod-tautulli:v1.0.0"` |
| `apps/media-management/traktarr.yml` | 18 | `    image: "ghcr.io/smashingtags/docker-traktarr:1.0.0"` |
| `apps/media-servers/emby.yml` | 17 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:emby\|ghcr.io/smashingtags/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-servers/jellyfin.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:jellyfin\|ghcr.io/smashingtags/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-servers/plex-gluetun.yml` | 13 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:plex\|ghcr.io/smashingtags/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-servers/plex.yml` | 14 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:plex\|ghcr.io/smashingtags/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/monitoring/dashboards/cadvisor-dashboard.json` | 917 | `    "homelabarr",` |
| `apps/monitoring/dashboards/coder-platform-dashboard.json` | 1289 | `    "homelabarr"` |
| `apps/monitoring/dashboards/dozzle-logs-dashboard.json` | 556 | `    "homelabarr",` |
| `apps/monitoring/dashboards/dozzle-logs-dashboard.json` | 571 | `  "uid": "homelabarr-dozzle",` |
| `apps/monitoring/dashboards/homelabarr-overview.json` | 556 | `    "homelabarr",` |
| `apps/monitoring/dashboards/homelabarr-overview.json` | 570 | `  "uid": "homelabarr-overview",` |
| `apps/monitoring/dashboards/jellyfin-dashboard.json` | 850 | `    "homelabarr",` |
| `apps/monitoring/dashboards/media-server-dashboard.json` | 704 | `    "homelabarr",` |
| `apps/monitoring/dashboards/media-server-dashboard.json` | 718 | `  "uid": "homelabarr-media",` |
| `apps/monitoring/dashboards/node-exporter-dashboard.json` | 1115 | `    "homelabarr",` |
| `apps/monitoring/dashboards/nzbget-dashboard.json` | 774 | `    "homelabarr",` |
| `apps/monitoring/dashboards/promtail-dashboard.json` | 1027 | `    "homelabarr",` |
| `apps/monitoring/dashboards/qbittorrent-dashboard.json` | 944 | `    "homelabarr",` |
| `apps/monitoring/dashboards/radarr-dashboard.json` | 856 | `    "homelabarr",` |
| `apps/monitoring/dashboards/sonarr-dashboard.json` | 856 | `    "homelabarr",` |
| `apps/monitoring/dashboards/traefik-authelia-dashboard.json` | 682 | `    "homelabarr",` |
| `apps/monitoring/dashboards/traefik-authelia-dashboard.json` | 697 | `  "uid": "homelabarr-traefik",` |
| `apps/monitoring/prometheus.yml` | 6 | `    cluster: 'homelabarr-cli'` |
| `apps/monitoring/prometheus.yml` | 127 | `  - job_name: 'homelabarr-exporters'` |
| `apps/monitoring/promtail-config.yml` | 21 | `          host: homelabarr-cli` |
| `apps/monitoring/provisioning/dashboards/dashboard.yml` | 4 | `  - name: 'homelabarr-dashboards'` |
| `apps/monitoring/scripts/auto-dashboard-generator.py` | 106 | `            "tags": ["homelabarr", "auto-generated", app_type, name],` |
| `apps/monitoring/scripts/auto-dashboard-generator.py` | 112 | `            "uid": f"homelabarr-{name}",` |
| `apps/monitoring/scripts/auto-dashboard-generator.py` | 428 | `        homelabarr_containers = [` |
| `apps/monitoring/scripts/auto-dashboard-generator.py` | 434 | `        print(f"📊 Found {len(homelabarr_containers)} HomelabARR CLI applications")` |
| `apps/monitoring/scripts/auto-dashboard-generator.py` | 437 | `        for container in homelabarr_containers:` |
| `apps/monitoring/vnstat.yml` | 10 | `    image: "ghcr.io/smashingtags/docker-vnstat:latest"` |
| `apps/system/cf-companion.yml` | 4 | `    image: "smashingtags/cf-companion:latest"` |
| `apps/system/cf-companion.yml` | 19 | `      - "com.homelabarr.name=CF Companion"` |
| `apps/system/cf-companion.yml` | 20 | `      - "com.homelabarr.description=Auto-create Cloudflare DNS records for containers with Traefik labels"` |
| `apps/system/cf-companion.yml` | 21 | `      - "com.homelabarr.category=addons"` |
| `apps/system/cf-companion.yml` | 22 | `      - "com.homelabarr.url=https://github.com/smashingtags/cf-companion"` |
| `apps/system/cf-companion.yml` | 23 | `      - "com.homelabarr.icon=cloudflare"` |
| `playwright.config.ts` | 3 | `const BASE_URL = process.env.TEST_BASE_URL \|\| 'https://ce-dev.homelabarr.com';` |
| `public/robots.txt` | 4 | `Sitemap: https://ce-demo.homelabarr.com/sitemap.xml` |
| `public/sitemap.xml` | 4 | `    <loc>https://ce-demo.homelabarr.com/</loc>` |
| `tests/README.md` | 16 | `TEST_BASE_URL=https://ce-dev.homelabarr.com npx playwright test` |
| `tests/README.md` | 19 | `TEST_BASE_URL=https://ce-staging.homelabarr.com npx playwright test` |
| `traefik/installer/ubuntu.sh` | 40 | `   source="/opt/homelabarr/traefik/templates/"` |
| `traefik/installer/ubuntu.sh` | 41 | `   envmigrate="/opt/homelabarr/apps/.subactions/envmigrate.sh"` |
| `traefik/installer/ubuntu.sh` | 359 | `   envmigrate="/opt/homelabarr/apps/.subactions/envmigrate.sh"` |
| `traefik/templates/compose/docker-compose.yml` | 90 | `    image: 'smashingtags/cf-companion:latest'` |

---

## How to use this

Every row is a place a fork/rebrand would need to inspect. Most can be handled by the
`sed` recipes in the [White-Label & Forking guide](white-label.md#the-5-minute-starter);
the rest are one-off edits (meta tags, scripts, URLs).

If you find a brand reference in your fork that isn't listed here, either your fork
has diverged from upstream or this audit is lagging — check the workflow run on the
last commit to `main`.
