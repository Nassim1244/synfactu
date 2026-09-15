// The `Rate` value object.
//
// A rate is stored and carried as an integer number of basis points: one
// hundredth of a percent, so 2460 is 24.60 % (AD-007,
// `policy_architecture.md` -> Data model conventions). VAT, a social charge
// rate and a discount are all the same kind of thing at this level.
//
// `Money` is imported as a type only. `Rate.applyTo` delegates the arithmetic
// to `Money.times`, so the class itself is never referenced at runtime and the
// two modules do not form a runtime import cycle.

import { toDecimalString } from "./arithmetic";
import { LOCALE } from "./locale";
import type { Money } from "./money";

/** Basis points in one whole unit: 10 000 basis points is 100 %. */
export const BASIS_POINTS_PER_UNIT = 10_000;

/**
 * How many of a basis-point value's digits are fractional once it is expressed
 * as a fraction of one: 2460 basis points is 0.2460.
 */
const FRACTION_DIGITS = 4;

/**
 * Built once. Constructing an `Intl` formatter is expensive relative to
 * formatting with it, and the locale is a constant, so there is nothing to
 * parameterise.
 *
 * Its default rounding mode is "halfExpand" - half away from zero - which is
 * the same convention as AD-018. It only ever applies to a value that already
 * has at most four decimals, so no half-way case can actually arise.
 */
const percentFormatter = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export class Rate {
  private readonly basisPoints: number;

  // Explicit field rather than a constructor parameter property: the shorter
  // form is not erasable syntax and fails under a type-stripping runtime.
  private constructor(basisPoints: number) {
    this.basisPoints = basisPoints;
  }

  /**
   * Builds a rate from an integer number of basis points.
   *
   * Both signs and values above 10 000 are accepted: a rate over 100 % is a
   * legitimate multiplier and a negative rate is a legitimate reduction.
   * Narrowing the range is a feature's business rule and belongs in that
   * feature's Zod schema (`policy_security.md` -> Input validation), not here.
   *
   * @throws RangeError when the argument is not a safe integer. A rate given
   * as 0.246 rather than 2460 is a unit mistake, and rounding it silently
   * would hide it.
   */
  static fromBasisPoints(basisPoints: number): Rate {
    if (!Number.isSafeInteger(basisPoints)) {
      throw new RangeError(
        `basis points must be a safe integer, received ${String(basisPoints)}`,
      );
    }
    return new Rate(basisPoints === 0 ? 0 : basisPoints);
  }

  /** The zero rate, 0 %. */
  static zero(): Rate {
    return new Rate(0);
  }

  /** The integer number of basis points, for storage and for `Money.times`. */
  toBasisPoints(): number {
    return this.basisPoints;
  }

  /**
   * Applies this rate to an amount, rounding half up (AD-018).
   *
   * The reverse spelling of `money.times(rate)` and exactly equivalent to it:
   * the arithmetic lives in `Money` so there is only one place a cent can be
   * rounded.
   */
  applyTo(money: Money): Money {
    return money.times(this);
  }

  /** True when both rates carry the same number of basis points. */
  equals(other: Rate): boolean {
    return this.basisPoints === other.basisPoints;
  }

  /** True when the rate is exactly zero. */
  isZero(): boolean {
    return this.basisPoints === 0;
  }

  /**
   * Renders the rate as a percentage in the application locale, always with
   * two fraction digits: 2460 becomes "24,60 %".
   *
   * The space before the sign is U+00A0, a no-break space, because that is
   * what `Intl` produces for fr-FR.
   */
  format(): string {
    return percentFormatter.format(
      toDecimalString(this.basisPoints, FRACTION_DIGITS),
    );
  }
}
