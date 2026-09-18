// Zod schema for every input crossing the server boundary for
// `PortageContract` (`ai-rules/policy_architecture.md` -> Structure). The
// same schema validates both create and edit forms; every field is writable
// at any time (functional spec, step 8 - no field is locked once set).

import { z } from "zod";

/** Shaped like an unsigned decimal with at most two fraction digits - the charge-rate field's raw shape. */
const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Matches only the zero value in any of its decimal spellings ("0", "0.0", "00.00"). */
const ZERO_PATTERN = /^0+(\.0{1,2})?$/;

/**
 * The charge rate as the form's raw decimal-percentage string: positive, at
 * most 100, at most two fraction digits (spec's "Numeric and temporal
 * representation": `Rate.fromPercent` does the real, float-free parse and
 * conversion to basis points later, in `portage-contracts.actions.ts`).
 */
const chargeRateSchema = z
  .string()
  .refine(
    (value) =>
      DECIMAL_PATTERN.test(value) &&
      !ZERO_PATTERN.test(value) &&
      Number(value) <= 100,
    "Enter a percentage between 0 and 100.",
  );

/** The `YYYY-MM-DD` shape a native `<input type="date">` submits, and the shape both date schemas below validate against once `toDateOnlyInput`/`toOptionalDateOnlyInput` have normalised their input to it. */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalises an already-parsed `Date` back to the `YYYY-MM-DD` string
 * `dateSchema` validates. `@hookform/resolvers/zod` hands `handleSubmit`'s
 * callback this schema's own *parsed output* - `validFrom` already a `Date`,
 * not the raw form string - because `PortageContractFormDialog.tsx`'s
 * `useForm` names `PortageContractInput` (the parsed shape) as its third,
 * "submit" generic (see that file's header comment). The Server Action then
 * calls this same schema again on that payload (AD-005), so `dateSchema`
 * must accept both the raw string a direct call sends and the `Date` the
 * real dialog sends, for either to round-trip (fixes: every real save
 * failing validation).
 */
function toDateOnlyInput(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

/** Same as `toDateOnlyInput`, but for the optional `validTo` field: `undefined` - an omitted or never-set end date - passes through unchanged. */
function toOptionalDateOnlyInput(
  value: string | Date | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

/** A calendar date, as either a native `<input type="date">`'s raw `YYYY-MM-DD` string or an already-parsed `Date` (see `toDateOnlyInput`), normalised then parsed to a `Date` at UTC midnight (AD-008). */
const dateSchema = z.preprocess(
  toDateOnlyInput,
  z
    .string()
    .regex(DATE_ONLY_PATTERN, "Enter a valid date.")
    .transform((value) => new Date(`${value}T00:00:00.000Z`)),
);

/** Same as `dateSchema`, but an empty string - what a cleared native `<input type="date">` submits - or an omitted value is treated as "not entered" rather than an invalid date. */
const optionalDateSchema = z.preprocess(
  toOptionalDateOnlyInput,
  z
    .string()
    .refine(
      (value) => value === "" || DATE_ONLY_PATTERN.test(value),
      "Enter a valid date.",
    )
    .transform((value) =>
      value === "" ? undefined : new Date(`${value}T00:00:00.000Z`),
    )
    .optional(),
);

/**
 * Input for `createPortageContractAction`/`updatePortageContractAction`:
 * `label`/`companyName` required; `chargeRate` a bounded decimal-percentage
 * string; `validFrom` required, `validTo` optional and never earlier than
 * `validFrom` (equal is allowed).
 */
export const portageContractSchema = z
  .object({
    label: z.string().trim().min(1, "Label is required."),
    companyName: z.string().trim().min(1, "Company name is required."),
    chargeRate: chargeRateSchema,
    validFrom: dateSchema,
    validTo: optionalDateSchema,
  })
  .superRefine((data, ctx) => {
    // Zod still runs this object-level check even when `validFrom`/`validTo`
    // failed their own field-level validation above - in that case the
    // failing field's value here is still its raw, invalid input (a
    // string), never the `Date` its `.transform()` never got to produce.
    // Comparing dates before confirming both fields already parsed to a
    // `Date` used to call `.getTime()` on that raw string and throw a raw
    // `TypeError`, rather than letting `safeParse` return
    // `{ success: false }` for it (fixes: a malformed end date crashing
    // instead of failing validation).
    if (!(data.validFrom instanceof Date)) {
      return;
    }
    if (data.validTo === undefined) {
      return;
    }
    if (!(data.validTo instanceof Date)) {
      return;
    }
    if (data.validTo.getTime() < data.validFrom.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "End date must be on or after the start date.",
        path: ["validTo"],
      });
    }
  });

export type PortageContractInput = z.infer<typeof portageContractSchema>;
