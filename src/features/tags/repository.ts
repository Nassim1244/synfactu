// The only file in the tags domain allowed to import the Prisma client
// (AD-004, `ai-rules/policy_architecture.md` -> Data access). Every function
// here takes and returns `TagRecord`, a plain domain type - never a raw
// Prisma model.

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

import { cascadeDescendantPaths, composeTagPath } from "./domain";

/** The plain domain shape every function in this file returns. */
export type TagRecord = {
  id: number;
  label: string;
  path: string;
  parentId: number | null;
  active: boolean;
};

/** The fields `TagRecord` needs - shared by every read and write below. */
const TAG_SELECT = {
  id: true,
  label: true,
  path: true,
  parentId: true,
  active: true,
} as const;

/** Thrown by `createTag` when `parentId` does not reference an existing active tag (`policy_security.md` -> Input validation: the server re-validates rather than trusting the client). */
export class InvalidTagParentError extends Error {}

/** Thrown by `createTag`/`renameTag` when the composed path collides with an existing tag's path - the DB's own unique-constraint violation, translated here so no Prisma error type crosses this file's boundary. */
export class DuplicateTagPathError extends Error {}

/** Thrown by `renameTag` when `id` does not resolve to an existing tag. */
export class TagNotFoundError extends Error {}

/** True when `error` is a Prisma unique-constraint violation (`P2002`), narrowed without exposing the Prisma error type past this file. */
function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Every tag, active and inactive alike, ordered by path so the hierarchy
 * renders in a stable, parent-before-child order. No scoping: V1 is
 * single-operator, nothing to scope by (D-40).
 */
export function listTags(): Promise<TagRecord[]> {
  return prisma.tag.findMany({
    orderBy: { path: "asc" },
    select: TAG_SELECT,
  });
}

/**
 * Every active tag, ordered by path - the tag form's parent-selection
 * control's option list (functional spec, step 12: "drops out of the
 * parent-selection control ... for new tags" once deactivated).
 */
export function listActiveTagsForParentPicker(): Promise<TagRecord[]> {
  return prisma.tag.findMany({
    where: { active: true },
    orderBy: { path: "asc" },
    select: TAG_SELECT,
  });
}

/**
 * Creates a tag. When `parentId` is given, its target must be an existing,
 * active tag - re-validated here rather than trusted from the client
 * (`policy_security.md` -> Input validation) - and its `path` is read to
 * compose the new tag's own path (`domain.composeTagPath`). Always active on
 * creation (functional spec: "created active").
 *
 * @throws InvalidTagParentError when `parentId` is given but does not
 * resolve to an existing active tag.
 * @throws DuplicateTagPathError when the composed path collides with an
 * existing tag's path (the DB's own unique-constraint violation) - not
 * pre-checked with a separate read, so there is no race between the check
 * and the insert.
 */
export async function createTag(data: {
  label: string;
  parentId: number | null;
}): Promise<TagRecord> {
  let parentPath: string | null = null;
  if (data.parentId !== null) {
    const parent = await prisma.tag.findUnique({
      where: { id: data.parentId },
      select: { path: true, active: true },
    });
    if (parent === null || !parent.active) {
      throw new InvalidTagParentError(
        `parentId ${String(data.parentId)} does not reference an existing active tag`,
      );
    }
    parentPath = parent.path;
  }

  const path = composeTagPath(parentPath, data.label);

  try {
    return await prisma.tag.create({
      data: { label: data.label, path, parentId: data.parentId },
      select: TAG_SELECT,
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw new DuplicateTagPathError(
        `a tag with path "${path}" already exists`,
      );
    }
    throw error;
  }
}

/**
 * Renames a tag: recomputes its own `path` and the `path` of every one of
 * its descendants (`domain.cascadeDescendantPaths`), then writes every
 * changed row in one `$transaction` so the hierarchy never partially
 * desyncs (functional spec, step 13). The tag's `parentId` never changes -
 * re-parenting is out of scope in V1.
 *
 * @throws TagNotFoundError when `id` does not resolve to an existing tag.
 * @throws DuplicateTagPathError when a recomputed path collides with an
 * existing tag's path (the DB's own unique-constraint violation).
 */
export async function renameTag(id: number, label: string): Promise<TagRecord> {
  try {
    return await prisma.$transaction(async (tx) => {
      const tag = await tx.tag.findUnique({
        where: { id },
        select: { id: true, path: true },
      });
      if (tag === null) {
        throw new TagNotFoundError(`tag ${String(id)} does not exist`);
      }

      const descendants = await tx.tag.findMany({
        where: { path: { startsWith: `${tag.path}::` } },
        select: { id: true, path: true },
      });

      const updates = cascadeDescendantPaths(tag.path, label, [
        tag,
        ...descendants,
      ]);

      for (const update of updates) {
        await tx.tag.update({
          where: { id: update.id },
          data:
            update.id === tag.id
              ? { label, path: update.path }
              : { path: update.path },
        });
      }

      const renamed = await tx.tag.findUnique({
        where: { id },
        select: TAG_SELECT,
      });
      if (renamed === null) {
        throw new TagNotFoundError(`tag ${String(id)} does not exist`);
      }
      return renamed;
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw new DuplicateTagPathError(
        `renaming tag ${String(id)} to "${label}" collides with an existing tag's path`,
      );
    }
    throw error;
  }
}

/** Sets a tag's active status. Never touches any descendant's own active flag - each tag's flag is independent (functional spec, step 14). Deactivate-only - no hard delete. */
export function setTagActive(id: number, active: boolean): Promise<TagRecord> {
  return prisma.tag.update({
    where: { id },
    data: { active },
    select: TAG_SELECT,
  });
}
