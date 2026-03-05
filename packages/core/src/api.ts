import {
	createEndpoint,
	createMiddleware,
	type EndpointContext,
	type EndpointOptions,
	type Middleware,
	type StrictEndpoint,
} from "better-call";
import type { ModuleContext } from "./types/module";

type AdminContext = ModuleContext & {
	session: NonNullable<ModuleContext["session"]>;
};

type PostHookContext = {
	returned?: unknown;
	responseHeaders?: Headers;
};

type EndpointHandler<
	Ctx,
	Path extends string,
	Options extends EndpointOptions,
	R,
> = (context: EndpointContext<Path, Options, Ctx>) => Promise<R>;

/** Post-hook middleware for response handling. */
const postHookMiddleware = createMiddleware(
	async () => ({}) as PostHookContext,
);

/**
 * Creates an options middleware that provides the given context type.
 * The context is injected at runtime by the caller.
 */
function createOptionsMiddleware<Ctx>() {
	return createMiddleware(async () => ({}) as Ctx);
}

/**
 * Injects the module-scoped data service into the context.
 */
const dataServiceMiddleware = createMiddleware(async (ctx) => {
	if (!ctx.context._dataRegistry) {
		throw new Error("Data service not found");
	}
	const dataService = ctx.context._dataRegistry.get(ctx.context.moduleId);
	return { data: dataService };
});

/**
 * Creates a middleware factory with the given options middleware and post-hook support.
 */
function createMiddlewareFactory(optionsMiddleware: Middleware) {
	return createMiddleware.create({
		use: [optionsMiddleware, postHookMiddleware, dataServiceMiddleware],
	});
}

/**
 * Creates an endpoint factory function with the given options middleware.
 * Supports both path-based and path-less endpoint signatures.
 */
function createEndpointFactory<Ctx>(optionsMiddleware: Middleware) {
	// Overload: with path
	function factory<Path extends string, Options extends EndpointOptions, R>(
		path: Path,
		options: Options,
		handler: EndpointHandler<Ctx, Path, Options, R>,
	): StrictEndpoint<Path, Options, R>;

	// Overload: without path
	function factory<Path extends string, Options extends EndpointOptions, R>(
		options: Options,
		handler: EndpointHandler<Ctx, Path, Options, R>,
	): StrictEndpoint<Path, Options, R>;

	// Implementation
	function factory<Path extends string, Opts extends EndpointOptions, R>(
		pathOrOptions: Path | Opts,
		handlerOrOptions: EndpointHandler<Ctx, Path, Opts, R> | Opts,
		maybeHandler?: EndpointHandler<Ctx, Path, Opts, R>,
	) {
		const hasPath = typeof pathOrOptions === "string";
		const path = hasPath ? pathOrOptions : undefined;
		const options = (hasPath ? handlerOrOptions : pathOrOptions) as Opts;
		const handler = (
			hasPath ? maybeHandler : handlerOrOptions
		) as EndpointHandler<Ctx, Path, Opts, R>;

		const mergedOptions = {
			...options,
			use: [...(options?.use || []), optionsMiddleware],
		};

		return path
			? createEndpoint(path, mergedOptions, async (ctx) => handler(ctx))
			: createEndpoint(mergedOptions, async (ctx) => handler(ctx));
	}

	return factory;
}

export const storeOptionsMiddleware = createOptionsMiddleware<ModuleContext>();
export const createStoreMiddleware = createMiddlewareFactory(
	storeOptionsMiddleware,
);
export const createStoreEndpoint = createEndpointFactory<ModuleContext>(
	storeOptionsMiddleware,
);

export const adminOptionsMiddleware = createOptionsMiddleware<AdminContext>();
export const createAdminMiddleware = createMiddlewareFactory(
	adminOptionsMiddleware,
);
export const createAdminEndpoint = createEndpointFactory<AdminContext>(
	adminOptionsMiddleware,
);

export type StoreEndpoint<
	Path extends string,
	Opts extends EndpointOptions,
	R,
> = StrictEndpoint<Path, Opts, R>;

export type AdminEndpoint<
	Path extends string,
	Opts extends EndpointOptions,
	R,
> = StrictEndpoint<Path, Opts, R>;

export type StoreMiddleware = ReturnType<typeof createStoreMiddleware>;
export type AdminMiddleware = ReturnType<typeof createAdminMiddleware>;

export type StoreEndpointContext<
	Path extends string = string,
	Opts extends EndpointOptions = EndpointOptions,
> = EndpointContext<Path, Opts, ModuleContext>;

export type AdminEndpointContext<
	Path extends string = string,
	Opts extends EndpointOptions = EndpointOptions,
> = EndpointContext<Path, Opts, AdminContext>;

export {
	// createEndpoint,
	createRouter,
	type Endpoint,
	type EndpointContext,
	type InputContext,
	type Middleware,
	type RouterConfig,
} from "better-call";
export type { infer as ZodInfer, ZodSchema, ZodType } from "zod";
export { z } from "zod";
