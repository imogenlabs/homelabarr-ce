# HomelabARR CE — App UI Rebuild Handoff

## Status: PHASES 1-4 COMPLETE (2026-05-22)

All four phases shipped and deployed to ce-demo.homelabarr.com. Commit `81d5760`.

## What Was Done

### Phase 1: Audit — DONE
- Stack identified: React 18 + Vite 7 + Tailwind 3 + shadcn/ui (default style, HSL CSS vars)
- Font: Geist (fontsource) — needed replacement
- 23 components with hardcoded blue/indigo/purple decorative colors identified
- Before screenshots captured via Playwright

### Phase 2: Design System Foundation — DONE
- `src/index.css` — CSS variables replaced with brand palette (HSL format for Tailwind 3 compat)
- `tailwind.config.js` — brand/dark/glow color palettes removed, Inter/Bricolage/JetBrains font families added
- `public/fonts/` — 9 woff2 files copied from eight.ly site (Inter, Bricolage Grotesque, JetBrains Mono)
- Noise texture overlay, radial gradients, glow box-shadows all deleted

### Phase 3: Component-by-Component Cleanup — DONE
All 23 components cleaned:
- `App.tsx` — header, search, tabs, sort buttons, category header, footer
- `AppCard.tsx` — gradient stripe deleted, gradient deploy button → primary token, gradient icon bg → secondary
- `ui/card.tsx` — indigo hover shadow removed from base component
- `LoginModal.tsx`, `UserMenu.tsx`, `ApiKeysModal.tsx` — blue/indigo → design tokens
- `DeployModal.tsx`, `DeployedAppCard.tsx`, `DeploymentProgressModal.tsx`, `DeploymentProgress.tsx`
- `ContainerControls.tsx`, `ContainerStats.tsx`, `Leaderboard.tsx`
- `HelpModal.tsx`, `PortManager.tsx`, `ErrorBoundary.tsx`, `AuthStatus.tsx`
- `CLIApplicationBrowser.tsx`, `UserSettings.tsx`, `RcloneAuthWizard.tsx`
- `EnhancedMountManager.tsx`, `EnhancedMountOnboarding.tsx`

Functional status colors preserved: green (running/success), red (error/stopped), yellow (warning), gold (medals).

### Phase 4: Verify — DONE
- Type check: zero errors (`tsc --noEmit`)
- Playwright DOM scan: zero banned patterns (indigo, gradient, glow, purple)
- Playwright computed styles: Inter font loaded, Deploy button solid (no gradient), theme toggle works
- Dark mode verified at 1440x900
- Light mode verified at 1440x900
- Media & Entertainment category verified
- Search "plex" verified
- Mobile viewport (430x932) verified
- Deployed to ce-demo.homelabarr.com and visually confirmed with live app catalog (116 apps)

### Dockerfile — DONE
Frontend Dockerfile was a 2-line stub. Completed as multi-stage build: node:24-alpine → nginx:1.27-alpine.
Built on iMac (192.168.1.208), pushed to `ghcr.io/smashingtags/homelabarr-frontend:latest`.

## What's Still Open

- **iPhone simulator screenshots** — needed for homelabarr.com mobile carousel (deferred until after mobile app changes)
- **Mobile app** — it's a WebView wrapper, so it inherits this rebrand automatically, but pod config issues need resolving for fresh builds
- **homelabarr.com screenshots** — the marketing site's CE screenshots should be refreshed from the rebranded demo
