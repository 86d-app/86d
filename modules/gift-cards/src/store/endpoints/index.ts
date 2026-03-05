import { checkGiftCardBalance } from "./check-balance";
import { redeemGiftCard } from "./redeem";

export const storeEndpoints = {
	"/gift-cards/check": checkGiftCardBalance,
	"/gift-cards/redeem": redeemGiftCard,
};
