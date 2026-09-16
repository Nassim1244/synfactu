// The `/clients` route's loading state (design v01-001, screen 4 -> States
// -> Loading), rendered by Next while the async Server Component in
// `page.tsx` awaits its data
// (`ai-rules/policy_coding_guidelines.md` -> React and Next idioms: "Loading
// ... states come from loading.tsx and error.tsx, not from a hand-rolled
// boolean").

import type { JSX } from "react";

import { ClientListSkeleton } from "@/features/clients/components/ClientList";

/**
 * Renders the client list page's loading fallback: the heading, and the
 * skeleton table in place of the list.
 *
 * @returns the fallback.
 */
export default function ClientsLoading(): JSX.Element {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Clients</h1>
      <ClientListSkeleton />
    </main>
  );
}
