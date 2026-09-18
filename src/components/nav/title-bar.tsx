// The permanent application title bar (design v01-002 prototype, screen 1):
// shown at all times, independent of the nav rail's collapsed/expanded
// state. Fully static, so it stays a plain Server Component even though it
// is composed alongside client siblings inside `NavShell`
// (`ai-rules/policy_architecture.md` -> Defaults, "Server Components by
// default").

import type { JSX } from "react";

/** The application's name, shown in the title bar. */
const APP_TITLE = "Synfactu";

/**
 * Renders the permanent title bar.
 *
 * @returns the title bar.
 */
export function TitleBar(): JSX.Element {
  return (
    <div className="bg-background flex h-14 flex-none items-center border-b px-6">
      <span className="font-serif text-base font-bold tracking-wide">
        {APP_TITLE}
      </span>
    </div>
  );
}
