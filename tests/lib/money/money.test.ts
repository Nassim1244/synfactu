// Tests for `src/lib/money/money.ts` (specs/init.md step 6: boundaries,
// negatives, the half-way case and the remainder distribution).
//
// Every expected cent value is computed by hand from the rule in AD-018 -
// half up means away from zero - and never by running the implementation.
// The formatted strings use explicit escapes for the separators `Intl`
// produces for fr-FR: U+202F between thousands and U+00A0 before the sign.

import { describe, expect, it } from "vitest";

import { Money } from "@/lib/money/money";
import { Rate } from "@/lib/money/rate";

/** Narrow no-break space: the fr-FR grouping separator. */
const GROUP = "\u202f";
/** No-break space: what fr-FR puts before the currency sign. */
const NBSP = "\u00a0";

const rate = (basisPoints: number): Rate => Rate.fromBasisPoints(basisPoints);
const cents = (list: readonly Money[]): number[] =>
  list.map((amount) => amount.toCents());

describe("Money.fromCents", () => {
  it.each([0, 1, -1, 123_456, -123_456, Number.MAX_SAFE_INTEGER])(
    "round-trips %p cents",
    (value) => {
      expect(Money.fromCents(value).toCents()).toBe(value);
    },
  );

  it.each([
    1.5,
    -0.5,
    0.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])("refuses %p, because a cent is indivisible", (value) => {
    expect(() => Money.fromCents(value)).toThrow(RangeError);
  });

  it("normalises negative zero", () => {
    expect(Object.is(Money.fromCents(-0).toCents(), 0)).toBe(true);
  });
});

describe("Money.zero", () => {
  it("is zero cents", () => {
    expect(Money.zero().toCents()).toBe(0);
    expect(Money.zero().isZero()).toBe(true);
  });
});

describe("Money.sum", () => {
  it("returns zero for an empty list", () => {
    expect(Money.sum([]).toCents()).toBe(0);
  });

  it("adds every amount, of either sign", () => {
    const amounts = [1050, -300, 25, 0].map((value) => Money.fromCents(value));

    expect(Money.sum(amounts).toCents()).toBe(775);
  });

  it("refuses a total outside the safe integer range", () => {
    const amounts = [
      Money.fromCents(Number.MAX_SAFE_INTEGER),
      Money.fromCents(1),
    ];

    expect(() => Money.sum(amounts)).toThrow(RangeError);
  });
});

describe("Money.plus", () => {
  it.each([
    { a: 1000, b: 250, expected: 1250 },
    { a: 1000, b: -250, expected: 750 },
    { a: -1000, b: -250, expected: -1250 },
    { a: 1000, b: -1000, expected: 0 },
  ])("adds $a and $b to $expected", ({ a, b, expected }) => {
    expect(Money.fromCents(a).plus(Money.fromCents(b)).toCents()).toBe(
      expected,
    );
  });

  it("leaves both operands unchanged", () => {
    const left = Money.fromCents(1000);
    const right = Money.fromCents(250);

    left.plus(right);

    expect(left.toCents()).toBe(1000);
    expect(right.toCents()).toBe(250);
  });

  it("refuses a sum above the safe integer range", () => {
    expect(() =>
      Money.fromCents(Number.MAX_SAFE_INTEGER).plus(Money.fromCents(1)),
    ).toThrow(RangeError);
  });

  it("refuses a sum below the safe integer range", () => {
    expect(() =>
      Money.fromCents(Number.MIN_SAFE_INTEGER).plus(Money.fromCents(-1)),
    ).toThrow(RangeError);
  });
});

describe("Money.minus", () => {
  it.each([
    { a: 1000, b: 250, expected: 750 },
    { a: 250, b: 1000, expected: -750 },
    { a: -250, b: -1000, expected: 750 },
    { a: 1000, b: 1000, expected: 0 },
  ])("subtracts $b from $a to give $expected", ({ a, b, expected }) => {
    expect(Money.fromCents(a).minus(Money.fromCents(b)).toCents()).toBe(
      expected,
    );
  });

  it("yields positive zero when the two are equal", () => {
    const difference = Money.fromCents(-1000).minus(Money.fromCents(-1000));

    expect(Object.is(difference.toCents(), 0)).toBe(true);
  });

  it("refuses a difference outside the safe integer range", () => {
    expect(() =>
      Money.fromCents(Number.MIN_SAFE_INTEGER).minus(Money.fromCents(1)),
    ).toThrow(RangeError);
  });
});

describe("Money.negated", () => {
  it.each([
    { value: 1250, expected: -1250 },
    { value: -1250, expected: 1250 },
  ])("negates $value to $expected", ({ value, expected }) => {
    expect(Money.fromCents(value).negated().toCents()).toBe(expected);
  });

  it("negates zero to positive zero", () => {
    expect(Object.is(Money.zero().negated().toCents(), 0)).toBe(true);
  });
});

describe("Money.absolute", () => {
  it.each([
    { value: -1250, expected: 1250 },
    { value: 1250, expected: 1250 },
    { value: 0, expected: 0 },
  ])("takes the magnitude of $value as $expected", ({ value, expected }) => {
    expect(Money.fromCents(value).absolute().toCents()).toBe(expected);
  });
});

describe("Money.times", () => {
  it.each([
    // The half-way table of AD-018. A half-cent rounds AWAY FROM ZERO, so the
    // two signs are mirror images and a correction cancels its original.
    { cents: 1000, bp: 5, expected: 1 }, //  0.5 -> 1
    { cents: -1000, bp: 5, expected: -1 }, // -0.5 -> -1
    { cents: 3000, bp: 5, expected: 2 }, //  1.5 -> 2
    { cents: -3000, bp: 5, expected: -2 }, // -1.5 -> -2
    { cents: 5000, bp: 5, expected: 3 }, //  2.5 -> 3
    { cents: -5000, bp: 5, expected: -3 }, // -2.5 -> -3
    { cents: 1, bp: 5000, expected: 1 }, //  0.5 -> 1
    { cents: -1, bp: 5000, expected: -1 }, // -0.5 -> -1
    { cents: 3, bp: 5000, expected: 2 }, //  1.5 -> 2
    { cents: -3, bp: 5000, expected: -2 }, // -1.5 -> -2
  ])(
    "rounds $cents cents at $bp basis points away from zero to $expected",
    ({ cents: value, bp, expected }) => {
      expect(Money.fromCents(value).times(rate(bp)).toCents()).toBe(expected);
    },
  );

  it.each([
    // Either side of the half, which must not move the same way.
    { cents: 999, bp: 5, expected: 0 }, // 0.4995
    { cents: 1001, bp: 5, expected: 1 }, // 0.5005
    { cents: -999, bp: 5, expected: 0 }, // -0.4995
    { cents: -1001, bp: 5, expected: -1 }, // -0.5005
    // Realistic VAT and charge rates, computed by hand.
    { cents: 10_000, bp: 2000, expected: 2000 }, // 100.00 € at 20 %
    { cents: 9999, bp: 2000, expected: 2000 }, // 19.998 -> 20.00
    { cents: 1999, bp: 2000, expected: 400 }, // 399.8 cents
    { cents: -1999, bp: 2000, expected: -400 },
    { cents: 1999, bp: 550, expected: 110 }, // 109.945 cents
    { cents: 1050, bp: 250, expected: 26 }, // 26.25 cents
    { cents: 1_234_567, bp: 2000, expected: 246_913 }, // 246913.4
    // Identity, zero, over 100 %, and a negative rate.
    { cents: 4321, bp: 10_000, expected: 4321 },
    { cents: 4321, bp: 0, expected: 0 },
    { cents: 0, bp: 2000, expected: 0 },
    { cents: 10_000, bp: 12_000, expected: 12_000 }, // 120 %
    { cents: 10_000, bp: -2000, expected: -2000 }, // -20 %
    { cents: -10_000, bp: -2000, expected: 2000 },
  ])(
    "multiplies $cents cents by $bp basis points to give $expected",
    ({ cents: value, bp, expected }) => {
      expect(Money.fromCents(value).times(rate(bp)).toCents()).toBe(expected);
    },
  );

  it("returns positive zero when the product rounds down to nothing", () => {
    const result = Money.fromCents(-1000).times(rate(4)); // -0.4 cents

    expect(Object.is(result.toCents(), 0)).toBe(true);
    expect(result.format()).toBe(`0,00${NBSP}€`);
  });

  it("stays exact for an amount whose product exceeds double precision", () => {
    const amount = Money.fromCents(Number.MAX_SAFE_INTEGER);

    expect(amount.times(rate(10_000)).toCents()).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("refuses a product outside the safe integer range", () => {
    const amount = Money.fromCents(Number.MAX_SAFE_INTEGER);

    expect(() => amount.times(rate(20_000))).toThrow(RangeError);
    expect(() => amount.times(rate(20_000))).toThrow(
      /overflowed the safe integer range/,
    );
  });

  it("leaves the original amount unchanged", () => {
    const amount = Money.fromCents(10_000);

    amount.times(rate(2000));

    expect(amount.toCents()).toBe(10_000);
  });
});

describe("Money.split", () => {
  it.each([
    { total: 100, parts: 3, expected: [34, 33, 33] },
    { total: -100, parts: 3, expected: [-34, -33, -33] },
    { total: 10, parts: 4, expected: [3, 3, 2, 2] },
    { total: -10, parts: 4, expected: [-3, -3, -2, -2] },
    { total: 9, parts: 3, expected: [3, 3, 3] },
    { total: 100, parts: 1, expected: [100] },
    { total: -100, parts: 1, expected: [-100] },
    { total: 0, parts: 3, expected: [0, 0, 0] },
    { total: 1, parts: 3, expected: [1, 0, 0] },
    { total: 2, parts: 5, expected: [1, 1, 0, 0, 0] },
    { total: -2, parts: 5, expected: [-1, -1, 0, 0, 0] },
    { total: 7, parts: 2, expected: [4, 3] },
  ])(
    "splits $total cents into $parts as $expected",
    ({ total, parts, expected }) => {
      expect(cents(Money.fromCents(total).split(parts))).toEqual(expected);
    },
  );

  it("gives the remaining cents to the FIRST parts", () => {
    // 100 in 6: quotient 16, remainder 4, so the first four lines carry one
    // extra cent each and the parts are in non-increasing order.
    expect(cents(Money.fromCents(100).split(6))).toEqual([
      17, 17, 17, 17, 16, 16,
    ]);
  });

  it.each([
    { total: 100, parts: 3 },
    { total: -100, parts: 3 },
    { total: 1, parts: 7 },
    { total: 0, parts: 4 },
    { total: 123_456_789, parts: 13 },
    { total: -123_456_789, parts: 13 },
    { total: Number.MAX_SAFE_INTEGER, parts: 7 },
  ])(
    "invents and loses no cent splitting $total into $parts",
    ({ total, parts }) => {
      const amount = Money.fromCents(total);

      const pieces = amount.split(parts);

      expect(pieces).toHaveLength(parts);
      expect(Money.sum(pieces).equals(amount)).toBe(true);
    },
  );

  it("is deterministic: the same split twice gives the same parts", () => {
    const amount = Money.fromCents(1234);

    expect(cents(amount.split(7))).toEqual(cents(amount.split(7)));
  });

  it("is symmetric under negation, element by element", () => {
    // This is what makes a credit note cancel the invoice it corrects
    // exactly, line by line, rather than to within a cent.
    const total = 123_457;
    const parts = 11;

    const positive = cents(Money.fromCents(total).split(parts));
    const negative = cents(Money.fromCents(-total).split(parts));

    expect(negative).toEqual(positive.map((value) => -value));
  });

  it("produces positive zeros, never negative ones, for the empty parts", () => {
    const pieces = Money.fromCents(-2).split(5);

    const zeros = cents(pieces).slice(2);
    expect(zeros.every((value) => Object.is(value, 0))).toBe(true);
  });

  it("formats a zero part without a minus sign", () => {
    const pieces = Money.fromCents(-2).split(5);

    expect(pieces.map((piece) => piece.format())).toEqual([
      `-0,01${NBSP}€`,
      `-0,01${NBSP}€`,
      `0,00${NBSP}€`,
      `0,00${NBSP}€`,
      `0,00${NBSP}€`,
    ]);
  });

  it.each([0, -1, -5, 2.5, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses to split into %p parts",
    (parts) => {
      expect(() => Money.fromCents(100).split(parts)).toThrow(RangeError);
    },
  );

  it("refuses zero parts rather than returning an empty list that loses the total", () => {
    expect(() => Money.fromCents(100).split(0)).toThrow(
      "parts must be an integer of at least 1, received 0",
    );
  });
});

describe("Money.compareTo", () => {
  it.each([
    { a: 100, b: 200, expected: -1 },
    { a: 200, b: 100, expected: 1 },
    { a: 100, b: 100, expected: 0 },
    { a: -200, b: -100, expected: -1 },
    { a: -100, b: 100, expected: -1 },
  ])("compares $a to $b as $expected", ({ a, b, expected }) => {
    expect(Money.fromCents(a).compareTo(Money.fromCents(b))).toBe(expected);
  });

  it("sorts an array into ascending order", () => {
    const amounts = [300, -100, 0, 150].map((value) => Money.fromCents(value));

    const sorted = [...amounts].sort((a, b) => a.compareTo(b));

    expect(cents(sorted)).toEqual([-100, 0, 150, 300]);
  });
});

describe("Money comparisons", () => {
  it.each([
    { a: 100, b: 100, equals: true },
    { a: 100, b: 101, equals: false },
    { a: 0, b: -0, equals: true },
  ])("equals($a, $b) is $equals", ({ a, b, equals }) => {
    expect(Money.fromCents(a).equals(Money.fromCents(b))).toBe(equals);
  });

  it("orders strictly", () => {
    const small = Money.fromCents(-100);
    const large = Money.fromCents(100);

    expect(small.isLessThan(large)).toBe(true);
    expect(large.isLessThan(small)).toBe(false);
    expect(small.isLessThan(small)).toBe(false);
    expect(large.isGreaterThan(small)).toBe(true);
    expect(small.isGreaterThan(large)).toBe(false);
    expect(large.isGreaterThan(large)).toBe(false);
  });

  it.each([
    { value: 0, isZero: true, isNegative: false, isPositive: false },
    { value: 1, isZero: false, isNegative: false, isPositive: true },
    { value: -1, isZero: false, isNegative: true, isPositive: false },
  ])(
    "classifies $value as zero=$isZero negative=$isNegative positive=$isPositive",
    ({ value, isZero, isNegative, isPositive }) => {
      const amount = Money.fromCents(value);

      expect(amount.isZero()).toBe(isZero);
      expect(amount.isNegative()).toBe(isNegative);
      expect(amount.isPositive()).toBe(isPositive);
    },
  );
});

describe("Money.format", () => {
  it.each([
    { value: 123_456, expected: `1${GROUP}234,56${NBSP}€` },
    { value: -123_456, expected: `-1${GROUP}234,56${NBSP}€` },
    { value: 0, expected: `0,00${NBSP}€` },
    { value: 5, expected: `0,05${NBSP}€` },
    { value: -5, expected: `-0,05${NBSP}€` },
    { value: 100, expected: `1,00${NBSP}€` },
    { value: 99, expected: `0,99${NBSP}€` },
    { value: 100_000_000, expected: `1${GROUP}000${GROUP}000,00${NBSP}€` },
  ])("renders $value cents as $expected", ({ value, expected }) => {
    expect(Money.fromCents(value).format()).toBe(expected);
  });

  it("groups with U+202F and separates the currency sign with U+00A0", () => {
    // Pinned explicitly: a test written with ordinary spaces would pass
    // nowhere, and a reader comparing by eye cannot tell the three apart.
    const formatted = Money.fromCents(123_456).format();

    expect([...formatted].map((char) => char.codePointAt(0))).toEqual([
      0x31, 0x202f, 0x32, 0x33, 0x34, 0x2c, 0x35, 0x36, 0xa0, 0x20ac,
    ]);
  });

  it("renders an amount that a float division could not, exactly", () => {
    expect(Money.fromCents(Number.MAX_SAFE_INTEGER).format()).toBe(
      `90${GROUP}071${GROUP}992${GROUP}547${GROUP}409,91${NBSP}€`,
    );
  });
});
