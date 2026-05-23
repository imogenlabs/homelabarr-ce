# Residual Risk Register

| Risk | Why accepted/deferred | Owner decision | Compensating controls |
|------|----------------------|----------------|----------------------|
| Audit-log off-box destination undecided | Cost vs operational complexity | OUTSTANDING (owner pile since R7) | R6 hash chain detects in-host tampering |
| Single-node demo, no multi-region failover | ce-demo is a demo, not prod | ACCEPTED | R8 backup + R12 restore drill |
| ASVS V1/V8/V10/V11/V12 coverage thin | Quarterly cadence; not all chapters apply | DEFERRED (R11.5 roadmap) | R11 compliance binder documents gap |
| No production WAF beyond nginx + CF | Cloudflare handles L7 DDoS | ACCEPTED | CF rules + R1 nginx limits |
| Passwords not checked against breach lists | Feature not implemented | DEFERRED | R3 bcrypt cost 12 + R6 lockout |
| No explicit idle session timeout | 15min access token TTL only | DEFERRED | R3 refresh token rotation |
| Docker Content Trust (DCT) not enabled | cosign provides equivalent attestation | ACCEPTED | R5 cosign keyless signing |
| DR drill not yet exercised | R8 specced; no recorded execution | DEFERRED (14-day SLA) | R8 backup.sh + restore-drill.sh exist |
| Cross-tenant isolation N/A | Single-tenant by design | N/A | — |
| No public crawl surface / sitemap | Demo uses `noindex, nofollow`; no public pages to index | ACCEPTED | R17 robots.txt disallows /api/ and /admin/; meta robots blocks indexing |
