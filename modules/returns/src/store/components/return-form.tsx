"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";
import ReturnFormTemplate from "./return-form.mdx";

interface OrderItem {
	id: string;
	productName: string;
	sku?: string;
	quantity: number;
	unitPrice: number;
}

interface ReturnItemInput {
	orderItemId: string;
	productName: string;
	sku?: string | undefined;
	quantity: number;
	unitPrice: number;
	reason: string;
	condition: string;
	notes: string;
}

const REASONS = [
	{ value: "damaged", label: "Damaged" },
	{ value: "defective", label: "Defective" },
	{ value: "wrong_item", label: "Wrong item received" },
	{ value: "not_as_described", label: "Not as described" },
	{ value: "changed_mind", label: "Changed my mind" },
	{ value: "too_small", label: "Too small" },
	{ value: "too_large", label: "Too large" },
	{ value: "other", label: "Other" },
];

const CONDITIONS = [
	{ value: "unopened", label: "Unopened" },
	{ value: "opened", label: "Opened" },
	{ value: "used", label: "Used" },
	{ value: "damaged", label: "Damaged" },
];

export function ReturnForm({
	orderId,
	items,
}: {
	orderId: string;
	items: OrderItem[];
}) {
	const client = useModuleClient();
	const api = client.module("returns").store["/returns/submit"];

	const [selectedItems, setSelectedItems] = useState<
		Map<string, ReturnItemInput>
	>(new Map());
	const [reason, setReason] = useState("");
	const [refundMethod, setRefundMethod] = useState("original_payment");
	const [notes, setNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const toggleItem = (item: OrderItem) => {
		setSelectedItems((prev) => {
			const next = new Map(prev);
			if (next.has(item.id)) {
				next.delete(item.id);
			} else {
				next.set(item.id, {
					orderItemId: item.id,
					productName: item.productName,
					sku: item.sku,
					quantity: 1,
					unitPrice: item.unitPrice,
					reason: "changed_mind",
					condition: "opened",
					notes: "",
				});
			}
			return next;
		});
	};

	const updateItem = (itemId: string, updates: Partial<ReturnItemInput>) => {
		setSelectedItems((prev) => {
			const next = new Map(prev);
			const existing = next.get(itemId);
			if (existing) {
				next.set(itemId, { ...existing, ...updates });
			}
			return next;
		});
	};

	const handleSubmit = async () => {
		if (selectedItems.size === 0 || !reason) return;
		setSubmitting(true);
		setError(null);

		try {
			await api.fetch({
				orderId,
				reason,
				refundMethod,
				customerNotes: notes || undefined,
				items: Array.from(selectedItems.values()).map((item) => ({
					orderItemId: item.orderItemId,
					productName: item.productName,
					sku: item.sku,
					quantity: item.quantity,
					unitPrice: item.unitPrice,
					reason: item.reason as
						| "damaged"
						| "defective"
						| "wrong_item"
						| "not_as_described"
						| "changed_mind"
						| "too_small"
						| "too_large"
						| "other",
					condition: item.condition as
						| "unopened"
						| "opened"
						| "used"
						| "damaged",
					notes: item.notes || undefined,
				})),
			});
			setSubmitted(true);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to submit return request",
			);
		} finally {
			setSubmitting(false);
		}
	};

	if (submitted) {
		const content = (
			<div className="py-8 text-center">
				<p className="font-semibold text-foreground text-lg">
					Return Request Submitted
				</p>
				<p className="mt-2 text-muted-foreground text-sm">
					We&apos;ll review your request and get back to you shortly.
				</p>
			</div>
		);
		return <ReturnFormTemplate content={content} />;
	}

	const content = (
		<div>
			<h2 className="mb-4 font-semibold text-foreground text-lg">
				Request a Return
			</h2>

			{error && (
				<div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
					{error}
				</div>
			)}

			<div className="mb-4 space-y-2">
				<p className="block font-medium text-foreground text-sm">
					Select items to return
				</p>
				{items.map((item) => {
					const selected = selectedItems.has(item.id);
					const returnItem = selectedItems.get(item.id);
					return (
						<div key={item.id} className="rounded-md border border-border p-3">
							<label className="flex cursor-pointer items-center gap-3">
								<input
									type="checkbox"
									checked={selected}
									onChange={() => toggleItem(item)}
									className="h-4 w-4 rounded border-border"
								/>
								<span className="text-foreground text-sm">
									{item.productName} &middot; Qty: {item.quantity}
								</span>
							</label>
							{selected && returnItem && (
								<div className="mt-2 ml-7 grid gap-2 sm:grid-cols-3">
									<select
										value={returnItem.reason}
										onChange={(e) =>
											updateItem(item.id, { reason: e.target.value })
										}
										className="rounded-md border border-border bg-background px-2 py-1 text-foreground text-sm"
									>
										{REASONS.map((r) => (
											<option key={r.value} value={r.value}>
												{r.label}
											</option>
										))}
									</select>
									<select
										value={returnItem.condition}
										onChange={(e) =>
											updateItem(item.id, { condition: e.target.value })
										}
										className="rounded-md border border-border bg-background px-2 py-1 text-foreground text-sm"
									>
										{CONDITIONS.map((c) => (
											<option key={c.value} value={c.value}>
												{c.label}
											</option>
										))}
									</select>
									<input
										type="number"
										min={1}
										max={item.quantity}
										value={returnItem.quantity}
										onChange={(e) =>
											updateItem(item.id, {
												quantity: Math.min(
													Number(e.target.value) || 1,
													item.quantity,
												),
											})
										}
										className="rounded-md border border-border bg-background px-2 py-1 text-foreground text-sm"
										placeholder="Qty"
									/>
								</div>
							)}
						</div>
					);
				})}
			</div>

			<div className="mb-4">
				<label
					htmlFor="return-reason"
					className="mb-1 block font-medium text-foreground text-sm"
				>
					Reason for return
				</label>
				<textarea
					id="return-reason"
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					rows={3}
					className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder="Please describe why you are returning these items..."
				/>
			</div>

			<div className="mb-4">
				<label
					htmlFor="refund-method"
					className="mb-1 block font-medium text-foreground text-sm"
				>
					Preferred refund method
				</label>
				<select
					id="refund-method"
					value={refundMethod}
					onChange={(e) => setRefundMethod(e.target.value)}
					className="rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="original_payment">Original payment method</option>
					<option value="store_credit">Store credit</option>
					<option value="exchange">Exchange</option>
				</select>
			</div>

			<div className="mb-6">
				<label
					htmlFor="return-notes"
					className="mb-1 block font-medium text-foreground text-sm"
				>
					Additional notes (optional)
				</label>
				<textarea
					id="return-notes"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					rows={2}
					className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			<button
				type="button"
				disabled={submitting || selectedItems.size === 0 || !reason}
				onClick={() => void handleSubmit()}
				className="rounded-md bg-foreground px-6 py-2 font-medium text-background text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{submitting ? "Submitting..." : "Submit Return Request"}
			</button>
		</div>
	);

	return <ReturnFormTemplate content={content} />;
}
