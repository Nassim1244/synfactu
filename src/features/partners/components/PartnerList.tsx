// The partner list (design v01-002 prototype, screen 2): a table of every
// partner with its name and active status, and the entry point to create
// one. The row's active/inactive toggle and separate "Edit" control are
// removed (functional spec: "the inline toggle and separate Edit control are
// removed from the row"); the name is the row's click target, a `next/link`
// to `/partners/${id}`.
//
// A plain Server Component: with the row `Switch` and its `usePartnerActiveToggle`
// gone, nothing here needs client state any more
// (`ai-rules/policy_architecture.md` -> Defaults, "Server Components by
// default").

import type { JSX } from "react";
import Link from "next/link";

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

import type { listPartners } from "../queries";
import { PartnerFormDialog } from "./PartnerFormDialog";

/** One row of `listPartners()`'s result. */
type PartnerRecord = Awaited<ReturnType<typeof listPartners>>[number];

/** Skeleton fallback matching the table's two-column shape. */
export function PartnerListSkeleton(): JSX.Element {
  return (
    <div role="status">
      <span className="sr-only">Loading partners…</span>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }, (_, index) => (
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

/** The empty state's message, repeating "New partner" as the entry point (acceptance criterion). */
function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-muted-foreground text-sm">No partners yet.</p>
      <PartnerFormDialog mode="create" trigger={<Button>New partner</Button>} />
    </div>
  );
}

/**
 * Renders the partner list: the empty state, or the table of every partner -
 * as a table at and above the `md` breakpoint, and as stacked cards below it
 * (design's Responsive behaviour). Each row's name is a `Link` to its detail
 * view; no per-row status toggle or "Edit" control - both moved into the
 * detail view's edit form (functional spec).
 *
 * @param props.partners every partner, already loaded by the `/partners`
 * Server Component - no fetch happens in this component.
 */
export function PartnerList({
  partners,
}: {
  partners: readonly PartnerRecord[];
}): JSX.Element {
  if (partners.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell>
                  <Link
                    href={`/partners/${partner.id}`}
                    className="hover:underline"
                  >
                    {partner.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge active={partner.active} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {partners.map((partner) => (
          <li key={partner.id} className="rounded-xl border p-4">
            <div className="flex flex-col gap-2">
              <Link
                href={`/partners/${partner.id}`}
                className="font-medium hover:underline"
              >
                {partner.name}
              </Link>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge active={partner.active} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
