import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { createAdminEndpointsWithSettings } from "./admin/endpoints";
import { createGetSettingsEndpoint } from "./admin/endpoints/get-settings";
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
	/** Whether to tax shipping by default. @default false */
	taxShipping?: boolean;
	/** TaxJar API key for real-time tax calculation */
	taxjarApiKey?: string | undefined;
	/** Use TaxJar sandbox environment (default: false) */
	taxjarSandbox?: boolean | undefined;
}

export default function tax(options?: TaxOptions): Module {
	const settingsEndpoint = createGetSettingsEndpoint({
		taxjarApiKey: options?.taxjarApiKey,
		taxjarSandbox: options?.taxjarSandbox,
	});

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
			const controller = createTaxController(ctx.data, ctx.events, {
				taxjarApiKey: options?.taxjarApiKey,
				taxjarSandbox: options?.taxjarSandbox,
			});
			return {
				controllers: { tax: controller },
			};
		},

		endpoints: {
			store: storeEndpoints,
			admin: createAdminEndpointsWithSettings(settingsEndpoint),
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
