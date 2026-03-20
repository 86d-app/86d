import type { ModuleDataService } from "@86d-app/core";
import type {
	AddNoteParams,
	CreateFulfillmentParams,
	CreateOrderParams,
	CreateReturnParams,
	Fulfillment,
	FulfillmentItem,
	FulfillmentWithItems,
	InvoiceData,
	Order,
	OrderAddress,
	OrderController,
	OrderFulfillmentStatus,
	OrderItem,
	OrderNote,
	OrderStatus,
	OrderWithDetails,
	PaymentStatus,
	ReorderItem,
	ReturnItem,
	ReturnRequest,
	ReturnRequestWithItems,
	ReturnStatus,
	UpdateFulfillmentParams,
	UpdateReturnParams,
} from "./service";

/** Generate a sequential-looking order number */
function generateOrderNumber(): string {
	const timestamp = Date.now().toString(36).toUpperCase();
	const random = Math.random().toString(36).substring(2, 6).toUpperCase();
	return `ORD-${timestamp}-${random}`;
}

/** Status transitions — which statuses can transition to which */
const CANCELLABLE_STATUSES: OrderStatus[] = [
	"pending",
	"processing",
	"on_hold",
];

/** Generate an invoice number from order number and date */
function generateInvoiceNumber(orderNumber: string, date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	const suffix = orderNumber.replace(/^ORD-/i, "");
	return `INV-${y}${m}${d}-${suffix}`;
}

/** Determine invoice status from payment + order status */
function resolveInvoiceStatus(
	paymentStatus: string,
	orderStatus: string,
): InvoiceData["status"] {
	if (orderStatus === "cancelled" || orderStatus === "refunded") return "void";
	if (paymentStatus === "paid") return "paid";
	if (paymentStatus === "refunded" || paymentStatus === "voided") return "void";
	return "issued";
}

/** Format a date for display on invoices */
function formatInvoiceDate(date: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(date);
}

/** Auto-generate tracking URL from carrier name and tracking number */
const CARRIER_TRACKING_URLS: Record<string, (num: string) => string> = {
	ups: (n) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`,
	usps: (n) =>
		`https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`,
	fedex: (n) =>
		`https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`,
	dhl: (n) =>
		`https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(n)}`,
};

function inferTrackingUrl(
	carrier: string | undefined,
	trackingNumber: string | undefined,
): string | undefined {
	if (!carrier || !trackingNumber) return undefined;
	const gen = CARRIER_TRACKING_URLS[carrier.toLowerCase()];
	return gen ? gen(trackingNumber) : undefined;
}

export function createOrderController(
	data: ModuleDataService,
): OrderController {
	return {
		async create(params: CreateOrderParams): Promise<Order> {
			const id = params.id ?? crypto.randomUUID();
			const orderNumber = generateOrderNumber();
			const now = new Date();

			const order: Order = {
				id,
				orderNumber,
				customerId: params.customerId,
				guestEmail: params.guestEmail,
				status: "pending",
				paymentStatus: params.paymentStatus ?? "unpaid",
				subtotal: params.subtotal,
				taxAmount: params.taxAmount ?? 0,
				shippingAmount: params.shippingAmount ?? 0,
				discountAmount: params.discountAmount ?? 0,
				giftCardAmount: params.giftCardAmount ?? 0,
				total: params.total,
				currency: params.currency ?? "USD",
				notes: params.notes,
				metadata: params.metadata ?? {},
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("order", id, order as Record<string, any>);

			// Create order items
			for (const item of params.items) {
				const orderItem: OrderItem = {
					id: crypto.randomUUID(),
					orderId: id,
					productId: item.productId,
					variantId: item.variantId,
					name: item.name,
					sku: item.sku,
					price: item.price,
					quantity: item.quantity,
					subtotal: item.price * item.quantity,
					metadata: {},
				};
				await data.upsert(
					"orderItem",
					orderItem.id,
					// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
					orderItem as unknown as Record<string, any>,
				);
			}

			// Create billing address
			if (params.billingAddress) {
				const addr: OrderAddress = {
					id: crypto.randomUUID(),
					orderId: id,
					type: "billing",
					...params.billingAddress,
				};
				// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
				await data.upsert("orderAddress", addr.id, addr as Record<string, any>);
			}

			// Create shipping address
			if (params.shippingAddress) {
				const addr: OrderAddress = {
					id: crypto.randomUUID(),
					orderId: id,
					type: "shipping",
					...params.shippingAddress,
				};
				// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
				await data.upsert("orderAddress", addr.id, addr as Record<string, any>);
			}

			return order;
		},

		async getById(id: string): Promise<OrderWithDetails | null> {
			const order = (await data.get("order", id)) as Order | null;
			if (!order) return null;

			const items = (await data.findMany("orderItem", {
				where: { orderId: id },
			})) as OrderItem[];

			const addresses = (await data.findMany("orderAddress", {
				where: { orderId: id },
			})) as OrderAddress[];

			return { ...order, items, addresses };
		},

		async getByOrderNumber(
			orderNumber: string,
		): Promise<OrderWithDetails | null> {
			const orders = (await data.findMany("order", {
				where: { orderNumber },
				take: 1,
			})) as Order[];

			const order = orders[0];
			if (!order) return null;

			return this.getById(order.id);
		},

		async listForCustomer(
			customerId: string,
			params?: { limit?: number; offset?: number },
		): Promise<{ orders: Order[]; total: number }> {
			const all = (await data.findMany("order", {
				where: { customerId },
			})) as Order[];

			all.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);

			const limit = params?.limit ?? 20;
			const offset = params?.offset ?? 0;

			return {
				orders: all.slice(offset, offset + limit),
				total: all.length,
			};
		},

		async list(params): Promise<{ orders: Order[]; total: number }> {
			const { limit = 20, offset = 0, search, status, paymentStatus } = params;

			// Push status/paymentStatus filters to DB; text search stays client-side
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (status) where.status = status;
			if (paymentStatus) where.paymentStatus = paymentStatus;

			const all = (await data.findMany("order", {
				...(Object.keys(where).length > 0 ? { where } : {}),
			})) as Order[];

			const filtered = search
				? all.filter((o) => {
						const q = search.toLowerCase();
						return (
							o.orderNumber.toLowerCase().includes(q) ||
							(o.guestEmail?.toLowerCase().includes(q) ?? false) ||
							(o.customerId?.toLowerCase().includes(q) ?? false)
						);
					})
				: all;

			filtered.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);

			return {
				orders: filtered.slice(offset, offset + limit),
				total: filtered.length,
			};
		},

		async listForExport(params): Promise<{
			orders: OrderWithDetails[];
			total: number;
		}> {
			const {
				limit = 500,
				offset = 0,
				search,
				status,
				paymentStatus,
				dateFrom,
				dateTo,
			} = params;

			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (status) where.status = status;
			if (paymentStatus) where.paymentStatus = paymentStatus;

			const all = (await data.findMany("order", {
				...(Object.keys(where).length > 0 ? { where } : {}),
			})) as Order[];

			let filtered = search
				? all.filter((o) => {
						const q = search.toLowerCase();
						return (
							o.orderNumber.toLowerCase().includes(q) ||
							(o.guestEmail?.toLowerCase().includes(q) ?? false) ||
							(o.customerId?.toLowerCase().includes(q) ?? false)
						);
					})
				: all;

			if (dateFrom) {
				const from = dateFrom.getTime();
				filtered = filtered.filter(
					(o) => new Date(o.createdAt).getTime() >= from,
				);
			}
			if (dateTo) {
				const to = dateTo.getTime();
				filtered = filtered.filter(
					(o) => new Date(o.createdAt).getTime() <= to,
				);
			}

			filtered.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);

			const paged = filtered.slice(offset, offset + limit);

			const ordersWithDetails: OrderWithDetails[] = [];
			for (const order of paged) {
				const items = (await data.findMany("orderItem", {
					where: { orderId: order.id },
				})) as OrderItem[];
				const addresses = (await data.findMany("orderAddress", {
					where: { orderId: order.id },
				})) as OrderAddress[];
				ordersWithDetails.push({ ...order, items, addresses });
			}

			return { orders: ordersWithDetails, total: filtered.length };
		},

		async updateStatus(id: string, status: OrderStatus): Promise<Order | null> {
			const existing = (await data.get("order", id)) as Order | null;
			if (!existing) return null;

			const updated: Order = { ...existing, status, updatedAt: new Date() };
			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("order", id, updated as Record<string, any>);
			return updated;
		},

		async updatePaymentStatus(
			id: string,
			paymentStatus: PaymentStatus,
		): Promise<Order | null> {
			const existing = (await data.get("order", id)) as Order | null;
			if (!existing) return null;

			const updated: Order = {
				...existing,
				paymentStatus,
				updatedAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("order", id, updated as Record<string, any>);
			return updated;
		},

		async update(
			id: string,
			params: { notes?: string; metadata?: Record<string, unknown> },
		): Promise<Order | null> {
			const existing = (await data.get("order", id)) as Order | null;
			if (!existing) return null;

			const updated: Order = {
				...existing,
				...(params.notes !== undefined ? { notes: params.notes } : {}),
				...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
				updatedAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("order", id, updated as Record<string, any>);
			return updated;
		},

		async cancel(id: string): Promise<Order | null> {
			const existing = (await data.get("order", id)) as Order | null;
			if (!existing) return null;

			if (!CANCELLABLE_STATUSES.includes(existing.status)) {
				return null; // Cannot cancel orders in terminal states
			}

			const updated: Order = {
				...existing,
				status: "cancelled",
				updatedAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("order", id, updated as Record<string, any>);
			return updated;
		},

		async delete(id: string): Promise<void> {
			await data.delete("order", id);
		},

		async getItems(orderId: string): Promise<OrderItem[]> {
			return (await data.findMany("orderItem", {
				where: { orderId },
			})) as OrderItem[];
		},

		async getAddresses(orderId: string): Promise<OrderAddress[]> {
			return (await data.findMany("orderAddress", {
				where: { orderId },
			})) as OrderAddress[];
		},

		async createFulfillment(
			params: CreateFulfillmentParams,
		): Promise<Fulfillment> {
			const id = crypto.randomUUID();
			const now = new Date();

			const trackingUrl =
				params.trackingUrl ??
				inferTrackingUrl(params.carrier, params.trackingNumber);

			const fulfillment: Fulfillment = {
				id,
				orderId: params.orderId,
				status: params.trackingNumber ? "shipped" : "pending",
				trackingNumber: params.trackingNumber,
				trackingUrl,
				carrier: params.carrier,
				notes: params.notes,
				shippedAt: params.trackingNumber ? now : undefined,
				deliveredAt: undefined,
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("fulfillment", id, fulfillment as Record<string, any>);

			for (const item of params.items) {
				const fulfillmentItem: FulfillmentItem = {
					id: crypto.randomUUID(),
					fulfillmentId: id,
					orderItemId: item.orderItemId,
					quantity: item.quantity,
				};
				await data.upsert(
					"fulfillmentItem",
					fulfillmentItem.id,
					// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
					fulfillmentItem as unknown as Record<string, any>,
				);
			}

			return fulfillment;
		},

		async getFulfillment(id: string): Promise<FulfillmentWithItems | null> {
			const fulfillment = (await data.get(
				"fulfillment",
				id,
			)) as Fulfillment | null;
			if (!fulfillment) return null;

			const items = (await data.findMany("fulfillmentItem", {
				where: { fulfillmentId: id },
			})) as FulfillmentItem[];

			return { ...fulfillment, items };
		},

		async listFulfillments(orderId: string): Promise<FulfillmentWithItems[]> {
			const fulfillments = (await data.findMany("fulfillment", {
				where: { orderId },
			})) as Fulfillment[];

			fulfillments.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);

			const result: FulfillmentWithItems[] = [];
			for (const f of fulfillments) {
				const items = (await data.findMany("fulfillmentItem", {
					where: { fulfillmentId: f.id },
				})) as FulfillmentItem[];
				result.push({ ...f, items });
			}
			return result;
		},

		async updateFulfillment(
			id: string,
			params: UpdateFulfillmentParams,
		): Promise<Fulfillment | null> {
			const existing = (await data.get(
				"fulfillment",
				id,
			)) as Fulfillment | null;
			if (!existing) return null;

			const trackingUrl =
				params.trackingUrl ??
				(params.trackingNumber || params.carrier
					? inferTrackingUrl(
							params.carrier ?? existing.carrier,
							params.trackingNumber ?? existing.trackingNumber,
						)
					: existing.trackingUrl);

			const updated: Fulfillment = {
				...existing,
				...(params.status !== undefined ? { status: params.status } : {}),
				...(params.trackingNumber !== undefined
					? { trackingNumber: params.trackingNumber }
					: {}),
				trackingUrl,
				...(params.carrier !== undefined ? { carrier: params.carrier } : {}),
				...(params.notes !== undefined ? { notes: params.notes } : {}),
				...(params.status === "shipped" && !existing.shippedAt
					? { shippedAt: new Date() }
					: {}),
				...(params.status === "delivered" && !existing.deliveredAt
					? { deliveredAt: new Date() }
					: {}),
				updatedAt: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("fulfillment", id, updated as Record<string, any>);
			return updated;
		},

		async deleteFulfillment(id: string): Promise<void> {
			// Delete fulfillment items first
			const items = (await data.findMany("fulfillmentItem", {
				where: { fulfillmentId: id },
			})) as FulfillmentItem[];
			for (const item of items) {
				await data.delete("fulfillmentItem", item.id);
			}
			await data.delete("fulfillment", id);
		},

		async getOrderFulfillmentStatus(
			orderId: string,
		): Promise<OrderFulfillmentStatus> {
			const orderItems = (await data.findMany("orderItem", {
				where: { orderId },
			})) as OrderItem[];

			if (orderItems.length === 0) return "unfulfilled";

			const fulfillments = (await data.findMany("fulfillment", {
				where: { orderId },
			})) as Fulfillment[];

			if (fulfillments.length === 0) return "unfulfilled";

			// Sum fulfilled quantities per order item
			const fulfilledQty: Record<string, number> = {};
			for (const f of fulfillments) {
				const fItems = (await data.findMany("fulfillmentItem", {
					where: { fulfillmentId: f.id },
				})) as FulfillmentItem[];
				for (const fi of fItems) {
					fulfilledQty[fi.orderItemId] =
						(fulfilledQty[fi.orderItemId] ?? 0) + fi.quantity;
				}
			}

			let allFulfilled = true;
			let anyFulfilled = false;
			for (const item of orderItems) {
				const qty = fulfilledQty[item.id] ?? 0;
				if (qty > 0) anyFulfilled = true;
				if (qty < item.quantity) allFulfilled = false;
			}

			if (allFulfilled) return "fulfilled";
			if (anyFulfilled) return "partially_fulfilled";
			return "unfulfilled";
		},

		// ── Return Request Methods ────────────────────────────────────────

		async createReturn(params: CreateReturnParams): Promise<ReturnRequest> {
			const id = crypto.randomUUID();
			const now = new Date();

			const returnRequest: ReturnRequest = {
				id,
				orderId: params.orderId,
				status: "requested",
				type: params.type ?? "refund",
				reason: params.reason,
				customerNotes: params.customerNotes,
				adminNotes: undefined,
				refundAmount: undefined,
				trackingNumber: undefined,
				trackingUrl: undefined,
				carrier: undefined,
				createdAt: now,
				updatedAt: now,
			};

			await data.upsert(
				"returnRequest",
				id,
				// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
				returnRequest as Record<string, any>,
			);

			for (const item of params.items) {
				const returnItem: ReturnItem = {
					id: crypto.randomUUID(),
					returnRequestId: id,
					orderItemId: item.orderItemId,
					quantity: item.quantity,
					reason: item.reason,
				};
				await data.upsert(
					"returnItem",
					returnItem.id,
					// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
					returnItem as unknown as Record<string, any>,
				);
			}

			return returnRequest;
		},

		async getReturn(id: string): Promise<ReturnRequestWithItems | null> {
			const returnRequest = (await data.get(
				"returnRequest",
				id,
			)) as ReturnRequest | null;
			if (!returnRequest) return null;

			const items = (await data.findMany("returnItem", {
				where: { returnRequestId: id },
			})) as ReturnItem[];

			return { ...returnRequest, items };
		},

		async listReturns(orderId: string): Promise<ReturnRequestWithItems[]> {
			const returns = (await data.findMany("returnRequest", {
				where: { orderId },
			})) as ReturnRequest[];

			returns.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);

			const result: ReturnRequestWithItems[] = [];
			for (const r of returns) {
				const items = (await data.findMany("returnItem", {
					where: { returnRequestId: r.id },
				})) as ReturnItem[];
				result.push({ ...r, items });
			}
			return result;
		},

		async listAllReturns(params): Promise<{
			returns: ReturnRequestWithItems[];
			total: number;
		}> {
			const { limit = 20, offset = 0, status } = params;

			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (status) where.status = status;

			const all = (await data.findMany("returnRequest", {
				...(Object.keys(where).length > 0 ? { where } : {}),
			})) as ReturnRequest[];

			all.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);

			const paged = all.slice(offset, offset + limit);
			const result: ReturnRequestWithItems[] = [];
			for (const r of paged) {
				const items = (await data.findMany("returnItem", {
					where: { returnRequestId: r.id },
				})) as ReturnItem[];
				result.push({ ...r, items });
			}

			return { returns: result, total: all.length };
		},

		async updateReturn(
			id: string,
			params: UpdateReturnParams,
		): Promise<ReturnRequest | null> {
			const existing = (await data.get(
				"returnRequest",
				id,
			)) as ReturnRequest | null;
			if (!existing) return null;

			const trackingUrl =
				params.trackingUrl ??
				(params.trackingNumber || params.carrier
					? inferTrackingUrl(
							params.carrier ?? existing.carrier,
							params.trackingNumber ?? existing.trackingNumber,
						)
					: existing.trackingUrl);

			const updated: ReturnRequest = {
				...existing,
				...(params.status !== undefined ? { status: params.status } : {}),
				...(params.adminNotes !== undefined
					? { adminNotes: params.adminNotes }
					: {}),
				...(params.refundAmount !== undefined
					? { refundAmount: params.refundAmount }
					: {}),
				...(params.trackingNumber !== undefined
					? { trackingNumber: params.trackingNumber }
					: {}),
				trackingUrl,
				...(params.carrier !== undefined ? { carrier: params.carrier } : {}),
				updatedAt: new Date(),
			};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("returnRequest", id, updated as Record<string, any>);
			return updated;
		},

		async deleteReturn(id: string): Promise<void> {
			const items = (await data.findMany("returnItem", {
				where: { returnRequestId: id },
			})) as ReturnItem[];
			for (const item of items) {
				await data.delete("returnItem", item.id);
			}
			await data.delete("returnRequest", id);
		},

		// ── Bulk Operations ────────────────────────────────────────────────

		async bulkUpdateStatus(
			ids: string[],
			status: OrderStatus,
		): Promise<{ updated: number }> {
			if (!ids.length) return { updated: 0 };

			const now = new Date();
			let updated = 0;

			for (const id of ids) {
				const order = (await data.get("order", id)) as Order | null;
				if (order) {
					const updated_order = { ...order, status, updatedAt: now };
					// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
					await data.upsert("order", id, updated_order as Record<string, any>);
					updated++;
				}
			}

			return { updated };
		},

		async bulkUpdatePaymentStatus(
			ids: string[],
			paymentStatus: PaymentStatus,
		): Promise<{ updated: number }> {
			if (!ids.length) return { updated: 0 };

			const now = new Date();
			let updated = 0;

			for (const id of ids) {
				const order = (await data.get("order", id)) as Order | null;
				if (order) {
					const updated_order = { ...order, paymentStatus, updatedAt: now };
					// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
					await data.upsert("order", id, updated_order as Record<string, any>);
					updated++;
				}
			}

			return { updated };
		},

		async bulkDelete(ids: string[]): Promise<{ deleted: number }> {
			if (!ids.length) return { deleted: 0 };

			let deleted = 0;

			for (const id of ids) {
				const order = (await data.get("order", id)) as Order | null;
				if (!order) continue;

				// Delete related records first
				const items = (await data.findMany("orderItem", {
					where: { orderId: id },
				})) as OrderItem[];
				for (const item of items) {
					await data.delete("orderItem", item.id);
				}

				const addresses = (await data.findMany("orderAddress", {
					where: { orderId: id },
				})) as OrderAddress[];
				for (const addr of addresses) {
					await data.delete("orderAddress", addr.id);
				}

				const fulfillments = (await data.findMany("fulfillment", {
					where: { orderId: id },
				})) as Fulfillment[];
				for (const f of fulfillments) {
					const fItems = (await data.findMany("fulfillmentItem", {
						where: { fulfillmentId: f.id },
					})) as FulfillmentItem[];
					for (const fi of fItems) {
						await data.delete("fulfillmentItem", fi.id);
					}
					await data.delete("fulfillment", f.id);
				}

				const returns = (await data.findMany("returnRequest", {
					where: { orderId: id },
				})) as ReturnRequest[];
				for (const r of returns) {
					const rItems = (await data.findMany("returnItem", {
						where: { returnRequestId: r.id },
					})) as ReturnItem[];
					for (const ri of rItems) {
						await data.delete("returnItem", ri.id);
					}
					await data.delete("returnRequest", r.id);
				}

				const notes = (await data.findMany("orderNote", {
					where: { orderId: id },
				})) as OrderNote[];
				for (const note of notes) {
					await data.delete("orderNote", note.id);
				}

				await data.delete("order", id);
				deleted++;
			}

			return { deleted };
		},

		// ── Order Notes ────────────────────────────────────────────────────

		async addNote(params: AddNoteParams): Promise<OrderNote> {
			const id = crypto.randomUUID();
			const now = new Date();

			const note: OrderNote = {
				id,
				orderId: params.orderId,
				type: params.type ?? "note",
				content: params.content,
				authorId: params.authorId,
				authorName: params.authorName,
				metadata: params.metadata ?? {},
				createdAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: data service requires Record<string, any>
			await data.upsert("orderNote", id, note as Record<string, any>);
			return note;
		},

		async listNotes(orderId: string): Promise<OrderNote[]> {
			const notes = (await data.findMany("orderNote", {
				where: { orderId },
			})) as OrderNote[];

			notes.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);

			return notes;
		},

		async deleteNote(id: string): Promise<void> {
			await data.delete("orderNote", id);
		},

		// ── Invoice ────────────────────────────────────────────────────────

		// ── Customer Returns ──────────────────────────────────────────────

		async listReturnsForCustomer(
			customerId: string,
			params?: {
				limit?: number | undefined;
				offset?: number | undefined;
				status?: ReturnStatus | undefined;
			},
		): Promise<{
			returns: Array<ReturnRequestWithItems & { orderNumber: string }>;
			total: number;
		}> {
			const limit = params?.limit ?? 20;
			const offset = params?.offset ?? 0;

			// Get all customer orders
			const customerOrders = (await data.findMany("order", {
				where: { customerId },
			})) as Order[];

			if (customerOrders.length === 0) {
				return { returns: [], total: 0 };
			}

			// Build order lookup map
			const orderMap = new Map(customerOrders.map((o) => [o.id, o]));
			const orderIds = new Set(customerOrders.map((o) => o.id));

			// Get all return requests, then filter to customer's orders
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const allReturns = (await data.findMany("returnRequest", {
				...(Object.keys(where).length > 0 ? { where } : {}),
			})) as ReturnRequest[];

			const customerReturns = allReturns.filter((r) => orderIds.has(r.orderId));

			customerReturns.sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			);

			const paged = customerReturns.slice(offset, offset + limit);

			const result: Array<ReturnRequestWithItems & { orderNumber: string }> =
				[];
			for (const r of paged) {
				const items = (await data.findMany("returnItem", {
					where: { returnRequestId: r.id },
				})) as ReturnItem[];
				const order = orderMap.get(r.orderId);
				result.push({
					...r,
					items,
					orderNumber: order?.orderNumber ?? "",
				});
			}

			return { returns: result, total: customerReturns.length };
		},

		// ── Public Order Tracking ──────────────────────────────────────────

		async getByTracking(
			orderNumber: string,
			email: string,
		): Promise<OrderWithDetails | null> {
			const order = await this.getByOrderNumber(orderNumber);
			if (!order) return null;

			const normalizedEmail = email.toLowerCase().trim();

			// Match against guestEmail
			if (order.guestEmail?.toLowerCase().trim() === normalizedEmail) {
				return order;
			}

			// Match against billing address name isn't enough — we need email.
			// Orders placed by a logged-in customer store customerId, not guestEmail.
			// For logged-in customers, metadata may hold the email.
			const meta = order.metadata as Record<string, unknown> | undefined;
			if (
				typeof meta?.customerEmail === "string" &&
				meta.customerEmail.toLowerCase().trim() === normalizedEmail
			) {
				return order;
			}

			return null;
		},

		async getInvoiceData(
			orderId: string,
			storeName: string,
		): Promise<InvoiceData | null> {
			const order = await this.getById(orderId);
			if (!order) return null;

			const billingAddr = order.addresses.find((a) => a.type === "billing");
			const shippingAddr = order.addresses.find((a) => a.type === "shipping");

			const stripAddrMeta = (
				addr: OrderAddress | undefined,
			): Omit<OrderAddress, "id" | "orderId" | "type"> | undefined => {
				if (!addr) return undefined;
				const { id: _id, orderId: _oid, type: _t, ...rest } = addr;
				return rest;
			};

			const issueDate = new Date(order.createdAt);
			const dueDate =
				order.paymentStatus === "paid"
					? issueDate
					: new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

			const customerName = billingAddr
				? `${billingAddr.firstName} ${billingAddr.lastName}`
				: "Customer";

			return {
				invoiceNumber: generateInvoiceNumber(order.orderNumber, issueDate),
				orderNumber: order.orderNumber,
				orderId: order.id,
				issueDate: formatInvoiceDate(issueDate),
				dueDate: formatInvoiceDate(dueDate),
				status: resolveInvoiceStatus(order.paymentStatus, order.status),
				customerName,
				customerEmail: order.guestEmail,
				billingAddress: stripAddrMeta(billingAddr),
				shippingAddress: stripAddrMeta(shippingAddr),
				lineItems: order.items.map((item) => ({
					name: item.name,
					sku: item.sku,
					quantity: item.quantity,
					unitPrice: item.price,
					subtotal: item.subtotal,
				})),
				subtotal: order.subtotal,
				taxAmount: order.taxAmount,
				shippingAmount: order.shippingAmount,
				discountAmount: order.discountAmount,
				giftCardAmount: order.giftCardAmount,
				total: order.total,
				currency: order.currency,
				storeName,
				notes: order.notes,
			};
		},

		// ── Reorder ──────────────────────────────────────────────────────────

		async getReorderItems(orderId: string): Promise<ReorderItem[] | null> {
			const order = (await data.get("order", orderId)) as Order | null;
			if (!order) return null;

			const items = (await data.findMany("orderItem", {
				where: { orderId },
			})) as OrderItem[];

			return items.map((item) => ({
				productId: item.productId,
				variantId: item.variantId,
				name: item.name,
				sku: item.sku,
				price: item.price,
				quantity: item.quantity,
			}));
		},
	};
}
