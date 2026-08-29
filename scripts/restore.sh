#!/usr/bin/env bash
set -euo pipefail
FILE="${1:-}"
if [[ -z "$FILE" ]]; then echo "Usage: $0 /path/to/yarn-erp.dump.gz"; exit 1; fi
: "${DATABASE_URL:?DATABASE_URL must be set}"
TMP="$(mktemp --suffix=.dump)"
gunzip -c "$FILE" > "$TMP"
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$TMP"
rm -f "$TMP"
echo "Restore complete"
