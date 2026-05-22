#!/usr/bin/env bash
set -eu
SECRETS_DIR="${SECRETS_DIR:-./secrets}"
RC=0
check() {
  local f="$1" limit="$2"
  local p="$SECRETS_DIR/$f"
  if [ ! -f "$p" ]; then echo "MISSING $f"; RC=1; return; fi
  local age=$(( ($(date +%s) - $(stat -f %m "$p" 2>/dev/null || stat -c %Y "$p")) / 86400 ))
  if [ "$age" -gt "$limit" ]; then
    echo "STALE $f age=${age}d limit=${limit}d"; RC=2
  else
    echo "ok    $f age=${age}d limit=${limit}d"
  fi
}
check jwt_key_current 90
check sqlcipher_key 180
check alert_webhook_secret 365
exit $RC
