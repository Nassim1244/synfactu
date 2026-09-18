// The `/partners/[id]` route (design v01-002 prototype, screen 3).
//
// An async Server Component awaiting `partners/queries.ts` directly
// (`ai-rules/policy_architecture.md` -> AD-006): no client-side fetch. A
// read, not a mutation, so no Server Action or Route Handler is involved
// (AD-003).

import type { JSX } from "react";
import { notFound } from "next/navigation";

import { PartnerDetail } from "@/features/partners/components/PartnerDetail";
import { getPartnerWithClients } from "@/features/partners/queries";

// Never prerendered - same reasoning as `/partners`'s own `page.tsx`: the
// build stage of `docker/Dockerfile` runs before any database exists.
export const dynamic = "force-dynamic";

/**
 * Renders the partner detail page for the `[id]` route param.
 *
 * `id` is parsed defensively (`policy_security.md` -> Threat model: "assume
 * ... arbitrary arguments" - an `id` is client-suppliable via the URL):
 * anything that is not a positive integer, or that does not resolve to an
 * existing partner, renders the route's `not-found.tsx` rather than an error
 * page or a blank screen (functional spec's unhappy path).
 *
 * @param props.params the route params, resolved to `{ id }`.
 * @returns the page.
 */
export default async function PartnerDetailPage({
  params,
}: PageProps<"/partners/[id]">): Promise<JSX.Element> {
  const { id } = await params;
  const partnerId = Number(id);
  if (!Number.isInteger(partnerId) || partnerId <= 0) {
    notFound();
  }

  const partner = await getPartnerWithClients(partnerId);
  if (partner === null) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <PartnerDetail partner={partner} />
    </main>
  );
}
