#!/usr/bin/env tsx

/**
 * Store Initialization Script
 *
 * Invoked via: pnpm prepare (or automatically via predev/prebuild hooks)
 *
 * Handles all initialization tasks before dev/build:
 * 1. Generate module imports from config.json
 * 2. Pull templates from repository (future)
 * 3. Validate configuration (future)
 * 4. Set up environment (future)
 */

import { execSync } from "node:child_process";
import { join, resolve } from "node:path";

const STORE_ROOT = resolve(import.meta.dirname, "..");
const SCRIPTS_DIR = join(STORE_ROOT, "scripts");

interface InitStep {
	name: string;
	script: string;
	description: string;
}

const INIT_STEPS: InitStep[] = [
	{
		name: "generate-modules",
		script: "generate-modules.ts",
		description: "Generating module imports",
	},
	// Future steps:
	// {
	//     name: "pull-templates",
	//     script: "pull-templates.ts",
	//     description: "Pulling templates from repository",
	// },
	// {
	//     name: "validate-config",
	//     script: "validate-config.ts",
	//     description: "Validating configuration",
	// },
];

async function runInitStep(step: InitStep): Promise<void> {
	console.log(`\n→ ${step.description}...`);

	try {
		const scriptPath = join(SCRIPTS_DIR, step.script);
		execSync(`tsx ${scriptPath}`, {
			cwd: STORE_ROOT,
			stdio: "inherit",
		});
	} catch (error) {
		console.error(`✗ Failed to run ${step.name}`);
		throw error;
	}
}

async function init() {
	console.log("🚀 Initializing store application...\n");

	for (const step of INIT_STEPS) {
		await runInitStep(step);
	}

	console.log("\n✓ Store initialization complete!\n");
}

// Run initialization
init().catch((error) => {
	console.error("\n✗ Initialization failed:", error.message);
	process.exit(1);
});
