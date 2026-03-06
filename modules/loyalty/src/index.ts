import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { loyaltySchema } from "./schema";
import { createLoyaltyController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	LoyaltyAccount,
	LoyaltyController,
	LoyaltyRule,
	LoyaltySummary,
	LoyaltyTier,
	LoyaltyTransaction,
} from "./service";

export interface LoyaltyOptions extends ModuleConfig {
	/** Points earned per dollar spent (default: 1) */
	pointsPerDollar?: string;
	/** Minimum points required for redemption */
	minRedemption?: string;
	/** Points-to-currency conversion rate (e.g. 100 points = $1) */
	redemptionRate?: string;
}

export default function loyalty(options?: LoyaltyOptions): Module {
	return {
		id: "loyalty",
		version: "0.0.1",
		schema: loyaltySchema,
		exports: {
			read: ["loyaltyBalance", "loyaltyTier", "loyaltyLifetimeEarned"],
		},
		requires: ["customers"],
		events: {
			emits: [
				"loyalty.pointsEarned",
				"loyalty.pointsRedeemed",
				"loyalty.tierChanged",
				"loyalty.accountSuspended",
				"loyalty.accountReactivated",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createLoyaltyController(ctx.data);

			interface OrderPayload {
				total?: number;
				customerId?: string;
				orderId?: string;
			}

			ctx.events?.on<OrderPayload>("order.placed", async (event) => {
				const orderTotal = event.payload?.total ?? 0;
				const customerId = event.payload?.customerId;
				if (!customerId || orderTotal <= 0) return;

				const points = await controller.calculateOrderPoints(orderTotal);
				if (points > 0) {
					await controller.earnPoints({
						customerId,
						points,
						description: `Order reward (${orderTotal.toFixed(2)})`,
						orderId: event.payload?.orderId,
					});
				}
			});

			return { controllers: { loyalty: controller } };
		},
		search: { store: "/loyalty/store-search" },
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/loyalty",
					component: "LoyaltyOverview",
					label: "Loyalty",
					icon: "Star",
					group: "Marketing",
				},
				{
					path: "/admin/loyalty/rules",
					component: "LoyaltyRules",
					label: "Earn Rules",
					icon: "Settings",
					group: "Marketing",
				},
				{
					path: "/admin/loyalty/tiers",
					component: "LoyaltyTiers",
					label: "Tiers",
					icon: "Trophy",
					group: "Marketing",
				},
			],
		},
		options,
	};
}
