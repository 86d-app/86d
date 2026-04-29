import type {
	Endpoint,
	EndpointContext,
	InputContext,
	Middleware,
} from "better-call";
import type { EventHandler, ScopedEventEmitter } from "../events";
import type { Awaitable, LiteralString, Primitive } from "./helper";
import type { ModuleSchema } from "./schema";

export type ModuleId = string;

/**
 * Lifecycle status of a module within the registry.
 */
export type ModuleStatus =
	| "pending"
	| "initializing"
	| "ready"
	| "error"
	| "stopped";

/**
 * Declares what data fields a module exposes to other modules.
 *
 * - `read`: Fields other modules can read (via controller methods)
 * - `readWrite`: Fields other modules can both read and write
 *
 * @example
 * ```ts
 * exports: {
 *   read: ["customerName", "customerEmail"],
 *   readWrite: ["customerMetadata"]
 * }
 * ```
 */
export interface ModuleExports {
	read?: string[];
	readWrite?: string[];
}

/**
 * Declares what data a module needs from other modules.
 * Keyed by module ID, each entry specifies which fields are required
 * and what access level is needed (read or readWrite).
 *
 * The runtime validates that every consumer requirement is a subset
 * of what the provider permits.
 *
 * @example
 * ```ts
 * requires: {
 *   "@86d-app/customers": { read: ["customerName", "customerEmail"] },
 *   "@86d-app/products": { read: ["productPrice"], readWrite: ["productStock"] }
 * }
 * ```
 */
export type ModuleRequires = Record<
	string,
	{
		read?: string[];
		readWrite?: string[];
		/** If true, the module works without this dependency. Violations are warnings, not errors. */
		optional?: boolean;
	}
>;

/**
 * Describes a violation in the inter-module contract system.
 */
export interface ContractViolation {
	/** The module that has an unsatisfied requirement */
	consumerId: string;
	/** The module that should provide the data */
	providerId: string;
	/** The specific field that is missing or has insufficient access */
	field: string;
	/** What kind of access was requested */
	requestedAccess: "read" | "readWrite";
	/** Why the requirement was not met */
	reason: "module_not_found" | "field_not_exported" | "insufficient_access";
}

/**
 * Admin page declaration: route path, component name, and optional sidebar metadata.
 * Path uses :param for dynamic segments (e.g. "/admin/products/:id/edit").
 * Only entries with `label` appear in the sidebar.
 */
export interface AdminPage {
	path: string;
	component: string;
	label?: string;
	icon?: string;
	group?: string;
	/**
	 * Optional subgroup within the group for 2-level sidebar navigation.
	 * When set, the item is nested under a collapsible subgroup header.
	 * If not set, the admin registry assigns one automatically based on the path.
	 */
	subgroup?: string;
}

/**
 * Store page declaration: route path and component name for customer-facing storefront.
 * Path uses :param for dynamic segments (e.g. "/products/:slug", "/collections/:slug").
 * Optional toMarkdown serializes this page for .md URL suffix (e.g. /products/shirt.md).
 */
export interface StorePage {
	path: string;
	component: string;
	/** Serialize this page to markdown for .md URL suffix. Receives ModuleContext and route params. */
	toMarkdown?: (
		ctx: ModuleContext,
		params: Record<string, string>,
	) => Promise<string | null>;
}

/**
 * Abstraction for CRUD operations on module entities.
 *
 * @example
 * const product = await dataService.get("product", "prod_123");
 * await dataService.upsert("cart", "cart_343", { ... });
 * const items = await dataService.findMany("cartItem", { where: { cartId: "cart_343" } });
 */
export interface ModuleDataService {
	/**
	 * Get a single entity by ID.
	 *
	 * @example
	 * const product = await dataService.get("product", "prod_123");
	 */
	get(
		entityType: string,
		entityId: string,
	): Promise<Record<string, unknown> | null>;

	/**
	 * Create or update an entity.
	 *
	 * @example
	 * await dataService.upsert("product", "prod_new", { title: "New Product" });
	 */
	upsert(
		entityType: string,
		entityId: string,
		data: Record<string, unknown>,
	): Promise<void>;

	/**
	 * Delete an entity.
	 *
	 * @example
	 * await dataService.delete("cartItem", "item_123");
	 */
	delete(entityType: string, entityId: string): Promise<void>;

	/**
	 * Find many entities with optional filtering.
	 *
	 * @example
	 * const items = await dataService.findMany("cartItem", {
	 *   where: { cartId: "cart_1" },
	 *   orderBy: { createdAt: "desc" },
	 *   take: 10,
	 *   skip: 0
	 * });
	 */
	findMany(
		entityType: string,
		options?: {
			where?: Record<string, unknown>;
			orderBy?: Record<string, "asc" | "desc">;
			take?: number;
			skip?: number;
		},
	): Promise<Record<string, unknown>[]>;
}

/**
 * Session information for authenticated requests.
 *
 * @example
 * const session: Session = {
 *   session: {
 *     id: "sess_123",
 *     createdAt: "2024-06-05T14:22:18.000Z",
 *     updatedAt: "2024-06-07T15:33:10.000Z",
 *     userId: "user_456",
 *     expiresAt: "2024-07-01T00:00:00.000Z",
 *     token: "jwt.token.string",
 *     ipAddress: "127.0.0.1",
 *     userAgent: "Mozilla/5.0",
 *     impersonatedBy: null,
 *     activeOrganizationId: "org_999",
 *     activeTeamId: null,
 *   },
 *   user: {
 *     id: "user_456",
 *     createdAt: "2023-01-02T10:00:00.000Z",
 *     updatedAt: "2024-06-07T15:33:10.000Z",
 *     email: "user@example.com",
 *     emailVerified: true,
 *     name: "Jane Doe",
 *     image: "https://example.com/avatar.png",
 *     banned: false,
 *     role: "admin",
 *     banReason: null,
 *     banExpires: null,
 *     phoneNumber: "+15555550123",
 *     phoneNumberVerified: true,
 *   }
 * }
 */
export type Session = {
	session: {
		id: string;
		createdAt: Date;
		updatedAt: Date;
		userId: string;
		expiresAt: Date;
		token: string;
		ipAddress?: string | null | undefined;
		userAgent?: string | null | undefined;
		impersonatedBy?: string | null | undefined;
		activeOrganizationId?: string | null | undefined;
		activeTeamId?: string | null | undefined;
	};
	user: {
		id: string;
		createdAt: Date;
		updatedAt: Date;
		email: string;
		emailVerified: boolean;
		name: string;
		image?: string | null | undefined;
		banned: boolean | null | undefined;
		role?: string | null | undefined;
		banReason?: string | null | undefined;
		banExpires?: Date | null | undefined;
		phoneNumber?: string | null | undefined;
		phoneNumberVerified?: boolean | null | undefined;
	};
};

/**
 * Per-module configuration options.
 * Extend this type to define module-specific options:
 *
 * @example
 * export interface CartOptions extends ModuleConfig {
 *   guestCartExpiration?: number;
 *   maxItemsPerCart?: number;
 * }
 */
export type ModuleConfig = Record<string, Primitive>;

/**
 * Merged module options from config (context-level).
 * Each key is a module ID, whose value is a flat object of primitive options.
 *
 * @example
 * const options: ModuleOptions = {
 *   products: { enableDiscounts: true, sort: "byPrice" },
 *   cart: { allowGuests: false, guestTimeoutMins: 60 }
 * };
 */
export type ModuleOptions = Record<string, ModuleConfig>;

/**
 * Base interface for module controllers.
 *
 * Module controllers define the public API that a module exposes to other modules.
 * All controller interfaces (e.g., `CartController`, `ProductController`, etc.) should extend this base interface.
 *
 * ## Usage
 * When authoring a module, export a controller interface extending `ModuleController` to describe the API available to consumers:
 *
 * @example
 * // Define a controller for a cart module:
 * export interface CartController extends ModuleController {
 *   getOrCreateCart(params: { customerId?: string, guestId?: string }): Promise<Cart>;
 *   addItem(params: { cartId: string; productId: string; quantity: number }): Promise<CartItem>;
 * }
 *
 * // Access another module's controller from a module context:
 * const cartController = ctx.controllers.cart as CartController;
 * const cart = await cartController.getOrCreateCart({ customerId: "user_123" });
 *
 * ## Notes
 * - Only methods and properties defined here or in your extending controller interface will be available to other modules at runtime.
 * - Types extending `ModuleController` should only define serializable methods and fields (async methods encouraged).
 */
export interface ModuleController {
	// biome-ignore lint/suspicious/noExplicitAny: controller methods have varying parameter signatures — any[] is required for assignment compatibility
	[method: string]: (...args: any[]) => Awaitable<unknown>;
}

export type ModuleControllers = Record<string, ModuleController>;

/**
 * Context provided to hook matchers in module hooks.
 */
export type HookEndpointContext = Partial<
	// biome-ignore lint/suspicious/noExplicitAny: better-call EndpointOptions constraint requires any
	EndpointContext<string, any> & Omit<InputContext<string, any>, "method">
> & {
	path?: string;
	context: ModuleContext & {
		returned?: unknown | undefined;
		responseHeaders?: Headers | undefined;
	};
	headers?: Headers | undefined;
};

/**
 * The core context object provided to all modules at runtime.
 * Generic parameter C allows typed access to controllers when used with createStoreEndpoint/createAdminEndpoint.
 *
 * @example
 * const context: ModuleContext = {
 *   data: myDataService,
 *   modules: ["products", "cart"],
 *   options: { products: { foo: true }, cart: { bar: 1 } },
 *   session: session,
 *   controllers: { product: productController },
 *   storeId: "store_001"
 * };
 */
export type ModuleContext<C extends ModuleControllers = ModuleControllers> = {
	_dataRegistry?: Map<ModuleId, ModuleDataService>;

	/**
	 * Secure data access (replaces direct Prisma access).
	 * Scoped to current module and store.
	 *
	 * @example
	 * await context.data.get("product", "prod_123")
	 */
	data: ModuleDataService;

	/**
	 * List of enabled module IDs.
	 *
	 * @example
	 * ["products", "cart", "orders"]
	 */
	modules: string[];

	/**
	 * Merged module options from config.
	 * See ModuleOptions.
	 */
	options: ModuleOptions;

	/**
	 * Session information (if authenticated).
	 * Undefined/null for unauthenticated requests.
	 */
	session?: Session | null | undefined;

	/**
	 * Registry of all module controllers (keyed by module ID).
	 * Generic type C allows typed access when passed to createStoreEndpoint/createAdminEndpoint.
	 *
	 * @example
	 * context.controllers.product.getProduct(ctx)
	 */
	controllers: C;

	/**
	 * Store ID for current context.
	 *
	 * @example
	 * "store_123"
	 */
	storeId: string;

	/**
	 * Module-scoped event emitter for inter-module communication.
	 * Automatically sets the `source` field to the current module ID.
	 *
	 * @example
	 * ```ts
	 * // Emit an event
	 * await context.events.emit("order.placed", { orderId: "ord_123" });
	 *
	 * // Listen for events from other modules
	 * context.events.on("payment.completed", async (event) => {
	 *   // Update order status
	 * });
	 * ```
	 */
	events?: ScopedEventEmitter | undefined;
};

/**
 * The full contract describing a Module.
 *
 * @example
 * ```ts
 * export const products: Module = {
 *   id: "products",
 *   requires: ["inventory"],
 *   init: async (ctx) => ({
 *     controller: {
 *       getProduct: async (productId) => { ... },
 *       listProducts: async (options) => { ... },
 *       createProduct: async (product) => { ... },
 *     },
 *   }),
 *   endpoints: {
 *     store: {
 *       list: endpointBuilder(),
 *     },
 *   },
 *   schema: {
 *     product: {
 *       fields: {
 *         id: { type: "string" },
 *         title: { type: "string" },
 *       },
 *     },
 *   } as ModuleSchema,
 *   options: {
 *     enableFeatureX: true,
 *   },
 *   rateLimit: [
 *     {
 *       window: 60,
 *       max: 100,
 *       pathMatcher: (path) => path.startsWith("/store/products"),
 *     }
 *   ]
 * };
 * ```
 */
export type Module = {
	/**
	 * Unique string identifier for the module.
	 * Used to reference the module in dependencies, adapters, controllers, etc.
	 *
	 * @example "products"
	 */
	id: LiteralString;

	/**
	 * Version of the module.
	 * Used to check compatibility with other modules.
	 *
	 * @example "1.0.0"
	 */
	version: string;

	/**
	 * What data this module exposes to other modules.
	 * Store owners can audit exactly what each module makes accessible.
	 *
	 * @example
	 * ```ts
	 * exports: {
	 *   read: ["productTitle", "productPrice"],
	 *   readWrite: ["productStock"]
	 * }
	 * ```
	 */
	exports?: ModuleExports;

	/**
	 * Declares dependencies on other modules.
	 *
	 * **Simple form** (backward-compatible): array of module IDs.
	 * Runtime validates these modules are initialized before this one.
	 *
	 * **Contract form**: object keyed by module ID, specifying which fields
	 * are needed and at what access level. Runtime validates that the
	 * provider's `exports` satisfy every requirement.
	 *
	 * @example
	 * // Simple form
	 * requires: ["products", "inventory"]
	 *
	 * // Contract form
	 * requires: {
	 *   "products": { read: ["productTitle", "productPrice"] },
	 *   "inventory": { readWrite: ["productStock"] }
	 * }
	 */
	requires?: string[] | ModuleRequires;

	controllers?: ModuleControllers;

	/**
	 * The init function is called when the module is initialized.
	 * You can return a controller, add to context, or override options.
	 * Later modules can access earlier modules' controllers.
	 *
	 * @example
	 * ```ts
	 * init: async (ctx) => ({
	 *   controller: {
	 *     doThing: () => ...
	 *     doAnotherThing: () => ...,
	 *   },
	 *   context: { custom: "value" },
	 *   options: { someSetting: true }
	 * })
	 * ```
	 */
	init?:
		| ((ctx: ModuleContext) =>
				| Awaitable<{
						/**
						 * Additional context to add
						 */
						context?: Record<string, unknown>;
						/**
						 * Module options override (merged into global config)
						 */
						options?: Partial<ModuleOptions>;
						/**
						 * Controllers to register from init (useful when controllers need access to data service)
						 */
						controllers?: ModuleControllers;
				  }>
				| void
				| Promise<void>)
		| undefined;

	/**
	 * Cleanup hook called when the registry shuts down.
	 * Use this to release external connections, timers, or other resources.
	 *
	 * @example
	 * ```ts
	 * shutdown: async (ctx) => {
	 *   await externalClient.disconnect();
	 * }
	 * ```
	 */
	shutdown?: (ctx: ModuleContext) => Awaitable<void>;

	/**
	 * HTTP endpoints exposed by the module.
	 *
	 * @example
	 * ```ts
	 * endpoints: {
	 *   store: {
	 *     list: someEndpoint,
	 *   },
	 *   admin: {
	 *     reset: adminEndpoint,
	 *   }
	 * }
	 * ```
	 */
	endpoints?: {
		store?: Record<string, Endpoint>;
		admin?: Record<string, Endpoint>;
	};

	/**
	 * Optional search contribution: endpoint path(s) for store and/or admin command search.
	 * The module must expose the given path in endpoints.store or endpoints.admin.
	 * Omit or leave a key undefined to not contribute to that surface.
	 *
	 * @example
	 * ```ts
	 * search: { store: "/products/store-search" }
	 * search: { admin: "/admin-search" }
	 * search: { store: "/products/store-search", admin: "/admin-search" }
	 * ```
	 */
	search?: {
		store?: string;
		admin?: string;
	};

	/**
	 * Admin UI: routes and sidebar entries for the store admin.
	 * Modules declare pages (path, component name, optional label/icon/group for sidebar).
	 *
	 * @example
	 * ```ts
	 * admin: {
	 *   pages: [
	 *     { path: "/admin/carts", component: "CartList", label: "Carts", icon: "ShoppingCart", group: "Sales" },
	 *     { path: "/admin/products/:id/edit", component: "ProductForm" },
	 *   ],
	 * }
	 * ```
	 */
	admin?: {
		pages?: AdminPage[];
	};

	/**
	 * Store UI: routes for the customer-facing storefront.
	 * Modules declare pages (path, component name) for catch-all route resolution.
	 *
	 * @example
	 * ```ts
	 * store: {
	 *   pages: [
	 *     { path: "/products", component: "ProductGrid" },
	 *     { path: "/products/:slug", component: "ProductDetail" },
	 *     { path: "/collections/:slug", component: "CollectionDetail" },
	 *   ],
	 * }
	 * ```
	 */
	store?: {
		pages?: StorePage[];
	};

	/**
	 * Optional middleware to run for matching paths.
	 *
	 * @example
	 * ```ts
	 * middlewares: [
	 *   {
	 *     path: "/store/products/*",
	 *     middleware: someMiddleware,
	 *   }
	 * ]
	 * ```
	 */
	middlewares?: Array<{
		path: string;
		middleware: Middleware;
	}>;

	/**
	 * Hook to modify an incoming request before endpoint resolution.
	 *
	 * @example
	 * ```ts
	 * onRequest: async (request, ctx) => {
	 *   // Add custom header
	 *   request.headers.set("foo", "bar");
	 *   return { request };
	 * }
	 * ```
	 */
	onRequest?: (
		request: Request,
		ctx: ModuleContext,
	) => Promise<
		| {
				response: Response;
		  }
		| {
				request: Request;
		  }
		| undefined
	>;

	/**
	 * Hook to process or modify the Response after endpoint resolution.
	 *
	 * @example
	 * ```ts
	 * onResponse: async (response, ctx) => ({
	 *   response: new Response("custom", response),
	 * })
	 * ```
	 */
	onResponse?: (
		response: Response,
		ctx: ModuleContext,
	) => Promise<
		| {
				response: Response;
		  }
		| undefined
	>;

	/**
	 * Advanced lifecycle hooks for pre/post endpoint processing.
	 *
	 * @example
	 * ```ts
	 * hooks: {
	 *   before: [
	 *     {
	 *       matcher: (context) => context.path?.startsWith("/store/cart"),
	 *       // handler: myAuthMiddleware,
	 *     }
	 *   ],
	 *   after: [
	 *     {
	 *       matcher: (context) => context.path?.endsWith("/store/cart"),
	 *     }
	 *   ]
	 * }
	 * ```
	 */
	hooks?: {
		before?: Array<{
			matcher: (context: HookEndpointContext) => boolean;
			// handler: AuthMiddleware;
		}>;
		after?: Array<{
			matcher: (context: HookEndpointContext) => boolean;
			// handler: AuthMiddleware;
		}>;
	};

	/**
	 * Describes the database schema the module needs.
	 * Used for DB migrations if desired.
	 *
	 * @example
	 * ```ts
	 * schema: {
	 *   cart: {
	 *     fields: {
	 *       id: { type: "string" },
	 *       status: { type: "string", defaultValue: "active" },
	 *     },
	 *   }
	 * } as ModuleSchema
	 * ```
	 */
	schema?: ModuleSchema;

	// /**
	//  * The migrations of the plugin. If you define schema that will automatically create
	//  * migrations for you.
	//  *
	//  * ⚠️ Only use this if you don't want to use the schema option and you disabled migrations for
	//  * the tables.
	//  */
	// migrations?: Record<string, Migration> | undefined;

	/**
	 * Custom configuration options for the plugin.
	 *
	 * @example
	 * ```ts
	 * options: {
	 *   allowedRoles: ["admin", "manager"],
	 *   featureFlag: true,
	 * }
	 * ```
	 */
	options?: ModuleConfig | undefined;

	/**
	 * Rate limit rules scoped to certain paths.
	 *
	 * @example
	 * ```ts
	 * rateLimit: [
	 *   {
	 *     window: 60,
	 *     max: 100,
	 *     pathMatcher: (path) => path.startsWith("/store/products"),
	 *   }
	 * ]
	 * ```
	 */
	rateLimit?: Array<{
		window: number;
		max: number;
		pathMatcher: (path: string) => boolean;
	}>;

	/**
	 * Event declarations for inter-module communication.
	 *
	 * - `emits`: Array of event types this module can emit (documentation + validation).
	 * - `handles`: Map of event type → handler function. The runtime auto-wires these
	 *   during module initialization.
	 *
	 * @example
	 * ```ts
	 * events: {
	 *   emits: ["order.placed", "order.fulfilled"],
	 *   handles: {
	 *     "payment.completed": async (event) => {
	 *       // Fulfill the order
	 *     },
	 *   },
	 * }
	 * ```
	 */
	events?: {
		emits?: string[];
		handles?: Record<string, EventHandler>;
	};

	/**
	 * Shape types to be inferred by consumers.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: $Infer is a type-level inference marker that holds arbitrary shapes
	$Infer?: Record<string, any>;

	/**
	 * Error codes returned by the module, for client-side error handling.
	 *
	 * @example
	 * ```ts
	 * $ERROR_CODES: {
	 *   INVALID_REQUEST: { code: "INVALID_REQUEST", message: "Request is malformed." }
	 * }
	 * ```
	 */
	$ERROR_CODES?: Record<string, { code: string; message: string }>;
};
