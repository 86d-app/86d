import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { c, error, findProjectRoot, info, parseEnvFile } from "../utils.js";

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
