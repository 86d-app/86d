import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
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

export function generate(args: string[]) {
	const subcommand = args[0];

	switch (subcommand) {
		case "modules":
			return runModuleGeneration();
		case "components":
		case "component-docs":
			return runComponentDocs();
		case "all":
		case undefined:
			runModuleGeneration();
			runComponentDocs();
			return;
		case "help":
		case "--help":
			return printHelp();
		default:
			error(`Unknown generate target: ${subcommand}`);
			console.log();
			printHelp();
			process.exit(1);
	}
}

function printHelp() {
	console.log(`
${c.bold("86d generate")} — Run code generation

${c.dim("Usage:")}
  86d generate               Run all generators
  86d generate modules       Generate module imports, API router, client, hooks
  86d generate components    Generate component documentation
`);
}

function getRunner(root: string): string {
	const tsxPath = join(root, "node_modules", ".bin", "tsx");
	return existsSync(tsxPath) ? tsxPath : "tsx";
}

function runModuleGeneration() {
	const root = findProjectRoot();
	const script = join(root, "scripts/generate-modules.ts");

	if (!existsSync(script)) {
		error("scripts/generate-modules.ts not found");
		process.exit(1);
	}

	heading("Generating module code");
	console.log();

	try {
		execSync(`${getRunner(root)} ${script}`, {
			cwd: root,
			stdio: "inherit",
		});
		console.log();
		success("Module generation complete");
	} catch {
		error("Module generation failed");
		process.exit(1);
	}
}

function runComponentDocs() {
	const root = findProjectRoot();
	const script = join(root, "scripts/generate-component-docs.ts");

	if (!existsSync(script)) {
		info("scripts/generate-component-docs.ts not found, skipping");
		return;
	}

	heading("Generating component documentation");
	console.log();

	try {
		execSync(`${getRunner(root)} ${script}`, {
			cwd: root,
			stdio: "inherit",
		});
		console.log();
		success("Component docs generation complete");
	} catch {
		warn("Component docs generation failed (non-fatal)");
	}
}
