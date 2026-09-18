// Tests for `src/features/referential/portage-contracts.schema.ts` (v01-004
// technical spec -> Validation: label/companyName required; chargeRate a
// bounded decimal-percentage string; validFrom required; validTo optional
// and never earlier than validFrom). Every rejection the schema performs
// gets its own test (`ai-rules/policy_testing.md` -> What to test where).

import { describe, expect, it } from "vitest";

import { portageContractSchema } from "@/features/referential/portage-contracts.schema";

/** The minimum valid create payload, per field overridden in each test. */
const validPayload = {
  label: "Contract A",
  companyName: "Portage Co",
  chargeRate: "24.60",
  validFrom: "2026-01-01",
  validTo: undefined,
};

describe("portageContractSchema - label", () => {
  it("rejects an empty label with 'Label is required.'", () => {
    const result = portageContractSchema.safeParse({
      ...validPayload,
      label: "",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.find((issue) => issue.path[0] === "label")?.message,
    ).toBe("Label is required.");
  });

  it("rejects a whitespace-only label", () => {
    expect(
      portageContractSchema.safeParse({ ...validPayload, label: "   " })
        .success,
    ).toBe(false);
  });
});

describe("portageContractSchema - companyName", () => {
  it("rejects an empty company name with 'Company name is required.'", () => {
    const result = portageContractSchema.safeParse({
      ...validPayload,
      companyName: "",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.find((issue) => issue.path[0] === "companyName")
        ?.message,
    ).toBe("Company name is required.");
  });

  it("rejects a whitespace-only company name", () => {
    expect(
      portageContractSchema.safeParse({ ...validPayload, companyName: "   " })
        .success,
    ).toBe(false);
  });
});

describe("portageContractSchema - chargeRate", () => {
  const REQUIRED_MESSAGE = "Enter a percentage between 0 and 100.";

  it.each(["", "abc", "-5", "-5.50", "5..5"])(
    "rejects the non-numeric or negatively shaped rate %j",
    (chargeRate) => {
      const result = portageContractSchema.safeParse({
        ...validPayload,
        chargeRate,
      });

      expect(result.success).toBe(false);
      expect(
        result.error?.issues.find((issue) => issue.path[0] === "chargeRate")
          ?.message,
      ).toBe(REQUIRED_MESSAGE);
    },
  );

  it.each(["0", "0.0", "0.00"])(
    "rejects the zero rate %j - not positive",
    (chargeRate) => {
      const result = portageContractSchema.safeParse({
        ...validPayload,
        chargeRate,
      });

      expect(result.success).toBe(false);
    },
  );

  it("rejects a rate just over 100", () => {
    const result = portageContractSchema.safeParse({
      ...validPayload,
      chargeRate: "100.01",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a rate far over 100", () => {
    expect(
      portageContractSchema.safeParse({ ...validPayload, chargeRate: "150" })
        .success,
    ).toBe(false);
  });

  it("rejects more than two fraction digits", () => {
    expect(
      portageContractSchema.safeParse({
        ...validPayload,
        chargeRate: "24.601",
      }).success,
    ).toBe(false);
  });

  it("accepts a rate of exactly 100 - the inclusive upper bound", () => {
    expect(
      portageContractSchema.safeParse({ ...validPayload, chargeRate: "100" })
        .success,
    ).toBe(true);
  });

  it("accepts a rate of exactly 100.00", () => {
    expect(
      portageContractSchema.safeParse({
        ...validPayload,
        chargeRate: "100.00",
      }).success,
    ).toBe(true);
  });

  it.each(["0.01", "1", "24.60", "99.99"])(
    "accepts the valid percentage %j",
    (chargeRate) => {
      expect(
        portageContractSchema.safeParse({ ...validPayload, chargeRate })
          .success,
      ).toBe(true);
    },
  );
});

describe("portageContractSchema - validFrom", () => {
  it("rejects an empty start date with 'Enter a valid date.'", () => {
    const result = portageContractSchema.safeParse({
      ...validPayload,
      validFrom: "",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.find((issue) => issue.path[0] === "validFrom")
        ?.message,
    ).toBe("Enter a valid date.");
  });

  it("rejects a malformed date", () => {
    expect(
      portageContractSchema.safeParse({
        ...validPayload,
        validFrom: "01/01/2026",
      }).success,
    ).toBe(false);
  });

  it("parses a valid date to UTC midnight", () => {
    const result = portageContractSchema.safeParse({
      ...validPayload,
      validFrom: "2026-03-15",
    });

    expect(result.success).toBe(true);
    expect(result.data?.validFrom.toISOString()).toBe(
      "2026-03-15T00:00:00.000Z",
    );
  });
});

describe("portageContractSchema - validTo", () => {
  it("treats an omitted validTo as open-ended, with no error", () => {
    const withoutValidTo = {
      label: validPayload.label,
      companyName: validPayload.companyName,
      chargeRate: validPayload.chargeRate,
      validFrom: validPayload.validFrom,
    };
    const result = portageContractSchema.safeParse(withoutValidTo);

    expect(result.success).toBe(true);
    expect(result.data?.validTo).toBeUndefined();
  });

  it("treats an empty-string validTo (a cleared date input) as open-ended", () => {
    const result = portageContractSchema.safeParse({
      ...validPayload,
      validTo: "",
    });

    expect(result.success).toBe(true);
    expect(result.data?.validTo).toBeUndefined();
  });

  it("rejects a malformed end date", () => {
    expect(
      portageContractSchema.safeParse({
        ...validPayload,
        validTo: "not-a-date",
      }).success,
    ).toBe(false);
  });

  it("rejects an end date earlier than the start date, naming validTo", () => {
    const result = portageContractSchema.safeParse({
      ...validPayload,
      validFrom: "2026-06-01",
      validTo: "2026-05-31",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.find((issue) => issue.path[0] === "validTo")
        ?.message,
    ).toBe("End date must be on or after the start date.");
  });

  it("accepts an end date equal to the start date - equal is allowed", () => {
    const result = portageContractSchema.safeParse({
      ...validPayload,
      validFrom: "2026-06-01",
      validTo: "2026-06-01",
    });

    expect(result.success).toBe(true);
  });

  it("accepts an end date after the start date", () => {
    const result = portageContractSchema.safeParse({
      ...validPayload,
      validFrom: "2026-01-01",
      validTo: "2026-12-31",
    });

    expect(result.success).toBe(true);
  });
});
