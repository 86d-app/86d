// ── Public API ────────────────────────────────────────────────────────

export {
	getModuleOptions,
	normalizeModulesField,
	readStoreConfig,
} from "./config.js";
export { ensureCacheDir, fetchModule } from "./fetcher.js";
export { buildManifest } from "./manifest.js";
export {
	getLocalModuleNames,
	readLocalManifest,
	resolveModules,
} from "./resolver.js";
export { isOfficialModule, parseSpecifier } from "./specifier.js";

// ── Types ─────────────────────────────────────────────────────────────

export type {
	FetchResult,
	ModuleSourceType,
	ModuleSpecifier,
	RegistryManifest,
	RegistryModule,
	ResolutionStatus,
	ResolvedModule,
	StoreConfig,
} from "./types.js";

export { registryManifestSchema, registryModuleSchema } from "./types.js";
