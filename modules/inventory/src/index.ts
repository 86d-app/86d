import {
	inventoryStockAdjustedV1,
	inventoryStockAdjustedV2,
	type Module,
	type ModuleConfig,
	type ModuleContext,
} from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { inventoryCheckoutProvider } from "./capabilities";
import { inventoryCheckoutV2Provider } from "./reservation-provider";
import { inventorySchema } from "./schema";
import { createInventoryController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export { inventoryStockAdjustTransportSchema } from "./admin/endpoints/adjust-stock";
export {
	adjustInventoryStockFromCommand,
	type InventoryStockAdjustContext,
	type InventoryStockAdjustInput,
	type InventoryStockAdjustOutcome,
	type InventoryStockAdjustResult,
	inventoryStockAdjustInputSchema,
	inventoryStockAdjustOutcomeSchema,
} from "./commands";
export { inventoryCheckoutV2Capability } from "./reservation-provider";
export {
	executeInventoryReservation,
	type InventoryReservationDecision,
	type InventoryReservationFailure,
	type InventoryReservationRequest,
	type InventoryReservationResult,
} from "./reservations";
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
		capabilities: {
			provides: [inventoryCheckoutProvider, inventoryCheckoutV2Provider],
		},
		exports: {
			read: ["stockQuantity", "stockAvailability"],
			readWrite: ["stockReservation"],
		},
		events: {
			emits: ["inventory.updated", "inventory.low", "inventory.back-in-stock"],
		},
		// `inventory.stock-adjusted` is the completed-change fact. It commits with
		// the stock row in one transaction and is delivered from the outbox. The
		// `events` entries above remain the in-memory notification path and are
		// not authority for anything.
		durableEvents: {
			emits: [inventoryStockAdjustedV1, inventoryStockAdjustedV2],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createInventoryController(
				ctx.data,
				ctx.events,
				ctx.transactions,
			);
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
