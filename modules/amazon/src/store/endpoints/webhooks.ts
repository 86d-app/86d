import { createStoreEndpoint } from "@86d-app/core";
import { verifyWebhookSignature } from "../../provider";
import type { AmazonController } from "../../service";

/**
 * Create the Amazon webhook endpoint.
 * Pass `webhookSecret` from module options to enable HMAC-SHA256 signature verification.
 *
 * Without a secret the endpoint still works (useful for local development),
 * but all incoming requests are accepted without verification.
 */
export function createAmazonWebhook(webhookSecret?: string | undefined) {
	return createStoreEndpoint(
		"/amazon/webhooks",
		{
			method: "POST",
			requireRequest: true,
		},
		async (ctx) => {
			const request = ctx.request;

			// Read raw body before any JSON.parse to preserve bytes for HMAC
			const rawBody = await request.text();

			// Signature verification (skipped if no secret configured)
			if (webhookSecret) {
				const signature = request.headers.get("x-amz-signature") ?? "";
				const valid = await verifyWebhookSignature(
					rawBody,
					signature,
					webhookSecret,
				);
				if (!valid) {
					return Response.json(
						{ error: "Invalid webhook signature." },
						{ status: 401 },
					);
				}
			}

			let body: Record<string, unknown>;
			try {
				body = JSON.parse(rawBody) as Record<string, unknown>;
			} catch {
				return Response.json({ error: "Invalid JSON body." }, { status: 400 });
			}

			const type = body.type as string | undefined;
			const payload = body.payload as Record<string, unknown> | undefined;

			if (!type || !payload) {
				return Response.json(
					{ error: "Missing required fields: type, payload." },
					{ status: 400 },
				);
			}

			const controller = ctx.context?.controllers?.amazon as AmazonController;

			switch (type) {
				case "order.created": {
					if (!payload.amazonOrderId) {
						return Response.json({ received: true });
					}
					const order = await controller.receiveOrder({
						amazonOrderId: payload.amazonOrderId as string,
						status:
							(payload.status as "pending" | "unshipped" | undefined) ??
							"pending",
						fulfillmentChannel:
							(payload.fulfillmentChannel as "FBA" | "FBM" | undefined) ??
							"FBM",
						items: (payload.items as unknown[]) ?? [],
						orderTotal: (payload.orderTotal as number) ?? 0,
						shippingTotal: (payload.shippingTotal as number) ?? 0,
						marketplaceFee: (payload.marketplaceFee as number) ?? 0,
						netProceeds: (payload.netProceeds as number) ?? 0,
						buyerName: payload.buyerName as string | undefined,
						shippingAddress:
							(payload.shippingAddress as Record<string, unknown>) ?? {},
					});
					return Response.json({ received: true, orderId: order.id });
				}

				case "order.shipped": {
					if (!payload.orderId || !payload.trackingNumber) {
						return Response.json({ received: true });
					}
					const order = await controller.shipOrder(
						payload.orderId as string,
						payload.trackingNumber as string,
						(payload.carrier as string) ?? "UNKNOWN",
					);
					return Response.json({ received: true, orderId: order?.id });
				}

				case "order.cancelled": {
					if (!payload.orderId) {
						return Response.json({ received: true });
					}
					const order = await controller.cancelOrder(payload.orderId as string);
					return Response.json({ received: true, orderId: order?.id });
				}

				case "listing.sync": {
					const result = await controller.syncListings();
					return Response.json({ received: true, synced: result.synced });
				}

				case "inventory.sync": {
					const sync = await controller.syncInventory();
					return Response.json({ received: true, syncId: sync.id });
				}

				default:
					return Response.json({ received: true });
			}
		},
	);
}
