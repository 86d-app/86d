import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { createAdminEndpointsWithSettings } from "./admin/endpoints";
import { createGetSettingsEndpoint } from "./admin/endpoints/get-settings";
import { etsySchema } from "./schema";
import { createEtsyController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	ChannelStats,
	EtsyController,
	EtsyListing,
	EtsyOrder,
	EtsyReview,
} from "./service";

export interface EtsyOptions extends ModuleConfig {
	/** Etsy API key (x-api-key) */
	apiKey?: string | undefined;
	/** Etsy Shop ID */
	shopId?: string | undefined;
	/** Etsy OAuth2 access token */
	accessToken?: string | undefined;
}

export default function etsy(options?: EtsyOptions): Module {
	const settingsEndpoint = createGetSettingsEndpoint({
		apiKey: options?.apiKey,
		shopId: options?.shopId,
		accessToken: options?.accessToken,
	});

	return {
		id: "etsy",
		version: "0.1.0",
		schema: etsySchema,
		exports: {
			read: ["listingTitle", "listingStatus", "listingPrice", "listingViews"],
		},
		events: {
			emits: [
				"etsy.listing.synced",
				"etsy.listing.expired",
				"etsy.order.received",
				"etsy.order.shipped",
				"etsy.review.received",
				"etsy.catalog.synced",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createEtsyController(ctx.data, ctx.events, {
				apiKey: options?.apiKey,
				shopId: options?.shopId,
				accessToken: options?.accessToken,
			});
			return { controllers: { etsy: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: createAdminEndpointsWithSettings(settingsEndpoint),
		},
		admin: {
			pages: [
				{
					path: "/admin/etsy",
					component: "EtsyAdmin",
					label: "Etsy",
					icon: "Palette",
					group: "Sales",
				},
			],
		},
		options,
	};
}
