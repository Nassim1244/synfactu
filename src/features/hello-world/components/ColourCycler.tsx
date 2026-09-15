// The bootstrap smoke test's only Client Component.
//
// It carries `"use client"` because it holds state and an event handler
// (`policy_coding_guidelines.md` -> React and Next idioms). It is the smallest
// component that needs the directive: the route above it,
// `src/app/hello-world/page.tsx`, stays a Server Component and passes nothing
// across the boundary.
//
// The heading, the supporting sentence and the button live here together
// rather than being split across the boundary: the heading and the button
// share one piece of state, and separating them would need lifted state or a
// context, which a three-element page does not justify
// (`specs/001-hello-world.md` -> Feature slice).
//
// Nothing here persists the colour - no `useEffect`, no `localStorage`, no
// cookie, no search param - which is what makes a reload return the heading to
// the first colour of the sequence.

"use client";

import type { JSX } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * One position of the colour sequence: the label the button shows for it, and
 * the Tailwind classes the heading wears while it is current.
 */
type Colour = {
  readonly name: string;
  readonly className: string;
};

/**
 * The fixed colour sequence, in order, wrapping back to the first position.
 *
 * Each class string is written out in full. A composed one
 * (`text-${name}-700`) is invisible to Tailwind's scanner, so it would be
 * dropped from the production stylesheet with no error and no failing test
 * (`specs/001-hello-world.md` -> Feature slice).
 *
 * `text-foreground` is the theme token from `src/app/globals.css` and carries
 * its own light and dark values, so it needs no variant. The `700`/`400` pair
 * clears WCAG AA for large text on both backgrounds.
 */
const COLOUR_SEQUENCE = [
  { name: "default", className: "text-foreground" },
  { name: "blue", className: "text-blue-700 dark:text-blue-400" },
  { name: "amber", className: "text-amber-700 dark:text-amber-400" },
] as const satisfies readonly Colour[];

/**
 * Reads the sequence at a position, wrapping past its end.
 *
 * The fallback is what `noUncheckedIndexedAccess` requires of an index that is
 * a plain `number`: the modulo keeps every call in range, so it is unreachable,
 * and the alternative would be a non-null assertion that
 * `policy_coding_guidelines.md` -> TypeScript forbids.
 *
 * @param index any non-negative position, in or out of range.
 * @returns the colour at that position modulo the sequence length.
 */
function colourAt(index: number): Colour {
  return COLOUR_SEQUENCE[index % COLOUR_SEQUENCE.length] ?? COLOUR_SEQUENCE[0];
}

/**
 * The heading, its supporting sentence and the control that cycles its colour.
 *
 * Holds the single piece of state the feature has: the index into
 * `COLOUR_SEQUENCE`. A press advances it by one, returning to the first colour
 * after the last.
 *
 * The button's accessible name is its own text content, `Switch to <name>`,
 * naming the colour the next press will apply - no `aria-label`, no
 * `aria-pressed` (this is not a toggle) and no `aria-live`: the colour change
 * is deliberately not announced (`design/001/README.md` -> Accessibility).
 *
 * @returns the column's three elements, in the order the design fixes.
 */
export function ColourCycler(): JSX.Element {
  const [colourIndex, setColourIndex] = useState<number>(0);

  const currentColour = colourAt(colourIndex);
  const nextColour = colourAt(colourIndex + 1);

  return (
    <>
      <h1
        className={cn(
          "text-4xl font-semibold tracking-tight md:text-5xl",
          currentColour.className,
        )}
      >
        Hello world
      </h1>
      <p className="text-muted-foreground max-w-prose text-sm md:text-base">
        This page is a bootstrap smoke test and will be removed once the first
        real feature ships; the colour you choose is not saved and a reload
        brings back the first one.
      </p>
      <Button
        variant="default"
        onClick={() => {
          setColourIndex((index) => (index + 1) % COLOUR_SEQUENCE.length);
        }}
      >
        {`Switch to ${nextColour.name}`}
      </Button>
    </>
  );
}
