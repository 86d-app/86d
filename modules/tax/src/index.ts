import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { taxSchema } from "./schema";
import { createTaxController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	CreateTaxCategoryParams,
	CreateTaxExemptionParams,
	CreateTaxNexusParams,
	CreateTaxRateParams,
	TaxAddress,
	TaxCalculation,
	TaxCategory,
	TaxController,
	TaxExemption,
	TaxExemptionType,
	TaxLineItem,
	TaxLineResult,
	TaxNexus,
	TaxNexusType,
	TaxRate,
	TaxRateType,
	TaxReportParams,
	TaxReportSummary,
	TaxTransaction,
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
			read: [
				"taxRate",
				"taxCalculation",
				"taxExemptionStatus",
				"taxNexus",
				"taxTransaction",
				"taxReport",
			],
		},
		events: {
			emits: [
				"tax.rate_created",
				"tax.rate_updated",
				"tax.rate_deleted",
				"tax.exemption_created",
				"tax.exemption_deleted",
				"tax.nexus_created",
				"tax.nexus_deleted",
				"tax.transaction_logged",
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
					label: "Tax Rates",
					icon: "CurrencyDollar",
					group: "Finance",
				},
				{
					path: "/admin/tax/reporting",
					component: "TaxReporting",
					label: "Tax Reporting",
					icon: "ChartBar",
					group: "Finance",
				},
			],
		},

		options,
	};
}
