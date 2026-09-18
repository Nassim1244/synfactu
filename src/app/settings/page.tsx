// The `/settings` route (design `design/v01/v01-003/`).
//
// An async Server Component awaiting `settings/queries.ts` directly
// (`ai-rules/policy_architecture.md` -> AD-006): no client-side fetch. A
// read, not a mutation, so no Server Action or Route Handler is involved
// (AD-003).

import type { JSX } from "react";

import { SettingsView } from "@/features/settings/components/SettingsView";
import {
  getAppSettingsView,
  getCompanyProfileView,
} from "@/features/settings/queries";

// Never prerendered - same reasoning as `/partners`'s own `page.tsx`: the
// build stage of `docker/Dockerfile` runs before any database exists.
export const dynamic = "force-dynamic";

/**
 * Renders the Settings page: the Company profile section and the
 * Application settings section, both read from the database on every
 * request.
 *
 * @returns the page.
 */
export default async function SettingsPage(): Promise<JSX.Element> {
  const [profile, settings] = await Promise.all([
    getCompanyProfileView(),
    getAppSettingsView(),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <SettingsView profile={profile} settings={settings} />
    </main>
  );
}
