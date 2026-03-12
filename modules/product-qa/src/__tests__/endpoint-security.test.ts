import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createProductQaController } from "../service-impl";

/**
 * Security regression tests for product-qa endpoints.
 *
 * Product Q&A has store endpoints (ask, answer, upvote) and admin CRUD.
 * Security focuses on:
 * - Published-only filter on storefront listings
 * - Cascade deletion of answers when question is deleted
 * - Answer count tracking consistency
 * - Official answers auto-publish
 * - Upvote counting safety
 */

describe("product-qa endpoint security", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createProductQaController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createProductQaController(mockData);
	});

	describe("storefront visibility", () => {
		it("listQuestionsByProduct with publishedOnly hides pending questions", async () => {
			await controller.createQuestion({
				productId: "prod_1",
				customerId: "cust_1",
				authorName: "Alice",
				authorEmail: "alice@example.com",
				body: "How does this work?",
			});

			const published = await controller.listQuestionsByProduct("prod_1", {
				publishedOnly: true,
			});
			// Default status is "pending" (not published)
			expect(published).toHaveLength(0);
		});

		it("published questions are visible on storefront", async () => {
			const q = await controller.createQuestion({
				productId: "prod_1",
				customerId: "cust_1",
				authorName: "Alice",
				authorEmail: "alice@example.com",
				body: "How does this work?",
			});

			await controller.updateQuestionStatus(q.id, "published");

			const published = await controller.listQuestionsByProduct("prod_1", {
				publishedOnly: true,
			});
			expect(published).toHaveLength(1);
		});

		it("rejected questions are hidden on storefront", async () => {
			const q = await controller.createQuestion({
				productId: "prod_1",
				customerId: "cust_1",
				authorName: "Alice",
				authorEmail: "alice@example.com",
				body: "Spam question",
			});

			await controller.updateQuestionStatus(q.id, "rejected");

			const published = await controller.listQuestionsByProduct("prod_1", {
				publishedOnly: true,
			});
			expect(published).toHaveLength(0);
		});
	});

	describe("answer visibility", () => {
		it("listAnswersByQuestion with publishedOnly hides pending answers", async () => {
			const q = await controller.createQuestion({
				productId: "prod_1",
				customerId: "cust_1",
				authorName: "Alice",
				authorEmail: "alice@example.com",
				body: "Question?",
			});

			await controller.createAnswer({
				questionId: q.id,
				productId: "prod_1",
				customerId: "cust_2",
				authorName: "Bob",
				authorEmail: "bob@example.com",
				body: "Here's the answer.",
				isOfficial: false,
			});

			const published = await controller.listAnswersByQuestion(q.id, {
				publishedOnly: true,
			});
			expect(published).toHaveLength(0);
		});

		it("official answers are auto-published", async () => {
			const q = await controller.createQuestion({
				productId: "prod_1",
				customerId: "cust_1",
				authorName: "Alice",
				authorEmail: "alice@example.com",
				body: "Question?",
			});

			await controller.createAnswer({
				questionId: q.id,
				productId: "prod_1",
				customerId: "admin_1",
				authorName: "Store Admin",
				authorEmail: "admin@store.com",
				body: "Official answer",
				isOfficial: true,
			});

			const published = await controller.listAnswersByQuestion(q.id, {
				publishedOnly: true,
			});
			expect(published).toHaveLength(1);
			expect(published[0].isOfficial).toBe(true);
		});
	});

	describe("cascade deletion", () => {
		it("deleting a question removes all its answers", async () => {
			const q = await controller.createQuestion({
				productId: "prod_1",
				customerId: "cust_1",
				authorName: "Alice",
				authorEmail: "alice@example.com",
				body: "Question?",
			});

			await controller.createAnswer({
				questionId: q.id,
				productId: "prod_1",
				customerId: "cust_2",
				authorName: "Bob",
				authorEmail: "bob@example.com",
				body: "Answer 1",
			});
			await controller.createAnswer({
				questionId: q.id,
				productId: "prod_1",
				customerId: "cust_3",
				authorName: "Carol",
				authorEmail: "carol@example.com",
				body: "Answer 2",
			});

			await controller.deleteQuestion(q.id);

			const answers = await controller.listAnswersByQuestion(q.id, {});
			expect(answers).toHaveLength(0);
		});
	});

	describe("answer count tracking", () => {
		it("answerCount increments when answer is created", async () => {
			const q = await controller.createQuestion({
				productId: "prod_1",
				customerId: "cust_1",
				authorName: "Alice",
				authorEmail: "alice@example.com",
				body: "Question?",
			});

			await controller.createAnswer({
				questionId: q.id,
				productId: "prod_1",
				customerId: "cust_2",
				authorName: "Bob",
				authorEmail: "bob@example.com",
				body: "Answer",
			});

			const updated = await controller.getQuestion(q.id);
			expect(updated?.answerCount).toBe(1);
		});

		it("answerCount decrements when answer is deleted", async () => {
			const q = await controller.createQuestion({
				productId: "prod_1",
				customerId: "cust_1",
				authorName: "Alice",
				authorEmail: "alice@example.com",
				body: "Question?",
			});

			const a = await controller.createAnswer({
				questionId: q.id,
				productId: "prod_1",
				customerId: "cust_2",
				authorName: "Bob",
				authorEmail: "bob@example.com",
				body: "Answer",
			});

			await controller.deleteAnswer(a.id);

			const updated = await controller.getQuestion(q.id);
			expect(updated?.answerCount).toBe(0);
		});
	});

	describe("upvote safety", () => {
		it("upvoteQuestion increments count", async () => {
			const q = await controller.createQuestion({
				productId: "prod_1",
				customerId: "cust_1",
				authorName: "Alice",
				authorEmail: "alice@example.com",
				body: "Great question",
			});

			await controller.upvoteQuestion(q.id);
			await controller.upvoteQuestion(q.id);

			const updated = await controller.getQuestion(q.id);
			expect(updated?.upvoteCount).toBe(2);
		});

		it("upvoteAnswer increments count", async () => {
			const q = await controller.createQuestion({
				productId: "prod_1",
				customerId: "cust_1",
				authorName: "Alice",
				authorEmail: "alice@example.com",
				body: "Question?",
			});

			const a = await controller.createAnswer({
				questionId: q.id,
				productId: "prod_1",
				customerId: "cust_2",
				authorName: "Bob",
				authorEmail: "bob@example.com",
				body: "Great answer",
			});

			await controller.upvoteAnswer(a.id);

			const updated = await controller.getAnswer(a.id);
			expect(updated?.upvoteCount).toBe(1);
		});
	});

	describe("product scoping", () => {
		it("questions from different products are isolated", async () => {
			await controller.createQuestion({
				productId: "prod_1",
				customerId: "cust_1",
				authorName: "Alice",
				authorEmail: "alice@example.com",
				body: "Q for product 1",
			});
			await controller.createQuestion({
				productId: "prod_2",
				customerId: "cust_2",
				authorName: "Bob",
				authorEmail: "bob@example.com",
				body: "Q for product 2",
			});

			const prod1Qs = await controller.listQuestionsByProduct("prod_1", {});
			expect(prod1Qs).toHaveLength(1);
			expect(prod1Qs[0].body).toBe("Q for product 1");

			const prod2Qs = await controller.listQuestionsByProduct("prod_2", {});
			expect(prod2Qs).toHaveLength(1);
		});
	});
});
