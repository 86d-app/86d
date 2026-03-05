import { evaluateCartRules } from "./evaluate-cart-rules";
import { validateCode } from "./validate-code";

export const storeEndpoints = {
	"/discounts/validate": validateCode,
	"/discounts/cart-rules/evaluate": evaluateCartRules,
};
