import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createBlogController } from "../service-impl";

describe("createBlogController", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createBlogController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createBlogController(mockData);
	});

	// ── createPost ─────────────────────────────────────────────────────────────

	describe("createPost", () => {
		it("creates a draft post with minimal fields", async () => {
			const post = await controller.createPost({
				title: "Hello World",
				slug: "hello-world",
				content: "This is my first post.",
			});

			expect(post.id).toBeDefined();
			expect(post.title).toBe("Hello World");
			expect(post.slug).toBe("hello-world");
			expect(post.content).toBe("This is my first post.");
			expect(post.status).toBe("draft");
			expect(post.tags).toEqual([]);
			expect(post.publishedAt).toBeUndefined();
			expect(post.createdAt).toBeInstanceOf(Date);
			expect(post.updatedAt).toBeInstanceOf(Date);
		});

		it("creates a published post with publishedAt set", async () => {
			const post = await controller.createPost({
				title: "Published Post",
				slug: "published-post",
				content: "Content here.",
				status: "published",
			});

			expect(post.status).toBe("published");
			expect(post.publishedAt).toBeInstanceOf(Date);
		});

		it("creates a post with all optional fields", async () => {
			const post = await controller.createPost({
				title: "Full Post",
				slug: "full-post",
				content: "Full content here.",
				excerpt: "A brief summary.",
				coverImage: "https://example.com/cover.jpg",
				author: "Jane Doe",
				tags: ["news", "updates"],
				category: "Announcements",
			});

			expect(post.excerpt).toBe("A brief summary.");
			expect(post.coverImage).toBe("https://example.com/cover.jpg");
			expect(post.author).toBe("Jane Doe");
			expect(post.tags).toEqual(["news", "updates"]);
			expect(post.category).toBe("Announcements");
		});

		it("auto-generates slug from title when slug is empty", async () => {
			const post = await controller.createPost({
				title: "My Amazing Blog Post!",
				slug: "",
				content: "Content.",
			});

			expect(post.slug).toBe("my-amazing-blog-post");
		});

		it("stores the post in the data service", async () => {
			await controller.createPost({
				title: "Stored Post",
				slug: "stored-post",
				content: "Stored content.",
			});

			expect(mockData.size("post")).toBe(1);
		});
	});

	// ── getPost ────────────────────────────────────────────────────────────────

	describe("getPost", () => {
		it("returns a post by id", async () => {
			const created = await controller.createPost({
				title: "Test Post",
				slug: "test-post",
				content: "Content.",
			});

			const found = await controller.getPost(created.id);
			expect(found).not.toBeNull();
			expect(found?.title).toBe("Test Post");
		});

		it("returns null for non-existent id", async () => {
			const found = await controller.getPost("non-existent");
			expect(found).toBeNull();
		});
	});

	// ── getPostBySlug ──────────────────────────────────────────────────────────

	describe("getPostBySlug", () => {
		it("returns a post by slug", async () => {
			await controller.createPost({
				title: "Slug Test",
				slug: "slug-test",
				content: "Content.",
			});

			const found = await controller.getPostBySlug("slug-test");
			expect(found).not.toBeNull();
			expect(found?.title).toBe("Slug Test");
		});

		it("returns null for non-existent slug", async () => {
			const found = await controller.getPostBySlug("no-such-slug");
			expect(found).toBeNull();
		});
	});

	// ── updatePost ─────────────────────────────────────────────────────────────

	describe("updatePost", () => {
		it("updates the title", async () => {
			const created = await controller.createPost({
				title: "Original",
				slug: "original",
				content: "Content.",
			});

			const updated = await controller.updatePost(created.id, {
				title: "Updated Title",
			});

			expect(updated).not.toBeNull();
			expect(updated?.title).toBe("Updated Title");
			expect(updated?.slug).toBe("original");
		});

		it("updates content", async () => {
			const created = await controller.createPost({
				title: "Post",
				slug: "post",
				content: "Old content.",
			});

			const updated = await controller.updatePost(created.id, {
				content: "New content.",
			});

			expect(updated?.content).toBe("New content.");
		});

		it("updates tags", async () => {
			const created = await controller.createPost({
				title: "Tagged",
				slug: "tagged",
				content: "Content.",
				tags: ["old"],
			});

			const updated = await controller.updatePost(created.id, {
				tags: ["new", "tags"],
			});

			expect(updated?.tags).toEqual(["new", "tags"]);
		});

		it("sets publishedAt when transitioning to published", async () => {
			const created = await controller.createPost({
				title: "Draft",
				slug: "draft",
				content: "Content.",
			});

			expect(created.publishedAt).toBeUndefined();

			const updated = await controller.updatePost(created.id, {
				status: "published",
			});

			expect(updated?.status).toBe("published");
			expect(updated?.publishedAt).toBeInstanceOf(Date);
		});

		it("preserves publishedAt when already published", async () => {
			const created = await controller.createPost({
				title: "Published",
				slug: "published",
				content: "Content.",
				status: "published",
			});

			const originalPublishedAt = created.publishedAt;

			const updated = await controller.updatePost(created.id, {
				title: "Updated Published",
			});

			expect(updated?.publishedAt).toEqual(originalPublishedAt);
		});

		it("returns null for non-existent post", async () => {
			const updated = await controller.updatePost("non-existent", {
				title: "Nope",
			});

			expect(updated).toBeNull();
		});

		it("updates the updatedAt timestamp", async () => {
			const created = await controller.createPost({
				title: "Post",
				slug: "post",
				content: "Content.",
			});

			const updated = await controller.updatePost(created.id, {
				title: "New Title",
			});

			expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
				created.updatedAt.getTime(),
			);
		});
	});

	// ── deletePost ─────────────────────────────────────────────────────────────

	describe("deletePost", () => {
		it("deletes an existing post", async () => {
			const created = await controller.createPost({
				title: "To Delete",
				slug: "to-delete",
				content: "Content.",
			});

			const deleted = await controller.deletePost(created.id);
			expect(deleted).toBe(true);
			expect(mockData.size("post")).toBe(0);
		});

		it("returns false for non-existent post", async () => {
			const deleted = await controller.deletePost("non-existent");
			expect(deleted).toBe(false);
		});
	});

	// ── publishPost ────────────────────────────────────────────────────────────

	describe("publishPost", () => {
		it("publishes a draft post", async () => {
			const created = await controller.createPost({
				title: "Draft",
				slug: "draft",
				content: "Content.",
			});

			const published = await controller.publishPost(created.id);
			expect(published?.status).toBe("published");
			expect(published?.publishedAt).toBeInstanceOf(Date);
		});

		it("preserves existing publishedAt on re-publish", async () => {
			const created = await controller.createPost({
				title: "Post",
				slug: "post",
				content: "Content.",
				status: "published",
			});

			const originalDate = created.publishedAt;

			// Unpublish then re-publish
			await controller.unpublishPost(created.id);
			const republished = await controller.publishPost(created.id);

			expect(republished?.publishedAt).toEqual(originalDate);
		});

		it("returns null for non-existent post", async () => {
			const result = await controller.publishPost("non-existent");
			expect(result).toBeNull();
		});
	});

	// ── unpublishPost ──────────────────────────────────────────────────────────

	describe("unpublishPost", () => {
		it("unpublishes a published post", async () => {
			const created = await controller.createPost({
				title: "Published",
				slug: "published",
				content: "Content.",
				status: "published",
			});

			const unpublished = await controller.unpublishPost(created.id);
			expect(unpublished?.status).toBe("draft");
		});

		it("returns null for non-existent post", async () => {
			const result = await controller.unpublishPost("non-existent");
			expect(result).toBeNull();
		});
	});

	// ── archivePost ────────────────────────────────────────────────────────────

	describe("archivePost", () => {
		it("archives a post", async () => {
			const created = await controller.createPost({
				title: "To Archive",
				slug: "to-archive",
				content: "Content.",
				status: "published",
			});

			const archived = await controller.archivePost(created.id);
			expect(archived?.status).toBe("archived");
		});

		it("returns null for non-existent post", async () => {
			const result = await controller.archivePost("non-existent");
			expect(result).toBeNull();
		});
	});

	// ── listPosts ──────────────────────────────────────────────────────────────

	describe("listPosts", () => {
		it("returns all posts when no filters", async () => {
			await controller.createPost({
				title: "Post 1",
				slug: "post-1",
				content: "Content 1.",
			});
			await controller.createPost({
				title: "Post 2",
				slug: "post-2",
				content: "Content 2.",
			});

			const posts = await controller.listPosts();
			expect(posts).toHaveLength(2);
		});

		it("filters by status", async () => {
			await controller.createPost({
				title: "Draft",
				slug: "draft",
				content: "Content.",
			});
			await controller.createPost({
				title: "Published",
				slug: "published",
				content: "Content.",
				status: "published",
			});

			const drafts = await controller.listPosts({ status: "draft" });
			expect(drafts).toHaveLength(1);
			expect(drafts[0]?.title).toBe("Draft");

			const published = await controller.listPosts({ status: "published" });
			expect(published).toHaveLength(1);
			expect(published[0]?.title).toBe("Published");
		});

		it("filters by category", async () => {
			await controller.createPost({
				title: "News Post",
				slug: "news-post",
				content: "Content.",
				category: "News",
			});
			await controller.createPost({
				title: "Guide Post",
				slug: "guide-post",
				content: "Content.",
				category: "Guides",
			});

			const news = await controller.listPosts({ category: "News" });
			expect(news).toHaveLength(1);
			expect(news[0]?.title).toBe("News Post");
		});

		it("filters by tag", async () => {
			await controller.createPost({
				title: "Tagged",
				slug: "tagged",
				content: "Content.",
				tags: ["featured", "news"],
			});
			await controller.createPost({
				title: "Not Tagged",
				slug: "not-tagged",
				content: "Content.",
				tags: ["other"],
			});

			const featured = await controller.listPosts({ tag: "featured" });
			expect(featured).toHaveLength(1);
			expect(featured[0]?.title).toBe("Tagged");
		});

		it("respects take parameter", async () => {
			for (let i = 0; i < 5; i++) {
				await controller.createPost({
					title: `Post ${i}`,
					slug: `post-${i}`,
					content: `Content ${i}.`,
				});
			}

			const posts = await controller.listPosts({ take: 3 });
			expect(posts).toHaveLength(3);
		});

		it("respects skip parameter", async () => {
			for (let i = 0; i < 5; i++) {
				await controller.createPost({
					title: `Post ${i}`,
					slug: `post-${i}`,
					content: `Content ${i}.`,
				});
			}

			const posts = await controller.listPosts({ skip: 3 });
			expect(posts).toHaveLength(2);
		});

		it("combines status and category filters", async () => {
			await controller.createPost({
				title: "Draft News",
				slug: "draft-news",
				content: "Content.",
				category: "News",
			});
			await controller.createPost({
				title: "Published News",
				slug: "published-news",
				content: "Content.",
				category: "News",
				status: "published",
			});
			await controller.createPost({
				title: "Published Guide",
				slug: "published-guide",
				content: "Content.",
				category: "Guides",
				status: "published",
			});

			const publishedNews = await controller.listPosts({
				status: "published",
				category: "News",
			});
			expect(publishedNews).toHaveLength(1);
			expect(publishedNews[0]?.title).toBe("Published News");
		});

		it("returns empty array when no matches", async () => {
			const posts = await controller.listPosts({ status: "published" });
			expect(posts).toEqual([]);
		});
	});

	// ── Lifecycle transitions ──────────────────────────────────────────────────

	describe("lifecycle transitions", () => {
		it("draft -> published -> archived", async () => {
			const post = await controller.createPost({
				title: "Lifecycle",
				slug: "lifecycle",
				content: "Content.",
			});

			expect(post.status).toBe("draft");

			const published = await controller.publishPost(post.id);
			expect(published?.status).toBe("published");

			const archived = await controller.archivePost(post.id);
			expect(archived?.status).toBe("archived");
		});

		it("draft -> published -> draft (unpublish)", async () => {
			const post = await controller.createPost({
				title: "Lifecycle 2",
				slug: "lifecycle-2",
				content: "Content.",
			});

			await controller.publishPost(post.id);
			const unpublished = await controller.unpublishPost(post.id);
			expect(unpublished?.status).toBe("draft");
		});
	});

	// ── Edge cases ─────────────────────────────────────────────────────────────

	describe("edge cases", () => {
		it("handles posts with no optional fields", async () => {
			const post = await controller.createPost({
				title: "Minimal",
				slug: "minimal",
				content: "Content.",
			});

			expect(post.excerpt).toBeUndefined();
			expect(post.coverImage).toBeUndefined();
			expect(post.author).toBeUndefined();
			expect(post.category).toBeUndefined();
		});

		it("handles updating multiple fields at once", async () => {
			const post = await controller.createPost({
				title: "Multi Update",
				slug: "multi-update",
				content: "Original content.",
			});

			const updated = await controller.updatePost(post.id, {
				title: "New Title",
				content: "New content.",
				excerpt: "New excerpt.",
				author: "New Author",
				tags: ["tag1"],
				category: "New Category",
			});

			expect(updated?.title).toBe("New Title");
			expect(updated?.content).toBe("New content.");
			expect(updated?.excerpt).toBe("New excerpt.");
			expect(updated?.author).toBe("New Author");
			expect(updated?.tags).toEqual(["tag1"]);
			expect(updated?.category).toBe("New Category");
		});

		it("handles empty tags array", async () => {
			const post = await controller.createPost({
				title: "No Tags",
				slug: "no-tags",
				content: "Content.",
				tags: [],
			});

			expect(post.tags).toEqual([]);
		});

		it("handles concurrent creates", async () => {
			const [a, b, c] = await Promise.all([
				controller.createPost({
					title: "Post A",
					slug: "post-a",
					content: "A.",
				}),
				controller.createPost({
					title: "Post B",
					slug: "post-b",
					content: "B.",
				}),
				controller.createPost({
					title: "Post C",
					slug: "post-c",
					content: "C.",
				}),
			]);

			expect(a.id).not.toBe(b.id);
			expect(b.id).not.toBe(c.id);
			expect(mockData.size("post")).toBe(3);
		});
	});
});
