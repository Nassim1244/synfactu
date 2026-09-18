// The client detail view (design v01-002 prototype, screen 6): the client's
// name, active/inactive status, short label, default rate, billable status,
// referring partner and default regime, all read-only, plus the entry point
// to edit it. Introduced by this feature, reversing v01-001's original
// list-only decision.

import type { JSX, ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RegisterVisit } from "@/components/nav/register-visit";
import { Money } from "@/lib/money/money";

import type { getClientById } from "../queries";
import type { listActivePartners } from "@/features/partners/queries";
import { ClientFormDialog } from "./ClientFormDialog";

/** One `getClientById` result, with its `null` case already excluded by the caller. */
type ClientWithPartner = NonNullable<Awaited<ReturnType<typeof getClientById>>>;

/** One row of `listActivePartners()`'s result - the edit dialog's referring-partner `Select` option list. */
type ActivePartner = Awaited<ReturnType<typeof listActivePartners>>[number];

function StatusBadge({ active }: { active: boolean }): JSX.Element {
  return (
    <Badge variant={active ? "default" : "secondary"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

/** "MICRO"/"PORTAGE" as their display label, or an em dash when the client has none. */
function formatRegime(regime: ClientWithPartner["regime"]): string {
  if (regime === "MICRO") {
    return "Micro";
  }
  if (regime === "PORTAGE") {
    return "Portage";
  }
  return "—";
}

/** One labelled row of the read-only field list. */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <span className="text-muted-foreground w-44 flex-none text-sm font-medium">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

/**
 * Renders the client detail view: name, status, every other read-only field
 * the functional spec lists, and the "Edit" action opening the same form
 * v01-001 defines, now also carrying the active/inactive toggle.
 *
 * @param props.client one `getClientById` result, already loaded by the
 * `/clients/[id]` Server Component - no fetch happens in this component.
 * @param props.activePartners every active partner, for the edit dialog's
 * referring-partner `Select` (same requirement as `ClientFormDialog`'s own,
 * already loaded by the route's Server Component).
 */
export function ClientDetail({
  client,
  activePartners,
}: {
  client: ClientWithPartner;
  activePartners: readonly ActivePartner[];
}): JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      <RegisterVisit href={`/clients/${client.id}`} label={client.name} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <StatusBadge active={client.active} />
        </div>
        <ClientFormDialog
          mode="edit"
          client={client}
          activePartners={activePartners}
          trigger={<Button variant="outline">Edit</Button>}
        />
      </div>

      <div className="rounded-xl border">
        <DetailRow label="Short label">{client.shortLabel}</DetailRow>
        <DetailRow label="Default rate (TJM)">
          {Money.fromCents(client.defaultRateCents).format()}
        </DetailRow>
        <DetailRow label="Billable">{client.billable ? "Yes" : "No"}</DetailRow>
        <DetailRow label="Referring partner">
          {client.partner !== null && (
            <Link
              href={`/partners/${client.partner.id}`}
              className="hover:underline"
            >
              {client.partner.name}
            </Link>
          )}
        </DetailRow>
        <DetailRow label="Default regime">
          {formatRegime(client.regime)}
        </DetailRow>
      </div>
    </div>
  );
}
