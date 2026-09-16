// Server Actions for the clients domain.
//
// Each action, in order: `schema.parse` (no role check to perform yet - V1
// carries no session, AD-017), then the repository call, then
// `revalidatePath("/clients")` (`ai-rules/policy_architecture.md` -> Server
// boundary).
//
// Every action returns `{ ok: true, data }` or `{ ok: false, error }`, never
// throws for an expected failure, and never returns a raw Prisma/DB error
// message - `error` is one of the stable codes below
// (`ai-rules/policy_coding_guidelines.md` -> Error handling and logging,
// `ai-rules/policy_security.md` -> Data exposure). This is also how an
// unknown/invalid `partnerId` is handled: the repository lets SQLite's own
// foreign-key constraint reject it, and the single catch block below turns
// that failure into the same generic `"SAVE_FAILED"` code every other
// post-validation failure gets, never the raw constraint name
// (`ai-rules/decisions.md` -> AD-021's spec, Validation section).

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import * as repository from "./repository";
import {
  createClientSchema,
  setClientActiveSchema,
  updateClientSchema,
  type CreateClient,
  type SetClientActive,
  type UpdateClient,
} from "./schema";
import { Money } from "@/lib/money/money";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "clients/actions" });

/**
 * The stable error codes a client action can return.
 *
 * `"VALIDATION_ERROR"` is a defence-in-depth branch: the form validates the
 * same schema before ever calling the action, so this fires only when an
 * action is invoked directly with input the client never produced
 * (`policy_security.md` -> Threat model). `"SAVE_FAILED"` covers every
 * failure after validation, including an unknown/invalid `partnerId` and a
 * record that no longer exists.
 */
type ClientActionError = "VALIDATION_ERROR" | "SAVE_FAILED";

type CreateClientResult =
  | { ok: true; data: Awaited<ReturnType<typeof repository.createClient>> }
  | { ok: false; error: ClientActionError };

type UpdateClientResult =
  | { ok: true; data: Awaited<ReturnType<typeof repository.updateClient>> }
  | { ok: false; error: ClientActionError };

type SetClientActiveResult =
  | { ok: true; data: Awaited<ReturnType<typeof repository.setClientActive>> }
  | { ok: false; error: ClientActionError };

/**
 * Creates a client, always active on creation. No role required (AD-017).
 *
 * `defaultRate` reaches this action as the form's decimal string; it is
 * converted to cents through `Money.fromDecimalString` here, at the action
 * layer, before the repository ever sees an integer (AD-007).
 *
 * @param input the raw, unvalidated create-client form input.
 * @returns the created client (with its referring partner joined in), or a
 * stable error code.
 */
export async function createClient(
  input: CreateClient,
): Promise<CreateClientResult> {
  let parsed: CreateClient;
  try {
    parsed = createClientSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const client = await repository.createClient({
      name: parsed.name,
      shortLabel: parsed.shortLabel,
      billable: parsed.billable,
      defaultRateCents: Money.fromDecimalString(parsed.defaultRate).toCents(),
      regime: parsed.regime ?? null,
      partnerId: parsed.partnerId ?? null,
    });
    revalidatePath("/clients");
    return { ok: true, data: client };
  } catch (error) {
    log.error({ err: error }, "failed to create client");
    return { ok: false, error: "SAVE_FAILED" };
  }
}

/**
 * Updates every editable field of an existing client, including its active
 * status, its linked partner and its default regime. No role required
 * (AD-017).
 *
 * @param input the raw, unvalidated edit-client form input.
 * @returns the updated client (with its referring partner joined in), or a
 * stable error code.
 */
export async function updateClient(
  input: UpdateClient,
): Promise<UpdateClientResult> {
  let parsed: UpdateClient;
  try {
    parsed = updateClientSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const client = await repository.updateClient(parsed.id, {
      name: parsed.name,
      shortLabel: parsed.shortLabel,
      billable: parsed.billable,
      active: parsed.active,
      defaultRateCents: Money.fromDecimalString(parsed.defaultRate).toCents(),
      regime: parsed.regime ?? null,
      partnerId: parsed.partnerId ?? null,
    });
    revalidatePath("/clients");
    return { ok: true, data: client };
  } catch (error) {
    log.error({ err: error, clientId: parsed.id }, "failed to update client");
    return { ok: false, error: "SAVE_FAILED" };
  }
}

/**
 * Flips a client's active status from the list row's `Switch`. No role
 * required (AD-017).
 *
 * @param input the row's id and the target active value.
 * @returns the updated client (with its referring partner joined in), or a
 * stable error code.
 */
export async function setClientActive(
  input: SetClientActive,
): Promise<SetClientActiveResult> {
  let parsed: SetClientActive;
  try {
    parsed = setClientActiveSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const client = await repository.setClientActive(parsed.id, parsed.active);
    revalidatePath("/clients");
    return { ok: true, data: client };
  } catch (error) {
    log.error(
      { err: error, clientId: parsed.id },
      "failed to set client active status",
    );
    return { ok: false, error: "SAVE_FAILED" };
  }
}
