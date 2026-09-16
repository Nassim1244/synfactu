// The client list (design v01-001, screen 4): a table of every client with
// its name, short label, billable status, active status and linked partner,
// the entry point to create one, and the row-level controls to edit or
// toggle a client's active status.
//
// "use client": the row-level `Switch` needs `useTransition` and local
// pending/error state, and per AD-006's own note this is plain local state
// around the Server Action call, not an optimistic update - nothing flips
// before the response (`ai-rules/policy_architecture.md` -> AD-006).

"use client";

import { useState, useTransition, type JSX } from "react";
import { XIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { setClientActive } from "../actions";
import type { listClients } from "../queries";
import type { listActivePartners } from "@/features/partners/queries";
import { ClientFormDialog } from "./ClientFormDialog";

/** One row of `listClients()`'s result. */
type ClientRecord = Awaited<ReturnType<typeof listClients>>[number];

/** One row of `listActivePartners()`'s result - the referring-partner `Select`'s option list. */
type ActivePartner = Awaited<ReturnType<typeof listActivePartners>>[number];

/**
 * The row-level active toggle: `useTransition` around `setClientActive`,
 * plus a dismissible error message on failure. See `PartnerList`'s own
 * `usePartnerActiveToggle` for the identical, non-optimistic reasoning.
 */
function useClientActiveToggle(client: ClientRecord): {
  isPending: boolean;
  error: string | null;
  dismissError: () => void;
  handleToggle: (nextActive: boolean) => void;
} {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(nextActive: boolean): void {
    setError(null);
    startTransition(async () => {
      const result = await setClientActive({
        id: client.id,
        active: nextActive,
      });
      if (!result.ok) {
        setError(`Could not update ${client.name}. Try again.`);
      }
    });
  }

  function dismissError(): void {
    setError(null);
  }

  return { isPending, error, dismissError, handleToggle };
}

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
            <TableHead>Actions</TableHead>
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
              <TableCell>
                <Skeleton className="h-7 w-20" />
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

function ToggleError({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}): JSX.Element {
  return (
    <Alert variant="destructive" className="mt-2">
      <AlertDescription className="flex items-center justify-between gap-2">
        <span>{message}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          <XIcon />
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function ClientRowActions({
  client,
  activePartners,
}: {
  client: ClientRecord;
  activePartners: readonly ActivePartner[];
}): JSX.Element {
  const { isPending, error, dismissError, handleToggle } =
    useClientActiveToggle(client);

  return (
    <div>
      <div className="flex items-center gap-2">
        <ClientFormDialog
          mode="edit"
          client={client}
          activePartners={activePartners}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Edit ${client.name}`}
            >
              Edit
            </Button>
          }
        />
        <Switch
          checked={client.active}
          onCheckedChange={handleToggle}
          disabled={isPending}
          aria-label={
            client.active
              ? `Deactivate ${client.name}`
              : `Reactivate ${client.name}`
          }
        />
      </div>
      {error !== null && (
        <ToggleError message={error} onDismiss={dismissError} />
      )}
    </div>
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
 * Renders the client list: the empty state, or the table of every client
 * with its Edit control and active `Switch` - as a table at and above the
 * `md` breakpoint, and as stacked cards below it (design's Responsive
 * behaviour).
 *
 * @param props.clients every client, already loaded by the `/clients` Server
 * Component, with its referring partner's `id`/`name` joined in - no fetch
 * happens in this component.
 * @param props.activePartners every active partner, for the edit dialog's
 * and the create dialog's referring-partner `Select` - also already loaded
 * by the `/clients` Server Component (AD-006).
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
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>{client.name}</TableCell>
                <TableCell>{client.shortLabel}</TableCell>
                <TableCell>{client.billable ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <StatusBadge active={client.active} />
                </TableCell>
                <TableCell>{client.partner?.name ?? "—"}</TableCell>
                <TableCell>
                  <ClientRowActions
                    client={client}
                    activePartners={activePartners}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {clients.map((client) => (
          <li key={client.id} className="rounded-xl border p-4">
            <div className="flex flex-col gap-2">
              <span className="font-medium">{client.name}</span>
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
            <div className="mt-3 border-t pt-3">
              <ClientRowActions
                client={client}
                activePartners={activePartners}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
