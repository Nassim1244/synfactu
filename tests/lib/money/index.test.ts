// Tests for the `src/lib/money/index.ts` barrel (AD-007).
//
// The barrel is the boundary of the folder: every rounding rule in the
// application lives behind it, and the primitives in `arithmetic.ts` are
// deliberately NOT re-exported. Exporting them would be an invitation to do
// the raw-integer arithmetic the folder exists to contain, so their absence
// is behaviour worth pinning rather than an accident of how the file is
// written today.

import { describe, expect, it } from "vitest";

import * as valueObjects from "@/lib/money";

describe("the money barrel", () => {
  it.each([
    "Money",
    "Duration",
    "Rate",
    "LOCALE",
    "CURRENCY",
    "BASIS_POINTS_PER_UNIT",
    "DEFAULT_DAY_LENGTH_MINUTES",
  ])("exposes %s", (name) => {
    expect(Object.keys(valueObjects)).toContain(name);
  });

  it.each([
    "scaleHalfUp",
    "divideWithRemainder",
    "toDecimalString",
    "normaliseZero",
    "assertSafeInteger",
    "assertPositiveInteger",
  ])("does not expose the internal helper %s", (name) => {
    expect(Object.keys(valueObjects)).not.toContain(name);
  });

  it("declares one locale and one currency for the whole application", () => {
    // `policy_coding_guidelines.md` -> Value objects: one interface language,
    // one locale, declared once. Formatting methods take no locale argument.
    expect(valueObjects.LOCALE).toBe("fr-FR");
    expect(valueObjects.CURRENCY).toBe("EUR");
  });
});
