import type { Module, ModuleConfig } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { revenueSchema } from "./schema";

export type {
	PaymentIntentStatus,
	RevenuePaymentsController,
	RevenueStats,
	RevenueTransaction,
} from "./service";

export interface RevenueOptions extends ModuleConfig {}

export default function revenue(_options?: RevenueOptions): Module {
	return {
		id: "revenue",
		version: "0.0.1",
		schema: revenueSchema,
		requires: {
			payments: {
				read: ["paymentStatus", "paymentAmount", "paymentMethod"],
				optional: true,
			},
		},
		endpoints: {
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/revenue",
					component: "RevenueAdmin",
					label: "Revenue",
					icon: "ChartBar",
					group: "Finance",
				},
			],
		},
	};
}
