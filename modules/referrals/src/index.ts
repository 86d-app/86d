import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { referralsSchema } from "./schema";
import { createReferralController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	Referral,
	ReferralCode,
	ReferralController,
	ReferralRewardRule,
	ReferralStats,
	ReferralStatus,
	RewardType,
} from "./service";

export interface ReferralsOptions extends ModuleConfig {
	/** Max referral codes per customer (default: "1") */
	maxCodesPerCustomer?: string;
}

export default function referrals(options?: ReferralsOptions): Module {
	return {
		id: "referrals",
		version: "0.0.1",
		schema: referralsSchema,
		exports: {
			read: ["referralCode", "referralStatus"],
		},
		events: {
			emits: [
				"referrals.code_created",
				"referrals.referral_created",
				"referrals.referral_completed",
				"referrals.reward_granted",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createReferralController(ctx.data);
			return { controllers: { referrals: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/referrals",
					component: "ReferralList",
					label: "Referrals",
					icon: "UserPlus",
					group: "Customers",
				},
				{
					path: "/admin/referrals/codes",
					component: "CodeList",
					label: "Codes",
					icon: "Tag",
					group: "Customers",
				},
				{
					path: "/admin/referrals/rules",
					component: "RewardRules",
					label: "Reward Rules",
					icon: "Gift",
					group: "Customers",
				},
			],
		},
		options,
	};
}
