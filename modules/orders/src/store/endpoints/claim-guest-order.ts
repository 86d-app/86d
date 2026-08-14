import { createStoreEndpoint } from "@86d-app/core/api";
import { z } from "@86d-app/core/zod";
import { resolveOrderCustomerContext } from "./customer-context";

function collectGuestProofs(cookieHeader: string | null): string[] {
	if (!cookieHeader) return [];
	const proofs: string[] = [];
	for (const part of cookieHeader.split(";")) {
		const [name, ...rest] = part.trim().split("=");
		if (
			name?.startsWith("checkout_guest_") ||
			name?.startsWith("order_guest_")
		) {
			const value = rest.join("=");
			if (value.length >= 16) proofs.push(value);
		}
	}
	return proofs.slice(0, 8);
}

export const claimGuestOrder = createStoreEndpoint(
	"/orders/claim",
	{
		method: "POST",
		body: z.object({
			orderId: z.string().min(1).max(200),
		}),
	},
	async (ctx) => {
		const customerContext = await resolveOrderCustomerContext(ctx.context);
		if (!customerContext.ok) return customerContext.response;

		const result = await customerContext.controller.claimGuestOrder({
			orderId: ctx.body.orderId,
			storeCustomerId: customerContext.customerId,
			proofs: collectGuestProofs(ctx.headers?.get("cookie") ?? null),
		});
		if (!result.ok) {
			if (
				result.code === "order_not_found" ||
				result.code === "proof_invalid"
			) {
				return { error: "Order not found", status: 404 };
			}
			if (result.code === "already_attributed") {
				return {
					code: "ORDER_ALREADY_ATTRIBUTED",
					error: "This order already belongs to another customer.",
					status: 409,
				};
			}
			return {
				code: "ORDER_GUEST_CLAIM_UNAVAILABLE",
				error: "This order cannot be claimed.",
				status: 422,
			};
		}

		return { order: result.order, claimed: result.claimed };
	},
);
