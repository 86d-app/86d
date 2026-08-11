import { deletePaymentMethod } from "./delete-method";
import { listPaymentMethods } from "./list-methods";

export const storeEndpoints = {
	"/payments/methods": listPaymentMethods,
	"/payments/methods/:id": deletePaymentMethod,
};
