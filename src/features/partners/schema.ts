// Zod schemas for every input crossing the server boundary in the partners
// domain (`ai-rules/policy_architecture.md` -> Structure). Each Server Action
// in `actions.ts` parses its input against one of these before touching the
// repository (AD-005).

import { z } from "zod";

/** A non-empty, trimmed partner name. Shared by create and update. */
const nameSchema = z.string().trim().min(1, "Name is required.");

/** Input for `createPartner`: a partner is always created active. */
export const createPartnerSchema = z.object({
  name: nameSchema,
});

/** Input for `updatePartner`: the full editable shape of an existing partner. */
export const updatePartnerSchema = z.object({
  id: z.number().int().positive(),
  name: nameSchema,
  active: z.boolean(),
});

export type CreatePartner = z.infer<typeof createPartnerSchema>;
export type UpdatePartner = z.infer<typeof updatePartnerSchema>;
