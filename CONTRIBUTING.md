# Contributing to HomelabARR

Thanks for helping make HomelabARR better.

## Ideas and bugs

- **Ideas:** post in [#feature-requests](https://discord.gg/Pc7mXX786x) on Discord or start a [Discussion](https://github.com/imogenlabs/homelabarr-ce/discussions).
- **Bugs:** open an [issue](https://github.com/imogenlabs/homelabarr-ce/issues) with your Docker version, OS, and the steps to reproduce. Logs help: `docker compose -f homelabarr.yml logs backend`.
- **Security problems:** do not open a public issue. Follow [SECURITY.md](SECURITY.md).

## How changes ship

1. Fork the repo and branch from `main`: `git checkout -b feat/your-change main`
2. Open a pull request against `main`.
3. CI must pass: lint, type check, unit tests with coverage, the end-to-end suite, a dependency CVE scan and a license audit. A maintainer reviews and merges.
4. `main` is deployed to [dev.homelabarr.com](https://dev.homelabarr.com) through the `dev` branch. Releases are tagged from `main`, and the [demo](https://demo.homelabarr.com) runs the latest release.

Before adding a new endpoint, asset or trust boundary, update the matching [threat-model](docs/threat-model/README.md) document.

## Development

```bash
npm install
npm run dev            # dashboard on :5173, API on :8092 (set PORT=8092 in .env)
npm run build          # production build
npm run test:run       # run the tests once
npm run test:coverage  # with a coverage report
npm run lint
```

### Tests

[Vitest](https://vitest.dev) runs two projects: `server` (backend, Node) and `web` (frontend, jsdom and Testing Library). Tests live next to the code (`server/**/*.test.js`, `src/**/*.test.ts(x)`). Backend HTTP tests drive the Express app in-process with `supertest`, and database tests use in-memory SQLite (`DB_PATH=:memory:`). A few backend suites need a running Docker daemon.

Coverage thresholds live in `vite.config.ts` and only ever go **up**, in the same pull request that adds the tests behind the increase. Never lower one to make a build pass.

### End-to-end tests

Playwright specs live in `tests/e2e/` ([runbook](tests/e2e/README.md)). The `seeded` lane brings up a self-contained stack from `docker-compose.e2e.yml` on port 8099 and covers sign-in with MFA, deploying an app, and container lifecycle and logs. It gates CI.

```bash
docker compose -p hlce-e2e -f docker-compose.e2e.yml up -d --build
E2E_BASE_URL=http://localhost:8099 npx playwright test --project=seeded --workers=1
docker compose -p hlce-e2e -f docker-compose.e2e.yml down -v
```

## Adding an app

1. Add a Compose YAML file to the right `apps/<category>/` folder: `ai`, `backup`, `downloads`, `media-management`, `media-servers`, `monitoring`, `self-hosted`, `system`, `transcoding` or `virtual-desktops`.
2. Follow the format of the existing templates: pinned image tags, Traefik labels and sensible environment defaults.
3. Open a pull request against `main`.

`apps/myapps/` is for users' own templates; leave it alone.

## Community

[Discord](https://discord.gg/Pc7mXX786x) · [r/homelabarr](https://reddit.com/r/homelabarr) · [Discussions](https://github.com/imogenlabs/homelabarr-ce/discussions) · [Ko-fi](https://ko-fi.com/homelabarr)
