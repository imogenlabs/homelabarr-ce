# End-to-end tests (Playwright)

Two lanes (HLCE-226):

| Project | Target | Purpose |
|---------|--------|---------|
| `seeded` | `docker-compose.e2e.yml` (fresh, real Docker socket) | The reliable lane — critical user journeys against deterministic state. Gates CI. |
| `smoke`  | live ce-dev (`TEST_BASE_URL`) | Best-effort cosmetic checks against a real deploy. Non-deterministic; does not gate. |

## Seeded lane (deterministic)

Brings up a self-contained stack — `socket-proxy` + backend + frontend built from
the working tree, a fresh `admin`/`admin`, and a real allow-listed Docker socket so
deploy + container-lifecycle journeys run for real. Everything is namespaced
(project `hlce-e2e`) and uses host port **8099**, so it never collides with other
stacks on the host.

```bash
# Build + start the target
docker compose -p hlce-e2e -f docker-compose.e2e.yml up -d --build

# Run the critical-journey suite (serially — the journeys share one it-tools container)
E2E_BASE_URL=http://localhost:8099 npx playwright test --project=seeded --workers=1

# Tear down (wipes state)
docker compose -p hlce-e2e -f docker-compose.e2e.yml down -v
```

Covered journeys:
- **Auth + MFA** (`seeded/auth.spec.ts`): password login; MFA login with a valid
  TOTP, a wrong code (rejected), and a backup code. The MFA user is seeded via the
  API by the `setup` project (`seeded/mfa.setup.ts`) — there is no MFA-enable UI,
  only an MFA login UI.
- **Deploy** (`seeded/deploy.spec.ts`): deploy `it-tools` through the streaming CLI
  path until it appears under Deployed Apps.
- **Container lifecycle** (`seeded/containers.spec.ts`): stop/start/restart/remove +
  log view, scoped strictly to the it-tools card.
- **Mount wizard** (`seeded/mounts.spec.ts`): drives the enhanced-mount onboarding
  wizard when the `mount-enhanced` app is present (it ships with the full CLI, not
  CE's bundled `apps/`, so it self-skips on a stock CE target). Provider OAuth is
  out of scope (manual).

> Re-running against an already-running stack is supported (the MFA setup is
> idempotent), but for a guaranteed-clean run, `down -v` first or
> `up -d --force-recreate backend frontend`.

## Smoke lane (live)

```bash
TEST_BASE_URL=https://ce-dev.homelabarr.com npx playwright test --project=smoke
```

The five cosmetic specs (catalog, dark-mode, footer, icons, modals). These run
against a shared live deploy and can flake when it's warm/mid-deploy — that's why
the seeded lane exists. CI runs this lane `continue-on-error`.

## Notes

- All fixed `waitForTimeout` waits were replaced with web-first assertions (HLCE-226 AC5).
- The seeded target runs the backend in `development` mode so auth cookies aren't
  `Secure` (the target is reached over plain HTTP); the frontend's CSP
  `upgrade-insecure-requests` directive is stripped for the same reason. Production
  cookie/CSP hardening is covered by the unit/regression suites, not E2E.
