import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["lib/__tests__/**/*.test.ts"],
	},
	resolve: {
		alias: {
			"~/": resolve(__dirname, "./"),
			"lib/": resolve(__dirname, "../../packages/lib/src/"),
			utils: resolve(__dirname, "../../packages/utils/src"),
		},
	},
});
