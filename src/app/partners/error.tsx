// The `/partners` route's error boundary (design v01-001, screen 2 -> States
// -> Error), catching a failure of the async Server Component in
// `page.tsx` (`ai-rules/policy_coding_guidelines.md` -> React and Next
// idioms). Next requires this file to be a Client Component.
//
// No internal error detail reaches the rendered message
// (`ai-rules/policy_security.md` -> Data exposure): the `error` prop is
// received but never displayed, only used to satisfy Next's error-boundary
// contract.

"use client";

import type { JSX } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Renders the partner list page's error fallback: the heading, and an Alert
 * with a "Try again" control that re-renders the segment.
 *
 * @param props.reset re-attempts rendering the route segment, supplied by
 * Next's error-boundary contract.
 * @returns the fallback.
 */
export default function PartnersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Partners</h1>
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>Partners could not be loaded.</span>
          <Button type="button" variant="outline" onClick={reset}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
}
