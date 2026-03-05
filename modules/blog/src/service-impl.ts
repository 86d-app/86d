import type { ModuleDataService } from "@86d-app/core";
import type { BlogController, BlogPost } from "./service";

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function createBlogController(data: ModuleDataService): BlogController {
	return {
		async createPost(params) {
			const now = new Date();
			const id = crypto.randomUUID();
			const status = params.status ?? "draft";

			const post: BlogPost = {
				id,
				title: params.title,
				slug: params.slug || slugify(params.title),
				content: params.content,
				excerpt: params.excerpt,
				coverImage: params.coverImage,
				author: params.author,
				status,
				tags: params.tags ?? [],
				category: params.category,
				publishedAt: status === "published" ? now : undefined,
				createdAt: now,
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("post", id, post as Record<string, any>);
			return post;
		},

		async updatePost(id, params) {
			const existing = await data.get("post", id);
			if (!existing) return null;

			const post = existing as unknown as BlogPost;
			const now = new Date();

			const updated: BlogPost = {
				...post,
				...(params.title !== undefined ? { title: params.title } : {}),
				...(params.slug !== undefined ? { slug: params.slug } : {}),
				...(params.content !== undefined ? { content: params.content } : {}),
				...(params.excerpt !== undefined ? { excerpt: params.excerpt } : {}),
				...(params.coverImage !== undefined
					? { coverImage: params.coverImage }
					: {}),
				...(params.author !== undefined ? { author: params.author } : {}),
				...(params.status !== undefined ? { status: params.status } : {}),
				...(params.tags !== undefined ? { tags: params.tags } : {}),
				...(params.category !== undefined ? { category: params.category } : {}),
				updatedAt: now,
			};

			// If transitioning to published and not previously published, set publishedAt
			if (
				params.status === "published" &&
				post.status !== "published" &&
				!updated.publishedAt
			) {
				updated.publishedAt = now;
			}

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("post", id, updated as Record<string, any>);
			return updated;
		},

		async deletePost(id) {
			const existing = await data.get("post", id);
			if (!existing) return false;
			await data.delete("post", id);
			return true;
		},

		async getPost(id) {
			const raw = await data.get("post", id);
			if (!raw) return null;
			return raw as unknown as BlogPost;
		},

		async getPostBySlug(slug) {
			const matches = await data.findMany("post", {
				where: { slug },
				take: 1,
			});
			return (matches[0] as unknown as BlogPost) ?? null;
		},

		async publishPost(id) {
			const existing = await data.get("post", id);
			if (!existing) return null;

			const post = existing as unknown as BlogPost;
			const now = new Date();
			const updated: BlogPost = {
				...post,
				status: "published",
				publishedAt: post.publishedAt ?? now,
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("post", id, updated as Record<string, any>);
			return updated;
		},

		async unpublishPost(id) {
			const existing = await data.get("post", id);
			if (!existing) return null;

			const post = existing as unknown as BlogPost;
			const now = new Date();
			const updated: BlogPost = {
				...post,
				status: "draft",
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("post", id, updated as Record<string, any>);
			return updated;
		},

		async archivePost(id) {
			const existing = await data.get("post", id);
			if (!existing) return null;

			const post = existing as unknown as BlogPost;
			const now = new Date();
			const updated: BlogPost = {
				...post,
				status: "archived",
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("post", id, updated as Record<string, any>);
			return updated;
		},

		async listPosts(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;
			if (params?.category) where.category = params.category;

			const all = await data.findMany("post", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			let posts = all as unknown as BlogPost[];

			// Tag filtering must remain client-side (array contains)
			if (params?.tag) {
				const tag = params.tag;
				posts = posts.filter((p) => (p.tags as string[]).includes(tag));
			}
			return posts;
		},
	};
}
