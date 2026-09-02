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

ARG NODE_VERSION=22

# --- dependencies ------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- build -------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
RUN corepack enable
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# --- runtime -----------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# openssl: Prisma's query engine needs it on the slim image.
# sqlite3: update.sh runs ".backup" inside the container, the only way to
# snapshot a live database consistently. About 1.5 MB, against the alternative
# of stopping the service to copy a file.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates sqlite3 \
 && rm -rf /var/lib/apt/lists/*

# No dev dependencies reach this stage: only the standalone output and the
# Prisma runtime the entrypoint needs to apply migrations.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma

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
