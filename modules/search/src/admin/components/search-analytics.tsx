"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

interface AnalyticsData {
	totalQueries: number;
	uniqueTerms: number;
	avgResultCount: number;
	zeroResultCount: number;
	zeroResultRate: number;
	indexedItems: number;
}

interface PopularTerm {
	term: string;
	count: number;
	avgResultCount: number;
}

interface Synonym {
	id: string;
	term: string;
	synonyms: string[];
	createdAt: string;
}

function useSearchAdminApi() {
	const client = useModuleClient();
	return {
		analytics: client.module("search").admin["/admin/search/analytics"],
		popular: client.module("search").admin["/admin/search/popular"],
		zeroResults: client.module("search").admin["/admin/search/zero-results"],
		synonyms: client.module("search").admin["/admin/search/synonyms"],
		addSynonym: client.module("search").admin["/admin/search/synonyms/add"],
		removeSynonym:
			client.module("search").admin["/admin/search/synonyms/:id/delete"],
	};
}

function StatCard({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="rounded-lg border border-border bg-background p-4">
			<p className="text-muted-foreground text-xs uppercase tracking-wider">
				{label}
			</p>
			<p className="mt-1 font-semibold text-2xl text-foreground">{value}</p>
		</div>
	);
}

export function SearchAnalytics() {
	const api = useSearchAdminApi();
	const [newTerm, setNewTerm] = useState("");
	const [newSynonyms, setNewSynonyms] = useState("");
	const [error, setError] = useState("");

	const { data: analyticsData, isLoading: analyticsLoading } =
		api.analytics.useQuery({}) as {
			data: { analytics: AnalyticsData } | undefined;
			isLoading: boolean;
		};

	const { data: popularData, isLoading: popularLoading } = api.popular.useQuery(
		{ limit: "15" },
	) as {
		data: { terms: PopularTerm[] } | undefined;
		isLoading: boolean;
	};

	const { data: zeroData, isLoading: zeroLoading } = api.zeroResults.useQuery({
		limit: "15",
	}) as {
		data: { terms: PopularTerm[] } | undefined;
		isLoading: boolean;
	};

	const { data: synonymsData, isLoading: synonymsLoading } =
		api.synonyms.useQuery({}) as {
			data: { synonyms: Synonym[] } | undefined;
			isLoading: boolean;
		};

	const addMutation = api.addSynonym.useMutation({
		onSettled: () => {
			void api.synonyms.invalidate();
			setNewTerm("");
			setNewSynonyms("");
		},
		onError: () => {
			setError("Failed to add synonym.");
		},
	});

	const removeMutation = api.removeSynonym.useMutation({
		onSettled: () => {
			void api.synonyms.invalidate();
		},
	});

	const analytics = analyticsData?.analytics;
	const popularTerms = popularData?.terms ?? [];
	const zeroResultTerms = zeroData?.terms ?? [];
	const synonyms = synonymsData?.synonyms ?? [];
	const loading =
		analyticsLoading || popularLoading || zeroLoading || synonymsLoading;

	const handleAddSynonym = () => {
		setError("");
		const term = newTerm.trim();
		const syns = newSynonyms
			.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		if (!term || syns.length === 0) {
			setError("Enter a term and at least one synonym.");
			return;
		}
		addMutation.mutate({ term, synonyms: syns });
	};

	if (loading && !analytics) {
		return (
			<div className="py-16 text-center">
				<div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
				<p className="mt-4 text-muted-foreground text-sm">
					Loading search analytics...
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Stats overview */}
			{analytics && (
				<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
					<StatCard
						label="Total Searches"
						value={analytics.totalQueries.toLocaleString()}
					/>
					<StatCard
						label="Unique Terms"
						value={analytics.uniqueTerms.toLocaleString()}
					/>
					<StatCard label="Avg Results" value={analytics.avgResultCount} />
					<StatCard
						label="Zero Results"
						value={analytics.zeroResultCount.toLocaleString()}
					/>
					<StatCard
						label="Zero Result Rate"
						value={`${analytics.zeroResultRate}%`}
					/>
					<StatCard
						label="Indexed Items"
						value={analytics.indexedItems.toLocaleString()}
					/>
				</div>
			)}

			<div className="grid gap-8 md:grid-cols-2">
				{/* Popular terms */}
				<div className="rounded-lg border border-border bg-background">
					<div className="border-border border-b px-5 py-3">
						<h3 className="font-medium text-foreground text-sm">
							Popular Search Terms
						</h3>
					</div>
					{popularTerms.length === 0 ? (
						<p className="px-5 py-6 text-center text-muted-foreground text-sm">
							No search data yet.
						</p>
					) : (
						<div className="divide-y divide-border">
							{popularTerms.map((t) => (
								<div
									key={t.term}
									className="flex items-center justify-between px-5 py-2.5"
								>
									<span className="text-foreground text-sm">{t.term}</span>
									<span className="text-muted-foreground text-xs">
										{t.count} searches &middot; {t.avgResultCount} avg results
									</span>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Zero result queries */}
				<div className="rounded-lg border border-border bg-background">
					<div className="border-border border-b px-5 py-3">
						<h3 className="font-medium text-foreground text-sm">
							Zero-Result Queries
						</h3>
					</div>
					{zeroResultTerms.length === 0 ? (
						<p className="px-5 py-6 text-center text-muted-foreground text-sm">
							No zero-result queries yet.
						</p>
					) : (
						<div className="divide-y divide-border">
							{zeroResultTerms.map((t) => (
								<div
									key={t.term}
									className="flex items-center justify-between px-5 py-2.5"
								>
									<span className="text-foreground text-sm">{t.term}</span>
									<span className="text-muted-foreground text-xs">
										{t.count} times
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Synonyms management */}
			<div className="rounded-lg border border-border bg-background">
				<div className="border-border border-b px-5 py-3">
					<h3 className="font-medium text-foreground text-sm">
						Search Synonyms
					</h3>
				</div>
				<div className="p-5">
					<div className="mb-4 flex flex-col gap-2 sm:flex-row">
						<input
							type="text"
							value={newTerm}
							onChange={(e) => setNewTerm(e.target.value)}
							placeholder="Term (e.g. tee)"
							className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
						/>
						<input
							type="text"
							value={newSynonyms}
							onChange={(e) => setNewSynonyms(e.target.value)}
							placeholder="Synonyms, comma separated (e.g. t-shirt, shirt)"
							className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
						/>
						<button
							type="button"
							onClick={handleAddSynonym}
							disabled={addMutation.isPending}
							className="rounded-md bg-primary px-4 py-1.5 font-medium text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
						>
							Add
						</button>
					</div>
					{error && <p className="mb-3 text-destructive text-sm">{error}</p>}
					{synonyms.length === 0 ? (
						<p className="py-4 text-center text-muted-foreground text-sm">
							No synonyms configured yet.
						</p>
					) : (
						<div className="divide-y divide-border rounded-md border border-border">
							{synonyms.map((syn) => (
								<div
									key={syn.id}
									className="flex items-center justify-between px-4 py-2.5"
								>
									<div className="text-sm">
										<span className="font-medium text-foreground">
											{syn.term}
										</span>
										<span className="mx-2 text-muted-foreground">&rarr;</span>
										<span className="text-muted-foreground">
											{syn.synonyms.join(", ")}
										</span>
									</div>
									<button
										type="button"
										onClick={() =>
											removeMutation.mutate({
												params: { id: syn.id },
											})
										}
										className="text-muted-foreground text-xs hover:text-destructive"
									>
										Remove
									</button>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
