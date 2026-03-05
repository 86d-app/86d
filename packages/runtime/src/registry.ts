import type {
	Module,
	ModuleContext,
	ModuleControllers,
	ModuleDataService,
	ModuleId,
	ModuleStatus,
	Primitive,
	Session,
} from "@86d-app/core";
import {
	createEventBus,
	createScopedEmitter,
	type EventBus,
	type EventBusOptions,
	formatViolations,
	getRequiredModuleIds,
	validateContracts,
} from "@86d-app/core";

/**
 * Per-module state tracked by the registry.
 */
export interface ModuleEntry {
	module: Module;
	status: ModuleStatus;
	/** Database UUID for this module record (set after boot) */
	dbId: string | undefined;
	/** Module-scoped data service (set after boot) */
	dataService: ModuleDataService | undefined;
	/** Error captured during init, if any */
	error: Error | undefined;
}

/**
 * Health snapshot returned by `getHealth()`.
 */
export interface RegistryHealth {
	status: "ready" | "booting" | "stopped" | "error";
	modules: Array<{
		id: string;
		status: ModuleStatus;
		error: string | undefined;
	}>;
	bootedAt: number | undefined;
	uptimeMs: number | undefined;
}

export interface ModuleRegistryConfig {
	/**
	 * Function to resolve a store identifier to its database UUID.
	 */
	resolveStoreId: (storeId: string) => Promise<string>;
	/**
	 * Function to upsert a module record and return the database UUID.
	 */
	upsertModuleRecord: (params: {
		storeId: string;
		moduleId: string;
		version: string;
		// biome-ignore lint/suspicious/noExplicitAny: module options can be any primitive record
		options: Record<string, any> | undefined;
	}) => Promise<string>;
	/**
	 * Factory to create a data service for a module.
	 */
	createDataService: (params: {
		storeId: string;
		moduleDbId: string;
	}) => ModuleDataService;
	/**
	 * Event bus options.
	 */
	eventBusOptions?: EventBusOptions | undefined;
}

/**
 * ModuleRegistry — boots modules once and creates cheap per-request contexts.
 *
 * Lifecycle:
 * 1. `new ModuleRegistry(modules, storeId, config)` — registers modules
 * 2. `await registry.boot()` — resolves store, upserts records, validates contracts,
 *    calls `init()`, wires events. Modules transition pending → ready.
 * 3. `registry.createRequestContext(session)` — returns a ModuleContext per request.
 *    No DB calls, no contract validation, no init. Just session injection.
 * 4. `await registry.shutdown()` — calls module `shutdown` hooks, cleans up.
 */
export class ModuleRegistry {
	private modules: Module[];
	private storeIdParam: string;
	private config: ModuleRegistryConfig;
	private moduleOptions: Record<string, Record<string, Primitive>>;

	private entries: Map<string, ModuleEntry> = new Map();
	private controllers: ModuleControllers = {};
	private resolvedStoreId: string | undefined;
	private eventBus: EventBus | undefined;
	private bootedAt: number | undefined;
	private booted = false;
	private shuttingDown = false;

	constructor(
		modules: Module[],
		storeId: string,
		config: ModuleRegistryConfig,
		moduleOptions?: Record<string, Record<string, Primitive>>,
	) {
		this.modules = modules;
		this.storeIdParam = storeId;
		this.config = config;
		this.moduleOptions = moduleOptions ?? {};

		// Register all modules as pending
		for (const mod of modules) {
			this.entries.set(mod.id, {
				module: mod,
				status: "pending",
				dbId: undefined,
				dataService: undefined,
				error: undefined,
			});
		}
	}

	/**
	 * Boot the registry. Resolves store, validates contracts, initializes modules.
	 * Must be called exactly once. Subsequent calls are no-ops.
	 */
	async boot(): Promise<void> {
		if (this.booted) {
			return;
		}

		// Resolve store ID
		this.resolvedStoreId = await this.config.resolveStoreId(this.storeIdParam);

		// Validate contracts before any init
		const violations = validateContracts(this.modules);
		if (violations.length > 0) {
			const messages = formatViolations(violations);
			throw new Error(
				`Module contract violations:\n${messages.map((m) => `  - ${m}`).join("\n")}`,
			);
		}

		// Create shared event bus
		this.eventBus = createEventBus(this.config.eventBusOptions);

		const initializedModules: string[] = [];

		// Build the shared context that modules can access during init
		const contextBase = {
			modules: this.modules.map((m) => m.id),
			options: this.moduleOptions,
			storeId: this.resolvedStoreId,
			controllers: this.controllers,
		};

		for (const mod of this.modules) {
			const entry = this.entries.get(mod.id);
			if (!entry) continue;

			entry.status = "initializing";

			try {
				// Check dependencies are initialized
				const requiredIds = getRequiredModuleIds(mod.requires);
				for (const requiredId of requiredIds) {
					if (!initializedModules.includes(requiredId)) {
						throw new Error(
							`Module "${mod.id}" requires "${requiredId}" but it was not initialized. ` +
								`Ensure "${requiredId}" appears before "${mod.id}" in your modules array.`,
						);
					}
				}

				// Upsert module record in DB
				const dbId = await this.config.upsertModuleRecord({
					storeId: this.resolvedStoreId,
					moduleId: mod.id,
					version: mod.version,
					options: mod.options
						? (mod.options as Record<string, Primitive>)
						: undefined,
				});
				entry.dbId = dbId;

				// Create data service
				const dataService = this.config.createDataService({
					storeId: this.resolvedStoreId,
					moduleDbId: dbId,
				});
				entry.dataService = dataService;

				// Wire event handlers
				if (mod.events?.handles) {
					for (const [eventType, handler] of Object.entries(
						mod.events.handles,
					)) {
						this.eventBus.on(eventType, handler);
					}
				}

				// Create scoped emitter for this module
				const scopedEmitter = createScopedEmitter(this.eventBus, mod.id);

				// Call init
				if (mod.init) {
					const initResult = await mod.init({
						...contextBase,
						data: dataService,
						events: scopedEmitter,
					});

					if (initResult?.context) {
						Object.assign(contextBase, initResult.context);
					}
					if (initResult?.controllers) {
						Object.assign(this.controllers, initResult.controllers);
					}
				}

				// Merge static controllers
				if (mod.controllers) {
					Object.assign(this.controllers, mod.controllers);
				}

				entry.status = "ready";
				initializedModules.push(mod.id);
			} catch (err) {
				entry.status = "error";
				entry.error = err instanceof Error ? err : new Error(String(err));
				throw err;
			}
		}

		this.booted = true;
		this.bootedAt = Date.now();
	}

	/**
	 * Create a lightweight per-request context.
	 * No DB calls, no contract validation, no init — just session injection.
	 * The registry must be booted first.
	 */
	createRequestContext(session?: Session | null | undefined): ModuleContext {
		if (!this.booted) {
			throw new Error("ModuleRegistry has not been booted. Call boot() first.");
		}
		if (this.shuttingDown) {
			throw new Error("ModuleRegistry is shutting down.");
		}
		if (!this.resolvedStoreId) {
			throw new Error("Store ID not resolved. Boot may have failed.");
		}

		// Build data registry from cached entries
		const dataRegistry: Map<ModuleId, ModuleDataService> = new Map();
		for (const [id, entry] of this.entries) {
			if (entry.dataService) {
				dataRegistry.set(id, entry.dataService);
			}
		}

		// Default data service = first module's
		const firstModuleId = this.modules[0]?.id;
		const defaultData = firstModuleId
			? dataRegistry.get(firstModuleId)
			: undefined;

		if (!defaultData) {
			throw new Error(
				"No modules initialized. At least one module is required.",
			);
		}

		// Create scoped emitter for the first module (default context emitter)
		const defaultEmitter =
			firstModuleId && this.eventBus
				? createScopedEmitter(this.eventBus, firstModuleId)
				: undefined;

		return {
			_dataRegistry: dataRegistry,
			data: defaultData,
			modules: this.modules.map((m) => m.id),
			options: this.moduleOptions,
			session,
			controllers: this.controllers,
			storeId: this.resolvedStoreId,
			events: defaultEmitter,
		};
	}

	/**
	 * Gracefully shut down all modules.
	 * Calls each module's `shutdown` hook in reverse init order.
	 */
	async shutdown(): Promise<void> {
		if (!this.booted || this.shuttingDown) {
			return;
		}
		this.shuttingDown = true;

		// Shutdown in reverse order
		const reversed = [...this.modules].reverse();

		for (const mod of reversed) {
			const entry = this.entries.get(mod.id);
			if (!entry || entry.status !== "ready") continue;

			if (mod.shutdown && entry.dataService && this.resolvedStoreId) {
				try {
					const scopedEmitter = this.eventBus
						? createScopedEmitter(this.eventBus, mod.id)
						: undefined;

					await mod.shutdown({
						data: entry.dataService,
						modules: this.modules.map((m) => m.id),
						options: this.moduleOptions,
						controllers: this.controllers,
						storeId: this.resolvedStoreId,
						events: scopedEmitter,
					});
				} catch {
					// Swallow shutdown errors — best-effort cleanup
				}
			}

			entry.status = "stopped";
		}

		// Clean up event bus
		if (this.eventBus) {
			this.eventBus.removeAllListeners();
		}

		this.booted = false;
	}

	/**
	 * Health snapshot of the registry and all modules.
	 */
	getHealth(): RegistryHealth {
		const moduleHealth = [...this.entries.values()].map((entry) => ({
			id: entry.module.id,
			status: entry.status,
			error: entry.error?.message,
		}));

		let status: RegistryHealth["status"];
		if (this.shuttingDown || (!this.booted && this.bootedAt !== undefined)) {
			status = "stopped";
		} else if (!this.booted) {
			status = "booting";
		} else if (moduleHealth.some((m) => m.status === "error")) {
			status = "error";
		} else {
			status = "ready";
		}

		return {
			status,
			modules: moduleHealth,
			bootedAt: this.bootedAt,
			uptimeMs: this.bootedAt ? Date.now() - this.bootedAt : undefined,
		};
	}

	/**
	 * Whether the registry has been booted and is ready to serve requests.
	 */
	isReady(): boolean {
		return this.booted && !this.shuttingDown;
	}

	/**
	 * Get the status of a specific module.
	 */
	getModuleStatus(moduleId: string): ModuleStatus | undefined {
		return this.entries.get(moduleId)?.status;
	}

	/**
	 * Get all registered module IDs.
	 */
	getModuleIds(): string[] {
		return this.modules.map((m) => m.id);
	}

	/**
	 * Get the merged controllers object.
	 */
	getControllers(): ModuleControllers {
		return this.controllers;
	}

	/**
	 * Get the shared event bus (only available after boot).
	 */
	getEventBus(): EventBus | undefined {
		return this.eventBus;
	}
}
