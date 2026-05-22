#!/bin/sh
BACKEND_URL=${BACKEND_URL:-http://backend:8092}

# Validate BACKEND_URL
case "$BACKEND_URL" in
  http://*|https://*) ;;
  *) echo "FATAL: BACKEND_URL must start with http:// or https://"; exit 1 ;;
esac
if echo "$BACKEND_URL" | grep -qE '[|;<>\`$()\\]'; then
  echo "FATAL: BACKEND_URL contains forbidden characters"; exit 1
fi

sed "s|BACKEND_URL_PLACEHOLDER|${BACKEND_URL}|g" \
    /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

echo "HomelabARR frontend starting (backend: ${BACKEND_URL})"
exec nginx -g 'daemon off;'
