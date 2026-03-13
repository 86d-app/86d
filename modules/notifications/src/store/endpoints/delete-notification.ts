import { createStoreEndpoint, z } from "@86d-app/core";
import type { NotificationsController } from "../../service";

export const deleteNotificationEndpoint = createStoreEndpoint(
	"/notifications/:id/delete",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const customerId = ctx.context.session?.user.id;
		if (!customerId) return { error: "Not authenticated" };

		const controller = ctx.context.controllers
			.notifications as NotificationsController;

		// Verify ownership before deleting
		const existing = await controller.get(ctx.params.id);
		if (!existing || existing.customerId !== customerId) {
			return { error: "Notification not found" };
		}

		await controller.delete(ctx.params.id);
		return { deleted: true };
	},
);
