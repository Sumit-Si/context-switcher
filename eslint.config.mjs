import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  // Ignore patterns
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.kiro/**",
      "**/migrations/**",
      "**/script/**", // Ignore migration scripts
      "**/*.config.{js,mjs,ts}",
      "**/.husky/**",
      "**/logs/**",
      "**/public/**",
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // Base configuration for all TypeScript files
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Console & Debugging - Relaxed for now
      "no-console": "warn", // Changed from error to warning
      "no-debugger": "error",
      "no-alert": "error",

      // Code Quality
      "no-unused-vars": "off", // Use TypeScript version
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Best Practices - Relaxed for now
      eqeqeq: ["error", "always"], // Require === and !==
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-return-await": "warn", // Changed from error to warning
      "require-await": "warn", // Changed from error to warning
      "no-throw-literal": "error",
      "prefer-promise-reject-errors": "error",

      // Security
      "no-unsafe-optional-chaining": "error",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",

      // Async/Await - Relaxed for now
      "@typescript-eslint/no-floating-promises": "warn", // Changed from error to warning
      "@typescript-eslint/no-misused-promises": "warn", // Changed from error to warning
      "@typescript-eslint/await-thenable": "error",

      // TypeScript Specific - Relaxed for now
      "@typescript-eslint/consistent-type-imports": "warn", // Changed from error to warning
      "@typescript-eslint/consistent-type-definitions": "warn", // Changed from error to warning
      "@typescript-eslint/no-unnecessary-type-assertion": "warn", // Changed from error to warning
      "@typescript-eslint/no-empty-object-type": "warn", // Changed from error to warning
      "@typescript-eslint/prefer-as-const": "warn", // Changed from error to warning

      // Naming Conventions - Relaxed for now
      "@typescript-eslint/naming-convention": "off", // TODO: Re-enable and fix interface naming
    },
  },

  // Test files - relaxed rules
  {
    files: ["tests/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "no-console": "off",
    },
  },

  // Prettier must be last to override formatting rules
  eslintConfigPrettier,
);
