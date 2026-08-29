#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="${BACKUP_DIR:-/var/backups/yarn-erp}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
: "${DATABASE_URL:?DATABASE_URL must be set}"
pg_dump "$DATABASE_URL" --format=custom --file="$BACKUP_DIR/yarn-erp-$STAMP.dump"
gzip -f "$BACKUP_DIR/yarn-erp-$STAMP.dump"
find "$BACKUP_DIR" -type f -name 'yarn-erp-*.dump.gz' -mtime +30 -delete
printf 'Backup written: %s\n' "$BACKUP_DIR/yarn-erp-$STAMP.dump.gz"
