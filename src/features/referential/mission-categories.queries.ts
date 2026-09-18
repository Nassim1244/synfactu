// Read functions for `MissionCategory`, called by the `/referential` async
// Server Component (AD-006). A thin wrapper over
// `mission-categories.repository.ts`: no Prisma import here (AD-004).

import * as repository from "./mission-categories.repository";

/**
 * Every mission category, active and inactive alike, ordered by label - the
 * Referential screen's Mission categories section dataset (functional spec,
 * step 2).
 */
export function listMissionCategoriesView(): ReturnType<
  typeof repository.listMissionCategories
> {
  return repository.listMissionCategories();
}
