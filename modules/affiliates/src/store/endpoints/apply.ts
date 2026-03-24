import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { AffiliateController } from "../../service";

export const applyEndpoint = createStoreEndpoint(
	"/affiliates/apply",
	{
		method: "POST",
		body: z.object({
			name: z.string().min(1).max(200).transform(sanitizeText),
			email: z.string().email().max(320),
			website: z.string().url().max(500).optional(),
			notes: z.string().max(2000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const customerId = ctx.context.session?.user.id;
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;

		// Check if already applied
		const existing = await controller.getAffiliateByEmail(ctx.body.email);
		if (existing)
			return {
				error: "An application with this email already exists",
				status: 409,
			};

		const affiliate = await controller.apply({
			name: ctx.body.name,
			email: ctx.body.email,
			website: ctx.body.website,
			customerId,
			notes: ctx.body.notes,
		});
		return { affiliate };
	},
);
