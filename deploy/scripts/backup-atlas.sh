#!/usr/bin/env bash
# Verified logical backup of the application database (READ-ONLY on the database).
# Usage:  MONGODB_URI='mongodb+srv://…' ./backup-atlas.sh [/path/to/backup/dir]
# Requires mongodb-database-tools (mongodump / mongorestore).
set -euo pipefail
: "${MONGODB_URI:?Set MONGODB_URI (do not put credentials on the command line history if avoidable)}"
OUT="${1:-./backups}/exploria360-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

echo "→ dumping to $OUT (read-only)…"
mongodump --uri="$MONGODB_URI" --gzip --archive="$OUT/dump.archive.gz"

echo "→ verifying archive integrity (dry-run restore, nothing is written to any database)…"
mongorestore --gzip --archive="$OUT/dump.archive.gz" --dryRun --stopOnError 2>&1 | tail -5

echo "→ checksum"
( cd "$OUT" && sha256sum dump.archive.gz | tee dump.archive.gz.sha256 )
ls -lh "$OUT"
echo "Backup OK: $OUT"
