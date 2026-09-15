// ESLint flat config.
//
// The plugin set is fixed by AD-011: typescript-eslint in type-aware mode,
// eslint-plugin-react-hooks, @next/eslint-plugin-next and
// eslint-plugin-jsx-a11y. The rationale lives in `ai-rules/decisions.md`;
// the rule that these must pass before a commit lives in
// `ai-rules/policy_coding_guidelines.md` -> Style.
//
// eslint-config-next is deliberately not used. It is a meta-package that
// bundles its own copies of these plugins, which makes the effective rule
// set depend on versions we do not pin directly. AD-011 names four plugins,
// so the four are composed here explicitly.
//
// @eslint/js is not a fifth plugin. It carries no rules of its own: it is
// where the ESLint team ships the `recommended` preset over rules that live
// inside `eslint` itself, after flat config moved it out of the `eslint`
// package. Under eslintrc this was `extends: ["eslint:recommended"]` and
// needed no install at all. It is pinned in lockstep with `eslint`, which
// depends on it at the same exact version. Without it the core recommended
// set - no-empty, no-constant-condition, no-fallthrough and the rest - is
// silently off, because dropping eslint-config-next removed the only thing
// that was pulling it in implicitly.

import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default defineConfig([
  // Build output and generated files. Nothing here is hand-written, so
  // linting it only ever produces noise.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),

  // Core ESLint recommended rules. This must stay ABOVE the typescript-eslint
  // block: that block's `eslint-recommended` layer switches off the core rules
  // the compiler already reports (no-undef, no-dupe-keys, no-unreachable and
  // friends). Placed after, this preset would switch them back on and every
  // such error would be reported twice, once by tsc and once by ESLint.
  js.configs.recommended,

  // Type-aware linting. The project service resolves each file to the
  // nearest tsconfig, which is what makes rules such as no-floating-promises
  // work - the rule that catches an unawaited database write.
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Configuration and setup files sit outside the application's tsconfig
  // program. They are still linted, but without type information.
  {
    files: ["*.config.{js,cjs,mjs,ts,mts}", "*.setup.ts"],
    extends: [tseslint.configs.disableTypeChecked],
  },

  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.recommended,

  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },

  // Guidelines the machine gate should enforce, rather than the reviewer
  // reading for them. See `policy_coding_guidelines.md` -> TypeScript and
  // -> Forbidden.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-console": "error",
    },
  },
]);
