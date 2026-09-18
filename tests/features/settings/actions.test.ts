// Tests for `src/features/settings/actions.ts`.
//
// Per `ai-rules/policy_testing.md` -> What to test where, `actions.ts` is
// tested with the repository faked - the happy path's actual persistence is
// proven by `repository.test.ts` (a real database) and by the end-to-end
// journey. What only this level can prove: that parsing happens before the
// repository is ever touched, that a validation failure never reaches the
// repository, that a repository failure never leaks a raw message, that the
// app-settings form's decimal strings are converted through `Duration`/`Rate`
// before the repository ever sees them, that `roundingDirection` never
// reaches the repository call (D-05, AC "no control for rounding
// direction"), and exactly which route is revalidated.

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/settings/repository");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";

import {
  updateAppSettings,
  updateCompanyProfile,
} from "@/features/settings/actions";
import * as repository from "@/features/settings/repository";

const mockedRepository = vi.mocked(repository);
const mockedRevalidatePath = vi.mocked(revalidatePath);

afterEach(() => {
  vi.clearAllMocks();
});

const VALID_PROFILE_INPUT = {
  legalName: "Acme Consulting",
  siret: "12345678901234",
  street: "1 Rue Exemple",
  postalCode: "75001",
  city: "Paris",
  email: "contact@acme.test",
  phone: "0600000000",
};

const SAVED_PROFILE = { ...VALID_PROFILE_INPUT };

describe("updateCompanyProfile", () => {
  it("parses, calls the repository, revalidates /settings, and returns { ok: true }", async () => {
    mockedRepository.upsertCompanyProfile.mockResolvedValue(SAVED_PROFILE);

    const result = await updateCompanyProfile(VALID_PROFILE_INPUT);

    expect(result).toEqual({ ok: true, data: SAVED_PROFILE });
    expect(mockedRepository.upsertCompanyProfile).toHaveBeenCalledWith(
      VALID_PROFILE_INPUT,
    );
    expect(mockedRevalidatePath).toHaveBeenCalledTimes(1);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("stores an omitted phone as null, not as an empty string", async () => {
    mockedRepository.upsertCompanyProfile.mockResolvedValue(SAVED_PROFILE);
    const withoutPhone: Record<string, unknown> = { ...VALID_PROFILE_INPUT };
    delete withoutPhone.phone;

    await updateCompanyProfile(withoutPhone as typeof VALID_PROFILE_INPUT);

    expect(mockedRepository.upsertCompanyProfile).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null }),
    );
  });

  it("stores a blanked-out phone as null, not as an empty string", async () => {
    mockedRepository.upsertCompanyProfile.mockResolvedValue(SAVED_PROFILE);

    await updateCompanyProfile({ ...VALID_PROFILE_INPUT, phone: "" });

    expect(mockedRepository.upsertCompanyProfile).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null }),
    );
  });

  it("saves successfully with phone left out and every other required field valid", async () => {
    mockedRepository.upsertCompanyProfile.mockResolvedValue(SAVED_PROFILE);
    const withoutPhone: Record<string, unknown> = { ...VALID_PROFILE_INPUT };
    delete withoutPhone.phone;

    const result = await updateCompanyProfile(
      withoutPhone as typeof VALID_PROFILE_INPUT,
    );

    expect(result.ok).toBe(true);
  });

  it.each([
    "legalName",
    "siret",
    "street",
    "postalCode",
    "city",
    "email",
  ] as const)(
    "rejects an empty %s without ever calling the repository",
    async (field) => {
      const result = await updateCompanyProfile({
        ...VALID_PROFILE_INPUT,
        [field]: "",
      });

      expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
      expect(mockedRepository.upsertCompanyProfile).not.toHaveBeenCalled();
      expect(mockedRevalidatePath).not.toHaveBeenCalled();
    },
  );

  it("rejects a SIRET that is not exactly 14 digits without calling the repository", async () => {
    const result = await updateCompanyProfile({
      ...VALID_PROFILE_INPUT,
      siret: "123",
    });

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.upsertCompanyProfile).not.toHaveBeenCalled();
  });

  it("rejects an invalid email without calling the repository", async () => {
    const result = await updateCompanyProfile({
      ...VALID_PROFILE_INPUT,
      email: "not-an-email",
    });

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.upsertCompanyProfile).not.toHaveBeenCalled();
  });

  it("returns a stable SAVE_FAILED code, never the repository's raw error, and does not revalidate", async () => {
    mockedRepository.upsertCompanyProfile.mockRejectedValue(
      new Error("SQLITE_CONSTRAINT: some internal detail"),
    );

    const result = await updateCompanyProfile(VALID_PROFILE_INPUT);

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});

const VALID_APP_SETTINGS_INPUT = {
  hoursPerDay: "7.5",
  roundingStepMinutes: 15,
  invoiceNumberPattern: "YYYY-MM-NNN_Client_mission",
  showMissionCoefficient: true,
  microEstimatedChargeRate: "24.60",
};

const SAVED_SETTINGS = {
  hours_per_day: 450,
  rounding_step_minutes: 15,
  rounding_direction: "up" as const,
  invoice_number_pattern: "YYYY-MM-NNN_Client_mission",
  show_mission_coefficient: true,
  micro_estimated_charge_rate: 2460,
};

describe("updateAppSettings", () => {
  it("parses, converts through Duration/Rate, calls the repository with the storage shape, revalidates /settings, and returns every current setting", async () => {
    mockedRepository.upsertSettings.mockResolvedValue(undefined);
    mockedRepository.getAllSettings.mockResolvedValue(SAVED_SETTINGS);

    const result = await updateAppSettings(VALID_APP_SETTINGS_INPUT);

    expect(result).toEqual({ ok: true, data: SAVED_SETTINGS });
    expect(mockedRepository.upsertSettings).toHaveBeenCalledWith({
      hours_per_day: 450, // 7.5h * 60, exact
      rounding_step_minutes: 15,
      invoice_number_pattern: "YYYY-MM-NNN_Client_mission",
      show_mission_coefficient: true,
      micro_estimated_charge_rate: 2460, // 24.60%, exact digit shift
    });
    expect(mockedRevalidatePath).toHaveBeenCalledTimes(1);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("never passes a rounding_direction key through to the repository", async () => {
    mockedRepository.upsertSettings.mockResolvedValue(undefined);
    mockedRepository.getAllSettings.mockResolvedValue(SAVED_SETTINGS);

    await updateAppSettings(VALID_APP_SETTINGS_INPUT);

    const storageArgument = mockedRepository.upsertSettings.mock.calls[0]?.[0];
    expect(storageArgument).toBeDefined();
    expect(Object.keys(storageArgument ?? {}).sort()).toEqual([
      "hours_per_day",
      "invoice_number_pattern",
      "micro_estimated_charge_rate",
      "rounding_step_minutes",
      "show_mission_coefficient",
    ]);
  });

  it.each(["0", "-1", "abc", ""])(
    "rejects the hoursPerDay %j without calling the repository",
    async (hoursPerDay) => {
      const result = await updateAppSettings({
        ...VALID_APP_SETTINGS_INPUT,
        hoursPerDay,
      });

      expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
      expect(mockedRepository.upsertSettings).not.toHaveBeenCalled();
      expect(mockedRevalidatePath).not.toHaveBeenCalled();
    },
  );

  it.each([0, -1, 1.5, Number.NaN])(
    "rejects the roundingStepMinutes %p without calling the repository",
    async (roundingStepMinutes) => {
      const result = await updateAppSettings({
        ...VALID_APP_SETTINGS_INPUT,
        roundingStepMinutes,
      });

      expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
      expect(mockedRepository.upsertSettings).not.toHaveBeenCalled();
    },
  );

  it("rejects an empty invoiceNumberPattern without calling the repository", async () => {
    const result = await updateAppSettings({
      ...VALID_APP_SETTINGS_INPUT,
      invoiceNumberPattern: "",
    });

    expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
    expect(mockedRepository.upsertSettings).not.toHaveBeenCalled();
  });

  it.each(["abc", "-1", "150", "100.01"])(
    "rejects the microEstimatedChargeRate %j without calling the repository",
    async (microEstimatedChargeRate) => {
      const result = await updateAppSettings({
        ...VALID_APP_SETTINGS_INPUT,
        microEstimatedChargeRate,
      });

      expect(result).toEqual({ ok: false, error: "VALIDATION_ERROR" });
      expect(mockedRepository.upsertSettings).not.toHaveBeenCalled();
    },
  );

  it("persists the coefficient toggle in either direction", async () => {
    mockedRepository.upsertSettings.mockResolvedValue(undefined);
    mockedRepository.getAllSettings.mockResolvedValue(SAVED_SETTINGS);

    await updateAppSettings({
      ...VALID_APP_SETTINGS_INPUT,
      showMissionCoefficient: false,
    });

    expect(mockedRepository.upsertSettings).toHaveBeenCalledWith(
      expect.objectContaining({ show_mission_coefficient: false }),
    );
  });

  it("returns a stable SAVE_FAILED code, never the repository's raw error, and does not revalidate", async () => {
    mockedRepository.upsertSettings.mockRejectedValue(
      new Error("SQLITE_BUSY: some internal detail"),
    );

    const result = await updateAppSettings(VALID_APP_SETTINGS_INPUT);

    expect(result).toEqual({ ok: false, error: "SAVE_FAILED" });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});
