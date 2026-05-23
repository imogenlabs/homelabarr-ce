# Experiment 08 — Crash log scan

## Purpose
After each chaos experiment involving a crash/restart (01, 04, 06), scan captured docker logs for secret leakage.

## Method
```sh
docker logs homelabarr-demo-backend --since 5m 2>&1 | \
  grep -iE 'jwt_secret|sqlcipher_key|admin_password|webhook_secret|BEGIN.*KEY' \
  > chaos/leak-scan-results.txt
echo "Scan complete: $(wc -l < chaos/leak-scan-results.txt) matches"
```

## Expected behavior
Zero matches. Secrets are file-mounted via Docker secrets (/run/secrets/), not in environment variables. Crash output should contain only structured JSON logs with PII-redacted fields.

## Run log
*To be filled after first execution.*
