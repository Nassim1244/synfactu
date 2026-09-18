// The only file for `MissionCategory` allowed to import the Prisma client
// (AD-004, `ai-rules/policy_architecture.md` -> Data access). Every function
// here takes and returns `MissionCategoryRecord`, a plain domain type -
// never a raw Prisma model.

import { prisma } from "@/lib/db";

/** The plain domain shape every function in this file returns. */
export type MissionCategoryRecord = {
  id: number;
  label: string;
  active: boolean;
};

/** The fields `MissionCategoryRecord` needs - shared by every read and write below. */
const MISSION_CATEGORY_SELECT = {
  id: true,
  label: true,
  active: true,
} as const;

/**
 * Every mission category, active and inactive alike, ordered by label. No
 * scoping: V1 is single-operator, nothing to scope by (D-40).
 */
export function listMissionCategories(): Promise<MissionCategoryRecord[]> {
  return prisma.missionCategory.findMany({
    orderBy: { label: "asc" },
    select: MISSION_CATEGORY_SELECT,
  });
}

/** Creates a mission category. Always active on creation (functional spec: "created active"). */
export function createMissionCategory(data: {
  label: string;
}): Promise<MissionCategoryRecord> {
  return prisma.missionCategory.create({
    data: { label: data.label, active: true },
    select: MISSION_CATEGORY_SELECT,
  });
}

/** Updates a mission category's label. */
export function updateMissionCategory(
  id: number,
  data: { label: string },
): Promise<MissionCategoryRecord> {
  return prisma.missionCategory.update({
    where: { id },
    data: { label: data.label },
    select: MISSION_CATEGORY_SELECT,
  });
}

/** Sets a mission category's active status. Deactivate-only in this feature - no hard delete. */
export function setMissionCategoryActive(
  id: number,
  active: boolean,
): Promise<MissionCategoryRecord> {
  return prisma.missionCategory.update({
    where: { id },
    data: { active },
    select: MISSION_CATEGORY_SELECT,
  });
}
