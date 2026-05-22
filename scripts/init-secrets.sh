#!/usr/bin/env bash
set -eu
umask 077
mkdir -p ./secrets
need() {
  local name="$1" gen="$2"
  if [ ! -f "./secrets/$name" ]; then
    eval "$gen" > "./secrets/$name"
    echo "wrote ./secrets/$name ($(wc -c < "./secrets/$name") bytes)"
  else
    echo "exists ./secrets/$name (skipped)"
  fi
}
need jwt_key_current         'openssl rand -base64 48'
need jwt_key_previous        'echo ""'
need default_admin_password  'openssl rand -base64 18'
need alert_webhook_secret    'openssl rand -base64 32'
need sqlcipher_key           'openssl rand -base64 32'

echo
echo "Initial admin password (one-time; change on first login):"
cat ./secrets/default_admin_password
echo
echo "Keep ./secrets/ out of version control and back it up securely."
