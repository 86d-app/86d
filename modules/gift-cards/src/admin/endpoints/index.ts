import { createGiftCard } from "./create-gift-card";
import { creditGiftCard } from "./credit-gift-card";
import { deleteGiftCard } from "./delete-gift-card";
import { getGiftCard } from "./get-gift-card";
import { listGiftCardTransactions } from "./list-gift-card-transactions";
import { listGiftCards } from "./list-gift-cards";
import { updateGiftCard } from "./update-gift-card";

export const adminEndpoints = {
	"/admin/gift-cards": listGiftCards,
	"/admin/gift-cards/create": createGiftCard,
	"/admin/gift-cards/:id": getGiftCard,
	"/admin/gift-cards/:id/update": updateGiftCard,
	"/admin/gift-cards/:id/delete": deleteGiftCard,
	"/admin/gift-cards/:id/credit": creditGiftCard,
	"/admin/gift-cards/:id/transactions": listGiftCardTransactions,
};
