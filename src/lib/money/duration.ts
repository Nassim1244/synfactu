// The `Duration` value object.
//
// A duration is stored and carried as an integer number of minutes (AD-007).
// Every rounding rule for time lives here; arithmetic on raw minutes anywhere
// else in the tree is a defect (`policy_coding_guidelines.md` -> Value
// objects).

import {
  assertPositiveInteger,
  assertSafeInteger,
  normaliseZero,
} from "./arithmetic";
import { LOCALE } from "./locale";

/** Minutes in an hour. Named so the formatting arithmetic reads as intent. */
const MINUTES_PER_HOUR = 60;

/**
 * The bootstrap day length in minutes: seven hours (AD-018).
 *
 * This is a DEFAULT a caller may reach for, not a constant `Duration` reads.
 * `toDays` and `formatDays` take the day length as an argument and this module
 * never passes this value to them itself. `context/vision.md` -> Roadmap makes
 * `hours_per_day` a setting owned by feature v01-001, and when that lands the
 * call sites read the setting instead of this constant - without `Duration`
 * changing at all. That is the whole reason it is a parameter.
 */
export const DEFAULT_DAY_LENGTH_MINUTES = 420;

/**
 * Built once. Two fraction digits, because a decimal number of days is a
 * display figure; its rounding mode is "halfExpand", half away from zero,
 * which is the same direction as the money rule in AD-018.
 */
const daysFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export class Duration {
  private readonly minutes: number;

  // Explicit field rather than a constructor parameter property: the shorter
  // form is not erasable syntax and fails under a type-stripping runtime.
  private constructor(minutes: number) {
    this.minutes = minutes;
  }

  /**
   * Builds a duration from an integer number of minutes. This is the
   * repository boundary conversion: a column holds minutes, the domain holds
   * `Duration`.
   *
   * Negative durations are accepted: a correction to an already-recorded entry
   * is one, and rejecting it here would push the subtraction outside the value
   * object.
   *
   * @throws RangeError when the argument is not a safe integer. A fractional
   * minute is a caller mistake - usually a value still expressed in hours.
   */
  static fromMinutes(minutes: number): Duration {
    assertSafeInteger(minutes, "minutes");
    return new Duration(normaliseZero(minutes));
  }

  /** The zero duration. */
  static zero(): Duration {
    return new Duration(0);
  }

  /**
   * Sums a list of durations, returning zero for an empty list. Present for
   * the same reason as `Money.sum`: a total is where raw-minute arithmetic
   * otherwise creeps in.
   */
  static sum(durations: readonly Duration[]): Duration {
    return durations.reduce<Duration>(
      (total, duration) => total.plus(duration),
      Duration.zero(),
    );
  }

  /** The integer number of minutes, for storage. */
  toMinutes(): number {
    return this.minutes;
  }

  /**
   * This duration plus another.
   *
   * @throws RangeError when the sum leaves the safe integer range.
   */
  plus(other: Duration): Duration {
    return Duration.fromMinutes(this.minutes + other.minutes);
  }

  /**
   * This duration minus another. The result may be negative.
   *
   * @throws RangeError when the difference leaves the safe integer range.
   */
  minus(other: Duration): Duration {
    return Duration.fromMinutes(this.minutes - other.minutes);
  }

  /**
   * Rounds the duration up to the next multiple of a step, where "up" means
   * away from zero - the same direction as the money rule in AD-018, which
   * spells half up as "rounds away from zero".
   *
   * 67 minutes at a step of 15 becomes 75. A duration that is already a
   * multiple of the step is returned unchanged, and zero stays zero.
   *
   * A NEGATIVE duration rounds to a MORE negative multiple: -67 at a step of
   * 15 becomes -75, not -60. This is the choice that makes a correction cancel
   * the entry it corrects: 67 rounds to 75 and -67 rounds to -75, and the two
   * sum to nothing. Rounding negatives toward positive infinity instead would
   * leave a residue of one step behind every reversal.
   *
   * @param stepMinutes the billing granularity, in minutes. A step of 1 is the
   * identity. Comes from a setting, never from a constant here
   * (`context/vision.md` -> Roadmap, v01-001).
   * @throws RangeError when the step is not an integer of at least 1. Zero
   * would have no next multiple to round to.
   */
  roundUpTo(stepMinutes: number): Duration {
    assertPositiveInteger(stepMinutes, "step in minutes");

    const magnitude = Math.abs(this.minutes);
    const remainder = magnitude % stepMinutes;
    const rounded =
      remainder === 0 ? magnitude : magnitude + (stepMinutes - remainder);

    return Duration.fromMinutes(this.minutes < 0 ? -rounded : rounded);
  }

  /**
   * Converts the duration to a decimal number of days, given the length of a
   * working day in minutes.
   *
   * The day length is a PARAMETER and never a constant (AD-018): it becomes
   * the `hours_per_day` setting at feature v01-001, and no later change of it
   * may require touching this class. `DEFAULT_DAY_LENGTH_MINUTES` is available
   * as the bootstrap default for callers that have no setting to read yet.
   *
   * The returned value is a plain `number` and is therefore the one place in
   * this folder where a float appears. That is intentional and safe: a decimal
   * number of days is a DERIVED display figure, never stored and never fed
   * back into an amount (`policy_architecture.md` -> Data model conventions).
   * Do not round it here - rounding for display is `formatDays`.
   *
   * @param dayLengthMinutes minutes in a working day, at least 1.
   * @throws RangeError when the day length is not a positive integer. A zero
   * day length is rejected rather than allowed to produce `Infinity` or `NaN`,
   * which would travel a long way before anyone noticed.
   */
  toDays(dayLengthMinutes: number): number {
    assertPositiveInteger(dayLengthMinutes, "day length in minutes");
    return normaliseZero(this.minutes / dayLengthMinutes);
  }

  /**
   * Renders the duration as a decimal number of days in the application
   * locale, always with two fraction digits: 630 minutes over a 420-minute day
   * becomes "1,50 j".
   *
   * Exists so that no call site reaches for `toFixed(2)` on the result of
   * `toDays` (`policy_coding_guidelines.md` -> Value objects: formatting for
   * display is a value-object method).
   *
   * @param dayLengthMinutes minutes in a working day, at least 1.
   * @throws RangeError when the day length is not a positive integer.
   */
  formatDays(dayLengthMinutes: number): string {
    return `${daysFormatter.format(this.toDays(dayLengthMinutes))} j`;
  }

  /** True when both durations hold the same number of minutes. */
  equals(other: Duration): boolean {
    return this.minutes === other.minutes;
  }

  /**
   * Orders two durations: -1 when this one is the shorter, 0 when they are
   * equal, 1 when this one is the longer. Suitable as an `Array.sort`
   * comparator.
   */
  compareTo(other: Duration): -1 | 0 | 1 {
    if (this.minutes < other.minutes) {
      return -1;
    }
    if (this.minutes > other.minutes) {
      return 1;
    }
    return 0;
  }

  /** True when the duration is exactly zero. */
  isZero(): boolean {
    return this.minutes === 0;
  }

  /** True when the duration is strictly below zero. */
  isNegative(): boolean {
    return this.minutes < 0;
  }

  /**
   * Renders the duration as hours and minutes in the French convention:
   * 450 minutes becomes "7 h 30", 420 becomes "7 h", 45 becomes "45 min" and
   * -450 becomes "-7 h 30". Zero is "0 min".
   *
   * The minutes are padded to two digits only when hours are shown, so "7 h 05"
   * cannot be misread as "7 h 5". Plain spaces are used and the number is not
   * grouped: a duration is read, not totalled by eye, and grouping would make
   * the string depend on `Intl` data for no benefit.
   */
  format(): string {
    const magnitude = Math.abs(this.minutes);
    const minutes = magnitude % MINUTES_PER_HOUR;
    const hours = (magnitude - minutes) / MINUTES_PER_HOUR;
    const sign = this.minutes < 0 ? "-" : "";

    if (hours === 0) {
      return `${sign}${minutes} min`;
    }
    if (minutes === 0) {
      return `${sign}${hours} h`;
    }
    return `${sign}${hours} h ${minutes.toString().padStart(2, "0")}`;
  }
}
