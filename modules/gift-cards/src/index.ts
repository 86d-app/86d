import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { giftCardSchema } from "./schema";
import { createGiftCardController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	GiftCard,
	GiftCardController,
	GiftCardTransaction,
} from "./service";

export interface GiftCardOptions extends ModuleConfig {
	/** Default currency for gift cards (default: "USD") */
	defaultCurrency?: string;
	/** Maximum gift card value allowed */
	maxBalance?: string;
}

export default function giftCards(options?: GiftCardOptions): Module {
	return {
		id: "gift-cards",
		version: "0.0.1",
		schema: giftCardSchema,
		exports: {
			read: ["giftCardBalance", "giftCardStatus"],
		},
		events: {
			emits: [
				"giftCard.created",
				"giftCard.redeemed",
				"giftCard.credited",
				"giftCard.depleted",
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
