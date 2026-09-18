// The static list of sections the app-wide navigation rail offers
// (`ai-rules/policy_architecture.md` -> Structure - shared, not a domain: no
// schema, no repository). Grows one literal entry per future spec, in the
// order the functional spec's own user flow introduces them; no placeholder
// entry for a section that does not exist yet (functional spec -> Out of
// scope).

import {
  Building2,
  Settings as SettingsIcon,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * One entry of the navigation rail: its visible label, the route it links
 * to, and the icon shown in the rail's collapsed (icon-only) state
 * (`specs/iteration/v1/v01-002-nav-partner-client-detail.md` -> Feature
 * slice). The icon choice itself is a visual detail, not an architecture
 * one (spec's "Out of scope (technical)").
 */
export type NavItem = {
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
};

/** The sections that exist in the product at this point in the roadmap. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Partners", href: "/partners", icon: Users },
  { label: "Clients", href: "/clients", icon: Building2 },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];
