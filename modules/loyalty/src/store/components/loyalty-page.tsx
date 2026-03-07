"use client";

import LoyaltyPageTemplate from "./loyalty-page.mdx";
import { PointsBalance } from "./points-balance";
import { PointsHistory } from "./points-history";
import { TierProgress } from "./tier-progress";

export function LoyaltyPage({
	customerId,
}: {
	customerId?: string | undefined;
}) {
	if (!customerId) {
		return (
			<div className="py-16 text-center">
				<div className="text-4xl">&#11088;</div>
				<h2 className="mt-4 font-semibold text-gray-900 text-lg dark:text-gray-100">
					Loyalty Rewards
				</h2>
				<p className="mt-2 text-gray-500 text-sm dark:text-gray-400">
					Sign in to view your points balance, tier status, and transaction
					history.
				</p>
			</div>
		);
	}

	return (
		<LoyaltyPageTemplate
			balanceCard={<PointsBalance customerId={customerId} />}
			tierCard={<TierProgress customerId={customerId} />}
			historySection={<PointsHistory customerId={customerId} />}
		/>
	);
}
