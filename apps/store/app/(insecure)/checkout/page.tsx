"use client";

import type { CheckoutStep } from "@86d-app/checkout/state";
import { observer } from "@86d-app/core/state";
import { StripePaymentForm } from "components/stripe-payment-form";
import { useApi } from "generated/hooks";
import { useAnalytics } from "hooks/use-analytics";
import { useStore } from "hooks/use-store";
import { useCallback, useEffect, useId, useRef, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────

interface CartItem {
	id: string;
	productId: string;
	variantId?: string | null;
	quantity: number;
	product: {
		name: string;
		price: number;
		images?: string[] | null;
		slug: string;
	};
	variant?: {
		name: string;
		price?: number | null;
	} | null;
}

interface CartData {
	id: string;
	items: CartItem[];
	subtotal: number;
	itemCount: number;
}

interface Address {
	firstName: string;
	lastName: string;
	company: string;
	line1: string;
	line2: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
	phone: string;
}

interface ShippingRate {
	id: string;
	name: string;
	price: number;
	estimatedDays?: number | null;
}

// biome-ignore lint/suspicious/noExplicitAny: API response types from dynamic module hooks
type ApiResponse = any;

// ─── Helpers ────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(cents / 100);
}

const STEPS: CheckoutStep[] = ["information", "shipping", "payment", "review"];

const STEP_LABELS: Record<CheckoutStep, string> = {
	information: "Information",
	shipping: "Shipping",
	payment: "Payment",
	review: "Review",
};

function emptyAddress(): Address {
	return {
		firstName: "",
		lastName: "",
		company: "",
		line1: "",
		line2: "",
		city: "",
		state: "",
		postalCode: "",
		country: "US",
		phone: "",
	};
}

// ─── Step indicator ─────────────────────────────────────────────────

function StepIndicator({ current }: { current: CheckoutStep }) {
	const currentIdx = STEPS.indexOf(current);
	return (
		<nav aria-label="Checkout progress" className="mb-8">
			<ol className="flex items-center gap-0">
				{STEPS.map((step, idx) => {
					const isComplete = idx < currentIdx;
					const isCurrent = idx === currentIdx;
					return (
						<li key={step} className="flex items-center">
							{idx > 0 && (
								<div
									className={`mx-2 h-px w-6 sm:mx-3 sm:w-10 ${
										isComplete ? "bg-foreground" : "bg-border"
									}`}
								/>
							)}
							<span
								className={`font-medium text-xs tracking-wide sm:text-sm ${
									isCurrent
										? "text-foreground"
										: isComplete
											? "text-foreground/60"
											: "text-muted-foreground/50"
								}`}
								aria-current={isCurrent ? "step" : undefined}
							>
								{STEP_LABELS[step]}
							</span>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

// ─── Form input ─────────────────────────────────────────────────────

function Input({
	label,
	value,
	onChange,
	type = "text",
	required = false,
	placeholder,
	autoComplete,
	id,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	type?: string;
	required?: boolean;
	placeholder?: string;
	autoComplete?: string;
	id: string;
}) {
	return (
		<div>
			<label
				htmlFor={id}
				className="mb-1.5 block font-medium text-foreground/80 text-xs"
			>
				{label}
				{required && <span className="text-destructive"> *</span>}
			</label>
			<input
				id={id}
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				required={required}
				placeholder={placeholder}
				autoComplete={autoComplete}
				className="w-full rounded-lg border border-border/60 bg-background px-3.5 py-2.5 text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
			/>
		</div>
	);
}

// ─── Address form ───────────────────────────────────────────────────

function AddressForm({
	address,
	onChange,
	prefix,
}: {
	address: Address;
	onChange: (a: Address) => void;
	prefix: string;
}) {
	const idPrefix = useId();
	const update = (key: keyof Address, value: string) =>
		onChange({ ...address, [key]: value });

	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
			<Input
				id={`${idPrefix}-${prefix}-first`}
				label="First name"
				value={address.firstName}
				onChange={(v) => update("firstName", v)}
				required
				autoComplete="given-name"
			/>
			<Input
				id={`${idPrefix}-${prefix}-last`}
				label="Last name"
				value={address.lastName}
				onChange={(v) => update("lastName", v)}
				required
				autoComplete="family-name"
			/>
			<div className="sm:col-span-2">
				<Input
					id={`${idPrefix}-${prefix}-company`}
					label="Company"
					value={address.company}
					onChange={(v) => update("company", v)}
					autoComplete="organization"
				/>
			</div>
			<div className="sm:col-span-2">
				<Input
					id={`${idPrefix}-${prefix}-line1`}
					label="Address"
					value={address.line1}
					onChange={(v) => update("line1", v)}
					required
					autoComplete="address-line1"
				/>
			</div>
			<div className="sm:col-span-2">
				<Input
					id={`${idPrefix}-${prefix}-line2`}
					label="Apartment, suite, etc."
					value={address.line2}
					onChange={(v) => update("line2", v)}
					autoComplete="address-line2"
				/>
			</div>
			<Input
				id={`${idPrefix}-${prefix}-city`}
				label="City"
				value={address.city}
				onChange={(v) => update("city", v)}
				required
				autoComplete="address-level2"
			/>
			<Input
				id={`${idPrefix}-${prefix}-state`}
				label="State / Province"
				value={address.state}
				onChange={(v) => update("state", v)}
				required
				autoComplete="address-level1"
			/>
			<Input
				id={`${idPrefix}-${prefix}-postal`}
				label="Postal code"
				value={address.postalCode}
				onChange={(v) => update("postalCode", v)}
				required
				autoComplete="postal-code"
			/>
			<Input
				id={`${idPrefix}-${prefix}-phone`}
				label="Phone"
				value={address.phone}
				onChange={(v) => update("phone", v)}
				type="tel"
				autoComplete="tel"
			/>
		</div>
	);
}

// ─── Order summary sidebar ──────────────────────────────────────────

function OrderSummary({
	cart,
	session,
	discountCode,
	onApplyDiscount,
	onRemoveDiscount,
	applyingDiscount,
	giftCardCode,
	onApplyGiftCard,
	onRemoveGiftCard,
	applyingGiftCard,
}: {
	cart: CartData | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: checkout session shape from dynamic API
	session: any;
	discountCode: string;
	onApplyDiscount: (code: string) => void;
	onRemoveDiscount: () => void;
	applyingDiscount: boolean;
	giftCardCode: string;
	onApplyGiftCard: (code: string) => void;
	onRemoveGiftCard: () => void;
	applyingGiftCard: boolean;
}) {
	const [promoInput, setPromoInput] = useState("");
	const [giftCardInput, setGiftCardInput] = useState("");

	const subtotal = session?.subtotal ?? cart?.subtotal ?? 0;
	const shipping = session?.shippingAmount ?? 0;
	const discount = session?.discountAmount ?? 0;
	const giftCard = session?.giftCardAmount ?? 0;
	const tax = session?.taxAmount ?? 0;
	const total = session?.total ?? subtotal;

	return (
		<div className="rounded-xl border border-border/40 bg-muted/30 p-5">
			<h3 className="mb-4 font-bold text-foreground text-sm tracking-tight">
				Order summary
			</h3>

			{/* Line items */}
			<ul className="mb-4 flex flex-col gap-3">
				{(cart?.items ?? []).map((item) => {
					const price = item.variant?.price ?? item.product.price;
					const image = item.product.images?.[0];
					return (
						<li key={item.id} className="flex gap-3">
							<div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
								{image ? (
									<img
										src={image}
										alt={item.product.name}
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
											aria-hidden="true"
										>
											<rect width="18" height="18" x="3" y="3" rx="2" />
											<circle cx="9" cy="9" r="2" />
											<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
										</svg>
									</div>
								)}
								{item.quantity > 1 && (
									<span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground font-semibold text-2xs text-background">
										{item.quantity}
									</span>
								)}
							</div>
							<div className="flex min-w-0 flex-1 items-start justify-between">
								<div className="min-w-0">
									<p className="truncate font-medium text-foreground text-sm">
										{item.product.name}
									</p>
									{item.variant && (
										<p className="text-muted-foreground text-xs">
											{item.variant.name}
										</p>
									)}
								</div>
								<p className="ml-3 flex-shrink-0 text-foreground text-sm tabular-nums">
									{formatPrice(price * item.quantity)}
								</p>
							</div>
						</li>
					);
				})}
			</ul>

			{/* Promo code */}
			{!discountCode ? (
				<div className="mb-4 flex gap-2">
					<input
						type="text"
						value={promoInput}
						onChange={(e) => setPromoInput(e.target.value)}
						placeholder="Discount code"
						className="min-w-0 flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground/30"
					/>
					<button
						type="button"
						onClick={() => {
							if (promoInput.trim()) onApplyDiscount(promoInput.trim());
						}}
						disabled={applyingDiscount || !promoInput.trim()}
						className="rounded-lg border border-border/60 bg-background px-3.5 py-2 font-medium text-foreground text-sm transition-colors hover:bg-muted disabled:opacity-50"
					>
						{applyingDiscount ? "..." : "Apply"}
					</button>
				</div>
			) : (
				<div className="mb-4 flex items-center justify-between rounded-lg bg-background px-3 py-2">
					<div className="flex items-center gap-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-foreground"
							aria-hidden="true"
						>
							<path d="m2 9 3-3 3 3" />
							<path d="M13 18H7a2 2 0 0 1-2-2V6" />
							<path d="m22 15-3 3-3-3" />
							<path d="M11 6h6a2 2 0 0 1 2 2v10" />
						</svg>
						<span className="font-medium text-foreground text-sm">
							{discountCode}
						</span>
					</div>
					<button
						type="button"
						onClick={onRemoveDiscount}
						className="text-muted-foreground text-xs transition-colors hover:text-foreground"
					>
						Remove
					</button>
				</div>
			)}

			{/* Gift card */}
			{!giftCardCode ? (
				<div className="mb-4 flex gap-2">
					<input
						type="text"
						value={giftCardInput}
						onChange={(e) => setGiftCardInput(e.target.value.toUpperCase())}
						placeholder="Gift card code"
						className="min-w-0 flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-foreground text-sm uppercase outline-none transition-colors placeholder:text-muted-foreground/50 placeholder:normal-case focus:border-foreground/30"
					/>
					<button
						type="button"
						onClick={() => {
							if (giftCardInput.trim()) onApplyGiftCard(giftCardInput.trim());
						}}
						disabled={applyingGiftCard || !giftCardInput.trim()}
						className="rounded-lg border border-border/60 bg-background px-3.5 py-2 font-medium text-foreground text-sm transition-colors hover:bg-muted disabled:opacity-50"
					>
						{applyingGiftCard ? "..." : "Apply"}
					</button>
				</div>
			) : (
				<div className="mb-4 flex items-center justify-between rounded-lg bg-background px-3 py-2">
					<div className="flex items-center gap-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-foreground"
							aria-hidden="true"
						>
							<rect x="2" y="4" width="20" height="16" rx="2" />
							<path d="M2 10h20" />
						</svg>
						<span className="font-medium font-mono text-foreground text-sm">
							{giftCardCode}
						</span>
					</div>
					<button
						type="button"
						onClick={onRemoveGiftCard}
						className="text-muted-foreground text-xs transition-colors hover:text-foreground"
					>
						Remove
					</button>
				</div>
			)}

			{/* Totals */}
			<div className="flex flex-col gap-2 border-border/40 border-t pt-3">
				<div className="flex justify-between text-sm">
					<span className="text-muted-foreground">Subtotal</span>
					<span className="text-foreground tabular-nums">
						{formatPrice(subtotal)}
					</span>
				</div>
				{shipping > 0 && (
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Shipping</span>
						<span className="text-foreground tabular-nums">
							{formatPrice(shipping)}
						</span>
					</div>
				)}
				{discount > 0 && (
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Discount</span>
						<span className="text-status-success tabular-nums">
							-{formatPrice(discount)}
						</span>
					</div>
				)}
				{giftCard > 0 && (
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Gift card</span>
						<span className="text-status-success tabular-nums">
							-{formatPrice(giftCard)}
						</span>
					</div>
				)}
				{tax > 0 && (
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Tax</span>
						<span className="text-foreground tabular-nums">
							{formatPrice(tax)}
						</span>
					</div>
				)}
				<div className="flex justify-between border-border/40 border-t pt-3">
					<span className="font-bold text-foreground">Total</span>
					<span className="font-bold font-display text-foreground text-lg tabular-nums">
						{formatPrice(total)}
					</span>
				</div>
			</div>
		</div>
	);
}

// ─── Main checkout page ─────────────────────────────────────────────

const CheckoutPage = observer(function CheckoutPage() {
	const api = useApi();
	const { cart: cartStore, checkout: co } = useStore();
	const { track } = useAnalytics();

	// ── Cart data
	const { data: cart } = api.cart.getCart.useQuery() as {
		data: CartData | undefined;
	};

	// ── Form state
	const [email, setEmail] = useState("");
	const [shippingAddress, setShippingAddress] = useState<Address>(
		emptyAddress(),
	);
	const [billingAddress, setBillingAddress] = useState<Address>(emptyAddress());
	const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
	const [selectedRate, setSelectedRate] = useState<string | null>(null);
	const [discountCode, setDiscountCode] = useState("");
	const [giftCardCode, setGiftCardCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(
		null,
	);
	const emailId = useId();
	const formRef = useRef<HTMLFormElement>(null);

	// ── Session data
	// biome-ignore lint/suspicious/noExplicitAny: checkout session shape from dynamic API
	const [session, setSession] = useState<any>(null);

	// ── Mutations
	const createSessionMut = api.checkout.createSession.useMutation({
		onError: () => setError("Failed to create checkout session"),
	});
	const updateSessionMut = api.checkout.updateSession.useMutation({
		onError: () => setError("Failed to update checkout session"),
	});
	const confirmSessionMut = api.checkout.confirmSession.useMutation({
		onError: () => setError("Failed to confirm order"),
	});
	const completeSessionMut = api.checkout.completeSession.useMutation({
		onError: () => setError("Failed to complete order"),
	});
	const applyDiscountMut = api.checkout.applyDiscount.useMutation({
		onError: () => setError("Invalid discount code"),
	});
	const removeDiscountMut = api.checkout.removeDiscount.useMutation({
		onError: () => setError("Failed to remove discount"),
	});
	const applyGiftCardMut = api.checkout.applyGiftCard.useMutation({
		onError: () => setError("Invalid gift card code"),
	});
	const removeGiftCardMut = api.checkout.removeGiftCard.useMutation({
		onError: () => setError("Failed to remove gift card"),
	});
	const createPaymentMut = api.checkout.createPayment.useMutation({
		onError: () => setError("Failed to process payment"),
	});
	const calcShippingMut = api.shipping.calculateRates.useMutation({
		onError: () => setShippingRates([]),
	});

	// ── Close cart drawer on mount
	useEffect(() => {
		cartStore.closeDrawer();
	}, [cartStore]);

	// ── Reset checkout state on unmount
	useEffect(() => {
		return () => {
			co.reset();
		};
	}, [co]);

	// ── Validate address has all required fields
	const isAddressValid = useCallback((addr: Address) => {
		return (
			addr.firstName.trim() !== "" &&
			addr.lastName.trim() !== "" &&
			addr.line1.trim() !== "" &&
			addr.city.trim() !== "" &&
			addr.state.trim() !== "" &&
			addr.postalCode.trim() !== "" &&
			addr.country.trim() !== ""
		);
	}, []);

	// ── Create session and move to shipping
	const handleInformationSubmit = useCallback(async () => {
		if (!cart || cart.items.length === 0) return;
		if (!email.trim() && !isAddressValid(shippingAddress)) {
			setError("Please fill in your email and shipping address");
			return;
		}
		if (!email.trim()) {
			setError("Please enter your email address");
			return;
		}
		if (!isAddressValid(shippingAddress)) {
			setError("Please complete your shipping address");
			return;
		}
		setError(null);
		co.setProcessing(true);

		try {
			const lineItems = cart.items.map((item) => ({
				productId: item.productId,
				...(item.variantId ? { variantId: item.variantId } : {}),
				name: item.product.name,
				price: item.variant?.price ?? item.product.price,
				quantity: item.quantity,
			}));

			const addr = {
				firstName: shippingAddress.firstName,
				lastName: shippingAddress.lastName,
				...(shippingAddress.company
					? { company: shippingAddress.company }
					: {}),
				line1: shippingAddress.line1,
				...(shippingAddress.line2 ? { line2: shippingAddress.line2 } : {}),
				city: shippingAddress.city,
				state: shippingAddress.state,
				postalCode: shippingAddress.postalCode,
				country: shippingAddress.country,
				...(shippingAddress.phone ? { phone: shippingAddress.phone } : {}),
			};

			let result: ApiResponse;
			if (co.sessionId) {
				// Update existing session
				result = await updateSessionMut.mutateAsync({
					params: { id: co.sessionId },
					guestEmail: email,
					shippingAddress: addr,
					...(co.sameAsShipping
						? { billingAddress: addr }
						: {
								billingAddress: {
									firstName: billingAddress.firstName,
									lastName: billingAddress.lastName,
									...(billingAddress.company
										? { company: billingAddress.company }
										: {}),
									line1: billingAddress.line1,
									...(billingAddress.line2
										? { line2: billingAddress.line2 }
										: {}),
									city: billingAddress.city,
									state: billingAddress.state,
									postalCode: billingAddress.postalCode,
									country: billingAddress.country,
									...(billingAddress.phone
										? { phone: billingAddress.phone }
										: {}),
								},
							}),
				});
			} else {
				// Create new session
				result = await createSessionMut.mutateAsync({
					cartId: cart.id,
					guestEmail: email,
					subtotal: cart.subtotal,
					total: cart.subtotal,
					lineItems,
					shippingAddress: addr,
					...(co.sameAsShipping
						? { billingAddress: addr }
						: {
								billingAddress: {
									firstName: billingAddress.firstName,
									lastName: billingAddress.lastName,
									...(billingAddress.company
										? { company: billingAddress.company }
										: {}),
									line1: billingAddress.line1,
									...(billingAddress.line2
										? { line2: billingAddress.line2 }
										: {}),
									city: billingAddress.city,
									state: billingAddress.state,
									postalCode: billingAddress.postalCode,
									country: billingAddress.country,
									...(billingAddress.phone
										? { phone: billingAddress.phone }
										: {}),
								},
							}),
				});
			}

			const sess = result?.session ?? result;
			if (sess?.id) {
				setSession(sess);
				co.setSessionId(sess.id);
				track({
					type: "checkout",
					value: cart.subtotal,
					data: { sessionId: sess.id, itemCount: cart.itemCount },
				});
			}

			// Fetch shipping rates
			calcShippingMut.mutate(
				{
					country: shippingAddress.country,
					orderAmount: cart.subtotal,
				},
				{
					onSuccess: (data: ApiResponse) => {
						const rates = data?.rates ?? [];
						setShippingRates(rates);
						if (rates.length > 0) {
							setSelectedRate(rates[0].id);
						}
					},
				},
			);

			co.setStep("shipping");
		} catch {
			// Error handled by mutation onError
		} finally {
			co.setProcessing(false);
		}
	}, [
		cart,
		email,
		shippingAddress,
		billingAddress,
		co,
		isAddressValid,
		createSessionMut,
		updateSessionMut,
		calcShippingMut,
	]);

	// ── Select shipping and move to payment
	const handleShippingSubmit = useCallback(async () => {
		if (!co.sessionId) return;
		setError(null);
		co.setProcessing(true);

		try {
			const rate = shippingRates.find((r) => r.id === selectedRate);
			const shippingAmount = rate?.price ?? 0;

			const result: ApiResponse = await updateSessionMut.mutateAsync({
				params: { id: co.sessionId },
				shippingAmount,
			});

			const sess = result?.session ?? result;
			if (sess) setSession(sess);

			co.setStep("payment");
		} catch {
			// Error handled by mutation onError
		} finally {
			co.setProcessing(false);
		}
	}, [co, shippingRates, selectedRate, updateSessionMut]);

	// ── Payment step: create intent and either advance (demo) or show Stripe
	const handlePaymentSubmit = useCallback(async () => {
		if (!co.sessionId) return;
		setError(null);
		co.setProcessing(true);

		try {
			const payResult: ApiResponse = await createPaymentMut.mutateAsync({
				params: { id: co.sessionId },
			});

			const payment = payResult?.payment;
			const sess = payResult?.session ?? session;
			if (sess) setSession(sess);

			// If payment already succeeded (demo mode or zero-total), advance
			if (payment?.status === "succeeded") {
				co.setStep("review");
				return;
			}

			// If a clientSecret is returned, Stripe Elements will handle it
			if (payment?.clientSecret) {
				setPaymentClientSecret(payment.clientSecret);
				co.setProcessing(false);
				return;
			}

			// Fallback: no clientSecret and not succeeded
			setError("Payment could not be processed. Please try again.");
		} catch {
			// Error handled by mutation onError
		} finally {
			co.setProcessing(false);
		}
	}, [co, createPaymentMut, session]);

	// ── Stripe payment confirmed client-side → sync status and advance
	const handleStripePaymentSuccess = useCallback(async () => {
		if (!co.sessionId) return;

		try {
			// Sync payment status from the provider
			const statusResult: ApiResponse = await api.checkout.getPayment.fetch({
				params: { id: co.sessionId },
			});

			const sess = statusResult?.session;
			if (sess) setSession(sess);

			setPaymentClientSecret(null);
			co.setStep("review");
		} catch {
			setError("Payment confirmed but failed to sync. Please continue.");
			co.setStep("review");
		} finally {
			co.setProcessing(false);
		}
	}, [co, api.checkout.getPayment]);

	// ── Auto-create payment intent when entering payment step
	const paymentInitRef = useRef(false);
	useEffect(() => {
		if (
			co.currentStep === "payment" &&
			!paymentClientSecret &&
			co.sessionId &&
			!paymentInitRef.current
		) {
			paymentInitRef.current = true;
			void handlePaymentSubmit();
		}
		if (co.currentStep !== "payment") {
			paymentInitRef.current = false;
		}
	}, [co.currentStep, co.sessionId, paymentClientSecret, handlePaymentSubmit]);

	// ── Confirm and complete order
	const handlePlaceOrder = useCallback(async () => {
		if (!co.sessionId) return;
		setError(null);
		co.setProcessing(true);

		try {
			// Confirm the session (validates all fields)
			const confirmResult: ApiResponse = await confirmSessionMut.mutateAsync({
				params: { id: co.sessionId },
			});

			if (confirmResult?.error) {
				setError(confirmResult.error);
				co.setProcessing(false);
				return;
			}

			// Complete the session — the server creates the real order
			const completeResult = await completeSessionMut.mutateAsync({
				params: { id: co.sessionId },
			});

			// Clear cart after successful order
			await api.cart.clearCart.mutate(undefined);
			void api.cart.getCart.invalidate();
			cartStore.setItemCount(0);

			// Navigate to confirmation using server-returned orderId
			const orderId =
				(completeResult as { orderId?: string })?.orderId ??
				co.sessionId;
			window.location.href = `/checkout/confirmation?order=${orderId}`;
		} catch {
			// Error handled by mutation onError
		} finally {
			co.setProcessing(false);
		}
	}, [co, confirmSessionMut, completeSessionMut, api, cartStore]);

	// ── Apply discount
	const handleApplyDiscount = useCallback(
		async (code: string) => {
			if (!co.sessionId) return;
			setError(null);
			try {
				const result: ApiResponse = await applyDiscountMut.mutateAsync({
					params: { id: co.sessionId },
					code,
				});
				const sess = result?.session ?? result;
				if (sess) {
					setSession(sess);
					setDiscountCode(code);
				}
			} catch {
				// Error handled by mutation onError
			}
		},
		[co, applyDiscountMut],
	);

	// ── Remove discount
	const handleRemoveDiscount = useCallback(async () => {
		if (!co.sessionId) return;
		setError(null);
		try {
			const result: ApiResponse = await removeDiscountMut.mutateAsync({
				params: { id: co.sessionId },
			});
			const sess = result?.session ?? result;
			if (sess) {
				setSession(sess);
				setDiscountCode("");
			}
		} catch {
			// Error handled by mutation onError
		}
	}, [co, removeDiscountMut]);

	// ── Apply gift card
	const handleApplyGiftCard = useCallback(
		async (code: string) => {
			if (!co.sessionId) return;
			setError(null);
			try {
				const result: ApiResponse = await applyGiftCardMut.mutateAsync({
					params: { id: co.sessionId },
					code,
				});
				const sess = result?.session ?? result;
				if (sess) {
					setSession(sess);
					setGiftCardCode(code.toUpperCase());
				}
			} catch {
				// Error handled by mutation onError
			}
		},
		[co, applyGiftCardMut],
	);

	// ── Remove gift card
	const handleRemoveGiftCard = useCallback(async () => {
		if (!co.sessionId) return;
		setError(null);
		try {
			const result: ApiResponse = await removeGiftCardMut.mutateAsync({
				params: { id: co.sessionId },
			});
			const sess = result?.session ?? result;
			if (sess) {
				setSession(sess);
				setGiftCardCode("");
			}
		} catch {
			// Error handled by mutation onError
		}
	}, [co, removeGiftCardMut]);

	// ── Empty cart state
	if (cart && cart.items.length === 0 && !co.sessionId) {
		return (
			<div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16">
				<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="28"
						height="28"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="text-muted-foreground"
						aria-hidden="true"
					>
						<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
						<path d="M3 6h18" />
						<path d="M16 10a4 4 0 0 1-8 0" />
					</svg>
				</div>
				<h1 className="mb-2 font-bold text-foreground text-lg">
					Your cart is empty
				</h1>
				<p className="mb-6 text-muted-foreground text-sm">
					Add some items to your cart before checking out.
				</p>
				<a
					href="/products"
					className="rounded-lg bg-foreground px-5 py-2.5 font-semibold text-background text-sm transition-opacity hover:opacity-90"
				>
					Browse products
				</a>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			{/* Header */}
			<div className="mb-2">
				<a
					href="/"
					className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="m15 18-6-6 6-6" />
					</svg>
					Back to store
				</a>
			</div>
			<h1 className="mb-6 font-bold font-display text-2xl text-foreground tracking-tight sm:text-3xl">
				Checkout
			</h1>

			<StepIndicator current={co.currentStep} />

			{error && (
				<div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-destructive text-sm">
					{error}
				</div>
			)}

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
				{/* Main form */}
				<div className="lg:col-span-7">
					{/* ── Information step ────────────────────────── */}
					{co.currentStep === "information" && (
						<form
							ref={formRef}
							onSubmit={(e) => {
								e.preventDefault();
								void handleInformationSubmit();
							}}
						>
							<section className="mb-8">
								<h2 className="mb-4 font-bold text-base text-foreground tracking-tight">
									Contact
								</h2>
								<Input
									id={`${emailId}-email`}
									label="Email"
									type="email"
									value={email}
									onChange={setEmail}
									required
									placeholder="your@email.com"
									autoComplete="email"
								/>
							</section>

							<section className="mb-8">
								<h2 className="mb-4 font-bold text-base text-foreground tracking-tight">
									Shipping address
								</h2>
								<AddressForm
									address={shippingAddress}
									onChange={setShippingAddress}
									prefix="ship"
								/>
							</section>

							<section className="mb-8">
								<label className="flex items-center gap-2.5">
									<input
										type="checkbox"
										checked={co.sameAsShipping}
										onChange={(e) => co.setSameAsShipping(e.target.checked)}
										className="h-4 w-4 rounded border-border accent-foreground"
									/>
									<span className="text-foreground text-sm">
										Billing address same as shipping
									</span>
								</label>
							</section>

							{!co.sameAsShipping && (
								<section className="mb-8">
									<h2 className="mb-4 font-bold text-base text-foreground tracking-tight">
										Billing address
									</h2>
									<AddressForm
										address={billingAddress}
										onChange={setBillingAddress}
										prefix="bill"
									/>
								</section>
							)}

							<button
								type="submit"
								disabled={co.isProcessing}
								className="w-full rounded-lg bg-foreground px-5 py-3 text-center font-semibold text-background text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
							>
								{co.isProcessing ? "Processing..." : "Continue to shipping"}
							</button>
						</form>
					)}

					{/* ── Shipping step ───────────────────────────── */}
					{co.currentStep === "shipping" && (
						<div>
							{/* Summary of info step */}
							<div className="mb-6 rounded-lg border border-border/40 p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-muted-foreground text-xs">Contact</p>
										<p className="text-foreground text-sm">{email}</p>
									</div>
									<button
										type="button"
										onClick={() => co.setStep("information")}
										className="font-medium text-foreground/60 text-xs transition-colors hover:text-foreground"
									>
										Change
									</button>
								</div>
								<div className="mt-3 border-border/40 border-t pt-3">
									<div className="flex items-start justify-between">
										<div>
											<p className="text-muted-foreground text-xs">Ship to</p>
											<p className="text-foreground text-sm">
												{shippingAddress.line1}, {shippingAddress.city},{" "}
												{shippingAddress.state} {shippingAddress.postalCode}
											</p>
										</div>
										<button
											type="button"
											onClick={() => co.setStep("information")}
											className="font-medium text-foreground/60 text-xs transition-colors hover:text-foreground"
										>
											Change
										</button>
									</div>
								</div>
							</div>

							<h2 className="mb-4 font-bold text-base text-foreground tracking-tight">
								Shipping method
							</h2>

							{calcShippingMut.isPending ? (
								<div className="flex items-center gap-2 py-8 text-muted-foreground text-sm">
									<svg
										className="h-4 w-4 animate-spin"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										/>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
										/>
									</svg>
									Calculating shipping rates...
								</div>
							) : shippingRates.length > 0 ? (
								<div className="mb-6 flex flex-col gap-2">
									{shippingRates.map((rate) => (
										<label
											key={rate.id}
											className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors ${
												selectedRate === rate.id
													? "border-foreground/40 bg-foreground/[0.03]"
													: "border-border/40 hover:border-border"
											}`}
										>
											<div className="flex items-center gap-3">
												<input
													type="radio"
													name="shipping-rate"
													value={rate.id}
													checked={selectedRate === rate.id}
													onChange={() => setSelectedRate(rate.id)}
													className="h-4 w-4 accent-foreground"
												/>
												<div>
													<p className="font-medium text-foreground text-sm">
														{rate.name}
													</p>
													{rate.estimatedDays != null && (
														<p className="text-muted-foreground text-xs">
															{rate.estimatedDays} business day
															{rate.estimatedDays !== 1 ? "s" : ""}
														</p>
													)}
												</div>
											</div>
											<p className="font-medium text-foreground text-sm tabular-nums">
												{rate.price === 0 ? "Free" : formatPrice(rate.price)}
											</p>
										</label>
									))}
								</div>
							) : (
								<div className="mb-6 rounded-lg border border-border/40 p-4">
									<p className="text-foreground text-sm">Standard shipping</p>
									<p className="text-muted-foreground text-xs">
										Free shipping on all orders
									</p>
								</div>
							)}

							<div className="flex gap-3">
								<button
									type="button"
									onClick={() => co.setStep("information")}
									className="rounded-lg border border-border/60 px-5 py-3 font-medium text-foreground text-sm transition-colors hover:bg-muted"
								>
									Back
								</button>
								<button
									type="button"
									onClick={() => void handleShippingSubmit()}
									disabled={co.isProcessing}
									className="flex-1 rounded-lg bg-foreground px-5 py-3 text-center font-semibold text-background text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
								>
									{co.isProcessing ? "Processing..." : "Continue to payment"}
								</button>
							</div>
						</div>
					)}

					{/* ── Payment step ────────────────────────────── */}
					{co.currentStep === "payment" && (
						<div>
							{/* Summary of previous steps */}
							<div className="mb-6 rounded-lg border border-border/40 p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-muted-foreground text-xs">Contact</p>
										<p className="text-foreground text-sm">{email}</p>
									</div>
									<button
										type="button"
										onClick={() => co.setStep("information")}
										className="font-medium text-foreground/60 text-xs transition-colors hover:text-foreground"
									>
										Change
									</button>
								</div>
								<div className="mt-3 border-border/40 border-t pt-3">
									<div className="flex items-start justify-between">
										<div>
											<p className="text-muted-foreground text-xs">Ship to</p>
											<p className="text-foreground text-sm">
												{shippingAddress.line1}, {shippingAddress.city},{" "}
												{shippingAddress.state} {shippingAddress.postalCode}
											</p>
										</div>
										<button
											type="button"
											onClick={() => co.setStep("information")}
											className="font-medium text-foreground/60 text-xs transition-colors hover:text-foreground"
										>
											Change
										</button>
									</div>
								</div>
								<div className="mt-3 border-border/40 border-t pt-3">
									<div className="flex items-start justify-between">
										<div>
											<p className="text-muted-foreground text-xs">Method</p>
											<p className="text-foreground text-sm">
												{shippingRates.find((r) => r.id === selectedRate)
													?.name ?? "Standard shipping"}
											</p>
										</div>
										<button
											type="button"
											onClick={() => co.setStep("shipping")}
											className="font-medium text-foreground/60 text-xs transition-colors hover:text-foreground"
										>
											Change
										</button>
									</div>
								</div>
							</div>

							<h2 className="mb-4 font-bold text-base text-foreground tracking-tight">
								Payment
							</h2>

							{/* Payment form — Stripe Elements or demo fallback */}
							{paymentClientSecret ? (
								<StripePaymentForm
									clientSecret={paymentClientSecret}
									onSuccess={() => void handleStripePaymentSuccess()}
									onError={(msg) => setError(msg)}
									isProcessing={co.isProcessing}
									setProcessing={(v) => co.setProcessing(v)}
									onBack={() => {
										setPaymentClientSecret(null);
										co.setStep("shipping");
									}}
								/>
							) : (
								<div className="flex flex-col items-center justify-center py-10">
									<svg
										className="h-6 w-6 animate-spin text-foreground"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										/>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
										/>
									</svg>
									<p className="mt-3 text-muted-foreground text-sm">
										Preparing payment...
									</p>
								</div>
							)}
						</div>
					)}

					{/* ── Review step ─────────────────────────────── */}
					{co.currentStep === "review" && (
						<div>
							<h2 className="mb-4 font-bold text-base text-foreground tracking-tight">
								Review your order
							</h2>

							{/* Contact & shipping summary */}
							<div className="mb-6 flex flex-col gap-4">
								<div className="rounded-lg border border-border/40 p-4">
									<div className="mb-2 flex items-center justify-between">
										<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
											Contact
										</h3>
										<button
											type="button"
											onClick={() => co.setStep("information")}
											className="font-medium text-foreground/60 text-xs transition-colors hover:text-foreground"
										>
											Edit
										</button>
									</div>
									<p className="text-foreground text-sm">{email}</p>
								</div>

								<div className="rounded-lg border border-border/40 p-4">
									<div className="mb-2 flex items-center justify-between">
										<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
											Shipping address
										</h3>
										<button
											type="button"
											onClick={() => co.setStep("information")}
											className="font-medium text-foreground/60 text-xs transition-colors hover:text-foreground"
										>
											Edit
										</button>
									</div>
									<p className="text-foreground text-sm">
										{shippingAddress.firstName} {shippingAddress.lastName}
									</p>
									<p className="text-muted-foreground text-sm">
										{shippingAddress.line1}
										{shippingAddress.line2 ? `, ${shippingAddress.line2}` : ""}
									</p>
									<p className="text-muted-foreground text-sm">
										{shippingAddress.city}, {shippingAddress.state}{" "}
										{shippingAddress.postalCode}
									</p>
								</div>

								<div className="rounded-lg border border-border/40 p-4">
									<div className="mb-2 flex items-center justify-between">
										<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
											Shipping method
										</h3>
										<button
											type="button"
											onClick={() => co.setStep("shipping")}
											className="font-medium text-foreground/60 text-xs transition-colors hover:text-foreground"
										>
											Edit
										</button>
									</div>
									<p className="text-foreground text-sm">
										{shippingRates.find((r) => r.id === selectedRate)?.name ??
											"Standard shipping"}
									</p>
								</div>

								<div className="rounded-lg border border-border/40 p-4">
									<div className="mb-2 flex items-center justify-between">
										<h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
											Payment
										</h3>
										<button
											type="button"
											onClick={() => co.setStep("payment")}
											className="font-medium text-foreground/60 text-xs transition-colors hover:text-foreground"
										>
											Edit
										</button>
									</div>
									<div className="flex items-center gap-2">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="text-foreground"
											aria-hidden="true"
										>
											<rect width="20" height="14" x="2" y="5" rx="2" />
											<line x1="2" x2="22" y1="10" y2="10" />
										</svg>
										<p className="text-foreground text-sm">
											{session?.paymentStatus === "succeeded"
												? "Payment confirmed"
												: session?.total === 0
													? "No payment required"
													: "Credit card"}
										</p>
									</div>
								</div>
							</div>

							<button
								type="button"
								onClick={() => void handlePlaceOrder()}
								disabled={co.isProcessing}
								className="w-full rounded-lg bg-foreground px-5 py-3.5 text-center font-semibold text-background text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
							>
								{co.isProcessing ? (
									<span className="flex items-center justify-center gap-2">
										<svg
											className="h-4 w-4 animate-spin"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											/>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
											/>
										</svg>
										Placing order...
									</span>
								) : (
									`Place order • ${formatPrice(session?.total ?? cart?.subtotal ?? 0)}`
								)}
							</button>

							<div className="mt-4 flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
								>
									<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
									<path d="M7 11V7a5 5 0 0 1 10 0v4" />
								</svg>
								Secure checkout
							</div>
						</div>
					)}
				</div>

				{/* Order summary sidebar */}
				<div className="lg:col-span-5">
					<div className="lg:sticky lg:top-24">
						<OrderSummary
							cart={cart}
							session={session}
							discountCode={discountCode}
							onApplyDiscount={handleApplyDiscount}
							onRemoveDiscount={handleRemoveDiscount}
							applyingDiscount={applyDiscountMut.isPending}
							giftCardCode={giftCardCode}
							onApplyGiftCard={handleApplyGiftCard}
							onRemoveGiftCard={handleRemoveGiftCard}
							applyingGiftCard={applyGiftCardMut.isPending}
						/>
					</div>
				</div>
			</div>
		</div>
	);
});

export default CheckoutPage;
