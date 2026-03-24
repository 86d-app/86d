import { createStoreEndpoint, z } from "@86d-app/core";
import { verifyWebhookSignature } from "../../provider";

export function createWebhookEndpoint(webhookSecret?: string) {
	return createStoreEndpoint(
		"/pinterest-shop/webhooks",
		{
			method: "POST",
			body: z.object({
				type: z.string().min(1).max(200),
				payload: z
					.record(z.string().max(100), z.unknown())
					.refine((r) => Object.keys(r).length <= 100, {
						message: "Too many fields in payload",
					}),
			}),
		},
		async (ctx) => {
			if (webhookSecret) {
				const signature =
					ctx.headers instanceof Headers
						? (ctx.headers.get("x-pinterest-signature") ?? "")
						: "";
				const rawBody = JSON.stringify(ctx.body);
				if (
					typeof signature === "string" &&
					!verifyWebhookSignature(rawBody, signature, webhookSecret)
				) {
					return { received: false, error: "Invalid signature" };
				}
			}

			return { received: true, type: ctx.body.type };
		},
	);
}

export const webhookEndpoint = createWebhookEndpoint();
