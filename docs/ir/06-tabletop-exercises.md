# Tabletop Exercises

Run one per quarter. Walk through the scenario in writing. Time yourself.

## Scenario A: Audit chain broken at 3am

> You wake to an email: "R6 audit-chain validator returned bad=1."

1. Which playbook? → PB-01
2. Walk through PB-01 step by step
3. What evidence do you snapshot first?
4. How do you identify the break point?
5. How do you restore to a known-good state?

**Scoring:** Did you snapshot before touching anything? Did you check the `first_bad` field? Did you verify bad=0 post-restore?

## Scenario B: External researcher reports RCE

> A security researcher emails michael@mjashley.com with a proof-of-concept for remote code execution.

1. Which playbook? → PB-08
2. What do you respond within 24 hours?
3. Do you patch before or after acknowledging?
4. When do you disclose publicly?

**Scoring:** Did you acknowledge within 24h? Did you follow the 90-day disclosure window? Did you file a GitHub Security Advisory?

## Scenario C: Unknown image tag appears on GHCR

> You notice a new tag for `homelabarr-backend` on GHCR that you didn't push.

1. Which playbook? → PB-03
2. What is your first action — deploy it or investigate?
3. How do you verify the signature?
4. What do you do if cosign verify fails?

**Scoring:** Did you NOT deploy? Did you run cosign verify? Did you compare to last known good in R5-cosign.txt?
