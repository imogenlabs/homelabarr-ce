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

# Usage analytics are on unless ANALYTICS=off. Page views, masked clicks and a
# few named events go to PostHog through this server (/ingest/), so the browser
# only talks to its own origin and the security headers stay as they are.
# PRIVACY.md lists what is sent.
: "${ANALYTICS:=on}"
: "${POSTHOG_KEY:=phc_y8GsCKUDJ2TnEqan3hBpi2AkKAABikZLMb2GFjWemHYL}"
: "${POSTHOG_HOST:=https://us.i.posthog.com}"
ANALYTICS_CONF=/etc/nginx/conf.d/analytics.inc
rm -f "$ANALYTICS_CONF"
case "$ANALYTICS" in
  off|false) echo "Usage analytics off" ;;
  on|true)
    printf '%s' "$POSTHOG_KEY" | grep -Eq '^phc_[A-Za-z0-9]+$' \
      || { echo "FATAL: POSTHOG_KEY must look like phc_ followed by letters and digits"; exit 1; }
    printf '%s' "$POSTHOG_HOST" | grep -Eq '^https://[A-Za-z0-9.-]+$' \
      || { echo "FATAL: POSTHOG_HOST must look like https://us.i.posthog.com"; exit 1; }
    POSTHOG_NAME=${POSTHOG_HOST#https://}
    # PostHog cloud serves its per-project settings from a sibling host.
    case "$POSTHOG_NAME" in
      *.i.posthog.com) POSTHOG_ASSETS=${POSTHOG_NAME%.i.posthog.com}-assets.i.posthog.com ;;
      *) POSTHOG_ASSETS=$POSTHOG_NAME ;;
    esac
    # nginx looks PostHog up per request with this resolver, not at start, so a
    # host with no DNS or no internet still serves the dashboard.
    RESOLVER=$(awk '$1 == "nameserver" { print $2; exit }' /etc/resolv.conf 2>/dev/null || true)
    case "$RESOLVER" in
      "") RESOLVER=127.0.0.11 ;;
      *:*) RESOLVER="[$RESOLVER]" ;;
    esac
    cat > "$ANALYTICS_CONF" <<EOF
sub_filter '</head>' '<meta name="hl-analytics" content="${POSTHOG_KEY}"></head>';
sub_filter_once on;

location ^~ /ingest/array/ {
    resolver ${RESOLVER} valid=300s ipv6=off;
    resolver_timeout 5s;
    set \$posthog_assets https://${POSTHOG_ASSETS};
    rewrite ^/ingest/(.*) /\$1 break;
    proxy_pass \$posthog_assets;
    proxy_http_version 1.1;
    proxy_set_header Host ${POSTHOG_ASSETS};
    proxy_ssl_server_name on;
    proxy_ssl_name ${POSTHOG_ASSETS};
    proxy_set_header Connection "";
    proxy_set_header Cookie "";
    proxy_set_header X-Forwarded-For "";
    proxy_hide_header Set-Cookie;
    proxy_ignore_headers Set-Cookie;
    proxy_connect_timeout 5s;
    access_log off;
}

location ^~ /ingest/ {
    resolver ${RESOLVER} valid=300s ipv6=off;
    resolver_timeout 5s;
    set \$posthog ${POSTHOG_HOST};
    rewrite ^/ingest/(.*) /\$1 break;
    proxy_pass \$posthog;
    proxy_http_version 1.1;
    proxy_set_header Host ${POSTHOG_NAME};
    proxy_ssl_server_name on;
    proxy_ssl_name ${POSTHOG_NAME};
    proxy_set_header Connection "";
    proxy_set_header Cookie "";
    proxy_set_header X-Forwarded-For "";
    proxy_hide_header Set-Cookie;
    proxy_ignore_headers Set-Cookie;
    proxy_connect_timeout 5s;
    access_log off;
}
EOF
    echo "Usage analytics on: anonymous usage goes to ${POSTHOG_HOST}. Set ANALYTICS=off to turn it off (see PRIVACY.md)"
    ;;
  *) echo "FATAL: ANALYTICS must be on or off"; exit 1 ;;
esac

echo "HomelabARR frontend starting (backend: ${BACKEND_URL})"
exec nginx -g 'daemon off;'
