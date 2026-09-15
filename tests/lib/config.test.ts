// Tests for `src/lib/config.ts` (specs/init.md step 4).
//
// The module parses `process.env` at MODULE LOAD and throws there when a
// variable is missing or malformed, so every case has to reset the module
// registry and import it again. A static top-level import would cache the
// first successful parse and every case below would then assert against that
// one frozen result while appearing to pass.
//
// The environment this suite runs in already carries DATABASE_URL (the dev
// container sets it) and NODE_ENV=test (Vitest sets it). Each case therefore
// states the whole environment it wants rather than only the variable it is
// interested in - otherwise a "missing variable" case would pass because of
// an inherited value rather than because of the code under test.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A widened alias over `process.env`. Writing through it mutates the real
 * environment, which is what the module under test reads, without needing a
 * cast to satisfy the narrowed `NODE_ENV` type Next.js declares.
 */
const env: Record<string, string | undefined> = process.env;

/** The environment as the runner handed it over, restored after every case. */
const ORIGINAL_ENV: Record<string, string | undefined> = { ...process.env };

/** A complete, valid environment. Cases override or delete single keys. */
const VALID_ENV: Record<string, string> = {
  NODE_ENV: "test",
  DATABASE_URL: "file:/tmp/config-test.db",
  LOG_LEVEL: "info",
};

/**
 * Replaces the whole environment with `vars`, keeping only the entries the
 * runtime itself needs (PATH and friends are irrelevant to the parse, so the
 * simplest correct thing is to start from the original and delete the three
 * variables the module reads).
 */
function setEnv(vars: Record<string, string | undefined>): void {
  for (const key of ["NODE_ENV", "DATABASE_URL", "LOG_LEVEL"]) {
    delete env[key];
  }
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
}

/** Loads a fresh copy of the module, so the parse runs against `process.env` as it stands now. */
async function loadConfig() {
  const loaded = await import("@/lib/config");
  return loaded.config;
}

/** The error thrown by a fresh load, as a string. Fails the test if the load succeeded. */
async function loadError(): Promise<string> {
  try {
    await loadConfig();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected the configuration module to throw, but it loaded");
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

describe("config", () => {
  describe("a valid environment", () => {
    it("exposes every declared variable", async () => {
      setEnv({
        NODE_ENV: "production",
        DATABASE_URL: "file:/data/app.db",
        LOG_LEVEL: "warn",
      });

      const config = await loadConfig();

      expect(config).toEqual({
        NODE_ENV: "production",
        DATABASE_URL: "file:/data/app.db",
        LOG_LEVEL: "warn",
      });
    });

    it.each(["development", "test", "production"])(
      "accepts NODE_ENV=%s",
      async (nodeEnv) => {
        setEnv({ ...VALID_ENV, NODE_ENV: nodeEnv });

        const config = await loadConfig();

        expect(config.NODE_ENV).toBe(nodeEnv);
      },
    );

    it.each(["trace", "debug", "info", "warn", "error", "fatal", "silent"])(
      "accepts LOG_LEVEL=%s",
      async (level) => {
        setEnv({ ...VALID_ENV, LOG_LEVEL: level });

        const config = await loadConfig();

        expect(config.LOG_LEVEL).toBe(level);
      },
    );

    it.each([
      "file:/data/app.db",
      "file:./dev.db",
      "postgresql://user@host:5432/app",
    ])("accepts DATABASE_URL=%s", async (url) => {
      setEnv({ ...VALID_ENV, DATABASE_URL: url });

      const config = await loadConfig();

      expect(config.DATABASE_URL).toBe(url);
    });
  });

  describe("a missing variable", () => {
    it("fails the load when DATABASE_URL is absent, naming the variable", async () => {
      setEnv({ NODE_ENV: "test", LOG_LEVEL: "info" });

      const message = await loadError();

      expect(message).toContain("DATABASE_URL");
      expect(message).toContain("is required");
    });

    it("falls back to production when NODE_ENV is absent", async () => {
      // The deliberate fail-safe: an unset NODE_ENV must never switch on
      // development behaviour, so the default is the strict end of the range.
      setEnv({ DATABASE_URL: "file:/data/app.db", LOG_LEVEL: "info" });

      const config = await loadConfig();

      expect(config.NODE_ENV).toBe("production");
    });

    it("falls back to info when LOG_LEVEL is absent", async () => {
      setEnv({ NODE_ENV: "test", DATABASE_URL: "file:/data/app.db" });

      const config = await loadConfig();

      expect(config.LOG_LEVEL).toBe("info");
    });
  });

  describe("a malformed variable", () => {
    it("rejects an empty DATABASE_URL", async () => {
      setEnv({ ...VALID_ENV, DATABASE_URL: "" });

      const message = await loadError();

      expect(message).toContain("DATABASE_URL");
      expect(message).toContain("must not be empty");
    });

    it.each([
      "not-a-url",
      "/data/app.db",
      "://data/app.db",
      " file:/data/app.db",
    ])("rejects DATABASE_URL=%j for carrying no scheme", async (url) => {
      setEnv({ ...VALID_ENV, DATABASE_URL: url });

      const message = await loadError();

      expect(message).toContain("DATABASE_URL");
      expect(message).toContain("scheme");
    });

    it("rejects an unknown NODE_ENV", async () => {
      setEnv({ ...VALID_ENV, NODE_ENV: "staging" });

      const message = await loadError();

      expect(message).toContain("NODE_ENV");
    });

    it("rejects an unknown LOG_LEVEL", async () => {
      setEnv({ ...VALID_ENV, LOG_LEVEL: "verbose" });

      const message = await loadError();

      expect(message).toContain("LOG_LEVEL");
    });

    it("reports every offending variable in one error", async () => {
      // An operator fixing one variable at a time, restarting between each,
      // is the failure mode this avoids.
      setEnv({ NODE_ENV: "staging", LOG_LEVEL: "verbose" });

      const message = await loadError();

      expect(message).toContain("NODE_ENV");
      expect(message).toContain("DATABASE_URL");
      expect(message).toContain("LOG_LEVEL");
    });
  });

  describe("the error message", () => {
    it("never echoes the value of DATABASE_URL", async () => {
      // DATABASE_URL carries a credential once AD-013 moves the project to
      // PostgreSQL, and this message reaches stdout
      // (`policy_security.md` -> Secrets).
      // A protocol-relative URL: the scheme was forgotten, which is exactly
      // the mistake that produces a rejected value still carrying a password.
      const credential = "s3cr3t-p4ssw0rd";
      const malformed = `//operator:${credential}@db.internal/app`;
      setEnv({ ...VALID_ENV, DATABASE_URL: malformed });

      const message = await loadError();

      expect(message).toContain("DATABASE_URL");
      expect(message).not.toContain(credential);
      expect(message).not.toContain(malformed);
      expect(message).not.toContain("operator");
    });

    it("never echoes the value of LOG_LEVEL", async () => {
      const badValue = "hunter2-level";
      setEnv({ ...VALID_ENV, LOG_LEVEL: badValue });

      const message = await loadError();

      expect(message).toContain("LOG_LEVEL");
      expect(message).not.toContain(badValue);
    });
  });

  describe("the exported object", () => {
    it("is frozen, so a later write cannot change what was validated", async () => {
      setEnv(VALID_ENV);
      const config = await loadConfig();

      const written = Reflect.set(config, "LOG_LEVEL", "trace");

      expect(written).toBe(false);
      expect(config.LOG_LEVEL).toBe("info");
      expect(Object.isFrozen(config)).toBe(true);
    });

    it("does not gain a variable that was never declared", async () => {
      setEnv(VALID_ENV);
      const config = await loadConfig();

      const written = Reflect.set(config, "BETTER_AUTH_SECRET", "injected");

      expect(written).toBe(false);
      expect(Object.keys(config)).toEqual([
        "NODE_ENV",
        "DATABASE_URL",
        "LOG_LEVEL",
      ]);
    });
  });
});
