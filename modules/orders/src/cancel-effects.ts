import type {
	InventoryReleaseController,
	OrderController,
	OrderWithDetails,
	PaymentRefundController,
} from "./service";

interface CancelEffectsParams {
	order: OrderWithDetails;
	orderController: OrderController;
	paymentController: PaymentRefundController | undefined;
	inventoryController: InventoryReleaseController | undefined;
	cancelledBy: string;
}

interface CancelEffectsResult {
	refundCreated: boolean;
	inventoryReleased: boolean;
	refundAmount: number;
}

/**
 * Performs side effects when an order is cancelled:
 * 1. Refunds payment if the order was paid
 * 2. Releases reserved inventory for all order items
 * 3. Updates the order's payment status
 * 4. Adds a system note documenting the cancellation
 */
export async function performCancellationEffects(
	params: CancelEffectsParams,
): Promise<CancelEffectsResult> {
	const {
		order,
		orderController,
		paymentController,
		inventoryController,
		cancelledBy,
	} = params;

	let refundCreated = false;
	let refundAmount = 0;

	// 1. Refund payment if it was paid
	if (paymentController && order.paymentStatus === "paid") {
		const paymentIntentId = resolvePaymentIntentId(order);

		if (paymentIntentId) {
			try {
				const refund = await paymentController.createRefund({
					intentId: paymentIntentId,
					reason: `Order ${order.orderNumber} cancelled by ${cancelledBy}`,
				});
				refundCreated = true;
				refundAmount = refund.amount;
			} catch {
				// If the direct refund fails, try finding the intent by orderId
				const intents = await paymentController.listIntents({
					orderId: order.id,
					status: "succeeded",
				});
				if (intents.length > 0) {
					try {
						const refund = await paymentController.createRefund({
							intentId: intents[0].id,
							reason: `Order ${order.orderNumber} cancelled by ${cancelledBy}`,
						});
						refundCreated = true;
						refundAmount = refund.amount;
					} catch {
						// Refund failed — will be noted below
					}
				}
			}
		} else {
			// No direct intent ID in metadata — search by orderId
			const intents = await paymentController.listIntents({
				orderId: order.id,
				status: "succeeded",
			});
			if (intents.length > 0) {
				try {
					const refund = await paymentController.createRefund({
						intentId: intents[0].id,
						reason: `Order ${order.orderNumber} cancelled by ${cancelledBy}`,
					});
					refundCreated = true;
					refundAmount = refund.amount;
				} catch {
					// Refund failed — will be noted below
				}
			}
		}

		// Update order payment status
		if (refundCreated) {
			await orderController.updatePaymentStatus(order.id, "refunded");
		}
	}

	// 2. Release reserved inventory for all order items
	let inventoryReleased = false;
	if (inventoryController && order.items.length > 0) {
		for (const item of order.items) {
			await inventoryController.release({
				productId: item.productId,
				variantId: item.variantId,
				quantity: item.quantity,
			});
		}
		inventoryReleased = true;
	}

	// 3. Add a system note documenting what happened
	const noteParts = [`Order cancelled by ${cancelledBy}.`];
	if (refundCreated) {
		noteParts.push(
			`Refund of ${formatCurrency(refundAmount, order.currency)} initiated.`,
		);
	} else if (order.paymentStatus === "paid" && paymentController) {
		noteParts.push("Automatic refund could not be processed.");
	}
	if (inventoryReleased) {
		noteParts.push(
			`Reserved inventory released for ${order.items.length} item(s).`,
		);
	}

	await orderController.addNote({
		orderId: order.id,
		type: "system",
		content: noteParts.join(" "),
	});

	return { refundCreated, inventoryReleased, refundAmount };
}

/** Extract the payment intent ID from order metadata (set during checkout). */
function resolvePaymentIntentId(order: OrderWithDetails): string | undefined {
	const meta = order.metadata as Record<string, unknown> | undefined;
	if (typeof meta?.paymentIntentId === "string") {
		return meta.paymentIntentId;
	}
	return undefined;
}

/** Simple currency formatting for system notes. */
function formatCurrency(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
		}).format(amount / 100);
	} catch {
		return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
	}
}
