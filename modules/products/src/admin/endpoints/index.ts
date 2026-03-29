import { addCollectionProduct } from "./add-collection-product";
import { bulkAction } from "./bulk-action";
import { createCategory } from "./create-category";
import { createCollection } from "./create-collection";
import { createProduct } from "./create-product";
import { createVariant } from "./create-variant";
import { deleteCategory } from "./delete-category";
import { deleteCollection } from "./delete-collection";
import { deleteProduct } from "./delete-product";
import { deleteVariant } from "./delete-variant";
import { adminGetProduct } from "./get-product";
import { importProducts } from "./import-products";
import { adminListCategories } from "./list-categories";
import { adminListCollections } from "./list-collections";
import { adminListProducts } from "./list-products";
import { removeCollectionProduct } from "./remove-collection-product";
import { updateCategory } from "./update-category";
import { updateCollection } from "./update-collection";
import { updateProduct } from "./update-product";
import { updateVariant } from "./update-variant";

export const adminEndpoints = {
	"/admin/products/list": adminListProducts,
	"/admin/products/create": createProduct,
	"/admin/products/:id": adminGetProduct,
	"/admin/products/:id/update": updateProduct,
	"/admin/products/:id/delete": deleteProduct,
	"/admin/products/import": importProducts,
	"/admin/products/bulk": bulkAction,
	"/admin/products/:productId/variants": createVariant,
	"/admin/variants/:id/update": updateVariant,
	"/admin/variants/:id/delete": deleteVariant,
	"/admin/categories/list": adminListCategories,
	"/admin/categories/create": createCategory,
	"/admin/categories/:id/update": updateCategory,
	"/admin/categories/:id/delete": deleteCategory,
	"/admin/products/collections/list": adminListCollections,
	"/admin/products/collections/create": createCollection,
	"/admin/products/collections/:id/update": updateCollection,
	"/admin/products/collections/:id/delete": deleteCollection,
	"/admin/products/collections/:id/products": addCollectionProduct,
	"/admin/products/collections/:id/products/:productId/remove":
		removeCollectionProduct,
};
