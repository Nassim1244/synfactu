// Tests for `src/features/tags/schema.ts` (v01-004 technical spec ->
// Validation: label non-empty after trimming; parentId, when given, a
// positive integer). Every rejection the schema performs gets its own test
// (`ai-rules/policy_testing.md` -> What to test where).

import { describe, expect, it } from "vitest";

import { renameTagLabelSchema, tagSchema } from "@/features/tags/schema";

describe("tagSchema - label", () => {
  it("rejects an empty label with 'Label is required.'", () => {
    const result = tagSchema.safeParse({ label: "" });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.find((issue) => issue.path[0] === "label")?.message,
    ).toBe("Label is required.");
  });

  it("rejects a whitespace-only label", () => {
    expect(tagSchema.safeParse({ label: "   " }).success).toBe(false);
  });

  it("trims the label", () => {
    const result = tagSchema.safeParse({ label: "  commercial  " });

    expect(result.success).toBe(true);
    expect(result.data?.label).toBe("commercial");
  });
});

describe("tagSchema - parentId", () => {
  it("accepts an absent parentId (a top-level tag)", () => {
    const result = tagSchema.safeParse({ label: "commercial" });

    expect(result.success).toBe(true);
    expect(result.data?.parentId).toBeUndefined();
  });

  it("accepts a positive integer parentId", () => {
    expect(tagSchema.safeParse({ label: "RDV1", parentId: 3 }).success).toBe(
      true,
    );
  });

  it.each([0, -1, 1.5])(
    "rejects the non-positive-integer parentId %p",
    (parentId) => {
      expect(tagSchema.safeParse({ label: "RDV1", parentId }).success).toBe(
        false,
      );
    },
  );

  it("rejects a string parentId", () => {
    expect(tagSchema.safeParse({ label: "RDV1", parentId: "3" }).success).toBe(
      false,
    );
  });
});

describe("renameTagLabelSchema", () => {
  it("accepts a non-empty label", () => {
    expect(renameTagLabelSchema.safeParse({ label: "sales" }).success).toBe(
      true,
    );
  });

  it("rejects an empty label with 'Label is required.'", () => {
    const result = renameTagLabelSchema.safeParse({ label: "" });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.find((issue) => issue.path[0] === "label")?.message,
    ).toBe("Label is required.");
  });

  it("carries no parentId field even if one is supplied", () => {
    const result = renameTagLabelSchema.safeParse({
      label: "sales",
      parentId: 5,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ label: "sales" });
  });
});
