// The partner list (design v01-001, screen 2): a table of every partner with
// its name and active status, the entry point to create one, and the
// row-level controls to edit or toggle a partner's active status.
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

import { setPartnerActive } from "../actions";
import type { listPartners } from "../queries";
import { PartnerFormDialog } from "./PartnerFormDialog";

/** One row of `listPartners()`'s result. */
type PartnerRecord = Awaited<ReturnType<typeof listPartners>>[number];

/**
 * The row-level active toggle: `useTransition` around `setPartnerActive`,
 * plus a dismissible error message on failure.
 *
 * The `Switch` is bound to `partner.active` from the prop, never to local
 * state, which is what makes this non-optimistic by construction: nothing
 * flips until `revalidatePath` refreshes the page's data and a new `partner`
 * prop flows back down (design's Saving/saved state, AD-006's note).
 */
function usePartnerActiveToggle(partner: PartnerRecord): {
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
      const result = await setPartnerActive({
        id: partner.id,
        active: nextActive,
      });
      if (!result.ok) {
        setError(`Could not update ${partner.name}. Try again.`);
      }
    });
  }

  function dismissError(): void {
    setError(null);
  }

  return { isPending, error, dismissError, handleToggle };
}

/** Skeleton fallback matching the table's three-column shape (design: "5 skeleton body rows"). */
export function PartnerListSkeleton(): JSX.Element {
  return (
    <div role="status">
      <span className="sr-only">Loading partners…</span>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
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
                <Skeleton className="h-5 w-16" />
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

function PartnerRowActions({
  partner,
}: {
  partner: PartnerRecord;
}): JSX.Element {
  const { isPending, error, dismissError, handleToggle } =
    usePartnerActiveToggle(partner);

  return (
    <div>
      <div className="flex items-center gap-2">
        <PartnerFormDialog
          mode="edit"
          partner={partner}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Edit ${partner.name}`}
            >
              Edit
            </Button>
          }
        />
        <Switch
          checked={partner.active}
          onCheckedChange={handleToggle}
          disabled={isPending}
          aria-label={
            partner.active
              ? `Deactivate ${partner.name}`
              : `Reactivate ${partner.name}`
          }
        />
      </div>
      {error !== null && (
        <ToggleError message={error} onDismiss={dismissError} />
      )}
    </div>
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
 * Renders the partner list: the empty state, or the table of every partner
 * with its Edit control and active `Switch` - as a table at and above the
 * `md` breakpoint, and as stacked cards below it (design's Responsive
 * behaviour).
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
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell>{partner.name}</TableCell>
                <TableCell>
                  <StatusBadge active={partner.active} />
                </TableCell>
                <TableCell>
                  <PartnerRowActions partner={partner} />
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
              <span className="font-medium">{partner.name}</span>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge active={partner.active} />
              </div>
            </div>
            <div className="mt-3 border-t pt-3">
              <PartnerRowActions partner={partner} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
