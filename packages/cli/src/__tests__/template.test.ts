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

	it("lists templates", async () => {
		await runTemplate("list");

		const output = logs.join("\n");
		expect(output).toContain("brisa");
		expect(output).toContain("(default)");
	});

	it("rejects duplicate template name", async () => {
		const exit = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});

		await expect(runTemplate("create", ["brisa"])).rejects.toThrow("exit");
		expect(exit).toHaveBeenCalledWith(1);
	});
});
