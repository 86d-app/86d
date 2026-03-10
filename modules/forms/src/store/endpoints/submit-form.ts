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
			values: z
				.record(z.string().max(100), z.unknown())
				.refine((obj) => Object.keys(obj).length <= 100, {
					message: "Form must have at most 100 fields",
				}),
			/** Honeypot field — if filled, the submission is silently discarded */
			_hp: z.string().optional(),
		}),
	},
	async (ctx) => {
		const formsController = ctx.context.controllers.forms as FormsController;
		const form = await formsController.getFormBySlug(ctx.params.slug);

		if (!form || !form.isActive) {
			return { error: "Form not found", status: 404 };
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
