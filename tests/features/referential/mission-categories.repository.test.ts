// Integration tests for
// `src/features/referential/mission-categories.repository.ts`, against a
// real SQLite file migrated from `prisma/migrations/`
// (`ai-rules/policy_testing.md` -> Database testing). Prisma itself is never
// mocked - this is the actual query, run for real, including the
// migration's own bootstrap rows (AD-033).

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createTestDatabase,
  type TestDatabase,
} from "../../support/testDatabase";
import type { PrismaClient } from "@/generated/prisma/client";

let testDb: TestDatabase;
let repository: typeof import("@/features/referential/mission-categories.repository");
let prisma: PrismaClient;

beforeAll(async () => {
  testDb = createTestDatabase();
  process.env.DATABASE_URL = testDb.databaseUrl;

  repository =
    await import("@/features/referential/mission-categories.repository");
  ({ prisma } = await import("@/lib/db"));
});

afterAll(() => {
  testDb.cleanup();
});

// No `beforeEach` truncation here on purpose: this describe block runs
// first, against the database exactly as the migration itself left it, and
// nothing before it in this file has written a row - only that ordering
// lets this test observe AD-033's bootstrap rows at all
// (`ai-rules/policy_testing.md` -> Forbidden's "no test depending on
// execution order" concerns one test's dependency on another *test*'s side
// effects; this instead depends on the migration's own fixed output, which
// every other describe below deliberately clears before it ever runs).
describe("migration bootstrap (AD-033)", () => {
  it("ships exactly the three active bootstrap categories: Formation école, Formation pro, Conseil", async () => {
    const categories = await repository.listMissionCategories();

    expect(categories).toHaveLength(3);
    expect(categories.map((category) => category.label).sort()).toEqual(
      ["Conseil", "Formation pro", "Formation école"].sort(),
    );
    expect(categories.every((category) => category.active)).toBe(true);
  });
});

describe("createMissionCategory", () => {
  beforeEach(async () => {
    await prisma.missionCategory.deleteMany();
  });

  it("creates a category, active by default", async () => {
    const category = await repository.createMissionCategory({
      label: "Formation interne",
    });

    expect(category.label).toBe("Formation interne");
    expect(category.active).toBe(true);
    expect(category.id).toEqual(expect.any(Number));
  });
});

describe("listMissionCategories", () => {
  beforeEach(async () => {
    await prisma.missionCategory.deleteMany();
  });

  it("returns every category ordered by label", async () => {
    await repository.createMissionCategory({ label: "Zeta" });
    await repository.createMissionCategory({ label: "Alpha" });

    const categories = await repository.listMissionCategories();

    expect(categories.map((category) => category.label)).toEqual([
      "Alpha",
      "Zeta",
    ]);
  });

  it("returns an empty list when no category exists", async () => {
    expect(await repository.listMissionCategories()).toEqual([]);
  });

  it("returns every record with no artificial cap - no pagination in this feature", async () => {
    const labels = Array.from(
      { length: 50 },
      (_, index) => `Category ${String(index).padStart(3, "0")}`,
    );
    for (const label of labels) {
      await repository.createMissionCategory({ label });
    }

    const categories = await repository.listMissionCategories();

    expect(categories).toHaveLength(50);
  });
});

describe("updateMissionCategory", () => {
  beforeEach(async () => {
    await prisma.missionCategory.deleteMany();
  });

  it("persists the new label", async () => {
    const category = await repository.createMissionCategory({
      label: "Old label",
    });

    const updated = await repository.updateMissionCategory(category.id, {
      label: "New label",
    });

    expect(updated.label).toBe("New label");
    const [found] = await repository.listMissionCategories();
    expect(found?.label).toBe("New label");
  });
});

describe("setMissionCategoryActive", () => {
  beforeEach(async () => {
    await prisma.missionCategory.deleteMany();
  });

  it("deactivates a category while keeping it in the list", async () => {
    const category = await repository.createMissionCategory({
      label: "Conseil",
    });

    const deactivated = await repository.setMissionCategoryActive(
      category.id,
      false,
    );

    expect(deactivated.active).toBe(false);
    const categories = await repository.listMissionCategories();
    expect(categories).toHaveLength(1);
    expect(categories[0]?.active).toBe(false);
  });

  it("reactivates a previously deactivated category", async () => {
    const category = await repository.createMissionCategory({
      label: "Conseil",
    });
    await repository.setMissionCategoryActive(category.id, false);

    const reactivated = await repository.setMissionCategoryActive(
      category.id,
      true,
    );

    expect(reactivated.active).toBe(true);
  });
});
