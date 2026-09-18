// The `/clients/[id]` route's loading state, rendered by Next while the
// async Server Component in `page.tsx` awaits its data
// (`ai-rules/policy_coding_guidelines.md` -> React and Next idioms: "Loading
// ... states come from loading.tsx and error.tsx, not from a hand-rolled
// boolean").

import type { JSX } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Renders the client detail page's loading fallback.
 *
 * @returns the fallback.
 */
export default function ClientDetailLoading(): JSX.Element {
  return (
    <main className="flex flex-1 flex-col gap-8 p-6" role="status">
      <span className="sr-only">Loading client…</span>
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-64 w-full" />
    </main>
  );
}
