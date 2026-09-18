// Zod schemas for every input crossing the server boundary for `Tag`
// (`ai-rules/policy_architecture.md` -> Structure). `parentId` is fixed at
// creation - there is no re-parenting control in V1 (functional spec, step
// 13) - so only `createTagAction` uses it; `renameTagAction` combines
// `renameTagLabelSchema` below with an `id` (see `actions.ts`).

import { z } from "zod";

/**
 * Input for `createTagAction`: a non-empty, trimmed label and an optional
 * parent tag id. The server re-validates that `parentId`, when given,
 * references an existing active tag (`repository.createTag`) rather than
 * trusting the parent-picker's own active-only option list
 * (`policy_security.md` -> Input validation).
 */
export const tagSchema = z.object({
  label: z.string().trim().min(1, "Label is required."),
  parentId: z.number().int().positive().optional(),
});

export type TagInput = z.infer<typeof tagSchema>;

/**
 * The `label` half of `tagSchema`, shared by `renameTagAction` (combined
 * with an `id` there, `actions.ts`) and the edit form's `zodResolver`
 * (`ai-rules/policy_coding_guidelines.md` -> Forms: "the same schema the
 * Server Action parses"), so the two never drift apart.
 */
export const renameTagLabelSchema = tagSchema.pick({ label: true });

export type RenameTagLabelInput = z.infer<typeof renameTagLabelSchema>;
