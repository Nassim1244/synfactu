// Tests for `src/features/settings/schema.ts` (v01-003 technical spec ->
// Validation). Every rejection the schema is supposed to perform gets its
// own test (`ai-rules/policy_testing.md` -> What to test where), plus the
// registry defaults AD-031 relies on and the functional spec's step 7
// numbers are hand-checked against the spec text, not against the running
// code.

import { describe, expect, it } from "vitest";

import {
  appSettingsFormSchema,
  companyProfileSchema,
  EDITABLE_SETTING_KEYS,
  SETTING_KEYS,
  SETTINGS_REGISTRY,
} from "@/features/settings/schema";

/** The minimum valid company-profile payload, per field overridden below. */
const validProfile = {
  legalName: "Acme Consulting",
  siret: "12345678901234",
  street: "1 Rue Exemple",
  postalCode: "75001",
  city: "Paris",
  email: "contact@acme.test",
};

describe("companyProfileSchema - accepts a valid payload", () => {
  it("accepts every required field filled, with phone omitted", () => {
    expect(companyProfileSchema.safeParse(validProfile).success).toBe(true);
  });

  it("accepts a valid payload with phone filled in", () => {
    const result = companyProfileSchema.safeParse({
      ...validProfile,
      phone: "0600000000",
    });

    expect(result.success).toBe(true);
    expect(result.data?.phone).toBe("0600000000");
  });

  it("accepts phone left as an empty string - the field is optional", () => {
    expect(
      companyProfileSchema.safeParse({ ...validProfile, phone: "" }).success,
    ).toBe(true);
  });
});

describe.each([
  ["legalName", "Legal / trading name is required."],
  ["street", "Street is required."],
  ["postalCode", "Postal code is required."],
  ["city", "City is required."],
] as const)("companyProfileSchema - %s is required", (field, message) => {
  it(`rejects an empty ${field} naming the field`, () => {
    const result = companyProfileSchema.safeParse({
      ...validProfile,
      [field]: "",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.find((issue) => issue.path[0] === field)?.message,
    ).toBe(message);
  });

  it(`rejects a whitespace-only ${field}`, () => {
    expect(
      companyProfileSchema.safeParse({ ...validProfile, [field]: "   " })
        .success,
    ).toBe(false);
  });
});

describe("companyProfileSchema - siret", () => {
  it("rejects an empty siret with 'SIRET is required.'", () => {
    const result = companyProfileSchema.safeParse({
      ...validProfile,
      siret: "",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.find((issue) => issue.path[0] === "siret")?.message,
    ).toBe("SIRET is required.");
  });

  it.each(["1234567890123", "123456789012345", "1234567890123a"])(
    "rejects %j with 'SIRET must be exactly 14 digits.'",
    (siret) => {
      const result = companyProfileSchema.safeParse({
        ...validProfile,
        siret,
      });

      expect(result.success).toBe(false);
      expect(
        result.error?.issues.find((issue) => issue.path[0] === "siret")
          ?.message,
      ).toBe("SIRET must be exactly 14 digits.");
    },
  );

  it("accepts exactly 14 digits", () => {
    expect(
      companyProfileSchema.safeParse({
        ...validProfile,
        siret: "00000000000000",
      }).success,
    ).toBe(true);
  });
});

describe("companyProfileSchema - email", () => {
  it("rejects an empty email with 'Contact email is required.'", () => {
    const result = companyProfileSchema.safeParse({
      ...validProfile,
      email: "",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.find((issue) => issue.path[0] === "email")?.message,
    ).toBe("Contact email is required.");
  });

  it.each([
    "not-an-email",
    "missing-domain@",
    "@missing-local.com",
    "a b@c.com",
  ])("rejects %j with 'Enter a valid email address.'", (email) => {
    const result = companyProfileSchema.safeParse({
      ...validProfile,
      email,
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.find((issue) => issue.path[0] === "email")?.message,
    ).toBe("Enter a valid email address.");
  });
});

describe("companyProfileSchema - multiple failing fields at once", () => {
  it("names every failing field's message when several are invalid together", () => {
    const result = companyProfileSchema.safeParse({
      legalName: "",
      siret: "not14digits",
      street: "",
      postalCode: "",
      city: "",
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message) ?? [];
    expect(messages).toContain("Legal / trading name is required.");
    expect(messages).toContain("SIRET must be exactly 14 digits.");
    expect(messages).toContain("Street is required.");
    expect(messages).toContain("Postal code is required.");
    expect(messages).toContain("City is required.");
    expect(messages).toContain("Enter a valid email address.");
  });
});

describe("SETTING_KEYS and EDITABLE_SETTING_KEYS", () => {
  it("lists all six V1 setting keys", () => {
    expect(SETTING_KEYS).toEqual([
      "hours_per_day",
      "rounding_step_minutes",
      "rounding_direction",
      "invoice_number_pattern",
      "show_mission_coefficient",
      "micro_estimated_charge_rate",
    ]);
  });

  it("excludes rounding_direction from the editable keys - D-05 fixes it, the user never enters it", () => {
    expect(EDITABLE_SETTING_KEYS).not.toContain("rounding_direction");
    expect(EDITABLE_SETTING_KEYS).toHaveLength(5);
  });
});

describe("SETTINGS_REGISTRY defaults (functional spec, step 7)", () => {
  it("defaults hours_per_day to 420 minutes (7h)", () => {
    expect(SETTINGS_REGISTRY.hours_per_day.default).toBe(420);
  });

  it("defaults rounding_step_minutes to 15", () => {
    expect(SETTINGS_REGISTRY.rounding_step_minutes.default).toBe(15);
  });

  it("defaults rounding_direction to 'up' and accepts no other literal", () => {
    expect(SETTINGS_REGISTRY.rounding_direction.default).toBe("up");
    expect(
      SETTINGS_REGISTRY.rounding_direction.schema.safeParse("down").success,
    ).toBe(false);
  });

  it("defaults invoice_number_pattern to 'YYYY-MM-NNN_Client_mission'", () => {
    expect(SETTINGS_REGISTRY.invoice_number_pattern.default).toBe(
      "YYYY-MM-NNN_Client_mission",
    );
  });

  it("defaults show_mission_coefficient to false (hidden)", () => {
    expect(SETTINGS_REGISTRY.show_mission_coefficient.default).toBe(false);
  });

  it("defaults micro_estimated_charge_rate to 2500 basis points (25%, D-26)", () => {
    expect(SETTINGS_REGISTRY.micro_estimated_charge_rate.default).toBe(2500);
  });
});

/** The minimum valid app-settings form payload, per field overridden below. */
const validAppSettings = {
  hoursPerDay: "7",
  roundingStepMinutes: 15,
  invoiceNumberPattern: "YYYY-MM-NNN_Client_mission",
  showMissionCoefficient: false,
  microEstimatedChargeRate: "25",
};

describe("appSettingsFormSchema - accepts a valid payload", () => {
  it("accepts the bootstrap-default shaped payload", () => {
    expect(appSettingsFormSchema.safeParse(validAppSettings).success).toBe(
      true,
    );
  });

  it("never exposes a roundingDirection field to fill in", () => {
    expect("roundingDirection" in appSettingsFormSchema.shape).toBe(false);
  });
});

describe("appSettingsFormSchema - hoursPerDay", () => {
  it.each(["0", "0.0", "0.00", "-1", "-1.5", "abc", "", "1.234"])(
    "rejects %j with 'Must be a positive number.'",
    (hoursPerDay) => {
      const result = appSettingsFormSchema.safeParse({
        ...validAppSettings,
        hoursPerDay,
      });

      expect(result.success).toBe(false);
      expect(
        result.error?.issues.find((issue) => issue.path[0] === "hoursPerDay")
          ?.message,
      ).toBe("Must be a positive number.");
    },
  );

  it.each(["1", "0.5", "7.5", "7.50", "100.25"])(
    "accepts the positive decimal %j",
    (hoursPerDay) => {
      expect(
        appSettingsFormSchema.safeParse({ ...validAppSettings, hoursPerDay })
          .success,
      ).toBe(true);
    },
  );
});

describe("appSettingsFormSchema - roundingStepMinutes", () => {
  it.each([0, -1, 1.5])(
    "rejects %p with 'Must be a positive whole number.'",
    (roundingStepMinutes) => {
      const result = appSettingsFormSchema.safeParse({
        ...validAppSettings,
        roundingStepMinutes,
      });

      expect(result.success).toBe(false);
      expect(
        result.error?.issues.find(
          (issue) => issue.path[0] === "roundingStepMinutes",
        )?.message,
      ).toBe("Must be a positive whole number.");
    },
  );

  it("rejects NaN, naming the field, even though the base number check fires before the custom message", () => {
    // z.number() itself refuses NaN before the refine ever runs, so the
    // message differs from the other rejections above - the field is still
    // named and no change is created either way.
    const result = appSettingsFormSchema.safeParse({
      ...validAppSettings,
      roundingStepMinutes: Number.NaN,
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(
        (issue) => issue.path[0] === "roundingStepMinutes",
      ),
    ).toBe(true);
  });

  it.each([1, 5, 15, 60])("accepts the positive whole number %p", (value) => {
    expect(
      appSettingsFormSchema.safeParse({
        ...validAppSettings,
        roundingStepMinutes: value,
      }).success,
    ).toBe(true);
  });
});

describe("appSettingsFormSchema - invoiceNumberPattern", () => {
  it.each(["", "   "])(
    "rejects %j with 'Invoice numbering pattern is required.'",
    (invoiceNumberPattern) => {
      const result = appSettingsFormSchema.safeParse({
        ...validAppSettings,
        invoiceNumberPattern,
      });

      expect(result.success).toBe(false);
      expect(
        result.error?.issues.find(
          (issue) => issue.path[0] === "invoiceNumberPattern",
        )?.message,
      ).toBe("Invoice numbering pattern is required.");
    },
  );
});

describe("appSettingsFormSchema - microEstimatedChargeRate", () => {
  it.each(["abc", "-5", "-0.01", "150", "100.01", "24.605", ""])(
    "rejects %j with 'Must be a number between 0 and 100.'",
    (microEstimatedChargeRate) => {
      const result = appSettingsFormSchema.safeParse({
        ...validAppSettings,
        microEstimatedChargeRate,
      });

      expect(result.success).toBe(false);
      expect(
        result.error?.issues.find(
          (issue) => issue.path[0] === "microEstimatedChargeRate",
        )?.message,
      ).toBe("Must be a number between 0 and 100.");
    },
  );

  it.each(["0", "0.00", "25", "100", "100.00", "24.60"])(
    "accepts the in-range percentage %j",
    (microEstimatedChargeRate) => {
      expect(
        appSettingsFormSchema.safeParse({
          ...validAppSettings,
          microEstimatedChargeRate,
        }).success,
      ).toBe(true);
    },
  );
});

describe("appSettingsFormSchema - showMissionCoefficient", () => {
  it.each([true, false])("accepts the boolean %p", (showMissionCoefficient) => {
    expect(
      appSettingsFormSchema.safeParse({
        ...validAppSettings,
        showMissionCoefficient,
      }).success,
    ).toBe(true);
  });

  it("rejects a non-boolean value", () => {
    expect(
      appSettingsFormSchema.safeParse({
        ...validAppSettings,
        showMissionCoefficient: "true",
      }).success,
    ).toBe(false);
  });
});
