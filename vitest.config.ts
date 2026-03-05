import { defineConfig } from "vitest/config";

/**
 * Root Vitest config for workspace coverage.
 * Use with: bun run test:coverage
 *
 * Coverage is configured at root; individual package configs
 * define test environment and other per-package settings.
 */
export default defineConfig({
	test: {
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			reportsDirectory: "./coverage",
			thresholds: {
				lines: 70,
				branches: 60,
			},
		},
	},
});
