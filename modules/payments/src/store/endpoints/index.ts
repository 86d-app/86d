import {
	deletePaymentMethodUnavailable as deletePaymentMethod,
	listPaymentMethodsUnavailable as listPaymentMethods,
} from "./activation-unavailable";

export const storeEndpoints = {
	"/payments/methods": listPaymentMethods,
	"/payments/methods/:id": deletePaymentMethod,
};
