// Pure business logic for the tag hierarchy's stored `path`
// (`ai-rules/policy_architecture.md` -> Dependency rule: no Prisma, no
// React, no `next/*`). `path` is the parent's own path, `::`, then `label`,
// composed here on create and cascaded to every descendant on rename - the
// user never types `::` directly (spec's Open questions, `Tag.path`'s schema
// comment).

/** Composes a tag's stored path: the parent's own path, `::`, then `label` - or just `label` at the top level. */
export function composeTagPath(
  parentPath: string | null,
  label: string,
): string {
  return parentPath === null ? label : `${parentPath}::${label}`;
}

/** The portion of `path` before its final `::`-separated segment, or `null` when `path` is already top-level. */
function parentPathOf(path: string): string | null {
  const separatorIndex = path.lastIndexOf("::");
  return separatorIndex === -1 ? null : path.slice(0, separatorIndex);
}

/**
 * Recomputes the stored path of a renamed tag and every one of its
 * descendants, so the hierarchy never desyncs after a rename (functional
 * spec, step 13).
 *
 * `rows` is the renamed tag itself together with every one of its
 * descendants (`repository.renameTag` loads both together via one `path`
 * prefix query) - a row is recognised as the renamed tag itself when its own
 * `path` equals `oldPath` exactly, and as a descendant when its `path`
 * starts with `` `${oldPath}::` `` ; any other row is returned unchanged.
 *
 * @param oldPath the renamed tag's own path before the rename.
 * @param newLabel the renamed tag's new label.
 * @param rows the renamed tag and its descendants, each as `{ id, path }`.
 * @returns each row's `id` paired with its recomputed `path`.
 */
export function cascadeDescendantPaths(
  oldPath: string,
  newLabel: string,
  rows: { id: number; path: string }[],
): { id: number; path: string }[] {
  const newPath = composeTagPath(parentPathOf(oldPath), newLabel);
  const oldPrefix = `${oldPath}::`;
  const newPrefix = `${newPath}::`;

  return rows.map((row) => {
    if (row.path === oldPath) {
      return { id: row.id, path: newPath };
    }
    if (row.path.startsWith(oldPrefix)) {
      return { id: row.id, path: newPrefix + row.path.slice(oldPrefix.length) };
    }
    return { id: row.id, path: row.path };
  });
}
