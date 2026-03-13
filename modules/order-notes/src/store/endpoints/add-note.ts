import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { OrderNotesController } from "../../service";

export const addNote = createStoreEndpoint(
	"/orders/:orderId/notes/add",
	{
		method: "POST",
		params: z.object({ orderId: z.string().max(200) }),
		body: z.object({
			content: z.string().min(1).max(5000).transform(sanitizeText),
		}),
	},
	async (ctx) => {
		const customerId = ctx.context.session?.user.id;
		if (!customerId) {
			return { error: "Unauthorized", status: 401 };
		}

		const customerName =
			ctx.context.session?.user.name ?? ctx.context.session?.user.email ?? "";

		const controller = ctx.context.controllers
			.orderNotes as OrderNotesController;

		const note = await controller.addNote({
			orderId: ctx.params.orderId,
			authorId: customerId,
			authorName: customerName,
			authorType: "customer",
			content: ctx.body.content,
			isInternal: false,
		});

		if (ctx.context.events) {
			await ctx.context.events.emit("orderNote.created", {
				orderId: ctx.params.orderId,
				noteId: note.id,
				authorType: "customer",
			});
		}

		return { note };
	},
);
