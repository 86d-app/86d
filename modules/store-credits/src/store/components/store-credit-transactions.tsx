"use client";

import { useStoreCreditApi } from "./_hooks";
import { formatCurrency, formatDate, formatReason } from "./_utils";
import StoreCreditTransactionsTemplate from "./store-credit-transactions.mdx";

interface Transaction {
	id: string;
	type: "credit" | "debit";
	amount: number;
	balanceAfter: number;
	reason: string;
	description: string;
	createdAt: string;
}

/**
 * Displays a list of store credit transactions for a customer.
 * Shows credits and debits with amounts, reasons, and dates.
 */
export function StoreCreditTransactions({
	customerId,
	limit,
}: {
	customerId: string;
	limit?: number;
}) {
	const api = useStoreCreditApi();

	const { data, isLoading, error } = api.transactions.useQuery({
		customerId,
		...(limit ? { take: limit } : {}),
	});

	// biome-ignore lint/suspicious/noExplicitAny: response shape from module endpoint
	const result = data as any;
	const transactions: Transaction[] = result?.transactions ?? [];

	return (
		<StoreCreditTransactionsTemplate
			transactions={transactions}
			isLoading={isLoading}
			error={error ? "Unable to load transaction history." : ""}
			formatCurrency={formatCurrency}
			formatDate={formatDate}
			formatReason={formatReason}
		/>
	);
}
