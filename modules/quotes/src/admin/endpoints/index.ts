import { addCommentAdminEndpoint } from "./add-comment";
import { approveQuoteEndpoint } from "./approve-quote";
import { convertToOrderEndpoint } from "./convert-to-order";
import { counterQuoteEndpoint } from "./counter-quote";
import { expireQuoteEndpoint } from "./expire-quote";
import { getQuoteAdminEndpoint } from "./get-quote";
import { listQuotesEndpoint } from "./list-quotes";
import { rejectQuoteEndpoint } from "./reject-quote";
import { reviewQuoteEndpoint } from "./review-quote";
import { statsEndpoint } from "./stats";

export const adminEndpoints = {
	"/admin/quotes": listQuotesEndpoint,
	"/admin/quotes/stats": statsEndpoint,
	"/admin/quotes/:id": getQuoteAdminEndpoint,
	"/admin/quotes/:id/review": reviewQuoteEndpoint,
	"/admin/quotes/:id/counter": counterQuoteEndpoint,
	"/admin/quotes/:id/approve": approveQuoteEndpoint,
	"/admin/quotes/:id/reject": rejectQuoteEndpoint,
	"/admin/quotes/:id/convert": convertToOrderEndpoint,
	"/admin/quotes/:id/expire": expireQuoteEndpoint,
	"/admin/quotes/:id/comments/add": addCommentAdminEndpoint,
};
