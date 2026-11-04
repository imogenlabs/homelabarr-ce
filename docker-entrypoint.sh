#!/bin/sh
set -eu
: "${BACKEND_URL:=http://backend:8092}"
: "${ALLOW_PLAIN_HTTP:=false}"

# Validate
case "$BACKEND_URL" in
  http://*|https://*) ;;
  *) echo "FATAL: BACKEND_URL must start with http:// or https://"; exit 1 ;;
esac

# HTTPS is the default. ALLOW_PLAIN_HTTP=true is for LAN-only installs opened at
# http://<ip>:<port>: browsers would otherwise upgrade every asset request to
# https:// on a port that only speaks HTTP and show a blank page (#622).
case "$ALLOW_PLAIN_HTTP" in
  true)
    HSTS_HEADER=""
    CSP_UPGRADE_INSECURE=""
    echo "WARNING: ALLOW_PLAIN_HTTP=true — HSTS and upgrade-insecure-requests are off. Only use this on a trusted LAN."
    ;;
  false)
    HSTS_HEADER="max-age=63072000; includeSubDomains; preload"
    CSP_UPGRADE_INSECURE="upgrade-insecure-requests; "
    ;;
  *) echo "FATAL: ALLOW_PLAIN_HTTP must be true or false"; exit 1 ;;
esac
export BACKEND_URL HSTS_HEADER CSP_UPGRADE_INSECURE

envsubst '${BACKEND_URL} ${HSTS_HEADER} ${CSP_UPGRADE_INSECURE}' \
  < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

echo "HomelabARR frontend starting (backend: ${BACKEND_URL})"
exec nginx -g 'daemon off;'
