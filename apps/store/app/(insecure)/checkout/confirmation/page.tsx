"use client";

import { useAnalytics } from "hooks/use-analytics";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { buttonVariants } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

// ── Confirmation Content ────────────────────────────────────────────────────

function ConfirmationContent() {
	const searchParams = useSearchParams();
	const orderId = searchParams.get("order");
	const { track } = useAnalytics();
	const tracked = useRef(false);

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
				</p>
				{orderId && (
					<p className="mt-2 font-mono text-muted-foreground text-xs">
						Order ID: {orderId}
					</p>
				)}
			</div>

			{/* Order summary card */}
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
				<a href="/account" className={buttonVariants()}>
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
