// The app-wide navigation shell (design v01-001, screen 1): a persistent
// hamburger control opening a `Sheet` that lists every section that exists at
// this point in the roadmap. Mounted once in `src/app/layout.tsx` (design's
// "Decisions to confirm at G2" #1), so it applies to every route, including
// ones this feature does not add.
//
// "use client": it holds the Sheet's open/closed state and reads the current
// pathname to mark the active nav item - neither is available to a Server
// Component (`ai-rules/policy_coding_guidelines.md` -> React and Next
// idioms).

"use client";

import type { JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_ITEMS } from "./nav-items";

/**
 * Renders the sticky header holding the hamburger trigger and its Sheet.
 *
 * The hamburger is reachable by Tab from the top of any page; Enter/Space
 * opens the Sheet; Escape closes it and returns focus to the trigger - all
 * native `Sheet` (Radix `Dialog`) behaviour, nothing re-implemented (design's
 * Keyboard section).
 *
 * @returns the navigation shell.
 */
export function NavShell(): JSX.Element {
  const pathname = usePathname();

  return (
    <header className="bg-background sticky top-0 z-40 flex h-12 items-center border-b px-2">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            {/* Not shown in the design, which lists only the close affordance
                and the nav list; kept for assistive technology since Radix's
                `Dialog.Content` (which `Sheet` is built on) requires a title
                to announce the dialog's purpose. */}
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          </SheetHeader>
          <nav>
            <ul className="flex flex-col gap-1 px-4">
              {NAV_ITEMS.map((item) => {
                const isCurrent = pathname === item.href;
                return (
                  <li key={item.href}>
                    <SheetClose asChild>
                      <Link
                        href={item.href}
                        aria-current={isCurrent ? "page" : undefined}
                        className="hover:bg-muted block rounded-lg px-2.5 py-2 text-sm font-medium"
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  </li>
                );
              })}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
