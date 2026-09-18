// Integration tests for `src/features/settings/repository.ts`, against a
// real SQLite file migrated from `prisma/migrations/`
// (`ai-rules/policy_testing.md` -> Database testing). Never against
// `/data/dev.db`, and Prisma itself is never mocked - this is the actual
// query, run for real.
//
// Focus: AD-031 - `CompanyProfile` and `Setting` are never seeded, so
// "no row exists yet" is a real, exercised state here, not just a comment in
// the technical spec. Every default asserted below is copied by hand from
// the functional spec's step 7, not derived by running the code.
//
// `process.env.DATABASE_URL` is pointed at the temporary database, and the
// repository (which imports the `@/lib/db` singleton) is loaded with a
// dynamic `import()` in `beforeAll`, after that assignment - a static import
// at the top of the file would be hoisted above it and read `undefined`.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createTestDatabase,
  type TestDatabase,
} from "../../support/testDatabase";
import type { PrismaClient } from "@/generated/prisma/client";
import type { AppSettingsStorage } from "@/features/settings/domain";

let testDb: TestDatabase;
let repository: typeof import("@/features/settings/repository");
let prisma: PrismaClient;

beforeAll(async () => {
  testDb = createTestDatabase();
  process.env.DATABASE_URL = testDb.databaseUrl;

  repository = await import("@/features/settings/repository");
  ({ prisma } = await import("@/lib/db"));
});

afterAll(() => {
  testDb.cleanup();
});

beforeEach(async () => {
  await prisma.companyProfile.deleteMany();
  await prisma.setting.deleteMany();
});

/** A full, valid company profile - every field filled. */
const FULL_PROFILE = {
  legalName: "Acme Consulting",
  siret: "12345678901234",
  street: "1 Rue Exemple",
  postalCode: "75001",
  city: "Paris",
  email: "contact@acme.test",
  phone: "0600000000",
};

/** A full, valid set of the five editable settings, all different from the registry defaults. */
const EDITED_SETTINGS: AppSettingsStorage = {
  hours_per_day: 480,
  rounding_step_minutes: 10,
  invoice_number_pattern: "YYYY-NNN",
  show_mission_coefficient: true,
  micro_estimated_charge_rate: 3000,
};

const REGISTRY_DEFAULTS = {
  hours_per_day: 420,
  rounding_step_minutes: 15,
  rounding_direction: "up" as const,
  invoice_number_pattern: "YYYY-MM-NNN_Client_mission",
  show_mission_coefficient: false,
  micro_estimated_charge_rate: 2500,
};

describe("getCompanyProfile - AD-031 no seeded row, computed default", () => {
  it("returns an all-null record when no row exists yet - not an error, no invented placeholder", async () => {
    const profile = await repository.getCompanyProfile();

    expect(profile).toEqual({
      legalName: null,
      siret: null,
      street: null,
      postalCode: null,
      city: null,
      email: null,
      phone: null,
    });
  });
});

describe("upsertCompanyProfile", () => {
  it("creates the single row on first save, readable back through getCompanyProfile", async () => {
    await repository.upsertCompanyProfile(FULL_PROFILE);

    expect(await repository.getCompanyProfile()).toEqual(FULL_PROFILE);
  });

  it("persists a null phone when the optional field is left out", async () => {
    await repository.upsertCompanyProfile({ ...FULL_PROFILE, phone: null });

    expect((await repository.getCompanyProfile()).phone).toBeNull();
  });

  it("updates the existing row in place - never a second row", async () => {
    await repository.upsertCompanyProfile({
      ...FULL_PROFILE,
      legalName: "First",
    });
    await repository.upsertCompanyProfile({
      ...FULL_PROFILE,
      legalName: "Second",
    });

    const rows = await prisma.companyProfile.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.legalName).toBe("Second");
  });

  it("never scopes to any id but the fixed one - a row saved under a different id is invisible", async () => {
    await prisma.companyProfile.create({
      data: { id: 2, legalName: "Someone else's row" },
    });

    expect((await repository.getCompanyProfile()).legalName).toBeNull();
  });
});

describe("getSetting - AD-031 no seeded row, computed default", () => {
  it("returns the registry default 420 for hours_per_day when no row exists", async () => {
    expect(await repository.getSetting("hours_per_day")).toBe(420);
  });

  it("returns the registry default 15 for rounding_step_minutes when no row exists", async () => {
    expect(await repository.getSetting("rounding_step_minutes")).toBe(15);
  });

  it("returns the fixed registry default 'up' for rounding_direction when no row exists", async () => {
    expect(await repository.getSetting("rounding_direction")).toBe("up");
  });

  it("returns the registry default pattern for invoice_number_pattern when no row exists", async () => {
    expect(await repository.getSetting("invoice_number_pattern")).toBe(
      "YYYY-MM-NNN_Client_mission",
    );
  });

  it("returns the registry default false for show_mission_coefficient when no row exists", async () => {
    expect(await repository.getSetting("show_mission_coefficient")).toBe(false);
  });

  it("returns the registry default 2500 for micro_estimated_charge_rate when no row exists", async () => {
    expect(await repository.getSetting("micro_estimated_charge_rate")).toBe(
      2500,
    );
  });

  it("returns the stored value, not the default, once a row exists for that key", async () => {
    await repository.upsertSettings(EDITED_SETTINGS);

    expect(await repository.getSetting("hours_per_day")).toBe(480);
  });
});

describe("getAllSettings - AD-031 no seeded row, computed default", () => {
  it("returns every registry default when not a single row exists", async () => {
    expect(await repository.getAllSettings()).toEqual(REGISTRY_DEFAULTS);
  });

  it("mixes one stored value with every other key's default when only that key has a row", async () => {
    await prisma.setting.create({ data: { key: "hours_per_day", value: 480 } });

    const settings = await repository.getAllSettings();

    expect(settings.hours_per_day).toBe(480);
    expect(settings.rounding_step_minutes).toBe(15);
    expect(settings.rounding_direction).toBe("up");
    expect(settings.invoice_number_pattern).toBe("YYYY-MM-NNN_Client_mission");
    expect(settings.show_mission_coefficient).toBe(false);
    expect(settings.micro_estimated_charge_rate).toBe(2500);
  });
});

describe("upsertSettings", () => {
  it("persists all five editable settings in one call", async () => {
    await repository.upsertSettings(EDITED_SETTINGS);

    expect(await repository.getAllSettings()).toEqual({
      ...EDITED_SETTINGS,
      rounding_direction: "up",
    });
  });

  it("overwrites a previous save rather than accumulating a second row per key", async () => {
    await repository.upsertSettings(EDITED_SETTINGS);
    await repository.upsertSettings({ ...EDITED_SETTINGS, hours_per_day: 400 });

    const rows = await prisma.setting.findMany({
      where: { key: "hours_per_day" },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.value).toBe(400);
  });

  it("persists a false boolean, not skipping it as a falsy value", async () => {
    await repository.upsertSettings({
      ...EDITED_SETTINGS,
      show_mission_coefficient: true,
    });
    await repository.upsertSettings({
      ...EDITED_SETTINGS,
      show_mission_coefficient: false,
    });

    expect(await repository.getSetting("show_mission_coefficient")).toBe(false);
  });

  it("never creates or modifies a rounding_direction row - it is fixed, D-05, never entered by the user", async () => {
    await repository.upsertSettings(EDITED_SETTINGS);

    const row = await prisma.setting.findUnique({
      where: { key: "rounding_direction" },
    });
    expect(row).toBeNull();
    expect(await repository.getSetting("rounding_direction")).toBe("up");
  });
});
