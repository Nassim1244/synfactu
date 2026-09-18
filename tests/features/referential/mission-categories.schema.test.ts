// Tests for `src/features/referential/mission-categories.schema.ts`
// (v01-004 technical spec -> Validation: "label non-empty after trimming").
// Every rejection the schema performs gets its own test
// (`ai-rules/policy_testing.md` -> What to test where).

import { describe, expect, it } from "vitest";

import { missionCategorySchema } from "@/features/referential/mission-categories.schema";

describe("missionCategorySchema - label", () => {
  it("rejects an empty label with 'Label is required.'", () => {
    const result = missionCategorySchema.safeParse({ label: "" });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.find((issue) => issue.path[0] === "label")?.message,
    ).toBe("Label is required.");
  });

  it("rejects a whitespace-only label", () => {
    expect(missionCategorySchema.safeParse({ label: "   " }).success).toBe(
      false,
    );
  });

  it("rejects a missing label", () => {
    expect(missionCategorySchema.safeParse({}).success).toBe(false);
  });

  it("trims the label before it reaches the repository", () => {
    const result = missionCategorySchema.safeParse({ label: "  Conseil  " });

    expect(result.success).toBe(true);
    expect(result.data?.label).toBe("Conseil");
  });

  it("accepts a non-empty label", () => {
    expect(
      missionCategorySchema.safeParse({ label: "Formation école" }).success,
    ).toBe(true);
  });
});
