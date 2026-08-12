import {
	orderCreateCapability,
	orderCustomerAuthorizeCapability,
	orderPurchaseVerifyCapability,
	provideCapability,
} from "@86d-app/core";
import { createOrderController } from "./service-impl";

export {
	orderCreateCapability,
	orderCustomerAuthorizeCapability,
	orderPurchaseVerifyCapability,
};

export const orderCreateProvider = provideCapability(
	orderCreateCapability,
	async (ctx, request) => {
		try {
			const order = await createOrderController(ctx.data).create(request);
			return {
				ok: true,
				decision: { orderId: order.id, orderNumber: order.orderNumber },
			};
		} catch {
			return { ok: false, failure: { code: "create_failed" as const } };
		}
	},
);

export const orderCustomerAuthorizeProvider = provideCapability(
	orderCustomerAuthorizeCapability,
	async (ctx, request) => {
		try {
			const order = await createOrderController(ctx.data).getById(
				request.orderId,
			);
			if (!order) {
				return {
					ok: false,
					failure: { code: "order_not_found" as const },
				};
			}
			if (order.customerId !== request.customerId) {
				return { ok: false, failure: { code: "not_owner" as const } };
			}
			return { ok: true, decision: { authorized: true as const } };
		} catch {
			return { ok: false, failure: { code: "lookup_failed" as const } };
		}
	},
);

export const orderPurchaseVerifyProvider = provideCapability(
	orderPurchaseVerifyCapability,
	async (ctx, request) => {
		try {
			const verified = await createOrderController(
				ctx.data,
			).hasCustomerPurchasedProduct(request.customerId, request.productId);
			return { ok: true, decision: { verified } };
		} catch {
			return { ok: false, failure: { code: "lookup_failed" as const } };
		}
	},
);
