# PB-11 — Security update past SLA

## Trigger
Staleness workflow (`.github/workflows/dependency-staleness.yml`) opens an issue tagged `incident` because a security-critical dependabot PR has exceeded its 72h merge SLA.

## Severity (default)
P2. Known vulnerability in a production code path with a published fix sitting unmerged. Escalate to P1 if CVSS >= 9.0 or active exploitation reported.

## First action (within 15 min)
1. Open the incident issue and identify the linked PR
2. Read the CVE / advisory linked in the dependabot PR body
3. Determine if the vulnerable code path is reachable in HomelabARR CE

## Decision point

| Observation | Next action |
|---|---|
| CI is green, PR just wasn't reviewed | Merge immediately. Post-merge cosign verify will catch any signing issue. |
| CI is failing on the PR | Fix the CI failure. If it's a breaking change, treat as a major update — document migration and merge within 24h. |
| Owner is actively deferring (label `update-deferred-by-owner`) | Verify compensating control is documented in the PR. If CVSS >= 7.0 with no compensating control, escalate to P1. |

## Containment
If the vulnerability is actively exploited in the wild (KEV list or credible report):
1. Apply a temporary WAF rule or nginx location block to filter the attack vector
2. If the vulnerable package handles auth or session management, consider rotating JWT_SECRET and forcing re-login

## Eradication
1. Merge the dependabot PR (or cherry-pick the fix if the PR has conflicts)
2. Rebuild and push images through CI
3. Verify cosign signature on new image
4. Deploy to ce-dev, run pentest atomics, then promote to ce-demo

## Recovery
1. Confirm new image is running on ce-demo: `docker inspect homelabarr-demo-backend --format '{{.Config.Image}}'`
2. Run `compliance/collect-evidence.sh` to refresh evidence snapshots
3. Close the incident issue with resolution summary

## Verification
- `npm audit` shows zero findings for the previously-vulnerable package
- Cosign verify passes on the deployed image
- Pentest atomics 01-08 pass
- No new audit-log chain breaks

## Post-incident
- File post-mortem from [04-post-mortem-template.md](../04-post-mortem-template.md)
- Root-cause the SLA breach: was it agent oversight, CI blockage, or deliberate deferral?
- If agent oversight: add the PR to weekly triage checklist
- If CI blockage: file a finding for the next R-round
- Update staleness workflow thresholds if SLAs proved unrealistic
