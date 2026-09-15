// Vitest configuration.
//
// The suite lives in `tests/`, which mirrors `src/`
// (`ai-rules/policy_architecture.md` -> Structure). @tester owns everything
// under it; this file only says where to look and how to run it.

import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirrors the "@/*" path mapping in tsconfig.json. Declared here too
      // because Vitest resolves imports through Vite, which does not read
      // the TypeScript path mapping.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // The bootstrap ships an empty suite: @tester writes the first tests
    // after @coder has something to cover. Without this the gate would be
    // red for a reason that is not a defect.
    passWithNoTests: true,
  },
});
