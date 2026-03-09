import { createStoreEndpoint, z } from "@86d-app/core";
import type { FormsController } from "../../service";

export const submitForm = createStoreEndpoint(
	"/forms/:slug/submit",
	{
		method: "POST",
		params: z.object({
			slug: z.string(),
		}),
		body: z.object({
			values: z.record(z.string(), z.unknown()),
			/** Honeypot field — if filled, the submission is silently discarded */
			_hp: z.string().optional(),
		}),
	},
	async (ctx) => {
		const formsController = ctx.context.controllers.forms as FormsController;
		const form = await formsController.getFormBySlug(ctx.params.slug);

		if (!form || !form.isActive) {
			throw new Error("Form not found or not accepting submissions");
		}

		// Honeypot check: if _hp is filled, silently accept but don't store
		if (form.honeypotEnabled && ctx.body._hp) {
			return {
				success: true,
				message: form.successMessage,
			};
		}

		const submission = await formsController.submitForm({
			formId: form.id,
			values: ctx.body.values,
		});

		return {
			success: true,
			message: form.successMessage,
			submissionId: submission.id,
		};
	},
);
