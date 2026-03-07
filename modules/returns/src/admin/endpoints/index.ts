import { approveReturn } from "./approve-return";
import { cancelReturn } from "./cancel-return";
import { completeReturn } from "./complete-return";
import { getReturn } from "./get-return";
import { listReturns } from "./list-returns";
import { markReceived } from "./mark-received";
import { rejectReturn } from "./reject-return";
import { returnSummary } from "./return-summary";
import { updateTracking } from "./update-tracking";

export const adminEndpoints = {
	"/admin/returns": listReturns,
	"/admin/returns/summary": returnSummary,
	"/admin/returns/:id": getReturn,
	"/admin/returns/:id/approve": approveReturn,
	"/admin/returns/:id/reject": rejectReturn,
	"/admin/returns/:id/received": markReceived,
	"/admin/returns/:id/complete": completeReturn,
	"/admin/returns/:id/cancel": cancelReturn,
	"/admin/returns/:id/tracking": updateTracking,
};
