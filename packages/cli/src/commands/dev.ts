import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { c, error, findProjectRoot, info } from "../utils.js";

/**
 * Parse a .env file into key-value pairs.
 * Handles comments, empty lines, quoted values, and inline comments.
 */
function parseEnvFile(filePath: string): Record<string, string> {
	if (!existsSync(filePath)) return {};
	const vars: Record<string, string> = {};
	for (const line of readFileSync(filePath, "utf-8").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		let value = trimmed.slice(eqIdx + 1).trim();
		// Strip surrounding quotes
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		vars[key] = value;
	}
	return vars;
}

/**
 * Load .env files in standard precedence order (later files override).
 */
function loadEnvFiles(root: string): Record<string, string> {
	const files = [".env", ".env.local", ".env.development.local"];
	let vars: Record<string, string> = {};
	for (const file of files) {
		vars = { ...vars, ...parseEnvFile(join(root, file)) };
	}
	return vars;
}

export function dev(args: string[]) {
	const root = findProjectRoot();

	let port: string | undefined;
	const portIdx = args.indexOf("--port");
	if (portIdx !== -1 && args[portIdx + 1]) {
		port = args[portIdx + 1];
	}

	console.log(`\n${c.bold("86d")} ${c.dim("dev")}\n`);

	// Load .env files into process.env
	const envVars = loadEnvFiles(root);

	// Check for turbo
	const turboLocal = join(root, "node_modules", ".bin", "turbo");
	const hasTurbo = existsSync(turboLocal);

	if (!hasTurbo) {
		error("turbo not found. Run `bun install` in the project root first.");
		process.exit(1);
	}

	const cmd = turboLocal;
	const cmdArgs = ["run", "dev", "--filter=store"];
	if (port) {
		cmdArgs.push("--", "--port", port);
	}

	info(`Starting store on ${c.cyan(`http://localhost:${port || "3000"}`)}`);
	console.log();

	const child = spawn(cmd, cmdArgs, {
		cwd: root,
		stdio: "inherit",
		env: { ...envVars, ...process.env },
	});

	// Forward signals for clean shutdown
	const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
	for (const sig of signals) {
		process.on(sig, () => {
			child.kill(sig);
		});
	}

	child.on("exit", (code) => {
		process.exit(code ?? 0);
	});
}
