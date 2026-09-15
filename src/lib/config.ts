// Environment configuration.
//
// Every environment variable the application reads is declared, parsed and
// validated here, once, at module load (`ai-rules/policy_architecture.md` ->
// Configuration, AD-014). Application code imports `config`; nothing else in
// the tree touches `process.env` (`policy_coding_guidelines.md` -> Forbidden).
//
// This module is server-only. `process.env` is empty in a browser bundle, so
// importing it from a Client Component would fail the parse at runtime rather
// than at startup. Read it from Server Components, Server Actions, route
// handlers and `src/lib/` only.
//
// No BETTER_AUTH_* variable is declared: authentication was skipped at
// bootstrap (AD-017). It is added back with Better Auth itself, not before -
// a required variable nobody can give a meaning to is how this file rots.

import { z } from "zod";

/**
 * Runtime mode. Set by the toolchain, not by the operator: `next dev` sets
 * "development", `next build` and `next start` set "production", Vitest sets
 * "test". It therefore has a default rather than being required - a bare
 * `node` script or a one-off CLI leaves it unset, and throwing there would
 * fail commands that have nothing to do with the application's runtime.
 *
 * The default is "production" because it is the safe direction: an unset
 * NODE_ENV must never switch on development-only behaviour (pretty logs,
 * verbose errors, relaxed checks). A wrong value still fails the parse.
 */
const nodeEnvSchema = z
  .enum(["development", "test", "production"])
  .default("production");

/**
 * Database connection string, supplied per deployment (AD-013). Required and
 * has no default: a config module that invents one here would point a live
 * instance at the wrong file, which is worse than not starting.
 *
 * Validated as "non-empty, carries a URL scheme" rather than as a SQLite
 * `file:` URL. AD-013 plans a move to PostgreSQL that changes only this value,
 * and a check pinned to `file:` would have to be edited on that day.
 */
const databaseUrlSchema = z
  .string({
    // Zod's default type message for an absent variable reads "expected
    // string, received undefined", which describes the parse rather than the
    // operator's problem. Anything other than absence falls through to the
    // built-in message.
    error: (issue) =>
      issue.input === undefined
        ? "is required and has no default - set it in .env or in the container environment"
        : undefined,
  })
  .min(1, "must not be empty")
  .regex(
    /^[a-z][a-z0-9+.-]*:/i,
    'must be a connection URL carrying a scheme, such as "file:/data/app.db"',
  );

/**
 * pino log level (AD-012). Defaults to "info", as
 * `policy_coding_guidelines.md` -> Error handling and logging requires.
 */
const logLevelSchema = z
  .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
  .default("info");

const configSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  DATABASE_URL: databaseUrlSchema,
  LOG_LEVEL: logLevelSchema,
});

export type Config = Readonly<z.infer<typeof configSchema>>;

/**
 * Turns a failed parse into one message naming every offending variable.
 *
 * Only variable names and validation messages are included, never the values:
 * DATABASE_URL can carry a credential and this message reaches stdout
 * (`policy_security.md` -> Secrets).
 */
function formatIssues(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const name = issue.path.join(".");
    return `  - ${name === "" ? "(root)" : name}: ${issue.message}`;
  });
  return [
    "Invalid environment configuration. Fix the variables below and start again;",
    "`.env.example` lists every variable the application reads.",
    ...lines,
  ].join("\n");
}

/**
 * Reads, validates and freezes the environment. Called once, below.
 *
 * The variables are read by name rather than by handing the whole
 * `process.env` over, so the bundler's static replacement of
 * `process.env.SOMETHING` keeps working.
 *
 * @throws Error when a variable is missing or malformed - startup fails here,
 * by design, rather than surfacing as an unrelated failure later.
 */
function loadConfig(): Config {
  const parsed = configSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
  });

  if (!parsed.success) {
    throw new Error(formatIssues(parsed.error));
  }

  return Object.freeze(parsed.data);
}

/** The validated environment. Parsed once, at module load. */
export const config: Config = loadConfig();
