import { execSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../../..");

export function dev(args: string[]) {
	const port = args.includes("--port")
		? args[args.indexOf("--port") + 1]
		: undefined;

	console.log("Starting 86d store development server...\n");

	const cmd = port
		? `dotenv -- turbo run dev --filter=store -- --port ${port}`
		: "dotenv -- turbo run dev --filter=store";

	execSync(cmd, {
		cwd: ROOT,
		stdio: "inherit",
		env: { ...process.env },
	});
}
