import { createPostEndpoint } from "./create-post";
import { deletePostEndpoint } from "./delete-post";
import { adminGetPostEndpoint } from "./get-post";
import { adminListPostsEndpoint } from "./list-posts";
import { updatePostEndpoint } from "./update-post";

export const adminEndpoints = {
	"/admin/blog": adminListPostsEndpoint,
	"/admin/blog/create": createPostEndpoint,
	"/admin/blog/:id": adminGetPostEndpoint,
	"/admin/blog/:id/update": updatePostEndpoint,
	"/admin/blog/:id/delete": deletePostEndpoint,
};
