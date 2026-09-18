// Read functions for the settings domain, called by the `/settings` async
// Server Component and, cross-feature, by whichever later spec first reads a
// setting (missions' coefficient display RM-004, the time entry journal
// RM-005, consolidation RM-006, micro invoicing RM-007) - the cross-feature
// read surface `ai-rules/policy_architecture.md` -> Dependency rule names.
// Thin wrappers over `repository.ts`: no Prisma import here (AD-004).

import { fromAppSettingsStorage } from "./domain";
import * as repository from "./repository";
import type { CompanyProfileRecord } from "./repository";
import type { AppSettingsForm } from "./schema";

/**
 * The company profile, or an all-null record before the first save
 * (AD-031) - the `/settings` page's Company profile section dataset.
 */
export function getCompanyProfileView(): Promise<CompanyProfileRecord> {
  return repository.getCompanyProfile();
}

/**
 * The five editable application settings, in the edit form's display shape
 * (`domain.fromAppSettingsStorage`), plus the fixed `roundingDirection` -
 * the `/settings` page's Application settings section dataset, and the same
 * shape `AppSettingsEditForm` pre-fills from.
 */
export type AppSettingsView = AppSettingsForm & {
  roundingDirection: "up";
};

export async function getAppSettingsView(): Promise<AppSettingsView> {
  const settings = await repository.getAllSettings();
  return {
    ...fromAppSettingsStorage({
      hours_per_day: settings.hours_per_day,
      rounding_step_minutes: settings.rounding_step_minutes,
      invoice_number_pattern: settings.invoice_number_pattern,
      show_mission_coefficient: settings.show_mission_coefficient,
      micro_estimated_charge_rate: settings.micro_estimated_charge_rate,
    }),
    roundingDirection: settings.rounding_direction,
  };
}
