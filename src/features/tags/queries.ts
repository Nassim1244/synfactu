// Read functions for the tags domain, called by the `/referential` async
// Server Component and, cross-feature, by whichever later spec first reads a
// tag (the time entry journal, RM-005) - the cross-feature read surface
// `ai-rules/policy_architecture.md` -> Dependency rule names. Thin wrappers
// over `repository.ts`: no Prisma import here (AD-004).

import * as repository from "./repository";

/** The Referential screen's Tags section row shape: `depth` is derived from `path` for the list's indentation (functional spec, step 11 - "its position in the hierarchy, derived from its stored path"). */
export type TagView = {
  id: number;
  label: string;
  path: string;
  parentId: number | null;
  depth: number;
  active: boolean;
};

/** How many `::`-separated segments precede the tag's own label in `path` - 0 for a top-level tag. */
function depthOf(path: string): number {
  return path.split("::").length - 1;
}

/**
 * Every tag, active and inactive alike, ordered by path so the hierarchy
 * renders in a stable, parent-before-child order - the Referential screen's
 * Tags section dataset (functional spec, step 11).
 */
export async function listTagsView(): Promise<TagView[]> {
  const tags = await repository.listTags();
  return tags.map((tag) => ({
    id: tag.id,
    label: tag.label,
    path: tag.path,
    parentId: tag.parentId,
    depth: depthOf(tag.path),
    active: tag.active,
  }));
}

/** One option of the tag form's parent-selection control. */
export type ActiveTagOption = {
  id: number;
  path: string;
};

/**
 * Every active tag, ordered by path - the tag form's parent-selection
 * control's option list (functional spec, step 12); also the cross-feature
 * read surface a later spec (time entries, RM-005) will import.
 */
export async function listActiveTagsForParentPickerView(): Promise<
  ActiveTagOption[]
> {
  const tags = await repository.listActiveTagsForParentPicker();
  return tags.map((tag) => ({ id: tag.id, path: tag.path }));
}
