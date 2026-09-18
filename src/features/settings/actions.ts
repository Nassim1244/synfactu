// Server Actions for the settings domain.
//
// Each action, in order: `schema.parse` (no role check to perform yet - V1
// carries no session, D-40/AD-009), then the repository call (through
// `domain.ts` for the app-settings unit conversion), then `revalidatePath`
// for the one route both sections live on
// (`ai-rules/policy_architecture.md` -> Server boundary).
//
// Every action returns `{ ok: true, data }` or `{ ok: false, error }`, never
// throws for an expected failure, and never returns a raw Prisma/DB error
// message - `error` is one of the stable codes below
// (`ai-rules/policy_coding_guidelines.md` -> Error handling and logging,
// `ai-rules/policy_security.md` -> Data exposure).

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import * as repository from "./repository";
import { toAppSettingsStorage } from "./domain";
import {
  appSettingsFormSchema,
  companyProfileSchema,
  type AppSettingsForm,
  type CompanyProfileInput,
} from "./schema";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "settings/actions" });

/**
 * The stable error codes a settings action can return.
 *
 * `"VALIDATION_ERROR"` is a defence-in-depth branch: the form validates the
 * same schema before ever calling the action, so this fires only when an
 * action is invoked directly with input the client never produced
 * (`policy_security.md` -> Threat model - "assume any Server Action can be
 * invoked directly, with arbitrary arguments"). `"SAVE_FAILED"` covers every
 * failure after validation.
 */
type SettingsActionError = "VALIDATION_ERROR" | "SAVE_FAILED";

type UpdateCompanyProfileResult =
  | {
      ok: true;
      data: Awaited<ReturnType<typeof repository.upsertCompanyProfile>>;
    }
  | { ok: false; error: SettingsActionError };

type UpdateAppSettingsResult =
  | { ok: true; data: Awaited<ReturnType<typeof repository.getAllSettings>> }
  | { ok: false; error: SettingsActionError };

/**
 * Updates the company's legal identity: name, SIRET, address and contact
 * details. No role required (D-40, no login in V1).
 *
 * @param input the raw, unvalidated company-profile edit form input.
 * @returns the saved profile, or a stable error code.
 */
export async function updateCompanyProfile(
  input: CompanyProfileInput,
): Promise<UpdateCompanyProfileResult> {
  let parsed: CompanyProfileInput;
  try {
    parsed = companyProfileSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  // An omitted or blanked-out phone field is stored as `null`, not as an
  // empty string, so "no phone recorded" has one representation (AD-031's
  // "no invented placeholder value" reasoning, applied to this one field).
  const phone =
    parsed.phone === undefined || parsed.phone === "" ? null : parsed.phone;

  try {
    const profile = await repository.upsertCompanyProfile({
      legalName: parsed.legalName,
      siret: parsed.siret,
      street: parsed.street,
      postalCode: parsed.postalCode,
      city: parsed.city,
      email: parsed.email,
      phone,
    });
    revalidatePath("/settings");
    return { ok: true, data: profile };
  } catch (error) {
    log.error({ err: error }, "failed to update company profile");
    return { ok: false, error: "SAVE_FAILED" };
  }
}

/**
 * Updates the five editable application settings in one transaction.
 * `roundingDirection` is not accepted here - D-05 fixes it and it is never
 * entered by the user. No role required (D-40, no login in V1).
 *
 * @param input the raw, unvalidated application-settings edit form input.
 * @returns every current setting (including the fixed `rounding_direction`),
 * or a stable error code.
 */
export async function updateAppSettings(
  input: AppSettingsForm,
): Promise<UpdateAppSettingsResult> {
  let parsed: AppSettingsForm;
  try {
    parsed = appSettingsFormSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    await repository.upsertSettings(toAppSettingsStorage(parsed));
    const settings = await repository.getAllSettings();
    revalidatePath("/settings");
    return { ok: true, data: settings };
  } catch (error) {
    log.error({ err: error }, "failed to update application settings");
    return { ok: false, error: "SAVE_FAILED" };
  }
}
