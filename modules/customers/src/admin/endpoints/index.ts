import { adminBulkTags } from "./bulk-tags";
import { adminDeleteCustomer } from "./delete-customer";
import { adminExportCustomers } from "./export-customers";
import { adminGetCustomer } from "./get-customer";
import { adminImportCustomers } from "./import-customers";
import { adminListCustomers } from "./list-customers";
import { adminListTags } from "./list-tags";
import { adminAdjustPoints } from "./loyalty-adjust";
import {
	adminGetLoyaltyBalance,
	adminGetLoyaltyHistory,
} from "./loyalty-balance";
import { adminEarnPoints } from "./loyalty-earn";
import { adminRedeemPoints } from "./loyalty-redeem";
import { adminGetLoyaltyStats } from "./loyalty-stats";
import { adminAddTags, adminRemoveTags } from "./manage-tags";
import { adminUpdateCustomer } from "./update-customer";

export const adminEndpoints = {
	"/admin/customers": adminListCustomers,
	"/admin/customers/export": adminExportCustomers,
	"/admin/customers/import": adminImportCustomers,
	"/admin/customers/tags": adminListTags,
	"/admin/customers/bulk-tags": adminBulkTags,
	"/admin/customers/loyalty/stats": adminGetLoyaltyStats,
	"/admin/customers/:id": adminGetCustomer,
	"/admin/customers/:id/update": adminUpdateCustomer,
	"/admin/customers/:id/delete": adminDeleteCustomer,
	"/admin/customers/:id/tags": adminAddTags,
	"/admin/customers/:id/tags/remove": adminRemoveTags,
	"/admin/customers/:id/loyalty": adminGetLoyaltyBalance,
	"/admin/customers/:id/loyalty/history": adminGetLoyaltyHistory,
	"/admin/customers/:id/loyalty/earn": adminEarnPoints,
	"/admin/customers/:id/loyalty/redeem": adminRedeemPoints,
	"/admin/customers/:id/loyalty/adjust": adminAdjustPoints,
};
