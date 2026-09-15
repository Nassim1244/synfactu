// Prisma CLI configuration.
//
// This file exists because Prisma 7 removed `url = env("DATABASE_URL")` from
// the datasource block in `schema.prisma`. The connection string that Migrate,
// Studio and introspection use now lives here (AD-020).
//
// It stays at the repository root because that is where the Prisma CLI looks
// for it, the same reason `.env.example` and `.dockerignore` sit there
// (`CLAUDE.md` -> Root files).
//
// This is CLI-only configuration. It is never bundled into the application:
// at runtime the client gets its connection through the better-sqlite3 driver
// adapter constructed in `src/lib/db.ts`, which reads the same DATABASE_URL
// through the validated config module. Two readers of one variable, not two
// sources of truth (AD-013, AD-014).

import path from "node:path";

// Imported from `prisma/config`, the CLI package's public entry point, and
// not from `@prisma/config`. The latter is the implementation package and is
// only ever a transitive dependency here; pnpm's non-flat `node_modules` makes
// importing it fail rather than work by accident, which is the behaviour
// AD-002 keeps pnpm for. `prisma` is a direct devDependency, so this import is
// declared.
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),

  // `env()` is Prisma's own reader, not `process.env` directly, so a missing
  // DATABASE_URL fails here with the variable named rather than surfacing as a
  // confusing connection error. `src/lib/config.ts` cannot be reused for this:
  // it is application code and this file is loaded by the CLI, outside Next.
  datasource: {
    url: env("DATABASE_URL"),
  },

  // Stated explicitly rather than left to the default. The directory does not
  // exist yet - see the comment in `prisma/schema.prisma` - and naming it here
  // is what makes the first `prisma migrate dev` of feature v01-001 create it
  // in the right place.
  migrations: {
    path: path.join(__dirname, "prisma", "migrations"),
  },
});
