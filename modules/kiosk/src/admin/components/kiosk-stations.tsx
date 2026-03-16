"use client";

import { useModuleClient } from "@86d-app/core/client";
import KioskStationsTemplate from "./kiosk-stations.mdx";

function useKioskStationsApi() {
	const client = useModuleClient();
	return {
		listStations: client.module("kiosk").admin["/admin/kiosk/stations"],
	};
}

export function KioskStations() {
	const api = useKioskStationsApi();
	const { data, isLoading: loading } = api.listStations.useQuery({}) as {
		data:
			| {
					stations: Array<{
						id: string;
						name: string;
						isOnline: boolean;
						isActive: boolean;
					}>;
					total: number;
			  }
			| undefined;
		isLoading: boolean;
	};

	const stations = data?.stations ?? [];

	return (
		<KioskStationsTemplate>
			{loading ? (
				<p className="text-muted-foreground text-sm">Loading stations...</p>
			) : stations.length === 0 ? (
				<p className="text-muted-foreground text-sm">No stations registered.</p>
			) : (
				<ul className="space-y-2">
					{stations.map((s) => (
						<li
							key={s.id}
							className="flex items-center justify-between rounded-md border border-border p-3"
						>
							<span className="text-foreground text-sm">{s.name}</span>
							<span
								className={`rounded-full px-2 py-0.5 text-xs ${s.isOnline ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"}`}
							>
								{s.isOnline ? "Online" : "Offline"}
							</span>
						</li>
					))}
				</ul>
			)}
		</KioskStationsTemplate>
	);
}
