"use client";

import { useModuleClient } from "@86d-app/core/client";
import { useState } from "react";

// ─── Types (matching actual service response shapes) ────────────────────────

interface Question {
	id: string;
	productId: string;
	customerId?: string;
	authorName: string;
	authorEmail: string;
	body: string;
	status: "pending" | "published" | "rejected";
	upvoteCount: number;
	answerCount: number;
	createdAt: string;
	updatedAt: string;
}

interface Answer {
	id: string;
	questionId: string;
	productId: string;
	authorName: string;
	authorEmail: string;
	body: string;
	isOfficial: boolean;
	upvoteCount: number;
	status: "pending" | "published" | "rejected";
	createdAt: string;
}

interface QaAnalytics {
	totalQuestions: number;
	pendingQuestions: number;
	publishedQuestions: number;
	rejectedQuestions: number;
	totalAnswers: number;
	pendingAnswers: number;
	publishedAnswers: number;
	officialAnswers: number;
	averageAnswersPerQuestion: number;
	unansweredCount: number;
}

// ─── API hook ───────────────────────────────────────────────────────────────

function useProductQaApi() {
	const client = useModuleClient();
	const mod = client.module("product-qa");
	return {
		list: mod.admin["/admin/product-qa/questions"],
		analytics: mod.admin["/admin/product-qa/analytics"],
		getQuestion: mod.admin["/admin/product-qa/questions/:id"],
		publishQuestion: mod.admin["/admin/product-qa/questions/:id/publish"],
		rejectQuestion: mod.admin["/admin/product-qa/questions/:id/reject"],
		deleteQuestion: mod.admin["/admin/product-qa/questions/:id/delete"],
		postAnswer: mod.admin["/admin/product-qa/questions/:id/answer"],
		publishAnswer: mod.admin["/admin/product-qa/answers/:id/publish"],
		rejectAnswer: mod.admin["/admin/product-qa/answers/:id/reject"],
		deleteAnswer: mod.admin["/admin/product-qa/answers/:id/delete"],
	};
}

// ─── Shared constants ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
	pending:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
	published:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
	rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

// ─── QuestionList ───────────────────────────────────────────────────────────

export function QuestionList() {
	const api = useProductQaApi();
	const [statusFilter, setStatusFilter] = useState<string>("");

	const { data, isLoading } = api.list.useQuery(
		statusFilter ? { status: statusFilter } : {},
	) as {
		data: { questions?: Question[] } | undefined;
		isLoading: boolean;
	};

	const questions = data?.questions ?? [];

	const tabs = [
		{ value: "", label: "All" },
		{ value: "pending", label: "Pending" },
		{ value: "published", label: "Published" },
		{ value: "rejected", label: "Rejected" },
	];

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

			<div className="mb-4 flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
				{tabs.map((tab) => (
					<button
						key={tab.value}
						type="button"
						onClick={() => setStatusFilter(tab.value)}
						className={`rounded-md px-3 py-1.5 font-medium text-sm transition-colors ${
							statusFilter === tab.value
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						{tab.label}
					</button>
				))}
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
						{statusFilter
							? `No ${statusFilter} questions.`
							: "No questions yet. Questions will appear here when customers ask about your products."}
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{questions.map((q) => (
						<a
							key={q.id}
							href={`/admin/product-qa/${q.id}`}
							className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<p className="font-medium text-foreground text-sm">
										{q.body}
									</p>
									<p className="mt-1 text-muted-foreground text-xs">
										Asked by {q.authorName || q.authorEmail}
										{q.answerCount > 0
											? ` \u00b7 ${q.answerCount} answer${q.answerCount !== 1 ? "s" : ""}`
											: ""}
										{q.upvoteCount > 0
											? ` \u00b7 ${q.upvoteCount} upvote${q.upvoteCount !== 1 ? "s" : ""}`
											: ""}
									</p>
								</div>
								<span
									className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-medium text-xs ${STATUS_COLORS[q.status] ?? "bg-muted text-muted-foreground"}`}
								>
									{q.status}
								</span>
							</div>
						</a>
					))}
				</div>
			)}
		</div>
	);
}

// ─── QaAnalytics ────────────────────────────────────────────────────────────

export function QaAnalytics() {
	const api = useProductQaApi();
	const { data, isLoading } = api.analytics.useQuery({}) as {
		data: QaAnalytics | undefined;
		isLoading: boolean;
	};

	const responseRate =
		data && data.totalQuestions > 0
			? Math.round(
					((data.publishedQuestions - data.unansweredCount) /
						data.totalQuestions) *
						100,
				)
			: 0;

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
							Published
						</p>
						<p className="mt-2 font-bold text-3xl text-foreground">
							{data?.publishedQuestions ?? 0}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-5">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Pending
						</p>
						<p className="mt-2 font-bold text-3xl text-foreground">
							{data?.pendingQuestions ?? 0}
						</p>
					</div>
					<div className="rounded-lg border border-border bg-card p-5">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							Response Rate
						</p>
						<p className="mt-2 font-bold text-3xl text-foreground">
							{responseRate}%
						</p>
					</div>
				</div>
			)}
		</div>
	);
}

// ─── QuestionDetail ─────────────────────────────────────────────────────────

export function QuestionDetail({
	params,
}: {
	params?: Record<string, string>;
}) {
	const id = params?.id ?? "";
	const api = useProductQaApi();

	const { data, isLoading } = api.getQuestion.useQuery({ id }) as {
		data: { question?: Question; answers?: Answer[] } | undefined;
		isLoading: boolean;
	};

	const question = data?.question;
	const answers = data?.answers ?? [];

	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showAnswerForm, setShowAnswerForm] = useState(false);
	const [answerName, setAnswerName] = useState("");
	const [answerEmail, setAnswerEmail] = useState("");
	const [answerBody, setAnswerBody] = useState("");
	const [deleteAnswerId, setDeleteAnswerId] = useState<string | null>(null);

	const publishQuestionMutation = api.publishQuestion.useMutation({
		onSuccess: () => {
			void api.getQuestion.invalidate();
			void api.list.invalidate();
		},
	});

	const rejectQuestionMutation = api.rejectQuestion.useMutation({
		onSuccess: () => {
			void api.getQuestion.invalidate();
			void api.list.invalidate();
		},
	});

	const deleteQuestionMutation = api.deleteQuestion.useMutation({
		onSuccess: () => {
			window.location.href = "/admin/product-qa";
		},
	});

	const postAnswerMutation = api.postAnswer.useMutation({
		onSuccess: () => {
			setShowAnswerForm(false);
			setAnswerName("");
			setAnswerEmail("");
			setAnswerBody("");
			void api.getQuestion.invalidate();
			void api.list.invalidate();
		},
	});

	const publishAnswerMutation = api.publishAnswer.useMutation({
		onSuccess: () => {
			void api.getQuestion.invalidate();
		},
	});

	const rejectAnswerMutation = api.rejectAnswer.useMutation({
		onSuccess: () => {
			void api.getQuestion.invalidate();
		},
	});

	const deleteAnswerMutation = api.deleteAnswer.useMutation({
		onSuccess: () => {
			setDeleteAnswerId(null);
			void api.getQuestion.invalidate();
			void api.list.invalidate();
		},
	});

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

	const handleSubmitAnswer = () => {
		if (!answerName.trim() || !answerEmail.trim() || !answerBody.trim()) return;
		postAnswerMutation.mutate({
			params: { id },
			authorName: answerName.trim(),
			authorEmail: answerEmail.trim(),
			body: answerBody.trim(),
		});
	};

	const inputCls =
		"w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-1";

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
									{question.authorName || question.authorEmail}
								</span>
							</span>
							<span>{new Date(question.createdAt).toLocaleDateString()}</span>
							{question.upvoteCount > 0 ? (
								<span>{question.upvoteCount} upvotes</span>
							) : null}
						</div>

						{/* Action buttons */}
						<div className="mt-4 flex gap-2 border-border border-t pt-4">
							{question.status === "pending" ? (
								<>
									<button
										type="button"
										onClick={() =>
											publishQuestionMutation.mutate({ params: { id } })
										}
										disabled={publishQuestionMutation.isPending}
										className="rounded-lg bg-green-600 px-3 py-1.5 font-medium text-sm text-white hover:bg-green-700 disabled:opacity-50"
									>
										{publishQuestionMutation.isPending
											? "Publishing\u2026"
											: "Publish"}
									</button>
									<button
										type="button"
										onClick={() =>
											rejectQuestionMutation.mutate({ params: { id } })
										}
										disabled={rejectQuestionMutation.isPending}
										className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-red-600 text-sm hover:bg-muted disabled:opacity-50"
									>
										{rejectQuestionMutation.isPending
											? "Rejecting\u2026"
											: "Reject"}
									</button>
								</>
							) : null}
							<button
								type="button"
								onClick={() => setShowAnswerForm(true)}
								className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm hover:bg-primary/90"
							>
								Post Official Answer
							</button>
							<button
								type="button"
								onClick={() => setShowDeleteConfirm(true)}
								className="ml-auto rounded-lg border border-border bg-card px-3 py-1.5 font-medium text-red-600 text-sm hover:bg-muted"
							>
								Delete
							</button>
						</div>

						{/* Delete confirmation */}
						{showDeleteConfirm ? (
							<div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
								<p className="mb-2 text-foreground text-sm">
									Delete this question and all its answers? This cannot be
									undone.
								</p>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() =>
											deleteQuestionMutation.mutate({ params: { id } })
										}
										disabled={deleteQuestionMutation.isPending}
										className="rounded-md bg-destructive px-3 py-1.5 font-medium text-destructive-foreground text-sm hover:bg-destructive/90 disabled:opacity-50"
									>
										{deleteQuestionMutation.isPending
											? "Deleting\u2026"
											: "Confirm Delete"}
									</button>
									<button
										type="button"
										onClick={() => setShowDeleteConfirm(false)}
										className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
									>
										Cancel
									</button>
								</div>
							</div>
						) : null}
					</div>

					{/* Official answer form */}
					{showAnswerForm ? (
						<div className="rounded-lg border border-border bg-card p-5">
							<h2 className="mb-4 font-semibold text-foreground text-sm">
								Post Official Answer
							</h2>
							<div className="space-y-3">
								<div className="grid gap-3 sm:grid-cols-2">
									<div>
										<label
											htmlFor="answer-name"
											className="mb-1 block font-medium text-foreground text-xs"
										>
											Your Name
										</label>
										<input
											id="answer-name"
											type="text"
											value={answerName}
											onChange={(e) => setAnswerName(e.target.value)}
											className={inputCls}
											placeholder="Store Admin"
										/>
									</div>
									<div>
										<label
											htmlFor="answer-email"
											className="mb-1 block font-medium text-foreground text-xs"
										>
											Your Email
										</label>
										<input
											id="answer-email"
											type="email"
											value={answerEmail}
											onChange={(e) => setAnswerEmail(e.target.value)}
											className={inputCls}
											placeholder="admin@store.com"
										/>
									</div>
								</div>
								<div>
									<label
										htmlFor="answer-body"
										className="mb-1 block font-medium text-foreground text-xs"
									>
										Answer
									</label>
									<textarea
										id="answer-body"
										value={answerBody}
										onChange={(e) => setAnswerBody(e.target.value)}
										rows={4}
										className={inputCls}
										placeholder="Type your official answer..."
									/>
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={handleSubmitAnswer}
										disabled={
											postAnswerMutation.isPending ||
											!answerName.trim() ||
											!answerEmail.trim() ||
											!answerBody.trim()
										}
										className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
									>
										{postAnswerMutation.isPending
											? "Posting\u2026"
											: "Post Answer"}
									</button>
									<button
										type="button"
										onClick={() => setShowAnswerForm(false)}
										className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
									>
										Cancel
									</button>
								</div>
							</div>
						</div>
					) : null}

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
												className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-medium text-xs ${STATUS_COLORS[answer.status] ?? "bg-muted text-muted-foreground"}`}
											>
												{answer.status}
											</span>
											<span className="font-medium text-foreground text-sm">
												{answer.authorName || "Anonymous"}
											</span>
											<span className="text-muted-foreground text-xs">
												{new Date(answer.createdAt).toLocaleDateString()}
											</span>
										</div>
										<p className="text-foreground text-sm">{answer.body}</p>
										{answer.upvoteCount > 0 ? (
											<p className="mt-1 text-muted-foreground text-xs">
												{answer.upvoteCount} upvotes
											</p>
										) : null}

										{/* Answer action buttons */}
										<div className="mt-2 flex gap-2">
											{answer.status === "pending" ? (
												<>
													<button
														type="button"
														onClick={() =>
															publishAnswerMutation.mutate({
																params: { id: answer.id },
															})
														}
														disabled={publishAnswerMutation.isPending}
														className="rounded px-2 py-1 font-medium text-green-600 text-xs hover:bg-green-50 disabled:opacity-50 dark:hover:bg-green-950/30"
													>
														Publish
													</button>
													<button
														type="button"
														onClick={() =>
															rejectAnswerMutation.mutate({
																params: { id: answer.id },
															})
														}
														disabled={rejectAnswerMutation.isPending}
														className="rounded px-2 py-1 font-medium text-red-600 text-xs hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
													>
														Reject
													</button>
												</>
											) : null}
											{deleteAnswerId === answer.id ? (
												<>
													<button
														type="button"
														onClick={() =>
															deleteAnswerMutation.mutate({
																params: { id: answer.id },
															})
														}
														disabled={deleteAnswerMutation.isPending}
														className="rounded bg-destructive px-2 py-1 font-medium text-destructive-foreground text-xs disabled:opacity-50"
													>
														{deleteAnswerMutation.isPending
															? "Deleting\u2026"
															: "Confirm"}
													</button>
													<button
														type="button"
														onClick={() => setDeleteAnswerId(null)}
														className="rounded px-2 py-1 text-muted-foreground text-xs hover:text-foreground"
													>
														Cancel
													</button>
												</>
											) : (
												<button
													type="button"
													onClick={() => setDeleteAnswerId(answer.id)}
													className="rounded px-2 py-1 font-medium text-red-600 text-xs hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
												>
													Delete
												</button>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Right column — details sidebar */}
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
							<div>
								<dt className="text-muted-foreground">Author Email</dt>
								<dd className="font-medium text-foreground">
									{question.authorEmail}
								</dd>
							</div>
						</dl>
					</div>
				</div>
			</div>
		</div>
	);
}
