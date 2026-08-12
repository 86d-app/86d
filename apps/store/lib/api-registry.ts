/**
 * Shared module registry boot logic for API routes.
 * Used by the catch-all API route and the store-markdown route.
 */

import type { Primitive } from "@86d-app/core";
import { ModuleRegistry } from "@86d-app/runtime/registry";
import { UniversalDataService } from "@86d-app/runtime/universal-data-service";
import { getStoreConfig } from "@86d-app/sdk";
import { db, Prisma } from "db";
import env from "env";
import { logger } from "utils/logger";
import { modules } from "../generated/api";
import { resolveTemplatePath } from "./template-path";

function isPrimitive(v: unknown): v is Primitive {
	return (
		v === null ||
		v === undefined ||
		typeof v === "string" ||
		typeof v === "number" ||
		typeof v === "boolean" ||
		typeof v === "symbol" ||
		typeof v === "bigint"
	);
}

function toPrimitiveRecord(
	obj: Record<string, unknown>,
): Record<string, Primitive> {
	const result: Record<string, Primitive> = {};
	for (const [k, v] of Object.entries(obj)) {
		if (isPrimitive(v)) result[k] = v;
	}
	return result;
}

let registry: ModuleRegistry | null = null;
let bootPromise: Promise<void> | null = null;
let subscribersRegistered = false;

function getRegistry(): ModuleRegistry {
	const storeId = env.STORE_ID;
	if (!storeId) {
		throw new Error("STORE_ID not configured");
	}
	if (!registry) {
		// Mutable options object shared with the registry. The resolveStoreId
		// callback merges in platform-configured options before modules init,
		// allowing dashboard settings to flow into running module instances.
		const platformOptions: Record<string, Record<string, Primitive>> = {};

		registry = new ModuleRegistry(
			modules,
			storeId,
			{
				resolveStoreId: async (id) => {
					const config = await getStoreConfig({
						storeId: id,
						templatePath: resolveTemplatePath(),
						fallbackToTemplateOnError: true,
					});
					// Merge platform-configured module options in-place so the registry
					// picks them up before module init() callbacks run.
					if (
						config.moduleOptions &&
						typeof config.moduleOptions === "object"
					) {
						for (const [modId, opts] of Object.entries(config.moduleOptions)) {
							if (opts && typeof opts === "object" && !Array.isArray(opts)) {
								platformOptions[modId] = toPrimitiveRecord(
									opts as Record<string, unknown>,
								);
							}
						}
					}
					return id;
				},
				upsertModuleRecord: async (params) => {
					const record = await db.module.upsert({
						where: {
							storeId_name: {
								storeId: params.storeId,
								name: params.moduleId,
							},
						},
						create: {
							name: params.moduleId,
							version: params.version,
							storeId: params.storeId,
							// Write factory defaults on first creation only. User-configured
							// settings (saved via the dashboard) must not be overwritten on
							// subsequent boots — only the version is updated on UPDATE.
							settings: params.options
								? JSON.stringify(params.options)
								: Prisma.JsonNull,
						},
						update: {
							version: params.version,
						},
					});
					return record.id;
				},
				createDataService: (params) =>
					new UniversalDataService({
						db,
						storeId: params.storeId,
						moduleId: params.moduleDbId,
					}),
			},
			platformOptions,
		);
	}
	return registry;
}

export async function ensureBooted(): Promise<ModuleRegistry> {
	const reg = getRegistry();
	if (reg.isReady()) {
		return reg;
	}
	if (!bootPromise) {
		bootPromise = reg.boot().catch((err) => {
			registry = null;
			bootPromise = null;
			subscribersRegistered = false;
			throw err;
		});
	}
	await bootPromise;

	if (!subscribersRegistered) {
		const bus = reg.getEventBus();
		if (bus) {
			// Email notifications
			if (!process.env.RESEND_API_KEY) {
				logger.debug("Email notifications disabled (RESEND_API_KEY not set)");
			} else {
				try {
					const [
						{ registerNotificationHandlers },
						{ default: resend },
						{
							parseNotificationSettings,
							isEventEnabled,
							NOTIFICATION_EVENT_TYPES,
						},
					] = await Promise.all([
						import("./notifications"),
						import("emails"),
						import("lib/notification-settings"),
					]);

					const storeId = env.STORE_ID;
					let storeName = "Our Store";
					let fromAddress: string | undefined;
					let adminEmail: string | undefined;
					let enabledEvents: Set<string> | undefined;

					if (storeId) {
						const config = await getStoreConfig({
							storeId,
							templatePath: resolveTemplatePath(),
							fallbackToTemplateOnError: true,
						});
						storeName = config.name ?? "Our Store";
						const settings = config.notificationSettings
							? parseNotificationSettings(config.notificationSettings)
							: {};
						if (settings.fromAddress) {
							fromAddress = settings.fromAddress;
						}
						if (settings.adminEmail) {
							adminEmail = settings.adminEmail;
						}
						if (settings.events && Object.keys(settings.events).length > 0) {
							enabledEvents = new Set<string>();
							for (const evt of NOTIFICATION_EVENT_TYPES) {
								if (isEventEnabled(settings, evt)) {
									enabledEvents.add(evt);
								}
							}
						}
					}

					registerNotificationHandlers(
						bus,
						resend,
						{
							storeName,
							fromAddress: fromAddress ?? `${storeName} <orders@86d.app>`,
							adminEmail,
						},
						enabledEvents,
					);
				} catch (err) {
					logger.warn("Email notifications failed", {
						reason: err instanceof Error ? err.message : String(err),
					});
				}
			}

			// Webhook delivery
			try {
				const storeId = env.STORE_ID;
				if (storeId) {
					const { registerWebhookHandlers } = await import(
						"./webhook-subscriber"
					);
					registerWebhookHandlers(bus, db, storeId);
				}
			} catch (err) {
				logger.warn("Webhook delivery disabled", {
					reason: err instanceof Error ? err.message : String(err),
				});
			}
		}
		subscribersRegistered = true;
	}

	return reg;
}
