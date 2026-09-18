// The `/partners/[id]` route's not-found state (functional spec's unhappy
// path: "the partner id does not resolve to an existing record - a
// not-found state is shown, not an error page or a blank screen"). Rendered
// by Next when `page.tsx` calls `notFound()`.

import type { JSX } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Renders the partner detail page's not-found fallback, with a way back to
 * the partner list.
 *
 * @returns the fallback.
 */
export default function PartnerNotFound(): JSX.Element {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-muted-foreground text-sm">
        This partner could not be found.
      </p>
      <Button asChild variant="outline">
        <Link href="/partners">Back to partners</Link>
      </Button>
    </main>
  );
}
