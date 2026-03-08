import { getForProduct } from "./get-for-product";
import { getPersonalized } from "./get-personalized";
import { getTrending } from "./get-trending";
import { trackInteraction } from "./track-interaction";

export const storeEndpoints = {
	"/recommendations/trending": getTrending,
	"/recommendations/personalized": getPersonalized,
	"/recommendations/track": trackInteraction,
	"/recommendations/:productId": getForProduct,
};
