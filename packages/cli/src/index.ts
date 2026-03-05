#!/usr/bin/env node

/**
 * 86d CLI
 *
 * Commands:
 *   dev              Start the store development server
 *   init             Configure a local store (set up .env, install deps)
 *   module create    Scaffold a new module
 *   module list      List all modules
 *   template create  Scaffold a new template
 *   template list    List all templates
 *   generate         Run code generation (modules, components, API router)
 */

import { dev } from "./commands/dev.js";
import { generate } from "./commands/generate.js";
import { init } from "./commands/init.js";
import { moduleCommand } from "./commands/module.js";
import { templateCommand } from "./commands/template.js";

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

async function main() {
	switch (command) {
		case "dev":
			return dev(args.slice(1));

		case "init":
			return init(args.slice(1));

		case "module":
			return moduleCommand(subcommand, args.slice(2));

		case "template":
			return templateCommand(subcommand, args.slice(2));

		case "generate":
			return generate(args.slice(1));

		case "help":
		case "--help":
		case "-h":
		case undefined:
			return printHelp();

		case "version":
		case "--version":
		case "-v":
			return printVersion();

		default:
			console.error(`Unknown command: ${command}`);
			printHelp();
			process.exit(1);
	}
}

function printHelp() {
	console.log(`
86d — Modular commerce platform CLI

Usage: 86d <command> [options]

Commands:
  dev                    Start the store development server
  init                   Configure a local store
  module create <name>   Scaffold a new module
  module list            List all modules
  template create <name> Scaffold a new template from brisa
  template list          List all templates
  generate               Run code generation

Options:
  -h, --help             Show this help message
  -v, --version          Show version
`);
}

function printVersion() {
	console.log("86d v0.0.1");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
