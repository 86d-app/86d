import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../../..");
const TEMPLATES_DIR = join(ROOT, "templates");
const BASE_TEMPLATE = "brisa";

export function templateCommand(
	subcommand: string | undefined,
	args: string[],
) {
	switch (subcommand) {
		case "create":
			return createTemplate(args[0]);
		case "list":
		case "ls":
			return listTemplates();
		default:
			console.error(
				`Unknown template subcommand: ${subcommand ?? "(none)"}\n`,
			);
			console.log("Usage:");
			console.log(
				"  86d template create <name>   Scaffold a new template from brisa",
			);
			console.log("  86d template list            List all templates");
			process.exit(1);
	}
}

function listTemplates() {
	if (!existsSync(TEMPLATES_DIR)) {
		console.log("No templates directory found.");
		return;
	}

	const templates = readdirSync(TEMPLATES_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.sort();

	console.log(`Found ${templates.length} template(s):\n`);
	for (const t of templates) {
		const configPath = join(TEMPLATES_DIR, t, "config.json");
		let name = t;
		if (existsSync(configPath)) {
			try {
				const config = JSON.parse(readFileSync(configPath, "utf-8"));
				if (config.name) name = `${t} — ${config.name}`;
			} catch {
				// ignore parse errors
			}
		}
		console.log(`  ${name}`);
	}
}

function createTemplate(name: string | undefined) {
	if (!name) {
		console.error("Template name is required.\n");
		console.log("Usage: 86d template create <name>");
		console.log("Example: 86d template create minimal");
		process.exit(1);
	}

	const templateDir = join(TEMPLATES_DIR, name);

	if (existsSync(templateDir)) {
		console.error(`Template "${name}" already exists at ${templateDir}`);
		process.exit(1);
	}

	const baseDir = join(TEMPLATES_DIR, BASE_TEMPLATE);
	if (!existsSync(baseDir)) {
		console.error(`Base template "${BASE_TEMPLATE}" not found at ${baseDir}`);
		process.exit(1);
	}

	console.log(`Creating template "${name}" from "${BASE_TEMPLATE}"...\n`);

	// Copy the base template
	cpSync(baseDir, templateDir, { recursive: true });

	// Update config.json with new theme name
	const configPath = join(templateDir, "config.json");
	if (existsSync(configPath)) {
		const config = JSON.parse(readFileSync(configPath, "utf-8"));
		config.theme = name;
		config.name = `86d ${name.charAt(0).toUpperCase() + name.slice(1)} Theme`;
		writeFileSync(configPath, JSON.stringify(config, null, 4));
	}

	console.log(`  Copied ${BASE_TEMPLATE} → ${name}`);
	console.log(`\nNext steps:`);
	console.log(`  1. Edit templates/${name}/config.json (colors, modules)`);
	console.log(`  2. Customize the MDX files in templates/${name}/`);
	console.log(
		`  3. Update apps/store/tsconfig.json "template/*" path to point to your template`,
	);
}
