// The `/partners` route (design v01-001, screen 2).
//
// An async Server Component awaiting `partners/queries.ts` directly
// (`ai-rules/policy_architecture.md` -> AD-006): no client-side fetch, and
// nothing route-specific beyond this - the nav shell is already mounted once
// in the root layout.

import type { JSX } from "react";

import { RegisterVisit } from "@/components/nav/register-visit";
import { Button } from "@/components/ui/button";
import { PartnerFormDialog } from "@/features/partners/components/PartnerFormDialog";
import { PartnerList } from "@/features/partners/components/PartnerList";
import { listPartners } from "@/features/partners/queries";

// Never prerendered. Without this, Next would treat the page as static (it
// awaits no dynamic API) and read the database once at build time - and the
// build stage of `docker/Dockerfile` runs before any volume or migrated
// database exists, and with no `DATABASE_URL` at all (`.dockerignore` keeps
// `.env` out of the build context), which would fail the build outright. See
// `src/app/api/health/route.ts` for the same reasoning.
export const dynamic = "force-dynamic";

/**
 * Renders the partner list page: its heading, the "New partner" entry point,
 * and the list itself.
 *
 * @returns the page.
 */
export default async function PartnersPage(): Promise<JSX.Element> {
  const partners = await listPartners();

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <RegisterVisit href="/partners" label="Partners" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Partners</h1>
        <PartnerFormDialog
          mode="create"
          trigger={<Button>New partner</Button>}
        />
      </div>
      <PartnerList partners={partners} />
    </main>
  );
}
