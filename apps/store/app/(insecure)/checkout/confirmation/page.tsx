"use client";

import { useAnalytics } from "hooks/use-analytics";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { buttonVariants } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

// ── Types ────────────────────────────────────────────────────────────────────

interface OrderSummary {
	orderId: string;
	email?: string;
	items: Array<{
		name: string;
		quantity: number;
		price: number;
		image?: string;
	}>;
	subtotal: number;
	taxAmount: number;
	shippingAmount: number;
	discountAmount: number;
	giftCardAmount: number;
	total: number;
	currency: string;
	shippingAddress?: {
		firstName: string;
		lastName: string;
		line1: string;
		line2?: string;
		city: string;
		state: string;
		postalCode: string;
		country: string;
	};
}

/** Shape returned by GET /api/orders/me/:id */
interface OrderApiResponse {
	id: string;
	guestEmail?: string;
	subtotal: number;
	taxAmount: number;
	shippingAmount: number;
	discountAmount: number;
	giftCardAmount: number;
	total: number;
	currency: string;
	items?: Array<{ name: string; quantity: number; price: number }>;
	addresses?: Array<{
		type: string;
		firstName: string;
		lastName: string;
		line1: string;
		line2?: string;
		city: string;
		state: string;
		postalCode: string;
		country: string;
	}>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(cents: number, currency = "USD"): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(cents / 100);
}

// ── Confirmation Content ────────────────────────────────────────────────────

function ConfirmationContent() {
	const searchParams = useSearchParams();
	const orderId = searchParams.get("order");
	const { track } = useAnalytics();
	const tracked = useRef(false);
	const [summary, setSummary] = useState<OrderSummary | null>(null);

	// Load order summary from sessionStorage, with API fallback
	useEffect(() => {
		let found = false;
		try {
			const raw = sessionStorage.getItem("checkout_confirmation");
			if (raw) {
				setSummary(JSON.parse(raw) as OrderSummary);
				sessionStorage.removeItem("checkout_confirmation");
				found = true;
			}
		} catch {
			// sessionStorage may not be available
		}

		// Fallback: fetch order from API if sessionStorage was empty
		if (!found && orderId) {
			fetch(`/api/orders/me/${encodeURIComponent(orderId)}`)
				.then((res) => (res.ok ? res.json() : null))
				.then((data: { order?: OrderApiResponse } | null) => {
					if (!data?.order) return;
					const o = data.order;
					const addr = o.addresses?.find(
						(a: { type: string }) => a.type === "shipping",
					);
					setSummary({
						orderId: o.id,
						...(o.guestEmail ? { email: o.guestEmail } : {}),
						items: (o.items ?? []).map(
							(item: { name: string; quantity: number; price: number }) => ({
								name: item.name,
								quantity: item.quantity,
								price: item.price,
							}),
						),
						subtotal: o.subtotal ?? 0,
						taxAmount: o.taxAmount ?? 0,
						shippingAmount: o.shippingAmount ?? 0,
						discountAmount: o.discountAmount ?? 0,
						giftCardAmount: o.giftCardAmount ?? 0,
						total: o.total ?? 0,
						currency: o.currency ?? "USD",
						...(addr
							? {
									shippingAddress: {
										firstName: addr.firstName,
										lastName: addr.lastName,
										line1: addr.line1,
										...(addr.line2 ? { line2: addr.line2 } : {}),
										city: addr.city,
										state: addr.state,
										postalCode: addr.postalCode,
										country: addr.country,
									},
								}
							: {}),
					});
				})
				.catch(() => {
					// Guest checkout or network error — show minimal confirmation
				});
		}
	}, [orderId]);

	// Fire purchase event once on confirmation page load
	useEffect(() => {
		if (orderId && !tracked.current) {
			tracked.current = true;
			track({
				type: "purchase",
				orderId,
				data: { source: "checkout" },
			});
		}
	}, [orderId, track]);

	const currency = summary?.currency ?? "USD";
	const addr = summary?.shippingAddress;

	return (
		<div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			{/* Success icon */}
			<div className="mb-6 flex justify-center">
				<div className="flex size-16 items-center justify-center rounded-full bg-status-success-bg">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="text-status-success"
						aria-hidden="true"
					>
						<path d="M20 6 9 17l-5-5" />
					</svg>
				</div>
			</div>

			{/* Header */}
			<div className="mb-8 text-center">
				<h1 className="mb-2 font-bold font-display text-2xl text-foreground tracking-tight sm:text-3xl">
					Thank you for your order!
				</h1>
				<p className="text-muted-foreground text-sm">
					Your order has been placed successfully.
					{summary?.email && (
						<>
							{" "}
							A confirmation email will be sent to{" "}
							<span className="font-medium text-foreground">
								{summary.email}
							</span>
							.
						</>
					)}
				</p>
				{orderId && (
					<p className="mt-2 font-mono text-muted-foreground text-xs">
						Order {orderId}
					</p>
				)}
			</div>

			{/* Order items */}
			{summary && summary.items.length > 0 && (
				<div className="mb-6 rounded-xl border border-border bg-card">
					<div className="border-border border-b px-6 py-4">
						<h2 className="font-semibold text-foreground text-sm">
							Order summary
						</h2>
					</div>
					<ul className="divide-y divide-border">
						{summary.items.map((item, i) => (
							<li
								key={`${item.name}-${i}`}
								className="flex items-center gap-4 px-6 py-4"
							>
								{item.image ? (
									<img
										src={item.image}
										alt={item.name}
										className="size-12 rounded-lg border border-border object-cover"
									/>
								) : (
									<div className="flex size-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground/30">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="1.5"
											aria-hidden="true"
										>
											<rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
											<circle cx="9" cy="9" r="2" />
											<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
										</svg>
									</div>
								)}
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-foreground text-sm">
										{item.name}
									</p>
									<p className="text-muted-foreground text-xs">
										Qty: {item.quantity}
									</p>
								</div>
								<p className="shrink-0 font-medium text-foreground text-sm">
									{formatPrice(item.price * item.quantity, currency)}
								</p>
							</li>
						))}
					</ul>

					{/* Totals */}
					<div className="border-border border-t px-6 py-4">
						<div className="flex flex-col gap-1.5 text-sm">
							<div className="flex justify-between text-muted-foreground">
								<span>Subtotal</span>
								<span>{formatPrice(summary.subtotal, currency)}</span>
							</div>
							{summary.shippingAmount > 0 && (
								<div className="flex justify-between text-muted-foreground">
									<span>Shipping</span>
									<span>{formatPrice(summary.shippingAmount, currency)}</span>
								</div>
							)}
							{summary.taxAmount > 0 && (
								<div className="flex justify-between text-muted-foreground">
									<span>Tax</span>
									<span>{formatPrice(summary.taxAmount, currency)}</span>
								</div>
							)}
							{summary.discountAmount > 0 && (
								<div className="flex justify-between text-status-success">
									<span>Discount</span>
									<span>-{formatPrice(summary.discountAmount, currency)}</span>
								</div>
							)}
							{summary.giftCardAmount > 0 && (
								<div className="flex justify-between text-status-success">
									<span>Gift card</span>
									<span>-{formatPrice(summary.giftCardAmount, currency)}</span>
								</div>
							)}
							<div className="mt-1 flex justify-between border-border border-t pt-2 font-semibold text-foreground">
								<span>Total</span>
								<span>{formatPrice(summary.total, currency)}</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Shipping address */}
			{addr && (
				<div className="mb-6 rounded-xl border border-border bg-card px-6 py-4">
					<h2 className="mb-2 font-semibold text-foreground text-sm">
						Shipping to
					</h2>
					<p className="text-muted-foreground text-sm leading-relaxed">
						{addr.firstName} {addr.lastName}
						<br />
						{addr.line1}
						{addr.line2 && (
							<>
								<br />
								{addr.line2}
							</>
						)}
						<br />
						{addr.city}, {addr.state} {addr.postalCode}
					</p>
				</div>
			)}

			{/* What happens next */}
			<div className="mb-8 rounded-xl border border-border bg-card p-6">
				<h2 className="mb-4 font-semibold text-foreground text-sm">
					What happens next?
				</h2>
				<div className="flex flex-col gap-4">
					<div className="flex gap-3">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs">
							1
						</div>
						<div>
							<p className="font-medium text-foreground text-sm">
								Order confirmation
							</p>
							<p className="text-muted-foreground text-xs">
								You'll receive a confirmation email with your order details.
							</p>
						</div>
					</div>
					<div className="flex gap-3">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs">
							2
						</div>
						<div>
							<p className="font-medium text-foreground text-sm">
								Order processing
							</p>
							<p className="text-muted-foreground text-xs">
								We'll prepare your items and notify you when they ship.
							</p>
						</div>
					</div>
					<div className="flex gap-3">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs">
							3
						</div>
						<div>
							<p className="font-medium text-foreground text-sm">Delivery</p>
							<p className="text-muted-foreground text-xs">
								Track your order status from your account page.
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Actions */}
			<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
				<a href="/account/orders" className={buttonVariants()}>
					View my orders
				</a>
				<a href="/products" className={buttonVariants({ variant: "outline" })}>
					Continue shopping
				</a>
			</div>
		</div>
	);
}

// ── Page (Suspense boundary for useSearchParams) ────────────────────────────

export default function CheckoutConfirmationPage() {
	return (
		<Suspense
			fallback={
				<div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
					<div className="flex flex-col items-center gap-4">
						<Skeleton className="size-16 rounded-full" />
						<Skeleton className="h-8 w-64 rounded-lg" />
						<Skeleton className="h-4 w-48" />
					</div>
				</div>
			}
		>
			<ConfirmationContent />
		</Suspense>
	);
}
