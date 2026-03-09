import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { formsSchema } from "./schema";
import { createFormsControllers } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	Form,
	FormField,
	FormFieldType,
	FormSubmission,
	FormsController,
	SubmissionStatus,
} from "./service";

export interface FormsOptions extends ModuleConfig {
	/**
	 * Maximum submissions per form per IP per hour (rate limiting)
	 * @default 10
	 */
	maxSubmissionsPerHour?: number;
}

/**
 * Forms module factory function
 * Creates a custom forms module with contact forms, surveys, and inquiries
 */
export default function forms(options?: FormsOptions): Module {
	return {
		id: "forms",
		version: "1.0.0",
		schema: formsSchema,
		exports: {
			read: ["forms", "formSubmissions"],
		},
		events: {
			emits: [
				"forms.form.created",
				"forms.form.updated",
				"forms.form.deleted",
				"forms.submission.created",
				"forms.submission.statusChanged",
				"forms.submission.deleted",
			],
		},

		init: async (ctx: ModuleContext) => {
			const formsController = createFormsControllers(ctx.data);

			return {
				controllers: { forms: formsController },
			};
		},

		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/forms",
					component: "FormsList",
					label: "Forms",
					icon: "TextAlignLeft",
					group: "Content",
				},
				{
					path: "/admin/forms/create",
					component: "FormCreate",
				},
				{
					path: "/admin/forms/:id",
					component: "FormDetail",
				},
				{
					path: "/admin/forms/:id/submissions",
					component: "FormSubmissions",
					label: "Submissions",
					icon: "Envelope",
					group: "Content",
				},
			],
		},
		options,
	};
}
