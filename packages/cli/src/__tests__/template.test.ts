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

describe("template", () => {
	let tempDir: string;
	let logs: string[];

	beforeEach(() => {
		tempDir = join(tmpdir(), `86d-cli-template-test-${Date.now()}`);
		mkdirSync(join(tempDir, "templates/brisa"), { recursive: true });
		mkdirSync(join(tempDir, "apps/store"), { recursive: true });

		// Base template files
		writeFileSync(
			join(tempDir, "templates/brisa/config.json"),
			JSON.stringify(
				{
					theme: "brisa",
					name: "86d Brisa Theme",
					modules: ["@86d-app/products", "@86d-app/cart"],
				},
				null,
				"\t",
			),
		);
		writeFileSync(
			join(tempDir, "templates/brisa/global.css"),
			"/* brisa styles */",
		);

		// Store tsconfig with template path alias
		writeFileSync(
			join(tempDir, "apps/store/tsconfig.json"),
			JSON.stringify(
				{
					compilerOptions: {
						paths: {
							"template/*": ["../../templates/brisa/*"],
						},
					},
				},
				null,
				"\t",
			),
		);

		logs = [];
		vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
			logs.push(args.map(String).join(" "));
		});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		if (existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true });
		}
		vi.restoreAllMocks();
	});

	async function runTemplate(subcommand: string, args: string[] = []) {
		vi.resetModules();
		vi.doMock("../utils.js", async () => {
			const actual =
				await vi.importActual<typeof import("../utils.js")>("../utils.js");
			return {
				...actual,
				findProjectRoot: () => tempDir,
			};
		});

		const { templateCommand } = await import("../commands/template.js");
		templateCommand(subcommand, args);
	}

	it("creates a new template by copying brisa", async () => {
		await runTemplate("create", ["minimal"]);

		const templateDir = join(tempDir, "templates/minimal");
		expect(existsSync(templateDir)).toBe(true);
		expect(existsSync(join(templateDir, "global.css"))).toBe(true);
	});

	it("updates config.json with new theme name", async () => {
		await runTemplate("create", ["dark"]);

		const config = JSON.parse(
			readFileSync(join(tempDir, "templates/dark/config.json"), "utf-8"),
		);
		expect(config.theme).toBe("dark");
		expect(config.name).toBe("86d Dark Theme");
	});

	it("preserves modules from base template", async () => {
		await runTemplate("create", ["minimal"]);

		const config = JSON.parse(
			readFileSync(join(tempDir, "templates/minimal/config.json"), "utf-8"),
		);
		expect(config.modules).toContain("@86d-app/products");
		expect(config.modules).toContain("@86d-app/cart");
	});

	it("lists templates with active indicator", async () => {
		await runTemplate("list");

		const output = logs.join("\n");
		expect(output).toContain("brisa");
		expect(output).toContain("(active)");
	});

	it("rejects duplicate template name", async () => {
		const exit = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});

		await expect(runTemplate("create", ["brisa"])).rejects.toThrow("exit");
		expect(exit).toHaveBeenCalledWith(1);
	});

	describe("template activate", () => {
		it("activates a template by updating tsconfig path alias", async () => {
			// Create a second template
			mkdirSync(join(tempDir, "templates/minimal"), { recursive: true });
			writeFileSync(
				join(tempDir, "templates/minimal/config.json"),
				JSON.stringify({ theme: "minimal", name: "Minimal Theme" }),
			);

			await runTemplate("activate", ["minimal"]);

			const tsconfig = readFileSync(
				join(tempDir, "apps/store/tsconfig.json"),
				"utf-8",
			);
			expect(tsconfig).toContain("templates/minimal/");
			expect(tsconfig).not.toContain("templates/brisa/");
		});

		it("shows previous template name on activate", async () => {
			mkdirSync(join(tempDir, "templates/dark"), { recursive: true });
			writeFileSync(
				join(tempDir, "templates/dark/config.json"),
				JSON.stringify({ theme: "dark" }),
			);

			await runTemplate("activate", ["dark"]);

			const output = logs.join("\n");
			expect(output).toContain("was brisa");
		});

		it("warns when template is already active", async () => {
			await runTemplate("activate", ["brisa"]);

			const output = logs.join("\n");
			expect(output).toContain("already active");
		});

		it("rejects non-existent template", async () => {
			const exit = vi.spyOn(process, "exit").mockImplementation(() => {
				throw new Error("exit");
			});

			await expect(runTemplate("activate", ["nonexistent"])).rejects.toThrow(
				"exit",
			);
			expect(exit).toHaveBeenCalledWith(1);
		});

		it("rejects template without config.json", async () => {
			mkdirSync(join(tempDir, "templates/broken"), { recursive: true });

			const exit = vi.spyOn(process, "exit").mockImplementation(() => {
				throw new Error("exit");
			});

			await expect(runTemplate("activate", ["broken"])).rejects.toThrow("exit");
			expect(exit).toHaveBeenCalledWith(1);
		});

		it("rejects missing name argument", async () => {
			const exit = vi.spyOn(process, "exit").mockImplementation(() => {
				throw new Error("exit");
			});

			await expect(runTemplate("activate", [])).rejects.toThrow("exit");
			expect(exit).toHaveBeenCalledWith(1);
		});

		it("works with 'use' alias", async () => {
			mkdirSync(join(tempDir, "templates/alt"), { recursive: true });
			writeFileSync(
				join(tempDir, "templates/alt/config.json"),
				JSON.stringify({ theme: "alt" }),
			);

			await runTemplate("use", ["alt"]);

			const tsconfig = readFileSync(
				join(tempDir, "apps/store/tsconfig.json"),
				"utf-8",
			);
			expect(tsconfig).toContain("templates/alt/");
		});
	});
});
