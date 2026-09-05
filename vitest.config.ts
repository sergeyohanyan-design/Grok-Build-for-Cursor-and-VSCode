import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Node 24 + vitest 1.6 threads never collected suites ("No test suite found").
    pool: "forks",
  },
});
