import type { ModuleDataService } from "@86d-app/core";
import type {
	CheckoutController,
	CheckoutLineItem,
	CheckoutSession,
} from "./service";

/** Default session TTL: 30 minutes */
const DEFAULT_TTL_MS = 30 * 60 * 1000;

/**
 * Bridge typed checkout objects to the data service's Record<string, unknown>
 * format. The data service stores JSONB — this cast is safe for plain objects.
 */
function toRecord(obj: object): Record<string, unknown> {
	return obj as Record<string, unknown>;
}

/** Centralized total calculation — never negative */
function calculateTotal(session: {
	subtotal: number;
	taxAmount: number;
	shippingAmount: number;
	discountAmount: number;
	giftCardAmount: number;
}): number {
	return Math.max(
		0,
		session.subtotal +
			session.taxAmount +
			session.shippingAmount -
			session.discountAmount -
			session.giftCardAmount,
	);
}

export function createCheckoutController(
	data: ModuleDataService,
): CheckoutController {
	return {
		async create(params): Promise<CheckoutSession> {
			const id = params.id ?? crypto.randomUUID();
			const now = new Date();
			const ttl = params.ttl ?? DEFAULT_TTL_MS;

			const session: CheckoutSession = {
				id,
				cartId: params.cartId,
				customerId: params.customerId,
				guestEmail: params.guestEmail,
				status: "pending",
				subtotal: params.subtotal,
				taxAmount: params.taxAmount ?? 0,
				shippingAmount: params.shippingAmount ?? 0,
				discountAmount: params.discountAmount ?? 0,
				giftCardAmount: params.giftCardAmount ?? 0,
				total: params.total,
				currency: params.currency ?? "USD",
				shippingAddress: params.shippingAddress,
				billingAddress: params.billingAddress,
				metadata: params.metadata ?? {},
				expiresAt: new Date(now.getTime() + ttl),
				createdAt: now,
				updatedAt: now,
			};

			await data.upsert("checkoutSession", id, toRecord(session));

			// Store line items
			for (const item of params.lineItems) {
				const itemRecord = { ...item, sessionId: id };
				await data.upsert(
					"checkoutLineItem",
					`${id}_${item.productId}${item.variantId ? `_${item.variantId}` : ""}`,
					toRecord(itemRecord),
				);
			}

			return session;
		},

		async getById(id: string): Promise<CheckoutSession | null> {
			return (await data.get("checkoutSession", id)) as CheckoutSession | null;
		},

		async update(id: string, params): Promise<CheckoutSession | null> {
			const existing = (await data.get(
				"checkoutSession",
				id,
			)) as CheckoutSession | null;
			if (
				!existing ||
				existing.status === "completed" ||
				existing.status === "expired"
			) {
				return null;
			}

			const merged = {
				...existing,
				...(params.guestEmail !== undefined
					? { guestEmail: params.guestEmail }
					: {}),
				...(params.shippingAddress !== undefined
					? { shippingAddress: params.shippingAddress }
					: {}),
				...(params.billingAddress !== undefined
					? { billingAddress: params.billingAddress }
					: {}),
				...(params.shippingAmount !== undefined
					? { shippingAmount: params.shippingAmount }
					: {}),
				...(params.shippingMethodName !== undefined
					? { shippingMethodName: params.shippingMethodName }
					: {}),
				...(params.taxAmount !== undefined
					? { taxAmount: params.taxAmount }
					: {}),
				...(params.paymentMethod !== undefined
					? { paymentMethod: params.paymentMethod }
					: {}),
				...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
			};

			// Recalculate total when any amount field changes
			const amountsChanged =
				params.shippingAmount !== undefined || params.taxAmount !== undefined;

			const updated: CheckoutSession = {
				...merged,
				total: amountsChanged ? calculateTotal(merged) : merged.total,
				updatedAt: new Date(),
			};

			await data.upsert("checkoutSession", id, toRecord(updated));
			return updated;
		},

		async applyDiscount(
			id: string,
			params: { code: string; discountAmount: number; freeShipping: boolean },
		): Promise<CheckoutSession | null> {
			const existing = (await data.get(
				"checkoutSession",
				id,
			)) as CheckoutSession | null;
			if (
				!existing ||
				existing.status === "completed" ||
				existing.status === "expired"
			) {
				return null;
			}

			const shippingAmount = params.freeShipping ? 0 : existing.shippingAmount;

			const updated: CheckoutSession = {
				...existing,
				discountCode: params.code,
				discountAmount: params.discountAmount,
				shippingAmount,
				total: calculateTotal({
					...existing,
					shippingAmount,
					discountAmount: params.discountAmount,
				}),
				updatedAt: new Date(),
			};

			await data.upsert("checkoutSession", id, toRecord(updated));
			return updated;
		},

		async removeDiscount(id: string): Promise<CheckoutSession | null> {
			const existing = (await data.get(
				"checkoutSession",
				id,
			)) as CheckoutSession | null;
			if (
				!existing ||
				existing.status === "completed" ||
				existing.status === "expired"
			) {
				return null;
			}

			const updated: CheckoutSession = {
				...existing,
				discountCode: undefined,
				discountAmount: 0,
				total: calculateTotal({
					...existing,
					discountAmount: 0,
				}),
				updatedAt: new Date(),
			};

			await data.upsert("checkoutSession", id, toRecord(updated));
			return updated;
		},

		async applyGiftCard(
			id: string,
			params: { code: string; giftCardAmount: number },
		): Promise<CheckoutSession | null> {
			const existing = (await data.get(
				"checkoutSession",
				id,
			)) as CheckoutSession | null;
			if (
				!existing ||
				existing.status === "completed" ||
				existing.status === "expired"
			) {
				return null;
			}

			const updated: CheckoutSession = {
				...existing,
				giftCardCode: params.code,
				giftCardAmount: params.giftCardAmount,
				total: calculateTotal({
					...existing,
					giftCardAmount: params.giftCardAmount,
				}),
				updatedAt: new Date(),
			};

			await data.upsert("checkoutSession", id, toRecord(updated));
			return updated;
		},

		async removeGiftCard(id: string): Promise<CheckoutSession | null> {
			const existing = (await data.get(
				"checkoutSession",
				id,
			)) as CheckoutSession | null;
			if (
				!existing ||
				existing.status === "completed" ||
				existing.status === "expired"
			) {
				return null;
			}

			const updated: CheckoutSession = {
				...existing,
				giftCardCode: undefined,
				giftCardAmount: 0,
				total: calculateTotal({
					...existing,
					giftCardAmount: 0,
				}),
				updatedAt: new Date(),
			};

			await data.upsert("checkoutSession", id, toRecord(updated));
			return updated;
		},

		async confirm(
			id: string,
		): Promise<
			{ session: CheckoutSession } | { error: string; status: number }
		> {
			const existing = (await data.get(
				"checkoutSession",
				id,
			)) as CheckoutSession | null;
			if (!existing) {
				return { error: "Checkout session not found", status: 404 };
			}
			if (existing.status !== "pending") {
				return {
					error: `Cannot confirm session in "${existing.status}" status`,
					status: 422,
				};
			}

			// Require customer identification
			if (!existing.customerId && !existing.guestEmail) {
				return {
					error: "Customer ID or guest email is required",
					status: 422,
				};
			}

			// Require shipping address
			if (!existing.shippingAddress) {
				return { error: "Shipping address is required", status: 422 };
			}

			// Require at least one line item
			const items = (await data.findMany("checkoutLineItem", {
				where: { sessionId: id },
			})) as Array<CheckoutLineItem & { sessionId: string }>;
			if (items.length === 0) {
				return {
					error: "Checkout session has no line items",
					status: 422,
				};
			}

			const updated: CheckoutSession = {
				...existing,
				status: "processing",
				updatedAt: new Date(),
			};

			await data.upsert("checkoutSession", id, toRecord(updated));
			return { session: updated };
		},

		async setPaymentIntent(
			id: string,
			intentId: string,
			status: string,
		): Promise<CheckoutSession | null> {
			const existing = (await data.get(
				"checkoutSession",
				id,
			)) as CheckoutSession | null;
			if (
				!existing ||
				existing.status === "completed" ||
				existing.status === "expired"
			) {
				return null;
			}

			const updated: CheckoutSession = {
				...existing,
				paymentIntentId: intentId,
				paymentStatus: status,
				updatedAt: new Date(),
			};

			await data.upsert("checkoutSession", id, toRecord(updated));
			return updated;
		},

		async complete(
			id: string,
			orderId: string,
		): Promise<CheckoutSession | null> {
			const existing = (await data.get(
				"checkoutSession",
				id,
			)) as CheckoutSession | null;
			if (
				!existing ||
				(existing.status !== "pending" && existing.status !== "processing")
			) {
				return null;
			}

			const updated: CheckoutSession = {
				...existing,
				status: "completed",
				orderId,
				updatedAt: new Date(),
			};

			await data.upsert("checkoutSession", id, toRecord(updated));
			return updated;
		},

		async abandon(id: string): Promise<CheckoutSession | null> {
			const existing = (await data.get(
				"checkoutSession",
				id,
			)) as CheckoutSession | null;
			if (!existing || existing.status === "completed") {
				return null;
			}

			const updated: CheckoutSession = {
				...existing,
				status: "abandoned",
				updatedAt: new Date(),
			};

			await data.upsert("checkoutSession", id, toRecord(updated));
			return updated;
		},

		async getLineItems(sessionId: string): Promise<CheckoutLineItem[]> {
			const results = (await data.findMany("checkoutLineItem", {
				where: { sessionId },
			})) as Array<CheckoutLineItem & { sessionId: string }>;

			return results.map(({ sessionId: _sid, ...item }) => item);
		},

		async listSessions(params: {
			status?: string | undefined;
			search?: string | undefined;
			take?: number | undefined;
			skip?: number | undefined;
		}): Promise<{ sessions: CheckoutSession[]; total: number }> {
			const take = params.take ?? 20;
			const skip = params.skip ?? 0;

			const where: Record<string, string> = {};
			if (params.status) {
				where.status = params.status;
			}

			const findOpts: {
				orderBy: Record<string, "asc" | "desc">;
				where?: Record<string, string>;
			} = {
				orderBy: { createdAt: "desc" },
			};
			if (Object.keys(where).length > 0) {
				findOpts.where = where;
			}
			const allSessions = (await data.findMany(
				"checkoutSession",
				findOpts,
			)) as CheckoutSession[];

			// Client-side search filter (email or session ID prefix)
			let filtered = allSessions;
			if (params.search) {
				const q = params.search.toLowerCase();
				filtered = allSessions.filter(
					(s) =>
						s.id.toLowerCase().includes(q) ||
						s.guestEmail?.toLowerCase().includes(q) ||
						s.customerId?.toLowerCase().includes(q),
				);
			}

			const total = filtered.length;
			const sessions = filtered.slice(skip, skip + take);

			return { sessions, total };
		},

		async getStats(): Promise<{
			total: number;
			pending: number;
			processing: number;
			completed: number;
			abandoned: number;
			expired: number;
			conversionRate: number;
			totalRevenue: number;
			averageOrderValue: number;
		}> {
			const allSessions = (await data.findMany(
				"checkoutSession",
				{},
			)) as CheckoutSession[];

			const total = allSessions.length;
			let pending = 0;
			let processing = 0;
			let completed = 0;
			let abandoned = 0;
			let expired = 0;
			let totalRevenue = 0;

			for (const s of allSessions) {
				switch (s.status) {
					case "pending":
						pending++;
						break;
					case "processing":
						processing++;
						break;
					case "completed":
						completed++;
						totalRevenue += s.total;
						break;
					case "abandoned":
						abandoned++;
						break;
					case "expired":
						expired++;
						break;
				}
			}

			// Conversion rate: completed / (completed + abandoned + expired)
			const terminatedCount = completed + abandoned + expired;
			const conversionRate =
				terminatedCount > 0 ? completed / terminatedCount : 0;
			const averageOrderValue = completed > 0 ? totalRevenue / completed : 0;

			return {
				total,
				pending,
				processing,
				completed,
				abandoned,
				expired,
				conversionRate,
				totalRevenue,
				averageOrderValue,
			};
		},

		async expireStale(): Promise<{
			expired: number;
			processingSessions: CheckoutSession[];
		}> {
			const now = new Date();
			let expired = 0;
			const processingSessions: CheckoutSession[] = [];

			// Scan both pending and processing sessions for expiration
			for (const status of ["pending", "processing"] as const) {
				const all = (await data.findMany("checkoutSession", {
					where: { status },
				})) as CheckoutSession[];

				for (const session of all) {
					if (new Date(session.expiresAt) < now) {
						const updated: CheckoutSession = {
							...session,
							status: "expired",
							updatedAt: now,
						};
						await data.upsert("checkoutSession", session.id, toRecord(updated));
						if (status === "processing") {
							processingSessions.push(session);
						}
						expired++;
					}
				}
			}

			return { expired, processingSessions };
		},
	};
}
