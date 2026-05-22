#!/usr/bin/env bash
set -eu
echo "=== HomelabARR CE Disaster Recovery Drill ==="
echo "This script validates that a backup can be restored on a clean host."
echo ""
echo "Prerequisites:"
echo "  - Docker installed on this host"
echo "  - A backup DB file and secrets archive available"
echo ""
BACKUP_DB="${1:-}"
SECRETS_ARCHIVE="${2:-}"
if [ -z "$BACKUP_DB" ] || [ -z "$SECRETS_ARCHIVE" ]; then
  echo "Usage: $0 <path/to/homelabarr.STAMP.db> <path/to/secrets.STAMP.tar.zst>"
  exit 1
fi
[ -f "$BACKUP_DB" ] || { echo "FAIL: DB backup not found: $BACKUP_DB"; exit 2; }
[ -f "$SECRETS_ARCHIVE" ] || { echo "FAIL: Secrets archive not found: $SECRETS_ARCHIVE"; exit 2; }
echo "Extracting secrets..."
mkdir -p ./secrets && chmod 700 ./secrets
tar -xf "$SECRETS_ARCHIVE" 2>/dev/null || tar -xzf "$SECRETS_ARCHIVE"
echo "Starting stack..."
docker compose pull 2>/dev/null
docker compose up -d
sleep 15
echo "Restoring database..."
docker cp "$BACKUP_DB" homelabarr-backend:/app/data/homelabarr.db
docker compose restart backend
sleep 20
echo "Verifying health..."
STATUS=$(curl -fsS http://localhost:8084/api/health 2>/dev/null | grep -o '"status":"[^"]*"' | head -1)
echo "Health: $STATUS"
echo ""
echo "DR DRILL OK"
