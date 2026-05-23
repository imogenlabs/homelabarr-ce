# Severity Classification

| Severity | Definition | Response time | Examples |
|----------|-----------|---------------|---------|
| **P1** | Confirmed compromise, data exfil, audit-chain tamper, signed image bypass | Start IR within 15 min | cosign verify fails on running image; audit-chain bad > 0 |
| **P2** | Active attack signal, no confirmed compromise; critical SLO burn > 75% | < 1 hour | Sustained honey-route emission; auth burst exceeding rate limit |
| **P3** | Degraded posture, no active attack; SLO burn 25-75% | < 24 hours | Container restart storm; backup drill failure |
| **P4** | Configuration drift; low-impact finding | Next business day | New CVE in dependabot; compliance evidence missing field |

## Decision tree

```
Is there confirmed unauthorized access or data movement? --YES--> P1
                                                          --NO-->
  Is a detection sensor actively firing AND no chaos experiment running? --YES--> P2
                                                                          --NO-->
    Is an SLO burning OR a service degraded? --YES--> P3
                                              --NO--> P4
```
