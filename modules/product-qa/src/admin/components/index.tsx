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

interface Answer {
	id: string;
	authorName?: string;
	authorEmail?: string;
	body: string;
	isOfficial?: boolean;
	upvoteCount?: number;
	status: string;
	createdAt: string;
}

interface QuestionWithAnswers {
	id: string;
	productId: string;
	productName?: string;
	authorName?: string;
	authorEmail?: string;
	body: string;
	status: string;
	upvoteCount?: number;
	answerCount?: number;
	createdAt: string;
}

export function QuestionDetail({
	params,
}: {
	params?: Record<string, string>;
}) {
	const id = params?.id ?? "";
	const client = useModuleClient();
	const questionApi =
		client.module("product-qa").admin["/admin/product-qa/questions/:id"];

	const { data, isLoading } = questionApi.useQuery({ id }) as {
		data: { question?: QuestionWithAnswers; answers?: Answer[] } | undefined;
		isLoading: boolean;
	};

	const question = data?.question;
	const answers = data?.answers ?? [];

	if (isLoading) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/product-qa"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to Q&amp;A
					</a>
				</div>
				<div className="space-y-4">
					<div className="h-32 animate-pulse rounded-lg border border-border bg-muted/30" />
					<div className="h-24 animate-pulse rounded-lg border border-border bg-muted/30" />
				</div>
			</div>
		);
	}

	if (!question) {
		return (
			<div>
				<div className="mb-6">
					<a
						href="/admin/product-qa"
						className="text-muted-foreground text-sm hover:text-foreground"
					>
						&larr; Back to Q&amp;A
					</a>
				</div>
				<div className="rounded-lg border border-border bg-card p-8 text-center">
					<p className="text-muted-foreground text-sm">Question not found.</p>
				</div>
			</div>
		);
	}

	const ANSWER_STATUS_COLORS: Record<string, string> = {
		pending:
			"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
		published:
			"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
		rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
	};

	return (
		<div>
			<div className="mb-6">
				<a
					href="/admin/product-qa"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					&larr; Back to Q&amp;A
				</a>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left column */}
				<div className="space-y-6 lg:col-span-2">
					{/* Question */}
					<div className="rounded-lg border border-border bg-card p-5">
						<div className="mb-3 flex items-start justify-between gap-3">
							<h1 className="font-bold text-foreground text-lg">
								{question.body}
							</h1>
							<span
								className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[question.status] ?? "bg-muted text-muted-foreground"}`}
							>
								{question.status}
							</span>
						</div>
						<div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
							<span>
								Asked by{" "}
								<span className="font-medium text-foreground">
									{question.authorName ?? question.authorEmail ?? "Anonymous"}
								</span>
							</span>
							{question.productName ? (
								<span>on {question.productName}</span>
							) : null}
							<span>{new Date(question.createdAt).toLocaleDateString()}</span>
							{question.upvoteCount ? (
								<span>{question.upvoteCount} upvotes</span>
							) : null}
						</div>

						{/* Action buttons */}
						<div className="mt-4 flex gap-2 border-border border-t pt-4">
							{question.status === "pending" ? (
								<>
									<button
										type="button"
										className="rounded-lg bg-green-600 px-3 py-1.5 font-medium text-sm text-white hover:bg-green-700"
									>
										Publish
									</button>
									<button
										type="button"
										className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-red-600 text-sm hover:bg-muted"
									>
										Reject
									</button>
								</>
							) : null}
						</div>
					</div>

					{/* Answers */}
					<div className="rounded-lg border border-border bg-card">
						<div className="border-border border-b px-4 py-3">
							<h2 className="font-semibold text-foreground text-sm">
								Answers ({answers.length})
							</h2>
						</div>
						{answers.length === 0 ? (
							<div className="p-4 text-center text-muted-foreground text-sm">
								No answers yet.
							</div>
						) : (
							<div className="divide-y divide-border">
								{answers.map((answer) => (
									<div key={answer.id} className="p-4">
										<div className="mb-2 flex items-center gap-2">
											{answer.isOfficial ? (
												<span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 font-medium text-blue-800 text-xs dark:bg-blue-900/30 dark:text-blue-400">
													Official
												</span>
											) : null}
											<span
												className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-medium text-xs ${ANSWER_STATUS_COLORS[answer.status] ?? "bg-muted text-muted-foreground"}`}
											>
												{answer.status}
											</span>
											<span className="font-medium text-foreground text-sm">
												{answer.authorName ?? "Anonymous"}
											</span>
											<span className="text-muted-foreground text-xs">
												{new Date(answer.createdAt).toLocaleDateString()}
											</span>
										</div>
										<p className="text-foreground text-sm">{answer.body}</p>
										{answer.upvoteCount ? (
											<p className="mt-1 text-muted-foreground text-xs">
												{answer.upvoteCount} upvotes
											</p>
										) : null}
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Right column */}
				<div>
					<div className="rounded-lg border border-border bg-card p-4">
						<h3 className="mb-3 font-semibold text-foreground text-sm">
							Details
						</h3>
						<dl className="space-y-2 text-sm">
							<div>
								<dt className="text-muted-foreground">Status</dt>
								<dd className="font-medium text-foreground capitalize">
									{question.status}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Answers</dt>
								<dd className="font-medium text-foreground">
									{question.answerCount ?? answers.length}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Upvotes</dt>
								<dd className="font-medium text-foreground">
									{question.upvoteCount ?? 0}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Asked</dt>
								<dd className="font-medium text-foreground">
									{new Date(question.createdAt).toLocaleDateString()}
								</dd>
							</div>
							{question.productName ? (
								<div>
									<dt className="text-muted-foreground">Product</dt>
									<dd className="font-medium text-foreground">
										{question.productName}
									</dd>
								</div>
							) : null}
						</dl>
					</div>
				</div>
			</div>
		</div>
	);
}
