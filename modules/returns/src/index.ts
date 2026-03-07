import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { returnsSchema } from "./schema";
import { createReturnController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	CreateReturnItemParams,
	CreateReturnParams,
	ItemCondition,
	ItemReturnReason,
	RefundMethod,
	ReturnController,
	ReturnItem,
	ReturnRequest,
	ReturnRequestWithItems,
	ReturnStatus,
	ReturnSummary,
} from "./service";

export interface ReturnsOptions extends ModuleConfig {
	/**
	 * Maximum number of days after order to allow return requests.
	 * @default 30
	 */
	returnWindowDays?: number;
}

/**
 * Returns module factory function.
 * Manages customer return requests with an approval workflow.
 *
 * Flow: requested -> approved -> received -> completed
 * Admin can reject at any non-terminal stage.
 * Customers can cancel before completion.
 *
 * Emits events for integration with store-credits, notifications, and orders modules.
 */
export default function returns(options?: ReturnsOptions): Module {
	return {
		id: "returns",
		version: "0.0.1",
		schema: returnsSchema,
		exports: {
			read: ["returnStatus", "returnRefundAmount"],
		},
		events: {
			emits: [
				"return.requested",
				"return.approved",
				"return.rejected",
				"return.received",
				"return.completed",
				"return.cancelled",
				"return.refunded",
			],
		},

		init: async (ctx: ModuleContext) => {
			const controller = createReturnController(ctx.data);

			return {
				controllers: { returns: controller },
			};
		},

		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},

		admin: {
			pages: [
				{
					path: "/admin/returns",
					component: "ReturnsList",
					label: "Returns",
					icon: "ArrowUUpLeft",
					group: "Sales",
				},
				{
					path: "/admin/returns/:id",
					component: "ReturnDetail",
				},
			],
		},

		options,
	};
}
