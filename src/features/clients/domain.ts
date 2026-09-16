// Pure business logic for the clients domain. No Prisma, no React, no
// `next/*` imports (`ai-rules/policy_architecture.md` -> Dependency rule).

/** The fixed length of a derived short label. */
const SHORT_LABEL_LENGTH = 8;

/**
 * Derives a short-label suggestion from a client's name (D-47).
 *
 * Deterministic, so the same name always suggests the same label: the name
 * is split into words, each word's leading letters are kept, uppercased, and
 * concatenated until the result reaches `SHORT_LABEL_LENGTH` characters (or
 * the words run out). This reads as a recognisable abbreviation of the name
 * rather than a truncation of the first word alone - "Acme Consulting"
 * suggests "ACMECONS", not "ACME----".
 *
 * The design (`design/v01-001/README.md` -> "Short-label auto-suggestion")
 * only fixes the pristine/dirty tracking around this call, not the
 * algorithm: the exact derivation is this function's own implementation
 * choice, not an architecture decision.
 *
 * @param name the client's name, as typed so far. An empty or blank name
 * derives an empty label - the caller's "required" validation is a separate
 * concern, enforced by `schema.ts` at save time, not here.
 * @returns the suggested short label, uppercase, at most
 * `SHORT_LABEL_LENGTH` characters, or an empty string when `name` holds no
 * letters or digits at all.
 */
export function deriveShortLabel(name: string): string {
  const words = name.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 0);

  let label = "";
  for (const word of words) {
    if (label.length >= SHORT_LABEL_LENGTH) {
      break;
    }
    label += word.slice(0, SHORT_LABEL_LENGTH - label.length);
  }

  return label.toUpperCase();
}
