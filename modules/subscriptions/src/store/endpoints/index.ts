import { cancelSubscription } from "./cancel";
import { getMySubscriptions } from "./get-my-subscriptions";
import { storeSearch } from "./store-search";
import { subscribe } from "./subscribe";

export const storeEndpoints = {
	"/subscriptions/store-search": storeSearch,
	"/subscriptions/subscribe": subscribe,
	"/subscriptions/me": getMySubscriptions,
	"/subscriptions/me/cancel": cancelSubscription,
};
