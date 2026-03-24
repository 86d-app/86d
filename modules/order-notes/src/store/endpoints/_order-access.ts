import type { ModuleDataService } from "@86d-app/core";

/**
 * Returns true if the given customer owns the order.
 * Queries the orders module's data service via the shared data registry.
 */
export async function customerOwnsOrder(
	data: ModuleDataService,
	orderId: string,
	customerId: string,
): Promise<boolean> {
	if (!customerId) return false;
	const order = (await data.get("order", orderId)) as {
		customerId?: string;
	} | null;
	return order?.customerId === customerId;
}
