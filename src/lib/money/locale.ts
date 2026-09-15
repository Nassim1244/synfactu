// The single locale and currency of the application.
//
// `ai-rules/policy_coding_guidelines.md` -> Value objects: the application has
// one interface language and one locale, declared as a single constant here.
// Formatting methods take no locale argument and read these.
//
// This is a deliberate closing of the door (`context/vision.md` -> Non-goals:
// "French interface, euro, French fiscal rules. Locale and currency are a
// single constant; there is no translation layer"). There is no locale
// plumbing, no message catalogue and no fallback chain. Re-opening it means
// changing these two constants and the methods that read them.

/** BCP 47 tag used by every `Intl` formatter in this folder. */
export const LOCALE = "fr-FR";

/** ISO 4217 code used by `Money.format()`. */
export const CURRENCY = "EUR";
