# HomelabARR CE — App UI Rebuild Handoff

## What this is

The HomelabARR CE web application (the actual dashboard, not the marketing site) needs a complete UI overhaul. It currently looks like AI-generated vibe-coded slop. The goal is to make it match the professional, branded design system used across all other Eight.ly properties.

**Repo:** `smashingtags/homelabarr-ce` (private)
**Local path:** `/Users/theclaw/.openclaw/workspace/products/homelabarr-ce/`
**Live demo:** https://ce-demo.homelabarr.com (admin / admin)
**Dev instance:** Check CLAUDE.md for dev URLs
**Owner:** Michael (smashingtags)

## The Problem

The CE dashboard is functional but the UI is inconsistent, uses generic AI-generated styling, and doesn't match the brand. Specific issues:

1. **Purple/blue gradient buttons** — the Deploy buttons use purple/blue gradients that don't match the neutral brand
2. **Inconsistent card styling** — app cards have colored left borders (purple, green, orange) that look random
3. **Generic component styling** — looks like default Bootstrap/MUI with gradients slapped on
4. **No cohesive design system** — colors, spacing, typography are all over the place
5. **The mobile app inherits this mess** — it's a React Native WebView wrapper around the same dashboard

## Target Design System

Match the design language of eight.ly, imogenlabs.ai, mjashley.com, agents.imogenlabs.ai, and homelabarr.com:

- **Colors:** CSS variables — `--background: #0a0a0b`, `--foreground: #fafafa`, `--card: #111113`, `--border: #27272a`, `--muted-foreground: #a1a1aa`, `--accent: #1f1f23`. NO purple gradients, NO blue gradients, NO random accent colors.
- **Typography:** Inter (body), Bricolage Grotesque (headings), JetBrains Mono (code)
- **Components:** shadcn/ui patterns — 1px borders, no shadows, consistent radius, hover border color shift
- **Dark default**, light mode supported
- **Section eyebrows:** `text-xs font-semibold uppercase tracking-widest text-muted-foreground`

## Current Stack

Read the repo's CLAUDE.md first — it has the full architecture. Key points:
- **Frontend:** React (likely CRA or Vite — check package.json)
- **Backend:** Node.js or Go — the frontend is served from it
- **State:** The app catalog is likely in a JSON file or fetched from an API
- **Deploy modes:** Standard (IP:port), Traefik (subdomain), Authelia (SSO+2FA)

## What Needs to Happen

### Phase 1: Audit (read-only)
Before touching anything:
1. Read `package.json` to understand the frontend framework and deps
2. Find where the CSS/styling lives (could be CSS modules, styled-components, Tailwind, or plain CSS)
3. Find the component directory structure
4. Identify which components render: nav bar, app cards, deploy button, category tabs, search bar, app detail modal
5. Take Playwright screenshots of every major view at the demo URL for before/after comparison
6. Document findings before making any changes

### Phase 2: Design System Foundation
1. If not already using Tailwind + shadcn, evaluate whether to:
   a. Migrate to Tailwind + shadcn (big lift, best result)
   b. Override existing styles with CSS variables (smaller lift, good result)
   c. Replace individual components incrementally
2. Implement the CSS variable design system (the same `:root` vars used on all other sites)
3. Replace fonts with Inter/Bricolage Grotesque/JetBrains Mono

### Phase 3: Component-by-Component Cleanup
Priority order (most visible first):
1. **Nav bar** — match homelabarr.com nav (mascot + brand name, clean links, theme toggle)
2. **App cards** — neutral borders, no colored left border, clean typography, consistent badge styling
3. **Deploy button** — neutral primary button (white bg on dark, black bg on light), no gradients
4. **Category tabs/pills** — neutral active state, no purple highlight
5. **Search bar** — clean input with border, no shadow
6. **App detail/deploy modal** — clean card with proper spacing
7. **Login/auth UI** — if visible, clean it up

### Phase 4: Verify
1. Test in dark mode AND light mode
2. Test at desktop AND mobile viewport
3. Take fresh Playwright screenshots for comparison
4. Run on the demo instance to verify nothing breaks
5. Take iPhone simulator screenshots for homelabarr.com mobile carousel

## Important Constraints

- **Don't break functionality** — this is a working product with paying mobile app users
- **Don't change the backend** — UI only
- **Don't change the app catalog data** — just how it's displayed
- **Don't change deploy logic** — just how the buttons/modals look
- **Phased execution** — don't try to do everything in one commit. Phase 1 (audit) first, get approval, then Phase 2, etc.
- **Test on the demo** before deploying to prod

## Deploy

Check the repo's CLAUDE.md for deploy instructions. The app likely deploys differently than the marketing sites — it may be a Docker container with the backend serving the frontend, not a static site.

## Reference Sites (copy the aesthetic from these)

All share the same design system:
- `/Users/theclaw/.openclaw/workspace/products/eightly-site/` — eight.ly
- `/Users/theclaw/.openclaw/workspace/products/imogenlabs-site/` — imogenlabs.ai
- `/Users/theclaw/.openclaw/workspace/products/homelabarr-site/` — homelabarr.com (marketing)
- `/Users/theclaw/.openclaw/workspace/products/eightly-site/src/index.css` — THE design system CSS variables

## Screenshots to Take (before starting work)

Using Playwright at https://ce-demo.homelabarr.com:
1. Homepage (All Apps view) — dark mode, 1440x900
2. Homepage — light mode, 1440x900
3. Media & Entertainment category — dark
4. Search results for "plex" — dark
5. Deploy modal (click Deploy on any app) — dark
6. Mobile viewport (430x932) — dark
7. Mobile viewport — light

Save all screenshots for before/after comparison.

## What NOT to Do

- Don't rebuild from scratch — refactor the existing codebase
- Don't change the app's URL structure or routing
- Don't modify the Docker Compose template generation logic
- Don't touch the backend API
- Don't use Bootstrap, Material UI, or any component library other than shadcn patterns
- Don't add purple gradients or colored accents — neutral only
- Don't wait on Watchtower — always build, push to GHCR, force-pull immediately

## Context from This Session

- homelabarr.com was rebuilt from Astro to Vite/React in this session — it now matches the brand
- wiki.homelabarr.com got the brand theme (dark-first, Inter font, inline CSS override)
- The project history page was sanitized (no more drama)
- Fresh live screenshots were captured from ce-demo.homelabarr.com
- The mobile app Xcode build failed on pod configs — deferred, will need fresh screenshots after this UI rebuild anyway
- Official Apple iPhone 16 bezel from developer.apple.com is at `homelabarr-site/public/iphone-frame.png`
- 4 self-hosted GitHub runners on Proxmox 183 (LXC 106-109)
- GitHub Actions billing is out of minutes — all CI on self-hosted runners
- iMac at 192.168.1.208 is the build machine (Go, cosign, Xcode)
- NEVER wait on Watchtower — always force-pull
