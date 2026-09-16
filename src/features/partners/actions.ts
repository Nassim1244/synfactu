// Server Actions for the partners domain.
//
// Each action, in order: `schema.parse` (no role check to perform yet - V1
// carries no session, AD-017), then the repository call, then
// `revalidatePath` for every route the change is visible on
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
import {
  createPartnerSchema,
  setPartnerActiveSchema,
  updatePartnerSchema,
  type CreatePartner,
  type SetPartnerActive,
  type UpdatePartner,
} from "./schema";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "partners/actions" });

/**
 * The stable error codes a partner action can return.
 *
 * `"VALIDATION_ERROR"` is a defence-in-depth branch: the form validates the
 * same schema before ever calling the action, so this fires only when an
 * action is invoked directly with input the client never produced
 * (`policy_security.md` -> Threat model - "assume any Server Action can be
 * invoked directly, with arbitrary arguments"). `"SAVE_FAILED"` covers every
 * failure after validation, including a record that no longer exists.
 */
type PartnerActionError = "VALIDATION_ERROR" | "SAVE_FAILED";

type CreatePartnerResult =
  | { ok: true; data: Awaited<ReturnType<typeof repository.createPartner>> }
  | { ok: false; error: PartnerActionError };

type UpdatePartnerResult =
  | { ok: true; data: Awaited<ReturnType<typeof repository.updatePartner>> }
  | { ok: false; error: PartnerActionError };

type SetPartnerActiveResult =
  | {
      ok: true;
      data: Awaited<ReturnType<typeof repository.setPartnerActive>>;
    }
  | { ok: false; error: PartnerActionError };

/**
 * Creates a partner, always active on creation. No role required (AD-017).
 *
 * @param input the raw, unvalidated create-partner form input.
 * @returns the created partner, or a stable error code.
 */
export async function createPartner(
  input: CreatePartner,
): Promise<CreatePartnerResult> {
  let parsed: CreatePartner;
  try {
    parsed = createPartnerSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const partner = await repository.createPartner(parsed);
    revalidatePath("/partners");
    return { ok: true, data: partner };
  } catch (error) {
    log.error({ err: error }, "failed to create partner");
    return { ok: false, error: "SAVE_FAILED" };
  }
}

/**
 * Updates a partner's name and active status. No role required (AD-017).
 *
 * Revalidates `/partners` and `/clients`: a renamed or reactivated partner is
 * embedded in the client list's Partner column.
 *
 * @param input the raw, unvalidated edit-partner form input.
 * @returns the updated partner, or a stable error code.
 */
export async function updatePartner(
  input: UpdatePartner,
): Promise<UpdatePartnerResult> {
  let parsed: UpdatePartner;
  try {
    parsed = updatePartnerSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const partner = await repository.updatePartner(parsed.id, {
      name: parsed.name,
      active: parsed.active,
    });
    revalidatePath("/partners");
    revalidatePath("/clients");
    return { ok: true, data: partner };
  } catch (error) {
    log.error({ err: error, partnerId: parsed.id }, "failed to update partner");
    return { ok: false, error: "SAVE_FAILED" };
  }
}

/**
 * Flips a partner's active status from the list row's `Switch`. No role
 * required (AD-017).
 *
 * Revalidates `/partners` and `/clients`, same reason as `updatePartner`.
 *
 * @param input the row's id and the target active value.
 * @returns the updated partner, or a stable error code.
 */
export async function setPartnerActive(
  input: SetPartnerActive,
): Promise<SetPartnerActiveResult> {
  let parsed: SetPartnerActive;
  try {
    parsed = setPartnerActiveSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const partner = await repository.setPartnerActive(parsed.id, parsed.active);
    revalidatePath("/partners");
    revalidatePath("/clients");
    return { ok: true, data: partner };
  } catch (error) {
    log.error(
      { err: error, partnerId: parsed.id },
      "failed to set partner active status",
    );
    return { ok: false, error: "SAVE_FAILED" };
  }
}
