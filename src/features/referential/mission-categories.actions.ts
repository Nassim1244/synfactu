// Server Actions for `MissionCategory`.
//
// Each action, in order: `schema.parse` (no role check to perform yet - V1
// carries no session, D-40/AD-009), then the repository call, then
// `revalidatePath("/referential")`, the one route this feature is visible on
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

import * as repository from "./mission-categories.repository";
import {
  missionCategorySchema,
  type MissionCategoryInput,
} from "./mission-categories.schema";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "referential/mission-categories.actions" });

/**
 * The stable error codes a mission category action can return.
 *
 * `"VALIDATION_ERROR"` is a defence-in-depth branch: the form validates the
 * same schema before ever calling the action, so this fires only when an
 * action is invoked directly with input the client never produced
 * (`policy_security.md` -> Threat model - "assume any Server Action can be
 * invoked directly, with arbitrary arguments"). `"SAVE_FAILED"` covers every
 * failure after validation, including an id that no longer exists.
 */
type MissionCategoryActionError = "VALIDATION_ERROR" | "SAVE_FAILED";

/** Validates an id supplied alongside a form payload - never trusted without this (`policy_security.md` -> Input validation). */
const idSchema = z.number().int().positive();

type CreateMissionCategoryResult =
  | {
      ok: true;
      data: Awaited<ReturnType<typeof repository.createMissionCategory>>;
    }
  | { ok: false; error: MissionCategoryActionError };

type UpdateMissionCategoryResult =
  | {
      ok: true;
      data: Awaited<ReturnType<typeof repository.updateMissionCategory>>;
    }
  | { ok: false; error: MissionCategoryActionError };

type ToggleMissionCategoryActiveResult =
  | {
      ok: true;
      data: Awaited<ReturnType<typeof repository.setMissionCategoryActive>>;
    }
  | { ok: false; error: MissionCategoryActionError };

/**
 * Creates a mission category, always active on creation. No role required
 * (D-40, no login in V1).
 *
 * @param input the raw, unvalidated create form input.
 * @returns the created category, or a stable error code.
 */
export async function createMissionCategoryAction(
  input: MissionCategoryInput,
): Promise<CreateMissionCategoryResult> {
  let parsed: MissionCategoryInput;
  try {
    parsed = missionCategorySchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const category = await repository.createMissionCategory(parsed);
    revalidatePath("/referential");
    return { ok: true, data: category };
  } catch (error) {
    log.error({ err: error }, "failed to create mission category");
    return { ok: false, error: "SAVE_FAILED" };
  }
}

/**
 * Updates a mission category's label. No role required (D-40, no login in
 * V1).
 *
 * @param id the mission category's id.
 * @param input the raw, unvalidated edit form input.
 * @returns the updated category, or a stable error code.
 */
export async function updateMissionCategoryAction(
  id: number,
  input: MissionCategoryInput,
): Promise<UpdateMissionCategoryResult> {
  let parsedId: number;
  let parsed: MissionCategoryInput;
  try {
    parsedId = idSchema.parse(id);
    parsed = missionCategorySchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const category = await repository.updateMissionCategory(parsedId, parsed);
    revalidatePath("/referential");
    return { ok: true, data: category };
  } catch (error) {
    log.error(
      { err: error, missionCategoryId: parsedId },
      "failed to update mission category",
    );
    return { ok: false, error: "SAVE_FAILED" };
  }
}

/** Input for `toggleMissionCategoryActiveAction`. */
const toggleSchema = z.object({
  id: z.number().int().positive(),
  active: z.boolean(),
});

/**
 * Toggles a mission category's active status. Deactivate-only in this
 * feature - no hard delete. No role required (D-40, no login in V1).
 *
 * @param id the mission category's id.
 * @param active the new active status.
 * @returns the updated category, or a stable error code.
 */
export async function toggleMissionCategoryActiveAction(
  id: number,
  active: boolean,
): Promise<ToggleMissionCategoryActiveResult> {
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
    const category = await repository.setMissionCategoryActive(
      parsed.id,
      parsed.active,
    );
    revalidatePath("/referential");
    return { ok: true, data: category };
  } catch (error) {
    log.error(
      { err: error, missionCategoryId: parsed.id },
      "failed to toggle mission category active status",
    );
    return { ok: false, error: "SAVE_FAILED" };
  }
}
