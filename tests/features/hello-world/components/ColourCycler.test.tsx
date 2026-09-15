// Tests for `src/features/hello-world/components/ColourCycler.tsx`
// (`specs/001-hello-world.md`, acceptance criteria 1, 2, 3, 4, 6 and 7).
//
// Everything here is asserted through the accessible name of the button and
// the accessible name of the heading, never through a colour class:
// `policy_testing.md` -> Forbidden rules out asserting on a CSS class, and the
// spec's Server boundary section fixes the label contract precisely so the
// behaviour is observable without one. The label sequence asserted below is
// copied verbatim from that section:
//
//   first render     heading `default`  button "Switch to blue"
//   after one press  heading `blue`     button "Switch to amber"
//   after two        heading `amber`    button "Switch to default"
//   after three      back to first render
//
// The heading's colour itself is therefore out of reach at this level: jsdom
// loads no Tailwind stylesheet, so a computed colour would be empty, and the
// class name is forbidden. Criterion 5 (reload) is out of reach here too - a
// component that is mounted once cannot be reloaded. Both live in
// `e2e/hello-world.spec.ts`.
//
// The route above this component, `src/app/hello-world/page.tsx`, is a Server
// Component and is deliberately not unit tested
// (`policy_testing.md` -> What to test where); it is covered end to end.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ColourCycler } from "@/features/hello-world/components/ColourCycler";

/**
 * The supporting sentence, exactly as the component renders it. JSX wraps it
 * over three source lines, which the DOM and Testing Library's default
 * normaliser collapse into this single space-separated string.
 */
const SUPPORTING_SENTENCE =
  "This page is a bootstrap smoke test and will be removed once the first " +
  "real feature ships; the colour you choose is not saved and a reload " +
  "brings back the first one.";

/** The button, whatever colour it currently offers. There is only one. */
function button(): HTMLElement {
  return screen.getByRole("button");
}

describe("ColourCycler", () => {
  it("renders 'Hello world' as the only level-1 heading", () => {
    render(<ColourCycler />);

    const headings = screen.getAllByRole("heading", { level: 1 });

    expect(headings).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Hello world" }),
    ).toBeInTheDocument();
  });

  it("renders the supporting sentence stating the colour is not saved", () => {
    render(<ColourCycler />);

    expect(screen.getByText(SUPPORTING_SENTENCE)).toBeInTheDocument();
  });

  it("offers the second colour of the sequence on first render", () => {
    render(<ColourCycler />);

    expect(
      screen.getByRole("button", { name: "Switch to blue" }),
    ).toBeInTheDocument();
  });

  it("takes its accessible name from its own text, with no aria-label", () => {
    render(<ColourCycler />);

    const control = screen.getByRole("button", { name: "Switch to blue" });

    expect(control).toHaveAccessibleName("Switch to blue");
    expect(control).toHaveTextContent("Switch to blue");
    expect(control).not.toHaveAttribute("aria-label");
    expect(control).not.toHaveAttribute("aria-pressed");
  });

  it("advances to the next colour of the sequence when pressed once", async () => {
    const user = userEvent.setup();
    render(<ColourCycler />);

    await user.click(button());

    expect(
      screen.getByRole("button", { name: "Switch to amber" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Switch to blue" }),
    ).not.toBeInTheDocument();
  });

  it("reaches the last colour of the sequence after two presses", async () => {
    const user = userEvent.setup();
    render(<ColourCycler />);

    await user.click(button());
    await user.click(button());

    expect(
      screen.getByRole("button", { name: "Switch to default" }),
    ).toBeInTheDocument();
  });

  it("returns to the first colour when pressed from the last one", async () => {
    const user = userEvent.setup();
    render(<ColourCycler />);

    await user.click(button());
    await user.click(button());
    await user.click(button());

    expect(
      screen.getByRole("button", { name: "Switch to blue" }),
    ).toBeInTheDocument();
  });

  it("keeps the heading text unchanged across a full cycle", async () => {
    const user = userEvent.setup();
    render(<ColourCycler />);

    await user.click(button());
    await user.click(button());
    await user.click(button());

    expect(
      screen.getByRole("heading", { level: 1, name: "Hello world" }),
    ).toBeInTheDocument();
  });

  it("puts the button in reach of a single Tab press", async () => {
    const user = userEvent.setup();
    render(<ColourCycler />);

    await user.tab();

    expect(button()).toHaveFocus();
  });

  it("advances the colour when the focused button is activated with Enter", async () => {
    const user = userEvent.setup();
    render(<ColourCycler />);

    await user.tab();
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("button", { name: "Switch to amber" }),
    ).toBeInTheDocument();
  });

  it("advances the colour when the focused button is activated with Space", async () => {
    const user = userEvent.setup();
    render(<ColourCycler />);

    await user.tab();
    await user.keyboard("[Space]");

    expect(
      screen.getByRole("button", { name: "Switch to amber" }),
    ).toBeInTheDocument();
  });
});
