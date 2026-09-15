// Tests for `src/lib/money/duration.ts` (specs/init.md step 6).
//
// The rounding direction for negatives is the decision this file exists to
// pin: AD-018 spells rounding as "away from zero", so -67 minutes at a step
// of 15 is -75 and not -60, and a rounded correction therefore cancels the
// rounded entry it corrects. Nothing else in the tree makes that visible
// until the first negative duration exists.
//
// `format` is deliberately unspaced ("7h30") while `formatDays` is spaced
// ("1,50 j"). Both are asserted as the code renders them.

import { describe, expect, it } from "vitest";

import { DEFAULT_DAY_LENGTH_MINUTES, Duration } from "@/lib/money/duration";

/** Narrow no-break space: the fr-FR grouping separator. */
const GROUP = "\u202f";

const minutes = (value: number): Duration => Duration.fromMinutes(value);

describe("DEFAULT_DAY_LENGTH_MINUTES", () => {
  it("is the seven-hour bootstrap day of AD-018", () => {
    expect(DEFAULT_DAY_LENGTH_MINUTES).toBe(420);
  });

  it("is a default the caller passes in, not a value Duration reads by itself", () => {
    // Proof that the day length is a parameter: the same duration converts
    // differently under a different day, with no constant to change.
    expect(minutes(420).toDays(DEFAULT_DAY_LENGTH_MINUTES)).toBe(1);
    expect(minutes(420).toDays(480)).toBe(0.875);
  });
});

describe("Duration.fromMinutes", () => {
  it.each([0, 1, -1, 450, -450, Number.MAX_SAFE_INTEGER])(
    "round-trips %p minutes",
    (value) => {
      expect(minutes(value).toMinutes()).toBe(value);
    },
  );

  it.each([
    1.5,
    -1.5,
    0.25,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])("refuses %p, because a minute is indivisible", (value) => {
    expect(() => minutes(value)).toThrow(RangeError);
  });

  it("accepts a negative duration, which is what a correction is", () => {
    expect(minutes(-90).toMinutes()).toBe(-90);
  });

  it("normalises negative zero", () => {
    expect(Object.is(minutes(-0).toMinutes(), 0)).toBe(true);
  });
});

describe("Duration.zero", () => {
  it("is zero minutes", () => {
    expect(Duration.zero().toMinutes()).toBe(0);
    expect(Duration.zero().isZero()).toBe(true);
  });
});

describe("Duration.sum", () => {
  it("returns zero for an empty list", () => {
    expect(Duration.sum([]).toMinutes()).toBe(0);
  });

  it("adds every duration, of either sign", () => {
    expect(Duration.sum([450, 30, -60, 0].map(minutes)).toMinutes()).toBe(420);
  });

  it("refuses a total outside the safe integer range", () => {
    expect(() =>
      Duration.sum([minutes(Number.MAX_SAFE_INTEGER), minutes(1)]),
    ).toThrow(RangeError);
  });
});

describe("Duration.plus", () => {
  it.each([
    { a: 450, b: 30, expected: 480 },
    { a: 450, b: -30, expected: 420 },
    { a: -450, b: -30, expected: -480 },
    { a: 450, b: -450, expected: 0 },
  ])("adds $a and $b to $expected", ({ a, b, expected }) => {
    expect(minutes(a).plus(minutes(b)).toMinutes()).toBe(expected);
  });

  it("leaves both operands unchanged", () => {
    const left = minutes(450);
    const right = minutes(30);

    left.plus(right);

    expect(left.toMinutes()).toBe(450);
    expect(right.toMinutes()).toBe(30);
  });

  it("refuses a sum outside the safe integer range", () => {
    expect(() => minutes(Number.MAX_SAFE_INTEGER).plus(minutes(1))).toThrow(
      RangeError,
    );
  });
});

describe("Duration.minus", () => {
  it.each([
    { a: 450, b: 30, expected: 420 },
    { a: 30, b: 450, expected: -420 },
    { a: -30, b: -450, expected: 420 },
  ])("subtracts $b from $a to give $expected", ({ a, b, expected }) => {
    expect(minutes(a).minus(minutes(b)).toMinutes()).toBe(expected);
  });

  it("yields positive zero when the two are equal", () => {
    expect(Object.is(minutes(-450).minus(minutes(-450)).toMinutes(), 0)).toBe(
      true,
    );
  });

  it("refuses a difference outside the safe integer range", () => {
    expect(() => minutes(Number.MIN_SAFE_INTEGER).minus(minutes(1))).toThrow(
      RangeError,
    );
  });
});

describe("Duration.roundUpTo", () => {
  it.each([
    // Away from zero in both directions (AD-018).
    { value: 67, step: 15, expected: 75 },
    { value: -67, step: 15, expected: -75 },
    { value: 1, step: 15, expected: 15 },
    { value: -1, step: 15, expected: -15 },
    { value: 14, step: 15, expected: 15 },
    { value: -14, step: 15, expected: -15 },
    { value: 16, step: 15, expected: 30 },
    { value: -16, step: 15, expected: -30 },
    // Already a multiple: unchanged, either sign.
    { value: 60, step: 15, expected: 60 },
    { value: -60, step: 15, expected: -60 },
    { value: 75, step: 15, expected: 75 },
    { value: 0, step: 15, expected: 0 },
    // Other steps.
    { value: 67, step: 60, expected: 120 },
    { value: -67, step: 60, expected: -120 },
    { value: 90, step: 30, expected: 90 },
    { value: 91, step: 30, expected: 120 },
    { value: 67, step: 1, expected: 67 },
    { value: -67, step: 1, expected: -67 },
  ])(
    "rounds $value up to the next multiple of $step as $expected",
    ({ value, step, expected }) => {
      expect(minutes(value).roundUpTo(step).toMinutes()).toBe(expected);
    },
  );

  it("rounds a correction to exactly the negation of the entry it corrects", () => {
    // The consequence the decision was ratified for: rounding negatives
    // toward positive infinity would leave one step of residue behind every
    // reversal.
    const entry = minutes(67).roundUpTo(15);
    const correction = minutes(-67).roundUpTo(15);

    expect(correction.toMinutes()).toBe(-entry.toMinutes());
    expect(entry.plus(correction).isZero()).toBe(true);
  });

  it("keeps zero at positive zero", () => {
    expect(Object.is(minutes(0).roundUpTo(15).toMinutes(), 0)).toBe(true);
  });

  it("leaves the original unchanged", () => {
    const duration = minutes(67);

    duration.roundUpTo(15);

    expect(duration.toMinutes()).toBe(67);
  });

  it.each([0, -1, -15, 2.5, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses the step %p",
    (step) => {
      expect(() => minutes(67).roundUpTo(step)).toThrow(RangeError);
    },
  );

  it("names the step in the message", () => {
    expect(() => minutes(67).roundUpTo(0)).toThrow(
      "step in minutes must be an integer of at least 1, received 0",
    );
  });
});

describe("Duration.toDays", () => {
  it.each([
    { value: 630, dayLength: 420, expected: 1.5 },
    { value: 420, dayLength: 420, expected: 1 },
    { value: 210, dayLength: 420, expected: 0.5 },
    { value: 840, dayLength: 420, expected: 2 },
    { value: -630, dayLength: 420, expected: -1.5 },
    { value: -420, dayLength: 420, expected: -1 },
    { value: 0, dayLength: 420, expected: 0 },
    { value: 240, dayLength: 480, expected: 0.5 },
  ])(
    "converts $value minutes over a $dayLength-minute day to $expected days",
    ({ value, dayLength, expected }) => {
      expect(minutes(value).toDays(dayLength)).toBe(expected);
    },
  );

  it("does not round the derived figure", () => {
    // A decimal number of days is a display value; rounding it belongs to
    // formatDays, not here.
    expect(minutes(100).toDays(420)).toBeCloseTo(0.238095238095, 12);
  });

  it("returns positive zero", () => {
    expect(Object.is(minutes(0).toDays(420), 0)).toBe(true);
  });

  it.each([0, -60, -1, 2.5, 0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses the day length %p rather than producing Infinity or NaN",
    (dayLength) => {
      expect(() => minutes(630).toDays(dayLength)).toThrow(RangeError);
    },
  );

  it("names the day length in the message", () => {
    expect(() => minutes(630).toDays(0)).toThrow(
      "day length in minutes must be an integer of at least 1, received 0",
    );
  });
});

describe("Duration.formatDays", () => {
  it.each([
    { value: 630, expected: "1,50 j" },
    { value: 420, expected: "1,00 j" },
    { value: -630, expected: "-1,50 j" },
    { value: 0, expected: "0,00 j" },
    { value: 100, expected: "0,24 j" }, // 0.238095... rounds away from zero
    { value: 210, expected: "0,50 j" },
  ])("renders $value minutes as $expected", ({ value, expected }) => {
    expect(minutes(value).formatDays(420)).toBe(expected);
  });

  it("rounds the displayed figure half away from zero", () => {
    // 105 minutes over an 840-minute day is exactly 0.125 days.
    expect(minutes(105).formatDays(840)).toBe("0,13 j");
    expect(minutes(-105).formatDays(840)).toBe("-0,13 j");
  });

  it("separates the unit with an ordinary space and groups with U+202F", () => {
    // The two separators differ, which is invisible in the source: the space
    // before "j" is U+0020 and comes from this class, the grouping separator
    // is U+202F and comes from Intl.
    expect(minutes(420_000).formatDays(420)).toBe(`1${GROUP}000,00 j`);
  });

  it("refuses an invalid day length", () => {
    expect(() => minutes(630).formatDays(0)).toThrow(RangeError);
  });
});

describe("Duration.format", () => {
  it.each([
    { value: 450, expected: "7h30" },
    { value: 420, expected: "7h" },
    { value: 45, expected: "45min" },
    { value: 65, expected: "1h05" },
    { value: 1440, expected: "24h" },
    { value: 0, expected: "0min" },
    { value: 1, expected: "1min" },
    { value: 59, expected: "59min" },
    { value: 60, expected: "1h" },
    { value: 61, expected: "1h01" },
    { value: -450, expected: "-7h30" },
    { value: -45, expected: "-45min" },
    { value: -65, expected: "-1h05" },
    { value: -420, expected: "-7h" },
  ])("renders $value minutes as $expected", ({ value, expected }) => {
    expect(minutes(value).format()).toBe(expected);
  });

  it("is unspaced, so a dense table column stays narrow", () => {
    expect(minutes(450).format()).not.toContain(" ");
    expect(minutes(450).format()).not.toContain("\u00a0");
  });

  it("pads the minutes only when hours are shown", () => {
    expect(minutes(5).format()).toBe("5min");
    expect(minutes(65).format()).toBe("1h05");
  });

  it("does not group large hour counts", () => {
    expect(minutes(60_000).format()).toBe("1000h");
  });
});

describe("Duration comparisons", () => {
  it.each([
    { a: 450, b: 450, expected: true },
    { a: 450, b: 451, expected: false },
    { a: 0, b: -0, expected: true },
    { a: -450, b: 450, expected: false },
  ])("equals($a, $b) is $expected", ({ a, b, expected }) => {
    expect(minutes(a).equals(minutes(b))).toBe(expected);
  });

  it.each([
    { a: 30, b: 60, expected: -1 },
    { a: 60, b: 30, expected: 1 },
    { a: 60, b: 60, expected: 0 },
    { a: -60, b: -30, expected: -1 },
  ])("compares $a to $b as $expected", ({ a, b, expected }) => {
    expect(minutes(a).compareTo(minutes(b))).toBe(expected);
  });

  it("sorts an array into ascending order", () => {
    const durations = [90, -30, 0, 45].map(minutes);

    const sorted = [...durations].sort((a, b) => a.compareTo(b));

    expect(sorted.map((duration) => duration.toMinutes())).toEqual([
      -30, 0, 45, 90,
    ]);
  });

  it.each([
    { value: 0, isZero: true, isNegative: false },
    { value: 1, isZero: false, isNegative: false },
    { value: -1, isZero: false, isNegative: true },
  ])(
    "classifies $value as zero=$isZero negative=$isNegative",
    ({ value, isZero, isNegative }) => {
      expect(minutes(value).isZero()).toBe(isZero);
      expect(minutes(value).isNegative()).toBe(isNegative);
    },
  );
});
