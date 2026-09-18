// The portage contracts list (design v01-004 prototype, Main.dc.html):
// every contract with its label, company, charge rate and validity period,
// an inline "Edit" button and an active `Switch` per row. Starts empty on
// first use - unlike mission categories, nothing is seeded here (functional
// spec, step 6).

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

import { togglePortageContractActiveAction } from "../../portage-contracts.actions";
import type { listPortageContractsView } from "../../portage-contracts.queries";
import { PortageContractFormDialog } from "./PortageContractFormDialog";

/** One row of `listPortageContractsView()`'s result. */
type PortageContractRecord = Awaited<
  ReturnType<typeof listPortageContractsView>
>[number];

/** Skeleton fallback matching the table's five-column shape. */
export function PortageContractListSkeleton(): JSX.Element {
  return (
    <div role="status">
      <span className="sr-only">Loading portage contracts…</span>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Validity</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 2 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12" />
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

/** `"2024-01-01 – 2023-12-31"`-style validity text, or "Open-ended" when there is no end date. */
function formatValidity(validFrom: string, validTo: string | null): string {
  return `${validFrom} – ${validTo ?? "Open-ended"}`;
}

/** The empty state's message, repeating "New portage contract" as the entry point (acceptance criterion). */
function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-muted-foreground text-sm">No portage contracts yet.</p>
      <PortageContractFormDialog
        mode="create"
        trigger={<Button>New portage contract</Button>}
      />
    </div>
  );
}

/**
 * Renders the portage contracts list: the empty state, or the table of
 * every contract, its charge rate and validity period, an "Edit" action
 * opening `PortageContractFormDialog`, and an `ActiveToggle` calling
 * `togglePortageContractActiveAction` directly.
 *
 * @param props.contracts every portage contract, already loaded by the
 * `/referential` Server Component - no fetch happens in this component.
 */
export function PortageContractList({
  contracts,
}: {
  contracts: readonly PortageContractRecord[];
}): JSX.Element {
  if (contracts.length === 0) {
    return <EmptyState />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Label</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead>Validity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts.map((contract) => (
          <TableRow key={contract.id}>
            <TableCell className="font-medium">{contract.label}</TableCell>
            <TableCell className="text-muted-foreground">
              {contract.companyName}
            </TableCell>
            <TableCell>{contract.chargeRatePercent} %</TableCell>
            <TableCell className="text-muted-foreground">
              {formatValidity(contract.validFrom, contract.validTo)}
            </TableCell>
            <TableCell>
              <StatusBadge active={contract.active} />
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-3">
                <PortageContractFormDialog
                  mode="edit"
                  contract={contract}
                  trigger={
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  }
                />
                <ActiveToggle
                  key={`${contract.id}-${contract.active}`}
                  id={contract.id}
                  active={contract.active}
                  label={contract.label}
                  action={togglePortageContractActiveAction}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
