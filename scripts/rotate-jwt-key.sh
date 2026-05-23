#!/usr/bin/env bash
set -eu
umask 077
cd "${SECRETS_DIR:-./secrets}"
if [ -f jwt_key_current ]; then
  cp jwt_key_current jwt_key_previous
fi
KID="$(openssl rand -hex 4)"
SECRET="$(openssl rand -base64 48)"
printf '{"kid":"%s","secret":"%s"}\n' "$KID" "$SECRET" > jwt_key_current
echo "Rotated JWT key. New kid=$KID"
echo "Previous key preserved in jwt_key_previous (accepted for up to 24 hours)."
echo "Backend picks up the new key on next request — no restart needed."
