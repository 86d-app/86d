/**
 * @86d-app/core/test-utils
 *
 * Shared test utilities for module authors.
 * Provides a mock ModuleDataService and helpers for constructing
 * ModuleContext objects in tests — without any database dependency.
 *
 * @example
 * ```ts
 * import { createMockDataService, createMockModuleContext } from "@86d-app/core/test-utils";
 *
 * const data = createMockDataService();
 * await data.upsert("product", "p1", { name: "Widget" });
 * const product = await data.get("product", "p1");
 * ```
 */

import type {
	ModuleContext,
	ModuleControllers,
	ModuleDataService,
	ModuleOptions,
	Session,
} from "./types/module";

// ── Mock Data Service ──────────────────────────────────────────────────────

/**
 * Extended ModuleDataService that exposes the internal store for assertions.
 *
 * @example
 * ```ts
 * const data = createMockDataService();
 * await data.upsert("product", "p1", { name: "Widget" });
 *
 * // Access internal store for assertions
 * expect(data._store.size).toBe(1);
 * data._store.clear(); // reset between tests
 * ```
 */
export interface MockDataService extends ModuleDataService {
	/**
	 * Internal store backing the mock. Keys are `${entityType}:${entityId}`.
	 * Exposed for test assertions and manual manipulation.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: test mock stores arbitrary JSONB data
	_store: Map<string, Record<string, any>>;

	/**
	 * Clear all data from the mock store.
	 * Convenience method — equivalent to `data._store.clear()`.
	 */
	clear(): void;

	/**
	 * Return the number of entities of a given type.
	 */
	size(entityType: string): number;

	/**
	 * Return all stored entities of a given type.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: test mock returns arbitrary JSONB data
	all(entityType: string): Record<string, any>[];
}

/**
 * Create an in-memory mock of {@link ModuleDataService} for unit tests.
 *
 * Supports:
 * - `get`, `upsert`, `delete` — basic CRUD
 * - `findMany` — with `where` filtering (exact equality), `take`/`skip` pagination
 *
 * The mock uses composite keys (`${entityType}:${entityId}`) internally.
 * All operations are synchronous under the hood but return promises to match
 * the real interface.
 *
 * @example
 * ```ts
 * const data = createMockDataService();
 *
 * // Seed data
 * await data.upsert("product", "p1", { name: "Widget", price: 999 });
 * await data.upsert("product", "p2", { name: "Gadget", price: 1999 });
 *
 * // Query
 * const product = await data.get("product", "p1");
 * const all = await data.findMany("product", { where: { price: 999 } });
 *
 * // Assertions on internal state
 * expect(data.size("product")).toBe(2);
 * ```
 */
export function createMockDataService(): MockDataService {
	// biome-ignore lint/suspicious/noExplicitAny: test mock stores arbitrary JSONB data
	const store = new Map<string, Record<string, any>>();

	return {
		_store: store,

		clear() {
			store.clear();
		},

		size(entityType: string): number {
			let count = 0;
			const prefix = `${entityType}:`;
			for (const key of store.keys()) {
				if (key.startsWith(prefix)) count++;
			}
			return count;
		},

		all(entityType: string) {
			const prefix = `${entityType}:`;
			// biome-ignore lint/suspicious/noExplicitAny: test mock returns arbitrary JSONB data
			const results: Record<string, any>[] = [];
			for (const [key, value] of store.entries()) {
				if (key.startsWith(prefix)) results.push(value);
			}
			return results;
		},

		async get(entityType, entityId) {
			return store.get(`${entityType}:${entityId}`) ?? null;
		},

		async upsert(entityType, entityId, data) {
			store.set(`${entityType}:${entityId}`, data);
		},

		async delete(entityType, entityId) {
			store.delete(`${entityType}:${entityId}`);
		},

		async findMany(entityType, options) {
			const prefix = `${entityType}:`;
			// biome-ignore lint/suspicious/noExplicitAny: test mock collects arbitrary JSONB data
			const results: Record<string, any>[] = [];

			for (const [key, value] of store.entries()) {
				if (!key.startsWith(prefix)) continue;

				if (options?.where) {
					const matches = Object.entries(options.where).every(
						([k, v]) => v === undefined || value[k] === v,
					);
					if (!matches) continue;
				}

				results.push(value);
			}

			const skip = options?.skip ?? 0;
			const take = options?.take;
			const sliced = results.slice(
				skip,
				take !== undefined ? skip + take : undefined,
			);

			return sliced;
		},
	};
}

// ── Mock Module Context ────────────────────────────────────────────────────

/**
 * Options for creating a mock ModuleContext.
 */
export interface MockModuleContextOptions {
	/** Data service to use. Defaults to a fresh `createMockDataService()`. */
	data?: ModuleDataService | undefined;

	/** List of enabled module IDs. Defaults to `[]`. */
	modules?: string[] | undefined;

	/** Module options. Defaults to `{}`. */
	options?: ModuleOptions | undefined;

	/** Authenticated session. Defaults to `null`. */
	session?: Session | null | undefined;

	/** Controller registry. Defaults to `{}`. */
	controllers?: ModuleControllers | undefined;

	/** Store ID. Defaults to `"test-store"`. */
	storeId?: string | undefined;
}

/**
 * Create a mock {@link ModuleContext} for testing module controllers and endpoints.
 *
 * All fields have sensible defaults. Pass overrides for the fields you need.
 *
 * @example
 * ```ts
 * const data = createMockDataService();
 * const ctx = createMockModuleContext({ data, storeId: "store_1" });
 *
 * // Use in controller tests
 * const result = await controllers.product.list({
 *   context: ctx,
 *   params: {},
 *   query: {},
 *   body: {},
 * });
 * ```
 */
export function createMockModuleContext(
	opts: MockModuleContextOptions = {},
): ModuleContext {
	return {
		data: opts.data ?? createMockDataService(),
		modules: opts.modules ?? [],
		options: opts.options ?? {},
		session: opts.session ?? null,
		controllers: opts.controllers ?? {},
		storeId: opts.storeId ?? "test-store",
	};
}

// ── Mock Session ───────────────────────────────────────────────────────────

/**
 * Options for creating a mock Session.
 */
export interface MockSessionOptions {
	/** User ID. Defaults to `"user_test"`. */
	userId?: string | undefined;
	/** User email. Defaults to `"test@example.com"`. */
	email?: string | undefined;
	/** User name. Defaults to `"Test User"`. */
	name?: string | undefined;
	/** User role. Defaults to `"admin"`. */
	role?: string | undefined;
}

/**
 * Create a mock {@link Session} for testing admin endpoints.
 *
 * @example
 * ```ts
 * const session = createMockSession({ role: "admin" });
 * const ctx = createMockModuleContext({ session });
 * ```
 */
export function createMockSession(opts: MockSessionOptions = {}): Session {
	const now = new Date();
	const userId = opts.userId ?? "user_test";
	return {
		session: {
			id: `sess_${userId}`,
			createdAt: now,
			updatedAt: now,
			userId,
			expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
			token: `tok_${userId}`,
		},
		user: {
			id: userId,
			createdAt: now,
			updatedAt: now,
			email: opts.email ?? "test@example.com",
			emailVerified: true,
			name: opts.name ?? "Test User",
			banned: false,
			role: opts.role ?? "admin",
		},
	};
}

// ── Controller Context Builder ─────────────────────────────────────────────

/**
 * Build the `ctx` object that controllers receive from endpoint handlers.
 *
 * This is a convenience for the common test pattern where controllers
 * expect `{ context: { data }, params, query, body }`.
 *
 * @example
 * ```ts
 * const data = createMockDataService();
 * const ctx = makeControllerCtx(data, {
 *   params: { id: "prod_1" },
 *   query: { status: "active" },
 * });
 * const result = await controllers.product.getById(ctx);
 * ```
 */
export function makeControllerCtx(
	dataOrContext: ModuleDataService | ModuleContext,
	opts: {
		params?: Record<string, string> | undefined;
		query?: Record<string, string | undefined> | undefined;
		body?: Record<string, unknown> | undefined;
	} = {},
): {
	context: { data: ModuleDataService } & Record<string, unknown>;
	params: Record<string, string>;
	query: Record<string, string | undefined>;
	body: Record<string, unknown>;
} {
	const isContext =
		"data" in dataOrContext &&
		"modules" in dataOrContext &&
		"storeId" in dataOrContext;

	const context = isContext
		? (dataOrContext as ModuleContext)
		: { data: dataOrContext as ModuleDataService };

	return {
		// biome-ignore lint/suspicious/noExplicitAny: controller context is loosely typed
		context: context as any,
		params: opts.params ?? {},
		query: opts.query ?? {},
		body: opts.body ?? {},
	};
}
