# PB-03 — cosign verify fail

## Trigger
R5 cosign verify returns nonzero on a published image. CI workflow `compliance-evidence.yml` fails.

## Severity (default)
P1. Do NOT deploy the image.

## First action (within 5 min)
1. Do NOT pull or deploy the suspect image
2. Identify which image, which tag, which digest
3. Compare to last known good in `compliance/evidence/R5-cosign.txt`

## Decision point
| Observation | Next action |
|---|---|
| Signature missing (new push without CI) | Re-push through CI to get signature. |
| Signature present but invalid | Supply-chain compromise suspected. Full investigation. |
| Image tag doesn't match any CI build | Unauthorized push. Revoke GHCR token immediately. |

## Containment
Do NOT deploy. Revert to last known-good image digest. Lock GHCR push access.

## Eradication
Investigate how the unsigned/mis-signed image was published. Check CI logs, GHCR audit log, GitHub Actions runs.

## Recovery
Re-sign the legitimate image. Update compose to pin the known-good digest. Resume deploys.

## Verification
`cosign verify` returns 0 on the running image. `R5-cosign.txt` matches.

## Post-incident
- File post-mortem from [04-post-mortem-template.md](../04-post-mortem-template.md)
- Update: `docs/threat-model/07-residual-risk.md`
- File as L finding in next R-round if new gap discovered
