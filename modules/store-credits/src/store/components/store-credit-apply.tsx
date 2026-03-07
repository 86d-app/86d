"use client";

import { useState } from "react";
import { useStoreCreditApi } from "./_hooks";
import { extractError, formatCurrency } from "./_utils";
import StoreCreditApplyTemplate from "./store-credit-apply.mdx";

/**
 * Apply store credits to an order during checkout.
 * Shows current balance and lets the customer choose how much to apply.
 */
export function StoreCreditApply({
	customerId,
	orderTotal,
	onApplied,
}: {
	customerId: string;
	orderTotal?: number;
	onApplied?: (amountApplied: number, remainingBalance: number) => void;
}) {
	const api = useStoreCreditApi();
	const [error, setError] = useState("");
	const [applied, setApplied] = useState<{
		amount: number;
		remaining: number;
	} | null>(null);

	const { data: balanceData, isLoading: balanceLoading } = api.balance.useQuery(
		{ customerId },
	);

	// biome-ignore lint/suspicious/noExplicitAny: response shape from module endpoint
	const balanceResult = balanceData as any;
	const balance: number = balanceResult?.balance ?? 0;
	const currency: string = balanceResult?.currency ?? "USD";
	const status: string = balanceResult?.status ?? "active";

	const applyMutation = api.apply.useMutation({
		onError: (err: Error) => {
			setError(extractError(err, "Failed to apply store credit."));
		},
		// biome-ignore lint/suspicious/noExplicitAny: response shape from module endpoint
		onSuccess: (data: any) => {
			const amountApplied = data.transaction?.amount ?? 0;
			const remainingBalance = data.remainingBalance ?? 0;
			setApplied({ amount: amountApplied, remaining: remainingBalance });
			onApplied?.(amountApplied, remainingBalance);
		},
	});

	const maxApplicable =
		orderTotal != null ? Math.min(balance, orderTotal) : balance;

	const handleApply = () => {
		if (maxApplicable <= 0) return;
		setError("");
		setApplied(null);
		applyMutation.mutate({
			customerId,
			amount: maxApplicable,
		});
	};

	return (
		<StoreCreditApplyTemplate
			balance={balance}
			currency={currency}
			status={status}
			maxApplicable={maxApplicable}
			applied={applied}
			error={error}
			isLoading={applyMutation.isPending}
			balanceLoading={balanceLoading}
			onApply={handleApply}
			formatCurrency={formatCurrency}
		/>
	);
}
