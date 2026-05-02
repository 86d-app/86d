"use client";

import { useLoyaltyApi } from "./_hooks";
import { formatPoints, getTierColor } from "./_utils";
import PointsBalanceTemplate from "./points-balance.mdx";

export function PointsBalance() {
	const api = useLoyaltyApi();

	const { data, isLoading: loading } = api.getBalance.useQuery({}) as {
		data:
			| {
					balance: number;
					tier: string;
					lifetimeEarned: number;
					lifetimeRedeemed: number;
					status: string;
			  }
			| { error: string; status: number }
			| undefined;
		isLoading: boolean;
	};

	const isUnauthenticated =
		!loading && (data as { status?: number } | undefined)?.status === 401;

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

	if (isUnauthenticated || !data) {
		return (
			<div className="rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
				<p className="text-gray-500 text-sm dark:text-gray-400">
					Sign in to view your loyalty points.
				</p>
			</div>
		);
	}

	const successData = data as {
		balance: number;
		tier: string;
		lifetimeEarned: number;
		lifetimeRedeemed: number;
	};
	const tierColor = getTierColor(successData.tier);
	const tierBadge = (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs capitalize ring-1 ring-inset ${tierColor.bg} ${tierColor.text} ${tierColor.ring}`}
		>
			{successData.tier}
		</span>
	);

	return (
		<PointsBalanceTemplate
			balance={formatPoints(successData.balance)}
			tierBadge={tierBadge}
			lifetimeEarned={formatPoints(successData.lifetimeEarned)}
			lifetimeRedeemed={formatPoints(successData.lifetimeRedeemed)}
		/>
	);
}
