import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { inventorySchema } from "./schema";
import { createInventoryController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	BackInStockStats,
	BackInStockSubscription,
	InventoryController,
	InventoryItem,
} from "./service";

export interface InventoryOptions extends ModuleConfig {
	/** Default low-stock threshold applied to all items without explicit threshold */
	defaultLowStockThreshold?: number;
}

export default function inventory(options?: InventoryOptions): Module {
	return {
		id: "inventory",
		version: "0.0.1",
		schema: inventorySchema,
		exports: {
			read: ["stockQuantity", "stockAvailability"],
			readWrite: ["stockReservation"],
		},
		events: {
			emits: ["inventory.updated", "inventory.low", "inventory.back-in-stock"],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createInventoryController(ctx.data, ctx.events);
			return { controllers: { inventory: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/inventory",
					component: "InventoryList",
					label: "Inventory",
					icon: "Warehouse",
					group: "Fulfillment",
				},
				{
					path: "/admin/inventory/back-in-stock",
					component: "BackInStockAdmin",
					label: "Back in Stock",
					icon: "BellRinging",
					group: "Fulfillment",
				},
			],
		},
		options,
	};
}
