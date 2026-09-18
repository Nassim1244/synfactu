// The only file in the settings domain allowed to import the Prisma client
// (AD-004, `ai-rules/policy_architecture.md` -> Data access). Covers both
// shapes this domain owns (AD-030): the singleton `CompanyProfile` row and
// the key/value `Setting` rows. Neither is ever seeded (AD-031): a missing
// `CompanyProfile` row reads as an all-null record, and a missing `Setting`
// row reads as its `SETTINGS_REGISTRY` default.

import { prisma } from "@/lib/db";

import type { AppSettingsStorage } from "./domain";
import {
  EDITABLE_SETTING_KEYS,
  SETTING_KEYS,
  SETTINGS_REGISTRY,
  type SettingKey,
  type SettingValue,
} from "./schema";

/** The company profile's single row - a fixed id, enforced here rather than by the schema. */
const COMPANY_PROFILE_ID = 1;

/** The plain domain shape `getCompanyProfile`/`upsertCompanyProfile` return - every field nullable until the first save (AD-031). */
export type CompanyProfileRecord = {
  legalName: string | null;
  siret: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
};

/** The all-null shape `getCompanyProfile` returns before the first save (AD-031). */
const EMPTY_COMPANY_PROFILE: CompanyProfileRecord = {
  legalName: null,
  siret: null,
  street: null,
  postalCode: null,
  city: null,
  email: null,
  phone: null,
};

const COMPANY_PROFILE_SELECT = {
  legalName: true,
  siret: true,
  street: true,
  postalCode: true,
  city: true,
  email: true,
  phone: true,
} as const;

/**
 * The company's own legal identity, or an all-null record when no row has
 * been saved yet (AD-031). No scoping beyond the fixed id - single operator,
 * no tenancy (D-40).
 */
export async function getCompanyProfile(): Promise<CompanyProfileRecord> {
  const row = await prisma.companyProfile.findUnique({
    where: { id: COMPANY_PROFILE_ID },
    select: COMPANY_PROFILE_SELECT,
  });
  return row ?? EMPTY_COMPANY_PROFILE;
}

/**
 * Creates or replaces the company profile's single row (fixed id). No
 * scoping beyond that fixed id - single operator, no tenancy (D-40).
 */
export function upsertCompanyProfile(
  data: CompanyProfileRecord,
): Promise<CompanyProfileRecord> {
  return prisma.companyProfile.upsert({
    where: { id: COMPANY_PROFILE_ID },
    create: { id: COMPANY_PROFILE_ID, ...data },
    update: data,
    select: COMPANY_PROFILE_SELECT,
  });
}

/**
 * Every V1 setting's current value, keyed by `SettingKey`.
 */
export type AllSettings = { [Key in SettingKey]: SettingValue<Key> };

// `SETTINGS_REGISTRY[key]` for a generic `key: Key` cannot be narrowed back
// to `SettingValue<Key>` by the compiler: indexing a record by a generic key
// parameter widens to the union of every entry's shape, even though each
// entry's own `default` and `schema` were tied to the same `Value` at
// `settingDefinition` call time (`schema.ts`). `getSetting` below is
// therefore overloaded per literal key - the same idiom `arithmetic.ts`'s
// `isDecimalLiteral` uses for a comparable compiler blind spot - so every
// call site still gets its precise type with no assertion anywhere in this
// file (`policy_coding_guidelines.md` -> TypeScript: no `as` to silence an
// error).

export function getSetting(key: "hours_per_day"): Promise<number>;
export function getSetting(key: "rounding_step_minutes"): Promise<number>;
export function getSetting(key: "rounding_direction"): Promise<"up">;
export function getSetting(key: "invoice_number_pattern"): Promise<string>;
export function getSetting(key: "show_mission_coefficient"): Promise<boolean>;
export function getSetting(key: "micro_estimated_charge_rate"): Promise<number>;
/**
 * One application setting's current value, or its registry default when no
 * row exists yet (AD-031). No scoping - single operator (D-40).
 */
export async function getSetting(
  key: SettingKey,
): Promise<SettingValue<SettingKey>> {
  const row = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  const stored = row?.value;

  switch (key) {
    case "hours_per_day":
      return stored === undefined
        ? SETTINGS_REGISTRY.hours_per_day.default
        : SETTINGS_REGISTRY.hours_per_day.schema.parse(stored);
    case "rounding_step_minutes":
      return stored === undefined
        ? SETTINGS_REGISTRY.rounding_step_minutes.default
        : SETTINGS_REGISTRY.rounding_step_minutes.schema.parse(stored);
    case "rounding_direction":
      return stored === undefined
        ? SETTINGS_REGISTRY.rounding_direction.default
        : SETTINGS_REGISTRY.rounding_direction.schema.parse(stored);
    case "invoice_number_pattern":
      return stored === undefined
        ? SETTINGS_REGISTRY.invoice_number_pattern.default
        : SETTINGS_REGISTRY.invoice_number_pattern.schema.parse(stored);
    case "show_mission_coefficient":
      return stored === undefined
        ? SETTINGS_REGISTRY.show_mission_coefficient.default
        : SETTINGS_REGISTRY.show_mission_coefficient.schema.parse(stored);
    case "micro_estimated_charge_rate":
      return stored === undefined
        ? SETTINGS_REGISTRY.micro_estimated_charge_rate.default
        : SETTINGS_REGISTRY.micro_estimated_charge_rate.schema.parse(stored);
  }
}

/**
 * Every V1 setting's current value, each falling back to its registry
 * default when no row exists (AD-031). No scoping - single operator (D-40).
 *
 * Reads every row in one query rather than calling `getSetting` six times -
 * the same reasoning as any list read versus N single reads - and resolves
 * each key by its own literal property access, for the same compiler reason
 * `getSetting` is overloaded above.
 */
export async function getAllSettings(): Promise<AllSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...SETTING_KEYS] } },
    select: { key: true, value: true },
  });
  const rowsByKey = new Map(rows.map((row) => [row.key, row.value]));

  const hoursPerDayStored = rowsByKey.get("hours_per_day");
  const roundingStepMinutesStored = rowsByKey.get("rounding_step_minutes");
  const roundingDirectionStored = rowsByKey.get("rounding_direction");
  const invoiceNumberPatternStored = rowsByKey.get("invoice_number_pattern");
  const showMissionCoefficientStored = rowsByKey.get(
    "show_mission_coefficient",
  );
  const microEstimatedChargeRateStored = rowsByKey.get(
    "micro_estimated_charge_rate",
  );

  return {
    hours_per_day:
      hoursPerDayStored === undefined
        ? SETTINGS_REGISTRY.hours_per_day.default
        : SETTINGS_REGISTRY.hours_per_day.schema.parse(hoursPerDayStored),
    rounding_step_minutes:
      roundingStepMinutesStored === undefined
        ? SETTINGS_REGISTRY.rounding_step_minutes.default
        : SETTINGS_REGISTRY.rounding_step_minutes.schema.parse(
            roundingStepMinutesStored,
          ),
    rounding_direction:
      roundingDirectionStored === undefined
        ? SETTINGS_REGISTRY.rounding_direction.default
        : SETTINGS_REGISTRY.rounding_direction.schema.parse(
            roundingDirectionStored,
          ),
    invoice_number_pattern:
      invoiceNumberPatternStored === undefined
        ? SETTINGS_REGISTRY.invoice_number_pattern.default
        : SETTINGS_REGISTRY.invoice_number_pattern.schema.parse(
            invoiceNumberPatternStored,
          ),
    show_mission_coefficient:
      showMissionCoefficientStored === undefined
        ? SETTINGS_REGISTRY.show_mission_coefficient.default
        : SETTINGS_REGISTRY.show_mission_coefficient.schema.parse(
            showMissionCoefficientStored,
          ),
    micro_estimated_charge_rate:
      microEstimatedChargeRateStored === undefined
        ? SETTINGS_REGISTRY.micro_estimated_charge_rate.default
        : SETTINGS_REGISTRY.micro_estimated_charge_rate.schema.parse(
            microEstimatedChargeRateStored,
          ),
  };
}

/**
 * Writes all five editable settings in one transaction, so a partial write
 * across them never happens. `rounding_direction` is never accepted here -
 * D-05 fixes it and it is never entered by the user.
 */
export async function upsertSettings(
  values: AppSettingsStorage,
): Promise<void> {
  await prisma.$transaction(
    EDITABLE_SETTING_KEYS.map((key) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: values[key] },
        update: { value: values[key] },
      }),
    ),
  );
}
