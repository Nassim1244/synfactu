// Zod schema for every input crossing the server boundary for
// `MissionCategory` (`ai-rules/policy_architecture.md` -> Structure). The
// same schema validates both create and edit forms - a mission category has
// only one editable field beyond its id/active status, neither of which is
// user-entered here (AD-005).

import { z } from "zod";

/** Input for `createMissionCategoryAction`/`updateMissionCategoryAction`: a non-empty, trimmed label. */
export const missionCategorySchema = z.object({
  label: z.string().trim().min(1, "Label is required."),
});

export type MissionCategoryInput = z.infer<typeof missionCategorySchema>;
