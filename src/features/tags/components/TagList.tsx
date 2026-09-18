// The tags list (design v01-004 prototype, Main.dc.html): every tag with
// its label (indented to its depth in the hierarchy), its stored path, and
// its active status, an inline "Edit" button and an active `Switch` per
// row. Starts empty on first use - unlike mission categories, nothing is
// seeded here (functional spec, step 11); the operator builds the hierarchy
// from scratch.

import type { JSX } from "react";

import { ActiveToggle } from "@/components/ActiveToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { toggleTagActiveAction } from "../actions";
import type { ActiveTagOption, listTagsView } from "../queries";
import { TagFormDialog } from "./TagFormDialog";

/** One row of `listTagsView()`'s result. */
type TagRecord = Awaited<ReturnType<typeof listTagsView>>[number];

/** Skeleton fallback matching the table's three-column shape. */
export function TagListSkeleton(): JSX.Element {
  return (
    <div role="status">
      <span className="sr-only">Loading tags…</span>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tag</TableHead>
            <TableHead>Path</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }): JSX.Element {
  return (
    <Badge variant={active ? "default" : "secondary"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

/** The empty state's message, repeating "New tag" as the entry point (acceptance criterion). */
function EmptyState({
  activeTagOptions,
}: {
  activeTagOptions: readonly ActiveTagOption[];
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-muted-foreground text-sm">No tags yet.</p>
      <TagFormDialog
        mode="create"
        activeTagOptions={activeTagOptions}
        trigger={<Button>New tag</Button>}
      />
    </div>
  );
}

/**
 * Renders the tags list: the empty state, or the table of every tag,
 * indented to its depth in the hierarchy, an "Edit" action opening
 * `TagFormDialog` (pre-filled with its current parent's path, read-only),
 * and an `ActiveToggle` calling `toggleTagActiveAction` directly.
 *
 * @param props.tags every tag, already loaded by the `/referential` Server
 * Component, ordered parent-before-child - no fetch happens in this
 * component.
 * @param props.activeTagOptions every active tag, for the create dialog's
 * parent-selection control - also already loaded by the `/referential`
 * Server Component (AD-006).
 */
export function TagList({
  tags,
  activeTagOptions,
}: {
  tags: readonly TagRecord[];
  activeTagOptions: readonly ActiveTagOption[];
}): JSX.Element {
  if (tags.length === 0) {
    return <EmptyState activeTagOptions={activeTagOptions} />;
  }

  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tag</TableHead>
          <TableHead>Path</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tags.map((tag) => {
          const parent =
            tag.parentId === null ? null : tagsById.get(tag.parentId);
          const parentPath = parent?.path ?? null;

          return (
            <TableRow key={tag.id}>
              <TableCell
                className="font-medium"
                style={{ paddingLeft: `${String(tag.depth * 20 + 8)}px` }}
              >
                {tag.label}
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {tag.path}
              </TableCell>
              <TableCell>
                <StatusBadge active={tag.active} />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-3">
                  <TagFormDialog
                    mode="edit"
                    tag={tag}
                    parentPath={parentPath}
                    trigger={
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    }
                  />
                  <ActiveToggle
                    key={`${tag.id}-${tag.active}`}
                    id={tag.id}
                    active={tag.active}
                    label={tag.label}
                    action={toggleTagActiveAction}
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
