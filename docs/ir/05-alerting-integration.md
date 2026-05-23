# Alerting Integration

How each sensor reaches the operator.

| Sensor | Emission point | Sink | Pager mechanism | Time-to-detect target |
|--------|---------------|------|-----------------|----------------------|
| R6 audit chain | `compliance/collect-evidence.sh` cron | `R6-audit-chain.txt` | Cron: if `jq .bad` > 0 → email/SMS | < 5 min |
| R10 honey routes | Backend handler → audit JSONL | `audit-*.jsonl` | Tail-watcher or ALERT_WEBHOOK_URL | < 5 min |
| R5 cosign verify | CI `compliance-evidence.yml` | Workflow status | GitHub notification on failure | < 15 min |
| R12 SLO p95 | nginx access log | grep/awk cron | Email if 7d avg p95 > 300ms | < 1 hour |
| R12 SLO health | nginx access log | grep cron | Email if 30d success < 99.9% | < 1 hour |
| R12 restart storm | `docker events` | Tail-watcher | Email if > 3 restarts / 24h / service | < 5 min |
