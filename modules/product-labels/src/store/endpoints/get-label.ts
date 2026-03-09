import { createStoreEndpoint, z } from "@86d-app/core";
import type { ProductLabelController } from "../../service";

export const getLabel = createStoreEndpoint(
	"/product-labels/:slug",
	{
		method: "GET",
		params: z.object({
			slug: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.productLabels as ProductLabelController;

		const label = await controller.getLabelBySlug(ctx.params.slug);
		if (!label || !label.isActive) {
			return { error: "Label not found", status: 404 };
		}

		return { label };
	},
);
