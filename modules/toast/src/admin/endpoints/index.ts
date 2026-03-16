import { createMenuMappingEndpoint } from "./create-menu-mapping";
import { deleteMenuMappingEndpoint } from "./delete-menu-mapping";
import { listMenuMappingsEndpoint } from "./list-menu-mappings";
import { listSyncRecordsEndpoint } from "./list-sync-records";
import { syncStatsEndpoint } from "./sync-stats";

export const adminEndpoints = {
	"/admin/toast/sync-records": listSyncRecordsEndpoint,
	"/admin/toast/menu-mappings": listMenuMappingsEndpoint,
	"/admin/toast/menu-mappings/create": createMenuMappingEndpoint,
	"/admin/toast/menu-mappings/:id/delete": deleteMenuMappingEndpoint,
	"/admin/toast/sync-stats": syncStatsEndpoint,
};
