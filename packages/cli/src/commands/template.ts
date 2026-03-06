import {
	cpSync,
	existsSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
	c,
	detectActiveTemplate,
	error,
	findProjectRoot,
	heading,
	readJson,
	success,
	warn,
} from "../utils.js";

const BASE_TEMPLATE = "brisa";

export function templateCommand(
	subcommand: string | undefined,
	args: string[],
) {
	switch (subcommand) {
		case "create":
			return createTemplate(args[0]);
		case "activate":
		case "use":
			return activateTemplate(args[0]);
		case "list":
		case "ls":
			return listTemplates();
		case "help":
		case "--help":
		case undefined:
			return printHelp();
		default:
			error(`Unknown subcommand: ${subcommand}`);
			console.log();
			printHelp();
			process.exit(1);
	}
}

function printHelp() {
	console.log(`
${c.bold("86d template")} — Manage templates

${c.dim("Usage:")}
  86d template create <name>     Scaffold a new template from ${BASE_TEMPLATE}
  86d template activate <name>   Switch the store to use a template
  86d template list               List all templates
`);
}

function listTemplates() {
	const root = findProjectRoot();
	const templatesDir = join(root, "templates");

	if (!existsSync(templatesDir)) {
		warn("No templates directory found.");
		return;
	}

	const templates = readdirSync(templatesDir, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)
		.sort();

	const activeTemplate = detectActiveTemplate(root);

	heading(`Templates (${templates.length})`);
	console.log();

	for (const t of templates) {
		const config = readJson<{ name?: string; theme?: string }>(
			join(templatesDir, t, "config.json"),
		);
		const label = config?.name ? `${c.dim("—")} ${config.name}` : "";
		const isActive = t === activeTemplate ? c.green(" (active)") : "";
		console.log(`  ${c.bold(t)}${isActive} ${label}`);
	}
	console.log();
}

function createTemplate(name: string | undefined) {
	if (!name) {
		error("Template name is required.");
		console.log(`\n  Usage: 86d template create <name>`);
		console.log(`  Example: ${c.dim("86d template create minimal")}`);
		process.exit(1);
	}

	const root = findProjectRoot();
	const templatesDir = join(root, "templates");
	const templateDir = join(templatesDir, name);

	if (existsSync(templateDir)) {
		error(`Template "${name}" already exists at ${templateDir}`);
		process.exit(1);
	}

	const baseDir = join(templatesDir, BASE_TEMPLATE);
	if (!existsSync(baseDir)) {
		error(`Base template "${BASE_TEMPLATE}" not found at ${baseDir}`);
		process.exit(1);
	}

	heading(`Creating template "${name}"`);
	console.log();

	// Copy the base template
	cpSync(baseDir, templateDir, { recursive: true });
	success(`Copied ${BASE_TEMPLATE} → ${name}`);

	// Update config.json with new theme name
	const configPath = join(templateDir, "config.json");
	if (existsSync(configPath)) {
		try {
			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			config.theme = name;
			config.name = `86d ${name.charAt(0).toUpperCase() + name.slice(1)} Theme`;
			writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`);
			success("Updated config.json with new theme name");
		} catch {
			warn("Could not update config.json — edit it manually");
		}
	}

	console.log(`\n  Next steps:`);
	console.log(
		`  ${c.dim("1.")} Edit ${c.cyan(`templates/${name}/config.json`)} (colors, modules)`,
	);
	console.log(
		`  ${c.dim("2.")} Customize the MDX files in ${c.cyan(`templates/${name}/`)}`,
	);
	console.log(
		`  ${c.dim("3.")} Run: ${c.bold(`86d template activate ${name}`)}`,
	);
	console.log();
}

function activateTemplate(name: string | undefined) {
	if (!name) {
		error("Template name is required.");
		console.log(`\n  Usage: 86d template activate <name>`);
		console.log(`  Example: ${c.dim("86d template activate minimal")}`);
		process.exit(1);
	}

	const root = findProjectRoot();
	const templateDir = join(root, "templates", name);

	if (!existsSync(templateDir)) {
		error(`Template "${name}" not found at ${templateDir}`);
		process.exit(1);
	}

	const configPath = join(templateDir, "config.json");
	if (!existsSync(configPath)) {
		error(`Template "${name}" is missing config.json`);
		process.exit(1);
	}

	const activeTemplate = detectActiveTemplate(root);
	if (activeTemplate === name) {
		warn(`Template "${name}" is already active`);
		return;
	}

	// Update the template/* path alias in apps/store/tsconfig.json
	const tsconfigPath = join(root, "apps/store/tsconfig.json");
	if (!existsSync(tsconfigPath)) {
		error("apps/store/tsconfig.json not found");
		process.exit(1);
	}

	try {
		const content = readFileSync(tsconfigPath, "utf-8");
		const updated = content.replace(
			/(["']template\/\*["']\s*:\s*\[\s*["'])\.\.\/\.\.\/templates\/[^/]+\//,
			`$1../../templates/${name}/`,
		);

		if (updated === content) {
			error("Could not find template/* path alias in apps/store/tsconfig.json");
			process.exit(1);
		}

		writeFileSync(tsconfigPath, updated);
		success(
			`Activated template ${c.bold(name)}${activeTemplate ? ` (was ${activeTemplate})` : ""}`,
		);
		console.log(
			`\n  Run ${c.bold("86d generate")} to regenerate module code.\n`,
		);
	} catch (err) {
		error(`Failed to update tsconfig.json: ${err}`);
		process.exit(1);
	}
}
