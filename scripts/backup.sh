#!/usr/bin/env bash
set -eu
umask 077
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
echo "Backing up database..."
docker cp "homelabarr-backend:/app/data/homelabarr.db" "$BACKUP_DIR/homelabarr.$STAMP.db"
echo "Backing up secrets..."
tar -caf "$BACKUP_DIR/secrets.$STAMP.tar.zst" ./secrets 2>/dev/null || tar -czf "$BACKUP_DIR/secrets.$STAMP.tar.gz" ./secrets
echo "Done: $BACKUP_DIR/homelabarr.$STAMP.db + $BACKUP_DIR/secrets.$STAMP.tar.*"
echo "Store DB backup and secrets archive in DIFFERENT trust zones."
