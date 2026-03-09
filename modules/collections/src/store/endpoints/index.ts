import { getCollection } from "./get-collection";
import { getCollectionProducts } from "./get-collection-products";
import { getFeatured } from "./get-featured";
import { getProductCollections } from "./get-product-collections";
import { listCollections } from "./list-collections";

export const storeEndpoints = {
	"/collections": listCollections,
	"/collections/featured": getFeatured,
	"/collections/product/:productId": getProductCollections,
	"/collections/:slug": getCollection,
	"/collections/:slug/products": getCollectionProducts,
};
