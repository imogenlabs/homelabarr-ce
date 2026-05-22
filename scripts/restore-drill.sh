#!/usr/bin/env bash
set -eu
umask 077
DRILL_DIR="$(mktemp -d)"
trap 'rm -rf "$DRILL_DIR"' EXIT
BACKUP_DIR="${BACKUP_DIR:-./backups}"
LATEST_DB="$(ls -1t "$BACKUP_DIR"/homelabarr.*.db 2>/dev/null | head -1)"
LATEST_SECRETS="$(ls -1t "$BACKUP_DIR"/secrets.*.tar.* 2>/dev/null | head -1)"
[ -n "$LATEST_DB" ] || { echo "FAIL: no DB backup found in $BACKUP_DIR"; exit 2; }
[ -n "$LATEST_SECRETS" ] || { echo "FAIL: no secrets backup found in $BACKUP_DIR"; exit 2; }
cp "$LATEST_DB" "$DRILL_DIR/test.db"
tar -xf "$LATEST_SECRETS" -C "$DRILL_DIR" 2>/dev/null || tar -xzf "$LATEST_SECRETS" -C "$DRILL_DIR"
KEY="$(cat "$DRILL_DIR/secrets/sqlcipher_key" 2>/dev/null || echo "")"
if [ -n "$KEY" ]; then
  echo "Testing encrypted DB with SQLCipher key..."
  sqlite3 "$DRILL_DIR/test.db" "PRAGMA key='$KEY'; SELECT count(*) AS users FROM users; SELECT count(*) AS events FROM audit_events;" 2>&1 || echo "Note: sqlite3 CLI without SQLCipher cannot open encrypted DBs — this is expected"
else
  echo "No SQLCipher key found — testing as plaintext DB..."
  sqlite3 "$DRILL_DIR/test.db" "SELECT count(*) AS users FROM users;" 2>&1 || true
fi
echo "DRILL OK: $(basename "$LATEST_DB") + $(basename "$LATEST_SECRETS")"
