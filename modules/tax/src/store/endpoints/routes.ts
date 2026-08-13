import { calculateTax } from "./calculate-tax";
import { getApplicableRates } from "./get-rates";

export const storeEndpoints = {
	"/tax/calculate": calculateTax,
	"/tax/rates": getApplicableRates,
};
