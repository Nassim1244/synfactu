// A tiny client leaf that registers its screen into the visited-history
// trail (AD-024). Exists so a Server Component page/detail view can drop in
// visit-tracking without itself becoming a Client Component
// (`ai-rules/policy_architecture.md` -> Defaults, "`use client` ... pushed as
// far down the tree as possible").
//
// "use client": `useEffect` and the context hook are unavailable to a Server
// Component.

"use client";

import { useEffect } from "react";

import { useNavigationHistory } from "./navigation-history-context";

/**
 * Registers `href`/`label` as the screen currently visited, once on mount
 * and again whenever either changes (e.g. the same route re-rendering with a
 * changed record name). Renders nothing.
 *
 * @param props.href the route of the screen being registered.
 * @param props.label the crumb label for that screen, taken from the data
 * already loaded for this render - no separate fetch.
 */
export function RegisterVisit({
  href,
  label,
}: {
  href: string;
  label: string;
}): null {
  const { registerVisit } = useNavigationHistory();

  useEffect(() => {
    registerVisit(href, label);
  }, [href, label, registerVisit]);

  return null;
}
