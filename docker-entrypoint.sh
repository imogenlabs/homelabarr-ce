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

# Usage analytics are off by default: a self-hosted dashboard sends nothing
# anywhere (HLCE-389). Setting both values turns on Umami page views, proxied
# through this server so the browser only talks to its own origin.
: "${ANALYTICS_URL:=}"
: "${ANALYTICS_WEBSITE_ID:=}"
ANALYTICS_CONF=/etc/nginx/conf.d/analytics.inc
rm -f "$ANALYTICS_CONF"
if [ -n "${ANALYTICS_URL}${ANALYTICS_WEBSITE_ID}" ]; then
  printf '%s' "$ANALYTICS_URL" | grep -Eq '^https://[A-Za-z0-9.-]+(:[0-9]+)?$' \
    || { echo "FATAL: ANALYTICS_URL must look like https://analytics.example.com"; exit 1; }
  printf '%s' "$ANALYTICS_WEBSITE_ID" | grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' \
    || { echo "FATAL: ANALYTICS_WEBSITE_ID must be the Umami website id"; exit 1; }
  ANALYTICS_HOST=${ANALYTICS_URL#https://}
  ANALYTICS_HOST=${ANALYTICS_HOST%%:*}
  cat > "$ANALYTICS_CONF" <<EOF
sub_filter '</head>' '<script defer src="/analytics.js" data-website-id="${ANALYTICS_WEBSITE_ID}"></script></head>';
sub_filter_once on;

location = /analytics.js {
    proxy_pass ${ANALYTICS_URL}/script.js;
    proxy_set_header Host ${ANALYTICS_HOST};
    proxy_ssl_server_name on;
    proxy_hide_header Set-Cookie;
    proxy_ignore_headers Set-Cookie;
    expires 1h;
    add_header Strict-Transport-Security \$hsts always;
    add_header X-Content-Type-Options "nosniff" always;
}

location = /api/send {
    proxy_pass ${ANALYTICS_URL}/api/send;
    proxy_set_header Host ${ANALYTICS_HOST};
    proxy_ssl_server_name on;
    proxy_hide_header Set-Cookie;
    proxy_ignore_headers Set-Cookie;
}
EOF
  echo "Usage analytics on: page views go to ${ANALYTICS_URL}"
fi

echo "HomelabARR frontend starting (backend: ${BACKEND_URL})"
exec nginx -g 'daemon off;'
