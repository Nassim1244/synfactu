#!/bin/sh
# Applies pending migrations before the server accepts traffic, then hands
# over to CMD. Never runs "prisma migrate dev" and never resets: this runs
# against production data.
set -eu

echo "entrypoint: applying migrations"
./node_modules/prisma/build/index.js migrate deploy

echo "entrypoint: starting server"
exec "$@"
