import {
	acceptCapability,
	type Module,
	type ModuleConfig,
	type ModuleContext,
	orderLineQuantityValidateCapability,
} from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { fulfillmentCreatedV1 } from "./events";
import { fulfillmentSchema } from "./schema";
import { createFulfillmentController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export {
	FulfillmentAuthorityError,
	type FulfillmentAuthorityErrorCode,
} from "./authority";
export { fulfillmentCreatedV1 } from "./events";
export type {
	Fulfillment,
	FulfillmentController,
	FulfillmentItem,
	FulfillmentStatus,
} from "./service";

export interface FulfillmentOptions extends ModuleConfig {
	/** Auto-transition to "shipped" when tracking is added */
	autoShipOnTracking?: boolean;
}

export default function fulfillment(options?: FulfillmentOptions): Module {
	return {
		id: "fulfillment",
		version: "0.0.1",
		schema: fulfillmentSchema,
		capabilities: {
			accepts: [acceptCapability(orderLineQuantityValidateCapability)],
		},
		events: {
			emits: [
				"fulfillment.created",
				"fulfillment.shipped",
				"fulfillment.delivered",
				"fulfillment.cancelled",
			],
		},
		// Creation state and this completed-change fact commit atomically. The
		// in-memory event above remains compatibility notification only.
		durableEvents: { emits: [fulfillmentCreatedV1] },
		init: async (ctx: ModuleContext) => {
			const controller = createFulfillmentController(
				ctx.data,
				ctx.events,
				{
					autoShipOnTracking: options?.autoShipOnTracking,
				},
				ctx.capabilities,
				ctx.transactions,
			);
			return { controllers: { fulfillment: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/fulfillment",
					component: "FulfillmentAdmin",
					label: "Fulfillment",
					icon: "PackageCheck",
					group: "Fulfillment",
				},
			],
		},
		options,
	};
}
