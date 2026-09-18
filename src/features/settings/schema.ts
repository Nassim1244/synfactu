// Zod schemas for every input crossing the server boundary in the settings
// domain, plus the registry that types and defaults every V1 application
// setting (`ai-rules/policy_architecture.md` -> Structure). Each Server
// Action in `actions.ts` parses its input against one of these before
// touching the repository (AD-005).
//
// `SETTINGS_REGISTRY` is the one place a setting key, its stored shape and
// its bootstrap default are declared (D-35, D-50, AD-031): `repository.ts`
// reads it to validate a stored row's value and to supply the default when
// no row exists yet, and `appSettingsFormSchema` below is derived from its
// five editable keys so the form and the registry cannot drift apart.

import { z } from "zod";

/** A non-empty, trimmed required field shared by every required company-profile field. */
function requiredField(label: string): z.ZodString {
  return z.string().trim().min(1, `${label} is required.`);
}

/**
 * Input for `updateCompanyProfile`: `legalName`, `siret`, `street`,
 * `postalCode`, `city` and `email` are required; `phone` is optional
 * (functional spec, step 4).
 */
export const companyProfileSchema = z.object({
  legalName: requiredField("Legal / trading name"),
  siret: requiredField("SIRET").regex(
    /^\d{14}$/,
    "SIRET must be exactly 14 digits.",
  ),
  street: requiredField("Street"),
  postalCode: requiredField("Postal code"),
  city: requiredField("City"),
  email: requiredField("Contact email").email("Enter a valid email address."),
  phone: z.string().trim().optional(),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

/** The six V1 setting keys (D-50), in the order the functional spec's user flow introduces them. */
export const SETTING_KEYS = [
  "hours_per_day",
  "rounding_step_minutes",
  "rounding_direction",
  "invoice_number_pattern",
  "show_mission_coefficient",
  "micro_estimated_charge_rate",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

/**
 * One setting's stored shape - a Zod schema validating the value read back
 * from `Setting.value` - and its bootstrap default (AD-031: no row is
 * seeded, so a missing key reads as this value).
 */
type SettingDefinition<Value> = {
  schema: z.ZodType<Value>;
  default: Value;
};

/**
 * Ties a setting's schema and its default to the same `Value` by generic
 * inference, so a default that does not match its own schema's output type
 * is a compile error here rather than a runtime surprise the first time the
 * key is read.
 */
function settingDefinition<Value>(
  definition: SettingDefinition<Value>,
): SettingDefinition<Value> {
  return definition;
}

/**
 * Every V1 setting, typed and defaulted in code rather than seeded (AD-031,
 * D-50, D-01, D-05, D-23, D-26). `repository.getSetting`/`getAllSettings`
 * read this to validate a stored row's `value` and to supply the default
 * when no row exists.
 */
export const SETTINGS_REGISTRY = {
  hours_per_day: settingDefinition<number>({
    schema: z.number().int().positive(),
    default: 420,
  }),
  rounding_step_minutes: settingDefinition<number>({
    schema: z.number().int().positive(),
    default: 15,
  }),
  rounding_direction: settingDefinition<"up">({
    schema: z.literal("up"),
    default: "up",
  }),
  invoice_number_pattern: settingDefinition<string>({
    schema: z.string().min(1),
    default: "YYYY-MM-NNN_Client_mission",
  }),
  show_mission_coefficient: settingDefinition<boolean>({
    schema: z.boolean(),
    default: false,
  }),
  micro_estimated_charge_rate: settingDefinition<number>({
    schema: z.number().int().min(0).max(10_000),
    default: 2500,
  }),
} satisfies Record<SettingKey, SettingDefinition<unknown>>;

/** The stored, validated type of a given setting key - `z.infer` of its registry schema. */
export type SettingValue<Key extends SettingKey> = z.infer<
  (typeof SETTINGS_REGISTRY)[Key]["schema"]
>;

/**
 * The five setting keys the application-settings form edits - every key but
 * `rounding_direction`, which D-05 fixes and never exposes for editing.
 */
export const EDITABLE_SETTING_KEYS = [
  "hours_per_day",
  "rounding_step_minutes",
  "invoice_number_pattern",
  "show_mission_coefficient",
  "micro_estimated_charge_rate",
] as const satisfies readonly Exclude<SettingKey, "rounding_direction">[];

export type EditableSettingKey = (typeof EDITABLE_SETTING_KEYS)[number];

/** Shaped like an unsigned decimal with at most two fraction digits. */
const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Matches only the zero value in any of its decimal spellings ("0", "0.0", "00.00"). */
const ZERO_PATTERN = /^0+(\.0{1,2})?$/;

/**
 * `hoursPerDay` as the raw decimal string a form field submits: a positive
 * decimal with at most two fraction digits (`Duration.fromHours` does the
 * real, float-free parse and rounding later, in `domain.ts`).
 */
const hoursPerDaySchema = z
  .string()
  .refine(
    (value) => DECIMAL_PATTERN.test(value) && !ZERO_PATTERN.test(value),
    "Must be a positive number.",
  );

/** `roundingStepMinutes`: a positive whole number of minutes, with no requirement that it evenly divide 60. */
const roundingStepMinutesSchema = z
  .number()
  .refine(
    (value) => Number.isInteger(value) && value > 0,
    "Must be a positive whole number.",
  );

/**
 * `microEstimatedChargeRate` as the raw decimal string a form field submits:
 * a decimal between 0 and 100 inclusive, with at most two fraction digits
 * (`Rate.fromPercent` does the real, float-free parse later, in `domain.ts`).
 */
const microEstimatedChargeRateSchema = z
  .string()
  .refine(
    (value) => DECIMAL_PATTERN.test(value) && Number(value) <= 100,
    "Must be a number between 0 and 100.",
  );

/**
 * Input for `updateAppSettings`: the five editable settings as the edit
 * form's raw field values. `hoursPerDay` and `microEstimatedChargeRate` are
 * decimal strings `domain.ts` converts through `Duration`/`Rate`; the others
 * are already in their storage shape. `roundingDirection` is deliberately
 * absent - D-05 fixes it and it is never entered by the user.
 */
export const appSettingsFormSchema = z.object({
  hoursPerDay: hoursPerDaySchema,
  roundingStepMinutes: roundingStepMinutesSchema,
  invoiceNumberPattern: z
    .string()
    .trim()
    .min(1, "Invoice numbering pattern is required."),
  showMissionCoefficient: z.boolean(),
  microEstimatedChargeRate: microEstimatedChargeRateSchema,
});

export type AppSettingsForm = z.infer<typeof appSettingsFormSchema>;
