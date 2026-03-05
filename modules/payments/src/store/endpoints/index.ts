import { cancelIntent } from "./cancel-intent";
import { confirmIntent } from "./confirm-intent";
import { createIntent } from "./create-intent";
import { deletePaymentMethod } from "./delete-method";
import { getIntent } from "./get-intent";
import { listPaymentMethods } from "./list-methods";

export const storeEndpoints = {
	"/payments/intents": createIntent,
	"/payments/intents/:id": getIntent,
	"/payments/intents/:id/confirm": confirmIntent,
	"/payments/intents/:id/cancel": cancelIntent,
	"/payments/methods": listPaymentMethods,
	"/payments/methods/:id": deletePaymentMethod,
};
