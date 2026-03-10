import { z } from "zod";

// ── Module Specifier Parsing ──────────────────────────────────────────

/**
 * Source types for module resolution.
 *
 * - local:    Already present in the workspace `modules/` directory.
 * - registry: Resolved via the 86d registry manifest (fetched from GitHub).
 * - github:   Fetched from a specific GitHub repository path.
 * - npm:      Installed from npm.
 */
export type ModuleSourceType = "local" | "registry" | "github" | "npm";

/** Parsed module specifier — result of parsing a config.json entry. */
export interface ModuleSpecifier {
	/** Original raw string from config (e.g. "github:owner/repo/path"). */
	raw: string;
	/** Resolved source type. */
	source: ModuleSourceType;
	/** Short name used as the directory name inside `modules/`. */
	name: string;
	/** Full package name (e.g. "@86d-app/products"). */
	packageName: string;
	/** For github sources: "owner/repo". */
	repo?: string;
	/** For github sources: path within the repo (e.g. "modules/loyalty"). */
	path?: string;
	/** For github sources: branch or tag (default "main"). */
	ref?: string;
	/** For npm sources: version range (default "latest"). */
	version?: string;
}

// ── Registry Manifest ─────────────────────────────────────────────────

/** Schema for a single module entry in the registry manifest. */
export const registryModuleSchema = z.object({
	/** npm package name (e.g. "@86d-app/products"). */
	name: z.string(),
	/** Human-readable description. */
	description: z.string(),
	/** Semver version. */
	version: z.string(),
	/** Category for grouping (catalog, sales, marketing, etc.). */
	category: z.string(),
	/** Path within the registry repo (e.g. "modules/products"). */
	path: z.string(),
	/** Module IDs this module depends on. */
	requires: z.array(z.string()).default([]),
	/** Whether the module exports store-facing components. */
	hasStoreComponents: z.boolean().default(false),
	/** Whether the module exports admin-facing components. */
	hasAdminComponents: z.boolean().default(false),
	/** Whether the module declares store pages. */
	hasStorePages: z.boolean().default(false),
});

export type RegistryModule = z.infer<typeof registryModuleSchema>;

/** Schema for the full registry manifest (registry.json). */
export const registryManifestSchema = z.object({
	/** Manifest format version. */
	version: z.literal(1),
	/** Base GitHub repo URL (e.g. "https://github.com/86d-app/86d"). */
	baseUrl: z.string(),
	/** Default branch for fetching (e.g. "main"). */
	defaultRef: z.string().default("main"),
	/** Module entries keyed by short name. */
	modules: z.record(z.string(), registryModuleSchema),
});

export type RegistryManifest = z.infer<typeof registryManifestSchema>;

// ── Store Config ──────────────────────────────────────────────────────

/**
 * Extended config.json shape that supports registry features.
 *
 * `modules` can be:
 * - `"*"` to include all modules from the registry
 * - An array of module specifiers (strings)
 */
export interface StoreConfig {
	theme?: string;
	name?: string;
	modules?: "*" | string[];
	moduleOptions?: Record<string, Record<string, unknown>>;
	registry?: string;
	variables?: Record<string, Record<string, string>>;
	[key: string]: unknown;
}

// ── Resolution Result ─────────────────────────────────────────────────

export type ResolutionStatus = "found" | "missing" | "error";

/** Result of resolving a single module specifier. */
export interface ResolvedModule {
	specifier: ModuleSpecifier;
	status: ResolutionStatus;
	/** Absolute path to the module directory (when found/installed). */
	localPath?: string;
	/** Error message if status is "error". */
	error?: string;
}

// ── Fetch Result ──────────────────────────────────────────────────────

/** Result of fetching a module from a remote source. */
export interface FetchResult {
	success: boolean;
	/** Absolute path where the module was installed. */
	localPath?: string;
	error?: string;
}
