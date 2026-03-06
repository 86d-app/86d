import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("init", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = join(tmpdir(), `86d-cli-init-test-${Date.now()}`);
		mkdirSync(join(tempDir, "apps/store"), { recursive: true });
		mkdirSync(join(tempDir, "scripts"), { recursive: true });
		mkdirSync(join(tempDir, "node_modules/.bin"), { recursive: true });

		// Create .env.example
		writeFileSync(
			join(tempDir, "apps/store/.env.example"),
			"DATABASE_URL=\nSTORE_ID=\nBETTER_AUTH_SECRET=change-me-to-a-random-string\n",
		);

		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true });
		}
		vi.restoreAllMocks();
	});

	async function runInit() {
		vi.resetModules();
		vi.doMock("../utils.js", async () => {
			const actual =
				await vi.importActual<typeof import("../utils.js")>("../utils.js");
			return {
				...actual,
				findProjectRoot: () => tempDir,
			};
		});

		// Mock execSync to avoid running bun install / tsx in tests
		vi.doMock("node:child_process", () => ({
			execSync: vi.fn(),
		}));

		const { init } = await import("../commands/init.js");
		init([]);
	}

	it("copies .env.example to .env", async () => {
		await runInit();

		expect(existsSync(join(tempDir, ".env"))).toBe(true);
	});

	it("generates a random BETTER_AUTH_SECRET", async () => {
		await runInit();

		const envContent = readFileSync(join(tempDir, ".env"), "utf-8");
		expect(envContent).not.toContain("change-me-to-a-random-string");
		// Should have a base64url secret (at least 20 chars)
		const match = envContent.match(/BETTER_AUTH_SECRET=(.+)/);
		expect(match?.[1]?.length).toBeGreaterThanOrEqual(20);
	});

	it("skips .env copy if .env already exists", async () => {
		writeFileSync(join(tempDir, ".env"), "EXISTING=value\n");

		await runInit();

		const envContent = readFileSync(join(tempDir, ".env"), "utf-8");
		expect(envContent).toBe("EXISTING=value\n");
	});

	it("preserves other env vars when replacing secret", async () => {
		await runInit();

		const envContent = readFileSync(join(tempDir, ".env"), "utf-8");
		expect(envContent).toContain("DATABASE_URL=");
		expect(envContent).toContain("STORE_ID=");
	});
});
