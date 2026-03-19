import type { ModuleController } from "@86d-app/core";

/**
 * Minimal interface for discount validation.
 * Checkout accesses the discount controller through the runtime context —
 * no direct module import, just a structural contract.
 */
export interface DiscountController {
	validateCode(params: {
		code: string;
		subtotal: number;
		productIds?: string[] | undefined;
		categoryIds?: string[] | undefined;
	}): Promise<{
		valid: boolean;
		discountAmount: number;
		freeShipping: boolean;
		error?: string | undefined;
	}>;
	applyCode(params: {
		code: string;
		subtotal: number;
		productIds?: string[] | undefined;
		categoryIds?: string[] | undefined;
	}): Promise<{
		valid: boolean;
		discountAmount: number;
		freeShipping: boolean;
		error?: string | undefined;
	}>;
}

/**
 * Minimal interface for inventory stock checks and reservations.
 * Checkout accesses the inventory controller through the runtime context —
 * no direct module import, just a structural contract.
 */
export interface InventoryCheckController {
	isInStock(params: {
		productId: string;
		variantId?: string | undefined;
		locationId?: string | undefined;
		quantity?: number | undefined;
	}): Promise<boolean>;

	reserve(params: {
		productId: string;
		variantId?: string | undefined;
		locationId?: string | undefined;
		quantity: number;
	}): Promise<unknown>;

	release(params: {
		productId: string;
		variantId?: string | undefined;
		locationId?: string | undefined;
		quantity: number;
	}): Promise<unknown>;
}

/**
 * Minimal interface for gift card balance checks.
 * Checkout accesses the gift card controller through the runtime context —
 * no direct module import, just a structural contract.
 */
export interface GiftCardCheckController {
	checkBalance(code: string): Promise<{
		balance: number;
		currency: string;
		status: string;
	} | null>;

	redeem(
		code: string,
		amount: number,
		orderId?: string | undefined,
	): Promise<{
		transaction: { id: string; amount: number; balanceAfter: number };
		giftCard: { id: string; currentBalance: number; status: string };
	} | null>;
}

/**
 * Minimal interface for calculating taxes based on address and line items.
 * Checkout accesses the tax controller through the runtime context —
 * no direct module import, just a structural contract.
 */
export interface TaxCalculateController {
	calculate(params: {
		address: {
			country: string;
			state: string;
			city?: string | undefined;
			postalCode?: string | undefined;
		};
		lineItems: Array<{
			productId: string;
			categoryId?: string | undefined;
			amount: number;
			quantity: number;
		}>;
		shippingAmount?: number | undefined;
		customerId?: string | undefined;
	}): Promise<{
		totalTax: number;
		shippingTax: number;
		lineItems: Array<{
			productId: string;
			taxableAmount: number;
			taxAmount: number;
			rate: number;
		}>;
	}>;
}

/**
 * Minimal interface for payment intent management.
 * Checkout accesses the payments controller through the runtime context —
 * no direct module import, just a structural contract.
 */

/**
 * Minimal interface for creating orders from completed checkouts.
 * Checkout accesses the orders controller through the runtime context —
 * no direct module import, just a structural contract.
 */
export interface OrderCreateController {
	create(params: {
		customerId?: string | undefined;
		guestEmail?: string | undefined;
		currency?: string | undefined;
		subtotal: number;
		taxAmount?: number | undefined;
		shippingAmount?: number | undefined;
		discountAmount?: number | undefined;
		giftCardAmount?: number | undefined;
		total: number;
		metadata?: Record<string, unknown> | undefined;
		items: Array<{
			productId: string;
			variantId?: string | undefined;
			name: string;
			sku?: string | undefined;
			price: number;
			quantity: number;
		}>;
		shippingAddress?:
			| {
					firstName: string;
					lastName: string;
					company?: string | undefined;
					line1: string;
					line2?: string | undefined;
					city: string;
					state: string;
					postalCode: string;
					country: string;
					phone?: string | undefined;
			  }
			| undefined;
		billingAddress?:
			| {
					firstName: string;
					lastName: string;
					company?: string | undefined;
					line1: string;
					line2?: string | undefined;
					city: string;
					state: string;
					postalCode: string;
					country: string;
					phone?: string | undefined;
			  }
			| undefined;
	}): Promise<{ id: string }>;
}

export interface PaymentProcessController {
	createIntent(params: {
		amount: number;
		currency?: string | undefined;
		customerId?: string | undefined;
		email?: string | undefined;
		checkoutSessionId?: string | undefined;
		metadata?: Record<string, unknown> | undefined;
	}): Promise<{
		id: string;
		status: string;
		amount: number;
		currency: string;
		providerMetadata?: Record<string, unknown> | undefined;
	}>;

	confirmIntent(id: string): Promise<{ id: string; status: string } | null>;

	getIntent(id: string): Promise<{
		id: string;
		status: string;
		amount: number;
		currency: string;
		providerMetadata?: Record<string, unknown> | undefined;
	} | null>;

	cancelIntent(id: string): Promise<{ id: string; status: string } | null>;
}

export type CheckoutStatus =
	| "pending"
	| "processing"
	| "completed"
	| "expired"
	| "abandoned";

export interface CheckoutAddress {
	firstName: string;
	lastName: string;
	company?: string | undefined;
	line1: string;
	line2?: string | undefined;
	city: string;
	state: string;
	postalCode: string;
	country: string;
	phone?: string | undefined;
}

export interface CheckoutSession {
	id: string;
	cartId?: string | undefined;
	customerId?: string | undefined;
	guestEmail?: string | undefined;
	status: CheckoutStatus;
	subtotal: number;
	taxAmount: number;
	shippingAmount: number;
	discountAmount: number;
	giftCardAmount: number;
	total: number;
	currency: string;
	discountCode?: string | undefined;
	giftCardCode?: string | undefined;
	shippingAddress?: CheckoutAddress | undefined;
	billingAddress?: CheckoutAddress | undefined;
	paymentMethod?: string | undefined;
	/** ID of the payment intent linked to this session */
	paymentIntentId?: string | undefined;
	/** Current status of the payment (mirrors the payment intent status) */
	paymentStatus?: string | undefined;
	orderId?: string | undefined;
	metadata?: Record<string, unknown> | undefined;
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface CheckoutLineItem {
	productId: string;
	variantId?: string | undefined;
	name: string;
	sku?: string | undefined;
	price: number;
	quantity: number;
}

export interface CheckoutController extends ModuleController {
	/**
	 * Create a new checkout session.
	 * Caller is responsible for providing line items and totals
	 * (typically sourced from the cart module).
	 */
	create(params: {
		id?: string | undefined;
		cartId?: string | undefined;
		customerId?: string | undefined;
		guestEmail?: string | undefined;
		currency?: string | undefined;
		subtotal: number;
		taxAmount?: number | undefined;
		shippingAmount?: number | undefined;
		discountAmount?: number | undefined;
		giftCardAmount?: number | undefined;
		total: number;
		lineItems: CheckoutLineItem[];
		shippingAddress?: CheckoutAddress | undefined;
		billingAddress?: CheckoutAddress | undefined;
		metadata?: Record<string, unknown> | undefined;
		/** Session TTL in milliseconds, default 30 minutes */
		ttl?: number | undefined;
	}): Promise<CheckoutSession>;

	/** Get a checkout session by ID */
	getById(id: string): Promise<CheckoutSession | null>;

	/**
	 * Update shipping/billing address and contact info.
	 * Also recalculates total if shippingAmount changes.
	 */
	update(
		id: string,
		params: {
			guestEmail?: string | undefined;
			shippingAddress?: CheckoutAddress | undefined;
			billingAddress?: CheckoutAddress | undefined;
			shippingAmount?: number | undefined;
			taxAmount?: number | undefined;
			paymentMethod?: string | undefined;
			metadata?: Record<string, unknown> | undefined;
		},
	): Promise<CheckoutSession | null>;

	/** Apply a promo code and update discountAmount */
	applyDiscount(
		id: string,
		params: {
			code: string;
			discountAmount: number;
			freeShipping: boolean;
		},
	): Promise<CheckoutSession | null>;

	/** Remove applied discount */
	removeDiscount(id: string): Promise<CheckoutSession | null>;

	/** Apply a gift card and update giftCardAmount */
	applyGiftCard(
		id: string,
		params: {
			code: string;
			giftCardAmount: number;
		},
	): Promise<CheckoutSession | null>;

	/** Remove applied gift card */
	removeGiftCard(id: string): Promise<CheckoutSession | null>;

	/**
	 * Validate the session has all required fields and transition to "processing".
	 * Returns an error string if validation fails, or the updated session.
	 */
	confirm(
		id: string,
	): Promise<{ session: CheckoutSession } | { error: string; status: number }>;

	/** Store a payment intent ID and status on the session */
	setPaymentIntent(
		id: string,
		intentId: string,
		status: string,
	): Promise<CheckoutSession | null>;

	/** Mark session as completed and store orderId */
	complete(id: string, orderId: string): Promise<CheckoutSession | null>;

	/** Abandon a session */
	abandon(id: string): Promise<CheckoutSession | null>;

	/** Get line items stored for this session */
	getLineItems(sessionId: string): Promise<CheckoutLineItem[]>;

	/** Expire sessions past their TTL. Returns count and processing sessions that need cleanup. */
	expireStale(): Promise<{
		expired: number;
		/** Sessions that were in "processing" state (had reserved inventory). */
		processingSessions: CheckoutSession[];
	}>;

	/** List checkout sessions with optional filtering and pagination */
	listSessions(params: {
		status?: CheckoutStatus | undefined;
		search?: string | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<{ sessions: CheckoutSession[]; total: number }>;

	/** Get conversion statistics across all checkout sessions */
	getStats(): Promise<{
		total: number;
		pending: number;
		processing: number;
		completed: number;
		abandoned: number;
		expired: number;
		conversionRate: number;
		totalRevenue: number;
		averageOrderValue: number;
	}>;
}
