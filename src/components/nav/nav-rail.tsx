// The persistent, collapsible navigation rail (design v01-002 prototype,
// screen 1): every section link, visible on every route without the user
// opening it, collapsible to an icon-only width and back.
//
// "use client": it holds the collapsed/expanded state locally (`useState`,
// not persisted - functional spec: "resets to its default every time the
// application loads") and reads the current pathname to mark the active nav
// item - neither is available to a Server Component
// (`ai-rules/policy_coding_guidelines.md` -> React and Next idioms).

"use client";

import { useState, type JSX } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

/**
 * Renders the navigation rail: the collapse/expand control and every section
 * link, its current item visually distinguished in both the collapsed and
 * expanded state.
 *
 * @returns the rail.
 */
export function NavRail(): JSX.Element {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "bg-sidebar border-sidebar-border flex flex-none flex-col gap-2 border-r p-3 transition-[width] duration-150 ease-in-out",
        collapsed ? "w-[72px]" : "w-[232px]",
      )}
    >
      <div
        className={cn(
          "flex pb-2",
          collapsed ? "justify-center" : "justify-end",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          onClick={() => setCollapsed((value) => !value)}
        >
          <ChevronLeftIcon
            className={cn("transition-transform", collapsed && "rotate-180")}
          />
        </Button>
      </div>

      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isCurrent =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                title={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium",
                  collapsed && "justify-center",
                  isCurrent
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-5 flex-none" aria-hidden="true" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
