// The `/partners` route's loading state (design v01-001, screen 2 ->
// States -> Loading), rendered by Next while the async Server Component in
// `page.tsx` awaits `listPartners()`
// (`ai-rules/policy_coding_guidelines.md` -> React and Next idioms: "Loading
// ... states come from loading.tsx and error.tsx, not from a hand-rolled
// boolean").

import type { JSX } from "react";

import { PartnerListSkeleton } from "@/features/partners/components/PartnerList";

/**
 * Renders the partner list page's loading fallback: the heading, and the
 * skeleton table in place of the list.
 *
 * @returns the fallback.
 */
export default function PartnersLoading(): JSX.Element {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Partners</h1>
      <PartnerListSkeleton />
    </main>
  );
}
