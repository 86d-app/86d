/**
 * @86d-app/core
 *
 * Core types and utilities for the 86d module system.
 * This package provides everything module authors need to build modules.
 */

// MobX re-exports moved to @86d-app/core/state (avoids pulling
// mobx-react-lite into server bundles where React hooks are unavailable).
export type { BaseAdapter } from "./adapters";
export {
	type AdminEndpointContext,
	createAdminEndpoint,
	createRouter,
	createStoreEndpoint,
	type Endpoint,
	type EndpointContext,
	type InputContext,
	type Middleware,
	type RouterConfig,
	type StoreEndpointContext,
	type ZodInfer,
	type ZodSchema,
	type ZodType,
	z,
} from "./api";
export {
	computeInitOrder,
	formatViolations,
	getRequiredModuleIds,
	normalizeRequires,
	validateContracts,
} from "./contracts";
export {
	formatPathConflicts,
	validateUniquePaths,
	type ModulePathConflict,
	type ModulePathKind,
	type ModulePathSource,
} from "./paths";
export {
	createEventBus,
	createScopedEmitter,
	type EventBus,
	type EventBusOptions,
	type EventErrorHandler,
	type EventHandler,
	type ModuleEvent,
	type ScopedEventEmitter,
} from "./events";
export {
	escapeScriptContent,
	isSafeUrl,
	normalizeWhitespace,
	sanitizeHtml,
	sanitizeText,
	stripTags,
} from "./sanitize";
export type {
	Awaitable,
	LiteralString,
	LiteralUnion,
	Prettify,
	Primitive,
} from "./types/helper";
export type {
	AdminPage,
	ContractViolation,
	HookEndpointContext,
	Module,
	ModuleConfig,
	ModuleContext,
	ModuleController,
	ModuleControllers,
	ModuleDataService,
	ModuleExports,
	ModuleId,
	ModuleOptions,
	ModuleRequires,
	ModuleStatus,
	Session,
} from "./types/module";
export type {
	BaseModelNames,
	FieldAttribute,
	FieldAttributeConfig,
	FieldType,
	ModelNames,
	ModuleSchema,
} from "./types/schema";
