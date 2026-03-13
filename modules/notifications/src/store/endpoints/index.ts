import { deleteNotificationEndpoint } from "./delete-notification";
import { getNotificationEndpoint } from "./get-notification";
import { getPreferencesEndpoint } from "./get-preferences";
import { listMyNotificationsEndpoint } from "./list-my-notifications";
import { markAllReadEndpoint } from "./mark-all-read";
import { markReadEndpoint } from "./mark-read";
import { unreadCountEndpoint } from "./unread-count";
import { updatePreferencesEndpoint } from "./update-preferences";

export const storeEndpoints = {
	"/notifications": listMyNotificationsEndpoint,
	"/notifications/read-all": markAllReadEndpoint,
	"/notifications/unread-count": unreadCountEndpoint,
	"/notifications/preferences": getPreferencesEndpoint,
	"/notifications/preferences/update": updatePreferencesEndpoint,
	"/notifications/:id": getNotificationEndpoint,
	"/notifications/:id/read": markReadEndpoint,
	"/notifications/:id/delete": deleteNotificationEndpoint,
};
