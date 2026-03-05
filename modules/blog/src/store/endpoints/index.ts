import { getPostEndpoint } from "./get-post";
import { listPostsEndpoint } from "./list-posts";

export const storeEndpoints = {
	"/blog": listPostsEndpoint,
	"/blog/:slug": getPostEndpoint,
};
