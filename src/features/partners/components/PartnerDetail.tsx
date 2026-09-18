// The partner detail view (design v01-002 prototype, screen 3): the
// partner's name and active/inactive status, its linked clients (each with
// its own name and status), and the entry point to edit it. Introduced by
// this feature, reversing v01-001's original list-only decision.

import type { JSX } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RegisterVisit } from "@/components/nav/register-visit";

import type { getPartnerWithClients } from "../queries";
import { PartnerFormDialog } from "./PartnerFormDialog";

/** One `getPartnerWithClients` result, with its `null` case already excluded by the caller. */
type PartnerWithClients = NonNullable<
  Awaited<ReturnType<typeof getPartnerWithClients>>
>;

function StatusBadge({ active }: { active: boolean }): JSX.Element {
  return (
    <Badge variant={active ? "default" : "secondary"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

/** Shown in place of the linked-clients list when none is linked (functional spec unhappy path). */
function EmptyLinkedClients(): JSX.Element {
  return (
    <p className="text-muted-foreground text-sm">
      No clients linked to this partner yet.
    </p>
  );
}

/**
 * Renders the partner detail view: name, status, the linked-clients list (or
 * its empty state), and the "Edit" action opening the same form v01-001
 * defines, now also carrying the active/inactive toggle.
 *
 * @param props.partner one `getPartnerWithClients` result, already loaded by
 * the `/partners/[id]` Server Component - no fetch happens in this
 * component.
 */
export function PartnerDetail({
  partner,
}: {
  partner: PartnerWithClients;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      <RegisterVisit href={`/partners/${partner.id}`} label={partner.name} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{partner.name}</h1>
          <StatusBadge active={partner.active} />
        </div>
        <PartnerFormDialog
          mode="edit"
          partner={partner}
          trigger={<Button variant="outline">Edit</Button>}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Linked clients</h2>
        {partner.clients.length === 0 ? (
          <EmptyLinkedClients />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partner.clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Link
                      href={`/clients/${client.id}`}
                      className="hover:underline"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={client.active} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
