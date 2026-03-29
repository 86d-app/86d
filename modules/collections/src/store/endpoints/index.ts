import { getCollectionProducts } from "./get-collection-products";
import { getProductCollections } from "./get-product-collections";

/**
 * Store paths that overlap with @86d-app/products (/collections, /collections/:id, …)
 * must live only on the products module so getModuleIdForPath and ModuleData scope match
 * the storefront (CollectionGrid, CollectionDetail) and shared catalog seed data.
 */
export const storeEndpoints = {
	"/collections/product/:productId": getProductCollections,
	"/collections/:slug/products": getCollectionProducts,
};
