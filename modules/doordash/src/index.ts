import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { createAdminEndpointsWithSettings } from "./admin/endpoints";
import { createGetSettingsEndpoint } from "./admin/endpoints/get-settings";
import { doordashSchema } from "./schema";
import { createDoordashController } from "./service-impl";
import { createStoreEndpoints, storeEndpoints } from "./store/endpoints";
import { createDoordashWebhook } from "./store/endpoints/webhook";

export type {
	Delivery,
	DeliveryAvailability,
	DeliveryQuote,
	DeliveryStatus,
	DeliveryZone,
	DoordashController,
} from "./service";

export interface DoordashOptions extends ModuleConfig {
	/** DoorDash developer_id from the developer portal */
	developerId?: string | undefined;
	/** DoorDash key_id from the developer portal */
	keyId?: string | undefined;
	/** DoorDash signing_secret (base64-encoded) from the developer portal */
	signingSecret?: string | undefined;
	/** Use sandbox mode (default: true) */
	sandbox?: boolean | undefined;
}

export default function doordash(options?: DoordashOptions): Module {
	const hasCredentials = Boolean(
		options?.developerId && options?.keyId && options?.signingSecret,
	);

	// Build endpoints — include webhook and settings when credentials are present
	const webhookEndpoint = createDoordashWebhook(options?.signingSecret);
	const settingsEndpoint = createGetSettingsEndpoint({
		developerId: options?.developerId,
		keyId: options?.keyId,
		signingSecret: options?.signingSecret,
		sandbox: options?.sandbox,
	});

	return {
		id: "doordash",
		version: "0.1.0",
		schema: doordashSchema,
		exports: {
			read: ["deliveryStatus", "deliveryTrackingUrl"],
		},
		events: {
			emits: [
				"doordash.delivery.created",
				"doordash.delivery.picked-up",
				"doordash.delivery.delivered",
				"doordash.delivery.cancelled",
				"doordash.webhook.received",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createDoordashController(ctx.data, ctx.events, {
				developerId: options?.developerId,
				keyId: options?.keyId,
				signingSecret: options?.signingSecret,
				sandbox: options?.sandbox ?? true,
			});
			return { controllers: { doordash: controller } };
		},
		endpoints: {
			store: hasCredentials
				? createStoreEndpoints(webhookEndpoint)
				: storeEndpoints,
			admin: createAdminEndpointsWithSettings(settingsEndpoint),
		},
		admin: {
			pages: [
				{
					path: "/admin/doordash",
					component: "DoorDashAdmin",
					label: "DoorDash",
					icon: "Truck",
					group: "Fulfillment",
				},
			],
		},
		options,
	};
}
