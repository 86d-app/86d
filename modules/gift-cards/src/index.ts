import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { giftCardSchema } from "./schema";
import { createGiftCardController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	GiftCard,
	GiftCardController,
	GiftCardStats,
	GiftCardTransaction,
} from "./service";

export interface GiftCardOptions extends ModuleConfig {
	/** Default currency for gift cards (default: "USD") */
	defaultCurrency?: string;
	/** Maximum gift card value allowed (default: 10000) */
	maxBalance?: number;
	/** Comma-separated allowed denominations for purchase (e.g. "1000,2500,5000,10000") */
	denominations?: string;
	/** Maximum number of gift cards per bulk creation (default: 100) */
	maxBulkCount?: number;
}

export default function giftCards(options?: GiftCardOptions): Module {
	return {
		id: "gift-cards",
		version: "0.1.0",
		schema: giftCardSchema,
		exports: {
			read: ["giftCardBalance", "giftCardStatus"],
		},
		events: {
			emits: [
				"giftCard.created",
				"giftCard.purchased",
				"giftCard.redeemed",
				"giftCard.credited",
				"giftCard.depleted",
				"giftCard.sent",
				"giftCard.toppedUp",
				"giftCard.expired",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createGiftCardController(ctx.data);
			return { controllers: { giftCards: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/gift-cards",
					component: "GiftCardOverview",
					label: "Gift Cards",
					icon: "Gift",
					group: "Sales",
				},
			],
		},
		options,
	};
}
