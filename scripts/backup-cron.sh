#!/usr/bin/env bash
set -eu
umask 077
PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BACKUP_LOCAL="${BACKUP_LOCAL:-$PROJECT_DIR/backups}"
BACKUP_REMOTE="${BACKUP_REMOTE:-}"
SECRETS_REMOTE="${SECRETS_REMOTE:-}"
RETAIN_DAYS="${RETAIN_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_LOCAL"
cd "$PROJECT_DIR"
bash scripts/backup.sh
find "$BACKUP_LOCAL" -type f -mtime "+$RETAIN_DAYS" -delete 2>/dev/null || true
if [ -n "$BACKUP_REMOTE" ]; then
  rsync -av "$BACKUP_LOCAL/homelabarr.$STAMP.db" "$BACKUP_REMOTE/" 2>/dev/null || true
fi
if [ -n "$SECRETS_REMOTE" ]; then
  rsync -av "$BACKUP_LOCAL/secrets.$STAMP.tar."* "$SECRETS_REMOTE/" 2>/dev/null || true
fi
echo "[$(date -Iseconds)] backup-cron completed: $STAMP"
