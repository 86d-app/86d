"use client";

import { useModuleClient } from "@86d-app/core/client";
import KioskAdminTemplate from "./kiosk-admin.mdx";

function useKioskAdminApi() {
	const client = useModuleClient();
	return {
		getStats: client.module("kiosk").admin["/admin/kiosk/stats"],
	};
}

export function KioskAdmin() {
	const api = useKioskAdminApi();
	const { data, isLoading: loading } = api.getStats.useQuery({}) as {
		data:
			| {
					stats: {
						totalStations: number;
						onlineStations: number;
						totalSessions: number;
						completedSessions: number;
						totalRevenue: number;
					};
			  }
			| undefined;
		isLoading: boolean;
	};

	const stats = data?.stats;

	return (
		<KioskAdminTemplate>
			{loading ? (
				<p className="text-muted-foreground text-sm">Loading stats...</p>
			) : !stats ? (
				<p className="text-muted-foreground text-sm">No data available.</p>
			) : (
				<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
					<div className="rounded-md border border-border p-4">
						<p className="text-muted-foreground text-xs">Stations</p>
						<p className="font-semibold text-2xl text-foreground">
							{stats.totalStations}
						</p>
					</div>
					<div className="rounded-md border border-border p-4">
						<p className="text-muted-foreground text-xs">Online</p>
						<p className="font-semibold text-2xl text-foreground">
							{stats.onlineStations}
						</p>
					</div>
					<div className="rounded-md border border-border p-4">
						<p className="text-muted-foreground text-xs">Sessions</p>
						<p className="font-semibold text-2xl text-foreground">
							{stats.totalSessions}
						</p>
					</div>
					<div className="rounded-md border border-border p-4">
						<p className="text-muted-foreground text-xs">Revenue</p>
						<p className="font-semibold text-2xl text-foreground">
							${stats.totalRevenue.toFixed(2)}
						</p>
					</div>
				</div>
			)}
		</KioskAdminTemplate>
	);
}
