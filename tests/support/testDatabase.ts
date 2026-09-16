// Shared fixture for every repository integration test
// (`ai-rules/policy_testing.md` -> Database testing): a real SQLite file,
// created per test file in a temporary directory, migrated from
// `prisma/migrations/` - never the development database at `/data/dev.db`,
// and never a mock of the Prisma client.
//
// The generated `PrismaClient` is pointed at the temporary file by setting
// `process.env.DATABASE_URL` before `src/lib/db.ts` (and therefore each
// feature's `repository.ts`, which imports the singleton from it) is ever
// evaluated. Every repository test file must import its repository with a
// dynamic `import()` inside `beforeAll`, after calling `createTestDatabase`,
// because a static `import` at the top of the file would be hoisted above
// this env assignment and would read `undefined` before `src/lib/config.ts`
// ever sees the temporary path.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");
const SCHEMA_PATH = join(process.cwd(), "prisma", "schema.prisma");

export type TestDatabase = {
  /** The `file:` URL of the migrated, empty, temporary SQLite database. */
  readonly databaseUrl: string;
  /** Removes the temporary directory and everything in it. */
  readonly cleanup: () => void;
};

/**
 * Creates a fresh temporary SQLite file and applies every migration under
 * `prisma/migrations/`, in order, through the real Prisma CLI (`migrate
 * deploy`) so the schema it produces is exactly the one the application ships
 * with - never a hand-written `CREATE TABLE` that could drift from it.
 *
 * @returns the database's `file:` URL, ready to be assigned to
 * `process.env.DATABASE_URL` before the repository under test is imported,
 * and a `cleanup` function to call in `afterAll`.
 */
export function createTestDatabase(): TestDatabase {
  const dir = mkdtempSync(join(tmpdir(), "synfactu-test-db-"));
  const dbPath = join(dir, "test.db");
  const databaseUrl = `file:${dbPath}`;

  // At least one migration must exist, or this silently tests against an
  // empty schema and every repository call below would fail with a
  // confusing "no such table" instead of a clear setup error.
  const migrationCount = readdirSync(MIGRATIONS_DIR, {
    withFileTypes: true,
  }).filter((entry) => entry.isDirectory()).length;
  if (migrationCount === 0) {
    throw new Error(
      `no migrations found under ${MIGRATIONS_DIR} - nothing to apply`,
    );
  }

  execFileSync(
    "pnpm",
    ["exec", "prisma", "migrate", "deploy", "--schema", SCHEMA_PATH],
    {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "pipe",
    },
  );

  return {
    databaseUrl,
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
