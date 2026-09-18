// Tests for `src/lib/money/rate.ts` (specs/init.md step 6).
//
// A rate is an integer number of basis points: 2460 is 24.60 %. Both signs
// and values above 10 000 are legitimate here - narrowing the range is a
// feature's business rule and belongs in that feature's Zod schema.

import { describe, expect, it } from "vitest";

import { Money } from "@/lib/money/money";
import { BASIS_POINTS_PER_UNIT, Rate } from "@/lib/money/rate";

/** No-break space: what fr-FR puts before the percent sign. */
const NBSP = "\u00a0";

const bp = (value: number): Rate => Rate.fromBasisPoints(value);

describe("BASIS_POINTS_PER_UNIT", () => {
  it("is 10 000, so 100 % is one whole unit", () => {
    expect(BASIS_POINTS_PER_UNIT).toBe(10_000);
  });
});

describe("Rate.fromBasisPoints", () => {
  it.each([0, 1, 250, 2000, 2460, 10_000, Number.MAX_SAFE_INTEGER])(
    "round-trips %p basis points",
    (value) => {
      expect(bp(value).toBasisPoints()).toBe(value);
    },
  );

  it("accepts a rate above 100 %, which is a legitimate multiplier", () => {
    expect(bp(12_000).toBasisPoints()).toBe(12_000);
  });

  it("accepts a negative rate, which is a legitimate reduction", () => {
    expect(bp(-250).toBasisPoints()).toBe(-250);
  });

  it.each([0.246, 2.5, -0.5, Number.NaN, Number.POSITIVE_INFINITY, 1e300])(
    "refuses %p, because a fractional basis point is a unit mistake",
    (value) => {
      expect(() => bp(value)).toThrow(RangeError);
    },
  );

  it("names the unit in the message", () => {
    expect(() => bp(0.246)).toThrow(
      "basis points must be a safe integer, received 0.246",
    );
  });

  it("normalises negative zero", () => {
    expect(Object.is(bp(-0).toBasisPoints(), 0)).toBe(true);
  });
});

describe("Rate.zero", () => {
  it("is zero basis points", () => {
    expect(Rate.zero().toBasisPoints()).toBe(0);
    expect(Rate.zero().isZero()).toBe(true);
  });
});

describe("Rate.applyTo", () => {
  it.each([
    { cents: 10_000, basisPoints: 2000, expected: 2000 }, // 100.00 € at 20 %
    { cents: 1999, basisPoints: 2000, expected: 400 }, // 399.8 cents
    { cents: 1000, basisPoints: 5, expected: 1 }, // the half-way case
    { cents: -1000, basisPoints: 5, expected: -1 },
    { cents: 10_000, basisPoints: 12_000, expected: 12_000 }, // 120 %
    { cents: 10_000, basisPoints: -2000, expected: -2000 }, // -20 %
    { cents: 4321, basisPoints: 0, expected: 0 },
  ])(
    "applies $basisPoints basis points to $cents cents giving $expected",
    ({ cents, basisPoints, expected }) => {
      expect(bp(basisPoints).applyTo(Money.fromCents(cents)).toCents()).toBe(
        expected,
      );
    },
  );

  it.each([
    { cents: 1050, basisPoints: 250 },
    { cents: -1050, basisPoints: 250 },
    { cents: 3000, basisPoints: 5 },
    { cents: 123_456, basisPoints: 550 },
    { cents: 0, basisPoints: 2000 },
  ])(
    "is the same operation as money.times, for $cents cents at $basisPoints basis points",
    ({ cents, basisPoints }) => {
      // The two spellings must not be allowed to drift into two rounding
      // rules: the arithmetic lives in Money and Rate delegates to it.
      const amount = Money.fromCents(cents);
      const rate = bp(basisPoints);

      expect(rate.applyTo(amount).toCents()).toBe(amount.times(rate).toCents());
    },
  );

  it("leaves the amount unchanged", () => {
    const amount = Money.fromCents(10_000);

    bp(2000).applyTo(amount);

    expect(amount.toCents()).toBe(10_000);
  });

  it("refuses a product outside the safe integer range", () => {
    expect(() =>
      bp(20_000).applyTo(Money.fromCents(Number.MAX_SAFE_INTEGER)),
    ).toThrow(RangeError);
  });
});

describe("Rate.fromPercent", () => {
  it.each([
    { value: "25", expected: 2500 },
    { value: "24.60", expected: 2460 },
    { value: "0", expected: 0 },
    { value: "100", expected: 10_000 },
    { value: "0.01", expected: 1 },
    { value: "-5.25", expected: -525 },
  ])(
    "converts $value% to $expected basis points, exactly",
    ({ value, expected }) => {
      expect(Rate.fromPercent(value).toBasisPoints()).toBe(expected);
    },
  );

  it("rejects more than two fraction digits rather than rounding, exactly like Money.fromDecimalString", () => {
    expect(() => Rate.fromPercent("24.605")).toThrow(RangeError);
  });

  it.each(["abc", ""])("refuses %j, which is not a decimal number", (value) => {
    expect(() => Rate.fromPercent(value)).toThrow(RangeError);
  });
});

describe("Rate.toPercentDecimalString", () => {
  it.each([
    { basisPoints: 2500, expected: "25.00" },
    { basisPoints: 2460, expected: "24.60" },
    { basisPoints: 0, expected: "0.00" },
    { basisPoints: 10_000, expected: "100.00" },
    { basisPoints: 12_000, expected: "120.00" },
    { basisPoints: -250, expected: "-2.50" },
    { basisPoints: 1, expected: "0.01" },
  ])(
    "renders $basisPoints basis points as $expected",
    ({ basisPoints, expected }) => {
      expect(bp(basisPoints).toPercentDecimalString()).toBe(expected);
    },
  );
});

describe("Rate.fromPercent / toPercentDecimalString round trip", () => {
  it.each([0, 1, 50, 2500, 9999, 10_000, 12_000, -250])(
    "round-trips %p basis points exactly - digit-shift both ways, no rounding to lose",
    (basisPoints) => {
      const original = bp(basisPoints);

      const roundTripped = Rate.fromPercent(original.toPercentDecimalString());

      expect(roundTripped.toBasisPoints()).toBe(basisPoints);
    },
  );
});

describe("Rate comparisons", () => {
  it.each([
    { a: 2000, b: 2000, expected: true },
    { a: 2000, b: 2001, expected: false },
    { a: 0, b: -0, expected: true },
    { a: -250, b: 250, expected: false },
  ])("equals($a, $b) is $expected", ({ a, b, expected }) => {
    expect(bp(a).equals(bp(b))).toBe(expected);
  });

  it.each([
    { value: 0, isZero: true },
    { value: 1, isZero: false },
    { value: -1, isZero: false },
  ])("isZero($value) is $isZero", ({ value, isZero }) => {
    expect(bp(value).isZero()).toBe(isZero);
  });
});

describe("Rate.format", () => {
  it.each([
    { value: 2460, expected: `24,60${NBSP}%` },
    { value: 2000, expected: `20,00${NBSP}%` },
    { value: 0, expected: `0,00${NBSP}%` },
    { value: 10_000, expected: `100,00${NBSP}%` },
    { value: 12_000, expected: `120,00${NBSP}%` },
    { value: -250, expected: `-2,50${NBSP}%` },
    { value: 1, expected: `0,01${NBSP}%` },
    { value: 550, expected: `5,50${NBSP}%` },
  ])("renders $value basis points as $expected", ({ value, expected }) => {
    expect(bp(value).format()).toBe(expected);
  });

  it("separates the percent sign with U+00A0, not with an ordinary space", () => {
    const formatted = bp(2460).format();

    expect(formatted).toContain(NBSP);
    expect(formatted).not.toContain(" %");
  });
});
