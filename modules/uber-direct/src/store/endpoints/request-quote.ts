import { createStoreEndpoint, z } from "@86d-app/core";
import type { UberDirectController } from "../../service";

export const requestQuote = createStoreEndpoint(
	"/uber-direct/quotes",
	{
		method: "POST",
		body: z.object({
			pickupAddress: z
				.record(z.string().max(100), z.unknown())
				.refine((r) => Object.keys(r).length <= 20, {
					message: "Too many fields in address",
				}),
			dropoffAddress: z
				.record(z.string().max(100), z.unknown())
				.refine((r) => Object.keys(r).length <= 20, {
					message: "Too many fields in address",
				}),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.uberDirect as UberDirectController;
		const quote = await controller.requestQuote({
			pickupAddress: ctx.body.pickupAddress,
			dropoffAddress: ctx.body.dropoffAddress,
		});
		return { quote };
	},
);
