import { addToWishlist } from "./add-to-wishlist";
import { checkWishlist } from "./check-wishlist";
import { listWishlist } from "./list-wishlist";
import { removeFromWishlist } from "./remove-from-wishlist";
import { storeSearch } from "./store-search";

export const storeEndpoints = {
	"/wishlist/store-search": storeSearch,
	"/wishlist": listWishlist,
	"/wishlist/add": addToWishlist,
	"/wishlist/remove/:id": removeFromWishlist,
	"/wishlist/check/:productId": checkWishlist,
};
