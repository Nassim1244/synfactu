// Server Actions for the tags domain.
//
// Each action, in order: schema validation (no role check to perform yet -
// V1 carries no session, D-40/AD-009), then the repository call, then
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

import * as repository from "./repository";
import {
  DuplicateTagPathError,
  InvalidTagParentError,
  TagNotFoundError,
} from "./repository";
import { renameTagLabelSchema, tagSchema, type TagInput } from "./schema";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "tags/actions" });

/**
 * The stable error codes a tag action can return.
 *
 * `"VALIDATION_ERROR"` is a defence-in-depth branch: the form validates the
 * same schema before ever calling the action, so this fires only when an
 * action is invoked directly with input the client never produced
 * (`policy_security.md` -> Threat model). `"DUPLICATE_PATH"` is the
 * label/parent combination that would produce a path identical to an
 * existing tag's - a field error on the label (functional spec, step 12).
 * `"INVALID_PARENT"` is the picked parent having been deactivated (or
 * deleted, though this feature has no hard delete) between the form loading
 * and the save - a race the client's active-only option list cannot itself
 * prevent. `"SAVE_FAILED"` covers every other failure after validation.
 */
type TagActionError =
  "VALIDATION_ERROR" | "DUPLICATE_PATH" | "INVALID_PARENT" | "SAVE_FAILED";

type CreateTagResult =
  | { ok: true; data: Awaited<ReturnType<typeof repository.createTag>> }
  | { ok: false; error: TagActionError };

type RenameTagResult =
  | { ok: true; data: Awaited<ReturnType<typeof repository.renameTag>> }
  | { ok: false; error: TagActionError };

type ToggleTagActiveResult =
  | { ok: true; data: Awaited<ReturnType<typeof repository.setTagActive>> }
  | { ok: false; error: TagActionError };

/**
 * Creates a tag, always active on creation. `parentId` is fixed at creation
 * - there is no re-parenting control in V1. No role required (D-40, no
 * login in V1).
 *
 * @param input the raw, unvalidated create form input.
 * @returns the created tag, or a stable error code.
 */
export async function createTagAction(
  input: TagInput,
): Promise<CreateTagResult> {
  let parsed: TagInput;
  try {
    parsed = tagSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const tag = await repository.createTag({
      label: parsed.label,
      parentId: parsed.parentId ?? null,
    });
    revalidatePath("/referential");
    return { ok: true, data: tag };
  } catch (error) {
    if (error instanceof DuplicateTagPathError) {
      return { ok: false, error: "DUPLICATE_PATH" };
    }
    if (error instanceof InvalidTagParentError) {
      return { ok: false, error: "INVALID_PARENT" };
    }
    log.error({ err: error }, "failed to create tag");
    return { ok: false, error: "SAVE_FAILED" };
  }
}

/** Input for `renameTagAction`: `renameTagLabelSchema`'s `label`, plus the id it is combined with here. */
const renameTagSchema = renameTagLabelSchema.extend({
  id: z.number().int().positive(),
});

/**
 * Renames a tag: updates its own label/path and cascades the new path
 * prefix to every one of its descendants (functional spec, step 13). The
 * tag's parent never changes - re-parenting is out of scope in V1. No role
 * required (D-40, no login in V1).
 *
 * @param id the tag's id.
 * @param label the tag's new label.
 * @returns the renamed tag, or a stable error code.
 */
export async function renameTagAction(
  id: number,
  label: string,
): Promise<RenameTagResult> {
  let parsed: z.infer<typeof renameTagSchema>;
  try {
    parsed = renameTagSchema.parse({ id, label });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const tag = await repository.renameTag(parsed.id, parsed.label);
    revalidatePath("/referential");
    return { ok: true, data: tag };
  } catch (error) {
    if (error instanceof DuplicateTagPathError) {
      return { ok: false, error: "DUPLICATE_PATH" };
    }
    if (error instanceof TagNotFoundError) {
      return { ok: false, error: "SAVE_FAILED" };
    }
    log.error({ err: error, tagId: parsed.id }, "failed to rename tag");
    return { ok: false, error: "SAVE_FAILED" };
  }
}

/** Input for `toggleTagActiveAction`. */
const toggleTagActiveSchema = z.object({
  id: z.number().int().positive(),
  active: z.boolean(),
});

/**
 * Toggles a tag's active status. Never touches any descendant's own active
 * flag - each tag's flag is independent (functional spec, step 14). No role
 * required (D-40, no login in V1).
 *
 * @param id the tag's id.
 * @param active the new active status.
 * @returns the updated tag, or a stable error code.
 */
export async function toggleTagActiveAction(
  id: number,
  active: boolean,
): Promise<ToggleTagActiveResult> {
  let parsed: z.infer<typeof toggleTagActiveSchema>;
  try {
    parsed = toggleTagActiveSchema.parse({ id, active });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, error: "VALIDATION_ERROR" };
    }
    throw error;
  }

  try {
    const tag = await repository.setTagActive(parsed.id, parsed.active);
    revalidatePath("/referential");
    return { ok: true, data: tag };
  } catch (error) {
    log.error(
      { err: error, tagId: parsed.id },
      "failed to toggle tag active status",
    );
    return { ok: false, error: "SAVE_FAILED" };
  }
}
