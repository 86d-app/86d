import { addEntry } from "./add-entry";
import { getConfig } from "./get-config";
import { getStats } from "./get-stats";
import { listEntries } from "./list-entries";
import { previewSitemap } from "./preview";
import { regenerateSitemap } from "./regenerate";
import { removeEntry } from "./remove-entry";
import { updateConfig } from "./update-config";

export const adminEndpoints = {
	"/admin/sitemap/config": getConfig,
	"/admin/sitemap/config/update": updateConfig,
	"/admin/sitemap/regenerate": regenerateSitemap,
	"/admin/sitemap/entries": listEntries,
	"/admin/sitemap/entries/add": addEntry,
	"/admin/sitemap/entries/:id/remove": removeEntry,
	"/admin/sitemap/stats": getStats,
	"/admin/sitemap/preview": previewSitemap,
};
