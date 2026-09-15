// The Prisma client singleton.
//
// One instance for the whole process, constructed here and nowhere else.
// AD-004 confines Prisma imports to this file and to each feature's
// `src/features/<domain>/repository.ts`; nothing else in the tree imports the
// generated client (`policy_architecture.md` -> Data access).
//
// The client is imported from `@/generated/prisma/client`, not from
// `@prisma/client`: the v7 `prisma-client` generator emits TypeScript source
// into `src/generated/prisma` rather than patching `node_modules` (AD-020).
// That directory is build output - `prisma generate` recreates it - and it is
// git-, Prettier- and ESLint-ignored for that reason.
//
// This module is server-only. It reads `src/lib/config.ts`, which reads
// `process.env`, and it opens a native SQLite handle; importing it from a
// Client Component would fail in the browser. Server Components, Server
// Actions, Route Handlers and repositories only.
//
// AD-013, the day the project moves to PostgreSQL: the change is this file's
// adapter import - `@prisma/adapter-pg`'s `PrismaPg` in place of
// `@prisma/adapter-better-sqlite3`'s `PrismaBetterSqlite3` - plus `provider`
// in `prisma/schema.prisma`. Nothing else. No call site moves, because AD-004
// means there are no call sites outside the repositories, and AD-007's integer
// storage means no data is transformed.

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma/client";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "lib/db" });

/**
 * Builds the client and its driver adapter.
 *
 * `adapter` is required in Prisma 7: the schema no longer carries a `url` and
 * there is no `datasourceUrl` option left beside it, so this is the only way
 * the client opens a connection (AD-020). The adapter takes the `file:` form
 * of DATABASE_URL directly.
 *
 * DATABASE_URL comes from the validated config module, never from
 * `process.env` (`policy_architecture.md` -> Configuration, AD-014).
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: config.DATABASE_URL }),
  });
}

/**
 * Where the instance is parked between module evaluations.
 *
 * `next dev` re-evaluates modules as it recompiles, and each evaluation would
 * otherwise open another better-sqlite3 handle on the same file until SQLite
 * refuses. `globalThis` survives that, so the first client is reused.
 *
 * The key is namespaced to this project: `globalThis` is shared with every
 * other module in the process, and a bare `prisma` is exactly the kind of name
 * two packages collide on.
 */
const globalForPrisma = globalThis as typeof globalThis & {
  __synfactuPrisma__?: PrismaClient;
};

/**
 * The application's Prisma client. Import it from a repository; nothing else
 * may import it (AD-004).
 */
export const prisma: PrismaClient =
  globalForPrisma.__synfactuPrisma__ ?? createPrismaClient();

// Production builds evaluate this module once, so caching there would only
// keep a reference alive for no benefit. The guard is explicitly "not
// production" rather than "is development": `config.NODE_ENV` also takes the
// value "test", where the same re-evaluation happens.
if (config.NODE_ENV !== "production") {
  globalForPrisma.__synfactuPrisma__ = prisma;
}

/**
 * Answers whether the database answers a query right now.
 *
 * It lives here rather than in the health Route Handler because AD-004 allows
 * a Prisma call only in this file and in a feature repository, and a health
 * probe belongs to no business domain. The route asks this question; it never
 * holds the client.
 *
 * The probe is a real round-trip, not `$connect()`: the adapter opens SQLite
 * lazily, so only a statement proves the file is present, readable and not
 * locked. `SELECT 1` runs on SQLite and on PostgreSQL alike, so AD-013 does
 * not reach it.
 *
 * @returns true when the query succeeded, false on any failure. It never
 * throws: the caller is a health endpoint, which must answer rather than 500.
 * The cause is logged here, the boundary where the failure is handled, and is
 * deliberately not returned - an internal error message must not reach a
 * client (`policy_coding_guidelines.md` -> Error handling and logging).
 */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    log.error({ err: error }, "database health probe failed");
    return false;
  }
}
