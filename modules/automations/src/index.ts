import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { automationsSchema } from "./schema";
import { createAutomationsController } from "./service-impl";
import { createStoreEndpoints } from "./store/endpoints";

export type {
	ActionType,
	Automation,
	AutomationAction,
	AutomationActionResult,
	AutomationCondition,
	AutomationExecution,
	AutomationListParams,
	AutomationStats,
	AutomationStatus,
	AutomationsController,
	ConditionOperator,
	CreateAutomationParams,
	ExecutionListParams,
	ExecutionStatus,
	UpdateAutomationParams,
} from "./service";

export interface AutomationsOptions extends ModuleConfig {
	/**
	 * Maximum number of execution records to retain per automation.
	 * Older records are purged when this limit is exceeded.
	 * Set to 0 to disable auto-purge.
	 * @default 0
	 */
	maxExecutionHistory?: number;

	/**
	 * Shared secret for the `/automations/webhooks` store endpoint.
	 * When set, incoming webhook requests must include a matching
	 * `x-webhook-secret` header. Leave unset to disable authentication
	 * (not recommended in production).
	 */
	webhookSecret?: string;
}

/**
 * Automations module factory function.
 * Creates event-driven workflows that trigger automatically when
 * specific events occur. Supports conditional logic, multiple action
 * types, and execution history tracking.
 *
 * Other modules emit events; automations evaluate active rules against
 * those events, check conditions, and execute configured actions.
 */
export default function automations(options?: AutomationsOptions): Module {
	return {
		id: "automations",
		version: "0.0.1",
		schema: automationsSchema,
		exports: {
			read: [
				"automationTriggerEvent",
				"automationStatus",
				"automationRunCount",
			],
		},
		events: {
			emits: [
				"automations.created",
				"automations.updated",
				"automations.deleted",
				"automations.activated",
				"automations.paused",
				"automations.executed",
			],
		},

		init: async (ctx: ModuleContext) => {
			const controller = createAutomationsController(ctx.data);
			return {
				controllers: { automations: controller },
			};
		},

		endpoints: {
			store: createStoreEndpoints({
				webhookSecret: options?.webhookSecret,
			}),
			admin: adminEndpoints,
		},

		admin: {
			pages: [
				{
					path: "/admin/automations",
					component: "AutomationList",
					label: "Automations",
					icon: "Lightning",
					group: "System",
				},
				{
					path: "/admin/automations/:id",
					component: "AutomationDetail",
				},
			],
		},

		options,
	};
}
