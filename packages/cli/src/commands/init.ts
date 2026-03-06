import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	c,
	error,
	findProjectRoot,
	heading,
	info,
	success,
	warn,
} from "../utils.js";

export function init(_args: string[]) {
	const root = findProjectRoot();

	heading("Initializing 86d store");
	console.log();

	// 1. Copy .env.example if .env doesn't exist
	const envPath = join(root, ".env");
	const envExamplePath = join(root, "apps/store/.env.example");

	if (!existsSync(envPath) && existsSync(envExamplePath)) {
		copyFileSync(envExamplePath, envPath);
		success("Created .env from .env.example");
	} else if (existsSync(envPath)) {
		info(".env already exists, skipping");
	} else {
		warn("No .env.example found, skipping .env creation");
	}

	// 2. Generate a random auth secret if still placeholder
	if (existsSync(envPath)) {
		let envContent = readFileSync(envPath, "utf-8");
		if (envContent.includes("change-me-to-a-random-string")) {
			const secret = generateSecret();
			envContent = envContent.replace("change-me-to-a-random-string", secret);
			writeFileSync(envPath, envContent);
			success("Generated BETTER_AUTH_SECRET");
		}
	}

	// 3. Install dependencies
	info("Installing dependencies...");
	try {
		execSync("bun install", { cwd: root, stdio: "inherit" });
		success("Dependencies installed");
	} catch {
		error("Failed to install dependencies. Is bun installed?");
		process.exit(1);
	}

	// 4. Run code generation
	info("Running code generation...");
	const tsxPath = join(root, "node_modules", ".bin", "tsx");
	const generateScript = join(root, "scripts/generate-modules.ts");

	if (existsSync(generateScript)) {
		try {
			const runner = existsSync(tsxPath) ? tsxPath : "tsx";
			execSync(`${runner} ${generateScript}`, {
				cwd: root,
				stdio: "inherit",
			});
			success("Code generation complete");
		} catch {
			warn("Code generation failed — you can retry with: 86d generate");
		}
	} else {
		warn("generate-modules.ts not found, skipping code generation");
	}

	heading("Store initialized");
	console.log();
	console.log(`  Next steps:`);
	console.log(`  ${c.dim("1.")} Set ${c.cyan("DATABASE_URL")} in .env`);
	console.log(`  ${c.dim("2.")} Set ${c.cyan("STORE_ID")} in .env`);
	console.log(`  ${c.dim("3.")} Run: ${c.bold("86d dev")}`);
	console.log();
}

function generateSecret(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Buffer.from(bytes).toString("base64url");
}
