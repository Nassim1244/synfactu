// Tests for `src/lib/money/arithmetic.ts` (specs/init.md step 6).
//
// These are the primitives the three value objects are built from. They are
// covered directly because several of their guards cannot be reached through
// the public API - `Money.split` validates its own argument before
// `divideWithRemainder` ever sees it, and `Money.times` always passes a
// non-zero scale - and a guard nothing exercises is a guard nobody notices
// disappearing.
//
// Every expected value below is computed by hand from the rule in AD-018:
// half up means away from zero, in both directions.

import { describe, expect, it } from "vitest";

import {
  assertPositiveInteger,
  assertSafeInteger,
  divideWithRemainder,
  normaliseZero,
  scaleHalfUp,
  toDecimalString,
} from "@/lib/money/arithmetic";

describe("assertSafeInteger", () => {
  it.each([
    0,
    1,
    -1,
    42,
    -42,
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
  ])("accepts %p", (value) => {
    expect(() => {
      assertSafeInteger(value, "cents");
    }).not.toThrow();
  });

  it.each([
    1.5,
    -1.5,
    0.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
    Number.MIN_SAFE_INTEGER - 1,
  ])("rejects %p", (value) => {
    expect(() => {
      assertSafeInteger(value, "cents");
    }).toThrow(RangeError);
  });

  it("names the argument in the message so the caller knows which one is wrong", () => {
    expect(() => {
      assertSafeInteger(1.5, "minutes");
    }).toThrow("minutes must be a safe integer, received 1.5");
  });
});

describe("assertPositiveInteger", () => {
  it.each([1, 2, 15, 420, Number.MAX_SAFE_INTEGER])("accepts %p", (value) => {
    expect(() => {
      assertPositiveInteger(value, "parts");
    }).not.toThrow();
  });

  it.each([0, -1, -15, 2.5, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects %p",
    (value) => {
      expect(() => {
        assertPositiveInteger(value, "parts");
      }).toThrow(RangeError);
    },
  );

  it("names the argument and the rule", () => {
    expect(() => {
      assertPositiveInteger(0, "step in minutes");
    }).toThrow("step in minutes must be an integer of at least 1, received 0");
  });
});

describe("normaliseZero", () => {
  it("collapses negative zero", () => {
    expect(Object.is(normaliseZero(-0), 0)).toBe(true);
  });

  it.each([0, 1, -1, 1.5, -1.5, 1234])("leaves %p alone", (value) => {
    expect(Object.is(normaliseZero(value), value)).toBe(true);
  });
});

describe("scaleHalfUp", () => {
  // value * multiplier / scale, rounded away from zero at exactly one half.
  it.each([
    // The half-way table of AD-018, in both directions.
    { value: 1000, multiplier: 5, expected: 1 }, //  0.5 -> 1
    { value: -1000, multiplier: 5, expected: -1 }, // -0.5 -> -1
    { value: 3000, multiplier: 5, expected: 2 }, //  1.5 -> 2
    { value: -3000, multiplier: 5, expected: -2 }, // -1.5 -> -2
    { value: 5000, multiplier: 5, expected: 3 }, //  2.5 -> 3
    { value: -5000, multiplier: 5, expected: -3 }, // -2.5 -> -3
    // Just below and just above the half, which must not move the same way.
    { value: 999, multiplier: 5, expected: 0 }, //  0.4995 -> 0
    { value: 1001, multiplier: 5, expected: 1 }, //  0.5005 -> 1
    { value: -999, multiplier: 5, expected: 0 }, // -0.4995 -> 0
    { value: -1001, multiplier: 5, expected: -1 }, // -0.5005 -> -1
    // Exact multiples are untouched.
    { value: 10_000, multiplier: 2000, expected: 2000 },
    { value: 0, multiplier: 2000, expected: 0 },
    { value: 12_345, multiplier: 0, expected: 0 },
    // Two signs on the multiplier.
    { value: 10_000, multiplier: -2000, expected: -2000 },
    { value: -10_000, multiplier: -2000, expected: 2000 },
  ])(
    "scales $value by $multiplier basis points to $expected",
    ({ value, multiplier, expected }) => {
      expect(scaleHalfUp(value, multiplier, 10_000, "cents")).toBe(expected);
    },
  );

  it("returns positive zero rather than negative zero", () => {
    // -1000 * 4 / 10000 is -0.4, which rounds to zero. A -0 leaking out here
    // would be rendered "-0,00 €" further down.
    expect(Object.is(scaleHalfUp(-1000, 4, 10_000, "cents"), 0)).toBe(true);
  });

  it("stays exact past the range a double can multiply in", () => {
    // MAX_SAFE_INTEGER * 10000 is far outside double precision; computed as a
    // float the product would already be wrong before the division.
    expect(scaleHalfUp(Number.MAX_SAFE_INTEGER, 10_000, 10_000, "cents")).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it("refuses a zero scale rather than producing Infinity", () => {
    expect(() => scaleHalfUp(100, 5, 0, "cents")).toThrow(
      new RangeError("scale must not be zero"),
    );
  });

  it("refuses a result outside the safe integer range", () => {
    expect(() =>
      scaleHalfUp(Number.MAX_SAFE_INTEGER, 20_000, 10_000, "cents"),
    ).toThrow(RangeError);
    expect(() =>
      scaleHalfUp(Number.MAX_SAFE_INTEGER, 20_000, 10_000, "cents"),
    ).toThrow(/overflowed the safe integer range/);
  });

  it("refuses a result below the safe integer range", () => {
    expect(() =>
      scaleHalfUp(Number.MIN_SAFE_INTEGER, 20_000, 10_000, "cents"),
    ).toThrow(/overflowed the safe integer range/);
  });
});

describe("divideWithRemainder", () => {
  it.each([
    { numerator: 100, divisor: 3, quotient: 33, remainder: 1 },
    { numerator: -100, divisor: 3, quotient: -33, remainder: -1 },
    { numerator: 10, divisor: 4, quotient: 2, remainder: 2 },
    { numerator: -10, divisor: 4, quotient: -2, remainder: -2 },
    { numerator: 9, divisor: 3, quotient: 3, remainder: 0 },
    { numerator: 0, divisor: 3, quotient: 0, remainder: 0 },
    { numerator: 2, divisor: 5, quotient: 0, remainder: 2 },
    { numerator: 7, divisor: 1, quotient: 7, remainder: 0 },
  ])(
    "divides $numerator by $divisor into $quotient remainder $remainder",
    ({ numerator, divisor, quotient, remainder }) => {
      expect(divideWithRemainder(numerator, divisor)).toEqual({
        quotient,
        remainder,
      });
    },
  );

  it("truncates toward zero, so the remainder carries the sign of the numerator", () => {
    const positive = divideWithRemainder(100, 3);
    const negative = divideWithRemainder(-100, 3);

    expect(negative.quotient).toBe(-positive.quotient);
    expect(negative.remainder).toBe(-positive.remainder);
  });

  it("stays exact at the top of the safe integer range", () => {
    // Math.trunc(MAX_SAFE_INTEGER / 3) rounds before it truncates and loses a
    // unit; the bigint division does not.
    const { quotient, remainder } = divideWithRemainder(
      Number.MAX_SAFE_INTEGER,
      3,
    );

    expect(quotient).toBe(3_002_399_751_580_330);
    expect(remainder).toBe(1);
    expect(quotient * 3 + remainder).toBe(Number.MAX_SAFE_INTEGER);
  });

  it.each([0, -1, 2.5, Number.NaN])("refuses the divisor %p", (divisor) => {
    expect(() => divideWithRemainder(100, divisor)).toThrow(RangeError);
  });
});

describe("toDecimalString", () => {
  it.each([
    { value: 123_456, digits: 2, expected: "1234.56" },
    { value: -123_456, digits: 2, expected: "-1234.56" },
    { value: 5, digits: 2, expected: "0.05" },
    { value: -5, digits: 2, expected: "-0.05" },
    { value: 0, digits: 2, expected: "0.00" },
    { value: 100, digits: 2, expected: "1.00" },
    { value: 2460, digits: 4, expected: "0.2460" },
    { value: -250, digits: 4, expected: "-0.0250" },
    { value: 10_000, digits: 4, expected: "1.0000" },
    { value: 1, digits: 4, expected: "0.0001" },
  ])(
    "renders $value with $digits digits as $expected",
    ({ value, digits, expected }) => {
      expect(toDecimalString(value, digits)).toBe(expected);
    },
  );

  it("moves the point instead of dividing, so no float rounding occurs", () => {
    // 2^53 - 1 cents. `value / 100` cannot represent this exactly.
    expect(toDecimalString(Number.MAX_SAFE_INTEGER, 2)).toBe(
      "90071992547409.91",
    );
  });

  it("refuses a digit count that would not produce a decimal literal", () => {
    // Zero fraction digits would assemble "5." - the guard is what stops that
    // reaching Intl as a malformed number.
    expect(() => toDecimalString(5, 0)).toThrow(RangeError);
  });
});
