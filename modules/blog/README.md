<p align="center">
  <a href="https://86d.app">
    <img src="https://86d.app/logo" height="96" alt="86d" />
  </a>
</p>

<p align="center">
  Dynamic Commerce
</p>

<p align="center">
  <a href="https://x.com/86d_app"><strong>X</strong></a> ·
  <a href="https://www.linkedin.com/company/86d"><strong>LinkedIn</strong></a>
</p>
<br/>

> [!WARNING]
> This project is under active development and is not ready for production use. Please proceed with caution. Use at your own risk.

# @86d-app/blog

Blog content management module for 86d commerce platform.

## Installation

```sh
npm install @86d-app/blog
```

## Usage

```ts
import blog from "@86d-app/blog";

const module = blog({
  postsPerPage: "20",
});
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `postsPerPage` | `string` | `"20"` | Number of posts returned per page |

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/blog` | List published posts (paginated) |
| `GET` | `/blog/:slug` | Get a published post by slug |

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/blog` | List all posts |
| `POST` | `/admin/blog/create` | Create a new post |
| `GET` | `/admin/blog/:id` | Get a post by ID |
| `POST` | `/admin/blog/:id/update` | Update a post |
| `POST` | `/admin/blog/:id/delete` | Delete a post |

## Controller API

```ts
interface BlogController {
  createPost(params: {
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    coverImage?: string;
    author?: string;
    status?: PostStatus;
    tags?: string[];
    category?: string;
  }): Promise<BlogPost>;

  updatePost(id: string, params: Partial<CreatePostParams>): Promise<BlogPost>;
  deletePost(id: string): Promise<void>;
  getPost(id: string): Promise<BlogPost>;
  getPostBySlug(slug: string): Promise<BlogPost>;
  publishPost(id: string): Promise<BlogPost>;
  unpublishPost(id: string): Promise<BlogPost>;
  archivePost(id: string): Promise<BlogPost>;
  listPosts(params?: {
    status?: PostStatus;
    category?: string;
    tag?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ posts: BlogPost[]; total: number }>;
}
```

## Types

```ts
type PostStatus = "draft" | "published" | "archived";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  author?: string;
  status: PostStatus;
  tags: string[];
  category?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```
