import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { shippingSchema } from "./schema";
import { createShippingController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	CalculatedRate,
	ShippingController,
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
		version: "0.0.1",
		schema: shippingSchema,
		exports: {
			read: ["shippingRates", "shippingZones"],
		},
		events: {
			emits: ["shipment.created", "shipment.delivered"],
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
					group: "Settings",
				},
			],
		},
		options,
	};
}
