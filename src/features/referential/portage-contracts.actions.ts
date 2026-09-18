// Server Actions for `PortageContract`.
//
// Each action, in order: `schema.parse` (no role check to perform yet - V1
// carries no session, D-40/AD-009), then the `chargeRate` decimal-percentage
// string is converted to basis points through `Rate` (AD-007) - the one
// conversion this domain needs, kept here rather than in a `domain.ts` the
// feature slice does not list for this entity - then the repository call,
// then `revalidatePath("/referential")`
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

import * as repository from "./portage-contracts.repository";
import {
  portageContractSchema,
  type PortageContractInput,
} from "./portage-contracts.schema";
import { logger } from "@/lib/logger";
import { Rate } from "@/lib/money/rate";

const log = logger.child({ module: "referential/portage-contracts.actions" });

/**
 * The stable error codes a portage contract action can return.
 *
 * `"VALIDATION_ERROR"` is a defence-in-depth branch: the form validates the
 * same schema before ever calling the action, so this fires only when an
 * action is invoked directly with input the client never produced
 * (`policy_security.md` -> Threat model - "assume any Server Action can be
 * invoked directly, with arbitrary arguments"). `"SAVE_FAILED"` covers every
 * failure after validation, including an id that no longer exists.
 */
type PortageContractActionError = "VALIDATION_ERROR" | "SAVE_FAILED";

/** Validates an id supplied alongside a form payload - never trusted without this (`policy_security.md` -> Input validation). */
const idSchema = z.number().int().positive();

type CreatePortageContractResult =
  | {
      ok: true;
      data: Awaited<ReturnType<typeof repository.createPortageContract>>;
    }
  | { ok: false; error: PortageContractActionError };

type UpdatePortageContractResult =
  | {
      ok: true;
      data: Awaited<ReturnType<typeof repository.updatePortageContract>>;
    }
  | { ok: false; error: PortageContractActionError };

type TogglePortageContractActiveResult =
  | {
      ok: true;
      data: Awaited<ReturnType<typeof repository.setPortageContractActive>>;
    }
  | { ok: false; error: PortageContractActionError };

/** Converts the parsed form input's `chargeRate` decimal-percentage string into basis points (AD-007). */
function toRepositoryData(parsed: PortageContractInput): {
  label: string;
  companyName: string;
  chargeRateBasisPoints: number;
  validFrom: Date;
  validTo: Date | null;
} {
  return {
    label: parsed.label,
    companyName: parsed.companyName,
    chargeRateBasisPoints: Rate.fromPercent(parsed.chargeRate).toBasisPoints(),
    validFrom: parsed.validFrom,
    validTo: parsed.validTo ?? null,
  };
}

/**
 * Creates a portage contract, always active on creation. No role required
 * (D-40, no login in V1).
 *
 * @param input the raw, unvalidated create form input.
 * @returns the created contract, or a stable error code.
 */
export async function createPortageContractAction(
  input: PortageContractInput,
): Promise<CreatePortageContractResult> {
  let parsed: PortageContractInput;
  try {
    parsed = portageContractSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const contract = await repository.createPortageContract(
      toRepositoryData(parsed),
    );
    revalidatePath("/referential");
    return { ok: true, data: contract };
  } catch (error) {
    log.error({ err: error }, "failed to create portage contract");
    return { ok: false, error: "SAVE_FAILED" };
  }
}

/**
 * Updates a portage contract. Every field, including the charge rate and
 * both validity dates, is writable at any time - no field is locked once set
 * (functional spec, step 8). No role required (D-40, no login in V1).
 *
 * @param id the portage contract's id.
 * @param input the raw, unvalidated edit form input.
 * @returns the updated contract, or a stable error code.
 */
export async function updatePortageContractAction(
  id: number,
  input: PortageContractInput,
): Promise<UpdatePortageContractResult> {
  let parsedId: number;
  let parsed: PortageContractInput;
  try {
    parsedId = idSchema.parse(id);
    parsed = portageContractSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const contract = await repository.updatePortageContract(
      parsedId,
      toRepositoryData(parsed),
    );
    revalidatePath("/referential");
    return { ok: true, data: contract };
  } catch (error) {
    log.error(
      { err: error, portageContractId: parsedId },
      "failed to update portage contract",
    );
    return { ok: false, error: "SAVE_FAILED" };
  }
}

/** Input for `togglePortageContractActiveAction`. */
const toggleSchema = z.object({
  id: z.number().int().positive(),
  active: z.boolean(),
});

/**
 * Toggles a portage contract's active status. Independent of its validity
 * dates - never auto-derived from them (spec's Open questions). No role
 * required (D-40, no login in V1).
 *
 * @param id the portage contract's id.
 * @param active the new active status.
 * @returns the updated contract, or a stable error code.
 */
export async function togglePortageContractActiveAction(
  id: number,
  active: boolean,
): Promise<TogglePortageContractActiveResult> {
  let parsed: z.infer<typeof toggleSchema>;
  try {
    parsed = toggleSchema.parse({ id, active });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const contract = await repository.setPortageContractActive(
      parsed.id,
      parsed.active,
    );
    revalidatePath("/referential");
    return { ok: true, data: contract };
  } catch (error) {
    log.error(
      { err: error, portageContractId: parsed.id },
      "failed to toggle portage contract active status",
    );
    return { ok: false, error: "SAVE_FAILED" };
  }
}
