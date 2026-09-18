// Tests for `src/features/tags/domain.ts` (v01-004 functional spec, step
// 12 - path composition; step 13 - rename cascade to every descendant). Pure
// functions, no Prisma, no React - tested in isolation
// (`ai-rules/policy_testing.md` -> What to test where). Every expected path
// below is written by hand from the documented rule: the parent's own path,
// `::`, then the label, or just the label at the top level.

import { describe, expect, it } from "vitest";

import { cascadeDescendantPaths, composeTagPath } from "@/features/tags/domain";

describe("composeTagPath", () => {
  it("returns just the label for a top-level tag (no parent)", () => {
    expect(composeTagPath(null, "commercial")).toBe("commercial");
  });

  it("joins the parent's path, '::', then the label for a child tag", () => {
    expect(composeTagPath("commercial", "RDV1")).toBe("commercial::RDV1");
  });

  it("composes a third-level path from a two-segment parent path", () => {
    expect(composeTagPath("commercial::RDV1", "Sub")).toBe(
      "commercial::RDV1::Sub",
    );
  });
});

describe("cascadeDescendantPaths", () => {
  it("recomputes only the renamed tag's own path when it has no descendants", () => {
    const result = cascadeDescendantPaths("commercial", "sales", [
      { id: 1, path: "commercial" },
    ]);

    expect(result).toEqual([{ id: 1, path: "sales" }]);
  });

  it("cascades the new prefix to a direct child (functional spec's own example: commercial -> sales)", () => {
    const result = cascadeDescendantPaths("commercial", "sales", [
      { id: 1, path: "commercial" },
      { id: 2, path: "commercial::RDV1" },
    ]);

    expect(result).toEqual([
      { id: 1, path: "sales" },
      { id: 2, path: "sales::RDV1" },
    ]);
  });

  it("cascades through multiple levels of descendants", () => {
    const result = cascadeDescendantPaths("commercial", "sales", [
      { id: 1, path: "commercial" },
      { id: 2, path: "commercial::RDV1" },
      { id: 3, path: "commercial::RDV1::Sub" },
    ]);

    expect(result).toEqual([
      { id: 1, path: "sales" },
      { id: 2, path: "sales::RDV1" },
      { id: 3, path: "sales::RDV1::Sub" },
    ]);
  });

  it("recomputes a nested tag's path, preserving its own parent prefix", () => {
    // Renaming "commercial::RDV1" (not top-level) to "RDV1bis": the parent
    // prefix "commercial" is preserved, only the renamed segment changes.
    const result = cascadeDescendantPaths("commercial::RDV1", "RDV1bis", [
      { id: 2, path: "commercial::RDV1" },
      { id: 3, path: "commercial::RDV1::Sub" },
    ]);

    expect(result).toEqual([
      { id: 2, path: "commercial::RDV1bis" },
      { id: 3, path: "commercial::RDV1bis::Sub" },
    ]);
  });

  it("leaves a row unrelated to the renamed prefix unchanged", () => {
    const result = cascadeDescendantPaths("commercial", "sales", [
      { id: 1, path: "commercial" },
      { id: 4, path: "commercialX" },
      { id: 5, path: "other::branch" },
    ]);

    expect(result).toEqual([
      { id: 1, path: "sales" },
      { id: 4, path: "commercialX" },
      { id: 5, path: "other::branch" },
    ]);
  });

  it("is a no-op path-wise when the new label equals the old one", () => {
    const result = cascadeDescendantPaths("commercial", "commercial", [
      { id: 1, path: "commercial" },
      { id: 2, path: "commercial::RDV1" },
    ]);

    expect(result).toEqual([
      { id: 1, path: "commercial" },
      { id: 2, path: "commercial::RDV1" },
    ]);
  });
});
