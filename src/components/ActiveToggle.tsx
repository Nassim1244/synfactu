// The row-level active/inactive `Switch` shared by every list in the
// Referential screen - mission categories, portage contracts and tags all
// toggle the same way (design `design/v01/v01-004/prototype/` ->
// `Main.dc.html`: "each row's ... active `Switch` actually work[s]"). Lives
// in `src/components/` rather than inside `referential/` or `tags/` because
// it is used by both features (`ai-rules/policy_architecture.md` ->
// Structure: "shared application components used by two or more features").
//
// `props.action` is the raw, unbound Server Action itself, passed straight
// through from the Server Component that renders each row - never a
// `.bind()`-wrapped or hand-written closure over it. Only the original
// tagged action reference is guaranteed to survive the server/client
// serialization boundary; a closure built around it is a plain function and
// is rejected (`ai-rules/policy_coding_guidelines.md` -> React and Next
// idioms: "Never pass a function ... across the server/client boundary ...
// unless it is a Server Action"). `id` crosses as plain, serializable data,
// and this component calls `action(id, nextActive)` itself once mounted on
// the client.
//
// "use client": it owns the switch's optimistic value, its pending state
// while the toggle Server Action runs, and reverts on failure - none of
// which a Server Component can do
// (`ai-rules/policy_coding_guidelines.md` -> React and Next idioms).

"use client";

import { useState, useTransition, type JSX } from "react";

import { Switch } from "@/components/ui/switch";

/** The shape every `toggle*ActiveAction` shares: an id, the new active value, and a result carrying at least `ok`. */
type ToggleActiveAction = (
  id: number,
  active: boolean,
) => Promise<{ ok: boolean }>;

/**
 * Renders one row's active/inactive `Switch`: flips immediately on click
 * (optimistic), settles once `action` resolves, and reverts with an inline
 * error message if it fails.
 *
 * The caller keys this component on something that changes whenever the
 * server's own `active` value changes for reasons other than this switch
 * (e.g. `` `${row.id}-${row.active}` ``), so a value changed through the
 * entity's edit dialog remounts the switch with the fresh server value
 * instead of the switch's own optimistic state silently going stale.
 *
 * @param props.id the row's id, passed to `action` as its first argument.
 * @param props.active the row's current active status, already loaded by
 * the page's Server Component - no fetch happens on mount.
 * @param props.label the entity's own label, used to build this switch's
 * accessible name ("Deactivate X" / "Reactivate X").
 * @param props.action the entity's own `toggle*ActiveAction` Server Action,
 * called with `(id, nextActive)`; returns whether the save succeeded.
 */
export function ActiveToggle({
  id,
  active,
  label,
  action,
}: {
  id: number;
  active: boolean;
  label: string;
  action: ToggleActiveAction;
}): JSX.Element {
  const [optimisticActive, setOptimisticActive] = useState(active);
  const [hasError, setHasError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleChange(nextActive: boolean): void {
    setHasError(false);
    setOptimisticActive(nextActive);
    startTransition(() => {
      void (async () => {
        const result = await action(id, nextActive);
        if (!result.ok) {
          setOptimisticActive(!nextActive);
          setHasError(true);
        }
      })();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Switch
        checked={optimisticActive}
        disabled={isPending}
        onCheckedChange={handleChange}
        aria-label={
          optimisticActive ? `Deactivate ${label}` : `Reactivate ${label}`
        }
      />
      {hasError && (
        <span className="text-destructive text-xs">Could not save.</span>
      )}
    </div>
  );
}
