import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { taxSchema } from "./schema";
import { createTaxController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	CreateTaxCategoryParams,
	CreateTaxExemptionParams,
	CreateTaxRateParams,
	TaxAddress,
	TaxCalculation,
	TaxCategory,
	TaxController,
	TaxExemption,
	TaxExemptionType,
	TaxLineItem,
	TaxLineResult,
	TaxRate,
	TaxRateType,
	UpdateTaxRateParams,
} from "./service";

export interface TaxOptions extends ModuleConfig {
	/**
	 * Whether to tax shipping by default.
	 * @default false
	 */
	taxShipping?: boolean;
}

export default function tax(options?: TaxOptions): Module {
	return {
		id: "tax",
		version: "0.0.1",
		schema: taxSchema,
		exports: {
			read: ["taxRate", "taxCalculation", "taxExemptionStatus"],
		},
		events: {
			emits: [
				"tax.rate_created",
				"tax.rate_updated",
				"tax.rate_deleted",
				"tax.exemption_created",
				"tax.exemption_deleted",
			],
		},

		init: async (ctx: ModuleContext) => {
			const controller = createTaxController(ctx.data);
			return {
				controllers: { tax: controller },
			};
		},

		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},

		admin: {
			pages: [
				{
					path: "/admin/tax",
					component: "TaxRates",
					label: "Tax",
					icon: "CurrencyDollar",
					group: "Settings",
				},
			],
		},

		options,
	};
}
