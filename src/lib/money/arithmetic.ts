// Exact integer arithmetic shared by the three value objects.
//
// Internal to `src/lib/money/`. Nothing here is re-exported from `index.ts`:
// these are the primitives the value objects are built from, not an API for
// the rest of the tree. Arithmetic on raw cents, minutes or basis points
// outside this folder is forbidden (AD-007).
//
// Every quantity the domain stores is an integer in its smallest unit, so
// anything that would introduce a fraction - applying a rate, splitting a
// total - resolves back to an integer here, once, under one rule.
//
// `bigint` is confined to this file. The two operations that could overflow -
// multiplying an amount by a rate, and dividing a total exactly - are done in
// arbitrary precision and handed back as safe integers, so the value objects
// themselves never hold one.
//
// The literals are written `BigInt(0)` rather than `0n` because `tsconfig.json`
// targets ES2017, which forbids the literal form. The constructor call is
// equivalent; raising the target is a toolchain decision and not this module's
// to make.

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);

/**
 * Rejects anything that is not an exact integer JavaScript can represent.
 *
 * `Number.isSafeInteger` is the right test rather than `Number.isInteger`:
 * beyond 2^53 the doubles are still integers but are no longer consecutive, so
 * two different amounts can compare equal. A financial value that silently
 * loses its last digit is worse than a thrown error.
 *
 * @throws RangeError naming the offending value. This is a programmer error -
 * the caller was handed a non-integer where the unit is indivisible - so it
 * throws rather than returning a result (`policy_coding_guidelines.md` ->
 * Error handling and logging).
 */
export function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `${label} must be a safe integer, received ${String(value)}`,
    );
  }
}

/**
 * Rejects anything that is not a positive integer count.
 *
 * Used for the arguments that appear as a divisor or a step: the number of
 * parts of a split, a rounding step, a day length. Zero is rejected explicitly
 * rather than allowed to produce `Infinity` or an empty array.
 *
 * @throws RangeError naming the offending value.
 */
export function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(
      `${label} must be an integer of at least 1, received ${String(value)}`,
    );
  }
}

/**
 * Collapses negative zero to zero.
 *
 * `-0` is a distinct double. It survives `===` comparison against `0` but not
 * `Object.is`, and `Intl.NumberFormat` renders it as "-0,00 €". Normalising at
 * construction means no value object ever holds it, so no method downstream
 * has to think about it.
 */
export function normaliseZero(value: number): number {
  return value === 0 ? 0 : value;
}

/**
 * Converts a `bigint` back to a `number`, refusing to lose precision.
 *
 * @throws RangeError when the value does not fit in a safe integer - an
 * overflow that would otherwise surface much later as a figure that is wrong
 * only in its last digits.
 */
function toSafeInteger(value: bigint, label: string): number {
  if (
    value > BigInt(Number.MAX_SAFE_INTEGER) ||
    value < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new RangeError(
      `${label} overflowed the safe integer range, computed ${value.toString()}`,
    );
  }
  return Number(value);
}

/**
 * Multiplies an integer by another and divides the product by a scale,
 * rounding half up - a half rounds away from zero.
 *
 * This is the one rounding rule for money (AD-018,
 * `policy_coding_guidelines.md` -> Value objects): 2.5 becomes 3 and -2.5
 * becomes -3, which is what a reader checking a single line by hand expects.
 *
 * The product is formed in arbitrary precision, so an amount and a rate that
 * would overflow a double when multiplied still round correctly; only the
 * final quotient has to fit in a safe integer.
 *
 * @param value the integer to scale, of either sign.
 * @param multiplier the integer to scale it by, of either sign.
 * @param scale the divisor. Must not be zero.
 * @param label used in the overflow message.
 * @returns the scaled value, rounded half away from zero.
 * @throws RangeError when the scale is zero or the result overflows.
 */
export function scaleHalfUp(
  value: number,
  multiplier: number,
  scale: number,
  label: string,
): number {
  if (scale === 0) {
    throw new RangeError("scale must not be zero");
  }

  const numerator = BigInt(value) * BigInt(multiplier);
  const denominator = BigInt(scale);

  const isNegative = numerator < ZERO !== denominator < ZERO;
  const absNumerator = numerator < ZERO ? -numerator : numerator;
  const absDenominator = denominator < ZERO ? -denominator : denominator;

  const quotient = absNumerator / absDenominator;
  const remainder = absNumerator % absDenominator;

  // `2 * remainder >= denominator` is the half-way test written without a
  // division, so it stays exact. `>=` rather than `>` is what makes it half
  // UP rather than half down.
  const rounded = TWO * remainder >= absDenominator ? quotient + ONE : quotient;

  return toSafeInteger(isNegative ? -rounded : rounded, label);
}

/**
 * Divides an integer by a positive integer, truncating toward zero, and
 * returns the quotient with the remainder that was left over.
 *
 * Truncation toward zero is what makes the result of a split symmetric under
 * negation: the remainder always carries the sign of the numerator and its
 * magnitude is always strictly less than the divisor.
 *
 * Done in arbitrary precision because `Math.trunc(a / b)` can be off by one
 * near the top of the safe integer range, which would silently lose a unit.
 *
 * @param numerator the integer to divide, of either sign.
 * @param divisor a positive integer.
 * @returns the truncated quotient and the signed remainder.
 * @throws RangeError when the divisor is not a positive integer.
 */
export function divideWithRemainder(
  numerator: number,
  divisor: number,
): { quotient: number; remainder: number } {
  assertPositiveInteger(divisor, "divisor");

  const dividend = BigInt(numerator);
  const by = BigInt(divisor);
  const quotient = dividend / by;

  return {
    quotient: toSafeInteger(quotient, "quotient"),
    // Strictly smaller in magnitude than the divisor, so it is always safe.
    remainder: Number(dividend - quotient * by),
  };
}

/**
 * True when a string is shaped like a decimal number.
 *
 * A type predicate rather than a cast: `Intl.NumberFormat.prototype.format`
 * types its string overload as the template literal type `` `${number}` ``, and
 * the compiler cannot see that a string assembled digit by digit matches it.
 * Narrowing it with a real runtime check keeps `as` out of the file
 * (`policy_coding_guidelines.md` -> TypeScript).
 */
function isDecimalLiteral(value: string): value is `${number}` {
  return /^-?\d+\.\d+$/.test(value);
}

/**
 * Renders a signed integer as an exact decimal string with a fixed number of
 * fraction digits, by moving the point rather than by dividing.
 *
 * `Intl.NumberFormat.prototype.format` parses a decimal string exactly, so
 * formatting through this function never goes near a float. `cents / 100`
 * would already be a rounded double before `Intl` ever saw it.
 *
 * Negative zero cannot reach here: the value objects normalise it at
 * construction, and `value < 0` is false for `-0` in any case.
 *
 * @param value the integer to render, in its smallest unit.
 * @param fractionDigits how many of its digits are fractional - 2 for cents,
 * 4 for basis points expressed as a fraction of one.
 * @throws RangeError when the assembled string is not a decimal literal, which
 * cannot happen for a safe integer and a positive digit count. The branch
 * exists so the narrowing above is a check rather than an assertion.
 */
export function toDecimalString(
  value: number,
  fractionDigits: number,
): `${number}` {
  const sign = value < 0 ? "-" : "";
  const digits = Math.abs(value)
    .toString()
    .padStart(fractionDigits + 1, "0");
  const integerPart = digits.slice(0, digits.length - fractionDigits);
  const fractionPart = digits.slice(digits.length - fractionDigits);
  const decimal = `${sign}${integerPart}.${fractionPart}`;

  if (!isDecimalLiteral(decimal)) {
    throw new RangeError(
      `${String(value)} could not be rendered with ${String(fractionDigits)} fraction digits`,
    );
  }

  return decimal;
}
