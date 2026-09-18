// Tests for `src/components/nav/breadcrumb-bar.tsx`
// (`specs/iteration/v1/v01-002-nav-partner-client-detail.md` -> Acceptance
// criteria: the breadcrumb reflects the visited sequence in order, each
// crumb returns to its screen, no duplicate crumb for the top-of-trail
// screen, the trail truncates to an ellipsis past its visible bound, and the
// back/forward controls step through the same trail, disabled at each end,
// entirely independent of the browser's own back/forward).
//
// Rendered inside the real `NavigationHistoryProvider` - the trail this bar
// reads is real, not a mock of the unit under test
// (`ai-rules/policy_testing.md` -> Relevance). Only `next/navigation`'s
// `useRouter` is mocked: it is the routing boundary this Client Component
// calls through, and asserting on it also proves independence from the
// browser's native `history.back()`/`history.forward()`, which this
// component never calls.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect, type JSX } from "react";

const mockedPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockedPush }),
}));

import {
  NavigationHistoryProvider,
  useNavigationHistory,
} from "@/components/nav/navigation-history-context";
import { BreadcrumbBar } from "@/components/nav/breadcrumb-bar";

/** One screen to visit, in order, before the assertions run. */
type Visit = { href: string; label: string };

/** Registers each of `visits`, in order, once on mount, then renders `BreadcrumbBar`. */
function Harness({ visits }: { visits: readonly Visit[] }): JSX.Element {
  const { registerVisit } = useNavigationHistory();

  useEffect(() => {
    for (const visit of visits) {
      registerVisit(visit.href, visit.label);
    }
    // Runs exactly once, replaying the whole scripted visit sequence for
    // this render - intentionally not re-run on every dependency change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <BreadcrumbBar />;
}

function renderBreadcrumbBar(visits: readonly Visit[] = []) {
  return render(
    <NavigationHistoryProvider>
      <Harness visits={visits} />
    </NavigationHistoryProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("BreadcrumbBar - empty trail", () => {
  it("renders no crumb and disables both back and forward", () => {
    renderBreadcrumbBar([]);

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Go forward" })).toBeDisabled();
  });
});

describe("BreadcrumbBar - visited sequence", () => {
  it("shows every visited screen as a crumb, in visiting order", () => {
    renderBreadcrumbBar([
      { href: "/partners", label: "Partners" },
      { href: "/partners/1", label: "Acme" },
    ]);

    const crumbs = screen.getAllByText(/Partners|Acme/);
    expect(crumbs.map((crumb) => crumb.textContent)).toEqual([
      "Partners",
      "Acme",
    ]);
  });

  it("does not add a duplicate crumb for the screen already at the top of the trail", () => {
    renderBreadcrumbBar([
      { href: "/partners/1", label: "Acme" },
      { href: "/partners/1", label: "Acme" },
    ]);

    expect(screen.getAllByText("Acme")).toHaveLength(1);
  });

  it("renders the current screen as the non-interactive last crumb", () => {
    renderBreadcrumbBar([
      { href: "/partners", label: "Partners" },
      { href: "/partners/1", label: "Acme" },
    ]);

    expect(
      screen.queryByRole("button", { name: "Acme" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Acme")).toHaveAttribute("aria-current", "page");
  });
});

describe("BreadcrumbBar - selecting a crumb", () => {
  it("navigates to the corresponding screen's href when an earlier crumb is selected", async () => {
    const user = userEvent.setup();
    renderBreadcrumbBar([
      { href: "/partners", label: "Partners" },
      { href: "/partners/1", label: "Acme" },
    ]);

    await user.click(screen.getByRole("button", { name: "Partners" }));

    expect(mockedPush).toHaveBeenCalledWith("/partners");
  });
});

describe("BreadcrumbBar - back and forward", () => {
  it("disables Go back on the very first visited screen", () => {
    renderBreadcrumbBar([{ href: "/partners", label: "Partners" }]);

    expect(screen.getByRole("button", { name: "Go back" })).toBeDisabled();
  });

  it("enables Go back after a second screen is visited, and steps to the previous one via router.push", async () => {
    const user = userEvent.setup();
    renderBreadcrumbBar([
      { href: "/partners", label: "Partners" },
      { href: "/partners/1", label: "Acme" },
    ]);

    const back = screen.getByRole("button", { name: "Go back" });
    expect(back).toBeEnabled();

    await user.click(back);

    expect(mockedPush).toHaveBeenCalledWith("/partners");
    // Independent of the browser's own history: only the app router is
    // ever called, never `window.history.back()`.
    expect(mockedPush).toHaveBeenCalledTimes(1);
  });

  it("disables Go forward on the last visited screen, and enables it again after stepping back", async () => {
    const user = userEvent.setup();
    renderBreadcrumbBar([
      { href: "/partners", label: "Partners" },
      { href: "/partners/1", label: "Acme" },
    ]);

    expect(screen.getByRole("button", { name: "Go forward" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Go back" }));

    const forward = screen.getByRole("button", { name: "Go forward" });
    expect(forward).toBeEnabled();

    await user.click(forward);

    expect(mockedPush).toHaveBeenLastCalledWith("/partners/1");
  });
});

describe("BreadcrumbBar - bounded trail and truncation", () => {
  it("collapses to an ellipsis plus the last visible crumbs once the trail exceeds the visible bound", () => {
    const visits = Array.from({ length: 6 }, (_, index) => ({
      href: `/partners/${index + 1}`,
      label: `Partner ${index + 1}`,
    }));

    renderBreadcrumbBar(visits);

    // Only the most recent crumbs stay visible; the earliest ones do not.
    expect(screen.queryByText("Partner 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Partner 2")).not.toBeInTheDocument();
    expect(screen.getByText("Partner 3")).toBeInTheDocument();
    expect(screen.getByText("Partner 6")).toBeInTheDocument();
  });
});
