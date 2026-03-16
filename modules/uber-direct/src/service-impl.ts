import type { ModuleDataService } from "@86d-app/core";
import type {
	CreateDeliveryParams,
	Delivery,
	DeliveryStats,
	Quote,
	RequestQuoteParams,
	UberDirectController,
} from "./service";

export function createUberDirectController(
	data: ModuleDataService,
): UberDirectController {
	return {
		async requestQuote(params: RequestQuoteParams): Promise<Quote> {
			const id = crypto.randomUUID();
			const now = new Date();
			const fee = Math.round(500 + Math.random() * 1500);
			const estimatedMinutes = Math.round(15 + Math.random() * 45);
			const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

			const quote: Quote = {
				id,
				pickupAddress: params.pickupAddress,
				dropoffAddress: params.dropoffAddress,
				fee,
				estimatedMinutes,
				expiresAt,
				status: "active",
				createdAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any for JSONB
			await data.upsert("quote", id, quote as Record<string, any>);
			return quote;
		},

		async createDelivery(
			params: CreateDeliveryParams,
		): Promise<Delivery | null> {
			const quoteRaw = await data.get("quote", params.quoteId);
			if (!quoteRaw) return null;

			const quote = quoteRaw as unknown as Quote;

			if (quote.status !== "active") return null;
			if (new Date() > quote.expiresAt) return null;

			// Mark quote as used
			const usedQuote: Quote = { ...quote, status: "used" };
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("quote", quote.id, usedQuote as Record<string, any>);

			const id = crypto.randomUUID();
			const now = new Date();

			const delivery: Delivery = {
				id,
				orderId: params.orderId,
				status: "pending",
				pickupAddress: quote.pickupAddress,
				dropoffAddress: quote.dropoffAddress,
				pickupNotes: params.pickupNotes,
				dropoffNotes: params.dropoffNotes,
				fee: quote.fee,
				tip: params.tip ?? 0,
				metadata: params.metadata ?? {},
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("delivery", id, delivery as Record<string, any>);
			return delivery;
		},

		async getDelivery(id: string): Promise<Delivery | null> {
			const raw = await data.get("delivery", id);
			if (!raw) return null;
			return raw as unknown as Delivery;
		},

		async cancelDelivery(id: string): Promise<Delivery | null> {
			const raw = await data.get("delivery", id);
			if (!raw) return null;

			const delivery = raw as unknown as Delivery;

			if (
				delivery.status === "delivered" ||
				delivery.status === "cancelled" ||
				delivery.status === "failed"
			) {
				return null;
			}

			const updated: Delivery = {
				...delivery,
				status: "cancelled",
				updatedAt: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("delivery", id, updated as Record<string, any>);
			return updated;
		},

		async updateDeliveryStatus(id, status, updates): Promise<Delivery | null> {
			const raw = await data.get("delivery", id);
			if (!raw) return null;

			const delivery = raw as unknown as Delivery;
			const now = new Date();

			const updated: Delivery = {
				...delivery,
				status,
				...(updates?.externalId !== undefined
					? { externalId: updates.externalId }
					: {}),
				...(updates?.trackingUrl !== undefined
					? { trackingUrl: updates.trackingUrl }
					: {}),
				...(updates?.courierName !== undefined
					? { courierName: updates.courierName }
					: {}),
				...(updates?.courierPhone !== undefined
					? { courierPhone: updates.courierPhone }
					: {}),
				...(updates?.courierVehicle !== undefined
					? { courierVehicle: updates.courierVehicle }
					: {}),
				...(updates?.actualPickupTime !== undefined
					? { actualPickupTime: updates.actualPickupTime }
					: {}),
				...(updates?.actualDeliveryTime !== undefined
					? { actualDeliveryTime: updates.actualDeliveryTime }
					: {}),
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("delivery", id, updated as Record<string, any>);
			return updated;
		},

		async listDeliveries(params): Promise<Delivery[]> {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;
			if (params?.orderId) where.orderId = params.orderId;

			const results = await data.findMany("delivery", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return results as unknown as Delivery[];
		},

		async getQuote(id: string): Promise<Quote | null> {
			const raw = await data.get("quote", id);
			if (!raw) return null;
			return raw as unknown as Quote;
		},

		async listQuotes(params): Promise<Quote[]> {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const results = await data.findMany("quote", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return results as unknown as Quote[];
		},

		async getDeliveryStats(): Promise<DeliveryStats> {
			const allDeliveries = (await data.findMany(
				"delivery",
				{},
			)) as unknown as Delivery[];

			let totalPending = 0;
			let totalAccepted = 0;
			let totalPickedUp = 0;
			let totalDelivered = 0;
			let totalCancelled = 0;
			let totalFailed = 0;
			let totalFees = 0;
			let totalTips = 0;

			for (const d of allDeliveries) {
				totalFees += d.fee;
				totalTips += d.tip;

				switch (d.status) {
					case "pending":
					case "quoted":
						totalPending++;
						break;
					case "accepted":
						totalAccepted++;
						break;
					case "picked-up":
						totalPickedUp++;
						break;
					case "delivered":
						totalDelivered++;
						break;
					case "cancelled":
						totalCancelled++;
						break;
					case "failed":
						totalFailed++;
						break;
				}
			}

			return {
				totalDeliveries: allDeliveries.length,
				totalPending,
				totalAccepted,
				totalPickedUp,
				totalDelivered,
				totalCancelled,
				totalFailed,
				totalFees,
				totalTips,
			};
		},
	};
}
