// The static list of sections the app-wide navigation menu offers
// (`ai-rules/policy_architecture.md` -> Structure - shared, not a domain: no
// schema, no repository). Grows one literal entry per future spec, in the
// order the functional spec's own user flow introduces them; no placeholder
// entry for a section that does not exist yet (functional spec -> Out of
// scope).

/** One entry of the navigation menu: its visible label and the route it links to. */
export type NavItem = {
  readonly label: string;
  readonly href: string;
};

/** The sections that exist in the product at this point in the roadmap. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Partners", href: "/partners" },
  { label: "Clients", href: "/clients" },
];
