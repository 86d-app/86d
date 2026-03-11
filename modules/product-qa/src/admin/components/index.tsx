"use client";

import { useModuleClient } from "@86d-app/core/client";

interface Question {
	id: string;
	productId: string;
	productName?: string;
	question: string;
	askedBy: string;
	answer?: string;
	answeredBy?: string;
	status: "pending" | "answered" | "rejected";
	isPublic: boolean;
	votes: number;
	createdAt: string;
}

interface QaStats {
	totalQuestions: number;
	answered: number;
	pending: number;
	avgResponseTime?: number;
}

function useProductQaApi() {
	const client = useModuleClient();
	return {
		list: client.module("product-qa").admin["/admin/product-qa"],
		analytics: client.module("product-qa").admin["/admin/product-qa/analytics"],
	};
}

const STATUS_COLORS: Record<string, string> = {
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	answered:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function QuestionList() {
	const api = useProductQaApi();
	const { data, isLoading } = api.list.useQuery({}) as {
		data: { questions?: Question[] } | undefined;
		isLoading: boolean;
	};

	const questions = data?.questions ?? [];

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-foreground">
						Product Q&amp;A
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						Manage customer questions and answers on products
					</p>
				</div>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-20 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : questions.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No questions yet. Questions will appear here when customers ask
						about your products.
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{questions.map((q) => (
						<div
							key={q.id}
							className="rounded-lg border border-border bg-card p-4"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<p className="font-medium text-foreground text-sm">
										{q.question}
									</p>
									<p className="mt-1 text-muted-foreground text-xs">
										Asked by {q.askedBy}
										{q.productName ? ` on ${q.productName}` : ""}
									</p>
									{q.answer ? (
										<div className="mt-2 rounded-md bg-muted/50 p-2">
											<p className="text-foreground text-sm">{q.answer}</p>
											{q.answeredBy ? (
												<p className="mt-1 text-muted-foreground text-xs">
													Answered by {q.answeredBy}
												</p>
											) : null}
										</div>
									) : null}
								</div>
								<span
									className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[q.status] ?? "bg-muted text-muted-foreground"}`}
								>
									{q.status}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export function QaAnalytics() {
	const api = useProductQaApi();
	const { data, isLoading } = api.analytics.useQuery({}) as {
		data: QaStats | undefined;
		isLoading: boolean;
	};

	return (
		<div>
			<div className="mb-6">
				<h1 className="font-bold text-2xl text-foreground">
					Q&amp;A Analytics
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Overview of product questions and response metrics
				</p>
			</div>

			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`skel-${i}`}
							className="h-24 animate-pulse rounded-lg border border-border bg-muted/30"
						/>
					))}
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-lg border border-border bg-card p-5">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Total Questions
						</p>
						<p className="mt-2 font-bold text-3xl text-foreground">
							{data?.totalQuestions ?? 0}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-5">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Answered
						</p>
						<p className="mt-2 font-bold text-3xl text-foreground">
							{data?.answered ?? 0}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-5">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Pending
						</p>
						<p className="mt-2 font-bold text-3xl text-foreground">
							{data?.pending ?? 0}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-5">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Response Rate
						</p>
						<p className="mt-2 font-bold text-3xl text-foreground">
							{data?.totalQuestions
								? `${Math.round(((data.answered ?? 0) / data.totalQuestions) * 100)}%`
								: "0%"}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}

export function QuestionDetail({
	params,
}: {
	params?: Record<string, string>;
}) {
	const id = params?.id ?? "";

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/product-qa"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to Q&amp;A
				</a>
				<h1 className="mt-2 font-bold text-2xl text-foreground">Question</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Question ID: {id || "Unknown"}
				</p>
			</div>

			<div className="rounded-lg border border-border bg-card p-8 text-center">
				<p className="text-muted-foreground text-sm">
					Question detail view is under development.
				</p>
			</div>
		</div>
	);
}
