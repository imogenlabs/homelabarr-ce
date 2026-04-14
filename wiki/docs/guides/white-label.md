# White-Label & Forking Guide

HomelabARR CE is MIT licensed. If you want to fork it, rebrand it, run it as your own thing — you can. This guide is the checklist so you don't miss anything.

Nothing here is required to use HomelabARR. This is only for folks who want to ship their own version under their own brand.

---

## Before you start

You'll need:

- A GitHub account (or equivalent git host)
- A new name for your project and a domain you own
- A mascot/logo image, ideally a square PNG with a transparent background at 1024×1024
- A favicon (32×32 or 64×64 PNG at minimum)
- Basic comfort with a terminal and `sed`

Start by **forking** the [homelabarr-ce repo](https://github.com/smashingtags/homelabarr-ce) on GitHub. All the work below happens in your fork.

Clone your fork locally:

```bash
git clone https://github.com/YOURORG/YOURPROJECT.git
cd YOURPROJECT
```

---

## The 5-minute starter

This covers roughly 80% of the rebranding work in a single shell block. **Read it first, adjust the variables, then run it from the repo root.**

```bash
# ---- set these once ----
OLD_NAME="homelabarr"         # lowercase identifier (for paths, images, etc.)
OLD_BRAND="HomelabARR"        # human-readable brand name
NEW_NAME="myproject"          # your lowercase identifier
NEW_BRAND="MyProject"         # your human-readable brand

OLD_REPO="smashingtags/homelabarr-ce"
NEW_REPO="yourorg/yourproject"

OLD_DOMAIN="homelabarr.com"
NEW_DOMAIN="yourproject.com"

OLD_WIKI="wiki.homelabarr.com"
NEW_WIKI="docs.yourproject.com"

# ---- containers, images, network, volumes ----
find . -type f \( -name "*.yml" -o -name "*.yaml" -o -name "*.sh" -o -name "Dockerfile*" \) \
  -not -path "./node_modules/*" -not -path "./.git/*" \
  -exec sed -i.bak "s|${OLD_NAME}-frontend|${NEW_NAME}-frontend|g; s|${OLD_NAME}-backend|${NEW_NAME}-backend|g" {} \;

# ---- URLs ----
find . -type f \( -name "*.md" -o -name "*.ts" -o -name "*.tsx" -o -name "*.astro" -o -name "*.yml" -o -name "*.yaml" \) \
  -not -path "./node_modules/*" -not -path "./.git/*" \
  -exec sed -i.bak \
    -e "s|${OLD_WIKI}|${NEW_WIKI}|g" \
    -e "s|${OLD_DOMAIN}|${NEW_DOMAIN}|g" \
    -e "s|${OLD_REPO}|${NEW_REPO}|g" {} \;

# ---- package.json ----
sed -i.bak "s|\"${OLD_NAME}\"|\"${NEW_NAME}\"|" package.json

# ---- localStorage keys (avoid collisions with original CE if both run on same browser) ----
sed -i.bak "s|${OLD_NAME}_token|${NEW_NAME}_token|g; s|${OLD_NAME}_user|${NEW_NAME}_user|g" \
  src/contexts/AuthContext.tsx src/lib/api.ts src/components/DeploymentProgressModal.tsx

# ---- cleanup backup files ----
find . -name "*.bak" -not -path "./node_modules/*" -delete
```

**After the script**, hand-edit these because they need thought, not mechanical replacement:

- `README.md` — rewrite the top paragraph, update badges, screenshots, demo link
- `CONTRIBUTING.md` — your Discord, your branches, your demo URL
- `CHANGELOG.md` — start fresh or keep the original history as pre-fork context
- `wiki/mkdocs.yml` — `site_name`, `site_url`, `repo_name`, `repo_url`, `copyright`
- `.github/workflows/docker-build-push.yml` — env vars `FRONTEND_IMAGE_NAME` and `BACKEND_IMAGE_NAME`, OCI labels, Discord webhook
- The historical narrative in `wiki/docs/guides/history.md` (leave this alone — see [Legal](#legal-what-you-must-keep) below)

For the full file-by-file list with line numbers, see the [auto-generated audit](_white-label-audit.md). It's regenerated from the code on every push, so it never goes stale.

---

## Replacing assets

You'll want logos and a favicon. WebP compresses well and has native transparency.

### Install the WebP tool

```bash
# macOS
brew install webp

# Debian/Ubuntu
sudo apt install webp
```

### Generate all sizes from a 1024×1024 source PNG

```bash
SRC="your-mascot-1024.png"

# sizes: 80 for nav, 192/384 for UI hero with 2x retina srcset, 600/1200 for wiki hero
for size in 80 192 384 600 1200; do
  # Resize (cwebp can't resize; use sips on macOS or convert on Linux)
  if command -v sips >/dev/null; then
    sips -Z $size "$SRC" --out "/tmp/src-$size.png" >/dev/null
  else
    convert "$SRC" -resize "${size}x${size}" "/tmp/src-$size.png"
  fi
  # Encode
  Q=85; [ $size -lt 150 ] && Q=90
  cwebp -q $Q "/tmp/src-$size.png" -o "/tmp/mascot-$size.webp"
  rm "/tmp/src-$size.png"
done
```

### Where they go

| Size | File | Used for |
| ---- | ---- | -------- |
| 80 | `wiki/docs/img/mascot-80.webp` | Wiki logo |
| 192 | `public/mascot.webp` | App header (1x) |
| 384 | `public/mascot-2x.webp` | App header (retina) |
| 600 | `wiki/docs/img/mascot-600.webp` | Wiki hero (1x) |
| 1200 | `wiki/docs/img/mascot-1200.webp` | Wiki hero (retina) |

### Favicon

Drop a 32×32 and a 64×64 at:

- `public/favicon.png`
- `public/favicon.svg` (optional, vector)
- `wiki/docs/img/favicon.png` (for the mkdocs site)

---

## Color & theme

The accent color threads through the app via Tailwind. Change it in one place:

- `tailwind.config.js` — look for the `primary` or accent-related color definition and update the hex values. All UI that uses `bg-primary`, `text-primary`, gradient-to-indigo, etc. follows automatically.

For the wiki, mkdocs-material accepts a palette in `wiki/mkdocs.yml`:

```yaml
theme:
  palette:
    primary: deep purple   # or any material color name
    accent: purple
```

---

## Building your own container images

The existing GitHub Actions workflows push to GHCR under the original namespace. You need to redirect them to yours.

1. In your fork, go to **Settings → Secrets and variables → Actions**
2. Either use the default `GITHUB_TOKEN` (automatically available, no setup) or create a `GH_PAT` personal access token with `write:packages` scope for private packages
3. Edit `.github/workflows/docker-build-push.yml`:
   - Change `NAMESPACE` env var to your GitHub org/user
   - The `FRONTEND_IMAGE_NAME` and `BACKEND_IMAGE_NAME` env vars should already be updated by the sed pass
4. Push to `main` — the workflow triggers a build
5. Your images appear at `ghcr.io/YOURORG/YOURPROJECT-frontend` and `...-backend`

If you want Docker Hub as well, set `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets. Otherwise remove the Docker Hub steps from the workflow.

Deploy using your own `docker-compose.yml` or adapt the root `homelabarr.yml` with your image names.

---

## Verification

Before you call it done:

```bash
# 1. Build succeeds
npm ci
npm run build

# 2. No stale references in the final bundle
grep -ri "homelabarr" dist/ || echo "clean"

# 3. Container naming is yours
docker compose -f homelabarr.yml up -d   # rename this file too if you like
docker ps --format '{{.Names}}'

# 4. One last sanity grep in source
grep -ri "homelabarr" --exclude-dir={node_modules,.git,dist} .
```

The final grep should mostly return hits in `wiki/docs/guides/history.md`, `LICENSE`, and the auto-generated audit — those are supposed to stay. Anything else, go fix it and re-run.

Load your running app in a browser:

- Nav logo is yours
- Page title is yours
- Login modal / welcome screen says your brand
- Help modal links to your docs / Discord / GitHub
- Footer copyright is yours

---

## Legal: what you MUST keep

HomelabARR CE is MIT licensed. That's a permissive license, but it does have requirements.

### You **must**

1. **Preserve the `LICENSE` file** or an equivalent copy of the MIT license text.
2. **Preserve the original copyright notice** (Michael Ashley / Imogen Labs) in any substantial portion of the source you distribute. Add your own copyright line on top — don't remove the original.

### You **can**

- Rename the project to anything you want (trademarks aside — see below)
- Remove references to HomelabARR.com, the Discord, the subreddit, etc.
- Rewrite the README and docs as your own
- Sell your fork commercially, with or without modifications

### You **should** (strongly recommended but not legally required)

- **Keep the historical narrative in `wiki/docs/guides/history.md` as-is.** The project history describes the PlexGuide/Dockserver/HomelabARR lineage and names contributors who built and maintained those predecessors. Rewriting that story to remove them would be dishonest — it's the factual origin of the code you're building on. If you want your own "Why we forked" page, add a new one alongside.

### Trademarks

MIT does not grant you the right to use "HomelabARR" as your brand name. You need to pick a different name — which you're doing anyway.

---

## Giving back

If your fork fixes bugs, improves docs, or adds features that would benefit anyone running HomelabARR, open a PR upstream. Forks and upstream don't have to be enemies — healthy open source projects have forks that share improvements back.

See [Contributing](contributing.md) for the usual pull request guide.

---

## The complete file audit

The companion [auto-generated audit](_white-label-audit.md) lists every file and line number where a brand reference currently lives. It's regenerated automatically from the code on every push to `main`, so it's always current with what's actually in the repo — no stale documentation, no surprises.

If your fork has diverged from upstream or you've added new files, run `bash scripts/generate-whitelabel-audit.sh` in your own repo to get a fresh audit.

---

## Something missing?

If you're rebranding HomelabARR and hit something this guide didn't cover, [open an issue](https://github.com/smashingtags/homelabarr-ce/issues/new) — we'll add it here so the next person doesn't have to figure it out.
