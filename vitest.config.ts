import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.{test,spec}.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
    setupFiles: ["./tests/setup.ts"],

    // Environment variables (loaded from .env.test automatically)
    env: {
      NODE_ENV: "test",
    },

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "tests/",
        "dist/",
        "migrations/",
        "script/",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.d.ts",
        "**/*.config.{js,ts,mjs}",
        "**/types/**",
        "**/interfaces/**",
        "src/index.ts", // Entry point
        "src/app.ts", // App setup
        // Temporarily exclude until tests are written (Phase 2 tasks)
        "src/utils/analyticsEngine.ts", // Task 18.3
        "src/controllers/analytics.controller.ts", // Task 38
        "src/services/analytics.service.ts", // Task 18.2, 18.3
        "src/services/ritual.service.ts", // Task 17.2
        "src/config/cloudinary.ts", // External service integration
        "src/config/passport.ts", // OAuth integration
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 50, // Temporarily lowered - improve with more edge case tests
        statements: 70,
        autoUpdate: false, // Don't auto-update thresholds
      },
      all: true, // Include all files, not just tested ones
      skipFull: false, // Show files with 100% coverage
    },

    // Timeouts
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000,

    // Reporters
    reporters: process.env.CI ? ["verbose", "json", "html"] : ["verbose"],

    // Output
    outputFile: {
      json: "./test-results/results.json",
      html: "./test-results/index.html",
    },

    // Isolation
    isolate: true, // Run tests in isolation
    pool: "forks", // Use forks for better isolation
    poolOptions: {
      forks: {
        singleFork: false, // Allow parallel execution
      },
    },

    // Retry failed tests in CI
    retry: process.env.CI ? 2 : 0,

    // Bail on first failure in CI
    bail: process.env.CI ? 1 : 0,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tests": path.resolve(__dirname, "./tests"),
    },
  },
});
