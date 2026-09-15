// Structured logging.
//
// The pino root logger (AD-012): JSON lines to stdout, one line per event, no
// log files on disk. The container runtime is what captures and rotates the
// stream, so nothing here opens a file.
//
// The rules this module implements live in `ai-rules/policy_coding_guidelines.md`
// -> Error handling and logging. Call sites take a child logger rather than
// this one:
//
//     const log = logger.child({ module: "invoices/repository" });
//
// This module is server-only: it reads `src/lib/config.ts`, which reads
// `process.env`. Importing it from a Client Component would fail the config
// parse in the browser. Server Components, Server Actions, Route Handlers and
// `src/lib/` only.

import pino from "pino";

import { config } from "@/lib/config";

/**
 * Field names whose value must never reach a log line
 * (`policy_coding_guidelines.md` -> Error handling and logging, AD-014).
 *
 * The list is deliberately wider than the five names `specs/init.md` step 5
 * requires: redaction is free at write time and a name that is not listed is
 * silently logged in full, so the cost of the two mistakes is not symmetric.
 *
 * Matching is by exact key and is case-sensitive, which is why the header
 * names appear in both the lower-case form Node's HTTP stack produces and the
 * capitalised form a hand-built object tends to carry.
 */
const REDACTED_KEYS = [
  // specs/init.md step 5, the required five.
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  // Capitalised header spellings. fast-redact matches keys literally.
  "Authorization",
  "Cookie",
  // Common compound spellings of the same five.
  "newPassword",
  "oldPassword",
  "currentPassword",
  "passwordHash",
  "accessToken",
  "refreshToken",
  "sessionToken",
  "csrfToken",
  "apiKey",
  "clientSecret",
  "cookies",
  "set-cookie",
  "Set-Cookie",
  // Configuration values that are credentials in their own right. DATABASE_URL
  // can embed a password once AD-013 moves the project to PostgreSQL.
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
] as const;

/**
 * Depth prefixes applied to every redacted key.
 *
 * fast-redact, which pino uses, resolves a wildcard to exactly one level, so
 * "arbitrary depth" has to be written out. Three levels covers the shapes that
 * actually occur - `{ password }`, `{ user: { password } }`,
 * `{ req: { headers: { authorization } } }` - and each extra level costs a
 * matcher on every log call, so the list stops where the shapes do.
 */
const REDACTION_DEPTHS = ["", "*.", "*.*."] as const;

/**
 * Renders one key at one depth as a fast-redact path.
 *
 * Keys that are not plain identifiers - `set-cookie` - must use the bracket
 * form, and the bracket follows the wildcard directly with no dot:
 * `*["set-cookie"]`, not `*.["set-cookie"]`.
 */
function redactionPath(depth: string, key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
    return `${depth}${key}`;
  }
  // Drop the trailing dot of the depth prefix: a bracket accessor is not
  // preceded by one.
  return `${depth.slice(0, -1)}["${key}"]`;
}

const REDACTED_PATHS: string[] = REDACTION_DEPTHS.flatMap((depth) =>
  REDACTED_KEYS.map((key) => redactionPath(depth, key)),
);

/**
 * The pretty transport, in development only.
 *
 * `config.NODE_ENV` defaults to "production" when unset, deliberately: an
 * unset NODE_ENV must never switch on development behaviour. So this reads as
 * an explicit opt-in to "development" and must not be inverted into a
 * `!== "production"` check.
 *
 * `pino-pretty` is a devDependency for that reason - production never resolves
 * it. It is also why the target is named as a string rather than imported: the
 * module is loaded by pino's worker thread at logger construction, not by the
 * bundler, so a missing package costs nothing until the branch is taken. Next
 * lists both `pino` and `pino-pretty` in its default server-externals set, so
 * no `serverExternalPackages` entry is needed for the worker to resolve them.
 */
const transport =
  config.NODE_ENV === "development"
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined;

/**
 * The application's root logger. Import it, then take a child logger naming
 * the module; do not log through this instance directly.
 */
export const logger = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: REDACTED_PATHS,
    censor: "[REDACTED]",
  },
  // pino writes the numeric level by default. The operator of a self-hosted
  // instance is not the developer (AD-012) and should not need a table to read
  // `"level":30`, so the label is written instead.
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Likewise: epoch milliseconds are cheaper to write but unreadable in a
  // `docker logs` tail. ISO-8601 in UTC matches AD-008.
  timestamp: pino.stdTimeFunctions.isoTime,
  transport,
});
