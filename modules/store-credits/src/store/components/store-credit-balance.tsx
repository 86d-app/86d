"use client";

import { useStoreCreditApi } from "./_hooks";
import { formatCurrency } from "./_utils";
import StoreCreditBalanceTemplate from "./store-credit-balance.mdx";

/**
 * Displays the customer's current store credit balance.
 * Shows balance amount, account status, and currency.
 */
export function StoreCreditBalance({ customerId }: { customerId: string }) {
	const api = useStoreCreditApi();

	const { data, isLoading, error } = api.balance.useQuery({
		customerId,
	});

	// biome-ignore lint/suspicious/noExplicitAny: response shape from module endpoint
	const result = data as any;

	return (
		<StoreCreditBalanceTemplate
			balance={result?.balance ?? 0}
			currency={result?.currency ?? "USD"}
			status={result?.status ?? "active"}
			isLoading={isLoading}
			error={error ? "Unable to load store credit balance." : ""}
			formatCurrency={formatCurrency}
		/>
	);
}
