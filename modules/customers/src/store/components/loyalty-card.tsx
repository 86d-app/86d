"use client";

import { useCustomerApi } from "./_hooks";
import LoyaltyCardTemplate from "./loyalty-card.mdx";

interface LoyaltyBalance {
	points: number;
	lifetimePoints: number;
	tier?: string;
}

interface LoyaltyTransaction {
	id: string;
	type: "earn" | "redeem" | "expire" | "adjust";
	points: number;
	description: string;
	createdAt: string;
}

export function LoyaltyCard() {
	const api = useCustomerApi();
	const { data: balanceData } = api.getLoyalty.useQuery() as {
		data: { balance: LoyaltyBalance } | undefined;
	};
	const { data: historyData } = api.getLoyaltyHistory.useQuery() as {
		data: { transactions: LoyaltyTransaction[] } | undefined;
	};

	return (
		<LoyaltyCardTemplate
			balance={balanceData?.balance}
			transactions={historyData?.transactions ?? []}
		/>
	);
}
