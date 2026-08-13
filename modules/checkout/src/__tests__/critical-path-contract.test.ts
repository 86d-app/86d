import {
	createMockDataService,
	createMockSession,
} from "@86d-app/core/test-utils";
import { describe, expect, it, vi } from "vitest";
import {
	CheckoutMutationUnavailableError,
	CheckoutRevisionConflictError,
} from "../concurrency";
import { createCheckoutController } from "../service-impl";
import { createSession } from "../store/endpoints/create-session";
import {
	canAccessCheckout,
	createGuestProofMetadata,
	setGuestProofCookie,
} from "../store/endpoints/guest-proof";
import { updateSession } from "../store/endpoints/update-session";
import { createTransactionTestStore } from "./transaction-test-utils";

const billingAddress = {
	firstName: "Ada",
	lastName: "Lovelace",
	line1: "123 Main Street",
	city: "Austin",
	state: "TX",
	postalCode: "78701",
	country: "US",
};

function sessionInput(metadata: Record<string, unknown> = {}) {
	return {
		id: "checkout-1",
		cartId: "cart-1",
		guestEmail: "shopper@example.com",
		subtotal: 2_500,
		total: 2_500,
		lineItems: [
			{
				productId: "product-1",
				name: "Authoritative Product",
				price: 1_250,
				quantity: 2,
			},
		],
		metadata,
	};
}

describe("Checkout revision compare-and-swap", () => {
	it("allows exactly one of two concurrent writes against the same revision", async () => {
		const storage = createTransactionTestStore();
		const controller = createCheckoutController(
			storage.data,
			storage.transactions,
		);
		await controller.create(sessionInput());

		const results = await Promise.allSettled([
			controller.update("checkout-1", { guestEmail: "first@example.com" }, 1),
			controller.update("checkout-1", { guestEmail: "second@example.com" }, 1),
		]);
		const fulfilled = results.filter((result) => result.status === "fulfilled");
		const rejected = results.filter((result) => result.status === "rejected");
		const stored = await controller.getById("checkout-1");

		expect(fulfilled).toHaveLength(1);
		expect(rejected).toHaveLength(1);
		expect(rejected[0]).toMatchObject({
			status: "rejected",
			reason: expect.objectContaining({
				name: "CheckoutRevisionConflictError",
				currentRevision: 2,
			}),
		});
		expect(stored).toMatchObject({ revision: 2 });
		expect(["first@example.com", "second@example.com"]).toContain(
			stored?.guestEmail,
		);
	});

	it("fails closed when a revisioned mutation has no row-locking transaction", async () => {
		const controller = createCheckoutController(createMockDataService());
		await controller.create(sessionInput());

		await expect(
			controller.update("checkout-1", { guestEmail: "new@example.com" }, 1),
		).rejects.toBeInstanceOf(CheckoutMutationUnavailableError);
		expect(await controller.getById("checkout-1")).toMatchObject({
			revision: 1,
			guestEmail: "shopper@example.com",
		});
	});

	it("reports the authoritative current revision for stale callers", async () => {
		const storage = createTransactionTestStore();
		const controller = createCheckoutController(
			storage.data,
			storage.transactions,
		);
		await controller.create(sessionInput());
		await controller.update("checkout-1", { guestEmail: "new@example.com" }, 1);

		await expect(
			controller.update("checkout-1", { guestEmail: "stale@example.com" }, 1),
		).rejects.toEqual(new CheckoutRevisionConflictError(2));
		expect(await controller.getById("checkout-1")).toMatchObject({
			revision: 2,
			guestEmail: "new@example.com",
		});
	});
});

describe("Checkout guest proof", () => {
	it("authorizes only the scoped high-entropy proof", async () => {
		const proof = await createGuestProofMetadata();
		const storage = createTransactionTestStore();
		const controller = createCheckoutController(
			storage.data,
			storage.transactions,
		);
		const session = await controller.create(sessionInput(proof.metadata));
		const context = (cookie: string | null) => ({
			context: { session: null },
			getCookie: () => cookie,
			setCookie: () => "",
		});

		expect(await canAccessCheckout(context(proof.proof), session)).toBe(true);
		expect(await canAccessCheckout(context(session.id), session)).toBe(false);
		expect(
			await canAccessCheckout(context("shopper@example.com"), session),
		).toBe(false);
		expect(await canAccessCheckout(context("order-1"), session)).toBe(false);
		expect(await canAccessCheckout(context(null), session)).toBe(false);
	});

	it("binds authenticated Checkouts to the exact session principal", async () => {
		const storage = createTransactionTestStore();
		const controller = createCheckoutController(
			storage.data,
			storage.transactions,
		);
		const session = await controller.create({
			...sessionInput(),
			customerId: "customer-1",
		});
		const context = (userId: string | undefined) => ({
			context: {
				session: userId ? createMockSession({ userId }) : null,
			},
			getCookie: () => null,
			setCookie: () => "",
		});

		expect(await canAccessCheckout(context("customer-1"), session)).toBe(true);
		expect(await canAccessCheckout(context("customer-2"), session)).toBe(false);
		expect(await canAccessCheckout(context(undefined), session)).toBe(false);
	});

	it("sets a scoped httpOnly same-site cookie bounded by Checkout expiry", async () => {
		const proof = await createGuestProofMetadata();
		const storage = createTransactionTestStore();
		const session = await createCheckoutController(
			storage.data,
			storage.transactions,
		).create(sessionInput(proof.metadata));
		const setCookie = vi.fn(() => "");

		setGuestProofCookie(
			{ context: { session: null }, getCookie: () => null, setCookie },
			session,
			proof.proof,
		);

		expect(setCookie).toHaveBeenCalledWith(
			"checkout_guest_checkout-1",
			proof.proof,
			expect.objectContaining({
				httpOnly: true,
				sameSite: "lax",
				path: "/api/checkout/sessions",
				maxAge: expect.any(Number),
			}),
		);
	});
});

describe("Checkout Cart-identity transport", () => {
	it("ignores every shopper monetary field and resolves identity, price, and quantity server-side", async () => {
		const storage = createTransactionTestStore();
		const controller = createCheckoutController(
			storage.data,
			storage.transactions,
		);
		const create = vi.spyOn(controller, "create");
		const invoke = vi.fn(async (definition: { name: string }) => {
			if (definition.name === "cart.snapshot") {
				return {
					ok: true,
					decision: {
						cartId: "cart-1",
						revision: "2026-08-13T12:00:00.000Z",
						items: [{ productId: "product-1", quantity: 2 }],
					},
				};
			}
			if (definition.name === "catalog.product.resolve") {
				return {
					ok: true,
					decision: {
						product: {
							id: "product-1",
							name: "Authoritative Product",
							slug: "authoritative-product",
							status: "active",
							price: 1_250,
							sku: "REAL-SKU",
							images: [],
						},
					},
				};
			}
			return {
				ok: false,
				failure: { code: "CAPABILITY_UNAVAILABLE" },
			};
		});

		const untrustedBody = {
			cartId: "cart-1",
			subtotal: 1,
			taxAmount: 1,
			shippingAmount: 1,
			discountAmount: 1,
			total: 1,
			lineItems: [
				{
					productId: "product-forged",
					name: "Forged Product",
					price: 1,
					quantity: 999,
				},
			],
		};
		const result = await createSession({
			body: untrustedBody,
			headers: new Headers({ cookie: "cart_guest_id=guest-1" }),
			context: {
				controllers: { checkout: controller },
				capabilities: { invoke },
				session: null,
			},
		});

		expect(result).toHaveProperty("session");
		expect(create).toHaveBeenCalledWith({
			cartId: "cart-1",
			subtotal: 2_500,
			total: 2_500,
			lineItems: [
				{
					productId: "product-1",
					name: "Authoritative Product",
					sku: "REAL-SKU",
					price: 1_250,
					quantity: 2,
				},
			],
			metadata: expect.objectContaining({
				cartRevision: "2026-08-13T12:00:00.000Z",
				guestProofDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
			}),
		});
	});

	it("maps hidden Cart ownership failures to a non-enumerating 404", async () => {
		const create = vi.fn();
		const result = await createSession({
			body: { cartId: "cart-1" },
			headers: new Headers({ cookie: "cart_guest_id=guest-2" }),
			context: {
				controllers: { checkout: { create } },
				capabilities: {
					invoke: vi.fn(async () => ({
						ok: false,
						failure: { code: "CART_NOT_OWNED" },
					})),
				},
				session: null,
			},
		});

		expect(result).toEqual({ error: "Cart not found", status: 404 });
		expect(create).not.toHaveBeenCalled();
	});

	it("requires expectedRevision at the update transport and returns conflicts", async () => {
		const proof = await createGuestProofMetadata();
		const storage = createTransactionTestStore();
		const controller = createCheckoutController(
			storage.data,
			storage.transactions,
		);
		await controller.create(sessionInput(proof.metadata));
		const input = {
			params: { id: "checkout-1" },
			body: { expectedRevision: 1, billingAddress },
			headers: new Headers({
				cookie: `checkout_guest_checkout-1=${proof.proof}`,
			}),
			context: { controllers: { checkout: controller }, session: null },
		};
		const first = await updateSession(input);
		const stale = await updateSession(input);

		expect(first).toMatchObject({ session: { revision: 2 } });
		expect(stale).toEqual({
			code: "CHECKOUT_REVISION_CONFLICT",
			error:
				"This checkout changed after it was loaded. Refresh it before trying again.",
			status: 409,
			currentRevision: 2,
		});
	});
});
