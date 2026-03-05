"use client";

import { cartState } from "@86d-app/cart/state";
import { useModuleClient } from "@86d-app/core/client";
import { useParams } from "next/navigation";
import { useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface OrderItem {
	id: string;
	productId: string;
	variantId?: string | undefined;
	name: string;
	sku?: string | undefined;
	price: number;
	quantity: number;
	subtotal: number;
}

interface OrderAddress {
	id: string;
	type: string;
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

interface OrderWithDetails {
	id: string;
	orderNumber: string;
	customerId: string;
	status: string;
	paymentStatus: string;
	subtotal: number;
	taxAmount: number;
	shippingAmount: number;
	discountAmount: number;
	total: number;
	currency: string;
	notes?: string | undefined;
	createdAt: string;
	updatedAt: string;
	items: OrderItem[];
	addresses: OrderAddress[];
}

interface FulfillmentItem {
	id: string;
	fulfillmentId: string;
	orderItemId: string;
	quantity: number;
}

interface FulfillmentWithItems {
	id: string;
	orderId: string;
	status: string;
	trackingNumber?: string | null;
	trackingUrl?: string | null;
	carrier?: string | null;
	shippedAt?: string | null;
	deliveredAt?: string | null;
	createdAt: string;
	items: FulfillmentItem[];
}

type OrderFulfillmentStatus =
	| "unfulfilled"
	| "partially_fulfilled"
	| "fulfilled";

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(cents: number, currency = "USD"): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(cents / 100);
}

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(iso));
}

const STATUS_STYLES: Record<string, string> = {
	pending:
		"bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
	processing: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
	on_hold:
		"bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
	completed:
		"bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
	cancelled: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
	refunded:
		"bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
};

const PAYMENT_STYLES: Record<string, string> = {
	unpaid: "bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
	paid: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
	partially_paid:
		"bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
	refunded:
		"bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
	voided: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const FULFILLMENT_STYLES: Record<string, string> = {
	pending:
		"bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
	shipped: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
	in_transit:
		"bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
	delivered:
		"bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
	failed: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
};

function StatusBadge({
	value,
	styles,
}: {
	value: string;
	styles: Record<string, string>;
}) {
	const colorClass =
		styles[value] ??
		"bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
	return (
		<span
			className={`inline-block rounded-full px-2.5 py-0.5 font-medium text-xs capitalize ${colorClass}`}
		>
			{value.replace(/_/g, " ")}
		</span>
	);
}

// ── Order Detail Page ───────────────────────────────────────────────────────

export default function OrderDetailPage() {
	const params = useParams<{ id: string }>();
	const orderId = params.id;
	const client = useModuleClient();
	const [cancelError, setCancelError] = useState("");
	const [reorderStatus, setReorderStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");

	const orderApi = client.module("orders").store["/orders/me/:id"];
	const cancelApi = client.module("orders").store["/orders/me/:id/cancel"];
	const reorderApi = client.module("orders").store["/orders/me/:id/reorder"];
	const cartApi = client.module("cart").store["/cart"];
	const fulfillmentApi =
		client.module("orders").store["/orders/me/:id/fulfillments"];

	const { data, isLoading, isError, error } = orderApi.useQuery({
		params: { id: orderId },
	}) as {
		data: { order: OrderWithDetails } | undefined;
		isLoading: boolean;
		isError: boolean;
		error: Error | null;
	};

	const { data: fulfillmentData } = fulfillmentApi.useQuery({
		params: { id: orderId },
	}) as {
		data:
			| {
					fulfillments: FulfillmentWithItems[];
					fulfillmentStatus: OrderFulfillmentStatus;
			  }
			| undefined;
	};

	const fulfillments = fulfillmentData?.fulfillments ?? [];

	const cancelMutation = cancelApi.useMutation({
		onError: (err: Error) => {
			// biome-ignore lint/suspicious/noExplicitAny: accessing HTTP error body property
			const body = (err as any)?.body;
			setCancelError(
				typeof body?.error === "string"
					? body.error
					: "Failed to cancel order.",
			);
		},
	});

	const handleReorder = async () => {
		setReorderStatus("loading");
		try {
			const result = (await reorderApi.fetch({
				params: { id: orderId },
			})) as {
				items: Array<{
					productId: string;
					variantId?: string;
					name: string;
					price: number;
					quantity: number;
				}>;
			};

			for (const item of result.items) {
				await cartApi.fetch({
					body: {
						productId: item.productId,
						variantId: item.variantId,
						quantity: item.quantity,
						price: item.price,
						productName: item.name,
						productSlug: item.productId,
					},
				});
			}

			cartState.setItemCount(cartState.itemCount + result.items.length);
			cartState.openDrawer();
			setReorderStatus("success");
		} catch {
			setReorderStatus("error");
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="mb-4 h-5 w-20 animate-pulse rounded bg-muted" />
				<div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-muted" />
				<div className="space-y-3">
					{[1, 2, 3].map((n) => (
						<div key={n} className="h-16 animate-pulse rounded-xl bg-muted" />
					))}
				</div>
			</div>
		);
	}

	if (isError || !data?.order) {
		// biome-ignore lint/suspicious/noExplicitAny: accessing HTTP status from module client error
		const status = (error as any)?.status;
		const message =
			status === 404 ? "Order not found." : "Failed to load order details.";
		return (
			<div className="py-8 text-center">
				<p className="mb-4 text-muted-foreground text-sm">{message}</p>
				<a
					href="/account/orders"
					className="text-foreground text-sm underline-offset-4 hover:underline"
				>
					&larr; Back to orders
				</a>
			</div>
		);
	}

	const order =
		(cancelMutation.data as { order: OrderWithDetails } | undefined)?.order ??
		data.order;
	const cancellable = ["pending", "processing", "on_hold"].includes(
		order.status,
	);
	const shipping = order.addresses.find((a) => a.type === "shipping");
	const billing = order.addresses.find((a) => a.type === "billing");

	return (
		<div>
			{/* Header */}
			<div className="mb-6 flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="font-bold font-display text-2xl text-foreground tracking-tight">
						{order.orderNumber}
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Placed on {formatDate(order.createdAt)}
					</p>
					<div className="mt-2 flex gap-2">
						<StatusBadge value={order.status} styles={STATUS_STYLES} />
						<StatusBadge value={order.paymentStatus} styles={PAYMENT_STYLES} />
					</div>
				</div>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						disabled={reorderStatus === "loading"}
						onClick={handleReorder}
						className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground px-4 py-2 font-medium text-background text-sm transition-colors hover:bg-foreground/90 disabled:opacity-60"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 256 256"
							fill="currentColor"
							aria-hidden="true"
						>
							<path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,144H32V64H224ZM176,104a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,104Zm0,32a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,136Zm0,32a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,168Z" />
						</svg>
						{reorderStatus === "loading"
							? "Adding to cart..."
							: reorderStatus === "success"
								? "Added to cart!"
								: "Reorder"}
					</button>
					<a
						href={`/account/orders/${orderId}/invoice`}
						className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 font-medium text-foreground text-sm transition-colors hover:bg-muted"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="14"
							height="14"
							viewBox="0 0 256 256"
							fill="currentColor"
							aria-hidden="true"
						>
							<path d="M200,24H72A16,16,0,0,0,56,40V64H40A16,16,0,0,0,24,80v96a16,16,0,0,0,16,16H56v24a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V40A16,16,0,0,0,200,24Zm-40,80a8,8,0,0,1,0,16H112a8,8,0,0,1,0-16Zm48,112H72V192h72a16,16,0,0,0,16-16V80a16,16,0,0,0-16-16H72V40H208ZM40,176V80h88v96Z" />
						</svg>
						Invoice
					</a>
					{cancellable && (
						<button
							type="button"
							disabled={cancelMutation.isPending}
							onClick={() => {
								setCancelError("");
								cancelMutation.mutate({ params: { id: orderId } });
							}}
							className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-medium text-red-700 text-sm transition-opacity hover:bg-red-100 disabled:opacity-60 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
						>
							{cancelMutation.isPending ? "Cancelling..." : "Cancel Order"}
						</button>
					)}
				</div>
			</div>

			{cancelError && (
				<div
					className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-destructive text-sm"
					role="alert"
				>
					{cancelError}
				</div>
			)}

			{reorderStatus === "error" && (
				<div
					className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-destructive text-sm"
					role="alert"
				>
					Failed to add items to cart. Some products may no longer be available.
				</div>
			)}

			{/* Items */}
			<div className="mb-6 overflow-hidden rounded-xl border border-border">
				<div className="border-border border-b bg-muted/40 px-4 py-3">
					<h2 className="font-semibold text-foreground text-sm">
						Items ({order.items.length})
					</h2>
				</div>
				{order.items.map((item) => (
					<div
						key={item.id}
						className="flex items-center justify-between gap-4 border-border border-b px-4 py-3.5 last:border-0"
					>
						<div className="min-w-0 flex-1">
							<p className="font-medium text-foreground text-sm">{item.name}</p>
							<p className="text-muted-foreground text-xs">
								Qty: {item.quantity}
								{item.sku ? ` · SKU: ${item.sku}` : ""} ·{" "}
								{formatPrice(item.price, order.currency)} each
							</p>
						</div>
						<span className="shrink-0 font-medium text-foreground text-sm tabular-nums">
							{formatPrice(item.subtotal, order.currency)}
						</span>
					</div>
				))}
			</div>

			{/* Shipment Tracking */}
			{fulfillments.length > 0 && (
				<div className="mb-6 space-y-3">
					<h2 className="font-semibold text-foreground text-sm">
						Shipment Tracking
					</h2>
					{fulfillments.map((f) => (
						<div key={f.id} className="rounded-xl border border-border p-4">
							<div className="flex items-center gap-2">
								<StatusBadge value={f.status} styles={FULFILLMENT_STYLES} />
								{f.carrier && (
									<span className="text-muted-foreground text-sm">
										{f.carrier}
									</span>
								)}
							</div>
							{f.trackingNumber && (
								<p className="mt-2 font-mono text-foreground text-sm">
									{f.trackingNumber}
								</p>
							)}
							{f.trackingUrl && (
								<a
									href={f.trackingUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="mt-2 inline-flex items-center gap-1 text-primary text-sm underline-offset-4 hover:underline"
								>
									Track your package
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
										<title>External link</title>
										<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
										<polyline points="15 3 21 3 21 9" />
										<line x1="10" y1="14" x2="21" y2="3" />
									</svg>
								</a>
							)}
							{f.items.length > 0 && (
								<div className="mt-2 border-border border-t pt-2">
									{f.items.map((fi) => {
										const orderItem = order.items.find(
											(oi) => oi.id === fi.orderItemId,
										);
										return (
											<p key={fi.id} className="text-muted-foreground text-xs">
												{orderItem?.name ?? "Item"} x{fi.quantity}
											</p>
										);
									})}
								</div>
							)}
							{f.shippedAt && (
								<p className="mt-2 text-muted-foreground text-xs">
									Shipped{" "}
									{new Intl.DateTimeFormat("en-US", {
										month: "short",
										day: "numeric",
										year: "numeric",
									}).format(new Date(f.shippedAt))}
								</p>
							)}
							{f.deliveredAt && (
								<p className="text-muted-foreground text-xs">
									Delivered{" "}
									{new Intl.DateTimeFormat("en-US", {
										month: "short",
										day: "numeric",
										year: "numeric",
									}).format(new Date(f.deliveredAt))}
								</p>
							)}
						</div>
					))}
				</div>
			)}

			{/* Totals */}
			<div className="mb-6 rounded-xl border border-border p-4">
				<h2 className="mb-3 font-semibold text-foreground text-sm">
					Order Summary
				</h2>
				<div className="space-y-2 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Subtotal</span>
						<span className="text-foreground tabular-nums">
							{formatPrice(order.subtotal, order.currency)}
						</span>
					</div>
					{order.discountAmount > 0 && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">Discount</span>
							<span className="text-emerald-600 tabular-nums dark:text-emerald-400">
								-{formatPrice(order.discountAmount, order.currency)}
							</span>
						</div>
					)}
					{order.shippingAmount > 0 && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">Shipping</span>
							<span className="text-foreground tabular-nums">
								{formatPrice(order.shippingAmount, order.currency)}
							</span>
						</div>
					)}
					{order.taxAmount > 0 && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">Tax</span>
							<span className="text-foreground tabular-nums">
								{formatPrice(order.taxAmount, order.currency)}
							</span>
						</div>
					)}
					<div className="flex justify-between border-border border-t pt-2 font-semibold">
						<span className="text-foreground">Total</span>
						<span className="text-foreground tabular-nums">
							{formatPrice(order.total, order.currency)}
						</span>
					</div>
				</div>
			</div>

			{/* Addresses */}
			{(shipping || billing) && (
				<div className="mb-6 grid gap-4 sm:grid-cols-2">
					{shipping && (
						<div className="rounded-xl border border-border p-4">
							<h2 className="mb-2 font-semibold text-foreground text-sm">
								Shipping Address
							</h2>
							<div className="space-y-0.5 text-muted-foreground text-sm">
								<p>
									{shipping.firstName} {shipping.lastName}
								</p>
								{shipping.company && <p>{shipping.company}</p>}
								<p>{shipping.line1}</p>
								{shipping.line2 && <p>{shipping.line2}</p>}
								<p>
									{shipping.city}, {shipping.state} {shipping.postalCode}
								</p>
								<p>{shipping.country}</p>
								{shipping.phone && <p>{shipping.phone}</p>}
							</div>
						</div>
					)}
					{billing && (
						<div className="rounded-xl border border-border p-4">
							<h2 className="mb-2 font-semibold text-foreground text-sm">
								Billing Address
							</h2>
							<div className="space-y-0.5 text-muted-foreground text-sm">
								<p>
									{billing.firstName} {billing.lastName}
								</p>
								{billing.company && <p>{billing.company}</p>}
								<p>{billing.line1}</p>
								{billing.line2 && <p>{billing.line2}</p>}
								<p>
									{billing.city}, {billing.state} {billing.postalCode}
								</p>
								<p>{billing.country}</p>
								{billing.phone && <p>{billing.phone}</p>}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Notes */}
			{order.notes && (
				<div className="mb-6 rounded-xl border border-border bg-muted/30 p-4">
					<h2 className="mb-1 font-semibold text-foreground text-sm">Notes</h2>
					<p className="text-muted-foreground text-sm">{order.notes}</p>
				</div>
			)}

			{/* Back link */}
			<div className="flex justify-center pt-2">
				<a
					href="/account/orders"
					className="text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					&larr; Back to all orders
				</a>
			</div>
		</div>
	);
}
