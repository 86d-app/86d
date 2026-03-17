import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import {
	adminEndpoints,
	createAdminEndpointsWithSettings,
} from "./admin/endpoints";
import { createGetSettingsEndpoint } from "./admin/endpoints/get-settings";
import { ResendProvider, TwilioProvider } from "./provider";
import { notificationsSchema } from "./schema";
import { createNotificationsController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	BatchSendResult,
	Notification,
	NotificationChannel,
	NotificationPreference,
	NotificationPriority,
	NotificationStats,
	NotificationsController,
	NotificationTemplate,
	NotificationType,
} from "./service";

export interface NotificationsOptions extends ModuleConfig {
	/** Max notifications per customer before auto-cleanup (default: "500") */
	maxPerCustomer?: string;
	/** Resend API key for email delivery */
	resendApiKey?: string | undefined;
	/** Sender email address for Resend (e.g. "Store Name <noreply@store.com>") */
	resendFromAddress?: string | undefined;
	/** Twilio Account SID */
	twilioAccountSid?: string | undefined;
	/** Twilio Auth Token */
	twilioAuthToken?: string | undefined;
	/** Twilio phone number in E.164 format (e.g. "+15551234567") */
	twilioFromNumber?: string | undefined;
}

export default function notifications(options?: NotificationsOptions): Module {
	const emailProvider =
		options?.resendApiKey && options?.resendFromAddress
			? new ResendProvider(options.resendApiKey, options.resendFromAddress)
			: undefined;

	const smsProvider =
		options?.twilioAccountSid &&
		options?.twilioAuthToken &&
		options?.twilioFromNumber
			? new TwilioProvider(
					options.twilioAccountSid,
					options.twilioAuthToken,
					options.twilioFromNumber,
				)
			: undefined;

	const hasEmailProvider = Boolean(emailProvider);
	const hasSmsProvider = Boolean(smsProvider);

	const settingsEndpoint = createGetSettingsEndpoint({
		resendApiKey: options?.resendApiKey,
		resendFromAddress: options?.resendFromAddress,
		twilioAccountSid: options?.twilioAccountSid,
		twilioFromNumber: options?.twilioFromNumber,
	});

	return {
		id: "notifications",
		version: "0.1.0",
		schema: notificationsSchema,
		exports: {
			read: ["unreadCount", "notificationType"],
		},
		events: {
			emits: [
				"notifications.created",
				"notifications.read",
				"notifications.all_read",
			],
		},
		init: async (ctx: ModuleContext) => {
			const maxStr = options?.maxPerCustomer;
			const maxPerCustomer = maxStr ? Number.parseInt(maxStr, 10) : undefined;
			const controller = createNotificationsController(ctx.data, ctx.events, {
				...(maxPerCustomer && !Number.isNaN(maxPerCustomer)
					? { maxPerCustomer }
					: {}),
				emailProvider,
				smsProvider,
			});
			return { controllers: { notifications: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin:
				hasEmailProvider || hasSmsProvider
					? createAdminEndpointsWithSettings(settingsEndpoint)
					: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/notifications",
					component: "NotificationList",
					label: "Notifications",
					icon: "Bell",
					group: "Support",
				},
				{
					path: "/admin/notifications/compose",
					component: "NotificationComposer",
					label: "Compose",
					icon: "PaperPlaneTilt",
					group: "Support",
				},
				{
					path: "/admin/notifications/templates",
					component: "NotificationTemplateList",
					label: "Templates",
					icon: "FileText",
					group: "Support",
				},
				{
					path: "/admin/notifications/settings",
					component: "NotificationSettings",
					label: "Settings",
					icon: "Gear",
					group: "Support",
				},
			],
		},
		options,
	};
}
