import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../../..");
const MODULES_DIR = join(ROOT, "modules");

export function moduleCommand(subcommand: string | undefined, args: string[]) {
	switch (subcommand) {
		case "create":
			return createModule(args[0]);
		case "list":
		case "ls":
			return listModules();
		default:
			console.error(
				`Unknown module subcommand: ${subcommand ?? "(none)"}\n`,
			);
			console.log("Usage:");
			console.log("  86d module create <name>   Scaffold a new module");
			console.log("  86d module list             List all modules");
			process.exit(1);
	}
}

function listModules() {
	if (!existsSync(MODULES_DIR)) {
		console.log("No modules directory found.");
		return;
	}

	const modules = readdirSync(MODULES_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.sort();

	console.log(`Found ${modules.length} module(s):\n`);
	for (const mod of modules) {
		const pkgPath = join(MODULES_DIR, mod, "package.json");
		const hasPackage = existsSync(pkgPath);
		console.log(`  @86d-app/${mod}${hasPackage ? "" : "  (no package.json)"}`);
	}
}

function createModule(name: string | undefined) {
	if (!name) {
		console.error("Module name is required.\n");
		console.log("Usage: 86d module create <name>");
		console.log("Example: 86d module create loyalty-points");
		process.exit(1);
	}

	// Normalize: strip @86d-app/ prefix if provided
	const moduleName = name.replace(/^@86d-app\//, "");
	const moduleDir = join(MODULES_DIR, moduleName);

	if (existsSync(moduleDir)) {
		console.error(`Module "${moduleName}" already exists at ${moduleDir}`);
		process.exit(1);
	}

	console.log(`Creating module @86d-app/${moduleName}...\n`);

	// Create directory structure
	const dirs = [
		moduleDir,
		join(moduleDir, "src"),
		join(moduleDir, "src/store"),
		join(moduleDir, "src/store/components"),
		join(moduleDir, "src/store/endpoints"),
		join(moduleDir, "src/admin"),
		join(moduleDir, "src/admin/components"),
		join(moduleDir, "src/admin/endpoints"),
	];

	for (const dir of dirs) {
		mkdirSync(dir, { recursive: true });
	}

	// package.json
	writeFileSync(
		join(moduleDir, "package.json"),
		JSON.stringify(
			{
				name: `@86d-app/${moduleName}`,
				version: "0.0.1",
				private: true,
				type: "module",
				exports: {
					".": "./src/index.ts",
					"./components": "./src/store/components/index.tsx",
					"./admin-components": "./src/admin/components/index.tsx",
				},
				scripts: {
					check: "biome check src",
					"check:fix": "biome check --write src",
					test: "vitest run",
					"test:watch": "vitest watch",
					typecheck: "tsc --noEmit --emitDeclarationOnly false",
				},
				dependencies: {
					"@86d-app/core": "workspace:*",
				},
				devDependencies: {
					"@biomejs/biome": "catalog:",
					typescript: "catalog:",
					vitest: "catalog:vite",
				},
			},
			null,
			"\t",
		),
	);

	// tsconfig.json
	writeFileSync(
		join(moduleDir, "tsconfig.json"),
		JSON.stringify(
			{
				extends: "../../tsconfig.base.json",
				compilerOptions: {},
				include: ["src"],
				exclude: ["node_modules"],
			},
			null,
			"\t",
		),
	);

	// Module entry point
	writeFileSync(
		join(moduleDir, "src/index.ts"),
		`import type { Module } from "@86d-app/core";
import { schema } from "./schema.js";
import { storeEndpoints } from "./store/endpoints/index.js";
import { adminEndpoints } from "./admin/endpoints/index.js";

export default function ${toCamelCase(moduleName)}(
	options: Record<string, unknown> = {},
): Module {
	return {
		id: "${moduleName}",
		version: "0.0.1",
		schema,
		options,
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
	};
}
`,
	);

	// Schema
	writeFileSync(
		join(moduleDir, "src/schema.ts"),
		`import { z } from "zod";

export const schema = z.object({
	// Define your module's data schema here
});

export type ${toPascalCase(moduleName)}Data = z.infer<typeof schema>;
`,
	);

	// Store endpoints
	writeFileSync(
		join(moduleDir, "src/store/endpoints/index.ts"),
		`// Store (public) endpoints for ${moduleName}
// biome-ignore lint/suspicious/noExplicitAny: endpoint map
export const storeEndpoints: Record<string, any> = {};
`,
	);

	// Admin endpoints
	writeFileSync(
		join(moduleDir, "src/admin/endpoints/index.ts"),
		`// Admin (protected) endpoints for ${moduleName}
// biome-ignore lint/suspicious/noExplicitAny: endpoint map
export const adminEndpoints: Record<string, any> = {};
`,
	);

	// Store components
	writeFileSync(
		join(moduleDir, "src/store/components/index.tsx"),
		`import type { MDXComponents } from "mdx/types";

const components = {} satisfies MDXComponents;

export default components;
`,
	);

	// Admin components
	writeFileSync(
		join(moduleDir, "src/admin/components/index.tsx"),
		`// Admin components for ${moduleName}
export {};
`,
	);

	// MDX type declarations
	writeFileSync(
		join(moduleDir, "src/mdx.d.ts"),
		`declare module "*.mdx" {
	import type { ComponentType } from "react";
	const component: ComponentType<Record<string, unknown>>;
	export default component;
}
`,
	);

	console.log(`  Created ${dirs.length} directories`);
	console.log(`  Created module entry point, schema, endpoints, and components`);
	console.log(`\nNext steps:`);
	console.log(`  1. Add "@86d-app/${moduleName}" to templates/brisa/config.json`);
	console.log(`  2. Implement your schema, controllers, and endpoints`);
	console.log(`  3. Run: 86d generate`);
}

function toCamelCase(name: string): string {
	return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function toPascalCase(name: string): string {
	const camel = toCamelCase(name);
	return camel.charAt(0).toUpperCase() + camel.slice(1);
}
