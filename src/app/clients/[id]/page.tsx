// The `/clients/[id]` route (design v01-002 prototype, screen 6).
//
// An async Server Component awaiting `clients/queries.ts` and, cross-
// feature, `partners/queries.ts` for the edit dialog's referring-partner
// `Select` option list (`ai-rules/policy_architecture.md` -> AD-006, and
// Dependency rule: cross-feature access goes through the other feature's
// `queries.ts`). A read, not a mutation, so no Server Action or Route
// Handler is involved (AD-003).

import type { JSX } from "react";
import { notFound } from "next/navigation";

import { ClientDetail } from "@/features/clients/components/ClientDetail";
import { getClientById } from "@/features/clients/queries";
import { listActivePartners } from "@/features/partners/queries";

// Never prerendered - same reasoning as `/clients`'s own `page.tsx`: the
// build stage of `docker/Dockerfile` runs before any database exists.
export const dynamic = "force-dynamic";

/**
 * Renders the client detail page for the `[id]` route param.
 *
 * `id` is parsed defensively (`policy_security.md` -> Threat model: "assume
 * ... arbitrary arguments" - an `id` is client-suppliable via the URL):
 * anything that is not a positive integer, or that does not resolve to an
 * existing client, renders the route's `not-found.tsx` rather than an error
 * page or a blank screen (functional spec's unhappy path).
 *
 * @param props.params the route params, resolved to `{ id }`.
 * @returns the page.
 */
export default async function ClientDetailPage({
  params,
}: PageProps<"/clients/[id]">): Promise<JSX.Element> {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    notFound();
  }

  const [client, activePartners] = await Promise.all([
    getClientById(clientId),
    listActivePartners(),
  ]);
  if (client === null) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <ClientDetail client={client} activePartners={activePartners} />
    </main>
  );
}
