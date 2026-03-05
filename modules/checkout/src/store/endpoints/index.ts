import { abandonSession } from "./abandon-session";
import { applyDiscount } from "./apply-discount";
import { applyGiftCard } from "./apply-gift-card";
import { completeSession } from "./complete-session";
import { confirmSession } from "./confirm-session";
import { createPayment } from "./create-payment";
import { createSession } from "./create-session";
import { getLineItems } from "./get-line-items";
import { getPayment } from "./get-payment";
import { getSession } from "./get-session";
import { removeDiscount } from "./remove-discount";
import { removeGiftCard } from "./remove-gift-card";
import { updateSession } from "./update-session";

export const storeEndpoints = {
	"/checkout/sessions": createSession,
	"/checkout/sessions/:id": getSession,
	"/checkout/sessions/:id/update": updateSession,
	"/checkout/sessions/:id/confirm": confirmSession,
	"/checkout/sessions/:id/complete": completeSession,
	"/checkout/sessions/:id/abandon": abandonSession,
	"/checkout/sessions/:id/discount": applyDiscount,
	"/checkout/sessions/:id/discount/remove": removeDiscount,
	"/checkout/sessions/:id/gift-card": applyGiftCard,
	"/checkout/sessions/:id/gift-card/remove": removeGiftCard,
	"/checkout/sessions/:id/payment": createPayment,
	"/checkout/sessions/:id/payment/status": getPayment,
	"/checkout/sessions/:id/items": getLineItems,
};
