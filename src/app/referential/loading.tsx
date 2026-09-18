// The `/referential` route's loading state (design `design/v01/v01-004/` ->
// States -> Loading, per-section skeleton), rendered by Next while the
// async Server Component in `page.tsx` awaits each entity's `queries.ts`
// (`ai-rules/policy_coding_guidelines.md` -> React and Next idioms: "Loading
// ... states come from loading.tsx and error.tsx, not from a hand-rolled
// boolean").

import type { JSX } from "react";

import { MissionCategoryListSkeleton } from "@/features/referential/components/mission-categories/MissionCategoryList";
import { PortageContractListSkeleton } from "@/features/referential/components/portage-contracts/PortageContractList";
import { TagListSkeleton } from "@/features/tags/components/TagList";

/**
 * Renders the Referential screen's loading fallback: the heading, and each
 * section's own skeleton table in place of its list.
 *
 * @returns the fallback.
 */
export default function ReferentialLoading(): JSX.Element {
  return (
    <main className="flex flex-1 flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Referential</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Mission categories</h2>
        <MissionCategoryListSkeleton />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Portage contracts</h2>
        <PortageContractListSkeleton />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Tags</h2>
        <TagListSkeleton />
      </section>
    </main>
  );
}
