# GitHub Security Settings — Required Configuration

These settings must be enabled at `Settings → Code security and analysis` for the `smashingtags/homelabarr-ce` repository.

## Required settings

| Setting | Required state | Purpose | If turned off |
|---------|---------------|---------|---------------|
| Private vulnerability reporting | ON | Lets researchers file private advisories via GitHub UI | Re-enable immediately; complements SECURITY.md mailto |
| Dependabot alerts | ON | Surfaces known CVEs in dependencies | Re-enable; R15 dependency policy depends on this |
| Dependabot security updates | ON | Auto-PRs for security-flagged vulnerabilities | Re-enable; staleness workflow monitors these PRs |
| Secret scanning | ON | Detects committed secrets in pushes | Re-enable; see [PB-06](../ir/playbooks/PB-06-secret-leak.md) |
| Secret scanning push protection | ON | Blocks pushes containing secrets | Re-enable immediately |

## Recommended settings

| Setting | Recommended state | Purpose |
|---------|------------------|---------|
| CodeQL code scanning | ON | Free static analysis for public repos |
| Dependency graph | ON | Required for Dependabot to function |

## Verification

The agent can check current state via the GitHub API:

```bash
gh api repos/smashingtags/homelabarr-ce --jq '.security_and_analysis'
gh api repos/smashingtags/homelabarr-ce/private-vulnerability-reporting
```

Enabling these settings requires repository admin access (owner-only).

## Recovery

If any required setting is found disabled:
1. Re-enable immediately via Settings UI
2. Audit recent commits for any secrets that may have been pushed while protection was off
3. File as P2 incident per [PB-06](../ir/playbooks/PB-06-secret-leak.md) if secret scanning was disabled
