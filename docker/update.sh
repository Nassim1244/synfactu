#!/bin/sh
# Bring a deployed instance onto a new version.
#
# The database is backed up FIRST, and the script aborts if that fails.
# The entrypoint applies "prisma migrate deploy" to a file holding years of
# financial data, and a migration is the only step here with no undo.
# Everything after the backup is recoverable; the backup is what makes it so.
#
# The database lives in a named volume, so the snapshot is taken inside the
# container with sqlite3 ".backup" - the only consistent way to copy a live
# SQLite file - and then extracted to the host with "docker compose cp".
#
# Deliberately absent: "docker compose down -v", volume removal and image
# pruning. An operator running this monthly must not be one flag away from
# deleting the database.
set -eu
cd "$(dirname "$0")"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_KEEP="${BACKUP_KEEP:-10}"
DB_PATH="${DB_PATH:-/data/app.db}"
SNAP="/data/_backup.tmp.db"

# --- 1. back up, or stop here ------------------------------------------------
if [ "$(docker compose ps -q app)" = "" ]; then
  echo "the app container is not running - start it before updating"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
DEST="$BACKUP_DIR/app-$(date +%Y%m%d-%H%M%S).db"

docker compose exec -T app sh -c "rm -f $SNAP && sqlite3 $DB_PATH \".backup '$SNAP'\""
docker compose cp "app:$SNAP" "$DEST"
docker compose exec -T app rm -f "$SNAP"

if [ ! -s "$DEST" ]; then
  echo "backup failed or is empty - aborting before any migration runs"
  rm -f "$DEST"
  exit 1
fi
echo "backup written to $DEST"

# --- 2. build and recreate ---------------------------------------------------
before=$(docker compose images app --format '{{.Tag}}' 2>/dev/null || echo "unknown")

docker compose build
docker compose up -d

# --- 3. wait for health ------------------------------------------------------
echo "waiting for health"
i=0
while [ "$i" -lt 60 ]; do
  state=$(docker compose ps --format '{{.Health}}' app 2>/dev/null || echo "")
  case "$state" in
    healthy)
      after=$(docker compose images app --format '{{.Tag}}' 2>/dev/null || echo "unknown")
      echo "healthy - $before -> $after"
      echo "backup: $DEST"
      # --- 4. prune old backups, newest kept ---------------------------------
      ls -1t "$BACKUP_DIR"/app-*.db 2>/dev/null \
        | tail -n +"$((BACKUP_KEEP + 1))" \
        | while read -r old; do rm -f "$old"; echo "pruned $old"; done
      exit 0
      ;;
    unhealthy)
      echo "unhealthy after update - the backup is at $DEST"
      echo "restore: docker compose cp $DEST app:$DB_PATH  (container stopped)"
      echo "logs: docker compose logs app"
      exit 1
      ;;
  esac
  i=$((i + 1)); sleep 2
done

echo "no health answer after 120s - the backup is at $DEST"
echo "logs: docker compose logs app"
exit 1
