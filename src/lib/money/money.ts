// The `Money` value object.
//
// An amount is stored and carried as an integer number of cents (AD-007). No
// float ever holds a monetary value: the only division in this file resolves
// back to an integer under the half-up rule, and formatting goes through an
// exact decimal string rather than `cents / 100`.
//
// Every rounding rule for money lives here. Arithmetic on raw cents anywhere
// else in the tree is a defect (`policy_coding_guidelines.md` -> Value
// objects).

import {
  assertPositiveInteger,
  assertSafeInteger,
  divideWithRemainder,
  normaliseZero,
  scaleHalfUp,
  toDecimalString,
} from "./arithmetic";
import { CURRENCY, LOCALE } from "./locale";
import { BASIS_POINTS_PER_UNIT, type Rate } from "./rate";

/** How many of a cent value's digits are fractional once it is in units. */
const FRACTION_DIGITS = 2;

/** Built once; the locale and currency are constants, so there is no argument. */
const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
});

export class Money {
  private readonly cents: number;

  // Written as an explicit field rather than a constructor parameter property:
  // a parameter property is not erasable syntax, so it fails under a
  // type-stripping runtime. Nothing is gained by the shorter form.
  private constructor(cents: number) {
    this.cents = cents;
  }

  /**
   * Builds an amount from an integer number of cents. This is the repository
   * boundary conversion: a column holds cents, the domain holds `Money`.
   *
   * @throws RangeError when the argument is not a safe integer. A cent is
   * indivisible, so 10.5 cents is a caller mistake - most often a value that
   * was already in euros - and rounding it here would hide the mistake
   * instead of surfacing it.
   */
  static fromCents(cents: number): Money {
    assertSafeInteger(cents, "cents");
    return new Money(normaliseZero(cents));
  }

  /** The zero amount. */
  static zero(): Money {
    return new Money(0);
  }

  /**
   * Sums a list of amounts, returning zero for an empty list.
   *
   * Provided because a total is the operation that most often tempts a caller
   * into `reduce((a, b) => a + b.cents, 0)`, which is exactly the arithmetic
   * on raw cents AD-007 forbids.
   */
  static sum(amounts: readonly Money[]): Money {
    return amounts.reduce<Money>(
      (total, amount) => total.plus(amount),
      Money.zero(),
    );
  }

  /** The integer number of cents, for storage. */
  toCents(): number {
    return this.cents;
  }

  /**
   * This amount plus another.
   *
   * @throws RangeError when the sum leaves the safe integer range.
   */
  plus(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }

  /**
   * This amount minus another. The result may be negative; a negative amount
   * is a legitimate value here (a credit note, a correction).
   *
   * @throws RangeError when the difference leaves the safe integer range.
   */
  minus(other: Money): Money {
    return Money.fromCents(this.cents - other.cents);
  }

  /** The same amount with the opposite sign. Zero negates to zero, not to -0. */
  negated(): Money {
    return Money.fromCents(normaliseZero(-this.cents));
  }

  /** The magnitude of the amount, always zero or positive. */
  absolute(): Money {
    return this.cents < 0 ? this.negated() : this;
  }

  /**
   * This amount multiplied by a rate, rounded half up (AD-018): a half-cent
   * rounds away from zero. 1000 cents at 5 basis points (0.05 %) is exactly
   * 0.5 cents and becomes 1, and -1000 cents at the same rate becomes -1 - the
   * half moves away from zero in both directions, never toward it.
   *
   * Only an exact half moves. 1050 cents at 250 basis points (2.50 %) is
   * 26.25 cents, which is below the half, so it stays 26, and -1050 cents at
   * the same rate stays -26. Half up is not "always up".
   *
   * The product is computed in `bigint`, so the intermediate value is exact no
   * matter how large the amount, and only the final quotient has to fit in a
   * safe integer.
   *
   * @throws RangeError when the result leaves the safe integer range.
   */
  times(rate: Rate): Money {
    return Money.fromCents(
      scaleHalfUp(
        this.cents,
        rate.toBasisPoints(),
        BASIS_POINTS_PER_UNIT,
        "cents",
      ),
    );
  }

  /**
   * Divides the amount into a given number of parts that sum back to it
   * exactly. No cent is invented and none is lost:
   * `Money.sum(m.split(n)).equals(m)` holds for every `m` and every `n`.
   *
   * The distribution is deterministic. Each part gets the truncated quotient,
   * then the remaining units - always fewer than `parts` of them - are handed
   * out one each to the FIRST parts of the list. 100 cents in 3 gives
   * [34, 33, 33]; -100 cents in 3 gives [-34, -33, -33].
   *
   * Two properties follow from truncating toward zero and filling from the
   * front, and both are deliberate:
   *   - the split of a negative amount is the negation, element by element, of
   *     the split of its magnitude, so a correction cancels the entry it
   *     corrects exactly;
   *   - the parts are in non-increasing order of magnitude, so the line
   *     carrying the extra cent is the first one a reader checks rather than
   *     one buried in the middle.
   *
   * @param parts how many parts to produce. Must be an integer of at least 1.
   * @throws RangeError when `parts` is not a positive integer. Zero parts is
   * rejected rather than returning an empty list, because an empty list would
   * lose the whole amount silently.
   */
  split(parts: number): Money[] {
    assertPositiveInteger(parts, "parts");

    // Truncated toward zero, so the remainder carries the sign of the total
    // and its magnitude is strictly less than `parts`.
    const { quotient, remainder } = divideWithRemainder(this.cents, parts);

    const unit = remainder < 0 ? -1 : 1;
    const partsWithExtra = Math.abs(remainder);

    const result: Money[] = [];
    for (let index = 0; index < parts; index += 1) {
      result.push(
        Money.fromCents(quotient + (index < partsWithExtra ? unit : 0)),
      );
    }
    return result;
  }

  /**
   * Orders two amounts: -1 when this one is the smaller, 0 when they are
   * equal, 1 when this one is the larger. Suitable as an `Array.sort`
   * comparator.
   */
  compareTo(other: Money): -1 | 0 | 1 {
    if (this.cents < other.cents) {
      return -1;
    }
    if (this.cents > other.cents) {
      return 1;
    }
    return 0;
  }

  /** True when both amounts hold the same number of cents. */
  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  /** True when this amount is strictly smaller than the other. */
  isLessThan(other: Money): boolean {
    return this.cents < other.cents;
  }

  /** True when this amount is strictly larger than the other. */
  isGreaterThan(other: Money): boolean {
    return this.cents > other.cents;
  }

  /** True when the amount is exactly zero. */
  isZero(): boolean {
    return this.cents === 0;
  }

  /** True when the amount is strictly below zero. */
  isNegative(): boolean {
    return this.cents < 0;
  }

  /** True when the amount is strictly above zero. */
  isPositive(): boolean {
    return this.cents > 0;
  }

  /**
   * Renders the amount in the application locale and currency: 123456 cents
   * becomes "1 234,56 €".
   *
   * The grouping separator is U+202F, a narrow no-break space, and the space
   * before the currency sign is U+00A0; both are what `Intl` produces for
   * fr-FR, not choices made here.
   *
   * The value reaches `Intl` as an exact decimal string rather than as
   * `cents / 100`, so no rounding happens at display time at all.
   */
  format(): string {
    return currencyFormatter.format(
      toDecimalString(this.cents, FRACTION_DIGITS),
    );
  }
}
