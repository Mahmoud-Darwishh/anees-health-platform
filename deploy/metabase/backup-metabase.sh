#!/usr/bin/env bash
# =============================================================================
# Anees Health · Metabase · daily metadata-DB backup
# =============================================================================
# Backs up Metabase's OWN application database (dashboards, questions, users,
# settings). NOT the patient database. Schedule via cron, e.g.:
#
#   0 2 * * *  /opt/metabase/backup-metabase.sh >> /var/log/metabase-backup.log 2>&1
#
# REMEMBER: a dump is useless for restoring data-source credentials without the
# MB_ENCRYPTION_SECRET_KEY — keep that escrowed separately (password manager).
# =============================================================================
set -euo pipefail

BACKUP_DIR="/opt/metabase/backups"
RETENTION_DAYS=30
STAMP="$(date +%F_%H%M)"

mkdir -p "$BACKUP_DIR"

# Dump the metadata DB from inside the container (custom format = compressed, restorable).
docker exec anees-metabase-db \
  pg_dump -U metabaseapp -Fc metabaseapp \
  > "${BACKUP_DIR}/metabase_${STAMP}.dump"

# Prune old backups.
find "$BACKUP_DIR" -name 'metabase_*.dump' -mtime +"$RETENTION_DAYS" -delete

echo "[$(date -Iseconds)] Metabase metadata backup written: metabase_${STAMP}.dump"

# Restore (reference):
#   docker exec -i anees-metabase-db \
#     pg_restore -U metabaseapp -d metabaseapp --clean < metabase_YYYY-MM-DD_HHMM.dump
