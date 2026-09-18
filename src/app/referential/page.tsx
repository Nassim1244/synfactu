// The `/referential` route (design `design/v01/v01-004/`): one screen,
// three sections - Mission categories, Portage contracts, Tags - each with
// its own list and its own "New" action.
//
// An async Server Component awaiting each entity's own `queries.ts`
// (`ai-rules/policy_architecture.md` -> AD-006): no client-side fetch, and
// nothing route-specific beyond this - the nav shell is already mounted once
// in the root layout.

import type { JSX } from "react";

import { RegisterVisit } from "@/components/nav/register-visit";
import { Button } from "@/components/ui/button";
import { MissionCategoryFormDialog } from "@/features/referential/components/mission-categories/MissionCategoryFormDialog";
import { MissionCategoryList } from "@/features/referential/components/mission-categories/MissionCategoryList";
import { PortageContractFormDialog } from "@/features/referential/components/portage-contracts/PortageContractFormDialog";
import { PortageContractList } from "@/features/referential/components/portage-contracts/PortageContractList";
import { listMissionCategoriesView } from "@/features/referential/mission-categories.queries";
import { listPortageContractsView } from "@/features/referential/portage-contracts.queries";
import { TagFormDialog } from "@/features/tags/components/TagFormDialog";
import { TagList } from "@/features/tags/components/TagList";
import {
  listActiveTagsForParentPickerView,
  listTagsView,
} from "@/features/tags/queries";

// Never prerendered. Without this, Next would treat the page as static (it
// awaits no dynamic API) and read the database once at build time - and the
// build stage of `docker/Dockerfile` runs before any volume or migrated
// database exists, and with no `DATABASE_URL` at all (`.dockerignore` keeps
// `.env` out of the build context), which would fail the build outright. See
// `src/app/api/health/route.ts` for the same reasoning.
export const dynamic = "force-dynamic";

/**
 * Renders the Referential screen: its heading, and the three sections -
 * Mission categories, Portage contracts, Tags - each with its own "New"
 * entry point and its own list.
 *
 * @returns the page.
 */
export default async function ReferentialPage(): Promise<JSX.Element> {
  const [categories, contracts, tags, activeTagOptions] = await Promise.all([
    listMissionCategoriesView(),
    listPortageContractsView(),
    listTagsView(),
    listActiveTagsForParentPickerView(),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-8 p-6">
      <RegisterVisit href="/referential" label="Referential" />
      <h1 className="text-2xl font-semibold">Referential</h1>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mission categories</h2>
          <MissionCategoryFormDialog
            mode="create"
            trigger={<Button>New mission category</Button>}
          />
        </div>
        <MissionCategoryList categories={categories} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Portage contracts</h2>
          <PortageContractFormDialog
            mode="create"
            trigger={<Button>New portage contract</Button>}
          />
        </div>
        <PortageContractList contracts={contracts} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tags</h2>
          <TagFormDialog
            mode="create"
            activeTagOptions={activeTagOptions}
            trigger={<Button>New tag</Button>}
          />
        </div>
        <TagList tags={tags} activeTagOptions={activeTagOptions} />
      </section>
    </main>
  );
}
