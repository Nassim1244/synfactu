# syntax=docker/dockerfile:1
#
# Skeleton shipped with the spec-driven template. Adapt every CHANGEME, and
# verify the pinned versions at bootstrap rather than trusting them.
#
# Build context is the repository root - docker-compose.yml sets it, and
# .dockerignore is resolved there.
#
# Requires output: "standalone" in next.config. Without it the runtime stage
# has no server.js to copy and the build fails at the last COPY.

ARG NODE_VERSION=24

# --- dependencies ------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- dependencies (production only) ------------------------------------------
# A separate install from the same lockfile, `--prod` only. Exists solely to
# give the runtime stage a complete, real `node_modules` for every package
# `dependencies` lists - including the `prisma` CLI (AD-026) - without dragging
# `deps`'s dev dependencies along. Not derived from `deps`: a fresh install is
# simpler than pruning one, and BuildKit runs the two in parallel since neither
# depends on the other.
FROM node:${NODE_VERSION}-slim AS deps-prod
WORKDIR /app
RUN corepack enable

# openssl: installed here, before `pnpm install`, at the same package the
# `runtime` stage installs below - `@prisma/engines` postinstall (AD-027,
# `allowBuilds` in pnpm-workspace.yaml) probes the platform's libssl at
# install time to pick which schema-engine variant to fetch, and this stage's
# `node_modules` is what `runtime` ships (AD-026). Without it, this stage has
# no libssl to detect, defaults to the openssl-1.1.x engine variant, while
# `runtime`'s own openssl install resolves to 3.0.x - a mismatch invisible
# until container start, when `migrate deploy` finds the wrong engine variant
# on disk and re-downloads over a network the container may not have.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# --- build -------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
RUN corepack enable
ENV NEXT_TELEMETRY_DISABLED=1
# `pnpm prisma generate` loads prisma.config.ts, which resolves DATABASE_URL
# through Prisma's own env() reader (AD-020) even though generate never opens
# a connection - it only needs a syntactically valid file: URL. This is an
# inert placeholder, not the real value: it is a plain ENV local to this
# stage, the runtime stage below starts from a fresh FROM and copies no env
# file or shell state from here, and the real DATABASE_URL is supplied at
# container runtime by docker-compose.yml (AD-025).
ENV DATABASE_URL="file:./build-placeholder.db"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# --- runtime -----------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Docker sets HOSTNAME to the container ID for every container unless
# overridden. The standalone server.js binds to HOSTNAME when set, so left
# unset here it binds to an address nothing (including the healthcheck below,
# which hits 127.0.0.1) can reach. Forcing it to 0.0.0.0 makes the server
# listen on all interfaces regardless of what Docker injects at run time.
ENV HOSTNAME=0.0.0.0

# openssl: Prisma's query engine needs it on the slim image.
# sqlite3: update.sh runs ".backup" inside the container, the only way to
# snapshot a live database consistently. About 1.5 MB, against the alternative
# of stopping the service to copy a file.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates sqlite3 \
 && rm -rf /var/lib/apt/lists/*

# No dev dependencies reach this stage. `node_modules` is assembled in two
# layers (AD-026):
#   1. `deps-prod`'s full, real install of every `dependencies` package -
#      including the `prisma` CLI the entrypoint needs for `migrate deploy`,
#      which nothing in the server's own import graph references and which
#      `output: standalone` tracing (next.config.ts) therefore never places
#      here on its own.
#   2. The standalone output's own pruned `node_modules`, copied last so its
#      exact, tracing-selected files for every package the server actually
#      imports at request time are what the runtime uses - layer 1 only fills
#      the gap tracing leaves, it never overrides what tracing already placed.
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# /data is the mount point for the database. A named volume inherits the
# ownership of its mount point on first creation, so this chown is what makes
# the volume writable by the non-root user. Nothing is needed on the host,
# which is one more reason the volume is named rather than bound.
RUN mkdir -p /data && chown -R node:node /data

USER node
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
