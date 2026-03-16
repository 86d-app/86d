import { createStoreEndpoint, z } from "@86d-app/core";
import type { AutomationsController } from "../../service";

/**
 * Webhook reception endpoint for external services.
 *
 * External platforms (Zapier, custom integrations, etc.) can POST events
 * that trigger matching automations. A shared secret is validated via
 * the `x-webhook-secret` header when configured in module options.
 *
 * Unlike the `/automations/trigger` endpoint, this accepts any event
 * type (not limited to the storefront allowlist) because the caller is
 * authenticated via the webhook secret.
 */
export function createWebhookEndpoint(opts?: {
	webhookSecret?: string | undefined;
}) {
	return createStoreEndpoint(
		"/automations/webhooks",
		{
			method: "POST",
			body: z.object({
				eventType: z.string().min(1).max(200),
				payload: z
					.record(z.string().max(100), z.unknown())
					.refine((r) => Object.keys(r).length <= 50, "Too many keys")
					.optional(),
			}),
			requireRequest: true,
		},
		// biome-ignore lint/suspicious/noExplicitAny: endpoint handler needs raw request
		async (ctx: any): Promise<Response> => {
			const request = ctx.request as Request;

			// Verify shared secret when configured
			if (opts?.webhookSecret) {
				const provided = request.headers.get("x-webhook-secret") ?? "";
				if (provided !== opts.webhookSecret) {
					return Response.json(
						{ error: "Invalid webhook secret." },
						{ status: 401 },
					);
				}
			}

			const controller = ctx.context.controllers
				.automations as AutomationsController;

			const { eventType, payload } = ctx.body as {
				eventType: string;
				payload?: Record<string, unknown>;
			};

			const executions = await controller.evaluateEvent(
				eventType,
				payload ?? {},
			);

			return Response.json({
				received: true,
				eventType,
				triggered: executions.length,
				executions: executions.map((e) => ({
					id: e.id,
					automationId: e.automationId,
					status: e.status,
				})),
			});
		},
	);
}
