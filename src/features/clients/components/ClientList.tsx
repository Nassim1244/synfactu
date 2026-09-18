// The client list (design v01-002 prototype, screen 4): a table of every
// client with its name, short label, billable status, active status and
// linked partner, and the entry point to create one. The row's active/
// inactive toggle and separate "Edit" control are removed (functional spec:
// "the inline toggle and separate Edit control are removed from the row");
// the name is the row's click target, a `next/link` to `/clients/${id}`.
//
// A plain Server Component: with the row `Switch` and its
// `useClientActiveToggle` gone, nothing here needs client state any more
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

import type { listClients } from "../queries";
import type { listActivePartners } from "@/features/partners/queries";
import { ClientFormDialog } from "./ClientFormDialog";

/** One row of `listClients()`'s result. */
type ClientRecord = Awaited<ReturnType<typeof listClients>>[number];

/** One row of `listActivePartners()`'s result - the referring-partner `Select`'s option list. */
type ActivePartner = Awaited<ReturnType<typeof listActivePartners>>[number];

/** Skeleton fallback matching the table's five-column shape (design: "5 rows × 5 columns"). */
export function ClientListSkeleton(): JSX.Element {
  return (
    <div role="status">
      <span className="sr-only">Loading clients…</span>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Short label</TableHead>
            <TableHead>Billable</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Partner</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-8" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
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

/** The empty state's message, repeating "New client" as the entry point (acceptance criterion). */
function EmptyState({
  activePartners,
}: {
  activePartners: readonly ActivePartner[];
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-muted-foreground text-sm">No clients yet.</p>
      <ClientFormDialog
        mode="create"
        activePartners={activePartners}
        trigger={<Button>New client</Button>}
      />
    </div>
  );
}

/**
 * Renders the client list: the empty state, or the table of every client -
 * as a table at and above the `md` breakpoint, and as stacked cards below it
 * (design's Responsive behaviour). Each row's name is a `Link` to its detail
 * view; no per-row status toggle or "Edit" control - both moved into the
 * detail view's edit form (functional spec).
 *
 * @param props.clients every client, already loaded by the `/clients` Server
 * Component, with its referring partner's `id`/`name` joined in - no fetch
 * happens in this component.
 * @param props.activePartners every active partner, for the create dialog's
 * referring-partner `Select` - also already loaded by the `/clients` Server
 * Component (AD-006).
 */
export function ClientList({
  clients,
  activePartners,
}: {
  clients: readonly ClientRecord[];
  activePartners: readonly ActivePartner[];
}): JSX.Element {
  if (clients.length === 0) {
    return <EmptyState activePartners={activePartners} />;
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Short label</TableHead>
              <TableHead>Billable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Partner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Link
                    href={`/clients/${client.id}`}
                    className="hover:underline"
                  >
                    {client.name}
                  </Link>
                </TableCell>
                <TableCell>{client.shortLabel}</TableCell>
                <TableCell>{client.billable ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <StatusBadge active={client.active} />
                </TableCell>
                <TableCell>{client.partner?.name ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {clients.map((client) => (
          <li key={client.id} className="rounded-xl border p-4">
            <div className="flex flex-col gap-2">
              <Link
                href={`/clients/${client.id}`}
                className="font-medium hover:underline"
              >
                {client.name}
              </Link>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Short label</span>
                <span>{client.shortLabel}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Billable</span>
                <span>{client.billable ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge active={client.active} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Partner</span>
                <span>{client.partner?.name ?? "—"}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
