#!/bin/sh
# Restart the running container. No build, no migration, nothing written to
# the database. This is the one to reach for when the application is wedged.
set -eu
cd "$(dirname "$0")"

docker compose restart

echo "waiting for health"
i=0
while [ "$i" -lt 30 ]; do
  state=$(docker compose ps --format '{{.Health}}' app 2>/dev/null || echo "")
  case "$state" in
    healthy) echo "healthy"; exit 0 ;;
    unhealthy) echo "unhealthy - check: docker compose logs app"; exit 1 ;;
  esac
  i=$((i + 1)); sleep 2
done
echo "no health answer after 60s - check: docker compose logs app"
exit 1
