import { describe, expect, it, vi } from "vitest";
import { adminAddNote } from "../admin/endpoints/add-note";
import { adminBulkAction } from "../admin/endpoints/bulk-action";
import { adminCreateFulfillment } from "../admin/endpoints/create-fulfillment";
import { adminDeleteNote } from "../admin/endpoints/delete-note";
import { adminDeleteOrder } from "../admin/endpoints/delete-order";
import { adminDeleteReturn } from "../admin/endpoints/delete-return";
import { adminGetInvoice } from "../admin/endpoints/get-invoice";
import { adminGetOrder } from "../admin/endpoints/get-order";
import { adminGetReturn } from "../admin/endpoints/get-return";
import { adminListFulfillments } from "../admin/endpoints/list-fulfillments";
import { adminListNotes } from "../admin/endpoints/list-notes";
import { adminListOrders } from "../admin/endpoints/list-orders";
import { adminListReturns } from "../admin/endpoints/list-returns";
import { adminUpdateOrder } from "../admin/endpoints/update-order";
import { adminUpdateReturn } from "../admin/endpoints/update-return";
import type {
	Fulfillment,
	FulfillmentItem,
	FulfillmentWithItems,
	InvoiceData,
	Order,
	OrderController,
	OrderItem,
	OrderNote,
	OrderWithDetails,
	ReturnItem,
	ReturnRequest,
	ReturnRequestWithItems,
} from "../service";

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractHandler(
	ep: unknown,
): (ctx: Record<string, unknown>) => Promise<unknown> {
	const obj = ep as Record<string, unknown>;
	const fn = typeof obj.handler === "function" ? obj.handler : ep;
	return fn as (ctx: Record<string, unknown>) => Promise<unknown>;
}

function makeOrder(overrides: Partial<Order> = {}): Order {
	const now = new Date();
	return {
		id: "order-1",
		orderNumber: "ORD-001",
		status: "pending",
		paymentStatus: "unpaid",
		subtotal: 5000,
		taxAmount: 400,
		shippingAmount: 500,
		discountAmount: 0,
		giftCardAmount: 0,
		storeCreditAmount: 0,
		total: 5900,
		currency: "USD",
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function makeOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
	return {
		id: "item-1",
		orderId: "order-1",
		productId: "prod-1",
		name: "Widget",
		price: 2500,
		quantity: 2,
		subtotal: 5000,
		...overrides,
	};
}

function makeOrderWithDetails(
	overrides: Partial<OrderWithDetails> = {},
): OrderWithDetails {
	return {
		...makeOrder(),
		items: [makeOrderItem()],
		addresses: [],
		...overrides,
	};
}

function makeOrderNote(overrides: Partial<OrderNote> = {}): OrderNote {
	const now = new Date();
	return {
		id: "note-1",
		orderId: "order-1",
		type: "note",
		content: "Admin note content",
		createdAt: now,
		...overrides,
	};
}

function makeFulfillmentItem(
	overrides: Partial<FulfillmentItem> = {},
): FulfillmentItem {
	return {
		id: "fitem-1",
		fulfillmentId: "ful-1",
		orderItemId: "item-1",
		quantity: 1,
		...overrides,
	};
}

function makeFulfillment(overrides: Partial<Fulfillment> = {}): Fulfillment {
	const now = new Date();
	return {
		id: "ful-1",
		orderId: "order-1",
		status: "pending",
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function makeFulfillmentWithItems(
	overrides: Partial<FulfillmentWithItems> = {},
): FulfillmentWithItems {
	return {
		...makeFulfillment(),
		items: [makeFulfillmentItem()],
		...overrides,
	};
}

function makeReturnRequest(
	overrides: Partial<ReturnRequest> = {},
): ReturnRequest {
	const now = new Date();
	return {
		id: "ret-1",
		orderId: "order-1",
		status: "requested",
		type: "refund",
		reason: "Item defective",
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function makeReturnItem(overrides: Partial<ReturnItem> = {}): ReturnItem {
	return {
		id: "ritem-1",
		returnRequestId: "ret-1",
		orderItemId: "item-1",
		quantity: 1,
		...overrides,
	};
}

function makeReturnWithItems(
	overrides: Partial<ReturnRequestWithItems> = {},
): ReturnRequestWithItems {
	return {
		...makeReturnRequest(),
		items: [makeReturnItem()],
		...overrides,
	};
}

function makeInvoiceData(overrides: Partial<InvoiceData> = {}): InvoiceData {
	return {
		invoiceNumber: "INV-001",
		orderNumber: "ORD-001",
		orderId: "order-1",
		issueDate: "2026-05-01",
		dueDate: "2026-05-15",
		status: "issued",
		customerName: "Alice Smith",
		lineItems: [
			{ name: "Widget", quantity: 2, unitPrice: 2500, subtotal: 5000 },
		],
		subtotal: 5000,
		taxAmount: 400,
		shippingAmount: 500,
		discountAmount: 0,
		giftCardAmount: 0,
		storeCreditAmount: 0,
		total: 5900,
		currency: "USD",
		storeName: "Test Store",
		...overrides,
	};
}

function makeController(
	overrides: Partial<OrderController> = {},
): OrderController {
	return {
		create: vi.fn(),
		getById: vi.fn().mockResolvedValue(null),
		getByOrderNumber: vi.fn().mockResolvedValue(null),
		listForCustomer: vi.fn().mockResolvedValue({ orders: [], total: 0 }),
		hasCustomerPurchasedProduct: vi.fn().mockResolvedValue(false),
		list: vi.fn().mockResolvedValue({ orders: [], total: 0 }),
		listForExport: vi.fn().mockResolvedValue({ orders: [], total: 0 }),
		updateStatus: vi.fn().mockResolvedValue(null),
		updatePaymentStatus: vi.fn().mockResolvedValue(null),
		update: vi.fn().mockResolvedValue(null),
		cancel: vi.fn().mockResolvedValue(null),
		delete: vi.fn().mockResolvedValue(undefined),
		getItems: vi.fn().mockResolvedValue([]),
		getAddresses: vi.fn().mockResolvedValue([]),
		createFulfillment: vi.fn().mockResolvedValue(makeFulfillment()),
		getFulfillment: vi.fn().mockResolvedValue(null),
		listFulfillments: vi.fn().mockResolvedValue([]),
		updateFulfillment: vi.fn().mockResolvedValue(null),
		deleteFulfillment: vi.fn().mockResolvedValue(undefined),
		getOrderFulfillmentStatus: vi.fn().mockResolvedValue("unfulfilled"),
		createReturn: vi.fn().mockResolvedValue(makeReturnWithItems()),
		getReturn: vi.fn().mockResolvedValue(null),
		listReturns: vi.fn().mockResolvedValue([]),
		listAllReturns: vi.fn().mockResolvedValue({ returns: [], total: 0 }),
		updateReturn: vi.fn().mockResolvedValue(null),
		deleteReturn: vi.fn().mockResolvedValue(undefined),
		bulkUpdateStatus: vi.fn().mockResolvedValue({ updated: 0 }),
		bulkUpdatePaymentStatus: vi.fn().mockResolvedValue({ updated: 0 }),
		bulkDelete: vi.fn().mockResolvedValue({ deleted: 0 }),
		addNote: vi.fn().mockResolvedValue(makeOrderNote()),
		listNotes: vi.fn().mockResolvedValue([]),
		deleteNote: vi.fn().mockResolvedValue(undefined),
		getInvoiceData: vi.fn().mockResolvedValue(null),
		listReturnsForCustomer: vi
			.fn()
			.mockResolvedValue({ returns: [], total: 0 }),
		getByTracking: vi.fn().mockResolvedValue(null),
		getReorderItems: vi.fn().mockResolvedValue(null),
		...overrides,
	};
}

function call(
	handler: (ctx: Record<string, unknown>) => Promise<unknown>,
	opts: {
		query?: Record<string, string | number | undefined>;
		params?: Record<string, string>;
		body?: Record<string, unknown>;
		controller?: OrderController;
		emitFn?: ReturnType<typeof vi.fn>;
	} = {},
) {
	const emit = opts.emitFn ?? vi.fn().mockResolvedValue(undefined);
	return handler({
		query: opts.query ?? {},
		params: opts.params ?? {},
		body: opts.body ?? {},
		context: {
			controllers: { order: opts.controller ?? makeController() },
			events: { emit },
		},
	});
}

// ── Extract handlers ───────────────────────────────────────────────────────────

const listOrdersHandler = extractHandler(adminListOrders);
const getOrderHandler = extractHandler(adminGetOrder);
const updateOrderHandler = extractHandler(adminUpdateOrder);
const deleteOrderHandler = extractHandler(adminDeleteOrder);
const addNoteHandler = extractHandler(adminAddNote);
const listNotesHandler = extractHandler(adminListNotes);
const deleteNoteHandler = extractHandler(adminDeleteNote);
const getInvoiceHandler = extractHandler(adminGetInvoice);
const listFulfillmentsHandler = extractHandler(adminListFulfillments);
const createFulfillmentHandler = extractHandler(adminCreateFulfillment);
const listReturnsHandler = extractHandler(adminListReturns);
const getReturnHandler = extractHandler(adminGetReturn);
const updateReturnHandler = extractHandler(adminUpdateReturn);
const deleteReturnHandler = extractHandler(adminDeleteReturn);
const bulkActionHandler = extractHandler(adminBulkAction);

// ── admin GET /admin/orders ────────────────────────────────────────────────────

describe("admin GET /admin/orders", () => {
	it("returns empty list when no orders exist", async () => {
		const result = (await call(listOrdersHandler, {
			query: { page: 1, limit: 20 },
		})) as { orders: Order[]; total: number; page: number; pages: number };
		expect(result.orders).toHaveLength(0);
		expect(result.total).toBe(0);
		expect(result.page).toBe(1);
		expect(result.pages).toBe(0);
	});

	it("returns orders and pagination metadata from controller", async () => {
		const orders = [makeOrder({ id: "order-1" }), makeOrder({ id: "order-2" })];
		const ctrl = makeController({
			list: vi.fn().mockResolvedValue({ orders, total: 2 }),
		});
		const result = (await call(listOrdersHandler, {
			query: { page: 1, limit: 20 },
			controller: ctrl,
		})) as { orders: Order[]; total: number; pages: number };
		expect(result.orders).toHaveLength(2);
		expect(result.total).toBe(2);
		expect(result.pages).toBe(1);
		expect(ctrl.list).toHaveBeenCalledWith(
			expect.objectContaining({ limit: 20, offset: 0 }),
		);
	});
});

// ── admin GET /admin/orders/:id ────────────────────────────────────────────────

describe("admin GET /admin/orders/:id", () => {
	it("returns 404 when order not found", async () => {
		const result = (await call(getOrderHandler, {
			params: { id: "missing" },
		})) as { error: string; status: number };
		expect(result.error).toBe("Order not found");
		expect(result.status).toBe(404);
	});

	it("returns order with items and addresses when found", async () => {
		const order = makeOrderWithDetails({ id: "order-1" });
		const ctrl = makeController({
			getById: vi.fn().mockResolvedValue(order),
		});
		const result = (await call(getOrderHandler, {
			params: { id: "order-1" },
			controller: ctrl,
		})) as { order: OrderWithDetails };
		expect(result.order.id).toBe("order-1");
		expect(result.order.items).toHaveLength(1);
		expect(ctrl.getById).toHaveBeenCalledWith("order-1");
	});
});

// ── admin PUT /admin/orders/:id/update ─────────────────────────────────────────

describe("admin PUT /admin/orders/:id/update", () => {
	it("returns 404 when order not found", async () => {
		const result = (await call(updateOrderHandler, {
			params: { id: "missing" },
			body: { status: "processing" },
		})) as { error: string; status: number };
		expect(result.error).toBe("Order not found");
		expect(result.status).toBe(404);
	});

	it("updates order status and returns updated order", async () => {
		const existing = makeOrderWithDetails({ id: "order-1", status: "pending" });
		const updated = makeOrder({ id: "order-1", status: "processing" });
		const ctrl = makeController({
			getById: vi.fn().mockResolvedValue(existing),
			updateStatus: vi.fn().mockResolvedValue(updated),
		});
		const result = (await call(updateOrderHandler, {
			params: { id: "order-1" },
			body: { status: "processing" },
			controller: ctrl,
		})) as { order: Order };
		expect(result.order.status).toBe("processing");
		expect(ctrl.updateStatus).toHaveBeenCalledWith("order-1", "processing");
	});
});

// ── admin DELETE /admin/orders/:id/delete ──────────────────────────────────────

describe("admin DELETE /admin/orders/:id/delete", () => {
	it("returns 404 when order not found", async () => {
		const result = (await call(deleteOrderHandler, {
			params: { id: "missing" },
		})) as { error: string; status: number };
		expect(result.error).toBe("Order not found");
		expect(result.status).toBe(404);
	});

	it("deletes the order and returns success", async () => {
		const existing = makeOrderWithDetails({ id: "order-1" });
		const ctrl = makeController({
			getById: vi.fn().mockResolvedValue(existing),
			delete: vi.fn().mockResolvedValue(undefined),
		});
		const result = (await call(deleteOrderHandler, {
			params: { id: "order-1" },
			controller: ctrl,
		})) as { success: boolean };
		expect(result.success).toBe(true);
		expect(ctrl.delete).toHaveBeenCalledWith("order-1");
	});
});

// ── admin POST /admin/orders/:id/notes/add ─────────────────────────────────────

describe("admin POST /admin/orders/:id/notes/add", () => {
	it("returns 404 when order not found", async () => {
		const result = (await call(addNoteHandler, {
			params: { id: "missing" },
			body: { content: "Note content" },
		})) as { error: string; status: number };
		expect(result.error).toBe("Order not found");
		expect(result.status).toBe(404);
	});

	it("adds a note and returns it", async () => {
		const existing = makeOrderWithDetails({ id: "order-1" });
		const note = makeOrderNote({ orderId: "order-1", content: "Test note" });
		const ctrl = makeController({
			getById: vi.fn().mockResolvedValue(existing),
			addNote: vi.fn().mockResolvedValue(note),
		});
		const result = (await call(addNoteHandler, {
			params: { id: "order-1" },
			body: { content: "Test note", authorName: "Admin" },
			controller: ctrl,
		})) as { note: OrderNote };
		expect(result.note.content).toBe("Test note");
		expect(ctrl.addNote).toHaveBeenCalledWith(
			expect.objectContaining({
				orderId: "order-1",
				content: "Test note",
				type: "note",
				authorName: "Admin",
			}),
		);
	});
});

// ── admin GET /admin/orders/:id/notes ─────────────────────────────────────────

describe("admin GET /admin/orders/:id/notes", () => {
	it("returns empty notes list when order has no notes", async () => {
		const ctrl = makeController({
			listNotes: vi.fn().mockResolvedValue([]),
		});
		const result = (await call(listNotesHandler, {
			params: { id: "order-1" },
			controller: ctrl,
		})) as { notes: OrderNote[] };
		expect(result.notes).toHaveLength(0);
		expect(ctrl.listNotes).toHaveBeenCalledWith("order-1");
	});

	it("returns notes for the order", async () => {
		const notes = [
			makeOrderNote({ id: "note-1" }),
			makeOrderNote({ id: "note-2" }),
		];
		const ctrl = makeController({
			listNotes: vi.fn().mockResolvedValue(notes),
		});
		const result = (await call(listNotesHandler, {
			params: { id: "order-1" },
			controller: ctrl,
		})) as { notes: OrderNote[] };
		expect(result.notes).toHaveLength(2);
	});
});

// ── admin POST /admin/orders/notes/:id/delete ─────────────────────────────────

describe("admin POST /admin/orders/notes/:id/delete", () => {
	it("deletes the note and returns success", async () => {
		const ctrl = makeController({
			deleteNote: vi.fn().mockResolvedValue(undefined),
		});
		const result = (await call(deleteNoteHandler, {
			params: { id: "note-1" },
			controller: ctrl,
		})) as { success: boolean };
		expect(result.success).toBe(true);
		expect(ctrl.deleteNote).toHaveBeenCalledWith("note-1");
	});

	it("calls deleteNote with the provided id", async () => {
		const ctrl = makeController({
			deleteNote: vi.fn().mockResolvedValue(undefined),
		});
		await call(deleteNoteHandler, {
			params: { id: "note-99" },
			controller: ctrl,
		});
		expect(ctrl.deleteNote).toHaveBeenCalledWith("note-99");
	});
});

// ── admin GET /admin/orders/:id/invoice ───────────────────────────────────────

describe("admin GET /admin/orders/:id/invoice", () => {
	it("returns 404 when order not found", async () => {
		const result = (await call(getInvoiceHandler, {
			params: { id: "missing" },
			query: {},
		})) as { error: string; status: number };
		expect(result.error).toBe("Order not found");
		expect(result.status).toBe(404);
	});

	it("returns invoice data when order exists", async () => {
		const invoice = makeInvoiceData({ orderId: "order-1" });
		const ctrl = makeController({
			getInvoiceData: vi.fn().mockResolvedValue(invoice),
		});
		const result = (await call(getInvoiceHandler, {
			params: { id: "order-1" },
			query: { storeName: "Test Store" },
			controller: ctrl,
		})) as { invoice: InvoiceData };
		expect(result.invoice.orderId).toBe("order-1");
		expect(result.invoice.storeName).toBe("Test Store");
		expect(ctrl.getInvoiceData).toHaveBeenCalledWith("order-1", "Test Store");
	});
});

// ── admin GET /admin/orders/:id/fulfillments ──────────────────────────────────

describe("admin GET /admin/orders/:id/fulfillments", () => {
	it("returns 404 when order not found", async () => {
		const result = (await call(listFulfillmentsHandler, {
			params: { id: "missing" },
		})) as { error: string; status: number };
		expect(result.error).toBe("Order not found");
		expect(result.status).toBe(404);
	});

	it("returns fulfillments and fulfillment status for existing order", async () => {
		const existing = makeOrderWithDetails({ id: "order-1" });
		const fulfillments = [makeFulfillmentWithItems()];
		const ctrl = makeController({
			getById: vi.fn().mockResolvedValue(existing),
			listFulfillments: vi.fn().mockResolvedValue(fulfillments),
			getOrderFulfillmentStatus: vi
				.fn()
				.mockResolvedValue("partially_fulfilled"),
		});
		const result = (await call(listFulfillmentsHandler, {
			params: { id: "order-1" },
			controller: ctrl,
		})) as {
			fulfillments: FulfillmentWithItems[];
			fulfillmentStatus: string;
		};
		expect(result.fulfillments).toHaveLength(1);
		expect(result.fulfillmentStatus).toBe("partially_fulfilled");
		expect(ctrl.listFulfillments).toHaveBeenCalledWith("order-1");
	});
});

// ── admin POST /admin/orders/:id/fulfillments/create ─────────────────────────

describe("admin POST /admin/orders/:id/fulfillments/create", () => {
	it("returns 404 when order not found", async () => {
		const result = (await call(createFulfillmentHandler, {
			params: { id: "missing" },
			body: { items: [{ orderItemId: "item-1", quantity: 1 }] },
		})) as { error: string; status: number };
		expect(result.error).toBe("Order not found");
		expect(result.status).toBe(404);
	});

	it("creates fulfillment and returns it with fulfillment status", async () => {
		const existing = makeOrderWithDetails({ id: "order-1" });
		const fulfillment = makeFulfillment({ id: "ful-1", orderId: "order-1" });
		const ctrl = makeController({
			getById: vi.fn().mockResolvedValue(existing),
			createFulfillment: vi.fn().mockResolvedValue(fulfillment),
			getOrderFulfillmentStatus: vi.fn().mockResolvedValue("fulfilled"),
		});
		const result = (await call(createFulfillmentHandler, {
			params: { id: "order-1" },
			body: {
				carrier: "UPS",
				trackingNumber: "1Z999AA1",
				items: [{ orderItemId: "item-1", quantity: 1 }],
			},
			controller: ctrl,
		})) as { fulfillment: Fulfillment; fulfillmentStatus: string };
		expect(result.fulfillment.id).toBe("ful-1");
		expect(result.fulfillmentStatus).toBe("fulfilled");
		expect(ctrl.createFulfillment).toHaveBeenCalledWith(
			expect.objectContaining({
				orderId: "order-1",
				carrier: "UPS",
				trackingNumber: "1Z999AA1",
			}),
		);
	});
});

// ── admin GET /admin/orders/returns ───────────────────────────────────────────

describe("admin GET /admin/orders/returns", () => {
	it("returns empty list with default pagination", async () => {
		const result = (await call(listReturnsHandler, {
			query: {},
		})) as {
			returns: ReturnRequestWithItems[];
			total: number;
			page: number;
			pages: number;
		};
		expect(result.returns).toHaveLength(0);
		expect(result.total).toBe(0);
		expect(result.page).toBe(1);
	});

	it("passes status filter to controller and returns matching returns", async () => {
		const returns = [
			makeReturnWithItems({ status: "approved" }),
			makeReturnWithItems({ id: "ret-2", status: "approved" }),
		];
		const ctrl = makeController({
			listAllReturns: vi.fn().mockResolvedValue({ returns, total: 2 }),
		});
		const result = (await call(listReturnsHandler, {
			query: { status: "approved" },
			controller: ctrl,
		})) as { returns: ReturnRequestWithItems[]; total: number };
		expect(result.returns).toHaveLength(2);
		expect(result.total).toBe(2);
		expect(ctrl.listAllReturns).toHaveBeenCalledWith(
			expect.objectContaining({ status: "approved" }),
		);
	});
});

// ── admin GET /admin/orders/returns/:id ───────────────────────────────────────

describe("admin GET /admin/orders/returns/:id", () => {
	it("returns 404 when return not found", async () => {
		const result = (await call(getReturnHandler, {
			params: { id: "missing" },
		})) as { error: string; status: number };
		expect(result.error).toBe("Return request not found");
		expect(result.status).toBe(404);
	});

	it("returns return request with items and associated order", async () => {
		const returnRequest = makeReturnWithItems({
			id: "ret-1",
			orderId: "order-1",
		});
		const order = makeOrderWithDetails({ id: "order-1" });
		const ctrl = makeController({
			getReturn: vi.fn().mockResolvedValue(returnRequest),
			getById: vi.fn().mockResolvedValue(order),
		});
		const result = (await call(getReturnHandler, {
			params: { id: "ret-1" },
			controller: ctrl,
		})) as { returnRequest: ReturnRequestWithItems; order: OrderWithDetails };
		expect(result.returnRequest.id).toBe("ret-1");
		expect(result.returnRequest.items).toHaveLength(1);
		expect(result.order.id).toBe("order-1");
		expect(ctrl.getReturn).toHaveBeenCalledWith("ret-1");
	});
});

// ── admin PUT /admin/orders/returns/:id/update ────────────────────────────────

describe("admin PUT /admin/orders/returns/:id/update", () => {
	it("returns 404 when return not found", async () => {
		const result = (await call(updateReturnHandler, {
			params: { id: "missing" },
			body: { status: "approved" },
		})) as { error: string; status: number };
		expect(result.error).toBe("Return request not found");
		expect(result.status).toBe(404);
	});

	it("approves the return and emits return.approved event", async () => {
		const existing = makeReturnWithItems({
			id: "ret-1",
			orderId: "order-1",
			status: "requested",
		});
		const updated = makeReturnRequest({ id: "ret-1", status: "approved" });
		const order = makeOrderWithDetails({ id: "order-1" });
		const emit = vi.fn().mockResolvedValue(undefined);
		const ctrl = makeController({
			getReturn: vi.fn().mockResolvedValue(existing),
			updateReturn: vi.fn().mockResolvedValue(updated),
			getById: vi.fn().mockResolvedValue(order),
		});
		const result = (await call(updateReturnHandler, {
			params: { id: "ret-1" },
			body: { status: "approved" },
			controller: ctrl,
			emitFn: emit,
		})) as { returnRequest: ReturnRequest };
		expect(result.returnRequest.status).toBe("approved");
		expect(ctrl.updateReturn).toHaveBeenCalledWith(
			"ret-1",
			expect.objectContaining({ status: "approved" }),
		);
		expect(emit).toHaveBeenCalledWith(
			"return.approved",
			expect.objectContaining({ returnId: "ret-1" }),
		);
	});
});

// ── admin DELETE /admin/orders/returns/:id/delete ─────────────────────────────

describe("admin DELETE /admin/orders/returns/:id/delete", () => {
	it("returns 404 when return not found", async () => {
		const result = (await call(deleteReturnHandler, {
			params: { id: "missing" },
		})) as { error: string; status: number };
		expect(result.error).toBe("Return request not found");
		expect(result.status).toBe(404);
	});

	it("deletes the return and returns success", async () => {
		const existing = makeReturnWithItems({ id: "ret-1" });
		const ctrl = makeController({
			getReturn: vi.fn().mockResolvedValue(existing),
			deleteReturn: vi.fn().mockResolvedValue(undefined),
		});
		const result = (await call(deleteReturnHandler, {
			params: { id: "ret-1" },
			controller: ctrl,
		})) as { success: boolean };
		expect(result.success).toBe(true);
		expect(ctrl.deleteReturn).toHaveBeenCalledWith("ret-1");
	});
});

// ── admin POST /admin/orders/bulk ─────────────────────────────────────────────

describe("admin POST /admin/orders/bulk", () => {
	it("bulk updateStatus returns updated count", async () => {
		const ctrl = makeController({
			bulkUpdateStatus: vi.fn().mockResolvedValue({ updated: 3 }),
		});
		const result = (await call(bulkActionHandler, {
			body: {
				action: "updateStatus",
				ids: ["order-1", "order-2", "order-3"],
				status: "completed",
			},
			controller: ctrl,
		})) as { updated: number };
		expect(result.updated).toBe(3);
		expect(ctrl.bulkUpdateStatus).toHaveBeenCalledWith(
			["order-1", "order-2", "order-3"],
			"completed",
		);
	});

	it("bulk delete returns deleted count", async () => {
		const ctrl = makeController({
			bulkDelete: vi.fn().mockResolvedValue({ deleted: 2 }),
		});
		const result = (await call(bulkActionHandler, {
			body: {
				action: "delete",
				ids: ["order-1", "order-2"],
			},
			controller: ctrl,
		})) as { deleted: number };
		expect(result.deleted).toBe(2);
		expect(ctrl.bulkDelete).toHaveBeenCalledWith(["order-1", "order-2"]);
	});
});
