// Tests for `src/components/nav/navigation-history-context.tsx` (AD-024,
// `specs/iteration/v1/v01-002-nav-partner-client-detail.md` -> Feature
// slice). The visited-history trail behind the breadcrumb and the back/
// forward controls has no `domain.ts` of its own - it is a React Context
// backed by a reducer - so `renderHook` against the real provider is the
// lowest level that exercises its actual logic
// (`ai-rules/policy_testing.md` -> What to test where, components).
//
// Acceptance criteria covered: "reflects the sequence... in visiting order",
// "does not add a duplicate crumb", "bounded length... drops the oldest",
// "resets to empty on every fresh load", "discards every crumb after the
// point jumped back to", and the back/forward `canGoBack`/`canGoForward`
// boundary conditions.

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";

import {
  NavigationHistoryProvider,
  useNavigationHistory,
} from "@/components/nav/navigation-history-context";

function wrapper({ children }: { children: ReactNode }) {
  return <NavigationHistoryProvider>{children}</NavigationHistoryProvider>;
}

function renderNavigationHistory() {
  return renderHook(() => useNavigationHistory(), { wrapper });
}

describe("useNavigationHistory - initial state", () => {
  it("starts with an empty trail, no current screen, and both directions disabled", () => {
    const { result } = renderNavigationHistory();

    expect(result.current.trail).toEqual([]);
    expect(result.current.current).toBeNull();
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.canGoForward).toBe(false);
  });

  it("throws when used outside a NavigationHistoryProvider", () => {
    expect(() => renderHook(() => useNavigationHistory())).toThrow(
      "useNavigationHistory must be used within a NavigationHistoryProvider",
    );
  });
});

describe("registerVisit", () => {
  it("appends each visited screen in visiting order", () => {
    const { result } = renderNavigationHistory();

    act(() => result.current.registerVisit("/partners", "Partners"));
    act(() => result.current.registerVisit("/partners/1", "Acme"));
    act(() => result.current.registerVisit("/clients", "Clients"));

    expect(result.current.trail.map((entry) => entry.href)).toEqual([
      "/partners",
      "/partners/1",
      "/clients",
    ]);
    expect(result.current.current).toEqual({
      href: "/clients",
      label: "Clients",
    });
  });

  it("does not add a duplicate crumb for a consecutive repeat of the same href", () => {
    const { result } = renderNavigationHistory();

    act(() => result.current.registerVisit("/partners/1", "Acme"));
    act(() => result.current.registerVisit("/partners/1", "Acme"));

    expect(result.current.trail).toHaveLength(1);
  });

  it("refreshes the label in place for a consecutive repeat with a changed label", () => {
    const { result } = renderNavigationHistory();

    act(() => result.current.registerVisit("/partners/1", "Acme"));
    act(() => result.current.registerVisit("/partners/1", "Acme Renamed"));

    expect(result.current.trail).toEqual([
      { href: "/partners/1", label: "Acme Renamed" },
    ]);
  });

  it("drops the oldest entry first once the trail exceeds its bounded length", () => {
    const { result } = renderNavigationHistory();

    for (let index = 1; index <= 11; index += 1) {
      act(() =>
        result.current.registerVisit(`/partners/${index}`, `P${index}`),
      );
    }

    expect(result.current.trail).toHaveLength(10);
    expect(result.current.trail[0]?.href).toBe("/partners/2");
    expect(result.current.trail.at(-1)?.href).toBe("/partners/11");
  });

  it("discards every crumb after the point jumped back to before appending a new one", () => {
    const { result } = renderNavigationHistory();

    act(() => result.current.registerVisit("/partners", "Partners"));
    act(() => result.current.registerVisit("/partners/1", "Acme"));
    act(() => result.current.registerVisit("/clients", "Clients"));
    act(() => result.current.goBack());
    expect(result.current.current?.href).toBe("/partners/1");

    act(() => result.current.registerVisit("/clients/9", "Beta"));

    expect(result.current.trail.map((entry) => entry.href)).toEqual([
      "/partners",
      "/partners/1",
      "/clients/9",
    ]);
    expect(result.current.current?.href).toBe("/clients/9");
    expect(result.current.canGoForward).toBe(false);
  });
});

describe("goBack / goForward / canGoBack / canGoForward", () => {
  it("disables goBack on the first screen and enables it after a second visit", () => {
    const { result } = renderNavigationHistory();

    act(() => result.current.registerVisit("/partners", "Partners"));
    expect(result.current.canGoBack).toBe(false);

    act(() => result.current.registerVisit("/partners/1", "Acme"));
    expect(result.current.canGoBack).toBe(true);
  });

  it("disables goForward on the last screen and enables it after stepping back", () => {
    const { result } = renderNavigationHistory();

    act(() => result.current.registerVisit("/partners", "Partners"));
    act(() => result.current.registerVisit("/partners/1", "Acme"));
    expect(result.current.canGoForward).toBe(false);

    act(() => result.current.goBack());
    expect(result.current.canGoForward).toBe(true);
    expect(result.current.current?.href).toBe("/partners");
  });

  it("goBack is a no-op when canGoBack is false", () => {
    const { result } = renderNavigationHistory();
    act(() => result.current.registerVisit("/partners", "Partners"));

    act(() => result.current.goBack());

    expect(result.current.current?.href).toBe("/partners");
  });

  it("goForward is a no-op when canGoForward is false", () => {
    const { result } = renderNavigationHistory();
    act(() => result.current.registerVisit("/partners", "Partners"));

    act(() => result.current.goForward());

    expect(result.current.current?.href).toBe("/partners");
  });

  it("goForward moves back to the screen stepped away from", () => {
    const { result } = renderNavigationHistory();
    act(() => result.current.registerVisit("/partners", "Partners"));
    act(() => result.current.registerVisit("/partners/1", "Acme"));
    act(() => result.current.goBack());

    act(() => result.current.goForward());

    expect(result.current.current?.href).toBe("/partners/1");
    expect(result.current.canGoForward).toBe(false);
  });
});

describe("goToIndex", () => {
  it("jumps directly to an arbitrary earlier position in the trail", () => {
    const { result } = renderNavigationHistory();
    act(() => result.current.registerVisit("/partners", "Partners"));
    act(() => result.current.registerVisit("/partners/1", "Acme"));
    act(() => result.current.registerVisit("/clients", "Clients"));

    act(() => result.current.goToIndex(0));

    expect(result.current.current?.href).toBe("/partners");
    expect(result.current.canGoBack).toBe(false);
    expect(result.current.canGoForward).toBe(true);
  });

  it("ignores an out-of-range index", () => {
    const { result } = renderNavigationHistory();
    act(() => result.current.registerVisit("/partners", "Partners"));

    act(() => result.current.goToIndex(5));

    expect(result.current.current?.href).toBe("/partners");
  });
});
