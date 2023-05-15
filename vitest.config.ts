import { defineConfig } from "vitest/config"

// https://vitest.dev/config/
export default defineConfig({
  test: {
    globals: true,
    setupFiles: "test/test-setup.ts",
    environment: "node",
    testTimeout: 20e3, // 20s
    reporters: ["verbose"],
    coverage: {
      reporter: ["text", "html"],
    },
    // outputTruncateLength: 500,
    maxConcurrency: 5,
  },
})
