// The `/clients/[id]` route's not-found state (functional spec's unhappy
// path: "the client id does not resolve to an existing record - a not-found
// state is shown, not an error page or a blank screen"). Rendered by Next
// when `page.tsx` calls `notFound()`.

import type { JSX } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Renders the client detail page's not-found fallback, with a way back to
 * the client list.
 *
 * @returns the fallback.
 */
export default function ClientNotFound(): JSX.Element {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground text-sm">
        This client could not be found.
      </p>
      <Button asChild variant="outline">
        <Link href="/clients">Back to clients</Link>
      </Button>
    </main>
  );
}
