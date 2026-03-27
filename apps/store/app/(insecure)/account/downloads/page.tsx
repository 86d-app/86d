"use client";

import { useModuleClient } from "@86d-app/core/client";
import { StatusBadge } from "~/components/status-badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";

// ── Types ───────────────────────────────────────────────────────────────────

interface DownloadToken {
	id: string;
	fileId: string;
	fileName: string;
	token: string;
	email: string;
	status: string;
	downloadCount: number;
	maxDownloads: number | null;
	expiresAt: string | null;
	createdAt: string;
}

interface Customer {
	id: string;
	email: string;
	firstName?: string | undefined;
	lastName?: string | undefined;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(iso));
}

// ── Downloads Page ──────────────────────────────────────────────────────────

export default function DownloadsPage() {
	const client = useModuleClient();

	const customerApi = client.module("customers").store["/customers/me"];
	const { data: customerData } = customerApi.useQuery() as {
		data: { customer: Customer } | undefined;
	};

	const email = customerData?.customer?.email;

	const downloadsApi =
		client.module("digital-downloads").store["/downloads/me"];
	const { data: downloadsData, isLoading } = downloadsApi.useQuery(
		email ? { email } : undefined,
		{ enabled: !!email },
	) as {
		data: { tokens: DownloadToken[] } | undefined;
		isLoading: boolean;
	};

	const downloadApi =
		client.module("digital-downloads").store["/downloads/:token"];

	const tokens = downloadsData?.tokens ?? [];

	async function handleDownload(token: string) {
		try {
			const result = (await downloadApi.fetch({
				params: { token },
			})) as { url?: string };
			const url = result?.url;
			if (url) {
				window.open(url, "_blank", "noopener,noreferrer");
			}
		} catch {
			// Download failed silently — the button state handles feedback
		}
	}

	function isDownloadable(token: DownloadToken): boolean {
		if (token.status !== "active") return false;
		if (
			token.maxDownloads !== null &&
			token.downloadCount >= token.maxDownloads
		)
			return false;
		if (token.expiresAt && new Date(token.expiresAt) < new Date()) return false;
		return true;
	}

	return (
		<div>
			<div className="mb-6">
				<h2 className="font-bold font-display text-foreground text-xl tracking-tight sm:text-2xl">
					My Downloads
				</h2>
				<p className="mt-1 text-muted-foreground text-sm">
					Access your purchased digital files.
				</p>
			</div>

			{isLoading || !email ? (
				<div className="flex flex-col gap-3">
					{[1, 2, 3].map((n) => (
						<Skeleton key={n} className="h-20 rounded-xl" />
					))}
				</div>
			) : tokens.length === 0 ? (
				<div className="rounded-xl border border-border bg-muted/30 py-12 text-center">
					<div className="mb-4 flex justify-center">
						<div className="flex size-14 items-center justify-center rounded-full bg-muted">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="text-muted-foreground"
								aria-hidden="true"
							>
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
								<polyline points="7 10 12 15 17 10" />
								<line x1="12" y1="15" x2="12" y2="3" />
							</svg>
						</div>
					</div>
					<p className="font-medium text-foreground text-sm">
						No downloads yet
					</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Your digital purchases will appear here.
					</p>
					<a href="/products" className={buttonVariants({ className: "mt-4" })}>
						Browse products
					</a>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					{tokens.map((token) => {
						const canDownload = isDownloadable(token);
						const statusLabel =
							token.status === "active" &&
							token.maxDownloads !== null &&
							token.downloadCount >= token.maxDownloads
								? "limit_reached"
								: token.status === "active" &&
										token.expiresAt &&
										new Date(token.expiresAt) < new Date()
									? "expired"
									: token.status;
						return (
							<div
								key={token.id}
								className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<p className="font-medium text-foreground text-sm">
											{token.fileName}
										</p>
										<StatusBadge status={statusLabel} />
									</div>
									<div className="mt-1 flex items-center gap-3 text-muted-foreground text-xs">
										<span>
											{token.downloadCount}
											{token.maxDownloads !== null
												? ` / ${token.maxDownloads}`
												: ""}{" "}
											downloads
										</span>
										{token.expiresAt && (
											<span>Expires {formatDate(token.expiresAt)}</span>
										)}
										<span>Added {formatDate(token.createdAt)}</span>
									</div>
								</div>
								<Button
									disabled={!canDownload}
									onClick={() => handleDownload(token.token)}
									className="shrink-0"
								>
									Download
								</Button>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
