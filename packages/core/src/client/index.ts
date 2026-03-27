/**
 * @86d-app/core/client
 *
 * Client-side API for consuming module endpoints using @tanstack/react-query.
 * Provides type-safe hooks that are auto-generated from module endpoint definitions.
 *
 * @example
 * ```tsx
 * // In your app root
 * import { ModuleClientProvider } from "@86d-app/core/client";
 * import cart from "@86d-app/cart";
 *
 * function App({ children }) {
 *     return (
 *         <ModuleClientProvider baseURL="/api" modules={[cart()]}>
 *             {children}
 *         </ModuleClientProvider>
 *     );
 * }
 *
 * // In a component
 * import { useModuleClient } from "@86d-app/core/client";
 *
 * function CartButton() {
 *     const client = useModuleClient();
 *
 *     // GET endpoints become queries
 *     const { data: cart } = client.module("cart").store.getCart.useQuery();
 *
 *     // POST/PUT/DELETE endpoints become mutations
 *     const addToCart = client.module("cart").store.addToCart.useMutation({
 *         onSuccess: () => {
 *             // Invalidate cart query after mutation
 *             client.module("cart").store.getCart.invalidate();
 *         },
 *     });
 *
 *     return (
 *         <button onClick={() => addToCart.mutate({ productId: "123", quantity: 1, price: 29.99 })}>
 *             Add to Cart ({cart?.itemCount ?? 0})
 *         </button>
 *     );
 * }
 * ```
 */

// SSR hydration (re-exported from @tanstack/react-query)
export { dehydrate, HydrationBoundary } from "@tanstack/react-query";
// Client factory
export { createModuleClient } from "./create-client";
// Error class for HTTP failures
export { ModuleClientError } from "./hooks";
export type { ModuleClientProviderProps } from "./provider";
// Provider and hooks
export { ModuleClientProvider, useModuleClient } from "./provider";
// Query client utilities
export { createQueryClient, getQueryClient } from "./query-client";
export type { StoreContextProviderProps } from "./store-context";
// Store context for cross-module MobX state
export {
	StoreContextProvider,
	useStoreContext,
} from "./store-context";

// Types
export type {
	AnyEndpointHook,
	AnyModuleAccessor,
	ClientConfig,
	EndpointHooks,
	ExtractBody,
	ExtractBodyInput,
	ExtractMethod,
	ExtractPath,
	ExtractQuery,
	ExtractQueryInput,
	ExtractResponse,
	IsMutationMethod,
	IsQueryMethod,
	ModuleAccessor,
	ModuleClient,
	MutationHook,
	MutationInput,
	QueryHook,
	QueryInput,
} from "./types";
