import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../../..");

export function init(args: string[]) {
	console.log("Initializing 86d store...\n");

	// 1. Copy .env.example if .env doesn't exist
	const envPath = resolve(ROOT, ".env");
	const envExamplePath = resolve(ROOT, "apps/store/.env.example");

	if (!existsSync(envPath) && existsSync(envExamplePath)) {
		copyFileSync(envExamplePath, envPath);
		console.log("Created .env from .env.example");
	} else if (existsSync(envPath)) {
		console.log(".env already exists, skipping");
	}

	// 2. Generate a random auth secret if still placeholder
	if (existsSync(envPath)) {
		let envContent = readFileSync(envPath, "utf-8");
		if (envContent.includes("change-me-to-a-random-string")) {
			const secret = generateSecret();
			envContent = envContent.replace(
				"change-me-to-a-random-string",
				secret,
			);
			writeFileSync(envPath, envContent);
			console.log("Generated BETTER_AUTH_SECRET");
		}
	}

	// 3. Install dependencies
	console.log("\nInstalling dependencies...");
	execSync("bun install", { cwd: ROOT, stdio: "inherit" });

	// 4. Run code generation
	console.log("\nRunning code generation...");
	execSync("tsx scripts/generate-modules.ts", { cwd: ROOT, stdio: "inherit" });

	console.log("\n86d store initialized successfully!");
	console.log("\nNext steps:");
	console.log("  1. Set DATABASE_URL in .env");
	console.log("  2. Set STORE_ID in .env");
	console.log("  3. Run: 86d dev");
}

function generateSecret(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Buffer.from(bytes).toString("base64url");
}
