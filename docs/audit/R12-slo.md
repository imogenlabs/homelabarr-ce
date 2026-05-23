# SLO / SLI Baseline — HomelabARR CE

## Service Level Indicators

| SLI | SLO Target | Measurement | Source |
|-----|-----------|-------------|--------|
| /api/health success rate | 99.9% over 30d | HTTP status 200 count / total | nginx access log |
| Login p95 latency | < 300ms over 7d | `$request_time` for POST /api/auth/login | nginx access log |
| Audit-chain integrity | bad == 0 (hard SLO) | `R6-audit-chain.txt` from collect-evidence.sh | compliance evidence |
| Attack-tag emission lag | < 5s from honey hit to audit entry | Timestamp diff between honey.hit event and audit JSONL | audit log |
| Container restart count | < 3 per 24h per service | `docker events --filter type=container --filter event=die` | docker events |

## Error Budget

- **Budget:** 0.1% of /api/health requests may fail per 30-day window
- **Burn rate alert:** >50% of monthly budget consumed in <7 days → alert via ALERT_WEBHOOK_URL
- **Budget exhaustion policy:** Record + alert. No auto-freeze on deploys for a single-node demo.
- **Hard SLO (no budget):** Audit-chain integrity must always be bad=0. Any nonzero bad triggers immediate investigation regardless of error budget.

## Measurement Tooling

For ce-demo (single-node Docker Compose):
- **Preferred:** Raw log grep against nginx JSON access logs + audit JSONL
- **Optional:** Prometheus node-exporter + custom metrics from the backend health endpoint
- **Future:** Grafana dashboards wired to Loki (see docs/observability-log-shipping.md)

Both approaches are acceptable. The SLO targets above are defined independently of tooling.

## Review Cadence

- Weekly: spot-check SLIs from last 7 days of logs
- Monthly: full SLO compliance report (automated via collect-evidence.sh)
- Quarterly: review targets for adjustment based on observed baseline
