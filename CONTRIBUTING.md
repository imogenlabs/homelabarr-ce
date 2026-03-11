# Contributing to HomelabARR CE

Thanks for your interest in making HomelabARR better! Here's how we work.

## How Features Get Built

1. **Ideas start in Discord** — Drop suggestions in [#feature-requests](https://discord.gg/Pc7mXX786x) or open a [GitHub Issue](https://github.com/smashingtags/homelabarr-ce/issues) or [Discussion](https://github.com/smashingtags/homelabarr-ce/discussions)
2. **We build on feature branches** — Each change gets its own `feature/` branch
3. **Features merge to `dev`** — Bleeding edge, may break. Try it if you're adventurous
4. **Dev promotes to `staging`** — Release candidate. Community gets **one week** to test against real stacks and find bugs
5. **Staging merges to `main`** — Only battle-tested changes ship to production

## Branch Structure

| Branch | Purpose | Live at | Stability |
|--------|---------|---------|-----------|
| `main` | Production — stable, released | [ce-demo.homelabarr.com](https://ce-demo.homelabarr.com) | Safe to run |
| `staging` | Release candidate — 1 week community soak | [ce-staging.homelabarr.com](https://ce-staging.homelabarr.com) | Should work, finding bugs |
| `dev` | Active development — proposed changes | [ce-dev.homelabarr.com](https://ce-dev.homelabarr.com) | May break |
| `feature/*` | Work in progress — individual changes | — | Experimental |

## Release Cycle

```
feature/* --> dev (build & test) --> staging (1 week soak) --> main (ship it)
```

- **Dev to Staging**: When we are confident a set of changes is ready, we promote to staging and announce in Discord
- **Staging to Main**: After one week with no blocking bugs reported, staging merges to main
- **Hotfixes**: Critical bugs can go straight to main via `hotfix/*` branches

## Want to Contribute Code?

1. Fork the repo
2. Create a feature branch from `dev`: `git checkout -b feature/your-feature dev`
3. Make your changes
4. Open a PR targeting `dev` (not `main` or `staging`)
5. We review, test on ce-dev, and get community feedback

## Adding App Templates

Want to add a new app to the catalog?

1. Create a YAML file in the appropriate `apps/<category>/` directory
2. Follow the format of existing templates
3. Include proper Docker image tags, Traefik labels, and environment defaults
4. Open a PR targeting `dev`

Current categories: `ai`, `backup`, `downloads`, `media-management`, `media-servers`, `monitoring`, `self-hosted`, `system`, `transcoding`, `virtual-desktops`

The `myapps` directory is for user-created custom templates and should not be modified by contributors.

See `apps/legacy/README.md` for examples of what NOT to add (deprecated/abandoned projects).

## Reporting Bugs

- Open a [GitHub Issue](https://github.com/smashingtags/homelabarr-ce/issues)
- Or drop it in [#help](https://discord.gg/Pc7mXX786x) on Discord
- Include your Docker version, OS, and steps to reproduce

## Community

- **Discord**: [discord.gg/Pc7mXX786x](https://discord.gg/Pc7mXX786x)
- **Reddit**: [r/homelabarr](https://reddit.com/r/homelabarr)
- **Ko-fi**: [ko-fi.com/homelabarr](https://ko-fi.com/homelabarr)
- **Discussions**: [GitHub Discussions](https://github.com/smashingtags/homelabarr-ce/discussions)

Built with love by [Imogen Labs AI](https://imogenlabs.ai)