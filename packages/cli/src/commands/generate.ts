import { execSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../../..");

export function generate(_args: string[]) {
	console.log("Running code generation...\n");

	execSync("tsx scripts/generate-modules.ts", {
		cwd: ROOT,
		stdio: "inherit",
	});

	console.log("\nCode generation complete.");
}
