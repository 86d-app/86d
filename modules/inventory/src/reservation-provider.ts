import {
	inventoryCheckoutV2Capability,
	provideCapability,
} from "@86d-app/core";
import { executeInventoryReservation } from "./reservations";

export { inventoryCheckoutV2Capability };

export const inventoryCheckoutV2Provider = provideCapability(
	inventoryCheckoutV2Capability,
	(ctx, request) => executeInventoryReservation(ctx.transactions, request),
);
