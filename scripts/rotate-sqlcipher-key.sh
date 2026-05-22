#!/usr/bin/env bash
set -eu
umask 077
SECRETS_DIR="${SECRETS_DIR:-./secrets}"
OLD_KEY="$(cat "$SECRETS_DIR/sqlcipher_key")"
NEW_KEY="$(openssl rand -base64 32)"
printf '%s' "$NEW_KEY" > "$SECRETS_DIR/.sqlcipher_key.new"
mv "$SECRETS_DIR/.sqlcipher_key.new" "$SECRETS_DIR/sqlcipher_key"
echo "SQLCipher key rotated. Restart backend to pick up the new key."
echo "The backend will PRAGMA rekey on next boot if the key changed."
echo "Restart: docker compose restart backend"
