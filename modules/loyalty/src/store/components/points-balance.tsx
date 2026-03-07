"use client";

import { useLoyaltyApi } from "./_hooks";
import { formatPoints, getTierColor } from "./_utils";
import PointsBalanceTemplate from "./points-balance.mdx";

export function PointsBalance({
	customerId,
}: {
	customerId?: string | undefined;
}) {
	const api = useLoyaltyApi();

	const { data, isLoading: loading } = customerId
		? (api.getBalance.useQuery({ customerId }) as {
				data:
					| {
							balance: number;
							tier: string;
							lifetimeEarned: number;
							lifetimeRedeemed: number;
							status: string;
					  }
					| undefined;
				isLoading: boolean;
			})
		: { data: undefined, isLoading: false };

	if (!customerId) {
		return (
			<div className="rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
				<p className="text-gray-500 text-sm dark:text-gray-400">
					Sign in to view your loyalty points.
				</p>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
				<div className="animate-pulse space-y-3">
					<div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
					<div className="h-8 w-32 rounded bg-gray-200 dark:bg-gray-700" />
					<div className="h-3 w-40 rounded bg-gray-200 dark:bg-gray-700" />
				</div>
			</div>
		);
	}

	if (!data) return null;

	const tierColor = getTierColor(data.tier);
	const tierBadge = (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs capitalize ring-1 ring-inset ${tierColor.bg} ${tierColor.text} ${tierColor.ring}`}
		>
			{data.tier}
		</span>
	);

	return (
		<PointsBalanceTemplate
			balance={formatPoints(data.balance)}
			tierBadge={tierBadge}
			lifetimeEarned={formatPoints(data.lifetimeEarned)}
			lifetimeRedeemed={formatPoints(data.lifetimeRedeemed)}
		/>
	);
}
