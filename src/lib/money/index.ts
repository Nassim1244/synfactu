// The value objects of the domain (AD-007).
//
// Money is stored as integer cents, durations as integer minutes, rates as
// integer basis points. The repository converts at its own boundary; domain
// code manipulates these classes and never the raw integers
// (`ai-rules/policy_architecture.md` -> Data model conventions).
//
// Every rounding rule in the application lives behind this barrel. Arithmetic
// on cents, minutes or basis points outside this folder is a defect, not a
// shortcut (`ai-rules/policy_coding_guidelines.md` -> Value objects).
//
// `arithmetic.ts` is deliberately not re-exported: its helpers are how the
// classes are built, not an API. Exporting them would be an invitation to do
// exactly the arithmetic this folder exists to contain.

export { CURRENCY, LOCALE } from "./locale";
export { Money } from "./money";
export { DEFAULT_DAY_LENGTH_MINUTES, Duration } from "./duration";
export { BASIS_POINTS_PER_UNIT, Rate } from "./rate";
