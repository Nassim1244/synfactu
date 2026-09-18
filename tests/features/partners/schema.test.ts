// Tests for `src/features/partners/schema.ts` (v01-001 technical spec ->
// Validation). Every rejection the schema performs gets its own test
// (`ai-rules/policy_testing.md` -> What to test where).

import { describe, expect, it } from "vitest";

import {
  createPartnerSchema,
  updatePartnerSchema,
} from "@/features/partners/schema";

describe("createPartnerSchema", () => {
  it("accepts a non-empty, trimmed name", () => {
    const result = createPartnerSchema.safeParse({ name: "Acme" });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Acme");
  });

  it("trims surrounding whitespace", () => {
    const result = createPartnerSchema.safeParse({ name: "  Acme  " });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Acme");
  });

  it("rejects an empty name with 'Name is required.'", () => {
    const result = createPartnerSchema.safeParse({ name: "" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Name is required.");
  });

  it("rejects a whitespace-only name with 'Name is required.'", () => {
    const result = createPartnerSchema.safeParse({ name: "   " });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Name is required.");
  });

  it("rejects a missing name", () => {
    expect(createPartnerSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-string name", () => {
    expect(createPartnerSchema.safeParse({ name: 42 }).success).toBe(false);
  });
});

describe("updatePartnerSchema", () => {
  const valid = { id: 1, name: "Acme", active: true };

  it("accepts a full valid payload", () => {
    expect(updatePartnerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = updatePartnerSchema.safeParse({ ...valid, name: "" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Name is required.");
  });

  it.each([0, -1, 1.5])("rejects a non-positive-integer id %p", (id) => {
    expect(updatePartnerSchema.safeParse({ ...valid, id }).success).toBe(false);
  });

  it("rejects a missing active flag", () => {
    const withoutActive: Record<string, unknown> = { ...valid };
    delete withoutActive.active;

    expect(updatePartnerSchema.safeParse(withoutActive).success).toBe(false);
  });

  it("rejects a non-boolean active flag", () => {
    expect(
      updatePartnerSchema.safeParse({ ...valid, active: "true" }).success,
    ).toBe(false);
  });
});
