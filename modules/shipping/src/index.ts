import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { shippingSchema } from "./schema";
import { createShippingController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	CalculatedRate,
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
}

export default function shipping(options?: ShippingOptions): Module {
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
			const controller = createShippingController(ctx.data);
			return { controllers: { shipping: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
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
