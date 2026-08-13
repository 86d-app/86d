import type { CapabilityInvoker } from "@86d-app/core/capabilities";
import { taxQuoteCapability } from "@86d-app/core/commerce-capabilities";
import type { CheckoutController, CheckoutSession } from "../../service";

/**
 * Recalculates tax for a checkout session, distributing any order-level
 * discount proportionally across line items so that tax is computed on the
 * post-discount amounts. Returns the updated session, or the original if
 * no tax controller is available or no shipping address is set.
 */
export async function recalculateTax(
	session: CheckoutSession,
	checkoutController: CheckoutController,
	capabilities: CapabilityInvoker,
): Promise<CheckoutSession | null> {
	if (!session.shippingAddress) {
		return session;
	}

	const lineItems = await checkoutController.getLineItems(session.id);
	if (lineItems.length === 0) {
		return session;
	}

	// Distribute order-level discount proportionally across line items
	const discountRatio =
		session.subtotal > 0 && session.discountAmount > 0
			? session.discountAmount / session.subtotal
			: 0;

	const taxResult = await capabilities.invoke(taxQuoteCapability, {
		address: {
			country: session.shippingAddress.country,
			state: session.shippingAddress.state,
			city: session.shippingAddress.city,
			postalCode: session.shippingAddress.postalCode,
		},
		lineItems: lineItems.map((item) => {
			const fullAmount = item.price * item.quantity;
			return {
				productId: item.productId,
				amount: Math.round(fullAmount * (1 - discountRatio)),
				quantity: item.quantity,
			};
		}),
		shippingAmount: session.shippingAmount,
		...(session.customerId ? { customerId: session.customerId } : {}),
	});

	if (!taxResult.ok) return null;
	if (typeof taxResult.decision.totalTax === "number") {
		const updated = await checkoutController.update(session.id, {
			taxAmount: taxResult.decision.totalTax,
		});
		if (updated) {
			return updated;
		}
	}

	return null;
}
