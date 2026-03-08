import { createRule } from "./create-rule";
import { deleteRule } from "./delete-rule";
import { getCoOccurrences } from "./get-co-occurrences";
import { getStats } from "./get-stats";
import { listRules } from "./list-rules";
import { recordPurchase } from "./record-purchase";
import { updateRule } from "./update-rule";

export const adminEndpoints = {
	"/admin/recommendations/rules": listRules,
	"/admin/recommendations/rules/create": createRule,
	"/admin/recommendations/rules/:id": updateRule,
	"/admin/recommendations/rules/:id/delete": deleteRule,
	"/admin/recommendations/record-purchase": recordPurchase,
	"/admin/recommendations/co-occurrences/:productId": getCoOccurrences,
	"/admin/recommendations/stats": getStats,
};
