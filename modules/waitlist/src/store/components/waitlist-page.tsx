"use client";

import { useState } from "react";
import { useWaitlistApi } from "./_hooks";
import { extractError, formatDate } from "./_utils";
import WaitlistPageTemplate from "./waitlist-page.mdx";

interface WaitlistEntry {
	id: string;
	productId: string;
	productName: string;
	variantLabel?: string;
	email: string;
	status: string;
	createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
	waiting: "Waiting",
	notified: "Back in stock",
	purchased: "Purchased",
	cancelled: "Cancelled",
};

export function WaitlistPage({ email }: { email: string }) {
	const api = useWaitlistApi();
	const [error, setError] = useState("");

	const { data, isLoading } = api.myWaitlist.useQuery({
		email,
		take: "50",
	}) as {
		data: { entries: WaitlistEntry[] } | undefined;
		isLoading: boolean;
	};

	const entries = data?.entries ?? [];

	const leaveMutation = api.leaveWaitlist.useMutation({
		onSettled: () => {
			void api.myWaitlist.invalidate();
		},
		onError: (err: Error) => {
			setError(extractError(err, "Failed to leave waitlist."));
		},
	});

	const handleLeave = (productId: string) => {
		setError("");
		leaveMutation.mutate({ email, productId });
	};

	const content = isLoading ? (
		<div className="py-12 text-center">
			<div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
			<p className="mt-3 text-muted-foreground text-sm">
				Loading your waitlist...
			</p>
		</div>
	) : entries.length === 0 ? (
		<p className="py-12 text-center text-muted-foreground text-sm">
			You are not on any waitlists.
		</p>
	) : (
		<div className="divide-y divide-border">
			{entries.map((entry) => (
				<div
					key={entry.id}
					className="flex items-center justify-between px-5 py-3"
				>
					<div>
						<p className="font-medium text-foreground text-sm">
							{entry.productName}
							{entry.variantLabel && (
								<span className="ml-1 text-muted-foreground text-xs">
									({entry.variantLabel})
								</span>
							)}
						</p>
						<p className="mt-0.5 text-muted-foreground text-xs">
							Joined {formatDate(entry.createdAt)} ·{" "}
							{STATUS_LABELS[entry.status] ?? entry.status}
						</p>
					</div>
					{entry.status === "waiting" && (
						<button
							type="button"
							onClick={() => handleLeave(entry.productId)}
							disabled={leaveMutation.isPending}
							className="text-muted-foreground text-xs hover:text-foreground"
						>
							Remove
						</button>
					)}
				</div>
			))}
		</div>
	);

	return <WaitlistPageTemplate content={content} error={error} />;
}
