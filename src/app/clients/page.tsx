// The `/clients` route (design v01-001, screen 4).
//
// An async Server Component awaiting `clients/queries.ts` and, cross-feature,
// `partners/queries.ts` for the referring-partner `Select`'s option list
// (`ai-rules/policy_architecture.md` -> AD-006, and Dependency rule: cross-
// feature access goes through the other feature's `queries.ts`). No
// client-side fetch, and nothing route-specific beyond this - the nav shell
// is already mounted once in the root layout.

import type { JSX } from "react";

import { Button } from "@/components/ui/button";
import { ClientFormDialog } from "@/features/clients/components/ClientFormDialog";
import { ClientList } from "@/features/clients/components/ClientList";
import { listClients } from "@/features/clients/queries";
import { listActivePartners } from "@/features/partners/queries";

// Never prerendered. Without this, Next would treat the page as static (it
// awaits no dynamic API) and read the database once at build time - and the
// build stage of `docker/Dockerfile` runs before any volume or migrated
// database exists, and with no `DATABASE_URL` at all (`.dockerignore` keeps
// `.env` out of the build context), which would fail the build outright. See
// `src/app/api/health/route.ts` for the same reasoning.
export const dynamic = "force-dynamic";

/**
 * Renders the client list page: its heading, the "New client" entry point,
 * and the list itself.
 *
 * @returns the page.
 */
export default async function ClientsPage(): Promise<JSX.Element> {
  const [clients, activePartners] = await Promise.all([
    listClients(),
    listActivePartners(),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <ClientFormDialog
          mode="create"
          activePartners={activePartners}
          trigger={<Button>New client</Button>}
        />
      </div>
      <ClientList clients={clients} activePartners={activePartners} />
    </main>
  );
}
