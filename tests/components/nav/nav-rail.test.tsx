// Tests for `src/components/nav/nav-rail.tsx`
// (`specs/iteration/v1/v01-002-nav-partner-client-detail.md` -> Acceptance
// criteria: the nav panel is visible on every screen with no action
// required, can be collapsed and expanded again, its current item is
// visually distinguished in both states, and its collapsed/expanded state
// resets to its default on every fresh load).
//
// `next/navigation`'s `usePathname` is mocked - it is the routing boundary
// this Client Component reads from, not the unit under test
// (`ai-rules/policy_testing.md` -> Relevance).

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockedUsePathname = vi.fn<() => string>();
vi.mock("next/navigation", () => ({
  usePathname: () => mockedUsePathname(),
}));

import { NavRail } from "@/components/nav/nav-rail";

afterEach(() => {
  vi.clearAllMocks();
});

describe("NavRail - visibility and items", () => {
  it("renders every nav item as a link, with no action needed to reveal it", () => {
    mockedUsePathname.mockReturnValue("/partners");

    render(<NavRail />);

    expect(screen.getByRole("link", { name: "Partners" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Clients" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Referential" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  it("marks the item matching the current route as current, exact match", () => {
    mockedUsePathname.mockReturnValue("/partners");

    render(<NavRail />);

    expect(screen.getByRole("link", { name: "Partners" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Clients" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks the item as current for a nested detail route, by prefix", () => {
    mockedUsePathname.mockReturnValue("/partners/42");

    render(<NavRail />);

    expect(screen.getByRole("link", { name: "Partners" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("never treats an unrelated route sharing a prefix as current", () => {
    mockedUsePathname.mockReturnValue("/partnersomething");

    render(<NavRail />);

    expect(screen.getByRole("link", { name: "Partners" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks Settings as current on its own route (v01-003)", () => {
    mockedUsePathname.mockReturnValue("/settings");

    render(<NavRail />);

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Partners" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks Referential as current on its own route (v01-004)", () => {
    mockedUsePathname.mockReturnValue("/referential");

    render(<NavRail />);

    expect(screen.getByRole("link", { name: "Referential" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Clients" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});

describe("NavRail - footer grouping", () => {
  it("renders Settings in its own bottom-pinned list, separate from and after Partners/Clients", () => {
    mockedUsePathname.mockReturnValue("/partners");

    render(<NavRail />);

    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(2);
    const [primaryList, footerList] = lists;
    if (!primaryList || !footerList) {
      throw new Error("expected exactly two nav lists");
    }

    expect(
      within(primaryList).getByRole("link", { name: "Partners" }),
    ).toBeInTheDocument();
    expect(
      within(primaryList).getByRole("link", { name: "Clients" }),
    ).toBeInTheDocument();
    expect(
      within(primaryList).queryByRole("link", { name: "Settings" }),
    ).not.toBeInTheDocument();

    expect(
      within(footerList).getByRole("link", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      within(footerList).queryByRole("link", { name: "Partners" }),
    ).not.toBeInTheDocument();
    expect(
      within(footerList).queryByRole("link", { name: "Clients" }),
    ).not.toBeInTheDocument();

    expect(
      primaryList.compareDocumentPosition(footerList) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("NavRail - collapse and expand", () => {
  it("starts expanded, with every item's label visible", () => {
    mockedUsePathname.mockReturnValue("/partners");

    render(<NavRail />);

    expect(screen.getByText("Partners")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Collapse navigation" }),
    ).toBeInTheDocument();
  });

  it("collapses the labels and swaps the control's accessible name on click, then expands again", async () => {
    const user = userEvent.setup();
    mockedUsePathname.mockReturnValue("/partners");
    render(<NavRail />);

    await user.click(
      screen.getByRole("button", { name: "Collapse navigation" }),
    );

    expect(screen.queryByText("Partners")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Partners" })).toBeInTheDocument();
    const expandButton = screen.getByRole("button", {
      name: "Expand navigation",
    });
    expect(expandButton).toBeInTheDocument();

    await user.click(expandButton);

    expect(screen.getByText("Partners")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Collapse navigation" }),
    ).toBeInTheDocument();
  });

  it("keeps the current item distinguished from the others while collapsed", async () => {
    const user = userEvent.setup();
    mockedUsePathname.mockReturnValue("/partners");
    render(<NavRail />);

    await user.click(
      screen.getByRole("button", { name: "Collapse navigation" }),
    );

    expect(screen.getByRole("link", { name: "Partners" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Clients" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("resets to expanded on every fresh mount - the collapsed state is not persisted", async () => {
    const user = userEvent.setup();
    mockedUsePathname.mockReturnValue("/partners");
    const { unmount } = render(<NavRail />);

    await user.click(
      screen.getByRole("button", { name: "Collapse navigation" }),
    );
    expect(screen.queryByText("Partners")).not.toBeInTheDocument();
    unmount();

    render(<NavRail />);

    expect(screen.getByText("Partners")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Collapse navigation" }),
    ).toBeInTheDocument();
  });
});
