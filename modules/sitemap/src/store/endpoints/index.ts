import { getSitemap } from "./get-sitemap";
import { getPublicStats } from "./get-stats";

export const storeEndpoints = {
	"/sitemap.xml": getSitemap,
	"/sitemap/stats": getPublicStats,
};
