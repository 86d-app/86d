import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
	RegistryManifest,
	RegistryModule,
	RegistryTemplate,
} from "./types.js";

/**
 * Build a registry manifest by scanning the local `modules/` directory.
 *
 * Used to generate `registry.json` from the monorepo source.
 */
export function buildManifest(
	root: string,
	options?: {
		baseUrl?: string;
		defaultRef?: string;
	},
): RegistryManifest {
	const modulesDir = join(root, "modules");
	const templatesDir = join(root, "templates");
	const modules: Record<string, RegistryModule> = {};
	const templates: Record<string, RegistryTemplate> = {};

	const baseManifest = {
		version: 1 as const,
		baseUrl: options?.baseUrl ?? "https://github.com/86d-app/86d",
		defaultRef: options?.defaultRef ?? "main",
	};

	if (!existsSync(modulesDir)) {
		return { ...baseManifest, modules, templates };
	}

	const dirs = readdirSync(modulesDir, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.sort();

	for (const name of dirs) {
		const moduleDir = join(modulesDir, name);
		const entry = buildModuleEntry(moduleDir, name);
		if (entry) {
			modules[name] = entry;
		}
	}

	// Scan templates
	if (existsSync(templatesDir)) {
		const templateDirs = readdirSync(templatesDir, { withFileTypes: true })
			.filter((d) => d.isDirectory())
			.map((d) => d.name)
			.sort();

		for (const name of templateDirs) {
			const templateDir = join(templatesDir, name);
			const entry = buildTemplateEntry(templateDir, name);
			if (entry) {
				templates[name] = entry;
			}
		}
	}

	return { ...baseManifest, modules, templates };
}

/**
 * Build a single {@link RegistryModule} entry from a module directory.
 */
function buildModuleEntry(
	moduleDir: string,
	name: string,
): RegistryModule | undefined {
	const pkgPath = join(moduleDir, "package.json");
	if (!existsSync(pkgPath)) return undefined;

	const pkgRaw = readFileSync(pkgPath, "utf-8");
	const pkg = JSON.parse(pkgRaw);

	// SHA-256 integrity hash of the package.json for verification after fetch
	const integrity = `sha256-${createHash("sha256").update(pkgRaw).digest("hex")}`;
	const indexPath = join(moduleDir, "src", "index.ts");

	// Extract metadata from index.ts
	let description = pkg.description ?? "";
	const version = pkg.version ?? "0.0.1";
	let category = "general";
	const requires: string[] = [];

	if (existsSync(indexPath)) {
		const content = readFileSync(indexPath, "utf-8");

		// Extract category from admin.pages[].group
		const groupMatch = content.match(/group:\s*"([^"]+)"/);
		if (groupMatch) {
			category = groupMatch[1].toLowerCase();
		}

		// Extract requires
		const reqMatch = content.match(/requires:\s*\[([^\]]*)\]/);
		if (reqMatch) {
			const reqContent = reqMatch[1];
			const ids = reqContent.match(/"([^"]+)"/g);
			if (ids) {
				for (const id of ids) {
					requires.push(id.slice(1, -1));
				}
			}
		}
	}

	// Detect capabilities
	const hasStoreComponents = existsSync(
		join(moduleDir, "src", "store", "components", "index.tsx"),
	);
	const hasAdminComponents = existsSync(
		join(moduleDir, "src", "admin", "components", "index.tsx"),
	);

	let hasStorePages = false;
	if (existsSync(indexPath)) {
		const content = readFileSync(indexPath, "utf-8");
		hasStorePages = /store:\s*\{[^}]*pages\s*:/.test(content);
	}

	// Use keywords for description if not set
	if (!description && pkg.keywords) {
		description = (pkg.keywords as string[]).join(", ");
	}

	return {
		name: pkg.name ?? `@86d-app/${name}`,
		description,
		version,
		category,
		path: `modules/${name}`,
		requires,
		hasStoreComponents,
		hasAdminComponents,
		hasStorePages,
		integrity,
	};
}

/**
 * Build a single {@link RegistryTemplate} entry from a template directory.
 */
function buildTemplateEntry(
	templateDir: string,
	name: string,
): RegistryTemplate | undefined {
	const configPath = join(templateDir, "config.json");
	if (!existsSync(configPath)) return undefined;

	try {
		const config = JSON.parse(readFileSync(configPath, "utf-8"));
		return {
			name,
			description: config.description ?? config.name ?? name,
			version: config.version ?? "0.0.1",
			path: `templates/${name}`,
		};
	} catch {
		return undefined;
	}
}
