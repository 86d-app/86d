import type {
	CheckoutController,
	CheckoutSession,
	TaxCalculateController,
} from "../../service";

/**
 * Recalculates tax for a checkout session, distributing any order-level
 * discount proportionally across line items so that tax is computed on the
 * post-discount amounts. Returns the updated session, or the original if
 * no tax controller is available or no shipping address is set.
 */
export async function recalculateTax(
	session: CheckoutSession,
	checkoutController: CheckoutController,
	taxController: TaxCalculateController | undefined,
): Promise<CheckoutSession> {
	if (!taxController?.calculate || !session.shippingAddress) {
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

	const taxResult = await taxController.calculate({
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
		customerId: session.customerId,
	});

	if (taxResult && typeof taxResult.totalTax === "number") {
		const updated = await checkoutController.update(session.id, {
			taxAmount: taxResult.totalTax,
		});
		if (updated) {
			return updated;
		}
	}

	return session;
}
