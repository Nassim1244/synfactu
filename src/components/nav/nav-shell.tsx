// The app-wide navigation shell (design v01-002 prototype, screen 1):
// composes the permanent title bar, the persistent collapsible nav rail, and
// the breadcrumb/back-forward bar. Mounted once in `src/app/layout.tsx`
// (same precedent as v01-001's `NavShell`), so it applies to every route.
// Replaces v01-001's `Sheet`/hamburger implementation entirely - not kept
// alongside.
//
// A plain Server Component: it holds no state of its own. `TitleBar` stays a
// Server Component; `NavRail` and `BreadcrumbBar` are Client Components
// mounted as children, per `ai-rules/policy_architecture.md` -> Defaults
// ("use client" pushed as far down the tree as possible).

import type { JSX, ReactNode } from "react";

import { BreadcrumbBar } from "./breadcrumb-bar";
import { NavRail } from "./nav-rail";
import { TitleBar } from "./title-bar";

/**
 * Renders the navigation shell around the routed page content: the title
 * bar on top, the nav rail on the left, and the breadcrumb/back-forward bar
 * above the page's own content.
 *
 * @param props.children the routed page content.
 * @returns the shell.
 */
export function NavShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <NavRail />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-none border-b px-6 py-3">
            <BreadcrumbBar />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
}
