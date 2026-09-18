// The breadcrumb and back/forward controls (design v01-002 prototype,
// screen 1), reading the visited-history trail (AD-024). Entirely
// independent of the browser's own back/forward and address bar (functional
// spec): every control here calls `router.push` against the trail's own
// recorded `href`s, never `history.back()`/`history.forward()`.
//
// "use client": reads the navigation-history Context and the router, neither
// available to a Server Component (`ai-rules/policy_coding_guidelines.md` ->
// React and Next idioms).

"use client";

import { Fragment, type JSX } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useNavigationHistory } from "./navigation-history-context";

/**
 * The visible crumb count before collapsing to an ellipsis
 * (`design/v01-002/prototype/README.md`: "collapsing to an ellipsis plus the
 * last 4 crumbs").
 */
const MAX_VISIBLE_CRUMBS = 4;

/**
 * Renders the back/forward controls and the breadcrumb for the visited
 * screens up to and including the current one.
 *
 * @returns the bar.
 */
export function BreadcrumbBar(): JSX.Element {
  const router = useRouter();
  const {
    trail,
    index,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    goToIndex,
  } = useNavigationHistory();

  const path = trail
    .slice(0, index + 1)
    .map((entry, entryIndex) => ({ entry, entryIndex }));
  const isTruncated = path.length > MAX_VISIBLE_CRUMBS;
  const visiblePath = isTruncated ? path.slice(-MAX_VISIBLE_CRUMBS) : path;

  function handleSelect(entryIndex: number): void {
    const target = trail[entryIndex];
    if (target === undefined) {
      return;
    }
    goToIndex(entryIndex);
    router.push(target.href);
  }

  function handleGoBack(): void {
    const target = trail[index - 1];
    if (target === undefined) {
      return;
    }
    goBack();
    router.push(target.href);
  }

  function handleGoForward(): void {
    const target = trail[index + 1];
    if (target === undefined) {
      return;
    }
    goForward();
    router.push(target.href);
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Go back"
        disabled={!canGoBack}
        onClick={handleGoBack}
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Go forward"
        disabled={!canGoForward}
        onClick={handleGoForward}
      >
        <ChevronRightIcon />
      </Button>

      {visiblePath.length > 0 && (
        <>
          <span aria-hidden="true" className="bg-border mx-1 h-4 w-px" />
          <Breadcrumb>
            <BreadcrumbList className="flex-nowrap">
              {isTruncated && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbEllipsis />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              {visiblePath.map(({ entry, entryIndex }, position) => {
                const isCurrent = entryIndex === index;
                return (
                  <Fragment key={`${entry.href}-${entryIndex}`}>
                    {position > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {isCurrent ? (
                        <BreadcrumbPage>{entry.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <button
                            type="button"
                            onClick={() => handleSelect(entryIndex)}
                          >
                            {entry.label}
                          </button>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </>
      )}
    </div>
  );
}
