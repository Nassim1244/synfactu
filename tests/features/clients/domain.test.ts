// Tests for `src/features/clients/domain.ts` (v01-001, D-47's short-label
// auto-suggestion; design's "Short-label auto-suggestion" fixes only the
// pristine/dirty tracking, so the derivation algorithm itself has no
// functional-spec wording to test against beyond "deterministic" - every
// expected string below is computed by hand from the function's own
// documented rule: split on runs of non-letter/non-digit characters, keep
// each word's leading letters, uppercase, concatenate to at most 8
// characters.
//
// No Prisma, no React - a pure function, tested in isolation
// (`ai-rules/policy_testing.md` -> What to test where).

import { describe, expect, it } from "vitest";

import { deriveShortLabel } from "@/features/clients/domain";

describe("deriveShortLabel", () => {
  it("keeps a short single word whole, uppercased", () => {
    // "Bob" (3 letters) fits entirely within the 8-character budget.
    expect(deriveShortLabel("Bob")).toBe("BOB");
  });

  it("truncates a long single word to 8 characters", () => {
    // "Supercalifragilisticexpialidocious" -> first 8 letters "Supercal".
    expect(deriveShortLabel("Supercalifragilisticexpialidocious")).toBe(
      "SUPERCAL",
    );
  });

  it("combines leading letters of successive words up to 8 characters", () => {
    // "Acme" (4) + "Cons" (4 of "Consulting") = "AcmeCons" = 8 characters.
    expect(deriveShortLabel("Acme Consulting")).toBe("ACMECONS");
  });

  it("keeps accented letters as letters, not as word separators", () => {
    // "Éléonore" is itself exactly 8 letters (É-l-é-o-n-o-r-e), so the
    // budget is exhausted before "Ünique" ever contributes.
    expect(deriveShortLabel("Éléonore Ünique")).toBe("ÉLÉONORE");
  });

  it("treats digits as word characters, not separators", () => {
    // "Acme2" (5) + "Cor" (3 of "Corp3") = "Acme2Cor" = 8 characters.
    expect(deriveShortLabel("Acme2 Corp3")).toBe("ACME2COR");
  });

  it("splits on punctuation between letters, dropping the punctuation itself", () => {
    // "O'Brien & Sons" -> words "O", "Brien", "Sons" ->
    // "O" + "Brien" (6) + "So" (2 of "Sons") = "OBrienSo" = 8 characters.
    expect(deriveShortLabel("O'Brien & Sons")).toBe("OBRIENSO");
  });

  it("collapses runs of whitespace and punctuation between words", () => {
    expect(deriveShortLabel("Acme   &   Sons")).toBe(
      deriveShortLabel("Acme & Sons"),
    );
  });

  it("returns an empty string for a blank name", () => {
    expect(deriveShortLabel("")).toBe("");
  });

  it("returns an empty string for a name with no letters or digits at all", () => {
    expect(deriveShortLabel("   ---   ")).toBe("");
  });

  it("is deterministic: the same name always derives the same label", () => {
    expect(deriveShortLabel("Acme Consulting")).toBe(
      deriveShortLabel("Acme Consulting"),
    );
  });

  it("never exceeds 8 characters, however many words the name holds", () => {
    const label = deriveShortLabel("One Two Three Four Five Six Seven Eight");

    expect(label.length).toBeLessThanOrEqual(8);
  });
});
