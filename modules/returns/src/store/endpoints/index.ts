import { cancelReturn } from "./cancel-return";
import { getReturnStatus } from "./get-return";
import { listCustomerReturns } from "./list-returns";
import { submitReturn } from "./submit-return";

export const storeEndpoints = {
	"/returns": listCustomerReturns,
	"/returns/submit": submitReturn,
	"/returns/:id": getReturnStatus,
	"/returns/:id/cancel": cancelReturn,
};
