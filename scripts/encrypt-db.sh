#!/usr/bin/env bash
set -eu
DB_PATH="${1:?usage: $0 <path/to/homelabarr.db>}"
KEY_FILE="${2:?usage: $0 <db> <path/to/sqlcipher_key>}"
KEY="$(cat "$KEY_FILE")"
TMP="$(dirname "$DB_PATH")/.encrypted.db"
echo "Encrypting $DB_PATH..."
sqlite3 "$DB_PATH" "ATTACH DATABASE '$TMP' AS enc KEY '$KEY'; SELECT sqlcipher_export('enc'); DETACH DATABASE enc;"
mv "$DB_PATH" "$DB_PATH.preencrypt.$(date -u +%Y%m%dT%H%M%SZ)"
mv "$TMP" "$DB_PATH"
echo "Done. Backup at $DB_PATH.preencrypt.*"
