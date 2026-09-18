// Database seed script. Owned by the architect; no other agent edits it
// (`ai-rules/policy_testing.md` -> Seed data). `@tester` may ask for an
// addition here; it does not make one itself.
//
// Two modes, selected by the first CLI argument, never by NODE_ENV
// (`ai-rules/policy_testing.md` -> Seed data):
//   - `test` - the minimum needed for end-to-end determinism.
//   - `dev`  - the `test` set plus realistic sample data.
//
// AD-017: authentication was skipped at bootstrap, so there is no
// administrator or restricted-role user to create yet, and both modes create
// zero records for now. The two entry points and the refusal guard exist
// today so nothing about how this script is invoked has to change the day
// Better Auth ships and rows start landing in `seedTest`/`seedDev`.
//
// Run via `pnpm db:seed` (dev) or `pnpm db:seed:test` (test). Both resolve to
// `tsx prisma/seed.ts <mode>` - see AD-029 for why `tsx` and not plain `node`.
//
// This file imports the Prisma client from `src/lib/db.ts`, the one place
// `policy_coding_guidelines.md` -> Forbidden and AD-004 allow outside a
// feature's `repository.ts`, rather than constructing a second client here.

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "prisma/seed" });

type Mode = "dev" | "test";

/**
 * Reads and validates the mode argument.
 *
 * `tsx prisma/seed.ts <mode>` puts the mode at `argv[2]`: `argv[0]` is the
 * node binary, `argv[1]` is this script's resolved path.
 *
 * @throws Error naming the problem when the argument is missing or not one
 * of the two accepted modes - a silent default here is how a `dev` run seeds
 * a database meant to stay minimal for end-to-end tests, or the reverse.
 */
function parseMode(argv: readonly string[]): Mode {
  const raw = argv[2];
  if (raw === "dev" || raw === "test") {
    return raw;
  }
  throw new Error(
    `Usage: tsx prisma/seed.ts <dev|test> - received ${
      raw === undefined ? "no argument" : `"${raw}"`
    }.`,
  );
}

/**
 * Refuses to seed a database that already holds rows
 * (`ai-rules/policy_testing.md` -> Seed data: "Seeding runs against a fresh
 * database, never against one holding data.").
 *
 * Checks every current model through the generated client's own type-safe
 * `count()` (`prisma.partner.count()`, `prisma.client.count()`) rather than
 * introspecting `sqlite_master` and building a raw SQL string per table name
 * (AD-029, superseding the earlier `Prisma.raw` version once it turned out to
 * splice the identifier into the query unescaped - the same string
 * interpolation `$queryRawUnsafe` does under a different name, not an actual
 * fix for `ai-rules/policy_security.md` -> Forbidden). This removes raw SQL
 * from the file entirely and matches how the rest of the codebase queries the
 * database, through the generated client (AD-004) - at the cost of one line
 * added here per future model, the same explicit trade-off AD-017 accepts
 * elsewhere for a "future insertion point" rather than a fully generic guard.
 *
 * `companyProfile` and `setting` (v01-003) are checked here even though
 * neither mode below ever inserts a row into them: their bootstrap defaults
 * are computed, not seeded (AD-031), so the only rows either table ever holds
 * come from a real user edit - which is exactly the pre-existing data this
 * guard exists to catch.
 *
 * @throws Error naming the first non-empty model found, with its row count.
 */
async function assertDatabaseIsEmpty(): Promise<void> {
  const [partnerCount, clientCount, companyProfileCount, settingCount] =
    await Promise.all([
      prisma.partner.count(),
      prisma.client.count(),
      prisma.companyProfile.count(),
      prisma.setting.count(),
    ]);

  // One entry per current model (`prisma/schema.prisma`). Add a line here
  // for each model a future spec introduces.
  const counts: ReadonlyArray<readonly [table: string, count: number]> = [
    ["partners", partnerCount],
    ["clients", clientCount],
    ["company_profile", companyProfileCount],
    ["settings", settingCount],
  ];

  for (const [table, count] of counts) {
    if (count > 0) {
      throw new Error(
        `Refusing to seed: table "${table}" already holds ${count} row(s). ` +
          "The seed script only runs against a fresh, freshly migrated " +
          "database (ai-rules/policy_testing.md -> Seed data).",
      );
    }
  }
}

/**
 * The `test` mode: the minimum needed for end-to-end determinism.
 *
 * Zero records today (AD-017) - no administrator, no restricted-role user,
 * because there is no authentication yet to grant either role to. This
 * function is the single place those rows are added once Better Auth ships,
 * with fixed identifiers, fixed credentials and fixed timestamps as
 * `ai-rules/policy_testing.md` -> Seed data requires. Not `async` today
 * because nothing here awaits yet; it will be once it does `prisma.*.create`
 * calls, and callers already `await` it in anticipation of that.
 */
function seedTest(): void {
  log.info("test seed: 0 records (AD-017 - authentication deferred)");
}

/**
 * The `dev` mode: the `test` set plus realistic sample data across the
 * application's main entities.
 *
 * Zero records today, for the same reason as `seedTest`, whose set this mode
 * is defined to include.
 */
function seedDev(): void {
  seedTest();
  log.info("dev seed: 0 additional records (AD-017 - authentication deferred)");
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv);

  await assertDatabaseIsEmpty();

  if (mode === "test") {
    seedTest();
  } else {
    seedDev();
  }

  log.info({ mode }, "seed completed");
}

main()
  .catch((error: unknown) => {
    log.error(
      { err: error },
      "seed failed - the database was left untouched by the refusal guard, or a step above threw",
    );
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
