import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { ToastPosProvider } from "./provider";
import { toastSchema } from "./schema";
import { createToastController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export { ToastPosProvider } from "./provider";
export type {
	MenuMapping,
	SyncDirection,
	SyncEntityType,
	SyncRecord,
	SyncStats,
	SyncStatus,
	ToastController,
} from "./service";

export interface ToastOptions extends ModuleConfig {
	/** Toast API access token */
	apiKey?: string;
	/** Toast restaurant external GUID */
	restaurantGuid?: string;
	/** Use sandbox mode (default: "true") */
	sandbox?: string;
}

export default function toast(options?: ToastOptions): Module {
	let provider: ToastPosProvider | undefined;
	if (options?.apiKey && options?.restaurantGuid) {
		provider = new ToastPosProvider(options.apiKey, options.restaurantGuid, {
			sandbox: options.sandbox !== "false",
		});
	}

	return {
		id: "toast",
		version: "0.0.1",
		schema: toastSchema,
		exports: {
			read: ["syncRecordStatus", "menuMappingId"],
		},
		events: {
			emits: [
				"toast.order.synced",
				"toast.menu.synced",
				"toast.inventory.updated",
				"toast.webhook.received",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createToastController(ctx.data, ctx.events, provider);
			return { controllers: { toast: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/toast",
					component: "ToastAdmin",
					label: "Toast POS",
					icon: "Utensils",
					group: "Sales",
				},
			],
		},
		options,
	};
}
