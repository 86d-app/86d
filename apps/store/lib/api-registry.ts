/**
 * Shared module registry boot logic for API routes.
 * Used by the catch-all API route and the store-markdown route.
 */

import { ModuleRegistry } from "@86d-app/runtime/registry";
import { UniversalDataService } from "@86d-app/runtime/universal-data-service";
import { db, Prisma } from "db";
import env from "env";
import { logger } from "utils/logger";
import { modules } from "../generated/api";

let registry: ModuleRegistry | null = null;
let bootPromise: Promise<void> | null = null;
let subscribersRegistered = false;

function getRegistry(): ModuleRegistry {
	const storeId = env.STORE_ID;
	if (!storeId) {
		throw new Error("STORE_ID not configured");
	}
	if (!registry) {
		registry = new ModuleRegistry(modules, storeId, {
			resolveStoreId: async (id) => {
				const store = await db.store.findUnique({
					where: { id },
					select: { id: true },
				});
				if (!store) {
					throw new Error(`Store not found for STORE_ID: ${id}`);
				}
				return store.id;
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
						settings: params.options
							? JSON.stringify(params.options)
							: Prisma.JsonNull,
					},
					update: {
						version: params.version,
						settings: params.options
							? JSON.stringify(params.options)
							: Prisma.JsonNull,
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
		});
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
			throw err;
		});
	}
	await bootPromise;

	if (!subscribersRegistered) {
		subscribersRegistered = true;
		const bus = reg.getEventBus();
		if (bus) {
			// Email notifications
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
					const store = await db.store.findUnique({
						where: { id: storeId },
						select: { name: true, notificationSettings: true },
					});
					if (store) {
						storeName = store.name;
						const settings = parseNotificationSettings(
							store.notificationSettings,
						);
						if (settings.fromAddress) {
							fromAddress = settings.fromAddress;
						}
						if (settings.adminEmail) {
							adminEmail = settings.adminEmail;
						}
						// Build set of enabled events
						if (settings.events && Object.keys(settings.events).length > 0) {
							enabledEvents = new Set<string>();
							for (const evt of NOTIFICATION_EVENT_TYPES) {
								if (isEventEnabled(settings, evt)) {
									enabledEvents.add(evt);
								}
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
				logger.warn("Email notifications disabled", {
					reason: err instanceof Error ? err.message : String(err),
				});
			}

			// Webhook delivery
			try {
				const storeId = env.STORE_ID;
				if (storeId) {
					const { registerWebhookHandlers } = await import(
						"./webhook-subscriber"
					);
					// biome-ignore lint/suspicious/noExplicitAny: DB type narrowed to webhook subset in subscriber
					registerWebhookHandlers(bus, db as any, storeId);
				}
			} catch (err) {
				logger.warn("Webhook delivery disabled", {
					reason: err instanceof Error ? err.message : String(err),
				});
			}
		}
	}

	return reg;
}
