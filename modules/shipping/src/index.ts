import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { createAdminEndpointsWithSettings } from "./admin/endpoints";
import { createGetSettingsEndpoint } from "./admin/endpoints/get-settings";
import { shippingSchema } from "./schema";
import { createShippingController } from "./service-impl";
import {
	createStoreEndpointsWithRates,
	storeEndpoints,
} from "./store/endpoints";

export type {
	CalculatedRate,
	LiveRate,
	LiveRateAddress,
	LiveRateParcel,
	Shipment,
	ShipmentStatus,
	ShippingCarrier,
	ShippingController,
	ShippingMethod,
	ShippingRate,
	ShippingZone,
} from "./service";

export interface ShippingOptions extends ModuleConfig {
	/** Default currency for shipping prices */
	currency?: string;
	/** EasyPost API key (test or production) */
	easypostApiKey?: string | undefined;
	/** Use EasyPost test mode (default: true) */
	easypostTestMode?: boolean | undefined;
}

export default function shipping(options?: ShippingOptions): Module {
	const hasEasyPost = Boolean(options?.easypostApiKey);

	const settingsEndpoint = createGetSettingsEndpoint({
		easypostApiKey: options?.easypostApiKey,
		easypostTestMode: options?.easypostTestMode,
	});

	return {
		id: "shipping",
		version: "0.1.0",
		schema: shippingSchema,
		exports: {
			read: [
				"shippingRates",
				"shippingZones",
				"shippingMethods",
				"shippingCarriers",
				"shipments",
			],
		},
		events: {
			emits: [
				"shipment.created",
				"shipment.shipped",
				"shipment.in_transit",
				"shipment.delivered",
				"shipment.returned",
				"shipment.failed",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createShippingController(ctx.data, ctx.events, {
				easypostApiKey: options?.easypostApiKey,
				easypostTestMode: options?.easypostTestMode ?? true,
			});
			return { controllers: { shipping: controller } };
		},
		endpoints: {
			store: hasEasyPost ? createStoreEndpointsWithRates() : storeEndpoints,
			admin: createAdminEndpointsWithSettings(settingsEndpoint),
		},
		admin: {
			pages: [
				{
					path: "/admin/shipping",
					component: "ShippingAdmin",
					label: "Shipping",
					icon: "Truck",
					group: "Fulfillment",
				},
				{
					path: "/admin/shipping/carriers",
					component: "ShippingCarriersAdmin",
					label: "Carriers",
					icon: "Building2",
					group: "Fulfillment",
				},
				{
					path: "/admin/shipping/shipments",
					component: "ShipmentsAdmin",
					label: "Shipments",
					icon: "Package",
					group: "Fulfillment",
				},
			],
		},
		options,
	};
}
