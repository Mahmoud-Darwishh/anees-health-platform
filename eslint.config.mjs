import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".ds-sync/**",
    "ds-bundle/**",
    ".design-sync/**",
    "public/assets/js/**/*.min.js",
    "public/sw.js",
    "public/workbox-*.js",
    "public/worker-*.js",
    "public/fallback-*.js",
    "next-env.d.ts",
  ]),
  {
    // Allow intentionally-unused identifiers when prefixed with `_`
    // (e.g. unused destructured args, placeholder params).
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // CommonJS ops/build scripts legitimately use require().
    files: ["**/*.cjs", "**/*.cts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
