// Tests for `src/features/settings/domain.ts`: the pure conversions between
// the application-settings edit form's display units and the storage units
// `repository.upsertSettings`/`getAllSettings` persist. No Prisma, no React
// (`ai-rules/policy_testing.md` -> What to test where).
//
// Every expected minute/basis-point figure below is computed by hand from
// `Duration`/`Rate`'s own documented rules, never by running
// `toAppSettingsStorage`/`fromAppSettingsStorage` and pasting their output
// (`ai-rules/policy_testing.md` -> Money, duration and time).

import { describe, expect, it } from "vitest";

import {
  fromAppSettingsStorage,
  toAppSettingsStorage,
  type AppSettingsStorage,
} from "@/features/settings/domain";
import type { AppSettingsForm } from "@/features/settings/schema";

describe("toAppSettingsStorage", () => {
  it("converts the bootstrap-default form values to their storage shape", () => {
    const form: AppSettingsForm = {
      hoursPerDay: "7",
      roundingStepMinutes: 15,
      invoiceNumberPattern: "YYYY-MM-NNN_Client_mission",
      showMissionCoefficient: false,
      microEstimatedChargeRate: "25",
    };

    expect(toAppSettingsStorage(form)).toEqual({
      hours_per_day: 420,
      rounding_step_minutes: 15,
      invoice_number_pattern: "YYYY-MM-NNN_Client_mission",
      show_mission_coefficient: false,
      micro_estimated_charge_rate: 2500,
    });
  });

  it("converts hoursPerDay '7.5' to 450 minutes exactly", () => {
    const form: AppSettingsForm = {
      hoursPerDay: "7.5",
      roundingStepMinutes: 15,
      invoiceNumberPattern: "P",
      showMissionCoefficient: false,
      microEstimatedChargeRate: "0",
    };

    expect(toAppSettingsStorage(form).hours_per_day).toBe(450);
  });

  it("rounds hoursPerDay half up to the nearest minute (AD-018) - 7.33h becomes 440min", () => {
    // 7.33h = 733 hundredths of an hour; 733 * 60 / 100 = 439.8, which rounds
    // away from zero to 440 (remainder 80/100 >= half).
    const form: AppSettingsForm = {
      hoursPerDay: "7.33",
      roundingStepMinutes: 15,
      invoiceNumberPattern: "P",
      showMissionCoefficient: false,
      microEstimatedChargeRate: "0",
    };

    expect(toAppSettingsStorage(form).hours_per_day).toBe(440);
  });

  it("converts microEstimatedChargeRate '24.60' to 2460 basis points exactly, no rounding", () => {
    const form: AppSettingsForm = {
      hoursPerDay: "7",
      roundingStepMinutes: 15,
      invoiceNumberPattern: "P",
      showMissionCoefficient: false,
      microEstimatedChargeRate: "24.60",
    };

    expect(toAppSettingsStorage(form).micro_estimated_charge_rate).toBe(2460);
  });

  it("passes roundingStepMinutes, invoiceNumberPattern and showMissionCoefficient through unchanged", () => {
    const form: AppSettingsForm = {
      hoursPerDay: "7",
      roundingStepMinutes: 30,
      invoiceNumberPattern: "CUSTOM-NNN",
      showMissionCoefficient: true,
      microEstimatedChargeRate: "10",
    };

    const storage = toAppSettingsStorage(form);

    expect(storage.rounding_step_minutes).toBe(30);
    expect(storage.invoice_number_pattern).toBe("CUSTOM-NNN");
    expect(storage.show_mission_coefficient).toBe(true);
  });

  it("throws RangeError rather than persisting a malformed roundingStepMinutes (defence in depth)", () => {
    const form: AppSettingsForm = {
      hoursPerDay: "7",
      roundingStepMinutes: 1.5,
      invoiceNumberPattern: "P",
      showMissionCoefficient: false,
      microEstimatedChargeRate: "0",
    };

    expect(() => toAppSettingsStorage(form)).toThrow(RangeError);
  });
});

describe("fromAppSettingsStorage", () => {
  it("converts the bootstrap-default storage values to their form display shape", () => {
    const storage: AppSettingsStorage = {
      hours_per_day: 420,
      rounding_step_minutes: 15,
      invoice_number_pattern: "YYYY-MM-NNN_Client_mission",
      show_mission_coefficient: false,
      micro_estimated_charge_rate: 2500,
    };

    expect(fromAppSettingsStorage(storage)).toEqual({
      hoursPerDay: "7.00",
      roundingStepMinutes: 15,
      invoiceNumberPattern: "YYYY-MM-NNN_Client_mission",
      showMissionCoefficient: false,
      microEstimatedChargeRate: "25.00",
    });
  });

  it("converts 450 minutes to the exact display string '7.50'", () => {
    const storage: AppSettingsStorage = {
      hours_per_day: 450,
      rounding_step_minutes: 15,
      invoice_number_pattern: "P",
      show_mission_coefficient: false,
      micro_estimated_charge_rate: 0,
    };

    expect(fromAppSettingsStorage(storage).hoursPerDay).toBe("7.50");
  });

  it("converts 2460 basis points to the exact display string '24.60'", () => {
    const storage: AppSettingsStorage = {
      hours_per_day: 420,
      rounding_step_minutes: 15,
      invoice_number_pattern: "P",
      show_mission_coefficient: false,
      micro_estimated_charge_rate: 2460,
    };

    expect(fromAppSettingsStorage(storage).microEstimatedChargeRate).toBe(
      "24.60",
    );
  });

  it("passes roundingStepMinutes, invoiceNumberPattern and showMissionCoefficient through unchanged", () => {
    const storage: AppSettingsStorage = {
      hours_per_day: 420,
      rounding_step_minutes: 30,
      invoice_number_pattern: "CUSTOM-NNN",
      show_mission_coefficient: true,
      micro_estimated_charge_rate: 0,
    };

    const form = fromAppSettingsStorage(storage);

    expect(form.roundingStepMinutes).toBe(30);
    expect(form.invoiceNumberPattern).toBe("CUSTOM-NNN");
    expect(form.showMissionCoefficient).toBe(true);
  });
});

describe("toAppSettingsStorage / fromAppSettingsStorage round trip", () => {
  it.each([
    {
      hours_per_day: 420,
      rounding_step_minutes: 15,
      invoice_number_pattern: "YYYY-MM-NNN_Client_mission",
      show_mission_coefficient: false,
      micro_estimated_charge_rate: 2500,
    },
    {
      hours_per_day: 450,
      rounding_step_minutes: 10,
      invoice_number_pattern: "YYYY-NNN",
      show_mission_coefficient: true,
      micro_estimated_charge_rate: 1234,
    },
    {
      hours_per_day: 480,
      rounding_step_minutes: 60,
      invoice_number_pattern: "X",
      show_mission_coefficient: true,
      micro_estimated_charge_rate: 0,
    },
  ] satisfies AppSettingsStorage[])(
    "round-trips %o back to itself through the form shape",
    (storage) => {
      expect(toAppSettingsStorage(fromAppSettingsStorage(storage))).toEqual(
        storage,
      );
    },
  );
});
