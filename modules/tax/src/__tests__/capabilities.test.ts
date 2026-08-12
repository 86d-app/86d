import { createMockDataService } from "@86d-app/core/test-utils";
import { describe, expect, it } from "vitest";
import { handleTaxQuote } from "../capabilities";
import { createTaxController } from "../service-impl";

describe("tax quote capability", () => {
	it("returns the owner calculation through a bounded decision", async () => {
		const result = await handleTaxQuote(
			createTaxController(createMockDataService()),
			{
				address: { country: "US", state: "IL" },
				lineItems: [{ productId: "product-1", amount: 1000, quantity: 1 }],
			},
		);

		expect(result).toMatchObject({
			ok: true,
			decision: { totalTax: 0, shippingTax: 0 },
		});
	});
});
