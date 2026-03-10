#!/usr/bin/env tsx

/**
 * Registry Manifest Generator
 *
 * Scans the modules/ directory and generates registry.json at the repo root.
 * This manifest indexes all available modules for the git-based registry system.
 *
 * Usage:
 *   tsx scripts/generate-registry.ts
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildManifest } from "../packages/registry/src/manifest.js";

const WORKSPACE_ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_PATH = resolve(WORKSPACE_ROOT, "registry.json");

const manifest = buildManifest(WORKSPACE_ROOT, {
	baseUrl: "https://github.com/86d-app/86d",
	defaultRef: "main",
});

const moduleCount = Object.keys(manifest.modules).length;

writeFileSync(OUTPUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`✓ Generated registry.json with ${moduleCount} module(s)`);
