// ── Public API ────────────────────────────────────────────────────────

export {
	getModuleOptions,
	normalizeModulesField,
	readStoreConfig,
} from "./config.js";
export {
	computeIntegrity,
	ensureCacheDir,
	fetchModule,
	fetchWithRetry,
} from "./fetcher.js";
export { buildManifest } from "./manifest.js";
export {
	getLocalModuleNames,
	readLocalManifest,
	resolveModules,
} from "./resolver.js";
export { isOfficialModule, parseSpecifier } from "./specifier.js";
export {
	fetchTemplate,
	getLocalTemplateNames,
	readTemplateConfig,
	resolveTemplate,
} from "./template.js";

// ── Types ─────────────────────────────────────────────────────────────

export type { ResolvedTemplate } from "./template.js";
export type {
	FetchResult,
	ModuleSourceType,
	ModuleSpecifier,
	RegistryManifest,
	RegistryModule,
	RegistryTemplate,
	ResolutionStatus,
	ResolvedModule,
	StoreConfig,
} from "./types.js";

export {
	registryManifestSchema,
	registryModuleSchema,
	registryTemplateSchema,
} from "./types.js";
