// Vitest setup, run once before every test file.
//
// This is toolchain configuration, not a test: it lives at the repository
// root so that `tests/` holds only what @tester owns
// (`ai-rules/policy_testing.md` -> Ownership).
//
// It registers the @testing-library/jest-dom matchers (toBeInTheDocument,
// toHaveTextContent and the rest) and unmounts React trees between tests so
// one test cannot observe another's DOM.

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});
