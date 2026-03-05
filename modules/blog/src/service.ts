import type { ModuleController } from "@86d-app/core";

export type PostStatus = "draft" | "published" | "archived";

export interface BlogPost {
	id: string;
	title: string;
	slug: string;
	content: string;
	excerpt?: string | undefined;
	coverImage?: string | undefined;
	author?: string | undefined;
	status: PostStatus;
	tags: string[];
	category?: string | undefined;
	publishedAt?: Date | undefined;
	createdAt: Date;
	updatedAt: Date;
}

export interface BlogController extends ModuleController {
	createPost(params: {
		title: string;
		slug: string;
		content: string;
		excerpt?: string | undefined;
		coverImage?: string | undefined;
		author?: string | undefined;
		status?: PostStatus | undefined;
		tags?: string[] | undefined;
		category?: string | undefined;
	}): Promise<BlogPost>;

	updatePost(
		id: string,
		params: {
			title?: string | undefined;
			slug?: string | undefined;
			content?: string | undefined;
			excerpt?: string | undefined;
			coverImage?: string | undefined;
			author?: string | undefined;
			status?: PostStatus | undefined;
			tags?: string[] | undefined;
			category?: string | undefined;
		},
	): Promise<BlogPost | null>;

	deletePost(id: string): Promise<boolean>;

	getPost(id: string): Promise<BlogPost | null>;

	getPostBySlug(slug: string): Promise<BlogPost | null>;

	publishPost(id: string): Promise<BlogPost | null>;

	unpublishPost(id: string): Promise<BlogPost | null>;

	archivePost(id: string): Promise<BlogPost | null>;

	listPosts(params?: {
		status?: PostStatus | undefined;
		category?: string | undefined;
		tag?: string | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<BlogPost[]>;
}
