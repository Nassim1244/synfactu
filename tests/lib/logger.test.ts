// Tests for `src/lib/logger.ts` (specs/init.md step 5, AD-012, AD-014).
//
// What is faked and why: pino itself is real, and every assertion below is
// made on what the real pino produced from the options this module builds.
// Only the DESTINATION is replaced - the logger is constructed against an
// in-memory sink instead of file descriptor 1, because a test cannot read
// back what pino wrote to the process's own stdout. That is a boundary
// substitution (`policy_testing.md` -> Relevance), not a substitution of the
// unit under test: delete the redaction list from the module and every
// redaction case here fails.
//
// The pretty transport is the one thing that cannot be exercised through a
// sink: pino refuses `transport` and a destination stream together, and the
// transport runs in a worker thread that writes to stdout on its own. The
// options pino was constructed with are therefore recorded, and the transport
// assertions read them.
//
// Like `src/lib/config.ts`, this module reads the environment at module load,
// so each case resets the registry and imports it again.

import type { Logger } from "pino";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  /** Every line the logger wrote, in order. */
  lines: [] as string[],
  /** The options `src/lib/logger.ts` passed to pino on its last construction. */
  options: undefined as Record<string, unknown> | undefined,
}));

/**
 * The real pino factory, loosely typed: the published types describe the
 * CommonJS export, while Vite's interop hands the factory back as `default`
 * on a namespace object, so the two are reconciled at runtime below.
 */
type PinoFactory = (
  options: Record<string, unknown>,
  destination: { write: (line: string) => void },
) => Logger;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPinoFactory(value: unknown): value is PinoFactory {
  return typeof value === "function";
}

vi.mock("pino", async (importOriginal) => {
  const actual: unknown = await importOriginal();
  const exported = isRecord(actual) ? actual.default : actual;
  if (!isPinoFactory(exported)) {
    throw new Error("expected the pino module to export a factory function");
  }
  const real = exported;

  function recordingFactory(options: unknown): Logger {
    const recorded: Record<string, unknown> = isRecord(options)
      ? { ...options }
      : {};
    harness.options = recorded;

    // The transport is recorded rather than honoured: pino rejects a
    // transport and a destination together, and the worker it would spawn
    // writes to stdout on its own. What the module asked for is asserted
    // from `harness.options` instead.
    const withoutTransport: Record<string, unknown> = { ...recorded };
    delete withoutTransport.transport;

    return real(withoutTransport, {
      write: (line: string) => {
        harness.lines.push(line);
      },
    });
  }

  // Carries pino's own properties onto the stand-in: the module under test
  // reads `pino.stdTimeFunctions.isoTime` while building its options.
  const mocked = Object.assign(recordingFactory, real);

  return { ...(isRecord(actual) ? actual : {}), default: mocked, pino: mocked };
});

const env: Record<string, string | undefined> = process.env;
const ORIGINAL_ENV: Record<string, string | undefined> = { ...process.env };

/**
 * Loads a fresh logger against the given environment. DATABASE_URL is always
 * supplied because the logger imports the config module, which requires it.
 */
async function loadLogger(overrides: Record<string, string | undefined> = {}) {
  for (const key of ["NODE_ENV", "DATABASE_URL", "LOG_LEVEL"]) {
    delete env[key];
  }
  env.DATABASE_URL = "file:/tmp/logger-test.db";
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  harness.lines = [];
  harness.options = undefined;
  vi.resetModules();

  const loaded = await import("@/lib/logger");
  return loaded.logger;
}

/** The last line written, parsed. Fails the test when nothing was written. */
function lastLine(): Record<string, unknown> {
  const line = harness.lines.at(-1);
  if (line === undefined) {
    throw new Error("expected a log line to have been written, but none was");
  }
  const parsed: unknown = JSON.parse(line);
  if (!isRecord(parsed)) {
    throw new Error(`expected a JSON object, got ${line}`);
  }
  return parsed;
}

/** The options pino was constructed with. Fails the test when it never was. */
function constructionOptions(): Record<string, unknown> {
  const options = harness.options;
  if (options === undefined) {
    throw new Error("expected the logger to have been constructed");
  }
  return options;
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  for (const key of Object.keys(env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete env[key];
    }
  }
  Object.assign(env, ORIGINAL_ENV);
  vi.resetModules();
});

describe("logger", () => {
  describe("redaction", () => {
    it.each([
      "password",
      "token",
      "secret",
      "authorization",
      "cookie",
      "Authorization",
      "Cookie",
      "DATABASE_URL",
      "accessToken",
      "refreshToken",
      "passwordHash",
      "apiKey",
    ])("censors %s at the top level", async (key) => {
      const logger = await loadLogger();

      logger.info({ [key]: "the-actual-value" }, "an event");

      expect(lastLine()).toMatchObject({ [key]: "[REDACTED]" });
      expect(harness.lines.join("")).not.toContain("the-actual-value");
    });

    it("censors a key nested one level down", async () => {
      const logger = await loadLogger();

      logger.info({ user: { id: 7, password: "the-actual-value" } }, "sign in");

      expect(lastLine()).toMatchObject({
        user: { id: 7, password: "[REDACTED]" },
      });
      expect(harness.lines.join("")).not.toContain("the-actual-value");
    });

    it("censors a key nested two levels down", async () => {
      const logger = await loadLogger();

      logger.info({
        req: { headers: { authorization: "Bearer the-actual-value" } },
      });

      expect(lastLine()).toMatchObject({
        req: { headers: { authorization: "[REDACTED]" } },
      });
      expect(harness.lines.join("")).not.toContain("the-actual-value");
    });

    it("censors a hyphenated key, which needs the bracket form of the path", async () => {
      const logger = await loadLogger();

      logger.info({ res: { "set-cookie": "session=the-actual-value" } });

      expect(lastLine()).toMatchObject({
        res: { "set-cookie": "[REDACTED]" },
      });
    });

    it("leaves non-secret fields untouched", async () => {
      const logger = await loadLogger();

      logger.info(
        {
          module: "invoices/repository",
          invoiceRef: "F-2026-001",
          amountCents: 123456,
          client: { id: 4, name: "Acme" },
        },
        "invoice issued",
      );

      expect(lastLine()).toMatchObject({
        module: "invoices/repository",
        invoiceRef: "F-2026-001",
        amountCents: 123456,
        client: { id: 4, name: "Acme" },
        msg: "invoice issued",
      });
    });

    describe("known limitations, pinned so a change to them is deliberate", () => {
      it("does NOT censor below the third level", async () => {
        // REDACTION_DEPTHS stops at "*.*.": fast-redact resolves a wildcard to
        // exactly one level, so the depths are written out and the list ends
        // where the shapes the application produces end.
        const logger = await loadLogger();

        logger.info({ a: { b: { c: { password: "four-levels-down" } } } });

        expect(lastLine()).toMatchObject({
          a: { b: { c: { password: "four-levels-down" } } },
        });
      });

      it("does NOT censor a key whose case differs from the list", async () => {
        // Matching is by exact key and case-sensitive. The header spellings
        // that do occur are listed explicitly; anything else is logged in
        // full.
        const logger = await loadLogger();

        logger.info({ Password: "capitalised", TOKEN: "shouted" });

        expect(lastLine()).toMatchObject({
          Password: "capitalised",
          TOKEN: "shouted",
        });
      });
    });
  });

  describe("level", () => {
    it("writes nothing for an info call when LOG_LEVEL is error", async () => {
      const logger = await loadLogger({ LOG_LEVEL: "error" });

      logger.info("this must not be written");

      expect(harness.lines).toEqual([]);
    });

    it("writes an error call when LOG_LEVEL is error", async () => {
      const logger = await loadLogger({ LOG_LEVEL: "error" });

      logger.error("this must be written");

      expect(lastLine()).toMatchObject({
        level: "error",
        msg: "this must be written",
      });
    });

    it("writes nothing at all when LOG_LEVEL is silent", async () => {
      const logger = await loadLogger({ LOG_LEVEL: "silent" });

      logger.error("even this must not be written");

      expect(harness.lines).toEqual([]);
    });

    it("defaults to info, so a debug call is dropped and an info call is kept", async () => {
      const logger = await loadLogger({ LOG_LEVEL: undefined });

      logger.debug("dropped");
      logger.info("kept");

      expect(harness.lines).toHaveLength(1);
      expect(lastLine()).toMatchObject({ level: "info", msg: "kept" });
    });

    it("honours a level more verbose than the default", async () => {
      const logger = await loadLogger({ LOG_LEVEL: "trace" });

      logger.trace("kept");

      expect(lastLine()).toMatchObject({ level: "trace", msg: "kept" });
    });
  });

  describe("transport", () => {
    it("uses the pretty transport in development", async () => {
      await loadLogger({ NODE_ENV: "development" });

      expect(constructionOptions().transport).toMatchObject({
        target: "pino-pretty",
      });
    });

    it.each(["production", "test"])(
      "uses no transport, so output stays JSON, when NODE_ENV is %s",
      async (nodeEnv) => {
        const logger = await loadLogger({ NODE_ENV: nodeEnv });

        logger.info("an event");

        expect(constructionOptions().transport).toBeUndefined();
        expect(lastLine()).toMatchObject({ msg: "an event" });
      },
    );

    it("uses no transport when NODE_ENV is unset", async () => {
      // config defaults an unset NODE_ENV to "production": an absent variable
      // must never switch development behaviour on.
      await loadLogger({ NODE_ENV: undefined });

      expect(constructionOptions().transport).toBeUndefined();
    });
  });

  describe("line shape", () => {
    it("writes the level as a label rather than as a number", async () => {
      const logger = await loadLogger();

      logger.warn("an event");

      const line = lastLine();
      expect(line.level).toBe("warn");
      expect(line.level).not.toBe(40);
    });

    it("writes the timestamp as an ISO-8601 instant in UTC", async () => {
      const logger = await loadLogger();

      logger.info("an event");

      expect(lastLine().time).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it("writes one self-contained JSON object per event", async () => {
      const logger = await loadLogger();

      logger.info("first");
      logger.info("second");

      expect(harness.lines).toHaveLength(2);
      expect(harness.lines.map((line) => line.trimEnd().split("\n"))).toEqual([
        [expect.stringContaining("first")],
        [expect.stringContaining("second")],
      ]);
    });
  });

  describe("child loggers", () => {
    it("carries the module name onto every line and still redacts", async () => {
      const logger = await loadLogger();

      const child = logger.child({ module: "invoices/repository" });
      child.info({ token: "the-actual-value" }, "an event");

      expect(lastLine()).toMatchObject({
        module: "invoices/repository",
        token: "[REDACTED]",
        msg: "an event",
      });
    });
  });
});
