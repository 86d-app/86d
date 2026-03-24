import { createStoreEndpoint, z } from "@86d-app/core";

export const webhookEndpoint = createStoreEndpoint(
	"/x-shop/webhooks",
	{
		method: "POST",
		body: z.object({
			type: z.string().min(1).max(200),
			data: z
				.record(z.string().max(100), z.unknown())
				.refine((r) => Object.keys(r).length <= 100, {
					message: "Too many fields in payload",
				}),
		}),
	},
	async (ctx) => {
		return { received: true, type: ctx.body.type };
	},
);
