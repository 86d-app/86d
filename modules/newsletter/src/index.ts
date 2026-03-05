import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { newsletterSchema } from "./schema";
import { createNewsletterController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	Campaign,
	CampaignStats,
	CampaignStatus,
	NewsletterController,
	Subscriber,
	SubscriberStatus,
} from "./service";

export interface NewsletterOptions extends ModuleConfig {
	/** Allow duplicate subscriptions silently (default: true) */
	allowResubscribe?: string; // "true" | "false"
}

export default function newsletter(options?: NewsletterOptions): Module {
	return {
		id: "newsletter",
		version: "0.0.1",
		schema: newsletterSchema,
		exports: {
			read: ["subscriberEmail", "subscriberStatus"],
		},
		events: {
			emits: [
				"newsletter.subscribed",
				"newsletter.unsubscribed",
				"newsletter.campaign.sent",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createNewsletterController(ctx.data);
			return { controllers: { newsletter: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/newsletter",
					component: "NewsletterAdmin",
					label: "Newsletter",
					icon: "Envelope",
					group: "Marketing",
				},
				{
					path: "/admin/newsletter/campaigns",
					component: "CampaignAdmin",
					label: "Campaigns",
					icon: "PaperPlaneTilt",
					group: "Marketing",
				},
			],
		},
		options,
	};
}
