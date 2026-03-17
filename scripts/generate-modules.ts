#!/usr/bin/env tsx

/**
 * Module Generator Script
 *
 * Generates apps/store/generated/ from templates/config.json
 *
 * Uses @86d-app/registry for module resolution and fetching:
 * - Resolves module specifiers (local, registry, github, npm)
 * - Fetches missing modules from remote sources at buildtime
 * - Generates static imports for all resolved modules
 * - Gracefully skips modules that fail to resolve/fetch
 *
 * Module specifiers in config.json:
 * - "*": All local workspace modules + registry modules
 * - "@86d-app/products": Official module (workspace or registry)
 * - "github:owner/repo/modules/custom": GitHub module
 * - "npm:@scope/package": npm module
 */

import { execSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import {
	detectCircularDependencies,
	fetchModule,
	generateLockfile,
	isLockfileSatisfied,
	readLockfile,
	readStoreConfig,
	resolveModules,
	verifyLockfile,
	writeLockfile,
} from "../packages/registry/src/index.js";
import type { ResolvedModule } from "../packages/registry/src/index.js";

interface PackageJson {
	dependencies?: Record<string, string>;
	[key: string]: unknown;
}

interface ModuleInfo {
	name: string;
	packageName: string;
	hasComponents: boolean;
	type: "workspace" | "npm";
}

const WORKSPACE_ROOT = resolve(import.meta.dirname, "..");
const STORE_ROOT = join(WORKSPACE_ROOT, "apps/store");
const CONFIG_PATH = join(WORKSPACE_ROOT, "templates/brisa/config.json");
const GENERATED_DIR = join(STORE_ROOT, "generated");
const OUTPUT_PATH = join(GENERATED_DIR, "components.ts");
const API_ROUTER_PATH = join(GENERATED_DIR, "api.ts");
const CLIENT_PATH = join(GENERATED_DIR, "client.ts");
const HOOKS_PATH = join(GENERATED_DIR, "hooks.ts");
const ADMIN_LOADERS_PATH = join(GENERATED_DIR, "admin-loaders.ts");
const STORE_LOADERS_PATH = join(GENERATED_DIR, "store-loaders.ts");
const TRANSPILE_PACKAGES_PATH = join(GENERATED_DIR, "transpile-packages.json");
const PACKAGE_JSON_PATH = join(STORE_ROOT, "package.json");

/**
 * Ensure a directory exists, creating it if necessary
 */
function ensureDir(dirPath: string) {
	if (!existsSync(dirPath)) {
		mkdirSync(dirPath, { recursive: true });
	}
}

function readPackageJson(): PackageJson {
	return JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf-8"));
}

function writePackageJson(pkg: PackageJson) {
	writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 4));
}

/**
 * Resolve the modules field using the registry package.
 *
 * 1. Read config.json and resolve all module specifiers
 * 2. For missing modules: attempt buildtime fetch from remote sources
 * 3. Return only successfully resolved modules as package name strings
 */
async function resolveModulesFromRegistry(): Promise<ResolvedModule[]> {
	const config = readStoreConfig(CONFIG_PATH);

	// Resolve specifiers against local workspace + registry manifest
	const resolved = await resolveModules(config, { root: WORKSPACE_ROOT });

	const found: ResolvedModule[] = [];
	const toFetch: ResolvedModule[] = [];

	for (const mod of resolved) {
		if (mod.status === "found") {
			found.push(mod);
		} else if (mod.status === "missing" && !mod.error) {
			// Module exists in registry/github/npm but not locally — can be fetched
			toFetch.push(mod);
		} else {
			// Truly missing (not in registry, or has error) — skip with warning
			console.warn(
				`⚠ Module "${mod.specifier.raw}" not found — skipping${mod.error ? `: ${mod.error}` : ""}`,
			);
		}
	}

	// Fetch missing modules at buildtime
	if (toFetch.length > 0) {
		console.log(`  Fetching ${toFetch.length} missing module(s)...`);

		// Load manifest for fetch operations
		const { readLocalManifest } = await import(
			"../packages/registry/src/index.js"
		);
		const manifest = readLocalManifest(
			join(WORKSPACE_ROOT, "registry.json"),
		);

		for (const mod of toFetch) {
			const { specifier } = mod;
			console.log(`  ↓ Fetching ${specifier.packageName} (${specifier.source})...`);

			const result = await fetchModule(specifier, WORKSPACE_ROOT, manifest);
			if (result.success && result.localPath) {
				found.push({
					...mod,
					status: "found",
					localPath: result.localPath,
				});
				console.log(`  ✓ ${specifier.packageName}`);
			} else {
				console.warn(
					`  ⚠ Failed to fetch ${specifier.packageName}: ${result.error ?? "unknown error"} — skipping`,
				);
			}
		}
	}

	const localCount = found.filter(
		(m) => m.specifier.source === "local",
	).length;
	const remoteCount = found.length - localCount;
	console.log(
		`  Resolved ${found.length} module(s) (${localCount} local, ${remoteCount} fetched)`,
	);

	return found;
}

/**
 * Convert resolved modules to the package name list the generators expect.
 */
function resolvedToPackageNames(resolved: ResolvedModule[]): string[] {
	return resolved.map((m) => m.specifier.packageName);
}

function isWorkspaceModule(moduleName: string): boolean {
	// Check if module exists in workspace
	const moduleShortName = moduleName.replace("@86d-app/", "");
	const workspaceModulePath = join(
		WORKSPACE_ROOT,
		"modules",
		moduleShortName,
		"package.json",
	);
	return existsSync(workspaceModulePath);
}

function getModuleType(moduleName: string): "workspace" | "npm" {
	if (moduleName.startsWith("@86d-app/") && isWorkspaceModule(moduleName)) {
		return "workspace";
	}
	return "npm";
}

async function checkModuleHasComponents(
	moduleName: string,
	moduleType: "workspace" | "npm",
): Promise<boolean> {
	if (moduleType === "workspace") {
		const moduleShortName = moduleName.replace("@86d-app/", "");
		const basePath = join(WORKSPACE_ROOT, "modules", moduleShortName, "src");
		const storeComponentsPath = join(basePath, "store", "components", "index.tsx");

		if (existsSync(storeComponentsPath)) {
			const content = readFileSync(storeComponentsPath, "utf-8");
			if (content.trim().length > 0) return true;
		}
		return false;
	}

	try {
		const modulePath = join(WORKSPACE_ROOT, "node_modules", moduleName);
		const paths = [
			join(modulePath, "src/store/components/index.tsx"),
			join(modulePath, "src/store/components.tsx"),
		];
		for (const p of paths) {
			if (existsSync(p)) {
				const content = readFileSync(p, "utf-8");
				if (content.trim().length > 0) return true;
			}
		}
		return true;
	} catch {
		return true;
	}
}

async function ensureModuleDependencies(modules: string[]) {
	const packageJson = readPackageJson();
	const dependencies = packageJson.dependencies || {};
	let modified = false;

	for (const moduleName of modules) {
		const moduleType = getModuleType(moduleName);

		if (moduleType === "workspace") {
			// Ensure workspace module is in dependencies as workspace:*
			if (!dependencies[moduleName]) {
				console.log(
					`Adding workspace module to dependencies: ${moduleName}`,
				);
				dependencies[moduleName] = "workspace:*";
				modified = true;
			}
		} else {
			// For npm modules, add to dependencies if not present
			if (!dependencies[moduleName]) {
				console.log(`Adding npm module to dependencies: ${moduleName}`);
				dependencies[moduleName] = "latest";
				modified = true;
			}
		}
	}

	if (modified) {
		packageJson.dependencies = dependencies;
		writePackageJson(packageJson);
		console.log("Installing dependencies...");
		try {
			execSync("bun install", {
				cwd: WORKSPACE_ROOT,
				stdio: "inherit",
			});
		} catch (error) {
			console.error("Failed to install dependencies:", error);
			process.exit(1);
		}
	}
}

async function generateModulesFile() {
	const modules = getCachedModules();

	if (modules.length === 0) {
		console.log("No modules defined in config.json");
		// Generate empty modules file
		const emptyContent = `// Auto-generated file - do not edit manually
// Run 'pnpm generate:modules' to regenerate

import type { MDXComponents } from "mdx/types";

export const modules: string[] = [];
export const components: MDXComponents = {};
`;
		ensureDir(GENERATED_DIR);
		writeFileSync(OUTPUT_PATH, emptyContent);
		return;
	}

	// Ensure all modules are in package.json and installed
	await ensureModuleDependencies(modules);

	// Gather module info
	const moduleInfos: ModuleInfo[] = await Promise.all(
		modules.map(async (moduleName) => {
			const moduleType = getModuleType(moduleName);
			return {
				name: moduleName,
				hasComponents: await checkModuleHasComponents(
					moduleName,
					moduleType,
				),
				type: moduleType,
			};
		}),
	);

	// Filter to only modules with components
	const modulesWithComponents = moduleInfos.filter((m) => m.hasComponents);

	// Generate imports
	const imports = modulesWithComponents
		.map(
			(mod, idx) =>
				`import moduleComponents${idx} from "${mod.name}/components";`,
		)
		.join("\n");

	// Generate merge logic
	const componentsMerge =
		modulesWithComponents.length > 0
			? `const components: MDXComponents = {
    ${modulesWithComponents.map((_, idx) => `...moduleComponents${idx},`).join("\n    ")}
};`
			: `const components: MDXComponents = {};`;

	// Generate module list with type annotations
	const moduleList = modules.map((m) => `    "${m}"`).join(",\n");

	// Generate file content
	const content = `// Auto-generated file - do not edit manually
// Run 'pnpm generate:modules' to regenerate
// Generated from: ${CONFIG_PATH}

import type { MDXComponents } from "mdx/types";
${imports}

export const modules = [
${moduleList}
] as const;

${componentsMerge}

export { components };
`;

	ensureDir(GENERATED_DIR);
	writeFileSync(OUTPUT_PATH, content);
	console.log(
		`✓ Generated components.ts with ${modulesWithComponents.length} module(s)`,
	);

	// Log module types for transparency
	const workspaceCount = moduleInfos.filter(
		(m) => m.type === "workspace",
	).length;
	const npmCount = moduleInfos.filter((m) => m.type === "npm").length;
	console.log(
		`  - ${workspaceCount} workspace module(s), ${npmCount} npm module(s)`,
	);

	if (modulesWithComponents.length < modules.length) {
		const skipped = modules.length - modulesWithComponents.length;
		console.log(
			`  - ${skipped} module(s) skipped (no components exported)`,
		);
	}
}

async function generateApiRouter() {
	const config = readStoreConfig(CONFIG_PATH);
	const modules = getCachedModules();
	const moduleOptions = config.moduleOptions || {};

	if (modules.length === 0) {
		console.log("No modules defined for API router generation");
		// Generate empty router
		const emptyContent = `// Auto-generated file - do not edit manually
// Run 'pnpm generate:modules' to regenerate

import { createRouter } from "better-call";

const modules: any[] = [];

const allEndpoints = {};

export const router = createRouter(allEndpoints);

export type Router = typeof router;
`;
		ensureDir(GENERATED_DIR);
		writeFileSync(API_ROUTER_PATH, emptyContent);
		return;
	}

	// Generate module imports
	const moduleImports = modules
		.map((moduleName, idx) => `import module${idx} from "${moduleName}";`)
		.join("\n");

	// Build path → module id map for request context (workspace modules only)
	const pathPatterns: Array<{ pattern: string; moduleId: string }> = [];
	for (const moduleName of modules) {
		if (getModuleType(moduleName) !== "workspace") continue;
		const shortName = moduleName.replace("@86d-app/", "");
		const mappings = extractEndpointMappings(moduleName);
		const moduleDir = join(WORKSPACE_ROOT, "modules", shortName, "src");
		const indexPath = join(moduleDir, "index.ts");
		let moduleId = shortName;
		if (existsSync(indexPath)) {
			const indexContent = readFileSync(indexPath, "utf-8");
			const idMatch = indexContent.match(/id:\s*"([^"]+)"/);
			if (idMatch) moduleId = idMatch[1];
		}
		for (const ep of mappings.store) {
			pathPatterns.push({ pattern: ep.path, moduleId });
		}
		for (const ep of mappings.admin) {
			pathPatterns.push({ pattern: ep.path, moduleId });
		}
	}
	// Sort by pattern length descending so more specific patterns match first
	pathPatterns.sort((a, b) => b.pattern.length - a.pattern.length);

	const pathPatternsJson = JSON.stringify(pathPatterns, null, 2);

	// Generate module instantiation — cast options since moduleOptions is a flat Record
	// and some modules (stripe, square, paypal, braintree) have required option properties.
	const moduleInstances = modules
		.map((moduleName, idx) => {
			const optionsKey = moduleName;
			return `  // biome-ignore lint/suspicious/noExplicitAny: runtime module options are untyped
  module${idx}(moduleOptions["${optionsKey}"] as any || {}),`;
		})
		.join("\n");

	// Detect which payment provider modules are present so we can generate wiring code
	const hasPayments = modules.includes("@86d-app/payments");
	const hasStripe = modules.includes("@86d-app/stripe");
	const hasPayPal = modules.includes("@86d-app/paypal");
	const hasSquare = modules.includes("@86d-app/square");
	const hasBraintree = modules.includes("@86d-app/braintree");
	const hasAnyProvider = hasStripe || hasPayPal || hasSquare || hasBraintree;

	// Generate provider imports (only for present modules)
	const providerImports: string[] = [];
	if (hasStripe) providerImports.push(`import { StripePaymentProvider } from "@86d-app/stripe";`);
	if (hasPayPal) providerImports.push(`import { PayPalPaymentProvider } from "@86d-app/paypal";`);
	if (hasSquare) providerImports.push(`import { SquarePaymentProvider } from "@86d-app/square";`);
	if (hasBraintree) providerImports.push(`import { BraintreePaymentProvider } from "@86d-app/braintree";`);

	// Generate runtime env-var wiring code for payment providers
	let providerWiringCode = "";
	if (hasPayments && hasAnyProvider) {
		const blocks: string[] = [];

		if (hasStripe) {
			blocks.push(`// Wire Stripe options from env vars
if (process.env.STRIPE_SECRET_KEY) {
  moduleOptions["@86d-app/stripe"] = {
    ...moduleOptions["@86d-app/stripe"],
    apiKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  };
}`);
		}
		if (hasPayPal) {
			blocks.push(`// Wire PayPal options from env vars
if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
  moduleOptions["@86d-app/paypal"] = {
    ...moduleOptions["@86d-app/paypal"],
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    sandbox: process.env.PAYPAL_SANDBOX ?? "",
    webhookId: process.env.PAYPAL_WEBHOOK_ID ?? "",
  };
}`);
		}
		if (hasSquare) {
			blocks.push(`// Wire Square options from env vars
if (process.env.SQUARE_ACCESS_TOKEN) {
  moduleOptions["@86d-app/square"] = {
    ...moduleOptions["@86d-app/square"],
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? "",
    webhookNotificationUrl: process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ?? "",
  };
}`);
		}
		if (hasBraintree) {
			blocks.push(`// Wire Braintree options from env vars
if (process.env.BRAINTREE_MERCHANT_ID && process.env.BRAINTREE_PUBLIC_KEY && process.env.BRAINTREE_PRIVATE_KEY) {
  moduleOptions["@86d-app/braintree"] = {
    ...moduleOptions["@86d-app/braintree"],
    merchantId: process.env.BRAINTREE_MERCHANT_ID,
    publicKey: process.env.BRAINTREE_PUBLIC_KEY,
    privateKey: process.env.BRAINTREE_PRIVATE_KEY,
    sandbox: process.env.BRAINTREE_SANDBOX ?? "",
  };
}`);
		}

		// Build the provider resolution function — first configured provider wins
		const providerChecks: string[] = [];
		if (hasStripe) {
			providerChecks.push(`  if (process.env.STRIPE_SECRET_KEY) {
    return new StripePaymentProvider(process.env.STRIPE_SECRET_KEY);
  }`);
		}
		if (hasPayPal) {
			providerChecks.push(`  if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    return new PayPalPaymentProvider(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_CLIENT_SECRET,
      process.env.PAYPAL_SANDBOX === "true",
    );
  }`);
		}
		if (hasSquare) {
			providerChecks.push(`  if (process.env.SQUARE_ACCESS_TOKEN) {
    return new SquarePaymentProvider(process.env.SQUARE_ACCESS_TOKEN);
  }`);
		}
		if (hasBraintree) {
			providerChecks.push(`  if (process.env.BRAINTREE_MERCHANT_ID && process.env.BRAINTREE_PUBLIC_KEY && process.env.BRAINTREE_PRIVATE_KEY) {
    return new BraintreePaymentProvider(
      process.env.BRAINTREE_MERCHANT_ID,
      process.env.BRAINTREE_PUBLIC_KEY,
      process.env.BRAINTREE_PRIVATE_KEY,
      process.env.BRAINTREE_SANDBOX === "true",
    );
  }`);
		}

		blocks.push(`// Resolve the first available payment provider from env vars and wire it to the payments module
function resolvePaymentProvider() {
${providerChecks.join("\n")}
  return undefined;
}

const _resolvedProvider = resolvePaymentProvider();
if (_resolvedProvider) {
  moduleOptions["@86d-app/payments"] = {
    ...moduleOptions["@86d-app/payments"],
    provider: _resolvedProvider,
  };
}`);

		providerWiringCode = `\n// ── Payment provider wiring (env-var based, first configured provider wins) ──\n${blocks.join("\n\n")}\n`;
	}

	// Generate search module AI wiring code
	const hasSearch = modules.includes("@86d-app/search");
	let searchWiringCode = "";
	if (hasSearch) {
		searchWiringCode = `
// ── Search module AI wiring (env-var based) ──
if (process.env.OPENAI_API_KEY) {
  moduleOptions["@86d-app/search"] = {
    ...moduleOptions["@86d-app/search"],
    openaiApiKey: process.env.OPENAI_API_KEY,
  };
} else if (process.env.OPENROUTER_API_KEY) {
  moduleOptions["@86d-app/search"] = {
    ...moduleOptions["@86d-app/search"],
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
  };
}
`;
	}

	// Generate Toast POS wiring code
	const hasToast = modules.includes("@86d-app/toast");
	let toastWiringCode = "";
	if (hasToast) {
		toastWiringCode = `
// ── Toast POS wiring (env-var based) ──
if (process.env.TOAST_API_KEY && process.env.TOAST_RESTAURANT_GUID) {
  moduleOptions["@86d-app/toast"] = {
    ...moduleOptions["@86d-app/toast"],
    apiKey: process.env.TOAST_API_KEY,
    restaurantGuid: process.env.TOAST_RESTAURANT_GUID,
    ...(process.env.TOAST_SANDBOX !== undefined ? { sandbox: process.env.TOAST_SANDBOX } : {}),
  };
}
`;
	}

	// Generate API router content
	const routerContent = `// Auto-generated file - do not edit manually
// Run 'pnpm generate:modules' to regenerate
// Generated from: ${CONFIG_PATH}

import { createRouter } from "better-call";
import type { RouterConfig } from "better-call";
import type { ModuleContext } from "@86d-app/core";
${moduleImports}
${providerImports.length > 0 ? `\n${providerImports.join("\n")}\n` : ""}
// biome-ignore lint/suspicious/noExplicitAny: module option types are heterogeneous across modules
const moduleOptions: Record<string, Record<string, any>> = ${JSON.stringify(moduleOptions, null, 2)};
${providerWiringCode}${searchWiringCode}${toastWiringCode}
const modules = [
${moduleInstances}
];

// Collect ALL endpoints (customer + admin)
// biome-ignore lint/suspicious/noExplicitAny: better-call endpoint types are dynamic
const allEndpoints: Record<string, any> = {};
for (const mod of modules) {
  if (mod.endpoints?.store) Object.assign(allEndpoints, mod.endpoints.store);
  if (mod.endpoints?.admin) Object.assign(allEndpoints, mod.endpoints.admin);
}

/** Path patterns for resolving request path to owning module (longer patterns first). */
const pathPatterns: Array<{ pattern: string; moduleId: string }> = ${pathPatternsJson};

/**
 * Match a request path to a module id so the correct module data service is used.
 * Patterns use :param for a single segment; first (most specific) match wins.
 */
export function getModuleIdForPath(path: string): string | undefined {
  const segments = path.replace(/^\\//, "").split("/").filter(Boolean);
  for (const { pattern, moduleId } of pathPatterns) {
    const patternSegments = pattern.replace(/^\\//, "").split("/").filter(Boolean);
    if (patternSegments.length !== segments.length) continue;
    const match = patternSegments.every((seg, i) =>
      seg.startsWith(":") ? segments[i]?.length > 0 : seg === segments[i]
    );
    if (match) return moduleId;
  }
  return undefined;
}

/**
 * Create router with context
 * This allows passing request-specific context (session, db, etc.) to endpoints
 */
export function createApiRouter(
  context: ModuleContext,
  config?: Omit<RouterConfig, 'routerContext'>
) {
  return createRouter(allEndpoints, {
    ...config,
    routerContext: context,
  });
}

/** Modules that contribute to store command search (module.search.store). */
export const STORE_SEARCH_CONTRIBUTORS = modules
  .filter((m): m is typeof m & { search: { store: string } } => typeof (m as { search?: { store?: string } }).search?.store === "string")
  .map((m) => ({ moduleId: m.id, path: (m as { search: { store: string } }).search.store }));

/** Modules that contribute to admin command search (module.search.admin). */
export const ADMIN_SEARCH_CONTRIBUTORS = modules
  .filter((m): m is typeof m & { search: { admin: string } } => typeof (m as { search?: { admin?: string } }).search?.admin === "string")
  .map((m) => ({ moduleId: m.id, path: (m as { search: { admin: string } }).search.admin }));

// Export modules for inspection
export { modules, allEndpoints };

// Export router type
export type Router = ReturnType<typeof createApiRouter>;
`;

	ensureDir(GENERATED_DIR);
	writeFileSync(API_ROUTER_PATH, routerContent);
	console.log(`✓ Generated api.ts with ${modules.length} module(s)`);
}

async function generateClient() {
	const modules = getCachedModules();

	if (modules.length === 0) {
		console.log("No modules defined for client generation");
		return;
	}

	// Generate client SDK
	const clientContent = `// Auto-generated file - do not edit manually
// Run 'pnpm generate:modules' to regenerate
// Generated from: ${CONFIG_PATH}

import { createClient } from "better-call/client";
import type { Router } from "./api";

function getBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  if (process.env.APP_URL) return process.env.APP_URL;
  return "http://localhost:3000";
}

// biome-ignore lint/suspicious/noExplicitAny: avoids TS2742 portability error with transitive @better-fetch/fetch
export const api: any = createClient<Router>({
  baseURL: getBaseUrl(),
});

// Export typed API client
export { api as client };
`;

	ensureDir(GENERATED_DIR);
	writeFileSync(CLIENT_PATH, clientContent);
	console.log(`✓ Generated client.ts`);
}

/**
 * Get module id from workspace module's index.ts (e.g. "cart", "products").
 */
function getModuleIdFromWorkspace(moduleName: string): string {
	const shortName = moduleName.replace("@86d-app/", "");
	const moduleDir = join(WORKSPACE_ROOT, "modules", shortName, "src");
	const indexPath = join(moduleDir, "index.ts");
	if (!existsSync(indexPath)) return shortName;
	const indexContent = readFileSync(indexPath, "utf-8");
	const idMatch = indexContent.match(/id:\s*"([^"]+)"/);
	return idMatch ? idMatch[1] : shortName;
}

/**
 * Check if a workspace module has admin components (admin/components).
 */
function moduleHasAdminComponents(moduleName: string): boolean {
	if (getModuleType(moduleName) !== "workspace") return false;
	const shortName = moduleName.replace("@86d-app/", "");
	const basePath = join(WORKSPACE_ROOT, "modules", shortName, "src");
	return existsSync(join(basePath, "admin", "components", "index.tsx"));
}

/**
 * Check if a workspace module has store.pages (for store route registry).
 */
function moduleHasStorePages(moduleName: string): boolean {
	if (getModuleType(moduleName) !== "workspace") return false;
	const shortName = moduleName.replace("@86d-app/", "");
	const indexPath = join(
		WORKSPACE_ROOT,
		"modules",
		shortName,
		"src",
		"index.ts",
	);
	if (!existsSync(indexPath)) return false;
	const content = readFileSync(indexPath, "utf-8");
	return /store:\s*\{[^}]*pages\s*:/.test(content);
}

/**
 * Convert a hyphenated name to camelCase.
 * e.g. "digital-downloads" → "digitalDownloads"
 */
function toCamelCase(name: string): string {
	return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

interface EndpointMapping {
	path: string;
	name: string;
}

/**
 * Extract endpoint path → variable name mappings from a module's source files.
 * Reads from store/endpoints/index.ts and admin/endpoints/index.ts (canonical sources).
 */
function extractEndpointMappings(moduleName: string): {
	store: EndpointMapping[];
	admin: EndpointMapping[];
} {
	const moduleShortName = moduleName.replace("@86d-app/", "");
	const moduleDir = join(WORKSPACE_ROOT, "modules", moduleShortName, "src");

	const result: { store: EndpointMapping[]; admin: EndpointMapping[] } = {
		store: [],
		admin: [],
	};

	// Parse "path": variableName entries (e.g. "/cart": addToCart, "/products/:id": getProduct)
	const entryRegex = /"(\/[^"]+)":\s*(\w+)/g;

	const storePath = join(moduleDir, "store", "endpoints", "index.ts");
	const adminPath = join(moduleDir, "admin", "endpoints", "index.ts");

	if (existsSync(storePath)) {
		const source = readFileSync(storePath, "utf-8");
		const seen = new Map<string, string>();
		let match: RegExpExecArray | null;
		while ((match = entryRegex.exec(source)) !== null) {
			if (!seen.has(match[1])) {
				seen.set(match[1], match[2]);
				result.store.push({ path: match[1], name: match[2] });
			}
		}
	}

	entryRegex.lastIndex = 0;

	if (existsSync(adminPath)) {
		const source = readFileSync(adminPath, "utf-8");
		const seen = new Map<string, string>();
		let match: RegExpExecArray | null;
		while ((match = entryRegex.exec(source)) !== null) {
			if (!seen.has(match[1])) {
				seen.set(match[1], match[2]);
				result.admin.push({ path: match[1], name: match[2] });
			}
		}
	}

	return result;
}

/**
 * Generate hooks.ts with typed useApi() hook
 *
 * Produces a flat API object where each module's endpoints are accessible
 * by friendly names: api.cart.getCart.useQuery(), api.products.listProducts.useQuery()
 */
async function generateHooks() {
	const modules = getCachedModules();

	if (modules.length === 0) {
		const emptyContent = `// Auto-generated file - do not edit manually
// Run 'pnpm generate:modules' to regenerate

"use client";

import { useModuleClient } from "@86d-app/core/client";

export function useApi() {
  return useModuleClient();
}
`;
		ensureDir(GENERATED_DIR);
		writeFileSync(HOOKS_PATH, emptyContent);
		return;
	}

	// Extract endpoint mappings for each module
	const moduleEndpoints: Array<{
		name: string;
		shortName: string;
		moduleId: string;
		store: EndpointMapping[];
		admin: EndpointMapping[];
	}> = [];

	for (const moduleName of modules) {
		const moduleType = getModuleType(moduleName);
		if (moduleType !== "workspace") continue;

		const shortName = moduleName.replace("@86d-app/", "");
		const mappings = extractEndpointMappings(moduleName);

		// Read the module ID from the module's index.ts
		const moduleDir = join(WORKSPACE_ROOT, "modules", shortName, "src");
		const indexContent = readFileSync(join(moduleDir, "index.ts"), "utf-8");
		const idMatch = indexContent.match(/id:\s*"([^"]+)"/);
		const moduleId = idMatch ? idMatch[1] : shortName;

		moduleEndpoints.push({
			name: moduleName,
			shortName,
			moduleId,
			store: mappings.store,
			admin: mappings.admin,
		});
	}

	// Generate the hooks file
	let code = `// Auto-generated file - do not edit manually
// Run 'pnpm generate:modules' to regenerate
// Generated from: ${CONFIG_PATH}

"use client";

import { useMemo } from "react";
import { useModuleClient } from "@86d-app/core/client";
import type { ModuleClient } from "@86d-app/core/client";

/**
 * Hook to access the typed module API with friendly endpoint names.
 *
 * @example
 * \`\`\`tsx
 * const api = useApi();
 * const { data } = api.products.listProducts.useQuery();
 * const addToCart = api.cart.addToCart.useMutation();
 * \`\`\`
 */
export function useApi() {
  const client = useModuleClient();
  return useMemo(() => buildApi(client), [client]);
}

// biome-ignore lint/suspicious/noExplicitAny: generated accessor wraps dynamically typed module hooks
function buildApi(client: ModuleClient<any>) {
  return {
`;

	for (const mod of moduleEndpoints) {
		const propName = toCamelCase(mod.shortName);
		code += `    ${propName}: {\n`;

		// Collect store endpoint names for dedup
		const storeNames = new Set(mod.store.map((ep) => ep.name));

		// Store endpoints
		for (const ep of mod.store) {
			code += `      ${ep.name}: client.module("${mod.moduleId}").store["${ep.path}"],\n`;
		}

		// Admin endpoints — prefix with "admin" if name collides with a store endpoint
		for (const ep of mod.admin) {
			const key = storeNames.has(ep.name)
				? `admin${ep.name.charAt(0).toUpperCase()}${ep.name.slice(1)}`
				: ep.name;
			code += `      ${key}: client.module("${mod.moduleId}").admin["${ep.path}"],\n`;
		}

		code += "    },\n";
	}

	code += `  };
}

/**
 * Re-export useModuleClient for advanced use cases (custom hooks, direct access).
 */
export { useModuleClient } from "@86d-app/core/client";
`;

	ensureDir(GENERATED_DIR);
	writeFileSync(HOOKS_PATH, code);
	console.log(
		`✓ Generated hooks.ts with ${moduleEndpoints.length} module(s)`,
	);
}

/**
 * Generate admin-loaders.ts: dynamic import loaders for each module's admin-components.
 * Keyed by module id so the catch-all route can load (moduleId, componentName) → Component.
 */
async function generateAdminLoaders() {
	const modules = getCachedModules();

	const entries: Array<{ moduleId: string; packageName: string }> = [];
	for (const moduleName of modules) {
		if (!moduleHasAdminComponents(moduleName)) continue;
		const moduleId = getModuleIdFromWorkspace(moduleName);
		entries.push({ moduleId, packageName: moduleName });
	}

	const loadersEntries = entries
		.map(({ moduleId, packageName }) => `  "${moduleId}": () => import("${packageName}/admin-components"),`)
		.join("\n");

	const content = `// Auto-generated file - do not edit manually
// Run 'pnpm generate:modules' to regenerate
// Generated from: ${CONFIG_PATH}

import type { ComponentType } from "react";

// biome-ignore lint/suspicious/noExplicitAny: module admin components have varying props
type AdminComponentModule = Record<string, ComponentType<any>>;

/**
 * Lazy loaders for module admin component bundles.
 * Usage: adminComponentLoaders[moduleId]().then((m) => m[componentName])
 */
export const adminComponentLoaders: Record<string, () => Promise<AdminComponentModule>> = {
${loadersEntries}
};
`;

	ensureDir(GENERATED_DIR);
	writeFileSync(ADMIN_LOADERS_PATH, content);
	console.log(`✓ Generated admin-loaders.ts with ${entries.length} module(s)`);
}

/**
 * Generate store-loaders.ts: dynamic import loaders for each module's store components.
 * Only modules with store.pages are included (used by the store catch-all route).
 */
async function generateStoreLoaders() {
	const modules = getCachedModules();

	const entries: Array<{ moduleId: string; packageName: string }> = [];
	for (const moduleName of modules) {
		if (!moduleHasStorePages(moduleName)) continue;
		const moduleId = getModuleIdFromWorkspace(moduleName);
		entries.push({ moduleId, packageName: moduleName });
	}

	const loadersEntries = entries
		.map(
			({ moduleId, packageName }) =>
				`  "${moduleId}": () => import("${packageName}/components").then(unwrapDefault),`,
		)
		.join("\n");

	const content = `// Auto-generated file - do not edit manually
// Run 'bun scripts/generate-modules.ts' to regenerate
// Generated from: ${CONFIG_PATH}

import type { ComponentType } from "react";

// biome-ignore lint/suspicious/noExplicitAny: module store components have varying props
type StoreComponentModule = Record<string, ComponentType<any>>;

// biome-ignore lint/suspicious/noExplicitAny: dynamic import module shape is untyped
function unwrapDefault(m: any): StoreComponentModule {
  return m.default ?? m;
}

/**
 * Lazy loaders for module store component bundles (modules with store.pages).
 * Store components use default export; we unwrap to get the component map.
 * Usage: storeComponentLoaders[moduleId]().then((m) => m[componentName])
 */
export const storeComponentLoaders: Record<string, () => Promise<StoreComponentModule>> = {
${loadersEntries}
};
`;

	ensureDir(GENERATED_DIR);
	writeFileSync(STORE_LOADERS_PATH, content);
	console.log(`✓ Generated store-loaders.ts with ${entries.length} module(s)`);
}

/**
 * Generate transpile-packages.json: list of module package names that need
 * Next.js transpilation (any workspace module with JSX/TSX files).
 *
 * next.config.ts reads this file to build the transpilePackages array,
 * eliminating the need for a hard-coded list.
 */
function generateTranspilePackages() {
	const modules = getCachedModules();
	const transpile: string[] = [];

	for (const moduleName of modules) {
		if (getModuleType(moduleName) !== "workspace") continue;
		const shortName = moduleName.replace("@86d-app/", "");
		const basePath = join(WORKSPACE_ROOT, "modules", shortName, "src");

		// Include if module has any TSX files (store components, admin components, or pages)
		const hasJsx =
			existsSync(join(basePath, "store", "components", "index.tsx")) ||
			existsSync(join(basePath, "admin", "components", "index.tsx"));

		if (hasJsx) {
			transpile.push(moduleName);
		}
	}

	transpile.sort();
	ensureDir(GENERATED_DIR);
	writeFileSync(TRANSPILE_PACKAGES_PATH, JSON.stringify(transpile, null, 2));
	console.log(
		`✓ Generated transpile-packages.json with ${transpile.length} package(s)`,
	);
}

// Cache resolved modules list so it's only computed once
let _cachedModules: string[] | undefined;
let _cachedResolved: ResolvedModule[] | undefined;

function getCachedModules(): string[] {
	if (!_cachedModules) {
		throw new Error("Modules not resolved yet — call resolveModulesFromRegistry() first");
	}
	return _cachedModules;
}

function getCachedResolved(): ResolvedModule[] {
	if (!_cachedResolved) {
		throw new Error("Modules not resolved yet — call resolveModulesFromRegistry() first");
	}
	return _cachedResolved;
}

const isFrozen = process.argv.includes("--frozen");

// Run all generators
async function runGenerators() {
	// Pre-resolve modules once for all generators (with buildtime fetch)
	console.log("Resolving modules...");
	_cachedResolved = await resolveModulesFromRegistry();
	_cachedModules = resolvedToPackageNames(_cachedResolved);

	// Check for circular dependencies in the registry manifest
	const { readLocalManifest } = await import(
		"../packages/registry/src/index.js"
	);
	const manifest = readLocalManifest(join(WORKSPACE_ROOT, "registry.json"));
	if (manifest) {
		const cycles = detectCircularDependencies(manifest);
		if (cycles.length > 0) {
			console.error("✗ Circular dependencies detected:");
			for (const cycle of cycles) {
				console.error(`  ${cycle}`);
			}
			process.exit(1);
		}
	}

	// Lock file: verify (--frozen) or generate
	if (isFrozen) {
		const existingLock = readLockfile(WORKSPACE_ROOT);
		if (!existingLock) {
			console.error(
				"✗ --frozen requires registry.lock.json but none was found",
			);
			process.exit(1);
		}
		const diff = verifyLockfile(existingLock, _cachedResolved);
		if (!isLockfileSatisfied(diff)) {
			console.error("✗ registry.lock.json is out of date:");
			if (diff.added.length > 0)
				console.error(`  Added: ${diff.added.join(", ")}`);
			if (diff.removed.length > 0)
				console.error(`  Removed: ${diff.removed.join(", ")}`);
			if (diff.changed.length > 0)
				console.error(`  Changed: ${diff.changed.join(", ")}`);
			console.error(
				"  Run without --frozen to regenerate the lock file.",
			);
			process.exit(1);
		}
		console.log("✓ registry.lock.json is up to date");
	} else {
		const lockfile = generateLockfile(_cachedResolved, WORKSPACE_ROOT);
		writeLockfile(WORKSPACE_ROOT, lockfile);
		console.log(
			`✓ Generated registry.lock.json with ${Object.keys(lockfile.modules).length} module(s)`,
		);
	}

	await generateModulesFile();
	await generateApiRouter();
	await generateClient();
	await generateHooks();
	await generateAdminLoaders();
	await generateStoreLoaders();
	generateTranspilePackages();

	// Auto-format generated files so biome check passes
	try {
		execSync(`bun biome check --write ${GENERATED_DIR}`, { stdio: "pipe" });
		console.log("✓ Formatted generated files with biome");
	} catch {
		// Non-fatal: formatting may not be available in all environments
		console.warn("⚠ Could not format generated files with biome");
	}
}

runGenerators().catch((error) => {
	console.error("Failed to generate modules:", error);
	process.exit(1);
});
