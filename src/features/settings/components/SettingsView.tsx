// The Settings screen (design `design/v01/v01-003/`): two read-only
// sections, Company profile and Application settings, each with its own
// "Edit" action - the same view/edit split already established for
// partners and clients (functional spec, step 2).

import type { JSX, ReactNode } from "react";

import { RegisterVisit } from "@/components/nav/register-visit";
import { Button } from "@/components/ui/button";

import { AppSettingsEditForm } from "./AppSettingsEditForm";
import { CompanyProfileEditForm } from "./CompanyProfileEditForm";
import type { getAppSettingsView, getCompanyProfileView } from "../queries";

/** One `getCompanyProfileView` result. */
type CompanyProfile = Awaited<ReturnType<typeof getCompanyProfileView>>;

/** One `getAppSettingsView` result. */
type AppSettings = Awaited<ReturnType<typeof getAppSettingsView>>;

/** One labelled row of a section's read-only field list. */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <span className="text-muted-foreground w-56 flex-none text-sm font-medium">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

/**
 * The Company profile section: every field read-only, blank before the
 * first save (AD-031, functional spec step 3 - "not an error or a
 * missing-record state"), plus the "Edit" action.
 */
function CompanyProfileSection({
  profile,
}: {
  profile: CompanyProfile;
}): JSX.Element {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Company profile</h2>
        <CompanyProfileEditForm
          profile={profile}
          trigger={<Button variant="outline">Edit</Button>}
        />
      </div>
      <div className="rounded-xl border">
        <DetailRow label="Legal / trading name">
          {profile.legalName ?? ""}
        </DetailRow>
        <DetailRow label="SIRET">{profile.siret ?? ""}</DetailRow>
        <DetailRow label="Street">{profile.street ?? ""}</DetailRow>
        <DetailRow label="Postal code">{profile.postalCode ?? ""}</DetailRow>
        <DetailRow label="City">{profile.city ?? ""}</DetailRow>
        <DetailRow label="Contact email">{profile.email ?? ""}</DetailRow>
        <DetailRow label="Contact phone">{profile.phone ?? ""}</DetailRow>
      </div>
    </section>
  );
}

/**
 * The Application settings section: hours per working day, the rounding
 * step, the invoice numbering pattern and the estimated micro charge rate,
 * read-only, defaulted before the first save (functional spec step 7), plus
 * the "Edit" action. The rounding direction and the coefficient-display
 * state are edit-only details and are never shown here (functional spec
 * step 5; acceptance criteria).
 */
function AppSettingsSection({
  settings,
}: {
  settings: AppSettings;
}): JSX.Element {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Application settings</h2>
        <AppSettingsEditForm
          settings={settings}
          trigger={<Button variant="outline">Edit</Button>}
        />
      </div>
      <div className="rounded-xl border">
        <DetailRow label="Hours per working day">
          {`${settings.hoursPerDay} hours`}
        </DetailRow>
        <DetailRow label="Rounding step">
          {`${String(settings.roundingStepMinutes)} minutes`}
        </DetailRow>
        <DetailRow label="Invoice numbering pattern">
          <span className="font-mono">{settings.invoiceNumberPattern}</span>
        </DetailRow>
        <DetailRow label="Estimated micro-entreprise charge rate">
          {`${settings.microEstimatedChargeRate}%`}
        </DetailRow>
      </div>
    </section>
  );
}

/**
 * Renders the Settings screen: the Company profile section, the
 * Application settings section, and each section's "Edit" action.
 *
 * @param props.profile the company profile, already loaded by the
 * `/settings` Server Component - no fetch happens in this component.
 * @param props.settings every current application setting, already loaded
 * by the `/settings` Server Component - no fetch happens in this component.
 */
export function SettingsView({
  profile,
  settings,
}: {
  profile: CompanyProfile;
  settings: AppSettings;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      <RegisterVisit href="/settings" label="Settings" />
      <h1 className="text-2xl font-semibold">Settings</h1>
      <CompanyProfileSection profile={profile} />
      <AppSettingsSection settings={settings} />
    </div>
  );
}
