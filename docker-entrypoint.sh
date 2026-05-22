#!/bin/sh
set -eu
: "${BACKEND_URL:=http://backend:8092}"

# Validate
case "$BACKEND_URL" in
  http://*|https://*) ;;
  *) echo "FATAL: BACKEND_URL must start with http:// or https://"; exit 1 ;;
esac

envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

echo "HomelabARR frontend starting (backend: ${BACKEND_URL})"
exec nginx -g 'daemon off;'
