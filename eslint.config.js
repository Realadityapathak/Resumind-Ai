import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "build/**",
      ".react-router/**",
      "node_modules/**",
      "coverage/**",
      "public/**",
      "docs/**",
      "dist/**",
      ".agents/**",
      ".superpowers/**",
      "scripts/**",
      "temp/**",
      "**/*.d.ts",
    ],
  },
  {
    files: ["app/**/*.{ts,tsx}", "test/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-undef": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-control-regex": "off",
      "no-constant-binary-expression": "off",
      "prefer-const": ["warn", { destructuring: "all" }],
    },
  }
);
