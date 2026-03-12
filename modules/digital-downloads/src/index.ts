import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { digitalDownloadsSchema } from "./schema";
import { createDigitalDownloadsController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	DigitalDownloadsController,
	DownloadableFile,
	DownloadToken,
} from "./service";

export interface DigitalDownloadsOptions extends ModuleConfig {
	/** Default token expiry in days (0 = never) */
	defaultTokenExpiryDays?: number;
	/** Default max downloads per token (0 = unlimited) */
	defaultMaxDownloads?: number;
}

export default function digitalDownloads(
	options?: DigitalDownloadsOptions,
): Module {
	return {
		id: "digital-downloads",
		version: "0.0.1",
		schema: digitalDownloadsSchema,
		exports: {
			read: ["downloadFiles", "downloadTokens"],
		},
		events: {
			emits: ["download.purchased", "download.accessed"],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createDigitalDownloadsController(ctx.data);
			return { controllers: { "digital-downloads": controller } };
		},
		search: { store: "/digital-downloads/store-search" },
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/downloads",
					component: "DownloadsAdmin",
					label: "Downloads",
					icon: "Download",
					group: "Sales",
				},
			],
		},
		store: {
			pages: [
				{
					path: "/downloads",
					component: "MyDownloads",
				},
			],
		},
		options,
	};
}
