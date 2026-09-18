// The mission categories list (design v01-004 prototype, Main.dc.html):
// every category with its label and active status, an inline "Edit" button
// and an active `Switch` per row. Never empty (functional spec, step 2: the
// three bootstrap-seeded rows are always present, and there is no delete),
// so this component renders only the populated table - no empty state.

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

import { toggleMissionCategoryActiveAction } from "../../mission-categories.actions";
import type { listMissionCategoriesView } from "../../mission-categories.queries";
import { MissionCategoryFormDialog } from "./MissionCategoryFormDialog";

/** One row of `listMissionCategoriesView()`'s result. */
type MissionCategoryRecord = Awaited<
  ReturnType<typeof listMissionCategoriesView>
>[number];

/** Skeleton fallback matching the table's two-column shape (the three bootstrap rows, so nothing else is ever shown before the first load). */
export function MissionCategoryListSkeleton(): JSX.Element {
  return (
    <div role="status">
      <span className="sr-only">Loading mission categories…</span>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-32" />
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

/**
 * Renders the mission categories table: every category, its status, an
 * "Edit" action opening `MissionCategoryFormDialog`, and an `ActiveToggle`
 * calling `toggleMissionCategoryActiveAction` directly.
 *
 * @param props.categories every mission category, already loaded by the
 * `/referential` Server Component - no fetch happens in this component.
 */
export function MissionCategoryList({
  categories,
}: {
  categories: readonly MissionCategoryRecord[];
}): JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Label</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell className="font-medium">{category.label}</TableCell>
            <TableCell>
              <StatusBadge active={category.active} />
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-3">
                <MissionCategoryFormDialog
                  mode="edit"
                  category={category}
                  trigger={
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  }
                />
                <ActiveToggle
                  key={`${category.id}-${category.active}`}
                  id={category.id}
                  active={category.active}
                  label={category.label}
                  action={toggleMissionCategoryActiveAction}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
