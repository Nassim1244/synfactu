// Integration tests for `src/features/tags/repository.ts`, against a real
// SQLite file migrated from `prisma/migrations/`
// (`ai-rules/policy_testing.md` -> Database testing). Prisma itself is
// never mocked - this is the actual query, run for real, including the
// unique constraint on `path` and the `renameTag` transaction.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createTestDatabase,
  type TestDatabase,
} from "../../support/testDatabase";
import type { PrismaClient } from "@/generated/prisma/client";

let testDb: TestDatabase;
let repository: typeof import("@/features/tags/repository");
let prisma: PrismaClient;

beforeAll(async () => {
  testDb = createTestDatabase();
  process.env.DATABASE_URL = testDb.databaseUrl;

  repository = await import("@/features/tags/repository");
  ({ prisma } = await import("@/lib/db"));
});

afterAll(() => {
  testDb.cleanup();
});

beforeEach(async () => {
  await prisma.tag.deleteMany();
});

describe("createTag", () => {
  it("creates a top-level tag whose path equals the label, active by default", async () => {
    const tag = await repository.createTag({
      label: "commercial",
      parentId: null,
    });

    expect(tag.label).toBe("commercial");
    expect(tag.path).toBe("commercial");
    expect(tag.parentId).toBeNull();
    expect(tag.active).toBe(true);
  });

  it("composes a child tag's path from its active parent's path", async () => {
    const parent = await repository.createTag({
      label: "commercial",
      parentId: null,
    });

    const child = await repository.createTag({
      label: "RDV1",
      parentId: parent.id,
    });

    expect(child.path).toBe("commercial::RDV1");
    expect(child.parentId).toBe(parent.id);
  });

  it("composes a third-level path from a two-segment parent path", async () => {
    const parent = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    const child = await repository.createTag({
      label: "RDV1",
      parentId: parent.id,
    });

    const grandchild = await repository.createTag({
      label: "Sub",
      parentId: child.id,
    });

    expect(grandchild.path).toBe("commercial::RDV1::Sub");
  });

  it("throws InvalidTagParentError when parentId does not reference any tag", async () => {
    await expect(
      repository.createTag({ label: "RDV1", parentId: 999_999 }),
    ).rejects.toBeInstanceOf(repository.InvalidTagParentError);
  });

  it("throws InvalidTagParentError when parentId references a deactivated tag", async () => {
    const parent = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    await repository.setTagActive(parent.id, false);

    await expect(
      repository.createTag({ label: "RDV1", parentId: parent.id }),
    ).rejects.toBeInstanceOf(repository.InvalidTagParentError);
  });

  it("throws DuplicateTagPathError for a top-level label that duplicates an existing tag's path", async () => {
    await repository.createTag({ label: "commercial", parentId: null });

    await expect(
      repository.createTag({ label: "commercial", parentId: null }),
    ).rejects.toBeInstanceOf(repository.DuplicateTagPathError);
  });

  it("throws DuplicateTagPathError for a child label that duplicates an existing sibling's path under the same parent", async () => {
    const parent = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    await repository.createTag({ label: "RDV1", parentId: parent.id });

    await expect(
      repository.createTag({ label: "RDV1", parentId: parent.id }),
    ).rejects.toBeInstanceOf(repository.DuplicateTagPathError);
  });

  it("allows the same label under two different parents - the path, not the label, is unique", async () => {
    const parentA = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    const parentB = await repository.createTag({
      label: "support",
      parentId: null,
    });

    await repository.createTag({ label: "RDV1", parentId: parentA.id });
    const secondRdv1 = await repository.createTag({
      label: "RDV1",
      parentId: parentB.id,
    });

    expect(secondRdv1.path).toBe("support::RDV1");
  });
});

describe("listTags", () => {
  it("returns every tag, ordered by path", async () => {
    const commercial = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    await repository.createTag({ label: "RDV1", parentId: commercial.id });
    await repository.createTag({ label: "alpha", parentId: null });

    const tags = await repository.listTags();

    expect(tags.map((tag) => tag.path)).toEqual([
      "alpha",
      "commercial",
      "commercial::RDV1",
    ]);
  });

  it("returns an empty list when no tag exists", async () => {
    expect(await repository.listTags()).toEqual([]);
  });

  it("returns both active and inactive tags", async () => {
    const tag = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    await repository.setTagActive(tag.id, false);

    const tags = await repository.listTags();

    expect(tags).toHaveLength(1);
    expect(tags[0]?.active).toBe(false);
  });

  it("returns every record with no artificial cap - no pagination in this feature", async () => {
    for (let index = 0; index < 50; index += 1) {
      await repository.createTag({
        label: `Tag ${String(index).padStart(3, "0")}`,
        parentId: null,
      });
    }

    const tags = await repository.listTags();

    expect(tags).toHaveLength(50);
  });
});

describe("listActiveTagsForParentPicker", () => {
  it("offers only active tags, ordered by path", async () => {
    const active = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    const toDeactivate = await repository.createTag({
      label: "alpha",
      parentId: null,
    });
    await repository.setTagActive(toDeactivate.id, false);

    const options = await repository.listActiveTagsForParentPicker();

    expect(options).toHaveLength(1);
    expect(options[0]?.id).toBe(active.id);
  });

  it("returns an empty list when every tag is inactive", async () => {
    const tag = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    await repository.setTagActive(tag.id, false);

    expect(await repository.listActiveTagsForParentPicker()).toEqual([]);
  });
});

describe("renameTag", () => {
  it("updates the tag's own label and path", async () => {
    const tag = await repository.createTag({
      label: "commercial",
      parentId: null,
    });

    const renamed = await repository.renameTag(tag.id, "sales");

    expect(renamed.label).toBe("sales");
    expect(renamed.path).toBe("sales");
  });

  it("cascades the new path prefix to every descendant, matching the functional spec's own example (commercial -> sales)", async () => {
    const commercial = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    const rdv1 = await repository.createTag({
      label: "RDV1",
      parentId: commercial.id,
    });
    await repository.createTag({ label: "Sub", parentId: rdv1.id });

    await repository.renameTag(commercial.id, "sales");

    const tags = await repository.listTags();
    expect(tags.map((tag) => tag.path).sort()).toEqual(
      ["sales", "sales::RDV1", "sales::RDV1::Sub"].sort(),
    );
  });

  it("leaves the parent/child relationships (parentId) unchanged after a rename", async () => {
    const commercial = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    const rdv1 = await repository.createTag({
      label: "RDV1",
      parentId: commercial.id,
    });

    await repository.renameTag(commercial.id, "sales");

    const tags = await repository.listTags();
    const found = tags.find((tag) => tag.id === rdv1.id);
    expect(found?.parentId).toBe(commercial.id);
  });

  it("does not affect a sibling tag with an unrelated path", async () => {
    const commercial = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    await repository.createTag({ label: "RDV1", parentId: commercial.id });
    const unrelated = await repository.createTag({
      label: "support",
      parentId: null,
    });

    await repository.renameTag(commercial.id, "sales");

    const tags = await repository.listTags();
    const found = tags.find((tag) => tag.id === unrelated.id);
    expect(found?.path).toBe("support");
  });

  it("throws TagNotFoundError for an id that does not exist", async () => {
    await expect(repository.renameTag(999_999, "sales")).rejects.toBeInstanceOf(
      repository.TagNotFoundError,
    );
  });

  it("throws DuplicateTagPathError when the new label collides with an existing sibling's path", async () => {
    const commercial = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    await repository.createTag({ label: "sales", parentId: null });

    await expect(
      repository.renameTag(commercial.id, "sales"),
    ).rejects.toBeInstanceOf(repository.DuplicateTagPathError);
  });

  it("leaves every row untouched when the rename fails on a path collision - the transaction rolls back", async () => {
    const commercial = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    const rdv1 = await repository.createTag({
      label: "RDV1",
      parentId: commercial.id,
    });
    await repository.createTag({ label: "sales", parentId: null });

    await expect(
      repository.renameTag(commercial.id, "sales"),
    ).rejects.toBeInstanceOf(repository.DuplicateTagPathError);

    const tags = await repository.listTags();
    const stillCommercial = tags.find((tag) => tag.id === commercial.id);
    const stillChild = tags.find((tag) => tag.id === rdv1.id);
    expect(stillCommercial?.path).toBe("commercial");
    expect(stillChild?.path).toBe("commercial::RDV1");
  });
});

describe("setTagActive", () => {
  it("deactivates a tag while keeping it in the list", async () => {
    const tag = await repository.createTag({
      label: "commercial",
      parentId: null,
    });

    const deactivated = await repository.setTagActive(tag.id, false);

    expect(deactivated.active).toBe(false);
    const tags = await repository.listTags();
    expect(tags).toHaveLength(1);
  });

  it("reactivates a previously deactivated tag", async () => {
    const tag = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    await repository.setTagActive(tag.id, false);

    const reactivated = await repository.setTagActive(tag.id, true);

    expect(reactivated.active).toBe(true);
  });

  it("never touches a child's own active status when its parent is deactivated - each tag's flag is independent", async () => {
    const parent = await repository.createTag({
      label: "commercial",
      parentId: null,
    });
    const child = await repository.createTag({
      label: "RDV1",
      parentId: parent.id,
    });

    await repository.setTagActive(parent.id, false);

    const tags = await repository.listTags();
    const foundChild = tags.find((tag) => tag.id === child.id);
    expect(foundChild?.active).toBe(true);
  });
});
