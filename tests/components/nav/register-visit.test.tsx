// Tests for `src/components/nav/register-visit.tsx` - a tiny client leaf
// whose only job is wiring a `useEffect` to `registerVisit` from
// `useNavigationHistory()` (AD-024), so a Server Component page/detail view
// can drop in visit-tracking without itself becoming a Client Component.
//
// The navigation-history hook is mocked here: its own logic is the unit
// under test in `navigation-history-context.test.tsx`, and this file's job
// is only to prove `RegisterVisit` calls it with the right arguments, on
// mount and again when either prop changes (`ai-rules/policy_testing.md` ->
// Relevance).

import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockedRegisterVisit = vi.fn();
vi.mock("@/components/nav/navigation-history-context", () => ({
  useNavigationHistory: () => ({ registerVisit: mockedRegisterVisit }),
}));

import { RegisterVisit } from "@/components/nav/register-visit";

afterEach(() => {
  vi.clearAllMocks();
});

describe("RegisterVisit", () => {
  it("registers the given href and label once on mount", () => {
    render(<RegisterVisit href="/partners/1" label="Acme" />);

    expect(mockedRegisterVisit).toHaveBeenCalledTimes(1);
    expect(mockedRegisterVisit).toHaveBeenCalledWith("/partners/1", "Acme");
  });

  it("registers again when the label changes (e.g. the record was renamed)", () => {
    const { rerender } = render(
      <RegisterVisit href="/partners/1" label="Acme" />,
    );

    rerender(<RegisterVisit href="/partners/1" label="Acme Renamed" />);

    expect(mockedRegisterVisit).toHaveBeenCalledTimes(2);
    expect(mockedRegisterVisit).toHaveBeenNthCalledWith(
      2,
      "/partners/1",
      "Acme Renamed",
    );
  });

  it("renders nothing", () => {
    const { container } = render(
      <RegisterVisit href="/partners/1" label="Acme" />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
