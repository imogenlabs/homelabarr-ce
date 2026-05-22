#!/usr/bin/env bash
# HomelabARR-CE encrypted offsite backup
# Required env: OFFSITE_DEST, BACKUP_GPG_RCPT
# Optional env: INTERNAL_AUDIT_TOKEN, LOCAL_DIR
set -Eeuo pipefail
umask 077

TS=$(date +%Y%m%d-%H%M%S)
LOCAL_DIR="${LOCAL_DIR:-./backups}"
OFFSITE_DEST="${OFFSITE_DEST:-}"
RECIPIENT="${BACKUP_GPG_RCPT:-}"
OUT="${LOCAL_DIR}/homelabarr-${TS}.tar"
mkdir -p "$LOCAL_DIR"

# 1. Snapshot DB via docker cp
echo "Backing up database..."
docker cp "homelabarr-backend:/app/data/homelabarr.db" "${LOCAL_DIR}/homelabarr.${TS}.db"

# 2. Snapshot secrets (separate trust zone)
echo "Backing up secrets..."
tar -caf "${LOCAL_DIR}/secrets.${TS}.tar.zst" ./secrets 2>/dev/null || \
  tar -czf "${LOCAL_DIR}/secrets.${TS}.tar.gz" ./secrets 2>/dev/null || true

# 3. Encrypt if GPG recipient is configured
if [ -n "$RECIPIENT" ]; then
  echo "Encrypting backup..."
  gpg --batch --yes --trust-model always --encrypt --recipient "$RECIPIENT" \
      --cipher-algo AES256 --compress-algo zlib \
      --output "${LOCAL_DIR}/homelabarr.${TS}.db.gpg" "${LOCAL_DIR}/homelabarr.${TS}.db"
  rm -f "${LOCAL_DIR}/homelabarr.${TS}.db"

  # Hash + sign manifest
  sha256sum "${LOCAL_DIR}/homelabarr.${TS}.db.gpg" > "${LOCAL_DIR}/homelabarr.${TS}.db.gpg.sha256"
  gpg --batch --yes --detach-sign --local-user "$RECIPIENT" \
      "${LOCAL_DIR}/homelabarr.${TS}.db.gpg.sha256" 2>/dev/null || true
  BACKUP_FILE="${LOCAL_DIR}/homelabarr.${TS}.db.gpg"
else
  BACKUP_FILE="${LOCAL_DIR}/homelabarr.${TS}.db"
fi

# 4. Push to offsite if configured
if [ -n "$OFFSITE_DEST" ]; then
  echo "Pushing to offsite: $OFFSITE_DEST"
  rclone copy "$BACKUP_FILE" "$OFFSITE_DEST" --immutable 2>/dev/null || \
    { echo "WARN: offsite push failed" >&2; }
fi

# 5. Local retention: 14 days
find "$LOCAL_DIR" -name 'homelabarr-*' -mtime +14 -delete 2>/dev/null || true

# 6. Audit event via internal ingress
BYTES=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null || echo 0)
TOK="${INTERNAL_AUDIT_TOKEN:-}"
if [ -z "$TOK" ] && [ -f /run/secrets/internal_audit_token ]; then
  TOK=$(cat /run/secrets/internal_audit_token)
fi
if [ -n "$TOK" ]; then
  curl -fsS -X POST "http://127.0.0.1:8092/internal/audit" \
    -H "X-Internal-Token: $TOK" \
    -H 'Content-Type: application/json' \
    -d "{\"event\":\"backup.completed\",\"target\":\"${OFFSITE_DEST:-local}\",\"meta\":{\"bytes\":$BYTES,\"ts\":\"$TS\"}}" \
    >/dev/null 2>&1 || echo "WARN: audit POST failed" >&2
fi

echo "Done: $BACKUP_FILE ($BYTES bytes)"
echo "Secrets archive: ${LOCAL_DIR}/secrets.${TS}.tar.*"
echo "Store DB backup and secrets archive in DIFFERENT trust zones."
