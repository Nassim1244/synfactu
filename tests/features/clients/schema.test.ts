// Tests for `src/features/clients/schema.ts` (v01-001 technical spec ->
// Validation). Every rejection the schema performs gets its own test
// (`ai-rules/policy_testing.md` -> What to test where).

import { describe, expect, it } from "vitest";

import {
  createClientSchema,
  setClientActiveSchema,
  updateClientSchema,
} from "@/features/clients/schema";

/** The minimum valid create payload, per field overridden in each test. */
const validCreate = {
  name: "Acme",
  shortLabel: "ACME",
  defaultRate: "450",
};

describe("createClientSchema - name", () => {
  it("rejects an empty name with 'Name is required.'", () => {
    const result = createClientSchema.safeParse({
      ...validCreate,
      name: "",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.find((issue) => issue.path[0] === "name")?.message,
    ).toBe("Name is required.");
  });

  it("rejects a whitespace-only name", () => {
    expect(
      createClientSchema.safeParse({ ...validCreate, name: "   " }).success,
    ).toBe(false);
  });
});

describe("createClientSchema - shortLabel", () => {
  it("rejects an empty short label with 'Short label is required.'", () => {
    const result = createClientSchema.safeParse({
      ...validCreate,
      shortLabel: "",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.find((issue) => issue.path[0] === "shortLabel")
        ?.message,
    ).toBe("Short label is required.");
  });

  it("rejects a whitespace-only short label", () => {
    expect(
      createClientSchema.safeParse({ ...validCreate, shortLabel: "   " })
        .success,
    ).toBe(false);
  });
});

describe("createClientSchema - defaultRate", () => {
  const REQUIRED_MESSAGE = "Enter a positive number.";

  it.each(["", "abc", "0", "0.0", "0.00", "-5", "-5.50", "5.555", "5..5"])(
    "rejects %j with 'Enter a positive number.'",
    (defaultRate) => {
      const result = createClientSchema.safeParse({
        ...validCreate,
        defaultRate,
      });

      expect(result.success).toBe(false);
      expect(
        result.error?.issues.find((issue) => issue.path[0] === "defaultRate")
          ?.message,
      ).toBe(REQUIRED_MESSAGE);
    },
  );

  it.each(["1", "450", "450.5", "450.50", "0.01"])(
    "accepts the valid positive decimal string %j",
    (defaultRate) => {
      expect(
        createClientSchema.safeParse({ ...validCreate, defaultRate }).success,
      ).toBe(true);
    },
  );
});

describe("createClientSchema - billable", () => {
  it("defaults to true when absent", () => {
    const result = createClientSchema.safeParse(validCreate);

    expect(result.success).toBe(true);
    expect(result.data?.billable).toBe(true);
  });

  it("accepts an explicit false", () => {
    const result = createClientSchema.safeParse({
      ...validCreate,
      billable: false,
    });

    expect(result.success).toBe(true);
    expect(result.data?.billable).toBe(false);
  });
});

describe("createClientSchema - regime", () => {
  it.each(["MICRO", "PORTAGE"])("accepts %s", (regime) => {
    expect(
      createClientSchema.safeParse({ ...validCreate, regime }).success,
    ).toBe(true);
  });

  it("accepts null", () => {
    expect(
      createClientSchema.safeParse({ ...validCreate, regime: null }).success,
    ).toBe(true);
  });

  it("accepts an absent regime", () => {
    expect(createClientSchema.safeParse(validCreate).success).toBe(true);
  });

  it.each(["micro", "OTHER", "Micro", 1, {}])("rejects %p", (regime) => {
    expect(
      createClientSchema.safeParse({ ...validCreate, regime }).success,
    ).toBe(false);
  });
});

describe("createClientSchema - partnerId", () => {
  it("accepts a positive integer", () => {
    expect(
      createClientSchema.safeParse({ ...validCreate, partnerId: 3 }).success,
    ).toBe(true);
  });

  it("accepts null", () => {
    expect(
      createClientSchema.safeParse({ ...validCreate, partnerId: null }).success,
    ).toBe(true);
  });

  it("accepts an absent partnerId", () => {
    expect(createClientSchema.safeParse(validCreate).success).toBe(true);
  });

  it.each([0, -1, 1.5, "3"])("rejects %p", (partnerId) => {
    expect(
      createClientSchema.safeParse({ ...validCreate, partnerId }).success,
    ).toBe(false);
  });
});

describe("updateClientSchema", () => {
  const validUpdate = { ...validCreate, id: 1, active: true };

  it("accepts a full valid payload", () => {
    expect(updateClientSchema.safeParse(validUpdate).success).toBe(true);
  });

  it.each([0, -1, 1.5])("rejects a non-positive-integer id %p", (id) => {
    expect(updateClientSchema.safeParse({ ...validUpdate, id }).success).toBe(
      false,
    );
  });

  it("requires active, with no default", () => {
    const withoutActive: Record<string, unknown> = { ...validUpdate };
    delete withoutActive.active;

    expect(updateClientSchema.safeParse(withoutActive).success).toBe(false);
  });

  it("rejects a non-boolean active", () => {
    expect(
      updateClientSchema.safeParse({ ...validUpdate, active: "true" }).success,
    ).toBe(false);
  });

  it("defaults billable to true when absent", () => {
    const result = updateClientSchema.safeParse(validUpdate);

    expect(result.success).toBe(true);
    expect(result.data?.billable).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(
      updateClientSchema.safeParse({ ...validUpdate, name: "" }).success,
    ).toBe(false);
  });

  it("rejects a non-positive default rate", () => {
    expect(
      updateClientSchema.safeParse({ ...validUpdate, defaultRate: "0" })
        .success,
    ).toBe(false);
  });
});

describe("setClientActiveSchema", () => {
  it("accepts a valid id/active pair", () => {
    expect(
      setClientActiveSchema.safeParse({ id: 1, active: false }).success,
    ).toBe(true);
  });

  it.each([0, -1, 1.5])("rejects a non-positive-integer id %p", (id) => {
    expect(setClientActiveSchema.safeParse({ id, active: true }).success).toBe(
      false,
    );
  });

  it("rejects a non-boolean active flag", () => {
    expect(
      setClientActiveSchema.safeParse({ id: 1, active: "yes" }).success,
    ).toBe(false);
  });
});
