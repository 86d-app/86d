import { bulkDeleteEndpoint } from "./bulk-delete";
import { createNotificationEndpoint } from "./create-notification";
import { deleteNotificationEndpoint } from "./delete-notification";
import { getNotificationEndpoint } from "./get-notification";
import { listNotificationsEndpoint } from "./list-notifications";
import { statsEndpoint } from "./stats";
import { updateNotificationEndpoint } from "./update-notification";

export const adminEndpoints = {
	"/admin/notifications": listNotificationsEndpoint,
	"/admin/notifications/create": createNotificationEndpoint,
	"/admin/notifications/stats": statsEndpoint,
	"/admin/notifications/bulk-delete": bulkDeleteEndpoint,
	"/admin/notifications/:id": getNotificationEndpoint,
	"/admin/notifications/:id/update": updateNotificationEndpoint,
	"/admin/notifications/:id/delete": deleteNotificationEndpoint,
};
