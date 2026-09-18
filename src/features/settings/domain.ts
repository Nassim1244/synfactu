// Pure conversions between the application-settings edit form's display
// units and the storage units `repository.upsertSettings`/
// `repository.getAllSettings` persist for the five editable keys
// (`ai-rules/policy_architecture.md` -> Dependency rule: no Prisma, no
// React, no `next/*`). All arithmetic is delegated to `Duration` and `Rate`
// (AD-007) - nothing here touches a raw minute or a raw basis point.

import { Duration } from "@/lib/money/duration";
import { Rate } from "@/lib/money/rate";

import type { AppSettingsForm } from "./schema";

/**
 * The five editable settings in their storage shape - what
 * `repository.upsertSettings` persists, keyed exactly like
 * `repository.getAllSettings`'s result for these same five keys.
 */
export type AppSettingsStorage = {
  hours_per_day: number;
  rounding_step_minutes: number;
  invoice_number_pattern: string;
  show_mission_coefficient: boolean;
  micro_estimated_charge_rate: number;
};

/**
 * Converts the application-settings edit form's raw, already-validated input
 * into its storage shape: `hoursPerDay` and `microEstimatedChargeRate` move
 * from a decimal display string to an integer number of minutes / basis
 * points through `Duration.fromHours`/`Rate.fromPercent`; `roundingStepMinutes`
 * passes through `Duration.fromMinutes` for the same safe-integer check every
 * other duration gets, even though it is already a whole number of minutes.
 *
 * @throws RangeError when a field is not shaped as `appSettingsFormSchema`
 * promises - defence in depth only, since the schema has already parsed the
 * input by the time this runs (AD-005).
 */
export function toAppSettingsStorage(
  form: AppSettingsForm,
): AppSettingsStorage {
  return {
    hours_per_day: Duration.fromHours(form.hoursPerDay).toMinutes(),
    rounding_step_minutes: Duration.fromMinutes(
      form.roundingStepMinutes,
    ).toMinutes(),
    invoice_number_pattern: form.invoiceNumberPattern,
    show_mission_coefficient: form.showMissionCoefficient,
    micro_estimated_charge_rate: Rate.fromPercent(
      form.microEstimatedChargeRate,
    ).toBasisPoints(),
  };
}

/**
 * Converts the five editable settings back from their storage shape into the
 * edit form's display shape - the reverse of `toAppSettingsStorage`, used to
 * pre-fill the edit form with the current values.
 */
export function fromAppSettingsStorage(
  storage: AppSettingsStorage,
): AppSettingsForm {
  return {
    hoursPerDay: Duration.fromMinutes(
      storage.hours_per_day,
    ).toHoursDecimalString(),
    roundingStepMinutes: Duration.fromMinutes(
      storage.rounding_step_minutes,
    ).toMinutes(),
    invoiceNumberPattern: storage.invoice_number_pattern,
    showMissionCoefficient: storage.show_mission_coefficient,
    microEstimatedChargeRate: Rate.fromBasisPoints(
      storage.micro_estimated_charge_rate,
    ).toPercentDecimalString(),
  };
}
